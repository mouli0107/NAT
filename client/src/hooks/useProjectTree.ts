// ─────────────────────────────────────────────────────────────────────────────
// NAT 2.0 — Sprint 5: useProjectTree hook
// client/src/hooks/useProjectTree.ts
//
// Fetches the merger engine hierarchy tree for a project:
//   GET /api/projects/:projectId/framework/tree
//   → { modules: [ { ...module, features: [...feature] } ] }
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FrameworkFeature {
  id: string;
  moduleId: string;
  name: string;
  createdAt: string | null;
}

export interface FrameworkModule {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  createdAt: string | null;
  features: FrameworkFeature[];
}

export interface ProjectTree {
  modules: FrameworkModule[];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjectTree(projectId: string | null) {
  const [tree, setTree]       = useState<ProjectTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchTree = useCallback(async (): Promise<ProjectTree> => {
    const res = await fetch(`/api/projects/${projectId}/framework/tree`, {
      credentials: 'include',
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }, [projectId]);

  const refresh = useCallback(() => {
    if (!projectId) { setTree(null); return; }
    setLoading(true);
    setError(null);
    fetchTree()
      .then(data => setTree(data))
      .catch(e => setError(String(e.message ?? e)))
      .finally(() => setLoading(false));
  }, [fetchTree, projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { tree, loading, error, refresh };
}
