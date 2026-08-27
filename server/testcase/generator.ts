/**
 * Rule-based candidate generation — intent-first, NOT fan-out.
 * Per acceptance criterion we emit at most one positive, one negative, and
 * (where applicable) one edge candidate. Data variants fold into a testData
 * table on the positive case, never separate cases (PART 1). Steps are
 * workflow-derived and concrete (PART 2, PART 3). No narrative in titles,
 * no truncation, unique IDs, named preconditions (PART 4).
 */
import type {
  AcceptanceCriterion, CandidateTestCase, CoverageType, StoryInput, SystemVocabulary,
  TestDataVariant, TestStep,
} from "./types.js";
import { computeIntentKey } from "./intent.js";
import { classifyComplexity, stepBudget, negativeBudget, edgeBudget, renumber } from "./steps.js";
import { buildVocabulary, primaryObject, stripNarrative } from "./vocab.js";
import {
  detectArchetype, scenarioSteps, scenarioPreconditions,
  type Archetype, type ScenarioCtx,
} from "./scenarios.js";
import { authorTitle, normalizeTitle } from "./title.js";

// ── Story parsing helpers ─────────────────────────────────────────────────────

/**
 * One criterion per input line. When the author already separated the criteria by
 * newlines (the normal case), that structure is authoritative and a criterion is
 * NEVER split further — a multi-sentence criterion such as "... default 1. The
 * dropdown is disabled until checked." is one requirement, not two, and splitting
 * it would inflate the AC count and misreport traceability.
 * Sentence splitting is only a fallback for a single-blob paragraph.
 */
export function parseAcceptanceCriteria(raw: string): AcceptanceCriterion[] {
  const clean = (s: string) => s.replace(/^[-•*\s]*(?:AC\s*\d+\s*[:.)-]\s*)?/i, "").replace(/^[\d.)\s]+/, "").trim();

  const byLine = (raw || "").split(/\r?\n/).map(clean).filter(s => s.length > 4);
  if (byLine.length >= 2) {
    return byLine.map((text, i) => ({ id: `AC-${i + 1}`, text }));
  }

  const bySentence = (raw || "")
    .split(/(?<=[.;])\s+(?=[A-Z0-9])/)
    .map(clean)
    .filter(s => s.length > 4);
  return bySentence.map((text, i) => ({ id: `AC-${i + 1}`, text }));
}

export function extractActor(description: string, title = ""): string {
  // Stop at the clause boundary. A missing comma ("As an enrolment specialist I want
  // ...") must not swallow the rest of the sentence into the actor name.
  const m = (description || "").match(/as an?\s+([^,.\n]+)/i);
  if (m) {
    const actor = m[1]
      .split(/\s+i\s+(?:want|need|would|should|can|must)\b|\s+so that\b|\s+in order to\b/i)[0]
      .trim()
      .split(/\s+/)
      .slice(0, 4)          // a role is a short noun phrase, never a sentence
      .join(" ");
    if (actor.length > 1) return actor;
  }
  // Title pattern: "Underwriter can ...", "Store Admin should ..."
  const t = title.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:can|should|must|needs?|wants?)/);
  if (t) return t[1].trim();
  return "Test Analyst"; // concrete named role (never the generic "authenticated user")
}

