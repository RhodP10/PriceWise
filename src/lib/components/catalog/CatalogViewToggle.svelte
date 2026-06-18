<script lang="ts">
	export type CatalogViewMode = 'cards' | 'table';

	const {
		mode,
		onChange
	}: {
		mode: CatalogViewMode;
		onChange: (mode: CatalogViewMode) => void;
	} = $props();
</script>

<div class="inline-flex rounded-xl bg-zinc-100 p-1 shadow-inner" role="group" aria-label="Catalog view">
	<button
		type="button"
		class="rounded-lg px-3 py-1.5 text-xs font-bold transition {mode === 'cards'
			? 'bg-white text-zinc-900 shadow-sm'
			: 'text-zinc-500 hover:text-zinc-700'}"
		onclick={() => onChange('cards')}
	>
		Cards
	</button>
	<button
		type="button"
		class="rounded-lg px-3 py-1.5 text-xs font-bold transition {mode === 'table'
			? 'bg-white text-zinc-900 shadow-sm'
			: 'text-zinc-500 hover:text-zinc-700'}"
		onclick={() => onChange('table')}
	>
		Spreadsheet
	</button>
</div>
