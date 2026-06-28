import type { StandardCheckResult, ViolationSeverity, StandardStatus } from './codeLensTypes';

interface Props {
  fileId: string | null;
  results: StandardCheckResult[];
  onViolationClick: (ruleId: string) => void;
}

const STATUS_DOT: Record<StandardStatus, { color: string; label: string }> = {
  PASS:           { color: '#00A896', label: '✓' },
  VIOLATION:      { color: '#FF4444', label: '✗' },
  NOT_APPLICABLE: { color: '#6B7280', label: '—' },
  ERROR:          { color: '#FFA500', label: '!' },  // check did not complete (unverified)
};
const FALLBACK_DOT = { color: '#FFA500', label: '?' };

const SEVERITY_COLOR: Record<ViolationSeverity, string> = {
  Critical: '#FF4444',
  Warning:  '#F59E0B',
  Info:     '#60A5FA',
};

export function StandardsChecklist({ fileId, results, onViolationClick }: Props) {
  if (!fileId) {
    return (
      <div className="flex items-center justify-center h-24 text-xs" style={{ color: '#4A6A8A' }}>
        Select a file to see standards checklist
      </div>
    );
  }

  const totalStandards = 42;
  const loaded = results.length;
  const passes = results.filter(r => r.status === 'PASS').length;
  const violations = results.filter(r => r.status === 'VIOLATION').length;
  const notApplicable = results.filter(r => r.status === 'NOT_APPLICABLE').length;
  const errored = results.filter(r => r.status === 'ERROR').length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Mini progress strip */}
      <div className="px-3 pt-2 pb-1 flex-shrink-0">
        <div className="flex items-center justify-between text-xs mb-1" style={{ color: '#7A9CC0' }}>
          <span>{loaded}/{totalStandards} checked</span>
          <span>
            <span style={{ color: '#00A896' }}>{passes} pass</span>
            {' · '}
            <span style={{ color: '#FF4444' }}>{violations} fail</span>
            {' · '}
            <span style={{ color: '#6B7280' }}>{notApplicable} N/A</span>
            {errored > 0 && (<>{' · '}<span style={{ color: '#FFA500' }}>{errored} unverified</span></>)}
          </span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 3, background: '#1E3A5F' }}>
          {loaded > 0 && (
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(loaded / totalStandards) * 100}%`,
                background: violations > 0 ? '#FF4444' : '#00A896',
              }}
            />
          )}
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto">
        {loaded === 0 ? (
          <div className="text-xs text-center py-6" style={{ color: '#4A6A8A' }}>
            Checking standards…
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <tbody>
              {results.map(r => {
                const dot = STATUS_DOT[r.status] ?? FALLBACK_DOT;
                const isViolation = r.status === 'VIOLATION';
                return (
                  <tr
                    key={r.rule_id}
                    onClick={() => isViolation && onViolationClick(r.rule_id)}
                    title={r.checked}
                    className="border-b transition-colors"
                    style={{
                      borderColor: '#1E3A5F',
                      cursor: isViolation ? 'pointer' : 'default',
                      background: isViolation ? 'rgba(255,68,68,0.05)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (isViolation) (e.currentTarget as HTMLElement).style.background = 'rgba(255,68,68,0.12)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = isViolation ? 'rgba(255,68,68,0.05)' : 'transparent';
                    }}
                  >
                    {/* Status dot */}
                    <td className="py-1.5 pl-3 pr-1 w-5">
                      <span
                        className="inline-flex items-center justify-center rounded-full font-bold"
                        style={{ color: dot.color, fontSize: 11, width: 14 }}
                      >
                        {dot.label}
                      </span>
                    </td>

                    {/* Rule ID */}
                    <td className="py-1.5 pr-2 font-mono" style={{ color: '#7A9CC0', minWidth: 32 }}>
                      {r.rule_id}
                    </td>

                    {/* Name */}
                    <td className="py-1.5 pr-2 flex-1" style={{ color: isViolation ? '#E2E8F0' : '#94A3B8' }}>
                      {r.rule_name}
                    </td>

                    {/* Severity badge for violations */}
                    <td className="py-1.5 pr-3 text-right">
                      {isViolation && (
                        <span
                          className="inline-block rounded px-1 text-[10px] font-semibold"
                          style={{
                            color: SEVERITY_COLOR[r.severity],
                            background: `${SEVERITY_COLOR[r.severity]}22`,
                            border: `1px solid ${SEVERITY_COLOR[r.severity]}44`,
                          }}
                        >
                          {r.severity[0]}
                          {r.violations.length > 1 && ` ×${r.violations.length}`}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
