import type { ViolationSeverity } from './codelens-types';

export interface CodingStandard {
  id: string;
  name: string;
  description: string;
  severity: ViolationSeverity;
}

export const CODING_STANDARDS: CodingStandard[] = [
  {
    id: 'R001',
    name: 'HTTP PATCH Only',
    severity: 'Critical',
    description:
      'Use PATCH for updates; [HttpPut] is prohibited. PATCH DTOs must inherit FieldStatusDto, and updates should use FieldWasPresent() to modify only supplied fields.',
  },
  {
    id: 'R002',
    name: 'No DbContext in Application Layer',
    severity: 'Critical',
    description:
      'DbContext is allowed only inside Infrastructure repositories. Controllers, Application services, and Handlers must use repository interfaces instead.',
  },
  {
    id: 'R003',
    name: 'No .Update() in Repositories',
    severity: 'Critical',
    description:
      'Never use DbSet.Update(). Always load the tracked entity, modify required fields, and call SaveChangesAsync(). ExecuteUpdateAsync() is the only approved bulk-update exception.',
  },
  {
    id: 'R004',
    name: 'Tenant Isolation',
    severity: 'Critical',
    description:
      'Tenant information must come from IApplicationIdentity. Enforce tenant filtering using EF Core global query filters, SaveChanges tenant validation, PostgreSQL Row-Level Security (RLS), and prevent TenantId from being supplied by clients.',
  },
  {
    id: 'R005',
    name: 'Standard Identity',
    severity: 'Critical',
    description:
      'Use IApplicationIdentity exclusively. Custom services like ICurrentUserService, IIdentityService, or IUserContext are prohibited. Register AddApplicationIdentity() and UseApplicationIdentity() in application startup.',
  },
  {
    id: 'R006',
    name: 'JSON:API Framework Compliance',
    severity: 'Critical',
    description:
      'Use JsonApiFeatures for paging, sorting, sparse fieldsets, and includes. Implement FilterCriteriaBase, relationship DTOs, standard JSON:API responses, correct HTTP status codes, and idempotent POST operations.',
  },
  {
    id: 'R007',
    name: '.NET Target Framework',
    severity: 'Warning',
    description:
      'All projects must target .NET 10.0 (net10.0). Older target frameworks such as net6.0, net7.0, net8.0 are not allowed.',
  },
  {
    id: 'R008',
    name: 'Layered Architecture',
    severity: 'Critical',
    description:
      'Follow strict Controller → Service → Repository → Model architecture. Controllers call Services only; Services call Repositories; no layer skipping or reverse calls allowed.',
  },
  {
    id: 'R009',
    name: 'Dependency Injection',
    severity: 'Warning',
    description:
      'Register all services using the built-in .NET DI container with appropriate lifetimes. No static service locator, no new() instantiation of services, no CommonServiceLocator.',
  },
  {
    id: 'R010',
    name: 'Database Standard',
    severity: 'Warning',
    description:
      'Use PostgreSQL as the mandatory database. SQL Server, SQLite, MySQL, or other databases are not permitted. Connection strings must reference PostgreSQL providers.',
  },
  {
    id: 'R011',
    name: 'Entity Framework Core',
    severity: 'Critical',
    description:
      'Use Entity Framework Core Code-First. Do not implement manual Repository or Factory patterns where EF Core conventions suffice.',
  },
  {
    id: 'R012',
    name: 'Repository Pattern Ownership',
    severity: 'Critical',
    description:
      'The Repository/Infrastructure project owns entities and DbContext. Web (API) and Service projects must not reference EF entities or DbContext directly.',
  },
  {
    id: 'R013',
    name: 'DbContext Usage',
    severity: 'Critical',
    description:
      'Inject DbContext directly via constructor injection. Do not use IDbContextFactory. Do not resolve DbContext from IServiceProvider manually.',
  },
  {
    id: 'R014',
    name: 'Object Mapping — No AutoMapper',
    severity: 'Critical',
    description:
      'Use extension methods for POCO mapping. AutoMapper is prohibited. No IMapper injection, no AutoMapper.Map() calls, no CreateMap() profiles.',
  },
  {
    id: 'R015',
    name: 'JSON:API Response Compliance',
    severity: 'Critical',
    description:
      'API responses must conform to JSON:API spec using Insurity Framework base classes. No raw object returns from controllers — use JsonApiResponse<T> or equivalent.',
  },
  {
    id: 'R016',
    name: 'DTO Separation',
    severity: 'Warning',
    description:
      'Maintain separate DTOs for Read, Create, Update, and Filter operations. Do not reuse the same class for multiple operation types.',
  },
  {
    id: 'R017',
    name: 'DTO Base Classes',
    severity: 'Warning',
    description:
      'DTOs must inherit from Insurity Framework JSON:API base classes (e.g., JsonApiResourceDto, FieldStatusDto for PATCH DTOs).',
  },
  {
    id: 'R018',
    name: 'Filter Criteria Classes',
    severity: 'Warning',
    description:
      'Implement strongly typed filter criteria using FilterCriteriaBase and JSON:API filter[...] query conventions. No ad-hoc string parameters for filtering.',
  },
  {
    id: 'R019',
    name: 'Service Layer Responsibility',
    severity: 'Critical',
    description:
      'Service layer contains business logic, orchestration, validation, and entity-to-DTO mapping only. No HTTP concerns, no IActionResult returns.',
  },
  {
    id: 'R020',
    name: 'Service Layer Restrictions',
    severity: 'Critical',
    description:
      'Service layer must not access IHttpContextAccessor, return IActionResult, or contain raw SQL or persistence-specific EF exceptions.',
  },
  {
    id: 'R021',
    name: 'Mapping via Extension Methods',
    severity: 'Warning',
    description:
      'All entity-to-DTO and DTO-to-entity conversions must use mapper extension methods (e.g., entity.ToDto(), dto.ToEntity()). No inline property copying in service or controller code.',
  },
  {
    id: 'R022',
    name: 'Controller Responsibility',
    severity: 'Warning',
    description:
      'Controllers handle routing, request parsing, and delegation to services only. No business logic, no direct repository calls, no entity manipulation in controllers.',
  },
  {
    id: 'R023',
    name: 'Controller Base Class',
    severity: 'Warning',
    description:
      'Controllers must inherit from InsurityController, not ControllerBase or Controller directly.',
  },
  {
    id: 'R024',
    name: 'Input Validation — FluentValidation',
    severity: 'Warning',
    description:
      'Use FluentValidation for request DTO validation. No manual if-statement validation chains in controllers or services. Validators must be registered in DI.',
  },
  {
    id: 'R025',
    name: 'API Route Naming',
    severity: 'Warning',
    description:
      'Routes must use lowercase plural English resource names without hyphens (e.g., /api/v1/rulesets, not /api/v1/RuleSets or /api/v1/rule-sets).',
  },
  {
    id: 'R026',
    name: 'Swagger Configuration',
    severity: 'Info',
    description:
      'Configure Swagger via Insurity JSON:API Swagger extensions. All public controller actions must have XML documentation comments for Swagger.',
  },
  {
    id: 'R027',
    name: 'JWT Authentication',
    severity: 'Critical',
    description:
      'Use JWT Bearer authentication through Insurity security extensions. No custom auth middleware, no cookie auth, no non-JWT schemes.',
  },
  {
    id: 'R028',
    name: 'Application Identity in Non-Web Layers',
    severity: 'Critical',
    description:
      'Use IApplicationIdentity instead of IHttpContextAccessor in service and repository layers. Accessing HttpContext outside the controller layer is prohibited.',
  },
  {
    id: 'R029',
    name: 'Multi-Tenancy via IApplicationIdentity',
    severity: 'Critical',
    description:
      'TenantId must be sourced from IApplicationIdentity in the repository layer. TenantId must never be accepted from client request bodies or query parameters.',
  },
  {
    id: 'R030',
    name: 'Tenant Enforcement in DbContext',
    severity: 'Critical',
    description:
      'Apply EF Core global query filters scoped by TenantId. Override SaveChangesAsync to validate and stamp TenantId automatically. No unfiltered cross-tenant queries.',
  },
  {
    id: 'R031',
    name: 'Audit Fields',
    severity: 'Warning',
    description:
      'Populate CreatedBy, CreatedAt, ModifiedBy, ModifiedAt automatically in SaveChangesAsync. Controllers and services must not set these audit fields manually.',
  },
  {
    id: 'R032',
    name: 'Claims via Insurity Extension Methods',
    severity: 'Warning',
    description:
      'Use Insurity extension methods (GetName(), GetEmail(), GetTenant()) to read claims. No direct ClaimsPrincipal.Claims enumeration or FindFirst() calls.',
  },
  {
    id: 'R033',
    name: 'Logging to stdout',
    severity: 'Warning',
    description:
      'All logs must go to stdout via Microsoft.Extensions.Logging. No file-based sinks, no database logging, no Serilog File sink.',
  },
  {
    id: 'R034',
    name: 'LoggerMessage Source Generators',
    severity: 'Info',
    description:
      'Use [LoggerMessage] source generators for high-performance logging in hot code paths. Avoid LogInformation()/LogError() with string interpolation.',
  },
  {
    id: 'R035',
    name: 'Structured Logging',
    severity: 'Warning',
    description:
      'Use message templates with named placeholders: logger.LogInformation("Processing {RuleId}", id). Never use string interpolation ($"...") inside log calls.',
  },
  {
    id: 'R036',
    name: 'XML Documentation',
    severity: 'Info',
    description:
      'All public types and members must have XML doc comments (/// <summary>). CS1591 must be treated as a warning, not suppressed globally.',
  },
  {
    id: 'R037',
    name: 'PostgreSQL Snake_case Naming',
    severity: 'Warning',
    description:
      'Call UseSnakeCaseNamingConvention() in OnModelCreating. All EF-mapped tables, columns, indexes, and constraints must use snake_case.',
  },
  {
    id: 'R038',
    name: 'EF Core Configuration Strategy',
    severity: 'Warning',
    description:
      'Prefer EF Core conventions and data annotations. Use Fluent API only when annotations cannot express the constraint. Avoid redundant HasColumnName/HasPrecision when conventions cover it.',
  },
  {
    id: 'R039',
    name: 'Many-to-Many via UsingEntity',
    severity: 'Info',
    description:
      'Configure many-to-many relationships using EF Core UsingEntity(). No explicit join entity class unless the join table carries extra payload columns.',
  },
  {
    id: 'R040',
    name: 'No Hardcoded Secrets',
    severity: 'Critical',
    description:
      'Connection strings, API keys, and secrets must be stored outside source control using User Secrets, environment variables, or Azure Key Vault. No literal strings for passwords or keys in code.',
  },
  {
    id: 'R041',
    name: 'Health Check Endpoints',
    severity: 'Info',
    description:
      'Register and map ASP.NET Core health checks. Expose /health and /health/ready endpoints in Program.cs.',
  },
  {
    id: 'R042',
    name: 'Middleware Order in Program.cs',
    severity: 'Warning',
    description:
      'Program.cs must enable Insurity JSON:API middleware, Swagger, UseAuthentication, UseAuthorization, and health checks in the correct prescribed order.',
  },
];

/** Pre-built block injected into Claude prompts — stable across reviews. */
export const STANDARDS_PROMPT_BLOCK = CODING_STANDARDS.map(
  s => `${s.id} [${s.severity}] ${s.name}: ${s.description}`,
).join('\n');
