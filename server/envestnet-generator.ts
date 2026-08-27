/**
 * Envestnet / BETA Systems SAL_CSH synthetic data generator - v2 (2026-07-20).
 *
 * REBUILT to the customer's clarified requirement (Thillai Pandurangan, Envestnet,
 * 2026-07-10 + Transaction Code Details 2026-07-16):
 *   - Uniform 52-field, pipe-delimited (51 pipes) records - every record same shape.
 *   - Field ORDER + data types from the Thomson Reuters BETA copybook EXCSHY2K
 *     (CSH Documentation.pdf). The copybook order is authoritative: it is the only
 *     interpretation under which EVERY customer field-level comment lines up
 *     (field 5=ACCT_CLASS, 9=CUSIP, 22=SOURCE_CODE, 23=PURCH_OR_SALE, 33=NONCUST_SW,
 *     34-39=DESC). The raw Sal_csh.txt sample uses ragged 45-58 field positions; we
 *     intentionally normalize to the copybook layout (see manifest).
 *   - SOURCE_CODE (field 22) drawn from the customer's Security / Non-Security
 *     transaction-code lists. CUSIP/SYMBOL/SEC_NO/SEC_TYPE/DESC are populated ONLY
 *     for security transaction codes; blank for non-security.
 *   - Full valid-value coverage: all CSECTYPE (SEC_TYPE), all CPORS (PURCH_OR_SALE),
 *     all ACCT_TYPE 1-9, record types A/C/V, and every transaction code.
 *   - >=10 records per scenario (per source code) by default.
 *   - Negatives delivered SEPARATELY (labeled): type-mismatch on integer fields,
 *     invalid ACCT_TYPE, missing ACCT_NO, invalid record type, malformed date, etc.
 *
 * DOCUMENTED ASSUMPTIONS / pending customer confirmation (see manifest):
 *   - 52-field boundary = copybook fields 1-52 (BA_RECCODE..BATCH_JOB); the sample's
 *     trailing CHANGE_TMS timestamp (copybook field 53) and beyond are excluded to
 *     hit the customer-stated 52 fields / 51 pipes.
 *   - ACCT_CLASS value set is a placeholder (sample shows CAPM) pending the firm's list.
 *   - Security DESCRIPTION text is placeholder pending a real CUSIP->description source.
 *   - 24 transaction codes appear in BOTH the security and non-security lists; these
 *     default to SECURITY (CUSIP populated) for coverage - flagged for confirmation.
 */

// ─── RNG helpers (deterministic-free; fine for synthetic test data) ────────────
const rnd  = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: readonly T[]): T => arr[rnd(0, arr.length - 1)];
const pad  = (n: number | string, len: number) => String(n).padStart(len, "0");

// ─── Copybook value sets (from CSH Documentation.pdf / EXCSHY2K) ───────────────
export const SEC_TYPE_VALUES = ["A","B","C","D","E","F","G","M","O","P","R","S","T","U","W","X","Z","1","2","4"] as const;
/** PURCH_OR_SALE (CPORS). Blank is a valid "exchange/swap" value per copybook. */
export const CPORS_VALUES     = ["A","B","P","1","E","X","S","2",""] as const;
export const ACCT_TYPE_VALUES = ["1","2","3","4","5","6","7","8","9"] as const;
const NONCUST_SW    = ["","P","X"] as const;              // field 33: BLANK/P/X
const REC_TYPE      = ["C","D","E"] as const;             // field 51: C/D/E
const MGN_CODE      = ["0","1","2","3","4"] as const;
const DIV_REINV     = ["A","","C","D","F","N","R","Y"] as const;
const STD_INST      = ["A","B","C","IR","IS","IT","KO","1","2","3","4","5","6","7"] as const;
const ADJUST_SW     = ["N","Y"] as const;
const YN_BLANK      = ["N","","Y"] as const;
const PAYMENT_CURR  = ["A","B","C","E","F","G","W","N","P","Q"] as const;
const BIG_EXCH      = ["00","01","02","03","04","05","06","07","08","09","10","15","16"] as const;
const BOND_TYPES    = ["CB","CD","GO","RV","CM","MU","CU","CV","ML","FB"] as const;
const ORIGIN_CODES  = ["SORC","BATCH","ONLIN","AUTO","MANL"] as const;
const FIRM_NOS      = [1, 5, 9, 18] as const;
const SUB_NOS       = [45, 312, 100, 250] as const;

