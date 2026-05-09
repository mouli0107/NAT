/**
 * Custodian Bundle Profile Library
 *
 * Sprint 1: Multi-table schema registry with FK dependency graph.
 * Each bundle holds N table schemas + FK relationships between them
 * so the generator can produce referentially-consistent data bundles.
 *
 * Storage: data/custodian-bundle-profiles.json  (no DB needed)
 */

import fs from "fs";
import path from "path";
import type { InferredSchema } from "./synthetic-file-processor.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ForeignKey {
  localColumn:  string;   // column in THIS table  e.g. "account_id"
  refTableId:   string;   // tableId of referenced table
  refColumn:    string;   // column in referenced table e.g. "account_id"
}

/**
 * Sprint 3 — Field Mapping Engine
 * Maps a custodian's own column name to the UMP canonical column name.
 * e.g. { custodianField: "ACCT_NBR", umpField: "account_id" }
 *
 * Used in two places:
 *  1. FK resolution in the generator: FK localColumn/refColumn are always UMP
 *     names; if the schema column's displayName is the custodian name, we use
 *     the mapping to find the right column.
 *  2. Output headers: the generated CSV uses custodianField names so the file
 *     looks exactly like a real custodian file.
 */
export interface FieldMapping {
  custodianField: string;   // what this custodian calls the column  e.g. "ACCT_NBR"
  umpField:       string;   // the canonical UMP/schema displayName  e.g. "account_id"
}

export interface BundleTable {
  tableId:       string;           // "tbl_<timestamp>"
  tableName:     string;           // "upload_position"
  description?:  string;
  schema:        InferredSchema;
  foreignKeys:   ForeignKey[];     // FK relationships from this table → others
  fieldMappings: FieldMapping[];   // custodian ↔ UMP name translations (Sprint 3)
  sortOrder:     number;           // topological sort position (0 = root)
}

// ─── Business Rules (Sprint 4) ────────────────────────────────────────────────

/**
 * A single column-level calculation inside a PositionRecalcRule.
 * e.g.  positionCol="units"  transCol="trans_units"  typeCol="trans_type"
 *       buyValue="BUY"  sellValue="SELL"
 * The engine computes:
 *   position.units = SUM(trans_units WHERE trans_type=BUY)
 *                  - SUM(trans_units WHERE trans_type=SELL)
 *   grouped by the rule's join key.
 */
export interface PositionRecalcCalc {
  positionCol:  string;   // column in position table to update  (UMP name)
  transCol:     string;   // column in transaction table to aggregate (UMP name)
  typeCol:      string;   // column that indicates BUY vs SELL direction (UMP name)
  buyValue:     string;   // value that means "add"      e.g. "BUY"
  sellValue:    string;   // value that means "subtract" e.g. "SELL"
}

/**
 * Post-generation rule that back-fills position rows with aggregated
 * transaction values so the two tables are mathematically consistent.
 */
export interface PositionRecalcRule {
  ruleId:             string;
  type:               "position_recalc";
  description?:       string;
  positionTableId:    string;             // the root/parent table   (upload_position)
  transactionTableId: string;             // the child table         (account_transaction)
  positionKeyCol:     string;             // join column UMP name in position table
  transKeyCol:        string;             // join column UMP name in transaction table
  calculations:       PositionRecalcCalc[];
}

export type BusinessRule = PositionRecalcRule;   // extensible for future rule types

export interface CustodianBundleProfile {
  id:             string;         // "cbp_<timestamp>"
  custodianName:  string;         // "Fidelity", "Pershing", "SEI"
  description?:   string;
  tables:         BundleTable[];
  businessRules:  BusinessRule[];  // Sprint 4 — post-generation consistency rules
  createdAt:      string;
  updatedAt:      string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function bundleFile(): string {
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "custodian-bundle-profiles.json");
}

function readAll(): CustodianBundleProfile[] {
  const file = bundleFile();
  if (!fs.existsSync(file)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as CustodianBundleProfile[];
    // Back-fill Sprint 3/4 fields for profiles saved before these sprints
    return raw.map(p => ({
      ...p,
      businessRules: p.businessRules ?? [],
      tables: p.tables.map(t => ({
        ...t,
        fieldMappings: t.fieldMappings ?? [],
      })),
    }));
  } catch {
    return [];
  }
}

function writeAll(profiles: CustodianBundleProfile[]): void {
  fs.writeFileSync(bundleFile(), JSON.stringify(profiles, null, 2), "utf8");
}

/**
 * Topological sort of tables based on FK relationships.
 * Root tables (no incoming FKs) get sortOrder 0.
 * Tables that depend on others get higher numbers.
 */
