/**
 * generate-fidelity-files.ts
 *
 * Creates the Fidelity custodian bundle profile (upload_position + account_transaction),
 * generates 25 rows per table, and writes the CSV output files to data/test-files/.
 *
 * Run:  npx tsx server/scripts/generate-fidelity-files.ts
 */

import fs   from "fs";
import path from "path";

// Use dynamic import so ESM .js extensions work inside this CommonJS-style tsx script
import { createBundleProfile, deleteBundleProfile, listBundleProfiles }
  from "../custodian-bundle-profiles.js";
import { generateBundle } from "../bundle-generator.js";
import type { InferredSchema } from "../synthetic-file-processor.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function col(
  position: number,
  displayName: string,
  sqlType: string,
  detectedType: string,
  extra: Partial<{ pool: string[]; literalValue: string; isLiteral: boolean }> = {}
) {
  return {
    id:               `L0_P${position}`,
    displayName,
    lineIndex:        0,
    position,
    sqlType,
    detectedType,
    isPII:            false,
    sampleValue:      "",
    populatedCount:   10,
    totalSampleCount: 10,
    isLiteral:        extra.isLiteral ?? false,
    literalValue:     extra.literalValue,
    pool:             extra.pool,
    maxObservedLength: sqlType.match(/\((\d+)/)?.[1] ? parseInt(sqlType.match(/\((\d+)/)![1]) : 10,
  };
}

function schema(columns: ReturnType<typeof col>[]): InferredSchema {
  return {
    format:          "csv",
    delimiter:       "|",
    linesPerRecord:  1,
    sampleRecordCount: 10,
    columns:         columns as any,
  };
}

// ─── upload_position schema ────────────────────────────────────────────────────

const positionSchema = schema([
  col( 0, "account_id",          "VARCHAR(15)",   "account_id"),
  col( 1, "security_id",         "VARCHAR(20)",   "code_pool",   { pool: ["AAPL","MSFT","GOOGL","AMZN","TSLA","SPY","QQQ","BND","GLD","VTI"] }),
  col( 2, "entry_code",          "VARCHAR(5)",    "code_pool",   { pool: ["DVP","FP","RVP","REC","DEL"] }),
  col( 3, "entry_date",          "DATE",          "date_mmddyy"),
  col( 4, "units",               "DECIMAL(18,6)", "amount"),
  col( 5, "market_value",        "DECIMAL(18,2)", "amount"),
  col( 6, "file_number",         "INTEGER",       "integer"),
  col( 7, "position_id",         "VARCHAR(20)",   "code_pool",   { pool: ["POS001","POS002","POS003","POS004","POS005","POS006","POS007","POS008"] }),
  col( 8, "owner_id",            "VARCHAR(15)",   "account_id"),
  col( 9, "owner_type",          "VARCHAR(5)",    "code_pool",   { pool: ["IND","JT","IRA","ROTH","TRUST"] }),
  col(10, "cash_tag",            "VARCHAR(1)",    "code_pool",   { pool: ["Y","N"] }),
  col(11, "trust_tag",           "VARCHAR(1)",    "code_pool",   { pool: ["Y","N"] }),
  col(12, "settlement_currency", "VARCHAR(3)",    "code_pool",   { pool: ["USD","EUR","GBP","CAD","AUD"] }),
  col(13, "hold_id",             "VARCHAR(10)",   "code_pool",   { pool: ["HLD001","HLD002","HLD003",""] }),
  col(14, "provider_id",         "VARCHAR(10)",   "code_pool",   { pool: ["FID","DTCC","JPM","BAML"] }),
  col(15, "restriction_flag",    "VARCHAR(1)",    "code_pool",   { pool: ["Y","N","P"] }),
  col(16, "pending_units",       "DECIMAL(18,6)", "amount"),
]);

// ─── account_transaction schema ────────────────────────────────────────────────

const transactionSchema = schema([
  col( 0, "transaction_id",         "VARCHAR(20)",   "code_pool",   { pool: ["TRN0001","TRN0002","TRN0003","TRN0004","TRN0005","TRN0006","TRN0007","TRN0008","TRN0009","TRN0010","TRN0011","TRN0012","TRN0013","TRN0014","TRN0015","TRN0016","TRN0017","TRN0018","TRN0019","TRN0020","TRN0021","TRN0022","TRN0023","TRN0024","TRN0025"] }),
  col( 1, "account_id",             "VARCHAR(15)",   "account_id"),   // FK → position.account_id
  col( 2, "transaction_date",       "DATE",          "date_mmddyy"),
  col( 3, "transaction_type",       "VARCHAR(10)",   "code_pool",   { pool: ["BUY","SELL"] }),  // enriched by business rule
  col( 4, "security_id",            "VARCHAR(20)",   "code_pool",   { pool: ["AAPL","MSFT","GOOGL","AMZN","TSLA","SPY","QQQ","BND","GLD","VTI"] }),
  col( 5, "transaction_amount",     "DECIMAL(18,2)", "amount"),
  col( 6, "units",                  "DECIMAL(18,6)", "amount"),
  col( 7, "commission_amount",      "DECIMAL(18,2)", "amount"),
  col( 8, "file_number",            "INTEGER",       "integer"),
  col( 9, "memo",                   "VARCHAR(100)",  "text"),
  col(10, "delete_flag",            "VARCHAR(1)",    "literal",     { isLiteral: true, literalValue: "N" }),
  col(11, "updated_by",             "VARCHAR(20)",   "code_pool",   { pool: ["SYS","BATCH","USER1","FID_FEED"] }),
  col(12, "transaction_code",       "VARCHAR(10)",   "code_pool",   { pool: ["TRD","DIV","INT","FEE","ADJ"] }),
  col(13, "line_number",            "INTEGER",       "integer"),
  col(14, "last_update_date",       "DATE",          "timestamp"),
  col(15, "transaction_flags",      "VARCHAR(10)",   "code_pool",   { pool: ["REG","AUTO","MAN","CORR"] }),
  col(16, "import_transaction_flag","VARCHAR(1)",    "code_pool",   { pool: ["Y","N"] }),
]);

// ─── Main ──────────────────────────────────────────────────────────────────────

const ROW_COUNT = 25;
const TABLE_POS_ID = `tbl_pos_${Date.now()}`;
const TABLE_TXN_ID = `tbl_txn_${Date.now() + 1}`;

// Clean up any prior Fidelity test profiles so we start fresh
const existing = listBundleProfiles().filter(p => p.custodianName === "Fidelity");
for (const p of existing) {
  deleteBundleProfile(p.id);
  console.log(`[Setup] Removed old Fidelity profile: ${p.id}`);
}

console.log("\n[Step 1] Creating Fidelity bundle profile...");
const profile = createBundleProfile({
  custodianName: "Fidelity",
  description:   "Fidelity custodian file bundle — upload_position + account_transaction",

  tables: [
    {
      tableId:     TABLE_POS_ID,
      tableName:   "upload_position",
      description: "Daily position snapshot per account/security",
      schema:      positionSchema,
      foreignKeys: [],
      fieldMappings: [
        { umpField: "account_id",          custodianField: "ACCT_NBR"   },
        { umpField: "security_id",         custodianField: "SEC_ID"     },
        { umpField: "entry_code",          custodianField: "ENTRY_CD"   },
        { umpField: "entry_date",          custodianField: "ENTRY_DT"   },
        { umpField: "units",               custodianField: "UNIT_QTY"   },
        { umpField: "market_value",        custodianField: "MKT_VAL"    },
        { umpField: "file_number",         custodianField: "FILE_NBR"   },
        { umpField: "position_id",         custodianField: "POS_ID"     },
        { umpField: "owner_id",            custodianField: "OWN_ID"     },
        { umpField: "owner_type",          custodianField: "OWN_TYPE"   },
        { umpField: "cash_tag",            custodianField: "CASH_TAG"   },
        { umpField: "trust_tag",           custodianField: "TRUST_TAG"  },
        { umpField: "settlement_currency", custodianField: "SETL_CCY"   },
        { umpField: "hold_id",             custodianField: "HOLD_ID"    },
        { umpField: "provider_id",         custodianField: "PROV_ID"    },
        { umpField: "restriction_flag",    custodianField: "RESTR_FLG"  },
        { umpField: "pending_units",       custodianField: "PEND_UNITS" },
      ],
    },
    {
      tableId:     TABLE_TXN_ID,
      tableName:   "account_transaction",
      description: "Transaction activity — BUY/SELL events per account",
      schema:      transactionSchema,
      foreignKeys: [
        {
          localColumn: "account_id",   // UMP name in this table
          refTableId:  TABLE_POS_ID,
          refColumn:   "account_id",   // UMP name in position table
        },
      ],
      fieldMappings: [
        { umpField: "transaction_id",          custodianField: "TRN_ID"      },
        { umpField: "account_id",              custodianField: "ACCT_NBR"    },
        { umpField: "transaction_date",        custodianField: "TRN_DT"      },
        { umpField: "transaction_type",        custodianField: "TRN_TYPE"    },
        { umpField: "security_id",             custodianField: "SEC_ID"      },
        { umpField: "transaction_amount",      custodianField: "TRN_AMT"     },
        { umpField: "units",                   custodianField: "UNIT_QTY"    },
        { umpField: "commission_amount",       custodianField: "COMM_AMT"    },
        { umpField: "file_number",             custodianField: "FILE_NBR"    },
        { umpField: "memo",                    custodianField: "MEMO"        },
        { umpField: "delete_flag",             custodianField: "DEL_FLG"     },
        { umpField: "updated_by",              custodianField: "UPDT_BY"     },
        { umpField: "transaction_code",        custodianField: "TRAN_CD"     },
        { umpField: "line_number",             custodianField: "LINE_NUM"    },
        { umpField: "last_update_date",        custodianField: "LST_UPDT_DT" },
        { umpField: "transaction_flags",       custodianField: "TRN_FLAGS"   },
        { umpField: "import_transaction_flag", custodianField: "IMP_TRN_FLG" },
      ],
    },
  ],

  businessRules: [
    {
      ruleId:             `rule_recalc_${Date.now()}`,
      type:               "position_recalc",
      description:        "Back-fill position units/market_value from transaction aggregates",
      positionTableId:    TABLE_POS_ID,
      transactionTableId: TABLE_TXN_ID,
      positionKeyCol:     "account_id",
      transKeyCol:        "account_id",
      calculations: [
        {
          positionCol: "units",
          transCol:    "units",
          typeCol:     "transaction_type",
          buyValue:    "BUY",
          sellValue:   "SELL",
        },
        {
          positionCol: "market_value",
          transCol:    "transaction_amount",
          typeCol:     "transaction_type",
          buyValue:    "BUY",
          sellValue:   "SELL",
        },
      ],
    },
  ],
});

console.log(`[Step 1] Profile created: ${profile.id}`);
console.log(`         Tables: ${profile.tables.map(t => `${t.tableName} (sortOrder=${t.sortOrder})`).join(", ")}`);
console.log(`         Business rules: ${profile.businessRules.length}`);

// ─── Generate ──────────────────────────────────────────────────────────────────

console.log(`\n[Step 2] Generating ${ROW_COUNT} rows per table...`);
const result = generateBundle(profile.id, ROW_COUNT);
if (!result) {
  console.error("ERROR: generateBundle returned null");
  process.exit(1);
}

console.log(`\n[Step 2] Generation complete:`);
for (const t of result.tables) {
  console.log(`         ${t.tableName}: ${t.rowCount} rows × ${t.headers.length} columns`);
}

// ─── Write files ───────────────────────────────────────────────────────────────

const outDir = path.join(process.cwd(), "data", "test-files");
fs.mkdirSync(outDir, { recursive: true });

const DELIM = "|";

for (const t of result.tables) {
  const headerLine = t.headers.join(DELIM);
  const dataLines  = t.rows.map(r => r.join(DELIM)).join("\n");
  const content    = `${headerLine}\n${dataLines}`;
  const filename   = `${t.tableName}_fidelity.txt`;   // pipe-delimited → .txt
  const outPath    = path.join(outDir, filename);
  fs.writeFileSync(outPath, content, "utf8");
  console.log(`\n[Step 3] Wrote: ${outPath}`);
  console.log(`         Header: ${headerLine}`);
  console.log(`         Rows  : ${t.rowCount}`);
}

// ─── Quick sanity check ────────────────────────────────────────────────────────

console.log("\n[Step 4] Sanity checks...");

const posResult = result.tables.find(t => t.tableName === "upload_position")!;
const txnResult = result.tables.find(t => t.tableName === "account_transaction")!;

// Check 1: Headers use custodian names
const posHeaders = posResult.headers.join(",");
const txnHeaders = txnResult.headers.join(",");
console.log(`\n  upload_position headers  : ${posHeaders}`);
console.log(`  account_transaction headers: ${txnHeaders}`);

const posHasCustodian  = posHeaders.includes("ACCT_NBR") && posHeaders.includes("UNIT_QTY") && posHeaders.includes("MKT_VAL");
const txnHasCustodian  = txnHeaders.includes("ACCT_NBR") && txnHeaders.includes("TRN_TYPE") && txnHeaders.includes("TRN_AMT");
console.log(`\n  ✔ Position headers use custodian names : ${posHasCustodian}`);
console.log(`  ✔ Transaction headers use custodian names: ${txnHasCustodian}`);

// Check 2: FK integrity — every ACCT_NBR in transactions exists in positions
const posAccts = new Set(posResult.rows.map(r => r[0]));
const txnAccts = txnResult.rows.map(r => r[1]);
const fkOk     = txnAccts.every(a => posAccts.has(a));
console.log(`\n  ✔ FK integrity (all transaction ACCT_NRBs in position) : ${fkOk}`);
const missing = [...new Set(txnAccts.filter(a => !posAccts.has(a)))];
if (missing.length) console.log(`    ⚠ Missing: ${missing.slice(0, 5).join(", ")}`);

// Check 3: TRN_TYPE only BUY / SELL
const trnTypeIdx = txnResult.headers.indexOf("TRN_TYPE");
const trnTypes   = new Set(txnResult.rows.map(r => r[trnTypeIdx]));
const trnTypeOk  = [...trnTypes].every(v => ["BUY","SELL"].includes(v));
console.log(`  ✔ TRN_TYPE values (BUY/SELL only) : ${trnTypeOk}  →  found: ${[...trnTypes].join(", ")}`);

// Check 4: For accounts that DO have transactions, UNIT_QTY must equal net aggregate.
//          Accounts with no transactions keep their originally generated value — that's
//          correct domain behaviour, not a failure.
const posAcctNbrIdx  = posResult.headers.indexOf("ACCT_NBR");
const posUnitQtyIdx  = posResult.headers.indexOf("UNIT_QTY");
const txnAcctNbrIdx  = txnResult.headers.indexOf("ACCT_NBR");
const txnUnitQtyIdx  = txnResult.headers.indexOf("UNIT_QTY");
const txnTrnTypeIdx  = txnResult.headers.indexOf("TRN_TYPE");

// Build net per account from transactions
const netUnitsMap: Record<string, number> = {};
const netMktValMapRaw: Record<string, number> = {};
const txnTrnAmtIdx = txnResult.headers.indexOf("TRN_AMT");

for (const txnRow of txnResult.rows) {
  const acct = (txnRow[txnAcctNbrIdx] ?? "").trim();
  const type = (txnRow[txnTrnTypeIdx] ?? "").toUpperCase();
  const units = parseFloat(txnRow[txnUnitQtyIdx] ?? "0") || 0;
  const amt   = parseFloat(txnRow[txnTrnAmtIdx]  ?? "0") || 0;
  if (!netUnitsMap[acct])    netUnitsMap[acct]    = 0;
  if (!netMktValMapRaw[acct]) netMktValMapRaw[acct] = 0;
  if (type === "BUY")  { netUnitsMap[acct] += units; netMktValMapRaw[acct] += amt; }
  if (type === "SELL") { netUnitsMap[acct] -= units; netMktValMapRaw[acct] -= amt; }
}

// Only check accounts that appear in at least one transaction
const accountsWithTxns = new Set(Object.keys(netUnitsMap));
let unitsCheckOk = true;
for (const posRow of posResult.rows) {
  const acct = (posRow[posAcctNbrIdx] ?? "").trim();
  if (!accountsWithTxns.has(acct)) continue;   // no transactions → keep original value ✓
  const posUnits = parseFloat(posRow[posUnitQtyIdx] ?? "0");
  const net      = Math.max(netUnitsMap[acct]!, 0);
  if (Math.abs(posUnits - net) > 0.001) {
    console.log(`    ⚠ ${acct}: UNIT_QTY=${posUnits} expected=${net.toFixed(6)}`);
    unitsCheckOk = false;
  }
}
console.log(`  ✔ UNIT_QTY recalc consistent (${accountsWithTxns.size} accounts with txns) : ${unitsCheckOk}`);

// Check 5: MKT_VAL in position matches transaction_amount aggregate
const posMktValIdx = posResult.headers.indexOf("MKT_VAL");

let mktValCheckOk = true;
for (const posRow of posResult.rows) {
  const acct = (posRow[posAcctNbrIdx] ?? "").trim();
  if (!accountsWithTxns.has(acct)) continue;   // no transactions → keep original value ✓
  const posMktVal = parseFloat(posRow[posMktValIdx] ?? "0");
  const net       = Math.max(netMktValMapRaw[acct]!, 0);
  if (Math.abs(posMktVal - net) > 0.01) {
    console.log(`    ⚠ ${acct}: MKT_VAL=${posMktVal} expected=${net.toFixed(2)}`);
    mktValCheckOk = false;
  }
}
console.log(`  ✔ MKT_VAL recalc consistent (${accountsWithTxns.size} accounts with txns) : ${mktValCheckOk}`);

// ─── Preview ───────────────────────────────────────────────────────────────────

console.log("\n─── upload_position (first 5 rows) ───");
console.log(posResult.headers.join(" | "));
for (const r of posResult.rows.slice(0, 5)) console.log(r.join(" | "));

console.log("\n─── account_transaction (first 5 rows) ───");
console.log(txnResult.headers.join(" | "));
for (const r of txnResult.rows.slice(0, 5)) console.log(r.join(" | "));

const allOk = posHasCustodian && txnHasCustodian && fkOk && trnTypeOk && unitsCheckOk && mktValCheckOk;
console.log(`\n${"═".repeat(60)}`);
console.log(`  Result: ${allOk ? "✅  ALL CHECKS PASSED" : "❌  SOME CHECKS FAILED"}`);
console.log(`  Files  : data/test-files/upload_position_fidelity.txt`);
console.log(`           data/test-files/account_transaction_fidelity.txt`);
console.log(`${"═".repeat(60)}\n`);