function extractValues(acText: string): string[] {
  const out: string[] = [];
  for (const m of Array.from(acText.matchAll(/"([^"]{2,40})"|'([^']{2,40})'/g))) out.push((m[1] || m[2]).trim());
  for (const m of Array.from(acText.matchAll(/\b([a-z]+-[a-z]+(?:\s+[a-z]+)?)\b/gi))) {
    if (m[1].length > 5) out.push(m[1].trim());
  }
  return Array.from(new Set(out)).slice(0, 8);
}

function normalizeAcAction(acText: string): string {
  return stripNarrative(acText).replace(/^(the\s+)?system\s+(shall|should|must|will)\s+/i, "").trim();
}

// PART 1 STEP 1.1 - the 90-character title cap that lived here is DELETED.
// Titles are authored short by title.ts (5 to 12 words) and are never sliced.
// PART 2 STEP 2.1 - titles are authored labels, never the criterion pasted in.

// ── Step synthesis ────────────────────────────────────────────────────────────

function q(s: string): string { return `"${s}"`; }

/**
 * Padding steps, used only when the complexity band asks for more depth than the
 * scenario itself supplies. Domain-neutral verification work, so they stay
 * truthful whichever archetype they land in. Exported so audit-steps.ts can prove
 * every one satisfies the same step-quality predicates as the scenario steps.
 */
export function PADDING_EXTRAS(cov: CoverageType, v: ScenarioCtx): [string, string][] {
  if (cov === "negative") return [
    [`Inspect the message displayed when the action on the ${q(v.object)} was refused`, `The message names what was refused and why, in language a tester can act on`],
    [`Query the ${q(v.table)} table after the refused action`, `The row count in the ${q(v.table)} table is unchanged`],
    [`Inspect the audit trail in the ${q(v.table)} table after the refused action`, `No successful-change entry is recorded for the refused action`],
    [`Attempt the same disallowed action on the ${q(v.object)} once more`, `The repeat attempt is refused identically and no partial row is written`],
    [`Compare every value on the ${q(v.screen)} against the state noted before the attempt`, `Every value read before the attempt is unchanged afterwards`],
  ];
  if (cov === "edge") return [
    [`Query the ${q(v.table)} table for the boundary record`, `The stored boundary value in the ${q(v.table)} table is exact and not silently altered`],
    [`Repeat the boundary case on the ${q(v.object)} immediately after the first attempt`, `The repeat produces the identical stored value with no drift`],
    [`Inspect the audit trail in the ${q(v.table)} table for the boundary attempts`, `Each boundary attempt is recorded with its own entry`],
    [`Query the ${q(v.table)} table for records adjacent to the boundary record`, `Every adjacent row is unchanged`],
    [`Inspect the ${q(v.device)} logs for exceptions raised at the boundary`, `No exception is logged for the boundary attempt`],
  ];
  return [
    [`Query the ${q(v.table)} table and compare it against the values shown on the ${q(v.screen)}`, `The stored row in the ${q(v.table)} table matches the ${q(v.screen)} exactly`],
    [`Inspect the audit trail entry recorded in the ${q(v.table)} table for this change`, `An audit entry records the change and the ${q(v.actor)} who made it`],
    [`Re-run the same flow for ${q(v.product)} a second time end to end`, `The second run produces an identical result and no duplicate row is created`],
    [`Inspect the cart total, promotions, tax, and receipt output for a non-restricted control product on the ${q(v.device)}`, `No unrelated total, promotion, tax, or receipt value changed`],
    [`Inspect the ${q(v.device)} and ADM logs for errors raised during the flow`, `No error message, warning banner, or exception is logged`],
  ];
}

/**
 * Trim or pad a concrete step list to the target budget without templating.
 * Padding is coverage-aware: a negative test must never assert the happy-path
 * outcome, which would make the case self-contradictory.
 */
function fit(pairs: [string, string][], budget: number, v: ScenarioCtx, cov: CoverageType): TestStep[] {
  let list = pairs.slice();
  if (list.length > budget) list = list.slice(0, budget);
  const extras = PADDING_EXTRAS(cov, v);
  let ei = 0;
  while (list.length < budget && ei < extras.length) list.push(extras[ei++]);
  return renumber(list.map(([action, expected_behavior]) => ({ step_number: 0, action, expected_behavior })));
}

// ── Candidate assembly ────────────────────────────────────────────────────────

let seqByStory: Record<string, number> = {};
function nextId(storyId: string): string {
  seqByStory[storyId] = (seqByStory[storyId] ?? 0) + 1;
  return `TC-${storyId}-${String(seqByStory[storyId]).padStart(3, "0")}`;
}
export function resetIdCounters(): void { seqByStory = {}; }

export interface GenerateOptions {
  docTexts?: string[];
}

/** A human tester persona. "As a system" / "As QA" are not usable step actors. */
function testerPersona(actor: string): string {
  if (/^(the\s+)?(system|service|platform|kiosk|application|app)$/i.test(actor.trim())) return "Test Analyst";
  if (/^qa$/i.test(actor.trim())) return "QA Engineer";
  return actor;
}

/** Pick a named table for the criterion, preferring one the criterion itself names. */
function tableFor(acText: string, vocab: SystemVocabulary, fallback: string): string {
  const named = acText.match(/\b(singlesaleblockedevents|pricingrec|productlocation|sfecfg|MEMBER_MASTER)\b/i);
  if (named) return named[1];
  return vocab.tables[0] || fallback;
}

/** The configured limit mentioned by the criterion, if any (1 to 5 in this domain). */
function limitFor(acText: string): string {
  const range = acText.match(/\b1\s*(?:through|to|-)\s*5\b/i);
  if (range) return "1";
  const limited = acText.match(/limited to\s+(\d+)/i) || acText.match(/\blimit of\s+(\d+)/i);
  if (limited) return limited[1];
  return "1";
}

export function generateCandidates(story: StoryInput, opts: GenerateOptions = {}): CandidateTestCase[] {
  const acs = parseAcceptanceCriteria(story.acceptanceCriteria);
  const actor = testerPersona(extractActor(story.description, story.title));
  const vocab: SystemVocabulary = buildVocabulary(story.acceptanceCriteria, opts.docTexts || []);
  const storyBlob = `${story.title}\n${story.description}\n${story.acceptanceCriteria}`;

  // Story-level named objects, resolved once from the ACs and documents.
  const screen = vocab.screens[0] || "Location Summary page";
  const button = vocab.buttons[0] || "Save";
  const endpoint = vocab.endpoints[0] || "/api/sync";
  const setting =
    (storyBlob.match(/"([^"]{3,40})"\s*(?:Yes\/No\s*)?setting/i)?.[1]) ||
    (storyBlob.match(/\b(Sale Qty Restriction|SINGLESALEQTYRESTRICTION)\b/i)?.[1]) ||
    vocab.entities[0] || "the setting";
  const report =
    storyBlob.match(/"([^"]{5,60})"\s*(?:report|is added)/i)?.[1] ||
    (/blocked scan events/i.test(storyBlob) ? "Single Sale Blocked Scan Events" : "the report");
  const device = /\bV5\b/i.test(storyBlob) ? "V5 kiosk" : "kiosk";
  const location = "Location A";
  const product = "Single Sale Product A";
  const out: CandidateTestCase[] = [];

  acs.forEach((ac, idx) => {
    const object = primaryObject(ac.text, vocab);
    const table = tableFor(ac.text, vocab, "pricingrec");
    const values = extractValues(ac.text);
    const primaryValue = values[0] || "a valid value";
    const complexity = classifyComplexity(ac.text);
    const budget = stepBudget(complexity, ac.text);
    const pPriority = idx === 0 ? "P0" : idx === 1 ? "P1" : "P2";
    const arch = detectArchetype(ac.text, story.title);

    const sctx: ScenarioCtx = {
      actor, screen, setting, object, value: primaryValue, limit: limitFor(ac.text),
      product, table, secondTable: /sosdb/i.test(ac.text) ? "SOSDB" : "SOSDB",
      endpoint, device, location, report, button,
    };
    const pre = scenarioPreconditions(arch, sctx);

    // Data variants (PART 1.3 Rule 2): every specific value becomes a row, not a case.
    const testData: TestDataVariant[] = values.length > 1
      ? values.map(val => ({ variant: `value ${val}`, inputs: { [object]: val }, expected: `${object} accepts and stores ${val}` }))
      : [];

    // Positive
    out.push(mk({
      story, acId: ac.id, acText: ac.text, actor, object,
      title: authorTitle("positive", arch, sctx, ac.text),
      objective: `Verify ${ac.id}: ${normalizeAcAction(ac.text)}`,
      preconditions: pre,
      steps: fit(scenarioSteps(arch, "positive", sctx), budget, sctx, "positive"),
      expectedResult: `${ac.id} is satisfied: ${normalizeAcAction(ac.text)}`,
      testData, complexity, coverageType: "positive",
      testType: "Functional", category: "functional", priority: pPriority,
      action: ac.text, outcome: normalizeAcAction(ac.text), archetype: arch,
    }));

    // Negative
    out.push(mk({
      story, acId: ac.id, acText: ac.text, actor, object,
      title: authorTitle("negative", arch, sctx, ac.text),
      objective: `Verify the rule in ${ac.id} holds when it is violated or its precondition is absent: ${normalizeAcAction(ac.text)}`,
      preconditions: pre,
      steps: fit(scenarioSteps(arch, "negative", sctx), negativeBudget(budget), sctx, "negative"),
      expectedResult: `The disallowed path is refused or produces no effect, and no data is created or altered contrary to ${ac.id}.`,
      testData: [], complexity: complexity === "COMPLEX" ? "STANDARD" : complexity, coverageType: "negative",
      testType: "Negative", category: "negative", priority: idx === 0 ? "P1" : "P2",
      action: `violate ${arch} rule for ${ac.id}`, outcome: `refused with no contrary data change for ${ac.id}`, archetype: arch,
    }));

    // Edge
    if (values.length > 0 || vocab.fields.length > 0 || arch !== "GENERIC") {
      out.push(mk({
        story, acId: ac.id, acText: ac.text, actor, object,
        title: authorTitle("edge", arch, sctx, ac.text),
        objective: `Verify boundary and limit handling for ${ac.id}: ${normalizeAcAction(ac.text)}`,
        preconditions: pre,
        steps: fit(scenarioSteps(arch, "edge", sctx), edgeBudget(budget), sctx, "edge"),
        expectedResult: `Values at the supported boundary are handled correctly and values beyond it are refused, consistent with ${ac.id}.`,
        testData: [], complexity: "STANDARD", coverageType: "edge",
        testType: "Edge", category: "edge_case", priority: "P2",
        action: `boundary of ${arch} rule for ${ac.id}`, outcome: `boundary accepted and beyond-boundary refused for ${ac.id}`, archetype: arch,
      }));
    }
  });

  return out;
}

