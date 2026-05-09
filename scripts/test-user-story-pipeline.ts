/**
 * Quick end-to-end test for the "Generate from User Story" pipeline.
 *
 * Run with:
 *   npx tsx scripts/test-user-story-pipeline.ts
 *
 * What it does:
 *   1. Creates a user story with title + description + 3 ACs
 *   2. Attaches a sample text document (inline, no real file needed)
 *   3. Triggers generation via POST /api/tests/sprint-generate
 *   4. Prints the pipeline stage log
 *   5. Shows the final test cases
 *   6. Confirms stage order is correct
 */

import http from "http";
import https from "https";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5000";

// ── Sample user story ──────────────────────────────────────────────────────────
const USER_STORY = {
  userStoryId: `story-pipeline-test-${Date.now()}`,
  title: "Product Type Classification for Cosmetic Formulations",
  description:
    "As a Regulatory Affairs Specialist, I need the system to correctly classify cosmetic " +
    "formulations by product type (rinse-off vs leave-on) and intended user (adult vs child), " +
    "so that the downstream compliance engine can apply the correct REACH regulatory rules " +
    "and generate accurate safety assessment reports.",
  acceptanceCriteria:
    "- System must store the product type as either 'rinse-off' or 'leave-on'\n" +
    "- System must store the intended user group as either 'adult' or 'child'\n" +
    "- The classification must be validated before the formulation can be submitted for review\n" +
    "- Downstream compliance engine must receive the classification flags via the /api/compliance/assess endpoint",
  domain: "chemicals",
  productDescription: "Regulatory Affairs platform for cosmetic formulation compliance",
  uploadedDocuments: [
    {
      fileName: "REACH-Compliance-Overview.txt",
      fileType: ".txt",
      charCount: 420,
      content:
        "REACH Regulation Overview\n" +
        "========================\n" +
        "Article 14: Chemical Safety Assessment\n" +
        "- Rinse-off products: exposure factor 0.01\n" +
        "- Leave-on products: exposure factor 1.0\n" +
        "- Child-specific products require 10x safety margin\n\n" +
        "Classification rules:\n" +
        "- Shampoo, body wash, face wash → rinse-off\n" +
        "- Moisturiser, sunscreen, deodorant → leave-on\n" +
        "- All child products must be explicitly flagged in the submission payload\n",
    },
  ],
};

// ── Stage order tracking ───────────────────────────────────────────────────────
const stagesObserved: string[] = [];
const allEvents: any[] = [];
let finalTestCases: any[] = [];

// ── SSE parser ────────────────────────────────────────────────────────────────
async function callSSE(url: string, body: object): Promise<void> {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === "https:";
    const transport = isHttps ? https : http;
    const defaultPort = isHttps ? 443 : 5000;

    const options: http.RequestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || defaultPort,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(bodyStr),
        Accept: "text/event-stream",
      },
    };

    const req = transport.request(options, (res) => {
      let buffer = "";
      res.setEncoding("utf8");

      res.on("data", (chunk: string) => {
        buffer += chunk;
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          for (const line of part.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));
                allEvents.push(event);

                // Track pipeline stages
                if (event.type === "pipeline_stage" && event.stage) {
                  stagesObserved.push(event.stage);
                  console.log(`  [pipeline_stage] ${event.stage}: ${event.message}`);
                } else if (event.type === "agent_status" && event.status) {
                  const s = event.status;
                  if (s.status === "completed" || s.status === "working") {
                    console.log(`  [${s.agent}] ${s.status}: ${s.message}`);
                  }
                } else if (event.type === "coverage_summary") {
                  console.log(`  [coverage_summary] ${event.message}`);
                } else if (event.type === "refined_test_cases") {
                  finalTestCases = event.data?.testCases ?? [];
                  console.log(
                    `  [refined_test_cases] ${finalTestCases.length} test cases received`
                  );
                } else if (event.type === "complete") {
                  console.log(`  [complete] Generation finished`);
                } else if (event.type === "error") {
                  console.error(`  [error] ${event.message}`);
                }
              } catch {}
            }
          }
        }
      });

      res.on("end", resolve);
      res.on("error", reject);
    });

    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

