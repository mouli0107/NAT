import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import type { ArchitectureGraph } from './codeLensTypes';

const NODE_W = 190;
const NODE_H = 44;

const LAYER_STYLE: Record<string, { bg: string; border: string }> = {
  controller: { bg: '#13294d', border: '#3B82F6' },
  service:    { bg: '#0d2a24', border: '#10B981' },
  repository: { bg: '#241a3a', border: '#A855F7' },
  data:       { bg: '#2a2200', border: '#F59E0B' },
  other:      { bg: '#1A2A3F', border: '#4A6A8A' },
};

/** Interactive, draggable, auto-laid-out dependency graph (React Flow + dagre).
 *  Complements the Mermaid summary/drill-down — this is the "explore everything"
 *  view: pan/zoom/minimap, left-to-right layered layout, illegal edges in red. */
export function ArchitectureFlowGraph({ graph }: { graph: ArchitectureGraph }) {
  const { nodes, edges } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'LR', nodesep: 24, ranksep: 90, marginx: 8, marginy: 8 });

    for (const n of graph.nodes) g.setNode(n.id, { width: NODE_W, height: NODE_H });
    for (const e of graph.edges) g.setEdge(e.from, e.to);
    dagre.layout(g);

    const rfNodes: Node[] = graph.nodes.map(n => {
      const p = g.node(n.id);
      const s = LAYER_STYLE[n.layer] ?? LAYER_STYLE.other;
      return {
        id: n.id,
        data: { label: n.label },
        position: { x: (p?.x ?? 0) - NODE_W / 2, y: (p?.y ?? 0) - NODE_H / 2 },
        style: {
          width: NODE_W, fontSize: 11, color: '#E6F0FF',
          background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 8,
          padding: '6px 8px',
        },
      };
    });

    const rfEdges: Edge[] = graph.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.from,
      target: e.to,
      label: e.illegal ? `⚠ ${e.standardId ?? ''}` : (e.viaInterface ?? undefined),
      animated: !!e.illegal,
      style: { stroke: e.illegal ? '#FF4444' : '#3E5C7E', strokeWidth: e.illegal ? 2 : 1.2, strokeDasharray: e.illegal ? '5 4' : undefined },
      labelStyle: { fill: e.illegal ? '#FF8080' : '#7A9CC0', fontSize: 10 },
      labelBgStyle: { fill: '#0A1628' },
    }));

    return { nodes: rfNodes, edges: rfEdges };
  }, [graph]);

  return (
    <div style={{ height: 560, border: '1px solid #1E3A5F', borderRadius: 12, background: '#0A1628' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.1}
        nodesConnectable={false}
        elementsSelectable
      >
        <Background color="#1E3A5F" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          style={{ background: '#0D1F3C' }}
          nodeColor={(n) => {
            const gn = graph.nodes.find(x => x.id === n.id);
            return (LAYER_STYLE[gn?.layer ?? 'other'] ?? LAYER_STYLE.other).border;
          }}
        />
      </ReactFlow>
    </div>
  );
}
