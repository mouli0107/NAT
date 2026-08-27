# Test case quality fix — Generate from User Story

Fixes the 1,050-cases-for-12-stories problem: severe duplication, templated 6-step
bodies, narrative in titles, truncated text, and duplicate IDs.

Run the proof:

```bash
npx tsx server/testcase/verify.ts
```

```bash
npx tsx server/testcase/audit-steps.ts
```

```bash
npx tsx server/testcase/export-xlsx.ts ./test-cases.xlsx
```

## Result on the 12-story verification set

| Metric | Before | After |
|---|---|---|
| Total test cases | 1050 | 51 |
| Unique intents | 330 | 51 |
| Cases with exactly 6 steps | 1050 | 11 |
| Step count range | 6 to 6 | 3 to 16 |
| Duplicate IDs | 689 | 0 |
| Banned phrase hits | 6336 | 0 |

All 12 assertions (V1 to V12) pass. The "Before" column is the reported baseline of
the original 12-story run; the exact source stories for that run were not supplied,
so `verify.ts` uses 12 representative stories spanning SIMPLE, STANDARD, and COMPLEX
workflows. Every "After" number is computed from a live run of the pipeline.

On the real 12 Sale Qty Restriction stories (`stories-single-sale.ts`, 80 acceptance
criteria) the pipeline produces 152 test cases and 786 steps, with 0 coverage gaps,
0 duplicate IDs, and all 12 stories passing the guardrail gate.

## Where the old numbers came from

| Symptom | Root cause | Fix |
|---|---|---|
| 1050 cases | Variant fan-out per AC, no de-duplication | `merge.ts` intent merge + `cap.ts` per-story cap |
| Every case 6 steps | The QA Refiner prompt carried a literal 6-step JSON skeleton | Step count is now derived from the AC workflow and is a contract the refiner must preserve |
| 689 duplicate IDs | IDs were renumbered per category twice (`FUNC-1`, then `FUN-1`), restarting at 1 for every story | IDs are `TC-<StoryID>-<seq>`, assigned once, asserted unique |
| Narrative in titles | Titles were built from the "As a / I want" prefix | `vocab.stripNarrative` plus `titleFromAC`; G02 enforces it |
| Templated prose | Fixed filler phrases | `BANNED_PHRASES` plus G06 |
| Refiner reintroduced duplicates | Batches of 8 sent in isolation, blind to sibling cases | One call per story with the complete merged set |

## Pipeline

```
parse ACs -> build vocabulary (ACs + attached docs, never the narrative)
          -> generate candidates (1 positive, 1 negative, optional edge per AC)
          -> merge by intent key      [TC-Merge]
          -> cap by risk              [TC-Cap]
          -> traceability matrix
          -> guardrail gate G01-G14   [Guardrail]
          -> QA Refiner, ONE call with the full set   [TC-Refine]
          -> guardrail gate again, reject-and-revert on failure
          -> storage
```

The gate runs twice on purpose. The deterministic set is validated before the model
sees it, and the refined set is validated again before storage. If the refined set
fails, it is discarded and the already-validated deterministic set is stored. A set
that fails the guardrails is never persisted.

## Files

| File | Role |
|---|---|
| `types.ts` | `IntentKey`, `CandidateTestCase`, `TraceabilityMatrix`, `MergeStats` |
| `intent.ts` | Intent normalisation, FNV-1a stable hashing, `computeIntentKey` |
| `steps.ts` | Complexity bands, step budgets, `BANNED_PHRASES`, step-quality predicates |
| `vocab.ts` | Named screens, fields, buttons, tables, endpoints from ACs and docs |
| `scenarios.ts` | 12 scenario archetypes with per-archetype, per-coverage step shapes |
| `generator.ts` | Candidate synthesis with concrete, coverage-appropriate steps |
| `audit-steps.ts` | Proves every archetype x coverage step (and the padding table) meets the step-quality bar |
| `stories-single-sale.ts` | The 12 Sale Qty Restriction stories, criteria verbatim |
| `export-xlsx.ts` | Excel deliverable: Summary, Test Cases, Traceability, Guardrails |
| `merge.ts` | Rules 1 to 3: intent collapse, data-variant folding, suffix stripping |
| `cap.ts` | `min(25, acCount * 2 + 4)`, consolidation by risk |
| `traceability.ts` | AC to test case matrix with gap flags |
| `guardrails.ts` | G01 to G14, `validateTestCaseSet`, `formatViolations` |
| `index.ts` | `buildStoryTestCases` orchestration and stage logging |
| `verify.ts` | V1 to V12 assertions and the before/after table |
| `sample-export.ts` | Readable markdown and JSON export for one COMPLEX story |

