import { useState, useMemo } from 'react';
import { MermaidDiagram } from '@/components/functional/MermaidDiagram';
import type { ArchitectureGraph } from './codeLensTypes';

/**
 * Architecture view for any repo size:
 *   • "Overview" — aggregated 4-box layered summary (Controllers → Services →
 *     Repositories → DB). Readable even with 60+ controllers.
 *   • Drill-down — pick one controller to see just its Controller → Service →
 *     Repository → DB chain (small, clean), with illegal edges in red.
 * Avoids rendering all ~158 nodes at once (the unreadable full graph).
 */
export function ArchitectureView({ graph }: { graph: ArchitectureGraph }) {
  // 'overview' = the summary; otherwise a controller flow id.
  const [selected, setSelected] = useState<string>('overview');

  const flows = graph.flows ?? [];
  const sortedFlows = useMemo(
    () => [...flows].sort((a, b) => b.illegal - a.illegal || a.label.localeCompare(b.label)),
    [flows],
  );
  const current = selected === 'overview' ? null : flows.find(f => f.id === selected) ?? null;
  const chart = current ? current.mermaid : (graph.summaryMermaid || graph.mermaid);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="text-xs rounded px-2 py-1.5"
          style={{ background: '#0A1628', color: '#C0D8F0', border: '1px solid #1E3A5F', maxWidth: '460px' }}
        >
          <option value="overview">
            Overview — {graph.stats.controllers} controllers · {graph.stats.services} services · {graph.stats.repositories} repositories
          </option>
          {sortedFlows.map(f => (
            <option key={f.id} value={f.id}>
              {f.label}{f.illegal > 0 ? `  (⚠ ${f.illegal})` : ''}
            </option>
          ))}
        </select>
        {current
          ? <span className="text-[11px]" style={{ color: '#7A9CC0' }}>
              {current.nodeCount} nodes{current.illegal > 0 && <span style={{ color: '#FF8080' }}> · {current.illegal} illegal edge(s)</span>}
            </span>
          : <span className="text-[11px]" style={{ color: '#7A9CC0' }}>
              pick a controller to walk its Controller → Service → Repository → DB chain
            </span>}
      </div>
      <MermaidDiagram chart={chart} />
    </div>
  );
}
