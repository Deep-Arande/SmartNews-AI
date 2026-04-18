// ─── Helpers ─────────────────────────────────────────────────────────────────

function verdictMeta(v) {
	const val = (v || '').toLowerCase();
	if (val === 'true') return { cls: 'true', text: 'TRUE', emoji: '✓', dotColor: '#22c55e' };
	if (val === 'false') return { cls: 'false', text: 'FALSE', emoji: '✗', dotColor: '#ef4444' };
	return { cls: 'uncertain', text: 'UNCERTAIN', emoji: '?', dotColor: '#f59e0b' };
}

function scoreColor(score) {
	if (score >= 0.65) return '#22c55e';
	if (score >= 0.4) return '#f59e0b';
	return '#ef4444';
}

function scoreColorLabel(score) {
	if (score >= 0.65) return 'High credibility';
	if (score >= 0.4) return 'Mixed credibility';
	return 'Low credibility';
}

// Split explanation into bullet points
function toBullets(text) {
	if (!text) return [];
	// Try splitting on ". " boundaries, or newline, keeping reasonable chunks
	const parts = text
		.split(/(?<=[.!?])\s+/)
		.map(s => s.trim())
		.filter(s => s.length > 10);
	// Cap at 4 bullets
	return parts.slice(0, 4);
}

// ─── Score Ring SVG ───────────────────────────────────────────────────────────

function ScoreRing({ score }) {
	const pct = Math.round((score ?? 0) * 100);
	const color = scoreColor(score);
	const r = 44;
	const circ = 2 * Math.PI * r;
	const offset = circ - (pct / 100) * circ;

	return (
		<div className="score-ring-wrap">
			<div style={{ position: 'relative', width: 110, height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
				<svg width="110" height="110" className="score-ring-svg">
					<circle className="score-ring-track" cx="55" cy="55" r={r} />
					<circle
						className="score-ring-fill"
						cx="55" cy="55" r={r}
						stroke={color}
						strokeDasharray={circ}
						strokeDashoffset={offset}
					/>
				</svg>
				<div className="score-ring-text-wrap">
					<span className="score-ring-pct" style={{ color }}>{pct}%</span>
					<span className="score-ring-sub">credibility</span>
				</div>
			</div>
			<span className="score-ring-label">{scoreColorLabel(score)}</span>
		</div>
	);
}

// ─── Source Chip ──────────────────────────────────────────────────────────────

function SourceChip({ source }) {
	const pct = Math.round((source.credibility_score ?? 0.5) * 100);
	const color = scoreColor(source.credibility_score ?? 0.5);
	return (
		<a
			href={source.url}
			target="_blank"
			rel="noopener noreferrer"
			className="source-chip"
		>
			<span className="source-chip-icon">🔗</span>
			<div className="source-chip-content">
				<div className="source-chip-domain">{source.domain || 'Unknown source'}</div>
				<div className="source-chip-url">{source.url}</div>
			</div>
			<div className="source-chip-score">
				<span className="source-chip-pct" style={{ color }}>{pct}%</span>
				<div className="source-chip-bar">
					<div className="source-chip-bar-fill" style={{ width: `${pct}%`, background: color }} />
				</div>
			</div>
			<span className="source-chip-arrow">↗</span>
		</a>
	);
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResultCard({ verdict, score, claims, explanation, summary, sources }) {
	const meta = verdictMeta(verdict);
	const text = explanation || summary || '';
	const bullets = toBullets(text);
	const hasClaims = claims && claims.length > 0;
	const hasSources = sources && sources.length > 0;

	return (
		<>
			{/* ── 1. Verdict Hero ────────────────────────── */}
			<div className={`verdict-hero ${meta.cls}-hero`}>
				<div className="verdict-label">Verification Result</div>
				<div className={`verdict-main ${meta.cls}-text`}>{meta.text}</div>
				<ScoreRing score={score} />
			</div>

			{/* ── 2. Why Section (Explanation Bullets) ───── */}
			{bullets.length > 0 && (
				<div className="why-section">
					<div className="why-title">Why this verdict?</div>
					<ul className="why-bullets">
						{bullets.map((b, i) => (
							<li key={i} className="why-bullet">
								<span className="why-dot" style={{ background: meta.dotColor, opacity: 0.7 + i * 0.05 }} />
								<span>{b}</span>
							</li>
						))}
					</ul>
				</div>
			)}

			{/* ── 3. Collapsible: Claims ──────────────────── */}
			{hasClaims && (
				<details className="detail-section">
					<summary>
						<span className="summary-left">
							<span className="summary-icon">📋</span>
							View Extracted Claims
							<span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>({claims.length})</span>
						</span>
						<span className="summary-chevron">▼</span>
					</summary>
					<div className="detail-section-body">
						<ul className="claims-list" style={{ marginTop: 12 }}>
							{claims.map((c, i) => {
								const cvClass = (c.verdict || '').toLowerCase();
								return (
									<li key={i} className={`claim-item ${cvClass}`}>
										<span className={`claim-badge ${cvClass}`}>{c.verdict || 'Unknown'}</span>
										<div className="claim-text">{c.claim}</div>
										{c.explanation && <div className="claim-explanation">{c.explanation}</div>}
									</li>
								);
							})}
						</ul>
					</div>
				</details>
			)}

			{/* ── 4. Collapsible: Sources ─────────────────── */}
			{hasSources && (
				<details className="detail-section">
					<summary>
						<span className="summary-left">
							<span className="summary-icon">🌐</span>
							View News Sources
							<span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 400 }}>({sources.length})</span>
						</span>
						<span className="summary-chevron">▼</span>
					</summary>
					<div className="detail-section-body">
						<div className="sources-list" style={{ marginTop: 12 }}>
							{sources.map((s, i) => (
								<SourceChip key={i} source={s} />
							))}
						</div>
					</div>
				</details>
			)}
		</>
	);
}
