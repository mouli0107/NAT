/**
 * GenerationHistoryView — Premium light-theme history UI for Synthetic Data tool.
 * Shows per-custodian progress, stats, and a filterable/searchable history list.
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  History,
  Download,
  Trash2,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  Clock,
  Database,
  Users,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface HistoryEntry {
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
    fullSchema?: any;
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

export interface Props {
  onNavigateToUpload: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? "s" : ""} ago`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isExpired(entry: HistoryEntry): boolean {
  if (!entry.dataFileExpiry) return true;
  return new Date(entry.dataFileExpiry) < new Date();
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isThisWeek(iso: string): boolean {
  const diffMs = Date.now() - new Date(iso).getTime();
  return diffMs < 7 * 24 * 60 * 60 * 1000;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function GenerationHistoryView({ onNavigateToUpload }: Props) {
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<"all" | "today" | "week" | "errors">("all");
  const [search, setSearch] = useState("");
  const [selectedCustodian, setSelectedCustodian] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery<{ success: boolean; entries: HistoryEntry[] }>({
    queryKey: ["generation-history"],
    queryFn: () => fetch("/api/synthetic-data/history").then(r => r.json()),
    refetchOnWindowFocus: false,
  });

  const entries: HistoryEntry[] = data?.entries ?? [];

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/synthetic-data/history/${id}`, { method: "DELETE" }).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["generation-history"] }),
  });

  // ── Download handler ────────────────────────────────────────────────────────
  async function handleDownload(entry: HistoryEntry) {
    setDownloadingId(entry.id);
    try {
      const res = await fetch(`/api/synthetic-data/history/${entry.id}/download`);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = entry.uploadedFilename.split(".").pop() || "txt";
      a.download = `${entry.uploadedFilename.replace(/\.[^.]+$/, "")}_synthetic.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloadingId(null);
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalRuns = entries.length;
    const totalRecords = entries.reduce((s, e) => s + e.result.recordCount, 0);
    const custodians = new Set(entries.map(e => e.custodianName)).size;
    const successRate = totalRuns > 0 ? Math.round((entries.filter(e => e.result.recordCount > 0).length / totalRuns) * 100) : 0;
    return { totalRuns, totalRecords, custodians, successRate };
  }, [entries]);

  // ── Custodian breakdown ────────────────────────────────────────────────────
  const custodianMap = useMemo(() => {
    const map: Record<string, { count: number; totalRecords: number; lastRun: string }> = {};
    for (const e of entries) {
      if (!map[e.custodianName]) map[e.custodianName] = { count: 0, totalRecords: 0, lastRun: e.generatedAt };
      map[e.custodianName].count++;
      map[e.custodianName].totalRecords += e.result.recordCount;
      if (new Date(e.generatedAt) > new Date(map[e.custodianName].lastRun)) {
        map[e.custodianName].lastRun = e.generatedAt;
      }
    }
    return map;
  }, [entries]);

  const allCustodians = Object.keys(custodianMap);

  // ── Filtered entries ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = entries;
    if (selectedCustodian) list = list.filter(e => e.custodianName === selectedCustodian);
    if (filterTab === "today") list = list.filter(e => isToday(e.generatedAt));
    if (filterTab === "week") list = list.filter(e => isThisWeek(e.generatedAt));
    if (filterTab === "errors") list = list.filter(e => e.result.recordCount === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.custodianName.toLowerCase().includes(q) || e.uploadedFilename.toLowerCase().includes(q)
      );
    }
    return list;
  }, [entries, selectedCustodian, filterTab, search]);

  // ── Loading / error states ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, gap: 12, color: "#6b7280" }}>
        <RefreshCw style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 15 }}>Loading generation history…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 320, flexDirection: "column", gap: 12, color: "#ef4444" }}>
        <AlertCircle style={{ width: 32, height: 32 }} />
        <span style={{ fontSize: 15 }}>Failed to load history. Please refresh.</span>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (entries.length === 0) {
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: 420, gap: 20, background: "#fff", borderRadius: 16, border: "1px dashed #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <History style={{ width: 36, height: 36, color: "#3b82f6" }} />
        </div>
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 8 }}>No generation history yet</h3>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>
            Upload a sample file and generate synthetic data to start tracking your runs here.
          </p>
        </div>
        <Button
          onClick={onNavigateToUpload}
          style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 600, cursor: "pointer" }}
        >
          <Upload style={{ width: 16, height: 16, marginRight: 8 }} />
          Upload your first file
        </Button>
      </div>
    );
  }

  // ── Main UI ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── A) Hero Stats Bar ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {/* Total Runs */}
        <div style={{
          background: "linear-gradient(135deg, #3b82f6, #1d4ed8)", borderRadius: 16,
          padding: "20px 24px", color: "#fff",
          boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Total Runs</p>
              <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{stats.totalRuns.toLocaleString()}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: 8 }}>
              <History style={{ width: 22, height: 22 }} />
            </div>
          </div>
        </div>
        {/* Total Records */}
        <div style={{
          background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: 16,
          padding: "20px 24px", color: "#fff",
          boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Total Records</p>
              <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{stats.totalRecords.toLocaleString()}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: 8 }}>
              <Database style={{ width: 22, height: 22 }} />
            </div>
          </div>
        </div>
        {/* Custodians */}
        <div style={{
          background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", borderRadius: 16,
          padding: "20px 24px", color: "#fff",
          boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Custodians Tracked</p>
              <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{stats.custodians.toLocaleString()}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: 8 }}>
              <Users style={{ width: 22, height: 22 }} />
            </div>
          </div>
        </div>
        {/* Success Rate */}
        <div style={{
          background: "linear-gradient(135deg, #f59e0b, #d97706)", borderRadius: 16,
          padding: "20px 24px", color: "#fff",
          boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Success Rate</p>
              <p style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{stats.successRate}%</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: 10, padding: 8 }}>
              <TrendingUp style={{ width: 22, height: 22 }} />
            </div>
          </div>
        </div>
      </div>

      {/* ── B) Custodian Progress Panel ─────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 4 }}>Custodian Progress</h3>
            <p style={{ fontSize: 13, color: "#6b7280" }}>
              {allCustodians.length} custodian{allCustodians.length !== 1 ? "s" : ""} processed
            </p>
          </div>
          {selectedCustodian && (
            <button
              onClick={() => setSelectedCustodian(null)}
              style={{ fontSize: 13, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Overall bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>Overall progress</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{allCustodians.length} of {allCustodians.length} custodians</span>
          </div>
          <Progress value={100} style={{ height: 8, borderRadius: 4 }} />
        </div>

        {/* Custodian grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
          {allCustodians.map(name => {
            const c = custodianMap[name];
            const isActive = isThisWeek(c.lastRun);
            const isSelected = selectedCustodian === name;
            const statusColor = isActive ? "#3b82f6" : "#10b981";
            const statusLabel = isActive ? "Active" : "Complete";

            return (
              <div
                key={name}
                onClick={() => setSelectedCustodian(isSelected ? null : name)}
                style={{
                  background: isSelected ? "#eff6ff" : "#f9fafb",
                  border: `2px solid ${isSelected ? "#3b82f6" : "transparent"}`,
                  borderRadius: 12, padding: "14px 16px", cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 110 }}>{name}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: "#fff", background: statusColor,
                    borderRadius: 10, padding: "2px 8px",
                  }}>{statusLabel}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", lineHeight: 1 }}>{c.count}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>runs</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", lineHeight: 1 }}>{c.totalRecords.toLocaleString()}</p>
                    <p style={{ fontSize: 11, color: "#9ca3af" }}>records</p>
                  </div>
                </div>
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 6 }}>{timeAgo(c.lastRun)}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── C) History List ──────────────────────────────────────────────────── */}
      <div style={{
        background: "#fff", borderRadius: 16, padding: 24,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
      }}>
        {/* Header + filters */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
            Generation Runs
            {selectedCustodian && (
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 400, marginLeft: 8 }}>— {selectedCustodian}</span>
            )}
          </h3>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {/* Filter tabs */}
            <div style={{ display: "flex", background: "#f3f4f6", borderRadius: 8, padding: 3, gap: 2 }}>
              {(["all", "today", "week", "errors"] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilterTab(tab)}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                    background: filterTab === tab ? "#fff" : "transparent",
                    color: filterTab === tab ? "#111827" : "#6b7280",
                    boxShadow: filterTab === tab ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  }}
                >
                  {tab === "all" ? "All" : tab === "today" ? "Today" : tab === "week" ? "This Week" : "Errors"}
                </button>
              ))}
            </div>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#9ca3af" }} />
              <Input
                placeholder="Search filename or custodian…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, fontSize: 13, height: 34, width: 220, borderRadius: 8 }}
              />
            </div>
          </div>
        </div>

        {/* List */}
        <ScrollArea style={{ maxHeight: 600 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", color: "#9ca3af", fontSize: 14 }}>
              No entries match your filter.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(entry => {
                const expired = isExpired(entry);
                const expanded = expandedId === entry.id;
                const borderColor = expired ? "#f59e0b" : "#3b82f6";
                const statusDot = expired ? "#f59e0b" : "#10b981";
                const { breakdown } = entry.result;

                return (
                  <div
                    key={entry.id}
                    style={{
                      background: "#fff", borderRadius: 12,
                      borderLeft: `4px solid ${borderColor}`,
                      border: "1px solid #f3f4f6",
                      borderLeftWidth: 4,
                      borderLeftColor: borderColor,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Main row */}
                    <div style={{ display: "flex", alignItems: "flex-start", padding: "16px 18px", gap: 14 }}>
                      {/* Status dot */}
                      <div style={{ marginTop: 5, flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: statusDot }} />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{entry.custodianName}</span>
                          <span style={{ fontSize: 12, color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                            {entry.uploadedFilename}
                          </span>
                          <span style={{ fontSize: 11, color: "#9ca3af", marginLeft: "auto" }}>
                            <Clock style={{ width: 11, height: 11, display: "inline", marginRight: 3, verticalAlign: "middle" }} />
                            {timeAgo(entry.generatedAt)}
                          </span>
                        </div>

                        {/* Stats chips */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#eff6ff", color: "#1d4ed8", borderRadius: 6, padding: "3px 8px" }}>
                            {entry.result.recordCount.toLocaleString()} records
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#374151", borderRadius: 6, padding: "3px 8px" }}>
                            {entry.schemaSnap.columnCount} cols
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#374151", borderRadius: 6, padding: "3px 8px" }}>
                            {entry.schemaSnap.format}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#f0fdf4", color: "#166534", borderRadius: 6, padding: "3px 8px" }}>
                            {breakdown.positive}P
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#fffbeb", color: "#92400e", borderRadius: 6, padding: "3px 8px" }}>
                            {breakdown.edge}E
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#fef2f2", color: "#991b1b", borderRadius: 6, padding: "3px 8px" }}>
                            {breakdown.negative}N
                          </span>
                          <span style={{ fontSize: 11, color: "#9ca3af", borderRadius: 6, padding: "3px 8px" }}>
                            {formatBytes(entry.result.dataBytes)}
                          </span>
                          {expired && (
                            <span style={{ fontSize: 11, fontWeight: 600, background: "#fffbeb", color: "#b45309", borderRadius: 6, padding: "3px 8px" }}>
                              ⏱ Expired (will regenerate)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(entry)}
                          disabled={downloadingId === entry.id}
                          style={{
                            background: expired ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                            color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, padding: "6px 14px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6, opacity: downloadingId === entry.id ? 0.7 : 1,
                          }}
                        >
                          {downloadingId === entry.id ? (
                            <RefreshCw style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                          ) : expired ? (
                            <RefreshCw style={{ width: 13, height: 13 }} />
                          ) : (
                            <Download style={{ width: 13, height: 13 }} />
                          )}
                          {expired ? "Regenerate" : "Download"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                          style={{
                            color: "#ef4444", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, padding: "6px 10px", cursor: "pointer",
                            background: "transparent",
                          }}
                        >
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </Button>
                        <button
                          onClick={() => setExpandedId(expanded ? null : entry.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 6 }}
                        >
                          {expanded ? <ChevronUp style={{ width: 16, height: 16 }} /> : <ChevronDown style={{ width: 16, height: 16 }} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded schema details */}
                    {expanded && (
                      <div style={{ borderTop: "1px solid #f3f4f6", padding: "14px 18px 16px 42px", background: "#fafafa" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Format</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{entry.schemaSnap.format}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Lines per Record</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{entry.schemaSnap.linesPerRecord}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Column Count</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{entry.schemaSnap.columnCount}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Sample Records</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{entry.schemaSnap.sampleRecordCount}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Requested Records</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{entry.config.recordCount.toLocaleString()}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Generated At</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{new Date(entry.generatedAt).toLocaleString()}</p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>File Expiry</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: isExpired(entry) ? "#ef4444" : "#10b981" }}>
                              {entry.dataFileExpiry ? new Date(entry.dataFileExpiry).toLocaleString() : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p style={{ fontSize: 11, color: "#9ca3af", marginBottom: 3 }}>Manifest Included</p>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{entry.config.includeManifest ? "Yes" : "No"}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
