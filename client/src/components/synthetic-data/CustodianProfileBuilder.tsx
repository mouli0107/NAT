/**
 * CustodianProfileBuilder — Sprint 1
 *
 * 3-step wizard:
 *  Step 1 · Profile   — custodian name + description
 *  Step 2 · Tables    — import / paste schema JSON for each table
 *  Step 3 · Deps      — define FK relationships + view dependency tree
 */

import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button }      from "@/components/ui/button";
import { Input }       from "@/components/ui/input";
import { Label }       from "@/components/ui/label";
import { Textarea }    from "@/components/ui/textarea";
import { Badge }       from "@/components/ui/badge";
import { ScrollArea }  from "@/components/ui/scroll-area";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Plus, Trash2, ChevronRight, ChevronLeft,
  Table2, GitMerge, Check, Loader2, Upload, X,
  ArrowRight, Database, Link2, AlertCircle, Save,
  FolderOpen, Pencil, Eye, Zap, Download, Network,
} from "lucide-react";
import { BundleERDiagram } from "./BundleERDiagram";

// ─── Types (mirrors server) ───────────────────────────────────────────────────

interface InferredSchema {
  format: string;
  delimiter: string;
  linesPerRecord: number;
  sampleRecordCount: number;
  columns: Array<{
    id: string; displayName: string; lineIndex: number; position: number;
    sqlType: string; detectedType: string; isPII: boolean;
    sampleValue: string; populatedCount: number; totalSampleCount: number;
    isLiteral: boolean; maxObservedLength: number;
    pool?: string[]; customRegex?: string;
  }>;
}

interface ForeignKey {
  localColumn: string;
  refTableId:  string;
  refColumn:   string;
}

/** Sprint 3 — maps a custodian column name ↔ UMP canonical name */
interface FieldMapping {
  custodianField: string;   // e.g. "ACCT_NBR"
  umpField:       string;   // e.g. "account_id"
}

interface BundleTable {
  tableId:       string;
  tableName:     string;
  description?:  string;
  schema:        InferredSchema;
  foreignKeys:   ForeignKey[];
  fieldMappings: FieldMapping[];
  sortOrder:     number;
  primaryKeys?:  string[];   // column displayNames marked as PKs in the ER diagram
}

// ─── Common custodian alias suggestions (Sprint 3) ────────────────────────────
/** Well-known custodian aliases for UMP canonical field names. */
const COMMON_ALIASES: Record<string, string> = {
  account_id:              "ACCT_NBR",
  security_id:             "SEC_ID",
  trans_id:                "TRN_ID",
  trans_date:              "TRN_DT",
  trans_type:              "TRN_TYPE",
  trans_total:             "TRN_AMT",
  trans_units:             "UNIT_QTY",
  trans_code_mapping_id:   "TRAN_CD",
  file_id:                 "FILE_NBR",
  entry_type:              "ENTRY_CD",
  date:                    "ENTRY_DT",
  units:                   "UNIT_QTY",
  total:                   "MKT_VAL",
  upload_position_id:      "POS_ID",
  owner_id:                "OWN_ID",
  owner_type:              "OWN_TYPE",
  holding_id:              "HOLD_ID",
  provider_id:             "PROV_ID",
  settlement_currency_id:  "SETL_CCY",
  is_restricted:           "RESTR_FLG",
  pending_units:           "PEND_UNITS",
  cash_tagging_type:       "CASH_TAG",
  trust_tagging_type:      "TRUST_TAG",
  notes:                   "MEMO",
  commission:              "COMM_AMT",
  deleted:                 "DEL_FLG",
  updated_by_id:           "UPDT_BY",
  line_number:             "LINE_NUM",
  last_updated_datetime:   "LST_UPDT_DT",
  trans_flags:             "TRN_FLAGS",
  import_trans:            "IMP_TRN_FLG",
};

interface CustodianBundleProfile {
  id:            string;
  custodianName: string;
  description?:  string;
  tables:        BundleTable[];
  createdAt:     string;
  updatedAt:     string;
}

// ─── Business Rule types (Sprint 4, mirrors server) ──────────────────────────

interface PositionRecalcCalc {
  positionCol: string;
  transCol:    string;
  typeCol:     string;
  buyValue:    string;
  sellValue:   string;
}

interface PositionRecalcRule {
  ruleId:             string;
  type:               "position_recalc";
  description?:       string;
  positionTableId:    string;
  transactionTableId: string;
  positionKeyCol:     string;
  transKeyCol:        string;
  calculations:       PositionRecalcCalc[];
}

type BusinessRule = PositionRecalcRule;

// ─── Generator result types (mirrors server/bundle-generator.ts) ─────────────

interface TableGenResult {
  tableId:   string;
  tableName: string;
  headers:   string[];
  rows:      string[][];
  csvData:   string;
  rowCount:  number;
}

