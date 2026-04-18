import { useNavigate } from 'react-router-dom';

export default function ModeSelect() {
	const navigate = useNavigate();

	return (
		<div className="page">
			<div className="container" style={{ maxWidth: 560 }}>
				<div style={{ textAlign: 'center', marginBottom: 36 }}>
					<div className="logo">Smart<span>News</span> AI</div>
					<p className="tagline">Choose your verification mode</p>
				</div>

				<div className="mode-grid">
					<button className="mode-card" onClick={() => navigate('/verify')}>
						<div className="mode-icon">🧾</div>
						<div className="mode-title">Normal Fact Check</div>
						<div className="mode-desc">Quick static verification of any news headline or claim</div>
					</button>

					<button className="mode-card" onClick={() => navigate('/premium')}>
						<div className="mode-icon">💬</div>
						<div className="mode-title">Premium AI Assistant</div>
						<div className="mode-desc">Deep analysis with an interactive conversational AI</div>
					</button>
				</div>
			</div>
		</div>
	);
}
