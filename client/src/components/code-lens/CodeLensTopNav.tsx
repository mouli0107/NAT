export type CodeLensMode = 'SETUP' | 'HISTORY' | 'COMPARE' | 'REVIEW' | 'REPORT';

interface CodeLensTopNavProps {
  mode: CodeLensMode;
  onNewReview: () => void;
  onOpenHistory: () => void;
  /** Optional live code-quality score shown as a chip on the right. */
  score?: number | null;
}

function scoreColor(pct: number): string {
  if (pct >= 90) return '#059669';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

/** Persistent top bar for Code Lens: brand, New Review / Run History tabs, and a
 *  live quality-score chip. Navigation to other tools is via the global sidebar. */
export function CodeLensTopNav({ mode, onNewReview, onOpenHistory, score }: CodeLensTopNavProps) {
  const listActive = mode === 'SETUP';
  const historyActive = mode === 'HISTORY' || mode === 'COMPARE';

  return (
    <div
      className="cl-mono"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px', borderBottom: '1px solid var(--cl-line)',
        background: '#ffffff', flexShrink: 0, zIndex: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="cl-logo-mark" />
        <div className="cl-grot" style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.3, color: 'var(--cl-t0)' }}>
          ASTRA <span style={{ color: 'var(--cl-cyan)' }}>Code Lens</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className={`cl-navbtn cl-navtab ${listActive ? 'active' : ''}`} onClick={onNewReview}>
          New Review
        </button>
        <button className={`cl-navbtn cl-navtab ${historyActive ? 'active' : ''}`} onClick={onOpenHistory}>
          Run History
        </button>

        {typeof score === 'number' && Number.isFinite(score) && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6,
              padding: '6px 14px', borderRadius: 999,
              border: `1px solid ${scoreColor(score)}55`, background: `${scoreColor(score)}12`,
            }}
          >
            <span style={{ fontSize: 10, color: 'var(--cl-t2)', letterSpacing: 1, textTransform: 'uppercase' }}>
              Quality
            </span>
            <span className="cl-grot" style={{ fontWeight: 700, fontSize: 15, color: scoreColor(score) }}>
              {Math.round(score)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
