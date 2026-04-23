<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { isAuthenticated } from '$lib/auth';

	onMount(() => {
		if (isAuthenticated()) {
			goto('/serial-numbers', { replaceState: true });
		} else {
			goto('/login', { replaceState: true });
		}
	});
</script>
