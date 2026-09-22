"use client";

import { useMemo, useState } from "react";
import { Background, BackgroundVariant, Controls, MarkerType, MiniMap, ReactFlow, type Edge, type Node, type NodeMouseHandler } from "@xyflow/react";
import { FiCalendar, FiFileText, FiMapPin, FiPackage, FiUser, FiUsers, FiX, FiZap } from "react-icons/fi";
import type { LiveEventData } from "@/lib/data/live-types";

const kindIcon = { event: FiCalendar, session: FiCalendar, venue: FiMapPin, person: FiUser, audience: FiUsers, vendor: FiPackage, document: FiFileText, source: FiFileText, task: FiZap } as const;

const positions = [
  { x: 420, y: 210 }, { x: 120, y: 80 }, { x: 680, y: 70 }, { x: 760, y: 290 },
  { x: 500, y: 430 }, { x: 140, y: 380 }, { x: 40, y: 225 }, { x: 830, y: 150 },
  { x: 320, y: 50 }, { x: 620, y: 360 }, { x: 250, y: 250 }, { x: 920, y: 380 },
];

export function EventGraph({ data }: { data: Pick<LiveEventData, "entities" | "relationships"> }) {
  const [selected, setSelected] = useState<LiveEventData["entities"][number] | null>(null);
  const nodes = useMemo<Node[]>(() => data.entities.map((entity, index) => {
    const Icon = kindIcon[entity.kind as keyof typeof kindIcon] ?? FiZap;
    return {
      id: entity.id,
      position: positions[index % positions.length],
      data: { label: <div className="flow-node-content"><span className={`flow-node-icon ${entity.kind}`}><Icon/></span><div><strong>{entity.name}</strong><small>{entity.kind} · {Math.round((entity.confidence ?? .9) * 100)}% confidence</small></div></div> },
      className: `flow-node flow-node-${entity.kind}`,
    };
  }), [data.entities]);
  const edges = useMemo<Edge[]>(() => data.relationships.map((relationship) => ({
    id: relationship.id,
    source: relationship.from_entity_id,
    target: relationship.to_entity_id,
    label: relationship.relation.replaceAll("_", " "),
    markerEnd: { type: MarkerType.ArrowClosed, color: "#6f8880", width: 16, height: 16 },
    style: { stroke: relationship.relation.includes("risk") || relationship.relation === "changes" ? "#e66432" : "#9eb0a9", strokeWidth: relationship.relation === "changes" ? 2.2 : 1.3 },
    labelStyle: { fontSize: 9, fill: "#66706c", fontWeight: 600 },
    labelBgStyle: { fill: "#f8f7f2", fillOpacity: .92 },
  })), [data.relationships]);

  const onNodeClick: NodeMouseHandler = (_, node) => setSelected(data.entities.find((entity) => entity.id === node.id) ?? null);

  return <div className="live-graph-wrap">
    <ReactFlow nodes={nodes} edges={edges} onNodeClick={onNodeClick} fitView fitViewOptions={{ padding: .18 }} minZoom={.45} maxZoom={1.8} proOptions={{ hideAttribution: true }}>
      <Background variant={BackgroundVariant.Dots} color="#c9d0cc" gap={22} size={1}/>
      <MiniMap pannable zoomable nodeColor={(node) => node.className?.toString().includes("venue") ? "#174d3c" : node.className?.toString().includes("source") ? "#e66432" : "#8fa79d"}/>
      <Controls showInteractive={false}/>
    </ReactFlow>
    <div className="graph-legend"><span><i className="event"/>Event/session</span><span><i className="venue"/>Place</span><span><i className="person"/>Person/audience</span><span><i className="source"/>Source/change</span><span>Drag nodes · scroll to zoom</span></div>
    {selected && <aside className="graph-detail"><button onClick={() => setSelected(null)} aria-label="Close detail"><FiX/></button><span className="live-eyebrow">{selected.kind}</span><h3>{selected.name}</h3><p>This fact was extracted from the imported event sources and stored in Supabase.</p><dl>{Object.entries(selected.attributes ?? {}).filter(([key]) => key !== "importKey").map(([key, value]) => <div key={key}><dt>{key.replaceAll(/([A-Z])/g, " $1")}</dt><dd>{String(value)}</dd></div>)}</dl><span className="graph-confidence">{Math.round((selected.confidence ?? .9) * 100)}% confidence</span></aside>}
  </div>;
}
