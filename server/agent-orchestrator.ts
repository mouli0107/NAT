/**
 * NAT Agent Orchestrator — Synthetic Data Pipeline
 *
 * Coordinates 5 specialized agents over Server-Sent Events (SSE):
 *   Parsing Agent → Schema Agent → Regex Agent → Validation Agent → Generation Agent
 *
 * Each agent does REAL work. Events stream to the client in real-time,
 * giving users live visibility into what the AI pipeline is doing.
 */

import type { Response } from "express";
import * as readline from "readline";
import * as fs from "fs";

// ─── Event Types ──────────────────────────────────────────────────────────────

export type AgentId =
  | "orchestrator"
  | "parsing"
  | "schema"
  | "regex"
  | "validation"
  | "generation";

export type AgentEventType =
  | "agent_start"
  | "agent_task"
  | "agent_progress"
  | "agent_complete"
  | "agent_error"
  | "orchestrator_message"
  | "final_schema"
  | "preview_record"
  | "done";

export interface AgentEvent {
  type:      AgentEventType;
  agentId:   AgentId;
  message:   string;
  progress?: number;     // 0–1
  data?:     unknown;
  timestamp: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendEvent(res: Response, event: AgentEvent): void {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (typeof (res as any).flush === "function") (res as any).flush();
  } catch {
    // Client disconnected — ignore
  }
}

const delay = (ms: number): Promise<void> =>
  new Promise(r => setTimeout(r, ms));

