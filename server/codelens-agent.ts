import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { emit } from './codelens-session';
import {
  shouldIgnoreFile,
  countMatchingFiles,
} from './codelens-ignore';
import { deterministicVerdict, DETERMINISTIC_MODE } from './codelens-deterministic';
import { buildArchitectureGraph, planReviewOrder, type ArchitectureGraph } from './codelens-arch-graph';
import {
  ensureRepoReady,
  listTrackedFiles,
  buildAuthenticatedUrl,
  ensureFixBranch,
  commitFixedFile,
  pushFixBranch,
  stripGitCredentials,
  getChangedLineRanges,
} from './codelens-git';
// Lazy import so this module loads even when DATABASE_URL is absent.
// All DB calls are fire-and-forget; a missing DB should not crash the review.
const dbModule = () => import('./codelens-db');
type DbModule = typeof import('./codelens-db');
const createRun:        DbModule['createRun']        = (...a) => dbModule().then(m => m.createRun(...a));
const saveFileResult:   DbModule['saveFileResult']   = (...a) => dbModule().then(m => m.saveFileResult(...a));
const saveStandardResult: DbModule['saveStandardResult'] = (...a) => dbModule().then(m => m.saveStandardResult(...a));
const saveViolation:    DbModule['saveViolation']    = (...a) => dbModule().then(m => m.saveViolation(...a));
const completeRun:      DbModule['completeRun']      = (...a) => dbModule().then(m => m.completeRun(...a));
const markViolationFixed: DbModule['markViolationFixed'] = (...a) => dbModule().then(m => m.markViolationFixed(...a));
const getLatestResumableRun: DbModule['getLatestResumableRun'] = (...a) => dbModule().then(m => m.getLatestResumableRun(...a));
const getCachedCheck: DbModule['getCachedCheck'] = (...a) => dbModule().then(m => m.getCachedCheck(...a));
const putCachedCheck: DbModule['putCachedCheck'] = (...a) => dbModule().then(m => m.putCachedCheck(...a));
const getSuppressionKeys: DbModule['getSuppressionKeys'] = (...a) => dbModule().then(m => m.getSuppressionKeys(...a));
const addSuppression: DbModule['addSuppression'] = (...a) => dbModule().then(m => m.addSuppression(...a));
const getEnabledCustomStandards: DbModule['getEnabledCustomStandards'] = (...a) => dbModule().then(m => m.getEnabledCustomStandards(...a));
const getDisabledBuiltinIds: DbModule['getDisabledBuiltinIds'] = (...a) => dbModule().then(m => m.getDisabledBuiltinIds(...a));
import type {
  CodeLensSession,
  FileEntry,
  ViolationRecord,
  FixRecord,
  FileSummary,
  CoverageErrorCell,
  CodeStandard,
} from './codelens-types';

const execAsync = promisify(exec);

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// Model id / deployment name. When AI_INTEGRATIONS_ANTHROPIC_BASE_URL points at
// api.anthropic.com this is a public Anthropic model id; when it points at an
// Azure AI Foundry endpoint it must be that resource's *deployment name*.
// Override via ANTHROPIC_MODEL. Default is a current, high-throughput model.
const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// Bump RULESET_VERSION when the review methodology changes in a way that should
// invalidate ALL cached verdicts. CHECKER_VERSION also folds in the model id, so
// switching models automatically re-checks everything.
const RULESET_VERSION = 'v1';
const CHECKER_VERSION = `llm:${CLAUDE_MODEL}:${RULESET_VERSION}`;

const MAX_FILE_BYTES = 150_000;
// ─── Throughput model (env-tunable so it scales with your Anthropic tier) ──────
// Quality rule: ALWAYS exactly one standard per Claude call — speed comes only
// from concurrency, never from batching standards together.
//
// Per file we WARM the prompt cache with the first call (full file = uncached
// tokens), then FAN OUT the remaining standards in parallel — those hit the
// cache, so they're cheap and don't count against the uncached-token limit.
//   • warmupLimiter caps concurrent uncached file reads (bounds the true ceiling).
//   • fanoutLimiter caps concurrent cache-hit calls (high — they're cheap).
// Conservative defaults that fit a modest Anthropic tier without drowning in
// 429s. Raise via env once you've confirmed your tier's headroom. The adaptive
// rate-limit gate below means even a too-high value self-throttles gracefully.
const FILE_CONCURRENCY   = Number(process.env.CODELENS_FILE_CONCURRENCY)   || 8;
const WARMUP_CONCURRENCY = Number(process.env.CODELENS_WARMUP_CONCURRENCY) || 3;
const FANOUT_CONCURRENCY = Number(process.env.CODELENS_FANOUT_CONCURRENCY) || 12;

// ─── Adaptive rate-limit gate (anti-thundering-herd) ──────────────────────────
// When ANY call hits 429, the whole fleet pauses until the server-provided
// retry-after window clears, instead of each call independently hammering and
// re-syncing into another burst. Per-call jitter desyncs the resume.
let rateLimitedUntil = 0;
let lastRateLogAt = 0;
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function retryAfterMs(err: any): number {
  const h = err?.headers;
  let ra: string | null | undefined;
  try { ra = typeof h?.get === 'function' ? h.get('retry-after') : h?.['retry-after']; } catch { /* ignore */ }
  const secs = ra ? parseInt(String(ra), 10) : NaN;
  return !isNaN(secs) && secs > 0 ? secs * 1000 : 0;
}

/** Block until the shared rate-limit window clears (plus jitter to desync resumes). */
async function awaitRateLimitClear(): Promise<void> {
  const wait = rateLimitedUntil - Date.now();
  if (wait > 0) await sleep(wait + Math.floor(Math.random() * 2000));
}

/**
 * Async semaphore with PER-USER fair-share scheduling.
 *
 * At most `max` of `fn` run concurrently across ALL users (the global API
 * budget). When a slot frees, it is granted to the waiting user who currently
 * has the FEWEST tasks in flight (FIFO tie-break) — so one user's 3,800-file
 * scan can never monopolise the shared rate-limit budget and starve a second
 * user who just kicked off a 2-file review.
 *
 * The freed slot is transferred to the chosen waiter without dropping `active`,
 * so the global ceiling is honoured exactly (no over-subscription race).
 */
export function makeFairLimiter(max: number) {
  let active = 0;
  const inFlight = new Map<string, number>();        // userId -> running count
  let seq = 0;
  interface Waiter { userId: string; seq: number; resume: () => void }
  const waiters: Waiter[] = [];

  function bump(uid: string, delta: number) {
    const next = (inFlight.get(uid) ?? 0) + delta;
    if (next <= 0) inFlight.delete(uid);
    else inFlight.set(uid, next);
  }

  /** Index of the waiter whose user has the fewest in-flight tasks; FIFO tie-break. */
  function pickNext(): number {
    let best = -1, bestCount = Infinity, bestSeq = Infinity;
    for (let i = 0; i < waiters.length; i++) {
      const w = waiters[i];
      const c = inFlight.get(w.userId) ?? 0;
      if (c < bestCount || (c === bestCount && w.seq < bestSeq)) {
        best = i; bestCount = c; bestSeq = w.seq;
      }
    }
    return best;
  }

  return async function run<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    const uid = userId || 'anonymous';
    if (active >= max) {
      // Queue; the releaser transfers a slot to us (active already counts it).
      await new Promise<void>(resume => waiters.push({ userId: uid, seq: seq++, resume }));
      bump(uid, +1);
    } else {
      active++;
      bump(uid, +1);
    }
    try {
      return await fn();
    } finally {
      bump(uid, -1);
      if (waiters.length > 0) {
        // Hand the slot to the fairest waiter — keep `active` unchanged.
        const [w] = waiters.splice(pickNext(), 1);
        w.resume();
      } else {
        active--;
      }
    }
  };
}

const warmupLimiter = makeFairLimiter(WARMUP_CONCURRENCY);
const fanoutLimiter = makeFairLimiter(FANOUT_CONCURRENCY);
// Standards are checked sequentially per file so prompt caching is effective:
// call 1 sends file content â†’ Anthropic caches it; calls 2-42 read from cache.
// Concurrency across files is still FILE_CONCURRENCY (10 files at once).

// buildAuthenticatedUrl is imported from ./codelens-git and re-exported here
// so that codelens-routes.ts can keep its existing import.
export { buildAuthenticatedUrl, stripGitCredentials };

/**
 * Stable key for a finding, used for sticky suppressions. Keyed on the
 * credential-free repo URL + file path + standard + the *normalized* offending
 * code. So an ignore holds until that code actually changes (a fix changes the
 * code → new key → the finding is re-evaluated, never silently suppressed).
 */
export function suppressionKey(userId: string, repoUrl: string, filePath: string, standardId: string, foundCode: string): string {
  const normCode = (foundCode || '').replace(/\s+/g, ' ').trim();
  return createHash('sha256')
    .update(userId).update(' ')
    .update(stripGitCredentials(repoUrl)).update(' ')
    .update(filePath).update(' ')
    .update(standardId).update(' ')
    .update(normCode)
    .digest('hex');
}

// â”€â”€â”€ Standards Definition â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// CodeStandard now lives in codelens-types (so the session can reference the
// merged built-in + custom set). Re-export so existing imports keep working.
export type { CodeStandard } from './codelens-types';

/** Effective standards for a session = built-in 42 + enabled custom (loaded at
 *  review start). Falls back to the built-ins if not yet loaded — safe for any
 *  path that runs before/without a loaded session. */
function effectiveStandards(session: CodeLensSession): CodeStandard[] {
  return session.activeStandards.length ? session.activeStandards : STANDARDS;
}

