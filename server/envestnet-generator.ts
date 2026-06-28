/**
 * Envestnet / BETA Systems (Thomson Reuters) custodian file generator.
 *
 * The SAL_CSH file uses variable column counts per SOURCE_CODE — not a fixed-width schema.
 * Column structure is derived from actual Sal_csh.txt via field-by-field analysis (node script).
 *
 * SOURCE_CODE → total cols:
 *   WTFEE=58, JRL=47, RPRM=48, YRINC=49, STAX=48, RDIV=45, WRAP=51
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rnd(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function p2(n: number): string {
  return String(n).padStart(2, "0");
}
function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function fmtTimestamp(d: Date): string {
  const h = d.getHours();
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${h12}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${ampm}`;
}
/** Return a Date anchored around April 2025 (matching sample data era) */
function recentDate(daysAgoMin = 0, daysAgoMax = 365): Date {
  const anchor = new Date(2025, 3, 1);
  return new Date(anchor.getTime() - rnd(daysAgoMin, daysAgoMax) * 86_400_000);
}
function fmtAmt(val: number, dp = 2): string {
  return val.toFixed(dp);
}
function makeTms(): string {
  const d = new Date(2026, 2 + rnd(0, 1), rnd(1, 28), rnd(6, 22), rnd(0, 59), rnd(0, 59));
  return fmtTimestamp(d);
}

// ─── Reference data (from Sal_csh.txt + CSH Documentation.pdf) ───────────────

const FIRM_SUB: Array<{ firm: number; sub: number }> = [
  { firm: 1,  sub: 45 },
  { firm: 5,  sub: 45 },
  { firm: 9,  sub: 355 },
  { firm: 18, sub: 312 },
];

const REP_CODES = [
  "M801","MP85","FR01","5U01","6602","N105","MA38","MH01","MP36","MP94",
  "MP41","2R01","N131","N110","LD01","PC10","CI03","MP55","N108","EB78",
  "N119","40W1","N101","MA38","N131","MH01",
];

const BROKER_NOS_CASH = [22298];
const BROKER_NOS_JRL  = [22202];
const BROKER_NOS_SEC  = [24020, 35025];
const BROKER_NOS_WRAP = [20138, 22298];

const SECURITIES_EQUITY = [
  { secNo: 3547509, name: "TELUS CORP" },
  { secNo: 3607331, name: "TRANSALTA CORP" },
  { secNo: 2343392, name: "IMPERIAL OIL LTD NEW" },
  { secNo: 2810044, name: "INTEL CORP" },
  { secNo: 1852093, name: "APPLE INC" },
  { secNo: 4019823, name: "MICROSOFT CORP" },
  { secNo: 1729384, name: "OMEGA HEALTHCARE INVESTORS" },
];

const SECURITIES_FUND = [
  { secNo: 3061784, nameParts: ["PIMCO -", "INCOME INSTL CL"] },
  { secNo: 3739522, nameParts: ["VANGUARD -", "CASH RESERVES FEDL MONEY MARKET ADMIRAL CL"] },
  { secNo: 2938471, nameParts: ["VANGUARD -", "500 INDEX ADMIRAL CL"] },
  { secNo: 5029183, nameParts: ["FIDELITY -", "GOVERNMENT MONEY MARKET"] },
];

// Julian lot dates: equity (STAX) vs fund (RDIV) — keep separate, they differ in century
const JULIAN_LOTS_EQUITY = [40126, 40127, 40128, 40130, 40200, 40201];
const JULIAN_LOTS_FUND   = [33126, 33127, 33128];

// ─── Per-SOURCE-CODE builders ─────────────────────────────────────────────────
// Column positions verified against Sal_csh.txt using: line.split('|')[idx]

type RecCode = "A" | "C" | "V";

/**
 * WTFEE — Wire transfer fee (58 cols, SOURCE_CODE at [27])
 * [8-17] = 10 blanks (no security); TRADE at [18], SETTLE at [20], LOT at [22]
 */
