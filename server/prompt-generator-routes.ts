/**
 * prompt-generator-routes.ts — AI-DLC Prompt Generator API.
 *
 * Endpoints (mounted at /api/v1/prompt-generator):
 *   GET  /tech-profiles            → list configurable Tech Profiles
 *   POST /context                  → upload FSD/BRD/CLAUDE.md (+ project memory) → bundleId
 *   POST /stories/extract          → extract user stories from a bundle's FSD/BRD
 *   POST /generate/start           → 202 { sessionId, streamUrl }; runs 2-stage generation
 *   GET  /generate/stream          → SSE progress + results
 *   GET  /session/:sessionId       → snapshot of a run
 *
 * Mirrors the ASTRA Code Lens job+SSE pattern (codelens-routes.ts).
 */
import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'crypto';
import { getAuthContext } from './auth-middleware';
import { extractDocumentText } from './document-extractor';
import { listTechProfiles, getTechProfile } from './prompt-gen/tech-profiles';
import {
  saveBundle, getBundle, createSession, getSession, attachClient, detachClient,
} from './prompt-gen/prompt-gen-session';
import { runGeneration, extractStories } from './prompt-gen/prompt-gen-agent';
import type { ContextDoc, ContextRole, StoryInput } from './prompt-gen/prompt-gen-types';

export const promptGeneratorRouter = Router();

// ─── GET /tech-profiles ─────────────────────────────────────────────────────────

// ─── Projects ────────────────────────────────────────────────────────────────

promptGeneratorRouter.post('/projects', async (req: Request, res: Response) => {
  const { name, repoUrl } = req.body as { name?: string; repoUrl?: string };
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  try {
    const { userId, tenantId } = await getAuthContext(req);
    const pgdb = await import('./prompt-gen/prompt-gen-db');
    const project = await pgdb.createProject(userId, tenantId, name.trim(), repoUrl?.trim());
    res.status(201).json({ project });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to create project' });
  }
});

promptGeneratorRouter.get('/projects', async (req: Request, res: Response) => {
  try {
    const { userId } = await getAuthContext(req);
    const pgdb = await import('./prompt-gen/prompt-gen-db');
    res.json({ projects: await pgdb.listProjects(userId) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to list projects' });
  }
});

// The "what context does the engine currently have" inspector.
promptGeneratorRouter.get('/projects/:id/knowledge', async (req: Request, res: Response) => {
  try {
    const { userId } = await getAuthContext(req);
    const pgdb = await import('./prompt-gen/prompt-gen-db');
    const project = await pgdb.getProject(userId, req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const knowledge = await pgdb.getProjectKnowledge(req.params.id);
    res.json({ project, ...knowledge });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to load project knowledge' });
  }
});

// Preview the exact FOUNDATION context the engine would inject for a given story.
promptGeneratorRouter.get('/projects/:id/context-preview', async (req: Request, res: Response) => {
  try {
    const { userId } = await getAuthContext(req);
    const pgdb = await import('./prompt-gen/prompt-gen-db');
    const project = await pgdb.getProject(userId, req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const story = String(req.query.story ?? '');
    const context = await pgdb.getFoundationContext(req.params.id, story);
    res.json({ context, empty: !context });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to preview context' });
  }
});

// Import another project's foundation (element catalog) into this one.
promptGeneratorRouter.post('/projects/:id/import-from', async (req: Request, res: Response) => {
  const { sourceProjectId } = req.body as { sourceProjectId?: string };
  if (!sourceProjectId) return res.status(400).json({ error: 'sourceProjectId is required' });
  try {
    const { userId } = await getAuthContext(req);
    const pgdb = await import('./prompt-gen/prompt-gen-db');
    const imported = await pgdb.importFromProject(userId, sourceProjectId, req.params.id);
    res.json({ imported });
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? 'Import failed' });
  }
});

// STORY-REGISTER.md for a project.
promptGeneratorRouter.get('/projects/:id/story-register', async (req: Request, res: Response) => {
  try {
    const { userId } = await getAuthContext(req);
    const pgdb = await import('./prompt-gen/prompt-gen-db');
    const project = await pgdb.getProject(userId, req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const markdown = await pgdb.getStoryRegister(req.params.id, project.name);
    res.json({ markdown });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to build story register' });
  }
});

// ─── Azure DevOps story pull (no manual copy-paste) ──────────────────────────
// PAT is used per-request and never stored/logged.

promptGeneratorRouter.post('/ado/iterations', async (req: Request, res: Response) => {
  const { organization, project, pat } = req.body as { organization?: string; project?: string; pat?: string };
  if (!organization || !project || !pat) return res.status(400).json({ error: 'organization, project and pat are required' });
  try {
    const { adoPullService } = await import('./ado-pull-service');
    const result = await adoPullService.getIterations({ organization, project, pat });
    if (!result.success) return res.status(502).json({ error: result.error });
    res.json({ iterations: result.iterations ?? [] });
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? 'Failed to fetch iterations' });
  }
});

promptGeneratorRouter.post('/ado/stories', async (req: Request, res: Response) => {
  const { organization, project, pat, iterationPath } = req.body as {
    organization?: string; project?: string; pat?: string; iterationPath?: string;
  };
  if (!organization || !project || !pat || !iterationPath) {
    return res.status(400).json({ error: 'organization, project, pat and iterationPath are required' });
  }
  try {
    const { adoPullService } = await import('./ado-pull-service');
    const result = await adoPullService.getUserStoriesBySprint(iterationPath, { organization, project, pat });
    if (!result.success) return res.status(502).json({ error: result.error });
    const stories = (result.userStories ?? []).map(s => ({
      externalId: `US-${s.adoWorkItemId}`,
      title: s.title,
      description: stripHtml(s.description ?? ''),
      acceptanceCriteria: splitAcs(s.acceptanceCriteria ?? ''),
    }));
    res.json({ stories, count: stories.length });
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? 'Failed to fetch stories' });
  }
});

