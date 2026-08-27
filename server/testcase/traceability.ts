/**
 * Traceability matrix (PART 8). One row per acceptance criterion with the
 * positive / negative / edge test cases that cover it. Any AC missing positive
 * OR negative coverage is a gap (fails G11).
 */
import type { AcceptanceCriterion, CandidateTestCase, TraceabilityMatrix, TraceabilityRow } from "./types.js";

export function buildTraceabilityMatrix(
  storyId: string,
  acs: AcceptanceCriterion[],
  cases: CandidateTestCase[]
): TraceabilityMatrix {
  const rows: TraceabilityRow[] = acs.map(ac => {
    const covering = cases.filter(c => c.acIds.includes(ac.id));
    const positiveTcs = covering.filter(c => c.coverageType === "positive").map(c => c.testCaseId);
    const negativeTcs = covering.filter(c => c.coverageType === "negative").map(c => c.testCaseId);
    const edgeTcs = covering.filter(c => c.coverageType === "edge").map(c => c.testCaseId);
    const gap = positiveTcs.length === 0 || negativeTcs.length === 0;
    return {
      acId: ac.id,
      acText: ac.text,
      positiveTcs, negativeTcs, edgeTcs,
      total: covering.length,
      gap,
    };
  });
  return { storyId, rows, gapCount: rows.filter(r => r.gap).length };
}
