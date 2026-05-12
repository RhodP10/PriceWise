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
</script>

<article
	class="flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-black/[0.03] transition hover:shadow-md"
>
	<button
		type="button"
		class="group flex w-full flex-col p-5 text-left outline-none transition hover:bg-zinc-50/60 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
		onclick={onCosting}
		aria-label="Open costing and pricing for {recipe.name}"
	>
		<div class="flex items-start justify-between gap-3">
			<div>
				<h2 class="text-lg font-semibold tracking-tight text-zinc-900 group-hover:text-emerald-900">
					{recipe.name}
				</h2>
				<p class="mt-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
					{recipe.ingredientLines.length} ingredients · {recipe.otherLines.length} others · Total ₱{unitLoaded.toFixed(
						2
					)}
				</p>
				<p class="mt-0.5 text-[11px] text-zinc-400">{linesCount} cost line(s) · open costing</p>
			</div>
		</div>

		<div class="mt-4 grid grid-cols-3 gap-2 text-center">
			<div class="rounded-xl bg-zinc-50 px-2 py-3">
				<p class="text-[10px] font-semibold uppercase text-zinc-500">Local</p>
				<p class="mt-1 text-sm font-semibold tabular-nums text-zinc-900">₱{recipe.pricing.local}</p>
			</div>
			<div class="rounded-xl bg-emerald-50/80 px-2 py-3 ring-1 ring-emerald-100">
				<p class="text-[10px] font-semibold uppercase text-emerald-700">Shopee</p>
				<p class="mt-1 text-sm font-semibold tabular-nums text-emerald-900">₱{recipe.pricing.shopee}</p>
			</div>
			<div class="rounded-xl bg-sky-50/80 px-2 py-3 ring-1 ring-sky-100">
				<p class="text-[10px] font-semibold uppercase text-sky-700">Lazada</p>
				<p class="mt-1 text-sm font-semibold tabular-nums text-sky-900">₱{recipe.pricing.lazada}</p>
			</div>
		</div>
	</button>

	<div class="border-t border-zinc-100 bg-zinc-50/40 px-4 py-3">
		<button
			type="button"
			class="w-full rounded-xl bg-zinc-950 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black active:scale-[0.99]"
			onclick={onSeeRecipe}
		>
			See recipes
		</button>
	</div>
</article>
