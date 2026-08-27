/**
 * Build the deliverable workbook for a set of user stories.
 *
 *   npx tsx server/testcase/export-xlsx.ts "C:/path/out.xlsx"
 *
 * Sheets: Test Cases (one row per step), Summary, Traceability, Guardrails.
 */
import ExcelJS from "exceljs";
import { buildStoryTestCases, resetIdCounters } from "./index.js";
import { SINGLE_SALE_STORIES } from "./stories-single-sale.js";
import type { BuildResult } from "./index.js";
import type { StoryInput } from "./types.js";

const FONT = { name: "Arial", size: 10 };
const HEAD_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } };

function styleHeader(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.font = { ...FONT, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = HEAD_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin" }, left: { style: "thin" },
      bottom: { style: "thin" }, right: { style: "thin" },
    };
  });
  row.height = 30;
}

function styleBody(sheet: ExcelJS.Worksheet, firstDataRow = 2) {
  for (let r = firstDataRow; r <= sheet.rowCount; r++) {
    sheet.getRow(r).eachCell(cell => {
      cell.font = FONT;
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = {
        top: { style: "hair" }, left: { style: "hair" },
        bottom: { style: "hair" }, right: { style: "hair" },
      };
    });
  }
}

interface Built { story: StoryInput; result: BuildResult }

function buildAll(stories: StoryInput[]): Built[] {
  resetIdCounters();
  return stories.map(story => ({
    story,
    result: buildStoryTestCases(story, { docTexts: [] }),
  }));
}

function sheetTestCases(wb: ExcelJS.Workbook, built: Built[]) {
  const sheet = wb.addWorksheet("Test Cases", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Story ID", key: "storyId", width: 10 },
    { header: "Story Title", key: "storyTitle", width: 34 },
    { header: "Test Case ID", key: "tcId", width: 16 },
    { header: "Test Case Title", key: "tcTitle", width: 46 },
    { header: "AC Covered", key: "acIds", width: 12 },
    // PART 2 STEP 2.2 - the complete criterion text travels here, untruncated.
    { header: "Linked Acceptance Criteria", key: "linkedAc", width: 70 },
    { header: "Type", key: "type", width: 11 },
    { header: "Priority", key: "priority", width: 9 },
    { header: "Complexity", key: "complexity", width: 12 },
    { header: "Objective", key: "objective", width: 50 },
    { header: "Preconditions", key: "preconditions", width: 46 },
    { header: "Step #", key: "stepNo", width: 8 },
    { header: "Action", key: "action", width: 60 },
    { header: "Expected Behaviour", key: "expected", width: 60 },
    { header: "Overall Expected Result", key: "overall", width: 50 },
    { header: "Test Data", key: "testData", width: 34 },
  ];

  for (const { story, result } of built) {
    for (const c of result.cases) {
      const preconditions = c.preconditions.map((p, i) => `${i + 1}. ${p}`).join("\n");
      const testData = c.testData.length
        ? c.testData.map(v => `${v.variant}: ${JSON.stringify(v.inputs)} => ${v.expected}`).join("\n")
        : "";
      c.testSteps.forEach((s, si) => {
        sheet.addRow({
          // Story and case level values are written once, on the first step row, so
          // the sheet reads as grouped blocks rather than repeating text 13 times.
          storyId: si === 0 ? story.storyId : "",
          storyTitle: si === 0 ? story.title : "",
          tcId: si === 0 ? c.testCaseId : "",
          tcTitle: si === 0 ? c.title : "",
          acIds: si === 0 ? c.acIds.join(", ") : "",
          linkedAc: si === 0 ? c.linkedAcceptanceCriteria : "",
          type: si === 0 ? c.testType : "",
          priority: si === 0 ? c.priority : "",
          complexity: si === 0 ? c.complexity : "",
          objective: si === 0 ? c.objective : "",
          preconditions: si === 0 ? preconditions : "",
          stepNo: s.step_number,
          action: s.action,
          expected: s.expected_behavior,
          overall: si === 0 ? c.expectedResult : "",
          testData: si === 0 ? testData : "",
        });
      });
    }
  }

  styleHeader(sheet.getRow(1));
  styleBody(sheet);
  sheet.autoFilter = { from: "A1", to: "P1" };

  // ── PART 1 STEP 1.3 - the exported title MUST equal the stored title ──────
  // Fails the export loudly rather than shipping a silently altered cell.
  const titleCol = 4, acCol = 6, idCol = 3;
  const mismatches: string[] = [];
  for (const { result } of built) {
    for (const c of result.cases) {
      let found = false;
      for (let r = 2; r <= sheet.rowCount; r++) {
        if (String(sheet.getRow(r).getCell(idCol).value ?? "") !== c.testCaseId) continue;
        found = true;
        const cellTitle = String(sheet.getRow(r).getCell(titleCol).value ?? "");
        if (cellTitle !== c.title) {
          mismatches.push(
            `${c.testCaseId}\n    stored:   ${JSON.stringify(c.title)}\n    exported: ${JSON.stringify(cellTitle)}`
          );
        }
        const cellAc = String(sheet.getRow(r).getCell(acCol).value ?? "");
        if (cellAc !== c.linkedAcceptanceCriteria) {
          mismatches.push(
            `${c.testCaseId} (linked AC)\n    stored:   ${JSON.stringify(c.linkedAcceptanceCriteria)}\n    exported: ${JSON.stringify(cellAc)}`
          );
        }
        break;
      }
      if (!found) mismatches.push(`${c.testCaseId}: no exported row found for this test case`);
    }
  }
  if (mismatches.length) {
    throw new Error(
      "[Export] Exported title or linked AC differs from the stored value:\n  " +
      mismatches.join("\n  ")
    );
  }
  return sheet;
}

