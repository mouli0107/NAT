/**
 * PART 11 deliverable: regenerate one COMPLEX story and write a readable export
 * (markdown + JSON) so the before/after quality is inspectable by hand.
 *
 *   npx tsx server/testcase/sample-export.ts [outDir]
 */
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { buildStoryTestCases, resetIdCounters } from "./index.js";
import type { StoryInput } from "./types.js";

const STORY: StoryInput = {
  storyId: "US-06",
  title: "Kiosk enrolment syncs to the Snowflake member warehouse",
  description:
    "As an enrolment specialist I want a kiosk enrolment to reach the Snowflake member warehouse " +
    "so that downstream benefit eligibility reports are accurate the same day.",
  acceptanceCriteria: [
    "AC1: When an enrolment is submitted on the kiosk, the Enrolment API stores the member record and returns the generated Member ID.",
    "AC2: After the record is stored, the sync job propagates the member record to the Snowflake MEMBER_MASTER table within 15 minutes.",
    "AC3: The Eligibility Report screen reads the propagated record and displays the member with status 'Active'.",
    "AC4: If the Snowflake sync fails, the enrolment is queued for retry and the Sync Monitor shows the record with status 'Pending Retry'.",
    "AC5: Re-running the sync for an already propagated Member ID must not create a duplicate row in MEMBER_MASTER.",
  ].join("\n"),
};

function md(): string {
  resetIdCounters();
  const r = buildStoryTestCases(STORY, { docTexts: [] });
  const lines: string[] = [];

  lines.push(`# Sample export — ${STORY.storyId}: ${STORY.title}`);
  lines.push("");
  lines.push(`Complexity band: **${r.cases[0]?.complexity ?? "n/a"}** · ` +
    `${r.acs.length} acceptance criteria · ${r.cases.length} test cases · ` +
    `guardrail: **${r.guardrail.passed ? "PASS" : "REJECTED"}**`);
  lines.push("");

  const counts = r.cases.map(c => c.testSteps.length);
  lines.push(`Step counts across the set: ${counts.join(", ")} ` +
    `(min ${Math.min(...counts)}, max ${Math.max(...counts)}) — not templated.`);
  lines.push("");

  lines.push("## Traceability matrix");
  lines.push("");
  lines.push("| AC | Criterion | Positive | Negative | Edge | Total | Gap |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const row of r.traceability.rows) {
    lines.push(
      `| ${row.acId} | ${row.acText.replace(/\|/g, "\\|")} | ${row.positiveTcs.join(", ") || "-"} ` +
      `| ${row.negativeTcs.join(", ") || "-"} | ${row.edgeTcs.join(", ") || "-"} | ${row.total} ` +
      `| ${row.gap ? "YES" : "no"} |`
    );
  }
  lines.push("");

  lines.push("## Test cases");
  for (const c of r.cases) {
    lines.push("");
    lines.push(`### ${c.testCaseId} — ${c.title}`);
    lines.push("");
    lines.push(`- Covers: ${c.acIds.join(", ")}`);
    lines.push(`- Type: ${c.testType} · Priority: ${c.priority} · Complexity: ${c.complexity} · ${c.testSteps.length} steps`);
    lines.push(`- Objective: ${c.objective}`);
    lines.push(`- Preconditions:`);
    for (const p of c.preconditions) lines.push(`  - ${p}`);
    lines.push("");
    lines.push("| # | Action | Expected behaviour |");
    lines.push("|---|---|---|");
    for (const s of c.testSteps) {
      lines.push(`| ${s.step_number} | ${s.action.replace(/\|/g, "\\|")} | ${s.expected_behavior.replace(/\|/g, "\\|")} |`);
    }
    lines.push("");
    lines.push(`**Expected result:** ${c.expectedResult}`);
    if (c.testData.length) {
      lines.push("");
      lines.push("**Test data variants (folded, not separate cases):**");
      lines.push("");
      lines.push("| Variant | Inputs | Expected |");
      lines.push("|---|---|---|");
      for (const v of c.testData) {
        lines.push(`| ${v.variant} | ${JSON.stringify(v.inputs)} | ${v.expected} |`);
      }
    }
  }

  lines.push("");
  lines.push("## Pipeline log");
  lines.push("");
  lines.push("```");
  for (const l of r.logs) lines.push(l);
  lines.push("```");

  return lines.join("\n");
}

function main() {
  const outDir = process.argv[2] || join(process.cwd(), "sample-export");
  mkdirSync(outDir, { recursive: true });

  resetIdCounters();
  const result = buildStoryTestCases(STORY, { docTexts: [] });

  const mdPath = join(outDir, `${STORY.storyId}-sample-export.md`);
  const jsonPath = join(outDir, `${STORY.storyId}-sample-export.json`);
  writeFileSync(mdPath, md(), "utf8");
  writeFileSync(jsonPath, JSON.stringify({
    story: STORY,
    acs: result.acs,
    cases: result.cases,
    traceability: result.traceability,
    guardrail: result.guardrail,
    logs: result.logs,
  }, null, 2), "utf8");

  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
  console.log(`${result.cases.length} cases · guardrail ${result.guardrail.passed ? "PASS" : "REJECTED"}`);
}

main();
