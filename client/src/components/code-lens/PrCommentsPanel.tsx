import { useMemo } from 'react';
import { Check, ExternalLink, Loader2, MessageSquarePlus, GitPullRequest, Copy } from 'lucide-react';
import type { ViolationRecord } from './codeLensTypes';
import type { PrInfo } from '@/lib/codeLensApi';

export type PrPostState = 'idle' | 'posting' | 'posted' | 'error';

interface PrCommentsPanelProps {
  pr: PrInfo | null;
  violations: ViolationRecord[];
  /** Resolve a fileId to its repo-relative path for display + grouping. */
  fileName: (fileId: string) => string;
  selected: Set<string>;
  onToggle: (violationId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onPost: () => void;
  postState: PrPostState;
  postMessage: string;
  /** Copy all comments (as the posted markdown) to the clipboard. */
  onCopyAll: () => void;
  copyMessage: string;
}

const SEV_COLOR: Record<string, string> = {
  Critical: '#dc2626',
  Warning:  '#d97706',
  Info:     '#2563eb',
};

const SEV_RANK: Record<string, number> = { Critical: 0, Warning: 1, Info: 2 };

export function PrCommentsPanel({
  pr, violations, fileName, selected,
  onToggle, onSelectAll, onClearAll, onPost, postState, postMessage,
  onCopyAll, copyMessage,
}: PrCommentsPanelProps) {
  // Group violations by file, most-severe first within each file.
  const groups = useMemo(() => {
    const byFile = new Map<string, ViolationRecord[]>();
    for (const v of violations) {
      const p = fileName(v.file_id);
      const list = byFile.get(p);
      if (list) list.push(v); else byFile.set(p, [v]);
    }
    for (const list of Array.from(byFile.values())) {
      list.sort((a: ViolationRecord, b: ViolationRecord) =>
        (SEV_RANK[a.severity] ?? 3) - (SEV_RANK[b.severity] ?? 3) || a.line_start - b.line_start);
    }
    return Array.from(byFile.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [violations, fileName]);

  const selectedCount = violations.filter(v => selected.has(v.violation_id)).length;
  const canPost = selectedCount > 0 && postState !== 'posting';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* PR header */}
      <div className="px-3 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid #e5e7eb', background: '#ffffff' }}>
        <div className="flex items-center gap-2">
          <GitPullRequest className="w-4 h-4 flex-shrink-0" style={{ color: '#2563eb' }} />
          <span className="text-xs font-semibold text-gray-900 truncate">
            {pr ? `PR #${pr.id}: ${pr.title || 'Untitled'}` : 'Pull Request'}
          </span>
          {pr?.webUrl && (
            <a href={pr.webUrl} target="_blank" rel="noreferrer"
               className="ml-auto flex-shrink-0" style={{ color: '#2563eb' }} title="Open PR in Azure DevOps">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        {pr && (
          <div className="text-[10px] mt-1" style={{ color: '#6b7280' }}>
            {pr.sourceBranch} → {pr.targetBranch} · {pr.changedFiles} changed file(s)
          </div>
        )}
      </div>

      {/* Select-all + copy bar */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0 text-[11px]"
           style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
        <span>{selectedCount} of {violations.length} selected</span>
        <div className="flex items-center gap-3">
          <button onClick={onSelectAll} className="font-semibold" style={{ color: '#2563eb' }}>Select all</button>
          <button onClick={onClearAll} className="font-semibold" style={{ color: '#6b7280' }}>Clear</button>
          <button
            onClick={onCopyAll}
            disabled={violations.length === 0}
            className="flex items-center gap-1 font-semibold"
            style={{ color: violations.length === 0 ? '#9ca3af' : '#059669' }}
            title="Copy all comments to clipboard"
          >
            <Copy className="w-3 h-3" /> Copy all
          </button>
        </div>
      </div>
      {copyMessage && (
        <div className="px-3 py-1 flex-shrink-0 text-[10px]" style={{ color: '#059669', background: '#0D2818' }}>
          {copyMessage}
        </div>
      )}

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {violations.length === 0 ? (
          <div className="text-xs text-center py-8" style={{ color: '#9ca3af' }}>
            No review comments yet. They appear here as the PR is reviewed.
          </div>
        ) : (
          groups.map(([file, list]) => (
            <div key={file}>
              <div className="text-[10px] font-mono px-1 pb-1 truncate" style={{ color: '#9ca3af' }}>{file}</div>
              <div className="space-y-1.5">
                {list.map(v => {
                  const isSel = selected.has(v.violation_id);
                  return (
                    <button
                      key={v.violation_id}
                      onClick={() => onToggle(v.violation_id)}
                      className="w-full text-left flex gap-2 rounded-lg p-2 transition-colors"
                      style={{
                        background: isSel ? '#2563eb11' : '#ffffff',
                        border: `1px solid ${isSel ? '#2563eb55' : '#e5e7eb'}`,
                      }}
                    >
                      <span className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center mt-0.5"
                            style={{
                              background: isSel ? '#2563eb' : 'transparent',
                              border: `1px solid ${isSel ? '#2563eb' : '#e5e7eb'}`,
                            }}>
                        {isSel && <Check className="w-3 h-3" style={{ color: '#f9fafb' }} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase" style={{ color: SEV_COLOR[v.severity] ?? '#6b7280' }}>
                            {v.severity}
                          </span>
                          <span className="text-xs font-semibold text-gray-900 truncate">{v.rule_name}</span>
                          {v.line_start > 0 && (
                            <span className="text-[10px] flex-shrink-0" style={{ color: '#9ca3af' }}>
                              L{v.line_start}{v.line_end > v.line_start ? `-${v.line_end}` : ''}
                            </span>
                          )}
                        </span>
                        {v.recommended_fix && (
                          <span className="block text-[11px] mt-0.5 line-clamp-2" style={{ color: '#374151' }}>
                            {v.recommended_fix}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Post action */}
      <div className="px-3 py-2.5 flex-shrink-0 space-y-2" style={{ borderTop: '1px solid #e5e7eb', background: '#ffffff' }}>
        {postState === 'posted' && (
          <p className="text-[11px]" style={{ color: '#059669' }}>✓ {postMessage}</p>
        )}
        {postState === 'error' && (
          <p className="text-[11px]" style={{ color: '#dc2626' }}>✕ {postMessage}</p>
        )}
        <button
          disabled={!canPost}
          onClick={onPost}
          className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-colors"
          style={{
            background: canPost ? '#2563eb' : '#e5e7eb',
            color:      canPost ? '#f9fafb'  : '#9ca3af',
            cursor:     canPost ? 'pointer'  : 'not-allowed',
          }}
        >
          {postState === 'posting'
            ? <><Loader2 className="w-4 h-4 animate-spin" />Posting to PR…</>
            : <><MessageSquarePlus className="w-4 h-4" />Add {selectedCount > 0 ? selectedCount : ''} Comment{selectedCount === 1 ? '' : 's'} to PR</>}
        </button>
      </div>
    </div>
  );
}
