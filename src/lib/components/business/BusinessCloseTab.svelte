<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$lib/state/auth.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlyOpexTotal, resetOpexStore } from '$lib/state/opexStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import { getRecipeOrdersPerMonth, resetSummarySales } from '$lib/state/summarySales.svelte';
	import { salesStore } from '$lib/state/salesStore.svelte';
	import { upsertMonthlySnapshot } from '$lib/state/monthlySummaryStore.svelte';
	import { pushWorkspaceNow } from '$lib/state/userDataPersistence.svelte';
	import { upsertMonthlySummaryOnServer } from '$lib/api/monthlySummariesClient';
	import KpiCard from '$lib/components/analytics/KpiCard.svelte';
	import {
		buildRecipeBreakdownFromSales,
		monthKpisFromActualSales
	} from '$lib/utils/businessAnalytics';
	import { computeLiveMonthKpis } from '$lib/utils/dashboardFinance';
	import { perOrderTotalCost } from '$lib/utils/recipeCosting';
	import { bestSupplierLabel } from '$lib/utils/supplierAnalytics';
	import { formatPhp, formatPercent1 } from '$lib/utils/numberFormat';
	import type { RecipeSalesSnapshotEntry } from '$lib/types/statistics';

	const ingredientMasters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);
	const live = $derived(computeLiveMonthKpis(recipeStore.recipes, ingredientMasters, otherMasters));
	const actualKpis = $derived(monthKpisFromActualSales(salesStore.transactions, live.yearMonth, live.totalOpex));
	const usingActual = $derived(!!actualKpis);

	const preview = $derived({
		revenue: actualKpis?.totalRevenue ?? live.totalRevenue,
		gross: actualKpis?.grossProfit ?? live.grossProfit,
		net: actualKpis?.netProfit ?? live.netProfit,
		margin: actualKpis?.profitMarginPct ?? live.profitMarginPct,
		opex: live.totalOpex
	});

	const bestSup = $derived(bestSupplierLabel(ingredientMasters));
	let saving = $state(false);

	async function saveSnapshot(): Promise<void> {
		const ym = live.yearMonth;
		const actualByRecipe = new Map(
			buildRecipeBreakdownFromSales(salesStore.transactions, ym).map((x) => [x.recipeId, x])
		);
		const breakdown: RecipeSalesSnapshotEntry[] = [];
		const seen = new Set<string>();

		for (const r of recipeStore.recipes) {
			const actual = actualByRecipe.get(r.id);
			if (actual) {
				breakdown.push(actual);
				seen.add(r.id);
				continue;
			}
			const orders = getRecipeOrdersPerMonth(r.id);
			if (orders <= 0) continue;
			const totalCost = perOrderTotalCost(r, ingredientMasters, otherMasters);
			const sellingPrice = r.pricing.local;
			breakdown.push({
				recipeId: r.id,
				recipeName: r.name,
				orders,
				revenue: sellingPrice * orders,
				profit: (sellingPrice - totalCost) * orders
			});
			seen.add(r.id);
		}
		for (const actual of actualByRecipe.values()) {
			if (!seen.has(actual.recipeId)) breakdown.push(actual);
		}

		const token = authState.token;
		if (!token) {
			alert('Log in to save monthly statistics.');
			return;
		}
		saving = true;
		try {
			const saved = await upsertMonthlySummaryOnServer(token, {
				yearMonth: ym,
				totalOpex: live.totalOpex,
				totalRevenue: preview.revenue,
				grossProfit: preview.gross,
				netProfit: preview.net,
				profitMarginPct: preview.margin,
				bestSupplier: bestSup,
				recipeBreakdown: breakdown
			});
			upsertMonthlySnapshot({
				id: saved.id,
				generatedAt: saved.generatedAt,
				yearMonth: saved.yearMonth,
				totalOpex: saved.totalOpex,
				totalRevenue: saved.totalRevenue,
				grossProfit: saved.grossProfit,
				netProfit: saved.netProfit,
				profitMarginPct: saved.profitMarginPct,
				bestSupplier: saved.bestSupplier,
				recipeBreakdown: saved.recipeBreakdown
			});
			resetSummarySales();
			resetOpexStore();
			if (authState.token) await pushWorkspaceNow(authState.token);
			void goto('/Statistics');
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Save failed');
		} finally {
			saving = false;
		}
	}
</script>

<div class="space-y-6">
	<div class="rounded-2xl border border-violet-200 bg-violet-50/40 p-5">
		<h2 class="text-lg font-bold text-violet-950">Month-end close — {live.yearMonth}</h2>
		<p class="mt-1 text-sm text-violet-900/80">
			{#if usingActual}
				Using <strong>recorded sales</strong> for revenue and profit. Projections fill gaps where no sales exist.
			{:else}
				No sales this month yet — snapshot will use <strong>projected orders</strong> from the Plan tab (or OPEX-only if zero orders).
			{/if}
		</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<KpiCard label="Revenue" value={formatPhp(preview.revenue)} accent="sky" />
		<KpiCard label="Gross profit" value={formatPhp(preview.gross)} accent="emerald" />
		<KpiCard label="OPEX" value={formatPhp(preview.opex)} />
		<KpiCard label="Net profit" value={formatPhp(preview.net)} accent={preview.net >= 0 ? 'emerald' : 'red'} sub={formatPercent1(preview.margin) + ' margin'} />
	</div>

	<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
		<h3 class="font-bold text-zinc-900">What happens on save</h3>
		<ul class="mt-3 list-inside list-disc space-y-1 text-sm text-zinc-600">
			<li>Monthly KPIs saved to Statistics archive</li>
			<li>Per-recipe breakdown stored for BI dashboards</li>
			<li>Projected order inputs and OPEX lines reset for next month</li>
			<li>Sales history is kept — only planning inputs clear</li>
		</ul>
		<button
			type="button"
			disabled={saving}
			onclick={() => void saveSnapshot()}
			class="mt-6 rounded-2xl bg-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-violet-500 disabled:opacity-50"
		>
			{saving ? 'Saving…' : 'Save month to Statistics'}
		</button>
	</div>
</div>
