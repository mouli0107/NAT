/**
 * prompt-gen-db.ts — persistence for the AI-DLC Prompt Generator.
 *
 * Project-scoped storage that lets the engine build story N on top of stories
 * 1..N-1. Two kinds of data:
 *   - Append-only HISTORY  (pg_runs + pg_layers): every generation's contract
 *     and layer prompts. Cheap (~30 KB/story), never fully loaded into context.
 *   - Canonical ELEMENT CATALOG (pg_elements): one deduped row per domain
 *     element (aggregate/entity/event/command/endpoint/dto/ui), keyed by
 *     (project, kind, lower(name)). This grows with the DOMAIN MODEL (bounded),
 *     not the story count, and is what makes 100+ stories tractable.
 *
 * Self-bootstrapping (CREATE TABLE IF NOT EXISTS) on the shared pg pool, so it
 * works without a migration step. Retrieval here is keyword/module based (no
 * embeddings) — sufficient at this scale; pgvector can be layered on later.
 */
import { randomUUID } from 'crypto';
import { pool } from '../db';

export interface ElementRecord {
  kind: string;        // aggregate | entity | valueObject | event | command | query | dto | endpoint | ui
  name: string;
  module: string;      // bounded context / feature area
  summary: string;
  status?: string;     // new | extend | reuse  (reconciliation tag)
}

export interface RunRecord {
  id: string;
  projectId: string;
  storyExternalId: string;
  storyTitle: string;
  techProfileId: string;
  contractJson: any;
  contractMarkdown: string;
  status: string;
  createdAt: string;
  layerCount?: number;
}

let ready: Promise<void> | null = null;

