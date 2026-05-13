<script lang="ts">
	import type { RecipeDTO } from '$lib/types/recipe';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import {
		computeAutoSyncedRecipePricing,
		computeRecipeMarketIngredientSavingsVsCatalog,
		type RecipeMarketSavingsChannel
	} from '$lib/utils/recipeCosting';
	import RecipeCardHelp from '$lib/components/recipes/RecipeCardHelp.svelte';

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
	const linesCount = $derived(recipe.ingredientLines.length + recipe.otherLines.length);
	const ingSavings = $derived.by(() =>
		computeRecipeMarketIngredientSavingsVsCatalog(recipe, masters, otherMasters)
	);

	/** Same list prices as Costing drawer — derived so the card updates when lines or catalog change. */
	const suggestedList = $derived.by(() => {
		void costingSettings.vatRegistered;
		void costingSettings.vatPct;
		void costingSettings.batchSize;
		void costingSettings.targetMarginPct;
		void costingSettings.discountPct;
		void recipe.ingredientLines;
		void recipe.otherLines;
		void masters;
		void otherMasters;
		return computeAutoSyncedRecipePricing(recipe, masters, otherMasters, {
			vatRegistered: costingSettings.vatRegistered,
			vatPct: costingSettings.vatPct,
			batchSize: costingSettings.batchSize,
			targetMarginPct: costingSettings.targetMarginPct,
			discountPct: costingSettings.discountPct
		});
	});

	/** Which sourcing column has the lowest ingredient COGS for this recipe (among values we have). */
	const cheapestSource = $derived.by(() => {
		type Key = 'local' | 'shopee' | 'lazada';
		const opts: { key: Key; cogs: number }[] = [{ key: 'local', cogs: ingSavings.localCogs }];
		if (ingSavings.shopeeCogs !== null) opts.push({ key: 'shopee', cogs: ingSavings.shopeeCogs });
		if (ingSavings.lazadaCogs !== null) opts.push({ key: 'lazada', cogs: ingSavings.lazadaCogs });
		let best = opts[0]!;
		for (const o of opts.slice(1)) {
			if (o.cogs < best.cogs - 1e-9) best = o;
		}
		return best.key;
	});

	function marketLabel(ch: RecipeMarketSavingsChannel): string {
		return ch === 'lazada' ? 'Lazada' : 'Shopee';
	}

	function fmtCogs(v: number | null): string {
		if (v === null || !Number.isFinite(v) || v < 0) return '—';
		return `₱${v.toFixed(2)}`;
	}

	function fmtSell(n: number): string {
		if (!Number.isFinite(n) || n <= 0) return '—';
		return `₱${n.toFixed(2)}`;
	}

	/** One help panel open at a time; ? stops propagation so the card does not open Costing. */
	let helpOpen = $state<'sell' | 'cogs' | 'summary' | null>(null);

	function toggleHelp(id: 'sell' | 'cogs' | 'summary', e: MouseEvent): void {
		e.stopPropagation();
		e.preventDefault();
		helpOpen = helpOpen === id ? null : id;
	}

	function onWindowKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape' && helpOpen !== null) helpOpen = null;
	}

	function costingRowKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onCosting();
		}
	}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<article
	class="glass group flex flex-col overflow-hidden rounded-3xl shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
