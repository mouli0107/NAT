import { useId } from 'react';

interface ScoreDialProps {
  /** 0-100 code quality score. */
  score: number;
  size?: number;
  /** Overrides the auto grade label under the number. */
  label?: string;
  caption?: string;
}

function gradeFor(pct: number): string {
  if (pct >= 90) return 'Excellent';
  if (pct >= 75) return 'Good';
  if (pct >= 60) return 'Fair';
  if (pct >= 40) return 'At risk';
  return 'Critical';
}

function colorFor(pct: number): string {
  if (pct >= 90) return '#059669';
  if (pct >= 70) return '#d97706';
  return '#dc2626';
}

/** Circular "code quality score" gauge (light theme). */
export function ScoreDial({ score, size = 200, label, caption = 'Code Quality Score' }: ScoreDialProps) {
  const gid = useId().replace(/:/g, '');
  const pct = Math.max(0, Math.min(100, Math.round(Number.isFinite(score) ? score : 0)));
  const stroke = Math.round(size * 0.08);
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const cx = size / 2;
  const cy = size / 2;
  const endColor = colorFor(pct);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={stroke} />
        <defs>
          <linearGradient id={`cl-dial-${gid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="55%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={`url(#cl-dial-${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
        <div className="cl-grot" style={{ fontSize: Math.round(size * 0.26), fontWeight: 700, color: '#111827', lineHeight: 1 }}>
          {pct}<span style={{ fontSize: Math.round(size * 0.12), color: '#9ca3af' }}>%</span>
        </div>
        <div className="cl-mono" style={{ fontSize: Math.max(9, Math.round(size * 0.058)), color: endColor, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
          {label ?? gradeFor(pct)}
        </div>
        <div className="cl-mono" style={{ fontSize: Math.max(8, Math.round(size * 0.05)), color: '#6b7280', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>
          {caption}
        </div>
      </div>
    </div>
  );
}
