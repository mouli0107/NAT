/**
 * Synthetic File Processor
 * Parses uploaded txt/csv/xlsx files, infers schema, and generates
 * test data (positive + edge + negative) in the EXACT same format.
 */

import * as XLSX from "xlsx";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FieldType =
  | "account_id"    // 8-digit numeric
  | "ssn"           // 9-digit numeric (PII)
  | "phone"         // 10-digit numeric (PII)
  | "zip_code"      // 5-digit or ZIP+4 postal code
  | "email"         // email address (PII)
  | "date_mmddyy"   // 6-digit MMDDYY
  | "state_code"    // 2-letter uppercase US state
  | "country_code"  // 2-letter uppercase country
  | "amount"        // decimal like 0.00000
  | "integer"       // small integer code
  | "name"          // person/company name text (PII)
  | "address"       // street address (PII)
  | "city"          // city name (PII)
  | "literal"       // always the same value — copy exactly
  | "code_pool"     // short code — sample randomly from observed pool
  | "always_empty"  // always blank
  | "timestamp"     // date/time string
  | "text"          // generic text
  | "unknown";

export type DataCategory = "positive" | "edge" | "negative";

export interface FieldSchema {
  id: string;             // e.g. "L1_P3" = line 1, position 3
  displayName: string;    // human-readable label
  lineIndex: number;      // 0-based line within a record
  position: number;       // 0-based field position within that line
  sqlType: string;        // e.g. VARCHAR(10)
  detectedType: FieldType;
  isPII: boolean;
  sampleValue: string;
  populatedCount: number;
  totalSampleCount: number;
  isLiteral: boolean;
  literalValue?: string;
  pool?: string[];        // observed values for code_pool fields
  maxObservedLength: number;
  // User-editable overrides (set by frontend schema editor)
  customRegex?: string;   // if set, override type-based generation with this pattern
  isCommon?: boolean;     // if true, field is shared/common across all custodian profiles
}

export interface InferredSchema {
  format: "pipe_multiline" | "pipe_singleline" | "csv" | "excel";
  delimiter: string;
  linesPerRecord: number;
  recordBoundaryPrefix?: string;
  sampleRecordCount: number;
  columns: FieldSchema[];
  rawSampleRecords?: string[][];
}

export interface GenerateOptions {
  schema: InferredSchema;
  recordCount: number;
  includeManifest: boolean;
}

export interface GenerateResult {
  data: string;
  manifest: string;
  recordCount: number;
  breakdown: { positive: number; edge: number; negative: number };
}

// ─── Data Pools ───────────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "JAMES","JOHN","ROBERT","MICHAEL","WILLIAM","DAVID","RICHARD","JOSEPH","THOMAS","CHARLES",
  "PATRICIA","JENNIFER","LINDA","BARBARA","ELIZABETH","SUSAN","JESSICA","SARAH","KAREN","LISA",
  "MARK","DONALD","GEORGE","KENNETH","STEVEN","EDWARD","BRIAN","RONALD","ANTHONY","KEVIN",
  "MARY","SANDRA","DONNA","CAROL","RUTH","SHARON","MICHELLE","LAURA","AMANDA","MELISSA"
];

const LAST_NAMES = [
  "SMITH","JOHNSON","WILLIAMS","BROWN","JONES","GARCIA","MILLER","DAVIS","WILSON","ANDERSON",
  "TAYLOR","THOMAS","HERNANDEZ","MOORE","MARTIN","JACKSON","THOMPSON","WHITE","LOPEZ","LEE",
  "HARRIS","CLARK","LEWIS","ROBINSON","WALKER","PEREZ","HALL","YOUNG","ALLEN","SANCHEZ",
  "WRIGHT","KING","SCOTT","GREEN","BAKER","ADAMS","NELSON","CARTER","MITCHELL","ROBERTS"
];

const COMPANY_SUFFIXES = ["INC","LLC","CORP","LTD","CO","GROUP","PARTNERS","ASSOCIATES","HOLDINGS","TRUST"];

const CUSTODIAN_FIRMS = [
  "APEX FINANCIAL INC C/F","STONEX FINANCIAL INC C/F","EDWARD FINANCIAL INC C/F",
  "FIDELITY INVESTMENTS INC C/F","CHARLES SCHWAB C/F","TD AMERITRADE C/F",
  "RAYMOND JAMES INC C/F","MERRILL LYNCH C/F","VANGUARD GROUP C/F","PERSHING LLC C/F"
];

const STREET_TYPES = ["ST","AVE","DR","RD","LN","BLVD","CT","WAY","PLACE","CIR","LOOP","TRL","PL"];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

const TERRITORY_STATES = ["PR","GU","VI","AS","MP","DC"]; // edge case states

const STATE_CITIES: Record<string, string[]> = {
  AL: ["BIRMINGHAM","MONTGOMERY","HUNTSVILLE","MOBILE","TUSCALOOSA","THEODORE","HONORAVILLE","RAINBOW CITY"],
  AR: ["LITTLE ROCK","FAYETTEVILLE","FORT SMITH","SPRINGDALE","HINDSVILLE","JONESBORO"],
  PA: ["PHILADELPHIA","PITTSBURGH","ALLENTOWN","ERIE","HAVERTOWN","WEST CHESTER","READING"],
  OK: ["OKLAHOMA CITY","TULSA","NORMAN","BROKEN ARROW","EDMOND","LAWTON"],
  WI: ["MILWAUKEE","MADISON","GREEN BAY","KENOSHA","JANESVILLE","RACINE"],
  TN: ["NASHVILLE","MEMPHIS","KNOXVILLE","CHATTANOOGA","CLARKSVILLE","MURFREESBORO"],
  NC: ["CHARLOTTE","RALEIGH","GREENSBORO","DURHAM","KANNAPOLIS","WINSTON-SALEM"],
  SC: ["COLUMBIA","CHARLESTON","GREENVILLE","SPARTANBURG","ROCK HILL","FLORENCE"],
  KS: ["WICHITA","OVERLAND PARK","KANSAS CITY","TOPEKA","OLATHE","LAWRENCE"],
  TX: ["HOUSTON","SAN ANTONIO","DALLAS","AUSTIN","FORT WORTH","EL PASO","PLANO"],
  FL: ["JACKSONVILLE","MIAMI","TAMPA","ORLANDO","ST PETERSBURG","HIALEAH"],
  OH: ["COLUMBUS","CLEVELAND","CINCINNATI","TOLEDO","AKRON","DAYTON"],
  CA: ["LOS ANGELES","SAN DIEGO","SAN JOSE","SAN FRANCISCO","FRESNO","SACRAMENTO"],
  NY: ["NEW YORK","BUFFALO","ROCHESTER","YONKERS","SYRACUSE","ALBANY"],
  IL: ["CHICAGO","AURORA","NAPERVILLE","JOLIET","ROCKFORD","SPRINGFIELD"],
};