function genWtfee(recCode: RecCode, acctNo?: number): string {
  const { firm, sub } = pick(FIRM_SUB);
  const acct  = acctNo ?? rnd(10_000_000, 99_999_999);
  const rep   = pick(REP_CODES);
  const acctT = String(rnd(1, 2));
  const td    = recentDate(0, 180);
  const sd    = new Date(td.getTime() + rnd(0, 2) * 86_400_000);
  const lot   = new Date(td.getFullYear() + 1, td.getMonth(), td.getDate());
  const amt   = pick([35.00, 35.00, 55.00, 75.00]);
  const desc  = amt === 55 ? "INTL WIRE TRANSFER FEE" : "WIRE TRANSFER FEE";
  const broker = pick(BROKER_NOS_CASH);

  return [
    recCode, firm, sub, acct, "",          // [0-4]
    acctT, rep,                            // [5-6]
    0, "","","","","","","","","","",      // [7-17] SEC_NO + 10 blanks
    fmtDate(td), "",                       // [18-19] TRADE_DATE, blank
    fmtDate(sd), "",                       // [20-21] SETTLE_DATE, blank
    fmtDate(lot), "", "",                  // [22-24] LOT_DATE, 2 blanks
    0, "0.00000",                          // [25-26] QTY
    "WTFEE", "", 0, fmtAmt(amt),           // [27-30] SOURCE, OPEN_CLOSE, COMMISSION, PRINCIPAL
    "", 0, 0, 0, 0,                        // [31-35]
    desc,                                  // [36] DESC1
    "","","","","","","","","","","","",   // [37-48] 12 blanks
    0, broker, "E", "",                    // [49-52]
    "N","N","Y","C", makeTms(),            // [53-57]
  ].join("|");
}

/**
 * JRL — Journal / inter-account transfer (47 cols, SOURCE_CODE at [21])
 * [8-14] = 7 blanks; TRADE at [15], SETTLE at [17]
 */
function genJrl(recCode: RecCode, acctNo?: number): string {
  const { firm, sub } = pick(FIRM_SUB);
  const acct  = acctNo ?? rnd(10_000_000, 99_999_999);
  const rep   = pick(REP_CODES);
  const acctT = String(rnd(1, 2));
  const td    = recentDate(0, 180);
  const sd    = new Date(td.getTime() + rnd(0, 2) * 86_400_000);
  const isOut = Math.random() > 0.5;
  const amt   = rnd(10, 50000) + Math.random();
  const xref  = rnd(100_000_000, 999_999_999);
  const desc  = isOut ? "TRF FDS TO TYPE " + acctT : "TRF FDS FRM TYPE " + acctT;
  const broker = pick(BROKER_NOS_JRL);

  return [
    recCode, firm, sub, acct, "",          // [0-4]
    acctT, rep,                            // [5-6]
    0, "","","","","","","",               // [7-14] SEC_NO + 7 blanks
    fmtDate(td), "",                       // [15-16] TRADE_DATE, blank
    fmtDate(sd), "",                       // [17-18] SETTLE_DATE, blank
    0, "0.00000",                          // [19-20]
    "JRL", "", 0,                          // [21-23]
    fmtAmt(isOut ? amt : -amt),            // [24] PRINCIPAL (neg = incoming)
    "", 0, 0, 0, 0,                        // [25-29]
    desc,                                  // [30] DESC1
    "","","","","","",                     // [31-36] 6 blanks
    xref, broker,                          // [37-38]
    "","","",                              // [39-41] 3 blanks
    "N","N","Y","C", makeTms(),            // [42-46]
  ].join("|");
}

/**
 * RPRM — Premium distribution to Roth (48 cols, SOURCE_CODE at [21])
 * Like JRL + extra DESC2 (source→dest account reference); no security
 */
