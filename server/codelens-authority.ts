/**
 * ASTRA Code Lens — Standards Authority (Phase 2)
 *
 * Ports the team Controller Conformance Kit's authority model into the engine:
 *
 *   AUTHORITY ORDER:  Tier-0 Insurity standards  >  EAIS accepted deviations  >  golden repo
 *
 * The 82 ASTRA standards (S01–S82) already ENCODE the Insurity Tier-0 rules and
 * — verified — are compatible with the EAIS deviations (e.g. S72 already bans
 * Polly, matching A3; no standard pushes MediatR). So this module does NOT change
 * how the reviewer FLAGS code. Its jobs are:
 *
 *   1. Document the accepted deviations (A1–A6) as first-class data.
 *   2. Act as a FIX-SAFETY GATE for Conform Mode: reject any generated fix that
 *      would INTRODUCE an accepted-deviation violation (e.g. a fix that adds
 *      `using MediatR;`, wires Polly, adds in-process rate limiting, or leaks a
 *      DbContext/DbSet into the Application layer) while ostensibly fixing
 *      something else. Fixers "modernise" opportunistically — this stops it.
 *   3. Encode the 2-A-LOOPHOLE guarantee: A1 accepts the repository PATTERN, but
 *      a genuine DbContext/DbSet<T>/IQueryable<T> LEAK into the Application layer
 *      is still a real S02/S64 finding and must NEVER be suppressed.
 *
 * Screening looks ONLY at what a fix ADDS (afterCode + importsAdded), never the
 * whole file — so it flags newly-introduced banned patterns, not pre-existing ones.
 */

import type { FixRecord } from './codelens-types';

export const AUTHORITY_ORDER =
  'Tier-0 Insurity standards > EAIS accepted deviations > golden repo';

export interface AcceptedDeviation {
  /** A1..A6 */
  id: string;
  title: string;
  /** What EAIS does, and the Tier-0 rule it overrides. */
  description: string;
  overridesTier0: string;
  /**
   * Patterns a generated fix must NOT INTRODUCE (scanned against afterCode +
   * importsAdded). Empty ⇒ this deviation has no reliable single-file fix
   * signature and is documentation-only (enforced by human review, not the gate).
   */
  bannedIntroduce: RegExp[];
}