const FALLBACK_CITIES = ["SPRINGFIELD","RIVERSIDE","FAIRVIEW","MADISON","GEORGETOWN","CLINTON","FRANKLIN","GREENFIELD"];

const IRA_TYPES = ["IRA","SEP IRA","STRETCH IRA","ROTH IRA","SIMPLE IRA","INHERITED IRA"];
const ACCT_DESIGNATIONS = ["TOD","JTWROS","TTEE","CUSTODIAN","BENEFICIARY","POD"];

// ─── Helper Generators ────────────────────────────────────────────────────────

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randDigits(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += rnd(i === 0 ? 1 : 0, 9).toString();
  return s;
}

function genAccountId(): string { return randDigits(8); }

function genSSN(): string {
  const area = rnd(100, 899);
  const group = rnd(10, 99);
  const serial = rnd(1000, 9999);
  return `${area}${group}${serial}`;
}

function genPhone(): string {
  const area = rnd(200, 999);
  const prefix = rnd(200, 999);
  const line = rnd(1000, 9999);
  return `${area}${prefix}${line}`;
}

// Real US zip code ranges for more realistic output
const ZIP_PREFIXES = ["100","200","300","400","500","600","700","800","900","021","048","060","110","150","170","190","210","220","230","270","280","290","310","320","330","340","350","360","370","380","390","410","420","430","440","460","470","480","490","500","510","520","530","540","550","560","570","580","590","610","620","630","640","660","670","680","690","700","710","720","730","740","750","760","770","780","790","800","810","820","830","840","850","860","870","880","890","900","910","920","930","940","950","960","970","980","990"];
function genZipCode(): string {
  const prefix = pick(ZIP_PREFIXES);
  const suffix = rnd(0, 99).toString().padStart(2, "0");
  return prefix + suffix;
}

const EMAIL_DOMAINS = ["gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com","company.com","example.com","test.org","mail.net","corp.com"];
const EMAIL_PREFIXES = ["john","jane","robert","mary","michael","linda","david","barbara","james","patricia","william","jennifer","charles","elizabeth","thomas","susan"];
function genEmail(): string {
  return `${pick(EMAIL_PREFIXES)}${rnd(10,999)}@${pick(EMAIL_DOMAINS)}`;
}

function genDateMMDDYY(yearsAgoMin = 0, yearsAgoMax = 20): string {
  const now = new Date();
  const yearsAgo = rnd(yearsAgoMin, yearsAgoMax);
  const d = new Date(now.getFullYear() - yearsAgo, rnd(0, 11), rnd(1, 28));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(2);
  return `${mm}${dd}${yy}`;
}

function genAmount(max = 999999, decimalPlaces = 2): string {
  return (Math.random() * max).toFixed(decimalPlaces);
}

function genAddress(): string {
  return `${rnd(100, 9999)} ${pick(LAST_NAMES)} ${pick(STREET_TYPES)}`;
}