function genRprm(recCode: RecCode, acctNo?: number): string {
  const { firm, sub } = pick(FIRM_SUB);
  const acct    = acctNo ?? rnd(10_000_000, 99_999_999);
  const rep     = pick(REP_CODES);
  const td      = recentDate(0, 180);
  const sd      = new Date(td.getTime() + rnd(0, 2) * 86_400_000);
  const amt     = rnd(50, 600) + Math.random();
  const srcAcct = rnd(10_000_000, 99_999_999);
  const dstAcct = rnd(10_000_000, 99_999_999);
  const xref    = rnd(100_000_000, 999_999_999);
  const broker  = pick(BROKER_NOS_SEC);

  return [
    recCode, firm, sub, acct, "",          // [0-4]
    "1", rep,                              // [5-6]
    0, "","","","","","","",               // [7-14]
    fmtDate(td), "",                       // [15-16]
    fmtDate(sd), "",                       // [17-18]
    0, "0.00000",                          // [19-20]
    "RPRM", "", 0, fmtAmt(amt),            // [21-24]
    "", 0, 0, 0, 0,                        // [25-29]
    "PREM DIST TO ROTH",                   // [30] DESC1
    `${srcAcct} TO ${dstAcct}`,            // [31] DESC2
    "","","","","","",                     // [32-37] 6 blanks
    xref, broker,                          // [38-39]
    "","","",                              // [40-42] 3 blanks
    "N","N","Y","C", makeTms(),            // [43-47]
  ].join("|");
}

/**
 * YRINC — Dividends and interest (49 cols, SOURCE_CODE at [21])
 * Like RPRM but PRINCIPAL can be negative; extra amount at [27]; 2 desc lines
 */
function genYrinc(recCode: RecCode, acctNo?: number): string {
  const { firm, sub } = pick(FIRM_SUB);
  const acct    = acctNo ?? rnd(10_000_000, 99_999_999);
  const rep     = pick(REP_CODES);
  const acctT   = String(rnd(1, 2));
  const td      = recentDate(0, 180);
  const sd      = new Date(td.getTime() + rnd(0, 2) * 86_400_000);
  const isNeg   = Math.random() < 0.20;
  const amt     = rnd(1, 10000) + Math.random();
  const refAmt  = isNeg ? 0 : rnd(10000, 99999); // [27]
  const srcAcct = rnd(10_000_000, 99_999_999);
  const dstAcct = rnd(10_000_000, 99_999_999);
  const crossRef = rnd(100_000_000, 999_999_999);
  const broker  = pick(BROKER_NOS_SEC);

  return [
    recCode, firm, sub, acct, "",          // [0-4]
    acctT, rep,                            // [5-6]
    0, "","","","","","","",               // [7-14]
    fmtDate(td), "",                       // [15-16]
    fmtDate(sd), "",                       // [17-18]
    0, "0.00000",                          // [19-20]
    "YRINC", "", 0,                        // [21-23]
    fmtAmt(isNeg ? -amt : amt),            // [24] PRINCIPAL
    "", 0, refAmt, 0, 0, 0,               // [25-30] — extra amount at [27]
    "DIVIDENDS AND INTEREST",              // [31] DESC1
    `${srcAcct} TO ${dstAcct}`,           // [32] DESC2 — account-to-account reference
    "","","","","","",                     // [33-38] 6 blanks
    crossRef, broker,                      // [39-40]
    "","","",                              // [41-43] 3 blanks
    "N","N","Y","C", makeTms(),            // [44-48]
  ].join("|");
}

/**
 * STAX — Foreign tax withholding (48 cols, SOURCE_CODE at [19])
 * Equity security; CUSIP blank in sample; SEC_TYPE=C at [9]; Julian lot at [17]
 * Tax reference at [26]; C/R flag at [37]; batch_ref at [38]
 */
