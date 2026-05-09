// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 5: useDownload hook
// client/src/hooks/useDownload.ts
//
// Triggers ZIP downloads from the merger engine download routes:
//   GET  /api/projects/:projectId/framework/download?scope=...
//   POST /api/projects/:projectId/framework/download/selected
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractFilename(res: Response, fallback: string): string {
  const disposition = res.headers.get('content-disposition') ?? '';
  const match       = disposition.match(/filename="?([^";]+)"?/);
  return match ? match[1] : fallback;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDownload(projectId: string | null) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress]       = useState<string | null>(null);

  /**
   * Download a scope-based ZIP:
   *   scope='project' — entire project
   *   scope='module'  — one module (scopeId = module name)
   *   scope='feature' — one feature (scopeId = "Module/Feature")
   */
  const download = async (
    scope: 'project' | 'module' | 'feature',
    scopeId?: string,
    scopeLabel?: string,
    projectName = 'TestSuite',
  ) => {
    if (!projectId) return;
    setDownloading(true);
    setProgress(`Building ${scopeLabel || scope} suite…`);
    try {
      const params = new URLSearchParams({ scope, projectName });
      if (scopeId) params.set('scopeId', scopeId);

      const res = await fetch(
        `/api/projects/${projectId}/framework/download?${params}`,
        { credentials: 'include' },
      );
      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);

      const blob     = await res.blob();
      const filename = extractFilename(res, `${projectName}-${scope}.zip`);
      triggerBlobDownload(blob, filename);
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  /**
   * Download a ZIP for a hand-picked set of TC sequence IDs.
   */
  const downloadSelected = async (
    selectedTcIds: string[],
    projectName = 'TestSuite',
  ) => {
    if (!projectId || !selectedTcIds.length) return;
    setDownloading(true);
    setProgress(`Building ${selectedTcIds.length} selected TC(s)…`);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/framework/download/selected`,
        {
          method:      'POST',
          credentials: 'include',
          headers:     { 'Content-Type': 'application/json' },
          body:        JSON.stringify({ selectedTcIds, projectName }),
        },
      );
      if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);

      const blob     = await res.blob();
      const filename = extractFilename(res, `${projectName}-selected.zip`);
      triggerBlobDownload(blob, filename);
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  return { download, downloadSelected, downloading, progress };
}
