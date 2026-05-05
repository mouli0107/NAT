/**
 * SampleFileUploadMode — Schema-first synthetic data generator
 *
 * Features implemented (May 2026):
 *  1. Editable schema — inline edit field name, type, regex
 *  2. Regex per column — custom pattern drives generation
 *  3. Auto-suggested regexes — populated on upload from detected type
 *  4. Upload schema JSON — paste or upload .json instead of a data file
 *  5. Regex help + "Try It" — preview 8 samples from any pattern
 *  6. Common column markers — pin fields shared across all custodians
 *  7. Wide horizontal UI — full-width table editor for Step 2
 */

import { useState, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Upload, FileText, Database, Download, Sparkles,
  CheckCircle2, AlertTriangle, ShieldAlert, Loader2,
  ChevronRight, FileSpreadsheet, RefreshCw, Info,
  FlaskConical, Star, Search, Pencil, Code2, FileJson,
  HelpCircle, Lock, Unlock, Eye, X, Plus, Bot,
} from "lucide-react";
import { AgentOrchestrationView } from "./AgentOrchestrationView";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FieldSchema {
  id: string;
  displayName: string;
  lineIndex: number;
  position: number;
  sqlType: string;
  detectedType: string;
  isPII: boolean;
  sampleValue: string;
  populatedCount: number;
  totalSampleCount: number;
  isLiteral: boolean;
  literalValue?: string;
  pool?: string[];
  maxObservedLength: number;
  customRegex?: string;
  isCommon?: boolean;
}

interface InferredSchema {
  format: string;
  delimiter: string;
  linesPerRecord: number;
  recordBoundaryPrefix?: string;
  sampleRecordCount: number;
  columns: FieldSchema[];
}

interface GenerateResult {
  data: string;
  manifest: string;
  recordCount: number;
  breakdown: { positive: number; edge: number; negative: number };
}

type Step = "upload" | "agent" | "schema" | "generate" | "done";

// ─── Constants ─────────────────────────────────────────────────────────────────

const ALL_FIELD_TYPES = [
  "account_id","ssn","phone","date_mmddyy","state_code","country_code",
  "amount","integer","name","address","city","literal","code_pool",
  "timestamp","text","always_empty",
] as const;

const TYPE_HELP: Record<string, string> = {
  account_id:   "8-digit numeric account identifier → VARCHAR(8)",
  ssn:          "9-digit SSN / Tax ID (PII) → VARCHAR(9)",
  phone:        "10-digit US phone number (PII) → VARCHAR(10)",
  date_mmddyy:  "Date in MMDDYY format, 6 digits → VARCHAR(6)",
  state_code:   "2-letter US state code → CHAR(2)",
  country_code: "2-letter ISO country code → CHAR(2)",
  amount:       "Decimal monetary amount → DECIMAL(15,5)",
  integer:      "Small integer / sequence number → INTEGER",
  name:         "Person or company name (PII) → VARCHAR(80)",
  address:      "Street address (PII) → VARCHAR(120)",
  city:         "City name → VARCHAR(60)",
  literal:      "Constant — same value on every record → VARCHAR",
  code_pool:    "Picks randomly from the observed set of values → VARCHAR",
  timestamp:    "Date/time string → VARCHAR(30)",
  text:         "Generic text value → VARCHAR",
  always_empty: "No data found in ANY sampled record — always generated as blank. If some rows have data and others don't, the field uses a real type with sparse-fill (blank ~ (100-fill)% of the time).",
};

/** Map generator type → SQL DDL type string */
function getSqlType(type: string, maxLen: number): string {
  switch (type) {
    case "account_id":   return "VARCHAR(8)";
    case "ssn":          return "VARCHAR(9)";
    case "phone":        return "VARCHAR(10)";
    case "date_mmddyy":  return "VARCHAR(6)";
    case "state_code":
    case "country_code": return "CHAR(2)";
    case "amount":       return "DECIMAL(15,5)";
    case "integer":      return "INTEGER";
    case "timestamp":    return "VARCHAR(30)";
    case "name":         return `VARCHAR(${Math.min(Math.max(maxLen + 10, 50), 150)})`;
    case "address":      return `VARCHAR(${Math.min(Math.max(maxLen + 10, 80), 200)})`;
    case "city":         return `VARCHAR(${Math.min(Math.max(maxLen + 10, 40), 80)})`;
    case "always_empty": return "VARCHAR(50)";
    case "literal":      return `VARCHAR(${Math.max(maxLen, 1)})`;
    case "code_pool":    return `VARCHAR(${Math.max(maxLen, 4)})`;
    default:             return `VARCHAR(${Math.min(Math.max(maxLen + 10, 50), 255)})`;
  }
}

const REGEX_SYNTAX_HELP = `Pattern syntax quick reference:
  [0-9]{8}        8 random digits
  [A-Z]{2}        2 uppercase letters
  [A-Za-z0-9]+    1 or more alphanumeric chars
  (AL|CA|TX|NY)   pick one of the listed values
  [0-9]{2,6}      2 to 6 digits
  \\d{4}           4 digits  (\\d = digit shorthand)
  [A-Z][a-z]{3,8} one uppercase then 3-8 lowercase
  .{5}            any 5 characters
  `;

// ─── Helpers ───────────────────────────────────────────────────────────────────

