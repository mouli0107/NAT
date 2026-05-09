// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 4: Project Access Middleware
// server/middleware/project-access.ts
//
// requireProjectMember(req, res, next)
//   - Verifies the authenticated user is a member (or owner) of the project.
//   - In demo/dev mode (isDemo=true) all requests are allowed through as owner.
//   - Handles both :projectId and :id route param names robustly.
//   - On success: attaches (req as any).projectId and (req as any).projectRole.
//   - On failure: 403 or 404.
// ─────────────────────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from 'express';
import { db } from '../db.js';
import { eq, and } from 'drizzle-orm';
import { projects, projectMembers } from '@shared/schema';
import { getAuthContext } from '../auth-middleware.js';

export async function requireProjectMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Handle both :projectId and :id route param names robustly
    const projectId =
      req.params['projectId'] ||
      req.params['id'] ||
      (req.body as any)?.projectId ||
      (req.query['projectId'] as string | undefined);

    if (!projectId) {
      res.status(400).json({
        error: 'projectId required',
        hint: 'Route must include :projectId or :id param',
        params: req.params,
      });
      return;
    }

    const auth = await getAuthContext(req);

    // Demo / admin users bypass membership check — treated as owner
    if (auth.isDemo) {
      (req as any).projectId  = projectId;
      (req as any).projectRole = 'owner';
      next();
      return;
    }

    // Verify the project exists
    const [project] = await db
      .select({ id: projects.id, userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Project owner always allowed
    if (project.userId === auth.userId) {
      (req as any).projectId  = projectId;
      (req as any).projectRole = 'owner';
      next();
      return;
    }

    // Check explicit membership (table may not exist yet during migration)
    try {
      const [member] = await db
        .select()
        .from(projectMembers)
        .where(
          and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, auth.userId),
          ),
        );

      if (!member) {
        res.status(403).json({ error: 'Access denied: not a member of this project' });
        return;
      }

      (req as any).projectId  = projectId;
      (req as any).projectRole = member.role ?? 'member';
      next();
    } catch (dbErr: any) {
      // If project_members table doesn't exist yet, fall back to owner check only
      if (dbErr.message?.includes('does not exist')) {
        res.status(403).json({ error: 'Access denied: not a member of this project' });
      } else {
        throw dbErr;
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: `project-access: ${err.message}` });
  }
}