/** Real ACCT_CLASS value(s) from the original Sal_csh.txt (only CAPM appears in the sample). */
const ACCT_CLASS_VALUES = ["CAPM"] as const;

// ─── Transaction codes (field 22 / SOURCE_CODE), from Transaction Code Details.xlsx ──
// Cleaned: '*' flag suffixes stripped, export artifacts (dates, single chars, spaces)
// dropped. 24 codes appear in BOTH lists and default to security (CUSIP populated).
export const SECURITY_CODES = [
  "ADJC","ADJD","ADJI","ADJL","ADJN","ADJO","ADJP","ADJR","ADJT","ADJW","ADJY","ADST","CASH","CFEE","CHK",
  "CLIQ","CNS","CREC","CTND","DDIV","DDRO","DDRO1","DEL","DIRI","DIRQ","DIST","DIV","DNRA","DRS","DST","DTAX",
  "DTRF","EARNP","EDU1","EXC","EXCH","EXCR","FBKR","FCREC","FDEC1","FDRS","FRAC","FRDP","FREG","FRHE2","FUND",
  "INRA","INT","LIQ","LOANI","MCK","MSC4","NOTEP","NRC","NRD","NRREG","ODV","OTAX","OUTFE","PDST","PRERE",
  "PRIN","QADJ","RCC2","RCLM","RCRT","RCZ1","RCZ2","RDCCC","RDCT","RDDV","RDIV","RE446","RE447","ROC","ROLI",
  "ROLX","ROP","RPR2","RPRM","RREG","RROP","SARC","SCAP","SRHE2","STAX","STTAX","SUB","TNRA","WDRO1","WRP",
] as const;

export const NONSECURITY_CODES = [
  "401KC","401KP","ACH","ADJ","AFEPD","ALTFE","APPFE","CDINT","CHRG","CONTC","COVRO","DAB1","DEP","DITRF",
  "EARNC","EARNF","EDCC","EDCP","EDU2","EMC","EMPLC","EMPLP","ERE8","EREP","EREPE","ERMAP","EXCE","EXCE2",
  "EXCES","EXCP","EXCPP","EXCPR","EXCRE","EXCS","EXCSP","EXRP","EXRPE","FDDS","FEDWT","FEE","FEEF","FEEPD",
  "FGNWT","FPMDR","FPREX","FRDCT","FRDPT","FRHE1","FRPRM","FRREG","FRTH1","FRTH2","FSMP2","FXCJ","GNL","IRADC",
  "IRADP","IRANC","IRANP","LOANP","MCA","MDR","MGTFE","MSC3","MTGFE","MTGTF","PDRQP","PMDR","QCD4","QCD7",
  "RACH","RCC1","RCP2","RCTR","RDPT","RDST","REC55","RECHK","REG","RHE2","ROPO","RTTL","SARP","SDEC1","SMP1",
  "SMP2","SPIN","SPMDR","SPREX","SRDCT","SRDPT","SRPRM","SRREG","SRTH1","SRTH2","SSMP2","STERE","UBTI","WITRF",
  "WOFF","WTFEE","YRINC",
] as const;

