# ADR-002: Async Filing Ingestion Pattern

- **Date:** 2026-07-16
- **Deciders:** NAT 2.0 Platform Team

## Status

Accepted

## Context

Parsing a filing document with Claude takes between 5 and 30 seconds depending on document length, number of pages, and current API response time. A synchronous HTTP request-response cycle is not viable: load balancers impose 30-second hard timeouts, mobile and flaky network clients may drop connections, and a slow Claude response holds a server thread for the full duration.

The ingestion endpoint (`POST /api/filings/ingest`) must therefore return control to the client immediately while the parsing work continues asynchronously in the background. The client needs a reliable mechanism to learn when the work is complete and retrieve the result.

The solution must:
- Work correctly behind an Azure Application Gateway (no sticky sessions, no upgrade to WebSocket by default)
- Require no additional Azure infrastructure beyond App Service + SQL/Cosmos
- Be implementable by a single-team in one sprint
- Support idempotent result retrieval (safe to retry GET on network failure)

## Decision

Use the **202 Accepted + client polling** pattern.

1. `POST /api/filings/ingest` validates the request, enqueues the job (in-process `Channel<T>` or background `IHostedService` worker), writes an `IngestionJob` row to the database with `Status = Queued`, and returns `HTTP 202` with body `{ "ingestionId": "<guid>" }`. Typical response time: < 200 ms.
2. A background worker processes the job: calls Claude via `IAnthropicClient`, writes parsed output back to the `IngestionJob` row, sets `Status = Completed | Failed`.
3. The client polls `GET /api/filings/ingest/{ingestionId}` every **2 seconds**. The endpoint returns the current `status` and, when `Completed`, the full parsed payload. When `Failed`, it returns an `error` field with a human-readable message.
4. Poll responses include a `retryAfterMs` hint (default 2000) so the server can back-pressure clients if the queue is saturated.
5. Completed jobs are retained for **24 hours** then soft-deleted; clients that poll after expiry receive `404`.

## Alternatives Considered

### WebSocket (persistent bidirectional connection)
Server pushes a `job.completed` event when Claude finishes.

- **Pros:** Zero polling overhead; instant notification.
- **Cons:** Azure Application Gateway requires explicit WebSocket support configuration (an infrastructure change needing ops approval). Connection management (reconnect on drop, heartbeat) adds non-trivial client complexity. Overkill for a low-frequency, high-latency operation like filing ingestion.
- **Rejected:** Infrastructure dependency and connection-management cost outweigh the latency improvement over 2-second polling.

### Server-Sent Events (SSE)
Server sends a stream of `text/event-stream` events from the POST endpoint or a dedicated SSE endpoint.

- **Pros:** Simpler than WebSocket; HTTP/1.1 compatible; browser EventSource API is well-supported.
- **Cons:** SSE requires careful CORS `Access-Control-Allow-Origin` configuration because the browser holds an open connection to a different origin. Azure App Gateway may buffer SSE frames, causing perceived latency. Proxy and CDN layers frequently close idle SSE connections requiring client-side reconnect logic.
- **Rejected:** CORS configuration burden and proxy-layer fragility ruled it out for an environment where the exact gateway/CDN stack may evolve.

### Synchronous Response (blocking until Claude completes)
Hold the HTTP connection open for the full Claude round-trip.

- **Pros:** Simplest client code — one POST, one response.
- **Cons:** Azure Application Gateway default timeout is 30 seconds; Claude can exceed this. Server thread is blocked for up to 30 seconds per request, limiting throughput. Network drops during the wait lose the result entirely.
- **Rejected:** Timeout and throughput risks are unacceptable in production.

### Long Polling
Client sends GET that the server holds open until the job completes or a timeout (e.g., 20 s) fires, then the client re-polls.

- **Pros:** Lower poll frequency than short polling; no persistent connection.
- **Cons:** Holds a server thread per waiting client for up to 20 seconds — worse than synchronous for throughput at scale. Load-balancer timeout configuration must be coordinated across environments. Harder to reason about than simple 2-second interval polling.
- **Rejected:** Server resource consumption at scale is worse than short polling for this use case.

## Consequences

**Positive**

- The pattern is stateless from the load balancer's perspective: any App Service instance can serve any poll request because job state lives in the shared database.
- Polling is naturally idempotent — retrying a `GET` after a network failure has no side effects.
- Client implementation is simple: a `setInterval` loop (or React `useQuery` with `refetchInterval`) that reads `status` and stops when `Completed | Failed`.
- No additional Azure services (Service Bus, SignalR Hub) are required for this pattern, keeping the infrastructure footprint small.
- Back-pressure is achievable server-side via `retryAfterMs` without changing the protocol.

**Negative / Risks**

- Polling overhead: a client waiting 30 seconds issues approximately 15 GET requests. At 100 concurrent ingestions, that is ~1,500 req/min of polling traffic. Acceptable at current scale; revisit if concurrent ingestion count grows significantly.
- The 2-second poll interval means the client sees the result at most 2 seconds after the job actually completes. This latency is acceptable for a filing ingestion workflow (not a real-time UX).
- Job retention cleanup (24-hour soft-delete) requires a recurring background job or scheduled Azure Function; a missing cleanup task causes unbounded database growth.