function genName(isPerson = true): string {
  if (!isPerson) return `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`;
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function genNameInverted(): string {
  return `${pick(LAST_NAMES)} ${pick(FIRST_NAMES)}`;
}

function getCitiesForState(state: string): string[] {
  return STATE_CITIES[state] || FALLBACK_CITIES;
}

function genTimestamp(): string {
  const m = rnd(1, 12);
  const d = rnd(1, 28);
  const y = rnd(2020, 2026);
  const h = rnd(0, 23);
  const min = rnd(0, 59);
  const s = rnd(0, 59);
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${m}/${d}/${y} ${h12}:${String(min).padStart(2,"0")}:${String(s).padStart(2,"0")} ${ampm}`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max lines read from any source file for schema inference.
 *  Keeps memory safe for large files — schema only needs a representative sample.
 *  5 000 lines ≈ 1 250 4-line records, which is more than enough for stable inference.
 */
const MAX_SAMPLE_LINES = 5_000;

// ─── File Parsing ─────────────────────────────────────────────────────────────

function detectDelimiter(line: string): string {
  const pipeCount = (line.match(/\|/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  if (pipeCount >= commaCount && pipeCount >= tabCount) return "|";
  if (tabCount > commaCount) return "\t";
  return ",";
}

function detectMultiLinePattern(lines: string[], delimiter: string): { linesPerRecord: number; boundaryPrefix?: string } {
  // Check if some lines start with a short pattern like "C|" suggesting multi-line records
  const firstFieldValues: Record<string, number> = {};
  for (const line of lines) {
    const firstField = line.split(delimiter)[0];
    if (firstField && firstField.length <= 4) {
      firstFieldValues[firstField] = (firstFieldValues[firstField] || 0) + 1;
    }
  }

  // Find most common first-field that appears at regular intervals
  const dominant = Object.entries(firstFieldValues)
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])[0];

  if (!dominant) return { linesPerRecord: 1 };

  const prefix = dominant[0];
  const prefixLine = `${prefix}${delimiter}`;

  // Find positions of boundary lines
  const positions: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith(prefixLine) || lines[i] === prefix) {
      positions.push(i);
    }
  }

  if (positions.length < 2) return { linesPerRecord: 1 };

  // Calculate gap between boundary lines (the lines per record)
  const gaps = positions.slice(1).map((p, i) => p - positions[i]);
  const mostCommonGap = gaps.sort((a, b) =>
    gaps.filter(g => g === b).length - gaps.filter(g => g === a).length
  )[0];

  if (mostCommonGap > 1 && mostCommonGap <= 10) {
    return { linesPerRecord: mostCommonGap, boundaryPrefix: prefixLine };
  }

  return { linesPerRecord: 1 };
}

function groupIntoRecords(lines: string[], linesPerRecord: number, boundaryPrefix?: string): string[][] {
  const records: string[][] = [];

  if (linesPerRecord === 1) {
    return lines.map(l => [l]);
  }

  let current: string[] = [];
  for (const line of lines) {
    const isBoundary = boundaryPrefix
      ? line.startsWith(boundaryPrefix)
      : current.length === 0 || current.length === linesPerRecord;

    if (isBoundary && current.length > 0) {
      if (current.length === linesPerRecord) records.push(current);
      current = [line];
    } else if (isBoundary) {
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length === linesPerRecord) records.push(current);

  return records;
}

function classifyFieldType(values: string[]): FieldType {
  const nonEmpty = values.filter(v => v && v.trim() !== "");
  if (nonEmpty.length === 0) return "always_empty";

  const unique = Array.from(new Set(nonEmpty));
  if (unique.length === 1) return "literal";

  const sample = nonEmpty.slice(0, 20);

  // ── Specific-length numeric checks first (strict: all must match) ─────────
  if (sample.every(v => /^\d{8}$/.test(v))) return "account_id";
  if (sample.every(v => /^\d{9}$/.test(v))) return "ssn";
  if (sample.every(v => /^\d{10}$/.test(v))) return "phone";
  if (sample.every(v => /^\d{6}$/.test(v) && parseInt(v.slice(0, 2)) <= 12 && parseInt(v.slice(2, 4)) <= 31))
    return "date_mmddyy";

  // ── Fix #3: Majority-vote for numeric types when field has mixed content ──
  // (e.g. Line 2 pos 0 has phones + occasional name/state — phones dominate)
  const phoneCount = nonEmpty.filter(v => /^\d{10}$/.test(v)).length;
  if (phoneCount >= nonEmpty.length * 0.40) return "phone";
  const acctCount  = nonEmpty.filter(v => /^\d{8}$/.test(v)).length;
  if (acctCount  >= nonEmpty.length * 0.40) return "account_id";
  const ssnCount   = nonEmpty.filter(v => /^\d{9}$/.test(v)).length;
  if (ssnCount   >= nonEmpty.length * 0.40) return "ssn";

  // ── Fix #3 cont: State/country — majority vote before code_pool ──────────
  const allStatePool = [...US_STATES, ...TERRITORY_STATES];
  const twoLetterSample = sample.filter(v => /^[A-Z]{2}$/.test(v));
  if (twoLetterSample.length >= sample.length * 0.5) {
    const stateMatchCount = twoLetterSample.filter(v => allStatePool.includes(v)).length;
    if (stateMatchCount >= twoLetterSample.length * 0.6) return "state_code";
    if (twoLetterSample.length === sample.length) return "country_code";
  }

  // ── Zip code: 5-digit or ZIP+4 — check BEFORE generic code_pool ────────────
  if (nonEmpty.every(v => /^\d{5}$/.test(v) || /^\d{5}-\d{4}$/.test(v)) &&
      nonEmpty.some(v => /^\d{5}/.test(v))) {
    return "zip_code";
  }

  // ── Email address ─────────────────────────────────────────────────────────
  if (sample.some(v => /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(v))) {
    if (sample.filter(v => /@/.test(v)).length >= sample.length * 0.4) return "email";
  }

  // ── All-digit financial code pools (e.g. account groups 9999246, 9999139) ──
  // Placed BEFORE the alpha code_pool check so 5-9 digit all-numeric codes with
  // low cardinality are treated as code_pool, not "text".
  if (unique.length <= 20 && nonEmpty.every(v => /^\d{5,9}$/.test(v))) {
    return "code_pool";
  }

  // ── Fix #1 + #4: Expanded code_pool — allow spaces, higher cardinality ───
  // Applies to short uppercase codes including compound codes like "6 DST1"
  if (
    unique.length <= 20 &&
    nonEmpty.every(v => v.length <= 15 && /^[A-Z0-9$_\-\.\s]+$/i.test(v)) &&
    nonEmpty.some(v => /[A-Z]/i.test(v)) &&         // must have at least some letter content
    !nonEmpty.every(v => /^\d+$/.test(v))            // not all-digit (those handled separately)
  ) {
    return "code_pool";
  }

  // ── Fix #7: Comma-decimal amount format (e.g. 0.0000,0000 DST format) ────
  if (sample.some(v => /^\d+\.\d+,\d+$/.test(v))) return "amount";
  if (sample.some(v => /^\d+\.\d{4,}$/.test(v)))  return "amount";

  if (sample.every(v => /^\d{1,6}$/.test(v))) return "integer";

  // ── Text classification ───────────────────────────────────────────────────
  if (sample.some(v => /\d+\/\d+\/\d{4}/.test(v))) return "timestamp";

  const avgLen = sample.reduce((s, v) => s + v.length, 0) / sample.length;
  if (avgLen > 8 && sample.some(v => /\d/.test(v) && /[A-Z]/.test(v))) return "address";
  if (avgLen > 4 && sample.some(v => /\s/.test(v))) {
    if (sample.every(v => /^[A-Z\s\-\.]+$/.test(v) && v.length < 30)) return "city";
    return "name";
  }

  return "text";
}

function isPIIType(type: FieldType): boolean {
  return ["account_id","ssn","phone","email","name","address","city"].includes(type);
}

function toSqlType(type: FieldType, maxLen: number): string {
  switch (type) {
    case "account_id": return "VARCHAR(8)";
    case "ssn": return "VARCHAR(9)";
    case "phone": return "VARCHAR(10)";
    case "zip_code": return "VARCHAR(10)";
    case "email": return "VARCHAR(100)";
    case "date_mmddyy": return "VARCHAR(6)";
    case "state_code":
    case "country_code": return "CHAR(2)";
    case "amount": return "DECIMAL(15,5)";
    case "integer": return "INTEGER";
    case "literal": return `VARCHAR(${Math.max(maxLen, 1)})`;
    case "code_pool": return `VARCHAR(${Math.max(maxLen, 4)})`;
    case "always_empty": return "VARCHAR(50)";
    case "timestamp": return "VARCHAR(30)";
    case "name": return `VARCHAR(${Math.min(Math.max(maxLen + 10, 50), 150)})`;
    case "address": return `VARCHAR(${Math.min(Math.max(maxLen + 10, 80), 200)})`;
    case "city": return `VARCHAR(${Math.min(Math.max(maxLen + 10, 40), 80)})`;
    default: return `VARCHAR(${Math.min(Math.max(maxLen + 10, 50), 255)})`;
  }
}

function buildFieldDisplayName(type: FieldType, lineIndex: number, pos: number): string {
  const names: Record<FieldType, string> = {
    account_id: "account_id",
    ssn: "ssn_tax_id",
    phone: "phone",
    zip_code: "zip_code",
    email: "email",
    date_mmddyy: "date",
    state_code: "state",
    country_code: "country",
    amount: "amount",
    integer: "code",
    name: "name",
    address: "address",
    city: "city",
    literal: "fixed_value",
    code_pool: "code",
    always_empty: "empty_field",
    timestamp: "timestamp",
    text: "text",
    unknown: "field",
  };
  const base = names[type] || "field";
  return `line${lineIndex + 1}_${base}_p${pos}`;
}

/** Returns the most-common (modal) field count for a given line across records.
 *  Fix #2 / #6: prevents outlier records (e.g. international / ITALY) from
 *  inflating the field count and generating duplicate address/city blocks.
 */
function modalFieldCount(records: string[][], li: number, delimiter: string): number {
  const counts = records.map(r => (r[li] || "").split(delimiter).length);
  const freq = new Map<number, number>();
  for (const c of counts) freq.set(c, (freq.get(c) || 0) + 1);
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0][0];
}

function analyzeRecords(records: string[][], delimiter: string): FieldSchema[] {
  if (records.length === 0) return [];

  const linesPerRecord = records[0].length;
  const allColumns: FieldSchema[] = [];

  for (let li = 0; li < linesPerRecord; li++) {
    // Fix #2 / #6: use modal (most common) field count, not max
    const maxFields = modalFieldCount(records, li, delimiter);

    for (let pos = 0; pos < maxFields; pos++) {
      const values = records.map(r => {
        const fields = (r[li] || "").split(delimiter);
        return fields[pos] !== undefined ? fields[pos].trim() : "";
      });

      const nonEmpty = values.filter(v => v !== "");
      const maxLen = Math.max(...values.map(v => v.length), 1);
      const type = classifyFieldType(values);
      const pool = type === "code_pool" || type === "literal"
        ? Array.from(new Set(nonEmpty)).slice(0, 20)
        : undefined;

      allColumns.push({
        id: `L${li + 1}_P${pos}`,
        displayName: buildFieldDisplayName(type, li, pos),
        lineIndex: li,
        position: pos,
        sqlType: toSqlType(type, maxLen),
        detectedType: type,
        isPII: isPIIType(type),
        sampleValue: nonEmpty[0] || "",
        populatedCount: nonEmpty.length,
        totalSampleCount: records.length,
        isLiteral: type === "literal",
        literalValue: type === "literal" ? (nonEmpty[0] || "") : undefined,
        pool,
        maxObservedLength: maxLen,
      });
    }
  }

  return allColumns;
}

// ─── Public: Parse File ───────────────────────────────────────────────────────

export function parseUploadedFile(buffer: Buffer, filename: string): InferredSchema {
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  if (ext === "xlsx" || ext === "xls") {
    return parseExcel(buffer, filename);
  }
  return parsePlainText(buffer.toString("utf8"), filename);
}

/**
 * Async parser for large files stored on disk.
 * Uses readline streaming so only MAX_SAMPLE_LINES lines are ever loaded into
 * memory — safe even for 30 GB+ production files.
 */
export async function parseFileFromDisk(filePath: string, originalFilename: string): Promise<InferredSchema> {
  const ext = originalFilename.split(".").pop()?.toLowerCase() || "";
  if (ext === "xlsx" || ext === "xls") {
    const fs = await import("fs");
    const buf = fs.readFileSync(filePath);
    return parseExcel(buf, originalFilename);
  }

  const fs = await import("fs");
  const readline = await import("readline");

  const lines: string[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, { encoding: "utf8" }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trimEnd();
    if (trimmed.trim() !== "") {
      lines.push(trimmed);
      if (lines.length >= MAX_SAMPLE_LINES) break;
    }
  }
  rl.close();

  console.log(`[SyntheticParser] Read ${lines.length} lines from large file (capped at ${MAX_SAMPLE_LINES})`);
  return inferFromLines(lines, originalFilename);
}

function parsePlainText(content: string, filename: string): InferredSchema {
  // Cap at MAX_SAMPLE_LINES — schema inference only needs a representative sample
  const rawLines = content
    .split(/\r?\n/)
    .map(l => l.trimEnd())
    .filter(l => l.trim() !== "")
    .slice(0, MAX_SAMPLE_LINES);

  return inferFromLines(rawLines, filename);
}

/** Core schema inference from an already-loaded array of lines. */
function inferFromLines(rawLines: string[], filename: string): InferredSchema {
  const delimiter = detectDelimiter(rawLines[0] || "");
  const { linesPerRecord, boundaryPrefix } = detectMultiLinePattern(rawLines, delimiter);
  const records = groupIntoRecords(rawLines, linesPerRecord, boundaryPrefix);
  const columns = analyzeRecords(records, delimiter);

  return {
    format: linesPerRecord > 1 ? "pipe_multiline" : delimiter === "|" ? "pipe_singleline" : "csv",
    delimiter,
    linesPerRecord,
    recordBoundaryPrefix: boundaryPrefix,
    sampleRecordCount: records.length,
    columns,
    rawSampleRecords: records.slice(0, 3),
  };
}

function parseExcel(buffer: Buffer, filename: string): InferredSchema {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as string[][];

  if (rows.length < 2) {
    return { format: "excel", delimiter: ",", linesPerRecord: 1, sampleRecordCount: 0, columns: [] };
  }

  const headers = rows[0].map(h => String(h || "").trim());
  const dataRows = rows.slice(1).map(r => headers.map((_, i) => String(r[i] !== undefined ? r[i] : "")));

  // Convert to single-line records (each row is one record, one "line")
  const records = dataRows.map(r => [r.join(",")]);
  const columns = analyzeRecords(records, ",");

  // Override display names with actual header names
  columns.forEach((col, i) => {
    col.displayName = headers[i] || col.displayName;
  });

  return {
    format: "excel",
    delimiter: ",",
    linesPerRecord: 1,
    sampleRecordCount: dataRows.length,
    columns,
    rawSampleRecords: records.slice(0, 3),
  };
}

// ─── Schema → SQL ─────────────────────────────────────────────────────────────

export function schemaToSQL(schema: InferredSchema, tableName = "uploaded_data"): string {
  const lines: string[] = [
    `-- Generated by ASTRA QE Platform`,
    `-- Format: ${schema.format} | ${schema.sampleRecordCount} sample records`,
    `-- Lines per record: ${schema.linesPerRecord}`,
    ``,
    `CREATE TABLE ${tableName} (`,
  ];

  const colDefs = schema.columns.map((col, idx) => {
    const piiNote = col.isPII ? " -- PII" : "";
    const sampleNote = col.sampleValue ? ` | sample: ${col.sampleValue}` : "";
    const poolNote = col.pool && col.pool.length > 0 ? ` | pool: ${col.pool.slice(0, 5).join(",")}` : "";
    const comma = idx < schema.columns.length - 1 ? "," : "";
    return `  ${col.displayName.padEnd(35)} ${col.sqlType}${comma}${piiNote}${sampleNote}${poolNote}`;
  });

  lines.push(...colDefs);
  lines.push(");");
  return lines.join("\n");
}

// ─── Regex-based value generator ─────────────────────────────────────────────

/**
 * Generate one random value that matches the given simplified regex pattern.
 * Handles: char classes [A-Z0-9], quantifiers {n}/{n,m}/?/+/*,
 *          alternation groups (A|B|C), escape sequences \d \w \s, literals, `.`
 * This covers all patterns auto-suggested by the schema editor.
 */
export function sampleFromPattern(p: string, _depth = 0): string {
  if (!p || !p.trim() || _depth > 6) return "";

  let out = "";
  let i = 0;

  const rnd = (mn: number, mx: number) => mn + Math.floor(Math.random() * (mx - mn + 1));
  const randFrom = (s: string) => s[Math.floor(Math.random() * s.length)] ?? "";

  function quant(): { n: number; skip: number } {
    if (i >= p.length) return { n: 1, skip: 0 };
    if (p[i] === "?") return { n: rnd(0, 1), skip: 1 };
    if (p[i] === "+") return { n: rnd(1, 8),  skip: 1 };
    if (p[i] === "*") return { n: rnd(0, 6),  skip: 1 };
    if (p[i] === "{") {
      const end = p.indexOf("}", i);
      if (end < 0) return { n: 1, skip: 0 };
      const parts = p.slice(i + 1, end).split(",");
      const mn = parseInt(parts[0]) || 1;
      const mx = parts[1] !== undefined ? (parseInt(parts[1]) || mn) : mn;
      return { n: rnd(mn, mx), skip: end - i + 1 };
    }
    return { n: 1, skip: 0 };
  }

  function closeGroup(from: number): number {
    let d = 1, j = from + 1;
    while (j < p.length && d > 0) {
      if (p[j] === "(") d++;
      else if (p[j] === ")") d--;
      j++;
    }
    return j - 1;
  }

  function expandClass(cls: string): string {
    let chars = "";
    let j = 0;
    while (j < cls.length) {
      if (j + 2 < cls.length && cls[j + 1] === "-") {
        for (let c = cls.charCodeAt(j); c <= cls.charCodeAt(j + 2); c++) chars += String.fromCharCode(c);
        j += 3;
      } else {
        chars += cls[j++];
      }
    }
    return chars || "?";
  }

  while (i < p.length) {
    const ch = p[i];

    if (ch === "^" || ch === "$") { i++; continue; }

    if (ch === "\\") {
      const esc = p[i + 1] || "";
      i += 2;
      const { n, skip } = quant(); i += skip;
      const pool = esc === "d" ? "0123456789"
                 : esc === "w" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
                 : esc === "s" ? " " : esc;
      for (let k = 0; k < n; k++) out += randFrom(pool);
      continue;
    }

    if (ch === "[") {
      const j = p.indexOf("]", i + 1);
      if (j < 0) { out += ch; i++; continue; }
      const chars = expandClass(p.slice(i + 1, j));
      i = j + 1;
      const { n, skip } = quant(); i += skip;
      for (let k = 0; k < n; k++) out += randFrom(chars);
      continue;
    }

    if (ch === "(") {
      const j = closeGroup(i);
      const inner = p.slice(i + 1, j);
      const alts: string[] = [];
      let d2 = 0, st = 0;
      for (let k = 0; k < inner.length; k++) {
        if (inner[k] === "(") d2++;
        else if (inner[k] === ")") d2--;
        else if (inner[k] === "|" && d2 === 0) { alts.push(inner.slice(st, k)); st = k + 1; }
      }
      alts.push(inner.slice(st));
      i = j + 1;
      const { n, skip } = quant(); i += skip;
      for (let k = 0; k < n; k++) out += sampleFromPattern(alts[Math.floor(Math.random() * alts.length)], _depth + 1);
      continue;
    }

    if (ch === ".") {
      i++;
      const { n, skip } = quant(); i += skip;
      const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      for (let k = 0; k < n; k++) out += pool[Math.floor(Math.random() * pool.length)];
      continue;
    }

    // Literal character
    i++;
    const { n, skip } = quant(); i += skip;
    for (let k = 0; k < n; k++) out += ch;
  }

  return out;
}

// ─── Pool Coverage Tracker ────────────────────────────────────────────────────

/**
 * Guarantees that every value in a code_pool field appears at least once across
 * generated records before values start repeating randomly.
 * Challenge #7: "need small files that still cover all test cases".
 */
class PoolCoverageTracker {
  private covered = new Map<string, Set<string>>();

  /** Returns next value for `colId`, cycling through all pool values first. */
  next(colId: string, pool: string[]): string {
    if (pool.length === 0) return "";

    let coveredSet = this.covered.get(colId);
    if (!coveredSet) {
      coveredSet = new Set<string>();
      this.covered.set(colId, coveredSet);
    }

    // Coverage sweep: return the first uncovered value
    if (coveredSet.size < pool.length) {
      const uncovered = pool.find(v => !coveredSet!.has(v));
      if (uncovered !== undefined) {
        coveredSet.add(uncovered);
        return uncovered;
      }
    }

    // All values covered — random from now on
    return pick(pool);
  }
}

// ─── Test Data Generator ──────────────────────────────────────────────────────

function generateFieldValue(col: FieldSchema, category: DataCategory, edgeLabel?: string, negLabel?: string, poolTracker?: PoolCoverageTracker): string {
  // User-supplied regex override — highest priority for positive records
  if (col.customRegex && col.customRegex.trim() !== "" && category === "positive") {
    return sampleFromPattern(col.customRegex);
  }

  // Literal fields: copy exact value — EXCEPT purely-numeric literals with value > 9
  // that look like counters/sequence numbers (e.g. "17", "000100").
  // Fix #8: vary these so the output doesn't have the same number on every record.
  if (col.isLiteral && col.literalValue !== undefined) {
    const lv = col.literalValue;
    if (/^\d+$/.test(lv) && parseInt(lv, 10) > 9 && lv.length >= 2 && lv.length <= 8) {
      const base = parseInt(lv, 10);
      return (base + rnd(0, 99)).toString().padStart(lv.length, "0");
    }
    return lv;
  }

  // Always-empty fields
  if (col.detectedType === "always_empty") return "";

  // Fix #2: Sparse fields — if field was only populated in a minority of
  // source records (e.g. optional name-line 2, 3rd address line), leave blank
  // proportionally. This prevents every generated record from having 3 address
  // lines even when the source mostly had 1.
  const populationRate = col.populatedCount / Math.max(col.totalSampleCount, 1);
  if (populationRate < 0.55 && col.detectedType !== "literal") {
    if (Math.random() > populationRate * 1.4) return "";
  }

  // Positive generation
  if (category === "positive") {
    return generatePositiveValue(col, poolTracker);
  }

  // Edge generation — one special value per record based on the edge label
  if (category === "edge" && edgeLabel) {
    const edgeVal = generateEdgeValue(col, edgeLabel);
    if (edgeVal !== null) return edgeVal;
  }

  // Negative generation — one invalid value per record based on neg label
  if (category === "negative" && negLabel) {
    const negVal = generateNegativeValue(col, negLabel);
    if (negVal !== null) return negVal;
  }

  return generatePositiveValue(col, poolTracker);
}

function generatePositiveValue(col: FieldSchema, poolTracker?: PoolCoverageTracker): string {
  switch (col.detectedType) {
    case "account_id":    return genAccountId();
    case "ssn":           return genSSN();
    case "phone":         return genPhone();
    case "zip_code":      return genZipCode();
    case "email":         return genEmail();
    case "date_mmddyy":
      // Close-date fields are "000000" (no close date) for ~70% of active accounts
      if (col.displayName && col.displayName.includes("close") && Math.random() < 0.70) return "000000";
      // Fix: constrain year to last 6 years (2020–2026) so dates are always recent
      return genDateMMDDYY(0, 6);
    case "state_code":    return pick(US_STATES);
    case "country_code":  return pick(["US","CA","GB","AU","DE","FR","IT","JP","MX","BR"]);
    case "amount": {
      // Fix #7: preserve DST comma-decimal format (e.g. 0.0000,0000)
      if (col.sampleValue && /^\d+\.\d+,\d+$/.test(col.sampleValue)) {
        const [, rest] = col.sampleValue.split(".");
        const [dec1Part, dec2Part] = rest.split(",");
        const intVal = rnd(0, 999999).toString();
        const dec1Val = rnd(0, Math.pow(10, dec1Part.length) - 1).toString().padStart(dec1Part.length, "0");
        const dec2Val = rnd(0, Math.pow(10, dec2Part.length) - 1).toString().padStart(dec2Part.length, "0");
        return `${intVal}.${dec1Val},${dec2Val}`;
      }
      // Fix: parse decimal precision and integer range from sqlType (e.g. DECIMAL(18,2) → 2 decimal places)
      const precMatch = col.sqlType?.match(/DECIMAL\s*\(\s*\d+\s*,\s*(\d+)\s*\)/i);
      const decimalPlaces = precMatch ? parseInt(precMatch[1], 10) : 2;
      // Derive a sensible integer max: 4–6 significant digits, scaled by maxObservedLength
      const intMax = Math.min(Math.pow(10, Math.max(col.maxObservedLength - decimalPlaces - 1, 2)), 99999);
      return genAmount(intMax, decimalPlaces);
    }
    case "integer": {
      // Fix: respect maxObservedLength so a 2-digit field never generates 82729
      const maxDigits = Math.max(col.maxObservedLength || 1, 1);
      const maxInt = Math.pow(10, maxDigits) - 1;
      return rnd(1, Math.min(maxInt, 999999)).toString();
    }
    case "name":          return genNameInverted();
    case "address":       return genAddress();
    case "city":          return pick(FALLBACK_CITIES);
    case "timestamp": {
      // Fix #8: if sample has a numeric prefix before the date (e.g. "01 4/2/2026 12:20:59 AM"),
      // replicate that format: vary the prefix number, keep the timestamp
      if (col.sampleValue && /^(\d{1,3})\s+\d+\/\d+\/\d{4}/.test(col.sampleValue)) {
        const prefixMatch = col.sampleValue.match(/^(\d+)/);
        const prefixLen = prefixMatch ? prefixMatch[1].length : 2;
        const prefix = rnd(1, 99).toString().padStart(prefixLen, "0");
        return `${prefix} ${genTimestamp()}`;
      }
      return genTimestamp();
    }
    case "code_pool": {
      if (!col.pool || col.pool.length === 0) return "";
      // Fix #8: single-entry purely-numeric pool (e.g. ["17"]) = likely a counter —
      // vary it so every record doesn't get the same value.
      if (col.pool.length === 1 && /^\d+$/.test(col.pool[0])) {
        const base = parseInt(col.pool[0], 10);
        return (base + rnd(0, 99)).toString().padStart(col.pool[0].length, "0");
      }
      // Challenge #7: pool coverage tracker ensures all values appear at least once
      if (poolTracker) return poolTracker.next(col.id, col.pool);
      return pick(col.pool);
    }
    case "text":          return pick(LAST_NAMES);
    default:              return "";
  }
}

// Edge labels that apply to specific field types
const EDGE_LABELS = [
  "max_length_name",
  "territory_state",
  "oldest_date",
  "today_date",
  "zero_amount",
  "max_amount",
  "international_country",
  "name_with_special_chars",
  "long_city_name",
];

// Negative labels
const NEGATIVE_LABELS = [
  "ssn_all_zeros",
  "ssn_sequential",
  "invalid_state",
  "invalid_date_month13",
  "invalid_date_day32",
  "empty_required",
  "letters_in_numeric",
  "too_long_value",
];

function generateEdgeValue(col: FieldSchema, label: string): string | null {
  switch (label) {
    case "max_length_name":
      if (col.detectedType === "name") return "A".repeat(col.maxObservedLength).slice(0, 100);
      break;
    case "territory_state":
      if (col.detectedType === "state_code") return pick(TERRITORY_STATES);
      break;
    case "oldest_date":
      if (col.detectedType === "date_mmddyy") return genDateMMDDYY(19, 20);
      break;
    case "today_date":
      if (col.detectedType === "date_mmddyy") return genDateMMDDYY(0, 0);
      break;
    case "zero_amount":
      if (col.detectedType === "amount") return "0.00000";
      break;
    case "max_amount":
      if (col.detectedType === "amount") return "999999999.99999";
      break;
    case "international_country":
      if (col.detectedType === "country_code") return pick(["IT","DE","FR","GB","JP","AU","CA","BR"]);
      break;
    case "name_with_special_chars":
      if (col.detectedType === "name") return `${pick(LAST_NAMES)} & ${pick(LAST_NAMES)} ${pick(["III","JR","SR","TTEE","TOD"])}`;
      break;
    case "long_city_name":
      if (col.detectedType === "city") return `${pick(FALLBACK_CITIES)} ${pick(FALLBACK_CITIES)}`;
      break;
    case "zip_plus4":
      if (col.detectedType === "zip_code") return `${genZipCode()}-${rnd(1000,9999)}`;
      break;
    case "zip_territory":
      if (col.detectedType === "zip_code") return `96${rnd(700,799)}`; // Hawaii/Pacific territory range
      break;
  }
  return null;
}

function generateNegativeValue(col: FieldSchema, label: string): string | null {
  switch (label) {
    case "ssn_all_zeros":
      if (col.detectedType === "ssn") return "000000000";
      break;
    case "ssn_sequential":
      if (col.detectedType === "ssn") return "123456789";
      break;
    case "invalid_state":
      if (col.detectedType === "state_code") return "ZZ";
      break;
    case "invalid_date_month13":
      if (col.detectedType === "date_mmddyy") return `13${rnd(1,28).toString().padStart(2,"0")}${rnd(20,25)}`;
      break;
    case "invalid_date_day32":
      if (col.detectedType === "date_mmddyy") return `${rnd(1,12).toString().padStart(2,"0")}32${rnd(20,25)}`;
      break;
    case "empty_required":
      if (["account_id","ssn","name","zip_code"].includes(col.detectedType)) return "";
      break;
    case "letters_in_numeric":
      if (["account_id","ssn","phone","zip_code"].includes(col.detectedType)) return "ABCDE".slice(0, col.maxObservedLength);
      break;
    case "invalid_zip":
      if (col.detectedType === "zip_code") return "00000"; // invalid zip
      break;
    case "invalid_email":
      if (col.detectedType === "email") return "not-an-email"; // missing @ and domain
      break;
    case "too_long_value":
      if (col.detectedType === "name" || col.detectedType === "address")
        return "X".repeat(col.maxObservedLength * 3);
      break;
  }
  return null;
}

// Build a coherence map for a single record: anchors like state, city, dates
interface RecordCoherence {
  state: string;
  city: string;
  openDateIdx: number;
  closeDateIdx: number;
  productCode: string;
}

function buildCoherence(schema: InferredSchema): RecordCoherence {
  const state = pick(US_STATES);
  const city = pick(getCitiesForState(state));

  // Fix #5: identify specifically the product-code column on Line 1.
  // Product codes look like N101, C201 — they contain BOTH a letter and digit
  // and are distinguishable from pure-letter codes (DST1 starts with letters but
  // also has digits — we narrow further to pool values that start with a letter
  // followed by 1–3 digits, e.g. N1, C2, N101).
  const productCodeCol = schema.columns.find(
    c => c.lineIndex === 0 &&
         c.detectedType === "code_pool" &&
         c.pool &&
         c.pool.every(v => /^[A-Z][A-Z0-9]{1,7}$/.test(v) && /[A-Z]/.test(v) && /\d/.test(v))
  );
  // Fall back to first L1 code_pool if no product-code-shaped column found
  const fallbackCodeCol = schema.columns.find(
    c => c.lineIndex === 0 && c.detectedType === "code_pool" && c.pool
  );
  const codePool = productCodeCol?.pool ?? fallbackCodeCol?.pool ?? ["N1"];
  const productCode = pick(codePool);

  // Find columns that are date_mmddyy — first two are open/close dates
  const dateCols = schema.columns.filter(c => c.detectedType === "date_mmddyy");
  const openDateIdx = dateCols[0]?.position ?? -1;
  const closeDateIdx = dateCols[1]?.position ?? -1;

  return { state, city, openDateIdx, closeDateIdx, productCode };
}

function applyCoherence(value: string, col: FieldSchema, coherence: RecordCoherence, schema: InferredSchema): string {
  // State coherence: same state across all lines
  if (col.detectedType === "state_code") return coherence.state;

  // City coherence: same city (line 0 and last line if it has city)
  if (col.detectedType === "city") return coherence.city;

  // Coherent open/close dates: open always before close
  if (col.detectedType === "date_mmddyy" && col.position === coherence.closeDateIdx) {
    // Ensure close date is after open date
    return genDateMMDDYY(0, 2);
  }

  // Fix #5 improved: Product prefix on last line.
  // Strategy: find SHORT product-prefix entries (2-3 chars, e.g. L6, N1, CW2, E0)
  // on the last line and sync them with the record's product code.
  // We use a ≥50% threshold: if MOST pool entries are short (2-3 chars), it's a
  // product-prefix field. Long entries (DE22001U, ACTU, $CICSP5 …) won't qualify,
  // preventing clearing/sub-clearing codes from being overwritten.
  if (col.detectedType === "code_pool" && col.lineIndex === schema.linesPerRecord - 1 && col.pool) {
    const shortEntries = col.pool.filter(p => p.length >= 2 && p.length <= 3);
    // Only treat as product-prefix when at least one short entry contains a digit
    // (e.g. N1, L6, CW2). Pure-alpha pools like BUY/SELL, Y/N, DVP, USD must be
    // left to the normal pool sampler — they are NOT product-prefix codes.
    const poolLooksLikeProductPrefix = shortEntries.some(p => /\d/.test(p));
    if (poolLooksLikeProductPrefix && shortEntries.length >= col.pool.length * 0.5) {
      const p2 = coherence.productCode.slice(0, 2);
      const matched = shortEntries.find(p => p.startsWith(p2));
      if (matched) return matched;
      // Fallback to first short entry (keeps the field consistent without
      // fabricating a value that's not in the observed pool)
      return shortEntries[0];
    }
  }

  return value;
}

// ─── Public: Generate Test Data ───────────────────────────────────────────────

export function generateTestData(opts: GenerateOptions): GenerateResult {
  const { schema, recordCount, includeManifest } = opts;

  // Distribution: 80% positive, 15% edge, 5% negative
  const posCount = Math.round(recordCount * 0.80);
  const edgeCount = Math.round(recordCount * 0.15);
  const negCount = recordCount - posCount - edgeCount;

  const outputLines: string[] = [];
  const manifestRows: string[] = ["record_num,category,label,expected_result"];

  // Challenge #7: one tracker per generation run so pool coverage is guaranteed
  const poolTracker = new PoolCoverageTracker();

  let recordNum = 1;

  function generateOneRecord(category: DataCategory, label: string): void {
    const coherence = buildCoherence(schema);

    // Group columns by line
    const lineCount = schema.linesPerRecord;
    const lineFields: Record<number, FieldSchema[]> = {};
    for (const col of schema.columns) {
      if (!lineFields[col.lineIndex]) lineFields[col.lineIndex] = [];
      lineFields[col.lineIndex].push(col);
    }

    for (let li = 0; li < lineCount; li++) {
      const cols = (lineFields[li] || []).sort((a, b) => a.position - b.position);
      if (cols.length === 0) continue;

      const maxPos = cols[cols.length - 1].position;
      const fieldArr: string[] = new Array(maxPos + 1).fill("");

      for (const col of cols) {
        let rawVal = generateFieldValue(
          col,
          category,
          category === "edge" ? label : undefined,
          category === "negative" ? label : undefined,
          category === "positive" ? poolTracker : undefined,
        );
        rawVal = applyCoherence(rawVal, col, coherence, schema);
        fieldArr[col.position] = rawVal;
      }

      outputLines.push(fieldArr.join(schema.delimiter));
    }

    if (includeManifest) {
      const expected = category === "negative" ? "REJECT" : "ACCEPT";
      manifestRows.push(`${recordNum},${category},${label},${expected}`);
    }
    recordNum++;
  }

  // Generate positive records
  for (let i = 0; i < posCount; i++) {
    generateOneRecord("positive", "standard");
  }

  // Generate edge records — cycle through edge labels
  for (let i = 0; i < edgeCount; i++) {
    const label = EDGE_LABELS[i % EDGE_LABELS.length];
    generateOneRecord("edge", label);
  }

  // Generate negative records — cycle through negative labels
  for (let i = 0; i < negCount; i++) {
    const label = NEGATIVE_LABELS[i % NEGATIVE_LABELS.length];
    generateOneRecord("negative", label);
  }

  return {
    data: outputLines.join("\n"),
    manifest: manifestRows.join("\n"),
    recordCount,
    breakdown: { positive: posCount, edge: edgeCount, negative: negCount },
  };
}

// ─── Cross-File Correlation (Challenge #9) ────────────────────────────────────

/** A field that appears in multiple files and acts as a join key. */
export interface FileCorrelation {
  anchorType: "account_id" | "ssn" | "phone";
  /** One entry per file×field that contains this anchor. */
  occurrences: Array<{ filename: string; fieldId: string; displayName: string }>;
}

export interface MultiFileInferResult {
  files: Array<{ filename: string; schema: InferredSchema }>;
  /** Anchor fields detected in 2+ files — these will be kept in sync on generate. */
  correlations: FileCorrelation[];
}

/** Detect anchor fields (account_id / ssn / phone) shared across multiple schemas. */
export function detectCorrelations(
  files: Array<{ filename: string; schema: InferredSchema }>
): FileCorrelation[] {
  const ANCHOR_TYPES: Array<"account_id" | "ssn" | "phone"> = ["account_id", "ssn", "phone"];
  const correlations: FileCorrelation[] = [];

  for (const anchorType of ANCHOR_TYPES) {
    const occurrences: FileCorrelation["occurrences"] = [];
    for (const { filename, schema } of files) {
      for (const col of schema.columns) {
        if (col.detectedType === anchorType) {
          occurrences.push({ filename, fieldId: col.id, displayName: col.displayName });
        }
      }
    }
    if (occurrences.length >= 2) {
      correlations.push({ anchorType, occurrences });
    }
  }

  return correlations;
}

export interface CorrelatedGenerateOptions {
  files: Array<{ filename: string; schema: InferredSchema }>;
  recordCount: number;
  correlations: FileCorrelation[];
  includeManifest?: boolean;
}

export interface CorrelatedGenerateResult {
  files: Array<{ filename: string; data: string; manifest: string; recordCount: number }>;
  sharedKeyCount: number;
  breakdown: { positive: number; edge: number; negative: number };
}

/**
 * Generates multiple synthetic files whose anchor fields (account_id, SSN, phone)
 * share the SAME values — so accounts in a position file also exist in a transaction
 * file, matching the real-world requirement.
 */
export function generateCorrelatedData(opts: CorrelatedGenerateOptions): CorrelatedGenerateResult {
  const { files, recordCount, correlations, includeManifest = true } = opts;

  const posCount = Math.round(recordCount * 0.80);
  const edgeCount = Math.round(recordCount * 0.15);
  const negCount  = recordCount - posCount - edgeCount;

  // Build shared key pools — same size as recordCount so index i → same record across files
  const sharedKeys = new Map<string, string[]>(); // anchorType → values[recordCount]
  for (const corr of correlations) {
    const keys: string[] = [];
    for (let i = 0; i < recordCount; i++) {
      switch (corr.anchorType) {
        case "account_id": keys.push(genAccountId()); break;
        case "ssn":        keys.push(genSSN());       break;
        case "phone":      keys.push(genPhone());     break;
      }
    }
    sharedKeys.set(corr.anchorType, keys);
  }

  // Build a lookup: filename+fieldId → anchorType, so generation can substitute shared keys
  const anchorLookup = new Map<string, "account_id" | "ssn" | "phone">(); // `${filename}::${fieldId}` → type
  for (const corr of correlations) {
    for (const occ of corr.occurrences) {
      anchorLookup.set(`${occ.filename}::${occ.fieldId}`, corr.anchorType);
    }
  }

  const resultFiles: CorrelatedGenerateResult["files"] = [];

  for (const { filename, schema } of files) {
    const poolTracker = new PoolCoverageTracker();
    const outputLines: string[] = [];
    const manifestRows: string[] = ["record_num,category,label,expected_result"];
    let recordNum = 1;

    // Build per-line field index once
    const lineFields: Record<number, FieldSchema[]> = {};
    for (const col of schema.columns) {
      if (!lineFields[col.lineIndex]) lineFields[col.lineIndex] = [];
      lineFields[col.lineIndex].push(col);
    }

    const emitRecord = (category: DataCategory, label: string, globalIdx: number): void => {
      const coherence = buildCoherence(schema);
      for (let li = 0; li < schema.linesPerRecord; li++) {
        const cols = (lineFields[li] || []).sort((a, b) => a.position - b.position);
        if (cols.length === 0) continue;
        const maxPos = cols[cols.length - 1].position;
        const fieldArr: string[] = new Array(maxPos + 1).fill("");

        for (const col of cols) {
          // Shared-key substitution — this is the core of correlation
          const anchorType = anchorLookup.get(`${filename}::${col.id}`);
          if (anchorType && sharedKeys.has(anchorType)) {
            fieldArr[col.position] = sharedKeys.get(anchorType)![globalIdx % recordCount];
            continue;
          }

          let rawVal = generateFieldValue(
            col, category,
            category === "edge" ? label : undefined,
            category === "negative" ? label : undefined,
            category === "positive" ? poolTracker : undefined,
          );
          rawVal = applyCoherence(rawVal, col, coherence, schema);
          fieldArr[col.position] = rawVal;
        }

        outputLines.push(fieldArr.join(schema.delimiter));
      }

      if (includeManifest) {
        const expected = category === "negative" ? "REJECT" : "ACCEPT";
        manifestRows.push(`${recordNum},${category},${label},${expected}`);
      }
      recordNum++;
    }

    let idx = 0;
    for (let i = 0; i < posCount; i++) emitRecord("positive", "standard", idx++);
    for (let i = 0; i < edgeCount; i++) emitRecord("edge", EDGE_LABELS[i % EDGE_LABELS.length], idx++);
    for (let i = 0; i < negCount; i++) emitRecord("negative", NEGATIVE_LABELS[i % NEGATIVE_LABELS.length], idx++);

    resultFiles.push({
      filename,
      data: outputLines.join("\n"),
      manifest: manifestRows.join("\n"),
      recordCount,
    });
  }

  return {
    files: resultFiles,
    sharedKeyCount: recordCount,
    breakdown: { positive: posCount, edge: edgeCount, negative: negCount },
  };
}
