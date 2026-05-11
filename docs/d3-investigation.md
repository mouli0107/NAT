# D3 Investigation: Symbol-Contract Pipeline

**PR:** R2.3 — Investigation only. No `.ts`, `.json`, or `.yml` files were modified.  
**Date:** 2026-05-11  
**Author:** NAT 2.0 engineering  
**Status:** Complete — findings support Case C (contract passed, LLM ignores it)

---

## Section 1 — Pipeline Overview

The D3 symptom: business-action files call `pg.clickNewsNavLink()` when the POM only
exports `clickNewsLink()`. This causes a TypeScript compile error caught by Gate 01
(`TS2339: Property 'clickNewsNavLink' does not exist on type 'NousinfosystemsHomePage'`).

The symbol-contract pipeline is the chain that is supposed to prevent this:

```
Step 1  Claude generates POM (generate_page_object tool)
           └─► pomInput.methods = ['navigateTo', 'clickNewsLink', ...]

Step 2  Generator extracts methods → pomMethodContracts[]
           └─► { className, pageFile, methods: string[] }

Step 3  Merge with POMs already on disk (TC002+ projects)
           └─► mergedContracts[] = pomMethodContracts + existingContracts

Step 4  buildBusinessActionsPrompt() embeds mergedContracts as
        "POM METHOD CONTRACT — MANDATORY" inside the Claude prompt

Step 5  Claude generates business-actions file (generate_business_actions tool)
           └─► MAY call methods not in the contract  ← D3 failure point

Step 6  buildTestFilePrompt() receives only exportedFunctions (business action names)
           └─► does NOT receive the POM method contract
```

The contract IS computed and IS passed to the LLM (Step 4). The LLM does not always
honour it (Step 5). There is no post-generation validator that rejects invented symbols
before the file is written.

---

## Section 2 — Contract Computation (File + Line References)

All references are in `server/script-writer-agent.ts`.

### 2a. POM generation loop (lines 2860–2912)

For every URL page group, the generator calls:

```typescript
// line 2884
messages: [{ role: 'user', content: buildPageObjectPrompt(...) }]
```

Claude responds with a `generate_page_object` tool call. The structured output is
extracted at line 2887:

```typescript
let pomInput = extractToolInput<PomToolInput>(pomResponse.content, 'generate_page_object');
```

The page-file entry is pushed to `aiGeneratedFiles` at line 2904–2909 with metadata:

```typescript
aiGeneratedFiles.push({
  path: `pages/${pg}Page.ts`,
  content: pomInput.code.trim(),
  type: 'pom',
  metadata: { className: pomInput.className, locators: pomInput.locators,
              methods: pomInput.methods,   // ← exact names from Claude's tool output
              snapshotUsed: !!ariaSnapshot }
});
```

### 2b. Contract construction (lines 2954–2961)

After **all** POM loops complete, the contract is built in a single pass:

```typescript
const pomMethodContracts: PomMethodContract[] = aiGeneratedFiles
  .filter(f => f.type === 'pom' && f.path.startsWith('pages/'))
  .map(f => ({
    className: (f.metadata?.className as string) || '',
    pageFile:  f.path,
    methods:   ((f.metadata?.methods as string[]) || []),
  }))
  .filter(c => c.className && c.methods.length > 0);
```

**Timing:** this runs AFTER every POM file is generated and BEFORE
`buildBusinessActionsPrompt` is called. The sequence is:

```
lines 2860–2912  generatePagePom() loop (one call per page group)
lines 2954–2961  pomMethodContracts[] built from aiGeneratedFiles
lines 2963–2977  merge with disk POMs → mergedContracts[]
line  2984        yield status log "🔗 POM→Actions contract: …"
line  3010        buildBusinessActionsPrompt(…, mergedContracts) called
```

### 2c. Disk-merge for multi-TC projects (lines 2963–2977)

When TC002+ is added to an existing project, previously generated POM files already
exist on disk. `readExistingPomContracts(projectOutputDir)` (defined at lines 2696–2720)
AST-parses those files to extract public method names. Current-run contracts win over
disk contracts for any class generated in both.

### 2d. Contract embedding in the business-actions prompt (lines 1366–1391)

`buildBusinessActionsPrompt` (lines 1353–1492) renders the contract as a visible,
high-emphasis block:

