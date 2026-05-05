/**
 * generation-history.ts
 * Persistent storage for synthetic data generation history.
 * Metadata: data/generation-history.json
 * Data files: data/temp-outputs/<id>.dat  (48-hour TTL)
 */

import fs from "fs";
import path from "path";

// ── Paths ──────────────────────────────────────────────────────────────────────
const DATA_DIR       = path.join(process.cwd(), "data");
const HISTORY_FILE   = path.join(DATA_DIR, "generation-history.json");
const TEMP_DIR       = path.join(DATA_DIR, "temp-outputs");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR,  { recursive: true });
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ── Types ──────────────────────────────────────────────────────────────────────
export interface HistoryEntry {
  id: string;
  custodianName: string;
  uploadedFilename: string;
  uploadedAt: string;
  generatedAt: string;
  schemaSnap: {
    format: string;
    linesPerRecord: number;
    columnCount: number;
    sampleRecordCount: number;
    fullSchema: any;
  };
  config: {
    recordCount: number;
    includeManifest: boolean;
  };
  result: {
    recordCount: number;
    breakdown: { positive: number; edge: number; negative: number };
    dataBytes: number;
  };
  dataFileId?: string;
  dataFileExpiry?: string;
}

// ── Custodian name detection ───────────────────────────────────────────────────
/**
 * Auto-detects a human-readable custodian name from a filename.
 * "DST_Systems_Export.txt" → "DST Systems"
 * "Pershing_Acct.csv"      → "Pershing"
 * "fidelity-accounts.txt"  → "Fidelity"
 */
export function detectCustodianName(filename: string): string {
  // Remove extension
  const base = filename.replace(/\.[^.]+$/, "");
  // Split on underscore, hyphen, dot, space; take up to 3 parts that are all letters (not numbers)
  const parts = base.split(/[_\-.\s]+/);
  const nameParts: string[] = [];
  for (const part of parts) {
    // Stop at first all-numeric token or very short tokens (single char) that look like separators
    if (/^\d+$/.test(part)) break;
    nameParts.push(part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    // Stop after 2 meaningful parts to keep it short
    if (nameParts.length >= 2) break;
  }
  return nameParts.length > 0 ? nameParts.join(" ") : "Unknown";
}

// ── Raw I/O ────────────────────────────────────────────────────────────────────
function readAll(): HistoryEntry[] {
  try {
    if (!fs.existsSync(HISTORY_FILE)) return [];
    return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: HistoryEntry[]): void {
  ensureDirs();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(entries, null, 2), "utf8");
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** List all entries, omitting fullSchema to keep the payload small. */
export function listHistory(): Omit<HistoryEntry, never>[] {
  const entries = readAll();
  return entries.map(e => {
    const { schemaSnap, ...rest } = e;
    const { fullSchema: _fs, ...snapWithoutFull } = schemaSnap;
    return { ...rest, schemaSnap: { ...snapWithoutFull, fullSchema: undefined } } as any;
  });
}

/** Get a single entry including fullSchema. */
export function getEntry(id: string): HistoryEntry | null {
  const entries = readAll();
  return entries.find(e => e.id === id) ?? null;
}

/** Save a new history entry and write the data to a temp file. */
export function saveEntry(input: {
  uploadedFilename: string;
  schema: any;            // full InferredSchema
  config: { recordCount: number; includeManifest: boolean };
  result: { data: string; manifest: string; recordCount: number; breakdown: { positive: number; edge: number; negative: number } };
}): HistoryEntry {
  ensureDirs();
  cleanupExpiredFiles();

  const id = `gen_${Date.now()}`;
  const now = new Date().toISOString();
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  // Write temp data file
  const dataFilePath = path.join(TEMP_DIR, `${id}.dat`);
  fs.writeFileSync(dataFilePath, input.result.data, "utf8");

  const entry: HistoryEntry = {
    id,
    custodianName: detectCustodianName(input.uploadedFilename),
    uploadedFilename: input.uploadedFilename,
    uploadedAt: now,
    generatedAt: now,
    schemaSnap: {
      format: input.schema?.format ?? "unknown",
      linesPerRecord: input.schema?.linesPerRecord ?? 1,
      columnCount: Array.isArray(input.schema?.columns) ? input.schema.columns.length : 0,
      sampleRecordCount: input.schema?.sampleRecordCount ?? 0,
      fullSchema: input.schema,
    },
    config: {
      recordCount: input.config.recordCount,
      includeManifest: input.config.includeManifest,
    },
    result: {
      recordCount: input.result.recordCount,
      breakdown: input.result.breakdown,
      dataBytes: Buffer.byteLength(input.result.data, "utf8"),
    },
    dataFileId: `${id}.dat`,
    dataFileExpiry: expiry,
  };

  const entries = readAll();
  entries.unshift(entry); // newest first
  writeAll(entries);
  return entry;
}

/** Delete an entry and its associated temp file. Returns true if found. */
export function deleteEntry(id: string): boolean {
  const entries = readAll();
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return false;

  const entry = entries[idx];
  if (entry.dataFileId) {
    const filePath = path.join(TEMP_DIR, entry.dataFileId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  entries.splice(idx, 1);
  writeAll(entries);
  return true;
}

/**
 * Returns the absolute path to the temp data file if it exists and has not expired.
 * Returns null if expired or missing.
 */
export function getDataFilePath(id: string): string | null {
  const entry = getEntry(id);
  if (!entry?.dataFileId || !entry.dataFileExpiry) return null;

  if (new Date(entry.dataFileExpiry) < new Date()) return null; // expired

  const filePath = path.join(TEMP_DIR, entry.dataFileId);
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

/** Remove temp files that have passed their expiry date. */
export function cleanupExpiredFiles(): void {
  const entries = readAll();
  let changed = false;
  for (const entry of entries) {
    if (entry.dataFileExpiry && new Date(entry.dataFileExpiry) < new Date()) {
      if (entry.dataFileId) {
        const filePath = path.join(TEMP_DIR, entry.dataFileId);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          changed = true;
        }
      }
    }
  }
  // Also check for orphaned .dat files
  try {
    if (fs.existsSync(TEMP_DIR)) {
      const validIds = new Set(entries.map(e => e.dataFileId).filter(Boolean));
      for (const file of fs.readdirSync(TEMP_DIR)) {
        if (!validIds.has(file)) {
          fs.unlinkSync(path.join(TEMP_DIR, file));
        }
      }
    }
  } catch { /* ignore */ }
  if (changed) writeAll(entries);
}
