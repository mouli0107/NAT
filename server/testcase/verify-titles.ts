/**
 * PART 6 - title verification. Asserts W1 to W10 against the real Sale Qty
 * Restriction stories, prints every generated title for manual review, and prints
 * a title length histogram. A spike at one value means a character cap survived.
 *
 *   npx tsx server/testcase/verify-titles.ts
 */
import { readFileSync, existsSync, unlinkSync } from "fs";
import { buildStoryTestCases, resetIdCounters } from "./index.js";
import { SINGLE_SALE_STORIES } from "./stories-single-sale.js";
import { similarity, wordCount, TITLE_MIN_WORDS, TITLE_MAX_WORDS } from "./title.js";
import type { CandidateTestCase } from "./types.js";

const TYPE_PREFIX = /^(Negative|Positive|Boundary|Edge|Security|Accessibility|Functional|Regression)\s*[-–—:]\s*/i;

// Function words that cannot legitimately end a phrase.
const DANGLING = new Set([
  "a", "an", "the", "and", "or", "but", "if", "of", "to", "in", "on", "at", "by",
  "for", "with", "from", "as", "is", "are", "was", "were", "be", "been", "that",
  "which", "when", "while", "than", "then", "so", "into", "onto", "per", "via",
]);

function endsMidWord(t: string): boolean {
  const s = t.trim();
  if (/[.!?)\]"']$/.test(s)) return false;
  const last = (s.split(/\s+/).pop() || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  return DANGLING.has(last);
}

function unclosed(t: string): boolean {
  const q = (t.match(/"/g) || []).length % 2 !== 0;
  const pairs: Array<[string, string]> = [["(", ")"], ["[", "]"], ["{", "}"]];
  const brackets = pairs.some(([o, c]) => {
    const oc = (t.match(new RegExp("\\" + o, "g")) || []).length;
    const cc = (t.match(new RegExp("\\" + c, "g")) || []).length;
    return oc > cc;
  });
  return q || brackets;
}

function stepSignature(c: CandidateTestCase): string {
  return JSON.stringify(c.testSteps.map(s => [s.action, s.expected_behavior]));
}

async function main() {
  resetIdCounters();
  const built = SINGLE_SALE_STORIES.map(story => ({
    story, result: buildStoryTestCases(story, { docTexts: [] }),
  }));
  const all = built.flatMap(b => b.result.cases);

  // ── W9 / W10 need the workbook, so build it here ─────────────────────────
  const tmpXlsx = "./.title-verification.xlsx";
  let exportError: string | null = null;
  let w9 = false, w10 = false;
  try {
    if (existsSync(tmpXlsx)) unlinkSync(tmpXlsx);
    const { execFileSync } = await import("child_process");
    execFileSync(process.execPath, [
      "--import", "tsx", "server/testcase/export-xlsx.ts", tmpXlsx,
    ], { stdio: "pipe" });

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(tmpXlsx);
    const sheet = wb.getWorksheet("Test Cases");
    if (!sheet) throw new Error("Test Cases sheet missing");

    const exported = new Map<string, { title: string; ac: string }>();
    for (let r = 2; r <= sheet.rowCount; r++) {
      const id = String(sheet.getRow(r).getCell(3).value ?? "");
      if (!id) continue;
      exported.set(id, {
        title: String(sheet.getRow(r).getCell(4).value ?? ""),
        ac: String(sheet.getRow(r).getCell(6).value ?? ""),
      });
    }
    w9 = all.every(c => exported.get(c.testCaseId)?.title === c.title);
    w10 = all.every(c => exported.get(c.testCaseId)?.ac === c.linkedAcceptanceCriteria);
    if (existsSync(tmpXlsx)) unlinkSync(tmpXlsx);
  } catch (err: any) {
    exportError = String(err?.message ?? err).slice(0, 400);
  }

  // ── Assertions ───────────────────────────────────────────────────────────
  const lenCounts = new Map<number, number>();
  for (const c of all) lenCounts.set(c.title.length, (lenCounts.get(c.title.length) ?? 0) + 1);
  const worstShare = Math.max.apply(null, Array.from(lenCounts.values())) / all.length;

  // W7 is scoped per story, matching G17 ("two test cases in the SAME story").
  // Cross-story repeats are reported separately below: they mean two user stories
  // specify the same scenario, which is a fact about the backlog rather than a
  // generator defect, and inventing differences to hide it would be worse.
  let dupSteps = 0;
  for (const b of built) {
    const seen = new Set<string>();
    for (const c of b.result.cases) {
      const sig = stepSignature(c);
      if (seen.has(sig)) dupSteps++;
      seen.add(sig);
    }
  }
  const crossStory = new Map<string, string[]>();
  for (const b of built) {
    for (const c of b.result.cases) {
      const sig = stepSignature(c);
      crossStory.set(sig, (crossStory.get(sig) ?? []).concat(`${b.story.storyId}/${c.testCaseId}`));
    }
  }
  const crossPairs = Array.from(crossStory.values()).filter(v => v.length > 1);

  const acSubstring = all.filter(c => {
    const nt = c.title.toLowerCase().replace(/\s+/g, " ").trim();
    const na = c.linkedAcceptanceCriteria.toLowerCase().replace(/\s+/g, " ").trim();
    return nt.length > 12 && na.indexOf(nt) !== -1;
  });

  const checks: Array<[string, boolean, string]> = [
    ["W1  zero titles end mid-word", !all.some(c => endsMidWord(c.title)),
      all.filter(c => endsMidWord(c.title)).map(c => c.title).slice(0, 3).join(" | ")],
    ["W2  zero titles end with an unclosed bracket or quote", !all.some(c => unclosed(c.title)),
      all.filter(c => unclosed(c.title)).map(c => c.title).slice(0, 3).join(" | ")],
    ["W3  zero titles contain a newline", !all.some(c => /[\r\n]/.test(c.title)),
      String(all.filter(c => /[\r\n]/.test(c.title)).length)],
    ["W4  zero titles begin with a type prefix", !all.some(c => TYPE_PREFIX.test(c.title)),
      all.filter(c => TYPE_PREFIX.test(c.title)).map(c => c.title).slice(0, 3).join(" | ")],
    ["W5  no length shared by more than 20% of titles", worstShare <= 0.2,
      `worst share ${(worstShare * 100).toFixed(1)}%`],
    ["W6  no title is a substring of its linked AC", acSubstring.length === 0,
      acSubstring.map(c => c.testCaseId).slice(0, 3).join(", ")],
    ["W7  no two cases in a story share an identical step array", dupSteps === 0, `${dupSteps} duplicate(s)`],
    ["W8  every title is 5 to 12 words",
      all.every(c => wordCount(c.title) >= TITLE_MIN_WORDS && wordCount(c.title) <= TITLE_MAX_WORDS),
      all.filter(c => wordCount(c.title) < TITLE_MIN_WORDS || wordCount(c.title) > TITLE_MAX_WORDS)
        .map(c => `${wordCount(c.title)}w "${c.title}"`).slice(0, 3).join(" | ")],
    ["W9  exported title equals stored title", w9, exportError ?? ""],
    ["W10 linked AC field holds the complete AC text", w10 && all.every(c => c.linkedAcceptanceCriteria.trim().length > 0),
      exportError ?? ""],
  ];

  console.log("=== TITLE ASSERTIONS (W1 to W10) ===");
  let pass = 0, fail = 0;
  for (const [name, ok, detail] of checks) {
    if (ok) { pass++; console.log(`  PASS ${name}`); }
    else { fail++; console.log(`  FAIL ${name}${detail ? "  -> " + detail : ""}`); }
  }

  // ── Also confirm the guardrail gate accepts every story ──────────────────
  const rejected = built.filter(b => !b.result.guardrail.passed);
  console.log(rejected.length === 0
    ? "  PASS G01 to G19 gate passes for all 12 stories"
    : `  FAIL guardrail rejected: ${rejected.map(b => b.story.storyId).join(", ")}`);
  if (rejected.length) fail++; else pass++;
  for (const b of rejected) {
    for (const v of b.result.guardrail.violations) {
      console.log(`       ${b.story.storyId} ${v.code}: ${v.message} - ${v.examples[0]}`);
    }
  }

  if (crossPairs.length) {
    console.log(`\n=== CROSS-STORY SCENARIO OVERLAP (${crossPairs.length} group(s)) ===`);
    console.log("Two stories specify the same scenario, so the generated steps are");
    console.log("identical. Not a generator defect: review whether both stories are needed.");
    for (const g of crossPairs) console.log("  " + g.join("  ==  "));
  }

  // ── Title length histogram ──────────────────────────────────────────────
  console.log("\n=== TITLE LENGTH HISTOGRAM ===");
  const lens = Array.from(lenCounts.entries()).sort((a, b) => a[0] - b[0]);
  const maxN = Math.max.apply(null, Array.from(lenCounts.values()));
  for (const [len, n] of lens) {
    const bar = "#".repeat(Math.max(1, Math.round((n / maxN) * 40)));
    console.log(String(len).padStart(3) + " ch | " + String(n).padStart(3) + " | " + bar);
  }
  const wordHist = new Map<number, number>();
  for (const c of all) wordHist.set(wordCount(c.title), (wordHist.get(wordCount(c.title)) ?? 0) + 1);
  console.log("\nwords per title: " +
    Array.from(wordHist.entries()).sort((a, b) => a[0] - b[0]).map(([w, n]) => `${w}w:${n}`).join("  "));
  console.log(`titles: ${all.length} | distinct lengths: ${lenCounts.size} | ` +
    `min ${Math.min.apply(null, all.map(c => c.title.length))} | ` +
    `max ${Math.max.apply(null, all.map(c => c.title.length))} | ` +
    `largest single-length share ${(worstShare * 100).toFixed(1)}%`);

  // ── Every title, for manual review ──────────────────────────────────────
  console.log("\n=== GENERATED TITLES (Sale Qty Restriction) ===");
  for (const { story, result } of built) {
    console.log(`\n${story.storyId} - ${story.title}  [${result.cases.length} cases]`);
    for (const c of result.cases) {
      console.log(`  ${c.testCaseId}  ${c.testType.padEnd(10)} ${c.acIds.join(",").padEnd(22)} ` +
        `${String(wordCount(c.title)).padStart(2)}w ${String(c.title.length).padStart(3)}ch  ` +
        `sim=${similarity(c.title, c.linkedAcceptanceCriteria).toFixed(2)}`);
      console.log(`      ${c.title}`);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main();
