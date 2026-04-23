import { redirect } from '@sveltejs/kit';
import { apiFetch } from '$lib/api';
import { clearAuthenticated } from '$lib/auth';
import type { PageLoad } from './$types';
import type { SerialNumber, SerialNumberListResponse } from '$lib/types';

export const load: PageLoad = async ({ url }) => {
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const limit = Math.max(1, Number(url.searchParams.get('limit') ?? '10'));
	const serialNumberId = url.searchParams.get('serialNumberId')?.toUpperCase().slice(0, 8) ?? '';
	const isActivateParam = url.searchParams.get('isActivate') ?? '';

	const params = new URLSearchParams({ page: String(page), limit: String(limit) });
	if (serialNumberId) params.set('serialNumberId', serialNumberId);
	if (isActivateParam !== '') params.set('isActivate', isActivateParam);

	let response: Response;
	try {
		response = await apiFetch(`/serial-numbers?${params.toString()}`);
	} catch {
		return {
			serialNumbers: [] as SerialNumber[],
			pagination: { page, limit, totalItems: 0, totalPages: 0 },
			loadError: 'Tidak dapat terhubung ke server.',
			filters: { serialNumberId, isActivate: isActivateParam }
		};
	}

	if (response.status === 401) {
		clearAuthenticated();
		redirect(303, '/login');
	}

	if (!response.ok) {
		return {
			serialNumbers: [] as SerialNumber[],
			pagination: { page, limit, totalItems: 0, totalPages: 0 },
			loadError: 'Gagal memuat data serial number.',
			filters: { serialNumberId, isActivate: isActivateParam }
		};
	}

	const body = (await response.json()) as SerialNumberListResponse;

	return {
		serialNumbers: body.data,
		pagination: body.pagination,
		loadError: null,
		filters: { serialNumberId, isActivate: isActivateParam }
	};
};