function genStax(recCode: RecCode, acctNo?: number): string {
  const { firm, sub } = pick(FIRM_SUB);
  const acct   = acctNo ?? rnd(10_000_000, 99_999_999);
  const rep    = pick(REP_CODES);
  const acctT  = String(rnd(1, 2));
  const acctCl = Math.random() < 0.3 ? "CAPM" : "";
  const sec    = pick(SECURITIES_EQUITY);
  const td     = recentDate(0, 180);
  const sd     = new Date(td.getTime() + rnd(0, 2) * 86_400_000);
  const lot    = pick(JULIAN_LOTS_EQUITY);
  const taxAmt = rnd(1, 100) + Math.random();
  const taxRef = rnd(10000, 99999);
  const crFlag = pick(["C", "R"]);
  const batch  = rnd(100_000_000, 999_999_999);
  const broker = pick(BROKER_NOS_SEC);

  return [
    recCode, firm, sub, acct, acctCl,     // [0-4]
    acctT, rep,                            // [5-6]
    sec.secNo, "", "C",                    // [7-9] SEC_NO, blank CUSIP, SEC_TYPE
    "","","",                              // [10-12] 3 blanks (SYMBOL, MGN_CODE, STD_INST)
    fmtDate(td), "",                       // [13-14] TRADE_DATE, blank
    fmtDate(sd), "",                       // [15-16] SETTLE_DATE, blank
    lot, "0.00000",                        // [17-18] Julian LOT, QTY
    "STAX", "", 0, fmtAmt(taxAmt),        // [19-22]
    "", 0, "", taxRef,                     // [23-26]: blank, 0, blank, tax_ref
    0, 0, 0,                               // [27-29]
    "FRGN-W/H @ SOURCE", sec.name,        // [30-31] DESC1, DESC2
    "","","","","",                        // [32-36] 5 blanks
    crFlag, batch, broker,                 // [37-39]
    "","","",                              // [40-42] 3 blanks
    "N","N","Y","C", makeTms(),            // [43-47]
  ].join("|");
}

/**
 * RDIV — Reinvested dividend (45 cols, SOURCE_CODE at [19])
 * Fund security (SEC_TYPE=F); 3 DESC lines; Julian lot at [17]; CROSS_REF at [35]
 */
function genRdiv(recCode: RecCode, acctNo?: number): string {
  const { firm, sub } = pick(FIRM_SUB);
  const acct  = acctNo ?? rnd(10_000_000, 99_999_999);
  const rep   = pick(REP_CODES);
  const sec   = pick(SECURITIES_FUND);
  const td    = recentDate(0, 180);
  const sd    = new Date(td.getTime() + rnd(0, 2) * 86_400_000);
  const lot   = pick(JULIAN_LOTS_FUND);
  const amt   = Math.max(0.01, parseFloat((Math.random() * 5).toFixed(2)));
  const xref  = rnd(100_000_000, 999_999_999);
  const broker = pick(BROKER_NOS_SEC);

  return [
    recCode, firm, sub, acct, "",          // [0-4]
    "1", rep,                              // [5-6]
    sec.secNo, "", "F",                    // [7-9] SEC_NO, blank CUSIP, SEC_TYPE=F
    "","","",                              // [10-12] 3 blanks
    fmtDate(td), "",                       // [13-14]
    fmtDate(sd), "",                       // [15-16]
    lot, "0.00000",                        // [17-18]
    "RDIV", "", 0, fmtAmt(amt),           // [19-22]
    "", 0, 0, 0, 0,                        // [23-27]
    sec.nameParts[0],                      // [28] DESC1 e.g. "PIMCO -"
    sec.nameParts[1] ?? "",               // [29] DESC2 e.g. "INCOME INSTL CL"
    "REINVEST TO OTHER FUND",             // [30] DESC3
    "","","","",                           // [31-34] 4 blanks
    xref, broker,                          // [35-36]
    "","","",                              // [37-39] 3 blanks
    "N","N","Y","C", makeTms(),            // [40-44]
  ].join("|");
}

/**
 * WRAP — Management / wrap fee (51 cols, SOURCE_CODE at [22])
 * No security; TRADE_DATE only ([15]) — no SETTLE_DATE; [16-19]=4 blanks
 * Billing ref amount at [29]; 3 DESC lines; extra 0 at [41] before broker
 */
