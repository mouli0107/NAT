/**
 * Per-story volume control (PART 6).
 * maxTestCases = min(25, (acCount * 2) + 4). Consolidate by risk (P0 first),
 * never truncate arbitrarily, and never drop an AC's only positive/negative
 * coverage (that would fail G11).
 */
import type { CandidateTestCase } from "./types.js";

const rank: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const coverRank: Record<string, number> = { positive: 0, negative: 1, edge: 2 };

export function capFor(acCount: number): number {
  return Math.min(25, acCount * 2 + 4);
}

export function applyCap(
  cases: CandidateTestCase[],
  acCount: number
): { kept: CandidateTestCase[]; cap: number } {
  const cap = capFor(acCount);
  if (cases.length <= cap) return { kept: cases, cap };

  // 1. Mandatory coverage: best positive + best negative for each AC.
  const mandatory = new Set<string>();
  const acIds = new Set<string>();
  cases.forEach(c => c.acIds.forEach(a => acIds.add(a)));

  for (const ac of Array.from(acIds)) {
    for (const cov of ["positive", "negative"] as const) {
      const best = cases
        .filter(c => c.acIds.includes(ac) && c.coverageType === cov)
        .sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9))[0];
      if (best) mandatory.add(best.testCaseId);
    }
  }

  const kept = cases.filter(c => mandatory.has(c.testCaseId));

  // 2. Fill remaining slots by risk (priority, then positive > negative > edge).
  const pool = cases
    .filter(c => !mandatory.has(c.testCaseId))
    .sort((a, b) =>
      (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9) ||
      (coverRank[a.coverageType] ?? 9) - (coverRank[b.coverageType] ?? 9)
    );

  for (const c of pool) {
    if (kept.length >= cap) break;
    kept.push(c);
  }

  // preserve original ordering for readability
  const order = new Map(cases.map((c, i) => [c.testCaseId, i]));
  kept.sort((a, b) => (order.get(a.testCaseId)! - order.get(b.testCaseId)!));
  return { kept, cap };
}
