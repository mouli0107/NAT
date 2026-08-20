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
  name: '.NET 10 (CQRS) + React / Aurora',
  description:
    'Backend in .NET 10 with a CQRS + DDD structure; UI in ReactJS using the Aurora framework.',
  stackSummary: [
    'BACKEND: .NET 10, C#, ASP.NET Core Minimal APIs / Controllers.',
    'Architecture: Clean Architecture + CQRS + DDD. Layers: Domain, Application, Infrastructure, API.',
    'Application layer uses MediatR-style commands/queries with handlers and FluentValidation validators.',
    'Persistence via Entity Framework Core with the repository/unit-of-work pattern.',
    'Domain events raised from aggregates; multi-tenant isolation enforced.',
    'FRONTEND: ReactJS + TypeScript using the Aurora component framework (see FRAMEWORK NOTES).',
    'Data fetching via typed API clients + TanStack Query; forms validated client-side.',
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
  layers: [
    {
      id: 'domain',
      label: 'Domain',
      summary: 'Aggregates, entities, value objects, domain events, invariants, factory methods.',
      model: OPUS,
      order: 1,
      guidance: [
        'Produce a prompt that instructs an AI coder to implement the DOMAIN layer for this story in .NET 10 / C#.',
        'It must specify: the aggregate root and entities (from the contract), value objects,',
        'the factory method(s) that are the ONLY way to create the aggregate, invariants enforced in the domain,',
        'domain events raised, and the state machine transitions if any.',
        'No EF Core, no DTOs, no controllers here — pure domain. Reference the exact names from the CONTRACT.',
      ].join(' '),
    },
    {
      id: 'application',
      label: 'Application',
      summary: 'CQRS commands/queries, handlers, validators, DTOs, mapping.',
      model: SONNET,
      order: 2,
      guidance: [
        'Produce a prompt for the APPLICATION layer: the CQRS commands and queries for this story',
        '(named exactly as in the contract), their handlers, FluentValidation validators, request/response DTOs,',
        'and mapping to/from the domain. Specify which domain factory/methods each handler calls and which',
        'events it publishes. Enforce authorization/tenant scoping. No HTTP or EF specifics here.',
      ].join(' '),
    },
    {
      id: 'api',
      label: 'API',
      summary: 'Endpoints, routes, request/response contracts, status codes, auth scopes.',
      model: SONNET,
      order: 3,
      guidance: [
        'Produce a prompt for the API layer: the ASP.NET Core endpoints/controllers for this story using the',
        'exact routes, HTTP verbs, request/response contracts, status codes and auth scopes from the contract.',
        'Each endpoint dispatches to the matching Application command/query. Include validation error shapes,',
        'problem-details responses, and OpenAPI annotations.',
      ].join(' '),
    },
    {
      id: 'infrastructure',
      label: 'Infrastructure',
      summary: 'EF Core config, repositories, migrations, DI wiring, event publishing.',
      model: SONNET,
      order: 4,
      guidance: [
        'Produce a prompt for the INFRASTRUCTURE layer: EF Core entity configurations for the aggregate,',
        'the repository implementation(s), the migration to add/alter tables, dependency-injection registrations,',
        'and the domain-event dispatch/outbox wiring. Use the exact entity/field names from the contract.',
      ].join(' '),
    },
    {
      id: 'ui',
      label: 'UI (React / Aurora)',
      summary: 'React screens/components using Aurora, typed API client, forms, state.',
      model: SONNET,
      order: 5,
      guidance: [
        'Produce a prompt for the UI layer in ReactJS + TypeScript using the Aurora framework (see FRAMEWORK NOTES).',
        'Cover: the screen(s)/components for this story, the typed API client calls matching the API contract,',
        'form fields + client-side validation mapped to the acceptance criteria, loading/error/empty states,',
        'and TanStack Query hooks. Use Aurora components and theming per the FRAMEWORK NOTES.',
      ].join(' '),
    },
    {
      id: 'tests',
      label: 'Tests',
      summary: 'Unit tests (domain/handlers), integration tests (API), UI tests.',
      model: SONNET,
      order: 6,
      guidance: [
        'Produce a prompt for the TESTS layer: xUnit unit tests for the domain invariants and application handlers,',
        'integration tests for each API endpoint (happy path + validation + auth), and UI component tests.',
        'Every acceptance criterion must map to at least one test. Reference exact names from the contract.',
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
