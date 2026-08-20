/**
 * insurity-grounding.ts — BLOCK B: authoritative repository grounding for the
 * insurity-eais-backend, injected verbatim into the contract call and every slice
 * call. This overrides model assumptions (it is why the engine must NOT invent
 * `Insurity.PnC.RatingEngine` or Clean-Architecture folder names).
 *
 * Source of truth: prompt-engine-upgrade-spec.md, Block B. Keep in sync with it.
 */

export const INSURITY_GROUNDING = `REPOSITORY GROUNDING - AUTHORITATIVE, OVERRIDES ANY ASSUMPTION

Project: insurity-eais-backend
Default branch: staging. Working branch: feature/rules-rating-engine
Story branches: feat/{story-id}-{name}, PR into integration/sprint4-re1

Namespace prefixes:
  Rules Engine:  RE.RulesEngine
  Rating Engine: RT.RatingEngine
Service layout: src/Services/{Name}/{Prefix}.{Name}.{Layer}/
Layers: Web, Service, Service.Interface, Repository, Model, Shared
Shared kernel: src/building-block/RE.SharedKernel/
  Domain/    BaseEntity, IAuditableEntity, IDomainEvent, IRowVersioned,
             ISoftDeletable, ITenantScoped, TenantScopedEntity
  Rating/    IRatingContext, IRatingResult, MoneyRounding, RatingTraceEntry,
             DateUtilities
  Mediator/  IMediator, IRequest, IRequestHandler, ISender, IPipelineBehavior,
             Mediator, Unit
  Formula/, Messaging/, Middleware/
AST types (ExecutionPhase, AstScope, AstRuleType) live in RE.SharedKernel.Ast.
Every test file using them must add: using RE.SharedKernel.Ast;

Stack: .NET 10, C#, Controller-Service-Repository, EF Core, Dapr, FluentValidation,
PostgreSQL. net10.0 on every project.

BANNED. Any occurrence is a generation failure, regenerate the slice:
  MediatR (use RE.SharedKernel.Mediator)
  AutoMapper (extension methods in Mappers/ only)
  EF Core factory pattern
  HttpPut (HttpPatch only)
  DbContext in Application or Service layer
  DbSet.Update() (load-then-mutate; ExecuteUpdateAsync is the sole exception)
  ICurrentUserService, IIdentityService, IUserContext (IApplicationIdentity only)
  new HttpClient() (IHttpClientFactory only; Dapr for inter-service)
  .Result, .Wait(), .GetAwaiter().GetResult()
  Guid.Parse on external input (Guid.TryParse always)
  service locator in method bodies
  empty catch blocks, commented-out code, TODO without a ticket
  ProblemDetails in JSON:API services
  string interpolation in log calls
  Polly for Dapr-mediated calls
  hyphens in route segments
  uppercase apiversion in routes
  TenantId in any request DTO

REQUIRED. Every slice that touches the relevant surface must include these:
  TenantId type is Guid on entities and method signatures
  Repository interfaces in Application or Domain layer
  IApplicationIdentity injected into DbContext constructor
  HasQueryFilter with both TenantId and IsDeleted
  Three-layer tenant isolation: EF filter, SaveChanges guard, PostgreSQL RLS
  AddApplicationIdentity() and UseApplicationIdentity() in Program.cs
  UseCorrelation() as first middleware
  SaveChangesAsync THEN PublishEventAsync, never reversed
  AsNoTracking on read-only queries, absent on fetch-for-mutation
  [LoggerMessage] in controllers, handlers, repositories, middleware
  [JsonConverter(typeof(JsonStringEnumConverter))] on every DTO enum
  [JsonApiFeatures] on every collection GET endpoint
  FilterCriteriaBase plus [FilterCriteriaFieldValidOperators] on every filter property
  Resource<TAttributes> or Resource<TAttributes,TRelationships> for all DTOs
  JsonApiObject<T> / JsonApiCollection<T> responses,
    JsonApiObjectForRequest<T> request bodies
  [Produces("application/vnd.api+json")]
  InsurityController base, never ControllerBase
  [RequirePermission] on every endpoint
  MapInsurityHealthChecks()
  IdempotencyFilter globally, 24h standard, 48h financial operations
  Rate limiting 100 req/min, partition key from JWT org_id only
  OpenTelemetry: AddAspNetCoreInstrumentation, AddEntityFrameworkCoreInstrumentation,
    AddOtlpExporter
  CancellationToken on every async method
  ConfigureAwait(false) in building-block code only
  snake_case for JSON and DB columns, PascalCase for C# members
  State transitions: [HttpPost("{id:guid}/actions/{verb}")] returning NoContent() 204
  GetTenant() only via _appIdentity.Principal.GetTenant()
  Exceptions: JsonApiParameterException, JsonApiResourceNotFoundException,
    JsonApiException. No ProblemDetails.

Inter-service calls: DaprClient.InvokeMethodAsync only, via the IDaprServiceClient
abstraction declared in Application and implemented in Infrastructure. App IDs:
rules-engine, rating-engine. PubSub for async events. grep for HttpClient must
return zero results.

Migrations and DbContext: Dev 3 solely owns the DbContext and ALL migrations. Any
slice touching entities defines entity classes and IEntityTypeConfiguration only.
The prompt must state: do NOT run dotnet ef migrations add/remove/update/drop.
Batch the migration request to Dev 3.

Code comments standard:
  File header maximum two lines.
  One short WHY comment on non-obvious logic only.
  Method comment only when the method name is insufficient.
  No restating what the code says. No paragraphs.
  RIGHT: // Draft to PendingApproval
  WRONG: // This method transitions the rule from Draft to PendingApproval

Test coverage matrix, every slice with tests must cover:
  POSITIVE  all happy paths and combinations
  NEGATIVE  400, 401, 403, 404, 409, 422, 429, invalid enums, invalid date ranges
  EDGE      empty result returns 200 not 404, cross-tenant isolation, boundary
            min and max values, date boundaries, idempotency on repeated request,
            concurrent writes, export with 0 / 1 / 1000+ records, all filters
            combined, no filters returns paged all
Always run dotnet build PC.slnx after writing tests. Not --no-build.

Authority hierarchy when sources conflict:
  Insurity Standards > Golden Repo > CLAUDE.md > this contract`;
