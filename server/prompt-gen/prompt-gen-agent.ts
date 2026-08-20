/**
 * prompt-gen-agent.ts — the AI-DLC Prompt Generator engine.
 *
 * Two-stage, contract-first generation:
 *   Stage 1  — synthesise a cross-layer CONTRACT for the selected story
 *              (aggregate/entity names, fields, domain events, commands/queries,
 *               DTOs, endpoints + scopes). One reasoning-heavy call.
 *   Stage 2  — expand that contract into one implementation PROMPT per layer
 *              (domain, application, api, infrastructure, ui, tests), in parallel.
 *
 * The contract is what keeps the layer prompts consistent with each other:
 * every layer is derived from the same names/shapes instead of being invented
 * independently.
 *
 * Note: the agent produces high-quality *prompts* to hand to a coding agent —
 * it does not write the implementation code itself.
 */
import Anthropic from '@anthropic-ai/sdk';
import pRetry from 'p-retry';
import pLimit from 'p-limit';
import { getTechProfile, type TechProfile, type LayerSpec } from './tech-profiles';
import { insurityStandardsBlock } from './insurity-standards';
import { INSURITY_GROUNDING } from './insurity-grounding';
import { getBundle, emit } from './prompt-gen-session';
import type { GeneratedContract, PromptGenSession } from './prompt-gen-types';
import type { ElementRecord } from './prompt-gen-db';

// Primary client: the configured gateway (baseURL set in prod) or the direct API.
const gatewayClient = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});
const usingGateway = !!process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
// Direct api.anthropic.com fallback — used when the gateway deployment is unavailable.
const directClient = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Bound parallel layer calls (house convention: pLimit(2)).
const limit = pLimit(3);

/**
 * Resolve the deployment name to send to the GATEWAY. In prod the gateway maps to a
 * NAMED deployment set by ANTHROPIC_MODEL — raw ids like "claude-sonnet-4-5" are not
 * valid there. Locally (no gateway model) we keep the per-layer tiered default.
 */
function resolveModel(tierModel: string): string {
  const envModel = process.env.ANTHROPIC_MODEL;
  if (!envModel) return tierModel;
  if (/opus/i.test(tierModel) && process.env.ANTHROPIC_OPUS_MODEL) return process.env.ANTHROPIC_OPUS_MODEL;
  return envModel;
}

function hasKey(): boolean {
  return !!(process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY);
}

/** Errors that mean "the gateway deployment isn't usable" → worth a direct-API retry. */
function isGatewayDeploymentError(err: any): boolean {
  const msg = String(err?.message ?? err ?? '');
  return /DeploymentNotFound|DeploymentError|provisioningState|not ready|does not exist/i.test(msg);
}

async function once(client: Anthropic, model: string, system: string, user: string, maxTokens: number): Promise<string> {
  // Disable extended thinking. Claude 5 defaults to thinking on some deployments,
  // and for large inputs it can consume the ENTIRE max_tokens budget on the thinking
  // block (stop_reason=max_tokens, blocks=[thinking]) leaving no text. We want the
  // answer text, so turn thinking off. Cast to any — older SDK types may omit the field.
  const res = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
    thinking: { type: 'disabled' },
  } as any);
  // Concatenate ALL text blocks. Claude 5 with extended thinking returns a
  // `thinking` block first and the answer in a later `text` block, so reading only
  // content[0] yields an empty string. Scan every block for type === 'text'.
  const text = (res.content ?? [])
    .filter((b: any) => b && b.type === 'text' && typeof b.text === 'string')
    .map((b: any) => b.text)
    .join('')
    .trim();
  if (!text) {
    const kinds = (res.content ?? []).map((b: any) => b?.type).join(',');
    console.warn(`[PromptGen] empty text from model=${model} stop=${(res as any).stop_reason} blocks=[${kinds}]`);
  }
  return text;
}

/**
 * Call Claude with resilience: try the gateway (resolved deployment) first; if the
 * gateway deployment is unavailable, fall back to the direct Anthropic API using the
 * raw tier model id. `tierModel` is a real id (e.g. claude-sonnet-4-5 / -opus-4-5).
 */
