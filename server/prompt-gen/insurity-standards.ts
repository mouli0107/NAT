/**
 * insurity-standards.ts — default Insurity coding standards + package guidance
 * that Ascent injects into EVERY generation so the produced prompts are inline
 * with Insurity conventions, even when the user uploads no CLAUDE.md.
 *
 * Condensed from the ASTRA Code Lens Insurity standards catalog (server/
 * codelens-standards.ts). Kept compact (a summary, not the full 42-rule text) so
 * it fits the context budget on every prompt.
 */

export const INSURITY_STANDARDS = [
  'INSURITY CODING STANDARDS (must be followed — the generated code is reviewed against these):',
  '- Architecture: strict layered Clean Architecture — Domain, Application, Infrastructure, API. No layer skips.',
  '- Application layer must NOT reference DbContext or EF Core; persistence stays in Infrastructure.',
  '- Repository pattern: repositories own persistence; NEVER call .Update() in repositories (EF change tracking).',
  '- HTTP: expose PATCH for updates (not PUT). Follow the JSON:API framework for requests/responses.',
  '- Multi-tenancy: enforce tenant isolation via IApplicationIdentity; tenant filters applied in the DbContext.',
  '- Identity/claims: read identity and claims via the Insurity extension methods / IApplicationIdentity — never parse tokens by hand.',
  '- Object mapping: NO AutoMapper — map via hand-written extension methods.',
  '- DTOs: separate request/response DTOs, derived from the Insurity DTO base classes; use Filter Criteria classes for queries.',
  '- Controllers: thin, derive from the Insurity controller base class; delegate to the Application layer only.',
  '- Validation: FluentValidation validators for all inputs.',
  '- Persistence: PostgreSQL with snake_case naming; EF Core fluent configuration classes; many-to-many via UsingEntity.',
  '- Audit fields on entities; JWT authentication; secrets never hardcoded; health-check endpoints; correct middleware order in Program.cs.',
  '- Logging: structured logging to stdout using LoggerMessage source generators.',
  '- XML documentation on public members. Target the standard .NET framework version for the platform.',
].join('\n');

export const INSURITY_PACKAGES = [
  'USE THE INSURITY SHARED PACKAGES — do not reinvent cross-cutting concerns:',
  '- Use the Insurity framework packages for JSON:API, DTO/controller base classes, IApplicationIdentity, claims',
  '  extension methods, tenant enforcement, audit, and logging source generators.',
  '- Prefer the existing Insurity NuGet packages / shared libraries over writing new infrastructure or helpers.',
  '- When an Insurity base class, interface, or extension method exists for a concern, extend/use it rather than',
  '  creating a parallel implementation. Reference the exact Insurity type names in the generated code.',
].join('\n');

/** Combined block injected into the assembled context. */
export function insurityStandardsBlock(): string {
  return `${INSURITY_STANDARDS}\n\n${INSURITY_PACKAGES}`;
}
