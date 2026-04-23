import { browser } from '$app/environment';

const KEY = 'authenticated';

export function setAuthenticated(): void {
	if (browser) localStorage.setItem(KEY, '1');
}

export function clearAuthenticated(): void {
	if (browser) localStorage.removeItem(KEY);
}

export function isAuthenticated(): boolean {
	if (!browser) return false;
	return localStorage.getItem(KEY) === '1';
}
