/**
 * Test-case quality pipeline entry (Generate from User Story).
 * Deterministic path: parse -> generate candidates -> merge by intent ->
 * cap by risk -> traceability -> guardrail gate. The optional AI batch refiner
 * (PART 5) runs in the caller between merge and guardrails.
 */
import type {
  AcceptanceCriterion, CandidateTestCase, StoryInput, SystemVocabulary,
  TraceabilityMatrix,
} from "./types.js";
import { generateCandidates, parseAcceptanceCriteria, resetIdCounters } from "./generator.js";
import { mergeCandidatesByIntent } from "./merge.js";
import { applyCap } from "./cap.js";
import { buildTraceabilityMatrix } from "./traceability.js";
import { validateTestCaseSet, type GuardrailResult } from "./guardrails.js";
import { buildVocabulary } from "./vocab.js";
import { classifyComplexity } from "./steps.js";
import { scenarioTitle, normalizeTitle, disambiguate } from "./title.js";
import type { Archetype, ScenarioCtx } from "./scenarios.js";

export * from "./types.js";
export { validateTestCaseSet, formatViolations } from "./guardrails.js";
export { mergeCandidatesByIntent } from "./merge.js";
export { buildTraceabilityMatrix } from "./traceability.js";
export { buildVocabulary } from "./vocab.js";
export { resetIdCounters } from "./generator.js";
export { BANNED_PHRASES, stepCountStdDev } from "./steps.js";
export { capFor } from "./cap.js";

export interface BuildResult {
  cases: CandidateTestCase[];
  acs: AcceptanceCriterion[];
  vocab: SystemVocabulary;
  traceability: TraceabilityMatrix;
  guardrail: GuardrailResult;
  logs: string[];
}

export interface BuildOptions {
  docTexts?: string[];
  log?: (line: string) => void;
}

/**
 * Deterministic build (no AI). Produces the merged, capped, validated set plus
 * a traceability matrix and PART 9 stage logs.
 */
export function buildStoryTestCases(story: StoryInput, opts: BuildOptions = {}): BuildResult {
  const logs: string[] = [];
  const log = (l: string) => { logs.push(l); opts.log?.(l); };

  const acs = parseAcceptanceCriteria(story.acceptanceCriteria);
  const vocab = buildVocabulary(story.acceptanceCriteria, opts.docTexts || []);
  log(`[TC-Gen] Stage 1: Input assembled. ${acs.length} ACs, ${opts.docTexts?.length ?? 0} docs`);

  const candidates = generateCandidates(story, { docTexts: opts.docTexts });
  log(`[TC-Gen] Stage 2: Rule-based generated ${candidates.length} candidates`);

  const { merged, stats } = mergeCandidatesByIntent(candidates);
  log(`[TC-Merge] Stage 2B: ${stats.candidatesIn} in, ${stats.casesOut} out. ${stats.intentDuplicates} intent dupes, ${stats.dataVariants} data variants`);

  const bands = { SIMPLE: 0, STANDARD: 0, COMPLEX: 0 };
  for (const c of merged) bands[c.complexity]++;
  log(`[TC-Gen] Stage 2C: Complexity bands. ${bands.SIMPLE} SIMPLE, ${bands.STANDARD} STANDARD, ${bands.COMPLEX} COMPLEX`);

  const { kept, cap } = applyCap(merged, acs.length);
  log(`[TC-Cap] Story ${story.storyId}: ${acs.length} ACs, cap ${cap}, produced ${kept.length}. ${kept.length <= cap ? "OK" : "OVER"}`);

  const retitled = retitleAndDedupe(kept, story.storyId, log);

  const traceability = buildTraceabilityMatrix(story.storyId, acs, retitled);
  const guardrail = validateTestCaseSet(story.storyId, retitled, acs, vocab);
  const totalSteps = retitled.reduce((n, c) => n + c.testSteps.length, 0);
  log(`[Guardrail] Stage 3B: ${retitled.length} validated. ${guardrail.passed ? "PASS" : "REJECTED (" + guardrail.violations.map(v => v.code).join(",") + ")"}`);
  log(`[TC-Gen] Stage 4: ${retitled.length} test cases, ${totalSteps} steps, story ${story.storyId}${traceability.gapCount ? `, ${traceability.gapCount} AC gap(s)` : ""}`);

  return { cases: retitled, acs, vocab, traceability, guardrail, logs };
}

export { classifyComplexity };

/**
 * A case that survived identical-step collapse may now cover several criteria.
 * A title naming only the first of them under-describes the case, so such a case
 * is retitled with its SCENARIO-level label. Titles are then made unique within
 * the story by extending with distinctive criterion words, never by appending a
 * counter or a type label.
 */
function retitleAndDedupe(
  cases: CandidateTestCase[],
  storyId: string,
  log: (l: string) => void
): CandidateTestCase[] {
  let retitled = 0;
  const taken = new Set<string>();

  const out = cases.map(c => {
    const authored = normalizeTitle(c.title);   // criterion-specific label
    let chosen = authored;

    if (c.acIds.length > 1) {
      const scenario = normalizeTitle(
        scenarioTitle(c.coverageType, c.archetype as Archetype, titleCtxFor(c))
      );
      // Prefer the scenario label for a multi-criterion case. If a sibling case of
      // the same archetype already took it, fall back to this case's own
      // criterion-specific label rather than padding the scenario label with a
      // stray word.
      if (!taken.has(scenario.toLowerCase())) chosen = scenario;
      if (chosen !== authored) retitled++;
    }

    if (taken.has(chosen.toLowerCase())) {
      const alt = disambiguate(chosen, c.linkedAcceptanceCriteria, taken);
      if (alt) chosen = normalizeTitle(alt);
    }
    taken.add(chosen.toLowerCase());
    return chosen === c.title ? c : { ...c, title: chosen };
  });

  if (retitled) {
    log(`[TC-Title] Story ${storyId}: ${retitled} multi-criterion case(s) retitled to their scenario label`);
  }
  return out;
}

/**
 * Minimal scenario context for titling an already-built case. Only the fields the
 * scenario title tables read are needed; the concrete objects were already baked
 * into the steps at generation time.
 */
function titleCtxFor(c: CandidateTestCase): ScenarioCtx {
  return {
    actor: c.intentKey.actor || "Test Analyst",
    screen: "Location Summary page",
    setting: "Sale Qty Restriction",
    object: c.intentKey.object || "record",
    value: "Yes", limit: "1", product: "the restricted product",
    table: "pricingrec", secondTable: "SOSDB", endpoint: "/api/sync",
    device: "V5 kiosk", location: "the location",
    report: "Blocked scan events", button: "Choose Items",
  };
}