>
	<div
		role="button"
		tabindex="0"
		class="flex w-full cursor-pointer flex-col p-6 text-left outline-none transition-colors group-hover:bg-zinc-50/50 focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
		onclick={onCosting}
		onkeydown={costingRowKeydown}
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
						Ingredients
					</span>
					<span class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
						Others
					</span>
				</div>
			</div>
		</div>

		<div class="mt-6 flex flex-col gap-4">
			{#if ingSavings.channelsCheaperThanCatalog.length > 0}
				{@const lead = ingSavings.channelsCheaperThanCatalog[0]!}
				<div
					class="rounded-2xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50 to-teal-50/90 p-4 shadow-sm ring-1 ring-emerald-100"
					aria-live="polite"
				>
					<p class="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
						Save on ingredients
					</p>
					<p class="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-950">
						₱{lead.savePerOrder.toFixed(2)}
						<span class="text-lg font-bold text-emerald-900"> / order</span>
					</p>
					<p class="mt-1 text-sm font-semibold text-emerald-900">
						Cheaper on {marketLabel(lead.channel)} than your local COGS
					</p>
					{#if ingSavings.channelsCheaperThanCatalog.length > 1}
						<p class="mt-2 text-[11px] leading-snug text-emerald-900/85">
							Also cheaper than local:
							{#each ingSavings.channelsCheaperThanCatalog.slice(1) as row, i (row.channel)}
								{#if i > 0}<span class="text-emerald-700/70"> · </span>{/if}
								<span class="font-medium"
									>{marketLabel(row.channel)} (−₱{row.savePerOrder.toFixed(2)})</span
								>
							{/each}
						</p>
					{/if}
				</div>
			{/if}

			<div class="rounded-2xl border border-teal-100/80 bg-gradient-to-br from-white to-teal-50/40 p-4 shadow-inner">
				<RecipeCardHelp
					expanded={helpOpen === 'sell'}
					onToggle={(e) => toggleHelp('sell', e)}
					label="Suggested selling price"
				>
					{#snippet title()}
						<p class="text-[10px] font-bold uppercase tracking-wider text-teal-800/80">
							Suggested selling price
						</p>
					{/snippet}
					{#snippet children()}
						<p>
							Local list price uses your target margin (same as Costing). Shopee and Lazada list prices
							appear when every ingredient and other line in this recipe has that channel’s landed total
							filled from a scrape.
						</p>
					{/snippet}
				</RecipeCardHelp>
				<p class="mt-1 text-2xl font-bold tabular-nums text-zinc-900">{fmtSell(suggestedList.local)}</p>
				<div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] tabular-nums text-zinc-600">
					<span>Shopee list: <span class="font-semibold text-zinc-900">{fmtSell(suggestedList.shopee)}</span></span>
					<span>Lazada list: <span class="font-semibold text-zinc-900">{fmtSell(suggestedList.lazada)}</span></span>
				</div>
			</div>

			<RecipeCardHelp
					expanded={helpOpen === 'cogs'}
					onToggle={(e) => toggleHelp('cogs', e)}
					label="Ingredient COGS"
				>
					{#snippet title()}
						<p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Ingredient COGS</p>
					{/snippet}
					{#snippet children()}
						<p>
							Per order ingredient cost for this recipe. Local uses your catalog unit costs. Shopee and
							Lazada use landed package price ÷ base quantity from each row, only when every line has that
							channel filled. Totals for each channel are in the boxes below.
						</p>
					{/snippet}
				</RecipeCardHelp>

			<div class="grid grid-cols-3 gap-2">
				<div
					class="flex flex-col gap-1 rounded-2xl p-3 shadow-inner {cheapestSource === 'local'
						? 'bg-zinc-100 ring-2 ring-zinc-400'
						: 'bg-zinc-50'}"
					title="Recipe lines × your local (catalog) unit cost."
				>
					<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Local</p>
					<p class="text-sm font-bold tabular-nums text-zinc-900">
						{fmtCogs(ingSavings.localCogs)}
					</p>
				</div>
				<div
					class="flex flex-col gap-1 rounded-2xl p-3 shadow-inner {cheapestSource === 'shopee'
						? 'bg-emerald-100 ring-2 ring-emerald-500'
						: 'bg-emerald-50/80 ring-1 ring-emerald-100'}"
					title="Same recipe using Shopee landed ÷ base qty on every line."
				>
					<p class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Shopee</p>
					<p class="text-sm font-bold tabular-nums text-zinc-900">{fmtCogs(ingSavings.shopeeCogs)}</p>
				</div>
				<div
					class="flex flex-col gap-1 rounded-2xl p-3 shadow-inner {cheapestSource === 'lazada'
						? 'bg-sky-100 ring-2 ring-sky-500'
						: 'bg-sky-50/80 ring-1 ring-sky-100'}"
					title="Same recipe using Lazada landed ÷ base qty on every line."
				>
					<p class="text-[10px] font-bold uppercase tracking-wider text-sky-700">Lazada</p>
					<p class="text-sm font-bold tabular-nums text-zinc-900">{fmtCogs(ingSavings.lazadaCogs)}</p>
				</div>
			</div>

			<div
				class="rounded-xl border border-zinc-200/80 bg-white/70 px-3 py-2.5 text-left shadow-inner ring-1 ring-zinc-100/80"
			>
				<RecipeCardHelp
					expanded={helpOpen === 'summary'}
					onToggle={(e) => toggleHelp('summary', e)}
					label="Summary and savings"
				>
					{#snippet title()}
						<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Summary · Savings</p>
					{/snippet}
					{#snippet children()}
						<p>
							Shows ingredient savings when a marketplace is cheaper than your local COGS, or how much you
							save by staying local vs marketplace when those channels are filled. Uses COGS only, not
							selling price with margin. Add Shopee and Lazada landed totals on every ingredient and other
							in this recipe to unlock marketplace comparisons. If the summary shows “—”, open this help
							or add lines to the recipe first.
						</p>
					{/snippet}
				</RecipeCardHelp>
				<div class="mt-2">
				{#if linesCount === 0}
					<p class="mt-1 text-xs text-zinc-500">—</p>
				{:else if ingSavings.channelsCheaperThanCatalog.length > 0}
					<p class="mt-1 text-xs leading-snug text-emerald-900">
						Buying these ingredients on {marketLabel(ingSavings.channelsCheaperThanCatalog[0]!.channel)}
						saves <span class="font-semibold tabular-nums"
							>₱{ingSavings.channelsCheaperThanCatalog[0]!.savePerOrder.toFixed(2)}</span
						>
						per order vs your local COGS.
					</p>
				{:else if ingSavings.catalogVsMarketplaceSavings.length > 0}
					<ul class="mt-1 list-none space-y-1 text-xs tabular-nums text-zinc-900">
						{#each ingSavings.catalogVsMarketplaceSavings as row (row.channel)}
							<li class="flex items-baseline justify-between gap-2 border-b border-zinc-100/90 pb-1 last:border-0 last:pb-0">
								<span class="text-zinc-600">vs {marketLabel(row.channel)}</span>
								<span class="font-bold text-emerald-800">save ₱{row.savePerOrder.toFixed(2)} / order</span>
							</li>
						{/each}
					</ul>
				{:else if ingSavings.shopeeCogs === null && ingSavings.lazadaCogs === null}
					<p class="mt-1 text-xs font-medium text-zinc-400">—</p>
				{:else}
					<p class="mt-1 text-xs leading-snug text-zinc-600">
						Local and marketplace ingredient COGS match.
					</p>
				{/if}
				</div>
			</div>
		</div>
	</div>

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
