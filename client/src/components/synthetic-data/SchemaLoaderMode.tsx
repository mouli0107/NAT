/**
 * SchemaLoaderMode — Generate synthetic test data from a Schema_Loader.xlsx
 *
 * Workflow:
 *  1. User uploads Schema_Loader.xlsx (DST custodian XML layout file)
 *  2. Server parses the XML, extracts one InferredSchema per file type
 *  3. generateTestData() runs for each file type → positive + edge + negative
 *  4. Results shown per tab; user can preview & download each file type
 */

import { useState, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Upload, FileSpreadsheet, Download, Loader2,
  CheckCircle2, AlertTriangle, ChevronRight, Database,
  FileText, Sparkles, RefreshCw,
} from "lucide-react";

// ─── Types (mirrors server types) ────────────────────────────────────────────

interface FieldSchema {
  id: string;
  displayName: string;
  position: number;
  sqlType: string;
  detectedType: string;
  isPII: boolean;
  sampleValue: string;
  isLiteral: boolean;
  literalValue?: string;
}

interface GenerateResult {
  data: string;
  manifest: string;
  recordCount: number;
  breakdown: { positive: number; edge: number; negative: number };
}

interface FileTypeResult {
  fileType: string;
  fileTypeFlag: string;
  rowPrefixes: string[];
  result: GenerateResult;
  sqlSchema: string;
}

interface LoaderApiResponse {
  success: boolean;
  parserName: string;
  parserId: string;
  results: FileTypeResult[];
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  account_id:   "bg-blue-100 text-blue-800",
  ssn:          "bg-red-100 text-red-800",
  phone:        "bg-red-100 text-red-800",
  email:        "bg-red-100 text-red-800",
  name:         "bg-orange-100 text-orange-800",
  address:      "bg-orange-100 text-orange-800",
  city:         "bg-orange-100 text-orange-800",
  amount:       "bg-green-100 text-green-800",
  date_mmddyy:  "bg-purple-100 text-purple-800",
  state_code:   "bg-cyan-100 text-cyan-800",
  country_code: "bg-cyan-100 text-cyan-800",
  zip_code:     "bg-cyan-100 text-cyan-800",
  code_pool:    "bg-yellow-100 text-yellow-800",
  integer:      "bg-slate-100 text-slate-800",
  text:         "bg-gray-100 text-gray-700",
  literal:      "bg-gray-100 text-gray-500 italic",
};

function typeColor(t: string) {
  return TYPE_COLORS[t] ?? "bg-gray-100 text-gray-700";
}