async function callClaude(tierModel: string, system: string, user: string, maxTokens: number): Promise<string> {
  try {
    // Gateway: single fast attempt (no retries) so we fail over quickly when its
    // deployment is unavailable, rather than retrying a broken deployment 3x.
    return await once(gatewayClient, resolveModel(tierModel), system, user, maxTokens);
  } catch (err: any) {
    // Fall back to the direct Anthropic API for ANY gateway error when a direct key exists.
    if (directClient && usingGateway) {
      if (isGatewayDeploymentError(err)) console.warn(`[PromptGen] gateway deployment unavailable (${err?.message}); using direct API with ${tierModel}`);
      else console.warn(`[PromptGen] gateway call failed (${err?.message}); using direct API with ${tierModel}`);
      return await pRetry(() => once(directClient, tierModel, system, user, maxTokens), { retries: 2 });
    }
    // No gateway (local direct path) — retry directly.
    return await pRetry(() => once(gatewayClient, resolveModel(tierModel), system, user, maxTokens), { retries: 2 });
  }
}

// ─── Context assembly ──────────────────────────────────────────────────────────
// MVP: assemble the loaded context with clear section headers (each doc is already
// capped at 8k chars by the extractor). A future version swaps this for retrieval
// that pulls only the story-relevant slices (see PLAN.md BRD ingestion).

function assembleContext(session: PromptGenSession): string {
  const bundle = getBundle(session.bundleId);
  // Insurity coding standards + packages are ALWAYS loaded by default (T5/T6),
  // even when the user uploads no CLAUDE.md.
  const parts: string[] = ['## DEFAULT CODING STANDARDS (Insurity)', insurityStandardsBlock()];
  if (bundle) {
    const byRole = (role: string) => bundle.docs.filter(d => d.role === role);
    // Per-doc cap for GENERATION context. The full spec may be ~1MB, which would
    // overflow the model window across 7 prompts. The selected story (title + desc +
    // ACs) already carries the story-specific detail, so a capped spec as background
    // is enough here. (Extraction, by contrast, scans the full doc via chunking.)
    const GEN_DOC_CAP = 40_000;
    const section = (title: string, role: string) => {
      const docs = byRole(role);
      if (!docs.length) return;
      parts.push(`## ${title}`);
      for (const d of docs) {
        const body = d.content.length > GEN_DOC_CAP
          ? d.content.slice(0, GEN_DOC_CAP) + `\n[... ${d.fileName} trimmed for generation context ...]`
          : d.content;
        parts.push(`### ${d.fileName}\n${body}`);
      }
    };
    section('FUNCTIONAL SPEC (FSD)', 'fsd');
    section('BUSINESS REQUIREMENTS (BRD)', 'brd');
    section('CODING STANDARDS (CLAUDE.md)', 'standards');
    if (bundle.projectMemory?.trim()) {
      parts.push('## PROJECT MEMORY (prior decisions, golden-path notes)');
      parts.push(bundle.projectMemory.trim());
    }
    section('OTHER CONTEXT', 'other');
  }
  return parts.join('\n\n');
}

function storyBlock(session: PromptGenSession): string {
  const s = session.story;
  const acs = s.acceptanceCriteria.length
    ? s.acceptanceCriteria.map((a, i) => `AC-${i + 1}: ${a}`).join('\n')
    : '(none supplied)';
  return [
    `Story: ${s.externalId ? s.externalId + ' — ' : ''}${s.title}`,
    `Description: ${s.description || '(none)'}`,
    `Acceptance Criteria:\n${acs}`,
  ].join('\n');
}

// ─── Stage 1: contract ─────────────────────────────────────────────────────────