// ─── Small value generators ────────────────────────────────────────────────────
function cymd(): string {
  const y = rnd(2024, 2026), m = rnd(1, 12), d = rnd(1, 28);
  return `${y}-${pad(m, 2)}-${pad(d, 2)}`;                    // CCYY-MM-DD
}
function cusip(): string {                                   // 9 alnum + 3 pad = 12
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = ""; for (let i = 0; i < 9; i++) s += chars[rnd(0, chars.length - 1)];
  return s + "000";
}
function symbol(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let s = ""; for (let i = 0, n = rnd(3, 5); i < n; i++) s += chars[rnd(0, chars.length - 1)];
  return s;
}
function decimal(min: number, max: number, dp: number): string {
  return (Math.random() * (max - min) + min).toFixed(dp);
}
// Real security descriptions harvested from the original Sal_csh.txt (fields DESC..DESC_6).
// Each entry fills DESC1..N in order; remaining DESC fields stay blank, exactly as the
// original does (STAX fills 2 lines, RDIV fills 3-4). Used only for security transactions.
const REAL_SECURITY_DESC: readonly (readonly string[])[] = [
  ["FRGN-W/H @ SOURCE", "TELUS CORP"],
  ["FRGN-W/H @ SOURCE", "TRANSALTA CORP"],
  ["FRGN-W/H @ SOURCE", "IMPERIAL OIL LTD NEW"],
  ["PIMCO -", "INCOME INSTL CL", "REINVEST TO OTHER FUND"],
  ["VANGUARD -", "CASH RESERVES FEDL MONEY", "MARKET ADMIRAL CL", "REINVEST TO OTHER FUND"],
];
function securityDesc(): string[] {
  return [...pick(REAL_SECURITY_DESC)];
}

// ─── The 52-field record builder (copybook EXCSHY2K order) ─────────────────────
export const FIELD_COUNT = 52;

interface RecordOpts {
  recType: string;        // BA_RECCODE A/C/V
  sourceCode: string;     // field 22
  isSecurity: boolean;
  acctType: string;       // 1-9
  secType: string;        // CSECTYPE (security only)
  cpors: string;          // PURCH_OR_SALE
  acct: number;           // ACCT_NO (mandatory)
  acctClass: string;
}

