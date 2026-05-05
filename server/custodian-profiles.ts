/**
 * Custodian Profile Library
 *
 * Challenge #3 / #5: 200 custodians → 2000+ providers, each with a different
 * layout. Once a schema is inferred for a custodian, it can be saved here so
 * future test data runs don't require re-uploading the source file.
 *
 * Storage: a single JSON file in <project-root>/data/custodian-profiles.json
 * No database dependency — works out of the box.
 */

import fs from "fs";
import path from "path";
import type { InferredSchema } from "./synthetic-file-processor.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CustodianProfile {
  id: string;             // "cp_<timestamp>" — stable across renames
  custodianName: string;  // e.g. "Fidelity", "Pershing"
  providerName?: string;  // optional sub-provider
  description?: string;
  fileFormat: string;     // e.g. "pipe_multiline (4 lines/record)"
  columnCount: number;
  createdAt: string;      // ISO-8601
  updatedAt: string;
  schema: InferredSchema;
}

// ─── Storage path ─────────────────────────────────────────────────────────────

function profilesFile(): string {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "custodian-profiles.json");
}

function readAll(): CustodianProfile[] {
  const file = profilesFile();
  if (!fs.existsSync(file)) return [];
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as CustodianProfile[];
  } catch {
    return [];
  }
}

function writeAll(profiles: CustodianProfile[]): void {
  fs.writeFileSync(profilesFile(), JSON.stringify(profiles, null, 2), "utf8");
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Return all profiles (schema field omitted for list view). */
export function listProfiles(): Omit<CustodianProfile, "schema">[] {
  return readAll().map(({ schema: _s, ...rest }) => rest);
}

/** Return a single profile including its full schema. */
export function getProfile(id: string): CustodianProfile | null {
  return readAll().find(p => p.id === id) ?? null;
}

export interface SaveProfileInput {
  custodianName: string;
  providerName?: string;
  description?: string;
  schema: InferredSchema;
}

/** Save a new custodian profile (inferred schema + metadata). */
export function saveProfile(input: SaveProfileInput): CustodianProfile {
  const profiles = readAll();
  const now = new Date().toISOString();

  const profile: CustodianProfile = {
    id: `cp_${Date.now()}`,
    custodianName: input.custodianName.trim(),
    providerName: input.providerName?.trim(),
    description: input.description?.trim(),
    fileFormat: `${input.schema.format} (${input.schema.linesPerRecord} line${input.schema.linesPerRecord > 1 ? "s" : ""}/record)`,
    columnCount: input.schema.columns.length,
    createdAt: now,
    updatedAt: now,
    schema: input.schema,
  };

  profiles.push(profile);
  writeAll(profiles);
  console.log(`[CustodianProfiles] Saved "${profile.custodianName}" → ${profile.id}`);
  return profile;
}

export interface UpdateProfileInput {
  custodianName?: string;
  providerName?: string;
  description?: string;
  schema?: InferredSchema;
}

/** Update metadata or schema of an existing profile. */
export function updateProfile(id: string, input: UpdateProfileInput): CustodianProfile | null {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const existing = profiles[idx];
  const updated: CustodianProfile = {
    ...existing,
    ...(input.custodianName  && { custodianName:  input.custodianName.trim() }),
    ...(input.providerName   && { providerName:   input.providerName.trim()  }),
    ...(input.description    && { description:    input.description.trim()   }),
    ...(input.schema         && {
      schema:       input.schema,
      fileFormat:   `${input.schema.format} (${input.schema.linesPerRecord} line${input.schema.linesPerRecord > 1 ? "s" : ""}/record)`,
      columnCount:  input.schema.columns.length,
    }),
    updatedAt: new Date().toISOString(),
  };

  profiles[idx] = updated;
  writeAll(profiles);
  return updated;
}

/** Delete a profile by id. Returns true if found and deleted. */
export function deleteProfile(id: string): boolean {
  const profiles = readAll();
  const filtered = profiles.filter(p => p.id !== id);
  if (filtered.length === profiles.length) return false;
  writeAll(filtered);
  console.log(`[CustodianProfiles] Deleted profile ${id}`);
  return true;
}

/** Search profiles by custodian name (case-insensitive, partial match). */
export function searchProfiles(query: string): Omit<CustodianProfile, "schema">[] {
  const q = query.toLowerCase();
  return readAll()
    .filter(p =>
      p.custodianName.toLowerCase().includes(q) ||
      (p.providerName?.toLowerCase().includes(q)) ||
      (p.description?.toLowerCase().includes(q))
    )
    .map(({ schema: _s, ...rest }) => rest);
}
