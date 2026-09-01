# ADR-003: Frontend State Management for AI Features

- **Date:** 2026-07-16
- **Deciders:** NAT 2.0 Platform Team

## Status

Accepted

## Context

The AI features in the Product Configurator frontend introduce two distinct categories of shared state:

1. **LOB (Line of Business) configuration** — selected carrier, LOB, state, and effective date. This data is fetched from the server and is referenced on multiple pages (filing ingestion, script generation, ASTRA Code Lens). It must stay fresh and be invalidated when the user changes their selection.

2. **Chat session continuity** — the active `ingestionId`, accumulated message history, and the current polling status for a filing ingestion job. This state must survive React re-renders and shallow in-page navigation (e.g., switching tabs within the configurator) but does not need to survive a full page reload.

The stack is React 19, TypeScript strict, TanStack Query v5, React Router v6, and Zustand is already a project dependency (used elsewhere in the shell). The team has two engineers available for AI feature work; minimizing boilerplate and onboarding cost is a priority.

## Decision

Use a **two-tier** state strategy:

### Tier 1 — Server state: TanStack Query v5
All data that originates on the server (LOB config options, filing metadata, ingestion job status) is managed exclusively by TanStack Query.

- `useQuery` / `useSuspenseQuery` for LOB config; `staleTime: 5 * 60 * 1000` (5 minutes) — config changes infrequently.
- `useQuery` with `refetchInterval: 2000` for ingestion job polling; the interval is disabled automatically when `status === 'Completed' | 'Failed'` via `enabled` / `refetchIntervalInBackground: false`.
- Cache invalidation via `queryClient.invalidateQueries(['lob-config'])` on user selection change.
- No manual `useEffect` + `fetch` anywhere in AI feature components.

### Tier 2 — Session state: module-level variables + `sessionStorage` fallback
The active `ingestionId` and chat message history are stored in **module-level variables** (`let activeIngestionId: string | null = null`) exported from a dedicated `ai-session.ts` module.

- Reading: components call `getActiveIngestionId()` / `getChatHistory()` — pure synchronous accessors.
- Writing: components call `setActiveIngestionId(id)` / `appendChatMessage(msg)` — mutate the module variable and write-through to `sessionStorage` (key: `nat2_ai_session`) so state survives a browser refresh within the same tab session.
- On module load, the module hydrates from `sessionStorage` if a persisted value is present.
- Components that need to react to session changes (e.g., the chat panel re-rendering on a new message) use a lightweight pub/sub: `subscribeToSession(callback)` / `unsubscribeFromSession(callback)` — a simple `Set<() => void>` of listeners called after each write.

This approach is intentionally minimal: two pieces of cross-cutting session state do not justify introducing a new global store.

## Alternatives Considered

### Zustand (global store for all AI state)
A dedicated `useAiStore` Zustand slice holding LOB config, ingestion ID, chat history, and polling status.

- **Pros:** Reactive everywhere in the React tree; devtools support; already a project dependency.
- **Cons:** For only two pieces of shared state, a Zustand slice is ceremony without payoff. Server state (LOB config, polling) would still need TanStack Query for cache invalidation and automatic refetch — duplicating state across Zustand and the Query cache creates sync bugs. Zustand is the right tool if the number of shared AI state pieces grows beyond ~5; not today.
- **Rejected:** Overkill given current scope. Re-evaluate if AI features expand to require >3 cross-cutting client state slices.

### Redux Toolkit
A Redux slice for AI feature state.

- **Pros:** Mature, excellent devtools, deterministic state transitions via reducers.
- **Cons:** High boilerplate (actions, reducers, selectors, store wiring). Redux is not currently in the project dependency tree — adding it for two state values is disproportionate. The team has agreed that Redux is not the preferred state primitive for this codebase.
- **Rejected:** Too much ceremony; not in the project's agreed technology set.

### React Context API
A `AiSessionContext` provider wrapping AI feature routes, with `useContext(AiSessionContext)` in consumers.

- **Pros:** No external library; familiar React primitive.
- **Cons:** Every state update re-renders all context consumers. For a chat panel that appends messages frequently, this causes unnecessary re-renders of unrelated sibling components (e.g., the LOB config form). Avoiding this requires `useMemo` + `useCallback` discipline that is easy to get wrong. Also risks prop-drilling the context value into deeply nested components if the AI feature grows.
- **Rejected:** Re-render behaviour at message-append frequency is a concrete performance risk; the module-variable + pub/sub approach gives the same "no prop drilling" benefit with surgical re-renders.

## Consequences

**Positive**

- TanStack Query handles cache invalidation, background refetch, deduplication of concurrent requests, and the polling `refetchInterval` lifecycle — no manual timer management in components.
- The module-variable session store is zero-dependency and trivially unit-testable: import the module, call the setters, assert the getters.
- `sessionStorage` write-through means chat history survives an accidental F5 within the same browser tab without requiring a server round-trip to reload it.
- Minimal boilerplate: the entire `ai-session.ts` module is expected to be under 80 lines.

**Negative / Risks**

- Module-level variables are **not reactive in the React tree** by default. Components that need to re-render on session changes must explicitly subscribe via `subscribeToSession`. Forgetting to subscribe (or to unsubscribe in a `useEffect` cleanup) is a source of stale-UI bugs.
- `sessionStorage` is tab-scoped. If the user opens a second tab for the same filing session, the two tabs do not share state — each tab has an independent `ai-session`. This is acceptable for the current single-tab UX; revisit if multi-tab collaboration is required.
- If the number of shared AI state slices grows significantly, the module-variable pattern will not scale cleanly. A Zustand slice should be introduced at that point rather than expanding the pub/sub surface.
- Server state (TanStack Query) and session state (module variables) live in separate systems with no shared invalidation primitive. Coordinating a "reset all AI state on user logout" event requires calling both `queryClient.clear()` and a `clearAiSession()` function — two calls that must not be forgotten independently.
