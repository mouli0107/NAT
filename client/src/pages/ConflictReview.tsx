// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 6: ConflictReview page
// client/src/pages/ConflictReview.tsx
//
// Route: /projects/:id/conflicts  (also accessible via /conflicts?projectId=)
//
// Shows all open merge conflicts for the selected project.
// Users can: keep base, keep incoming, edit manually, ask Claude.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { useLocation, Link } from 'wouter';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { useProject } from '@/contexts/ProjectContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conflict {
  id:              string;
  projectId:       string;
  assetType:       string;
  assetKey:        string;
  conflictType:    string | null;
  baseContent:     string | null;
  incomingContent: string | null;
  baseAuthor:      string | null;
  incomingAuthor:  string | null;
  baseTcId:        string | null;
  incomingTcId:    string | null;
  aiSuggestion:    string | null;
  status:          string | null;
  createdAt:       string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000)     return 'just now';
  if (ms < 3_600_000)  return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function ConflictTypeBadge({ type }: { type: string | null }) {
  const label = type ?? 'unknown';
  const color =
    label === 'selector_diverged' ? 'bg-orange-100 text-orange-700' :
    label === 'content_diverged'  ? 'bg-red-100 text-red-700' :
    'bg-slate-100 text-slate-600';
  return (
    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  const color =
    status === 'open'     ? 'bg-amber-100 text-amber-700' :
    status === 'resolved' ? 'bg-emerald-100 text-emerald-700' :
    'bg-slate-100 text-slate-500';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${color}`}>
      {status ?? 'unknown'}
    </span>
  );
}

// ── ConflictCard ──────────────────────────────────────────────────────────────

function ConflictCard({
  conflict,
  onResolve,
  onAiSuggest,
}: {
  conflict:   Conflict;
  onResolve:  (id: string, resolution: 'keep_base' | 'keep_incoming' | 'custom', customContent?: string) => void;
  onAiSuggest: (id: string) => void;
}) {
  const [manualContent, setManualContent] = useState('');
  const [editMode, setEditMode]           = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);

  const handleAiSuggest = async () => {
    setSuggestLoading(true);
    await onAiSuggest(conflict.id);
    setSuggestLoading(false);
  };

  if (conflict.status === 'resolved') {
    return (
      <div className="border border-emerald-100 rounded-lg mb-4 px-4 py-3 bg-emerald-50 flex items-center justify-between">
        <div>
          <span className="font-mono text-xs text-slate-600">{conflict.assetKey}</span>
          <ConflictTypeBadge type={conflict.conflictType} />
        </div>
        <StatusBadge status="resolved" />
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl mb-4 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center min-w-0">
          <span className="font-mono text-sm text-slate-700 truncate">{conflict.assetKey}</span>
          <ConflictTypeBadge type={conflict.conflictType} />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="text-xs text-slate-400">{timeAgo(conflict.createdAt)}</span>
          <StatusBadge status={conflict.status} />
        </div>
      </div>

      {/* Diff */}
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs font-semibold text-slate-500 mb-2">
            BASE {conflict.baseTcId ? `— ${conflict.baseTcId}` : ''}
            {conflict.baseAuthor && <span className="font-normal ml-1 text-slate-400">by {conflict.baseAuthor}</span>}
          </div>
          <pre className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-auto max-h-56 font-mono leading-relaxed whitespace-pre-wrap" style={{ scrollbarWidth: 'thin' }}>
            {conflict.baseContent || '(empty)'}
          </pre>
        </div>
        <div className="p-4">
          <div className="text-xs font-semibold text-blue-600 mb-2">
            INCOMING {conflict.incomingTcId ? `— ${conflict.incomingTcId}` : ''}
            {conflict.incomingAuthor && <span className="font-normal ml-1 text-blue-400">by {conflict.incomingAuthor}</span>}
          </div>
          <pre className="text-[11px] bg-blue-50 border border-blue-100 rounded-lg p-3 overflow-auto max-h-56 font-mono leading-relaxed whitespace-pre-wrap" style={{ scrollbarWidth: 'thin' }}>
            {conflict.incomingContent || '(empty)'}
          </pre>
        </div>
      </div>

      {/* AI suggestion */}
      {conflict.aiSuggestion && (
        <div className="px-4 py-3 bg-purple-50 border-t border-purple-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-purple-700">✨ Claude Suggestion</span>
          </div>
          <pre className="text-[11px] font-mono text-purple-800 leading-relaxed whitespace-pre-wrap bg-white border border-purple-100 rounded-lg p-3 max-h-48 overflow-auto" style={{ scrollbarWidth: 'thin' }}>
            {conflict.aiSuggestion}
          </pre>
          <button
            onClick={() => onResolve(conflict.id, 'custom', conflict.aiSuggestion ?? '')}
            className="mt-2 text-xs text-purple-700 hover:text-purple-900 font-medium transition-colors"
          >
            Apply Suggestion →
          </button>
        </div>
      )}

      {/* Manual editor */}
      {editMode && (
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
          <label className="text-xs font-semibold text-slate-500 mb-1 block">Edit resolved content</label>
          <textarea
            value={manualContent || conflict.baseContent || ''}
            onChange={e => setManualContent(e.target.value)}
            rows={8}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-[11px] font-mono outline-none focus:ring-2 focus:ring-indigo-200 resize-y"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onResolve(conflict.id, 'custom', manualContent)}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              Save Resolution
            </button>
            <button
              onClick={() => setEditMode(false)}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-200 bg-white">
        <button
          onClick={() => onResolve(conflict.id, 'keep_base')}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-50 font-medium"
        >
          Keep Base
        </button>
        <button
          onClick={() => onResolve(conflict.id, 'keep_incoming')}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-50 font-medium"
        >
          Keep Incoming
        </button>
        <button
          onClick={() => { setManualContent(conflict.baseContent ?? ''); setEditMode(true); }}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-50 font-medium"
        >
          Edit Manually
        </button>
        <button
          onClick={handleAiSuggest}
          disabled={suggestLoading}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-50 disabled:opacity-50 font-medium"
        >
          {suggestLoading ? (
            <><div className="w-3 h-3 border border-purple-300 border-t-purple-600 rounded-full animate-spin" />Thinking…</>
          ) : '✨ Ask Claude'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ConflictReviewPage() {
  const [, navigate]     = useLocation();
  const { selectedProjectId } = useProject();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [filter, setFilter]       = useState<'open' | 'all'>('open');

  // ── Fetch conflicts ─────────────────────────────────────────────────────────

  const fetchConflicts = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/framework/conflicts`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(await res.text());
      setConflicts(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => { fetchConflicts(); }, [fetchConflicts]);

  // ── Resolve conflict ────────────────────────────────────────────────────────

  const resolveConflict = useCallback(async (
    id: string,
    resolution: 'keep_base' | 'keep_incoming' | 'custom',
    customContent?: string,
  ) => {
    if (!selectedProjectId) return;
    try {
      await fetch(
        `/api/projects/${selectedProjectId}/framework/conflicts/${id}/resolve`,
        {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({ resolution, content: customContent }),
        },
      );
      // Optimistically mark as resolved
      setConflicts(prev =>
        prev.map(c => c.id === id ? { ...c, status: 'resolved' } : c),
      );
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedProjectId]);

  // ── Request AI suggestion ───────────────────────────────────────────────────

  const requestAiSuggestion = useCallback(async (id: string) => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/framework/conflicts/${id}/suggest`,
        {
          method:      'POST',
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setConflicts(prev =>
        prev.map(c => c.id === id ? { ...c, aiSuggestion: data.suggestion } : c),
      );
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedProjectId]);

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!selectedProjectId) {
    return (
      <div className="flex h-full bg-background">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(v => !v)} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
            <div className="text-4xl opacity-20">⚠️</div>
            <div className="text-sm">No project selected</div>
            <Link href="/dashboard">
              <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold">← Select a Project</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayed = filter === 'open'
    ? conflicts.filter(c => c.status === 'open')
    : conflicts;

  const openCount = conflicts.filter(c => c.status === 'open').length;

  return (
    <div className="flex h-full bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(v => !v)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader />

        {/* Page header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/test-library')}
              className="text-slate-400 hover:text-slate-600 text-sm"
            >
              ← Test Library
            </button>
            <span className="text-slate-300">/</span>
            <h1 className="text-sm font-bold text-slate-800">Merge Conflicts</h1>
            {openCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                {openCount} open
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Filter toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setFilter('open')}
                className={`px-3 py-1.5 text-xs font-medium ${filter === 'open' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                Open
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 text-xs font-medium ${filter === 'all' ? 'bg-indigo-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                All
              </button>
            </div>
            <button
              onClick={fetchConflicts}
              className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-slate-200 rounded-lg"
            >
              ↺ Refresh
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Loading conflicts…
            </div>
          ) : displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="text-5xl opacity-20">✅</div>
              <div className="text-sm font-medium">
                {filter === 'open' ? 'No open conflicts' : 'No conflicts'}
              </div>
              <div className="text-xs">All assets are in sync</div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              {displayed.map(c => (
                <ConflictCard
                  key={c.id}
                  conflict={c}
                  onResolve={resolveConflict}
                  onAiSuggest={requestAiSuggestion}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
