<script lang="ts">
	import { goto } from '$app/navigation';
	import { apiFetch } from '$lib/api';

	let loading = $state(false);
	let showPassword = $state(false);
	let error = $state('');

	let username = $state('');
	let password = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (loading) return;

		loading = true;
		error = '';

		try {
			const response = await apiFetch('/users', {
				method: 'POST',
				body: JSON.stringify({ username, password })
			});

			if (!response.ok) {
				const body = await response.json().catch(() => ({}));
				error = (body as { errors?: string }).errors ?? 'Username atau password salah.';
				return;
			}

			goto('/serial-numbers');
		} catch {
			error = 'Tidak dapat terhubung ke server. Coba beberapa saat lagi.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Login — Toko Kita</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-slate-50 px-4">
	<div class="w-full max-w-sm">
		<!-- Brand -->
		<div class="mb-8 text-center">
			<div class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
				<svg
					class="h-5 w-5 text-white"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
					<line x1="3" y1="6" x2="21" y2="6" />
					<path d="M16 10a4 4 0 0 1-8 0" />
				</svg>
			</div>
			<h1 class="text-xl font-semibold tracking-tight text-slate-900">Toko Kita</h1>
			<p class="mt-1 text-sm text-slate-500">Masuk ke akun Anda</p>
		</div>

		<!-- Card -->
		<div class="rounded-2xl border border-slate-100 bg-white px-8 py-8 shadow-sm">
			{#if error}
				<div
					class="mb-5 flex items-start gap-2.5 rounded-lg border border-red-100 bg-red-50 px-4 py-3"
				>
					<svg
						class="mt-0.5 h-4 w-4 shrink-0 text-red-500"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					<p class="text-sm text-red-700">{error}</p>
				</div>
			{/if}

			<form onsubmit={handleSubmit} class="space-y-5">
				<!-- Username -->
				<div class="space-y-1.5">
					<label for="username" class="block text-sm font-medium text-slate-700">Username</label>
					<input
						id="username"
						name="username"
						type="text"
						required
						autocomplete="username"
						placeholder="Masukkan username"
						bind:value={username}
						disabled={loading}
						class="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>

				<!-- Password -->
				<div class="space-y-1.5">
					<label for="password" class="block text-sm font-medium text-slate-700">Password</label>
					<div class="relative">
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							required
							autocomplete="current-password"
							placeholder="Masukkan password"
							bind:value={password}
							disabled={loading}
							class="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
						/>
						<button
							type="button"
							onclick={() => (showPassword = !showPassword)}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600 focus:outline-none"
							tabindex="-1"
							aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
						>
							{#if showPassword}
								<svg
									class="h-4 w-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path
										d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
									/>
									<line x1="1" y1="1" x2="23" y2="23" />
								</svg>
							{:else}
								<svg
									class="h-4 w-4"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
									<circle cx="12" cy="12" r="3" />
								</svg>
							{/if}
						</button>
					</div>
				</div>

				<!-- Submit -->
				<button
					type="submit"
					disabled={loading}
					class="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if loading}
						<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 12a9 9 0 1 1-6.219-8.56" />
						</svg>
						Memproses...
					{:else}
						Masuk
					{/if}
				</button>
			</form>
		</div>

		<p class="mt-6 text-center text-xs text-slate-400">&copy; {new Date().getFullYear()} Toko Kita</p>
	</div>
</div>