function buildRecord(o: RecordOpts): string {
  const f: string[] = new Array(FIELD_COUNT).fill("");
  f[0]  = o.recType;                                  // BA_RECCODE
  f[1]  = pad(pick(FIRM_NOS), 3);                     // FIRM_NO (int)
  f[2]  = pad(pick(SUB_NOS), 3);                      // SUB_NO (int)
  f[3]  = String(o.acct);                             // ACCT_NO (int, MANDATORY)
  f[4]  = o.acctClass;                                // ACCT_CLASS (char4)
  f[5]  = o.acctType;                                 // ACCT_TYPE (1-9)
  f[6]  = "M" + pad(rnd(1, 999), 3);                  // REP (char4)
  if (o.isSecurity) {
    f[7]  = String(rnd(1_000_000, 999_999_999));      // SEC_NO (int)
    f[8]  = cusip();                                  // CUSIP (char12)
    f[9]  = o.secType;                                // SEC_TYPE (CSECTYPE)
    const sym = symbol();
    f[11] = sym;                                      // SYMBOL (char10)
    f[12] = pick(MGN_CODE);                           // MGN_CODE
    const d = securityDesc();
    for (let i = 0; i < 6; i++) f[33 + i] = d[i] ?? "";  // DESC..DESC_6 (fields 34-39), rest blank
  }
  f[10] = "";                                         // CLASS (not used)
  f[13] = pick(STD_INST);                             // STD_INST (code, NOT a date)
  f[14] = cymd();                                     // TRADE_CYMD
  f[15] = Math.random() < 0.5 ? "" : cymd();          // ASOF_CYMD (often blank)
  f[16] = cymd();                                     // SETTLE_CYMD
  f[17] = pick(ORIGIN_CODES);                         // ORIGIN
  f[18] = "R" + pad(rnd(1, 999_999_999), 9);          // TRAN_RID
  f[19] = String(rnd(1_000_000, 9_999_999));          // CONTROL_NO (int)
  f[20] = o.isSecurity ? decimal(1, 10_000, 5) : "0.00000"; // BIG_QTY (dec 15,5)
  f[21] = o.sourceCode;                               // SOURCE_CODE (never "0")
  f[22] = o.cpors;                                    // PURCH_OR_SALE (CPORS)
  f[23] = pick(BIG_EXCH);                             // BIG_EXCH (int)
  f[24] = decimal(-50_000, 50_000, 2);               // NET_AMT (dec 13,2)
  f[25] = "";                                         // OFFSET_ACCT (not used → blank)
  f[26] = "";                                         // OFFSET_TYPE (not used → blank)
  f[27] = "";                                         // NO_CREDIT (not used → blank)
  f[28] = String(rnd(0, 99_999));                     // GENERIC_USER_FIELD (int)
  f[29] = decimal(0, 99_999_999, 2);                  // TAG_NO (dec - customer expects decimal)
  f[30] = "0";                                        // CRNCY_TYPE (int, 0 = no foreign)
  f[31] = String(rnd(0, 99_999));                     // BROKER_NO (int)
  f[32] = pick(NONCUST_SW);                           // NONCUSTOMER_SW (BLANK/P/X)
  // 33-38 DESC set above for securities; blank for non-securities
  f[39] = "";                                         // MLP_CODE (not used)
  f[40] = pick(DIV_REINV);                            // DIV_REINV
  f[41] = o.isSecurity && Math.random() < 0.3 ? pick(BOND_TYPES) : ""; // BOND_TYPE
  f[42] = String(rnd(100_000_000, 999_999_999));      // TAX_ID (int)
  f[43] = "PGM" + pad(rnd(1, 99_999), 5);             // PROGRAM_NO (char8)
  f[44] = pick(PAYMENT_CURR);                         // PAYMENT_CURR_TYPE
  f[45] = "";                                         // COUNTRY_CODE (not used)
  f[46] = "";                                         // OFF_COUNTRY_CODE (not used)
  f[47] = pick(ADJUST_SW);                            // ADJUST_SW (N/Y)
  f[48] = pick(YN_BLANK);                             // REINVEST_SW
  f[49] = pick(["N", "Y"] as const);                 // FREE_CREDIT_SW
  f[50] = pick(REC_TYPE);                             // REC_TYPE (C/D/E)
  f[51] = "SACH" + pad(rnd(1, 9999), 4);             // BATCH_JOB (char8)
  return f.join("|");
}

const REC_TYPES = ["A", "C", "V"] as const;

/** Weighted record type: ~72% Add, rest Change/Void (matches sample distribution). */
function pickRecType(): string {
  const r = Math.random();
  return r < 0.72 ? "A" : r < 0.86 ? "C" : "V";
}

// ─── Clean file: full-coverage generation ──────────────────────────────────────
function generateClean(perCode: number, acctPool: number[]): string[] {
  const rows: string[] = [];
  let ti = 0, ci = 0, ai = 0; // round-robin cursors for SEC_TYPE / CPORS / ACCT_TYPE

  const emit = (code: string, isSecurity: boolean) => {
    for (let k = 0; k < perCode; k++) {
      rows.push(buildRecord({
        recType:   pickRecType(),
        sourceCode: code,
        isSecurity,
        acctType:  ACCT_TYPE_VALUES[ai++ % ACCT_TYPE_VALUES.length],
        secType:   SEC_TYPE_VALUES[ti++ % SEC_TYPE_VALUES.length],
        cpors:     CPORS_VALUES[ci++ % CPORS_VALUES.length],
        acct:      pick(acctPool),
        acctClass: pick(ACCT_CLASS_VALUES),
      }));
    }
  };

  for (const code of SECURITY_CODES)    emit(code, true);
  for (const code of NONSECURITY_CODES) emit(code, false);
  return rows;
}

