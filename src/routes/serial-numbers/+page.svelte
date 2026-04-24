<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { apiFetch } from '$lib/api';
	import { clearAuthenticated } from '$lib/auth';
	import type { PageData } from './$types';
	import type { SerialNumber } from '$lib/types';

	let { data }: { data: PageData } = $props();

	let showReset = $state(false);
	let showSetStatus = $state(false);
	let actionLoading = $state(false);
	let selectedItem = $state<SerialNumber | null>(null);

	let setStatusStatus = $state<'AVAILABLE' | 'SELL' | 'SOLD' | 'DEMO'>('AVAILABLE');
	let setStatusNotes = $state('');

	let activeDropdownId = $state<string | null>(null);
	let bulkLoading = $state(false);

	let localSerialNumbers = $state<SerialNumber[]>(data.serialNumbers);

	$effect(() => {
		localSerialNumbers = data.serialNumbers;
	});

	let searchId = $state('');
	let searchActivate = $state('');

	$effect(() => {
		searchId = data.filters.serialNumberId;
		searchActivate = data.filters.isActivate;
	});

	let toast = $state<{ msg: string; type: 'success' | 'error' } | null>(null);

	// Change password
	let showChangePassword = $state(false);
	let cpCurrentPassword = $state('');
	let cpNewPassword = $state('');
	let cpShowCurrent = $state(false);
	let cpShowNew = $state(false);
	let cpLoading = $state(false);

	function showToast(msg: string, type: 'success' | 'error') {
		toast = { msg, type };
		setTimeout(() => (toast = null), 4000);
	}

	function openSetStatus(item: SerialNumber) {
		selectedItem = item;
		setStatusStatus = item.status;
		setStatusNotes = item.notes ?? '';
		showSetStatus = true;
		activeDropdownId = null;
	}

	function openReset(item: SerialNumber) {
		selectedItem = item;
		showReset = true;
		activeDropdownId = null;
	}

	async function handleSetStatus() {
		if (!selectedItem || actionLoading) return;
		actionLoading = true;
		try {
			const response = await apiFetch(`/serial-numbers/${selectedItem.serialNumberId}/set`, {
				method: 'PATCH',
				body: JSON.stringify({
					status: setStatusStatus,
					notes: setStatusNotes || null
				})
			});
			if (response.status === 401) { clearAuthenticated(); goto('/login'); return; }
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				showToast((body as { errors?: string; message?: string }).errors ?? (body as { message?: string }).message ?? 'Gagal mengatur status.', 'error');
				return;
			}
			showSetStatus = false;
			showToast('Status berhasil diperbarui.', 'success');
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
				method: 'PATCH'
			});
			if (response.status === 401) { clearAuthenticated(); goto('/login'); return; }
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				showToast((body as { errors?: string; message?: string }).errors ?? (body as { message?: string }).message ?? 'Gagal mereset serial number.', 'error');
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

	async function handleCreateBulk() {
		if (bulkLoading) return;
		bulkLoading = true;
		try {
			const response = await apiFetch('/serial-numbers', { method: 'POST' });
			if (response.status === 401) { clearAuthenticated(); goto('/login'); return; }
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				showToast((body as { errors?: string }).errors ?? 'Gagal membuat serial number.', 'error');
				return;
			}
			const body = await response.json() as { message: string; data: SerialNumber[] };
			localSerialNumbers = [...body.data, ...localSerialNumbers];
			showToast(body.message, 'success');
		} catch {
			showToast('Tidak dapat terhubung ke server.', 'error');
		} finally {
			bulkLoading = false;
		}
	}

	async function handleLogout() {
		try {
			await apiFetch('/users', { method: 'DELETE' });
		} catch {
			// ignore — redirect tetap berjalan
		}
		clearAuthenticated();
		goto('/login');
	}

	async function handleChangePassword() {
		if (!cpCurrentPassword || !cpNewPassword || cpLoading) return;
		cpLoading = true;
		try {
			const response = await apiFetch('/users', {
				method: 'PATCH',
				body: JSON.stringify({ currentPassword: cpCurrentPassword, newPassword: cpNewPassword })
			});
			if (response.status === 401) { clearAuthenticated(); goto('/login'); return; }
			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				showToast((body as { errors?: string }).errors ?? 'Gagal mengganti password.', 'error');
				return;
			}
			showChangePassword = false;
			cpCurrentPassword = '';
			cpNewPassword = '';
			showToast('Password berhasil diperbarui.', 'success');
		} catch {
			showToast('Tidak dapat terhubung ke server.', 'error');
		} finally {
			cpLoading = false;
		}
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

	function handleWindowClick() {
		activeDropdownId = null;
	}

	function statusBadgeClass(status: string): string {
		switch (status) {
			case 'AVAILABLE': return 'bg-blue-50 text-blue-700';
			case 'SELL':      return 'bg-amber-50 text-amber-700';
			case 'SOLD':      return 'bg-green-50 text-green-700';
			case 'DEMO':      return 'bg-purple-50 text-purple-700';
			default:          return 'bg-slate-100 text-slate-500';
		}
	}
