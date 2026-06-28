import { useState, useEffect } from 'react';
import type { CompareResult, StandardBreakdown } from '@/lib/codeLensHistoryApi';
import { fetchCompare } from '@/lib/codeLensHistoryApi';

interface Props {
  runId1: string;
  runId2: string;
  onBack: () => void;
}

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const isGood = invert ? value < 0 : value > 0;
  const color = value === 0 ? 'text-gray-400' : isGood ? 'text-green-600' : 'text-red-500';
  const sign = value > 0 ? '+' : '';
  return <span className={`font-semibold ${color}`}>{sign}{value}</span>;
}

function PctDelta({ value }: { value: number }) {
  const color = value === 0 ? 'text-gray-400' : value > 0 ? 'text-green-600' : 'text-red-500';
  return <span className={`font-semibold ${color}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}%</span>;
}

function TrendIcon({ trend }: { trend: StandardBreakdown['trend'] }) {
  if (trend === 'IMPROVING') return <span className="text-green-600">↓ Improving</span>;
  if (trend === 'REGRESSING') return <span className="text-red-500">↑ Regressing</span>;
  return <span className="text-gray-400">→ Stable</span>;
}

export function RunComparison({ runId1, runId2, onBack }: Props) {
  const [result,  setResult]  = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [showTab, setShowTab] = useState<'overview' | 'standards' | 'violations'>('overview');

  useEffect(() => {
    fetchCompare(runId1, runId2)
      .then(setResult)
      .catch(e => setError(e instanceof Error ? e.message : 'Compare failed'))
      .finally(() => setLoading(false));
  }, [runId1, runId2]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
        Comparing runs…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline">← Back</button>
        <div className="text-red-600 text-sm">{error}</div>
      </div>
    );
  }

  if (!result) return null;

  const { baseline, latest, delta } = result;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-sm text-blue-600 hover:underline">← Back</button>
        <h2 className="text-base font-semibold text-gray-800">Run Comparison</h2>
      </div>

      {/* Run metadata */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-gray-500 mb-1">Baseline</div>
          <div className="font-mono font-semibold">{baseline.commitHash?.slice(0, 8) ?? '—'}</div>
          <div className="text-gray-500">{new Date(baseline.startedAt).toLocaleString()}</div>
          <div className="text-green-600 font-semibold mt-1">{baseline.compliancePct.toFixed(1)}% compliant</div>
        </div>
        <div className="border rounded-lg p-3 bg-gray-50">
          <div className="text-gray-500 mb-1">Latest</div>
          <div className="font-mono font-semibold">{latest.commitHash?.slice(0, 8) ?? '—'}</div>
          <div className="text-gray-500">{new Date(latest.startedAt).toLocaleString()}</div>
          <div className="text-green-600 font-semibold mt-1">{latest.compliancePct.toFixed(1)}% compliant</div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="border rounded p-2">
          <div className="text-gray-500">Compliance</div>
          <PctDelta value={delta.compliancePct} />
        </div>
        <div className="border rounded p-2">
          <div className="text-gray-500">Critical</div>
          <Delta value={delta.critical} invert />
        </div>
        <div className="border rounded p-2">
          <div className="text-gray-500">Files improved</div>
          <span className="font-semibold text-green-600">{delta.filesImproved}</span>
        </div>
        <div className="border rounded p-2">
          <div className="text-gray-500">Files regressed</div>
          <span className="font-semibold text-red-500">{delta.filesRegressed}</span>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b">
        {(['overview', 'standards', 'violations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setShowTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium capitalize ${
              showTab === tab
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
            {tab === 'violations' && delta.newViolations.length > 0 && (
              <span className="ml-1 bg-red-100 text-red-600 px-1 rounded-full">
                +{delta.newViolations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {showTab === 'overview' && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold text-green-700 mb-2">
              Fixed ({delta.fixedViolations.length})
            </div>
            {delta.fixedViolations.length === 0 ? (
              <div className="text-gray-400 text-xs">No violations fixed</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {delta.fixedViolations.map((v, i) => (
                  <div key={i} className="border-l-2 border-green-400 pl-2 text-xs">
                    <div className="font-mono text-gray-600 truncate">{v.filePath}</div>
                    <div className="text-gray-500">{v.standardId} {v.lineStart ? `L${v.lineStart}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="font-semibold text-red-600 mb-2">
              New ({delta.newViolations.length})
            </div>
            {delta.newViolations.length === 0 ? (
              <div className="text-gray-400 text-xs">No new violations</div>
            ) : (
              <div className="space-y-1 max-h-48 overflow-auto">
                {delta.newViolations.map((v, i) => (
                  <div key={i} className="border-l-2 border-red-400 pl-2 text-xs">
                    <div className="font-mono text-gray-600 truncate">{v.filePath}</div>
                    <div className="text-gray-500">{v.standardId} {v.lineStart ? `L${v.lineStart}` : ''}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showTab === 'standards' && (
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-2">Standard</th>
                <th className="p-2 text-center">Baseline</th>
                <th className="p-2 text-center">Latest</th>
                <th className="p-2 text-center">Delta</th>
                <th className="p-2 text-center">Trend</th>
              </tr>
            </thead>
            <tbody>
              {delta.standardsBreakdown.map(s => (
                <tr key={s.standardId} className="border-t">
                  <td className="p-2">
                    <div className="font-semibold">{s.standardId}</div>
                    <div className="text-gray-500 truncate max-w-xs">{s.standardName}</div>
                  </td>
                  <td className="p-2 text-center">{s.baselineViolations}</td>
                  <td className="p-2 text-center">{s.latestViolations}</td>
                  <td className="p-2 text-center"><Delta value={s.delta} invert /></td>
                  <td className="p-2 text-center"><TrendIcon trend={s.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showTab === 'violations' && (
        <div className="space-y-2 max-h-80 overflow-auto">
          {delta.newViolations.length === 0 && (
            <div className="text-gray-400 text-sm text-center py-8">No new violations introduced</div>
          )}
          {delta.newViolations.map((v, i) => (
            <div key={i} className="border-l-4 border-red-400 pl-3 py-2 bg-red-50 rounded text-xs">
              <div className="font-semibold text-red-700">{v.standardId}</div>
              <div className="text-gray-700 font-mono truncate">{v.filePath}</div>
              {v.lineStart && <div className="text-gray-500">Line {v.lineStart}</div>}
              {v.foundCode && (
                <pre className="mt-1 text-red-800 overflow-auto max-h-12">{v.foundCode}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
