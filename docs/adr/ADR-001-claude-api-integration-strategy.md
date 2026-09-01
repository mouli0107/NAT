# ADR-001: Claude API Integration Strategy

- **Date:** 2026-07-16
- **Deciders:** NAT 2.0 Platform Team

## Status

Accepted

## Context

NAT 2.0 requires Anthropic Claude API access from a .NET 8 backend to power script generation, ASTRA Code Lens analysis, and the post-generation validator retry loop. Three integration paths were evaluated: a direct HTTP client, a Python sidecar process, and the official Anthropic .NET SDK.

The integration must support:
- Streaming responses for long-running generation tasks (30+ second Claude calls)
- Reliable authentication and automatic retry on transient failures
- Mockable interfaces for unit testing (NSubstitute-compatible)
- A single, consistent client lifecycle managed by .NET DI

## Decision

Use the **official Anthropic .NET SDK** (NuGet package `Anthropic`) as the sole HTTP transport layer.

- Register `IAnthropicClient` as a **DI singleton** in `Program.cs` / `Startup.cs`.
- Wrap domain-specific Claude calls (script generation, code lens, validator retry) in dedicated **service wrappers** that each inject `IAnthropicClient`. No caller outside a service wrapper touches the SDK directly.
- API key sourced from `IConfiguration` (`Anthropic:ApiKey`) — never hard-coded.
- Streaming responses consumed via the SDK's async enumerable; callers subscribe through the service wrapper interface.

## Alternatives Considered

### Direct HTTP (`HttpClient` + `IHttpClientFactory`)
Wrapping the Anthropic REST API manually with `HttpClient`.

- **Pros:** No external SDK dependency; full control over request shape.
- **Cons:** Requires hand-rolling authentication header injection, exponential-back-off retry logic, streaming SSE parsing, and model-version negotiation. Significant boilerplate that duplicates what the SDK already provides correctly.
- **Rejected:** The maintenance surface outweighs the dependency concern for a stable, first-party SDK.

### Python Sidecar Process
A Python FastAPI/Flask process hosting the `anthropic` Python SDK, called via internal HTTP from the .NET service.

- **Pros:** Full parity with the Python SDK feature set; familiar to ML engineers.
- **Cons:** Polyglot deployment (two runtimes in the container or separate containers), inter-process latency on every Claude call, two separate secret-management surfaces, additional Docker layer, and no type-safety at the boundary.
- **Rejected:** The operational complexity penalty is unacceptable for a team deploying to Azure App Service with a single-container target.

## Consequences

**Positive**

- `IAnthropicClient` can be mocked with NSubstitute in unit tests, giving full control over simulated Claude responses without live API calls.
- The SDK handles OAuth/API-key header injection, TLS, model-version routing, and automatic retry on 429/5xx — no bespoke retry logic required in application code.
- Streaming is supported natively via `IAsyncEnumerable<T>`; the service wrappers surface a clean streaming interface to callers.
- Upgrading model versions (e.g., `claude-sonnet-4-6` → next) is a single configuration-value change.

**Negative / Risks**

- Introduces a NuGet SDK version dependency. Breaking changes in a future major SDK version require coordinated upgrade work.
- The SDK's internal retry behaviour (back-off curve, max attempts) is opaque; teams must read SDK release notes to understand changes in retry semantics.
- If Anthropic deprecates a model referenced by name in configuration, callers will receive runtime errors until the config value is updated — no compile-time guard.

**Neutral**

- All Claude model parameters (`max_tokens`, `temperature`, `system`) are owned by the service wrappers; callers pass domain objects, not raw API structs. This isolates SDK API shape changes to one layer.
