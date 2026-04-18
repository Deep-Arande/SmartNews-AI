import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccessPage() {
	const [key, setKey] = useState('');
	const [error, setError] = useState('');
	const navigate = useNavigate();

	const handleEnter = () => {
		if (key.trim() === 'VERIF2026') {
			navigate('/select');
		} else {
			setError('Invalid access key. Please try again.');
		}
	};

	return (
		<div className="page">
			<div className="container" style={{ maxWidth: 440 }}>
				<div style={{ textAlign: 'center', marginBottom: 36 }}>
					<div className="logo">Smart<span>News</span> AI</div>
					<p className="tagline">AI-powered fake news detection & verification</p>
				</div>

				<div className="card">
					<p className="section-title" style={{ marginBottom: 14 }}>Enter Access Key</p>
					{error && <div className="error-banner">{error}</div>}
					<input
						className="input"
						type="password"
						placeholder="Access key…"
						value={key}
						onChange={e => { setKey(e.target.value); setError(''); }}
						onKeyDown={e => e.key === 'Enter' && handleEnter()}
						autoFocus
					/>
					<button
						className="btn btn-primary btn-full"
						style={{ marginTop: 14 }}
						onClick={handleEnter}
					>
						Enter →
					</button>
				</div>
			</div>
		</div>
	);
}
