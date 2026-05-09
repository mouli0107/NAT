// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 5: Test Library (redesign)
// client/src/pages/test-library.tsx
//
// Three-panel layout:
//   Left  240px  — project tree (modules → features)
//   Center flex  — TC list (specs from merger engine)
//   Right  320px — TC detail + script preview
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { Sidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { useProject } from '@/contexts/ProjectContext';
import { useProjectTree } from '@/hooks/useProjectTree';
import { useDownload } from '@/hooks/useDownload';
import type { FrameworkModule, FrameworkFeature } from '@/hooks/useProjectTree';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpecAsset {
  id: string;
  projectId: string;
  assetType: string;
  assetKey: string;   // TC sequence e.g. "TC-001"
  filePath: string;   // "tests/Login/HappyPath/TC-001-login.spec.ts"
  contentHash: string | null;
  unitName: string | null;
  layer: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  sourceTcId: string | null;
}

interface SpecAssetDetail extends SpecAsset {
  content: string;
}

interface ConflictRow {
  id: string;
  assetKey: string;
  conflictType: string | null;
  status: string | null;
  createdAt: string | null;
}

/** Extract module/feature from a spec filePath */
function parseSpecPath(filePath: string): { module: string; feature: string | null } {
  // Pattern: tests/<Module>/<Feature>/<file>.spec.ts
  //      or: tests/<Module>/<file>.spec.ts
  const parts = filePath.replace(/^tests\//, '').split('/');
  if (parts.length >= 3) return { module: parts[0], feature: parts[1] };
  if (parts.length === 2) return { module: parts[0], feature: null };
  return { module: parts[0] ?? 'Other', feature: null };
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000)  return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ── DownloadDropdown ─────────────────────────────────────────────────────────

function DownloadDropdown({
  projectId,
  selectedModule,
  selectedFeature,
  selectedTcIds,
  projectName,
}: {
  projectId: string;
  selectedModule: FrameworkModule | null;
  selectedFeature: FrameworkFeature | null;
  selectedTcIds: Set<string>;
  projectName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { download, downloadSelected, downloading, progress } = useDownload(projectId);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        disabled={downloading}
        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {downloading ? '⏳' : '⬇'} Download ▾
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
          <DownloadOption
            label="Entire Project"
            subtitle="All modules and TCs"
            onClick={() => { download('project', undefined, 'entire project', projectName); setOpen(false); }}
          />
          <DownloadOption
            label={selectedModule ? `Module: ${selectedModule.name}` : 'Module (select one)'}
            subtitle={selectedModule ? 'All TCs in this module' : 'Select a module first'}
            disabled={!selectedModule}
            onClick={() => {
              if (selectedModule) {
                download('module', selectedModule.name, selectedModule.name, projectName);
                setOpen(false);
              }
            }}
          />
          <DownloadOption
            label={selectedFeature ? `Feature: ${selectedFeature.name}` : 'Feature (select one)'}
            subtitle={selectedFeature ? 'All TCs in this feature' : 'Select a feature first'}
            disabled={!selectedFeature}
            onClick={() => {
              if (selectedModule && selectedFeature) {
                download('feature', `${selectedModule.name}/${selectedFeature.name}`, selectedFeature.name, projectName);
                setOpen(false);
              }
            }}
          />
          <DownloadOption
            label="Selected TCs"
            subtitle={selectedTcIds.size > 0 ? `${selectedTcIds.size} selected` : 'No TCs selected'}
            disabled={selectedTcIds.size === 0}
            onClick={() => {
              downloadSelected(Array.from(selectedTcIds), projectName);
              setOpen(false);
            }}
          />
        </div>
      )}

      {/* Toast when building */}
      {downloading && progress && (
        <div className="fixed bottom-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-50">
          <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-700">{progress}</span>
        </div>
      )}
    </div>
  );
}

function DownloadOption({
  label, subtitle, disabled, onClick,
}: { label: string; subtitle: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3 border-b last:border-0 border-slate-100 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'}`}
    >
      <div className="text-sm font-medium text-slate-800">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
    </button>
  );
}

// ── ProjectTree (left panel) ─────────────────────────────────────────────────