function buildContractPrompt(session: PromptGenSession, profile: TechProfile, context: string, foundation: string): string {
  return [
    'You are an AI-DLC architect. From the context and the selected user story, produce a CROSS-LAYER',
    'IMPLEMENTATION CONTRACT that every layer prompt will be derived from. This contract is the single',
    'source of truth for names and shapes so the Domain, Application, API, Infrastructure, UI and Test',
    'prompts stay consistent with each other.',
    '',
    'TARGET STACK:',
    profile.stackSummary,
    '',
    INSURITY_GROUNDING,
    '',
    foundation ? foundation + '\n' : '',
    foundation
      ? 'RECONCILIATION: This story is built ON TOP OF the existing project foundation above. REUSE existing ' +
        'elements where they fit, EXTEND them where the story adds to them, and only create NEW elements when ' +
        'nothing suitable exists. Keep names identical to existing ones. Flag any conflict with an existing name/endpoint. ' +
        'Tag every element with status: "new", "extend", or "reuse".'
      : 'This is a foundation story (no prior project elements). Tag every element status: "new".',
    '',
    '=== CONTEXT (spec / standards / memory) ===',
    context || '(no context supplied)',
    '',
    '=== SELECTED USER STORY ===',
    storyBlock(session),
    '',
    '=== OUTPUT ===',
    'Return a markdown document with these sections, then a fenced ```json block that captures the same',
    'contract in a machine-readable form:',
    '1. Aggregate / entities (names + key fields + types)',
    '2. Value objects',
    '3. Domain events',
    '4. Commands & Queries (CQRS) with their inputs/outputs',
    '5. DTOs (request/response) with fields',
    '6. API endpoints (verb, route, request DTO, response DTO, status codes, auth scope)',
    '7. UI screens/components needed',
    '8. Acceptance-criteria → contract-element mapping',
    '9. Reconciliation notes (what was reused/extended vs newly created; any conflicts)',
    '',
    'The trailing ```json block must have this shape:',
    '{ "aggregate": {...}, "valueObjects": [...], "events": [...], "commands": [...], "queries": [...],',
    '  "dtos": [...], "endpoints": [...], "uiComponents": [...], "acMapping": [...],',
    '  "elements": [ { "kind": "aggregate|entity|valueObject|event|command|query|dto|endpoint|ui",',
    '                  "name": "PascalCaseName", "module": "BoundedContext", "summary": "one line",',
    '                  "status": "new|extend|reuse" } ] }',
    'The "elements" array MUST list every element (with its module + reconciliation status). Use consistent PascalCase names.',
  ].filter(Boolean).join('\n');
}

/** Extract canonical elements from a contract JSON for the project catalog. */
function extractElements(json: any): ElementRecord[] {
  if (!json) return [];
  const out: ElementRecord[] = [];
  const push = (kind: string, name: any, module = '', summary = '', status = 'new') => {
    if (name && typeof name === 'string' && name.trim()) {
      out.push({ kind, name: name.trim(), module, summary, status });
    }
  };

  // Preferred: the explicit "elements" array the contract prompt asks for.
  if (Array.isArray(json.elements)) {
    for (const e of json.elements) {
      push(String(e.kind ?? 'element'), e.name, String(e.module ?? ''), String(e.summary ?? ''), String(e.status ?? 'new'));
    }
    if (out.length) return dedupe(out);
  }

  // Fallback: derive from the structured sections.
  const nameOf = (x: any) => (typeof x === 'string' ? x : x?.name);
  if (json.aggregate) push('aggregate', nameOf(json.aggregate), '', 'aggregate root');
  for (const e of json.entities ?? []) push('entity', nameOf(e));
  for (const v of json.valueObjects ?? []) push('valueObject', nameOf(v));
  for (const ev of json.events ?? []) push('event', nameOf(ev));
  for (const c of json.commands ?? []) push('command', nameOf(c));
  for (const q of json.queries ?? []) push('query', nameOf(q));
  for (const d of json.dtos ?? []) push('dto', nameOf(d));
  for (const ep of json.endpoints ?? []) {
    const label = typeof ep === 'string' ? ep : `${ep.verb ?? ''} ${ep.route ?? ep.name ?? ''}`.trim();
    push('endpoint', label);
  }
  for (const u of json.uiComponents ?? []) push('ui', nameOf(u));
  return dedupe(out);
}

