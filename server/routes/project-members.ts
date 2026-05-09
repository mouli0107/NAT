// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: Project Membership Routes
// server/routes/project-members.ts
//
//  GET    /api/projects/:projectId/members              List members
//  POST   /api/projects/:projectId/members              Invite member
//  PATCH  /api/projects/:projectId/members/:userId      Change role
//  DELETE /api/projects/:projectId/members/:userId      Remove member
// ─────────────────────────────────────────────────────────────────────────────

import type { Express, Request, Response } from 'express';
import { db } from '../db.js';
import { eq, and } from 'drizzle-orm';
import { projects, projectMembers, users } from '@shared/schema';
import { requireProjectMember } from '../middleware/project-access.js';
import { getAuthContext } from '../auth-middleware.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function avatarInitial(email: string): string {
  return (email?.charAt(0) ?? '?').toUpperCase();
}

function timeAgo(d: Date | null): string {
  if (!d) return 'never';
  const ms = Date.now() - d.getTime();
  if (ms < 60_000)    return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

// ── Route registration ────────────────────────────────────────────────────────

export function registerProjectMemberRoutes(app: Express): void {

  // ── GET /api/projects/:projectId/members ─────────────────────────────────

  app.get(
    '/api/projects/:projectId/members',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const projectId = (req as any).projectId as string;

        // Owner row (from projects table)
        const [project] = await db
          .select({ userId: projects.userId })
          .from(projects)
          .where(eq(projects.id, projectId));

        // Explicit members
        const rows = await db
          .select({
            userId:   projectMembers.userId,
            role:     projectMembers.role,
            joinedAt: projectMembers.joinedAt,
            username: users.username,
          })
          .from(projectMembers)
          .leftJoin(users, eq(projectMembers.userId, users.id))
          .where(eq(projectMembers.projectId, projectId));

        // Owner record
        const [ownerUser] = await db
          .select({ username: users.username })
          .from(users)
          .where(eq(users.id, project.userId));

        const ownerRow = {
          userId:       project.userId,
          email:        ownerUser?.username ?? project.userId,
          avatarInitial: avatarInitial(ownerUser?.username ?? '?'),
          role:         'owner',
          joinedAt:     null as string | null,
          lastActiveAt: null as string | null,
        };

        const memberRows = rows
          .filter(r => r.userId !== project.userId) // don't double-list owner
          .map(r => ({
            userId:       r.userId,
            email:        r.username ?? r.userId,
            avatarInitial: avatarInitial(r.username ?? r.userId),
            role:         r.role ?? 'member',
            joinedAt:     r.joinedAt?.toISOString() ?? null,
            lastActiveAt: null as string | null,
          }));

        res.json([ownerRow, ...memberRows]);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── POST /api/projects/:projectId/members ────────────────────────────────

  app.post(
    '/api/projects/:projectId/members',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const role = (req as any).projectRole;
        if (role !== 'owner') {
          res.status(403).json({ error: 'Only owners can invite members' });
          return;
        }

        const projectId = (req as any).projectId as string;
        const { email, role: memberRole = 'member' } = req.body as {
          email: string;
          role?: 'member' | 'viewer';
        };

        if (!email?.trim()) {
          res.status(400).json({ error: 'email is required' });
          return;
        }

        // Look up user by username (username is the email in this system)
        const [existingUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, email.trim()));

        if (!existingUser) {
          // User not found — return invited flag
          // (In production: send invite email / create pending invite record)
          res.json({ added: false, invited: true, email });
          return;
        }

        // Check for duplicate membership
        const [existing] = await db
          .select({ id: projectMembers.id })
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, existingUser.id),
            ),
          );

        if (existing) {
          res.json({ added: false, invited: false, reason: 'already_member' });
          return;
        }

        await db.insert(projectMembers).values({
          projectId,
          userId: existingUser.id,
          role:   memberRole,
        });

        res.json({ added: true, invited: false });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── PATCH /api/projects/:projectId/members/:userId ───────────────────────

  app.patch(
    '/api/projects/:projectId/members/:userId',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const requesterRole = (req as any).projectRole;
        if (requesterRole !== 'owner') {
          res.status(403).json({ error: 'Only owners can change roles' });
          return;
        }

        const projectId  = (req as any).projectId as string;
        const targetId   = req.params['userId'];
        const { role: newRole } = req.body as { role: 'member' | 'viewer' | 'owner' };

        if (!['member', 'viewer', 'owner'].includes(newRole)) {
          res.status(400).json({ error: 'Invalid role' });
          return;
        }

        // Guard: cannot demote last owner
        if (newRole !== 'owner') {
          const [project] = await db
            .select({ userId: projects.userId })
            .from(projects)
            .where(eq(projects.id, projectId));
          if (project.userId === targetId) {
            res.status(409).json({ error: 'Cannot demote the project owner' });
            return;
          }
        }

        await db
          .update(projectMembers)
          .set({ role: newRole })
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, targetId),
            ),
          );

        res.json({ ok: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── DELETE /api/projects/:projectId/members/:userId ──────────────────────

  app.delete(
    '/api/projects/:projectId/members/:userId',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const requesterRole = (req as any).projectRole;
        if (requesterRole !== 'owner') {
          res.status(403).json({ error: 'Only owners can remove members' });
          return;
        }

        const projectId = (req as any).projectId as string;
        const targetId  = req.params['userId'];
        const auth      = await getAuthContext(req);

        // Cannot remove yourself if you're the only owner
        const [project] = await db
          .select({ userId: projects.userId })
          .from(projects)
          .where(eq(projects.id, projectId));

        if (project.userId === targetId) {
          res.status(409).json({ error: 'Cannot remove the project owner' });
          return;
        }

        if (targetId === auth.userId && requesterRole === 'owner') {
          res.status(409).json({ error: 'Cannot remove yourself' });
          return;
        }

        await db
          .delete(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.userId, targetId),
            ),
          );

        res.json({ ok: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── POST /api/projects/:projectId/import-plan ────────────────────────────
  // Excel / CSV import for planning board
  // Accepts multipart/form-data with a 'file' field (.xlsx or .csv)

  app.post(
    '/api/projects/:projectId/import-plan',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const role = (req as any).projectRole;
        if (role !== 'owner' && role !== 'member') {
          res.status(403).json({ error: 'Requires member role or higher' });
          return;
        }

        const multerMod = await import('multer');
        const upload = multerMod.default({ storage: multerMod.default.memoryStorage() });

        upload.single('file')(req as any, res as any, async (err: any) => {
          if (err) { res.status(400).json({ error: err.message }); return; }

          const file = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
          if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }

          const projectId = (req as any).projectId as string;
          const { columnMap = {} } = req.body as {
            columnMap?: Record<string, string>; // e.g. { tcName: 'Test Case', module: 'Module' }
          };

          let rows: Record<string, string>[] = [];

          const isXlsx = file.originalname.endsWith('.xlsx');
          if (isXlsx) {
            const xlsx = await import('xlsx');
            const wb   = xlsx.read(file.buffer, { type: 'buffer' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            rows = xlsx.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
          } else {
            // CSV fallback
            const text = file.buffer.toString('utf-8');
            const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
            const cols = header.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            rows = lines.map(line => {
              const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
              const obj: Record<string, string> = {};
              cols.forEach((c, i) => { obj[c] = vals[i] ?? ''; });
              return obj;
            });
          }

          // Map columns using columnMap (or use first matching header)
          const tcNameCol   = columnMap['tcName']   || 'TC Name'   || rows[0] && Object.keys(rows[0])[0];
          const moduleCol   = columnMap['module']   || 'Module';
          const featureCol  = columnMap['feature']  || 'Feature';
          const priorityCol = columnMap['priority'] || 'Priority';

          let created = 0;
          const skipped: string[] = [];

          // We don't have a planning_tcs table — store as framework assets with type='planned_tc'
          for (const row of rows) {
            const tcName = row[tcNameCol]?.trim();
            if (!tcName) { skipped.push('empty name'); continue; }

            try {
              const { frameworkAssets } = await import('@shared/schema');
              const assetKey = `PLAN-${Date.now()}-${created}`;
              await db.insert(frameworkAssets).values({
                projectId,
                assetType: 'planned_tc',
                assetKey,
                filePath:  `planned/${row[moduleCol] ?? 'Unassigned'}/${tcName}`,
                content:   JSON.stringify({
                  tcName,
                  module:   row[moduleCol]   ?? '',
                  feature:  row[featureCol]  ?? '',
                  priority: row[priorityCol] ?? 'P2',
                  status:   'planned',
                }),
                layer: 'plan',
              });
              created++;
            } catch {
              skipped.push(tcName);
            }
          }

          res.json({ created, skipped: skipped.length, errors: skipped });
        });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── TC Soft Lock endpoints ─────────────────────────────────────────────────
  // In-memory lock store (no DB columns needed for MVP)
  // Note: these are re-exported from this module so presence.ts can broadcast

  // Locks are exported so presence.ts can read them
  // Map: tcId → { userId, email, lockedAt }
}

// ── Exported soft-lock store (in-process, shared via module singleton) ────────

interface LockEntry {
  userId: string;
  email:  string;
  lockedAt: Date;
}
export const tcLocks = new Map<string, LockEntry>();

/** Cleanup stale locks every 5 minutes (lock expires after 30 min) */
export function startLockCleanup(): void {
  setInterval(() => {
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [key, entry] of Array.from(tcLocks.entries())) {
      if (entry.lockedAt.getTime() < cutoff) {
        tcLocks.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function registerTcLockRoutes(app: Express): void {

  // ── POST /api/projects/:projectId/test-cases/:id/lock ───────────────────

  app.post(
    '/api/projects/:projectId/test-cases/:id/lock',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const tcId = req.params['id'];
        const auth = await getAuthContext(req);
        const existing = tcLocks.get(tcId);

        if (existing && existing.userId !== auth.userId) {
          // Locked by someone else — return advisory info (not 409)
          res.json({
            locked:   false,
            lockedBy: {
              email: existing.email,
              since: existing.lockedAt.toISOString(),
            },
          });
          return;
        }

        // Lock it (or refresh existing lock by same user)
        tcLocks.set(tcId, {
          userId:   auth.userId,
          email:    (req.body as any)?.email ?? auth.userId,
          lockedAt: new Date(),
        });
        res.json({ locked: true, lockedBy: null });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );

  // ── DELETE /api/projects/:projectId/test-cases/:id/lock ─────────────────

  app.delete(
    '/api/projects/:projectId/test-cases/:id/lock',
    requireProjectMember,
    async (req: Request, res: Response) => {
      try {
        const tcId     = req.params['id'];
        const auth     = await getAuthContext(req);
        const role     = (req as any).projectRole;
        const existing = tcLocks.get(tcId);

        if (!existing) { res.json({ ok: true }); return; }

        // Only lock holder or owner can release
        if (existing.userId !== auth.userId && role !== 'owner') {
          res.status(403).json({ error: 'Cannot release lock held by another user' });
          return;
        }

        tcLocks.delete(tcId);
        res.json({ ok: true });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    },
  );
}