// ── Main test runner ───────────────────────────────────────────────────────────
async function runTest() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  User Story Pipeline — End-to-End Test");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log("User Story:");
  console.log(`  Title:       ${USER_STORY.title}`);
  console.log(`  Description: ${USER_STORY.description.slice(0, 80)}...`);
  console.log(`  AC Lines:    ${USER_STORY.acceptanceCriteria.split("\n").filter(Boolean).length}`);
  console.log(`  Documents:   ${USER_STORY.uploadedDocuments.length} (${USER_STORY.uploadedDocuments[0].fileName})`);
  console.log(`\nCalling ${BASE_URL}/api/tests/sprint-generate ...\n`);
  console.log("── Pipeline Events ──────────────────────────────────────────────");

  const startMs = Date.now();
  await callSSE(`${BASE_URL}/api/tests/sprint-generate`, USER_STORY);
  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

  // ── Results ─────────────────────────────────────────────────────────────────
  console.log("\n── Final Test Cases ─────────────────────────────────────────────");
  if (finalTestCases.length === 0) {
    console.log("  ⚠  No refined_test_cases event received.");
    console.log(`  Total SSE events received: ${allEvents.length}`);
  } else {
    const byCategory: Record<string, number> = {};
    for (const tc of finalTestCases) {
      byCategory[tc.category] = (byCategory[tc.category] ?? 0) + 1;
    }
    console.log(`  Total: ${finalTestCases.length} test cases (${elapsed}s)\n`);
    for (const [cat, count] of Object.entries(byCategory)) {
      console.log(`    ${cat.padEnd(15)} ${count} tests`);
    }

    console.log("\n  Sample (first 3 test cases):");
    for (const tc of finalTestCases.slice(0, 3)) {
      console.log(`\n  [${tc.testCaseId}] ${tc.category} | ${tc.priority}`);
      console.log(`    Title:       ${tc.title}`);
      console.log(`    Objective:   ${tc.objective}`);
      console.log(`    Traceability: ${tc.traceability ?? "(none)"}`);
      if (tc.testSteps?.[0]) {
        console.log(`    Step 1:      ${tc.testSteps[0].action}`);
        console.log(`    Expected:    ${tc.testSteps[0].expected_behavior}`);
      }
    }
  }

  // ── Stage order verification ─────────────────────────────────────────────────
  console.log("\n── Pipeline Stage Order Verification ────────────────────────────");

  const EXPECTED_ORDER = [
    "connecting",
    "initialization",
    "generation",
    "refinement",
    "script_generation",
  ];

  // Deduplicate consecutive repeats (e.g. "generation" fires once per category)
  const deduped = stagesObserved.filter(s => EXPECTED_ORDER.includes(s));
  const observed = deduped.filter((s, i) => i === 0 || s !== deduped[i - 1]);
  const passOrder = observed.every((s, i) => {
    const expectedIdx = EXPECTED_ORDER.indexOf(s);
    const prevStage = observed[i - 1];
    if (!prevStage) return true;
    return EXPECTED_ORDER.indexOf(prevStage) < expectedIdx;
  });

  for (const stage of EXPECTED_ORDER) {
    const found = stagesObserved.includes(stage);
    console.log(`  ${found ? "✅" : "❌"} ${stage}`);
  }
  console.log(`\n  Stage order correct: ${passOrder ? "✅ YES" : "❌ NO"}`);
  console.log(`  Total events:        ${allEvents.length}`);
  console.log(`  Elapsed:             ${elapsed}s`);

  console.log("\n═══════════════════════════════════════════════════════════════\n");

  if (finalTestCases.length === 0) {
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error("Test failed:", err.message);
  process.exit(1);
});
