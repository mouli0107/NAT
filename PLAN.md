# NAT 2.0 — DevX QE Platform: Master Plan

## North Star
**Option A — Mechanical Automation with Human-in-the-Loop**
AI handles all mechanical work. Humans handle judgment.
Not "fully autonomous." Honest, sellable, achievable.

---

## The Pitch
> "Record your workflow once. Get a full regression test suite.
> Runs automatically on every deployment.
> Your QA engineers spend 100% of their time on judgment — not script writing."

---

## Current Task
**STEP 2 — Recorder Agent: process raw events → structured page knowledge**
Status: NOT STARTED

## Completed
**STEP 1 — Chrome Extension (Recorder)** ✅
- chrome-extension/manifest.json, content.js, background.js, popup.html, popup.js
- server/recorder-ws.ts (WebSocket server + SSE + session management)
- client/src/pages/recorder.tsx (Recording Studio UI with agent orbs)
- Routes wired: /recorder, sidebar entry added

## Next Task
**STEP 2 — NAT 2.0 receives and processes recordings**

---

## What "Already Built" Is Worth Keeping

| Keep | Reason |
|---|---|
| React shell + routing + pages | Solid UI structure |
| PostgreSQL + Drizzle schema | Data layer is fine |
| Playwright service (browser control) | Actual browser automation works |
| Claude API + SSE streaming | Infrastructure is good |
| Auth + user system | No reason to rebuild |

## What We Are Rebuilding (Internals Only)

| Throw Away | Replace With |
|---|---|
| Fake agent animations | Real agent loop — agent does work before updating UI |
| One-shot Claude prompt → display | Observe → Act → Verify loop per agent |
| Crawl = navigate + screenshot | Recording = human interaction captured by extension |
| Generic rule-based test cases | AI-generated from structured recording data |
| Scripts with broken selectors | Scripts using Playwright semantic locators |

### Rule: Every agent card on screen must represent a REAL process running in the backend.

---

## Full Pipeline (End to End)

```
[User records workflow in real browser]
            ↓
  Chrome Extension captures:
  - Every click (with semantic selector)
  - Every input (label + value)
  - Every navigation (URL + page title)
  - Every API call (request + response)
            ↓
  NAT 2.0 receives recording via WebSocket
            ↓
  Recorder Agent structures raw events into:
  - Page objects (pages[], elements[], flows[])
  - API contracts (api_calls[])
  - Selector candidates (ranked by stability)
            ↓
  Script Writer Agent generates:
  - TypeScript POM classes per page
  - Gherkin BDD feature files per flow
  - AI-written meaningful test cases
            ↓
  [HUMAN CHECKPOINT] Review test cases + scripts  ✋
            ↓
  Executor Agent runs Playwright scripts
            ↓
  Fixer Agent auto-repairs failures (1 retry max)
            ↓
  [HUMAN CHECKPOINT] Review execution report      ✋
            ↓
  [HUMAN CHECKPOINT] Sign off on coverage         ✋
```

---

## The 4 Agents

### Agent 1 — Recorder Agent

**What it does:**
Processes raw Chrome Extension events into structured page knowledge.
Stores everything in DB for downstream agents to consume.

**Skills:**
- Parse Chrome Extension events (clicks, inputs, navigation, XHR/fetch)
- Identify page boundaries (URL change = new page)
- Extract selectors using priority ladder (see below)
- Detect form flows and user journeys
- Identify app type (login, checkout, dashboard, form, table, etc.)
- Detect framework (React/Angular/Vue) and adjust selector strategy

**Memory (reads):** Nothing — starts fresh per recording session
**Memory (writes):** `pages[]`, `elements[]`, `flows[]`, `api_calls[]`, `selector_candidates[]`

---

### Agent 2 — Script Writer Agent

**What it does:**
Reads structured recording data. Generates POM classes, BDD feature files,
and AI-written meaningful test cases using Claude.

