import { useState } from 'react';
import { Link } from 'react-router-dom';
import { startSession, sendChat } from '../services/api';
import ResultCard from '../components/ResultCard';
import KnowledgeGraph from '../components/KnowledgeGraph';
import ChatBox from '../components/ChatBox';
import Loader from '../components/Loader';

export default function PremiumPage() {
	const [query, setQuery] = useState('');
	const [result, setResult] = useState(null);
	const [sessionId, setSessionId] = useState(null);
	const [messages, setMessages] = useState([]);
	const [chatInput, setChatInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [chatLoading, setChatLoading] = useState(false);
	const [error, setError] = useState('');

	const handleStart = async () => {
		if (!query.trim()) { setError('Please enter a news headline or claim.'); return; }
		setError('');
		setLoading(true);
		try {
			const data = await startSession(query.trim());
			setResult(data);
			setSessionId(data.session_id);
			setMessages([]);
		} catch (e) {
			setError(e?.response?.data?.detail || 'Could not start session. Is the backend running?');
		} finally {
			setLoading(false);
		}
	};

	const handleSend = async (question) => {
		if (!sessionId) return;
		setChatInput('');
		setMessages(prev => [...prev, { role: 'user', text: question }]);
		setChatLoading(true);
		try {
			const res = await sendChat(sessionId, question);
			const answer = res.answer || res.response || res.message || JSON.stringify(res);
			setMessages(prev => [...prev, { role: 'ai', text: answer }]);
		} catch (e) {
			setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Error: ' + (e?.response?.data?.detail || e.message) }]);
		} finally {
			setChatLoading(false);
		}
	};

	const handleReset = () => {
		setResult(null);
		setSessionId(null);
		setMessages([]);
		setQuery('');
		setError('');
	};

	return (
		<div className="page" style={{ justifyContent: 'flex-start', paddingTop: 48 }}>
			<Loader loading={loading} />
			<div className="container">
				<Link to="/select" className="back-link">← Back</Link>

				{/* Header */}
				<div style={{ textAlign: 'center', marginBottom: 28 }}>
					<div className="logo">💬 Premium <span>AI Assistant</span></div>
					<p className="tagline">Deep analysis with conversational follow-up</p>
				</div>

				{/* ── 1. Input — hidden once session starts ─── */}
				{!sessionId && (
					<div className="card">
						{error && <div className="error-banner">{error}</div>}
						<p className="section-title" style={{ marginBottom: 10 }}>Analyse a claim</p>
						<textarea
							className="input"
							placeholder="Enter a news headline, claim, or URL…"
							value={query}
							onChange={e => setQuery(e.target.value)}
							rows={3}
						/>
						<button
							className="btn btn-primary btn-full"
							style={{ marginTop: 12 }}
							onClick={handleStart}
							disabled={loading}
						>
							{loading ? 'Analysing…' : '🚀 Start Deep Analysis'}
						</button>
					</div>
				)}

				{/* ── 2–5. Result → Explanation → Details → Chat ── */}
				{result && (
					<>
						{/* Analysed query + reset */}
						{sessionId && (
							<div style={{
								display: 'flex', alignItems: 'center',
								justifyContent: 'space-between', marginBottom: 12,
							}}>
								<p className="section-title" style={{ margin: 0 }}>Analysis Result</p>
								<button
									className="btn btn-outline"
									style={{ padding: '6px 14px', fontSize: '0.8rem' }}
									onClick={handleReset}
								>
									New Analysis
								</button>
							</div>
						)}

						{/* Verdict + Why + Claims (collapsible) + Sources (collapsible) */}
						<ResultCard
							verdict={result.verdict}
							score={result.score}
							claims={result.claims}
							summary={result.summary}
							explanation={result.explanation}
							sources={result.sources}
						/>

						{/* Knowledge Graph — collapsible */}
						<KnowledgeGraph graph={result.graph} />

						{/* Chat — secondary, collapsed by default */}
						<ChatBox
							messages={messages}
							input={chatInput}
							setInput={setChatInput}
							onSend={handleSend}
							loading={chatLoading}
						/>
					</>
				)}
			</div>
		</div>
	);
}
