import { useState } from 'react';
import { Link } from 'react-router-dom';
import { verifyNews } from '../services/api';
import ResultCard from '../components/ResultCard';
import KnowledgeGraph from '../components/KnowledgeGraph';
import ChatBox from '../components/ChatBox';
import Loader from '../components/Loader';

export default function VerifyPage() {
	const [query, setQuery] = useState('');
	const [result, setResult] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [messages, setMessages] = useState([]);
	const [chatInput, setChatInput] = useState('');
	const [chatLoading, setChatLoading] = useState(false);

	const handleVerify = async () => {
		if (!query.trim()) { setError('Please enter a news headline or claim.'); return; }
		setError('');
		setLoading(true);
		try {
			const data = await verifyNews(query.trim());
			setResult(data);
			setMessages([]);
		} catch (e) {
			setError(e?.response?.data?.detail || 'Verification failed. Is the backend running?');
		} finally {
			setLoading(false);
		}
	};

	const handleReset = () => {
		setResult(null);
		setQuery('');
		setError('');
		setMessages([]);
	};

	// Normal verify has no session; show upgrade hint
	const handleChat = async (question) => {
		setChatInput('');
		setMessages(prev => [...prev, { role: 'user', text: question }]);
		setChatLoading(true);
		setTimeout(() => {
			setMessages(prev => [...prev, {
				role: 'ai',
				text: '💡 For full conversational follow-up with session memory, switch to the Premium AI Assistant mode.',
			}]);
			setChatLoading(false);
		}, 600);
	};

	return (
		<div className="page" style={{ justifyContent: 'flex-start', paddingTop: 48 }}>
			<Loader loading={loading} />
			<div className="container">
				<Link to="/select" className="back-link">← Back</Link>

				{/* Header */}
				<div style={{ textAlign: 'center', marginBottom: 28 }}>
					<div className="logo">🧾 Normal <span>Fact Check</span></div>
					<p className="tagline">Enter a news headline, claim, or URL to verify</p>
				</div>

				{/* ── 1. Input ─────────────────────────────── */}
				<div className="card">
					{error && <div className="error-banner">{error}</div>}
					<textarea
						className="input"
						placeholder="E.g. 'Scientists confirm coffee cures all diseases…'"
						value={query}
						onChange={e => setQuery(e.target.value)}
						rows={3}
					/>
					<div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
						<button
							className="btn btn-primary btn-full"
							onClick={handleVerify}
							disabled={loading}
						>
							{loading ? 'Verifying…' : '🔍 Verify Claim'}
						</button>
						{result && (
							<button
								className="btn btn-outline"
								style={{ whiteSpace: 'nowrap' }}
								onClick={handleReset}
							>
								New Check
							</button>
						)}
					</div>
				</div>

				{/* ── 2–5. Result → Explanation → Details → Chat ── */}
				{result && (
					<>
						{/* Verdict + Why + Claims (collapsible) + Sources (collapsible) */}
						<ResultCard
							verdict={result.verdict}
							score={result.score}
							claims={result.claims}
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
							onSend={handleChat}
							loading={chatLoading}
						/>
					</>
				)}
			</div>
		</div>
	);
}
