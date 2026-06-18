<script lang="ts">
	const {
		label,
		value,
		sub = '',
		accent = 'zinc'
	}: {
		label: string;
		value: string;
		sub?: string;
		accent?: 'zinc' | 'emerald' | 'sky' | 'violet' | 'amber' | 'red';
	} = $props();

	const valueClass = $derived(
		{
			zinc: 'text-zinc-900',
			emerald: 'text-emerald-700',
			sky: 'text-sky-700',
			violet: 'text-violet-700',
			amber: 'text-amber-800',
			red: 'text-red-700'
		}[accent]
	);
</script>

<div class="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:shadow-md">
	<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
	<p class="mt-1 text-xl font-bold tabular-nums {valueClass}">{value}</p>
	{#if sub}
		<p class="mt-1 text-[10px] leading-snug text-zinc-400">{sub}</p>
	{/if}
</div>