**Skills:**
- Read structured page knowledge from DB
- Build compact context JSON per flow (~500 tokens, NOT raw HTML)
- Call Claude with structured context to generate test cases
- Generate TypeScript POM class per page
- Generate Gherkin BDD `.feature` file per flow
- Validate selectors exist on live page before saving
- Apply business context provided by user (optional text field)

**Memory (reads):** `pages[]`, `elements[]`, `flows[]`, `api_calls[]` from DB
**Memory (writes):** `test_cases[]`, `scripts[]` in DB

**Token Strategy:**
- Send structured JSON (~500 tokens), NOT raw HTML (~50,000 tokens)
- One Claude call per recorded flow (not per page, not for entire app)
- User provides one-time business context paragraph → reused across all calls
- Claude always generates: happy path, negative, boundary, security, UX, API test cases

---

### Agent 3 — Executor Agent

**What it does:**
Loads generated scripts from DB. Runs them via Playwright.
Captures pass/fail, screenshots, duration per test case.

**Skills:**
- Load scripts from DB by session/flow
- Spawn Playwright with correct browser (Chromium/Firefox/WebKit)
- Capture screenshot at each test step
- Record pass/fail/duration/error per test case
- Stream live progress to NAT 2.0 UI via SSE

**Memory (reads):** `scripts[]`, `test_cases[]` from DB
**Memory (writes):** `execution_results[]`, `screenshots[]` in DB

---

### Agent 4 — Fixer Agent

**What it does:**
On script failure, reads the error + broken script → asks Claude to fix it → retries once.
If still fails after retry → marks as "needs human review." Never loops forever.

**Skills:**
- Read failed execution result + error message + screenshot
- Send to Claude: broken script + error + page context → get fixed script
- Validate fixed script syntax before running
- Re-run fixed script once
- If passes → update script in DB, mark as auto-fixed
- If still fails → mark as "needs human review", escalate to user

**Memory (reads):** `execution_results[]` (failed), `scripts[]`, `pages[]`
**Memory (writes):** `scripts[]` (updated with fix), `fix_attempts[]` (prevents infinite loops)

---

## Selector Priority Ladder (Dynamic UI Strategy)

Modern React/Angular apps generate dynamic IDs and class names that change on every render.
The extension captures multiple selectors per element and ranks by stability:

```
RANK  TYPE              EXAMPLE                              STABILITY
1     data-testid       [data-testid='login-btn']            Highest — developer set
2     aria-label        [aria-label='Sign In']               High — accessibility
3     name attribute    [name='username']                    High — form field
4     role + text       button:has-text('Sign In')           Medium — changes if copy changes
5     placeholder       [placeholder='Enter email']          Medium
6     xpath structural  //form//button[@type='submit']       Medium
7     semantic class    .login-btn (hand-written looking)    Low — check if meaningful
8     id (static-look)  #submit-button                       Low — only if not generated
X     generated id      #react-select-3-input                NEVER USE
X     hashed class      .btn_xk29a                           NEVER USE
X     nth-child         :nth-child(3)                        NEVER USE
```

**Generated scripts use Playwright semantic locators, not raw selectors:**
```typescript
// Never:
await page.click('#react-select-3-input');

// Always:
await page.getByRole('button', { name: 'Sign In' }).click();
await page.getByLabel('Email').fill('user@example.com');
await page.getByTestId('login-btn').click();
```

**Self-healing:** When rank-1 selector breaks at execution time, Fixer Agent
tries rank-2, rank-3, etc. Updates primary selector in DB. Learns over time.

---

## AI Test Case Generation — Context Assembly Strategy

**Problem:** Raw HTML of one React page = 50,000+ tokens. Token limit hit immediately.
**Solution:** Assemble rich but compact context from multiple sources.

### Context Sources (4 Layers)

