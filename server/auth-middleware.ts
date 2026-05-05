/**
 * NAT 2.0 — auth-middleware.ts
 *
 * Provides:
 *  - Multi-tenant auth context extraction from requests
 *  - Secure password hashing via Node.js crypto (no bcrypt dep)
 *  - Device token issuance + validation for Workspace Agent
 *  - GitHub CLI-style device auth flow (device code → browser approval → long-lived token)
 *  - Default tenant bootstrap for single-tenant / dev deployments
 *
 * Auth strategy:
 *  - Web UI: express-session (session cookie) — sets req.session.userId + req.session.tenantId
 *  - Workspace Agent: long-lived device token in Authorization: Bearer header
 *  - Dev / demo mode: falls back to DEMO_USER when no session, no token
 */

import type { Request, Response, NextFunction } from 'express';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { tenants, deviceTokens, users } from '@shared/schema';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEFAULT_TENANT_ID = 'default-tenant';
export const ADMIN_USER_ID = 'admin-user-1';
export const ADMIN_USERNAME = 'chandramouli@nousinfo.com';
/** @deprecated kept only so old DEMO_USER references in routes.ts compile */
export const DEMO_USER_ID = ADMIN_USER_ID;
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In-memory store for pending device codes (survives only current process)
interface PendingDeviceCode {
  userCode: string;          // shown to user: "ABCD-1234"
  tenantId: string;
  userId: string;
  expiresAt: number;
  approved: boolean;
  token?: string;            // filled in when approved
}
const pendingCodes = new Map<string, PendingDeviceCode>();

// ─── Auth Context ─────────────────────────────────────────────────────────────

export interface AuthContext {
  userId: string;
  tenantId: string;
  isDemo: boolean;
}

/**
 * Extract auth context from request.
 * Priority: session cookie → Bearer device token → demo fallback
 */
export async function getAuthContext(req: Request): Promise<AuthContext> {
  // 1. Session-based auth (web UI)
  const session = (req as any).session;
  if (session?.userId && session?.tenantId) {
    return { userId: session.userId, tenantId: session.tenantId, isDemo: false };
  }

  // 2. Device token auth (workspace agent)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const rawToken = authHeader.slice(7);
    const ctx = await validateDeviceToken(rawToken);
    if (ctx) return { ...ctx, isDemo: false };
  }

  // 3. Demo / development fallback
  return { userId: DEMO_USER_ID, tenantId: DEFAULT_TENANT_ID, isDemo: true };
}

/**
 * Express middleware — blocks unauthenticated requests in production.
 * In development/demo, passes through with the demo user context.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!IS_PRODUCTION) { return next(); }

  const session = (req as any).session;
  const hasSession = session?.userId && session?.tenantId;
  const hasBearer = req.headers.authorization?.startsWith('Bearer ');

  if (!hasSession && !hasBearer) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// ─── Password Hashing (Node.js crypto — no bcrypt needed) ────────────────────

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(plain, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(':');
  if (!salt || !storedHash) return false;
  try {
    const hash = scryptSync(plain, salt, 64);
    const storedBuf = Buffer.from(storedHash, 'hex');
    return timingSafeEqual(hash, storedBuf);
  } catch {
    return false;
  }
}

// ─── Device Token System ──────────────────────────────────────────────────────

/**
 * Step 1: Generate a device code pair.
 * Returns { deviceCode, userCode } — show userCode to the user, poll with deviceCode.
 */
export function generateDeviceCode(tenantId: string, userId: string): { deviceCode: string; userCode: string } {
  const deviceCode = randomBytes(32).toString('hex');
  const raw = randomBytes(4).toString('hex').toUpperCase();
  const userCode = `${raw.slice(0, 4)}-${raw.slice(4)}`;

  pendingCodes.set(deviceCode, {
    userCode,
    tenantId,
    userId,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    approved: false,
  });

  return { deviceCode, userCode };
}

/**
 * Step 2 (browser approval): Approve a device code and issue a long-lived token.
 * Returns the issued token or null if code not found/expired.
 */
export async function approveDeviceCode(userCode: string, tenantId: string, userId: string): Promise<string | null> {
  for (const [deviceCode, entry] of pendingCodes.entries()) {
    if (entry.userCode === userCode && entry.tenantId === tenantId && entry.userId === userId) {
      if (Date.now() > entry.expiresAt) {
        pendingCodes.delete(deviceCode);
        return null;
      }
      // Issue long-lived token
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      await db.insert(deviceTokens).values({
        tenantId,
        userId,
        tokenHash,
        deviceName: `workspace-agent`,
      });
      entry.approved = true;
      entry.token = rawToken;
      return rawToken;
    }
  }
  return null;
}

