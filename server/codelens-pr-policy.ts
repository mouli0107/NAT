/**
 * ASTRA Code Lens — per-repo PR trigger policy (Phase 3)
 *
 * Decides, for a given repo, WHETHER a pull-request event triggers a run and HOW:
 *   - which base branches trigger (the user chooses — decision #1)
 *   - review vs conform (conform also PUSHES fixes — decision #2)
 *   - advisory vs blocking check (decision #3 default: advisory, flip per-repo)
 *   - push mode: companion PR (safe default) vs direct-to-head (opt-in)
 *
 * v1 storage: in-memory map seeded from env defaults. Phase 5 swaps the resolver
 * body for the `codelens_pr_policies` table without changing this signature.
 */

export type PrRunMode = 'review' | 'conform';
export type PrPushMode = 'companion-pr' | 'direct-to-head';

export interface PrPolicy {
  repoFullName: string;      // 'owner/repo'
  enabled: boolean;
  /** Comma-separated globs, e.g. 'main,staging,release/*'. Empty ⇒ match none. */
  baseBranchPattern: string;
  mode: PrRunMode;
  /** Advisory (false) posts a neutral check; blocking (true) fails the check on violations. */
  blocking: boolean;
  pushMode: PrPushMode;
}

function envBool(name: string, dflt: boolean): boolean {
  const v = process.env[name];
  if (v == null) return dflt;
  return /^(1|true|yes|on)$/i.test(v.trim());
}

/** Org-wide defaults, overridable per-repo via setPrPolicy(). */
export function defaultPrPolicy(repoFullName: string): PrPolicy {
  return {
    repoFullName,
    enabled: envBool('CODELENS_PR_ENABLED', false),
    baseBranchPattern: process.env.CODELENS_PR_BASE?.trim() || 'main,staging',
    mode: (process.env.CODELENS_PR_MODE === 'conform' ? 'conform' : 'review'),
    blocking: envBool('CODELENS_PR_BLOCKING', false), // advisory-first (decision #3)
    pushMode: (process.env.CODELENS_PR_PUSH === 'direct-to-head' ? 'direct-to-head' : 'companion-pr'),
  };
}

const overrides = new Map<string, PrPolicy>();

export function setPrPolicy(policy: PrPolicy): void {
  overrides.set(policy.repoFullName.toLowerCase(), policy);
}

export function resolvePrPolicy(repoFullName: string): PrPolicy {
  return overrides.get(repoFullName.toLowerCase()) ?? defaultPrPolicy(repoFullName);
}

/** Strip a refs/heads/ prefix if present so 'refs/heads/main' and 'main' both work. */
export function normalizeRef(ref: string): string {
  return (ref || '').replace(/^refs\/heads\//, '');
}

/** Convert one glob token (only * supported) into an anchored regex. */
function globToRegExp(glob: string): RegExp {
  const escaped = glob.trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/** Does a PR's base branch match the policy's comma-separated glob pattern? */
export function matchesBaseBranch(baseRef: string, pattern: string): boolean {
  const ref = normalizeRef(baseRef);
  return pattern
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .some(tok => globToRegExp(tok).test(ref));
}

/** Companion branch for pushed fixes: never touches the author's PR branch. */
export function companionBranchName(prNumber: number): string {
  return `astra-codelens/fixes-pr-${prNumber}`;
}
