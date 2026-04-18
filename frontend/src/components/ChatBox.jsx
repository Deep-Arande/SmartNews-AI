import { useRef, useEffect } from 'react';

const SUGGESTIONS = [
	"Why is this verdict false?",
	"Which sources support this?",
	"What are the conflicting claims?",
	"Can you summarise the key evidence?",
];

export default function ChatBox({ messages, input, setInput, onSend, loading }) {
	const bottomRef = useRef(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleKey = (e) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			if (!loading && input.trim()) onSend(input.trim());
		}
	};

	const sendSuggestion = (q) => {
		if (!loading) onSend(q);
	};

	return (
		<details className="chat-cta-section">
			{/* ── Collapsed CTA ── */}
			<summary className="chat-cta-summary">
				<div className="chat-cta-icon">💡</div>
				<div className="chat-cta-text">
					<div className="chat-cta-title">Want deeper insights? Ask the AI</div>
					<div className="chat-cta-sub">Follow-up questions about this verification result</div>
				</div>
				<span className="chat-cta-chevron">▼</span>
			</summary>

			{/* ── Expanded Panel ── */}
			<div className="chat-panel">
				{/* Suggestion chips */}
				<div className="suggestions">
					{SUGGESTIONS.map(s => (
						<button
							key={s}
							className="suggestion-btn"
							disabled={loading}
							onClick={() => sendSuggestion(s)}
						>
							{s}
						</button>
					))}
				</div>

				{/* Message Window */}
				<div className="chat-window">
					{messages.length === 0 && (
						<p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: 'auto', padding: '32px 0' }}>
							Ask anything about this verification result…
						</p>
					)}
					{messages.map((m, i) => (
						<div key={i} className={`bubble bubble-${m.role}`}>
							{m.text}
						</div>
					))}
					<div ref={bottomRef} />
				</div>

				{/* Input row */}
				<div className="chat-input-row">
					<input
						className="input"
						placeholder="Type your question…"
						value={input}
						onChange={e => setInput(e.target.value)}
						onKeyDown={handleKey}
						disabled={loading}
					/>
					<button
						className="btn btn-primary"
						onClick={() => { if (input.trim()) onSend(input.trim()); }}
						disabled={loading || !input.trim()}
					>
						{loading ? '…' : 'Send'}
					</button>
				</div>
			</div>
		</details>
	);
}
