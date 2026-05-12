<script lang="ts">
	import { goto } from '$app/navigation';
	import { authState } from '$lib/state/auth.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlyOpexTotal, resetOpexStore } from '$lib/state/opexStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import {
		getRecipeOrdersPerMonth,
		resetSummarySales,
		setRecipeOrdersPerMonth
	} from '$lib/state/summarySales.svelte';
	import { perOrderTotalCost } from '$lib/utils/recipeCosting';
	import { upsertMonthlySnapshot } from '$lib/state/monthlySummaryStore.svelte';
	import { pushWorkspaceNow } from '$lib/state/userDataPersistence';
	import { upsertMonthlySummaryOnServer } from '$lib/api/monthlySummariesClient';
	import { computeLiveMonthKpis } from '$lib/utils/dashboardFinance';
	import { bestSupplierLabel } from '$lib/utils/supplierAnalytics';
	import type { RecipeSalesSnapshotEntry } from '$lib/types/statistics';

	const ingredientMasters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);

	type Row = {
		id: string;
		name: string;
		sellingPrice: number;
		totalCost: number;
		profitPerOrder: number;
		ordersPerMonth: number;
		revenuePerMonth: number;
		profitPerMonth: number;
		breakevenOrdersOnlyThisRecipe: number | null;
	};

	const rows = $derived.by(() => {
		const list: Row[] = [];
		for (const r of recipeStore.recipes) {
			const totalCost = perOrderTotalCost(r, ingredientMasters, otherMasters);
			const sellingPrice = r.pricing.local;
			const profitPerOrder = sellingPrice - totalCost;
			const ordersPerMonth = getRecipeOrdersPerMonth(r.id);
			list.push({
				id: r.id,
				name: r.name,
				sellingPrice,
				totalCost,
				profitPerOrder,
				ordersPerMonth,
				revenuePerMonth: sellingPrice * ordersPerMonth,
				profitPerMonth: profitPerOrder * ordersPerMonth,
				breakevenOrdersOnlyThisRecipe: null
			});
		}
		return list;
	});

	const totalProfitFromOrders = $derived(rows.reduce((s, x) => s + x.profitPerMonth, 0));
	const monthlyOpex = $derived(monthlyOpexTotal());
	const netProfit = $derived(totalProfitFromOrders - monthlyOpex);

	const rowsWithBreakeven = $derived.by(() => {
		const np = netProfit;
		const shortfall = np >= 0 ? 0 : -np;
		return rows.map((row) => {
			let breakeven: number | null = null;
			if (np < 0 && shortfall > 0 && row.profitPerOrder > 0) {
				breakeven = Math.ceil(shortfall / row.profitPerOrder);
			}
			return { ...row, breakevenOrdersOnlyThisRecipe: breakeven };
		});
	});

	const live = $derived(computeLiveMonthKpis(recipeStore.recipes, ingredientMasters, otherMasters));
	const bestSup = $derived(bestSupplierLabel(ingredientMasters));

	async function saveSnapshot(): Promise<void> {
		const breakdown: RecipeSalesSnapshotEntry[] = [];
		for (const r of recipeStore.recipes) {
			const orders = getRecipeOrdersPerMonth(r.id);
			if (orders <= 0) continue;
			const totalCost = perOrderTotalCost(r, ingredientMasters, otherMasters);
			const sellingPrice = r.pricing.local;
			const profitPerOrder = sellingPrice - totalCost;
			breakdown.push({
				recipeId: r.id,
				recipeName: r.name,
				orders,
				revenue: sellingPrice * orders,
				profit: profitPerOrder * orders
			});
		}
		if (breakdown.length === 0) {
			alert('Enter monthly orders for at least one recipe before saving to Statistics.');
			return;
		}
		const token = authState.token;
		if (!token) {
			alert('You must be logged in to save statistics to the server.');
			return;
		}
		try {
			const saved = await upsertMonthlySummaryOnServer(token, {
				yearMonth: live.yearMonth,
				totalOpex: live.totalOpex,
				totalRevenue: live.totalRevenue,
				grossProfit: live.grossProfit,
				netProfit: live.netProfit,
				profitMarginPct: live.profitMarginPct,
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
		} catch (e) {
			const msg = e instanceof Error ? e.message : 'Save failed';
			alert(`Could not save statistics: ${msg}`);
			return;
		}
		resetSummarySales();
		resetOpexStore();
		if (authState.token) await pushWorkspaceNow(authState.token);
		void goto('/Statistics');
	}
</script>

<section class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Summary</h1>
		<p class="mt-1 text-sm text-zinc-500">
			Per recipe: if net profit is negative, see how many extra orders of <strong>that recipe alone</strong> would
			cover the gap (uses Local selling price & current costs). Saving to Statistics clears monthly order inputs and
			resets OPEX lines so you start a fresh month here.
		</p>
	</div>

	<div class="flex justify-end">
		<button
			type="button"
			class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
			onclick={saveSnapshot}
		>
			Save Summary to Statistics
		</button>
	</div>

	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-xs font-semibold uppercase text-zinc-500">Monthly OPEX</p>
			<p class="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">₱{monthlyOpex.toFixed(2)}</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-xs font-semibold uppercase text-zinc-500">Profit from orders (month)</p>
			<p class="mt-1 text-2xl font-semibold tabular-nums text-emerald-700">
				₱{totalProfitFromOrders.toFixed(2)}
			</p>
		</div>
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
			<p class="text-xs font-semibold uppercase text-emerald-800">Net profit</p>
			<p
				class="mt-1 text-2xl font-semibold tabular-nums"
				class:text-red-700={netProfit < 0}
				class:text-emerald-900={netProfit >= 0}
			>
				₱{netProfit.toFixed(2)}
			</p>
			<p class="mt-2 text-xs text-emerald-900/80">
				Sum of recipe profit/month − OPEX. No orders ⇒ net ≈ −OPEX.
			</p>
		</div>
	</div>

	<div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
		<table class="w-full min-w-[1040px] text-left text-sm">
			<thead class="border-b border-zinc-200 bg-zinc-900 text-xs uppercase tracking-wide text-white">
				<tr>
					<th class="px-3 py-3 font-medium">Recipe</th>
					<th class="px-3 py-3 font-medium text-right">Selling ₱</th>
					<th class="px-3 py-3 font-medium text-right">Total cost</th>
					<th class="px-3 py-3 font-medium text-right">Profit / order</th>
					<th class="px-3 py-3 font-medium text-right">Orders / mo</th>
					<th class="px-3 py-3 font-medium text-right">Revenue / mo</th>
					<th class="px-3 py-3 font-medium text-right">Profit / mo</th>
					<th class="px-3 py-3 font-medium text-right">Breakeven orders*</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-100">
				{#each rowsWithBreakeven as row (row.id)}
					<tr class="hover:bg-zinc-50/80">
						<td class="px-3 py-2.5 font-medium text-zinc-900">{row.name}</td>
						<td class="px-3 py-2.5 text-right tabular-nums">₱{row.sellingPrice.toFixed(2)}</td>
						<td class="px-3 py-2.5 text-right tabular-nums text-zinc-600">
							₱{row.totalCost.toFixed(2)}
						</td>
						<td
							class="px-3 py-2.5 text-right tabular-nums font-medium"
							class:text-emerald-700={row.profitPerOrder >= 0}
							class:text-red-600={row.profitPerOrder < 0}
						>
							₱{row.profitPerOrder.toFixed(2)}
						</td>
						<td class="px-3 py-2.5 text-right">
							<input
								type="number"
								min="0"
								step="1"
								value={row.ordersPerMonth}
								onchange={(e) =>
									setRecipeOrdersPerMonth(row.id, +((e.currentTarget as HTMLInputElement).value || 0))}
								class="w-24 rounded-lg border border-zinc-200 px-2 py-1 text-right text-sm tabular-nums"
							/>
						</td>
						<td class="px-3 py-2.5 text-right tabular-nums">₱{row.revenuePerMonth.toFixed(2)}</td>
						<td
							class="px-3 py-2.5 text-right tabular-nums font-medium"
							class:text-emerald-700={row.profitPerMonth >= 0}
							class:text-red-600={row.profitPerMonth < 0}
						>
							₱{row.profitPerMonth.toFixed(2)}
						</td>
						<td class="px-3 py-2.5 text-right tabular-nums font-medium text-zinc-900">
							{#if row.breakevenOrdersOnlyThisRecipe !== null}
								{row.breakevenOrdersOnlyThisRecipe.toLocaleString()}
							{:else if netProfit >= 0}
								—
							{:else}
								<span class="text-zinc-400">—</span>
							{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		{#if rowsWithBreakeven.length === 0}
			<p class="py-12 text-center text-sm text-zinc-500">Add recipes from the Recipes page.</p>
		{/if}
	</div>

	<p class="text-xs leading-relaxed text-zinc-500">
		*Breakeven orders (this recipe only): extra orders needed if <strong>only this drink</strong> contributed profit at
		the current profit/order to wipe out today’s negative net (₱{Math.max(0, -netProfit).toFixed(2)} shortfall). If
		profit/order ≤ 0 or net ≥ 0, shown as —.
	</p>
</section>
