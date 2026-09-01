import { useState, useCallback, useRef } from 'react';
import {
  Shield, Loader2, AlertCircle, Info, FolderOpen,
  ChevronRight, ChevronDown, Check, Filter, X, Plus, Upload,
} from 'lucide-react';
import { browseRepo, browseFolder, parseIgnoreFile } from '@/lib/codeLensApi';

interface FolderNode {
  name: string;
  path: string;
  hasChildren: boolean;
  fileCount?: number;
  expanded?: boolean;
  children?: FolderNode[];
  loading?: boolean;
}

interface SetupPanelProps {
  onStart: (repoUrl: string, branch: string, pat: string, folders: string[], ignorePatterns: string[]) => void;
  onResumeFixing: (repoUrl: string, branch: string, pat: string) => void;
  /** Start a review of an Azure DevOps pull request (scoped to its changed files). */
  onStartPr: (prUrl: string, pat: string, ignorePatterns: string[]) => void;
  isLoading: boolean;
  error: string | null;
  /** When true, step 1 renders inline (no full-screen centering) for the dashboard. */
  embedded?: boolean;
}

export function SetupPanel({ onStart, onResumeFixing, onStartPr, isLoading, error, embedded = false }: SetupPanelProps) {
  // ── Step 1 state ──────────────────────────────────────────────────────────
  const [step,    setStep]    = useState<1 | 2>(1);
  /** 'repo' = review a whole repo/folders; 'pr' = review one Azure DevOps PR. */
  const [reviewMode, setReviewMode] = useState<'repo' | 'pr'>('repo');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch,  setBranch]  = useState('staging');
  const [pat,     setPat]     = useState('');
  const [prUrl,   setPrUrl]   = useState('');
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError,   setConnectError]   = useState<string | null>(null);

  // ── Scan Exclusions state ─────────────────────────────────────────────────
  const [ignoreExpanded,     setIgnoreExpanded]     = useState(false);
  const [userIgnorePatterns, setUserIgnorePatterns] = useState<string[]>([]);
  const [patternInput,       setPatternInput]       = useState('');
  const [uploadStatus,       setUploadStatus]       = useState<string | null>(null);
  const [uploadLoading,      setUploadLoading]      = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step 2 state ──────────────────────────────────────────────────────────
  const [rootFolders,     setRootFolders]     = useState<FolderNode[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  // ── Connect to repo ───────────────────────────────────────────────────────
  const handleConnect = async () => {
    if (!repoUrl.trim()) return;
    setConnectLoading(true);
    setConnectError(null);
    try {
      const data = await browseRepo(repoUrl.trim(), branch.trim(), pat.trim());
      setRootFolders(
        data.folders.map((f: { name: string; path: string; hasChildren: boolean }) => ({
          ...f, expanded: false,
        })),
      );
      setStep(2);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect to repository');
    } finally {
      setConnectLoading(false);
    }
  };

  // ── Ignore file upload ────────────────────────────────────────────────────
  const handleIgnoreFileUpload = async (file: File) => {
    setUploadLoading(true);
    setUploadStatus(null);
    try {
      const content = await file.text();
      const result = await parseIgnoreFile(content);
      const newPatterns = result.patterns.filter(p => !userIgnorePatterns.includes(p));
      setUserIgnorePatterns(prev => [...prev, ...newPatterns]);
      setUploadStatus(`${result.count} patterns loaded from ${file.name}`);
    } catch {
      setUploadStatus('Failed to parse file');
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Manual pattern add/remove ─────────────────────────────────────────────
  const handleAddPattern = () => {
    const p = patternInput.trim();
    if (!p || userIgnorePatterns.includes(p)) return;
    setUserIgnorePatterns(prev => [...prev, p]);
    setPatternInput('');
  };

  const handleRemovePattern = (pattern: string) => {
    setUserIgnorePatterns(prev => prev.filter(p => p !== pattern));
  };

  // ── Folder tree expand/collapse ───────────────────────────────────────────
  const handleToggleExpand = useCallback(async (node: FolderNode, idx: number[]) => {
    if (!node.hasChildren) return;
    if (node.expanded) {
      setRootFolders(prev => collapseNode(prev, idx));
      return;
    }
    setRootFolders(prev => setNodeLoading(prev, idx, true));
    try {
      const data = await browseFolder(repoUrl.trim(), branch.trim(), pat.trim(), node.path);
      const children: FolderNode[] = data.folders.map(
        (f: { name: string; path: string; hasChildren: boolean; fileCount?: number }) => ({
          ...f, expanded: false,
        }),
      );
      setRootFolders(prev => expandNode(prev, idx, children, data.fileCount ?? 0));
    } catch {
      setRootFolders(prev => setNodeLoading(prev, idx, false));
    }
  }, [repoUrl, branch, pat]);

  const toggleSelect = (folderPath: string) => {
    setSelectedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderPath)) next.delete(folderPath);
      else next.add(folderPath);
      return next;
    });
  };

  // ── Start review ──────────────────────────────────────────────────────────
  const handleStart = () => {
    onStart(
      repoUrl.trim(),
      branch.trim(),
      pat,
      Array.from(selectedFolders),
      userIgnorePatterns,
    );
  };

  // ── Shared field style ────────────────────────────────────────────────────
  const inputStyle = {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
  };
  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = '#2563eb');
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => (e.currentTarget.style.borderColor = '#e5e7eb');

  // ── Scan Exclusions section (shared between step 1 and 2) ─────────────────
  const ScanExclusionsSection = (
    <div className="space-y-2">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIgnoreExpanded(v => !v)}
        className="w-full flex items-center justify-between text-sm font-medium"
        style={{ color: '#6b7280' }}
      >
        <span className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: '#2563eb' }} />
          Scan Exclusions
          {userIgnorePatterns.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: '#2563eb22', color: '#2563eb', border: '1px solid #2563eb44' }}
            >
              +{userIgnorePatterns.length} custom
            </span>
          )}
        </span>
        {ignoreExpanded
          ? <ChevronDown className="w-4 h-4" />
          : <ChevronRight className="w-4 h-4" />}
      </button>

      {ignoreExpanded && (
        <div
          className="rounded-lg p-4 space-y-4"
          style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}
        >
          {/* Upload .codelensignore */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-900">Upload .codelensignore file</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
              style={{ background: '#e5e7eb', color: '#374151', border: '1px dashed #e5e7eb' }}
            >
              {uploadLoading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Upload className="w-3.5 h-3.5" />}
              {uploadLoading ? 'Parsing…' : 'Choose file or drag and drop'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".codelensignore,.gitignore,.txt"
              style={{ display: 'none' }}
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleIgnoreFileUpload(f);
                e.target.value = '';
              }}
            />
            {uploadStatus && (
              <p className="text-xs" style={{ color: '#059669' }}>{uploadStatus}</p>
            )}
          </div>

          {/* Manual pattern entry */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-900">Add patterns manually</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={patternInput}
                onChange={e => setPatternInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddPattern()}
                placeholder="**/Archive/**"
                className="flex-1 rounded-lg px-3 py-2 text-xs text-gray-900 outline-none"
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
              <button
                type="button"
                onClick={handleAddPattern}
                disabled={!patternInput.trim()}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold"
                style={{
                  background: patternInput.trim() ? '#2563eb' : '#e5e7eb',
                  color:      patternInput.trim() ? '#f9fafb'  : '#9ca3af',
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          {/* Active user patterns */}
          {userIgnorePatterns.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-900">Active exclusions</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {userIgnorePatterns.map(p => (
                  <div
                    key={p}
                    className="flex items-center justify-between rounded px-2 py-1"
                    style={{ background: '#ffffff' }}
                  >
                    <span className="text-xs font-mono truncate" style={{ color: '#374151' }}>{p}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePattern(p)}
                      className="ml-2 flex-shrink-0"
                      style={{ color: '#dc2626' }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default exclusions note */}
          <div
            className="rounded-lg px-3 py-2.5 text-xs space-y-0.5"
            style={{ background: '#ffffff', border: '1px solid #e5e7eb' }}
          >
            <p className="flex items-center gap-1.5 font-medium" style={{ color: '#6b7280' }}>
              <Info className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#2563eb' }} />
              Default exclusions always active (cannot be removed):
            </p>
            <p style={{ color: '#9ca3af', paddingLeft: '18px' }}>
              Test projects (*.Tests, UnitTests, Playwright) · bin / obj / .vs ·
              Auto-generated files (*.Designer.cs, *.generated.cs) ·
              .env &amp; secret files · Build output &amp; coverage folders
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ── Step 1: Connect ───────────────────────────────────────────────────────

  if (step === 1) {
    const canConnect = repoUrl.trim().length > 0 && !connectLoading;
    const outerClass = embedded
      ? 'w-full'
      : 'min-h-screen flex items-center justify-center p-6';
    const cardClass = embedded
      ? 'w-full rounded-xl border p-6 space-y-5'
      : 'w-full max-w-lg rounded-xl border p-8 space-y-6';
    return (
      <div className={outerClass}
           style={embedded ? undefined : { background: '#f9fafb' }}>
        <div className={cardClass}
             style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>

          {embedded ? (
            // Dashboard hero already shows the ASTRA title — just a step label here.
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider"
                 style={{ color: '#2563eb' }}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px]"
                    style={{ background: '#2563eb22' }}>1</span>
              Connect to repository
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Shield className="w-7 h-7" style={{ color: '#2563eb' }} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">ASTRA Code Lens</h1>
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  Step 1 of 2 — Connect to repository
                </p>
              </div>
            </div>
          )}

          {/* Review mode toggle: whole repo vs a single pull request */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
            {(['repo', 'pr'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setReviewMode(m)}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors"
                style={{
                  background: reviewMode === m ? '#2563eb' : 'transparent',
                  color:      reviewMode === m ? '#f9fafb'  : '#6b7280',
                }}
              >
                {m === 'repo' ? 'Full Repository' : 'Pull Request'}
              </button>
            ))}
          </div>

          {reviewMode === 'pr' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Pull Request URL</label>
                <input
                  type="text"
                  value={prUrl}
                  onChange={e => setPrUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && prUrl.trim() && !isLoading && onStartPr(prUrl.trim(), pat, userIgnorePatterns)}
                  placeholder="https://dev.azure.com/org/proj/_git/repo/pullrequest/123"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none"
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-900">Personal Access Token (PAT)</label>
                <input
                  type="password"
                  value={pat}
                  onChange={e => setPat(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none"
                  style={inputStyle}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <p className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
                  <Info className="w-3.5 h-3.5 flex-shrink-0" />
                  Token requires <strong className="text-gray-900">Code: Read &amp; Write</strong> to post comments
                </p>
              </div>

              {ScanExclusionsSection}

              {error && (
                <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                     style={{ background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <button
                disabled={!prUrl.trim() || isLoading}
                onClick={() => onStartPr(prUrl.trim(), pat, userIgnorePatterns)}
                className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold"
                style={{
                  background: prUrl.trim() && !isLoading ? '#2563eb' : '#e5e7eb',
                  color:      prUrl.trim() && !isLoading ? '#f9fafb'  : '#9ca3af',
                  cursor:     prUrl.trim() && !isLoading ? 'pointer'  : 'not-allowed',
                }}
              >
                {isLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Reviewing PR…</>
                  : <><Shield className="w-4 h-4" />Review PR</>}
              </button>
              <p className="text-[11px] text-center" style={{ color: '#9ca3af' }}>
                Reviews only the files changed in the PR against the Insurity coding standards.
                You choose which comments to post back.
              </p>
            </>
          ) : (
          <>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-900">Repository URL</label>
            <input
              type="text"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && canConnect && handleConnect()}
              placeholder="https://dev.azure.com/org/proj/_git/repo"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none"
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-900">Branch</label>
            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="staging"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none"
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-900">Personal Access Token (PAT)</label>
            <input
              type="password"
              value={pat}
              onChange={e => setPat(e.target.value)}
              placeholder="••••••••••••••••••••••••••••••••"
              className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 outline-none"
              style={inputStyle}
              onFocus={focusOn}
              onBlur={focusOff}
            />
            <p className="flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
              <Info className="w-3.5 h-3.5 flex-shrink-0" />
              Token requires <strong className="text-gray-900">Code: Read</strong> permission
            </p>
          </div>

          {ScanExclusionsSection}

          {connectError && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                 style={{ background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {connectError}
            </div>
          )}
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                 style={{ background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            disabled={!canConnect}
            onClick={handleConnect}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold"
            style={{
              background: canConnect ? '#2563eb' : '#e5e7eb',
              color:      canConnect ? '#f9fafb'  : '#9ca3af',
              cursor:     canConnect ? 'pointer'  : 'not-allowed',
            }}
          >
            {connectLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Connecting…</>
              : <><FolderOpen className="w-4 h-4" />Connect &amp; Browse Folders</>}
          </button>

          {/* Resume fixing — skip the review, load open violations from the last run */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
            <span className="text-[10px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>or</span>
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
          </div>
          <button
            disabled={!repoUrl.trim() || isLoading || connectLoading}
            onClick={() => onResumeFixing(repoUrl.trim(), branch.trim(), pat)}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold"
            style={{
              background: 'transparent',
              color: repoUrl.trim() && !isLoading ? '#059669' : '#9ca3af',
              border: `1px solid ${repoUrl.trim() && !isLoading ? '#05966950' : '#e5e7eb'}`,
              cursor: repoUrl.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            {isLoading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Loading previous review…</>
              : <>↻ Resume fixing from last review</>}
          </button>
          <p className="text-[11px] text-center" style={{ color: '#9ca3af' }}>
            Loads the open violations from your most recent review of this repo &amp; branch —
            no re-scan needed.
          </p>
          </>
          )}
        </div>
      </div>
    );
  }

  // ── Step 2: Folder selection ───────────────────────────────────────────────
  // In embedded (dashboard) mode this renders as a full-screen overlay so the
  // folder tree isn't constrained to the narrow dashboard column.

  return (
    <div className={embedded
            ? 'fixed inset-0 z-50 flex items-center justify-center p-6 overflow-auto'
            : 'min-h-screen flex items-center justify-center p-6'}
         style={{ background: embedded ? 'rgba(10,22,40,0.96)' : '#f9fafb' }}>
      <div className="w-full max-w-2xl rounded-xl border p-8 space-y-6"
           style={{ background: '#ffffff', borderColor: '#e5e7eb' }}>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7" style={{ color: '#2563eb' }} />
            <div>
              <h1 className="text-xl font-bold text-gray-900">ASTRA Code Lens</h1>
              <p className="text-sm" style={{ color: '#6b7280' }}>Step 2 of 2 — Select folders to review</p>
            </div>
          </div>
          <button onClick={() => setStep(1)} className="text-xs" style={{ color: '#9ca3af' }}>
            ← Back
          </button>
        </div>

        {/* Repo chip */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
             style={{ background: '#f9fafb', border: '1px solid #e5e7eb', color: '#6b7280' }}>
          <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#2563eb' }} />
          <span className="font-mono truncate text-gray-900">{repoUrl}</span>
          <span className="flex-shrink-0">· {branch}</span>
        </div>

        <p className="text-xs" style={{ color: '#6b7280' }}>
          Select specific folders to review, or leave all unselected to review the entire repository.
        </p>

        {/* Folder tree */}
        <div className="rounded-lg overflow-y-auto"
             style={{ maxHeight: '280px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
          {rootFolders.length === 0 ? (
            <div className="text-xs text-center py-8" style={{ color: '#9ca3af' }}>
              No top-level folders found
            </div>
          ) : (
            <div className="py-1">
              {rootFolders.map((node, i) => (
                <FolderTreeNode
                  key={node.path}
                  node={node}
                  idx={[i]}
                  depth={0}
                  selectedFolders={selectedFolders}
                  onToggleSelect={toggleSelect}
                  onToggleExpand={handleToggleExpand}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-xs" style={{ color: '#6b7280' }}>
          {selectedFolders.size === 0
            ? 'Entire repository will be reviewed'
            : `${selectedFolders.size} folder${selectedFolders.size > 1 ? 's' : ''} selected`}
        </div>

        {ScanExclusionsSection}

        {error && (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
               style={{ background: '#fef2f2', border: '1px solid #dc2626', color: '#dc2626' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <button
          disabled={isLoading}
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold"
          style={{
            background: !isLoading ? '#2563eb' : '#e5e7eb',
            color:      !isLoading ? '#f9fafb'  : '#9ca3af',
            cursor:     !isLoading ? 'pointer'  : 'not-allowed',
          }}
        >
          {isLoading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Starting review…</>
            : <><Shield className="w-4 h-4" />Start Code Review</>}
        </button>
      </div>
    </div>
  );
}

// ─── Folder tree node ─────────────────────────────────────────────────────────

interface FolderTreeNodeProps {
  node: FolderNode;
  idx: number[];
  depth: number;
  selectedFolders: Set<string>;
  onToggleSelect: (path: string) => void;
  onToggleExpand: (node: FolderNode, idx: number[]) => void;
}

function FolderTreeNode({ node, idx, depth, selectedFolders, onToggleSelect, onToggleExpand }: FolderTreeNodeProps) {
  const isSelected = selectedFolders.has(node.path);
  return (
    <>
      <div
        className="flex items-center gap-1.5 py-1.5 cursor-pointer"
        style={{ paddingLeft: `${12 + depth * 16}px`, background: isSelected ? '#2563eb11' : 'transparent' }}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggleExpand(node, idx); }}
          className="flex-shrink-0 w-4 h-4 flex items-center justify-center"
          style={{ color: node.hasChildren ? '#6b7280' : 'transparent', cursor: node.hasChildren ? 'pointer' : 'default' }}
        >
          {node.loading
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : node.hasChildren
              ? node.expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
              : null}
        </button>

        <button
          onClick={() => onToggleSelect(node.path)}
          className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
          style={{
            background: isSelected ? '#2563eb' : 'transparent',
            border: `1px solid ${isSelected ? '#2563eb' : '#e5e7eb'}`,
          }}
        >
          {isSelected && <Check className="w-3 h-3" style={{ color: '#f9fafb' }} />}
        </button>

        <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: '#2563eb' }} />
        <span
          className="text-xs truncate flex-1"
          style={{ color: isSelected ? '#2563eb' : '#374151' }}
          onClick={() => onToggleSelect(node.path)}
        >
          {node.name}
        </span>

        {typeof node.fileCount === 'number' && node.fileCount > 0 && (
          <span className="text-[10px] px-1.5 rounded-full flex-shrink-0 mr-2"
                style={{ background: '#e5e7eb', color: '#9ca3af' }}>
            {node.fileCount} .cs
          </span>
        )}
      </div>

      {node.expanded && node.children?.map((child, i) => (
        <FolderTreeNode
          key={child.path}
          node={child}
          idx={[...idx, i]}
          depth={depth + 1}
          selectedFolders={selectedFolders}
          onToggleSelect={onToggleSelect}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </>
  );
}

// ─── Immutable tree helpers ───────────────────────────────────────────────────

function collapseNode(nodes: FolderNode[], idx: number[]): FolderNode[] {
  return nodes.map((n, i) => {
    if (i !== idx[0]) return n;
    if (idx.length === 1) return { ...n, expanded: false };
    return { ...n, children: collapseNode(n.children ?? [], idx.slice(1)) };
  });
}

function setNodeLoading(nodes: FolderNode[], idx: number[], loading: boolean): FolderNode[] {
  return nodes.map((n, i) => {
    if (i !== idx[0]) return n;
    if (idx.length === 1) return { ...n, loading };
    return { ...n, children: setNodeLoading(n.children ?? [], idx.slice(1), loading) };
  });
}

function expandNode(nodes: FolderNode[], idx: number[], children: FolderNode[], fileCount: number): FolderNode[] {
  return nodes.map((n, i) => {
    if (i !== idx[0]) return n;
    if (idx.length === 1) return { ...n, expanded: true, loading: false, children, fileCount };
    return { ...n, children: expandNode(n.children ?? [], idx.slice(1), children, fileCount) };
  });
}