/** Fallback element extraction: derive the catalog from the contract markdown. */
async function extractElementsLLM(markdown: string): Promise<ElementRecord[]> {
  const text = await callClaude(
    'claude-sonnet-5',
    'You extract a structured element list from an implementation contract. Return only JSON.',
    [
      'From the contract below, list every element as a JSON array. Each item:',
      '{ "kind": "aggregate|entity|valueObject|event|command|query|dto|endpoint|ui",',
      '  "name": "PascalCaseName", "module": "BoundedContext or feature area", "summary": "one line",',
      '  "status": "new|extend|reuse" }.',
      'Return ONLY the JSON array, nothing else.',
      '',
      '=== CONTRACT ===',
      markdown.slice(0, 16000),
    ].join('\n'),
    3000,
  );
  const raw = text.match(/\[[\s\S]*\]/)?.[0];
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return dedupe(arr.map((e: any) => ({
      kind: String(e.kind ?? 'element'),
      name: String(e.name ?? '').trim(),
      module: String(e.module ?? ''),
      summary: String(e.summary ?? ''),
      status: String(e.status ?? 'new'),
    })).filter(e => e.name));
  } catch {
    return [];
  }
}

/** Names of elements the contract marked reuse/extend — the coding agent must read these first. */
function extractReuseExtendNames(json: any): string[] {
  if (!json || !Array.isArray(json.elements)) return [];
  return Array.from(new Set(
    json.elements
      .filter((e: any) => e && (e.status === 'reuse' || e.status === 'extend') && e.name)
      .map((e: any) => String(e.name)),
  )) as string[];
}

