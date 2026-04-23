import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { PRIVATE_API_BASE_URL } from '$env/static/private';
import type { Actions } from './$types';

function parseSetCookie(str: string): { name: string; value: string } | null {
	const semi = str.indexOf(';');
	const pair = semi > -1 ? str.slice(0, semi) : str;
	const eq = pair.indexOf('=');
	if (eq === -1) return null;
	return { name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() };
}

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim();
		const password = data.get('password')?.toString();

		if (!username || !password) {
			return fail(400, { error: 'Username dan password wajib diisi.' });
		}

		let response: Response;
		try {
			response = await fetch(`${PRIVATE_API_BASE_URL}/users`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ username, password })
			});
		} catch {
			return fail(503, { error: 'Tidak dapat terhubung ke server. Coba beberapa saat lagi.' });
		}

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			return fail(response.status, {
				error: (body as { errors?: string }).errors ?? 'Username atau password salah.'
			});
		}

		// Backend mengirim token via Set-Cookie, forward ke browser
		const setCookies =
			typeof response.headers.getSetCookie === 'function'
				? response.headers.getSetCookie()
				: [response.headers.get('set-cookie')].filter(Boolean);

		const cookieOpts = {
			httpOnly: true,
			secure: !dev,
			sameSite: 'strict' as const,
			path: '/',
			maxAge: 60 * 60 * 24 * 7
		};

		let hasToken = false;
		for (const cookieStr of setCookies as string[]) {
			const parsed = parseSetCookie(cookieStr);
			if (parsed?.name === 'accessToken' || parsed?.name === 'refreshToken') {
				cookies.set(parsed.name, parsed.value, cookieOpts);
				if (parsed.name === 'accessToken') hasToken = true;
			}
		}

		if (!hasToken) {
			return fail(500, { error: 'Respons server tidak valid.' });
		}

		redirect(303, '/serial-numbers');
	}
};
