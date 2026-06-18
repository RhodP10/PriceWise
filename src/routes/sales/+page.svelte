<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		void goto('/business?tab=sales', { replaceState: true });
	});
</script>

<p class="p-8 text-sm text-zinc-500">Redirecting to Business Hub…</p>
