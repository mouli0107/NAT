/**
 * PART 10 — verification harness. Regenerates against a representative set of
 * user stories and asserts the quality invariants, then prints a before/after
 * comparison. Run: npx tsx server/testcase/verify.ts
 *
 * NOTE: the exact 12 stories that produced the 1,050-case export were not
 * supplied to this environment. This harness runs the SAME pipeline the app now
 * uses, on 12 representative stories (including COMPLEX sync-chain and SIMPLE
 * field-validation stories) so the invariants are demonstrable end to end.
 * Point STORIES at the real 12 to reproduce the exact numbers.
 */
import { buildStoryTestCases, resetIdCounters } from "./index.js";
import { stepCountStdDev, containsBanned } from "./steps.js";
import { STORIES } from "./stories-verify.js";



function main() {
  resetIdCounters();
  const results = STORIES.map(s => buildStoryTestCases(s));
  const all = results.flatMap(r => r.cases);
  const stepCounts = all.map(c => c.testSteps.length);

  const bannedHits = all.reduce((n, c) => {
    let hits = 0;
    for (const s of c.testSteps) { if (containsBanned(s.action)) hits++; if (containsBanned(s.expected_behavior)) hits++; }
    if (containsBanned(c.expectedResult)) hits++;
    return n + hits;
  }, 0);
  const ids = all.map(c => c.testCaseId);
  const dupIds = ids.length - new Set(ids).size;
  const withTestData = all.filter(c => c.testData.length > 0).length;
  const intents = new Set(all.map(c => `${c.intentKey.actor}|${c.intentKey.object}|${c.intentKey.action}|${c.intentKey.expectedOutcome}|${c.intentKey.preconditionHash}`)).size;

  let pass = 0, fail = 0;
  const ck = (n: string, c: boolean) => { c ? (pass++, console.log(`  PASS ${n}`)) : (fail++, console.log(`  FAIL ${n}`)); };

  console.log("=== ASSERTIONS ===");
  ck("V1  total under 300", all.length < 300);
  ck("V2  step counts not all identical", stepCountStdDev(stepCounts) > 0);
  ck("V3  at least one case > 12 steps", stepCounts.some(n => n > 12));
  ck("V4  at least one case < 7 steps", stepCounts.some(n => n < 7));
  ck("V5  zero titles with narrative", !all.some(c => /\bas an?\b|\bi want\b|\bso that\b/i.test(c.title)));
  ck("V6  zero titles with '— using'", !all.some(c => /[—-]\s+using/i.test(c.title)));
  ck("V7  zero banned phrases in steps", bannedHits === 0);
  ck("V8  zero duplicate IDs", dupIds === 0);
  ck("V9  zero unbalanced quotes (truncation proxy)", !all.some(c =>
    [c.title, c.expectedResult, ...c.testSteps.flatMap(s => [s.action, s.expected_behavior])]
      .some(t => (t.match(/"/g) || []).length % 2 !== 0)));
  ck("V10 every AC has positive + negative coverage", results.every(r => r.traceability.gapCount === 0));
  ck("V11 at least one populated testData table", withTestData > 0);
  ck("V12 guardrail passes for all stories", results.every(r => r.guardrail.passed));

  console.log("\n=== BEFORE / AFTER ===");
  const rows: [string, string, string][] = [
    ["Total test cases", "1050", String(all.length)],
    ["Unique intents", "330", String(intents)],
    ["Cases with 6 steps", "1050", String(stepCounts.filter(n => n === 6).length)],
    ["Step count range", "6 to 6", `${Math.min(...stepCounts)} to ${Math.max(...stepCounts)}`],
    ["Duplicate IDs", "689", String(dupIds)],
    ["Banned phrase hits", "6336", String(bannedHits)],
  ];
  const w = 26;
  console.log("Metric".padEnd(w) + "Before".padEnd(10) + "After");
  for (const [m, b, a] of rows) console.log(m.padEnd(w) + b.padEnd(10) + a);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (!results.every(r => r.guardrail.passed)) {
    console.log("\n=== GUARDRAIL FAILURES ===");
    for (const r of results) if (!r.guardrail.passed) {
      console.log(r.guardrail.storyId, r.guardrail.violations.map(v => `${v.code}(${v.examples[0]})`).join("; "));
    }
  }
  process.exit(fail === 0 ? 0 : 1);
}

main();