function escRe(v: string) {
  return v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Auto-suggest a regex pattern from the detected field type */
// Name-based semantic lookup — mirrors agent-orchestrator SEMANTIC_NAME_RULES.
// Used as a fallback when the value-inferred type misses the mark.
// Mirrors SEMANTIC_NAME_RULES in agent-orchestrator — keeps client in sync.
// Uses same pattern style so "phone_number" and "zip_code_2" match correctly.
function semanticRegexFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (/zip|zipcd|postal|postcode/.test(n))                             return "[0-9]{5}(-[0-9]{4})?";
  if (/(^|_)ssn(_|$)|tax_id|taxid|(^|_)tin(_|$)|national_id/.test(n)) return "[0-9]{9}";
  if (/phone|_tel_|_tel$|^tel_|_fax_|mobile|cell_phone/.test(n))       return "[2-9][0-9]{2}[2-9][0-9]{6}";
  if (/email|e_mail/.test(n))                                           return "[a-z]{4,10}[0-9]{2,3}@(gmail|yahoo|outlook|company)\\.com";
  if (/acct_num|account_num|acct_no|account_no|acct_id/.test(n))       return "[0-9]{8}";
  if (/_date$|_date_|^date_|_dt$|_dt_|^dt_|(^|_)dob(_|$)|birth_date/.test(n)) return "(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{2}";
  if (/state_cd|state_code|_st_cd|_st_code/.test(n))                   return "(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)";
  if (/country_cd|country_code|cntry_cd/.test(n))                       return "(US|CA|GB|AU|DE|FR|IT|JP|MX|BR|IN|CN|SG|ZA)";
  if (/_amt$|_amt_|^amt_|(^|_)amount(_|$)|(^|_)balance(_|$)|premium|pay_amt/.test(n)) return "[0-9]{1,6}\\.[0-9]{4}";
  return null;
}

function getDefaultRegex(col: FieldSchema): string {
  // 1. Name-based override for clearly-identifiable fields (highest priority)
  //    Fires when value inference gave a generic/wrong type (code_pool, text, unknown)
  const genericTypes = new Set(["code_pool", "text", "integer", "unknown", "literal"]);
  if (genericTypes.has(col.detectedType)) {
    const nameRegex = semanticRegexFromName(col.displayName || "");
    if (nameRegex) return nameRegex;
  }

  // 2. Type-based patterns
  switch (col.detectedType) {
    case "account_id":   return "[0-9]{8}";
    case "ssn":          return "[0-9]{9}";
    case "phone":        return "[2-9][0-9]{2}[2-9][0-9]{6}";
    case "zip_code":     return "[0-9]{5}(-[0-9]{4})?";
    case "email":        return "[a-z]{4,10}[0-9]{2,3}@(gmail|yahoo|outlook|company)\\.com";
    case "date_mmddyy":  return "(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{2}";
    case "state_code":   return "(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)";
    case "country_code": return "(US|CA|GB|AU|DE|FR|IT|JP|MX|BR)";
    case "amount":       return "[0-9]{1,6}\\.[0-9]{4}";
    case "integer":      return "[0-9]{1,5}";
    case "name":         return "[A-Z][A-Z]{2,8} [A-Z][A-Z]{2,9}";
    case "address":      return "[0-9]{3,4} [A-Z][A-Z]{3,8} (ST|AVE|DR|RD|BLVD)";
    case "city":         return "[A-Z][A-Z]{3,9}(VILLE|FIELD|TOWN|PORT)?";
    case "timestamp":    return "[0-9]{1,2}/[0-9]{1,2}/20[2-3][0-9] [0-9]{1,2}:[0-5][0-9]:[0-5][0-9] (AM|PM)";
    case "text":         return "[A-Z][A-Z]{3,10}";
    case "literal":      return col.literalValue ? escRe(col.literalValue) : "";
    case "code_pool":
      return col.pool && col.pool.length > 0
        ? `(${col.pool.slice(0, 15).map(escRe).join("|")})`
        : "";
    default:             return "";
  }
}

/** Client-side regex sampler (mirrors server sampleFromPattern) */
function sampleFromPattern(p: string, depth = 0): string {
  if (!p || !p.trim() || depth > 5) return "";
  let out = "";
  let i = 0;
  const rnd = (mn: number, mx: number) => mn + Math.floor(Math.random() * (mx - mn + 1));
  const rf   = (s: string) => s[Math.floor(Math.random() * s.length)] ?? "";

  function quant(): { n: number; skip: number } {
    if (i >= p.length) return { n: 1, skip: 0 };
    if (p[i] === "?") return { n: rnd(0, 1), skip: 1 };
    if (p[i] === "+") return { n: rnd(1, 8),  skip: 1 };
    if (p[i] === "*") return { n: rnd(0, 6),  skip: 1 };
    if (p[i] === "{") {
      const end = p.indexOf("}", i);
      if (end < 0) return { n: 1, skip: 0 };
      const pts = p.slice(i + 1, end).split(",");
      const mn = parseInt(pts[0]) || 1;
      const mx = pts[1] !== undefined ? (parseInt(pts[1]) || mn) : mn;
      return { n: rnd(mn, mx), skip: end - i + 1 };
    }
    return { n: 1, skip: 0 };
  }
  function closeG(from: number): number {
    let d = 1, j = from + 1;
    while (j < p.length && d > 0) { if (p[j] === "(") d++; else if (p[j] === ")") d--; j++; }
    return j - 1;
  }
  function expCls(cls: string): string {
    let s = ""; let j = 0;
    while (j < cls.length) {
      if (j + 2 < cls.length && cls[j + 1] === "-") {
        for (let c = cls.charCodeAt(j); c <= cls.charCodeAt(j + 2); c++) s += String.fromCharCode(c);
        j += 3;
      } else s += cls[j++];
    }
    return s || "?";
  }

  while (i < p.length) {
    const ch = p[i];
    if (ch === "^" || ch === "$") { i++; continue; }
    if (ch === "\\") {
      const esc = p[i + 1] || ""; i += 2;
      const { n, skip } = quant(); i += skip;
      const pool = esc === "d" ? "0123456789" : esc === "w" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" : esc === "s" ? " " : esc;
      for (let k = 0; k < n; k++) out += rf(pool);
      continue;
    }
    if (ch === "[") {
      const j = p.indexOf("]", i + 1); if (j < 0) { out += ch; i++; continue; }
      const chars = expCls(p.slice(i + 1, j)); i = j + 1;
      const { n, skip } = quant(); i += skip;
      for (let k = 0; k < n; k++) out += rf(chars);
      continue;
    }
    if (ch === "(") {
      const j = closeG(i); const inner = p.slice(i + 1, j);
      const alts: string[] = []; let d2 = 0, st = 0;
      for (let k = 0; k < inner.length; k++) {
        if (inner[k] === "(") d2++; else if (inner[k] === ")") d2--;
        else if (inner[k] === "|" && d2 === 0) { alts.push(inner.slice(st, k)); st = k + 1; }
      }
      alts.push(inner.slice(st)); i = j + 1;
      const { n, skip } = quant(); i += skip;
      for (let k = 0; k < n; k++) out += sampleFromPattern(alts[Math.floor(Math.random() * alts.length)], depth + 1);
      continue;
    }
    if (ch === ".") {
      i++; const { n, skip } = quant(); i += skip;
      const pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      for (let k = 0; k < n; k++) out += pool[Math.floor(Math.random() * pool.length)];
      continue;
    }
    i++; const { n, skip } = quant(); i += skip;
    for (let k = 0; k < n; k++) out += ch;
  }
  return out;
}

