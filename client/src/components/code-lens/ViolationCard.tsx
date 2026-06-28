import { Loader2, Wrench, EyeOff, Clock, Check, X } from 'lucide-react';
import type { ViolationRecord, FixPreview, ViolationSeverity } from './codeLensTypes';

interface ViolationCardProps {
  violation: ViolationRecord;
  isFixLoading: boolean;
  fixPreview: FixPreview | null;
  fixVerify?: { verified: boolean; message: string } | null;
  onFix: () => void;
  onAcceptFix: () => void;
  onRejectFix: () => void;
  onIgnore: () => void;
  onDefer: () => void;
  onLineClick: (line: number) => void;
}

function severityStyle(s: ViolationSeverity): { bg: string; text: string; label: string } {
  switch (s) {
    case 'Critical': return { bg: '#FF4444', text: 'white', label: 'CRITICAL' };
    case 'Warning':  return { bg: '#FFA500', text: 'white', label: 'WARNING' };
    default:         return { bg: '#6B7280', text: 'white', label: 'INFO' };
  }
}

export function ViolationCard({
  violation, isFixLoading, fixPreview, fixVerify,
  onFix, onAcceptFix, onRejectFix, onIgnore, onDefer, onLineClick,
}: ViolationCardProps) {
  const sev = severityStyle(violation.severity);
  const isFixed    = violation.status === 'FIXED';
  const isIgnored  = violation.status === 'IGNORED';
  const isDeferred = violation.status === 'DEFERRED';
  const isDimmed   = isIgnored || isDeferred;
  const showPreview = !!fixPreview && !isFixed;

  return (
    <div
      className="rounded-lg border text-sm overflow-hidden transition-all"
      style={{
        background: isFixed
          ? 'rgba(0,168,150,0.12)'
          : isDimmed
          ? 'rgba(255,255,255,0.03)'
          : '#0D1F3C',
        borderColor: isFixed
          ? '#00A896'
          : isDimmed
          ? '#1E3A5F'
          : violation.severity === 'Critical'
          ? 'rgba(255,68,68,0.4)'
          : 'rgba(255,165,0,0.3)',
        opacity: isDimmed ? 0.6 : 1,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between px-3 py-2 border-b"
           style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{ background: sev.bg, color: sev.text }}>
            {sev.label}
          </span>
          <span className="font-mono text-xs" style={{ color: '#7A9CC0' }}>
            {violation.rule_id}
          </span>
        </div>
        <button
          onClick={() => onLineClick(violation.line_start)}
          className="text-xs font-mono hover:underline cursor-pointer"
          style={{ color: '#00BFFF' }}
        >
          Line {violation.line_start}
          {violation.line_end !== violation.line_start ? `–${violation.line_end}` : ''}
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        {/* Rule name */}
        <p className="font-medium text-white leading-snug">{violation.rule_name}</p>

        {/* Found code */}
        <div>
          <p className="text-xs mb-1" style={{ color: '#7A9CC0' }}>Found:</p>
          <pre className="text-xs rounded p-2 overflow-x-auto leading-relaxed"
               style={{ background: '#0A1628', color: '#FF9999', fontFamily: 'monospace' }}>
            {violation.found_code}
          </pre>
        </div>

        {/* Fix recommendation */}
        <p className="text-xs" style={{ color: '#A0C0D8' }}>
          <span style={{ color: '#7A9CC0' }}>Fix: </span>
          {violation.recommended_fix}
        </p>

        {/* Fix preview diff */}
        {showPreview && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: '#FF8080' }}>BEFORE</p>
                <pre className="text-xs rounded p-2 overflow-x-auto leading-relaxed"
                     style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.3)', color: '#FFB0B0', fontFamily: 'monospace', minHeight: 48 }}>
                  {fixPreview.diff.before_code}
                </pre>
              </div>
              <div>
                <p className="text-xs mb-1 font-medium" style={{ color: '#80FF80' }}>AFTER</p>
                <pre className="text-xs rounded p-2 overflow-x-auto leading-relaxed"
                     style={{ background: 'rgba(0,168,150,0.08)', border: '1px solid rgba(0,168,150,0.3)', color: '#A0FFD0', fontFamily: 'monospace', minHeight: 48 }}>
                  {fixPreview.diff.after_code}
                </pre>
              </div>
            </div>
            {fixPreview.diff.imports_added.length > 0 && (
              <p className="text-xs" style={{ color: '#80FF80' }}>
                + {fixPreview.diff.imports_added.join(', ')}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={onAcceptFix}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
                style={{ background: '#00A896', color: 'white' }}
              >
                <Check className="w-3.5 h-3.5" /> Accept Fix
              </button>
              <button
                onClick={onRejectFix}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
                style={{ background: '#1E3A5F', color: '#A0C0D8' }}
              >
                <X className="w-3.5 h-3.5" /> Reject
              </button>
            </div>
          </div>
        )}

        {/* Status badges */}
        {isFixed && (
          <div className="flex items-center gap-1.5 text-xs font-medium"
               style={{ color: '#00BFFF' }}>
            <Check className="w-3.5 h-3.5" />
            Fixed — written to disk
          </div>
        )}
        {isFixed && fixVerify && (
          <div className="flex items-center gap-1.5 text-xs font-medium mt-1"
               style={{ color: fixVerify.verified ? '#00C896' : '#FFC080' }}>
            {fixVerify.verified ? <Check className="w-3.5 h-3.5" /> : <span>⚠</span>}
            {fixVerify.verified ? 'Verified — standard now passes' : fixVerify.message}
          </div>
        )}
        {isIgnored && (
          <span className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: '#1E3A5F', color: '#7A9CC0' }}>
            Ignored
          </span>
        )}
        {isDeferred && (
          <span className="text-xs font-medium px-2 py-0.5 rounded"
                style={{ background: '#1E3A5F', color: '#7A9CC0' }}>
            Deferred to RE2
          </span>
        )}

        {/* Action buttons — only when not fixed/ignored/deferred/in-preview */}
        {!isFixed && !isDimmed && !showPreview && (
          <div className="flex gap-2 pt-1">
            <button
              disabled={isFixLoading}
              onClick={onFix}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-opacity"
              style={{
                background: isFixLoading ? '#1E3A5F' : '#00BFFF',
                color:      isFixLoading ? '#4A6A8A'  : '#0A1628',
                cursor:     isFixLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isFixLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fixing…</>
              ) : (
                <><Wrench className="w-3.5 h-3.5" /> Fix ✨</>
              )}
            </button>
            <button
              onClick={onIgnore}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium"
              style={{ background: '#1E3A5F', color: '#A0C0D8' }}
            >
              <EyeOff className="w-3.5 h-3.5" /> Ignore
            </button>
            <button
              onClick={onDefer}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium"
              style={{ background: '#1E3A5F', color: '#A0C0D8' }}
            >
              <Clock className="w-3.5 h-3.5" /> Defer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