function genWrap(recCode: RecCode, acctNo?: number): string {
  // WRAP is only seen for firm=9/18 in sample — restrict accordingly
  const { firm, sub } = pick(FIRM_SUB.filter(x => x.firm === 9 || x.firm === 18));
  const acct  = acctNo ?? rnd(10_000_000, 99_999_999);
  const rep   = pick(REP_CODES);
  const td    = recentDate(0, 180);
  const fee   = pick([195.57, 412.83, 87.25, 1023.45, 560.12, 2841.00]);
  const billVal = (fee * rnd(100, 300)).toFixed(2);
  const billingRef = rnd(10000, 99999);
  const year  = 2025 + rnd(0, 1);
  const qs    = [
    { s: "01/01", e: "03/31" },
    { s: "04/01", e: "06/30" },
    { s: "07/01", e: "09/30" },
    { s: "10/01", e: "12/31" },
  ];
  const q = pick(qs);
  const yr2 = String(year).slice(2);
  const broker = pick(BROKER_NOS_WRAP);

  return [
    recCode, firm, sub, acct, "",          // [0-4]
    "1", rep,                              // [5-6]
    0, "","","","","","","",               // [7-14] SEC_NO + 7 blanks
    fmtDate(td),                           // [15] TRADE_DATE (only date — no SETTLE)
    "","","","",                           // [16-19] 4 blanks
    0, "0.00000",                          // [20-21] QTY
    "WRAP", "", 0, fmtAmt(fee),            // [22-25]
    "", 0, "", billingRef,                 // [26-29]: blank, 0, blank, billing_ref
    0, 0, 0,                               // [30-32]
    "MGMT FEE",                            // [33] DESC1
    `BILL VAL ${Number(billVal).toLocaleString("en-US")}`, // [34] DESC2
    `${q.s}/${yr2} THRU ${q.e}/${yr2}`,   // [35] DESC3
    "","","","","",                        // [36-40] 5 blanks
    0, broker,                             // [41-42]
    "","","",                              // [43-45] 3 blanks
    "N","N","Y","C", makeTms(),            // [46-50]
  ].join("|");
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

type SourceCode = "WTFEE" | "JRL" | "RPRM" | "YRINC" | "STAX" | "RDIV" | "WRAP";

const GENERATORS: Record<SourceCode, (r: RecCode, a?: number) => string> = {
  WTFEE: genWtfee, JRL: genJrl, RPRM: genRprm,
  YRINC: genYrinc, STAX: genStax, RDIV: genRdiv, WRAP: genWrap,
};

// Weighted distribution matching real transaction mix
const SOURCE_POOL: SourceCode[] = [
  "JRL","JRL","JRL","JRL","JRL",
  "YRINC","YRINC","YRINC",
  "STAX","STAX","STAX",
  "RDIV","RDIV",
  "WTFEE","WTFEE",
  "WRAP", "RPRM",
];

// ─── Edge cases ───────────────────────────────────────────────────────────────

/** Generate at least `minCount` edge case rows (repeats base set with new random values if needed). */
function generateEdgeCases(minCount = 7): string[] {
  const acctPool = () => rnd(10_000_000, 99_999_999);
  const rows: string[] = [];

  // Zero-amount JRL (matches the 0.00 case in some custodian feeds)
  {
    const { firm, sub } = pick(FIRM_SUB);
    rows.push([
      "A",firm,sub,acctPool(),"","1",pick(REP_CODES),
      0,"","","","","","","",
      "2025-04-01","","2025-04-01","",0,"0.00000",
      "JRL","",0,"0.00",
      "",0,0,0,0,
      "TRF FDS TO TYPE 1","","","","","","",
      0,pick(BROKER_NOS_JRL),"","","",
      "N","N","Y","C",makeTms(),
    ].join("|"));
  }

  // Minimum RDIV ($0.01)
  {
    const sec = pick(SECURITIES_FUND);
    const { firm, sub } = pick(FIRM_SUB);
    rows.push([
      "A",firm,sub,acctPool(),"","1",pick(REP_CODES),
      sec.secNo,"","F","","","",
      "2025-04-01","","2025-04-01","",33126,"0.00000",
      "RDIV","",0,"0.01","",0,0,0,0,
      sec.nameParts[0], sec.nameParts[1] ?? "", "REINVEST TO OTHER FUND",
      "","","","",
      rnd(100_000_000,999_999_999),pick(BROKER_NOS_SEC),
      "","","","N","N","Y","C",makeTms(),
    ].join("|"));
  }

  // Large negative YRINC (dividend reversal)
  {
    const { firm, sub } = pick(FIRM_SUB);
    rows.push([
      "A",firm,sub,acctPool(),"","1",pick(REP_CODES),
      0,"","","","","","","",
      "2025-04-01","","2025-04-01","",0,"0.00000",
      "YRINC","",0,"-50000.00","",0,0,0,0,0,
      "DIVIDENDS AND INTEREST","REVERSAL OF PRIOR ENTRY",
      "","","","","","",
      rnd(100_000_000,999_999_999),pick(BROKER_NOS_SEC),
      "","","","N","N","Y","C",makeTms(),
    ].join("|"));
  }

  // STAX on margin account (ACCT_TYPE=2)
  {
    const sec = pick(SECURITIES_EQUITY);
    rows.push([
      "A",5,45,acctPool(),"CAPM","2",pick(REP_CODES),
      sec.secNo,"","C","","","",
      "2025-04-01","","2025-04-01","",40126,"0.00000",
      "STAX","",0,"0.01","",0,"",rnd(10000,99999),0,0,0,
      "FRGN-W/H @ SOURCE",sec.name,"","","","","",
      "C",rnd(100_000_000,999_999_999),pick(BROKER_NOS_SEC),
      "","","","N","N","Y","C",makeTms(),
    ].join("|"));
  }

  // WTFEE international wire ($75 max)
  {
    const { firm, sub } = pick(FIRM_SUB);
    const td = recentDate(0, 90);
    const lot = new Date(td.getFullYear() + 1, td.getMonth(), td.getDate());
    rows.push([
      "A",firm,sub,acctPool(),"","1",pick(REP_CODES),
      0,"","","","","","","","","","",
      fmtDate(td),"",fmtDate(td),"",fmtDate(lot),"","",
      0,"0.00000",
      "WTFEE","",0,"75.00","",0,0,0,0,
      "INTL WIRE TRANSFER FEE",
      "","","","","","","","","","","","",
      0,pick(BROKER_NOS_CASH),"E","",
      "N","N","Y","C",makeTms(),
    ].join("|"));
  }

  // WRAP with large billing value ($5000 fee)
  {
    const { firm, sub } = pick(FIRM_SUB.filter(x => x.firm === 9));
    const td = recentDate(0, 90);
    rows.push([
      "A",firm,sub,acctPool(),"","1",pick(REP_CODES),
      0,"","","","","","","",
      fmtDate(td),"","","","",
      0,"0.00000",
      "WRAP","",0,"5000.00","",0,"",99999,0,0,0,
      "MGMT FEE","BILL VAL 1,000,000.00","01/01/25 THRU 03/31/25",
      "","","","","",
      0,pick(BROKER_NOS_WRAP),"","","",
      "N","N","Y","C",makeTms(),
    ].join("|"));
  }

  // RDIV with very long fund name (split across desc fields)
  {
    const sec = SECURITIES_FUND[1]; // VANGUARD - CASH RESERVES FEDL MONEY MARKET ADMIRAL CL
    const { firm, sub } = pick(FIRM_SUB);
    rows.push([
      "A",firm,sub,acctPool(),"","1",pick(REP_CODES),
      sec.secNo,"","F","","","",
      "2025-04-01","","2025-04-01","",33126,"0.00000",
      "RDIV","",0,"0.01","",0,0,0,0,
      sec.nameParts[0], sec.nameParts[1], "REINVEST TO OTHER FUND",
      "","","","",
      rnd(100_000_000,999_999_999),pick(BROKER_NOS_SEC),
      "","","","N","N","Y","C",makeTms(),
    ].join("|"));
  }

  // Fill to minCount by cycling through source codes with varied values
  while (rows.length < minCount) {
    const src = pick(SOURCE_POOL);
    rows.push(GENERATORS[src]("A", acctPool()));
  }

  return rows.slice(0, minCount);
}

// ─── Negative cases ───────────────────────────────────────────────────────────

function generateNegativeCases(): string[] {
  const rows: string[] = [];

  // 1. Invalid BA_RECCODE (X)
  rows.push("X" + genWtfee("A").slice(1));

  // 2. Malformed TRADE_DATE — from actual sample line 3 ("202-04-01")
  rows.push(genWtfee("A").replace(/20\d\d-\d\d-\d\d/, "202-04-01"));

  // 3. Negative WTFEE principal — build directly so amount is always known
  {
    const cols = genWtfee("A").split("|");
    cols[30] = "-" + Math.abs(parseFloat(cols[30] || "35.00")).toFixed(2);
    rows.push(cols.join("|"));
  }

  // 4. STAX with SEC_NO=0 (security required for STAX)
  const staxRow = genStax("A");
  const colsS = staxRow.split("|");
  colsS[7] = "0";
  rows.push(colsS.join("|"));

  // 5. Missing ACCT_NO
  const w1 = genWtfee("A").split("|");
  w1[3] = "";
  rows.push(w1.join("|"));

  // 6. ACCT_TYPE=0 (invalid — valid range 1-9)
  const jrl = genJrl("A").split("|");
  jrl[5] = "0";
  rows.push(jrl.join("|"));

  // 7. Invalid SOURCE_CODE
  rows.push(genJrl("A").replace("|JRL|", "|XXXXX|"));

  // 8. ACCT_NO > 9 digits
  const w2 = genWtfee("A").split("|");
  w2[3] = "1234567890";
  rows.push(w2.join("|"));

  // 9. ACCT_CLASS=CAPM on WTFEE (unexpected)
  const w3 = genWtfee("A").split("|");
  w3[4] = "CAPM";
  rows.push(w3.join("|"));

  // 10. C (Change) record with blank PRINCIPAL
  const w4 = genWtfee("C").split("|");
  w4[30] = "";
  rows.push(w4.join("|"));

  return rows;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CshGenerateOptions {
  recordCount: number;
  includeManifest?: boolean;
}

export interface CshGenerateResult {
  data: string;
  manifest: string;
  recordCount: number;
  breakdown: { positive: number; edge: number; negative: number };
  columnSchema: typeof CSH_COLUMN_SCHEMA;
}

export function generateCshFile(opts: CshGenerateOptions): CshGenerateResult {
  const { recordCount, includeManifest = false } = opts;

  // Generate edge + negative first so posCount absorbs any shortfall
  const negCount  = Math.max(10, Math.floor(recordCount * 0.10));
  const edgeCount = Math.max(7,  Math.floor(recordCount * 0.15));

  const edgeRows     = generateEdgeCases(edgeCount);          // fills to edgeCount
  const negativeRows = generateNegativeCases().slice(0, negCount);
  const posCount     = Math.max(1, recordCount - edgeRows.length - negativeRows.length);

  const acctPool = Array.from({ length: 30 }, () => rnd(10_000_000, 99_999_999));

  const positiveRows: string[] = [];
  for (let i = 0; i < posCount; i++) {
    const src   = pick(SOURCE_POOL);
    const acct  = pick(acctPool);
    const rtype = Math.random() < 0.72 ? "A" : Math.random() < 0.5 ? "C" : "V";
    positiveRows.push(GENERATORS[src](rtype, acct));
  }

  // Output order: positive → edge → negative (clearly grouped)
  const allRows = [...positiveRows, ...edgeRows, ...negativeRows];

  return {
    data:        allRows.join("\n"),
    manifest:    includeManifest ? buildManifest(positiveRows.length, edgeRows.length, negativeRows.length) : "",
    recordCount: allRows.length,
    breakdown:   { positive: positiveRows.length, edge: edgeRows.length, negative: negativeRows.length },
    columnSchema: CSH_COLUMN_SCHEMA,
  };
}

// ─── Column schema (per-source-code, verified from actual data) ───────────────

export const CSH_COLUMN_SCHEMA = {
  note: "Column counts are 0-indexed. Counts vary by SOURCE_CODE (not a fixed-width file).",
  common: {
    0: "BA_RECCODE: A=Add, C=Change, V=Void",
    1: "FIRM_NO: 1|5|9|18",
    2: "SUB_NO",
    3: "ACCT_NO (mandatory, max 9 digits)",
    4: "ACCT_CLASS: CAPM or blank",
    5: "ACCT_TYPE: 1=Cash, 2=Margin",
    6: "REP: registered rep code",
  },
  perSourceCode: {
    WTFEE: { totalCols: 58, srcIdx: 27, tradeIdx: 18, settleIdx: 20, principalIdx: 30, brokerIdx: 50, tsIdx: 57 },
    JRL:   { totalCols: 47, srcIdx: 21, tradeIdx: 15, settleIdx: 17, principalIdx: 24, brokerIdx: 38, tsIdx: 46 },
    RPRM:  { totalCols: 48, srcIdx: 21, tradeIdx: 15, settleIdx: 17, principalIdx: 24, brokerIdx: 39, tsIdx: 47 },
    YRINC: { totalCols: 49, srcIdx: 21, tradeIdx: 15, settleIdx: 17, principalIdx: 24, brokerIdx: 40, tsIdx: 48 },
    STAX:  { totalCols: 48, srcIdx: 19, tradeIdx: 13, settleIdx: 15, principalIdx: 22, brokerIdx: 39, tsIdx: 47 },
    RDIV:  { totalCols: 45, srcIdx: 19, tradeIdx: 13, settleIdx: 15, principalIdx: 22, brokerIdx: 36, tsIdx: 44 },
    WRAP:  { totalCols: 51, srcIdx: 22, tradeIdx: 15, settleIdx: -1, principalIdx: 25, brokerIdx: 42, tsIdx: 50 },
  },
};

// ─── Manifest ─────────────────────────────────────────────────────────────────

function buildManifest(pos: number, edge: number, neg: number): string {
  return [
    "=== SAL_CSH SYNTHETIC DATA MANIFEST ===",
    "File type: Transaction (account_transaction table)",
    "Format: Pipe-delimited | VARIABLE column count per SOURCE_CODE | 1 line per record",
    "Source: Thomson Reuters BETA Systems (copybook EXCSHY2K)",
    "",
    "--- RECORD COUNTS ---",
    `Positive (valid):   ${pos}`,
    `Edge (boundary):    ${edge}`,
    `Negative (invalid): ${neg}`,
    `Total:              ${pos + edge + neg}`,
    "",
    "--- COLUMN COUNT BY SOURCE_CODE (verified vs Sal_csh.txt) ---",
    "WTFEE=58  JRL=47  RPRM=48  YRINC=49  STAX=48  RDIV=45  WRAP=51",
    "",
    "--- SOURCE CODE SCENARIOS ---",
    "WTFEE  Wire transfer fee — no security; PRINCIPAL>0; STATUS=E",
    "JRL    Journal/inter-acct transfer — no security; PRINCIPAL +/- (neg=incoming)",
    "RPRM   Premium distribution to Roth — no security; DESC2=source→dest accounts",
    "YRINC  Dividends and interest — no security; PRINCIPAL +/-; extra ref amount",
    "STAX   Foreign tax withholding — equity security; Julian lot; C/R flag",
    "RDIV   Reinvested dividend — fund security; 3 DESC lines; Julian lot",
    "WRAP   Wrap/management fee — TRADE_DATE only (no SETTLE_DATE); 3 DESC lines",
    "",
    "--- EDGE CASES ---",
    "1. Zero-amount JRL",
    "2. Minimum RDIV ($0.01)",
    "3. Large negative YRINC (-$50,000 reversal)",
    "4. STAX on margin account (ACCT_TYPE=2)",
    "5. WTFEE international fee ($75)",
    "6. WRAP large billing value ($1M)",
    "7. RDIV with longest fund name (VANGUARD CASH RESERVES)",
    "",
    "--- NEGATIVE CASES ---",
    "1. Invalid BA_RECCODE (X)",
    "2. Malformed TRADE_DATE (3-char year: 202-04-01) — from actual sample",
    "3. Negative WTFEE principal",
    "4. STAX with SEC_NO=0",
    "5. Missing ACCT_NO",
    "6. ACCT_TYPE=0 (invalid)",
    "7. Invalid SOURCE_CODE (XXXXX)",
    "8. ACCT_NO > 9 digits",
    "9. ACCT_CLASS=CAPM on WTFEE",
    "10. C record with blank PRINCIPAL",
  ].join("\n");
}