/**
 * Step 3 (polling): Poll for approval result.
 * Returns { status: 'pending' | 'approved' | 'expired', token? }
 */
export function pollDeviceCode(deviceCode: string): { status: 'pending' | 'approved' | 'expired'; token?: string } {
  const entry = pendingCodes.get(deviceCode);
  if (!entry) return { status: 'expired' };
  if (Date.now() > entry.expiresAt) {
    pendingCodes.delete(deviceCode);
    return { status: 'expired' };
  }
  if (entry.approved && entry.token) {
    pendingCodes.delete(deviceCode);
    return { status: 'approved', token: entry.token };
  }
  return { status: 'pending' };
}

/**
 * Validate a raw device token from Authorization header.
 * Returns AuthContext or null.
 */
export async function validateDeviceToken(rawToken: string): Promise<Pick<AuthContext, 'userId' | 'tenantId'> | null> {
  try {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const rows = await db.select().from(deviceTokens).where(eq(deviceTokens.tokenHash, tokenHash)).limit(1);
    if (rows.length === 0) return null;
    const row = rows[0];
    // Update last used (fire-and-forget)
    db.update(deviceTokens).set({ lastUsedAt: new Date() }).where(eq(deviceTokens.tokenHash, tokenHash)).catch(() => {});
    return { userId: row.userId, tenantId: row.tenantId };
  } catch {
    return null;
  }
}

// ─── Tenant Bootstrap ─────────────────────────────────────────────────────────

/**
 * Called once on server startup.
 * Ensures the default tenant and demo user exist in DB (dev/single-tenant deployments).
 */
export async function ensureDefaultTenant(): Promise<void> {
  try {
    const existing = await db.select().from(tenants).where(eq(tenants.id, DEFAULT_TENANT_ID)).limit(1);
    if (existing.length === 0) {
      await db.insert(tenants).values({
        id: DEFAULT_TENANT_ID,
        name: 'NAT 2.0 Default',
        slug: 'default',
      });
      console.log('[Auth] Default tenant created');
    }

    // Ensure admin user exists
    const adminExists = await db.select().from(users).where(eq(users.id, ADMIN_USER_ID)).limit(1);
    if (adminExists.length === 0) {
      // Check if an old demo_user row exists (from seedDemoDataIfEmpty) — migrate it
      const oldDemo = await db.select().from(users).where(eq(users.username, 'demo_user')).limit(1);
      if (oldDemo.length > 0) {
        // Rename old demo_user to admin, reset password
        await db.update(users)
          .set({
            id: ADMIN_USER_ID,
            username: ADMIN_USERNAME,
            password: hashPassword('Temp@1234'),
            tenantId: DEFAULT_TENANT_ID,
            mustChangePassword: true,
          })
          .where(eq(users.username, 'demo_user'));
        console.log('[Auth] Migrated demo_user → admin user (chandramouli@nousinfo.com)');
      } else {
        await db.insert(users).values({
          id: ADMIN_USER_ID,
          tenantId: DEFAULT_TENANT_ID,
          username: ADMIN_USERNAME,
          password: hashPassword('Temp@1234'),
          mustChangePassword: true,
        });
        console.log('[Auth] Admin user created:', ADMIN_USERNAME);
      }
    } else {
      // Repair plain-text password or wrong username left by old seed
      const admin = adminExists[0];
      const needsRepair = !admin.password.includes(':') || admin.username === 'demo_user';
      if (needsRepair) {
        await db.update(users)
          .set({
            username: ADMIN_USERNAME,
            password: hashPassword('Temp@1234'),
            tenantId: DEFAULT_TENANT_ID,
            mustChangePassword: true,
          })
          .where(eq(users.id, ADMIN_USER_ID));
        console.log('[Auth] Admin user credentials repaired');
      }
    }
  } catch (err: any) {
    // Non-fatal: may happen if schema not yet migrated
    console.warn('[Auth] ensureDefaultTenant warning:', err.message);
  }
}

/**
 * Register a brand new tenant + admin user.
 * Used by the tenant registration endpoint.
 */
export async function registerTenant(opts: {
  tenantId: string;
  tenantName: string;
  slug: string;
  adminUsername: string;
  adminPassword: string;
}): Promise<{ tenantId: string; userId: string }> {
  const userId = `user-${randomBytes(8).toString('hex')}`;

  await db.insert(tenants).values({
    id: opts.tenantId,
    name: opts.tenantName,
    slug: opts.slug,
  });

  await db.insert(users).values({
    id: userId,
    tenantId: opts.tenantId,
    username: opts.adminUsername,
    password: hashPassword(opts.adminPassword),
  });

  return { tenantId: opts.tenantId, userId };
}