function stripHtml(html: string): string {
  return html
    .replace(/<\/(p|div|li|ul|ol|br|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function splitAcs(html: string): string[] {
  const text = stripHtml(html);
  if (!text) return [];
  return text.split(/\n+/).map(l => l.replace(/^[-*•\d.\s]+/, '').trim()).filter(Boolean);
}

promptGeneratorRouter.get('/tech-profiles', (_req: Request, res: Response) => {
  const profiles = listTechProfiles().map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    layers: p.layers.map(l => ({ id: l.id, label: l.label, summary: l.summary })),
    builtin: p.builtin,
  }));
  res.json({ profiles });
});

// ─── POST /context ──────────────────────────────────────────────────────────────
// Multipart upload with named file fields (fsd, brd, standards, memory) plus an
// optional projectMemory text field. Parses each file and stores an in-memory bundle.

const FIELD_ROLE: Record<string, ContextRole> = {
  fsd: 'fsd', brd: 'brd', standards: 'standards', memory: 'memory', other: 'other',
};

promptGeneratorRouter.post('/context', async (req: Request, res: Response) => {
  const multer = (await import('multer')).default;
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 12 } })
    .fields([
      { name: 'fsd', maxCount: 4 },
      { name: 'brd', maxCount: 4 },
      { name: 'standards', maxCount: 2 },
      { name: 'memory', maxCount: 2 },
      { name: 'other', maxCount: 4 },
    ]);

  upload(req, res, async (err: any) => {
    if (err) return res.status(400).json({ error: err?.message ?? 'Upload failed' });
    try {
      const { userId } = await getAuthContext(req);
      const files = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
      const docs: ContextDoc[] = [];

      // Ascent ingests full specs — large FSD/BRD must not be cut to 8k (that hides
      // the user-story sections). Allow up to ~400k chars per document.
      const ASCENT_DOC_CHARS = 400_000;
      for (const field of Object.keys(FIELD_ROLE)) {
        for (const f of files[field] ?? []) {
          const extracted = await extractDocumentText(f.buffer, f.originalname, f.mimetype, ASCENT_DOC_CHARS);
          docs.push({
            fileName: extracted.fileName,
            role: FIELD_ROLE[field],
            content: extracted.content,
            charCount: extracted.charCount,
            truncated: extracted.truncated,
          });
        }
      }

      const projectMemory = typeof req.body?.projectMemory === 'string' ? req.body.projectMemory : '';
      if (docs.length === 0 && !projectMemory.trim()) {
        return res.status(400).json({ error: 'Attach at least one document (FSD/BRD/standards) or project memory text.' });
      }

      const bundleId = `pgb-${randomUUID().slice(0, 8)}`;
      saveBundle({ bundleId, userId, docs, projectMemory, createdAt: Date.now() });

      res.json({
        bundleId,
        docs: docs.map(d => ({ fileName: d.fileName, role: d.role, charCount: d.charCount, truncated: d.truncated })),
        hasMemory: !!projectMemory.trim(),
      });
    } catch (e: any) {
      res.status(500).json({ error: e?.message ?? 'Failed to process context' });
    }
  });
});