```
LAYER 1 — Recording Data (Chrome Extension)     ~500 tokens
  What the user actually did in the app.
  Pages visited, elements interacted, API calls made.

LAYER 2 — Requirements Context                  ~300-500 tokens
  WHY the feature exists and WHAT it should do.
  Source A: ADO User Stories + Acceptance Criteria (pulled via existing ADO integration)
  Source B: BRD documents (uploaded as PDF/Word → chunked → stored in DB)
  Retrieval: RAG — only fetch chunks relevant to current flow being tested

LAYER 3 — Existing Framework Pattern            ~200 tokens
  HOW your team writes tests.
  Source: Framework Catalog (already built in NAT 2.0)
  Provides: folder structure, class naming, assertion style, BDD conventions

LAYER 4 — Business Context (user-provided)      ~100 tokens
  One paragraph typed by user once per project.
  Example: "Commercial insurance quoting platform for mid-market businesses."
  Reused across all Claude calls for this project.
```

**Total context per flow: ~1,100-1,300 tokens. Well within limits.**

### What We Send to Claude Per Flow

```json
{
  "layer1_recording": {
    "page": "Login Page",
    "url": "/login",
    "appType": "authentication",
    "elements": [
      { "label": "Email", "type": "email", "required": true, "validation": "email format" },
      { "label": "Password", "type": "password", "required": true, "minLength": 8 },
      { "label": "Sign In", "type": "submit" }
    ],
    "apiCalls": [
      { "method": "POST", "endpoint": "/api/auth/login",
        "successStatus": 200, "errorMessages": ["Invalid credentials", "Account locked"] }
    ],
    "recordedFlow": "User entered email → password → clicked Sign In → redirected /dashboard"
  },
  "layer2_requirements": {
    "userStory": "As a broker, I want to log in securely so I can access my policy dashboard",
    "acceptanceCriteria": [
      "Login must fail with invalid credentials",
      "Account locks after 5 failed attempts",
      "Session expires after 30 minutes of inactivity",
      "MFA required for admin users"
    ],
    "brdExcerpt": "Authentication must comply with SOC2 requirements..."
  },
  "layer3_framework": {
    "tool": "Playwright",
    "language": "TypeScript",
    "pattern": "Page Object Model",
    "namingConvention": "LoginPage.ts, login.feature",
    "assertionStyle": "expect(locator).toBeVisible()"
  },
  "layer4_businessContext": "Commercial insurance quoting platform for mid-market businesses."
}
```

### The Power of Combining All 4 Layers

**Recording alone** generates:
> "Verify login button is clickable"

**Recording + Requirements** generates:
> "TC-006: Account locks after 5 failed login attempts (per AC-3)
>  TC-007: Session expires after 30 min inactivity — user redirected to login
>  TC-008: MFA prompt appears for admin role users"

**These test cases come from AC, not from what the user recorded.**
The agent finds gaps between what was recorded and what was required.

### Gap Detection (Bonus Intelligence)
Script Writer Agent compares recording vs acceptance criteria:
- AC says "session expires after 30 min" but no session timeout was recorded
- Agent flags: "TC-007 could not be recorded. Manual verification required." ← Human checkpoint
- This surfaces missing test coverage automatically.

**Claude always generates these test case types:**
| Type | Source |
|---|---|
| Happy path | Recording |
| Negative | Recording + AC |
| Boundary | AC + element validation rules |
| Security | AC + BRD compliance requirements |
| UI/UX | Recording (error messages, loading states) |
| API | Captured API calls from recording |
| Gap cases | AC items not covered by recording → flagged for human |

---

## BRD / Document Ingestion — How It Works

```
User uploads BRD (PDF/Word/Confluence URL)
        ↓
Server chunks document into ~500-token semantic sections
        ↓
Each chunk stored in DB with embedding vector (pgvector)
        ↓
When Script Writer Agent runs for a flow:
  → Searches DB: "chunks relevant to login authentication"
  → Retrieves top 3 most relevant chunks (~300 tokens)
  → Injects into Layer 2 context
        ↓
Claude writes test cases informed by real BRD content
```

**This is RAG (Retrieval Augmented Generation).**
Never sends the whole BRD. Only sends what's relevant. Token-safe.

---

## ADO User Stories — How It Works

**Already built:** ADO integration exists in Integration Management.
**What we add:** Link a NAT 2.0 recording session to an ADO User Story.