</script>

<svelte:window onclick={handleWindowClick} />

<!-- Navbar -->
<header class="sticky top-0 z-40 border-b border-slate-200 bg-white">
	<div class="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4 sm:px-6">
		<span class="text-base font-semibold text-slate-900">Toko Kita</span>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={() => (showChangePassword = true)}
				class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
			>
				Ganti Password
			</button>
			<button
				type="button"
				onclick={handleLogout}
				class="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
			>
				Keluar
			</button>
		</div>
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

	<!-- Search, Filter & Actions bar -->
	<div class="mb-4 flex flex-wrap items-end justify-between gap-3">
		<form onsubmit={handleSearch} class="flex flex-wrap items-end gap-3">
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

		<button
			type="button"
			onclick={handleCreateBulk}
			disabled={bulkLoading}
			class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
		>
			{#if bulkLoading}
				<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
			{/if}
			Tambah Bulk
		</button>
	</div>

	<!-- Table -->
	<div class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-slate-100 bg-slate-50 text-left">
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Serial Number ID</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Client Name</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">No. Telepon</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Toko</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Device ID</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Aktivasi</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Status</th>
						<th class="min-w-[200px] px-4 py-3 font-medium text-slate-600">Notes</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Dibuat</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Diperbarui</th>
						<th class="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#if localSerialNumbers.length === 0}
						<tr>
							<td colspan={11} class="px-4 py-12 text-center text-sm text-slate-400">
								Tidak ada data serial number.
							</td>
						</tr>
					{:else}
						{#each localSerialNumbers as item}
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
									<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {statusBadgeClass(item.status)}">
										{item.status}
									</span>
								</td>
								<td class="max-w-[240px] px-4 py-3">
									<span class="block truncate text-slate-500" title={item.notes ?? ''}>{item.notes ?? '—'}</span>
								</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(item.createdAt)}</td>
								<td class="whitespace-nowrap px-4 py-3 text-slate-500">{fmtDate(item.updatedAt)}</td>
								<td class="whitespace-nowrap px-4 py-3">
									<div class="relative inline-block">
										<button
											type="button"
											onclick={(e) => { e.stopPropagation(); activeDropdownId = activeDropdownId === item.serialNumberId ? null : item.serialNumberId; }}
											class="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
										>
											Aksi
											<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2.5}>
												<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
											</svg>
										</button>
										{#if activeDropdownId === item.serialNumberId}
											<div
												role="menu"
												class="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
												onclick={(e) => e.stopPropagation()}
												onkeydown={(e) => e.stopPropagation()}
											>
												<button
													type="button"
													role="menuitem"
													onclick={() => openSetStatus(item)}
													class="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
														<path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
													</svg>
													Atur Status
												</button>
												<button
													type="button"
													role="menuitem"
													onclick={() => openReset(item)}
													class="flex w-full items-center gap-2 px-3 py-2 text-sm text-amber-600 transition-colors hover:bg-amber-50"
												>
													<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
														<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
													</svg>
													Reset
												</button>
											</div>
										{/if}
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

<!-- ── Atur Status Modal ─────────────────────────────── -->
{#if showSetStatus && selectedItem}
	<div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showSetStatus = false)} onkeydown={(e) => e.key === 'Escape' && (showSetStatus = false)}>
		<div role="presentation" class="w-full max-w-md rounded-xl bg-white shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<h2 class="text-base font-semibold text-slate-900">
					Atur Status — <span class="font-mono text-slate-500">{selectedItem.serialNumberId}</span>
				</h2>
				<button type="button" aria-label="Tutup" onclick={() => (showSetStatus = false)} class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="space-y-4 px-5 py-4">
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium text-slate-600" for="ssStatus">Status</label>
					<select id="ssStatus" bind:value={setStatusStatus} class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200">
						<option value="AVAILABLE">AVAILABLE</option>
						<option value="SELL">SELL</option>
						<option value="SOLD">SOLD</option>
						<option value="DEMO">DEMO</option>
					</select>
				</div>
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between">
						<label class="text-xs font-medium text-slate-600" for="ssNotes">Notes</label>
						<span class="text-xs text-slate-400">{setStatusNotes.length}/255</span>
					</div>
					<textarea
						id="ssNotes"
						bind:value={setStatusNotes}
						maxlength={255}
						rows={4}
						placeholder="Catatan tambahan..."
						class="resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
					></textarea>
				</div>
			</div>
			<div class="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
				<button type="button" onclick={() => (showSetStatus = false)} class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Batal</button>
				<button type="button" onclick={handleSetStatus} disabled={actionLoading} class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60">
					{#if actionLoading}<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
					Simpan
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

<!-- ── Change Password Modal ───────────────────────── -->
{#if showChangePassword}
	<div role="presentation" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={() => (showChangePassword = false)} onkeydown={(e) => e.key === 'Escape' && (showChangePassword = false)}>
		<div role="presentation" class="w-full max-w-sm rounded-xl bg-white shadow-xl" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
			<div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
				<h2 class="text-base font-semibold text-slate-900">Ganti Password</h2>
				<button type="button" aria-label="Tutup" onclick={() => (showChangePassword = false)} class="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width={2}>
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			<div class="space-y-4 px-5 py-4">
				<!-- Current Password -->
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium text-slate-600" for="cpCurrent">Password Saat Ini</label>
					<div class="relative">
						<input
							id="cpCurrent"
							type={cpShowCurrent ? 'text' : 'password'}
							bind:value={cpCurrentPassword}
							placeholder="Masukkan password saat ini"
							disabled={cpLoading}
							class="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
						/>
						<button type="button" tabindex="-1" onclick={() => (cpShowCurrent = !cpShowCurrent)} class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
							{#if cpShowCurrent}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
							{:else}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							{/if}
						</button>
					</div>
				</div>
				<!-- New Password -->
				<div class="flex flex-col gap-1">
					<label class="text-xs font-medium text-slate-600" for="cpNew">Password Baru</label>
					<div class="relative">
						<input
							id="cpNew"
							type={cpShowNew ? 'text' : 'password'}
							bind:value={cpNewPassword}
							placeholder="Masukkan password baru"
							disabled={cpLoading}
							class="w-full rounded-lg border border-slate-200 px-3 py-2 pr-9 text-sm text-slate-900 placeholder:text-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
						/>
						<button type="button" tabindex="-1" onclick={() => (cpShowNew = !cpShowNew)} class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
							{#if cpShowNew}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
							{:else}
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
							{/if}
						</button>
					</div>
				</div>
			</div>
			<div class="flex items-center justify-end gap-3 border-t border-slate-100 px-5 py-4">
				<button type="button" onclick={() => (showChangePassword = false)} class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Batal</button>
				<button type="button" onclick={handleChangePassword} disabled={cpLoading || !cpCurrentPassword || !cpNewPassword} class="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60">
					{#if cpLoading}<svg class="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>{/if}
					Simpan
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