## Complexity bands (PART 2)

Derived from the acceptance criterion's real workflow, not a template.

| Band | Signals | Positive step budget |
|---|---|---|
| SIMPLE | single screen, no persistence chain | `clamp(3 + transitions, 4, 6)` |
| STANDARD | create/update/delete, form, record, workflow | `clamp(5 + transitions, 6, 12)` |
| COMPLEX | 2+ named systems, sync or propagation, write-then-read downstream, end-to-end | `clamp(10 + transitions * 2, 12, 25)` |

Negative and edge cases run shorter than their positive counterpart
(`negativeBudget`, `edgeBudget`), so step counts vary within every story. G05 rejects
a run whose step-count standard deviation is zero.

## Guardrails

| Gate | Rejects |
|---|---|
| G01 | Two cases sharing an intent key |
| G02 | User story narrative in a title |
| G03 | Generator-injected title suffix |
| G04 | Truncated value or unclosed quote |
| G05 | Zero step-count variance (templated steps) |
| G06 | A banned phrase anywhere in steps or expected results |
| G07 | A step without a concrete verb and a named object |
| G08 | An expected result that is not independently observable |
| G09 | Duplicate test case ID |
| G10 | Generic precondition ("authenticated user", "is available in the system") |
| G11 | An AC lacking positive or negative coverage |
| G12 | A case that maps to no AC |
| G13 | Case count above the per-story cap |
| G14 | Data variants shipped as separate cases instead of testData rows |

## Notes on step content

Padding steps are chosen per coverage type. A negative case never pads with a
happy-path assertion such as "no error banner is present", which would contradict the
validation error it just expected. This was caught by reading a generated export, not
by the guardrails, which check structure rather than logical consistency.

Object and actor names are extracted with stopword filtering. A captured phrase that
contains connective prose is rejected in favour of the anchor noun, so a criterion
like "displays the member with status 'Active'" yields the field `status`, not the
phrase "and displays the member with". Actor extraction stops at the `I want` clause
boundary, so a story written without a comma does not turn its whole sentence into a
role name.

## Scenario archetypes

A criterion about a kiosk cart must not be tested with a form edit-save-reload
flow. `detectArchetype` reads the criterion and picks the workflow shape:

CONFIG, PERMISSION, SELECTION, KIOSK_CART, MODAL_UI, VISUAL, LIFECYCLE, EVENT_DB,
SYNC, REPORT, SCOPE, and GENERIC (a form/record flow, used when the criterion
describes a value being set and stored).

This was added after reading a generated export rather than trusting the gate. The
guardrails had passed a kiosk cart-validation criterion whose steps read "Log in as
system", "Set the check location flag to search-and", "Click Save" - structurally
valid, semantically wrong. Structural gates cannot catch that, so `audit-steps.ts`
now checks every archetype and coverage combination, and the archetype decides the
workflow.

## Acceptance criterion fidelity

When the author separates criteria by newlines, that structure is authoritative and
a criterion is never split further. An earlier version also split on sentence
punctuation, which turned a 5-criterion story into 6 and a 10-criterion story into
15, inflating the traceability matrix. The Summary sheet's AC count now matches the
authored input exactly.
