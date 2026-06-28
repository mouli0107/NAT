import { Loader2 } from 'lucide-react';
import type { FileRecord } from './codeLensTypes';

interface FileTreePanelProps {
  files: FileRecord[];
  activeFileId: string | null;
  onSelectFile: (fileId: string) => void;
}

function statusIcon(status: FileRecord['status']) {
  switch (status) {
    case 'REVIEWING': return <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: '#00BFFF' }} />;
    case 'PASS':      return <span className="text-xs flex-shrink-0">🟢</span>;
    case 'FAIL':      return <span className="text-xs flex-shrink-0">🔴</span>;
    default:          return <span className="text-xs flex-shrink-0">⏳</span>;
  }
}

function hasCritical(f: FileRecord) { return f.critical > 0; }
function hasWarning(f: FileRecord)  { return f.warning > 0 && f.critical === 0; }

export function FileTreePanel({ files, activeFileId, onSelectFile }: FileTreePanelProps) {
  // Group files by directory
  const groups = new Map<string, FileRecord[]>();
  for (const f of files) {
    const parts = f.path.split('/');
    const dir   = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    if (!groups.has(dir)) groups.set(dir, []);
    groups.get(dir)!.push(f);
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#0D1F3C' }}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b flex items-center justify-between"
           style={{ borderColor: '#1E3A5F' }}>
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#7A9CC0' }}>
          Files
        </span>
        <span className="text-xs font-mono" style={{ color: '#7A9CC0' }}>
          {files.length}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {files.length === 0 ? (
          <div className="px-3 py-4 text-xs" style={{ color: '#4A6A8A' }}>
            Discovering files…
          </div>
        ) : (
          Array.from(groups.entries()).map(([dir, dirFiles]) => (
            <div key={dir}>
              {/* Directory header */}
              <div className="px-3 py-1.5 text-xs font-medium sticky top-0"
                   style={{ background: '#0A1628', color: '#4A8ABA' }}>
                {dir}/
              </div>

              {/* Files in directory */}
              {dirFiles.map(f => {
                const fileName = f.path.split('/').pop() ?? f.path;
                const isActive = f.file_id === activeFileId;
                const reviewed = f.status === 'PASS' || f.status === 'FAIL';
                const applicable = f.applicableCells ?? 0;
                // Review confidence = verified applicable checks ÷ applicable checks.
                const confidence = reviewed && applicable > 0
                  ? Math.round(((f.verifiedCells ?? 0) / applicable) * 100)
                  : null;
                return (
                  <button
                    key={f.file_id}
                    onClick={() => onSelectFile(f.file_id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-white/5"
                    style={{
                      borderLeft: isActive ? '2px solid #00BFFF' : '2px solid transparent',
                      background: isActive ? 'rgba(0,191,255,0.08)' : undefined,
                    }}
                  >
                    {statusIcon(f.status)}
                    <span
                      className="text-xs truncate"
                      style={{
                        color: isActive
                          ? '#00BFFF'
                          : hasCritical(f)
                          ? '#FF8080'
                          : hasWarning(f)
                          ? '#FFC080'
                          : f.status === 'PASS'
                          ? '#80FF80'
                          : '#A0C0D8',
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
                            ? { background: 'rgba(255,165,0,0.2)', color: '#FFC080' }
                            : { background: 'rgba(255,255,255,0.06)', color: '#4A6A8A' }}
                        >
                          {confidence < 100 ? '⚠ ' : ''}{confidence}%
                        </span>
                      )}
                      {f.critical > 0 && (
                        <span className="text-xs font-mono px-1 rounded"
                              style={{ background: 'rgba(255,68,68,0.2)', color: '#FF8080' }}>
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