```
════════════════════════════════════════════════════════
POM METHOD CONTRACT — MANDATORY
The following are the ONLY valid methods for each Page class.
DO NOT call any method not listed here. DO NOT invent method names.
If no suitable method exists for a step, skip that interaction.

NousinfosystemsHomePage (from pages/NousinfosystemsHomePage.ts):
  const pg = new NousinfosystemsHomePage(page);
  Callable methods: pg.navigateTo(), pg.clickNewsLink(), pg.verifyHeading()
════════════════════════════════════════════════════════
```

If `pomContracts` is empty or absent, the fallback text (lines 1382–1385) is used:

```
NOTE: No POM method contract provided — infer methods from the page class name.
      Use conservative, obvious method names (clickXxx, fillXxx, navigateTo).
```

### 2e. Test-file prompt (lines 1495–1506)

`buildTestFilePrompt` receives only `exportedFunctions` (the list of business action
function names). It does **not** receive `pomContracts`. The POM method-name contract
is therefore invisible to the test-file LLM call — this is correct by design because
test files call business actions, not POM methods directly.

---

## Section 3 — Data Source

The `methods` array that seeds the contract comes from **Claude's own structured tool
output**, specifically from the `generate_page_object` tool response field `methods`.

```typescript
// PomToolInput interface (extract)
interface PomToolInput {
  locatorsCode: string;
  code: string;
  className: string;
  locators: string[];
  methods: string[];   // ← Claude declares its own method names here
}
```

This means the contract is **self-reported by the LLM that wrote the POM**. If the
POM emitter LLM writes `clickNewsLink()` in the code but lists `clickNewsNavLink` in
the `methods` array, the contract will contain an incorrect method name. However, the
more common failure is the reverse: the code is correct, `methods` is correct, but the
downstream business-actions LLM ignores the contract and invents its own name.

**Key implication:** the contract is as reliable as the POM-generation LLM. If the
POM LLM writes a method and accurately lists it in `methods`, the contract is ground
truth. The unreliability lives downstream (Step 5 of the pipeline).

There is no cross-check step that parses the `pomInput.code` string and validates it
against `pomInput.methods`. Such a check would catch the rare case where the names
disagree within a single POM call.

---

## Section 4 — Case Determination: Case C

**Verdict: Case C — Contract is passed but the LLM ignores it.**

| Case | Description | Evidence |
|------|-------------|----------|
| A | Contract not computed | ❌ — Lines 2954–2961 prove it is computed |
| B | Contract not passed to emitter | ❌ — Line 3010 confirms `mergedContracts` is the 7th arg to `buildBusinessActionsPrompt` |
| **C** | **Contract passed, LLM ignores it** | ✅ — Prompt contains the "MANDATORY" block, but generated code calls `pg.clickNewsNavLink()` instead of `pg.clickNewsLink()` |

**Evidence for Case C:**

1. The status log on line 2984 (`🔗 POM→Actions contract: NousinfosystemsHomePage: [navigateTo, clickNewsLink, …]`)
   appears in the server console during generation, proving the contract was computed
   and handed off.

2. The `buildBusinessActionsPrompt` function embeds the contract in a
   high-visibility ASCII-boxed section (lines 1370–1381) with explicit `DO NOT` directives.

3. The failing output file (observed in `projects/Nous/actions/business/nousinfosystemshome.actions.ts`)
   contains `pg.clickNewsNavLink()` — a name not in the contract — while the POM at
   `pages/NousinfosystemsHomePage.ts` exports only `clickNewsLink`.

4. This is consistent with known Claude behaviour: natural-language directives in a
   prompt can be overridden by the model's learned priors for how method names should
   look. The model "knows" how navbar links are typically named and reconstructs a name
   (`clickNewsNavLink`) that is plausible but wrong.

**Sub-classification: C1 (soft advisory, no enforcement)**

The contract block uses the word "MANDATORY" but there is no post-generation step
that rejects the response if an invented symbol is found. The enforcement is purely
advisory. This is the direct root cause of D3.

---

## Section 5 — Retry Non-Determinism

### When the contract is computed

The contract is computed once per `generateFramework()` call (the async generator
function at the top level). If the caller (the API route handler or retry orchestrator)
calls `generateFramework()` multiple times, a fresh contract is computed each time.

