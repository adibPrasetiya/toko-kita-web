import { PUBLIC_API_BASE_URL } from '$env/static/public';

export const API_BASE = PUBLIC_API_BASE_URL;

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
	return fetch(`${API_BASE}${path}`, {
		...init,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...init?.headers
		}
	});
}