export function SchemaLoaderMode() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── state ──────────────────────────────────────────────────────────────────
  const [dragOver,    setDragOver]    = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [apiResp,     setApiResp]     = useState<LoaderApiResponse | null>(null);
  const [recordCount, setRecordCount] = useState("200");
  const [activeFile,  setActiveFile]  = useState<string>("");

  // ── helpers ────────────────────────────────────────────────────────────────

  const downloadText = useCallback((text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const doUpload = useCallback(async (file: File) => {
    if (!file.name.match(/\.xlsx$/i)) {
      toast({ title: "Wrong file type", description: "Please upload a .xlsx file.", variant: "destructive" });
      return;
    }
    setUploading(true);
    setProgress(10);
    setApiResp(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("recordCount", recordCount);
    formData.append("includeManifest", "true");

    try {
      setProgress(30);
      const resp = await fetch("/api/synthetic-data/generate-from-loader", {
        method: "POST",
        body: formData,
      });
      setProgress(80);
      const json: LoaderApiResponse = await resp.json();
      setProgress(100);

      if (!json.success) {
        toast({ title: "Generation failed", description: json.error, variant: "destructive" });
        return;
      }
      setApiResp(json);
      if (json.results.length > 0) setActiveFile(json.results[0].fileType);
      toast({
        title: "Success",
        description: `${json.results.length} file type(s) generated from parser "${json.parserName}".`,
      });
    } catch (e: any) {
      toast({ title: "Network error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [recordCount, toast]);

  // ── drag & drop ────────────────────────────────────────────────────────────

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) doUpload(file);
  }, [doUpload]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) doUpload(file);
    e.target.value = "";
  }, [doUpload]);

  // ── render: upload zone ────────────────────────────────────────────────────

  const activeResult = apiResp?.results.find((r) => r.fileType === activeFile);

  return (
    <div className="space-y-6">
      {/* Upload card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            XML Schema Loader
            <Badge variant="secondary" className="ml-2 text-xs">DST Custodian</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload a <strong>Schema_Loader.xlsx</strong> file — the server parses the embedded XML
            (parser name, file types, row prefixes, field positions) and immediately generates
            <span className="text-green-700 font-medium"> positive</span>,
            <span className="text-amber-600 font-medium"> edge</span>, and
            <span className="text-red-600 font-medium"> negative</span> test records for every file
            type with no sample data required.
          </p>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Records per file type:
            </label>
            <Input
              type="number"
              min={10} max={100000}
              value={recordCount}
              onChange={(e) => setRecordCount(e.target.value)}
              className="w-32"
            />
          </div>

          {/* Drop zone */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer
              ${dragOver ? "border-green-400 bg-green-50" : "border-border hover:border-green-400 hover:bg-green-50/40"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={onFileChange} />
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-10 w-10 text-green-500 animate-spin" />
                <p className="text-sm text-muted-foreground">Parsing schema &amp; generating test data…</p>
                <Progress value={progress} className="w-64 h-2" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium">Drop Schema_Loader.xlsx here or click to browse</p>
                <p className="text-xs text-muted-foreground">.xlsx only · max 50 MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {apiResp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5 text-blue-600" />
              Parser: <span className="text-blue-700">{apiResp.parserName}</span>
              <span className="text-muted-foreground text-xs">(id={apiResp.parserId})</span>
              <Button
                variant="outline"
                size="sm"
                className="ml-auto"
                onClick={() => { setApiResp(null); setActiveFile(""); }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Upload another
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeFile} onValueChange={setActiveFile}>
              <TabsList className="flex-wrap h-auto gap-1 mb-4">
                {apiResp.results.map((r) => (
                  <TabsTrigger key={r.fileType} value={r.fileType} className="capitalize text-xs">
                    {r.fileType}
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      flag={r.fileTypeFlag}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>

              {apiResp.results.map((r) => (
                <TabsContent key={r.fileType} value={r.fileType} className="space-y-5">
                  <FileTypeResultPanel
                    result={r}
                    onDownload={downloadText}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-component: one file type result ─────────────────────────────────────

function FileTypeResultPanel({
  result,
  onDownload,
}: {
  result: FileTypeResult;
  onDownload: (text: string, filename: string) => void;
}) {
  const [view, setView] = useState<"preview" | "sql">("preview");

  const { positive, edge, negative } = result.result.breakdown;
  const lines = result.result.data.split("\n").filter(Boolean);

  const positiveLines = lines.slice(0, positive);
  const edgeLines     = lines.slice(positive, positive + edge);
  const negativeLines = lines.slice(positive + edge, positive + edge + negative);

  const filename = (suffix: string) =>
    `${result.fileType}_${suffix}_${new Date().toISOString().slice(0, 10)}.txt`;

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-3 items-center">
        {result.rowPrefixes.length > 0 && (
          <div className="flex gap-1">
            {result.rowPrefixes.map((p) => (
              <Badge key={p} variant="outline" className="text-xs font-mono">
                row="{p}"
              </Badge>
            ))}
          </div>
        )}
        <Badge className="bg-green-100 text-green-800 border-0">
          <CheckCircle2 className="h-3 w-3 mr-1" /> {positive} positive
        </Badge>
        <Badge className="bg-amber-100 text-amber-800 border-0">
          <AlertTriangle className="h-3 w-3 mr-1" /> {edge} edge
        </Badge>
        <Badge className="bg-red-100 text-red-800 border-0">
          <Sparkles className="h-3 w-3 mr-1" /> {negative} negative
        </Badge>
      </div>

      {/* Download buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => onDownload(positiveLines.join("\n"), filename("positive"))}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Positive
        </Button>
        <Button
          size="sm"
          className="bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => onDownload(edgeLines.join("\n"), filename("edge"))}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Edge
        </Button>
        <Button
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={() => onDownload(negativeLines.join("\n"), filename("negative"))}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> Negative
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDownload(result.result.data, filename("all"))}
        >
          <Download className="h-3.5 w-3.5 mr-1" /> All ({result.result.recordCount})
        </Button>
        {result.result.manifest && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDownload(result.result.manifest, filename("manifest"))}
          >
            <FileText className="h-3.5 w-3.5 mr-1" /> Manifest
          </Button>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={view === "preview" ? "default" : "outline"}
          onClick={() => setView("preview")}
        >
          Preview
        </Button>
        <Button
          size="sm"
          variant={view === "sql" ? "default" : "outline"}
          onClick={() => setView("sql")}
        >
          SQL DDL
        </Button>
      </div>

      {view === "preview" && (
        <PreviewSection
          positiveLines={positiveLines}
          edgeLines={edgeLines}
          negativeLines={negativeLines}
        />
      )}

      {view === "sql" && (
        <ScrollArea className="h-48 rounded border bg-gray-950 p-3">
          <pre className="text-xs text-green-400 whitespace-pre-wrap">{result.sqlSchema}</pre>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Preview section ──────────────────────────────────────────────────────────

function PreviewSection({
  positiveLines,
  edgeLines,
  negativeLines,
}: {
  positiveLines: string[];
  edgeLines: string[];
  negativeLines: string[];
}) {
  const [tab, setTab] = useState<"pos" | "edge" | "neg">("pos");
  const shown = tab === "pos" ? positiveLines : tab === "edge" ? edgeLines : negativeLines;
  const preview = shown.slice(0, 15);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button size="sm" variant={tab === "pos"  ? "default" : "ghost"} onClick={() => setTab("pos")}>
          <span className="text-green-600 font-semibold mr-1">●</span> Positive
        </Button>
        <Button size="sm" variant={tab === "edge" ? "default" : "ghost"} onClick={() => setTab("edge")}>
          <span className="text-amber-500 font-semibold mr-1">●</span> Edge
        </Button>
        <Button size="sm" variant={tab === "neg"  ? "default" : "ghost"} onClick={() => setTab("neg")}>
          <span className="text-red-600 font-semibold mr-1">●</span> Negative
        </Button>
      </div>
      <ScrollArea className="h-48 rounded border bg-gray-950">
        <div className="p-3 space-y-0.5">
          {preview.map((line, i) => (
            <p key={i} className="text-[11px] font-mono text-gray-200 whitespace-nowrap">
              {line}
            </p>
          ))}
          {shown.length > 15 && (
            <p className="text-xs text-gray-500 pt-1">… {shown.length - 15} more rows</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