export const ACCEPTED_DEVIATIONS: AcceptedDeviation[] = [
  {
    id: 'A1',
    title: 'Repository pattern per aggregate',
    description: 'EAIS uses I{Entity}Repository per aggregate with the DbContext confined to Infrastructure.',
    overridesTier0: 'Insurity: "no manual repository; the DbContext IS the repository".',
    // Enforced contextually by isApplicationDbContextLeak() (path-aware), not a
    // blanket regex — the pattern itself is accepted; only leaks are rejected.
    bannedIntroduce: [],
  },
  {
    id: 'A2',
    title: 'CQRS via custom PC.SharedKernel.Mediator',
    description: 'EAIS uses an in-house mediator mirroring the MediatR API. The 3rd-party MediatR package is intentionally NOT used.',
    overridesTier0: 'Insurity: plain services / MediatR optional.',
    // Ban only the 3rd-party package — NOT IRequest/IRequestHandler, which the
    // in-house mediator mirrors and legitimately uses.
    bannedIntroduce: [
      /\busing\s+MediatR\s*;/,
      /\bMediatR\s*\./,
      /\bAddMediatR\s*\(/,
    ],
  },
  {
    id: 'A3',
    title: 'Dapr owns resilience — Polly banned',
    description: 'Retry / circuit-breaking / timeout are owned by Dapr. Polly (and equivalent in-app resilience wiring) is banned in application code.',
    overridesTier0: 'Insurity: use Polly for external HTTP resilience.',
    bannedIntroduce: [
      /\busing\s+Polly\b/,
      /\bPolly\s*\./,
      /\bPolicy\s*\.\s*Handle\b/,
      /\bWaitAndRetry(Async)?\s*\(/,
      /\bCircuitBreaker(Async)?\s*\(/,
      /\bHandleTransientHttpError\s*\(/,
      /\bAddResilienceHandler\s*\(/,
    ],
  },
  {
    id: 'A4',
    title: 'Rate limiting at APIM',
    description: 'Rate limiting is enforced at Azure API Management, not in-process.',
    overridesTier0: 'Insurity: in-process per-tenant rate limiting.',
    bannedIntroduce: [
      /\bAddRateLimiter\s*\(/,
      /\bUseRateLimiter\s*\(/,
      /\[\s*EnableRateLimiting\b/,
      /\bRateLimiterOptions\b/,
    ],
  },
  {
    id: 'A5',
    title: '5-project Clean Architecture layout',
    description: 'EAIS uses Domain / Application / Contracts / Infrastructure / API projects.',
    overridesTier0: 'Insurity: Web / Service / Repository / Model.',
    // No reliable single-file fix signature — documentation-only.
    bannedIntroduce: [],
  },
  {
    id: 'A6',
    title: 'Dual org_id + tenant_id claim mapping',
    description: 'EAIS maps both org_id and tenant_id claims via TenantResolutionMiddleware.',
    overridesTier0: 'Insurity: org_id only.',
    // No reliable single-file fix signature — documentation-only.
    bannedIntroduce: [],
  },
];

/** Standards that assert the DbContext-in-Application ban (the 2-A-LOOPHOLE). */
const DBCONTEXT_LEAK_STANDARDS = new Set(['S02', 'S64']);

/** A path is Infrastructure/Repository if its folder or filename says so. */
export function isInfrastructurePath(relativePath: string): boolean {
  const p = relativePath.replace(/\\/g, '/').toLowerCase();
  return /(^|\/)infrastructure(\/|$)/.test(p)
    || /(^|\/)repositor(y|ies)(\/|$)/.test(p)
    || /repository\.cs$/.test(p);
}

/** DbContext / DbSet<T> / IQueryable<T> being introduced (the leak signature). */
const DBCONTEXT_LEAK_PATTERN =
  /\b[A-Za-z0-9_]*DbContext\b|\bDbSet\s*<|\bIQueryable\s*</;

/**
 * The 2-A-LOOPHOLE guard. Returns true when a fix would push a DbContext/DbSet/
 * IQueryable into a NON-Infrastructure (Application) file — accepted repository
 * pattern (A1) does NOT license this, so such a fix must be rejected.
 */
export function isApplicationDbContextLeak(added: string, relativePath: string): boolean {
  if (isInfrastructurePath(relativePath)) return false;
  return DBCONTEXT_LEAK_PATTERN.test(added);
}

export interface FixScreenResult {
  allowed: boolean;
  deviationId: string | null;
  evidence: string;
}

/**
 * Fix-safety gate. Scans ONLY what the fix ADDS (afterCode + importsAdded) for
 * patterns that would introduce an accepted-deviation violation. Returns the
 * first deviation the fix would breach, or allowed=true.
 */
export function screenFix(fix: Pick<FixRecord, 'afterCode' | 'importsAdded' | 'relativePath'>): FixScreenResult {
  const added = [fix.afterCode ?? '', ...(fix.importsAdded ?? [])].join('\n');

  // A1 loophole guard first (path-aware, highest-value): DbContext leak into App.
  if (isApplicationDbContextLeak(added, fix.relativePath)) {
    const m = added.match(DBCONTEXT_LEAK_PATTERN);
    return { allowed: false, deviationId: 'A1', evidence: m?.[0] ?? 'DbContext/DbSet/IQueryable in Application layer' };
  }

  for (const dev of ACCEPTED_DEVIATIONS) {
    for (const re of dev.bannedIntroduce) {
      const m = added.match(re);
      if (m) return { allowed: false, deviationId: dev.id, evidence: m[0] };
    }
  }
  return { allowed: true, deviationId: null, evidence: '' };
}

/**
 * A finding that must NEVER be suppressed as an "accepted deviation", regardless
 * of the repository pattern being accepted: a genuine DbContext leak (S02/S64)
 * detected in a non-Infrastructure file.
 */
export function isNeverSuppressed(ruleId: string, foundCode: string, relativePath: string): boolean {
  if (!DBCONTEXT_LEAK_STANDARDS.has(ruleId)) return false;
  return isApplicationDbContextLeak(foundCode ?? '', relativePath);
}
