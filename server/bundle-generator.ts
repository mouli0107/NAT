/**
 * Bundle Generator — Sprint 2/3/4
 *
 * Generates all tables in a CustodianBundleProfile in topological order
 * (root tables first) and injects FK column pools so child tables only
 * reference values that were actually produced in the parent table.
 *
 * Algorithm:
 *  1. Sort tables by sortOrder ASC (Kahn result — root = 0).
 *  2. For each table, clone its schema.
 *  3. For every FK declared on the table, look up the parent's generated
 *     values in valuePool["parentTableId::parentColDisplayName"] and inject
 *     them as `pool` on the local column (detectedType → "code_pool").
 *  4. Run generateTestData() on the patched schema.
 *  5. Parse the raw delimited output back into headers + rows[][].
 *  6. Store every column's generated values into valuePool for downstream
 *     tables.
 */

import { generateTestData } from "./synthetic-file-processor.js";
import type { InferredSchema, FieldSchema } from "./synthetic-file-processor.js";
import { getBundleProfile } from "./custodian-bundle-profiles.js";
import type { BundleTable, FieldMapping, PositionRecalcRule, CustodianBundleProfile } from "./custodian-bundle-profiles.js";

// ─── Result Types ─────────────────────────────────────────────────────────────

export interface TableGenResult {
  tableId:   string;
  tableName: string;
  headers:   string[];      // column display names, in position order
  rows:      string[][];    // each inner array = one row's field values
  csvData:   string;        // raw delimited text as-generated
  rowCount:  number;
}

export interface BundleGenResult {
  bundleId:      string;
  custodianName: string;
  requestedRows: number;
  tables:        TableGenResult[];
  generatedAt:   string;
}

// ─── Field-mapping helpers ────────────────────────────────────────────────────

/**
 * Resolve a column by name inside a schema.
 *
 * Priority order:
 *  1. Exact displayName match (UMP name already used as displayName — most common).
 *  2. Mapping lookup: `name` is a UMP name → find the matching custodianField in
 *     mappings → look up the schema column whose displayName = custodianField.
 *  3. Reverse mapping: `name` is already a custodian field name → direct match
 *     after normalising case.
 */
function resolveColumn(
  schema:   { columns: FieldSchema[] },
  name:     string,
  mappings: FieldMapping[],
): FieldSchema | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  const n    = norm(name);

  // 1. Direct displayName match
  const direct = schema.columns.find(c => norm(c.displayName) === n);
  if (direct) return direct;

  // 2. name is a UMP field → find mapping → look up custodianField in schema
  const via = mappings.find(m => norm(m.umpField) === n);
  if (via) {
    const found = schema.columns.find(c => norm(c.displayName) === norm(via.custodianField));
    if (found) return found;
  }

  // 3. name is a custodian field → direct displayName match (already covered in 1,
  //    but included for clarity when called with custodian names directly)
  return undefined;
}

/**
 * Return the output header string for a column.
 * If a mapping exists for this column (by umpField = displayName), return
 * the custodianField so the output file uses the custodian's naming convention.
 */
function resolveHeader(displayName: string, mappings: FieldMapping[]): string {
  const norm = (s: string) => s.toLowerCase().trim();
  const mapping = mappings.find(m => norm(m.umpField) === norm(displayName));
  return mapping?.custodianField ?? displayName;
}

// ─── Business-rule helpers (Sprint 4) ────────────────────────────────────────

/**
 * Find the index of a column inside a result's headers array.
 * Tries exact match first, then resolves UMP name → custodian field via mappings.
 */
function findHeaderIdx(headers: string[], umpName: string, mappings: FieldMapping[]): number {
  const norm = (s: string) => s.toLowerCase().trim();
  const n    = norm(umpName);

  // 1. Direct header match (works when headers are already UMP names or custodian names that happen to match)
  let idx = headers.findIndex(h => norm(h) === n);
  if (idx >= 0) return idx;

  // 2. Translate UMP → custodian field name via mapping, then search headers
  const mapping = mappings.find(m => norm(m.umpField) === n);
  if (mapping) {
    idx = headers.findIndex(h => norm(h) === norm(mapping.custodianField));
    if (idx >= 0) return idx;
  }

  return -1;
}

/**
 * Sprint 4 — Position Recalculation Rule executor.
 *
 * After the transaction table is generated, aggregate trans_units / trans_total
 * by account_id (grouped), then back-fill the matching position rows so
 *   position.units  = SUM(BUY trans_units)  − SUM(SELL trans_units)
 *   position.total  = SUM(BUY trans_total)   − SUM(SELL trans_total)
 * This makes the two tables mathematically consistent.
 */
