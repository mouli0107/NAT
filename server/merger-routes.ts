// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 4: Framework Merger REST API
// server/merger-routes.ts
//
// All routes are scoped under /api/projects/:projectId/framework/
// and guarded by requireProjectMember.
//
// Routes
// ──────
//  GET  /tree                             Project tree (modules → features)
//  POST /modules                          Create module
//  POST /modules/:moduleId/features       Create feature
//  POST /recordings                       Trigger full merge (7 layers)
//  GET  /download                         Download project ZIP (?scope=project|module|feature|selected&scopeId=&projectName=)
//  POST /download/selected                Download selected TCs ZIP
//  GET  /assets                           List assets (?type=&key=)
//  GET  /assets/dead-code                 Unreferenced locator names
//  GET  /conflicts                        Open merge conflicts
//  POST /conflicts/:id/resolve            Resolve conflict
//  POST /conflicts/:id/suggest            AI merge suggestion
//  GET  /next-sequence                    Next TC sequence number
//  GET  /deduplication-log               Dedup log entries
//  POST /deduplicate/scan                 Scan for duplicate locators
// ─────────────────────────────────────────────────────────────────────────────

import type { Express, Request, Response } from 'express';
import { db } from './db.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import {
  modules,
  features,
  frameworkAssets,
  assetConflicts,
  deduplicationLog,
} from '@shared/schema';
import type { FullMergeInput } from './lib/merger/index.js';
import { frameworkMerger, buildProjectZip } from './lib/merger/index.js';
import { mergerDb } from './lib/merger/db-adapter.js';
import { requireProjectMember } from './middleware/project-access.js';

// ── Anthropic client for conflict AI suggestions ──────────────────────────────
const _anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY ?? '',
});

