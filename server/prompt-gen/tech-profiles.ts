/**
 * tech-profiles.ts — AI-DLC Prompt Generator
 *
 * A Tech Profile makes the target stack a CONFIGURABLE input rather than
 * something hard-coded into the generator. It declares:
 *   - which architecture layers exist (domain, application, api, infra, ui, tests)
 *   - per-layer guidance that shapes the generated prompt
 *   - the model to use per layer
 *   - free-form framework notes (e.g. the Aurora UI conventions) that the user
 *     can supply/override per project
 *
 * The default profile targets .NET 10 (C# / CQRS) for the backend layers and
 * ReactJS + the Aurora framework for the UI layer.
 */

export type LayerId = 'domain' | 'application' | 'api' | 'infrastructure' | 'ui' | 'tests';

export interface LayerSpec {
  id: LayerId;
  /** Human label shown in the UI tab */
  label: string;
  /** One-line description of what this layer's prompt produces */
  summary: string;
  /** Model to use for this layer's generation */
  model: string;
  /** The layer-specific instructions injected into the prompt template */
  guidance: string;
  /** Generation order hint (lower = earlier). Used only for display grouping. */
  order: number;
}

export interface TechProfile {
  id: string;
  name: string;
  /** Short description shown in the profile picker */
  description: string;
  /** Backend language/stack summary, injected as global context into every prompt */
  stackSummary: string;
  /** Model used for the Stage-1 contract synthesis (the cross-layer skeleton) */
  contractModel: string;
  /** Ordered layers this profile generates prompts for */
  layers: LayerSpec[];
  /**
   * Free-form framework conventions the user can edit per project.
   * The default holds placeholder Aurora guidance — replace with the real
   * Aurora component/library conventions when available.
   */
  frameworkNotes: string;
  /** True for the built-in defaults (read-only baseline). */
  builtin: boolean;
}

// Sonnet 5 across all tiers (per request). These raw ids are used on the direct
// Anthropic API path; the gateway path uses the ANTHROPIC_MODEL deployment name.
const SONNET = 'claude-sonnet-5';
const OPUS = 'claude-sonnet-5';

// ─── Default profile: .NET 10 (CQRS) + React/Aurora ──────────────────────────