function applyPositionRecalc(
  results:  TableGenResult[],
  rule:     PositionRecalcRule,
  profile:  CustodianBundleProfile,
): void {
  const txnResult = results.find(r => r.tableId === rule.transactionTableId);
  const posResult = results.find(r => r.tableId === rule.positionTableId);
  if (!txnResult || !posResult) {
    console.warn(`[BundleRules] position_recalc: table(s) not found — txn=${rule.transactionTableId} pos=${rule.positionTableId}`);
    return;
  }

  const txnTable  = profile.tables.find(t => t.tableId === rule.transactionTableId);
  const posTable  = profile.tables.find(t => t.tableId === rule.positionTableId);
  const txnMaps   = txnTable?.fieldMappings  ?? [];
  const posMaps   = posTable?.fieldMappings  ?? [];

  // Resolve join key indices
  const txnKeyIdx = findHeaderIdx(txnResult.headers, rule.transKeyCol,    txnMaps);
  const posKeyIdx = findHeaderIdx(posResult.headers, rule.positionKeyCol, posMaps);

  if (txnKeyIdx < 0 || posKeyIdx < 0) {
    console.warn(`[BundleRules] position_recalc: join columns not found — txnKey="${rule.transKeyCol}" posKey="${rule.positionKeyCol}"`);
    return;
  }

  for (const calc of rule.calculations) {
    const txnColIdx  = findHeaderIdx(txnResult.headers, calc.transCol,  txnMaps);
    const typeColIdx = findHeaderIdx(txnResult.headers, calc.typeCol,   txnMaps);
    const posColIdx  = findHeaderIdx(posResult.headers, calc.positionCol, posMaps);

    if ([txnColIdx, typeColIdx, posColIdx].some(i => i < 0)) {
      console.warn(
        `[BundleRules] Skipping calc "${calc.positionCol}": ` +
        `txnCol=${txnColIdx} typeCol=${typeColIdx} posCol=${posColIdx}`
      );
      continue;
    }

    // Determine decimal precision from the position column's sqlType
    const posColSchema = posTable?.schema.columns.find(c => {
      const norm = (s: string) => s.toLowerCase().trim();
      return norm(c.displayName) === norm(calc.positionCol) ||
        (posMaps.find(m => norm(m.umpField) === norm(calc.positionCol))?.custodianField ?? "").toLowerCase() === norm(c.displayName);
    });
    const precMatch    = posColSchema?.sqlType?.match(/DECIMAL\s*\(\s*\d+\s*,\s*(\d+)\s*\)/i);
    const dp           = precMatch ? parseInt(precMatch[1], 10) : 4;

    // Aggregate: net = SUM(BUY) − SUM(SELL), grouped by join key
    const netByKey: Record<string, number> = {};
    for (const row of txnResult.rows) {
      const key  = (row[txnKeyIdx] ?? "").trim();
      const type = (row[typeColIdx] ?? "").trim().toUpperCase();
      const amt  = parseFloat(row[txnColIdx] ?? "0") || 0;
      if (!netByKey[key]) netByKey[key] = 0;
      if (type === calc.buyValue.toUpperCase())  netByKey[key] += amt;
      if (type === calc.sellValue.toUpperCase()) netByKey[key] -= amt;
    }

    // Back-fill position rows
    let updated = 0;
    for (const posRow of posResult.rows) {
      const key = (posRow[posKeyIdx] ?? "").trim();
      if (key in netByKey) {
        const net = Math.max(netByKey[key], 0);   // positions are non-negative
        posRow[posColIdx] = net.toFixed(dp);
        updated++;
      }
    }

    console.log(
      `[BundleRules] position_recalc: "${calc.positionCol}" updated in ${updated}/${posResult.rows.length} ` +
      `position rows (${txnResult.rows.length} transactions aggregated, dp=${dp})`
    );
  }

  // Rebuild csvData to stay in sync with the mutated rows[][]
  posResult.csvData = posResult.rows.map(r => r.join(",")).join("\n");
}

// ─── Core Generator ───────────────────────────────────────────────────────────

/**
 * Generate all tables in a bundle in dependency order.
 * Returns null if the bundle profile is not found.
 */
