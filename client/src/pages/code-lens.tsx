import { useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { DashboardLanding }   from '@/components/code-lens/DashboardLanding';
import { CodeLensErrorBoundary } from '@/components/code-lens/CodeLensErrorBoundary';
import { FileTreePanel }      from '@/components/code-lens/FileTreePanel';
import { ViolationCard }      from '@/components/code-lens/ViolationCard';
import { ReviewProgress }     from '@/components/code-lens/ReviewProgress';
import type { ReviewStatus }  from '@/components/code-lens/ReviewProgress';
import { CodeViewerPanel }    from '@/components/code-lens/CodeViewerPanel';
import { ReportPanel }        from '@/components/code-lens/ReportPanel';
import { StandardsChecklist } from '@/components/code-lens/StandardsChecklist';
import { CommonIssues }       from '@/components/code-lens/CommonIssues';
import type { BulkFixProgress } from '@/components/code-lens/CommonIssues';
import { RunHistory }         from '@/components/code-lens/RunHistory';
import { RunComparison }      from '@/components/code-lens/RunComparison';
import { PrCommentsPanel }    from '@/components/code-lens/PrCommentsPanel';
import type { PrPostState }   from '@/components/code-lens/PrCommentsPanel';
import { CodeLensTopNav }     from '@/components/code-lens/CodeLensTopNav';
import { Sidebar }            from '@/components/dashboard/sidebar';
import '@/components/code-lens/code-lens.css';
import { useCodeLensStream }  from '@/hooks/useCodeLensStream';
import { ArchitectureView }    from '@/components/code-lens/ArchitectureView';
import {
  startReview,
  stopReview,
  resumeReview,
  requestFix,
  acceptFix,
  bulkFixStandard,
  updateViolationStatus,
  fetchFileContent,
  getReportUrl,
  pushFixes,
  resumeFixing,
  retryCoverage,
  type StartReviewOptions,
  startPrReview,
  postPrComment,
  previewPrComment,
  type PrInfo,
} from '@/lib/codeLensApi';
import { LoopPanel, type LoopUiState, type ScreenedFix } from '@/components/code-lens/LoopPanel';
import { AutomationPanel } from '@/components/code-lens/AutomationPanel';
import type {
  CodeLensEvent,
  FileRecord,
  ViolationRecord,
  FixPreview,
  ReviewSummary,
  StandardCheckResult,
  FilesDiscoveredEvent,
  RunStatus,
  CoverageInfo,
  ArchitectureGraph,
} from '@/components/code-lens/codeLensTypes';
import type { RunSummary } from '@/lib/codeLensHistoryApi';

type PageMode = 'SETUP' | 'REVIEW' | 'REPORT' | 'HISTORY' | 'COMPARE' | 'AUTOMATION';

function CodeLensPageInner() {
  // ── Mode ─────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<PageMode>('SETUP');
  // Global app sidebar (left menu) collapse state.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // ── Session ───────────────────────────────────────────────────────────────
  const [sessionId,      setSessionId]      = useState<string | null>(null);
  const [isStartLoading, setIsStartLoading] = useState(false);
  const [startError,     setStartError]     = useState<string | null>(null);

  // ── Files ─────────────────────────────────────────────────────────────────
  const [files,        setFiles]        = useState<FileRecord[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});

  // ── Violations ────────────────────────────────────────────────────────────
  const [violations,   setViolations]   = useState<ViolationRecord[]>([]);
  const [fixLoadingId, setFixLoadingId] = useState<string | null>(null);
  const [fixPreviews,  setFixPreviews]  = useState<Record<string, FixPreview>>({});

  // ── Progress ──────────────────────────────────────────────────────────────
  const [progress,        setProgress]        = useState({ current: 0, total: 0 });
  const [currentFileName, setCurrentFileName] = useState('');
  const [stats,           setStats]           = useState({ critical: 0, warning: 0, passed: 0 });

  // ── Review status (FIX 3) ─────────────────────────────────────────────────
  const [reviewStatus,   setReviewStatus]   = useState<ReviewStatus>('running');
  const [statusMessage,  setStatusMessage]  = useState<string>('Cloning repository…');

  // ── Discovery banner ──────────────────────────────────────────────────────
  const [discoverySummary,   setDiscoverySummary]   = useState<FilesDiscoveredEvent | null>(null);
  const [showDiscoveryBanner, setShowDiscoveryBanner] = useState(false);

  // ── Monaco scroll ─────────────────────────────────────────────────────────
  const [scrollToLine, setScrollToLine] = useState<number | null>(null);

  // ── Standards checklist ────────────────────────────────────────────────────
  const [fileStandardResults, setFileStandardResults] =
    useState<Record<string, StandardCheckResult[]>>({});
  const [rightTab, setRightTab] = useState<'checklist' | 'violations' | 'common' | 'pr'>('checklist');

  // ── Pull-request review mode ───────────────────────────────────────────────
  const [prInfo,          setPrInfo]          = useState<PrInfo | null>(null);
  // PAT is held in memory only (never persisted) so we can re-send it when the
  // user posts selected comments back to the PR.
  const [prPat,           setPrPat]           = useState<string>('');
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [prPostState,     setPrPostState]     = useState<PrPostState>('idle');
  const [prPostMessage,   setPrPostMessage]   = useState<string>('');
  const [prCopyMessage,   setPrCopyMessage]   = useState<string>('');

  // ── Bulk fix progress (per standard_id) ───────────────────────────────────────
  const [bulkProgress, setBulkProgress] = useState<Record<string, BulkFixProgress>>({});

  // ── Fix branch / push state ───────────────────────────────────────────────────
  const [fixBranch,   setFixBranch]   = useState<string | null>(null);
  const [pushState,   setPushState]   = useState<'idle' | 'pushing' | 'pushed' | 'error'>('idle');
  const [pushMessage, setPushMessage] = useState<string>('');

  // ── Report ────────────────────────────────────────────────────────────────
  const [summary,   setSummary]   = useState<ReviewSummary | null>(null);
  const [reportUrl, setReportUrl] = useState<string>('');

  // ── Coverage ledger (fail-closed completeness) ──────────────────────────────
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null);
  const [coverage,  setCoverage]  = useState<CoverageInfo | null>(null);
  const [retrying,  setRetrying]  = useState(false);
  // Repo-wide architecture/dependency graph (arrives up front, before file review).
  const [architecture, setArchitecture] = useState<ArchitectureGraph | null>(null);
  const [showArch, setShowArch] = useState(true);
  // Per-violation fix-verification result (✓ verified / ⚠ still failing).
  const [fixVerify, setFixVerify] = useState<Record<string, { verified: boolean; message: string }>>({});

  // ── Compare ───────────────────────────────────────────────────────────────
  const [compareRunId1, setCompareRunId1] = useState<string>('');
  const [compareRunId2, setCompareRunId2] = useState<string>('');

  // ── Loop / Conform live state (Phase 5) ────────────────────────────────────
  const [loopState,       setLoopState]       = useState<LoopUiState | null>(null);
  const [conformProgress, setConformProgress] = useState<{ attempted: number; fixed: number; deferred: number; failed: number } | null>(null);
  const [screenedFixes,   setScreenedFixes]   = useState<ScreenedFix[]>([]);

  const sessionIdRef = useRef<string | null>(null);

  // ─── SSE event handler ────────────────────────────────────────────────────
  const handleEvent = useCallback((ev: CodeLensEvent) => {
    switch (ev.event) {

      case 'review_status':
        setStatusMessage(ev.message);
        break;

      case 'review_started':
        setProgress({ current: 0, total: ev.total_files });
        setReviewStatus('running');
        setStatusMessage('');
        break;

      case 'files_discovered':
        setDiscoverySummary(ev);
        setShowDiscoveryBanner(true);
        break;

      case 'file_started':
        setCurrentFileName(ev.path.split('/').pop() ?? ev.path);
        setProgress(p => ({ ...p, current: ev.progress.current }));
        setActiveFileId(ev.file_id);
        setFiles(prev => {
          const exists = prev.find(f => f.file_id === ev.file_id);
          if (exists) {
            return prev.map(f =>
              f.file_id === ev.file_id ? { ...f, status: 'REVIEWING' } : f,
            );
          }
          return [...prev, {
            file_id: ev.file_id,
            path: ev.path,
            critical: 0, warning: 0, info: 0, passed: 0,
            status: 'REVIEWING',
          }];
        });
        if (sessionIdRef.current && !fileContents[ev.file_id]) {
          fetchFileContent(sessionIdRef.current, ev.file_id).then(content => {
            if (content) {
              setFileContents(prev => ({ ...prev, [ev.file_id]: content }));
            }
          });
        }
        break;

      case 'violation_found':
        setViolations(prev => [...prev, {
          violation_id:    ev.violation_id,
          file_id:         ev.file_id,
          rule_id:         ev.rule_id,
          rule_name:       ev.rule_name,
          severity:        ev.severity,
          line_start:      ev.line_start,
          line_end:        ev.line_end,
          found_code:      ev.found_code,
          recommended_fix: ev.recommended_fix,
          fix_available:   ev.fix_available,
          status:          ev.status === 'IGNORED' ? 'IGNORED' : 'OPEN',
        }]);
        // Suppressed (ignored) findings are accepted exceptions — they don't
        // count toward the live critical/warning compliance tally.
        if (ev.status !== 'IGNORED') {
          setStats(s => ({
            ...s,
            critical: ev.severity === 'Critical' ? s.critical + 1 : s.critical,
            warning:  ev.severity === 'Warning'  ? s.warning  + 1 : s.warning,
          }));
        }
        break;

      case 'standard_checked':
        setFileStandardResults(prev => ({
          ...prev,
          [ev.file_id]: [
            ...(prev[ev.file_id] ?? []),
            {
              rule_id: ev.rule_id,
              rule_name: ev.rule_name,
              severity: ev.severity,
              status: ev.status,
              checked: ev.checked,
              violations: ev.violations,
            },
          ],
        }));
        if (ev.status === 'VIOLATION') {
          setRightTab('violations');
        }
        break;

      case 'rule_pass':
        setStats(s => ({ ...s, passed: s.passed + 1 }));
        break;

      case 'file_complete':
        setFiles(prev => prev.map(f =>
          f.file_id === ev.file_id
            ? {
                ...f,
                critical: ev.summary.critical,
                warning:  ev.summary.warning,
                info:     ev.summary.info,
                passed:   ev.summary.passed,
                applicableCells: ev.summary.applicableCells,
                verifiedCells:   ev.summary.verifiedCells,
                status:   ev.summary.status === 'PASS' ? 'PASS' : 'FAIL',
              }
            : f,
        ));
        break;

      case 'fix_preview': {
        const preview: FixPreview = {
          violation_id: ev.violation_id,
          file_id:      ev.file_id,
          diff:         ev.diff,
        };
        setFixPreviews(prev => ({ ...prev, [ev.violation_id]: preview }));
        setFixLoadingId(null);
        break;
      }

      case 'fix_applied':
        if (ev.branch) setFixBranch(ev.branch);
        setViolations(prev => prev.map(v =>
          v.violation_id === ev.violation_id ? { ...v, status: 'FIXED' } : v,
        ));
        setFixPreviews(prev => {
          const next = { ...prev };
          delete next[ev.violation_id];
          return next;
        });
        if (sessionIdRef.current) {
          fetchFileContent(sessionIdRef.current, ev.file_id).then(content => {
            if (content) {
              setFileContents(prev => ({ ...prev, [ev.file_id]: content }));
            }
          });
        }
        break;

      case 'fix_verified':
        setFixVerify(prev => ({
          ...prev,
          [ev.violation_id]: { verified: ev.verified, message: ev.message },
        }));
        break;

      case 'bulk_fix_progress':
        setBulkProgress(prev => ({
          ...prev,
          [ev.standard_id]: {
            status: 'running',
            fixed: ev.fixed,
            failed: ev.failed,
            total: ev.total,
            currentFile: ev.current_file,
          },
        }));
        break;

      case 'bulk_fix_complete':
        setBulkProgress(prev => ({
          ...prev,
          [ev.standard_id]: {
            status: 'done',
            fixed: ev.fixed,
            failed: ev.failed,
            total: ev.total,
            currentFile: '',
          },
        }));
        break;

      case 'review_complete':
        setSummary(ev.summary);
        setReportUrl(ev.report_download_url);
        setRunStatus(ev.run_status);
        setCoverage(ev.coverage);
        setRetrying(false);
        setReviewStatus('complete');
        // Stay on the review screen so the user can keep fixing violations; the
        // header now offers "View Report" + "New Review". (Previously this forced
        // a jump to the report, stranding the user away from the fix workflow.)
        break;

      case 'architecture_graph':
        setArchitecture(ev.graph);
        break;

      case 'loop_started':
        setLoopState({
          mode: ev.mode, policy: ev.policy,
          maxIterations: ev.budgets.max_iterations,
          iterations: [], stopReason: null, finalMetric: null,
        });
        break;

      case 'loop_iteration':
        setLoopState(prev => prev && ({
          ...prev,
          iterations: [...prev.iterations, {
            index: ev.iteration, action: ev.action, goalMet: ev.goal_met,
            elapsedMs: ev.elapsed_ms, metric: ev.metric,
          }],
        }));
        break;

      case 'loop_complete':
        setLoopState(prev => prev && ({ ...prev, stopReason: ev.stop_reason, finalMetric: ev.final_metric }));
        break;

      case 'conform_progress':
        setConformProgress({ attempted: ev.attempted, fixed: ev.fixed, deferred: ev.deferred, failed: ev.failed });
        break;

      case 'fix_screened':
        if (!ev.allowed) {
          setScreenedFixes(prev => [...prev, {
            violationId: ev.violation_id, deviationId: ev.deviation_id, evidence: ev.evidence,
          }]);
        }
        break;

      case 'review_stopped':
        setReviewStatus('stopped');
        break;

      case 'review_resumed':
        setReviewStatus('running');
        break;

      case 'error':
        if (ev.message === 'SESSION_EXPIRED') {
          // Session is gone (server restart / TTL). Stop reconnecting and reset.
          sessionIdRef.current = null;
          setSessionId(null);
          setMode('SETUP');
          setStartError('Your previous session expired (the server restarted). Start a new review, or use "Resume fixing from last review" to reload your findings.');
        } else {
          console.error('[CodeLens]', ev.message);
        }
        break;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useCodeLensStream(sessionId, handleEvent);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  // FIX 4: accepts folders + ignorePatterns params
  const handleStart = async (
    repoUrl: string,
    branch: string,
    pat: string,
    folders: string[],
    ignorePatterns: string[],
    opts: StartReviewOptions = {},
  ) => {
    setIsStartLoading(true);
    setStartError(null);
    setLoopState(null);
    setConformProgress(null);
    setScreenedFixes([]);
    try {
      const { sessionId: sid } = await startReview(repoUrl, branch, pat, folders, ignorePatterns, opts);
      sessionIdRef.current = sid;
      setSessionId(sid);
      setReviewStatus('running');
      setMode('REVIEW');
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Failed to start review');
    } finally {
      setIsStartLoading(false);
    }
  };

  const handleSelectFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
    setScrollToLine(null);
    setRightTab('checklist');
    if (sessionIdRef.current && !fileContents[fileId]) {
      fetchFileContent(sessionIdRef.current, fileId).then(content => {
        if (content) setFileContents(prev => ({ ...prev, [fileId]: content }));
      });
    }
  }, [fileContents]);

  // FIX 3: Stop/Resume
  const handleStop = async () => {
    if (!sessionId) return;
    try {
      await stopReview(sessionId);
      setReviewStatus('stopped');
    } catch (e) {
      console.error('[CodeLens] Stop failed:', e);
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;
    try {
      await resumeReview(sessionId);
      setReviewStatus('running');
    } catch (e) {
      console.error('[CodeLens] Resume failed:', e);
    }
  };

  // Build a partial report from whatever has been reviewed so far and open the
  // report screen. Works after a Stop without losing the Resume option, and the
  // export endpoint falls back to the DB so nothing is lost.
  const handleViewReport = () => {
    const filesPassing = files.filter(f => f.status === 'PASS').length;
    const filesFailing = files.filter(f => f.status === 'FAIL').length;
    const reviewed = filesPassing + filesFailing;
    const compliance = reviewed > 0 ? Math.round((filesPassing / reviewed) * 100) : 100;
    setSummary({
      total_files: reviewed,
      total_violations: violations.length,
      critical: violations.filter(v => v.severity === 'Critical').length,
      warning: violations.filter(v => v.severity === 'Warning').length,
      info: violations.filter(v => v.severity === 'Info').length,
      files_passing: filesPassing,
      files_failing: filesFailing,
      compliance_pct: compliance,
    });
    if (sessionId) setReportUrl(getReportUrl(sessionId));
    setMode('REPORT');
  };

  const handlePushFixes = async () => {
    if (!sessionId) return;
    setPushState('pushing');
    setPushMessage('Pushing fix branch to remote…');
    try {
      const result = await pushFixes(sessionId);
      setPushState('pushed');
      setFixBranch(result.branch);
      setPushMessage(`Pushed to ${result.branch}`);
    } catch (e) {
      setPushState('error');
      setPushMessage(e instanceof Error ? e.message : 'Push failed');
    }
  };

  const handleStartPr = async (prUrl: string, pat: string, ignorePatterns: string[]) => {
    setIsStartLoading(true);
    setStartError(null);
    try {
      const { sessionId: sid, pr } = await startPrReview(prUrl, pat, ignorePatterns);
      sessionIdRef.current = sid;
      setSessionId(sid);
      setPrInfo(pr);
      setPrPat(pat);
      setSelectedComments(new Set());
      setPrPostState('idle');
      setPrPostMessage('');
      setRightTab('pr');
      setReviewStatus('running');
      setMode('REVIEW');
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Failed to start PR review');
    } finally {
      setIsStartLoading(false);
    }
  };

  const togglePrComment = useCallback((violationId: string) => {
    setSelectedComments(prev => {
      const next = new Set(prev);
      if (next.has(violationId)) next.delete(violationId); else next.add(violationId);
      return next;
    });
  }, []);

  const handleCopyAllPrComments = async () => {
    if (!sessionId) return;
    try {
      const { markdown, count } = await previewPrComment(sessionId, []);
      await navigator.clipboard.writeText(markdown);
      setPrCopyMessage(`Copied ${count} comment${count === 1 ? '' : 's'} to clipboard.`);
    } catch (e) {
      setPrCopyMessage(e instanceof Error ? `Copy failed: ${e.message}` : 'Copy failed');
    }
    setTimeout(() => setPrCopyMessage(''), 3000);
  };

  const handlePostPrComment = async () => {
    if (!sessionId || selectedComments.size === 0) return;
    setPrPostState('posting');
    setPrPostMessage('');
    try {
      const result = await postPrComment(sessionId, prPat, Array.from(selectedComments));
      setPrPostState('posted');
      setPrPostMessage(`Posted ${result.posted} comment${result.posted === 1 ? '' : 's'} to the PR.`);
    } catch (e) {
      setPrPostState('error');
      setPrPostMessage(e instanceof Error ? e.message : 'Failed to post comment to the PR');
    }
  };

  const handleResumeFixing = async (repoUrl: string, branch: string, pat: string) => {
    setIsStartLoading(true);
    setStartError(null);
    try {
      const { sessionId: sid } = await resumeFixing(repoUrl, branch, pat);
      sessionIdRef.current = sid;
      setSessionId(sid);
      setReviewStatus('running');
      setMode('REVIEW');
    } catch (e) {
      setStartError(e instanceof Error ? e.message : 'Failed to resume fixing');
    } finally {
      setIsStartLoading(false);
    }
  };

  const handleFix = async (violationId: string) => {
    if (!sessionId) return;
    setFixLoadingId(violationId);
    try {
      await requestFix(sessionId, violationId);
    } catch (e) {
      console.error('[CodeLens] Fix request failed:', e);
      setFixLoadingId(null);
    }
  };

  const handleAcceptFix = async (violationId: string) => {
    if (!sessionId) return;
    try {
      await acceptFix(sessionId, violationId);
    } catch (e) {
      console.error('[CodeLens] Accept fix failed:', e);
    }
  };

  const handleBulkFix = async (standardId: string) => {
    if (!sessionId) return;
    try {
      await bulkFixStandard(sessionId, standardId);
      setBulkProgress(prev => ({
        ...prev,
        [standardId]: { status: 'running', fixed: 0, failed: 0, total: 0, currentFile: '' },
      }));
    } catch (e) {
      console.error('[CodeLens] Bulk fix start failed:', e);
    }
  };

  const handleRejectFix = (violationId: string) => {
    setFixPreviews(prev => {
      const next = { ...prev };
      delete next[violationId];
      return next;
    });
    setFixLoadingId(null);
  };

  const handleUpdateStatus = async (
    violationId: string,
    status: 'IGNORED' | 'DEFERRED',
  ) => {
    if (!sessionId) return;
    try {
      await updateViolationStatus(sessionId, violationId, status.toLowerCase() as 'ignored' | 'deferred');
      setViolations(prev =>
        prev.map(v => v.violation_id === violationId ? { ...v, status } : v),
      );
    } catch (e) {
      console.error('[CodeLens] Status update failed:', e);
    }
  };

  const handleReset = () => {
    setMode('SETUP');
    setSessionId(null);
    sessionIdRef.current = null;
    setArchitecture(null);
    setFiles([]);
    setActiveFileId(null);
    setFileContents({});
    setViolations([]);
    setFixLoadingId(null);
    setFixPreviews({});
    setProgress({ current: 0, total: 0 });
    setCurrentFileName('');
    setStats({ critical: 0, warning: 0, passed: 0 });
    setScrollToLine(null);
    setSummary(null);
    setReportUrl('');
    setStartError(null);
    setFileStandardResults({});
    setRightTab('checklist');
    setReviewStatus('running');
    setStatusMessage('Cloning repository…');
    setDiscoverySummary(null);
    setShowDiscoveryBanner(false);
    setBulkProgress({});
    setFixBranch(null);
    setPushState('idle');
    setPushMessage('');
    setRunStatus(null);
    setCoverage(null);
    setRetrying(false);
    setFixVerify({});
    setPrInfo(null);
    setPrPat('');
    setSelectedComments(new Set());
    setPrPostState('idle');
    setPrPostMessage('');
    setPrCopyMessage('');
  };

  // Re-run the (file, standard) checks that didn't complete (hard fail-closed retry)
  const handleRetryCoverage = async () => {
    if (!sessionId) return;
    setRetrying(true);
    try {
      await retryCoverage(sessionId);
      // A fresh review_complete event will arrive via SSE and update runStatus/coverage.
    } catch (e) {
      console.error('[CodeLens] Coverage retry failed:', e);
      setRetrying(false);
    }
  };

  // ─── Derived state ────────────────────────────────────────────────────────

  // Aggregate violations by standard for the Common Issues tab
  const standardAgg = useMemo(() => {
    const map = new Map<string, {
      ruleId: string; ruleName: string; severity: 'Critical' | 'Warning' | 'Info';
      fileIds: Set<string>; violationCount: number; fixedCount: number;
    }>();
    for (const v of violations) {
      if (!map.has(v.rule_id)) {
        map.set(v.rule_id, {
          ruleId: v.rule_id, ruleName: v.rule_name,
          severity: v.severity as 'Critical' | 'Warning' | 'Info',
          fileIds: new Set(), violationCount: 0, fixedCount: 0,
        });
      }
      const e = map.get(v.rule_id)!;
      e.fileIds.add(v.file_id);
      e.violationCount++;
      if (v.status === 'FIXED') e.fixedCount++;
    }
    return Array.from(map.values()).map(e => ({
      ...e, fileCount: e.fileIds.size,
    }));
  }, [violations]);

  const activeFile     = files.find(f => f.file_id === activeFileId) ?? null;
  const activeContent  = activeFileId ? (fileContents[activeFileId] ?? '') : '';
  const activeViolations = violations.filter(v => v.file_id === activeFileId);

  // FIX 1: right-panel violations show only the selected file's violations
  const rightPanelViolations = activeFileId
    ? [...violations.filter(v => v.file_id === activeFileId)].reverse()
    : [...violations].reverse();

  // Code quality score — the industry-standard severity-weighted score once the
  // review completes, otherwise a live provisional from passed vs (passed +
  // critical + warning) as the review runs.
  const qualityScore = useMemo<number | null>(() => {
    if (summary) return summary.quality_score ?? summary.compliance_pct;
    const denom = stats.passed + stats.critical + stats.warning;
    return denom > 0 ? Math.round((stats.passed / denom) * 100) : null;
  }, [summary, stats]);

  // ─── Render ───────────────────────────────────────────────────────────────

  // App shell: persistent global left sidebar + full-bleed Code Lens content.
  // (A plain function returning JSX — NOT a component — so children never remount.)
  const withShell = (content: ReactNode) => (
    <div className="flex overflow-hidden" style={{ height: '100vh' }}>
      <Sidebar isCollapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col cl-root cl-bg overflow-hidden min-w-0">
        <CodeLensTopNav
          mode={mode}
          onNewReview={handleReset}
          onOpenHistory={() => setMode('HISTORY')}
          score={qualityScore}
        />
        {content}
      </div>
    </div>
  );

  // AUTOMATION comes from the scheduler work on main; the shell wrapper comes
  // from the Code Lens refactor. Both are kept.
  if (mode === 'SETUP' || mode === 'HISTORY' || mode === 'COMPARE' || mode === 'AUTOMATION') {
    const handleCompareSelect = (run: RunSummary & { _baselineRunId?: string }) => {
      if (run._baselineRunId) {
        setCompareRunId1(run._baselineRunId);
        setCompareRunId2(run.runId);
        setMode('COMPARE');
      }
    };

    if (mode === 'SETUP') {
      return withShell(
        <div className="flex-1 overflow-auto">
          <DashboardLanding
            onStart={handleStart}
            onResumeFixing={handleResumeFixing}
            onStartPr={handleStartPr}
            isLoading={isStartLoading}
            error={startError}
            onOpenHistory={() => setMode('HISTORY')}
          />
        </div>,
      );
    }
    if (mode === 'HISTORY') {
      // Full-bleed two-pane master/detail (list left, selected run right).
      return withShell(<RunHistory onSelectForCompare={handleCompareSelect} />);
    }
    if (mode === 'AUTOMATION') {
      // Scheduler panel from main, rendered inside the new app shell.
      return withShell(<AutomationPanel />);
    }
    // COMPARE
    return withShell(
      <div className="flex-1 overflow-auto p-4">
        {compareRunId1 && compareRunId2 && (
          <RunComparison
            runId1={compareRunId1}
            runId2={compareRunId2}
            onBack={() => setMode('HISTORY')}
          />
        )}
      </div>,
    );
  }

  if (mode === 'REPORT' && summary) {
    return withShell(
      <div className="flex-1 overflow-auto">
        <ReportPanel
          summary={summary}
          reportUrl={reportUrl || getReportUrl(sessionId ?? '')}
          sessionId={sessionId ?? ''}
          onReset={handleReset}
          runStatus={runStatus}
          coverage={coverage}
          onRetryCoverage={handleRetryCoverage}
          retrying={retrying}
          onBackToReview={() => setMode('REVIEW')}
          architecture={architecture}
          score={qualityScore}
        />
      </div>,
    );
  }

  // REVIEW mode — three-panel grid
  return withShell(
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Progress bar — full width top strip */}
      <ReviewProgress
        currentFile={currentFileName}
        statusMessage={statusMessage}
        progress={progress}
        stats={stats}
        reviewStatus={reviewStatus}
        onStop={handleStop}
        onResume={handleResume}
        onCancel={handleReset}
        onViewReport={handleViewReport}
        onNewReview={handleReset}
      />

      {/* Loop / Conform live status (from main). Restyled to the light theme
          this page moved to, so it matches the panels around it. */}
      {loopState && (
        <div className="flex-shrink-0 border-b px-4 py-3" style={{ borderColor: '#e5e7eb', background: '#ffffff' }}>
          <LoopPanel loop={loopState} conformProgress={conformProgress} screenedFixes={screenedFixes} />
        </div>
      )}

      {/* PR review: one-line summary banner (replaces the architecture graph, which
          is not useful when reviewing a diff). */}
      {prInfo && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs flex-shrink-0"
             style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb', color: '#374151' }}>
          <span style={{ color: '#2563eb' }}>⌥</span>
          <span className="truncate">
            <strong className="text-gray-900">PR #{prInfo.id}</strong>
            {prInfo.title ? ` — ${prInfo.title}` : ''}
            {' · '}{prInfo.changedFiles} changed file(s)
            {' · reviewed '}{files.filter(f => f.status === 'PASS' || f.status === 'FAIL').length}/{prInfo.changedFiles}
            {' · '}<span style={{ color: '#dc2626' }}>{stats.critical} Critical</span>
            {' · '}<span style={{ color: '#d97706' }}>{stats.warning} Warning</span>
            {' · '}<span style={{ color: '#059669' }}>{violations.length} comment(s)</span>
          </span>
          <a href={prInfo.webUrl} target="_blank" rel="noreferrer" className="ml-auto flex-shrink-0 font-semibold"
             style={{ color: '#2563eb' }}>Open PR ↗</a>
        </div>
      )}

      {/* Architecture graph — built up front, shown before/while files are reviewed.
          Hidden in PR mode (a diff review does not need the full-repo graph). */}
      {!prInfo && architecture && architecture.nodes.length > 0 && (
        <div className="flex-shrink-0 border-b" style={{ borderColor: '#e5e7eb', background: '#ffffff' }}>
          <button
            onClick={() => setShowArch(s => !s)}
            className="w-full flex items-center gap-2 px-4 py-2 text-[11px] font-semibold"
            style={{ color: '#2563eb' }}
          >
            <span>{showArch ? '▾' : '▸'}</span>
            <span style={{ color: '#6b7280' }}>Architecture —</span>
            {architecture.stats.controllers} controllers · {architecture.stats.services} services · {architecture.stats.repositories} repositories · {architecture.stats.edges} deps
            {architecture.stats.illegalEdges > 0 && (
              <span style={{ color: '#dc2626' }}>· {architecture.stats.illegalEdges} illegal</span>
            )}
          </button>
          {showArch && (
            <div className="px-4 pb-3" style={{ maxHeight: '42vh', overflow: 'auto' }}>
              <ArchitectureView graph={architecture} />
            </div>
          )}
        </div>
      )}

      {/* Discovery banner */}
      {showDiscoveryBanner && discoverySummary && (
        <div
          className="flex items-center justify-between px-4 py-2 text-xs flex-shrink-0"
          style={{ background: '#ffffff', borderBottom: '1px solid #e5e7eb' }}
        >
          <div className="flex items-center gap-2" style={{ color: '#374151' }}>
            <span style={{ color: '#2563eb' }}>ℹ</span>
            <span>
              <strong className="text-gray-900">{discoverySummary.total_found.toLocaleString()}</strong> files found
              {' — '}scanning{' '}
              <strong className="text-gray-900">{discoverySummary.scanning.toLocaleString()}</strong> core files
              {discoverySummary.ignored > 0 && (
                <>
                  {' · '}Excluded:{' '}
                  {discoverySummary.ignored_breakdown.test_files > 0 && (
                    <span className="mr-1">
                      {discoverySummary.ignored_breakdown.test_files.toLocaleString()} test files
                    </span>
                  )}
                  {discoverySummary.ignored_breakdown.build_output > 0 && (
                    <span className="mr-1">
                      · {discoverySummary.ignored_breakdown.build_output.toLocaleString()} build/obj
                    </span>
                  )}
                  {discoverySummary.ignored_breakdown.generated > 0 && (
                    <span className="mr-1">
                      · {discoverySummary.ignored_breakdown.generated.toLocaleString()} generated
                    </span>
                  )}
                  {discoverySummary.ignored_breakdown.user_ignored > 0 && (
                    <span>
                      · {discoverySummary.ignored_breakdown.user_ignored.toLocaleString()} custom
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
          <button
            onClick={() => setShowDiscoveryBanner(false)}
            className="ml-4 flex-shrink-0 text-xs"
            style={{ color: '#9ca3af' }}
          >
            Dismiss ✕
          </button>
        </div>
      )}

      {/* Fix-branch action bar — appears once at least one fix is committed */}
      {fixBranch && (
        <div
          className="flex items-center justify-between px-4 py-2 text-xs flex-shrink-0"
          style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0' }}
        >
          <div className="flex items-center gap-2" style={{ color: '#059669' }}>
            <span style={{ color: '#059669' }}>⎇</span>
            <span>
              Fixes committed to branch{' '}
              <strong className="font-mono text-gray-900">{fixBranch}</strong>
              {' '}— the base branch is never modified.
              {pushState === 'pushed' && (
                <span className="ml-2" style={{ color: '#059669' }}>✓ {pushMessage}</span>
              )}
              {pushState === 'error' && (
                <span className="ml-2" style={{ color: '#dc2626' }}>✕ {pushMessage}</span>
              )}
            </span>
          </div>
          <button
            onClick={handlePushFixes}
            disabled={pushState === 'pushing'}
            className="ml-4 flex-shrink-0 text-xs font-semibold px-3 py-1 rounded transition-colors"
            style={{
              background: pushState === 'pushing' ? '#e5e7eb' : '#ecfdf5',
              color: pushState === 'pushing' ? '#6b7280' : '#059669',
              border: '1px solid #a7f3d0',
              cursor: pushState === 'pushing' ? 'default' : 'pointer',
            }}
          >
            {pushState === 'pushing'
              ? 'Pushing…'
              : pushState === 'pushed'
                ? 'Push again'
                : 'Push to Azure DevOps'}
          </button>
        </div>
      )}

      {/* Three-panel grid */}
      <div
        className="flex-1 min-h-0 grid"
        style={{ gridTemplateColumns: '20% 50% 30%' }}
      >
        {/* Left: File tree */}
        <div className="border-r overflow-hidden" style={{ borderColor: '#e5e7eb' }}>
          <FileTreePanel
            files={files}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
          />
        </div>

        {/* Centre: Monaco editor */}
        <div className="overflow-hidden">
          <CodeViewerPanel
            fileContent={activeContent}
            fileName={activeFile?.path.split('/').pop() ?? ''}
            violations={activeViolations}
            scrollToLine={scrollToLine}
          />
        </div>

        {/* Right: Tabbed — Standards Checklist / Violations */}
        <div
          className="border-l flex flex-col overflow-hidden"
          style={{ borderColor: '#e5e7eb' }}
        >
          {/* Tab bar */}
          <div
            className="flex border-b flex-shrink-0"
            style={{ borderColor: '#e5e7eb', background: '#ffffff' }}
          >
            {(prInfo
              ? (['pr', 'checklist', 'violations', 'common'] as const)
              : (['checklist', 'violations', 'common'] as const)
            ).map(tab => (
              <button
                key={tab}
                onClick={() => setRightTab(tab)}
                className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors"
                style={{
                  color: rightTab === tab ? '#2563eb' : '#6b7280',
                  borderBottom: rightTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {tab === 'pr' ? (
                  <>
                    PR
                    {violations.length > 0 && (
                      <span
                        className="ml-1 rounded-full px-1.5 font-mono text-[10px]"
                        style={{ background: '#2563eb30', color: '#2563eb' }}
                      >
                        {selectedComments.size > 0
                          ? `${selectedComments.size}/${violations.length}`
                          : violations.length}
                      </span>
                    )}
                  </>
                ) : tab === 'checklist' ? (
                  <>
                    Standards
                    {activeFileId && fileStandardResults[activeFileId] && (
                      <span className="ml-1 font-mono">
                        ({fileStandardResults[activeFileId].length}/42)
                      </span>
                    )}
                  </>
                ) : tab === 'violations' ? (
                  <>
                    Violations
                    {rightPanelViolations.filter(v => v.status === 'OPEN').length > 0 && (
                      <span
                        className="ml-1 rounded-full px-1.5 font-mono text-[10px]"
                        style={{ background: '#fee2e2', color: '#dc2626' }}
                      >
                        {rightPanelViolations.filter(v => v.status === 'OPEN').length}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    Common
                    {standardAgg.length > 0 && (
                      <span
                        className="ml-1 rounded-full px-1.5 font-mono text-[10px]"
                        style={{ background: '#fef3c7', color: '#d97706' }}
                      >
                        {standardAgg.length}
                      </span>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {rightTab === 'pr' ? (
            <PrCommentsPanel
              pr={prInfo}
              violations={violations}
              fileName={(fid) => files.find(f => f.file_id === fid)?.path ?? fid}
              selected={selectedComments}
              onToggle={togglePrComment}
              onSelectAll={() => setSelectedComments(new Set(violations.map(v => v.violation_id)))}
              onClearAll={() => setSelectedComments(new Set())}
              onPost={handlePostPrComment}
              postState={prPostState}
              postMessage={prPostMessage}
              onCopyAll={handleCopyAllPrComments}
              copyMessage={prCopyMessage}
            />
          ) : rightTab === 'checklist' ? (
            <StandardsChecklist
              fileId={activeFileId}
              results={activeFileId ? (fileStandardResults[activeFileId] ?? []) : []}
              onViolationClick={(ruleId) => {
                setRightTab('violations');
                const firstMatch = violations.find(v => v.file_id === activeFileId && v.rule_id === ruleId);
                if (firstMatch) setScrollToLine(firstMatch.line_start);
              }}
            />
          ) : rightTab === 'violations' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {activeFileId && activeFile && (
                <div className="text-[10px] pb-1 truncate" style={{ color: '#9ca3af' }}>
                  {activeFile.path.split('/').pop()}
                </div>
              )}
              {rightPanelViolations.length === 0 ? (
                <div className="text-xs text-center py-8" style={{ color: '#9ca3af' }}>
                  {activeFileId ? 'No violations in this file' : 'No violations found yet'}
                </div>
              ) : (
                rightPanelViolations.map(v => (
                  <ViolationCard
                    key={v.violation_id}
                    violation={v}
                    isFixLoading={fixLoadingId === v.violation_id}
                    fixPreview={fixPreviews[v.violation_id] ?? null}
                    fixVerify={fixVerify[v.violation_id] ?? null}
                    onFix={() => handleFix(v.violation_id)}
                    onAcceptFix={() => handleAcceptFix(v.violation_id)}
                    onRejectFix={() => handleRejectFix(v.violation_id)}
                    onIgnore={() => handleUpdateStatus(v.violation_id, 'IGNORED')}
                    onDefer={() => handleUpdateStatus(v.violation_id, 'DEFERRED')}
                    onLineClick={(line) => {
                      if (v.file_id !== activeFileId) {
                        handleSelectFile(v.file_id);
                      }
                      setScrollToLine(line);
                    }}
                  />
                ))
              )}
            </div>
          ) : (
            <CommonIssues
              entries={standardAgg}
              totalFilesReviewed={progress.current}
              sessionId={sessionId}
              reviewComplete={reviewStatus === 'complete'}
              bulkProgress={bulkProgress}
              onBulkFix={handleBulkFix}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Wrap the page so a render crash shows a recoverable fallback instead of a
// blank screen (which also broke the browser back button). "Back to start"
// remounts the page fresh; review data is safe in the DB (use Resume).
export default function CodeLensPage() {
  return (
    <CodeLensErrorBoundary onReset={() => window.location.assign('/code-lens')}>
      <CodeLensPageInner />
    </CodeLensErrorBoundary>
  );
}