// ─── POST /stories/extract ──────────────────────────────────────────────────────

promptGeneratorRouter.post('/stories/extract', async (req: Request, res: Response) => {
  const { bundleId } = req.body as { bundleId?: string };
  if (!bundleId) return res.status(400).json({ error: 'bundleId is required' });

  const { userId } = await getAuthContext(req);
  const bundle = getBundle(bundleId);
  if (!bundle || bundle.userId !== userId) {
    return res.status(404).json({ error: 'Context bundle not found (it may have expired — re-upload).' });
  }

  // Prefer FSD text, fall back to BRD.
  const specText = bundle.docs
    .filter(d => d.role === 'fsd' || d.role === 'brd')
    .map(d => d.content)
    .join('\n\n');

  if (!specText.trim()) {
    return res.status(422).json({ error: 'No FSD/BRD content in this bundle to extract stories from.' });
  }

  try {
    const stories = await extractStories(specText);
    res.json({ stories, count: stories.length });
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? 'Story extraction failed' });
  }
});

// ─── POST /generate/start ───────────────────────────────────────────────────────

promptGeneratorRouter.post('/generate/start', async (req: Request, res: Response) => {
  const { bundleId, techProfileId, story } = req.body as {
    bundleId?: string; techProfileId?: string; story?: Partial<StoryInput>;
  };
  let { projectId } = req.body as { projectId?: string };

  if (!bundleId) return res.status(400).json({ error: 'bundleId is required' });
  if (!story || !story.title) return res.status(400).json({ error: 'story.title is required' });

  const { userId, tenantId } = await getAuthContext(req);
  const bundle = getBundle(bundleId);
  if (!bundle || bundle.userId !== userId) {
    return res.status(404).json({ error: 'Context bundle not found (it may have expired — re-upload).' });
  }

  // Resolve the project (auto-create a default one so a run always belongs to a project).
  try {
    const pgdb = await import('./prompt-gen/prompt-gen-db');
    if (projectId) {
      const p = await pgdb.getProject(userId, projectId);
      if (!p) return res.status(404).json({ error: 'Project not found' });
    } else {
      const created = await pgdb.createProject(userId, tenantId, 'Default Project');
      projectId = created.id;
    }
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Failed to resolve project' });
  }

  const normalizedStory: StoryInput = {
    externalId: String(story.externalId ?? ''),
    title: String(story.title),
    description: String(story.description ?? ''),
    acceptanceCriteria: Array.isArray(story.acceptanceCriteria) ? story.acceptanceCriteria.map(String) : [],
  };

  const profile = getTechProfile(techProfileId);
  const sessionId = `pg-${randomUUID().slice(0, 8)}`;
  const session = createSession(sessionId, userId, tenantId, projectId!, profile.id, normalizedStory, bundleId);

  setTimeout(() => {
    runGeneration(session).catch(e =>
      console.error(`[PromptGen] Unhandled generation error for ${sessionId}:`, e),
    );
  }, 300);

  res.status(202).json({
    sessionId,
    projectId,
    streamUrl: `/api/v1/prompt-generator/generate/stream?sessionId=${sessionId}`,
  });
});

// ─── GET /generate/stream ───────────────────────────────────────────────────────

promptGeneratorRouter.get('/generate/stream', async (req: Request, res: Response) => {
  const { sessionId } = req.query as { sessionId?: string };
  if (!sessionId) return res.status(400).json({ error: 'sessionId query parameter is required' });

  const { userId } = await getAuthContext(req);
  const session = getSession(sessionId);
  if (!session || session.userId !== userId) {
    return res.status(404).json({ error: `Session ${sessionId} not found` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  attachClient(session, res);

  const heartbeat = setInterval(() => {
    try { res.write(': heartbeat\n\n'); } catch { clearInterval(heartbeat); }
  }, 15_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    detachClient(session, res);
  });
});

// ─── GET /session/:sessionId ────────────────────────────────────────────────────

promptGeneratorRouter.get('/session/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { userId } = await getAuthContext(req);
  const session = getSession(sessionId);
  if (!session || session.userId !== userId) {
    return res.status(404).json({ error: `Session ${sessionId} not found` });
  }
  res.json({
    sessionId: session.sessionId,
    status: session.status,
    techProfileId: session.techProfileId,
    story: session.story,
    contract: session.contract,
    layers: session.layers,
    error: session.error,
  });
});
