// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: Real-time Presence SSE
// server/routes/presence.ts
//
//  GET  /api/projects/:id/presence-stream   SSE connection for this user
//  POST /api/projects/:id/presence          Update own activity
//  GET  /api/projects/:id/planning-tcs      List planned TCs for board
//  PATCH /api/projects/:id/planning-tcs/:tcId Update TC status/assignee
// ─────────────────────────────────────────────────────────────────────────────

import type { Express, Request, Response } from 'express';
import { db } from '../db.js';
import { eq } from 'drizzle-orm';
import { frameworkAssets, assetConflicts } from '@shared/schema';
import { requireProjectMember } from '../middleware/project-access.js';
import { getAuthContext } from '../auth-middleware.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId:        string;
  email:         string;
  avatarInitial: string;
  action:        string;  // 'viewing' | 'recording' | 'reviewing'
  moduleId?:     string;
  featureId?:    string;
  tcId?:         string;
  joinedAt:      string;
}

interface SSEConnection {
  res:          Response;
  user:         PresenceUser;
  keepaliveRef: ReturnType<typeof setInterval>;
}

// ── In-process presence store ────────────────────────────────────────────────
// Map<projectId, Map<userId, SSEConnection>>

const presenceStore = new Map<string, Map<string, SSEConnection>>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarInitial(email: string): string {
  return (email?.charAt(0) ?? '?').toUpperCase();
}

function sseSend(res: Response, data: unknown): void {
  try {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // ignore write errors on closed connections
  }
}