function ProjectTree({
  projectId,
  modules,
  loading,
  specsForModule,
  selectedModuleId,
  selectedFeatureId,
  onSelectModule,
  onSelectFeature,
  onAddModule,
  totalSpecs,
}: {
  projectId: string;
  modules: FrameworkModule[];
  loading: boolean;
  specsForModule: (moduleName: string, featureName?: string) => number;
  selectedModuleId: string | null;
  selectedFeatureId: string | null;
  onSelectModule: (m: FrameworkModule | null) => void;
  onSelectFeature: (f: FrameworkFeature | null, m: FrameworkModule) => void;
  onAddModule: () => void;
  totalSpecs: number;
}) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModule = (id: string) => {
    setExpandedModules(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const recordedCount = totalSpecs;
  const totalCount    = Math.max(totalSpecs, modules.reduce((s, m) => s + m.features.length, 0));
  const pct           = totalCount > 0 ? Math.round((recordedCount / totalCount) * 100) : 0;

  return (
    <div className="w-60 flex-shrink-0 border-r border-slate-200 flex flex-col bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Framework Tree</span>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-auto px-2 py-2 space-y-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.15) transparent' }}>
        {loading && (
          <div className="text-xs text-slate-500 text-center py-6">Loading…</div>
        )}

        {!loading && modules.length === 0 && (
          <div className="text-xs text-slate-500 text-center py-6 px-3">
            No modules yet.<br />
            <span className="text-slate-600">Click + Add Module to start.</span>
          </div>
        )}

        {modules.map(mod => {
          const modCount = specsForModule(mod.name);
          const isSelMod = selectedModuleId === mod.id;
          const isExpanded = expandedModules.has(mod.id);

          return (
            <div key={mod.id}>
              {/* Module row */}
              <div
                onClick={() => { toggleModule(mod.id); onSelectModule(isSelMod && isExpanded ? null : mod); }}
                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors ${
                  isSelMod && !selectedFeatureId
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <span className="text-slate-500 w-3 text-center transition-transform" style={{ transform: isExpanded ? 'rotate(90deg)' : '' }}>
                  {mod.features.length > 0 ? '▶' : '·'}
                </span>
                <span className="text-slate-400">📁</span>
                <span className="flex-1 font-medium truncate">{mod.name}</span>
                {/* Progress ring — simple badge */}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${
                  modCount > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/5 text-slate-500'
                }`}>
                  {modCount}
                </span>
              </div>

              {/* Features */}
              {isExpanded && mod.features.map(feat => {
                const featCount = specsForModule(mod.name, feat.name);
                const isSel     = selectedFeatureId === feat.id;
                return (
                  <div
                    key={feat.id}
                    onClick={() => onSelectFeature(isSel ? null : feat, mod)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-[11px] ml-4 transition-colors ${
                      isSel
                        ? 'bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-400 ml-3'
                        : 'hover:bg-white/5 text-slate-400'
                    }`}
                  >
                    <span className="text-slate-600">↳</span>
                    <span className="flex-1 truncate">{feat.name}</span>
                    <span className={`text-[9px] px-1 py-0.5 rounded-full ${
                      featCount > 0 ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-600'
                    }`}>
                      {featCount}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Progress bar + Add Module */}
      <div className="px-3 py-2 border-t border-slate-700/50 flex-shrink-0">
        <div className="text-[10px] text-slate-500 mb-1">
          {recordedCount} spec{recordedCount !== 1 ? 's' : ''} recorded
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5 mb-2">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <button
          onClick={onAddModule}
          className="w-full px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 text-xs hover:border-indigo-500 hover:text-indigo-400 transition-colors text-left"
        >
          + Add Module
        </button>
      </div>
    </div>
  );
}

// ── TestCaseList (center panel) ──────────────────────────────────────────────

function TestCaseList({
  specs,
  loading,
  selectedTcIds,
  activeTcKey,
  selectedModule,
  selectedFeature,
  onToggle,
  onSelectTc,
  onRecordNew,
}: {
  specs: SpecAsset[];
  loading: boolean;
  selectedTcIds: Set<string>;
  activeTcKey: string | null;
  selectedModule: FrameworkModule | null;
  selectedFeature: FrameworkFeature | null;
  onToggle: (key: string) => void;
  onSelectTc: (spec: SpecAsset) => void;
  onRecordNew: () => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = specs.filter(s =>
    !search ||
    s.assetKey.toLowerCase().includes(search.toLowerCase()) ||
    s.filePath.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedCount = selectedTcIds.size;

  const breadcrumb = selectedFeature
    ? `${selectedModule?.name ?? '?'} / ${selectedFeature.name}`
    : selectedModule
    ? selectedModule.name
    : 'All Specs';

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-white overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <span className="text-sm font-semibold text-slate-700 truncate">{breadcrumb}</span>
        <span className="text-[10px] text-slate-400 ml-1">{filtered.length} TC{filtered.length !== 1 ? 's' : ''}</span>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search TCs…"
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-400 w-36"
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex-shrink-0">
          <span className="text-xs text-indigo-700 font-medium">{selectedCount} selected</span>
          <button className="text-xs text-indigo-600 hover:underline" onClick={() => { /* bulk run */ }}>▶ Run</button>
          <button
            className="ml-auto text-xs text-slate-500 hover:text-slate-700"
            onClick={() => { /* clear */ }}
          >✕ Clear</button>
        </div>
      )}

      {/* TC rows */}
      <div className="flex-1 overflow-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(148,163,184,0.2) transparent' }}>
        {loading && (
          <div className="text-xs text-slate-400 text-center py-10">Loading specs…</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <span className="text-3xl opacity-30">📄</span>
            <span className="text-sm">{search ? 'No matching TCs' : 'No specs recorded yet'}</span>
            <button
              onClick={onRecordNew}
              className="mt-2 px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-semibold"
            >
              + Record New TC
            </button>
          </div>
        )}

        {filtered.map(spec => {
          const isActive   = activeTcKey === spec.assetKey;
          const isSelected = selectedTcIds.has(spec.assetKey);
          const { module, feature } = parseSpecPath(spec.filePath);

          return (
            <div
              key={spec.id}
              onClick={() => onSelectTc(spec)}
              className={`group flex items-center gap-3 px-4 py-3 border-b border-slate-100 cursor-pointer transition-all ${
                isActive
                  ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                  : 'hover:bg-slate-50'
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(spec.assetKey)}
                onClick={e => e.stopPropagation()}
                className="w-3.5 h-3.5 rounded accent-indigo-500 flex-shrink-0"
              />

              <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" title="Recorded" />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-slate-400 flex-shrink-0">{spec.assetKey}</span>
                  <span className="text-xs font-medium text-slate-700 truncate">{spec.filePath.split('/').pop()?.replace('.spec.ts', '')}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {feature ? `${module} / ${feature}` : module}
                  {spec.updatedAt && <span className="ml-2">{timeAgo(spec.updatedAt)}</span>}
                </div>
              </div>

              <span className="text-[10px] text-indigo-500 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity">
                View →
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 flex-shrink-0">
        <button
          onClick={onRecordNew}
          className="text-sm text-indigo-600 hover:underline"
        >
          + Record New TC
        </button>
      </div>
    </div>
  );
}

// ── TCDetailPanel (right panel) ──────────────────────────────────────────────

function TCDetailPanel({
  spec,
  loading,
  onRerecord,
  onDownload,
}: {
  spec: SpecAssetDetail | null;
  loading: boolean;
  onRerecord: () => void;
  onDownload: (assetKey: string) => void;
}) {
  if (!spec && !loading) {
    return (
      <div className="w-80 flex-shrink-0 border-l border-slate-200 flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-400 text-center px-6">
          <div className="text-3xl mb-2 opacity-20">📋</div>
          Select a test case to preview
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-80 flex-shrink-0 border-l border-slate-200 flex items-center justify-center bg-slate-50">
        <div className="text-xs text-slate-400">Loading…</div>
      </div>
    );
  }

  if (!spec) return null;

  const { module, feature } = parseSpecPath(spec.filePath);
  const tcName = spec.filePath.split('/').pop()?.replace('.spec.ts', '') ?? spec.assetKey;
  const preview = spec.content ? spec.content.slice(0, 1200) : '';

  return (
    <div className="w-80 flex-shrink-0 border-l border-slate-200 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] text-slate-400">{spec.assetKey}</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">recorded</span>
        </div>
        <h2 className="text-sm font-semibold text-slate-800 truncate" title={tcName}>{tcName}</h2>
      </div>

      {/* Metadata */}
      <div className="px-4 py-3 border-b border-slate-200 space-y-1.5 text-xs flex-shrink-0">
        <MetaRow label="Module"  value={module} />
        {feature && <MetaRow label="Feature" value={feature} />}
        <MetaRow label="File"    value={spec.filePath.split('/').pop() ?? ''} />
        <MetaRow label="Updated" value={timeAgo(spec.updatedAt)} />
      </div>

      {/* Script preview */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Script Preview</span>
          <button
            onClick={() => navigator.clipboard.writeText(spec.content)}
            className="text-[10px] text-slate-400 hover:text-indigo-600 px-2 py-0.5 rounded bg-slate-100"
          >
            📋 Copy
          </button>
        </div>
        <pre className="text-[10px] bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-auto max-h-64 font-mono leading-relaxed whitespace-pre-wrap" style={{ scrollbarWidth: 'thin' }}>
          {preview || 'No script content'}
          {spec.content && spec.content.length > 1200 && <span className="text-slate-400">\n… ({spec.content.length - 1200} more chars)</span>}
        </pre>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-slate-200 flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={onRerecord}
          className="w-full py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          🎙 Re-record
        </button>
        <button
          onClick={() => onDownload(spec.assetKey)}
          className="w-full py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          ⬇ Download TC
        </button>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-slate-400 w-16 flex-shrink-0">{label}</span>
      <span className="text-slate-700 truncate flex-1" title={value}>{value || '—'}</span>
    </div>
  );
}

// ── AddModuleModal ────────────────────────────────────────────────────────────

function AddModuleModal({
  projectId,
  onCreated,
  onClose,
}: {
  projectId: string;
  onCreated: () => void;
  onClose: () => void;
}) {
  const [name, setName]   = useState('');
  const [desc, setDesc]   = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/framework/modules`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ name: name.trim(), description: desc.trim() || undefined }),
      });
      onCreated();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Add Module</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Module name *</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onClose(); }}
              placeholder="e.g. Login, Checkout, Admin"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Description (optional)</label>
            <input
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Brief description…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !name.trim()}
            className="flex-1 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TestLibraryPage() {
  const [, navigate]                 = useLocation();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { selectedProjectId }        = useProject();

  // Tree
  const { tree, loading: treeLoading, refresh: refreshTree } = useProjectTree(selectedProjectId);
  const modules = tree?.modules ?? [];

  // Selection state
  const [selectedModuleId, setSelectedModuleId]   = useState<string | null>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  const selectedModule  = modules.find(m => m.id === selectedModuleId) ?? null;
  const selectedFeature = selectedModule?.features.find(f => f.id === selectedFeatureId) ?? null;

  // Specs
  const [specs, setSpecs]             = useState<SpecAsset[]>([]);
  const [specsLoading, setSpecsLoading] = useState(false);
  const [activeTcKey, setActiveTcKey] = useState<string | null>(null);
  const [activeTcDetail, setActiveTcDetail] = useState<SpecAssetDetail | null>(null);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [selectedTcIds, setSelectedTcIds]   = useState<Set<string>>(new Set());

  // Conflicts
  const [conflicts, setConflicts]   = useState<ConflictRow[]>([]);

  // UI
  const [showAddModule, setShowAddModule] = useState(false);

  // Fetch specs for the project
  const fetchSpecs = useCallback(async () => {
    if (!selectedProjectId) return;
    setSpecsLoading(true);
    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/framework/assets?type=spec`,
        { credentials: 'include' },
      );
      if (res.ok) setSpecs(await res.json());
    } finally {
      setSpecsLoading(false);
    }
  }, [selectedProjectId]);

  const fetchConflicts = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/framework/conflicts`,
        { credentials: 'include' },
      );
      if (res.ok) setConflicts(await res.json());
    } catch {}
  }, [selectedProjectId]);

  useEffect(() => {
    fetchSpecs();
    fetchConflicts();
  }, [fetchSpecs, fetchConflicts]);

  // Highlight TC from URL query ?highlight=TC-042
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hl = params.get('highlight');
    if (hl) setActiveTcKey(hl);
  }, []);

  // Load TC detail when selected
  const loadTcDetail = async (spec: SpecAsset) => {
    setActiveTcKey(spec.assetKey);
    setDetailLoading(true);
    setActiveTcDetail(null);
    try {
      const res = await fetch(
        `/api/projects/${selectedProjectId}/framework/assets/${encodeURIComponent(spec.assetKey)}`,
        { credentials: 'include' },
      );
      if (res.ok) setActiveTcDetail(await res.json());
    } finally {
      setDetailLoading(false);
    }
  };

  // Filter specs by selected module/feature
  const filteredSpecs: SpecAsset[] = specs.filter(s => {
    const { module, feature } = parseSpecPath(s.filePath);
    if (selectedFeature && selectedModule) {
      return module === selectedModule.name && feature === selectedFeature.name;
    }
    if (selectedModule) {
      return module === selectedModule.name;
    }
    return true;
  });

  // Count specs per module/feature (used by tree progress rings)
  const specsForModule = (moduleName: string, featureName?: string): number => {
    return specs.filter(s => {
      const { module, feature } = parseSpecPath(s.filePath);
      if (featureName) return module === moduleName && feature === featureName;
      return module === moduleName;
    }).length;
  };

  const toggleTc = (key: string) => {
    setSelectedTcIds(prev => {
      const s = new Set(prev);
      s.has(key) ? s.delete(key) : s.add(key);
      return s;
    });
  };

  const handleDownloadSingle = (assetKey: string) => {
    if (!selectedProjectId) return;
    const { downloadSelected } = useDownloadSingle(selectedProjectId);
    downloadSelected([assetKey], 'TestSuite');
  };

  // Project guard
  if (!selectedProjectId) {
    return (
      <div className="flex h-full bg-background">
        <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(v => !v)} />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <div className="flex-1 flex items-center justify-center text-slate-400 flex-col gap-3">
            <div className="text-4xl opacity-20">🗂</div>
            <div className="text-sm">No project selected</div>
            <Link href="/dashboard">
              <button className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-semibold">← Select a Project</button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Derive projectName from URL or use placeholder
  const projectName = 'TestSuite';

  return (
    <div className="flex h-full bg-background">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(v => !v)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Header ── */}
        <DashboardHeader />

        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white flex-shrink-0">
          <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Test Library</h1>

          <div className="flex items-center gap-3">
            {/* Conflict badge */}
            {conflicts.length > 0 && (
              <button className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-medium hover:bg-amber-100">
                ⚠️ {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}
              </button>
            )}

            <DownloadDropdown
              projectId={selectedProjectId}
              selectedModule={selectedModule}
              selectedFeature={selectedFeature}
              selectedTcIds={selectedTcIds}
              projectName={projectName}
            />

            <Link href="/recorder">
              <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-all">
                + New Recording
              </button>
            </Link>
          </div>
        </header>

        {/* ── Three panels ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* LEFT — Project tree */}
          <ProjectTree
            projectId={selectedProjectId}
            modules={modules}
            loading={treeLoading}
            specsForModule={specsForModule}
            selectedModuleId={selectedModuleId}
            selectedFeatureId={selectedFeatureId}
            onSelectModule={m => {
              setSelectedModuleId(m?.id ?? null);
              setSelectedFeatureId(null);
            }}
            onSelectFeature={(f, m) => {
              setSelectedModuleId(m.id);
              setSelectedFeatureId(f?.id ?? null);
            }}
            onAddModule={() => setShowAddModule(true)}
            totalSpecs={specs.length}
          />

          {/* CENTER — TC list */}
          <TestCaseList
            specs={filteredSpecs}
            loading={specsLoading}
            selectedTcIds={selectedTcIds}
            activeTcKey={activeTcKey}
            selectedModule={selectedModule}
            selectedFeature={selectedFeature}
            onToggle={toggleTc}
            onSelectTc={loadTcDetail}
            onRecordNew={() => navigate('/recorder')}
          />

          {/* RIGHT — Detail */}
          <TCDetailPanel
            spec={activeTcDetail}
            loading={detailLoading}
            onRerecord={() => navigate('/recorder')}
            onDownload={(key) => {
              fetch(`/api/projects/${selectedProjectId}/framework/download/selected`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ selectedTcIds: [key], projectName }),
              })
                .then(r => r.blob())
                .then(blob => {
                  const a = document.createElement('a');
                  a.href = URL.createObjectURL(blob);
                  a.download = `${key}.zip`;
                  a.click();
                })
                .catch(() => {});
            }}
          />
        </div>
      </div>

      {/* Add Module modal */}
      {showAddModule && (
        <AddModuleModal
          projectId={selectedProjectId}
          onCreated={() => { refreshTree(); fetchSpecs(); }}
          onClose={() => setShowAddModule(false)}
        />
      )}
    </div>
  );
}

// Small inline hook for single-TC download (avoids prop drilling)
function useDownloadSingle(projectId: string) {
  return {
    downloadSelected: async (tcIds: string[], projectName: string) => {
      const res = await fetch(`/api/projects/${projectId}/framework/download/selected`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedTcIds: tcIds, projectName }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${tcIds[0]}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
  };
}
