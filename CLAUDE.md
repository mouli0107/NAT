# NAT 2.0 — Architecture Reference

## Kendo UI Rules (APOLF/Rediker application)
Never use Playwright locators or smartFill() on Kendo widgets.
Always use helpers/kendo.ts functions.

| Control | Function | Example |
|---|---|---|
| DropDownList | selectKendoDropdown(page, inputId, text) | selectKendoDropdown(page, 'ddlSubmittedDate', 'Birth Date') |
| DateTimePicker | selectKendoDate(page, inputId, dateStr) | selectKendoDate(page, 'formStartDate', '04-08-2026 12:00 AM') |
| TreeView checkbox | checkKendoTreeNode(page, treeId, value) | checkKendoTreeNode(page, 'LoadSchoolProgramTreeView', '1') |
| Kendo Window alert | waitAndDismissAnyKendoAlert(page) | after every Save/Submit |

## 5-Layer Framework Structure
locators/     <- selectors only, one file per page, SHARED
pages/        <- methods only, imports locators, SHARED
actions/      <- business workflows, imports pages, SHARED
fixtures/     <- test data by TC ID, SHARED
tests/        <- one spec per TC, imports actions + fixtures only

## Adding a New Test Case
1. Record workflow in NAT 2.0
2. Click Generate Scripts
3. Enter: Module name, TC ID (auto-incremented), Test name
4. Click Save to Project
5. New files created: tests/{Module}/TC{id}_{Name}.spec.ts
6. Appended to: actions/business/{Module}.actions.ts
7. Appended to: fixtures/test-data.ts
8. Existing locators and pages: NOT modified

## Key Bugs Fixed (do not revert)
1. PW_RECORDER_INIT: use \\" not \' inside backtick template literals
2. _detectKendo(): removed .k-widget + querySelector block,
   walk-up max 5 levels not 10
3. kendoSelect(): use aria-owns to find listbox in body
4. DateTimePicker: use picker.enable(true) + picker.value() via jQuery
5. Duplicate events: handledKendoFields Set prevents double generation

## Running Tests
npx playwright test                          # all tests
npx playwright test tests/FormSettings/      # one module
npx playwright test tests/FormSettings/TC001 # one test case
npx playwright test --headed                 # see the browser

---

## Generator Fixes in server/script-writer-agent.ts (Apr 2026)
RULE: All fixes go in the generator only. Never touch generated project files.

### Fix 1 — Multi-POM imports (buildBusinessActionsPrompt)
- Imports ALL POM classes from pomContracts array, not just primary page
- Each contract: `import { ClassName } from '@pages/FileName'`
- Imports ONLY assertion functions actually called (not the full list)

### Fix 2 — Brand prefix always prepended (deriveNames)
- POM class names always start with brand from hostname
- Examples: OnespanContactUsPage, NousinfosystemsHomePage
- Capped at 40 chars; falls back to last URL segment if too long

### Fix 3 — contains() mandated for XPath (buildPageObjectPrompt Rule 21)
- CORRECT: xpath=//button[contains(normalize-space(text()),"Submit")]
- WRONG:   xpath=//button[normalize-space(text())="Submit"]
- Exact text equality in XPath is always banned

### Fix 4 — Popup/new-tab handling (buildBusinessActionsPrompt Rule 17)
```
const popupPromise = page.context().waitForEvent('page');
await pg.clickExternalLink();
const popup = await popupPromise;
await popup.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
await verifyUrl(popup as any, 'expected-path-or-domain');
```

### Fix 5 — Atomic test blocks (buildTestFilePrompt)
- Separate test() block for each distinct business scenario
- Boundaries: different URL path, topic shift, new-tab navigation

### Fix 6 — fullyParallel: true (buildPlaywrightConfig)
- Was generating false — now always true

### Fix 7 — PII guard in fixtures (genericPlaceholder)
- Real emails → test-user@example.com
- Real names → "Test" / "User"
- Real phones → "0000000000"

---

## Post-Generation Validator — server/validator/ (Apr 2026)
Documentation: server/validator/VALIDATOR-GATES.md
Self-tests: npx tsx server/validator/validator.test.ts → 10 passed, 0 failed

### Files
- index.ts        — validateGeneratedProject(outputDir) runs all 10 gates in parallel
- types.ts        — ValidationError, GateResult, ValidationResult interfaces
- reporter.ts     — buildPromptForRetry() formats errors back into Claude prompt
- runner.ts       — generateWithValidation() retry loop (max 3 attempts, then throws GenerationValidationError)

### 10 Gates (all run in parallel)
| Gate | File | Severity | What it catches |
|------|------|----------|-----------------|
| 01 | gate-01-typescript.ts | BLOCKER | TypeScript compile errors (npx tsc --noEmit) |
| 02 | gate-02-pom-purity.ts | BLOCKER/MAJOR | expect() in POM, hardcoded URLs, assert* method names |
| 03 | gate-03-locator-patterns.ts | MAJOR | Exact XPath text/href equality |
| 04 | gate-04-method-contracts.ts | BLOCKER | Method called on POM that doesn't exist (AST-based) |
| 05 | gate-05-file-manifest.ts | BLOCKER | Missing required files/directories |
| 06 | gate-06-naming.ts | BLOCKER | Garbled/session-ID class names |
| 07 | gate-07-fixtures.ts | BLOCKER/MAJOR | Real PII in fixture defaults |
| 08 | gate-08-imports.ts | MAJOR | Unused imports (AST-based, type-only excluded) |
| 09 | gate-09-test-structure.ts | MAJOR | Monolithic tests, unused context |
| 10 | gate-10-config-values.ts | BLOCKER/MAJOR | fullyParallel false, missing BASE_URL env var, old Playwright version |

### Retry Loop
generate → validate → [fail] → inject promptForRetry → generate → validate → [pass] → deliver
(max 3 attempts, then throws GenerationValidationError with full ValidationResult attached)

### Key Implementation Notes
- Gate 01 skips tsc if tsconfig.json absent (avoids false positives from parent tsconfig)
- Gate 03 regex uses lazy .*?: /normalize-space\(.*?\)\s*=\s*["']([^"']+)["']/
- Gates 04 and 08 use TypeScript AST (ts.createSourceFile) — not regex
- index.ts uses `export type { }` for ESM compatibility