function sheetSummary(wb: ExcelJS.Workbook, built: Built[]) {
  const sheet = wb.addWorksheet("Summary", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Story ID", key: "storyId", width: 10 },
    { header: "Story Title", key: "title", width: 44 },
    { header: "ACs", key: "acs", width: 7 },
    { header: "Test Cases", key: "cases", width: 12 },
    { header: "Positive", key: "pos", width: 10 },
    { header: "Negative", key: "neg", width: 10 },
    { header: "Edge", key: "edge", width: 8 },
    { header: "Total Steps", key: "steps", width: 12 },
    { header: "Min Steps", key: "min", width: 11 },
    { header: "Max Steps", key: "max", width: 11 },
    { header: "AC Gaps", key: "gaps", width: 10 },
    { header: "Guardrail", key: "gate", width: 12 },
  ];

  for (const { story, result } of built) {
    const counts = result.cases.map(c => c.testSteps.length);
    sheet.addRow({
      storyId: story.storyId,
      title: story.title,
      acs: result.acs.length,
      cases: result.cases.length,
      pos: result.cases.filter(c => c.coverageType === "positive").length,
      neg: result.cases.filter(c => c.coverageType === "negative").length,
      edge: result.cases.filter(c => c.coverageType === "edge").length,
      steps: counts.reduce((a, b) => a + b, 0),
      min: counts.length ? Math.min.apply(null, counts) : 0,
      max: counts.length ? Math.max.apply(null, counts) : 0,
      gaps: result.traceability.gapCount,
      gate: result.guardrail.passed ? "PASS" : "REJECTED",
    });
  }

  const first = 2;
  const last = sheet.rowCount;
  // Formulas keep the sheet live, and a cached `result` means the totals also
  // display in viewers that do not recalculate on open.
  const col = (letter: string, fn: (nums: number[]) => number): number => {
    const nums: number[] = [];
    for (let r = first; r <= last; r++) {
      const v = sheet.getCell(`${letter}${r}`).value;
      if (typeof v === "number") nums.push(v);
    }
    return nums.length ? fn(nums) : 0;
  };
  const sum = (n: number[]) => n.reduce((a, b) => a + b, 0);
  const gateResults: string[] = [];
  for (let r = first; r <= last; r++) gateResults.push(String(sheet.getCell(`L${r}`).value ?? ""));

  const total = sheet.addRow({
    storyId: "TOTAL",
    title: `${built.length} user stories`,
    acs: { formula: `SUM(C${first}:C${last})`, result: col("C", sum) },
    cases: { formula: `SUM(D${first}:D${last})`, result: col("D", sum) },
    pos: { formula: `SUM(E${first}:E${last})`, result: col("E", sum) },
    neg: { formula: `SUM(F${first}:F${last})`, result: col("F", sum) },
    edge: { formula: `SUM(G${first}:G${last})`, result: col("G", sum) },
    steps: { formula: `SUM(H${first}:H${last})`, result: col("H", sum) },
    min: { formula: `MIN(I${first}:I${last})`, result: col("I", n => Math.min.apply(null, n)) },
    max: { formula: `MAX(J${first}:J${last})`, result: col("J", n => Math.max.apply(null, n)) },
    gaps: { formula: `SUM(K${first}:K${last})`, result: col("K", sum) },
    gate: {
      formula: `IF(COUNTIF(L${first}:L${last},"REJECTED")=0,"ALL PASS","REVIEW")`,
      result: gateResults.indexOf("REJECTED") === -1 ? "ALL PASS" : "REVIEW",
    },
  });

  styleHeader(sheet.getRow(1));
  styleBody(sheet);
  total.eachCell(cell => {
    cell.font = { ...FONT, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
  });
  return sheet;
}

function sheetTraceability(wb: ExcelJS.Workbook, built: Built[]) {
  const sheet = wb.addWorksheet("Traceability", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Story ID", key: "storyId", width: 10 },
    { header: "AC ID", key: "acId", width: 9 },
    { header: "Acceptance Criterion", key: "acText", width: 84 },
    { header: "Positive TCs", key: "pos", width: 22 },
    { header: "Negative TCs", key: "neg", width: 22 },
    { header: "Edge TCs", key: "edge", width: 22 },
    { header: "Total", key: "total", width: 8 },
    { header: "Coverage Gap", key: "gap", width: 14 },
  ];

  for (const { story, result } of built) {
    for (const row of result.traceability.rows) {
      sheet.addRow({
        storyId: story.storyId,
        acId: row.acId,
        acText: row.acText,
        pos: row.positiveTcs.join(", ") || "-",
        neg: row.negativeTcs.join(", ") || "-",
        edge: row.edgeTcs.join(", ") || "-",
        total: row.total,
        gap: row.gap ? "GAP" : "covered",
      });
    }
  }

  styleHeader(sheet.getRow(1));
  styleBody(sheet);
  sheet.autoFilter = { from: "A1", to: "H1" };
  // Highlight any uncovered criterion.
  for (let r = 2; r <= sheet.rowCount; r++) {
    if (sheet.getRow(r).getCell("gap").value === "GAP") {
      sheet.getRow(r).getCell("gap").fill = {
        type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" },
      };
    }
  }
  return sheet;
}

function sheetGuardrails(wb: ExcelJS.Workbook, built: Built[]) {
  const sheet = wb.addWorksheet("Guardrails");
  sheet.columns = [
    { header: "Story ID", key: "storyId", width: 10 },
    { header: "Result", key: "result", width: 12 },
    { header: "Violation Codes", key: "codes", width: 24 },
    { header: "Detail", key: "detail", width: 90 },
  ];

  for (const { story, result } of built) {
    sheet.addRow({
      storyId: story.storyId,
      result: result.guardrail.passed ? "PASS" : "REJECTED",
      codes: result.guardrail.violations.map(v => v.code).join(", ") || "-",
      detail: result.guardrail.passed
        ? "G01-G14 satisfied: unique intents, no narrative titles, no injected suffixes, balanced quotes, nonzero step variance, no banned phrases, concrete verb plus named object per step, observable expected results, unique IDs, named preconditions, positive and negative coverage per AC, every case traced to an AC, within the per-story cap, data variants folded into testData."
        : result.guardrail.violations.map(v => `${v.code}: ${v.message} (e.g. ${v.examples[0]})`).join(" | "),
    });
  }

  styleHeader(sheet.getRow(1));
  styleBody(sheet);
  return sheet;
}

async function main() {
  const outPath = process.argv[2] || "single-sale-test-cases.xlsx";
  const built = buildAll(SINGLE_SALE_STORIES);

  const wb = new ExcelJS.Workbook();
  wb.creator = "NAT 2.0 — Generate from User Story";
  sheetSummary(wb, built);
  sheetTestCases(wb, built);
  sheetTraceability(wb, built);
  sheetGuardrails(wb, built);

  await wb.xlsx.writeFile(outPath);

  const totalCases = built.reduce((n, b) => n + b.result.cases.length, 0);
  const totalSteps = built.reduce((n, b) => n + b.result.cases.reduce((m, c) => m + c.testSteps.length, 0), 0);
  const gaps = built.reduce((n, b) => n + b.result.traceability.gapCount, 0);
  const failed = built.filter(b => !b.result.guardrail.passed).map(b => b.story.storyId);

  console.log(`Wrote ${outPath}`);
  console.log(`${built.length} stories · ${totalCases} test cases · ${totalSteps} steps · ${gaps} AC gap(s)`);
  console.log(failed.length ? `Guardrail REJECTED: ${failed.join(", ")}` : "Guardrail: all stories PASS");
}

main().catch(err => { console.error(err); process.exit(1); });