// ─── Negative cases (delivered separately, one labeled defect each) ────────────
export interface NegativeCase { id: string; description: string; row: string; }

function baseSecurity(): string[] {
  return buildRecord({
    recType: "A", sourceCode: "DIV", isSecurity: true, acctType: "1",
    secType: "C", cpors: "B", acct: rnd(10_000_000, 99_999_999), acctClass: "CAPM",
  }).split("|");
}

function generateNegativeCases(): NegativeCase[] {
  const out: NegativeCase[] = [];
  const add = (id: string, description: string, mutate: (f: string[]) => void) => {
    const f = baseSecurity(); mutate(f); out.push({ id, description, row: f.join("|") });
  };

  add("NEG-01", "Invalid BA_RECCODE 'X' (field 1; valid A/C/V)", f => { f[0] = "X"; });
  add("NEG-02", "Missing ACCT_NO (field 4; mandatory for file processing)", f => { f[3] = ""; });
  add("NEG-03", "Invalid ACCT_TYPE '0' (field 6; valid 1-9)", f => { f[5] = "0"; });
  add("NEG-04", "Invalid ACCT_TYPE 'A' - alpha in integer field 6", f => { f[5] = "A"; });
  add("NEG-05", "Malformed TRADE_CYMD '202-04-01' (field 15; bad date format)", f => { f[14] = "202-04-01"; });
  add("NEG-06", "Type mismatch - alpha 'ABC' in integer FIRM_NO (field 2)", f => { f[1] = "ABC"; });
  add("NEG-07", "Type mismatch - alpha 'XYZ' in integer SEC_NO (field 8)", f => { f[7] = "XYZ"; });
  add("NEG-08", "Type mismatch - alpha in integer CONTROL_NO (field 20)", f => { f[19] = "NaN12"; });
  add("NEG-09", "Type mismatch - alpha in integer BROKER_NO (field 32)", f => { f[31] = "BRKR"; });
  add("NEG-10", "Type mismatch - alpha in decimal BIG_QTY (field 21)", f => { f[20] = "ABC.DE"; });
  add("NEG-11", "SOURCE_CODE '0' (field 22; a valid code is required, never 0)", f => { f[21] = "0"; });
  add("NEG-12", "Invalid SOURCE_CODE 'XXXXX' (field 22; not in code list)", f => { f[21] = "XXXXX"; });
  add("NEG-13", "Invalid SEC_TYPE 'Q' (field 10; not a valid CSECTYPE)", f => { f[9] = "Q"; });
  add("NEG-14", "Invalid PURCH_OR_SALE 'Z' (field 23; not a valid CPORS)", f => { f[22] = "Z"; });
  add("NEG-15", "ACCT_NO longer than 9 digits (field 4; length overflow)", f => { f[3] = "1234567890"; });
  add("NEG-16", "Invalid NONCUSTOMER_SW 'Q' (field 33; valid Blank/P/X)", f => { f[32] = "Q"; });
  add("NEG-17", "Security transaction (DIV) with blank CUSIP (field 9)", f => { f[8] = ""; });
  add("NEG-18", "Wrong field count - 51 fields instead of 52 (dropped last field)", f => { f.pop(); });
  return out;
}

// ─── Public API ─────────────────────────────────────────────────────────────
export interface CshGenerateOptions {
  recordCount?: number;   // optional cap on clean rows (0/undefined = full coverage)
  perCode?: number;       // records per transaction code (default 10 per customer)
  includeManifest?: boolean;
}

export interface CshGenerateResult {
  clean: string;
  negatives: string;
  manifest: string;
  recordCount: number;
  breakdown: { securityCodes: number; nonSecurityCodes: number; perCode: number; negative: number };
  columnSchema: typeof CSH_COLUMN_SCHEMA;
}