export function computeSortOrder(tables: BundleTable[]): BundleTable[] {
  const idxById: Record<string, number> = {};
  tables.forEach((t, i) => { idxById[t.tableId] = i; });

  const inDegree: number[] = new Array(tables.length).fill(0);
  const adj: number[][] = tables.map(() => []);

  for (let i = 0; i < tables.length; i++) {
    for (const fk of tables[i].foreignKeys) {
      const parentIdx = idxById[fk.refTableId];
      if (parentIdx !== undefined && parentIdx !== i) {
        // i depends on parentIdx → edge from parentIdx → i
        adj[parentIdx].push(i);
        inDegree[i]++;
      }
    }
  }

  const queue: number[] = [];
  const level: number[] = new Array(tables.length).fill(0);
  for (let i = 0; i < tables.length; i++) {
    if (inDegree[i] === 0) queue.push(i);
  }

  const visited: boolean[] = new Array(tables.length).fill(false);
  while (queue.length > 0) {
    const cur = queue.shift()!;
    visited[cur] = true;
    for (const next of adj[cur]) {
      level[next] = Math.max(level[next], level[cur] + 1);
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    }
  }

  return tables.map((t, i) => ({ ...t, sortOrder: level[i] }));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** List all bundle profiles (tables included, schemas included). */
export function listBundleProfiles(): CustodianBundleProfile[] {
  return readAll();
}

/** Return a single bundle profile. */
export function getBundleProfile(id: string): CustodianBundleProfile | null {
  return readAll().find(p => p.id === id) ?? null;
}

export interface CreateBundleInput {
  custodianName:  string;
  description?:   string;
  tables?:        Omit<BundleTable, "sortOrder">[];
  businessRules?: BusinessRule[];
}

/** Create a new bundle profile. */
export function createBundleProfile(input: CreateBundleInput): CustodianBundleProfile {
  const profiles = readAll();
  const now = new Date().toISOString();

  const rawTables: BundleTable[] = (input.tables ?? []).map((t, i) => ({
    ...t,
    tableId:       t.tableId || `tbl_${Date.now()}_${i}`,
    sortOrder:     0,
    foreignKeys:   t.foreignKeys   ?? [],
    fieldMappings: t.fieldMappings ?? [],
  }));

  const sortedTables = computeSortOrder(rawTables);

  const profile: CustodianBundleProfile = {
    id:            `cbp_${Date.now()}`,
    custodianName: input.custodianName.trim(),
    description:   input.description?.trim(),
    tables:        sortedTables,
    businessRules: input.businessRules ?? [],
    createdAt:     now,
    updatedAt:     now,
  };

  profiles.push(profile);
  writeAll(profiles);
  console.log(`[BundleProfiles] Created "${profile.custodianName}" → ${profile.id} (${profile.tables.length} tables)`);
  return profile;
}

export interface UpdateBundleInput {
  custodianName?: string;
  description?:   string;
  tables?:        Omit<BundleTable, "sortOrder">[];
  businessRules?: BusinessRule[];
}

/** Update an existing bundle profile (full replace of tables if provided). */
export function updateBundleProfile(id: string, input: UpdateBundleInput): CustodianBundleProfile | null {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return null;

  const existing = profiles[idx];

  let tables = existing.tables;
  if (input.tables !== undefined) {
    const rawTables: BundleTable[] = input.tables.map((t, i) => ({
      ...t,
      tableId:       t.tableId || `tbl_${Date.now()}_${i}`,
      sortOrder:     0,
      foreignKeys:   t.foreignKeys   ?? [],
      fieldMappings: t.fieldMappings ?? [],
    }));
    tables = computeSortOrder(rawTables);
  }

  const updated: CustodianBundleProfile = {
    ...existing,
    ...(input.custodianName             && { custodianName: input.custodianName.trim() }),
    ...(input.description               && { description:   input.description.trim()  }),
    ...(input.businessRules !== undefined && { businessRules: input.businessRules }),
    tables,
    updatedAt: new Date().toISOString(),
  };

  profiles[idx] = updated;
  writeAll(profiles);
  console.log(`[BundleProfiles] Updated "${updated.custodianName}" → ${id}`);
  return updated;
}

/** Delete a bundle profile. */
export function deleteBundleProfile(id: string): boolean {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === id);
  if (idx === -1) return false;
  profiles.splice(idx, 1);
  writeAll(profiles);
  return true;
}

/** Add or replace a single table within an existing bundle. */
export function upsertTableInBundle(
  bundleId: string,
  table: Omit<BundleTable, "sortOrder">
): CustodianBundleProfile | null {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === bundleId);
  if (idx === -1) return null;

  const existing = profiles[idx];
  const tableIdx = existing.tables.findIndex(t => t.tableId === table.tableId);
  const newTable: BundleTable = { ...table, sortOrder: 0, foreignKeys: table.foreignKeys ?? [], fieldMappings: table.fieldMappings ?? [] };

  let tables: BundleTable[];
  if (tableIdx === -1) {
    tables = [...existing.tables, newTable];
  } else {
    tables = existing.tables.map((t, i) => i === tableIdx ? newTable : t);
  }

  const sortedTables = computeSortOrder(tables);
  const updated: CustodianBundleProfile = { ...existing, tables: sortedTables, updatedAt: new Date().toISOString() };
  profiles[idx] = updated;
  writeAll(profiles);
  return updated;
}

/** Remove a single table from a bundle (also removes FKs pointing to it). */
export function removeTableFromBundle(bundleId: string, tableId: string): CustodianBundleProfile | null {
  const profiles = readAll();
  const idx = profiles.findIndex(p => p.id === bundleId);
  if (idx === -1) return null;

  const existing = profiles[idx];
  const tables = existing.tables
    .filter(t => t.tableId !== tableId)
    .map(t => ({
      ...t,
      foreignKeys: t.foreignKeys.filter(fk => fk.refTableId !== tableId),
    }));

  const sortedTables = computeSortOrder(tables);
  const updated: CustodianBundleProfile = { ...existing, tables: sortedTables, updatedAt: new Date().toISOString() };
  profiles[idx] = updated;
  writeAll(profiles);
  return updated;
}
