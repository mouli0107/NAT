/**
 * BundleERDiagram — Interactive visual ER diagram
 *
 * Features:
 *  • Drag tables to reposition them
 *  • Drag a column handle → another column to create a FK
 *  • Click the × on an edge to delete a FK
 *  • Click the 🔑 icon on a column to toggle it as Primary Key
 *  • Auto-layout button arranges tables by topological sort order
 *  • Changes emit back via onChangeTables()
 *
 * No external diagram library — pure React + SVG.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Key, Link2, Trash2, LayoutGrid, ZoomIn, ZoomOut, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types (matches server types) ─────────────────────────────────────────────

interface ColSchema {
  id: string; displayName: string; position: number;
  sqlType: string; detectedType: string; isLiteral: boolean;
  pool?: string[]; sampleValue?: string;
}

interface ForeignKey {
  localColumn: string;
  refTableId:  string;
  refColumn:   string;
}

interface FieldMapping { custodianField: string; umpField: string; }

interface BundleTable {
  tableId: string; tableName: string; description?: string;
  schema: { columns: ColSchema[]; delimiter: string; format: string; linesPerRecord: number; sampleRecordCount: number };
  foreignKeys:   ForeignKey[];
  fieldMappings: FieldMapping[];
  sortOrder?:    number;   // optional — diagram computes it if absent
  primaryKeys?:  string[];   // column displayNames that are PKs in this table
}

interface BusinessRule { ruleId: string; type: string; [k: string]: unknown; }

interface Props {
  tables:        BundleTable[];
  businessRules: BusinessRule[];
  onChangeTables: (tables: BundleTable[]) => void;
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const NODE_W       = 260;
const HEADER_H     = 38;
const ROW_H        = 30;
const CANVAS_W     = 1400;
const CANVAS_H     = 900;
const COL_GAP      = 120;   // horizontal gap between sort-order columns
const ROW_GAP      = 40;    // vertical gap between tables in same column

// Derive PK set for a table: explicitly set PKs + columns referenced by other tables' FKs
function inferPKs(table: BundleTable, allTables: BundleTable[]): Set<string> {
  const pks = new Set<string>(table.primaryKeys ?? []);
  // Any column that another table's FK points to is treated as PK
  for (const t of allTables) {
    for (const fk of t.foreignKeys) {
      if (fk.refTableId === table.tableId) pks.add(fk.refColumn);
    }
  }
  return pks;
}

// Short SQL type label for display
function shortType(sqlType: string): string {
  return sqlType
    .replace(/VARCHAR\((\d+)\)/, "V($1)")
    .replace(/DECIMAL\((\d+),(\d+)\)/, "D($1,$2)")
    .replace(/INTEGER/, "INT")
    .replace(/DATE/, "DT");
}

// Colour header by sort order
const HEADER_COLORS = [
  "bg-indigo-600", "bg-emerald-600", "bg-amber-600",
  "bg-rose-600",   "bg-sky-600",     "bg-violet-600",
];
const EDGE_COLORS   = ["#6366f1","#10b981","#f59e0b","#f43f5e","#0ea5e9","#8b5cf6"];

// ─── Component ────────────────────────────────────────────────────────────────

export function BundleERDiagram({ tables, businessRules, onChangeTables }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);

  // ── Positions ----------------------------------------------------------------
  // Compute sortOrder from FK depth when not supplied by server
  const effectiveSortOrder = useCallback((t: BundleTable): number => {
    if (t.sortOrder !== undefined) return t.sortOrder;
    // BFS depth: tables that have FKs pointing to others sit deeper
    let depth = 0;
    let cur: BundleTable[] = [t];
    const visited = new Set<string>([t.tableId]);
    while (cur.length) {
      const next: BundleTable[] = [];
      for (const c of cur) {
        for (const fk of c.foreignKeys) {
          const parent = tables.find(x => x.tableId === fk.refTableId);
          if (parent && !visited.has(parent.tableId)) {
            visited.add(parent.tableId);
            next.push(parent);
          }
        }
      }
      if (next.length) depth++;
      cur = next;
    }
    return depth;
  }, [tables]);

  const autoPositions = useCallback((): Record<string, { x: number; y: number }> => {
    const byOrder: Record<number, BundleTable[]> = {};
    for (const t of tables) {
      const so = effectiveSortOrder(t);
      (byOrder[so] ??= []).push(t);
    }
    const orders = Object.keys(byOrder).map(Number).sort((a, b) => a - b);
    const pos: Record<string, { x: number; y: number }> = {};
    let colX = 60;
    for (const so of orders) {
      const colTables = byOrder[so];
      let rowY = 60;
      for (const t of colTables) {
        pos[t.tableId] = { x: colX, y: rowY };
        rowY += HEADER_H + t.schema.columns.length * ROW_H + ROW_GAP;
      }
      colX += NODE_W + COL_GAP;
    }
    return pos;
  }, [tables]);

  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(autoPositions);

  // Reset layout if tables change (new profile loaded)
  const prevTableIds = useRef<string>("");
  useEffect(() => {
    const key = tables.map(t => t.tableId).sort().join(",");
    if (key !== prevTableIds.current) {
      prevTableIds.current = key;
      setPositions(autoPositions());
    }
  }, [tables, autoPositions]);

  // Escape cancels an in-progress FK draw
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setConnecting(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Drag table ---------------------------------------------------------------
  const dragRef = useRef<{
    tableId: string; startX: number; startY: number; origX: number; origY: number;
  } | null>(null);

  const startDrag = useCallback((e: React.MouseEvent, tableId: string) => {
    if ((e.target as HTMLElement).dataset.handle) return; // handled by connect
    e.preventDefault();
    const pos = positions[tableId] ?? { x: 0, y: 0 };
    dragRef.current = { tableId, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  }, [positions]);

  // ── FK connection ------------------------------------------------------------
  type ConnectState = { tableId: string; colName: string; x: number; y: number } | null;
  const [connecting, setConnecting] = useState<ConnectState>(null);
  const [mousePos,   setMousePos]   = useState({ x: 0, y: 0 });
  const [hoveredHandle, setHoveredHandle] = useState<{ tableId: string; colName: string } | null>(null);

  // ── Canvas mouse handlers ----------------------------------------------------
  const toCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect() ?? { left: 0, top: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const onCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const p = toCanvas(e.clientX, e.clientY);
    setMousePos(p);
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPositions(prev => ({
        ...prev,
        [dragRef.current!.tableId]: {
          x: Math.max(0, dragRef.current!.origX + dx),
          y: Math.max(0, dragRef.current!.origY + dy),
        },
      }));
    }
  }, [toCanvas]);

  const onCanvasMouseUp = useCallback((e: React.MouseEvent) => {
    dragRef.current = null;
    if (!connecting) return;

    // Check if released over a column handle
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const targetTableId = el?.dataset?.handle ? el.dataset.tableId : null;
    const targetCol     = el?.dataset?.handle ? el.dataset.colName  : null;

    if (targetTableId && targetCol && targetTableId !== connecting.tableId) {
      // Create FK: connecting.tableId.connecting.colName → targetTableId.targetCol
      const updatedTables = tables.map(t => {
        if (t.tableId !== connecting.tableId) return t;
        const alreadyExists = t.foreignKeys.some(
          fk => fk.localColumn === connecting.colName && fk.refTableId === targetTableId && fk.refColumn === targetCol
        );
        if (alreadyExists) return t;
        return {
          ...t,
          foreignKeys: [...t.foreignKeys, {
            localColumn: connecting.colName,
            refTableId:  targetTableId,
            refColumn:   targetCol,
          }],
        };
      });
      onChangeTables(updatedTables);
    }
    setConnecting(null);
  }, [connecting, tables, onChangeTables]);

  // ── Delete FK ----------------------------------------------------------------
  const deleteFK = useCallback((tableId: string, fkIdx: number) => {
    const updatedTables = tables.map(t => {
      if (t.tableId !== tableId) return t;
      return { ...t, foreignKeys: t.foreignKeys.filter((_, i) => i !== fkIdx) };
    });
    onChangeTables(updatedTables);
  }, [tables, onChangeTables]);

  // ── Toggle PK ----------------------------------------------------------------
  const togglePK = useCallback((tableId: string, colName: string) => {
    const updatedTables = tables.map(t => {
      if (t.tableId !== tableId) return t;
      const pkSet = new Set(t.primaryKeys ?? []);
      pkSet.has(colName) ? pkSet.delete(colName) : pkSet.add(colName);
      return { ...t, primaryKeys: Array.from(pkSet) };
    });
    onChangeTables(updatedTables);
  }, [tables, onChangeTables]);

  // ── Handle position helper ---------------------------------------------------
  const getHandlePos = useCallback((tableId: string, colName: string, side: "left" | "right") => {
    const pos  = positions[tableId] ?? { x: 0, y: 0 };
    const t    = tables.find(tb => tb.tableId === tableId);
    if (!t) return { x: 0, y: 0 };
    const cols = [...t.schema.columns].sort((a, b) => a.position - b.position);
    const idx  = cols.findIndex(c => c.displayName === colName);
    const y    = pos.y + HEADER_H + (idx + 0.5) * ROW_H;
    const x    = side === "right" ? pos.x + NODE_W : pos.x;
    return { x, y };
  }, [positions, tables]);

  // ── SVG bezier path ----------------------------------------------------------
  const bezierPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const cx = (from.x + to.x) / 2;
    return `M ${from.x} ${from.y} C ${cx} ${from.y}, ${cx} ${to.y}, ${to.x} ${to.y}`;
  };

  // ── Build all FK edges -------------------------------------------------------
  const edges = useMemo(() => {
    const result: Array<{
      id: string; tableId: string; fkIdx: number;
      from: { x: number; y: number }; to: { x: number; y: number };
      fk: ForeignKey; color: string;
    }> = [];
    tables.forEach((t, tIdx) => {
      t.foreignKeys.forEach((fk, fkIdx) => {
        const from = getHandlePos(t.tableId, fk.localColumn, "right");
        const to   = getHandlePos(fk.refTableId, fk.refColumn, "left");
        result.push({
          id:      `${t.tableId}-${fkIdx}`,
          tableId: t.tableId,
          fkIdx,
          from, to,
          fk,
          color: EDGE_COLORS[tIdx % EDGE_COLORS.length],
        });
      });
    });
    return result;
  }, [tables, getHandlePos]);

  // ── Render ------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full border rounded-xl overflow-hidden bg-gray-50">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-white border-b shadow-sm">
        <span className="text-sm font-semibold text-gray-700">ER Diagram</span>
        <div className="h-4 w-px bg-gray-200 mx-1" />
        <Button size="sm" variant="outline" onClick={() => setPositions(autoPositions())}
          className="text-xs gap-1">
          <LayoutGrid className="w-3 h-3" /> Auto-layout
        </Button>
        <div className="flex-1" />
        {/* Legend */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Key className="w-3 h-3 text-yellow-500" /> Primary Key
          </span>
          <span className="flex items-center gap-1">
            <Link2 className="w-3 h-3 text-blue-500" /> Foreign Key
          </span>
          <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-gray-400" /> drag handle → column
          </span>
        </div>
        <div className="h-4 w-px bg-gray-200 mx-1" />
        <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 rounded px-2 py-1">
          <Info className="w-3 h-3" />
          <span>Drag tables · Drag handles to link · Click 🔑 to set PK · Click × to remove FK</span>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto">
        <div
          ref={canvasRef}
          className="relative select-none"
          style={{ width: CANVAS_W, height: CANVAS_H, cursor: connecting ? "crosshair" : "default" }}
          onMouseMove={onCanvasMouseMove}
          onMouseUp={onCanvasMouseUp}
          onMouseLeave={() => { dragRef.current = null; setConnecting(null); }}
        >
          {/* Grid background */}
          <svg className="absolute inset-0 pointer-events-none" width={CANVAS_W} height={CANVAS_H}>
            <defs>
              <pattern id="er-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.5" fill="#d1d5db" />
              </pattern>
            </defs>
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#er-grid)" />
          </svg>

          {/* SVG edges layer */}
          <svg
            className="absolute inset-0"
            style={{ width: CANVAS_W, height: CANVAS_H, pointerEvents: "none" }}
          >
            <defs>
              {EDGE_COLORS.map((c, i) => (
                <marker key={i} id={`arrow-${i}`} viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="7" markerHeight="7" orient="auto">
                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill={c} />
                </marker>
              ))}
              <marker id="arrow-draft" viewBox="0 0 10 10" refX="9" refY="5"
                markerWidth="7" markerHeight="7" orient="auto">
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#94a3b8" />
              </marker>
            </defs>

            {/* Committed FK edges */}
            {edges.map((edge, ei) => {
              const midX = (edge.from.x + edge.to.x) / 2;
              const midY = (edge.from.y + edge.to.y) / 2;
              const colorIdx = tables.findIndex(t => t.tableId === edge.tableId) % EDGE_COLORS.length;
              return (
                <g key={edge.id}>
                  <path
                    d={bezierPath(edge.from, edge.to)}
                    stroke={edge.color}
                    strokeWidth="2"
                    fill="none"
                    markerEnd={`url(#arrow-${colorIdx})`}
                    opacity="0.85"
                  />
                  {/* Invisible wider hit area for the delete button */}
                  <circle cx={midX} cy={midY} r="10"
                    fill="white" stroke={edge.color} strokeWidth="1.5"
                    style={{ pointerEvents: "all", cursor: "pointer" }}
                    onClick={() => deleteFK(edge.tableId, edge.fkIdx)}
                  />
                  <text x={midX} y={midY + 5} textAnchor="middle"
                    fill={edge.color} fontSize="13" fontWeight="bold"
                    style={{ pointerEvents: "all", cursor: "pointer" }}
                    onClick={() => deleteFK(edge.tableId, edge.fkIdx)}
                  >×</text>
                  {/* FK label */}
                  <text
                    x={midX} y={midY - 14}
                    textAnchor="middle" fontSize="10" fill={edge.color}
                    style={{ pointerEvents: "none" }}
                  >
                    {edge.fk.localColumn} → {edge.fk.refColumn}
                  </text>
                </g>
              );
            })}

            {/* Draft connection line while dragging */}
            {connecting && (
              <path
                d={bezierPath(connecting, mousePos)}
                stroke="#94a3b8" strokeWidth="2" strokeDasharray="6 4"
                fill="none" markerEnd="url(#arrow-draft)"
              />
            )}
          </svg>

          {/* Table nodes */}
          {tables.map((table, tIdx) => {
            const pos      = positions[table.tableId] ?? { x: 60, y: 60 };
            const pkSet    = inferPKs(table, tables);
            const fkCols   = new Set(table.foreignKeys.map(fk => fk.localColumn));
            const sortedCols = [...table.schema.columns].sort((a, b) => a.position - b.position);
            const headerCls  = HEADER_COLORS[tIdx % HEADER_COLORS.length];

            return (
              <div
                key={table.tableId}
                className="absolute rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-white"
                style={{
                  left:    pos.x,
                  top:     pos.y,
                  width:   NODE_W,
                  zIndex:  10,
                  minWidth: NODE_W,
                }}
                onMouseDown={(e) => startDrag(e, table.tableId)}
              >
                {/* Header */}
                <div className={`${headerCls} text-white px-3 py-2 cursor-move flex items-center gap-2`}>
                  <div className="grid grid-cols-3 gap-0.5 shrink-0">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="w-0.5 h-0.5 rounded-full bg-white/50" />
                    ))}
                  </div>
                  <span className="font-semibold text-sm truncate">{table.tableName}</span>
                  <span className="ml-auto text-white/70 text-xs">#{effectiveSortOrder(table)}</span>
                </div>

                {/* Column rows */}
                {sortedCols.map((col) => {
                  const isPK = pkSet.has(col.displayName);
                  const isFK = fkCols.has(col.displayName);
                  const isHovered = hoveredHandle?.tableId === table.tableId
                                 && hoveredHandle?.colName === col.displayName;
                  const isTarget  = connecting != null
                                 && connecting.tableId !== table.tableId;

                  return (
                    <div
                      key={col.id}
                      className={`flex items-center gap-1 px-2 border-b border-gray-100 text-xs
                        ${isPK ? "bg-yellow-50" : isFK ? "bg-blue-50" : "bg-white"}
                        ${isTarget && isHovered ? "bg-green-100" : ""}
                        hover:bg-gray-50 transition-colors`}
                      style={{ height: ROW_H }}
                    >
                      {/* PK toggle */}
                      <button
                        className="shrink-0 focus:outline-none"
                        title={isPK ? "Click to remove PK" : "Click to set as PK"}
                        onClick={(e) => { e.stopPropagation(); togglePK(table.tableId, col.displayName); }}
                      >
                        {isPK
                          ? <Key className="w-3 h-3 text-yellow-500" />
                          : <div className="w-3 h-3 rounded-full border border-gray-200" />
                        }
                      </button>

                      {/* FK indicator */}
                      {isFK
                        ? <Link2 className="w-3 h-3 text-blue-400 shrink-0" />
                        : <div className="w-3 h-3 shrink-0" />
                      }

                      {/* Column name */}
                      <span className={`flex-1 truncate font-mono ${isPK ? "text-yellow-800 font-semibold" : isFK ? "text-blue-700" : "text-gray-700"}`}>
                        {col.displayName}
                      </span>

                      {/* SQL type */}
                      <span className="text-gray-400 shrink-0 font-mono text-[10px]">
                        {shortType(col.sqlType)}
                      </span>

                      {/* Connection handle */}
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 ml-1 cursor-crosshair transition-colors border
                          ${connecting && connecting.tableId === table.tableId && connecting.colName === col.displayName
                            ? "bg-blue-500 border-blue-600"
                            : isHovered && connecting
                              ? "bg-green-400 border-green-600 scale-125"
                              : "bg-gray-200 border-gray-300 hover:bg-blue-400 hover:border-blue-500"
                          }`}
                        data-handle="1"
                        data-table-id={table.tableId}
                        data-col-name={col.displayName}
                        title="Drag to link as FK"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const p = toCanvas(e.clientX, e.clientY);
                          setConnecting({ tableId: table.tableId, colName: col.displayName, ...p });
                        }}
                        onMouseEnter={() => setHoveredHandle({ tableId: table.tableId, colName: col.displayName })}
                        onMouseLeave={() => setHoveredHandle(null)}
                      />
                    </div>
                  );
                })}

                {/* Footer with stats */}
                <div className="px-3 py-1 bg-gray-50 border-t text-[10px] text-gray-400 flex justify-between">
                  <span>{sortedCols.length} columns</span>
                  <span>{table.foreignKeys.length} FK{table.foreignKeys.length !== 1 ? "s" : ""}</span>
                  <span>{pkSet.size} PK{pkSet.size !== 1 ? "s" : ""}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-1.5 bg-white border-t text-xs text-gray-400 flex items-center gap-4">
        <span>{tables.length} table{tables.length !== 1 ? "s" : ""}</span>
        <span>{tables.reduce((n, t) => n + t.foreignKeys.length, 0)} FK relationship{tables.reduce((n, t) => n + t.foreignKeys.length, 0) !== 1 ? "s" : ""}</span>
        <span>{businessRules.length} business rule{businessRules.length !== 1 ? "s" : ""}</span>
        {connecting && (
          <span className="ml-auto text-blue-500 font-medium animate-pulse">
            Drawing FK from <b>{connecting.colName}</b> — drop on target column or press Esc to cancel
          </span>
        )}
      </div>
    </div>
  );
}
