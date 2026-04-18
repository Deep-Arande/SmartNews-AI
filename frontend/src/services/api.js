import axios from 'axios';

const api = axios.create({
	baseURL: '/',
	headers: { 'Content-Type': 'application/json' },
});

export async function verifyNews(query) {
	const res = await api.post('/verify', { query });
	return res.data;
}

export async function startSession(query) {
	const res = await api.post('/premium/start-session', { query });
	return res.data;
}

export async function sendChat(session_id, question) {
	const res = await api.post('/premium/chat', { session_id, question });
	return res.data;
}