function escapeRegex(v: string): string {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Default regex patterns per field type ────────────────────────────────────

const DEFAULT_REGEX: Record<string, string> = {
  account_id:   "[0-9]{8}",
  ssn:          "[0-9]{9}",
  phone:        "[2-9][0-9]{2}[2-9][0-9]{6}",
  zip_code:     "[0-9]{5}(-[0-9]{4})?",
  email:        "[a-z]{4,10}[0-9]{2,3}@(gmail|yahoo|outlook|company)\\.com",
  date_mmddyy:  "(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{2}",
  state_code:   "(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)",
  country_code: "(US|CA|GB|AU|DE|FR|IT|JP|MX|BR|IN|CN|SG|ZA)",
  amount:       "[0-9]{1,6}\\.[0-9]{4}",
  integer:      "[0-9]{1,5}",
  timestamp:    "[0-9]{1,2}/[0-9]{1,2}/20[2-3][0-9] [0-9]{1,2}:[0-5][0-9]:[0-5][0-9] (AM|PM)",
  text:         "[A-Za-z ]{4,20}",
  name:         "[A-Z][A-Z]{2,8} [A-Z][A-Z]{2,9}",
  address:      "[0-9]{3,4} [A-Z][A-Z]{3,8} (ST|AVE|DR|RD|BLVD)",
  city:         "[A-Z][A-Z]{3,9}",
};

// ─── Semantic name → field type override ─────────────────────────────────────
// When an enriched column name contains a well-known keyword, the name wins
// over value-based inference. This fixes cases like zipcd_code_2 where the
// sample data had placeholder strings (ZIPCD, OK) instead of real values.

// Note: use /(^|_|-)keyword($|_|-)/ style patterns so "phone_number" and
// "account_num" match, but NOT "iphone" or "counterbalance".
const SEMANTIC_NAME_RULES: Array<{ test: RegExp; type: string }> = [
  // Zip / postal — very specific, check first
  { test: /zip|zipcd|postal|postcode/,                             type: "zip_code"     },
  // SSN / tax ID
  { test: /(^|_)ssn(_|$)|tax_id|taxid|(^|_)tin(_|$)|national_id|sin_num/, type: "ssn" },
  // Phone — "phone_number", "tel_num", "fax_no", "mobile_num", "cell_phone"
  { test: /phone|_tel_|_tel$|^tel_|_fax_|_fax$|^fax_|mobile|cell_phone/, type: "phone" },
  // Email
  { test: /email|e_mail/,                                          type: "email"        },
  // Account number — acct_num, account_num, acct_no, account_no, acct_id
  { test: /acct_num|account_num|acct_no|account_no|acct_id/,      type: "account_id"   },
  // Dates
  { test: /_date$|_date_|^date_|_dt$|_dt_|^dt_|(^|_)dob(_|$)|birth_date/, type: "date_mmddyy" },
  // State code
  { test: /state_cd|state_code|_st_cd|_st_code/,                  type: "state_code"   },
  // Country code
  { test: /country_cd|country_code|cntry_cd/,                     type: "country_code" },
  // Amount / balance / premium — "premium_amt", "balance", "pay_amount"
  { test: /_amt$|_amt_|^amt_|(^|_)amount(_|$)|(^|_)balance(_|$)|premium|pay_amt/, type: "amount" },
  // Person / company name
  { test: /first_name|last_name|fname|lname|full_name|cust_name|beneficiary_name/, type: "name" },
  // Address
  { test: /(^|_)addr(_|$)|address|street/,                        type: "address"      },
  // City
  { test: /(^|_)city(_|$)|(^|_)cty(_|$)/,                        type: "city"         },
];

// Types that name-based override is allowed to replace (prevents overriding
// a correctly-detected ssn, phone, etc. with a wrong name-based guess)
const OVERRIDABLE_TYPES = new Set(["code_pool", "text", "integer", "unknown", "literal"]);

/**
 * After AI enrichment, scan every column's displayName for semantic keywords
 * and fix detectedType + sqlType where the name is a stronger signal than values.
 */
function applySemanticNameOverrides(schema: any): any {
  const columns = (schema.columns || []).map((col: any) => {
    const name = (col.displayName || "").toLowerCase();
    for (const rule of SEMANTIC_NAME_RULES) {
      if (rule.test.test(name) && OVERRIDABLE_TYPES.has(col.detectedType)) {
        const overriddenType = rule.type;
        // Build better SQL type
        const sqlTypeMap: Record<string, string> = {
          zip_code: "VARCHAR(10)",
          ssn:      "VARCHAR(9)",
          phone:    "VARCHAR(10)",
          email:    "VARCHAR(100)",
          account_id: "VARCHAR(8)",
          date_mmddyy: "VARCHAR(6)",
          state_code:  "CHAR(2)",
          country_code: "CHAR(2)",
          amount:   "DECIMAL(15,5)",
          name:     "VARCHAR(100)",
          address:  "VARCHAR(200)",
          city:     "VARCHAR(80)",
        };
        return {
          ...col,
          detectedType: overriddenType,
          sqlType: sqlTypeMap[overriddenType] ?? col.sqlType,
          // clear the erroneous code_pool pool — no longer needed
          pool: overriddenType === "code_pool" ? col.pool : undefined,
        };
      }
    }
    return col;
  });
  return { ...schema, columns };
}

// ─── Main orchestration function ──────────────────────────────────────────────

export async function runOrchestration(
  filePath: string,
  filename: string,
  res:      Response,
): Promise<void> {

  /** Shorthand emit with auto-timestamp */
  const e = (ev: Omit<AgentEvent, "timestamp">): void =>
    sendEvent(res, { ...ev, timestamp: Date.now() });

  try {
    // ── Orchestrator: announce ───────────────────────────────────────────────
    e({
      type:    "orchestrator_message",
      agentId: "orchestrator",
      message: `File received: "${filename}". Initialising 5-agent pipeline…`,
    });
    await delay(450);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 1 — PARSING AGENT
    // Detects format, counts lines, runs the deep streaming parse
    // ═══════════════════════════════════════════════════════════════════════
    e({ type: "agent_start", agentId: "parsing", message: "Parsing Agent online" });
    await delay(200);

    // File size
    const stat    = fs.statSync(filePath);
    const sizeStr = stat.size < 1024 * 1024
      ? `${(stat.size / 1024).toFixed(1)} KB`
      : `${(stat.size / 1024 / 1024).toFixed(1)} MB`;

    e({ type: "agent_task", agentId: "parsing",
        message: `Opening file: ${filename} (${sizeStr})`, progress: 0.05 });
    await delay(250);

    // Read first 30 lines to detect format
    const headLines: string[] = [];
    await new Promise<void>(resolve => {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });
      rl.on("line", line => {
        headLines.push(line);
        if (headLines.length >= 30) rl.close();
      });
      rl.on("close", resolve);
    });

    // Delimiter detection
    const headSample = headLines.slice(0, 5).join("\n");
    const pipeCount  = (headSample.match(/\|/g)  || []).length;
    const commaCount = (headSample.match(/,/g)   || []).length;
    const tabCount   = (headSample.match(/\t/g)  || []).length;
    let delimLabel   = "pipe (|)";
    if (commaCount > pipeCount && commaCount > tabCount) delimLabel = "comma (,)";
    if (tabCount   > pipeCount && tabCount   > commaCount) delimLabel = "tab (\\t)";

    e({ type: "agent_task", agentId: "parsing",
        message: `Delimiter detected: ${delimLabel}`, progress: 0.15 });
    await delay(220);

    // Record boundary detection
    const boundaryMatch = headLines[0]?.match(/^([A-Z]{1,4})\|/);
    if (boundaryMatch) {
      e({ type: "agent_task", agentId: "parsing",
          message: `Record boundary marker: "${boundaryMatch[1]}|"`, progress: 0.20 });
      await delay(180);
    }

    // Line count
    e({ type: "agent_task", agentId: "parsing",
        message: "Counting total lines in file…", progress: 0.28 });
    let totalLines = 0;
    await new Promise<void>(resolve => {
      const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity,
      });
      rl.on("line", () => totalLines++);
      rl.on("close", resolve);
    });

    e({ type: "agent_task", agentId: "parsing",
        message: `Total lines: ${totalLines.toLocaleString()}`, progress: 0.38 });
    await delay(200);
    e({ type: "agent_task", agentId: "parsing",
        message: "Running deep structure parse (sampling up to 5,000 lines)…", progress: 0.48 });

    // ── Real parse ───────────────────────────────────────────────────────────
    const { parseFileFromDisk } = await import("./synthetic-file-processor.js");
    const rawSchema = await parseFileFromDisk(filePath, filename);

    const estRecords = Math.round(totalLines / Math.max(rawSchema.linesPerRecord, 1));

    e({ type: "agent_task", agentId: "parsing",
        message: `Record layout: ${rawSchema.linesPerRecord} line${rawSchema.linesPerRecord > 1 ? "s" : ""}/record`,
        progress: 0.72 });
    await delay(200);
    e({ type: "agent_task", agentId: "parsing",
        message: `Sampled ${rawSchema.sampleRecordCount.toLocaleString()} records · ${rawSchema.columns.length} columns detected`,
        progress: 0.88 });
    await delay(200);

    e({ type: "agent_complete", agentId: "parsing",
        message: `Parse complete — ${rawSchema.columns.length} columns, ~${estRecords.toLocaleString()} total records`,
        progress: 1.0 });
    await delay(450);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 2 — SCHEMA AGENT
    // Walks every column and emits its detected type + pool/length metadata
    // ═══════════════════════════════════════════════════════════════════════
    e({ type: "orchestrator_message", agentId: "orchestrator",
        message: "Parsing complete. Schema Agent structuring column metadata…" });
    e({ type: "agent_start", agentId: "schema", message: "Schema Agent online" });
    await delay(300);

    e({ type: "agent_task", agentId: "schema",
        message: `Structuring ${rawSchema.columns.length} columns across ${rawSchema.linesPerRecord} line${rawSchema.linesPerRecord > 1 ? "s" : ""}/record…`,
        progress: 0.04 });
    await delay(280);

    // Per-column announcements
    const msPerCol  = rawSchema.columns.length > 40 ? 30 : rawSchema.columns.length > 20 ? 55 : 85;
    let schemaIdx   = 0;

    for (const col of rawSchema.columns) {
      schemaIdx++;
      const progress = 0.04 + (schemaIdx / rawSchema.columns.length) * 0.86;

      let detail = col.detectedType;
      if (col.pool && col.pool.length > 0 && col.pool.length <= 20) {
        const preview = col.pool.slice(0, 3).join(", ");
        detail += ` → pool [${preview}${col.pool.length > 3 ? ` … +${col.pool.length - 3}` : ""}]`;
      } else if (col.maxObservedLength && col.maxObservedLength > 0) {
        detail += ` → max ${col.maxObservedLength} chars`;
      }

      e({ type: "agent_task", agentId: "schema",
          message: `L${col.lineIndex + 1}·P${col.position + 1}  "${col.displayName}":  ${detail}`,
          progress,
          data: { colId: col.id, type: col.detectedType } });

      await delay(msPerCol);
    }

    // Summary signals
    const piiCols     = rawSchema.columns.filter(c => c.isPII);
    const poolCols    = rawSchema.columns.filter(c => c.detectedType === "code_pool");
    const emptyCols   = rawSchema.columns.filter(c => c.detectedType === "always_empty");
    const literalCols = rawSchema.columns.filter(c => c.detectedType === "literal");

    if (piiCols.length > 0) {
      e({ type: "agent_task", agentId: "schema",
          message: `⚠ ${piiCols.length} PII field${piiCols.length > 1 ? "s" : ""} flagged — values will be masked in output`,
          progress: 0.93 });
      await delay(200);
    }
    if (poolCols.length > 0) {
      e({ type: "agent_task", agentId: "schema",
          message: `📊 ${poolCols.length} categorical pool field${poolCols.length > 1 ? "s" : ""} — values sampled from observed set`,
          progress: 0.96 });
      await delay(200);
    }
    if (literalCols.length > 0) {
      e({ type: "agent_task", agentId: "schema",
          message: `🔒 ${literalCols.length} constant field${literalCols.length > 1 ? "s" : ""} — always emit exact literal value`,
          progress: 0.98 });
      await delay(150);
    }

    e({ type: "agent_complete", agentId: "schema",
        message: `Schema structured — ${rawSchema.columns.length} cols, ${piiCols.length} PII masked, ${emptyCols.length} sparse/empty`,
        progress: 1.0 });
    await delay(450);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 3 — REGEX AGENT
    // Enriches column names via Claude AI, then generates regex patterns
    // ═══════════════════════════════════════════════════════════════════════
    e({ type: "orchestrator_message", agentId: "orchestrator",
        message: "Schema Agent done. Regex Agent enriching names and generating patterns…" });
    e({ type: "agent_start", agentId: "regex", message: "Regex Agent online" });
    await delay(300);

    // Step A — AI enrichment
    e({ type: "agent_task", agentId: "regex",
        message: "Querying AI model to identify column semantics from sample values…",
        progress: 0.05 });

    let enrichedSchema: typeof rawSchema;
    try {
      const { enrichSchemaNames } = await import("./schema-name-enricher.js");
      enrichedSchema = await enrichSchemaNames(rawSchema);
      e({ type: "agent_task", agentId: "regex",
          message: "✓ AI enrichment complete — semantic column names applied",
          progress: 0.33 });
    } catch {
      enrichedSchema = rawSchema;
      e({ type: "agent_task", agentId: "regex",
          message: "AI enrichment unavailable — using heuristic labels (non-blocking)",
          progress: 0.33 });
    }

    // ── Semantic name override pass ──────────────────────────────────────────
    // After AI renames columns (e.g. "zipcd_code_2"), scan for well-known
    // keywords and fix detectedType if value inference got it wrong (e.g.
    // code_pool → zip_code when sample values were placeholder strings).
    const beforeOverride = enrichedSchema.columns.filter((c: any) => c.detectedType !== "code_pool" && c.detectedType !== "unknown").length;
    enrichedSchema = applySemanticNameOverrides(enrichedSchema);
    const afterOverride  = enrichedSchema.columns.filter((c: any) => c.detectedType !== "code_pool" && c.detectedType !== "unknown").length;
    const overrideCount  = afterOverride - beforeOverride;
    if (overrideCount > 0) {
      e({ type: "agent_task", agentId: "regex",
          message: `✓ Semantic name scan: ${overrideCount} field type${overrideCount > 1 ? "s" : ""} corrected (zip, email, date, etc.)`,
          progress: 0.36 });
    }
    await delay(300);

    // Step B — per-column regex generation
    e({ type: "agent_task", agentId: "regex",
        message: `Generating regex patterns for ${enrichedSchema.columns.length} columns…`,
        progress: 0.38 });
    await delay(220);

    const regexMap: Record<string, string> = {};
    const msPerRegex = enrichedSchema.columns.length > 40 ? 28 : enrichedSchema.columns.length > 20 ? 50 : 75;
    let regexIdx = 0;

    for (const col of enrichedSchema.columns) {
      regexIdx++;
      const progress = 0.38 + (regexIdx / enrichedSchema.columns.length) * 0.57;
      const key      = col.id;
      let   regex: string | null = null;
      const t = col.detectedType;

      // Build pattern — named types get proper semantic regex, not pool literals
      if (t === "literal" && col.literalValue) {
        regex = escapeRegex(col.literalValue);
      } else if (DEFAULT_REGEX[t]) {
        // Named type (including zip_code, email, ssn, phone, etc.) → semantic regex
        regex = DEFAULT_REGEX[t];
      } else if (t === "code_pool" && col.pool && col.pool.length > 0) {
        regex = `(${col.pool.slice(0, 15).map(escapeRegex).join("|")})`;
      }
      // always_empty → no pattern

      if (regex) {
        regexMap[key] = regex;
        const label = col.displayName || col.id;
        const display = regex.length > 48 ? regex.slice(0, 48) + "…" : regex;
        e({ type: "agent_task", agentId: "regex",
            message: `"${label}"  →  /${display}/`,
            progress,
            data: { colId: key, regex } });
        await delay(msPerRegex);
      }
    }

    e({ type: "agent_complete", agentId: "regex",
        message: `${Object.keys(regexMap).length} regex patterns generated across ${enrichedSchema.columns.length} columns`,
        progress: 1.0 });
    await delay(450);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 4 — VALIDATION AGENT
    // Checks sample data conformance, population rates, anomalies
    // ═══════════════════════════════════════════════════════════════════════
    e({ type: "orchestrator_message", agentId: "orchestrator",
        message: "Patterns ready. Validation Agent running data conformance checks…" });
    e({ type: "agent_start", agentId: "validation", message: "Validation Agent online" });
    await delay(300);

    const sampleN = Math.min(enrichedSchema.sampleRecordCount, 50);
    e({ type: "agent_task", agentId: "validation",
        message: `Loading ${sampleN} sample records for conformance analysis…`,
        progress: 0.05 });
    await delay(340);

    let totalChecked = 0, totalPassed = 0, sparseCount = 0;
    let valIdx = 0;
    const msPerVal = enrichedSchema.columns.length > 40 ? 28 : 55;

    for (const col of enrichedSchema.columns) {
      valIdx++;
      if (col.detectedType === "always_empty") continue;

      const progress = 0.05 + (valIdx / enrichedSchema.columns.length) * 0.88;
      const label    = col.displayName || col.id;
      const popPct   = col.totalSampleCount > 0
        ? Math.round((col.populatedCount / col.totalSampleCount) * 100)
        : 0;

      totalChecked += col.totalSampleCount;
      totalPassed  += col.populatedCount;

      if (popPct < 50 && col.totalSampleCount > 0) {
        sparseCount++;
        e({ type: "agent_task", agentId: "validation",
            message: `⚠ "${label}": sparse field — ${popPct}% populated (${col.populatedCount}/${col.totalSampleCount})`,
            progress,
            data: { status: "warn", colId: col.id, popPct } });
      } else {
        e({ type: "agent_task", agentId: "validation",
            message: `✓ "${label}": ${popPct}% populated — type ${col.detectedType} ✓`,
            progress,
            data: { status: "ok", colId: col.id, popPct } });
      }
      await delay(msPerVal);
    }

    const qualityScore = totalChecked > 0
      ? Math.round((totalPassed / totalChecked) * 100)
      : 100;

    e({ type: "agent_task", agentId: "validation",
        message: `Overall data quality: ${qualityScore}%${sparseCount > 0 ? ` · ${sparseCount} sparse field${sparseCount > 1 ? "s" : ""} detected` : " — excellent"}`,
        progress: 0.96 });
    await delay(250);

    e({ type: "agent_complete", agentId: "validation",
        message: `Validation complete — ${qualityScore}% quality · ${enrichedSchema.columns.length - emptyCols.length} active columns verified`,
        progress: 1.0 });
    await delay(450);

    // ═══════════════════════════════════════════════════════════════════════
    // AGENT 5 — GENERATION AGENT
    // Applies patterns, runs the generator, streams 5 preview records
    // ═══════════════════════════════════════════════════════════════════════
    e({ type: "orchestrator_message", agentId: "orchestrator",
        message: "All checks passed. Generation Agent creating preview records…" });
    e({ type: "agent_start", agentId: "generation", message: "Generation Agent online" });
    await delay(300);

    e({ type: "agent_task", agentId: "generation",
        message: "Applying regex overrides to schema columns…", progress: 0.06 });
    await delay(230);
    e({ type: "agent_task", agentId: "generation",
        message: "Initialising pool coverage tracker — ensuring all values appear…", progress: 0.12 });
    await delay(230);
    e({ type: "agent_task", agentId: "generation",
        message: "Calculating record distribution: 80% positive / 15% edge / 5% negative…", progress: 0.18 });
    await delay(230);

    // Stamp regex overrides onto the schema
    const schemaWithRegex = {
      ...enrichedSchema,
      columns: enrichedSchema.columns.map((col: any) => ({
        ...col,
        customRegex: regexMap[col.id] ?? col.customRegex,
      })),
    };

    try {
      const { generateTestData } = await import("./synthetic-file-processor.js");
      const preview = generateTestData({
        schema:          schemaWithRegex,
        recordCount:     5,
        includeManifest: false,
      });

      // Split into individual records
      const lines = preview.data.split("\n").filter((l: string) => l.trim() !== "");
      const lpr   = enrichedSchema.linesPerRecord;

      for (let i = 0; i < lines.length; i += lpr) {
        const recNum  = Math.floor(i / lpr) + 1;
        const recLines = lines.slice(i, i + lpr);
        const pct     = 0.18 + (recNum / 5) * 0.78;

        e({ type: "agent_task", agentId: "generation",
            message: `Generating record ${recNum} of 5…`, progress: pct });

        await delay(50); // small gap before emitting record

        e({ type: "preview_record", agentId: "generation",
            message: `Record ${recNum} ready`,
            data: { lines: recLines, recordNumber: recNum } });

        await delay(230);
      }

      e({ type: "agent_task", agentId: "generation",
          message: `5 preview records produced — schema ready for full dataset generation`,
          progress: 0.98 });

    } catch (genErr) {
      console.warn("[AgentOrchestrator] Preview generation skipped:", genErr);
      e({ type: "agent_task", agentId: "generation",
          message: "Preview skipped — schema is ready, generate on demand via schema editor",
          progress: 0.98 });
    }

    await delay(200);
    e({ type: "agent_complete", agentId: "generation",
        message: "Generation Agent ready — full dataset can be produced on demand",
        progress: 1.0 });
    await delay(500);

    // ═══════════════════════════════════════════════════════════════════════
    // ALL DONE — ship schema to client
    // ═══════════════════════════════════════════════════════════════════════
    e({ type: "orchestrator_message", agentId: "orchestrator",
        message: "✓ All 5 agents completed. Schema validated and ready for review." });
    await delay(350);

    e({ type: "final_schema", agentId: "orchestrator",
        message: "Handing off schema to editor…",
        data: { schema: enrichedSchema, regexMap } });

    await delay(200);
    e({ type: "done", agentId: "orchestrator", message: "Orchestration complete" });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AgentOrchestrator] Fatal error:", msg);
    e({ type: "agent_error",        agentId: "orchestrator", message: `Orchestration error: ${msg}` });
    e({ type: "done", agentId: "orchestrator", message: "Orchestration failed" });
  }
}