/** Create tables once (idempotent). */
export function ensureTables(): Promise<void> {
  if (ready) return ready;
  ready = (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pg_projects (
        id text PRIMARY KEY,
        tenant_id text,
        user_id text NOT NULL,
        name text NOT NULL,
        repo_url text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS pg_runs (
        id text PRIMARY KEY,
        project_id text NOT NULL,
        user_id text NOT NULL,
        story_external_id text,
        story_title text NOT NULL,
        tech_profile_id text,
        contract_json jsonb,
        contract_markdown text,
        status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS pg_layers (
        id text PRIMARY KEY,
        run_id text NOT NULL,
        layer_id text NOT NULL,
        label text,
        model text,
        prompt text
      );
      CREATE TABLE IF NOT EXISTS pg_elements (
        id text PRIMARY KEY,
        project_id text NOT NULL,
        kind text NOT NULL,
        name text NOT NULL,
        module text,
        summary text,
        signature text,
        status text,
        history jsonb NOT NULL DEFAULT '[]'::jsonb,
        last_run_id text,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS pg_elements_uniq
        ON pg_elements (project_id, kind, lower(name));
      CREATE INDEX IF NOT EXISTS pg_runs_project ON pg_runs (project_id);
      CREATE INDEX IF NOT EXISTS pg_layers_run ON pg_layers (run_id);
      CREATE INDEX IF NOT EXISTS pg_elements_project ON pg_elements (project_id);
    `);
  })();
  return ready;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProject(userId: string, tenantId: string, name: string, repoUrl?: string) {
  await ensureTables();
  const id = `proj-${randomUUID().slice(0, 8)}`;
  await pool.query(
    `INSERT INTO pg_projects (id, tenant_id, user_id, name, repo_url) VALUES ($1,$2,$3,$4,$5)`,
    [id, tenantId, userId, name, repoUrl ?? null],
  );
  return { id, name, repoUrl: repoUrl ?? null };
}

export async function listProjects(userId: string) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.repo_url AS "repoUrl", p.created_at AS "createdAt",
            (SELECT count(*) FROM pg_runs r WHERE r.project_id = p.id) AS "runCount",
            (SELECT count(*) FROM pg_elements e WHERE e.project_id = p.id) AS "elementCount"
       FROM pg_projects p WHERE p.user_id = $1 ORDER BY p.created_at DESC`,
    [userId],
  );
  return rows;
}

export async function getProject(userId: string, projectId: string) {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT id, name, repo_url AS "repoUrl" FROM pg_projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId],
  );
  return rows[0] ?? null;
}

// ─── Runs + layers ───────────────────────────────────────────────────────────

export async function saveRun(run: {
  id: string; projectId: string; userId: string; storyExternalId: string; storyTitle: string;
  techProfileId: string; contractJson: any; contractMarkdown: string; status: string;
  layers: { layerId: string; label: string; model: string; prompt: string }[];
}) {
  await ensureTables();
  await pool.query(
    `INSERT INTO pg_runs (id, project_id, user_id, story_external_id, story_title, tech_profile_id, contract_json, contract_markdown, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (id) DO UPDATE SET contract_json = EXCLUDED.contract_json,
       contract_markdown = EXCLUDED.contract_markdown, status = EXCLUDED.status`,
    [run.id, run.projectId, run.userId, run.storyExternalId, run.storyTitle, run.techProfileId,
     run.contractJson ? JSON.stringify(run.contractJson) : null, run.contractMarkdown, run.status],
  );
  for (const l of run.layers) {
    if (!l.prompt) continue;
    await pool.query(
      `INSERT INTO pg_layers (id, run_id, layer_id, label, model, prompt) VALUES ($1,$2,$3,$4,$5,$6)`,
      [`pgl-${randomUUID().slice(0, 8)}`, run.id, l.layerId, l.label, l.model, l.prompt],
    );
  }
}

/** Upsert contract elements into the canonical catalog (dedup by project+kind+name). */
export async function upsertElements(projectId: string, runId: string, storyExternalId: string, elements: ElementRecord[]) {
  await ensureTables();
  for (const el of elements) {
    if (!el.name?.trim()) continue;
    const histEntry = JSON.stringify([{ runId, story: storyExternalId, changeType: el.status ?? 'new' }]);
    await pool.query(
      `INSERT INTO pg_elements (id, project_id, kind, name, module, summary, signature, status, history, last_run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
       ON CONFLICT (project_id, kind, lower(name)) DO UPDATE SET
         module = COALESCE(NULLIF(EXCLUDED.module,''), pg_elements.module),
         summary = COALESCE(NULLIF(EXCLUDED.summary,''), pg_elements.summary),
         status = EXCLUDED.status,
         history = pg_elements.history || $9::jsonb,
         last_run_id = EXCLUDED.last_run_id,
         updated_at = now()`,
      [`pge-${randomUUID().slice(0, 8)}`, projectId, el.kind, el.name, el.module ?? '', el.summary ?? '',
       '', el.status ?? 'new', histEntry, runId],
    );
  }
}

/** Copy another project's element catalog into this one (both must be owned by the caller). */
export async function importFromProject(userId: string, sourceId: string, targetId: string): Promise<number> {
  await ensureTables();
  const own = await pool.query(
    `SELECT id FROM pg_projects WHERE user_id = $1 AND id = ANY($2::text[])`,
    [userId, [sourceId, targetId]],
  );
  if (own.rows.length !== 2) throw new Error('Both projects must exist and belong to you.');
  const { rows } = await pool.query(
    `SELECT kind, name, module, summary, status FROM pg_elements WHERE project_id = $1`, [sourceId],
  );
  await upsertElements(targetId, `import-${sourceId}`, 'imported', rows as ElementRecord[]);
  return rows.length;
}

/** Build a STORY-REGISTER.md for a project from its runs + element catalog. */
export async function getStoryRegister(projectId: string, projectName: string): Promise<string> {
  const [runs, elements] = await Promise.all([getRuns(projectId), getElements(projectId)]);
  const lines: string[] = [];
  lines.push(`# STORY-REGISTER — ${projectName}`, '');
  lines.push(`_Generated by Ascent (AI-DLC Prompt Engine by Artizent). ${runs.length} stories · ${elements.length} catalog elements._`, '');
  lines.push('## Stories', '');
  if (runs.length === 0) {
    lines.push('_No stories generated yet._', '');
  } else {
    lines.push('| ID | Story | Status | Layers | Generated |');
    lines.push('|----|-------|--------|--------|-----------|');
    for (const r of runs) {
      const when = typeof r.createdAt === 'string' ? r.createdAt.slice(0, 10) : String(r.createdAt).slice(0, 10);
      lines.push(`| ${r.storyExternalId || '—'} | ${escapePipe(r.storyTitle)} | ${r.status} | ${(r as any).layerCount ?? 0} | ${when} |`);
    }
    lines.push('');
  }
  lines.push('## Element Catalog', '');
  if (elements.length === 0) {
    lines.push('_No elements yet._', '');
  } else {
    lines.push('| Kind | Name | Module | Status |');
    lines.push('|------|------|--------|--------|');
    for (const e of elements) {
      lines.push(`| ${e.kind} | ${escapePipe(e.name)} | ${e.module || '—'} | ${e.status || 'new'} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function escapePipe(s: string): string { return String(s ?? '').replace(/\|/g, '\\|'); }

// ─── Knowledge / retrieval ───────────────────────────────────────────────────

export async function getElements(projectId: string): Promise<any[]> {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT kind, name, module, summary, status, history, updated_at AS "updatedAt"
       FROM pg_elements WHERE project_id = $1 ORDER BY module, kind, name`,
    [projectId],
  );
  return rows;
}

export async function getRuns(projectId: string): Promise<RunRecord[]> {
  await ensureTables();
  const { rows } = await pool.query(
    `SELECT r.id, r.story_external_id AS "storyExternalId", r.story_title AS "storyTitle",
            r.tech_profile_id AS "techProfileId", r.status, r.created_at AS "createdAt",
            r.contract_markdown AS "contractMarkdown", r.contract_json AS "contractJson",
            (SELECT count(*) FROM pg_layers l WHERE l.run_id = r.id) AS "layerCount"
       FROM pg_runs r WHERE r.project_id = $1 ORDER BY r.created_at DESC`,
    [projectId],
  );
  return rows as any;
}

export async function getProjectKnowledge(projectId: string) {
  const [elements, runs] = await Promise.all([getElements(projectId), getRuns(projectId)]);
  const moduleMap: Record<string, number> = {};
  for (const e of elements) {
    const m = e.module || '(unassigned)';
    moduleMap[m] = (moduleMap[m] ?? 0) + 1;
  }
  return {
    elements,
    runs: runs.map(r => ({
      id: r.id, storyExternalId: r.storyExternalId, storyTitle: r.storyTitle,
      status: r.status, createdAt: r.createdAt, layerCount: (r as any).layerCount,
    })),
    moduleMap: Object.entries(moduleMap).map(([module, count]) => ({ module, count })),
    elementCount: elements.length,
    storyCount: runs.length,
  };
}

/**
 * Assemble the FOUNDATION context the engine injects for a new story:
 *   - a module map (always, tiny)
 *   - the full deduped element index (names + one-line summaries)
 *   - top-k prior full contracts most relevant to this story (keyword/module scored)
 * Returns '' when the project has no prior foundation.
 */
export async function getFoundationContext(projectId: string, storyText: string): Promise<string> {
  const [elements, runs] = await Promise.all([getElements(projectId), getRuns(projectId)]);
  if (elements.length === 0 && runs.length === 0) return '';

  const parts: string[] = ['=== EXISTING PROJECT FOUNDATION (build on this — reuse/extend, do not duplicate) ==='];

  // Module map
  const moduleMap: Record<string, number> = {};
  for (const e of elements) { const m = e.module || '(unassigned)'; moduleMap[m] = (moduleMap[m] ?? 0) + 1; }
  if (Object.keys(moduleMap).length) {
    parts.push('## Modules: ' + Object.entries(moduleMap).map(([m, c]) => `${m} (${c})`).join(', '));
  }

  // Element catalog index (bounded — grows with the domain model, not story count)
  if (elements.length) {
    parts.push('## Existing elements (kind — Name [module]: summary):');
    for (const e of elements) {
      parts.push(`- ${e.kind} — ${e.name}${e.module ? ` [${e.module}]` : ''}${e.summary ? `: ${e.summary}` : ''}`);
    }
  }

  // Keyword/module relevance scoring to pick top-k FULL prior contracts.
  const terms = Array.from(new Set(
    (storyText.toLowerCase().match(/[a-z][a-z0-9]{3,}/g) ?? []).filter(t => !STOP.has(t)),
  ));
  const scored = runs
    .filter(r => r.contractMarkdown)
    .map(r => {
      const hay = `${r.storyTitle} ${r.contractMarkdown}`.toLowerCase();
      let score = 0;
      for (const t of terms) if (hay.includes(t)) score++;
      return { r, score };
    })
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score > 0)
    .slice(0, 3);

  if (scored.length) {
    parts.push('## Most relevant prior contracts (full detail):');
    for (const { r } of scored) {
      const md = (r.contractMarkdown || '').slice(0, 2500);
      parts.push(`### ${r.storyExternalId || ''} ${r.storyTitle}\n${md}`);
    }
  }

  return parts.join('\n');
}

const STOP = new Set(['this', 'that', 'with', 'from', 'have', 'will', 'when', 'user', 'story', 'they', 'them', 'able', 'want', 'should', 'shall', 'must', 'into', 'each', 'their', 'which', 'been', 'also']);
