import { fail, redirect } from '@sveltejs/kit';
import { PRIVATE_API_BASE_URL } from '$env/static/private';
import type { Actions, PageServerLoad } from './$types';
import type { SerialNumber, SerialNumberListResponse } from '$lib/types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const accessToken = cookies.get('accessToken');
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const limit = Math.max(1, Number(url.searchParams.get('limit') ?? '10'));
	const serialNumberId = url.searchParams.get('serialNumberId')?.toUpperCase().slice(0, 8) ?? '';
	const isActivateParam = url.searchParams.get('isActivate') ?? '';

	const params = new URLSearchParams({ page: String(page), limit: String(limit) });
	if (serialNumberId) params.set('serialNumberId', serialNumberId);
	if (isActivateParam !== '') params.set('isActivate', isActivateParam);

	let response: Response;
	try {
		response = await fetch(`${PRIVATE_API_BASE_URL}/serial-numbers?${params.toString()}`, {
			headers: { Authorization: `Bearer ${accessToken}` }
		});
	} catch {
		return {
			serialNumbers: [] as SerialNumber[],
			pagination: { page, limit, totalItems: 0, totalPages: 0 },
			loadError: 'Tidak dapat terhubung ke server.',
			filters: { serialNumberId, isActivate: isActivateParam }
		};
	}

	if (response.status === 401) {
		cookies.delete('accessToken', { path: '/' });
		cookies.delete('refreshToken', { path: '/' });
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

export const actions: Actions = {
	update: async ({ request, cookies }) => {
		const accessToken = cookies.get('accessToken');
		const data = await request.formData();
		const serialNumberId = data.get('serialNumberId')?.toString();

		if (!serialNumberId) return fail(400, { actionError: 'Serial number ID diperlukan.' });

		const payload: Partial<SerialNumber> = {};
		const clientName = data.get('clientName')?.toString().trim();
		const clientPhoneNumber = data.get('clientPhoneNumber')?.toString().trim();
		const shopName = data.get('shopName')?.toString().trim();
		const deviceId = data.get('deviceId')?.toString().trim();
		const isActivate = data.get('isActivate')?.toString();
		const status = data.get('status')?.toString().trim();
		const notes = data.get('notes')?.toString().trim();

		if (clientName !== undefined) payload.clientName = clientName || null;
		if (clientPhoneNumber !== undefined) payload.clientPhoneNumber = clientPhoneNumber || null;
		if (shopName !== undefined) payload.shopName = shopName || null;
		if (deviceId !== undefined) payload.deviceId = deviceId || null;
		if (isActivate !== undefined) payload.isActivate = isActivate === 'true';
		if (status) payload.status = status;
		if (notes !== undefined) payload.notes = notes || null;

		let response: Response;
		try {
			response = await fetch(`${PRIVATE_API_BASE_URL}/serial-numbers/${serialNumberId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`
				},
				body: JSON.stringify(payload)
			});
		} catch {
			return fail(503, { actionError: 'Tidak dapat terhubung ke server.' });
		}

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			return fail(response.status, {
				actionError: (body as { message?: string }).message ?? 'Gagal memperbarui data.'
			});
		}

		return { actionSuccess: 'Serial number berhasil diperbarui.' };
	},

	delete: async ({ request, cookies }) => {
		const accessToken = cookies.get('accessToken');
		const data = await request.formData();
		const serialNumberId = data.get('serialNumberId')?.toString();

		if (!serialNumberId) return fail(400, { actionError: 'Serial number ID diperlukan.' });

		let response: Response;
		try {
			response = await fetch(`${PRIVATE_API_BASE_URL}/serial-numbers/${serialNumberId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${accessToken}` }
			});
		} catch {
			return fail(503, { actionError: 'Tidak dapat terhubung ke server.' });
		}

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			return fail(response.status, {
				actionError: (body as { message?: string }).message ?? 'Gagal menghapus data.'
			});
		}

		return { actionSuccess: 'Serial number berhasil dihapus.' };
	},

	reset: async ({ request, cookies }) => {
		const accessToken = cookies.get('accessToken');
		const data = await request.formData();
		const serialNumberId = data.get('serialNumberId')?.toString();

		if (!serialNumberId) return fail(400, { actionError: 'Serial number ID diperlukan.' });

		let response: Response;
		try {
			response = await fetch(`${PRIVATE_API_BASE_URL}/serial-numbers/${serialNumberId}/reset`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${accessToken}` }
			});
		} catch {
			return fail(503, { actionError: 'Tidak dapat terhubung ke server.' });
		}

		if (!response.ok) {
			const body = await response.json().catch(() => ({}));
			return fail(response.status, {
				actionError: (body as { message?: string }).message ?? 'Gagal mereset serial number.'
			});
		}

		return { actionSuccess: 'Serial number berhasil direset.' };
	}
};