### What changes on retry

On retry, the POM generation step runs again from scratch. Claude is a stochastic model,
so:

- `pomInput.methods` may contain different names on the second attempt
- The actual code in `pomInput.code` may use different names than `pomInput.methods`
  (self-inconsistency within a single POM call)
- The business-actions LLM call will receive a new contract, but may still invent names

This means that a pure retry without any additional steering may produce a different
set of invented names rather than fixing the problem. Gate 01 may catch different
`TS2339` errors on the second attempt than the first.

### Retry context (retryContext / buildRetryPreamble)

The retry system (`runner.ts`) passes the previous generation's errors back as a
`retryContext` preamble (line 3010 shows `retryContext ? buildRetryPreamble(retryContext) : ''`
prepended to the business-actions prompt). This gives the business-actions LLM
visibility into which method calls failed TypeScript compilation, which can guide
correction — but only if the error message names the specific offending symbol.

Gate 01 TypeScript errors do name the symbol (`TS2339: Property 'X' does not exist`),
so the retry path has a partial signal to work with. However, the LLM must then
cross-reference the error with the contract to find the correct replacement, which is
the same reasoning step it failed to perform on the first attempt.

### Assessment

Retry alone is insufficient to reliably fix D3. The non-determinism in POM method
naming means a structural fix is needed before the retry loop can be depended upon.

---

## Section 6 — Implementation Cost Estimate and Fix Recommendations

### Fix F1 — Strict post-generation symbol validator (Gate 11) — **Recommended**

**What:** After the business-actions file is generated, parse it with the TypeScript
AST and extract every `pg.XYZ()` call. Cross-check each `XYZ` against
`mergedContracts[i].methods`. Any name not in the contract is flagged as a
`BLOCKER` error (`INVENTED_POM_METHOD`).

**Effect:** Turns Case C1 (soft advisory) into C2 (enforced). The existing retry
loop then has precise error messages (`invented method 'clickNewsNavLink'; valid
methods are: [clickNewsLink]`) that the LLM can act on.

**Effort:** 1 day  
**Files touched:** `server/validator/gates/gate-11-pom-method-usage.ts` (new),
`server/validator/index.ts` (add gate), `server/validator/validator.test.ts`
(add self-tests), `server/validator/VALIDATOR-GATES.md` (update table)

**Risk:** Low. Gate is additive; does not change generation logic.

---

### Fix F2 — Structured-output contract injection (prompt hardening)

**What:** In `buildBusinessActionsPrompt`, change the contract rendering from a
human-readable ASCII block to a JSON structure placed in a `<tool_result>` or
`<contract>` XML tag, which models follow more reliably than free-text instructions.

**Effort:** 0.5 days  
**Files touched:** `server/script-writer-agent.ts` (prompt only)  
**Risk:** Medium. Changing prompt structure may affect other aspects of generation
quality. Requires re-blessing canonical fixtures.

---

### Fix F3 — Self-consistency check within POM generation

**What:** After `generate_page_object` returns, parse `pomInput.code` with the
TypeScript AST and compare extracted method names against `pomInput.methods`.
If they disagree, log a warning and use the AST-extracted names for the contract
(ground truth from code rather than self-report from LLM).

**Effort:** 0.5 days  
**Files touched:** `server/script-writer-agent.ts` (after line 2912)  
**Risk:** Low. Purely additive; fallback to current behaviour if AST parse fails.

---

### Recommended sequence

| Priority | Fix | Effort | Unlocks |
|----------|-----|--------|---------|
| 1 (D3-Fix) | F1 — Gate 11 symbol validator | 1 day | Catches invented methods, gives retry precise signal |
| 2 | F3 — Self-consistency check | 0.5 days | Ensures contract is accurate before F1 validates against it |
| 3 | F2 — Prompt hardening | 0.5 days | Reduces frequency of violations, lowering retry count |

**Total estimated effort:** 2 days for all three fixes.

Gate 01 (TypeScript compile) already catches the resulting `TS2339` errors, so D3
failures are never silently shipped. The cost of the current approach is wasted retry
attempts and occasional `GenerationValidationError` thrown to the user after 3 failures.
The Gate 11 + F3 combination eliminates the wasted retries and gives the retry loop
enough signal to self-correct in one pass.