function dedupe(els: ElementRecord[]): ElementRecord[] {
  const seen = new Set<string>();
  return els.filter(e => {
    const k = `${e.kind}::${e.name.toLowerCase()}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseContract(text: string): GeneratedContract {
  let json: any = null;
  const fence = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : (text.match(/\{[\s\S]*\}\s*$/)?.[0] ?? '');
  if (raw) {
    try { json = JSON.parse(raw.trim()); } catch { json = null; }
  }
  return { markdown: text.trim(), json };
}

// ─── Stage 2: per-layer prompt (BLOCK A system + BLOCK B grounding + BLOCK C tail) ──

const TERMINATOR = 'END OF PROMPT';

/** AC identifiers for the story, e.g. "AC1, AC2, AC3". */
function acList(session: PromptGenSession): string {
  const n = session.story.acceptanceCriteria.length;
  return n ? Array.from({ length: n }, (_, i) => `AC${i + 1}`).join(', ') : '(story acceptance criteria)';
}

/** BLOCK A — the system instruction for a single slice call. */
function buildLayerSystem(session: PromptGenSession, layer: LayerSpec): string {
  return [
    'You are generating ONE implementation prompt for ONE layer. You are not generating',
    'the contract, and you are not generating any other layer.',
    '',
    `LAYER: ${layer.label}`,
    `STORY: ${session.story.externalId || '(no id)'} - ${session.story.title}`,
    '',
    'The Cross-Layer Implementation Contract is supplied below as read-only input. Every',
    'type name, field name, route, status code, and DTO shape in your output must match',
    'the contract exactly. Do not rename, pluralise differently, add fields, or invent',
    'types not present in the contract or in the repository grounding block.',
    '',
    'Your output is a single self-contained markdown document with this exact section',
    'order and nothing else:',
    '',
    '  1. Role and Context      (table: project, branch, story, FSD ref, layer,',
    '                            namespace root, exact folder path, assigned Dev)',
    '  2. Prerequisite          (which prior slice must be committed first, and the exact',
    '                            type names this slice depends on; instruct the agent to',
    '                            SEARCH and CONFIRM those exist before building, not assume)',
    '  3. Scope                 (what this slice builds; explicit OUT OF SCOPE list)',
    '  4. Files to create       (table: full path, contents)',
    '  5. Files to modify       (table: full path, precise change; empty table if none)',
    '  6. Implementation detail (invariants, guard clauses, state transitions, mappings,',
    '                            registrations, in full, no ellipsis)',
    '  7. Tests to write        (literal test method names, one per line, in a fenced',
    '                            block; see coverage matrix in the grounding block)',
    '  8. Completion checklist  (checkbox list; use the tail template supplied)',
    '  9. Commit message        (conventional commit, one line)',
    ` 10. ${TERMINATOR}`,
    '',
    'Hard rules for your output:',
    '- Never abbreviate with "etc", "and so on", "...", or "similar to the above".',
    '  If a list has fourteen items, write fourteen items.',
    '- Never instruct the implementing agent to write a TODO, a stub, a placeholder, or',
    '  a NotImplementedException.',
    '- Never tell the implementing agent that failing tests are acceptable.',
    '- If a type the contract depends on may not exist yet, instruct the agent to STOP',
    '  and report the missing dependency. Do not instruct it to proceed on assumption.',
    '- For any contract element tagged EXTEND or REUSE, instruct the agent to MODIFY the',
    '  existing file/type in place; for NEW elements, create fresh files.',
    '- Use only the repository grounding namespaces/paths. Never invent Insurity.PnC.* or',
    '  Clean-Architecture folders. No banned construct from the grounding may appear.',
    `- If you are running short of output budget, cut section 6 detail depth. Never cut`,
    `  sections 7, 8, 9, or 10. The document must always terminate with ${TERMINATOR}.`,
  ].join('\n');
}

/** BLOCK C — the required tail template the slice must end with. */
function buildTailTemplate(session: PromptGenSession, layer: LayerSpec, nextLabel: string, nextIndex: number): string {
  const nextLine = nextLabel
    ? `Next: **PROMPT ${nextIndex} - ${nextLabel}**`
    : 'Next: (final slice — all layers for this story are complete)';
  return [
    'End your document with EXACTLY these sections (fill the placeholders; replace {scope}',
    'with the service name rules-engine or rating-engine, and {short summary} with a concise summary):',
    '',
    '## Completion checklist',
    '',
    '- [ ] Every file in "Files to create" exists and compiles',
    '- [ ] Every file in "Files to modify" was edited in place, no parallel file created',
    '- [ ] No stubs, no TODOs, no NotImplementedException, no commented-out code',
    '- [ ] No banned construct present (grep the banned list)',
    '- [ ] Every required construct for this layer present',
    '- [ ] CancellationToken on every async method',
    '- [ ] All tests in "Tests to write" exist and pass',
    '- [ ] dotnet build PC.slnx succeeds with zero warnings',
    '- [ ] validate-insurity.py passes',
    `- [ ] FSD AC IDs ${acList(session)} referenced in code comments or test names`,
    '- [ ] No dotnet ef migrations command was executed',
    '',
    'Paste this checklist back with every box ticked before proceeding to the next prompt.',
    '',
    `**Commit message:** \`feat({scope}): ${session.story.externalId || ''} ${layer.label} - {short summary}\``,
    '',
    nextLine,
    '',
    TERMINATOR,
  ].join('\n');
}

/** BLOCK B grounding + contract + foundation + story = the user content for a slice. */
function buildLayerUser(
  session: PromptGenSession,
  profile: TechProfile,
  layer: LayerSpec,
  contract: GeneratedContract,
  context: string,
  foundation: string,
  prevLabel: string,
  nextLabel: string,
  nextIndex: number,
): string {
  const frameworkNotes =
    layer.id === 'ui' ? `\n=== FRAMEWORK NOTES (UI / Aurora) ===\n${profile.frameworkNotes}\n` : '';
  const priorNames = extractReuseExtendNames(contract.json);
  const prereq = prevLabel
    ? `PREREQUISITE: the ${prevLabel} slice must be committed first. This slice depends on the types it defines`
      + (priorNames.length ? ` and on these reused/extended elements: ${priorNames.join(', ')}.` : '.')
    : 'PREREQUISITE: this is the first slice; it depends only on the shared kernel and contract.';
  return [
    INSURITY_GROUNDING,
    '',
    `LAYER GUIDANCE (what this slice covers): ${layer.guidance}`,
    '',
    prereq,
    '',
    'TARGET STACK:',
    profile.stackSummary,
    frameworkNotes,
    foundation ? '=== EXISTING PROJECT FOUNDATION (reuse/extend, do not duplicate) ===\n' + foundation + '\n' : '',
    '=== CROSS-LAYER IMPLEMENTATION CONTRACT (read-only, authoritative for names/shapes) ===',
    contract.markdown,
    '',
    '=== SELECTED USER STORY ===',
    storyBlock(session),
    '',
    '=== ADDITIONAL CONTEXT (spec / standards / memory excerpts) ===',
    context || '(none)',
    '',
    buildTailTemplate(session, layer, nextLabel, nextIndex),
    '',
    'Output ONLY the implementation prompt markdown, sections 1-10 in order, ending with the tail above.',
    'No preamble and no explanation of what you are doing.',
  ].filter(Boolean).join('\n');
}

/** True if the slice terminated with the required END OF PROMPT marker. */
function terminatedOk(text: string): boolean {
  const lines = text.trimEnd().split('\n').map(l => l.trim()).filter(Boolean);
  return lines.length > 0 && lines[lines.length - 1] === TERMINATOR;
}

// ─── Orchestration ─────────────────────────────────────────────────────────────

export async function runGeneration(session: PromptGenSession): Promise<void> {
  const profile = getTechProfile(session.techProfileId);

  if (!hasKey()) {
    session.status = 'error';
    session.error =
      'No Anthropic API key configured. Set AI_INTEGRATIONS_ANTHROPIC_API_KEY (and _BASE_URL) or ANTHROPIC_API_KEY.';
    emit(session, { event: 'error', message: session.error });
    return;
  }

  try {
    session.status = 'running';
    emit(session, { event: 'status', status: 'running', story: session.story, techProfile: profile.name });

    const context = assembleContext(session);
    const storyText = `${session.story.externalId} ${session.story.title} ${session.story.description} ${session.story.acceptanceCriteria.join(' ')}`;

    // Retrieve the accumulated project foundation (stories 1..N-1). Non-fatal.
    let foundation = '';
    try {
      const { getFoundationContext } = await import('./prompt-gen-db');
      foundation = await getFoundationContext(session.projectId, storyText);
    } catch (e: any) {
      console.warn('[PromptGen] foundation retrieval failed (non-fatal):', e?.message);
    }
    if (foundation) emit(session, { event: 'foundation', hasFoundation: true });

    // Stage 1 — contract (reconciled against the foundation)
    emit(session, { event: 'contract_start', model: resolveModel(profile.contractModel) });
    const contractText = await callClaude(
      profile.contractModel,
      'You design precise, implementation-ready contracts. Be exact and consistent with names.',
      buildContractPrompt(session, profile, context, foundation),
      16000,
    );
    session.contract = parseContract(contractText);
    emit(session, {
      event: 'contract_ready',
      markdown: session.contract.markdown,
      json: session.contract.json,
    });

    // Stage 2 — one call per slice (parallel). Each is generated at a high token
    // budget with an END OF PROMPT terminator assertion; a truncated slice is
    // discarded and regenerated (up to 3 attempts) before it reaches a developer.
    const ordered = [...profile.layers].sort((a, b) => a.order - b.order);
    await Promise.all(
      ordered.map((layer, idx) =>
        limit(async () => {
          const target = session.layers.find(l => l.layerId === layer.id)!;
          const prevLabel = idx > 0 ? ordered[idx - 1].label : '';
          const nextLabel = idx < ordered.length - 1 ? ordered[idx + 1].label : '';
          const nextIndex = idx + 2; // this slice is PROMPT idx+1; next is idx+2
          target.status = 'running';
          emit(session, { event: 'layer_start', layerId: layer.id, label: layer.label, model: resolveModel(layer.model) });
          try {
            const system = buildLayerSystem(session, layer);
            const user = buildLayerUser(session, profile, layer, session.contract!, context, foundation, prevLabel, nextLabel, nextIndex);
            let prompt = '';
            let ok = false;
            for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
              prompt = (await callClaude(layer.model, system, user, 16000)).trim();
              ok = terminatedOk(prompt);
              if (!ok) emit(session, { event: 'layer_retry', layerId: layer.id, label: layer.label, attempt });
            }
            target.prompt = prompt;
            target.status = 'done';
            if (!ok) {
              target.error = 'slice did not terminate with END OF PROMPT after 3 attempts (possible truncation)';
              emit(session, { event: 'layer_warning', layerId: layer.id, label: layer.label, message: target.error });
            }
            emit(session, { event: 'layer_done', layerId: layer.id, label: layer.label, prompt: target.prompt, terminated: ok });
          } catch (err: any) {
            target.status = 'error';
            target.error = err?.message ?? 'generation failed';
            emit(session, { event: 'layer_error', layerId: layer.id, label: layer.label, message: target.error });
          }
        }),
      ),
    );

    const anyOk = session.layers.some(l => l.status === 'done');
    session.status = anyOk ? 'complete' : 'error';
    if (!anyOk) session.error = 'All layers failed to generate.';

    // Persist the run + upsert its elements into the project catalog. Non-fatal.
    try {
      const { saveRun, upsertElements } = await import('./prompt-gen-db');
      await saveRun({
        id: session.sessionId,
        projectId: session.projectId,
        userId: session.userId,
        storyExternalId: session.story.externalId,
        storyTitle: session.story.title,
        techProfileId: profile.id,
        contractJson: session.contract?.json ?? null,
        contractMarkdown: session.contract?.markdown ?? '',
        status: session.status,
        layers: session.layers.map(l => ({ layerId: l.layerId, label: l.label, model: l.model, prompt: l.prompt })),
      });
      let elements = extractElements(session.contract?.json);
      // Fallback: if the contract JSON was missing/truncated, extract the element
      // catalog directly from the contract markdown via a cheap dedicated call.
      if (elements.length === 0 && session.contract?.markdown) {
        try { elements = await extractElementsLLM(session.contract.markdown); }
        catch (e: any) { console.warn('[PromptGen] element extraction fallback failed:', e?.message); }
      }
      if (elements.length) await upsertElements(session.projectId, session.sessionId, session.story.externalId, elements);
      emit(session, { event: 'persisted', elementCount: elements.length });
    } catch (e: any) {
      console.warn('[PromptGen] persistence failed (non-fatal):', e?.message);
    }

    emit(session, { event: session.status === 'complete' ? 'complete' : 'error', message: session.error ?? undefined });
  } catch (err: any) {
    session.status = 'error';
    session.error = err?.message ?? 'generation failed';
    emit(session, { event: 'error', message: session.error });
  }
}

