<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { apiFetch } from '$lib/api';
	import type { PageData } from './$types';
	import type { SerialNumber } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let showUpdate = $state(false);
	let showDelete = $state(false);
	let showReset = $state(false);
	let actionLoading = $state(false);
	let selectedItem = $state<SerialNumber | null>(null);

	let editClientName = $state('');
	let editPhone = $state('');
	let editShopName = $state('');
	let editDeviceId = $state('');
	let editIsActivate = $state('false');
	let editStatus = $state('AVAILABLE');
	let editNotes = $state('');

	let searchId = $state('');
	let searchActivate = $state('');

	// Sync search fields when URL params change (e.g. after navigation/search submit)
	$effect(() => {
		searchId = data.filters.serialNumberId;
		searchActivate = data.filters.isActivate;
	});

	let toast = $state<{ msg: string; type: 'success' | 'error' } | null>(null);

	function showToast(msg: string, type: 'success' | 'error') {
		toast = { msg, type };
		setTimeout(() => (toast = null), 4000);
	}

	function openUpdate(item: SerialNumber) {
		selectedItem = item;
		editClientName = item.clientName ?? '';
		editPhone = item.clientPhoneNumber ?? '';
		editShopName = item.shopName ?? '';
		editDeviceId = item.deviceId ?? '';
		editIsActivate = item.isActivate ? 'true' : 'false';
		editStatus = item.status;
		editNotes = item.notes ?? '';
		showUpdate = true;
	}

	function openDelete(item: SerialNumber) {
		selectedItem = item;
		showDelete = true;
	}

	function openReset(item: SerialNumber) {
		selectedItem = item;
		showReset = true;
	}

	async function handleUpdate() {
		if (!selectedItem || actionLoading) return;
		actionLoading = true;
		try {
			const response = await apiFetch(`/serial-numbers/${selectedItem.serialNumberId}`, {
				method: 'PUT',
				body: JSON.stringify({
					clientName: editClientName || null,
					clientPhoneNumber: editPhone || null,
					shopName: editShopName || null,
					deviceId: editDeviceId || null,
					isActivate: editIsActivate === 'true',
					status: editStatus,
					notes: editNotes || null
				})
			});
			if (response.status === 401) { goto('/login'); return; }
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				showToast((body as { message?: string }).message ?? 'Gagal memperbarui data.', 'error');
				return;
			}
			showUpdate = false;
			showToast('Serial number berhasil diperbarui.', 'success');
			invalidateAll();
		} catch {
			showToast('Tidak dapat terhubung ke server.', 'error');
		} finally {
			actionLoading = false;
		}
	}

	async function handleDelete() {
		if (!selectedItem || actionLoading) return;
		actionLoading = true;
		try {
			const response = await apiFetch(`/serial-numbers/${selectedItem.serialNumberId}`, {
				method: 'DELETE'
			});
			if (response.status === 401) { goto('/login'); return; }
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				showToast((body as { message?: string }).message ?? 'Gagal menghapus data.', 'error');
				return;
			}
			showDelete = false;
			showToast('Serial number berhasil dihapus.', 'success');
			invalidateAll();
		} catch {
			showToast('Tidak dapat terhubung ke server.', 'error');
		} finally {
			actionLoading = false;
		}
	}

	async function handleReset() {
		if (!selectedItem || actionLoading) return;
		actionLoading = true;
		try {
			const response = await apiFetch(`/serial-numbers/${selectedItem.serialNumberId}/reset`, {
				method: 'POST'
			});
			if (response.status === 401) { goto('/login'); return; }
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				showToast((body as { message?: string }).message ?? 'Gagal mereset serial number.', 'error');
				return;
			}
			showReset = false;
			showToast('Serial number berhasil direset.', 'success');
			invalidateAll();
		} catch {
			showToast('Tidak dapat terhubung ke server.', 'error');
		} finally {
			actionLoading = false;
		}
	}

	async function handleLogout() {
		try {
			await apiFetch('/users/logout', { method: 'POST' });
		} catch {
			// ignore — redirect tetap berjalan
		}
		goto('/login');
	}

	function handleSearch(e: Event) {
		e.preventDefault();
		const params = new URLSearchParams();
		if (searchId) params.set('serialNumberId', searchId.toUpperCase());
		if (searchActivate !== '') params.set('isActivate', searchActivate);
		params.set('page', '1');
		goto(`?${params.toString()}`);
	}

	function resetSearch() {
		searchId = '';
		searchActivate = '';
		goto('/serial-numbers');
	}

	function goToPage(p: number) {
		const params = new URLSearchParams();
		if (data.filters.serialNumberId) params.set('serialNumberId', data.filters.serialNumberId);
		if (data.filters.isActivate) params.set('isActivate', data.filters.isActivate);
		params.set('page', String(p));
		goto(`?${params.toString()}`);
	}

	function pageRange(current: number, total: number): (number | '...')[] {
		if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
		const pages: (number | '...')[] = [1];
		if (current > 3) pages.push('...');
		const start = Math.max(2, current - 1);
		const end = Math.min(total - 1, current + 1);
		for (let i = start; i <= end; i++) pages.push(i);
		if (current < total - 2) pages.push('...');
		pages.push(total);
		return pages;
	}

	function fmtDate(d: string) {
		return new Date(d).toLocaleString('id-ID', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function onSerialInput(e: Event) {
		const el = e.currentTarget as HTMLInputElement;
		el.value = el.value
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, 8);
		searchId = el.value;
	}
</script>

<!-- Navbar -->
<header class="sticky top-0 z-40 border-b border-slate-200 bg-white">
	<div class="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6">
		<span class="text-base font-semibold text-slate-900">Toko Kita</span>
		<button
			type="button"
			onclick={handleLogout}
			class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
		>
			Keluar
		</button>
	</div>
</header>

<main class="mx-auto max-w-screen-xl px-4 py-6 sm:px-6">
	<!-- Page title -->
	<div class="mb-6">
		<h1 class="text-xl font-semibold text-slate-900">Manajemen Serial Number</h1>
		<p class="mt-0.5 text-sm text-slate-500">Kelola dan pantau data serial number perangkat.</p>
	</div>

	<!-- Error banner -->
	{#if data.loadError}
		<div class="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
			{data.loadError}
		</div>
	{/if}

	<!-- Search & Filter -->
	<form onsubmit={handleSearch} class="mb-4 flex flex-wrap items-end gap-3">
		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium text-slate-600" for="searchId">Serial Number ID</label>
			<input
				id="searchId"
				type="text"
				placeholder="Contoh: AB12CD34"
				maxlength={8}
				value={searchId}
				oninput={onSerialInput}
				class="w-40 rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm uppercase text-slate-900 placeholder:font-sans placeholder:normal-case placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
			/>
		</div>
		<div class="flex flex-col gap-1">
			<label class="text-xs font-medium text-slate-600" for="searchActivate">Status Aktivasi</label>
			<select
				id="searchActivate"
				bind:value={searchActivate}
				class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
			>
				<option value="">Semua</option>
				<option value="true">Aktif</option>
				<option value="false">Tidak Aktif</option>
			</select>
		</div>
		<button
			type="submit"
			class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
		>
			Cari
		</button>
		{#if data.filters.serialNumberId || data.filters.isActivate}
			<button
				type="button"
				onclick={resetSearch}
				class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
			>
				Reset Filter
			</button>
		{/if}
	</form>

	<!-- Table -->
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-slate-100 bg-slate-50 text-left">
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Serial Number ID</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Client Name</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Phone Number</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Shop Name</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Device ID</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Aktivasi</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Status</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Notes</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Created At</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Updated At</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#if data.serialNumbers.length === 0}
						<tr>
							<td colspan={11} class="px-4 py-12 text-center text-sm text-slate-400">
								Tidak ada data serial number.
							</td>
						</tr>
					{:else}
						{#each data.serialNumbers as item}
							<tr class="border-b border-slate-100 transition-colors hover:bg-slate-50">
								<td class="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold tracking-wider text-slate-900">
									{item.serialNumberId}
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-700">{item.clientName ?? '—'}</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-700">{item.clientPhoneNumber ?? '—'}</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-700">{item.shopName ?? '—'}</td>
								<td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{item.deviceId ?? '—'}</td>
								<td class="whitespace-nowrap px-4 py-3">
									{#if item.isActivate}
										<span class="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">Aktif</span>
									{:else}
										<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">Tidak Aktif</span>
									{/if}
								</td>
								<td class="whitespace-nowrap px-4 py-3">
									{#if item.status === 'AVAILABLE'}
										<span class="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{item.status}</span>
									{:else if item.status === 'ACTIVATED'}
										<span class="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">{item.status}</span>
									{:else}
										<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{item.status}</span>
									{/if}
								</td>
								<td class="max-w-[160px] truncate px-4 py-3 text-slate-500" title={item.notes ?? ''}>{item.notes ?? '—'}</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(item.createdAt)}</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(item.updatedAt)}</td>
								<td class="whitespace-nowrap px-4 py-3">
									<div class="flex items-center gap-1.5">
										<button type="button" onclick={() => openUpdate(item)} class="rounded px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 transition-colors hover:bg-slate-200">Update</button>
										<button type="button" onclick={() => openDelete(item)} class="rounded px-2.5 py-1 text-xs font-medium bg-red-50 text-red-600 transition-colors hover:bg-red-100">Hapus</button>
										<button type="button" onclick={() => openReset(item)} class="rounded px-2.5 py-1 text-xs font-medium bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100">Reset</button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 0}
			<div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
				<p class="text-xs text-slate-500">
					Menampilkan
					{(data.pagination.page - 1) * data.pagination.limit + 1}–{Math.min(
						data.pagination.page * data.pagination.limit,
						data.pagination.totalItems
					)}
					dari {data.pagination.totalItems} data
				</p>
				<div class="flex items-center gap-1">
					<button
						type="button"
						onclick={() => goToPage(data.pagination.page - 1)}
						disabled={data.pagination.page <= 1}
						aria-label="Halaman sebelumnya"
						class="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
						</svg>
					</button>
					{#each pageRange(data.pagination.page, data.pagination.totalPages) as p}
						{#if p === '...'}
							<span class="px-1 text-slate-400">…</span>
						{:else}
							<button
								type="button"
								onclick={() => goToPage(p as number)}
								class="min-w-[2rem] rounded px-2 py-1 text-xs font-medium transition-colors {p === data.pagination.page ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}"
							>{p}</button>
						{/if}
					{/each}
					<button
						type="button"
						onclick={() => goToPage(data.pagination.page + 1)}
						disabled={data.pagination.page >= data.pagination.totalPages}
						aria-label="Halaman berikutnya"
						class="rounded p-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				</div>
			</div>
		{/if}
	</div>
</main>

<!-- ── Update Modal ─────────────────────────────────── -->
{#if showUpdate && selectedItem}
	<div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showUpdate = false)} onkeydown={(e) => e.key === 'Escape' && (showUpdate = false)}>
		<div role="presentation" class="w-full max-w-lg rounded-xl bg-white shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<h2 class="text-base font-semibold text-slate-900">
					Update — <span class="font-mono text-slate-500">{selectedItem.serialNumberId}</span>
				</h2>
				<button type="button" aria-label="Tutup" onclick={() => (showUpdate = false)} class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="space-y-4 px-5 py-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-slate-600" for="editClientName">Client Name</label>
						<input id="editClientName" type="text" bind:value={editClientName} placeholder="—" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-slate-600" for="editPhone">Phone Number</label>
						<input id="editPhone" type="text" bind:value={editPhone} placeholder="—" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-slate-600" for="editShopName">Shop Name</label>
						<input id="editShopName" type="text" bind:value={editShopName} placeholder="—" class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-slate-600" for="editDeviceId">Device ID</label>
						<input id="editDeviceId" type="text" bind:value={editDeviceId} placeholder="—" class="rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200" />
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-slate-600" for="editStatus">Status</label>
						<select id="editStatus" bind:value={editStatus} class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
							<option value="AVAILABLE">AVAILABLE</option>
							<option value="ACTIVATED">ACTIVATED</option>
							<option value="INACTIVE">INACTIVE</option>
						</select>
					</div>
					<div class="flex flex-col gap-1">
						<label class="text-xs font-medium text-slate-600" for="editIsActivate">Status Aktivasi</label>
						<select id="editIsActivate" bind:value={editIsActivate} class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
							<option value="true">Aktif</option>
							<option value="false">Tidak Aktif</option>
						</select>
					</div>
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium text-slate-600" for="editNotes">Notes</label>
					<textarea id="editNotes" bind:value={editNotes} rows={3} placeholder="Catatan tambahan..." class="resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"></textarea>
				</div>
			</div>
			<div class="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
				<button type="button" onclick={() => (showUpdate = false)} class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Batal</button>
				<button type="button" onclick={handleUpdate} disabled={actionLoading} class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60">
					{#if actionLoading}<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
					Simpan
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Delete Modal ─────────────────────────────────── -->
{#if showDelete && selectedItem}
	<div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showDelete = false)} onkeydown={(e) => e.key === 'Escape' && (showDelete = false)}>
		<div role="presentation" class="w-full max-w-sm rounded-xl bg-white shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="p-5">
				<div class="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
				</div>
				<h2 class="text-base font-semibold text-slate-900">Hapus Serial Number</h2>
				<p class="mt-1.5 text-sm text-slate-500">
					Yakin ingin menghapus <span class="font-mono font-semibold text-slate-800">{selectedItem.serialNumberId}</span>? Tindakan ini tidak dapat dibatalkan.
				</p>
			</div>
			<div class="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
				<button type="button" onclick={() => (showDelete = false)} class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Batal</button>
				<button type="button" onclick={handleDelete} disabled={actionLoading} class="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60">
					{#if actionLoading}<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
					Hapus
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Reset Modal ──────────────────────────────────── -->
{#if showReset && selectedItem}
	<div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showReset = false)} onkeydown={(e) => e.key === 'Escape' && (showReset = false)}>
		<div role="presentation" class="w-full max-w-sm rounded-xl bg-white shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="p-5">
				<div class="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				</div>
				<h2 class="text-base font-semibold text-slate-900">Reset Serial Number</h2>
				<p class="mt-1.5 text-sm text-slate-500">
					Yakin ingin mereset <span class="font-mono font-semibold text-slate-800">{selectedItem.serialNumberId}</span>? Data aktivasi akan dikembalikan ke kondisi awal.
				</p>
			</div>
			<div class="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
				<button type="button" onclick={() => (showReset = false)} class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Batal</button>
				<button type="button" onclick={handleReset} disabled={actionLoading} class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60">
					{#if actionLoading}<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
					Reset
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Toast ────────────────────────────────────────── -->
{#if toast}
	<div class="fixed bottom-6 right-6 z-[60] max-w-sm rounded-xl border shadow-lg {toast.type === 'success' ? 'border-green-100 bg-white' : 'border-red-100 bg-white'} px-4 py-3">
		<div class="flex items-start gap-3">
			{#if toast.type === 'success'}
				<div class="mt-0.5 flex-shrink-0 rounded-full bg-green-100 p-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2.5}><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
				</div>
			{:else}
				<div class="mt-0.5 flex-shrink-0 rounded-full bg-red-100 p-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2.5}><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
				</div>
			{/if}
			<p class="text-sm text-slate-700">{toast.msg}</p>
		</div>
	</div>
{/if}