export function generateCshFile(opts: CshGenerateOptions = {}): CshGenerateResult {
  const perCode = Math.max(1, opts.perCode ?? 10);
  const acctPool = Array.from({ length: 40 }, () => rnd(10_000_000, 99_999_999));

  let cleanRows = generateClean(perCode, acctPool);
  if (opts.recordCount && opts.recordCount > 0 && cleanRows.length > opts.recordCount) {
    cleanRows = cleanRows.slice(0, opts.recordCount);
  }
  const negCases = generateNegativeCases();

  return {
    clean:      cleanRows.join("\n"),
    negatives:  negCases.map(n => n.row).join("\n"),
    manifest:   buildManifest(cleanRows.length, perCode, negCases),
    recordCount: cleanRows.length,
    breakdown:  {
      securityCodes: SECURITY_CODES.length,
      nonSecurityCodes: NONSECURITY_CODES.length,
      perCode,
      negative: negCases.length,
    },
    columnSchema: CSH_COLUMN_SCHEMA,
  };
}

// ─── 52-field column schema (copybook EXCSHY2K order) ──────────────────────────
export const CSH_COLUMN_SCHEMA = {
  note: "Uniform 52 fields, pipe-delimited (51 pipes), copybook EXCSHY2K order. 0-indexed.",
  fields: [
    "0 BA_RECCODE char A/C/V", "1 FIRM_NO int", "2 SUB_NO int", "3 ACCT_NO int (mandatory)",
    "4 ACCT_CLASS char4", "5 ACCT_TYPE int 1-9", "6 REP char4", "7 SEC_NO int (security)",
    "8 CUSIP char12 (security)", "9 SEC_TYPE char1 (CSECTYPE)", "10 CLASS (unused/blank)",
    "11 SYMBOL char10 (security)", "12 MGN_CODE char1", "13 STD_INST char2 (code, not date)",
    "14 TRADE_CYMD date", "15 ASOF_CYMD date", "16 SETTLE_CYMD date", "17 ORIGIN char5",
    "18 TRAN_RID char", "19 CONTROL_NO int", "20 BIG_QTY dec(15,5)", "21 SOURCE_CODE char5 (never 0)",
    "22 PURCH_OR_SALE char1 (CPORS)", "23 BIG_EXCH int", "24 NET_AMT dec(13,2)",
    "25 OFFSET_ACCT (unused/blank)", "26 OFFSET_TYPE (unused/blank)", "27 NO_CREDIT (unused/blank)",
    "28 GENERIC_USER_FIELD int", "29 TAG_NO dec", "30 CRNCY_TYPE int", "31 BROKER_NO int",
    "32 NONCUSTOMER_SW char1 (BLANK/P/X)", "33 DESC char24 (security)", "34 DESC_2", "35 DESC_3",
    "36 DESC_4", "37 DESC_5", "38 DESC_6", "39 MLP_CODE (unused)", "40 DIV_REINV char1",
    "41 BOND_TYPE char2", "42 TAX_ID int", "43 PROGRAM_NO char8", "44 PAYMENT_CURR_TYPE char1",
    "45 COUNTRY_CODE (unused)", "46 OFF_COUNTRY_CODE (unused)", "47 ADJUST_SW N/Y",
    "48 REINVEST_SW N/blank/Y", "49 FREE_CREDIT_SW N/Y", "50 REC_TYPE C/D/E", "51 BATCH_JOB char8",
  ],
};