export const STANDARDS: CodeStandard[] = [
  {
    id: 'S01',
    name: 'HTTP PATCH Only',
    severity: 'Critical',
    description: 'Use PATCH for updates. [HttpPut] is prohibited. PATCH DTOs must inherit FieldStatusDto and use FieldWasPresent() to modify only supplied fields.',
    whatToLookFor: 'Look for [HttpPut] attribute on any action method. Look for PUT routes. Look for PATCH DTOs that do NOT inherit FieldStatusDto. Look for update methods that set all fields instead of checking FieldWasPresent().',
    appliesTo: 'controller',
    notApplicableWhen: 'File is not a Controller (filename does not end in Controller.cs)'
  },
  {
    id: 'S02',
    name: 'No DbContext in Application Layer',
    severity: 'Critical',
    description: 'DbContext is allowed only inside Infrastructure repositories. Controllers, Application services, and Handlers must use repository interfaces instead.',
    whatToLookFor: 'Look for DbContext being injected into or used in any file that is NOT inside an Infrastructure or Repository folder/namespace. Look for constructor parameters of type DbContext or ApplicationDbContext in Service or Controller files. Look for any direct use of _context or _dbContext in Service classes.',
    appliesTo: 'all',
    notApplicableWhen: 'File is inside Infrastructure or Repository layer (namespace or folder contains Infrastructure or Repository)'
  },
  {
    id: 'S03',
    name: 'No .Update() in Repositories',
    severity: 'Critical',
    description: 'Never use DbSet.Update(). Always load the tracked entity, modify required fields, and call SaveChangesAsync(). ExecuteUpdateAsync() is the only approved bulk-update exception.',
    whatToLookFor: 'Look for .Update( method calls on any DbSet. Look for _context.EntityName.Update( or _dbContext.EntityName.Update(. Look for _context.Update( or Set<T>().Update(. ExecuteUpdateAsync() is allowed.',
    appliesTo: 'repository',
    notApplicableWhen: 'File is not a Repository (filename does not end in Repository.cs and namespace does not contain Repository)'
  },
  {
    id: 'S04',
    name: 'Tenant Isolation',
    severity: 'Critical',
    description: 'Tenant information must come from IApplicationIdentity. Enforce tenant filtering using EF Core global query filters, SaveChanges tenant validation, PostgreSQL RLS, and prevent TenantId from being supplied by clients.',
    whatToLookFor: 'In DTOs: look for TenantId as a settable property (clients must not supply it). In DbContext: look for missing HasQueryFilter with tenant condition. In Controllers: look for TenantId being read from request body or query string instead of IApplicationIdentity. Look for any place tenant is obtained from something other than IApplicationIdentity.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no tenant-related code at all'
  },
  {
    id: 'S05',
    name: 'Standard Identity',
    severity: 'Critical',
    description: 'Use IApplicationIdentity exclusively. Custom services like ICurrentUserService, IIdentityService, or IUserContext are prohibited. Register AddApplicationIdentity() and UseApplicationIdentity() in startup.',
    whatToLookFor: 'Look for ICurrentUserService, IIdentityService, IUserContext anywhere in the file. Look for custom identity interfaces or classes that duplicate what IApplicationIdentity provides. In Program.cs look for missing AddApplicationIdentity() and UseApplicationIdentity() calls.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no identity or user-related code'
  },
  {
    id: 'S06',
    name: 'JSON:API Framework Compliance',
    severity: 'Critical',
    description: 'Use JsonApiFeatures for paging, sorting, sparse fieldsets, and includes. Implement FilterCriteriaBase, relationship DTOs, standard JSON:API responses, correct HTTP status codes, and idempotent POST operations.',
    whatToLookFor: 'Look for manual paging (Skip/Take without JsonApiFeatures). Look for custom sorting logic instead of JsonApiFeatures sorting. Look for responses that do not use JSON:API standard structure. Look for POST operations that are not idempotent. Look for missing FilterCriteriaBase on filter classes.',
    appliesTo: 'controller',
    notApplicableWhen: 'File is not a Controller or DTO'
  },
  {
    id: 'S07',
    name: '.NET Target Framework',
    severity: 'Critical',
    description: 'All projects must target .NET 10.0 (net10.0).',
    whatToLookFor: 'Look for <TargetFramework> element. Check if value is net10.0. Flag if it is net6.0, net7.0, net8.0, net9.0 or any other value.',
    appliesTo: 'all',
    notApplicableWhen: 'File is not a .csproj file (only check .csproj files for this standard)'
  },
  {
    id: 'S08',
    name: 'Layered Architecture',
    severity: 'Critical',
    description: 'Follow strict Controller â†’ Service â†’ Repository â†’ Model architecture. Controllers call Services only. Services call Repositories only. Repositories access DbContext only.',
    whatToLookFor: 'In Controllers: look for direct repository injection or direct DbContext usage. In Services: look for direct DbContext usage or HttpContext usage. In Repositories: look for business logic, validation logic, or service calls. Look for layer-skipping (Controller calling Repository directly).',
    appliesTo: 'all',
    notApplicableWhen: 'File is a model, DTO, or configuration file with no method bodies'
  },
  {
    id: 'S09',
    name: 'Dependency Injection',
    severity: 'Warning',
    description: 'Register all services using the built-in .NET DI container with appropriate service lifetimes (Singleton, Scoped, Transient).',
    whatToLookFor: 'Look for new keyword instantiating services that should be injected (service classes, repositories, DbContext). Look for static service classes. Look for ServiceLocator pattern. Look for manual instantiation of objects that should come from DI.',
    appliesTo: 'all',
    notApplicableWhen: 'File contains only DTOs, models, constants, or enums with no service instantiation'
  },
  {
    id: 'S10',
    name: 'Database Standard',
    severity: 'Critical',
    description: 'Use PostgreSQL as the mandatory database. No SQL Server, SQLite, or other databases.',
    whatToLookFor: 'Look for UseSqlServer, UseSqlite, UseMySql, UseOracle in DbContext configuration. Look for SQL Server connection string patterns. Look for Microsoft.Data.SqlClient using statements. Look for SqlConnection.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no database configuration or connection code'
  },
  {
    id: 'S11',
    name: 'Entity Framework Core Code-First',
    severity: 'Critical',
    description: 'Use EF Core Code-First. Do not implement Repository or Factory patterns manually on top of EF.',
    whatToLookFor: 'Look for raw ADO.NET (SqlCommand, SqlDataReader, IDbCommand). Look for Dapper. Look for manual SQL strings executed outside of EF Core. Look for hand-rolled Repository base classes that re-implement EF tracking logic.',
    appliesTo: 'repository',
    notApplicableWhen: 'File is not related to data access'
  },
  {
    id: 'S12',
    name: 'Repository Pattern Ownership',
    severity: 'Critical',
    description: 'Repository project owns entities and DbContext. Web and Service projects must not contain EF entities or DbContext.',
    whatToLookFor: 'Look for EF Core entity classes (with [Table], HasKey, DbSet references) defined inside Web or Service project namespaces. Look for DbContext defined outside the Repository/Infrastructure project. Check using statements for cross-layer entity imports.',
    appliesTo: 'all',
    notApplicableWhen: 'File is inside the Repository or Infrastructure project'
  },
  {
    id: 'S13',
    name: 'DbContext Usage',
    severity: 'Warning',
    description: 'Inject DbContext directly. Do not use IDbContextFactory.',
    whatToLookFor: 'Look for IDbContextFactory<T> being injected. Look for _contextFactory.CreateDbContext() calls. Look for using (var context = _factory.CreateDbContext()) patterns.',
    appliesTo: 'repository',
    notApplicableWhen: 'File is not in Repository or Infrastructure layer'
  },
  {
    id: 'S14',
    name: 'Object Mapping â€” No AutoMapper',
    severity: 'Critical',
    description: 'Use extension methods for POCO mapping. AutoMapper is prohibited.',
    whatToLookFor: 'Look for using AutoMapper. Look for IMapper injection. Look for _mapper.Map<T>( calls. Look for CreateMap<>() calls. Look for MapperConfiguration. Look for Profile class inheritance for AutoMapper.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no mapping or object conversion code'
  },
  {
    id: 'S15',
    name: 'JSON:API Compliance',
    severity: 'Critical',
    description: 'APIs must conform to JSON:API specification using Insurity Framework base classes.',
    whatToLookFor: 'Look for controllers returning plain objects (return Ok(entity)) instead of JSON:API wrapped responses. Look for missing Content-Type application/vnd.api+json. Look for response shapes that do not follow JSON:API data/attributes/relationships structure.',
    appliesTo: 'controller',
    notApplicableWhen: 'File is not a Controller'
  },
  {
    id: 'S16',
    name: 'DTO Separation',
    severity: 'Warning',
    description: 'Maintain separate DTOs for Read, Create, Update, and Filter operations.',
    whatToLookFor: 'Look for a single DTO class being used for both create and read operations. Look for DTOs with all optional fields trying to serve multiple purposes. Look for entity classes being returned directly from controllers as DTOs.',
    appliesTo: 'dto',
    notApplicableWhen: 'File is not a DTO (does not contain Dto, Request, Response, or Model in class name)'
  },
  {
    id: 'S17',
    name: 'DTO Base Classes',
    severity: 'Critical',
    description: 'DTOs must inherit from Insurity Framework JSON:API base classes.',
    whatToLookFor: 'Look for DTO classes that do not inherit from Insurity Framework base classes. Look for DTOs inheriting from plain object or custom base classes instead of the Insurity JSON:API base types.',
    appliesTo: 'dto',
    notApplicableWhen: 'File is not a DTO file'
  },
  {
    id: 'S18',
    name: 'Filter Criteria',
    severity: 'Warning',
    description: 'Implement strongly typed filter criteria classes using JSON:API filter[...] conventions.',
    whatToLookFor: 'Look for filter parameters passed as individual query string parameters instead of filter[field] convention. Look for filter classes that do not inherit FilterCriteriaBase. Look for manual query string parsing for filtering.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no filtering logic'
  },
  {
    id: 'S19',
    name: 'Service Layer Responsibility',
    severity: 'Critical',
    description: 'Service layer contains business logic, orchestration, validation, and entity-to-DTO mapping only.',
    whatToLookFor: 'Look for HTTP-specific code in services (HttpContext, IActionResult, StatusCodes). Look for persistence logic directly in services (bypassing repository). Look for services returning raw entities instead of DTOs.',
    appliesTo: 'service',
    notApplicableWhen: 'File is not a Service (filename does not end in Service.cs)'
  },
  {
    id: 'S20',
    name: 'Service Layer Restrictions',
    severity: 'Critical',
    description: 'Service layer must not access HTTP, return IActionResult, or contain persistence-specific logic.',
    whatToLookFor: 'Look for IActionResult or ActionResult as return types in Service methods. Look for HttpContext being accessed in Service classes. Look for SaveChangesAsync being called directly in Service classes (should be in Repository). Look for IHttpContextAccessor injection in Services.',
    appliesTo: 'service',
    notApplicableWhen: 'File is not a Service class'
  },
  {
    id: 'S21',
    name: 'Mapping Strategy',
    severity: 'Warning',
    description: 'Implement all entity-to-DTO and DTO-to-entity conversions using mapper extension methods.',
    whatToLookFor: 'Look for inline mapping code inside Service methods (manually setting property by property inline). Look for mapping logic inside Controllers. Look for mapping done with AutoMapper. Correct pattern is static extension methods like entity.ToDto() or dto.ToEntity().',
    appliesTo: 'all',
    notApplicableWhen: 'File has no mapping or conversion between entity and DTO types'
  },
  {
    id: 'S22',
    name: 'Controller Responsibility',
    severity: 'Critical',
    description: 'Controllers handle routing, validation, authentication, and delegate all business logic to services.',
    whatToLookFor: 'Look for business logic directly in controller action methods (if/else on domain state, calculations, data transformation). Look for database queries in controllers. Look for controllers containing more than: validate input, call service, return result.',
    appliesTo: 'controller',
    notApplicableWhen: 'File is not a Controller'
  },
  {
    id: 'S23',
    name: 'Controller Base Class',
    severity: 'Critical',
    description: 'Controllers must inherit from InsurityController, not ControllerBase.',
    whatToLookFor: 'Look for "class XyzController : ControllerBase". Look for "class XyzController : Controller". The correct form is "class XyzController : InsurityController".',
    appliesTo: 'controller',
    notApplicableWhen: 'File is not a Controller'
  },
  {
    id: 'S24',
    name: 'Input Validation',
    severity: 'Critical',
    description: 'Use FluentValidation for request validation. No DataAnnotations on request DTOs.',
    whatToLookFor: 'Look for [Required], [MaxLength], [MinLength], [Range], [StringLength], [RegularExpression] on DTO properties. Look for manual validation code in controllers (if (model.Field == null) return BadRequest()). Correct approach is AbstractValidator<T> classes.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no validation logic and no DTO properties'
  },
  {
    id: 'S25',
    name: 'API Naming Convention',
    severity: 'Warning',
    description: 'Routes must use lowercase, plural English resource names without hyphens.',
    whatToLookFor: 'Look for [Route] attributes with uppercase letters in path segments. Look for singular resource names (e.g. /rule instead of /rules). Look for hyphens in route paths. Look for camelCase in route paths.',
    appliesTo: 'controller',
    notApplicableWhen: 'File is not a Controller'
  },
  {
    id: 'S26',
    name: 'Swagger Configuration',
    severity: 'Warning',
    description: 'Configure Swagger using Insurity JSON:API Swagger extensions and XML comments.',
    whatToLookFor: 'In Program.cs: look for missing AddSwaggerGen with Insurity extensions. Look for generic Swagger setup without JSON:API configuration. Look for missing XML comment file inclusion in Swagger config.',
    appliesTo: 'program',
    notApplicableWhen: 'File is not Program.cs or a Swagger configuration file'
  },
  {
    id: 'S27',
    name: 'Authentication',
    severity: 'Critical',
    description: 'Use JWT Bearer authentication through Insurity security extensions.',
    whatToLookFor: 'In Program.cs: look for AddAuthentication without Insurity security extensions. Look for custom JWT validation logic instead of using Insurity extensions. Look for missing [Authorize] on controllers that should be protected.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no authentication configuration'
  },
  {
    id: 'S28',
    name: 'Application Identity',
    severity: 'Critical',
    description: 'Use IApplicationIdentity instead of HttpContext in non-web layers.',
    whatToLookFor: 'Look for IHttpContextAccessor being injected into Service or Repository classes. Look for HttpContext.User being accessed outside of Controller layer. Look for Thread.CurrentPrincipal usage. The correct approach in non-web layers is IApplicationIdentity.',
    appliesTo: 'all',
    notApplicableWhen: 'File is a Controller (HttpContext access is acceptable in Controller layer only)'
  },
  {
    id: 'S29',
    name: 'Multi-Tenancy',
    severity: 'Critical',
    description: 'Manage tenant isolation in the Repository layer using IApplicationIdentity.',
    whatToLookFor: 'Look for tenant filtering happening in Service or Controller layer instead of Repository. Look for WHERE tenant_id = clauses in Service-layer code. Look for tenant ID being passed as a method parameter through multiple layers instead of resolved from IApplicationIdentity in Repository.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no tenant-related logic'
  },
  {
    id: 'S30',
    name: 'Tenant Enforcement',
    severity: 'Critical',
    description: 'Apply global query filters and automatic tenant validation in DbContext.',
    whatToLookFor: 'In DbContext: look for missing HasQueryFilter on entities that have TenantId. Look for SaveChangesAsync override that does not validate tenant consistency. Look for entities with TenantId that can be saved without tenant validation.',
    appliesTo: 'infrastructure',
    notApplicableWhen: 'File is not a DbContext class'
  },
  {
    id: 'S31',
    name: 'Audit Fields',
    severity: 'Warning',
    description: 'Populate audit fields automatically during SaveChangesAsync.',
    whatToLookFor: 'In DbContext SaveChangesAsync override: look for missing CreatedAt, UpdatedAt, CreatedBy, UpdatedBy population. Look for audit fields being set manually in Service or Controller layer instead of automatically in DbContext.',
    appliesTo: 'infrastructure',
    notApplicableWhen: 'File is not a DbContext class'
  },
  {
    id: 'S32',
    name: 'Claims Access',
    severity: 'Warning',
    description: 'Use Insurity extension methods (GetName(), GetEmail(), GetTenant()) for identity information.',
    whatToLookFor: 'Look for direct User.Claims.FirstOrDefault(c => c.Type == "...") access. Look for ClaimTypes.Name, ClaimTypes.Email accessed manually. Look for JWT claim parsing done manually. Correct approach is IApplicationIdentity.GetName(), GetEmail(), GetTenant().',
    appliesTo: 'all',
    notApplicableWhen: 'File has no claims or identity access'
  },
  {
    id: 'S33',
    name: 'Logging Destination',
    severity: 'Warning',
    description: 'All logs must be written to stdout for distributed environments.',
    whatToLookFor: 'Look for file-based logging configuration (Serilog WriteTo.File, NLog file target). Look for database logging sinks. Look for Windows Event Log sinks. Correct approach is Console/stdout sink only.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no logging configuration'
  },
  {
    id: 'S34',
    name: 'Logging Performance',
    severity: 'Warning',
    description: 'Use LoggerMessage source generators for high-performance logging.',
    whatToLookFor: 'Look for _logger.LogInformation("text " + variable) â€” string concatenation in log calls. Look for _logger.LogDebug($"text {variable}") â€” string interpolation in log calls. Correct approach is LoggerMessage.Define or [LoggerMessage] source generator attribute.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no logging calls'
  },
  {
    id: 'S35',
    name: 'Structured Logging',
    severity: 'Warning',
    description: 'Use structured logging with message templates. Avoid string interpolation and concatenation.',
    whatToLookFor: 'Look for _logger.Log calls using string interpolation ($"...{variable}..."). Look for string concatenation in log messages ("text " + value). Correct approach is message templates: _logger.LogInformation("Processing {EntityId}", id).',
    appliesTo: 'all',
    notApplicableWhen: 'File has no logging calls'
  },
  {
    id: 'S36',
    name: 'XML Documentation',
    severity: 'Warning',
    description: 'Public types and members must include XML documentation (CS1591 compliance).',
    whatToLookFor: 'Look for public class declarations without /// <summary> XML doc above them. Look for public methods without XML documentation. Look for public properties on DTOs and entities that lack /// <summary>.',
    appliesTo: 'all',
    notApplicableWhen: 'File contains only private or internal members'
  },
  {
    id: 'S37',
    name: 'PostgreSQL Naming Convention',
    severity: 'Critical',
    description: 'Use UseSnakeCaseNamingConvention() for tables, columns, indexes, and constraints.',
    whatToLookFor: 'In DbContext OnModelCreating: look for missing UseSnakeCaseNamingConvention() call. Look for [Table("PascalCaseName")] or [Column("PascalCaseName")] attributes overriding snake_case. Look for HasIndex or HasConstraint with PascalCase names.',
    appliesTo: 'infrastructure',
    notApplicableWhen: 'File is not a DbContext or EF configuration file'
  },
  {
    id: 'S38',
    name: 'EF Configuration Approach',
    severity: 'Warning',
    description: 'Prefer EF Core conventions and data annotations. Use Fluent API only when necessary.',
    whatToLookFor: 'Look for excessive Fluent API configuration for things that EF conventions handle automatically (basic property types, simple relationships). Look for HasColumnName, HasMaxLength, IsRequired being set via Fluent API when data annotations would suffice.',
    appliesTo: 'infrastructure',
    notApplicableWhen: 'File is not an EF Core configuration file'
  },
  {
    id: 'S39',
    name: 'Many-to-Many Relationships',
    severity: 'Warning',
    description: 'Configure many-to-many relationships using EF Core UsingEntity().',
    whatToLookFor: 'Look for manual join entity classes for many-to-many relationships that could use UsingEntity(). Look for missing UsingEntity() configuration when two entities have collection navigation properties pointing to each other.',
    appliesTo: 'infrastructure',
    notApplicableWhen: 'File has no many-to-many relationship configuration'
  },
  {
    id: 'S40',
    name: 'Connection Strings Security',
    severity: 'Critical',
    description: 'Store secrets outside source control using User Secrets or secure configuration.',
    whatToLookFor: 'Look for connection strings hardcoded in appsettings.json with actual credentials (password=, Password=, pwd=). Look for API keys or secrets hardcoded in any .cs or .json file. Look for connection strings in Program.cs directly.',
    appliesTo: 'all',
    notApplicableWhen: 'File has no configuration or connection string content'
  },
  {
    id: 'S41',
    name: 'Health Checks',
    severity: 'Warning',
    description: 'Register and expose standard ASP.NET Core health check endpoints.',
    whatToLookFor: 'In Program.cs: look for missing services.AddHealthChecks(). Look for missing app.MapHealthChecks("/health") or equivalent endpoint mapping. Look for health checks registered but not mapped.',
    appliesTo: 'program',
    notApplicableWhen: 'File is not Program.cs'
  },
  {
    id: 'S42',
    name: 'Middleware Configuration',
    severity: 'Critical',
    description: 'Enable Insurity JSON:API middleware, Swagger, authentication, authorization, and health checks in Program.cs.',
    whatToLookFor: 'In Program.cs: look for missing UseJsonApi() or equivalent Insurity middleware. Look for missing UseSwagger() and UseSwaggerUI(). Look for missing UseAuthentication() before UseAuthorization(). Look for UseAuthorization() without UseAuthentication() preceding it. Look for missing health check endpoint mapping.',
    appliesTo: 'program',
    notApplicableWhen: 'File is not Program.cs'
  },

  // ─── STANDARD 7 — .NET CODING STANDARDS ─────────────────────────────────

  {
    id: 'S43',
    name: 'CancellationToken in every async method',
    severity: 'Critical',
    description: 'Every async Task or async Task<T> method MUST accept CancellationToken ct as the last parameter. The token MUST be passed to ALL awaited calls that accept one — SaveChangesAsync(ct), ToListAsync(ct), FirstOrDefaultAsync(ct), HttpClient calls, etc.',
    whatToLookFor: `Read every public and internal async method.
      VIOLATION A (HIGH): method accepts CancellationToken but does NOT pass it to any
        awaited EF Core or HttpClient call — it is silently discarded.
        Look for: SaveChangesAsync() without ct, ToListAsync() without ct,
        FirstOrDefaultAsync() without ct, SingleOrDefaultAsync() without ct,
        AnyAsync() without ct, CountAsync() without ct.
      VIOLATION B (MEDIUM): public async method that does NOT accept CancellationToken
        at all — missing parameter entirely.
      Report file path and line number for every occurrence.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a migration, DTO, enum, or constant file with no async methods'
  },

  {
    id: 'S44',
    name: 'No blocking async calls',
    severity: 'Critical',
    description: 'No .Result, .Wait(), or .GetAwaiter().GetResult() in production code. These block the thread, cause deadlocks in ASP.NET Core, and destroy throughput under load.',
    whatToLookFor: `Search every line for:
      - .Result on a Task or Task<T>
      - .Wait() method call on a Task
      - .GetAwaiter().GetResult()
      CRITICAL: any occurrence in a controller, application handler, or repository.
      HIGH: any occurrence in any other production (non-test) code path.
      Exception: synchronous entry points like static void Main() that structurally
      cannot be async — MUST have a justifying comment. Without comment = violation.
      Report exact line and the blocking expression found.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a migration, DTO, enum, or constant file'
  },

  {
    id: 'S45',
    name: 'No unnecessary async wrapping',
    severity: 'Warning',
    description: 'Methods whose entire body is return await SingleCall(...) with no other statements should return the Task directly without async. Do not write await Task.CompletedTask in methods that do no actual async work.',
    whatToLookFor: `Look for methods that follow this pattern exactly:
      public async Task<T> MethodName(...) => await _repo.SomeMethod(...);
      or
      public async Task<T> MethodName(...) { return await _repo.SomeMethod(...); }
      where the ENTIRE body is a single await with no try/catch, no using, no other statements.
      These should be: public Task<T> MethodName(...) => _repo.SomeMethod(...);
      Also look for: return await Task.CompletedTask or await Task.CompletedTask with
      no other async work in the method.
      Report the method name and line number.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a migration, DTO, enum, or constant file'
  },

  {
    id: 'S46',
    name: 'ConfigureAwait(false) in building-block code',
    severity: 'Warning',
    description: 'Code under src/building-block/ MUST use .ConfigureAwait(false) on every await to prevent synchronization context capture. ASP.NET Core application code does not require this.',
    whatToLookFor: `This standard ONLY applies to files whose path contains building-block or
      whose namespace contains BuildingBlock or SharedKernel.
      For those files: find every await expression and check if it is followed by
      .ConfigureAwait(false).
      Any await in a building-block file WITHOUT .ConfigureAwait(false) is a MEDIUM finding.
      Example violation: await _repository.GetAsync(id, ct)
      Correct form:      await _repository.GetAsync(id, ct).ConfigureAwait(false)
      Report each await line that is missing .ConfigureAwait(false).`,
    appliesTo: 'all',
    notApplicableWhen: 'File is NOT inside a building-block or SharedKernel folder/namespace'
  },

  {
    id: 'S47',
    name: 'IHttpClientFactory — never new HttpClient()',
    severity: 'Critical',
    description: 'new HttpClient() bypasses socket lifecycle management, causes socket exhaustion, and skips CorrelationMessageHandler which propagates X-Correlation-Id. For Insurity-to-Insurity API calls use Insurity.JsonApi.Client.Http extension methods.',
    whatToLookFor: `Search every line for:
      - new HttpClient()
      - new HttpClient(
      These are HIGH findings in any production code.
      Also look for raw _httpClient.GetAsync, _httpClient.PostAsync etc. instead of
      the Insurity extension methods GetFromJsonApiAsync, PostToJsonApiAsync,
      PatchToJsonApiAsync, DeleteFromJsonApiAsync.
      Report exact line and the expression found.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a migration, DTO, enum, or test file'
  },

  {
    id: 'S48',
    name: 'JsonSerializerOptions must be private static readonly',
    severity: 'Warning',
    description: 'JsonSerializerOptions construction is expensive (reflection-based). Any instance allocated inside a method body or per-request creates a new uncached options object on every call — significant performance cost.',
    whatToLookFor: `Search for: new JsonSerializerOptions
      For each occurrence, check where it is declared:
      VIOLATION: declared inside a method body (local variable)
      VIOLATION: declared as an instance field (not static readonly)
      PASS: declared as private static readonly field at class level
      Report each violating occurrence with the line and the declaration context.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no JSON serialization code'
  },

  {
    id: 'S49',
    name: 'DTO enums must have JsonStringEnumConverter',
    severity: 'Critical',
    description: 'Every enum used in HTTP request/response DTOs MUST have [JsonConverter(typeof(JsonStringEnumConverter))]. Integer enum values create brittle API contracts — inserting a new member changes all subsequent ordinals.',
    whatToLookFor: `Find all enum declarations in the file.
      For each enum, check if it is used in a DTO (any class ending in Dto, Attributes,
      Request, Response, ForCreate, ForUpdate).
      If an enum is used in a DTO context and does NOT have
      [JsonConverter(typeof(JsonStringEnumConverter))] on its declaration = HIGH finding.
      Also check if the enum has [JsonConverter] with a DIFFERENT converter type — that
      is also a finding unless the converter correctly handles string serialization.
      Report each enum name and line number missing the attribute.`,
    appliesTo: 'all',
    notApplicableWhen: 'File has no enum declarations or no DTO classes'
  },

  {
    id: 'S50',
    name: 'No null-forgiving operator without justification',
    severity: 'Warning',
    description: 'The ! null-forgiving operator silences nullable compiler warnings without fixing nullability. Each use MUST have an immediately-preceding comment explaining WHY null cannot occur in this context.',
    whatToLookFor: `Search every line for the ! null-forgiving operator patterns:
      - variable! (identifier followed by !)
      - method()! (method call followed by !)
      - expression!.Property (dereference after !)
      For each occurrence, check the PRECEDING line for a comment explaining why null
      is impossible here (e.g., a guard, a framework guarantee, an invariant).
      VIOLATION: any ! operator where the immediately preceding line is NOT a comment
      explaining the null safety guarantee.
      Report each violating line with the expression.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no nullable reference type usage'
  },

  {
    id: 'S51',
    name: 'Guid.TryParse at system boundaries — never Guid.Parse',
    severity: 'Critical',
    description: 'Values arriving from the outside world (query params, route params, request body, headers) MUST be parsed with Guid.TryParse. Guid.Parse throws FormatException and returns an unformatted 500 instead of a proper 400.',
    whatToLookFor: `Search every line for: Guid.Parse(
      For each occurrence, determine the source of the string being parsed:
      VIOLATION (HIGH): Guid.Parse applied to a route parameter, query string parameter,
        request body property, or header value — anything from an HTTP request.
      PASS: Guid.Parse applied to a constant string literal, configuration value,
        or a value already validated at a prior boundary.
      The correct form for HTTP boundary parsing is:
        if (!Guid.TryParse(value, out var guid)) return BadRequest(...)
      Report each violating Guid.Parse call with the line and the argument being parsed.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no Guid parsing or no HTTP boundary code'
  },

  {
    id: 'S52',
    name: 'No service locator pattern',
    severity: 'Critical',
    description: 'IServiceProvider.GetService<T>() or GetRequiredService<T>() called inside a method body is the service locator anti-pattern. It hides dependencies, makes classes untestable, and bypasses lifetime management.',
    whatToLookFor: `Search every method body for:
      - .GetService<
      - .GetRequiredService<
      - ServiceProvider.GetService
      - ServiceProvider.GetRequiredService
      VIOLATION (HIGH): any of these in a controller, handler, repository, or service
        class method body.
      PASS: IServiceScopeFactory.CreateScope() in background services only — and only
        scope.ServiceProvider.GetRequiredService<T>() inside the using block.
      PASS: usage in Program.cs DI extension methods or factory lambdas registered with DI.
      Report each violation with the class type and line number.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is Program.cs, a DI extension class, or a background service using IServiceScopeFactory correctly'
  },

  {
    id: 'S53',
    name: 'No empty catch blocks',
    severity: 'Critical',
    description: 'catch { } or catch (Exception) { } with an empty body silently discards exceptions — the system continues in an unknown state with no record of failure. If swallowing is correct, it MUST be logged and justified.',
    whatToLookFor: `Search for catch blocks and inspect their body:
      VIOLATION (HIGH): catch block with completely empty body {}
      VIOLATION (HIGH): catch block whose body contains ONLY a comment but no logging
      VIOLATION (MEDIUM): catch block that swallows the exception (does not rethrow)
        but does NOT log at LogWarning or higher with a comment explaining why swallowing is safe.
      PASS: catch block that either rethrows, logs and rethrows, or logs with a clear
        comment explaining the exception is intentionally swallowed.
      Report each empty or unlogged catch block with line number.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no try/catch blocks'
  },

  {
    id: 'S54',
    name: 'No commented-out code',
    severity: 'Info',
    description: 'Commented-out code creates confusion about intent. Git history preserves everything — remove it. Exception: intentional documentation examples with an explicit comment marking them as such.',
    whatToLookFor: `Look for blocks of commented-out C# code — NOT documentation comments (///)
      and NOT single-line explanatory comments.
      Signs of commented-out code:
      - Multiple consecutive // lines that look like method bodies, statements, or declarations
      - /* ... */ blocks containing C# code
      - Lines like: // var result = await _repo.GetAsync(id);
      - Lines like: // if (entity == null) throw new ...
      PASS: /// XML documentation comments
      PASS: // Single explanatory sentence comments describing what the next line does
      PASS: // TODO, // NOTE, // HACK comment markers (covered by S55)
      VIOLATION (LOW): any block of commented-out executable code.
      Report the starting line and approximate line count of each block.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no inline comments'
  },

  {
    id: 'S55',
    name: 'No TODO/FIXME/HACK without ticket reference',
    severity: 'Warning',
    description: 'Every // TODO, // FIXME, or // HACK MUST include a backlog ticket reference (e.g. EAIS-1234). Without a ticket the work item is invisible to planning and will never be addressed.',
    whatToLookFor: `Search every comment for: TODO, FIXME, HACK (case-insensitive).
      For each occurrence, check if a ticket reference pattern is present on the same line.
      Ticket pattern: one or more uppercase letters followed by a hyphen and digits
        Examples: EAIS-1234, ADO-14056, RE-42, JIRA-999
      VIOLATION (MEDIUM): any TODO/FIXME/HACK comment that does NOT contain a ticket
        reference matching the pattern [A-Z]+-[0-9]+
      PASS: // TODO EAIS-1234: refactor this when X ships
      VIOLATION: // TODO: refactor this (no ticket)
      VIOLATION: // FIXME: broken for edge case (no ticket)
      Report each violating comment with exact line number and the comment text.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no TODO/FIXME/HACK comments'
  },

  {
    id: 'S56',
    name: 'Method length must not exceed 100 lines',
    severity: 'Critical',
    description: 'Methods exceeding 100 lines MUST be refactored into smaller named helpers. Methods 51-100 lines SHOULD be refactored. Count executable lines only — exclude blank lines and XML doc comment lines.',
    whatToLookFor: `For each method in the file, count its executable lines
      (exclude: blank lines, /// XML doc comment lines, { } braces on their own line).
      VIOLATION (HIGH — required refactor): method exceeds 100 executable lines.
      VIOLATION (MEDIUM — recommended refactor): method is 51-100 executable lines.
      Report: method name, start line, end line, executable line count, severity.
      Focus on the longest methods. Report ALL methods over 50 lines.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no method bodies (DTO, enum, constant file)'
  },

  {
    id: 'S57',
    name: 'XML documentation on all public types and members',
    severity: 'Warning',
    description: 'Every public class, interface, method, property, and enum value MUST have XML documentation (/// <summary>). CS1591 is treated as an error — build fails if any are missing.',
    whatToLookFor: `Read every public declaration in the file:
      - public class declarations
      - public interface declarations
      - public method declarations
      - public property declarations
      - public enum declarations and their values
      For each, check if the IMMEDIATELY preceding non-blank line is a /// <summary> comment.
      VIOLATION (MEDIUM): any public type or member lacking /// <summary> documentation.
      PASS: internal, private, protected members (documentation optional)
      PASS: auto-generated or designer files (already excluded from scan)
      Report each undocumented public member with its line number.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no public declarations'
  },

  // ─── STANDARD 8 — ARCHITECTURAL REQUIREMENTS & PROJECT STRUCTURE ──────────

  {
    id: 'S58',
    name: 'All projects must target .NET 10.0',
    severity: 'Critical',
    description: 'Every .csproj file MUST contain <TargetFramework>net10.0</TargetFramework>. No project may target an older version.',
    whatToLookFor: `This standard applies ONLY to .csproj files.
      Find the <TargetFramework> element.
      VIOLATION (HIGH): value is anything other than net10.0
        Examples: net6.0, net7.0, net8.0, net9.0 — all are violations.
      PASS: net10.0
      Also check for <TargetFrameworks> (plural) — if it includes any non-net10.0
        target alongside net10.0, that is also a violation for production projects.
      Report the current TargetFramework value found.`,
    appliesTo: 'all',
    notApplicableWhen: 'File is not a .csproj file'
  },

  {
    id: 'S59',
    name: 'Mandatory six-layer project structure',
    severity: 'Critical',
    description: 'Every microservice MUST have exactly six project types: .API/.Web, .Service, .Service.Interface, .Repository, .Model, .Shared. Reference graph must flow Web->Service->Service.Interface->Repository->Model/Shared only.',
    whatToLookFor: `Check the .csproj file and its ProjectReference elements.
      VIOLATION (CRITICAL): a reference flows in the wrong direction.
        Examples of illegal references:
        - Repository project referencing Service project
        - Service project referencing Web/API project
        - Model project referencing Repository project
      VIOLATION (HIGH): a .csproj that appears to be a Web/API project
        (contains Controllers/ or Program.cs) does NOT reference a Service project.
      Also look for ProjectReference paths and check for upward/cross-layer references.
      Report each illegal ProjectReference with source and target project.`,
    appliesTo: 'all',
    notApplicableWhen: 'File is not a .csproj file'
  },

  {
    id: 'S60',
    name: 'Insurity NuGet base classes must be used',
    severity: 'Critical',
    description: 'Controllers must inherit InsurityController not ControllerBase. Filter criteria must inherit FilterCriteriaBase. Resources must use Resource<TAttributes> or Resource<TAttributes,TRelationships>. AddInsurityJsonApi() and UseInsurityJsonApi() must be called in Program.cs.',
    whatToLookFor: `In Controller files:
      VIOLATION (HIGH): class XxxController : ControllerBase (should be InsurityController)
      VIOLATION (HIGH): class XxxController : Controller (should be InsurityController)
      PASS: class XxxController : InsurityController

      In DTO/Filter files:
      VIOLATION (MEDIUM): filter criteria class that does NOT inherit FilterCriteriaBase
      VIOLATION (MEDIUM): resource attributes class that does NOT inherit from
        Resource<T> or Resource<TAttributes, TRelationships>

      In Program.cs:
      VIOLATION (HIGH): missing AddInsurityJsonApi() in service registration
      VIOLATION (HIGH): missing UseInsurityJsonApi() in middleware pipeline
      VIOLATION (HIGH): AddJwtBearer() used instead of AddInsurityJwtBearer()

      Report each violation with the class name and line number.`,
    appliesTo: 'all',
    notApplicableWhen: 'File has no class declarations and is not Program.cs'
  },

  {
    id: 'S61',
    name: 'DI mandatory — no new on service or repository types',
    severity: 'Critical',
    description: 'Services, repositories, and any class with dependencies MUST be registered and resolved via the DI container. new ServiceClass(...) or new RepositoryClass(...) in production business logic is a violation.',
    whatToLookFor: `Search every method body (NOT in Program.cs, NOT in DI extension methods,
      NOT in factory lambdas) for new keyword followed by a class name that:
      - ends in Service
      - ends in Repository
      - ends in Handler
      - ends in Manager
      - ends in Provider (infrastructure providers, not value providers)
      VIOLATION (HIGH): new AnyService(...) or new AnyRepository(...) in a controller,
        service, handler, or repository class method body.
      PASS: new keyword in Program.cs, in DI extension methods, in test classes,
        in factory lambdas passed to services.AddXxx().
      PASS: new for DTOs, value objects, exceptions, domain events — not services.
      Report each violating new expression with the type being instantiated.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is Program.cs, a DI extension class, or a test file'
  },

  {
    id: 'S62',
    name: 'PostgreSQL mandatory — no other database providers',
    severity: 'Critical',
    description: 'Only Npgsql.EntityFrameworkCore.PostgreSQL is permitted in production .csproj files. No SQL Server, SQLite, InMemory, or other EF Core providers in non-test projects.',
    whatToLookFor: `In .csproj files: search for PackageReference elements containing:
      VIOLATION (CRITICAL): Microsoft.EntityFrameworkCore.SqlServer
      VIOLATION (CRITICAL): Microsoft.EntityFrameworkCore.Sqlite
      VIOLATION (CRITICAL): Microsoft.EntityFrameworkCore.InMemory (in non-test projects)
      VIOLATION (CRITICAL): Oracle.EntityFrameworkCore
      VIOLATION (CRITICAL): Pomelo.EntityFrameworkCore.MySql
      PASS: Npgsql.EntityFrameworkCore.PostgreSQL

      In .cs files: search for:
      VIOLATION: UseSqlServer(, UseSqlite(, UseInMemoryDatabase(, UseOracle(
      PASS: UseNpgsql(

      Report each violating package reference or DbContext configuration.`,
    appliesTo: 'all',
    notApplicableWhen: 'File is a test project .csproj (filename contains Test or Spec)'
  },

  {
    id: 'S63',
    name: 'No AutoMapper — use Mappers/ extension methods',
    severity: 'Critical',
    description: 'AutoMapper is banned. Entity-to-DTO and DTO-to-entity mapping MUST be implemented as extension methods in a Mappers/ folder. No IMapper, no CreateMap<>, no Profile classes for AutoMapper.',
    whatToLookFor: `Search every line and every using statement for:
      - using AutoMapper
      - IMapper (injection or usage)
      - _mapper.Map<
      - .Map<  (AutoMapper Map call)
      - CreateMap<  (AutoMapper profile)
      - : Profile (inheriting AutoMapper Profile)
      - MapperConfiguration
      - new MapperConfiguration(
      Each of these is a HIGH finding.
      The correct mapping pattern is static extension methods:
        public static ProductDto ToDto(this Product entity) => new() { ... };
      Report each AutoMapper reference with exact line number.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a test file or migration file'
  },

  // ─── STANDARD 9 — SERVICE LAYER DESIGN ───────────────────────────────────

  {
    id: 'S64',
    name: 'Service layer — no HTTP, no EF config, no raw SQL',
    severity: 'Critical',
    description: 'Service classes and application handlers MUST NOT return IActionResult, inject HttpContext/IHttpContextAccessor, call EF Core configuration methods, or execute raw SQL strings.',
    whatToLookFor: `This standard applies to files ending in Service.cs or Handler.cs.
      Check for these violations:
      VIOLATION (CRITICAL): method return type is IActionResult or ActionResult<T>
        in a service or handler class (not a controller)
      VIOLATION (HIGH): injection of HttpContext or IHttpContextAccessor
        in a service or handler constructor
      VIOLATION (HIGH): calls to FromSqlRaw(, ExecuteSqlRaw(, ExecuteSqlInterpolated(,
        Database.ExecuteSql in service or handler classes
      VIOLATION (HIGH): OnModelCreating method or HasQueryFilter call in a service class
      VIOLATION (HIGH): SaveChangesAsync called directly in service classes when it should
        be in the repository layer
      Report each violation with the class name, method name, and line number.`,
    appliesTo: 'service',
    notApplicableWhen: 'File does not end in Service.cs or Handler.cs'
  },

  {
    id: 'S65',
    name: 'Distinct DTO types per CRUD aspect',
    severity: 'Critical',
    description: 'Every resource MUST have separate DTO types: {Resource}Dto for reads, {Resource}ForCreateDto for creates, {Resource}ForUpdateDto for PATCH updates (inheriting FieldStatusDto), {Resource}FilterCriteria for filtering.',
    whatToLookFor: `Look for evidence of DTO reuse across operations:
      VIOLATION (HIGH): a single DTO class used as both the create request and the
        read response — identifiable when the same class name appears in both
        POST action parameter and GET return type in the same controller.
      VIOLATION (HIGH): update DTO (ForUpdateDto or similar) that does NOT inherit
        FieldStatusDto — direct sign that PATCH field-presence tracking is not implemented.
      VIOLATION (MEDIUM): create or update DTO names that do not follow the convention:
        ForCreateDto, ForUpdateDto, ForCreate, ForUpdate — using generic names like
        CreateRequest, UpdateModel, SaveDto.
      VIOLATION (MEDIUM): missing FilterCriteria class when the controller has
        a collection GET endpoint with filter parameters.
      Report each violation with the DTO class name and where it is misused.`,
    appliesTo: 'all',
    notApplicableWhen: 'File has no DTO or request/response class declarations'
  },

  {
    id: 'S66',
    name: 'Mapping via extension methods in Mappers/',
    severity: 'Warning',
    description: 'POCO mapping MUST be done via dedicated extension methods in a Mappers/ folder. Inline mapping scattered across service method bodies creates duplication and makes mapping logic untestable.',
    whatToLookFor: `Look for inline entity-to-DTO or DTO-to-entity mapping INSIDE service
      or handler method bodies — not delegated to a ToDto() or ToEntity() extension method.
      Signs of inline mapping:
      - var dto = new SomeDto { Property1 = entity.Property1, Property2 = entity.Property2, ... }
        with 3 or more property assignments inline inside a service method body
      - Manual property-by-property copying between entity and DTO inside a method
      PASS: var dto = entity.ToDto() — delegated to extension method
      PASS: var dto = entity.MapToDto() — delegated to extension method
      VIOLATION (MEDIUM): inline mapping with multiple property assignments inside
        a service/handler method body rather than a Mappers/ extension method.
      Report each occurrence with the method name and starting line number.`,
    appliesTo: 'service',
    notApplicableWhen: 'File does not end in Service.cs or Handler.cs'
  },

  {
    id: 'S67',
    name: 'Service interfaces return DTOs not entities',
    severity: 'Critical',
    description: 'All methods on IXxxService interfaces MUST return DTOs or primitives — never EF Core entity types. Returning entities from service interfaces leaks the data layer contract through the service boundary.',
    whatToLookFor: `Find all interface declarations (files starting with I and containing Service).
      For each method declared on the interface, check the return type:
      VIOLATION (HIGH): return type is a class from the Model project or a class
        decorated with [Table] or [Key] attributes — these are EF Core entities.
      VIOLATION (HIGH): return type is IQueryable<EntityType> where EntityType is
        an EF Core entity — this leaks EF concerns through the service contract.
      PASS: return type is a DTO class (ends in Dto, Attributes, Response, ForCreate, ForUpdate)
      PASS: return type is a primitive, Guid, string, int, bool, Task, void
      PASS: return type is a generic wrapper around a DTO (e.g. IEnumerable<ProductDto>)
      Report each service interface method returning an entity type.`,
    appliesTo: 'service',
    notApplicableWhen: 'File is not a service interface (does not start with I or does not contain Service in name)'
  },

  {
    id: 'S68',
    name: 'IQueryable projection before materialisation',
    severity: 'Warning',
    description: 'Repository query methods should return IQueryable<T> so the service layer can compose projections (Select) before materialisation. Loading full tracked entities then mapping in memory is wasteful for read-only operations.',
    whatToLookFor: `Look for service or handler methods that perform read-only queries:
      VIOLATION (MEDIUM): service calls .ToListAsync(ct) on a repository result and
        THEN maps each entity to a DTO in memory (using .Select() or foreach AFTER
        materialisation) when a .Select(e => e.ToDto()) BEFORE .ToListAsync(ct)
        would load only the needed columns.
        Pattern to flag:
          var entities = await _repo.GetAllAsync(ct);  // materialises full entities
          return entities.Select(e => e.ToDto()).ToList(); // maps after load
        Correct pattern:
          return await _repo.GetQueryable()
              .Select(e => new ProductDto { ... })
              .ToListAsync(ct); // projects at DB level
      Only flag this when the full entity graph is loaded but only a subset of
      properties is used in the resulting DTO.
      Report the method name and line range.`,
    appliesTo: 'service',
    notApplicableWhen: 'File does not end in Service.cs or Handler.cs'
  },

  // ─── STANDARD 10 — CLOUD DESIGN PATTERNS ─────────────────────────────────

  {
    id: 'S69',
    name: 'MapInsurityHealthChecks() — not custom MapGet("/health")',
    severity: 'Critical',
    description: 'Health endpoints MUST use app.MapInsurityHealthChecks() which registers /health/live and /health/ready correctly. Custom MapGet("/health"...) bypasses the framework standard and fails the middleware pipeline.',
    whatToLookFor: `This standard applies ONLY to Program.cs files.
      VIOLATION (HIGH): app.MapGet("/health" — any custom health endpoint using MapGet
      VIOLATION (HIGH): app.MapGet("/health/live" — even if it mimics the Insurity pattern
      VIOLATION (HIGH): app.MapGet("/health/ready"
      PASS: app.MapInsurityHealthChecks()
      Also check: builder.Services.AddHealthChecks() is present and includes
        .AddDbContextCheck<T>(tags: new[] { "ready" }) for DB readiness.
      Also check: Kubernetes deploy YAML if present — liveness probe should point to
        /health/live NOT /health.
      Report each custom health endpoint MapGet call with line number.`,
    appliesTo: 'program',
    notApplicableWhen: 'File is not Program.cs'
  },

  {
    id: 'S70',
    name: 'X-Correlation-Id middleware and propagation',
    severity: 'Critical',
    description: 'app.UseCorrelation() MUST be the FIRST middleware. AddCorrelationServices() MUST be registered with AutoIncludeMessageHandler=true. Every error response MUST include the correlationId field.',
    whatToLookFor: `In Program.cs:
      VIOLATION (HIGH): UseCorrelation() is absent entirely
      VIOLATION (HIGH): UseCorrelation() is placed AFTER exception handling middleware
        (app.UseExceptionHandler, app.UseProblemDetails, etc.)
      VIOLATION (MEDIUM): AddCorrelationServices() is missing AutoIncludeMessageHandler = true
      Correct pipeline order (first three middleware):
        app.UseCorrelation()  <- MUST be first
        app.UseExceptionHandler(...)
        app.UseAuthentication()
        ...
      In any HttpClient registration:
      VIOLATION (MEDIUM): AddHttpClient() without CorrelationMessageHandler or
        without AutoIncludeMessageHandler = true in correlation services config
      Report middleware ordering and any missing correlation configuration.`,
    appliesTo: 'program',
    notApplicableWhen: 'File is not Program.cs'
  },

  {
    id: 'S71',
    name: 'Dapr publish AFTER SaveChangesAsync — never before',
    severity: 'Critical',
    description: 'Domain events published via Dapr MUST be published ONLY after SaveChangesAsync succeeds. Publishing before the DB commit creates phantom events in the message bus with no corresponding DB state.',
    whatToLookFor: `Search every method body for PublishEventAsync( calls.
      For each PublishEventAsync( call, look at the surrounding code:
      VIOLATION (CRITICAL): SaveChangesAsync is called AFTER PublishEventAsync in the
        same method — the event is published before the data is committed.
        Pattern:
          await _daprClient.PublishEventAsync(...)  <- WRONG: publish first
          await _context.SaveChangesAsync(ct)        <- DB commit after
      PASS: SaveChangesAsync precedes PublishEventAsync in the same method.
        Pattern:
          await _context.SaveChangesAsync(ct)        <- DB commit first
          await _daprClient.PublishEventAsync(...)   <- publish after
      Also flag if try/catch swallows a SaveChanges failure and then publishes anyway.
      Report each violation with the method name and the line numbers of both calls.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no Dapr PublishEventAsync calls'
  },

  {
    id: 'S72',
    name: 'No Polly for Dapr-mediated calls',
    severity: 'Critical',
    description: 'The Dapr sidecar owns all retry/circuit-breaking for Dapr-mediated calls. Adding Polly for these paths creates double-retry storms. Polly is only permitted for external third-party integrations that do NOT route through Dapr.',
    whatToLookFor: `Search for Polly usage:
      - using Polly
      - AddPolly
      - AddPolicyHandler
      - IAsyncPolicy
      - ResiliencePipelineBuilder
      - Policy.Handle<
      - RetryPolicy
      - CircuitBreakerPolicy
      For each Polly usage found, determine what it is wrapping:
      VIOLATION (HIGH): Polly wrapping a DaprClient call, an InvokeMethodAsync call,
        or a Dapr pub/sub call — the sidecar already handles this.
      PASS: Polly wrapping a direct HTTPS call to an external third-party service
        (payment gateway, external API) that does NOT go through Dapr.
        This MUST have a comment identifying the external target.
      Report each Polly policy and what service/call it is protecting.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no Polly or resilience policy code'
  },

  {
    id: 'S73',
    name: 'Rate limiting from JWT claim — not client header',
    severity: 'Critical',
    description: 'The rate-limiting partition key MUST come from the authenticated JWT org_id claim only. Using a client-supplied header as the key is a security vulnerability — attackers can exhaust another tenant quota.',
    whatToLookFor: `Find the rate limiting configuration — typically in RateLimitingSetup.cs,
      Program.cs, or a middleware registration class.
      Look for the partition key definition in AddRateLimiter or similar.
      VIOLATION (CRITICAL): partition key reads from any of:
        - Request.Headers["X-Tenant-Id"]
        - Request.Headers["x-tenant-id"]
        - Any header value used as partition key
        - Query string value used as partition key
      PASS: partition key reads from:
        - HttpContext.User.FindFirst("org_id")?.Value
        - IApplicationIdentity.GetTenant()
        - A claim value from the validated JWT
      Report the partition key expression and its source.`,
    appliesTo: 'all',
    notApplicableWhen: 'File has no rate limiting configuration'
  },

  {
    id: 'S74',
    name: 'IdempotencyFilter — correct cache key and TTL',
    severity: 'Critical',
    description: 'Cache key MUST be {tenantId}:{serviceName}:{idempotencyKey}. Standard TTL=24h, financial insurance operations TTL=48h. MUST use Redis SET NX not SET EX. IdempotencyFilter MUST be registered globally in AddControllers.',
    whatToLookFor: `Find IdempotencyFilter registration and configuration:
      In Program.cs or filter registration:
      VIOLATION (HIGH): IdempotencyFilter NOT registered globally in
        AddControllers(o => o.Filters.Add<IdempotencyFilter>())
      In IdempotencyFilter implementation or configuration:
      VIOLATION (HIGH): cache key format is NOT {tenantId}:{serviceName}:{idempotencyKey}
      VIOLATION (HIGH): SET EX used instead of SET NX (SET EX overwrites, breaking idempotency)
      VIOLATION (HIGH): financial insurance operations (policy binding, premium collection,
        endorsements, cancellations, claims filing) NOT configured with 48-hour TTL
      VIOLATION (MEDIUM): standard operations NOT using 24-hour TTL
      Report each misconfiguration with the line number and current value.`,
    appliesTo: 'all',
    notApplicableWhen: 'File has no idempotency filter configuration or implementation'
  },

  {
    id: 'S75',
    name: 'OpenTelemetry with ASP.NET Core and EF Core instrumentation',
    severity: 'Critical',
    description: 'All services MUST register OpenTelemetry with AddAspNetCoreInstrumentation(), AddEntityFrameworkCoreInstrumentation(), and AddOtlpExporter(). X-Correlation-Id MUST be included as a span attribute.',
    whatToLookFor: `In Program.cs only:
      VIOLATION (HIGH): AddOpenTelemetry() is absent entirely
      VIOLATION (HIGH): AddOpenTelemetry() present but missing AddAspNetCoreInstrumentation()
      VIOLATION (MEDIUM): AddOpenTelemetry() present but missing
        AddEntityFrameworkCoreInstrumentation() — renders N+1 query detection impossible
      VIOLATION (HIGH): AddOpenTelemetry() present but missing AddOtlpExporter()
      VIOLATION (MEDIUM): X-Correlation-Id not added as a span attribute/tag in
        the tracing configuration
      VIOLATION (HIGH): Serilog, NLog, or log4net sinks to Application Insights
        or other non-OTLP telemetry egress configured
      Correct minimum registration:
        builder.Services.AddOpenTelemetry()
          .WithTracing(b => b
            .AddAspNetCoreInstrumentation()
            .AddEntityFrameworkCoreInstrumentation()
            .AddOtlpExporter());
      Report each missing component with what was found vs what was expected.`,
    appliesTo: 'program',
    notApplicableWhen: 'File is not Program.cs'
  },

  // ─── STANDARD 11 — LOGGING REQUIREMENTS ──────────────────────────────────

  {
    id: 'S76',
    name: 'All logging to stdout — no file or external sinks',
    severity: 'Critical',
    description: 'Logs MUST go to stdout ONLY. File sinks, Application Insights direct sinks, and EventLog sinks bypass the Dapr log aggregation pipeline and may lose logs during pod restarts.',
    whatToLookFor: `In Program.cs and appsettings.json:
      Search for logging sink configuration:
      VIOLATION (HIGH): WriteTo.File( — Serilog file sink
      VIOLATION (HIGH): WriteTo.RollingFile( — Serilog rolling file
      VIOLATION (HIGH): WriteTo.ApplicationInsights( — direct AI sink
      VIOLATION (HIGH): WriteTo.EventLog( — Windows event log
      VIOLATION (HIGH): AddApplicationInsightsTelemetry() in logging context
      VIOLATION (HIGH): NLog file target configuration
      In .csproj files:
      VIOLATION (HIGH): Serilog.Sinks.File package reference in non-test project
      VIOLATION (HIGH): Serilog.Sinks.ApplicationInsights in non-test project
      PASS: WriteTo.Console() — stdout is correct
      PASS: AddConsole() — stdout is correct
      Report each non-stdout sink with the file and line number.`,
    appliesTo: 'all',
    notApplicableWhen: 'File has no logging configuration'
  },

  {
    id: 'S77',
    name: 'LoggerMessage source generator for high-frequency logs',
    severity: 'Warning',
    description: 'All log messages in hot code paths (controllers, handlers, repositories, middleware) MUST use the [LoggerMessage] source generator to eliminate boxing, allocations, and string formatting overhead.',
    whatToLookFor: `In controller, handler, repository, and middleware files:
      Look for raw _logger.LogInformation(...), _logger.LogWarning(...),
      _logger.LogError(...), _logger.LogDebug(...) calls with inline template strings.
      VIOLATION (MEDIUM): any _logger.LogXxx("message {Param}", value) call in a
        controller, handler, repository, or middleware class where the log message
        is defined inline rather than via a [LoggerMessage] source-generated method.
      PASS: Log.SomeMethod(_logger, param) where Log is a partial class with
        [LoggerMessage] attributes — this is the source generator pattern.
      Note: this is the ideal; flag as MEDIUM not CRITICAL since migration is gradual.
      Report each raw _logger call in hot-path files with line number.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a DTO, enum, model, or constant file with no logging'
  },

  {
    id: 'S78',
    name: 'No string interpolation or concatenation in log calls',
    severity: 'Critical',
    description: 'String interpolation or concatenation in log calls defeats structured logging and causes allocations even for suppressed log levels. Always use the structured template overload with separate parameters.',
    whatToLookFor: `Search every _logger.Log* call for the argument passed as the message:
      VIOLATION (HIGH): interpolated string passed as the first argument to
        _logger.LogInformation, LogWarning, LogError etc.
      VIOLATION (HIGH): string concatenation — "Processing " + entityId + " failed"
        passed as message to any _logger.Log* method.
      PASS: structured template — _logger.LogInformation("Processing {EntityId}", entityId)
        where the message is a plain string literal with {placeholders}.
      Report each violation with the exact log call and line number.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no _logger calls'
  },

  {
    id: 'S79',
    name: 'Log levels used correctly',
    severity: 'Warning',
    description: 'Debug for developer flow details only. Information for business-significant events. Warning for unexpected but recoverable state. Error for exceptions requiring investigation. Critical for service-level failures requiring immediate action.',
    whatToLookFor: `Check all _logger.Log* calls and assess level correctness:
      VIOLATION (MEDIUM): LogError used for expected business validation failures
        that represent a normal (if unwanted) application state — these should be LogWarning.
        Example: LogError when a resource is not found (404) — that is LogWarning.
        Example: LogError when validation fails — that is LogWarning.
      VIOLATION (MEDIUM): LogInformation used for high-frequency per-request flow details
        that should be LogDebug — logging every individual field read or loop iteration.
      VIOLATION (MEDIUM): LogDebug calls that would appear in Production without a
        log level filter — check if minimum log level is configured to suppress Debug.
      PASS: LogError for caught exceptions where the operation genuinely failed.
      PASS: LogWarning for recoverable unexpected states.
      PASS: LogInformation for entity created, status changed, request completed.
      Report systematic misuse patterns rather than every individual call.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File has no logging calls'
  },

  // ─── STANDARD 12 — SINGLE IMPLEMENTATION PER CONCEPT ────────────────────

  {
    id: 'S80',
    name: 'Single implementation per concept — no divergent duplicates',
    severity: 'Critical',
    description: 'Any concept implemented in more than one place MUST have ONE shared authoritative implementation. Check: audit stamping, cross-tenant write guard, error contracts, paged result types, null-object services, mapping approach, framework property access.',
    whatToLookFor: `Check for these specific divergence patterns:

      1. AUDIT STAMPING: Find all SaveChangesAsync overrides across DbContext files.
         VIOLATION (HIGH): UpdatedAt or UpdatedBy uses ??= form — freezes value at first update.
         VIOLATION (MEDIUM): Different DbContexts implement audit stamping differently.
         PASS: UpdatedAt = now unconditionally on EntityState.Modified.

      2. CROSS-TENANT WRITE GUARD: Find all tenant guard implementations.
         VIOLATION (MEDIUM): Different names (GuardCrossTenantWrites vs EnforceTenantIsolation)
           or different mechanisms across DbContext files for the same guard.

      3. ERROR CONTRACT: Find places where the same error condition is handled.
         VIOLATION (MEDIUM): same condition (e.g. missing tenant) returns different
           response shapes in different controllers.

      4. PAGED RESULT TYPES: Find all paging DTO/meta types.
         VIOLATION (MEDIUM): multiple PagedResult or PagedMeta variants with different
           field names (Timestamp vs GeneratedAt, Items vs Data).

      5. NULL-OBJECT SERVICES: Find NullOutboxWriter, StartupApplicationIdentity etc.
         VIOLATION (HIGH): same null-object type defined in more than one place instead
           of the shared kernel.

      Report each divergence with file paths and the differing implementations.`,
    appliesTo: 'all',
    notApplicableWhen: 'File is a migration, DTO, or enum file'
  },

  // ─── STANDARD 13 — NO REPEATED VALUE EXTRACTION ──────────────────────────

  {
    id: 'S81',
    name: 'No repeated extraction of the same value in a block or method',
    severity: 'Warning',
    description: 'A value obtained from a property or method MUST be read once and reused. Never re-evaluate the same expression multiple times in a block when it is invariant. Check paging extraction, identity resolution, and any repeated calls.',
    whatToLookFor: `Look for these specific patterns within a single method body:

      1. PAGING EXTRACTION: jsonApiContext.Paging or jsonApiContext.HasValidOffsetPagingInfo
         accessed more than once in the same method.
         VIOLATION: reading .Paging.Number and .Paging.Size in separate lines when a
           single (page, pageSize) tuple extracted once would suffice.

      2. IDENTITY RESOLUTION: _appIdentity.GetTenant(), GetEmail(), GetName() or
         _appIdentity.Principal called more than once in the same method.
         VIOLATION (MEDIUM): GetTenant() called twice in SaveChangesAsync when it should
           be computed once at the top and passed to both guard and stamp helpers.

      3. ANY INVARIANT EXPRESSION evaluated 2+ times in a block:
         - Same repository call made twice with identical parameters
         - Same request.Property accessed 3+ times when a local variable would suffice
         - Same computed value recalculated instead of cached in a local variable
         VIOLATION (LOW): cheap property re-reads (string, int, bool)
         VIOLATION (MEDIUM): expensive re-reads (DB calls, HTTP calls, complex LINQ)

      Report method name, the repeated expression, and line numbers of each occurrence.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a DTO, enum, constant, or migration file'
  },

  // ─── STANDARD 14 — TENANT IDENTITY LAYERING ──────────────────────────────

  {
    id: 'S82',
    name: 'Tenant identity layering — do not thread tenant for scoping',
    severity: 'Critical',
    description: 'Tenant scoping is enforced solely by DbContext global query filter and SaveChangesAsync guard — both sourced from IApplicationIdentity in Infrastructure. Service and handler layers must NOT pass TenantId parameters for scoping purposes.',
    whatToLookFor: `Look for these violations across service, handler, and repository files:

      1. TENANT PARAMETER THREADING: method signatures that include a tenantId or
         TenantId parameter whose ONLY purpose is to pass it to a repository for filtering.
         VIOLATION (HIGH): IXxxService.GetAllAsync(Guid tenantId, ...) when the global
           query filter already scopes by tenant — tenantId parameter is dead plumbing.
         VIOLATION (HIGH): repository method accepting TenantId when the global query
           filter already applies it.
         PASS: TenantId parameter in an audit-history query where it genuinely needs
           to query across tenants (document the exception).

      2. MANUAL TENANT PREDICATES: Where clauses in service or handler code that
         add explicit tenant filtering on top of the global query filter.
         VIOLATION (HIGH): .Where(x => x.TenantId == tenantId) in a service or handler
           where the global query filter already scopes this.

      3. MANUAL TENANT STAMPS: entity initializers in service code that manually set
         TenantId from a parameter or identity call.
         VIOLATION (MEDIUM): new Entity { TenantId = _identity.GetTenant(), ... }
           in service code when DbContext.SaveChangesAsync already stamps TenantId.

      4. IDENTITY ABOVE INFRASTRUCTURE for scoping: reading tenant ID from
         IApplicationIdentity in the service layer solely to pass it down for filtering.
         PASS: reading identity above Infrastructure for actor logging, permission checks,
           audit trail writing — these are NOT scoping uses.

      Report each threading violation with the method signature and line numbers.`,
    appliesTo: 'non-migration',
    notApplicableWhen: 'File is a migration, DTO, enum, Program.cs, or DbContext file'
  }
];

// Repair UTF-8-as-Windows-1252 mojibake baked into the source strings (→, —, •,
// …, ' all got corrupted). Runs once at module load so every consumer — the
// dashboard catalog, violation cards, and Claude prompts — gets clean text.
function deMojibake(s: string): string {
  // Each key is the UTF-8 byte sequence of a punctuation char that was
  // mis-decoded as Windows-1252. Written as \u escapes (pure ASCII) so the
  // match doesn't depend on how this source file itself is saved.
  const map: Record<string, string> = {
    'â†’': '->',   // U+2192 →
    'â€”': '-',    // U+2014 —
    'â€“': '-',    // U+2013 –
    'â€¢': '*',    // U+2022 •
    'â€¦': '...',  // U+2026 …
    'â€™': "'",    // U+2019 ’
    'â€˜': "'",    // U+2018 ‘
  };
  let out = s;
  for (const [bad, good] of Object.entries(map)) out = out.split(bad).join(good);
  return out;
}
for (const std of STANDARDS) {
  std.name             = deMojibake(std.name);
  std.description      = deMojibake(std.description);
  std.whatToLookFor    = deMojibake(std.whatToLookFor);
  std.notApplicableWhen = deMojibake(std.notApplicableWhen);
}

// â”€â”€â”€ File Classification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function classifyFile(filePath: string): string {
  const lower = filePath.toLowerCase();
  const fileName = path.basename(lower);

  if (fileName === 'program.cs') return 'program';
  if (fileName.endsWith('controller.cs')) return 'controller';
  if (fileName.endsWith('service.cs') || fileName.endsWith('handler.cs')) return 'service';
  if (fileName.endsWith('repository.cs')) return 'repository';
  if (lower.includes('/infrastructure/') || lower.includes('\\infrastructure\\')) return 'infrastructure';
  if (lower.includes('/migrations/') || lower.includes('\\migrations\\')) return 'migration';
  if (
    fileName.endsWith('dto.cs') ||
    fileName.endsWith('request.cs') ||
    fileName.endsWith('response.cs') ||
    fileName.endsWith('model.cs')
  ) return 'dto';
  if (fileName.endsWith('.csproj')) return 'csproj';
  return 'general';
}

function standardAppliesToFile(standard: CodeStandard, fileType: string): boolean {
  if (standard.appliesTo === 'all') return true;
  if (standard.appliesTo === 'non-migration') return fileType !== 'migration';
  if (standard.appliesTo === 'program') return fileType === 'program';
  if (standard.appliesTo === 'controller') return fileType === 'controller';
  if (standard.appliesTo === 'service') return fileType === 'service';
  if (standard.appliesTo === 'repository') return fileType === 'repository';
  if (standard.appliesTo === 'infrastructure') return fileType === 'infrastructure';
  if (standard.appliesTo === 'migration') return fileType === 'migration';
  if (standard.appliesTo === 'dto') return fileType === 'dto';
  return true;
}

// â”€â”€â”€ Per-Standard Claude Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface StandardCheckResult {
  rule_id: string;
  rule_name: string;
  severity: 'Critical' | 'Warning' | 'Info';
  // ERROR = the check could not be completed (parse/API/rate-limit). It is NOT a
  // pass — it leaves the (file, standard) cell unverified so the coverage ledger
  // keeps the run PARTIAL until it's retried. Fail-closed: never report PASS on error.
  status: 'PASS' | 'VIOLATION' | 'NOT_APPLICABLE' | 'ERROR';
  checked: string;
  /** How this verdict was produced — drives provenance + confidence. */
  source?: 'llm' | 'cache' | 'deterministic';
  violations: Array<{
    line: number;
    found_code: string;
    explanation: string;
  }>;
}

// Static auditor instructions â€” same for every call, sits before the cached file block
const AUDITOR_INSTRUCTIONS = `You are a strict code auditor performing a deterministic standards compliance check.

YOUR JOB: Read every single line. Every using statement. Every class declaration. Every method
signature. Every attribute. Every property. Every constructor parameter. Do not skim.
You are checking ONE standard only. Ignore everything else.

RESPOND ONLY IN THIS EXACT JSON FORMAT â€” no other text, no markdown, no explanation outside JSON:
{
  "rule_id": "SXX",
  "rule_name": "...",
  "file": "filename",
  "status": "PASS or VIOLATION or NOT_APPLICABLE",
  "checked": "One sentence describing exactly what you looked for in this file",
  "violations": [
    { "line": 47, "found_code": "exact code from file", "explanation": "why this violates the standard" }
  ]
}

RULES:
- PASS â†’ violations = []
- VIOLATION â†’ at least one entry with exact line + found_code from the file
- NOT_APPLICABLE â†’ standard genuinely cannot apply
- If a violation pattern repeats 5 times, report all 5 entries`;

/** PR line scoping: should this violation become a PR comment? True when the
 *  session has no line scoping (a normal review, or the diff was unavailable so
 *  we fall back to whole-file). For a scoped PR review, keep only violations that
 *  land inside a changed line range. */
function violationInPrScope(session: CodeLensSession, relPath: string, line: number): boolean {
  if (!session.changedLineRanges) return true;
  const ranges = session.changedLineRanges.get(relPath.replace(/\\/g, '/'));
  if (!ranges || ranges.length === 0) return false;
  return ranges.some(([s, e]) => line >= s && line <= e);
}

export async function checkFileAgainstStandard(
  filePath: string,
  fileContent: string,
  standard: CodeStandard,
  fileType: string,
): Promise<StandardCheckResult> {

  if (!standardAppliesToFile(standard, fileType)) {
    return {
      rule_id: standard.id,
      rule_name: standard.name,
      severity: standard.severity,
      status: 'NOT_APPLICABLE',
      checked: `Not applicable - ${standard.notApplicableWhen}`,
      source: 'deterministic',
      violations: [],
    };
  }

  // ── Deterministic pre-pass ──────────────────────────────────────────────────
  // Recall-safe: returns a verdict only when certain, else null → fall through to
  // the LLM. In 'on' mode a verdict skips the LLM (the speedup). In 'shadow' mode
  // we keep it for comparison after the LLM runs (validation, no quality risk).
  const det = DETERMINISTIC_MODE !== 'off'
    ? deterministicVerdict(filePath, fileContent, fileType, standard)
    : null;
  if (det && DETERMINISTIC_MODE === 'on') {
    return {
      rule_id: standard.id, rule_name: standard.name, severity: standard.severity,
      status: det.status, checked: det.checked, violations: det.violations,
      source: 'deterministic',
    };
  }

  // ── Content-hash cache lookup ───────────────────────────────────────────────
  // Key = sha256(fileContent + standardId + standardDefHash + checkerVersion).
  // A hit means this exact file was already judged against this exact rule by
  // this exact checker -> reuse it (cross-run, cross-repo). Any change to the
  // file, the rule's wording, or the model produces a different key -> fresh check.
  const cacheKey = createHash('sha256')
    .update(fileContent).update(' ')
    .update(standard.id).update(' ')
    .update(createHash('sha256').update(
      [standard.id, standard.name, standard.severity, standard.description,
       standard.whatToLookFor, standard.appliesTo, standard.notApplicableWhen].join(' '),
    ).digest('hex')).update(' ')
    .update(CHECKER_VERSION)
    .digest('hex');

  try {
    const cached = await getCachedCheck(cacheKey);
    if (cached) {
      return {
        rule_id: standard.id, rule_name: standard.name, severity: standard.severity,
        status: cached.status, checked: cached.checked, violations: cached.violations,
        source: 'cache',
      };
    }
  } catch { /* DB absent/unreachable -> run the live check (cache failure is non-fatal) */ }

  // System prompt: static instructions + file content with cache_control.
  // The file block is cached by Anthropic after the first call â€” standards 2â€“42
  // for the same file read the file from cache and don't count against the
  // uncached-input-token rate limit (100k/min).
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: 'text', text: AUDITOR_INSTRUCTIONS },
    {
      type: 'text',
      text: `FILE PATH: ${filePath}\nFILE TYPE: ${fileType}\nFILE CONTENT (${fileContent.split('\n').length} lines):\n\`\`\`csharp\n${fileContent}\n\`\`\``,
      cache_control: { type: 'ephemeral' },
    },
  ];

  // User message: only the standard being checked â€” small and varies per call
  const userMessage =
    `STANDARD TO CHECK:\nRule ID: ${standard.id}\nRule Name: ${standard.name}\n` +
    `Severity: ${standard.severity}\nDescription: ${standard.description}\n` +
    `What to look for: ${standard.whatToLookFor}\n` +
    `Applies to: ${standard.appliesTo} files\nNot applicable when: ${standard.notApplicableWhen}\n\n` +
    `Check this file against THIS STANDARD ONLY. Report every violation with exact line numbers.`;

  // Retry up to 4 times on 429. The shared rate-limit gate makes the whole fleet
  // back off together (honoring the server's retry-after) instead of each call
  // hammering independently and re-syncing into another burst.
  for (let attempt = 0; attempt < 4; attempt++) {
    await awaitRateLimitClear();
    try {
      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 2000,
        system: systemBlocks,
        messages: [{ role: 'user', content: userMessage }],
      });

      const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}';
      const parsed = extractJsonObject<StandardCheckResult>(text);

      if (parsed) {
        const result = parsed;
        result.severity = standard.severity;
        result.source = 'llm';
        // Shadow validation: compare the deterministic verdict to the LLM's and
        // log disagreements so a checker can be promoted to 'on' only once proven.
        if (det && DETERMINISTIC_MODE === 'shadow' && det.status !== result.status) {
          console.warn(
            `[CodeLens][shadow] ${standard.id} on ${filePath.split('/').pop()}: ` +
            `deterministic=${det.status} (${det.trust}) vs llm=${result.status} — keeping LLM result`,
          );
        }
        // Cache only terminal, non-error verdicts (fire-and-forget).
        if (result.status === 'PASS' || result.status === 'VIOLATION' || result.status === 'NOT_APPLICABLE') {
          putCachedCheck({
            cacheKey, standardId: standard.id, status: result.status,
            checked: result.checked ?? '', violations: result.violations ?? [],
            checkerVersion: CHECKER_VERSION,
          }).catch(() => {});
        }
        return result;
      } else {
        console.error(`[CodeLens] Parse error for ${standard.id} on ${filePath}:`, text.slice(0, 200));
        return {
          rule_id: standard.id, rule_name: standard.name, severity: standard.severity,
          status: 'ERROR', checked: 'Parse error — check did not complete', violations: [],
        };
      }
    } catch (err: any) {
      const is429 =
        err?.status === 429 ||
        String(err?.message ?? '').includes('429') ||
        String(err?.message ?? '').includes('RateLimitReached');

      if (is429 && attempt < 3) {
        // Honor the server's retry-after; fall back to a gentle escalation.
        const waitMs = retryAfterMs(err) || 15_000 * (attempt + 1); // 15s, 30s, 45s
        // Push the SHARED window out — every other in-flight/queued call will gate
        // on this before its next attempt, so the fleet pauses as one.
        rateLimitedUntil = Math.max(rateLimitedUntil, Date.now() + waitMs);
        // One throttled log line (not one per call) so the console isn't flooded.
        if (Date.now() - lastRateLogAt > 5000) {
          lastRateLogAt = Date.now();
          console.warn(
            `[CodeLens] Rate limited by Anthropic — pausing all checks ~${Math.round((rateLimitedUntil - Date.now()) / 1000)}s. ` +
            `Lower CODELENS_FANOUT_CONCURRENCY / CODELENS_WARMUP_CONCURRENCY, or raise your API tier.`,
          );
        }
        continue; // next iteration calls awaitRateLimitClear()
      }

      console.error(`[CodeLens] Claude API error for ${standard.id} on ${filePath}:`, err?.message);
      return {
        rule_id: standard.id, rule_name: standard.name, severity: standard.severity,
        status: 'ERROR', checked: `API error — check did not complete: ${String(err?.message ?? '').slice(0, 120)}`, violations: [],
      };
    }
  }

  return {
    rule_id: standard.id, rule_name: standard.name, severity: standard.severity,
    status: 'ERROR', checked: 'Max retries exceeded — check did not complete', violations: [],
  };
}

/**
 * Re-anchor a violation's line number to the line that actually contains its
 * `found_code`. LLM line numbers drift by ±1 (often onto the doc-comment above a
 * member); the found_code snippet is reliable, so we locate it in the file and
 * use that line. Falls back to the model's number if no confident match.
 */
function snapLineToCode(fileContent: string, reportedLine: number, foundCode: string): number {
  const snippet = (foundCode || '').trim().split('\n')[0].trim();
  if (snippet.length < 4) return reportedLine; // too short to match reliably
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  const target = norm(snippet);
  const lines = fileContent.split('\n');
  const candidates: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const ln = norm(lines[i]);
    if (!ln) continue;
    // Match either direction: the file line contains the snippet, or (when the
    // model returned a longer snippet) the snippet contains the file line.
    if (ln.includes(target) || (target.length > 12 && ln.length > 8 && target.includes(ln))) {
      candidates.push(i + 1); // 1-based
    }
  }
  if (candidates.length === 0) return reportedLine;
  if (candidates.length === 1) return candidates[0];
  // Duplicate snippet in the file → pick the match closest to the model's guess.
  return candidates.reduce((best, c) =>
    Math.abs(c - reportedLine) < Math.abs(best - reportedLine) ? c : best, candidates[0]);
}

// â”€â”€â”€ Per-File Review â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function reviewFile(
  session: CodeLensSession,
  file: FileEntry,
  fileContent: string,
  currentIndex: number,
): Promise<void> {
  const fileType = classifyFile(file.relativePath);
  const cleanUrl = stripGitCredentials(session.repoUrl);
  const active = effectiveStandards(session);
  const applicableStandards = active.filter(s => standardAppliesToFile(s, fileType));
  const notApplicableStandards = active.filter(s => !standardAppliesToFile(s, fileType));

  emit(session, {
    event: 'file_started',
    file_id: file.fileId,
    path: file.relativePath,
    progress: { current: currentIndex, total: session.totalFiles },
  });

  // Emit NOT_APPLICABLE immediately â€” no Claude call needed.
  // Each NA cell is a terminal verdict and counts toward coverage.
  for (const standard of notApplicableStandards) {
    emit(session, {
      event: 'standard_checked',
      file_id: file.fileId,
      rule_id: standard.id,
      rule_name: standard.name,
      severity: standard.severity,
      status: 'NOT_APPLICABLE',
      checked: standard.notApplicableWhen,
      violations: [],
    });
    session.coverageVerified++;
  }

  // QUALITY-PRESERVING SPEEDUP: still exactly one standard per Claude call, but
  // instead of a sequential chain we WARM the prompt cache with the first call,
  // then FAN OUT the rest in parallel (they hit the cache). Per-file wall-clock
  // drops from N calls to ~2. Results stream to the UI as each call resolves.
  let fileCritical = 0;
  let fileWarning = 0;
  let fileInfo = 0;
  let filePassed = 0;
  let fileErrors = 0;
  let fileVerified = 0; // applicable cells with a non-error verdict (for confidence)

  // Process one completed standard result: emit + accumulate. Safe to call from
  // parallel promise resolutions (Node is single-threaded, so ++ won't race).
  const handleResult = (result: StandardCheckResult) => {
    // Fail-closed: an ERROR cell is NOT verified. Record it for the coverage
    // ledger (keeps the run PARTIAL) and surface it so the user can retry.
    if (result.status === 'ERROR') {
      fileErrors++;
      session.coverageErrors.set(`${file.fileId}::${result.rule_id}`, {
        fileId: file.fileId,
        filePath: file.relativePath,
        ruleId: result.rule_id,
        ruleName: result.rule_name,
      });
      emit(session, {
        event: 'standard_checked',
        file_id: file.fileId,
        rule_id: result.rule_id,
        rule_name: result.rule_name,
        severity: result.severity,
        status: 'ERROR',
        checked: result.checked,
        violations: [],
      });
      session.standardResults.push({
        fileId: file.fileId, ruleId: result.rule_id, status: 'ERROR', violationCount: 0,
      });
      return;
    }

    // Any non-error terminal verdict counts toward coverage + per-file confidence.
    session.coverageVerified++;
    fileVerified++;

    emit(session, {
      event: 'standard_checked',
      file_id: file.fileId,
      rule_id: result.rule_id,
      rule_name: result.rule_name,
      severity: result.severity,
      status: result.status,
      checked: result.checked,
      violations: result.violations,
    });

    // Store for Sheet 3 aggregation
    session.standardResults.push({
      fileId: file.fileId,
      ruleId: result.rule_id,
      status: result.status,
      violationCount: result.violations.length,
    });

    if (result.status === 'VIOLATION') {
      for (const v of result.violations) {
        // Snap the line to where found_code actually is (fixes off-by-one
        // highlights landing on the doc-comment above the member).
        const line = snapLineToCode(fileContent, v.line, v.found_code);
        // PR review: only surface violations on the lines the PR actually changed
        // (drops pre-existing issues the PR didn't touch). No-op for normal reviews.
        if (!violationInPrScope(session, file.relativePath, line)) continue;
        // Sticky suppression: was this exact finding accepted/ignored before?
        const suppressed = session.suppressions.has(
          suppressionKey(session.userId, cleanUrl, file.relativePath, result.rule_id, v.found_code),
        );
        const violationId = `V-${file.fileId}-${result.rule_id}-${line}`;
        const record: ViolationRecord = {
          violationId,
          fileId: file.fileId,
          ruleId: result.rule_id,
          ruleName: result.rule_name,
          severity: result.severity,
          lineStart: line,
          lineEnd: line,
          foundCode: v.found_code,
          recommendedFix: v.explanation,
          fixAvailable: true,
          status: suppressed ? 'ignored' : 'open',
        };
        session.violations.set(violationId, record);

        emit(session, {
          event: 'violation_found',
          violation_id: violationId,
          file_id: file.fileId,
          rule_id: result.rule_id,
          rule_name: result.rule_name,
          severity: result.severity,
          line_start: line,
          line_end: line,
          found_code: v.found_code,
          recommended_fix: v.explanation,
          fix_available: true,
          status: suppressed ? 'IGNORED' : 'OPEN',
        });

        // Suppressed findings don't count against compliance (accepted exceptions).
        if (suppressed) continue;
        if (result.severity === 'Critical') fileCritical++;
        else if (result.severity === 'Warning') fileWarning++;
        else fileInfo++;
      }
    } else if (result.status === 'PASS') {
      filePassed++;
      emit(session, {
        event: 'rule_pass',
        file_id: file.fileId,
        rule_id: result.rule_id,
        rule_name: result.rule_name,
      });
    }
  };

  if (applicableStandards.length > 0 && session.status !== ('stopped' as string)) {
    const [firstStd, ...restStds] = applicableStandards;

    // 1) Warm the cache with the first standard (the one uncached file read).
    const firstResult = await warmupLimiter(session.userId, () =>
      checkFileAgainstStandard(file.relativePath, fileContent, firstStd, fileType));
    handleResult(firstResult);

    // 2) Fan out the remaining standards in parallel — all hit the warm cache.
    await Promise.all(restStds.map(std =>
      fanoutLimiter(session.userId, () =>
        checkFileAgainstStandard(file.relativePath, fileContent, std, fileType),
      ).then(handleResult),
    ));
  }

  const summary = {
    critical: fileCritical,
    warning: fileWarning,
    info: fileInfo,
    passed: filePassed,
    notApplicable: notApplicableStandards.length,
    errors: fileErrors,
    applicableCells: applicableStandards.length,
    verifiedCells: fileVerified,
    status: (fileCritical + fileWarning + fileInfo > 0 ? 'FAIL' : 'PASS') as 'FAIL' | 'PASS',
  };
  session.fileSummaries.set(file.fileId, summary);

  emit(session, {
    event: 'file_complete',
    file_id: file.fileId,
    path: file.relativePath,
    summary,
  });

  // DB persistence â€” fire-and-forget so we don't block the review loop
  if (session.runId) {
    const runId = session.runId;
    (async () => {
      try {
        const fileResultId = await saveFileResult({
          runId,
          filePath: file.relativePath,
          fileType,
          standardsChecked: effectiveStandards(session).length,
          critical: summary.critical,
          warning: summary.warning,
          info: summary.info,
          pass: summary.passed,
          na: summary.notApplicable,
          applicableCells: summary.applicableCells,
          verifiedCells: summary.verifiedCells,
        });
        session.fileResultIds.set(file.fileId, fileResultId);

        const fileViolations = Array.from(session.violations.values())
          .filter(v => v.fileId === file.fileId);
        for (const v of fileViolations) {
          await saveViolation({
            runId,
            fileResultId,
            violationId: v.violationId,
            filePath: file.relativePath,
            standardId: v.ruleId,
            standardName: v.ruleName,
            severity: v.severity,
            lineStart: v.lineStart,
            lineEnd: v.lineEnd,
            foundCode: v.foundCode,
            explanation: v.recommendedFix,
          });
        }

        const fileStdResults = session.standardResults
          .filter(sr => sr.fileId === file.fileId);
        for (const sr of fileStdResults) {
          const standard = effectiveStandards(session).find(s => s.id === sr.ruleId);
          await saveStandardResult({
            runId,
            fileResultId,
            filePath: file.relativePath,
            standardId: sr.ruleId,
            standardName: standard?.name ?? sr.ruleId,
            severity: standard?.severity ?? 'Warning',
            status: sr.status,
            checked: sr.violationCount > 0 ? `${sr.violationCount} violation(s) found` : 'Pass',
          });
        }
      } catch (dbErr: any) {
        console.warn(`[CodeLens] DB save failed for ${file.relativePath}:`, dbErr?.message);
      }
    })();
  }
}

// â”€â”€â”€ Entry point â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Build the repo-wide architecture graph, emit it (so the UI shows the
 *  Controller→Service→Repository→DB view up front), and return it for ordering.
 *  Best-effort — any failure falls back to a flat, unordered review. */
function buildAndEmitArchitectureGraph(session: CodeLensSession): ArchitectureGraph | null {
  try {
    const graph = buildArchitectureGraph(
      session.files.map(f => ({ relativePath: f.relativePath, absolutePath: f.absolutePath })),
      (p) => { try { return fs.readFileSync(p, 'utf-8'); } catch { return null; } },
    );
    emit(session, { event: 'architecture_graph', graph });
    return graph;
  } catch (err: any) {
    console.warn('[CodeLens] architecture graph failed (non-fatal):', err?.message);
    return null;
  }
}

/** Reorder session.files into per-controller flow order (Controller → Service →
 *  Repository → DB), recording contiguous flow ranges so the review walks one
 *  controller's chain fully before the next. Falls back to original order on any
 *  mismatch. */
function planAndReorderByFlows(session: CodeLensSession, graph: ArchitectureGraph): void {
  try {
    const plan = planReviewOrder(graph, session.files.map(f => f.relativePath));
    if (plan.flows.length === 0) { session.reviewFlows = []; return; }
    const byPath = new Map(session.files.map(f => [f.relativePath, f]));
    const ordered: FileEntry[] = [];
    const flows: { label: string; start: number; end: number }[] = [];
    for (const flow of plan.flows) {
      const start = ordered.length;
      for (const rel of flow.files) { const fe = byPath.get(rel); if (fe) ordered.push(fe); }
      if (ordered.length > start) flows.push({ label: flow.label, start, end: ordered.length });
    }
    const orphStart = ordered.length;
    for (const rel of plan.orphans) { const fe = byPath.get(rel); if (fe) ordered.push(fe); }
    if (ordered.length > orphStart) flows.push({ label: 'Other files', start: orphStart, end: ordered.length });
    if (ordered.length === session.files.length) {
      session.files = ordered;
      session.reviewFlows = flows;
      console.log(`[CodeLens] Review ordered into ${flows.length} controller flow(s)`);
    } else {
      session.reviewFlows = []; // safety: never drop files — fall back to flat
    }
  } catch (err: any) {
    console.warn('[CodeLens] flow planning failed (non-fatal, flat review):', err?.message);
    session.reviewFlows = [];
  }
}

/** Read a file (truncating very large files) and review it against all standards. */
function reviewOneFile(session: CodeLensSession, file: FileEntry, indexForProgress: number): Promise<void> {
  let content: string;
  try {
    const raw = fs.readFileSync(file.absolutePath);
    content = raw.length > MAX_FILE_BYTES
      ? raw.slice(0, MAX_FILE_BYTES).toString('utf-8') + '\n// [file truncated — exceeds 150 KB]'
      : raw.toString('utf-8');
  } catch { content = ''; }
  // Accumulate lines-of-code for defect-density scoring.
  if (content) session.linesReviewed = (session.linesReviewed ?? 0) + content.split('\n').length;
  return reviewFile(session, file, content, indexForProgress);
}

/** Review one controller flow fully before starting the next (graph-ordered).
 *  Honors stop + resume (startIndex). Falls back to a flat review when there are
 *  no flows (no controllers detected, or planning failed). */
async function reviewByFlows(session: CodeLensSession, limit: number, startIndex: number): Promise<void> {
  const flows = session.reviewFlows;
  if (!flows || flows.length === 0) return reviewFilesWithConcurrency(session, limit, startIndex);
  const files = session.files;
  for (let fi = 0; fi < flows.length; fi++) {
    const flow = flows[fi];
    if (flow.end <= startIndex) continue; // whole flow already reviewed (resume)
    if ((session.status as string) === 'stopped') {
      emit(session, { event: 'review_stopped', session_id: session.sessionId, files_reviewed: startIndex, files_remaining: files.length - startIndex });
      return;
    }
    emit(session, { event: 'review_status', message: `Flow ${fi + 1}/${flows.length}: ${flow.label}` });
    for (let i = Math.max(flow.start, startIndex); i < flow.end; i += limit) {
      if ((session.status as string) === 'stopped') {
        emit(session, { event: 'review_stopped', session_id: session.sessionId, files_reviewed: i, files_remaining: files.length - i });
        return;
      }
      const batch = files.slice(i, Math.min(i + limit, flow.end));
      await Promise.all(batch.map((file, j) => reviewOneFile(session, file, i + j + 1)));
      session.lastReviewedFileIndex = Math.min(i + limit, flow.end);
    }
  }
}

export interface ParsedStandard {
  name: string;
  severity: 'Critical' | 'Warning' | 'Info';
  appliesTo: string;
  description: string;
  whatToLookFor: string;
  notApplicableWhen: string;
}

const IMPORT_SCOPES = new Set(['all', 'controller', 'service', 'repository', 'dto', 'migration', 'program', 'infrastructure', 'non-migration']);

/** Parse a coding-standards document (markdown, plain text, JSON, CSV, pasted
 *  text, etc.) into discrete, structured, checkable rules using Claude. */
export async function parseStandardsDocument(content: string): Promise<ParsedStandard[]> {
  const trimmed = (content ?? '').trim();
  if (!trimmed) return [];
  const doc = trimmed.length > 60_000 ? trimmed.slice(0, 60_000) : trimmed;

  const system = `You convert a coding-standards document into a JSON array of discrete, checkable rules.
Return ONLY JSON in this shape: {"standards":[{"name","severity","appliesTo","description","whatToLookFor","notApplicableWhen"}]}
- name: short rule title (max 80 chars).
- severity: one of "Critical","Warning","Info" (infer from wording; default "Warning").
- appliesTo: one of all, controller, service, repository, dto, migration, program, infrastructure, non-migration (default "all").
- description: one sentence on the rule's intent.
- whatToLookFor: concrete, code-level signals a reviewer checks for.
- notApplicableWhen: when the rule does not apply (may be empty string).
Split compound rules into separate entries. Only extract rules that are actually present in the document; do not invent any.`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system,
    messages: [{ role: 'user', content: `Extract the coding standards from this document:\n\n${doc}` }],
  });
  const text = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const parsed = extractJsonObject<{ standards?: any[] }>(text);
  const list = Array.isArray(parsed?.standards) ? parsed!.standards
    : Array.isArray(parsed) ? (parsed as any[]) : [];

  const out: ParsedStandard[] = [];
  for (const r of list) {
    const name = String(r?.name ?? '').trim();
    if (!name) continue;
    const sev = String(r?.severity ?? '').toLowerCase();
    const severity: ParsedStandard['severity'] =
      sev.startsWith('crit') ? 'Critical' : sev.startsWith('info') ? 'Info' : 'Warning';
    const scope = String(r?.appliesTo ?? '').toLowerCase().trim();
    out.push({
      name: name.slice(0, 120),
      severity,
      appliesTo: IMPORT_SCOPES.has(scope) ? scope : 'all',
      description: String(r?.description ?? name).trim(),
      whatToLookFor: String(r?.whatToLookFor ?? r?.description ?? name).trim(),
      notApplicableWhen: String(r?.notApplicableWhen ?? '').trim(),
    });
  }
  return out;
}

export async function runReview(session: CodeLensSession): Promise<void> {
  try {
    // Phase 1: clone once (or fetch latest if already cached)
    session.status = 'cloning';
    emit(session, { event: 'review_status', message: 'Cloning repositoryâ€¦' });

    const { localPath, commitHash } = await ensureRepoReady(
      session.repoUrl,
      session.branch,
      session.repoUrl, // repoUrl already has PAT embedded by the route
      session.userId,  // per-user clone dir (isolates concurrent same-repo reviews)
    );
    session.localPath  = localPath;
    session.commitHash = commitHash;

    // PR review: compute the changed line ranges (diff vs the target branch) so
    // only violations on changed lines become comments. An empty result keeps
    // whole-file behavior — we never silently drop every comment.
    if (session.prContext) {
      try {
        const lr = await getChangedLineRanges(localPath, session.prContext.targetBranch, session.repoUrl);
        if (lr.size > 0) {
          session.changedLineRanges = lr;
          let total = 0;
          for (const v of Array.from(lr.values())) total += v.length;
          console.log(`[CodeLens] PR diff scope: ${lr.size} file(s), ${total} changed hunk range(s)`);
        } else {
          console.warn('[CodeLens] PR diff produced no line ranges — using whole-file comments');
        }
      } catch (e: any) {
        console.warn('[CodeLens] Could not compute PR diff line ranges (whole-file fallback):', e?.message);
      }
    }

    // Phase 2: discover files via git ls-files (only tracked files)
    emit(session, { event: 'review_status', message: 'Discovering filesâ€¦' });
    const trackedRelPaths = await listTrackedFiles(localPath);
    console.log(`[CodeLens] listTrackedFiles â†’ ${trackedRelPaths.length} files in ${localPath}`);
    if (trackedRelPaths.length > 0) {
      console.log(`[CodeLens] Sample paths: ${trackedRelPaths.slice(0, 5).join(', ')}`);
    }
    console.log(`[CodeLens] session.folders = ${JSON.stringify(session.folders)}`);

    // Folder filter (user-selected folders from Setup Step 2)
    const folderFiltered = session.folders.length > 0
      ? trackedRelPaths.filter(rel =>
          session.folders.some(folder => rel.startsWith(folder.replace(/\\/g, '/') + '/') || rel === folder)
        )
      : trackedRelPaths;
    console.log(`[CodeLens] After folder filter: ${folderFiltered.length} files`);
    emit(session, { event: 'review_status', message: `Found ${trackedRelPaths.length} tracked â€¢ ${folderFiltered.length} in scopeâ€¦` });

    // shouldIgnoreFile filter (test files, generated, user patterns, etc.)
    const userIgnorePatterns = session.ignorePatterns ?? [];
    let relPathsToScan = folderFiltered.filter(rel => !shouldIgnoreFile(rel, userIgnorePatterns));
    const ignoredRels    = folderFiltered.filter(rel =>  shouldIgnoreFile(rel, userIgnorePatterns));
    console.log(`[CodeLens] After ignore filter: ${relPathsToScan.length} to scan, ${ignoredRels.length} ignored`);

    // PR review mode: restrict the scan to the PR's changed files (exact,
    // slash-normalized path match). Anything the ignore/folder filters already
    // dropped stays dropped, so PR reviews still skip tests/generated files.
    if (session.changedFilesFilter && session.changedFilesFilter.length > 0) {
      const changed = new Set(session.changedFilesFilter.map(p => p.replace(/\\/g, '/')));
      const before = relPathsToScan.length;
      relPathsToScan = relPathsToScan.filter(rel => changed.has(rel.replace(/\\/g, '/')));
      console.log(`[CodeLens] PR scope: ${relPathsToScan.length} of ${changed.size} changed file(s) in scope (from ${before} scannable)`);
      emit(session, {
        event: 'review_status',
        message: `PR scope: reviewing ${relPathsToScan.length} of ${changed.size} changed file(s)…`,
      });
    }

    // Discovery breakdown for the UI banner
    const testPatterns      = ['**/*.Tests/**', '**/Tests/**', '**/UnitTests/**', '**/IntegrationTests/**', '**/E2ETests/**'];
    const buildPatterns     = ['**/bin/**', '**/obj/**', '**/.vs/**', '**/publish/**'];
    const generatedPatterns = ['**/*.Designer.cs', '**/*.generated.cs', '**/*.g.cs', '**/*.g.i.cs'];

    emit(session, {
      event: 'files_discovered',
      session_id: session.sessionId,
      total_found: folderFiltered.length,
      scanning: relPathsToScan.length,
      ignored: ignoredRels.length,
      ignored_breakdown: {
        test_files:   countMatchingFiles(ignoredRels.map(r => path.join(localPath, r)), localPath, testPatterns),
        build_output: countMatchingFiles(ignoredRels.map(r => path.join(localPath, r)), localPath, buildPatterns),
        generated:    countMatchingFiles(ignoredRels.map(r => path.join(localPath, r)), localPath, generatedPatterns),
        user_ignored: userIgnorePatterns.length > 0
          ? countMatchingFiles(ignoredRels.map(r => path.join(localPath, r)), localPath, userIgnorePatterns)
          : 0,
      },
    });

    session.files = relPathsToScan.map((rel, i) => ({
      fileId:       `F${String(i + 1).padStart(3, '0')}`,
      relativePath: rel,
      absolutePath: path.join(localPath, rel),
    }));
    session.totalFiles          = session.files.length;
    session.lastReviewedFileIndex = 0;
    session.status              = 'running';

    // Active standards = (built-in 42 minus this user's disabled ones) + enabled
    // custom standards. Per-user: two users can review the same repo with
    // entirely different standard sets.
    try {
      const [custom, disabledBuiltins] = await Promise.all([
        getEnabledCustomStandards(session.userId),
        getDisabledBuiltinIds(session.userId).catch(() => [] as string[]),
      ]);
      const disabled = new Set(disabledBuiltins);
      const builtins = STANDARDS.filter(s => !disabled.has(s.id));
      session.activeStandards = [
        ...builtins,
        ...custom.map(c => ({
          id: c.id, name: c.name, severity: c.severity, description: c.description,
          whatToLookFor: c.whatToLookFor, appliesTo: c.appliesTo as CodeStandard['appliesTo'],
          notApplicableWhen: c.notApplicableWhen, custom: true,
        })),
      ];
      console.log(`[CodeLens] Standards for ${session.userId}: ${builtins.length}/${STANDARDS.length} built-in + ${custom.length} custom → ${session.activeStandards.length} total`);
    } catch (e: any) {
      session.activeStandards = [...STANDARDS];
      console.warn('[CodeLens] Could not load standards prefs (using built-ins):', e?.message);
    }

    // Coverage ledger contract: every file must produce a terminal verdict for
    // ALL standards (applicable → checked, others → NOT_APPLICABLE).
    session.coverageExpected = session.files.length * effectiveStandards(session).length;
    session.coverageVerified = 0;
    session.coverageErrors.clear();

    // Load sticky suppressions so previously-accepted findings don't re-surface.
    try {
      const keys = await getSuppressionKeys(stripGitCredentials(session.repoUrl), session.userId);
      session.suppressions = new Set(keys);
      if (keys.length) console.log(`[CodeLens] Loaded ${keys.length} suppression(s) for this repo`);
    } catch (e: any) {
      console.warn('[CodeLens] Could not load suppressions (non-fatal):', e?.message);
    }

    // Phase 2b: persist run record in DB (fire once, await the ID before proceeding)
    try {
      const runId = await createRun({
        sessionId:      session.sessionId,
        userId:         session.userId,
        // Store the credential-free URL so the PAT never lands in the DB and
        // resume lookups remain stable across token rotation.
        repoUrl:        stripGitCredentials(session.repoUrl),
        branch:         session.branch,
        commitHash,
        foldersScanned: session.folders,
        ignorePatterns: userIgnorePatterns,
      });
      session.runId = runId;
    } catch (dbErr: any) {
      console.warn('[CodeLens] DB createRun failed (non-fatal):', dbErr?.message);
    }

    emit(session, { event: 'review_status', message: '' }); // clear the status banner

    const active = effectiveStandards(session);
    const customCount = active.length - STANDARDS.length;
    emit(session, {
      event: 'review_started',
      session_id: session.sessionId,
      total_files: session.totalFiles,
      total_rules: active.length,
      standards_source: `ASTRA Coding Standards — ${STANDARDS.length} built-in` +
        (customCount > 0 ? ` + ${customCount} custom` : ''),
    });

    emit(session, {
      event: 'standards_parsed',
      rules: active.map(s => ({ rule_id: s.id, name: s.name, severity: s.severity })),
      total_rules: active.length,
    });

    // Phase 2c: understand the repo FIRST — build the architecture graph and emit
    // it so the UI shows the Controller→Service→Repository→DB view before review,
    // then order the file queue by it (one controller flow at a time).
    const archGraph = buildAndEmitArchitectureGraph(session);
    if (archGraph) planAndReorderByFlows(session, archGraph);

    // Phase 3: review files — one controller flow at a time when a graph exists.
    await reviewByFlows(session, FILE_CONCURRENCY, 0);

    // Finalize either way. A stopped run is persisted to the DB (so it survives
    // in history and stays exportable) but emits NO review_complete — the user
    // keeps the Resume option and can open the report on demand. Cast RHS to
    // string to prevent TS5.6 property-narrowing false positive.
    if (session.status === ('stopped' as string)) {
      await finalizeRun(session, 'STOPPED');
    } else {
      await emitReviewComplete(session);
    }
  } catch (err: any) {
    session.status = 'error';
    if (session.runId) {
      completeRun({ runId: session.runId, status: 'ERROR', totalFiles: session.totalFiles,
        scannedFiles: session.fileSummaries.size, ignoredFiles: 0,
        critical: 0, warning: 0, info: 0, pass: 0, compliancePct: 0 }).catch(() => {});
    }
    emit(session, { event: 'error', message: err?.message ?? 'Unknown error during review' });
  }
}

/** Resume a stopped review from lastReviewedFileIndex. */
export async function resumeReview(session: CodeLensSession): Promise<void> {
  if (session.status !== 'stopped') return;
  const startFrom = session.lastReviewedFileIndex;
  session.status = 'running';

  emit(session, {
    event: 'review_resumed',
    session_id: session.sessionId,
    resuming_from_file: session.files[startFrom]?.relativePath ?? '',
  });

  try {
    await reviewByFlows(session, FILE_CONCURRENCY, startFrom);
    if (session.status === ('stopped' as string)) {
      await finalizeRun(session, 'STOPPED');
    } else {
      await emitReviewComplete(session);
    }
  } catch (err: any) {
    session.status = 'error';
    emit(session, { event: 'error', message: err?.message ?? 'Error during resume' });
  }
}

/**
 * Resume FIXING (not reviewing) from a prior run's persisted open violations.
 * Loads the latest resumable run for this repo+branch from the DB, clones the
 * repo, checks out the existing fix branch (so prior fixes are already applied),
 * and rehydrates the session with only the OPEN violations so the user can keep
 * fixing where they left off — without re-running the full 42-standard review.
 */
export async function resumeFixing(session: CodeLensSession): Promise<void> {
  try {
    session.status = 'cloning';
    emit(session, { event: 'review_status', message: 'Loading previous review…' });

    // Load active standards (built-in minus this user's disabled + custom) so
    // fixing a custom-standard violation can resolve its definition.
    try {
      const [custom, disabledBuiltins] = await Promise.all([
        getEnabledCustomStandards(session.userId),
        getDisabledBuiltinIds(session.userId).catch(() => [] as string[]),
      ]);
      const disabled = new Set(disabledBuiltins);
      session.activeStandards = [
        ...STANDARDS.filter(s => !disabled.has(s.id)),
        ...custom.map(c => ({
          id: c.id, name: c.name, severity: c.severity, description: c.description,
          whatToLookFor: c.whatToLookFor, appliesTo: c.appliesTo as CodeStandard['appliesTo'],
          notApplicableWhen: c.notApplicableWhen, custom: true,
        })),
      ];
    } catch { session.activeStandards = [...STANDARDS]; }

    // 1. Find the latest run with open violations (keyed on credential-free URL)
    const cleanUrl = stripGitCredentials(session.repoUrl);
    const resumable = await getLatestResumableRun(cleanUrl, session.branch, session.userId);
    if (!resumable || resumable.openViolations.length === 0) {
      session.status = 'complete';
      emit(session, { event: 'review_status', message: '' });
      emit(session, { event: 'error', message: 'No previous review with open violations found for this repo/branch. Run a full review first.' });
      return;
    }

    // 2. Clone/refresh the repo, then check out the existing fix branch
    emit(session, { event: 'review_status', message: 'Cloning repository…' });
    const { localPath, commitHash } = await ensureRepoReady(
      session.repoUrl, session.branch, session.repoUrl, session.userId,
    );
    session.localPath  = localPath;
    session.commitHash = commitHash;
    session.runId      = resumable.run.runId;

    // Checking out the fix branch brings forward every fix already committed
    session.fixBranch = await ensureFixBranch(localPath, session.branch, session.userId);

    // 3. Rehydrate session.files + session.violations from the open violations
    emit(session, { event: 'review_status', message: 'Restoring open violations…' });

    const pathToFileId = new Map<string, string>();
    let fileCounter = 0;
    const ensureFile = (relPath: string): string => {
      let id = pathToFileId.get(relPath);
      if (!id) {
        id = `F${String(++fileCounter).padStart(3, '0')}`;
        pathToFileId.set(relPath, id);
        session.files.push({
          fileId: id,
          relativePath: relPath,
          absolutePath: path.join(localPath, relPath),
        });
      }
      return id;
    };

    for (const v of resumable.openViolations) {
      const fileId = ensureFile(v.filePath);
      const severity = (v.severity as ViolationRecord['severity']) ?? 'Warning';
      const record: ViolationRecord = {
        violationId: v.violationId,
        fileId,
        ruleId: v.standardId,
        ruleName: v.standardName,
        severity,
        lineStart: v.lineStart ?? 0,
        lineEnd: v.lineEnd ?? v.lineStart ?? 0,
        foundCode: v.foundCode ?? '',
        recommendedFix: v.explanation ?? '',
        fixAvailable: true,
        status: 'open',
      };
      session.violations.set(v.violationId, record);
    }

    session.totalFiles = session.files.length;
    session.status = 'complete'; // no active review — user fixes the restored list

    emit(session, { event: 'review_status', message: '' });

    // 4. Replay to the UI: review_started, then per file emit file_started →
    //    its violation_found events → file_complete, so the file tree, code
    //    viewer, and violation panels all populate exactly as in a live review.
    emit(session, {
      event: 'review_started',
      session_id: session.sessionId,
      total_files: session.totalFiles,
      total_rules: effectiveStandards(session).length,
      standards_source: `Resumed — ${resumable.openViolations.length} open violation(s) from previous review`,
    });

    // Group restored violations by file
    const byFile = new Map<string, ViolationRecord[]>();
    for (const v of Array.from(session.violations.values())) {
      if (!byFile.has(v.fileId)) byFile.set(v.fileId, []);
      byFile.get(v.fileId)!.push(v);
    }

    let idx = 0;
    for (const file of session.files) {
      const fileViolations = byFile.get(file.fileId) ?? [];
      emit(session, {
        event: 'file_started',
        file_id: file.fileId,
        path: file.relativePath,
        progress: { current: ++idx, total: session.totalFiles },
      });

      let critical = 0, warning = 0, info = 0;
      for (const v of fileViolations) {
        emit(session, {
          event: 'violation_found',
          violation_id: v.violationId,
          file_id: v.fileId,
          rule_id: v.ruleId,
          rule_name: v.ruleName,
          severity: v.severity,
          line_start: v.lineStart,
          line_end: v.lineEnd,
          found_code: v.foundCode,
          recommended_fix: v.recommendedFix,
          fix_available: true,
          status: 'OPEN',
        });
        if (v.severity === 'Critical') critical++;
        else if (v.severity === 'Warning') warning++;
        else info++;
      }

      const summary: FileSummary = {
        critical, warning, info, passed: 0, notApplicable: 0, errors: 0,
        applicableCells: 0, verifiedCells: 0,
        status: (critical + warning + info > 0 ? 'FAIL' : 'PASS'),
      };
      session.fileSummaries.set(file.fileId, summary);
      emit(session, {
        event: 'file_complete',
        file_id: file.fileId,
        path: file.relativePath,
        summary,
      });
    }

    emit(session, { event: 'review_resumed', session_id: session.sessionId, resuming_from_file: '' });
  } catch (err: any) {
    session.status = 'error';
    emit(session, { event: 'error', message: err?.message ?? 'Error during resume-fixing' });
  }
}

/**
 * Persist the run's final status + aggregate counts to the DB. Used both when a
 * review completes AND when it is stopped — so a stopped run survives in history
 * and stays exportable. Does NOT emit any SSE event (stop keeps the Resume
 * option, so we must not force the client to the report screen).
 */
async function finalizeRun(
  session: CodeLensSession,
  finalStatus: 'COMPLETE' | 'STOPPED',
): Promise<{
  runStatus: 'COMPLETE' | 'PARTIAL' | 'STOPPED';
  total: number; violations: number; critical: number; warning: number;
  info: number; filesPassing: number; filesFailing: number; compliancePct: number;
  qualityScore: number; grade: string; defectDensity: number; linesReviewed: number;
  expectedCells: number; verifiedCells: number; errorCells: number;
  confidencePct: number; applicableCells: number; verifiedApplicableCells: number;
}> {
  const allViolations = Array.from(session.violations.values());
  const critical = allViolations.filter(v => v.severity === 'Critical').length;
  const warning  = allViolations.filter(v => v.severity === 'Warning').length;
  const info     = allViolations.filter(v => v.severity === 'Info').length;

  // For a stopped run, base totals on files actually reviewed (not the repo
  // total) so compliance % isn't misleadingly low.
  const reviewedCount = session.fileSummaries.size;
  const denominator = finalStatus === 'STOPPED' ? reviewedCount : session.totalFiles;
  const filesFailing = Array.from(session.fileSummaries.values()).filter(s => s.status === 'FAIL').length;
  const filesPassing = denominator - filesFailing;
  const compliancePct = denominator > 0 ? Math.round((filesPassing / denominator) * 100) : 100;

  // Coverage ledger: a run is COMPLETE only if it finished all files AND every
  // applicable cell was verified (hard fail-closed). Any error cell ⇒ PARTIAL.
  const errorCells = session.coverageErrors.size;
  const expectedCells = finalStatus === 'STOPPED'
    ? reviewedCount * effectiveStandards(session).length
    : session.coverageExpected;
  const runStatus: 'COMPLETE' | 'PARTIAL' | 'STOPPED' =
    finalStatus === 'STOPPED' ? 'STOPPED'
    : (errorCells > 0 || session.coverageVerified < expectedCells) ? 'PARTIAL'
    : 'COMPLETE';

  // Overall review confidence = verified applicable checks ÷ applicable checks,
  // across reviewed files. Objective coverage ratio — NOT a defect-free guarantee.
  let applicableCells = 0;
  let verifiedApplicableCells = 0;
  for (const s of Array.from(session.fileSummaries.values())) {
    applicableCells += s.applicableCells;
    verifiedApplicableCells += s.verifiedCells;
  }
  const confidencePct = applicableCells > 0
    ? Math.round((verifiedApplicableCells / applicableCells) * 100)
    : 100;

  // ── Industry-standard scoring ────────────────────────────────────────────────
  // Severity-weighted rule compliance: each decided (file, standard) cell earns
  // its severity weight when it PASSES and zero when it VIOLATES, so a Critical
  // failure moves the score far more than an Info. (SonarQube-style weighting.)
  const SEV_WEIGHT: Record<string, number> = { Critical: 10, Warning: 3, Info: 1 };
  const sevById = new Map(effectiveStandards(session).map(s => [s.id, s.severity as string]));
  let earnedWeight = 0;
  let maxWeight = 0;
  for (const r of session.standardResults) {
    if (r.status !== 'PASS' && r.status !== 'VIOLATION') continue; // only applicable, decided cells
    const w = SEV_WEIGHT[sevById.get(r.ruleId) ?? 'Info'] ?? 1;
    maxWeight += w;
    if (r.status === 'PASS') earnedWeight += w;
  }
  const qualityScore = maxWeight > 0 ? Math.round((earnedWeight / maxWeight) * 100) : 100;
  const grade = qualityScore >= 90 ? 'A' : qualityScore >= 80 ? 'B' : qualityScore >= 70 ? 'C' : qualityScore >= 60 ? 'D' : 'F';

  // Defect density: violations per 1,000 lines of reviewed code (industry norm).
  const linesReviewed = session.linesReviewed ?? 0;
  const defectDensity = linesReviewed > 0
    ? Math.round((allViolations.length / linesReviewed) * 1000 * 10) / 10
    : 0;

  session.status = runStatus === 'COMPLETE' ? 'complete' : 'stopped';

  if (session.runId) {
    await completeRun({
      runId: session.runId,
      status: runStatus,
      totalFiles: session.totalFiles,
      scannedFiles: reviewedCount,
      ignoredFiles: 0,
      critical, warning, info,
      pass: filesPassing,
      // Store the industry-standard weighted quality score as the run's headline
      // % so history + the dial stay consistent.
      compliancePct: qualityScore,
    }).catch((err: any) => console.warn('[CodeLens] DB completeRun failed:', err?.message));
  }

  return {
    runStatus, total: denominator, violations: allViolations.length, critical, warning, info,
    filesPassing, filesFailing, compliancePct,
    qualityScore, grade, defectDensity, linesReviewed,
    expectedCells, verifiedCells: session.coverageVerified, errorCells,
    confidencePct, applicableCells, verifiedApplicableCells,
  };
}

async function emitReviewComplete(session: CodeLensSession): Promise<void> {
  const s = await finalizeRun(session, 'COMPLETE');
  const failed = Array.from(session.coverageErrors.values()).slice(0, 100).map(c => ({
    file_id: c.fileId, path: c.filePath, rule_id: c.ruleId, rule_name: c.ruleName,
  }));
  emit(session, {
    event: 'review_complete',
    session_id: session.sessionId,
    run_status: s.runStatus,
    coverage: {
      expected_cells: s.expectedCells,
      verified_cells: s.verifiedCells,
      error_cells: s.errorCells,
      confidence_pct: s.confidencePct,
      applicable_cells: s.applicableCells,
      verified_applicable_cells: s.verifiedApplicableCells,
      failed,
    },
    summary: {
      total_files: s.total,
      total_violations: s.violations,
      critical: s.critical,
      warning: s.warning,
      info: s.info,
      files_passing: s.filesPassing,
      files_failing: s.filesFailing,
      compliance_pct: s.compliancePct,
      // Industry-standard scoring
      quality_score: s.qualityScore,
      grade: s.grade,
      defect_density: s.defectDensity,
      lines_reviewed: s.linesReviewed,
    },
    report_ready: true,
    report_download_url: `/api/v1/codelens/report/${session.sessionId}/excel`,
  });
}

/** Apply a single re-run result to the ledger + session state (used by retryCoverage). */
function applyRetriedResult(session: CodeLensSession, file: FileEntry, fileContent: string, result: StandardCheckResult): void {
  const key = `${file.fileId}::${result.rule_id}`;
  const summary = session.fileSummaries.get(file.fileId);

  // Drop the stale (ERROR) standardResult for this cell before recording the new one.
  session.standardResults = session.standardResults.filter(
    sr => !(sr.fileId === file.fileId && sr.ruleId === result.rule_id),
  );

  emit(session, {
    event: 'standard_checked',
    file_id: file.fileId,
    rule_id: result.rule_id,
    rule_name: result.rule_name,
    severity: result.severity,
    status: result.status,
    checked: result.checked,
    violations: result.violations,
  });

  if (result.status === 'ERROR') {
    // Still failing — leave it in the ledger so the run stays PARTIAL.
    session.standardResults.push({ fileId: file.fileId, ruleId: result.rule_id, status: 'ERROR', violationCount: 0 });
    return;
  }

  // Success — clear from the ledger and count it.
  if (session.coverageErrors.delete(key)) session.coverageVerified++;
  if (summary) { summary.errors = Math.max(0, summary.errors - 1); summary.verifiedCells++; }
  session.standardResults.push({
    fileId: file.fileId, ruleId: result.rule_id, status: result.status, violationCount: result.violations.length,
  });

  if (result.status === 'VIOLATION') {
    for (const v of result.violations) {
      const line = snapLineToCode(fileContent, v.line, v.found_code);
      const violationId = `V-${file.fileId}-${result.rule_id}-${line}`;
      if (session.violations.has(violationId)) continue;
      session.violations.set(violationId, {
        violationId, fileId: file.fileId, ruleId: result.rule_id, ruleName: result.rule_name,
        severity: result.severity, lineStart: line, lineEnd: line,
        foundCode: v.found_code, recommendedFix: v.explanation, fixAvailable: true, status: 'open',
      });
      emit(session, {
        event: 'violation_found',
        violation_id: violationId,
        file_id: file.fileId,
        rule_id: result.rule_id,
        rule_name: result.rule_name,
        severity: result.severity,
        line_start: line,
        line_end: line,
        found_code: v.found_code,
        recommended_fix: v.explanation,
        fix_available: true,
        status: 'OPEN',
      });
      if (summary) {
        if (result.severity === 'Critical') summary.critical++;
        else if (result.severity === 'Warning') summary.warning++;
        else summary.info++;
        summary.status = 'FAIL';
      }
    }
  } else if (result.status === 'PASS') {
    if (summary) summary.passed++;
    emit(session, { event: 'rule_pass', file_id: file.fileId, rule_id: result.rule_id, rule_name: result.rule_name });
  }
}

/**
 * Hard fail-closed retry: re-run every (file, standard) cell that didn't complete,
 * update the coverage ledger, and emit a fresh review_complete. Cells that still
 * error stay in the ledger and keep the run PARTIAL.
 */
export async function retryCoverage(session: CodeLensSession): Promise<void> {
  const cells = Array.from(session.coverageErrors.values());
  if (cells.length === 0) {
    await emitReviewComplete(session);
    return;
  }

  emit(session, { event: 'review_status', message: `Retrying ${cells.length} unverified check(s)…` });

  const byFile = new Map<string, CoverageErrorCell[]>();
  for (const c of cells) {
    if (!byFile.has(c.fileId)) byFile.set(c.fileId, []);
    byFile.get(c.fileId)!.push(c);
  }

  for (const [fileId, fileCells] of Array.from(byFile.entries())) {
    const file = session.files.find(f => f.fileId === fileId);
    if (!file) continue;
    const fileType = classifyFile(file.relativePath);
    let content: string;
    try { content = fs.readFileSync(file.absolutePath, 'utf-8'); } catch { continue; }

    await Promise.all(fileCells.map(cell => {
      const standard = effectiveStandards(session).find(s => s.id === cell.ruleId);
      if (!standard) return Promise.resolve();
      return fanoutLimiter(session.userId, () =>
        checkFileAgainstStandard(file.relativePath, content, standard, fileType),
      ).then(result => applyRetriedResult(session, file, content, result));
    }));

    const summary = session.fileSummaries.get(fileId);
    if (summary) {
      emit(session, { event: 'file_complete', file_id: fileId, path: file.relativePath, summary });
    }
  }

  emit(session, { event: 'review_status', message: '' });
  await emitReviewComplete(session);
}

// â”€â”€â”€ Concurrency helper with stop support â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function reviewFilesWithConcurrency(
  session: CodeLensSession,
  limit: number,
  startIndex: number,
): Promise<void> {
  const files = session.files;
  for (let i = startIndex; i < files.length; i += limit) {
    // Check stop flag before each batch
    if (session.status === 'stopped') {
      emit(session, {
        event: 'review_stopped',
        session_id: session.sessionId,
        files_reviewed: i,
        files_remaining: files.length - i,
      });
      return;
    }

    const batch = files.slice(i, Math.min(i + limit, files.length));
    await Promise.all(
      batch.map((file, j) => {
        let content: string;
        try {
          const raw = fs.readFileSync(file.absolutePath);
          if (raw.length > MAX_FILE_BYTES) {
            content = raw.slice(0, MAX_FILE_BYTES).toString('utf-8') + '\n// [file truncated â€” exceeds 150 KB]';
          } else {
            content = raw.toString('utf-8');
          }
        } catch {
          content = '';
        }
        return reviewFile(session, file, content, i + j + 1);
      }),
    );

    // Record progress after each batch for resume
    session.lastReviewedFileIndex = Math.min(i + limit, files.length);
  }
}

// â”€â”€â”€ Bulk fix: all violations of one standard across all files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BULK_FIX_CONCURRENCY = 5;

export async function bulkFixByStandard(
  session: CodeLensSession,
  standardId: string,
): Promise<void> {
  const standard = effectiveStandards(session).find(s => s.id === standardId);
  if (!standard) throw new Error(`Standard ${standardId} not found`);

  const openViolations = Array.from(session.violations.values())
    .filter(v => v.ruleId === standardId && v.status === 'open');

  // Group by fileId â€” one Claude call fixes ALL instances in a file
  const byFile = new Map<string, typeof openViolations>();
  for (const v of openViolations) {
    if (!byFile.has(v.fileId)) byFile.set(v.fileId, []);
    byFile.get(v.fileId)!.push(v);
  }

  const total = byFile.size;
  let fixed = 0, failed = 0;

  emit(session, { event: 'bulk_fix_progress', standard_id: standardId, fixed: 0, failed: 0, total, current_file: '' });

  // Check out the dedicated fix branch ONCE before any writes. Every commit in
  // this run lands on that branch — never on the base branch being reviewed.
  const fixBranch = await ensureSessionFixBranch(session);

  const fileEntries = Array.from(byFile.entries());

  for (let i = 0; i < fileEntries.length; i += BULK_FIX_CONCURRENCY) {
    const batch = fileEntries.slice(i, i + BULK_FIX_CONCURRENCY);

    // Phase A — generate fixes concurrently (Claude calls + file writes are safe in parallel)
    const writeResults = await Promise.all(batch.map(async ([fileId, fileViolations]) => {
      const file = session.files.find(f => f.fileId === fileId);
      if (!file) return null;
      try {
        const content = fs.readFileSync(file.absolutePath, 'utf-8');
        const fixedContent = await generateBulkStandardFix(
          file.relativePath, content, standard, fileViolations,
        );
        if (!fixedContent) return null;
        fs.writeFileSync(file.absolutePath, fixedContent, 'utf-8');
        return { file, fileId, fileViolations };
      } catch {
        return null;
      }
    }));

    // Phase B — commit each changed file SEQUENTIALLY (git index lock = no concurrency)
    for (const r of writeResults) {
      if (!r) { failed++; continue; }
      const { file, fileId, fileViolations } = r;

      const commitMessage =
        `fix(${standardId}): ${standard.name} — ${path.basename(file.relativePath)}\n\n` +
        `ASTRA Code Lens bulk fix (${fileViolations.length} violation(s)).`;

      let commitHash: string | null = null;
      try {
        commitHash = await commitFixedFile(session.localPath, file.relativePath, commitMessage);
      } catch (err: any) {
        console.error(`[CodeLens] bulk commit failed for ${file.relativePath}:`, err?.message);
        failed++;
        continue;
      }

      for (const v of fileViolations) {
        const violation = session.violations.get(v.violationId);
        if (violation) violation.status = 'fixed';
        if (session.runId) {
          markViolationFixed({ runId: session.runId, violationId: v.violationId, commitHash })
            .catch(dbErr => console.warn('[CodeLens] markViolationFixed failed (non-fatal):', dbErr?.message));
        }
        emit(session, {
          event: 'fix_applied',
          violation_id: v.violationId,
          file_id: fileId,
          rule_id: v.ruleId,
          commit_message: commitMessage.split('\n')[0],
          branch: fixBranch,
        });
      }
      fixed++;

      emit(session, {
        event: 'bulk_fix_progress',
        standard_id: standardId,
        fixed,
        failed,
        total,
        current_file: file.relativePath,
      });
    }
  }

  // Auto-push the fix branch to origin so bulk fixes are durable across re-clones
  try {
    await pushFixes(session);
  } catch (err: any) {
    console.warn('[CodeLens] auto-push after bulk fix failed (non-fatal):', err?.message);
  }

  emit(session, { event: 'bulk_fix_complete', standard_id: standardId, fixed, failed, total });
}

async function generateBulkStandardFix(
  filePath: string,
  fileContent: string,
  standard: CodeStandard,
  violations: ViolationRecord[],
): Promise<string | null> {
  const violationList = violations
    .map(v => `  Line ${v.lineStart}: ${v.foundCode.slice(0, 150)}`)
    .join('\n');

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [{
      role: 'user',
      content: `You are a .NET code fixer. Fix ALL violations of one coding standard in this file.

## Standard to Fix
Rule: ${standard.id} â€” ${standard.name}
Description: ${standard.description}
What to fix: ${standard.whatToLookFor}

## Violations Found (${violations.length} total)
${violationList}

## File: ${filePath}
\`\`\`csharp
${fileContent.slice(0, 100_000)}
\`\`\`

## Instructions
- Fix EVERY instance of standard ${standard.id} listed above.
- Do NOT change anything else in the file.
- Return ONLY the complete corrected file content as plain text â€” no markdown fences, no explanation.
- If you cannot safely fix this file, return the single word: SKIP`,
    }],
  });

  const text = message.content[0]?.type === 'text' ? message.content[0].text.trim() : '';
  if (!text || text === 'SKIP' || text.length < 10) return null;
  return text.replace(/^```(?:csharp)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
}

// â”€â”€â”€ Fix generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function generateFix(session: CodeLensSession, violationId: string): Promise<void> {
  const violation = session.violations.get(violationId);
  if (!violation) throw new Error(`Violation ${violationId} not found`);

  const file = session.files.find(f => f.fileId === violation.fileId);
  if (!file) throw new Error(`File ${violation.fileId} not found`);

  const std = effectiveStandards(session).find(s => s.id === violation.ruleId);
  const content = fs.readFileSync(file.absolutePath, 'utf-8');

  const prompt = `You are a .NET code fixer applying Insurity coding standards.

## Violation to Fix
Rule: ${violation.ruleId} â€” ${violation.ruleName}
Standard: ${std?.description ?? ''}
Location: lines ${violation.lineStart}â€“${violation.lineEnd} in ${file.relativePath}
Violating code:
\`\`\`csharp
${violation.foundCode}
\`\`\`
Required fix: ${violation.recommendedFix}

## Full File: ${file.relativePath}
\`\`\`csharp
${content}
\`\`\`

## Instructions
- Fix ONLY the identified violation. Do not change anything else.
- Return the complete corrected file content in fixedFileContent.
- beforeCode = the exact original snippet that was replaced.
- afterCode = the replacement snippet only (not the whole file).

## Response
Return ONLY valid JSON â€” no markdown fences, no explanation:
{
  "fixedFileContent": "complete corrected file as a string",
  "beforeCode": "original snippet",
  "afterCode": "replacement snippet",
  "importsAdded": [],
  "importsRemoved": []
}`;

  const message = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = message.content[0]?.type === 'text' ? message.content[0].text : '{}';
  const parsed = parseJsonSafe<{
    fixedFileContent?: string;
    beforeCode?: string;
    afterCode?: string;
    importsAdded?: string[];
    importsRemoved?: string[];
  }>(text, {});

  if (!parsed.fixedFileContent) {
    throw new Error('Claude did not return fixed file content');
  }

  const beforeLines: number[] = [];
  for (let i = violation.lineStart; i <= violation.lineEnd; i++) beforeLines.push(i);

  const record: FixRecord = {
    violationId,
    fileId: violation.fileId,
    relativePath: file.relativePath,
    absolutePath: file.absolutePath,
    beforeCode: parsed.beforeCode ?? violation.foundCode,
    afterCode: parsed.afterCode ?? '',
    beforeLines,
    importsAdded: parsed.importsAdded ?? [],
    importsRemoved: parsed.importsRemoved ?? [],
    fixedContent: parsed.fixedFileContent,
  };
  session.fixes.set(violationId, record);

  emit(session, {
    event: 'fix_preview',
    violation_id: violationId,
    file_id: violation.fileId,
    diff: {
      before_lines: beforeLines,
      before_code: record.beforeCode,
      after_code: record.afterCode,
      imports_added: record.importsAdded,
      imports_removed: record.importsRemoved,
    },
  });
}

// â”€â”€â”€ Apply fix to disk â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Ensure the session's dedicated fix branch exists and is checked out.
 * Idempotent — the branch name is cached on the session after the first call.
 * Never touches the base branch the user is reviewing.
 */
async function ensureSessionFixBranch(session: CodeLensSession): Promise<string> {
  if (session.fixBranch) return session.fixBranch;
  const branch = await ensureFixBranch(session.localPath, session.branch, session.userId);
  session.fixBranch = branch;
  return branch;
}

export async function applyFix(session: CodeLensSession, violationId: string): Promise<void> {
  const fix = session.fixes.get(violationId);
  if (!fix) throw new Error(`No fix preview exists for violation ${violationId}. Call POST /fix first.`);
  if (!fix.fixedContent) throw new Error('Fix content is empty');

  const violation = session.violations.get(violationId);

  // 1. Switch to the dedicated fix branch (created once, reused thereafter)
  const fixBranch = await ensureSessionFixBranch(session);

  // 2. Write the fixed content and commit it to the fix branch
  fs.writeFileSync(fix.absolutePath, fix.fixedContent, 'utf-8');

  const commitMessage =
    `fix(${violation?.ruleId ?? 'code-lens'}): ${violation?.ruleName ?? 'standard'} in ` +
    `${path.basename(fix.relativePath)} line ${violation?.lineStart ?? '?'}\n\n` +
    `ASTRA Code Lens automated fix.`;

  let commitHash: string | null = null;
  try {
    commitHash = await commitFixedFile(session.localPath, fix.relativePath, commitMessage);
  } catch (err: any) {
    console.error(`[CodeLens] git commit failed for ${fix.relativePath}:`, err?.message);
    throw new Error(`Fix written but commit failed: ${err?.message}`);
  }

  // 3. Update in-memory + DB status
  if (violation) violation.status = 'fixed';
  if (session.runId) {
    markViolationFixed({ runId: session.runId, violationId, commitHash }).catch(dbErr =>
      console.warn('[CodeLens] markViolationFixed failed (non-fatal):', dbErr?.message),
    );
  }

  emit(session, {
    event: 'fix_applied',
    violation_id: violationId,
    file_id: fix.fileId,
    rule_id: violation?.ruleId ?? '',
    commit_message: commitMessage.split('\n')[0],
    branch: fixBranch,
  });

  // 4. VERIFY-AND-FREEZE: re-run this standard against the fixed content. This
  //    confirms the fix actually resolves the issue, and (via the content-hash
  //    cache inside checkFileAgainstStandard) freezes the new verdict so the fix
  //    is never re-litigated unless the file changes again.
  const std = effectiveStandards(session).find(s => s.id === violation?.ruleId);
  if (std && violation) {
    try {
      const fileType = classifyFile(fix.relativePath);
      const verify = await checkFileAgainstStandard(fix.relativePath, fix.fixedContent, std, fileType);
      const ok = verify.status === 'PASS' || verify.status === 'NOT_APPLICABLE';
      emit(session, {
        event: 'fix_verified',
        violation_id: violationId,
        rule_id: std.id,
        verified: ok,
        status: verify.status,
        message: ok
          ? 'Fix verified — the standard now passes on the fixed file.'
          : verify.status === 'ERROR'
            ? 'Could not verify the fix (check did not complete) — re-run to confirm.'
            : 'Fix applied, but the standard still reports an issue on the fixed file.',
      });
    } catch (err: any) {
      console.warn('[CodeLens] fix verify failed (non-fatal):', err?.message);
    }
  }
}

/**
 * Push the fix branch to origin (Azure DevOps / GitHub).
 * No-op if no fixes have been committed yet.
 */
export async function pushFixes(session: CodeLensSession): Promise<{ branch: string; pushed: boolean }> {
  if (!session.fixBranch) {
    return { branch: '', pushed: false };
  }
  await pushFixBranch(session.localPath, session.repoUrl, session.fixBranch);
  session.fixBranchPushed = true;
  return { branch: session.fixBranch, pushed: true };
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Walk the repo and return every file (all extensions).
 * The codelens-ignore layer decides what to actually scan.
 * We only hard-skip .git to avoid reading git internals.
 */
function findAllFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === '.git') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }

  walk(rootDir);
  return results;
}

/** Robustly extract a JSON object from an LLM response that may include prose
 *  preamble, ```json fences, or trailing commentary. Returns null if none parses.
 *  Tries, in order: the whole trimmed text, the first fenced block's contents,
 *  then the first balanced {...} object (brace matching, string/escape aware). */
function extractJsonObject<T>(text: string): T | null {
  if (!text) return null;
  const tryParse = (s: string): T | null => {
    try { return JSON.parse(s) as T; } catch { return null; }
  };

  let r = tryParse(text.trim());
  if (r !== null) return r;

  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  if (fence && fence[1]) {
    r = tryParse(fence[1].trim());
    if (r !== null) return r;
  }

  const start = text.indexOf('{');
  if (start !== -1) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
      } else if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          r = tryParse(text.slice(start, i + 1));
          if (r !== null) return r;
          break;
        }
      }
    }
  }
  return null;
}

function parseJsonSafe<T>(text: string, fallback: T): T {
  const obj = extractJsonObject<T>(text);
  return obj === null ? fallback : obj;
}