function mk(a: {
  story: StoryInput; acId: string; acText: string; actor: string; object: string;
  linkedAcs?: string[];
  title: string; objective: string; preconditions: string[]; steps: TestStep[];
  expectedResult: string; testData: TestDataVariant[];
  complexity: CandidateTestCase["complexity"]; coverageType: CandidateTestCase["coverageType"];
  testType: CandidateTestCase["testType"]; category: CandidateTestCase["category"];
  priority: CandidateTestCase["priority"]; action: string; outcome: string;
  archetype: string;
}): CandidateTestCase {
  return {
    testCaseId: nextId(a.story.storyId),
    storyId: a.story.storyId,
    acIds: [a.acId],
    // PART 2 STEP 2.2 - full criterion text, verbatim and untruncated.
    linkedAcceptanceCriteria: a.acText,
    title: normalizeTitle(a.title),   // PART 4 normalisation before storage
    description: `${a.coverageType} coverage for ${a.acId}: ${a.acText}`,
    objective: a.objective,
    preconditions: a.preconditions,
    testSteps: a.steps,
    expectedResult: a.expectedResult,
    postconditions: [`${a.object} state is consistent`, "Audit trail recorded"],
    testData: a.testData,
    testType: a.testType,
    category: a.category,
    priority: a.priority,
    complexity: a.complexity,
    coverageType: a.coverageType,
    archetype: a.archetype,
    intentKey: computeIntentKey({
      actor: a.actor, object: a.object, action: a.action,
      expectedOutcome: a.outcome, preconditions: a.preconditions,
    }),
  };
}