export function generateBundle(bundleId: string, rowCount: number): BundleGenResult | null {
  const profile = getBundleProfile(bundleId);
  if (!profile) return null;

  // --- 1. Process tables in topological order (lowest sortOrder first) --------
  const orderedTables = [...profile.tables].sort((a, b) => a.sortOrder - b.sortOrder);

  // valuePool["tableId::colDisplayName"] = array of all values produced for that column
  const valuePool: Record<string, string[]> = {};

  const results: TableGenResult[] = [];

  for (const table of orderedTables) {
    // --- 2. Deep-clone schema so mutations don't bleed across calls -----------
    const schema: InferredSchema = JSON.parse(JSON.stringify(table.schema));

    // --- 3. Inject FK pools into local columns --------------------------------
    const mappings = table.fieldMappings ?? [];
    for (const fk of table.foreignKeys) {
      // Pool key: try exact UMP name first, then via parent table's mappings
      const parentTable  = profile.tables.find(t => t.tableId === fk.refTableId);
      const parentMaps   = parentTable?.fieldMappings ?? [];
      // The pool was stored under the column's displayName; resolve the refColumn
      // through the parent's mappings so we find the correct pool key even when
      // the parent schema uses custodian names.
      const parentPoolCol = resolveColumn(
        { columns: (parentTable?.schema.columns ?? []) as FieldSchema[] },
        fk.refColumn,
        parentMaps,
      );
      const poolKey      = parentPoolCol
        ? `${fk.refTableId}::${parentPoolCol.displayName}`
        : `${fk.refTableId}::${fk.refColumn}`;
      const parentValues = valuePool[poolKey];

      if (parentValues && parentValues.length > 0) {
        // Resolve the LOCAL column via field mappings
        const localCol = resolveColumn(schema, fk.localColumn, mappings);
        if (localCol) {
          localCol.detectedType = "code_pool";
          localCol.pool        = [...new Set(parentValues.filter(v => v.trim() !== ""))];
          localCol.customRegex = undefined;
          console.log(
            `[BundleGen] ${table.tableName}.${localCol.displayName} ← pool(${localCol.pool.length}) from ${fk.refTableId}::${fk.refColumn}`
          );
        } else {
          console.warn(
            `[BundleGen] FK injection skipped — column "${fk.localColumn}" not found in ${table.tableName} (checked direct + ${mappings.length} mappings)`
          );
        }
      } else {
        console.warn(
          `[BundleGen] FK pool empty for key "${poolKey}" — parent may not be generated yet or refColumn name mismatch`
        );
      }
    }

    // --- 3b. Sprint 4: enrich type-direction columns referenced by business rules
    //         so the generator produces meaningful BUY/SELL values even if the
    //         original schema had no pool defined for that column.
    for (const rule of profile.businessRules ?? []) {
      if (rule.type === "position_recalc" && rule.transactionTableId === table.tableId) {
        for (const calc of rule.calculations) {
          const typeCol = resolveColumn(schema, calc.typeCol, mappings);
          if (typeCol && (typeCol.detectedType !== "code_pool" || !typeCol.pool?.length)) {
            typeCol.detectedType = "code_pool";
            // 3 BUY : 1 SELL weighting so positions tend to be positive after netting
            typeCol.pool        = [calc.buyValue, calc.buyValue, calc.buyValue, calc.sellValue];
            typeCol.customRegex = undefined;
            console.log(`[BundleGen] Enriched type column "${typeCol.displayName}" with pool [${typeCol.pool.join(",")}]`);
          }
        }
      }
    }

    // --- 4. Generate data for this table -------------------------------------
    const genResult = generateTestData({ schema, recordCount: rowCount, includeManifest: false });

    // --- 5. Parse raw output into headers + rows -----------------------------
    const sortedCols = [...schema.columns].sort((a, b) => a.position - b.position);
    // Sprint 3: output headers use custodian field names where mappings exist
    const headers    = sortedCols.map(c => resolveHeader(c.displayName, mappings));

    const lines  = genResult.data.split("\n").filter(l => l.trim() !== "");
    const rows: string[][] = lines.map(line => {
      const fields = line.split(schema.delimiter);
      return sortedCols.map(c => fields[c.position] ?? "");
    });

    // --- 6. Populate value pool for downstream FK injection ------------------
    // Always keyed by UMP displayName so FK resolution stays stable regardless
    // of what the output header was renamed to via field mappings.
    for (let ci = 0; ci < sortedCols.length; ci++) {
      const col = sortedCols[ci];
      const key = `${table.tableId}::${col.displayName}`;
      valuePool[key] = rows.map(r => r[ci]);
    }

    results.push({
      tableId:   table.tableId,
      tableName: table.tableName,
      headers,
      rows,
      csvData:   genResult.data,
      rowCount:  rows.length,
    });

    console.log(`[BundleGen] Generated ${rows.length} rows for "${table.tableName}" (sortOrder=${table.sortOrder})`);

    // --- 7. Sprint 4: run business rules whose transaction table just finished
    for (const rule of profile.businessRules ?? []) {
      if (rule.type === "position_recalc" && rule.transactionTableId === table.tableId) {
        console.log(`[BundleRules] Applying position_recalc rule after generating "${table.tableName}"`);
        applyPositionRecalc(results, rule, profile);
      }
    }
  }

  return {
    bundleId,
    custodianName: profile.custodianName,
    requestedRows: rowCount,
    tables:        results,
    generatedAt:   new Date().toISOString(),
  };
}