// ─── Story extraction (helper used by the /stories/extract route) ───────────────

type ExtractedStory = { externalId: string; title: string; description: string; acceptanceCriteria: string[] };

/** Extract stories from a single chunk of spec text. */
async function extractStoriesFromChunk(chunk: string): Promise<ExtractedStory[]> {
  const text = await callClaude(
    'claude-sonnet-5',
    'You extract user stories from specifications accurately, without inventing content.',
    [
      'Extract every user story from the following specification excerpt. For each, return id (e.g. "US-4.1" if',
      'present, else ""), title, a one-paragraph description, and the acceptance criteria as an array of strings.',
      'Return ONLY a JSON array: [{ "externalId": "", "title": "", "description": "", "acceptanceCriteria": [] }].',
      'Include EVERY user story in this excerpt. If there are none, return [].',
      '',
      '=== SPECIFICATION EXCERPT ===',
      chunk,
    ].join('\n'),
    16000,
  );
  const raw = text.match(/\[[\s\S]*\]/)?.[0];
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map((s: any) => ({
      externalId: String(s.externalId ?? ''),
      title: String(s.title ?? 'Untitled story'),
      description: String(s.description ?? ''),
      acceptanceCriteria: Array.isArray(s.acceptanceCriteria) ? s.acceptanceCriteria.map(String) : [],
    }));
  } catch {
    return [];
  }
}

/**
 * Extract stories from a spec of ANY size. Large specs (e.g. a ~1MB FSD) exceed the
 * model context window, so we scan the whole document in overlapping windows, run the
 * chunks in parallel, then merge + dedupe (by externalId, else title).
 */
export async function extractStories(
  fsdText: string,
  onProgress?: (done: number, total: number) => void,
): Promise<ExtractedStory[]> {
  if (!hasKey() || !fsdText.trim()) return [];
  const CHUNK = 120_000, OVERLAP = 2_000;
  const chunks: string[] = [];
  if (fsdText.length <= CHUNK) {
    chunks.push(fsdText);
  } else {
    for (let i = 0; i < fsdText.length; i += CHUNK - OVERLAP) chunks.push(fsdText.slice(i, i + CHUNK));
  }
  let done = 0;
  onProgress?.(0, chunks.length);
  const results = await Promise.all(chunks.map(c => limit(async () => {
    const r = await extractStoriesFromChunk(c).catch(() => [] as ExtractedStory[]);
    done += 1;
    onProgress?.(done, chunks.length);
    return r;
  })));

  const seen = new Set<string>();
  const out: ExtractedStory[] = [];
  for (const s of results.flat()) {
    const key = (s.externalId || s.title || '').toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}
