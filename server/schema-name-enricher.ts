/**
 * Schema Name Enricher
 * Uses Claude API (with heuristic fallback) to assign meaningful
 * business column names to positional pipe-delimited file schemas.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { InferredSchema, FieldSchema } from "./synthetic-file-processor.js";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// ─── Heuristic fallback (no API key needed) ───────────────────────────────────

// Known code pool signatures → column name
const CODE_POOL_SIGNATURES: Array<{ values: string[]; name: string }> = [
  { values: ["DST1", "DST5"],                       name: "dst_type" },
  { values: ["HGWX", "HTIT", "CAPM"],               name: "settlement_code" },
  { values: ["DE22001U", "ACTU"],                    name: "clearing_code" },
  { values: ["$CICSP5", "PBSU318", "PBSU060"],       name: "clearing_sub_code" },
  { values: ["9999246", "9999139"],                  name: "account_group" },
  { values: ["Y", "N", "G"],                         name: "flag" },
  { values: ["C", "R"],                              name: "record_indicator" },
  { values: ["DST1", "DST5", "HTIT"],                name: "dst_type" },
];

// Known literal signatures → column name
const LITERAL_SIGNATURES: Record<string, string> = {
  "C":       "record_type",
  "ZIPCD":   "zip_placeholder",
  "4":       "segment_indicator",
  "X":       "active_flag",
  "Y":       "active_flag",
  "N":       "active_flag",
  "0":       "zero_flag",
  "1":       "one_flag",
};

function heuristicName(col: FieldSchema, typeCounters: Map<string, number>): string {
  const t = col.detectedType;
  const sample = col.sampleValue || "";
  const pool = col.pool || [];

  // Literals — match by value first, then derive from the literal value itself
  if (t === "literal" && col.literalValue) {
    const lv = col.literalValue;
    const known = LITERAL_SIGNATURES[lv];
    if (known) return dedup(known, typeCounters);

    // Derive a name from the literal value:
    // Pure alpha short (1-4 chars) → use as type indicator, e.g. "A" → "type_a"
    if (/^[A-Z]{1,4}$/.test(lv)) return dedup(`type_${lv.toLowerCase()}`, typeCounters);
    // Purely numeric → could be a constant code / segment id
    if (/^\d+$/.test(lv)) return dedup(`const_${lv}`, typeCounters);
    // Alphanumeric short code → use as-is lowercased
    const slug = lv.replace(/[^A-Za-z0-9]/g, "_").toLowerCase().slice(0, 20);
    return dedup(slug, typeCounters);
  }

  // Code pool — match by observed pool values
  if (t === "code_pool" && pool.length > 0) {
    for (const sig of CODE_POOL_SIGNATURES) {
      const matchCount = sig.values.filter(v => pool.includes(v)).length;
      if (matchCount >= Math.min(2, sig.values.length)) {
        return dedup(sig.name, typeCounters);
      }
    }
    // Generic code pool — use first pool value letters as hint
    const hint = pool[0]?.replace(/[^A-Za-z]/g, "").toLowerCase().slice(0, 8) || "code";
    return dedup(hint + "_code", typeCounters);
  }

  // Type-based names
  const TYPE_NAMES: Record<string, string> = {
    account_id:   "account_id",
    ssn:          "ssn_tax_id",
    phone:        "phone",
    state_code:   "state",
    country_code: "country",
    amount:       "amount",
    integer:      "seq_num",
    name:         "holder_name",
    address:      "address",
    city:         "city",
    timestamp:    "last_updated",
    always_empty: "reserved",
    unknown:      "field",
    text:         "value",
    literal:      "const_field",
    code_pool:    "code",
  };

  // Special: date fields — first=open_date, second=close_date, rest=date_N
  if (t === "date_mmddyy") {
    const n = (typeCounters.get("date_mmddyy") || 0);
    typeCounters.set("date_mmddyy", n + 1);
    if (n === 0) return "open_date";
    if (n === 1) return "close_date";
    return `date_${n + 1}`;
  }

  const base = TYPE_NAMES[t] || "field";
  return dedup(base, typeCounters);
}

function dedup(base: string, counters: Map<string, number>): string {
  const n = counters.get(base) || 0;
  counters.set(base, n + 1);
  return n === 0 ? base : `${base}_${n + 1}`;
}

export function applyHeuristicNames(schema: InferredSchema): InferredSchema {
  const counters = new Map<string, number>();
  const updated = schema.columns.map(col => ({
    ...col,
    displayName: heuristicName(col, counters),
  }));
  return { ...schema, columns: updated };
}

// ─── Claude enrichment ────────────────────────────────────────────────────────

export async function enrichSchemaNames(schema: InferredSchema): Promise<InferredSchema> {
  const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    console.log("[SchemaEnricher] No API key — using heuristic names");
    return applyHeuristicNames(schema);
  }

  // Build a compact field list for the prompt (skip always_empty fields — not useful)
  const interestingCols = schema.columns.filter(
    c => c.detectedType !== "always_empty" && c.populatedCount > 0
  );

  if (interestingCols.length === 0) return applyHeuristicNames(schema);

  // PII GUARD: never send real SSN / account / phone / name / address values to the API.
  // For PII fields, replace samples with a safe placeholder that still conveys field type.
  const PII_SAFE_PLACEHOLDER: Record<string, string> = {
    ssn:        "9-digit SSN",
    account_id: "8-digit account",
    phone:      "10-digit phone",
    name:       "person/company name",
    address:    "street address",
    city:       "city name",
  };

  const fieldLines = interestingCols.map(col => {
    let samples: string;
    if (col.isPII) {
      const placeholder = PII_SAFE_PLACEHOLDER[col.detectedType] ?? "PII value";
      samples = `samples: [${placeholder}]`;
    } else if (col.isLiteral && col.literalValue) {
      samples = `samples: [${col.literalValue}] (always this value)`;
    } else if (col.pool && col.pool.length > 0) {
      samples = `samples: [${col.pool.slice(0, 4).join(", ")}]`;
    } else if (col.sampleValue) {
      samples = `samples: [${col.sampleValue}]`;
    } else {
      samples = "always empty";
    }
    const literal = col.isLiteral ? ` [ALWAYS "${col.literalValue}"]` : "";
    return `  ${col.id} | line ${col.lineIndex + 1} pos ${col.position} | type: ${col.detectedType}${literal} | ${samples}`;
  }).join("\n");

  const prompt = `You are a financial data analyst. The file below is a pipe-delimited positional data file with ${schema.linesPerRecord} line(s) per record.

Here are the fields detected. For each field ID, provide a short, meaningful snake_case business column name (e.g. account_id, open_date, state_code, ssn_tax_id, product_code, clearing_code, holder_name, etc.).

Fields:
${fieldLines}

Rules:
- Names must be snake_case, lowercase, max 30 chars
- Use domain-appropriate financial/insurance terminology
- If multiple fields share the same semantic meaning, append _2, _3 etc.
- For literal/constant fields, use the value as a hint (e.g. "C" → record_type, "ZIPCD" → zip_placeholder)
- For code pools, use the pool values as hints (DST1/DST5 → dst_type, HGWX/CAPM → settlement_code)
- For 6-digit numbers that look like MMDDYY dates: first one = open_date, second = close_date
- For 9-digit numbers = ssn_or_tax_id
- For 10-digit numbers = phone
- For 8-digit numbers = account_id

Respond with ONLY a JSON array, no explanation:
[{"id": "L1_P0", "name": "record_type"}, ...]`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("No JSON array in Claude response");

    const mappings: Array<{ id: string; name: string }> = JSON.parse(jsonMatch[0]);
    const nameMap = new Map(mappings.map(m => [m.id, m.name]));

    // Apply Claude names to schema; fall back to heuristic for any missing ids
    const heuristicSchema = applyHeuristicNames(schema);
    const heuristicMap = new Map(heuristicSchema.columns.map(c => [c.id, c.displayName]));

    const updated = schema.columns.map(col => ({
      ...col,
      displayName: nameMap.get(col.id) || heuristicMap.get(col.id) || col.displayName,
    }));

    console.log(`[SchemaEnricher] Claude named ${nameMap.size} of ${schema.columns.length} fields`);
    return { ...schema, columns: updated };

  } catch (err: any) {
    console.warn("[SchemaEnricher] Claude naming failed, using heuristics:", err.message);
    return applyHeuristicNames(schema);
  }
}