// ─────────────────────────────────────────────────────────────────────────────
// Route registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerMergerRoutes(app: Express): void {
  const base = '/api/projects/:projectId/framework';

  // ── Tree ──────────────────────────────────────────────────────────────────

  /**
   * GET /api/projects/:projectId/framework/tree
   * Returns { modules: [ { ...module, features: [ ...feature ] } ] }
   */
  app.get(`${base}/tree`, requireProjectMember, async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId as string;

      const mods = await db
        .select()
        .from(modules)
        .where(eq(modules.projectId, projectId))
        .orderBy(modules.createdAt);

      const modIds = mods.map(m => m.id);
      const feats = modIds.length
        ? await db
            .select()
            .from(features)
            .where(inArray(features.moduleId, modIds))
            .orderBy(features.createdAt)
        : [];

      const featsByModule = new Map<string, typeof feats>();
      for (const f of feats) {
        if (!featsByModule.has(f.moduleId)) featsByModule.set(f.moduleId, []);
        featsByModule.get(f.moduleId)!.push(f);
      }

      res.json({
        modules: mods.map(m => ({
          ...m,
          features: featsByModule.get(m.id) ?? [],
        })),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Modules ───────────────────────────────────────────────────────────────

  /**
   * POST /api/projects/:projectId/framework/modules
   * Body: { name: string; description?: string }
   */
  app.post(`${base}/modules`, requireProjectMember, async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId as string;
      const { name, description } = req.body as { name?: string; description?: string };
      if (!name?.trim()) return res.status(400).json({ error: 'name required' });

      const [mod] = await db
        .insert(modules)
        .values({ projectId, name: name.trim(), description: description ?? null })
        .returning();

      res.status(201).json(mod);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/projects/:projectId/framework/modules/:moduleId/features
   * Body: { name: string }
   */
  app.post(
    `${base}/modules/:moduleId/features`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const { moduleId } = req.params;
        const { name } = req.body as { name?: string };
        if (!name?.trim()) return res.status(400).json({ error: 'name required' });

        // Verify module belongs to this project
        const [mod] = await db
          .select({ id: modules.id })
          .from(modules)
          .where(and(eq(modules.id, moduleId), eq(modules.projectId, projectId)));

        if (!mod) return res.status(404).json({ error: 'Module not found in this project' });

        const [feat] = await db
          .insert(features)
          .values({ moduleId, name: name.trim() })
          .returning();

        res.status(201).json(feat);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── Recordings (merge trigger) ─────────────────────────────────────────────

  /**
   * POST /api/projects/:projectId/framework/recordings
   * Body: Omit<FullMergeInput, 'projectId'> — projectId comes from the URL
   */
  app.post(`${base}/recordings`, requireProjectMember, async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId as string;
      const input: FullMergeInput = { ...req.body, projectId };

      if (!input.tcId) return res.status(400).json({ error: 'tcId required' });
      if (!input.spec) return res.status(400).json({ error: 'spec required' });

      const result = await frameworkMerger.mergeRecordingIntoProject(input);
      res.status(201).json(result);
    } catch (err: any) {
      const status = err.message?.includes('already locked') ? 409 : 500;
      res.status(status).json({ error: err.message });
    }
  });

  // ── Download ──────────────────────────────────────────────────────────────

  /**
   * GET /api/projects/:projectId/framework/download
   * Query: scope=project|module|feature|selected (default: project)
   *        scopeId=<moduleName or featurePath>
   *        projectName=<name>
   */
  app.get(`${base}/download`, requireProjectMember, async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId as string;
      const scope = (req.query['scope'] as string) || 'project';
      const scopeId = req.query['scopeId'] as string | undefined;
      const projectName = (req.query['projectName'] as string) || 'NAT2-Project';

      const buf = await buildProjectZip(projectId, {
        scope: scope as any,
        scopeId,
        projectName,
      });

      const filename = `${projectName.replace(/[^\w-]+/g, '-')}-${scope}-TestSuite.zip`;
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buf);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/projects/:projectId/framework/download/selected
   * Body: { selectedTcIds: string[]; projectName?: string }
   */
  app.post(
    `${base}/download/selected`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const { selectedTcIds, projectName = 'NAT2-Project' } = req.body as {
          selectedTcIds?: string[];
          projectName?: string;
        };

        if (!selectedTcIds?.length) {
          return res.status(400).json({ error: 'selectedTcIds required' });
        }

        const buf = await buildProjectZip(projectId, {
          scope: 'selected',
          selectedTcIds,
          projectName,
        });

        const filename = `${projectName.replace(/[^\w-]+/g, '-')}-selected-TestSuite.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buf);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── Assets ────────────────────────────────────────────────────────────────

  /**
   * GET /api/projects/:projectId/framework/assets/dead-code
   * Returns locator units not referenced in any spec.
   * Must be registered BEFORE /assets so Express doesn't treat "dead-code" as assetKey.
   */
  app.get(
    `${base}/assets/dead-code`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;

        const [locatorRows, specRows] = await Promise.all([
          mergerDb.getAssetsByType(projectId, 'locator'),
          mergerDb.getAssetsByType(projectId, 'spec'),
        ]);

        const allSpecContent = specRows.map(s => s.content).join('\n');

        const dead = locatorRows
          .filter(l => l.unitName && !allSpecContent.includes(l.unitName))
          .map(l => ({
            id:       l.id,
            assetKey: l.assetKey,
            unitName: l.unitName,
            filePath: l.filePath,
          }));

        res.json({ count: dead.length, items: dead });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  /**
   * GET /api/projects/:projectId/framework/assets
   * Query: type=<assetType>  (optional filter)
   *        key=<assetKey>    (optional exact-match filter — URL-encoded)
   * Content is omitted from list responses for performance.
   */
  app.get(`${base}/assets`, requireProjectMember, async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId as string;
      const typeFilter = req.query['type'] as string | undefined;
      const keyFilter  = req.query['key']  as string | undefined;

      let rows = typeFilter
        ? await mergerDb.getAssetsByType(projectId, typeFilter)
        : await mergerDb.getAssetsByTypes(projectId, [
            'locator', 'page_object_method', 'action_step',
            'business_function', 'generic_util', 'fixture', 'spec', 'config',
          ]);

      if (keyFilter) {
        const decoded = decodeURIComponent(keyFilter);
        rows = rows.filter(r => r.assetKey === decoded);
      }

      // Strip content for list view
      res.json(rows.map(({ content: _c, ...rest }) => rest));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/projects/:projectId/framework/assets/:encodedKey
   * Returns full asset (including content).
   * :encodedKey should be encodeURIComponent(assetKey).
   */
  app.get(
    `${base}/assets/:encodedKey`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const assetKey  = decodeURIComponent(req.params['encodedKey'] ?? '');
        if (!assetKey) return res.status(400).json({ error: 'assetKey required' });

        // Search across all types for this key
        const rows = await db
          .select()
          .from(frameworkAssets)
          .where(
            and(
              eq(frameworkAssets.projectId, projectId),
              eq(frameworkAssets.assetKey, assetKey),
            ),
          );

        if (!rows.length) return res.status(404).json({ error: 'Asset not found' });
        res.json(rows[0]);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── Conflicts ─────────────────────────────────────────────────────────────

  /**
   * GET /api/projects/:projectId/framework/conflicts
   * Returns open merge conflicts for the project.
   */
  app.get(`${base}/conflicts`, requireProjectMember, async (req: Request, res: Response) => {
    try {
      const projectId = (req as any).projectId as string;
      const conflicts = await mergerDb.getOpenConflicts(projectId);
      res.json(conflicts);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/projects/:projectId/framework/conflicts/:id/resolve
   * Body: {
   *   resolution: 'keep_base' | 'keep_incoming' | 'custom';
   *   resolvedContent?: string;  // required when resolution === 'custom'
   * }
   */
  app.post(
    `${base}/conflicts/:id/resolve`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const conflictId = req.params['id'];
        const { resolution, resolvedContent } = req.body as {
          resolution?: string;
          resolvedContent?: string;
        };

        if (!resolution) return res.status(400).json({ error: 'resolution required' });
        if (resolution === 'custom' && !resolvedContent) {
          return res.status(400).json({ error: 'resolvedContent required for custom resolution' });
        }

        // Fetch the conflict
        const [conflict] = await db
          .select()
          .from(assetConflicts)
          .where(
            and(
              eq(assetConflicts.id, conflictId),
              eq(assetConflicts.projectId, projectId),
            ),
          );

        if (!conflict) return res.status(404).json({ error: 'Conflict not found' });
        if (conflict.status !== 'open') {
          return res.status(409).json({ error: 'Conflict is already resolved' });
        }

        // Determine winning content
        const winningContent =
          resolution === 'keep_base'     ? (conflict.baseContent ?? '') :
          resolution === 'keep_incoming' ? (conflict.incomingContent ?? '') :
          resolvedContent!;

        // Update the underlying asset
        const [asset] = await db
          .select()
          .from(frameworkAssets)
          .where(
            and(
              eq(frameworkAssets.projectId, projectId),
              eq(frameworkAssets.assetKey, conflict.assetKey),
            ),
          );

        if (asset) {
          await mergerDb.updateAsset(asset.id, {
            content:     winningContent,
            contentHash: null,
            changeNote:  `Conflict resolved: ${resolution}`,
          });
        }

        // Mark conflict resolved
        await db
          .update(assetConflicts)
          .set({
            status:     'resolved',
            resolvedAt: sql`now()`,
          })
          .where(eq(assetConflicts.id, conflictId));

        res.json({ success: true, resolution, conflictId });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  /**
   * POST /api/projects/:projectId/framework/conflicts/:id/suggest
   * Asks Claude to produce a merged version of the two conflicting contents.
   * Saves the suggestion to the conflict record and returns it.
   */
  app.post(
    `${base}/conflicts/:id/suggest`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const conflictId = req.params['id'];

        const [conflict] = await db
          .select()
          .from(assetConflicts)
          .where(
            and(
              eq(assetConflicts.id, conflictId),
              eq(assetConflicts.projectId, projectId),
            ),
          );

        if (!conflict) return res.status(404).json({ error: 'Conflict not found' });

        const prompt = `You are a Playwright test framework expert. Two versions of a test framework file conflict.

## File: ${conflict.assetKey} (type: ${conflict.assetType})

### BASE version (existing):
\`\`\`typescript
${(conflict.baseContent ?? '').slice(0, 3000)}
\`\`\`

### INCOMING version (new recording):
\`\`\`typescript
${(conflict.incomingContent ?? '').slice(0, 3000)}
\`\`\`

## Task
Produce a merged TypeScript version that:
1. Preserves all functionality from both versions
2. Eliminates duplicates (keep the more robust version of shared code)
3. Maintains the 5-layer NAT 2.0 framework conventions
4. Is valid, compilable TypeScript

Return ONLY the merged code — no explanation, no markdown fences.`;

        const message = await _anthropic.messages.create({
          model:      'claude-opus-4-5',
          max_tokens: 2048,
          messages:   [{ role: 'user', content: prompt }],
        });

        const suggestion =
          message.content
            .filter(b => b.type === 'text')
            .map(b => (b as { type: 'text'; text: string }).text)
            .join('') || '';

        // Persist suggestion
        await db
          .update(assetConflicts)
          .set({ aiSuggestion: suggestion })
          .where(eq(assetConflicts.id, conflictId));

        res.json({ suggestion, conflictId });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── Sequence / Utilities ──────────────────────────────────────────────────

  /**
   * GET /api/projects/:projectId/framework/next-sequence
   * Returns { nextSequence: "TC-043" } based on the highest TC sequence in spec assets.
   */
  app.get(
    `${base}/next-sequence`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const specs = await mergerDb.getAssetsByType(projectId, 'spec');

        const tcNums = specs
          .map(s => {
            const m = (s.assetKey ?? '').match(/TC-(\d+)/i);
            return m ? parseInt(m[1], 10) : 0;
          })
          .filter(n => n > 0);

        const maxNum = tcNums.length ? Math.max(...tcNums) : 0;
        const nextNum = maxNum + 1;
        const nextSequence = `TC-${String(nextNum).padStart(3, '0')}`;

        res.json({ nextSequence, currentMax: maxNum });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  /**
   * GET /api/projects/:projectId/framework/deduplication-log
   * Returns deduplication log entries for the project (most recent first).
   */
  app.get(
    `${base}/deduplication-log`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const rows = await db
          .select()
          .from(deduplicationLog)
          .where(eq(deduplicationLog.projectId, projectId))
          .orderBy(desc(deduplicationLog.performedAt));

        res.json(rows);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  /**
   * POST /api/projects/:projectId/framework/deduplicate/scan
   * Scans all locators for potential duplicates (identical selector values).
   * Does NOT auto-merge — returns findings for human review.
   */
  app.post(
    `${base}/deduplicate/scan`,
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const locators  = await mergerDb.getAssetsByType(projectId, 'locator');

        // Group by selector value (content hash) — same hash = same selector
        const byHash = new Map<string, typeof locators>();
        for (const loc of locators) {
          const hash = loc.contentHash ?? loc.content;
          if (!byHash.has(hash)) byHash.set(hash, []);
          byHash.get(hash)!.push(loc);
        }

        const duplicates = Array.from(byHash.values())
          .filter(group => group.length > 1)
          .map(group => ({
            selectorHash: group[0].contentHash,
            count:        group.length,
            canonical:    group[0].assetKey,
            duplicateKeys: group.slice(1).map(l => l.assetKey),
            filePaths:     group.map(l => l.filePath),
          }));

        res.json({
          scannedLocators: locators.length,
          duplicateGroups: duplicates.length,
          duplicates,
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );
}
