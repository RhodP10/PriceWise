<script lang="ts">
	import type { RecipeDTO } from '$lib/types/recipe';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { perOrderTotalCost } from '$lib/utils/recipeCosting';

	const {
		recipe,
		onCosting,
		onSeeRecipe
	}: {
		recipe: RecipeDTO;
		onCosting: () => void;
		onSeeRecipe: () => void;
	} = $props();

	const masters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);
	const unitLoaded = $derived(perOrderTotalCost(recipe, masters, otherMasters));
	const linesCount = $derived(recipe.ingredientLines.length + recipe.otherLines.length);

	function fmtListPrice(ch: 'local' | 'shopee' | 'lazada'): string {
		const v = recipe.pricing[ch];
		if (ch !== 'local' && (!Number.isFinite(v) || v <= 0)) return '—';
		return `₱${v.toFixed(2)}`;
	}
</script>

<article
	class="glass group flex flex-col overflow-hidden rounded-3xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
>
	<button
		type="button"
		class="flex w-full flex-col p-6 text-left outline-none transition-colors group-hover:bg-zinc-50/50"
		onclick={onCosting}
		aria-label="Open costing and pricing for {recipe.name}"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="space-y-1">
				<div class="flex items-center gap-2">
					<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
						<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-utensils-crosseyed"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3"/><path d="m2 22 11-11"/><path d="M8 22V10l2.5 2.5a3 3 0 0 0 4.2 0L17 10v12"/></svg>
					</div>
					<h2 class="text-xl font-bold tracking-tight text-zinc-900 transition-colors group-hover:text-orange-600">
						{recipe.name}
					</h2>
				</div>
				<div class="flex flex-wrap gap-2 pt-2">
					<span class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
						{recipe.ingredientLines.length} Ingredients
					</span>
					<span class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
						{recipe.otherLines.length} Others
					</span>
				</div>
			</div>
		</div>

		<div class="mt-6 flex flex-col gap-4">
			<div class="flex items-end justify-between">
				<p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Production Cost</p>
				<p class="text-2xl font-bold tabular-nums text-zinc-900">₱{unitLoaded.toFixed(2)}</p>
			</div>

			<div class="grid grid-cols-3 gap-2">
				<div class="flex flex-col gap-1 rounded-2xl bg-zinc-50 p-3 shadow-inner">
					<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Local</p>
					<p class="text-sm font-bold tabular-nums text-zinc-900">{fmtListPrice('local')}</p>
				</div>
				<div class="flex flex-col gap-1 rounded-2xl bg-emerald-50/80 p-3 shadow-inner ring-1 ring-emerald-100">
					<p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Shopee</p>
					<p class="text-sm font-bold tabular-nums text-zinc-900">{fmtListPrice('shopee')}</p>
				</div>
				<div class="flex flex-col gap-1 rounded-2xl bg-sky-50/80 p-3 shadow-inner ring-1 ring-sky-100">
					<p class="text-[10px] font-bold uppercase tracking-wider text-sky-600">Lazada</p>
					<p class="text-sm font-bold tabular-nums text-zinc-900">{fmtListPrice('lazada')}</p>
				</div>
			</div>
		</div>
	</button>

	<div class="border-t border-zinc-100/50 bg-zinc-50/30 p-4">
		<button
			type="button"
			class="flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-black active:scale-[0.98]"
			onclick={onSeeRecipe}
		>
			<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
			Recipe Details
		</button>
	</div>
</article>