```
User starts recording → selects linked ADO story (dropdown, pulls from ADO API)
        ↓
Story title + description + acceptance criteria fetched → stored with session
        ↓
Script Writer Agent reads AC items from DB (not from API — already cached)
        ↓
Claude generates test cases that directly map to AC items
        ↓
Each test case references its source AC: "TC-003 [AC-2: Account lockout after 5 attempts]"
```

**Traceability:** Every generated test case links back to an ADO user story.
Managers can see: "Story X has 8 test cases, 6 passing, 2 failing."

---

## Chrome Extension — Technical Spec

**Confirmed decisions:**
- Browsers: Chrome + Edge (same Manifest V3, zero extra work)
- Server port: 5000
- Session ID: NAT 2.0 generates code → user types into extension popup (Option 1)

**Files:**
```
chrome-extension/
  manifest.json       — Permissions: activeTab, scripting, storage, webRequest
  content.js          — Injected into every page. Captures DOM events.
  background.js       — Service worker. Manages WebSocket to server.
  popup.html          — Extension toolbar popup. Session ID entry + start/stop.
  popup.js            — Popup logic.
  icons/              — 16, 48, 128px icons
```

**Event capture in content.js:**
- `click` → element + all selector candidates (ranked)
- `input/change` → label + value (PII-aware: mask password fields)
- `navigation` → URL + page title + timestamp
- `fetch/XHR` → method + URL + request body + response status + response body

**Communication flow:**
```
content.js captures event
    → postMessage to background.js
    → background.js sends via WebSocket to server (port 5000)
    → server broadcasts via SSE to NAT 2.0 UI
    → NAT 2.0 UI shows live recording feed
```

**Session linking:**
```
NAT 2.0 UI: click "Start Recording" → server generates session code (e.g. "ABC-4821")
User: opens extension popup → types "ABC-4821" → clicks Connect
Server: links extension WebSocket connection to NAT 2.0 SSE session
Recording events flow from extension → server → NAT 2.0 UI in real time
```

---

## Build Order

### Week 1 — Chrome Extension + Server Receiver ✅ COMPLETE
- [x] Chrome Extension (manifest, content.js, background.js, popup)
- [x] Server WebSocket endpoint to receive extension events
- [x] Server generates session codes
- [x] NAT 2.0 UI: Recording Studio with agent orbs + live event feed

### Week 2 — Recorder Agent + Script Writer Agent
- [ ] DB schema: pages, elements, flows, api_calls, selector_candidates, test_cases, scripts
- [ ] Recorder Agent: process raw events → structured page knowledge
- [ ] Script Writer Agent: structured JSON → Claude → test cases + POM + BDD
- [ ] Monaco editor for human review of test cases + scripts

### Week 3 — Executor Agent + Fixer Agent
- [ ] Executor Agent: load scripts → run Playwright → stream results via SSE
- [ ] Fixer Agent: failure → Claude fix → retry once → escalate if still failing
- [ ] Live screenshot feed during execution (already partially built)

### Week 4 — Human Review UI + Report
- [ ] Test case review screen (human checkpoint 1)
- [ ] Script review screen with Monaco editor (human checkpoint 2)
- [ ] Execution report screen (human checkpoint 3)
- [ ] Download scripts as ZIP
- [ ] Export report as PDF/HTML

---

## Working Rules

1. **One task at a time.** Current task is always in "Current Task" at top of this file.
2. **No rabbit holes.** If discussion goes 3+ exchanges without code → flag it.
3. **No theater.** Every agent card = real process running in backend.
4. **Human checkpoints are features**, not limitations. Market them as such.
5. **Update this file** after every completed task.

---

## Backlog (Do Not Touch Until Current Task Done)

- Chrome Web Store publishing (for enterprise client distribution)
- Self-healing selector improvement over multiple runs
- Per-client knowledge base (pgvector embeddings)
- CI/CD integration (trigger test run on git push)
- Multi-user collaboration on test suites
- Video recording of test execution
- Slack/Teams notification on test failure
