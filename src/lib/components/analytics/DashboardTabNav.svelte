<script lang="ts">
	export type TabItem = { id: string; label: string };

	const {
		tabs,
		active,
		onchange
	}: {
		tabs: TabItem[];
		active: string;
		onchange: (id: string) => void;
	} = $props();
</script>

<div class="flex flex-wrap gap-1 rounded-2xl bg-zinc-100/80 p-1 ring-1 ring-zinc-200/60">
	{#each tabs as tab (tab.id)}
		<button
			type="button"
			class="rounded-xl px-4 py-2 text-sm font-semibold transition"
			class:bg-white={active === tab.id}
			class:text-zinc-900={active === tab.id}
			class:shadow-sm={active === tab.id}
			class:text-zinc-500={active !== tab.id}
			class:hover:text-zinc-800={active !== tab.id}
			onclick={() => onchange(tab.id)}
		>
			{tab.label}
		</button>
	{/each}
</div>