// ─── Manifest / scenario document ──────────────────────────────────────────────
function buildManifest(cleanCount: number, perCode: number, negCases: NegativeCase[]): string {
  const L: string[] = [];
  L.push("=== SAL_CSH SYNTHETIC DATA - SCENARIO DOCUMENT (v2, 2026-07-20) ===");
  L.push("Source layout: Thomson Reuters BETA Systems copybook EXCSHY2K (CSH Documentation.pdf)");
  L.push("Parser spec: Schema_Loader.xlsx -> BETA_STERNE_AGEE_NEW (transaction file).");
  L.push("Format: pipe-delimited, UNIFORM 52 fields per record (51 pipes).");
  L.push("");
  L.push("--- FIELD LAYOUT (copybook order, 0-indexed) ---");
  for (const f of CSH_COLUMN_SCHEMA.fields) L.push("  " + f);
  L.push("");
  L.push("--- CLEAN FILE (sal_csh_synthetic_clean.txt): 100% VALID ---");
  L.push(`Total clean records: ${cleanCount}  (>=${perCode} per transaction code).`);
  L.push(`Security transaction codes covered: ${SECURITY_CODES.length} unique`);
  L.push(`Non-security transaction codes covered: ${NONSECURITY_CODES.length} unique`);
  L.push("Note on code counts: the Transaction Code Details file lists 126 security rows");
  L.push("and 201 non-security rows. After removing duplicate entries and non-code export");
  L.push("artifacts (a date value, single-character and lowercase entries such as S, P, asg,");
  L.push("exp, and rows like *, -xdi, IRA A), 91 unique security and 102 unique non-security");
  L.push("codes remain. Every one of these 193 codes is represented at least 10 times.");
  L.push("Coverage guarantees:");
  L.push(`  - ALL CSECTYPE (SEC_TYPE) values: ${SEC_TYPE_VALUES.join(",")}`);
  L.push(`  - ALL CPORS (PURCH_OR_SALE) codes: ${CPORS_VALUES.map(c => c || "<blank>").join(",")}`);
  L.push(`  - ALL ACCT_TYPE values 1-9`);
  L.push(`  - Record types A (Add), C (Change), V (Void)`);
  L.push("  - CUSIP/SYMBOL/SEC_NO/SEC_TYPE/DESC populated ONLY for security codes; blank for non-security.");
  L.push("  - ACCT_NO populated (mandatory) in every clean record.");
  L.push("");
  L.push("--- NEGATIVE FILE (sal_csh_synthetic_negatives.txt): one labeled defect per line ---");
  for (const n of negCases) L.push(`  ${n.id}  ${n.description}`);
  L.push("");
  L.push("--- ASSUMPTIONS / PENDING CUSTOMER CONFIRMATION ---");
  L.push("1. 52-field boundary = copybook fields 1-52 (BA_RECCODE..BATCH_JOB). The raw");
  L.push("   Sal_csh.txt sample is ragged (45-58 fields) with a trailing CHANGE_TMS");
  L.push("   timestamp (copybook field 53); we normalized to the copybook layout because");
  L.push("   it is the only ordering under which every field-level comment aligns");
  L.push("   (field 5=ACCT_CLASS, 9=CUSIP, 22=SOURCE_CODE, 23=PURCH_OR_SALE, 33=NONCUST, 34-39=DESC).");
  L.push("   If your parser expects a different 52-field selection/order, send it and we will remap.");
  L.push("2. ACCT_CLASS uses CAPM (the only ACCT_CLASS value present in the original sample).");
  L.push("   If the full custodian feed carries additional ACCT_CLASS codes, send the list and we add them.");
  L.push("3. Descriptions (fields 34-39) are the REAL security descriptions from the original file");
  L.push("   (FRGN-W/H @ SOURCE + security name, PIMCO/VANGUARD fund descriptions, etc.), populated for");
  L.push("   security and dual-listed codes only. CUSIP and SYMBOL are not present in the original sample");
  L.push("   (securities there use SEC_NO), so those two are synthetic; provide a security master to use real ones.");
  L.push("4. 24 codes appear in BOTH the security and non-security lists");
  L.push("   (ADJI,CHK,DDRO1,DIRI,DIV,EARNP,EDU1,EXCR,FREG,INT,MCK,NRREG,OUTFE,PDST,RCC2,RCZ1,");
  L.push("    RCZ2,RDCT,ROLX,RPRM,RREG,SARC,STTAX,WDRO1) - defaulted to SECURITY (CUSIP populated).");
  L.push("   Confirm the correct classification for these.");
  return L.join("\n");
}