const DOTNET10_REACT_AURORA: TechProfile = {
  id: 'dotnet10-react-aurora',
  name: '.NET 10 (Insurity EAIS) + React / Aurora',
  description:
    'Backend in .NET 10, Controller-Service-Repository (insurity-eais-backend); UI in ReactJS using the Aurora framework.',
  stackSummary: [
    'BACKEND: .NET 10 (net10.0 on every project), C#. Architecture is Controller-Service-Repository',
    '  — NOT Clean Architecture and NOT MediatR/CQRS. Follow the REPOSITORY GROUNDING block verbatim; it is authoritative and overrides any assumption.',
    'Namespaces: Rules Engine = RE.RulesEngine, Rating Engine = RT.RatingEngine. Service layout:',
    '  src/Services/{Name}/{Prefix}.{Name}.{Layer}/ with layers Web, Service, Service.Interface, Repository, Model, Shared.',
    'Shared kernel at src/building-block/RE.SharedKernel/ provides base entities, the in-house Mediator',
    '  (RE.SharedKernel.Mediator — never MediatR), rating primitives, and AST types (RE.SharedKernel.Ast).',
    'EF Core on PostgreSQL (snake_case columns), Dapr for inter-service calls, FluentValidation, JSON:API responses,',
    '  IApplicationIdentity multi-tenancy, InsurityController base. Do NOT invent Insurity.PnC.* namespaces or Clean-Architecture folders.',
    'FRONTEND: ReactJS + TypeScript using the Aurora component framework (see FRAMEWORK NOTES).',
  ].join('\n'),
  contractModel: OPUS,
  frameworkNotes: [
    '# Aurora UI conventions (PLACEHOLDER — replace with the real Aurora docs)',
    '',
    'Aurora is the in-house React component/design framework. Until the official',
    'Aurora reference is attached to this profile, the UI-layer prompt should:',
    '- Use Aurora components instead of raw HTML where an equivalent exists',
    '  (e.g. <AuroraButton>, <AuroraForm>, <AuroraTable>, <AuroraModal>) — confirm',
    '  exact names/props against the Aurora library.',
    '- Follow Aurora layout primitives and theming tokens rather than ad-hoc CSS.',
    '- Keep screens composed of container + presentational components.',
    '',
    'ACTION: attach the Aurora component list / docs so this section can be made exact.',
  ].join('\n'),
  builtin: true,
  // Order: Domain, Application, Infrastructure, API, UI, Tests — Infrastructure
  // BEFORE API so DI/persistence exist before controllers reference them.
  layers: [
    {
      id: 'domain',
      label: 'Domain',
      summary: 'Model layer: entities, value objects, domain events, invariants, state transitions.',
      model: OPUS,
      order: 1,
      guidance: [
        'DOMAIN / MODEL slice for {Prefix}.{Name}.Model. Entity classes + IEntityTypeConfiguration extending',
        'RE.SharedKernel base types (BaseEntity, TenantScopedEntity, IAuditableEntity, ISoftDeletable, IRowVersioned).',
        'Domain events via IDomainEvent; AST types from RE.SharedKernel.Ast. State-transition methods (Draft→…).',
        'NO MediatR, NO DbContext, NO controllers here. Define IEntityTypeConfiguration but do NOT run migrations',
        '(Dev 3 owns the DbContext and all migrations). Use exact names from the CONTRACT.',
      ].join(' '),
    },
    {
      id: 'application',
      label: 'Application',
      summary: 'Service + Service.Interface: request/handlers via RE.SharedKernel.Mediator, validators, DTO mapping.',
      model: SONNET,
      order: 2,
      guidance: [
        'APPLICATION / SERVICE slice ({Prefix}.{Name}.Service + .Service.Interface). Request + handler types via',
        'RE.SharedKernel.Mediator (IRequest / IRequestHandler — never MediatR), FluentValidation validators, and',
        'DTO mapping via extension methods in Mappers/ (never AutoMapper). Declare repository interfaces here.',
        'Inter-service via the IDaprServiceClient abstraction. No HTTP and no EF/DbContext specifics in this slice.',
      ].join(' '),
    },
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      summary: 'Repository layer: repository impls, EF config, DI wiring, Dapr, event publishing.',
      model: SONNET,
      order: 3,
      guidance: [
        'INFRASTRUCTURE / REPOSITORY slice. Repository implementations, EF Core IEntityTypeConfiguration, query',
        'filters (HasQueryFilter on TenantId AND IsDeleted), DI registration in Program.cs (AddApplicationIdentity/',
        'UseApplicationIdentity, UseCorrelation first), IDaprServiceClient implementation, and SaveChangesAsync THEN',
        'PublishEventAsync. The DbContext and ALL migrations are owned by Dev 3 — define configurations only and',
        'state: do NOT run dotnet ef migrations add/remove/update/drop; batch the migration request to Dev 3.',
      ].join(' '),
    },
    {
      id: 'api',
      label: 'API',
      summary: 'Web layer: controllers on InsurityController, JSON:API, permissions, PATCH, action endpoints.',
      model: SONNET,
      order: 4,
      guidance: [
        'API / WEB slice. Controllers extending InsurityController (never ControllerBase), JSON:API responses',
        '(JsonApiObject<T> / JsonApiCollection<T>, Resource<TAttributes>), [RequirePermission] and',
        '[Produces("application/vnd.api+json")] on every endpoint, [JsonApiFeatures] on collection GETs, HttpPatch',
        '(never HttpPut), state transitions via [HttpPost("{id:guid}/actions/{verb}")] returning NoContent() 204.',
        'Dispatch to the Service layer through the Mediator. Routes: lowercase, no hyphens, no TenantId in DTOs.',
      ].join(' '),
    },
    {
      id: 'ui',
      label: 'UI (React / Aurora)',
      summary: 'React screens/components using Aurora, typed API client, forms, state.',
      model: SONNET,
      order: 5,
      guidance: [
        'UI slice in ReactJS + TypeScript using the Aurora framework (see FRAMEWORK NOTES).',
        'Cover: the screen(s)/components for this story, typed API client calls matching the JSON:API contract,',
        'form fields + client-side validation mapped to the acceptance criteria, loading/error/empty states,',
        'and TanStack Query hooks. Use Aurora components and theming per the FRAMEWORK NOTES.',
      ].join(' '),
    },
    {
      id: 'tests',
      label: 'Tests',
      summary: 'xUnit covering the POSITIVE/NEGATIVE/EDGE coverage matrix; dotnet build PC.slnx.',
      model: SONNET,
      order: 6,
      guidance: [
        'TESTS slice. xUnit tests covering the full test-coverage matrix from the grounding (POSITIVE, NEGATIVE with',
        '400/401/403/404/409/422/429, and EDGE incl. cross-tenant isolation, idempotency, concurrency, boundaries).',
        'Add "using RE.SharedKernel.Ast;" in any test file using AST types. Every FSD acceptance criterion maps to a',
        'named test. Always run "dotnet build PC.slnx" (never --no-build). Use exact names from the CONTRACT.',
      ].join(' '),
    },
  ],
};

// Registry ────────────────────────────────────────────────────────────────────

const PROFILES: Record<string, TechProfile> = {
  [DOTNET10_REACT_AURORA.id]: DOTNET10_REACT_AURORA,
};

export function listTechProfiles(): TechProfile[] {
  return Object.values(PROFILES);
}

export function getTechProfile(id: string | undefined): TechProfile {
  if (id && PROFILES[id]) return PROFILES[id];
  return DOTNET10_REACT_AURORA;
}

export const DEFAULT_PROFILE_ID = DOTNET10_REACT_AURORA.id;
