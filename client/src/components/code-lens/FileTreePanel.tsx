import { Loader2 } from 'lucide-react';
import type { FileRecord } from './codeLensTypes';

interface FileTreePanelProps {
  files: FileRecord[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

function statusIcon(status: FileRecord['status']) {
  switch (status) {
    case 'REVIEWING': return <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: '#2563eb' }} />;
    case 'PASS':      return <span className="text-xs flex-shrink-0">🟢</span>;
    case 'FAIL':      return <span className="text-xs flex-shrink-0">🔴</span>;
    default:          return <span className="text-xs flex-shrink-0">⏳</span>;
  }
}

function hasCritical(f: FileRecord) { return f.critical > 0; }
function hasWarning(f: FileRecord)  { return f.warning > 0 && f.critical === 0; }

export function FileTreePanel({ files, activeFileId, onSelectFile }: FileTreePanelProps) {
  const groups = new Map<string, FileRecord[]>();
  for (const f of files) {
    const parts = f.path.split('/');
    const dir   = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(f);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#ffffff' }}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: '#e5e7eb' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6b7280' }}>Files</span>
        <span className="text-xs font-mono" style={{ color: '#6b7280' }}>{files.length}</span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-xs" style={{ color: '#9ca3af' }}>Discovering files…</div>
        ) : (
          Array.from(groups.entries()).map(([dir, dirFiles]) => (
            <div key={dir}>
              <div className="px-3 py-1.5 text-xs font-medium sticky top-0"
                   style={{ background: '#f9fafb', color: '#4f46e5' }}>
                {dir}/
              </div>

              {dirFiles.map(f => {
                const fileName = f.path.split('/').pop() ?? f.path;
                const isActive = f.file_id === activeFileId;
                const reviewed = f.status === 'PASS' || f.status === 'FAIL';
                const applicable = f.applicableCells ?? 0;
                const confidence = reviewed && applicable > 0
                  ? Math.round(((f.verifiedCells ?? 0) / applicable) * 100)
                  : null;
                return (
                  <button
                    key={f.file_id}
                    onClick={() => onSelectFile(f.file_id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-black/5"
                    style={{
                      borderLeft: isActive ? '2px solid #2563eb' : '2px solid transparent',
                      background: isActive ? 'rgba(37,99,235,0.08)' : undefined,
                    }}
                  >
                    {statusIcon(f.status)}
                    <span
                      className="text-xs truncate"
                      style={{
                        color: isActive ? '#2563eb'
                          : hasCritical(f) ? '#dc2626'
                          : hasWarning(f) ? '#d97706'
                          : f.status === 'PASS' ? '#059669'
                          : '#374151',
                      }}
                    >
                      {fileName}
                    </span>
                    <span className="ml-auto flex items-center gap-1 flex-shrink-0">
                      {confidence !== null && (
                        <span
                          className="text-[10px] font-mono px-1 rounded"
                          title={confidence < 100
                            ? `Only ${f.verifiedCells}/${applicable} checks verified — not fully reviewed`
                            : `All ${applicable} applicable checks verified`}
                          style={confidence < 100
                            ? { background: '#fef3c7', color: '#d97706' }
                            : { background: '#f3f4f6', color: '#9ca3af' }}
                        >
                          {confidence < 100 ? '⚠ ' : ''}{confidence}%
                        </span>
                      )}
                      {f.critical > 0 && (
                        <span className="text-xs font-mono px-1 rounded" style={{ background: '#fee2e2', color: '#dc2626' }}>
                          {f.critical}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
