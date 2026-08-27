/**
 * Variation folding / de-duplication (PART 1.3).
 * Rule 1: identical intent key -> one case (keep most specific title).
 * Rule 2: same precondition set + expected outcome, differing only in data ->
 *         one case with a testData table.
 * Rule 3: titles identical after stripping generator-injected suffixes -> merge.
 */
import type { CandidateTestCase, MergeStats, TestDataVariant } from "./types.js";
import { intentKeyString, intentDataKey, normalizeOutcome } from "./intent.js";

const SUFFIX_PATTERNS: RegExp[] = [
  /\s+[—-]\s+using .*$/i,
  /\s+[—-]\s+verify downstream.*$/i,
  /^Data persists after session refresh:\s*/i,
  /^\[.*?\]\s*/,
];

export function strippedTitle(title: string): string {
  let t = (title || "").trim();
  for (const rx of SUFFIX_PATTERNS) t = t.replace(rx, "").trim();
  return t.toLowerCase().replace(/\s+/g, " ");
}

/** Separator used when a collapsed case carries more than one criterion. */
const AC_JOIN = String.fromCharCode(10, 10);

const priorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

function pickBetter(a: CandidateTestCase, b: CandidateTestCase): CandidateTestCase {
  // keep the most specific (longest) title; keep richest steps; strongest priority
  const keep = { ...a };
  if (b.title.length > a.title.length) {
    // Title, objective, description, and expected result all describe the same
    // criterion, so they move together. Taking a title from b while keeping a's
    // objective produced cases that cited two different ACs.
    keep.title = b.title;
    keep.objective = b.objective;
    keep.description = b.description;
    keep.expectedResult = b.expectedResult;
  }
  if (b.testSteps.length > a.testSteps.length) {
    keep.testSteps = b.testSteps; keep.complexity = b.complexity;
  }
  keep.acIds = Array.from(new Set(a.acIds.concat(b.acIds)));
  keep.testData = mergeTestData(a.testData, b.testData);
  if ((priorityRank[b.priority] ?? 9) < (priorityRank[keep.priority] ?? 9)) keep.priority = b.priority;
  return keep;
}

function mergeTestData(a: TestDataVariant[], b: TestDataVariant[]): TestDataVariant[] {
  const seen = new Set<string>();
  const out: TestDataVariant[] = [];
  for (const v of [...a, ...b]) {
    const k = v.variant + JSON.stringify(v.inputs);
    if (!seen.has(k)) { seen.add(k); out.push(v); }
  }
  return out;
}

export function mergeCandidatesByIntent(
  candidates: CandidateTestCase[]
): { merged: CandidateTestCase[]; stats: MergeStats } {
  const candidatesIn = candidates.length;
  let intentDuplicates = 0;
  let dataVariants = 0;

  // ── Rule 1: exact intent key ────────────────────────────────────────────────
  const byIntent = new Map<string, CandidateTestCase>();
  for (const c of candidates) {
    const k = intentKeyString(c.intentKey);
    const existing = byIntent.get(k);
    if (existing) { byIntent.set(k, pickBetter(existing, c)); intentDuplicates++; }
    else byIntent.set(k, c);
  }
  let stage = Array.from(byIntent.values());

  // ── Rule 2: same precondition+action, differing only in data value ──────────
  // Scoped to a single acceptance criterion. Two DIFFERENT criteria are two
  // different requirements, so folding across them would hide real coverage and
  // leave a case whose title cites one AC and whose objective cites another.
  const byData = new Map<string, CandidateTestCase>();
  for (const c of stage) {
    const acScope = c.acIds.slice().sort().join("+");
    const k = `${acScope}::${c.coverageType}::${intentDataKey(c.intentKey)}::${normalizeOutcome(c.intentKey.expectedOutcome)}`;
    const existing = byData.get(k);
    if (existing) {
      // fold this candidate's distinguishing value into a testData row
      const rows = mergeTestData(existing.testData, c.testData.length ? c.testData : [{
        variant: c.title, inputs: {}, expected: c.expectedResult,
      }]);
      byData.set(k, { ...pickBetter(existing, c), testData: rows });
      dataVariants++;
    } else byData.set(k, c);
  }
  stage = Array.from(byData.values());

  // ── Rule 3: identical stripped titles within the same coverage type ─────────
  const byTitle = new Map<string, CandidateTestCase>();
  for (const c of stage) {
    const k = `${c.coverageType}::${strippedTitle(c.title)}`;
    const existing = byTitle.get(k);
    if (existing) { byTitle.set(k, pickBetter(existing, c)); intentDuplicates++; }
    else byTitle.set(k, c);
  }
  stage = Array.from(byTitle.values());

  // Rule 4 (PART 3 STEP 3.3 / 3.4) - two cases whose STEP ARRAYS are identical
  // are the same test case, whatever their type field says. Before the title fix
  // one negative (and one edge) case was emitted per criterion even though the
  // archetype produced the same steps for all of them, so a story with 10
  // criteria of one archetype carried 10 identical negative scenarios that
  // differed only in a title prefix. They collapse into one case that traces to
  // every criterion it covers.
  const byStepSignature = new Map<string, CandidateTestCase>();
  let identicalSteps = 0;
  for (const c of stage) {
    const sig = c.coverageType + "::" + JSON.stringify(
      c.testSteps.map(s2 => [s2.action, s2.expected_behavior])
    );
    const existing = byStepSignature.get(sig);
    if (existing) {
      byStepSignature.set(sig, {
        ...existing,
        acIds: Array.from(new Set(existing.acIds.concat(c.acIds))).sort(),
        linkedAcceptanceCriteria: Array.from(new Set(
          existing.linkedAcceptanceCriteria.split(AC_JOIN).concat(c.linkedAcceptanceCriteria)
        )).join(AC_JOIN),
        testData: mergeTestData(existing.testData, c.testData),
      });
      identicalSteps++;
    } else byStepSignature.set(sig, c);
  }
  const merged = Array.from(byStepSignature.values());

  return {
    merged,
    stats: {
      candidatesIn,
      casesOut: merged.length,
      merged: candidatesIn - merged.length,
      intentDuplicates,
      dataVariants,
      identicalSteps,
    },
  };
}
