import { useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

// Rich per-node-type colour palette
function nodeColor(node) {
	const type = (node.type || '').toLowerCase();
	const verdict = (node.properties?.verdict || '').toLowerCase();

	if (verdict === 'true') return '#22c55e';
	if (verdict === 'false') return '#ef4444';

	if (type === 'claim') return '#8b5cf6';  // violet
	if (type === 'source') return '#06b6d4';  // cyan
	if (type === 'concept') return '#f97316';  // orange
	if (type === 'entity') return '#ec4899';  // pink
	if (type === 'event') return '#f59e0b';  // amber

	return '#6c63ff';  // default accent
}

function nodeGlowColor(node) {
	const c = nodeColor(node);
	// Return rgba glow
	const map = {
		'#22c55e': 'rgba(34,197,94,0.6)',
		'#ef4444': 'rgba(239,68,68,0.6)',
		'#8b5cf6': 'rgba(139,92,246,0.6)',
		'#06b6d4': 'rgba(6,182,212,0.6)',
		'#f97316': 'rgba(249,115,22,0.6)',
		'#ec4899': 'rgba(236,72,153,0.6)',
		'#f59e0b': 'rgba(245,158,11,0.6)',
		'#6c63ff': 'rgba(108,99,255,0.6)',
	};
	return map[c] || 'rgba(108,99,255,0.4)';
}

function linkColor(link) {
	if (link.conflict) return '#ef4444';
	const rel = (link.relation || '').toLowerCase();
	if (rel.includes('support') || rel.includes('confirms')) return '#22c55e';
	if (rel.includes('contradict') || rel.includes('refutes')) return '#ef4444';
	return '#6c63ff';
}

export default function KnowledgeGraph({ graph }) {
	const containerRef = useRef(null);
	const fgRef = useRef(null);

	if (!graph || (!graph.nodes?.length && !graph.edges?.length)) return null;

	const data = {
		nodes: graph.nodes.map(n => ({ ...n, id: String(n.id) })),
		links: graph.edges.map(e => ({
			...e,
			source: String(e.source),
			target: String(e.target),
		})),
	};

	const handleEngineStop = useCallback(() => {
		fgRef.current?.zoomToFit(500, 50);
	}, []);

	const drawLink = useCallback((link, ctx, globalScale) => {
		const start = link.source;
		const end = link.target;
		if (!start || !end || typeof start !== 'object') return;

		const color = linkColor(link);
		const isConflict = link.conflict;

		ctx.strokeStyle = color;
		ctx.lineWidth = isConflict ? 2.5 : 1.5;
		ctx.setLineDash(isConflict ? [5, 4] : []);
		ctx.globalAlpha = 0.75;

		ctx.beginPath();
		ctx.moveTo(start.x, start.y);
		ctx.lineTo(end.x, end.y);
		ctx.stroke();

		ctx.setLineDash([]);
		ctx.globalAlpha = 1;

		// Relation label
		if (link.relation && globalScale > 0.5) {
			const midX = (start.x + end.x) / 2;
			const midY = (start.y + end.y) / 2;
			const fontSize = 8 / globalScale;
			ctx.font = `${fontSize}px Inter, sans-serif`;
			ctx.fillStyle = color + 'bb';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'middle';
			ctx.fillText(link.relation.slice(0, 18), midX, midY - 5);
		}
	}, []);

	const drawNode = useCallback((node, ctx, globalScale) => {
		const r = 8;
		const color = nodeColor(node);
		const glow = nodeGlowColor(node);

		// Outer glow ring
		ctx.beginPath();
		ctx.arc(node.x, node.y, r + 4, 0, 2 * Math.PI);
		ctx.fillStyle = glow;
		ctx.fill();

		// Node body with gradient-like solid colour
		ctx.beginPath();
		ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
		ctx.fillStyle = color;
		ctx.fill();

		// Inner highlight
		ctx.beginPath();
		ctx.arc(node.x - r * 0.25, node.y - r * 0.25, r * 0.35, 0, 2 * Math.PI);
		ctx.fillStyle = 'rgba(255,255,255,0.3)';
		ctx.fill();

		// Stroke ring
		ctx.beginPath();
		ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
		ctx.strokeStyle = 'rgba(255,255,255,0.15)';
		ctx.lineWidth = 1.5;
		ctx.stroke();

		// Label
		if (globalScale > 0.55) {
			const label = node.label || String(node.id);
			const fontSize = 9 / globalScale;
			ctx.font = `600 ${fontSize}px Inter, sans-serif`;
			ctx.fillStyle = '#e8e8f0ee';
			ctx.textAlign = 'center';
			ctx.textBaseline = 'top';
			// small shadow for readability
			ctx.shadowColor = 'rgba(0,0,0,0.8)';
			ctx.shadowBlur = 4;
			ctx.fillText(label.slice(0, 20), node.x, node.y + r + 3);
			ctx.shadowBlur = 0;
		}
	}, []);

	const nodeCount = data.nodes.length;
	const edgeCount = data.links.length;

	return (
		<details className="graph-toggle">
			<summary>
				<span className="graph-toggle-label">
					🕸️ Knowledge Graph
					<span className="graph-toggle-badge">{nodeCount} nodes · {edgeCount} edges</span>
				</span>
				<span className="graph-toggle-chevron">▼</span>
			</summary>
			<div className="graph-canvas-wrap" ref={containerRef}>
				<ForceGraph2D
					ref={fgRef}
					graphData={data}
					width={containerRef.current?.clientWidth || 720}
					height={420}
					backgroundColor="#0a0a0f"
					linkCanvasObject={drawLink}
					linkCanvasObjectMode={() => 'replace'}
					nodeCanvasObject={drawNode}
					nodeCanvasObjectMode={() => 'replace'}
					onEngineStop={handleEngineStop}
					nodeLabel={node =>
						`${node.label || node.id}\nType: ${node.type || 'Unknown'}\nVerdict: ${node.properties?.verdict || 'N/A'}`
					}
					linkDirectionalArrowLength={7}
					linkDirectionalArrowRelPos={1}
					linkDirectionalArrowColor={link => linkColor(link)}
					cooldownTicks={100}
					d3AlphaDecay={0.02}
					d3VelocityDecay={0.3}
				/>
			</div>
		</details>
	);
}
