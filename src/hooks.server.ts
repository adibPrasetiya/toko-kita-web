import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

const PUBLIC_ROUTES = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const accessToken = event.cookies.get('accessToken');

	event.locals.accessToken = accessToken ?? '';

	const isPublicRoute = PUBLIC_ROUTES.some((route) => event.url.pathname.startsWith(route));

	if (!isPublicRoute && !accessToken) {
		redirect(303, '/login');
	}

	if (event.url.pathname === '/login' && accessToken) {
		redirect(303, '/serial-numbers');
	}

	return resolve(event);
};