interface BundleGenResult {
  bundleId:      string;
  custodianName: string;
  requestedRows: number;
  tables:        TableGenResult[];
  generatedAt:   string;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const LEVEL_COLORS = [
  "bg-violet-100 border-violet-300 text-violet-800",
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-amber-100 border-amber-300 text-amber-800",
  "bg-rose-100 border-rose-300 text-rose-800",
];
function levelColor(n: number) { return LEVEL_COLORS[n % LEVEL_COLORS.length]; }

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Collapsible column list for a table card */
function ColumnList({ schema }: { schema: InferredSchema }) {
  const [open, setOpen] = useState(false);
  const cols = schema.columns;
  const preview = cols.slice(0, 3).map(c => c.displayName).join(", ");
  return (
    <div className="text-xs">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <Eye className="w-3 h-3" />
        {open ? "Hide columns" : `${cols.length} columns (${preview}${cols.length > 3 ? "…" : ""})`}
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 max-h-36 overflow-y-auto">
          {cols.map(c => (
            <div key={c.id} className="flex items-center gap-1 truncate">
              <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1 rounded">
                {c.sqlType.split("(")[0].toLowerCase()}
              </span>
              <span className="truncate">{c.displayName}</span>
              {c.isPII && <Badge variant="outline" className="text-[9px] px-1 py-0 border-red-300 text-red-600">PII</Badge>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** FK badge showing "col → Table.col" */
function FKBadge({ fk, tables, onRemove }: {
  fk: ForeignKey;
  tables: BundleTable[];
  onRemove: () => void;
}) {
  const refTable = tables.find(t => t.tableId === fk.refTableId);
  return (
    <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs px-2 py-0.5 rounded-full">
      <Link2 className="w-2.5 h-2.5" />
      {fk.localColumn}
      <ArrowRight className="w-2.5 h-2.5" />
      {refTable?.tableName ?? "?"}.{fk.refColumn}
      <button onClick={onRemove} className="ml-0.5 hover:text-red-500">
        <X className="w-2.5 h-2.5" />
      </button>
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4;

interface Props {
  /** If supplied, load this profile into the editor (edit mode). */
  editProfileId?: string;
  onSaved?: (profile: CustodianBundleProfile) => void;
}

export function CustodianProfileBuilder({ editProfileId, onSaved }: Props) {
  const { toast } = useToast();

  // ── Wizard state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1
  const [custodianName, setCustodianName] = useState("");
  const [description,   setDescription]   = useState("");

  // Step 2 — tables
  const [tables, setTables] = useState<Omit<BundleTable, "sortOrder">[]>([]);
  const [addTableOpen,  setAddTableOpen]  = useState(false);
  const [newTableName,  setNewTableName]  = useState("");
  const [newTableDesc,  setNewTableDesc]  = useState("");
  const [newTableJson,  setNewTableJson]  = useState("");
  const [jsonError,     setJsonError]     = useState("");

  // Step 2 — Field Mapping expanded state
  const [mappingOpenIds, setMappingOpenIds] = useState<Set<string>>(new Set());
  const toggleMappingOpen = (id: string) =>
    setMappingOpenIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  // Step 3 — FK editor state
  const [addFkTableId,  setAddFkTableId]  = useState<string | null>(null);

  // Step 3 — Business rules state (Sprint 4)
  const [businessRules, setBusinessRules] = useState<BusinessRule[]>([]);
  const [addRuleOpen,   setAddRuleOpen]   = useState(false);
  const [fkLocal,       setFkLocal]       = useState("");
  const [fkRefTable,    setFkRefTable]    = useState("");
  const [fkRefCol,      setFkRefCol]      = useState("");

  // Edit mode: load existing profile
  const { data: existingData } = useQuery({
    queryKey: ["/api/synthetic-data/bundle-profiles", editProfileId],
    enabled: !!editProfileId,
    queryFn: async () => {
      const r = await fetch(`/api/synthetic-data/bundle-profiles/${editProfileId}`);
      return r.json();
    },
  });

  // Pre-fill when editing
  useState(() => {
    if (!existingData?.profile) return;
    const p: CustodianBundleProfile = existingData.profile;
    setCustodianName(p.custodianName);
    setDescription(p.description ?? "");
    setTables(p.tables.map(({ sortOrder: _, ...t }) => t));
    setBusinessRules((p as any).businessRules ?? []);
  });

  // ── Mutations ────────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload: { custodianName: string; description: string; tables: Omit<BundleTable,"sortOrder">[]; businessRules: BusinessRule[] }) => {
      const url    = editProfileId
        ? `/api/synthetic-data/bundle-profiles/${editProfileId}`
        : "/api/synthetic-data/bundle-profiles";
      const method = editProfileId ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: (data) => {
      if (!data.success) { toast({ title: "Save failed", description: data.error, variant: "destructive" }); return; }
      toast({ title: "Bundle profile saved", description: `${data.profile.tables.length} tables · ${data.profile.custodianName}` });
      queryClient.invalidateQueries({ queryKey: ["/api/synthetic-data/bundle-profiles"] });
      onSaved?.(data.profile);
    },
  });

  // ── Step 2 helpers ───────────────────────────────────────────────────────────
  const confirmAddTable = useCallback(() => {
    setJsonError("");
    if (!newTableName.trim()) { setJsonError("Table name is required"); return; }
    let schema: InferredSchema;
    try {
      const parsed = JSON.parse(newTableJson);
      if (!parsed.columns || !Array.isArray(parsed.columns)) throw new Error("Missing 'columns' array");
      schema = parsed as InferredSchema;
    } catch (e: any) {
      setJsonError(e.message || "Invalid JSON");
      return;
    }
    const tableId = `tbl_${Date.now()}`;
    setTables(prev => [...prev, {
      tableId,
      tableName:     newTableName.trim(),
      description:   newTableDesc.trim() || undefined,
      schema,
      foreignKeys:   [],
      fieldMappings: [],
    }]);
    setAddTableOpen(false);
    setNewTableName("");
    setNewTableDesc("");
    setNewTableJson("");
  }, [newTableName, newTableDesc, newTableJson]);

  const removeTable = (tableId: string) => {
    setTables(prev => prev
      .filter(t => t.tableId !== tableId)
      .map(t => ({ ...t, foreignKeys: t.foreignKeys.filter(fk => fk.refTableId !== tableId) }))
    );
  };

  /** Update the fieldMappings for one table. */
  const updateTableMappings = (tableId: string, mappings: FieldMapping[]) => {
    setTables(prev => prev.map(t => t.tableId === tableId ? { ...t, fieldMappings: mappings } : t));
  };

  /** Auto-fill mappings for a table from COMMON_ALIASES. */
  const autoSuggestMappings = (tableId: string) => {
    const t = tables.find(t => t.tableId === tableId);
    if (!t) return;
    const suggested: FieldMapping[] = t.schema.columns
      .filter(c => COMMON_ALIASES[c.displayName.toLowerCase()])
      .map(c => ({
        umpField:       c.displayName,
        custodianField: COMMON_ALIASES[c.displayName.toLowerCase()],
      }));
    // Merge with existing — don't overwrite user-set mappings
    const existing = t.fieldMappings ?? [];
    const existingKeys = new Set(existing.map(m => m.umpField.toLowerCase()));
    const merged = [...existing, ...suggested.filter(s => !existingKeys.has(s.umpField.toLowerCase()))];
    updateTableMappings(tableId, merged);
  };

  // ── Step 3 helpers ───────────────────────────────────────────────────────────
  const addFk = (tableId: string) => {
    if (!fkLocal || !fkRefTable || !fkRefCol) return;
    setTables(prev => prev.map(t => t.tableId !== tableId ? t : {
      ...t,
      foreignKeys: [...t.foreignKeys, { localColumn: fkLocal, refTableId: fkRefTable, refColumn: fkRefCol }],
    }));
    setFkLocal(""); setFkRefTable(""); setFkRefCol("");
    setAddFkTableId(null);
  };

  const removeFk = (tableId: string, fkIdx: number) => {
    setTables(prev => prev.map(t => t.tableId !== tableId ? t : {
      ...t,
      foreignKeys: t.foreignKeys.filter((_, i) => i !== fkIdx),
    }));
  };

  // Topological sort (client-side preview)
  function topoSort(tbls: Omit<BundleTable,"sortOrder">[]): (Omit<BundleTable,"sortOrder"> & { sortOrder: number })[] {
    const idxById: Record<string, number> = {};
    tbls.forEach((t, i) => { idxById[t.tableId] = i; });
    const inDegree = new Array(tbls.length).fill(0);
    const adj: number[][] = tbls.map(() => []);
    for (let i = 0; i < tbls.length; i++) {
      for (const fk of tbls[i].foreignKeys) {
        const p = idxById[fk.refTableId];
        if (p !== undefined && p !== i) { adj[p].push(i); inDegree[i]++; }
      }
    }
    const queue: number[] = [];
    const level = new Array(tbls.length).fill(0);
    for (let i = 0; i < tbls.length; i++) if (inDegree[i] === 0) queue.push(i);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const next of adj[cur]) {
        level[next] = Math.max(level[next], level[cur] + 1);
        inDegree[next]--;
        if (inDegree[next] === 0) queue.push(next);
      }
    }
    return tbls.map((t, i) => ({ ...t, sortOrder: level[i] }));
  }

  const sortedPreview = topoSort(tables);

  // Group by sortOrder for the tree view
  const maxLevel = sortedPreview.reduce((m, t) => Math.max(m, t.sortOrder), 0);
  const byLevel: Record<number, typeof sortedPreview> = {};
  for (let l = 0; l <= maxLevel; l++) byLevel[l] = sortedPreview.filter(t => t.sortOrder === l);

  // ── Render ───────────────────────────────────────────────────────────────────

  const canProceed1 = custodianName.trim().length > 0;
  const canProceed2 = tables.length > 0;

  return (
    <div className="space-y-4">

      {/* ── Step indicator ── */}
      <div className="flex items-center gap-2 text-sm">
        {([
          [1, "Profile",      Building2],
          [2, "Tables",       Table2],
          [3, "Dependencies", GitMerge],
          [4, "ER Diagram",   Network],
        ] as const).map(([n, label, Icon]) => (
          <div key={n} className="flex items-center gap-1">
            <button
              onClick={() => {
                if (n === 1) setStep(1);
                if (n === 2 && canProceed1) setStep(2);
                if (n === 3 && canProceed1 && canProceed2) setStep(3);
                if (n === 4 && canProceed1 && canProceed2) setStep(4);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                step === n
                  ? "bg-violet-600 text-white"
                  : n < step
                    ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
                    : "text-muted-foreground cursor-default"
              }`}
            >
              {n < step
                ? <Check className="w-3.5 h-3.5" />
                : <Icon className="w-3.5 h-3.5" />
              }
              {n}. {label}
            </button>
            {n < 4 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}

        <div className="ml-auto">
          <Badge variant="outline" className="text-xs">
            {tables.length} table{tables.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 1 — Profile info
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <Card className="border-violet-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-500" />
              Custodian Profile
            </CardTitle>
            <CardDescription>
              Name the custodian whose data this bundle represents (e.g. Fidelity, Pershing, SEI).
              You'll add the table schemas in the next step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name">Custodian Name <span className="text-red-500">*</span></Label>
              <Input
                id="cust-name"
                placeholder="e.g. Fidelity, Pershing, SEI, Schwab"
                value={custodianName}
                onChange={e => setCustodianName(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cust-desc">Description</Label>
              <Textarea
                id="cust-desc"
                placeholder="Optional — describe the custodian, file format, or any special notes"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="max-w-md resize-none"
              />
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!canProceed1}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              Next: Add Tables <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 2 — Table registry
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <Card className="border-violet-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-violet-500" />
                  Table Registry
                </CardTitle>
                <CardDescription>
                  Import the schema JSON for each table in this custodian's data bundle.
                  You can add 2–15 tables. Start with the most independent ones (securities, accounts).
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setAddTableOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Table
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {tables.length === 0 ? (
              <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-medium">No tables yet</p>
                <p className="text-xs mt-1">Click "Add Table" and paste a schema JSON to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {tables.map((t, i) => (
                  <div key={t.tableId} className="border rounded-lg p-3 bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Database className="w-4 h-4 text-violet-500 shrink-0" />
                        <span className="font-medium text-sm truncate">{t.tableName}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {t.schema.columns.length} cols
                        </Badge>
                      </div>
                      <button
                        onClick={() => removeTable(t.tableId)}
                        className="text-muted-foreground hover:text-red-500 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {t.description && (
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    )}
                    <ColumnList schema={t.schema} />
                    {/* Field Mapping toggle */}
                    <button
                      onClick={() => toggleMappingOpen(t.tableId)}
                      className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 mt-1"
                    >
                      <ArrowRight className={`w-2.5 h-2.5 transition-transform ${mappingOpenIds.has(t.tableId) ? "rotate-90" : ""}`} />
                      Field Mappings
                      {(t.fieldMappings?.length ?? 0) > 0 && (
                        <span className="ml-0.5 px-1 py-0 rounded-full bg-violet-100 text-violet-700 text-[9px]">
                          {t.fieldMappings.length}
                        </span>
                      )}
                    </button>
                    {mappingOpenIds.has(t.tableId) && (
                      <FieldMappingEditor
                        table={t}
                        onChange={m => updateTableMappings(t.tableId, m)}
                        onAutoSuggest={() => autoSuggestMappings(t.tableId)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(3)}
                disabled={!canProceed2}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Next: Define Dependencies <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 3 — Dependency graph
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="space-y-4">

          {/* FK editor panel */}
          <Card className="border-violet-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-violet-500" />
                Foreign Key Relationships
              </CardTitle>
              <CardDescription>
                Define which columns in each table reference columns in other tables.
                This drives referential integrity during data generation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tables.map(t => (
                <div key={t.tableId} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-violet-500" />
                      {t.tableName}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-violet-600 hover:bg-violet-50"
                      onClick={() => setAddFkTableId(addFkTableId === t.tableId ? null : t.tableId)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add FK
                    </Button>
                  </div>

                  {/* Existing FKs */}
                  {t.foreignKeys.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {t.foreignKeys.map((fk, i) => (
                        <FKBadge
                          key={i}
                          fk={fk}
                          tables={tables as any}
                          onRemove={() => removeFk(t.tableId, i)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Inline FK form */}
                  {addFkTableId === t.tableId && (
                    <div className="bg-muted/40 rounded-md p-3 space-y-2 border border-dashed border-violet-200">
                      <p className="text-xs font-medium text-muted-foreground">New FK in {t.tableName}</p>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        {/* Local column */}
                        <div className="space-y-1">
                          <Label className="text-[11px]">This column</Label>
                          <Select value={fkLocal} onValueChange={setFkLocal}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select column" />
                            </SelectTrigger>
                            <SelectContent>
                              {t.schema.columns.map(c => (
                                <SelectItem key={c.id} value={c.displayName} className="text-xs">
                                  {c.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center items-end pb-1">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>

                        {/* Ref table */}
                        <div className="space-y-1">
                          <Label className="text-[11px]">References table</Label>
                          <Select value={fkRefTable} onValueChange={v => { setFkRefTable(v); setFkRefCol(""); }}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Select table" />
                            </SelectTrigger>
                            <SelectContent>
                              {tables.filter(ot => ot.tableId !== t.tableId).map(ot => (
                                <SelectItem key={ot.tableId} value={ot.tableId} className="text-xs">
                                  {ot.tableName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Ref column (shown only after table selected) */}
                        {fkRefTable && (
                          <>
                            <div />
                            <div className="flex justify-center items-end pb-1">
                              <span className="text-[10px] text-muted-foreground">.column</span>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px]">Referenced column</Label>
                              <Select value={fkRefCol} onValueChange={setFkRefCol}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(tables.find(ot => ot.tableId === fkRefTable)?.schema.columns ?? []).map(c => (
                                    <SelectItem key={c.id} value={c.displayName} className="text-xs">
                                      {c.displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white"
                          onClick={() => addFk(t.tableId)}
                          disabled={!fkLocal || !fkRefTable || !fkRefCol}
                        >
                          <Check className="w-3 h-3 mr-1" /> Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => { setAddFkTableId(null); setFkLocal(""); setFkRefTable(""); setFkRefCol(""); }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Dependency tree visualisation */}
          <Card className="border-violet-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-violet-500" />
                Dependency Tree
                <Badge variant="outline" className="text-xs ml-1">
                  {maxLevel + 1} level{maxLevel > 0 ? "s" : ""}
                </Badge>
              </CardTitle>
              <CardDescription>
                Generation order: Level 0 tables are created first (no dependencies).
                Higher levels depend on tables below them.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tables.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Add tables in Step 2 to see the dependency tree</p>
              ) : (
                <div className="space-y-3">
                  {Array.from({ length: maxLevel + 1 }, (_, lvl) => (
                    <div key={lvl} className="flex items-start gap-3">
                      {/* Level label */}
                      <div className="w-20 shrink-0 text-right">
                        <Badge className={`text-xs ${levelColor(lvl)}`}>
                          Level {lvl}
                          {lvl === 0 && <span className="ml-1 opacity-70">(root)</span>}
                        </Badge>
                      </div>

                      {/* Arrow */}
                      {lvl > 0 && (
                        <div className="flex items-center self-center">
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      {lvl === 0 && <div className="w-4" />}

                      {/* Tables at this level */}
                      <div className="flex flex-wrap gap-2 flex-1">
                        {(byLevel[lvl] ?? []).map(t => {
                          const incomingFKs = tables.flatMap(ot =>
                            ot.foreignKeys
                              .filter(fk => fk.refTableId === t.tableId)
                              .map(fk => ({ fromTable: ot.tableName, fk }))
                          );
                          return (
                            <div
                              key={t.tableId}
                              className={`border rounded-lg px-3 py-2 text-sm font-medium ${levelColor(lvl)} min-w-[140px]`}
                            >
                              <div className="flex items-center gap-1.5">
                                <Database className="w-3.5 h-3.5" />
                                {t.tableName}
                                <Badge variant="outline" className="text-[9px] px-1 py-0 ml-auto border-current">
                                  {t.schema.columns.length}c
                                </Badge>
                              </div>
                              {incomingFKs.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {incomingFKs.map((r, i) => (
                                    <p key={i} className="text-[10px] opacity-70 flex items-center gap-0.5">
                                      <Link2 className="w-2.5 h-2.5" />
                                      ← {r.fromTable}.{r.fk.localColumn}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Business Rules Card (Sprint 4) ── */}
          <Card className="border-violet-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-violet-500" />
                    Business Rules
                  </CardTitle>
                  <CardDescription>
                    Post-generation rules that keep tables mathematically consistent.
                    Position Recalculation: back-fills units/total in the positions table
                    from the aggregated transaction data.
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => setAddRuleOpen(true)}
                  disabled={tables.length < 2}
                  className="bg-violet-600 hover:bg-violet-700 text-white shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {businessRules.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-muted-foreground">
                  <Zap className="w-6 h-6 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No business rules yet</p>
                  <p className="text-xs mt-1">
                    Add a Position Recalculation rule to make position rows reflect
                    aggregated transaction values after generation.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {businessRules.map((rule, ri) => (
                    <div key={rule.ruleId} className="border rounded-lg p-3 bg-muted/20 space-y-1.5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="text-[10px] bg-violet-100 text-violet-800 border-violet-300">
                            {rule.type === "position_recalc" ? "Position Recalc" : rule.type}
                          </Badge>
                          {rule.description && (
                            <span className="text-xs text-muted-foreground">{rule.description}</span>
                          )}
                        </div>
                        <button
                          onClick={() => setBusinessRules(prev => prev.filter((_, i) => i !== ri))}
                          className="text-muted-foreground hover:text-red-500"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {rule.type === "position_recalc" && (
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <span className="font-medium">
                              {tables.find(t => t.tableId === rule.transactionTableId)?.tableName ?? "?"}
                            </span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="font-medium">
                              {tables.find(t => t.tableId === rule.positionTableId)?.tableName ?? "?"}
                            </span>
                            <span className="ml-1">(joined on {rule.positionKeyCol})</span>
                          </div>
                          {rule.calculations.map((c, ci) => (
                            <div key={ci} className="flex items-center gap-1 font-mono text-[10px] bg-background rounded px-2 py-0.5">
                              <span className="text-violet-700">{c.positionCol}</span>
                              <span className="text-muted-foreground">=</span>
                              <span>SUM({c.transCol} WHERE {c.typeCol}={c.buyValue})</span>
                              <span className="text-muted-foreground">−</span>
                              <span>SUM({c.transCol} WHERE {c.typeCol}={c.sellValue})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action bar */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(2)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={saveMutation.isPending || !canProceed1 || !canProceed2}
              onClick={() => saveMutation.mutate({ custodianName, description, tables, businessRules })}
            >
              {saveMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                : <><Save className="w-4 h-4 mr-2" />Save Bundle Profile</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          STEP 4 — ER Diagram
      ══════════════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Network className="w-4 h-4 text-violet-500" />
            <span>Visually inspect and edit FK/PK relationships. Drag a column's <b>●</b> handle to another column to create a Foreign Key. Click <b>🔑</b> to mark a Primary Key. Click <b>×</b> on an edge to delete it.</span>
          </div>

          <div style={{ height: "620px" }}>
            <BundleERDiagram
              tables={tables as any}
              businessRules={businessRules as any}
              onChangeTables={(updated) =>
                setTables(updated.map(({ sortOrder: _so, ...rest }) => rest as Omit<BundleTable, "sortOrder">))
              }
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(3)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              disabled={saveMutation.isPending || !canProceed1 || !canProceed2}
              onClick={() => saveMutation.mutate({ custodianName, description, tables, businessRules })}
            >
              {saveMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                : <><Save className="w-4 h-4 mr-2" />Save Bundle Profile</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* ── Add Business Rule Dialog ── */}
      {addRuleOpen && (
        <AddRuleDialog
          tables={tables}
          onAdd={rule => { setBusinessRules(prev => [...prev, rule]); setAddRuleOpen(false); }}
          onClose={() => setAddRuleOpen(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Add Table Dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={addTableOpen} onOpenChange={setAddTableOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Table2 className="w-4 h-4 text-violet-500" /> Add Table Schema
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Table Name <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. upload_position"
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input
                  placeholder="Optional short description"
                  value={newTableDesc}
                  onChange={e => setNewTableDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Schema JSON <span className="text-red-500">*</span></Label>
              <p className="text-xs text-muted-foreground">
                Paste the <code className="bg-muted px-1 rounded">InferredSchema</code> JSON
                (the same format produced by the "From Sample File" tab or the Export Schema JSON button).
              </p>
              <Textarea
                placeholder={'{\n  "format": "csv",\n  "delimiter": ",",\n  "linesPerRecord": 1,\n  "sampleRecordCount": 100,\n  "columns": [ ... ]\n}'}
                value={newTableJson}
                onChange={e => { setNewTableJson(e.target.value); setJsonError(""); }}
                rows={12}
                className="font-mono text-xs resize-none"
              />
              {jsonError && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {jsonError}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => { setAddTableOpen(false); setJsonError(""); }}>
              Cancel
            </Button>
            <Button
              className="bg-violet-600 hover:bg-violet-700 text-white"
              onClick={confirmAddTable}
              disabled={!newTableName.trim() || !newTableJson.trim()}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Add Business Rule Dialog (Sprint 4) ─────────────────────────────────────

function AddRuleDialog({
  tables,
  onAdd,
  onClose,
}: {
  tables: Omit<BundleTable, "sortOrder">[];
  onAdd:  (rule: BusinessRule) => void;
  onClose: () => void;
}) {
  const [posTableId,  setPosTableId]  = useState(tables[0]?.tableId ?? "");
  const [txnTableId,  setTxnTableId]  = useState(tables[1]?.tableId ?? "");
  const [posKeyCol,   setPosKeyCol]   = useState("account_id");
  const [txnKeyCol,   setTxnKeyCol]   = useState("account_id");
  const [description, setDescription] = useState("");

  // Calculations rows
  const [calcs, setCalcs] = useState<PositionRecalcCalc[]>([
    { positionCol: "units",  transCol: "trans_units",  typeCol: "trans_type", buyValue: "BUY", sellValue: "SELL" },
    { positionCol: "total",  transCol: "trans_total",  typeCol: "trans_type", buyValue: "BUY", sellValue: "SELL" },
  ]);

  const updateCalc = (i: number, key: keyof PositionRecalcCalc, val: string) =>
    setCalcs(prev => prev.map((c, ci) => ci === i ? { ...c, [key]: val } : c));

  const addCalcRow = () =>
    setCalcs(prev => [...prev, { positionCol: "", transCol: "", typeCol: "trans_type", buyValue: "BUY", sellValue: "SELL" }]);

  const removeCalcRow = (i: number) =>
    setCalcs(prev => prev.filter((_, ci) => ci !== i));

  const canSave = posTableId && txnTableId && posTableId !== txnTableId
    && posKeyCol.trim() && txnKeyCol.trim()
    && calcs.length > 0 && calcs.every(c => c.positionCol && c.transCol && c.typeCol && c.buyValue && c.sellValue);

  function handleSave() {
    const rule: PositionRecalcRule = {
      ruleId:             `rule_${Date.now()}`,
      type:               "position_recalc",
      description:        description.trim() || undefined,
      positionTableId:    posTableId,
      transactionTableId: txnTableId,
      positionKeyCol:     posKeyCol.trim(),
      transKeyCol:        txnKeyCol.trim(),
      calculations:       calcs.filter(c => c.positionCol && c.transCol),
    };
    onAdd(rule);
  }

  const tableOptions = tables.map(t => ({ value: t.tableId, label: t.tableName }));

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-500" />
            Add Position Recalculation Rule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* Description */}
          <div className="space-y-1">
            <Label className="text-xs">Description (optional)</Label>
            <Input
              placeholder="e.g. Net units from BUY/SELL transactions"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          {/* Table selection + join keys */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">Positions table <span className="text-red-500">*</span></Label>
              <Select value={posTableId} onValueChange={setPosTableId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select table…" />
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Join key UMP name e.g. account_id"
                value={posKeyCol}
                onChange={e => setPosKeyCol(e.target.value)}
                className="h-7 text-xs mt-1"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-medium">Transactions table <span className="text-red-500">*</span></Label>
              <Select value={txnTableId} onValueChange={setTxnTableId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select table…" />
                </SelectTrigger>
                <SelectContent>
                  {tableOptions.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Join key UMP name e.g. account_id"
                value={txnKeyCol}
                onChange={e => setTxnKeyCol(e.target.value)}
                className="h-7 text-xs mt-1"
              />
            </div>
          </div>

          {/* Calculations table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Calculations</Label>
              <button
                onClick={addCalcRow}
                className="text-[10px] text-violet-600 hover:text-violet-800 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> Add row
              </button>
            </div>
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-[10px]">
                <thead className="bg-muted">
                  <tr>
                    {["Position col", "Trans col", "Type col", "Buy value", "Sell value", ""].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {calcs.map((c, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                      {(["positionCol","transCol","typeCol","buyValue","sellValue"] as (keyof PositionRecalcCalc)[]).map(k => (
                        <td key={k} className="px-1 py-0.5">
                          <input
                            type="text"
                            value={c[k]}
                            onChange={e => updateCalc(i, k, e.target.value)}
                            className="w-full h-6 rounded border border-input bg-background px-1.5 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-violet-400"
                          />
                        </td>
                      ))}
                      <td className="px-1 py-0.5">
                        <button onClick={() => removeCalcRow(i)} className="text-muted-foreground hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">
              All column names are UMP names (field mappings are resolved automatically at generation time).
            </p>
          </div>

          {/* Preview formula */}
          {calcs.filter(c => c.positionCol).length > 0 && (
            <div className="bg-muted/50 rounded-md p-2 space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Formula preview:</p>
              {calcs.filter(c => c.positionCol).map((c, i) => (
                <p key={i} className="text-[10px] font-mono">
                  <span className="text-violet-700">{tables.find(t => t.tableId === posTableId)?.tableName ?? "positions"}.{c.positionCol}</span>
                  {" = "}SUM({c.transCol} WHERE {c.typeCol}=<span className="text-green-600">{c.buyValue}</span>)
                  {" − "}SUM({c.transCol} WHERE {c.typeCol}=<span className="text-red-600">{c.sellValue}</span>)
                  {" [grouped by "}{posKeyCol}{"]"}
                </p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={handleSave}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Add Rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Field Mapping Editor (Sprint 3) ─────────────────────────────────────────

/**
 * Compact inline editor for custodian ↔ UMP field name mappings.
 * Shown inside each table card in Step 2.
 */
function FieldMappingEditor({
  table,
  onChange,
  onAutoSuggest,
}: {
  table:         Omit<BundleTable, "sortOrder">;
  onChange:      (mappings: FieldMapping[]) => void;
  onAutoSuggest: () => void;
}) {
  const cols     = table.schema.columns;
  const mappings = table.fieldMappings ?? [];

  const getMapping = (umpField: string) =>
    mappings.find(m => m.umpField.toLowerCase() === umpField.toLowerCase());

  const setMapping = (umpField: string, custodianField: string) => {
    const rest = mappings.filter(m => m.umpField.toLowerCase() !== umpField.toLowerCase());
    if (custodianField.trim()) {
      onChange([...rest, { umpField, custodianField: custodianField.trim() }]);
    } else {
      onChange(rest);  // blank → remove mapping
    }
  };

  const hasSuggestions = cols.some(c => COMMON_ALIASES[c.displayName.toLowerCase()]);
  const mappedCount    = mappings.filter(m => m.custodianField.trim()).length;

  return (
    <div className="mt-2 border-t pt-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Field Mappings
          {mappedCount > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[9px]">
              {mappedCount} mapped
            </span>
          )}
        </span>
        {hasSuggestions && (
          <button
            onClick={onAutoSuggest}
            className="text-[10px] text-violet-600 hover:text-violet-800 underline underline-offset-2"
          >
            Auto-suggest
          </button>
        )}
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-1 gap-y-1 items-center text-[10px]">
        <span className="font-medium text-muted-foreground">UMP field</span>
        <span />
        <span className="font-medium text-muted-foreground">Custodian alias</span>
        {cols.map(c => {
          const existing = getMapping(c.displayName);
          return (
            <>
              <span key={`ump-${c.id}`} className="font-mono truncate" title={c.displayName}>
                {c.displayName}
              </span>
              <ArrowRight key={`arr-${c.id}`} className="w-3 h-3 text-muted-foreground mx-0.5" />
              <input
                key={`inp-${c.id}`}
                type="text"
                placeholder={COMMON_ALIASES[c.displayName.toLowerCase()] ?? "e.g. ACCT_NBR"}
                value={existing?.custodianField ?? ""}
                onChange={e => setMapping(c.displayName, e.target.value)}
                className="h-6 w-full rounded border border-input bg-background px-1.5 text-[10px] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bundle Profile List ──────────────────────────────────────────────────────

/** Read-only list of all saved bundle profiles with open/delete actions. */
export function BundleProfileList({ onEdit }: { onEdit: (id: string) => void }) {
  const { toast } = useToast();
  const [generateTarget, setGenerateTarget] = useState<CustodianBundleProfile | null>(null);

  const { data, isLoading } = useQuery<{ success: boolean; profiles: CustodianBundleProfile[] }>({
    queryKey: ["/api/synthetic-data/bundle-profiles"],
    queryFn: () => fetch("/api/synthetic-data/bundle-profiles").then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/synthetic-data/bundle-profiles/${id}`, { method: "DELETE" });
      return r.json();
    },
    onSuccess: (d, id) => {
      if (!d.success) { toast({ title: "Delete failed", description: d.error, variant: "destructive" }); return; }
      toast({ title: "Bundle profile deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/synthetic-data/bundle-profiles"] });
    },
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-8 text-muted-foreground">
      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading profiles…
    </div>
  );

  const profiles = data?.profiles ?? [];

  if (profiles.length === 0) return (
    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
      <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm font-medium">No bundle profiles yet</p>
      <p className="text-xs mt-1">Create one using the builder above</p>
    </div>
  );

  return (
    <>
    {generateTarget && (
      <BundleGenerateModal
        profile={generateTarget}
        onClose={() => setGenerateTarget(null)}
      />
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {profiles.map(p => {
        const maxLevel   = p.tables.reduce((m, t) => Math.max(m, t.sortOrder), 0);
        const totalCols  = p.tables.reduce((s, t) => s + t.schema.columns.length, 0);
        const totalFKs   = p.tables.reduce((s, t) => s + t.foreignKeys.length, 0);
        const totalMaps  = p.tables.reduce((s, t) => s + (t.fieldMappings?.length ?? 0), 0);
        return (
          <Card key={p.id} className="border-violet-200 hover:border-violet-400 transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-violet-500" />
                  {p.custodianName}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 px-2 text-xs text-violet-600 hover:text-violet-800 hover:bg-violet-50"
                    onClick={() => setGenerateTarget(p)}
                    title="Generate bundle data"
                  >
                    <Zap className="w-3.5 h-3.5 mr-1" /> Generate
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(p.id)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="sm" className="h-7 w-7 p-0 hover:text-red-500"
                    onClick={() => deleteMutation.mutate(p.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {p.description && <CardDescription className="text-xs">{p.description}</CardDescription>}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <Badge variant="outline" className="text-xs">
                  <Table2 className="w-3 h-3 mr-1" />{p.tables.length} tables
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {totalCols} columns
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Link2 className="w-3 h-3 mr-1" />{totalFKs} FKs
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {maxLevel + 1} dep level{maxLevel > 0 ? "s" : ""}
                </Badge>
                {totalMaps > 0 && (
                  <Badge variant="outline" className="text-xs border-violet-300 text-violet-700">
                    {totalMaps} field maps
                  </Badge>
                )}
              </div>
              {/* Table pills */}
              <div className="flex flex-wrap gap-1">
                {p.tables
                  .slice()
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map(t => (
                    <span
                      key={t.tableId}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${levelColor(t.sortOrder)}`}
                    >
                      {t.tableName}
                    </span>
                  ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Updated {new Date(p.updatedAt).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
    </>
  );
}

// ─── Bundle Generate Modal ────────────────────────────────────────────────────

function BundleGenerateModal({
  profile,
  onClose,
}: {
  profile: CustodianBundleProfile;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [rowCount, setRowCount] = useState(100);
  const [result, setResult] = useState<BundleGenResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const resp = await fetch(`/api/synthetic-data/bundle-profiles/${profile.id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rowCount }),
      });
      const json = await resp.json();
      if (!json.success) throw new Error(json.error ?? "Generation failed");
      setResult(json.result as BundleGenResult);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-violet-500" />
            Generate Bundle — {profile.custodianName}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          /* ── Row-count form ── */
          <div className="space-y-5 py-2">
            <p className="text-sm text-muted-foreground">
              Generates <strong>{profile.tables.length} table{profile.tables.length !== 1 ? "s" : ""}</strong> in
              dependency order. Child table FK columns will only use values that appear in
              their parent tables.
            </p>

            {/* Dependency order preview */}
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Generation order:</p>
              <div className="flex flex-wrap gap-2">
                {[...profile.tables]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((t, i) => (
                    <div key={t.tableId} className="flex items-center gap-1">
                      {i > 0 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${levelColor(t.sortOrder)}`}>
                        {t.tableName}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rowCount" className="text-sm">Rows per table</Label>
                <input
                  id="rowCount"
                  type="number"
                  min={1} max={5000}
                  value={rowCount}
                  onChange={e => setRowCount(Math.min(5000, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-32 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><Zap className="w-4 h-4 mr-2" /> Generate</>}
              </Button>
            </div>
          </div>
        ) : (
          /* ── Results view ── */
          <BundleGenerateResults result={result} onReset={() => setResult(null)} />
        )}

        {!result && (
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Bundle Generate Results ──────────────────────────────────────────────────

const PREVIEW_ROWS = 50; // max rows shown in the table grid

function BundleGenerateResults({
  result,
  onReset,
}: {
  result: BundleGenResult;
  onReset: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);

  function downloadCSV(t: TableGenResult) {
    const headerLine = t.headers.join(",");
    const dataLines  = t.rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(","));
    const csv        = [headerLine, ...dataLines].join("\n");
    const blob       = new Blob([csv], { type: "text/csv" });
    const url        = URL.createObjectURL(blob);
    const a          = document.createElement("a");
    a.href           = url;
    a.download       = `${result.custodianName}_${t.tableName}_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadAllCSV() {
    result.tables.forEach(t => downloadCSV(t));
  }

  const activeTable = result.tables[activeTab];

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {result.tables.map((t, i) => (
            <button
              key={t.tableId}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                i === activeTab
                  ? "bg-violet-100 border-violet-400 text-violet-800"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.tableName}
              <span className="ml-1.5 text-[10px] opacity-70">{t.rowCount} rows</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset} className="text-xs">
            ← New generation
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadCSV(activeTable)} className="text-xs">
            <Download className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button size="sm" onClick={downloadAllCSV} className="text-xs bg-violet-600 hover:bg-violet-700 text-white">
            <Download className="w-3.5 h-3.5 mr-1" /> All tables
          </Button>
        </div>
      </div>

      {/* FK relationship note for child tables */}
      {activeTable && (() => {
        const tableInProfile = result.tables.find(t => t.tableId === activeTable.tableId);
        return null; // FK info comes from profile, not result — just show table
      })()}

      {/* Data grid */}
      {activeTable && (
        <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
          <ScrollArea className="h-[420px]">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-muted z-10">
                <tr>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-r w-8">#</th>
                  {activeTable.headers.map((h, hi) => (
                    <th key={hi} className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-r whitespace-nowrap max-w-[160px] truncate">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeTable.rows.slice(0, PREVIEW_ROWS).map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                    <td className="px-2 py-1 text-muted-foreground border-r font-mono">{ri + 1}</td>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 font-mono border-r max-w-[160px] truncate" title={cell}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {activeTable.rows.length > PREVIEW_ROWS && (
              <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
                Showing {PREVIEW_ROWS} of {activeTable.rows.length} rows — download CSV for full dataset
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Generated {new Date(result.generatedAt).toLocaleString()} · {result.tables.reduce((s, t) => s + t.rowCount, 0)} total rows across {result.tables.length} tables
      </p>
    </div>
  );
}