export function broadcastToProject(
  projectId: string,
  event: unknown,
  excludeUserId?: string,
): void {
  const project = presenceStore.get(projectId);
  if (!project) return;
  for (const [uid, conn] of Array.from(project.entries())) {
    if (uid === excludeUserId) continue;
    sseSend(conn.res, event);
  }
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerPresenceRoutes(app: Express): void {

  // ── GET /api/projects/:id/presence-stream (SSE) ───────────────────────────

  app.get(
    '/api/projects/:id/presence-stream',
    requireProjectMember,
    async (req: Request, res: Response) => {
      const projectId = (req as any).projectId as string;
      const auth      = await getAuthContext(req);
      const email     = (req.query['email'] as string) || auth.userId;

      const user: PresenceUser = {
        userId:        auth.userId,
        email,
        avatarInitial: avatarInitial(email),
        action:        'viewing',
        joinedAt:      new Date().toISOString(),
      };

      // ── Set up SSE headers ───────────────────────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');  // disable nginx buffering
      res.flushHeaders();

      // ── Add to presence store ────────────────────────────────────────────
      if (!presenceStore.has(projectId)) {
        presenceStore.set(projectId, new Map());
      }
      const project = presenceStore.get(projectId)!;

      // Send current presence snapshot to the new joiner
      const currentUsers = Array.from(project.values()).map(c => c.user);
      sseSend(res, { type: 'current_presence', users: currentUsers });

      // Keepalive ping every 25 seconds
      const keepaliveRef = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { clearInterval(keepaliveRef); }
      }, 25_000);

      const conn: SSEConnection = { res, user, keepaliveRef };
      project.set(auth.userId, conn);

      // Broadcast user_joined to others
      broadcastToProject(projectId, { type: 'user_joined', ...user }, auth.userId);

      // ── Disconnect handler ───────────────────────────────────────────────
      req.on('close', () => {
        clearInterval(keepaliveRef);
        project.delete(auth.userId);
        if (project.size === 0) presenceStore.delete(projectId);
        broadcastToProject(projectId, { type: 'user_left', userId: auth.userId });
      });
    },
  );

  // ── POST /api/projects/:id/presence ──────────────────────────────────────
  // Update own activity; broadcast to others

  app.post(
    '/api/projects/:id/presence',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const auth      = await getAuthContext(req);
        const { action, moduleId, featureId, tcId } = req.body as {
          action: string;
          moduleId?: string;
          featureId?: string;
          tcId?: string;
        };

        // Update stored user object if connection is active
        const project = presenceStore.get(projectId);
        if (project?.has(auth.userId)) {
          const conn = project.get(auth.userId)!;
          conn.user = { ...conn.user, action: action ?? conn.user.action, moduleId, featureId, tcId };
        }

        // Broadcast activity update
        broadcastToProject(projectId, {
          type:   'user_activity',
          userId: auth.userId,
          action,
          moduleId,
          featureId,
          tcId,
        }, auth.userId);

        res.json({ ok: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── GET /api/projects/:id/planning-tcs ───────────────────────────────────
  // Returns planned + recorded TCs for the planning board

  app.get(
    '/api/projects/:id/planning-tcs',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;

        // Planned TCs (imported via Excel/CSV)
        const planned = await db
          .select()
          .from(frameworkAssets)
          .where(eq(frameworkAssets.projectId, projectId));

        const result = planned
          .filter(a => a.assetType === 'planned_tc' || a.assetType === 'spec')
          .map(a => {
            if (a.assetType === 'spec') {
              return {
                id:         a.id,
                assetKey:   a.assetKey,
                name:       a.filePath.split('/').pop()?.replace('.spec.ts', '') ?? a.assetKey,
                status:     'recorded',
                module:     a.filePath.split('/')[1] ?? '',
                feature:    a.filePath.split('/')[2] ?? '',
                priority:   'P2',
                assignedTo: null as string | null,
                filePath:   a.filePath,
                assetType:  a.assetType,
              };
            }
            // planned_tc
            let meta: Record<string, string> = {};
            try { meta = JSON.parse(a.content); } catch {}
            return {
              id:         a.id,
              assetKey:   a.assetKey,
              name:       meta['tcName'] ?? a.assetKey,
              status:     meta['status'] ?? 'planned',
              module:     meta['module'] ?? '',
              feature:    meta['feature'] ?? '',
              priority:   meta['priority'] ?? 'P2',
              assignedTo: meta['assignedTo'] ?? null,
              filePath:   a.filePath,
              assetType:  a.assetType,
            };
          });

        res.json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── PATCH /api/projects/:id/planning-tcs/:tcId ───────────────────────────
  // Update TC status or assignee on the planning board

  app.patch(
    '/api/projects/:id/planning-tcs/:tcId',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;
        const tcId      = req.params['tcId'];
        const { status, assignedTo } = req.body as { status?: string; assignedTo?: string };

        const [existing] = await db
          .select()
          .from(frameworkAssets)
          .where(eq(frameworkAssets.id, tcId));

        if (!existing || existing.projectId !== projectId) {
          res.status(404).json({ error: 'TC not found' });
          return;
        }

        let meta: Record<string, string> = {};
        try { meta = JSON.parse(existing.content); } catch {}

        if (status)     meta['status']     = status;
        if (assignedTo !== undefined) meta['assignedTo'] = assignedTo;

        await db
          .update(frameworkAssets)
          .set({ content: JSON.stringify(meta), updatedAt: new Date() })
          .where(eq(frameworkAssets.id, tcId));

        // Broadcast to presence listeners
        broadcastToProject(projectId, {
          type:       'tc_status_changed',
          tcId,
          status,
          assignedTo,
        });

        res.json({ ok: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── GET /api/projects/:id/online ─────────────────────────────────────────
  // HTTP (non-SSE) snapshot of who is online — useful for initial page load

  app.get(
    '/api/projects/:id/online',
    requireProjectMember,
    (_req: Request, res: Response) => {
      const projectId = (_req as any).projectId as string;
      const project   = presenceStore.get(projectId);
      const users     = project
        ? Array.from(project.values()).map(c => c.user)
        : [];
      res.json(users);
    },
  );
}

// ── Broadcast helper for external callers (merger-routes etc.) ─────────────────
export { broadcastToProject as broadcastPresenceEvent };
