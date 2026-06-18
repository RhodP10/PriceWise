<script lang="ts">
	import { browser } from '$app/environment';
	import { postSmartPricingAnalyze } from '$lib/api/smartPricingClient';
	import SmartPricingDashboard from '$lib/components/smart-pricing/SmartPricingDashboard.svelte';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlySummaryStore } from '$lib/state/monthlySummaryStore.svelte';
	import { monthlyOpexTotal } from '$lib/state/opexStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import { salesStore } from '$lib/state/salesStore.svelte';
	import { summarySales } from '$lib/state/summarySales.svelte';
	import { authState } from '$lib/state/auth.svelte';
	import type { SmartPricingAnalysisResult } from '$lib/types/smartPricing';
	import { buildSmartPricingPayload } from '$lib/utils/smartPricingPayload';

	let loading = $state(false);
	let error = $state('');
	let data = $state<SmartPricingAnalysisResult | null>(null);

	const costingInput = $derived({
		vatRegistered: costingSettings.vatRegistered,
		vatPct: costingSettings.vatPct,
		batchSize: costingSettings.batchSize,
		targetMarginPct: costingSettings.targetMarginPct,
		discountPct: costingSettings.discountPct
	});

	async function runAnalyze(): Promise<void> {
		if (!browser) return;
		if (!authState.token) {
			data = null;
			error = '';
			return;
		}
		loading = true;
		error = '';
		try {
			const payload = buildSmartPricingPayload(
				recipeStore.recipes,
				ingredientCatalog.items,
				otherCatalog.items,
				summarySales.ordersPerMonthByRecipeId,
				costingInput,
				monthlySummaryStore.rows,
				salesStore.transactions,
				monthlyOpexTotal()
			);
			data = await postSmartPricingAnalyze(authState.token, payload);
		} catch (e) {
			data = null;
			error = e instanceof Error ? e.message : 'Analysis failed';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (!browser) return;
		void authState.token;
		void recipeStore.recipes;
		void ingredientCatalog.items;
		void monthlySummaryStore.rows;
		void salesStore.transactions;
		if (authState.token) void runAnalyze();
	});
</script>

<svelte:head>
	<title>Smart Pricing — PriceWise</title>
</svelte:head>

<section class="space-y-8 pb-16">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl"></div>
		<div class="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl"></div>
		<div class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
			<div class="max-w-2xl space-y-3">
				<p class="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/90">Machine learning pricing</p>
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Smart Pricing</h1>
				<p class="text-lg text-zinc-400">
					Linear, multiple, and polynomial regression on your costs, sales, OPEX, and supplier trends — not simple markup.
					Trained on inventory logs, recipe COGS, Business Hub sales, and Statistics snapshots.
				</p>
			</div>
			<button
				type="button"
				disabled={loading || !authState.token}
				onclick={() => void runAnalyze()}
				class="rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-violet-500 disabled:opacity-50"
			>
				{loading ? 'Running models…' : 'Refresh ML analysis'}
			</button>
		</div>
	</div>

	{#if error}
		<div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
	{/if}

	{#if loading && !data}
		<div class="flex flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-200 bg-white py-24">
			<div class="h-10 w-10 animate-spin rounded-full border-4 border-violet-600 border-t-transparent"></div>
			<p class="text-sm text-zinc-600">Training regression models on your business data…</p>
		</div>
	{:else if data}
		<SmartPricingDashboard {data} />
	{:else}
		<p class="text-center text-sm text-zinc-500">Log in and add recipes to run Smart Pricing.</p>
	{/if}
</section>