function generateSamples(regex: string, count = 8): string[] {
  const samples: string[] = [];
  for (let i = 0; i < count; i++) {
    try { const s = sampleFromPattern(regex); samples.push(s || "(empty)"); }
    catch { samples.push("(invalid)"); break; }
  }
  return samples;
}

function typeColor(type: string): string {
  if (["ssn", "phone", "account_id", "name", "address", "city"].includes(type))
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400";
  if (["date_mmddyy", "timestamp"].includes(type))
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400";
  if (["state_code", "country_code"].includes(type))
    return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400";
  if (["literal", "always_empty"].includes(type))
    return "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400";
  if (["amount", "integer"].includes(type))
    return "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400";
  return "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400";
}

function downloadFile(content: string, filename: string, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function SampleFileUploadMode() {
  const { toast } = useToast();
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const schemaInputRef  = useRef<HTMLInputElement>(null);

  // Wizard step
  const [step, setStep]                 = useState<Step>("upload");
  const [isDragging, setIsDragging]     = useState(false);
  const [isInferring, setIsInferring]   = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Agent orchestration
  const [agentFileId, setAgentFileId]   = useState<string>("");

  // Source data
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [schema, setSchema]                     = useState<InferredSchema | null>(null);
  const [sqlSchema, setSqlSchema]               = useState("");

  // ── Schema editor state ──
  // These maps hold user overrides keyed by column id
  const [nameMap,   setNameMap]   = useState<Map<string, string>>(new Map());
  const [typeMap,   setTypeMap]   = useState<Map<string, string>>(new Map());
  const [regexMap,  setRegexMap]  = useState<Map<string, string>>(new Map());
  const [commonSet, setCommonSet] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  // Table controls
  const [searchQ,        setSearchQ]        = useState("");
  const [filterType,     setFilterType]     = useState("all");
  const [showCommonOnly, setShowCommonOnly] = useState(false);
  const [tryItOpen,      setTryItOpen]      = useState<string | null>(null);
  const [tryItSamples,   setTryItSamples]   = useState<string[]>([]);
  const [schemaJsonText, setSchemaJsonText] = useState("");

  // Stable preview values — computed ONCE when schema/regex loads,
  // never re-randomised by re-renders (fixes "preview jitter on generate")
  const [previewMap, setPreviewMap] = useState<Map<string, string>>(new Map());

  // Generate
  const [recordCount,     setRecordCount]     = useState(1000);
  const [includeManifest, setIncludeManifest] = useState(true);
  const [generateResult,  setGenerateResult]  = useState<GenerateResult | null>(null);
  const [progress,        setProgress]        = useState(0);

  // ── Build effective schema (merges user edits back into schema) ──────────────
  const effectiveSchema = useMemo((): InferredSchema | null => {
    if (!schema) return null;
    return {
      ...schema,
      columns: schema.columns
        .filter(c => !deletedIds.has(c.id))
        .map(c => ({
          ...c,
          displayName:  nameMap.get(c.id)  ?? c.displayName,
          detectedType: (typeMap.get(c.id) ?? c.detectedType) as any,
          customRegex:  regexMap.get(c.id) ?? c.customRegex,
          isCommon:     commonSet.has(c.id),
        })),
    };
  }, [schema, nameMap, typeMap, regexMap, commonSet, deletedIds]);

  // ── Visible columns (filtered) ───────────────────────────────────────────────
  const visibleColumns = useMemo(() => {
    if (!effectiveSchema) return [];
    return effectiveSchema.columns.filter(col => {
      if (showCommonOnly && !commonSet.has(col.id)) return false;
      if (filterType !== "all" && col.detectedType !== filterType) return false;
      const q = searchQ.toLowerCase();
      if (q && !col.displayName.toLowerCase().includes(q) && !col.detectedType.includes(q)) return false;
      return true;
    });
  }, [effectiveSchema, showCommonOnly, filterType, searchQ, commonSet]);

  // ── Auto-populate regexes when schema first loads ────────────────────────────
  function initRegexMap(cols: FieldSchema[]) {
    const m  = new Map<string, string>();
    const pm = new Map<string, string>();
    for (const col of cols) {
      const rx = getDefaultRegex(col);
      m.set(col.id, rx);
      // Generate one stable preview value per column — never re-randomised by re-renders
      pm.set(col.id, rx ? sampleFromPattern(rx) : (col.sampleValue || "—"));
    }
    setRegexMap(m);
    setPreviewMap(pm);
    setNameMap(new Map());
    setTypeMap(new Map());
    setCommonSet(new Set());
    setDeletedIds(new Set());
  }

  // ── Agent orchestration callbacks ───────────────────────────────────────────
  const onAgentComplete = useCallback((agentSchema: InferredSchema, agentRegexMap: Record<string, string>) => {
    setSchema(agentSchema);
    setSqlSchema("");
    setNameMap(new Map());
    setTypeMap(new Map());
    setCommonSet(new Set());
    setDeletedIds(new Set());
    // Build regex map + stable preview map in one pass
    const merged  = new Map<string, string>();
    const preview = new Map<string, string>();
    for (const col of agentSchema.columns) {
      const rx = agentRegexMap[col.id] ?? getDefaultRegex(col);
      merged.set(col.id, rx);
      preview.set(col.id, rx ? sampleFromPattern(rx) : (col.sampleValue || "—"));
    }
    setRegexMap(merged);
    setPreviewMap(preview);
    setStep("schema");
    toast({ title: "Schema ready", description: `${agentSchema.columns.length} columns analysed · ${Object.keys(agentRegexMap).length} patterns generated` });
  }, [toast]);

  const onAgentError = useCallback((msg: string) => {
    toast({ title: "Agent error", description: msg, variant: "destructive" });
    setStep("upload");
  }, [toast]);

  // ── Upload handlers ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    const allowed = ["txt", "csv", "xlsx", "xls"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.includes(ext)) {
      toast({ title: "Unsupported file type", description: "Please upload .txt .csv .xlsx or .xls", variant: "destructive" });
      return;
    }
    setUploadedFilename(file.name);
    setIsInferring(true);
    try {
      // Phase 1: upload file to server — returns a fileId for the SSE stream
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/synthetic-data/upload-for-agent", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");
      setAgentFileId(json.fileId);
      setStep("agent");
      // Phase 2 (SSE) is handled by AgentOrchestrationView after setStep("agent")
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setStep("upload");
    } finally {
      setIsInferring(false);
    }
  }, [toast]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) handleFile(file);
  };

  // Feature #4: upload / paste schema JSON directly
  const loadSchemaJson = (text: string) => {
    try {
      const parsed = JSON.parse(text) as InferredSchema;
      if (!parsed.columns || !Array.isArray(parsed.columns)) throw new Error("Missing 'columns' array");
      setSchema(parsed);
      setSqlSchema("");
      setUploadedFilename("(imported schema)");
      initRegexMap(parsed.columns);
      setStep("schema");
      toast({ title: "Schema loaded", description: `${parsed.columns.length} fields imported from JSON` });
    } catch (err: any) {
      toast({ title: "Invalid schema JSON", description: err.message, variant: "destructive" });
    }
  };

  const onSchemaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => loadSchemaJson(ev.target?.result as string);
    reader.readAsText(file);
  };

  // ── Schema editor mutations ──────────────────────────────────────────────────
  const setName  = (id: string, v: string) => setNameMap(m  => { const n = new Map(m); n.set(id, v); return n; });
  const setType  = (id: string, v: string) => {
    setTypeMap(m => { const n = new Map(m); n.set(id, v); return n; });
    // Auto-update regex when type changes and refresh the stable preview
    const col = schema?.columns.find(c => c.id === id);
    if (col) {
      const fakeCol = { ...col, detectedType: v };
      const newRegex = getDefaultRegex(fakeCol as FieldSchema);
      setRegexMap(m => { const n = new Map(m); n.set(id, newRegex); return n; });
      setPreviewMap(pm => {
        const n = new Map(pm);
        n.set(id, newRegex ? sampleFromPattern(newRegex) : "—");
        return n;
      });
    }
  };
  const setRegex = (id: string, v: string) => {
    setRegexMap(m => { const n = new Map(m); n.set(id, v); return n; });
    // Re-generate the stable preview for this one column when its regex changes
    setPreviewMap(pm => {
      const n = new Map(pm);
      n.set(id, v ? sampleFromPattern(v) : "—");
      return n;
    });
  };
  const toggleCommon = (id: string) => setCommonSet(s => {
    const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const deleteCol = (id: string) => setDeletedIds(s => new Set([...Array.from(s), id]));

  // Feature #5: Try It — generate samples client-side from regex
  const handleTryIt = (id: string) => {
    if (tryItOpen === id) { setTryItOpen(null); return; }
    const regex = regexMap.get(id) ?? "";
    if (!regex) { toast({ title: "No pattern set", description: "Enter a regex pattern first", variant: "destructive" }); return; }
    setTryItSamples(generateSamples(regex, 8));
    setTryItOpen(id);
  };

  // ── Generate ─────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!effectiveSchema) return;
    setIsGenerating(true); setProgress(0); setGenerateResult(null);
    const timer = setInterval(() => setProgress(p => Math.min(p + 2, 90)), 100);
    try {
      const res  = await fetch("/api/synthetic-data/generate-from-schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: effectiveSchema, recordCount, includeManifest }),
      });
      const json = await res.json();
      clearInterval(timer); setProgress(100);
      if (!json.success) throw new Error(json.error || "Generation failed");
      setGenerateResult(json.result as GenerateResult);
      setStep("done");
      toast({ title: "Generation complete", description: `${json.result.recordCount.toLocaleString()} records generated` });
      // Save to history (non-blocking)
      fetch("/api/synthetic-data/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadedFilename,
          schema: effectiveSchema,
          config: { recordCount, includeManifest },
          result: json.result,
        }),
      }).catch(() => {}); // silently ignore errors
    } catch (err: any) {
      clearInterval(timer);
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Downloads ────────────────────────────────────────────────────────────────
  const downloadSchema    = () => downloadFile(sqlSchema || JSON.stringify(effectiveSchema, null, 2), `${uploadedFilename.replace(/\.[^.]+$/, "")}_schema.sql`);
  const downloadSchemaJson= () => downloadFile(JSON.stringify(effectiveSchema, null, 2), `${uploadedFilename.replace(/\.[^.]+$/, "")}_schema.json`, "application/json");
  const downloadTestData  = () => {
    if (!generateResult) return;
    const base = uploadedFilename.replace(/\.[^.]+$/, "");
    const ext  = schema?.format === "excel" ? "csv" : (uploadedFilename.split(".").pop() || "txt");
    downloadFile(generateResult.data, `${base}_synthetic.${ext}`);
  };
  const downloadManifest  = () => {
    if (!generateResult?.manifest) return;
    downloadFile(generateResult.manifest, `${uploadedFilename.replace(/\.[^.]+$/, "")}_manifest.csv`, "text/csv");
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const piiCount    = schema?.columns.filter(c => c.isPII).length || 0;
  const commonCount = commonSet.size;
  const editedCount = nameMap.size + typeMap.size + regexMap.size;
  const allTypes    = useMemo(() =>
    Array.from(new Set((schema?.columns ?? []).map(c => c.detectedType))).sort(),
    [schema]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* ── Step breadcrumb ── */}
        <div className="flex items-center gap-2 text-sm flex-wrap">
          {(["upload","agent","schema","generate","done"] as Step[]).map((s, i) => {
            const labels: Record<Step, string> = {
              upload:   "Upload",
              agent:    "Agent Analysis",
              schema:   "Edit Schema",
              generate: "Generate",
              done:     "Download",
            };
            const order = ["upload","agent","schema","generate","done"];
            const done   = order.indexOf(step) > order.indexOf(s);
            const active = step === s;
            return (
              <span key={s} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                <span className={`font-medium flex items-center gap-1 ${
                  active ? "text-violet-500" : done ? "text-green-600" : "text-muted-foreground"
                }`}>
                  {done && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {active && s === "agent" && <Bot className="w-3.5 h-3.5" />}
                  {labels[s]}
                </span>
              </span>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════
            STEP 1 — Upload  (compact when schema loaded)
            ══════════════════════════════════════════════ */}
        {step === "upload" && (
          <Tabs defaultValue="data" className="w-full">
            <TabsList className="mb-3">
              <TabsTrigger value="data" className="flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Upload Data File
              </TabsTrigger>
              {/* Feature #4 — Upload Schema JSON */}
              <TabsTrigger value="schema" className="flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5" /> Import Schema JSON
              </TabsTrigger>
            </TabsList>

            {/* Data file tab */}
            <TabsContent value="data">
              <Card>
                <CardContent className="p-6">
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all
                      ${isDragging ? "border-blue-500 bg-blue-50/50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50/50"}`}
                  >
                    {isInferring ? (
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-blue-500" />
                      </div>
                    )}
                    <div className="text-center">
                      <p className="font-semibold text-gray-700">{isInferring ? "Analysing file…" : "Drop your data file here"}</p>
                      <p className="text-xs text-muted-foreground mt-1">.txt · .csv · .xlsx · .xls · Up to 500 MB</p>
                    </div>
                    {!isInferring && <Button variant="outline" size="sm">Browse files</Button>}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".txt,.csv,.xlsx,.xls" className="hidden" onChange={onInputChange} />
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {["Pipe / comma / tab delimited auto-detected", "Multi-line records auto-grouped", "Up to 500 MB · only first 5 000 lines sampled"].map(t => (
                      <p key={t} className="text-xs text-muted-foreground flex items-start gap-1">
                        <Info className="w-3 h-3 mt-0.5 shrink-0" />{t}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Schema JSON tab — Feature #4 */}
            <TabsContent value="schema">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => schemaInputRef.current?.click()}>
                      <FileJson className="w-4 h-4 mr-2" /> Browse schema .json
                    </Button>
                    <span className="text-xs text-muted-foreground">or paste JSON below</span>
                  </div>
                  <input ref={schemaInputRef} type="file" accept=".json" className="hidden" onChange={onSchemaFileChange} />
                  <Textarea
                    className="font-mono text-xs h-52"
                    placeholder={'{\n  "format": "pipe_multiline",\n  "columns": [...]\n}'}
                    value={schemaJsonText}
                    onChange={e => setSchemaJsonText(e.target.value)}
                  />
                  <Button
                    size="sm"
                    disabled={!schemaJsonText.trim()}
                    onClick={() => loadSchemaJson(schemaJsonText)}
                  >
                    Load Schema
                  </Button>
                  <p className="text-xs text-muted-foreground flex items-start gap-1">
                    <Info className="w-3 h-3 mt-0.5 shrink-0" />
                    Paste an InferredSchema JSON (e.g. previously downloaded from this tool) to skip file upload.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 1.5 — Agent Orchestration Pipeline
            Live visual of the 5 agents parsing, structuring, regex-ing,
            validating, and generating a preview of the uploaded file.
            ══════════════════════════════════════════════════════════════════ */}
        {step === "agent" && agentFileId && (
          <AgentOrchestrationView
            fileId={agentFileId}
            filename={uploadedFilename}
            onComplete={onAgentComplete}
            onError={onAgentError}
          />
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP 2 — Full-width schema editor  (Feature #7: wide horizontal UI)
            ══════════════════════════════════════════════════════════════════ */}
        {(step === "schema" || step === "generate" || step === "done") && schema && !isInferring && (
          <Card className="border-violet-300 shadow-md w-full">
            {/* Header bar */}
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-violet-500" />
                  <CardTitle className="text-base">Step 2 · Edit Schema</CardTitle>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">{schema.sampleRecordCount} sample records</Badge>
                    <Badge variant="outline" className="text-xs">{(effectiveSchema?.columns.length ?? 0)} fields</Badge>
                    <Badge variant="outline" className="text-xs">{schema.linesPerRecord} lines/record</Badge>
                    {piiCount > 0 && <Badge className="text-xs bg-red-100 text-red-700 border-red-200">{piiCount} PII fields</Badge>}
                    {commonCount > 0 && <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200"><Star className="w-2.5 h-2.5 inline mr-0.5" />{commonCount} common</Badge>}
                    {editedCount > 0 && <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200"><Pencil className="w-2.5 h-2.5 inline mr-0.5" />{editedCount} edits</Badge>}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={downloadSchemaJson}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />Export JSON
                  </Button>
                  {sqlSchema && (
                    <Button variant="outline" size="sm" onClick={downloadSchema}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />SQL DDL
                    </Button>
                  )}
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => setStep("generate")}
                  >
                    Continue to Generate <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>

              {/* Filter / search bar */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-8 h-8 text-xs"
                    placeholder="Search fields…"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {allTypes.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant={showCommonOnly ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setShowCommonOnly(v => !v)}
                >
                  <Star className="w-3 h-3 mr-1" />{showCommonOnly ? "All fields" : "Common only"}
                </Button>
                <span className="text-xs text-muted-foreground ml-auto">
                  Showing {visibleColumns.length} of {effectiveSchema?.columns.length ?? 0}
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {/* Feature #7: Full-width horizontally scrollable table */}
              <div className="overflow-x-auto">
                <ScrollArea className="h-[520px]">
                  <table className="w-full text-xs border-collapse min-w-[900px]">
                    <thead className="bg-muted/60 sticky top-0 z-10">
                      <tr>
                        {/* Col: common star */}
                        <th className="p-2 w-8 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Star className="w-3.5 h-3.5 text-amber-500 mx-auto cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs">
                              <p className="font-semibold mb-1">Common column</p>
                              <p className="text-xs">Star a field to mark it as shared across all custodians. Common columns appear highlighted and can be locked from per-custodian edits.</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-2 text-left font-semibold text-muted-foreground w-6">#</th>
                        <th className="p-2 text-left font-semibold text-muted-foreground min-w-[180px]">Field Name</th>
                        {/* L/P = Line / Position locator for multi-line records */}
                        <th className="p-2 text-left font-semibold text-muted-foreground w-20">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">
                                Line·Pos
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              <p className="font-semibold mb-1">Record location</p>
                              <p>For multi-line records (e.g. 4-line DST format), each field is identified by:</p>
                              <p className="mt-1"><strong>L</strong> = Line number within one record (1–{schema?.linesPerRecord ?? "N"})</p>
                              <p><strong>P</strong> = Field position within that line (0-based)</p>
                              <p className="mt-1 italic">Example: L2/P3 = 4th field on the 2nd line of every record</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        {/* Generator type + DB SQL type */}
                        <th className="p-2 text-left font-semibold text-muted-foreground w-52">
                          <span className="flex items-center gap-1">
                            Type
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                <p className="font-semibold">Generator type (top) + DB SQL type (bottom)</p>
                                <p className="mt-1">The generator type controls <em>how</em> synthetic values are produced. The SQL type below it is the column definition for your database DDL.</p>
                                <p className="mt-1">Change the generator type to auto-update both the regex pattern and the SQL type.</p>
                              </TooltipContent>
                            </Tooltip>
                          </span>
                        </th>
                        {/* Fill % — how often this field had data in the sample */}
                        <th className="p-2 text-left font-semibold text-muted-foreground w-16">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline decoration-dotted">Fill %</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              <p className="font-semibold">Population rate in the sample</p>
                              <p className="mt-1"><strong>100%</strong> = data present on every record</p>
                              <p><strong>0%</strong> = no data found → classified as <code>always_empty</code></p>
                              <p><strong>30%</strong> = sparse field — the generator leaves it blank ~70% of the time to match the original pattern</p>
                              <p className="mt-1 italic">You can override the type to force generation even on sparse fields.</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        {/* Feature #2 & #3: Regex column */}
                        <th className="p-2 text-left font-semibold text-muted-foreground min-w-[260px]">
                          <span className="flex items-center gap-1">
                            <Code2 className="w-3 h-3" />Regex Pattern
                            {/* Feature #5: syntax help */}
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="hover:text-foreground">
                                  <HelpCircle className="w-3 h-3" />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 text-xs font-mono whitespace-pre-wrap">
                                {REGEX_SYNTAX_HELP}
                              </PopoverContent>
                            </Popover>
                          </span>
                        </th>
                        {/* Live preview column */}
                        <th className="p-2 text-left font-semibold text-muted-foreground w-32">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />Preview</span>
                        </th>
                        {/* Try It column — Feature #5 */}
                        <th className="p-2 text-center font-semibold text-muted-foreground w-14">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <FlaskConical className="w-3.5 h-3.5 text-violet-500 mx-auto cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>Click to preview 8 samples from the regex pattern</TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-2 text-center font-semibold text-muted-foreground w-10">Del</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleColumns.map((col, idx) => {
                        const currentName  = nameMap.get(col.id)   ?? col.displayName;
                        const currentType  = typeMap.get(col.id)   ?? col.detectedType;
                        const currentRegex = regexMap.get(col.id)  ?? "";
                        const isCommon     = commonSet.has(col.id);
                        const isTryOpen    = tryItOpen === col.id;
                        // Use stable previewMap — never re-randomised by re-renders
                        const livePreview  = previewMap.get(col.id) ?? (col.sampleValue || "—");

                        return (
                          <>
                            <tr
                              key={col.id}
                              className={`border-t transition-colors
                                ${isCommon ? "bg-amber-50/60 dark:bg-amber-900/10" : "hover:bg-muted/30"}
                                ${isTryOpen ? "bg-violet-50/60 dark:bg-violet-900/10" : ""}
                              `}
                            >
                              {/* Feature #6: Common column star */}
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => toggleCommon(col.id)}
                                  className={`transition-transform hover:scale-125 ${isCommon ? "text-amber-500" : "text-gray-200 hover:text-amber-300"}`}
                                >
                                  <Star className={`w-3.5 h-3.5 ${isCommon ? "fill-amber-500" : ""}`} />
                                </button>
                              </td>

                              {/* Index */}
                              <td className="p-2 text-muted-foreground">{idx + 1}</td>

                              {/* Feature #1: Editable field name */}
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  {col.isPII && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <ShieldAlert className="w-3 h-3 text-red-500 shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>PII field — synthetic values generated, no real data used</TooltipContent>
                                    </Tooltip>
                                  )}
                                  {isCommon && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Lock className="w-3 h-3 text-amber-500 shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent>Common column — shared across all custodian profiles</TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Input
                                    className="h-6 text-xs border-transparent hover:border-input focus:border-input bg-transparent hover:bg-background px-1.5 font-mono min-w-[120px]"
                                    value={currentName}
                                    onChange={e => setName(col.id, e.target.value)}
                                  />
                                </div>
                              </td>

                              {/* Line / Position locator */}
                              <td className="p-2 text-muted-foreground font-mono text-[11px]">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="cursor-help">
                                      L{col.lineIndex + 1}/P{col.position}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="text-xs">
                                    Line {col.lineIndex + 1} of {schema?.linesPerRecord ?? "?"}, field #{col.position} (0-based)
                                  </TooltipContent>
                                </Tooltip>
                              </td>

                              {/* Generator type (dropdown) + DB SQL type (badge below) */}
                              <td className="p-2">
                                <Select value={currentType} onValueChange={v => setType(col.id, v)}>
                                  <SelectTrigger className="h-6 text-xs w-full">
                                    <span className={`px-1.5 py-0.5 rounded border text-[10px] ${typeColor(currentType)}`}>
                                      {currentType === "always_empty" ? "always_empty ⚠" : currentType}
                                    </span>
                                  </SelectTrigger>
                                  <SelectContent className="text-xs">
                                    {ALL_FIELD_TYPES.map(t => (
                                      <SelectItem key={t} value={t}>
                                        <span className={`px-1 rounded text-[10px] border ${typeColor(t)}`}>{t}</span>
                                        <span className="ml-2 text-muted-foreground text-[10px]">{TYPE_HELP[t]?.slice(0, 35)}</span>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {/* DB SQL type shown below the dropdown */}
                                <div className="mt-0.5 text-[10px] text-muted-foreground font-mono pl-0.5 leading-tight">
                                  {getSqlType(currentType, col.maxObservedLength)}
                                </div>
                              </td>

                              {/* Fill % — population rate */}
                              <td className="p-2">
                                {(() => {
                                  const pct = col.totalSampleCount > 0
                                    ? Math.round((col.populatedCount / col.totalSampleCount) * 100)
                                    : 0;
                                  const color = pct === 0   ? "text-gray-400"
                                              : pct < 50   ? "text-amber-600"
                                              : pct < 100  ? "text-blue-600"
                                              :              "text-green-600";
                                  const bgBar = pct === 0   ? "bg-gray-200"
                                              : pct < 50   ? "bg-amber-400"
                                              : pct < 100  ? "bg-blue-400"
                                              :              "bg-green-400";
                                  return (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className="cursor-help space-y-0.5">
                                          <span className={`text-[11px] font-medium ${color}`}>{pct}%</span>
                                          <div className="h-1 w-10 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full ${bgBar} rounded-full`} style={{ width: `${pct}%` }} />
                                          </div>
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="right" className="text-xs">
                                        {pct === 0
                                          ? "Never populated in sample → always generated as blank (always_empty)"
                                          : pct === 100
                                          ? "Populated on every record"
                                          : `${col.populatedCount} of ${col.totalSampleCount} records had data — generator fills blank ~${100 - pct}% of the time to match`
                                        }
                                      </TooltipContent>
                                    </Tooltip>
                                  );
                                })()}
                              </td>

                              {/* Feature #2 & #3: Regex pattern input */}
                              <td className="p-2">
                                <div className="flex items-center gap-1">
                                  <Input
                                    className="h-6 text-xs font-mono w-full min-w-[160px]"
                                    placeholder="e.g. [0-9]{8}"
                                    value={currentRegex}
                                    onChange={e => setRegex(col.id, e.target.value)}
                                  />
                                  {/* Reset to auto-suggested regex */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => setRegex(col.id, getDefaultRegex({ ...col, detectedType: currentType } as FieldSchema))}
                                        className="text-muted-foreground hover:text-violet-600 shrink-0"
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reset to auto-suggested pattern</TooltipContent>
                                  </Tooltip>
                                </div>
                              </td>

                              {/* Live preview — one sample from current regex */}
                              <td className="p-2 font-mono text-muted-foreground truncate max-w-[120px]">
                                <span title={livePreview} className="text-[10px]">{livePreview || "—"}</span>
                              </td>

                              {/* Feature #5: Try It button */}
                              <td className="p-2 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleTryIt(col.id)}
                                      className={`p-1 rounded transition-colors ${isTryOpen ? "bg-violet-100 text-violet-700" : "text-muted-foreground hover:text-violet-600 hover:bg-violet-50"}`}
                                    >
                                      <FlaskConical className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{isTryOpen ? "Close preview" : "Preview 8 samples from this pattern"}</TooltipContent>
                                </Tooltip>
                              </td>

                              {/* Delete column */}
                              <td className="p-2 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => deleteCol(col.id)}
                                      className="text-muted-foreground hover:text-red-500 p-1 rounded hover:bg-red-50"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Remove field from generation</TooltipContent>
                                </Tooltip>
                              </td>
                            </tr>

                            {/* Feature #5: Try It expanded row */}
                            {isTryOpen && (
                              <tr key={`${col.id}-tryit`} className="bg-violet-50/80 dark:bg-violet-950/20 border-t border-violet-200">
                                <td colSpan={11} className="px-4 py-3">
                                  <div className="flex flex-wrap items-start gap-3">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
                                      <FlaskConical className="w-3.5 h-3.5" />
                                      8 samples from <code className="bg-violet-100 px-1.5 py-0.5 rounded font-mono">{regexMap.get(col.id)}</code>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {tryItSamples.map((s, si) => (
                                        <span key={si} className="font-mono text-[11px] bg-white border border-violet-200 rounded px-2 py-0.5 text-violet-800">
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => setTryItSamples(generateSamples(regexMap.get(col.id) ?? "", 8))}
                                      className="ml-auto text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1"
                                    >
                                      <RefreshCw className="w-3 h-3" /> Regenerate
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                      {visibleColumns.length === 0 && (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground text-sm">
                            No fields match the current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              {/* Footer summary row */}
              <div className="border-t px-4 py-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-muted/20">
                <span>{effectiveSchema?.columns.length ?? 0} active fields · {deletedIds.size} removed</span>
                <span>{commonCount} common columns</span>
                <span className="ml-auto italic">Tip: star a column to mark it as shared across all custodians</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ══════════════════════════════════════════════
            STEP 3 — Generate  +  STEP 4 — Done
            ══════════════════════════════════════════════ */}
        {(step === "generate" || step === "done") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Generate settings panel */}
            <Card className={`border-2 ${step === "generate" ? "border-green-400 shadow-md" : "border-border opacity-80"}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-4 h-4 text-green-500" /> Step 3 · Generate Test Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Number of Records</label>
                  <Input
                    type="number" min={1} max={2000000}
                    value={recordCount}
                    onChange={e => setRecordCount(Math.max(1, parseInt(e.target.value) || 1))}
                    placeholder="e.g. 5000"
                  />
                  <p className="text-xs text-muted-foreground">Max 2,000,000 records</p>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Positive", pct: 80, color: "bg-green-500", icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />, desc: "Valid data, all rules satisfied" },
                    { label: "Edge",     pct: 15, color: "bg-amber-500", icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />, desc: "Boundary values, max lengths, special chars" },
                    { label: "Negative", pct: 5,  color: "bg-red-500",   icon: <ShieldAlert className="w-3.5 h-3.5 text-red-600" />,  desc: "Invalid SSN, bad dates, wrong types" },
                  ].map(({ label, pct, color, icon, desc }) => (
                    <div key={label} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs font-medium">{icon}{label}</span>
                        <span className="text-xs text-muted-foreground">{pct}% · ~{Math.round(recordCount * pct / 100).toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeManifest} onChange={e => setIncludeManifest(e.target.checked)} className="rounded" />
                  <span className="text-sm">Include manifest file</span>
                </label>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  disabled={!effectiveSchema || isGenerating}
                  onClick={handleGenerate}
                >
                  {isGenerating
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                    : <><Sparkles className="w-4 h-4 mr-2" />Generate Test Data</>
                  }
                </Button>

                {isGenerating && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">
                      Building {recordCount.toLocaleString()} records…
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results / download panel */}
            <Card className={`border-2 ${step === "done" ? "border-blue-400 shadow-md" : "border-border opacity-50"}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Download className="w-4 h-4 text-blue-500" /> Step 4 · Download
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!generateResult ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                    <Download className="w-10 h-10 opacity-20" />
                    <p className="text-sm">Generated files appear here</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Positive", val: generateResult.breakdown.positive, color: "text-green-600" },
                        { label: "Edge",     val: generateResult.breakdown.edge,     color: "text-amber-600" },
                        { label: "Negative", val: generateResult.breakdown.negative, color: "text-red-600"   },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="bg-muted/40 rounded-lg p-2">
                          <div className={`text-xl font-bold ${color}`}>{val.toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground">{label}</div>
                        </div>
                      ))}
                    </div>

                    <Button variant="outline" size="sm" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50" onClick={downloadTestData}>
                      <Download className="w-4 h-4 mr-2" />Download Test Data
                    </Button>

                    {includeManifest && generateResult.manifest && (
                      <Button variant="outline" size="sm" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50" onClick={downloadManifest}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />Download Manifest (.csv)
                      </Button>
                    )}

                    <Button variant="outline" size="sm" className="w-full border-violet-300 text-violet-700 hover:bg-violet-50" onClick={downloadSchemaJson}>
                      <FileJson className="w-4 h-4 mr-2" />Save Schema (.json)
                    </Button>

                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground"
                      onClick={() => { setStep("upload"); setSchema(null); setGenerateResult(null); setUploadedFilename(""); setSearchQ(""); setFilterType("all"); }}>
                      <RefreshCw className="w-3 h-3 mr-1" />Start over
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}
