<script lang="ts">
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlyOpexTotal } from '$lib/state/opexStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import { getRecipeOrdersPerMonth, setRecipeOrdersPerMonth } from '$lib/state/summarySales.svelte';
	import { salesStore } from '$lib/state/salesStore.svelte';
	import { buildRecipeBreakdownFromSales } from '$lib/utils/businessAnalytics';
	import { computeLiveMonthKpis } from '$lib/utils/dashboardFinance';
	import { perOrderTotalCost } from '$lib/utils/recipeCosting';
	import { formatPhp } from '$lib/utils/numberFormat';

	const ingredientMasters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);
	const live = $derived(computeLiveMonthKpis(recipeStore.recipes, ingredientMasters, otherMasters));
	const actualMonth = $derived(buildRecipeBreakdownFromSales(salesStore.transactions, live.yearMonth));

	const rows = $derived.by(() => {
		return recipeStore.recipes.map((r) => {
			const totalCost = perOrderTotalCost(r, ingredientMasters, otherMasters);
			const sellingPrice = r.pricing.local;
			const profitPerOrder = sellingPrice - totalCost;
			const projected = getRecipeOrdersPerMonth(r.id);
			const actual = actualMonth.find((a) => a.recipeId === r.id);
			const ordersPerMonth = actual?.orders ?? projected;
			return {
				id: r.id,
				name: r.name,
				sellingPrice,
				totalCost,
				profitPerOrder,
				projected,
				actualOrders: actual?.orders ?? 0,
				ordersPerMonth,
				revenuePerMonth: sellingPrice * ordersPerMonth,
				profitPerMonth: profitPerOrder * ordersPerMonth
			};
		});
	});

	const monthlyOpex = $derived(monthlyOpexTotal());
	const totalProfitFromOrders = $derived(rows.reduce((s, x) => s + x.profitPerMonth, 0));
	const netProfit = $derived(totalProfitFromOrders - monthlyOpex);
</script>

<div class="space-y-6">
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-[10px] font-bold uppercase text-zinc-500">Monthly OPEX</p>
			<p class="mt-1 text-2xl font-bold tabular-nums">{formatPhp(monthlyOpex)}</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<p class="text-[10px] font-bold uppercase text-zinc-500">Projected profit</p>
			<p class="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{formatPhp(totalProfitFromOrders)}</p>
		</div>
		<div class="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
			<p class="text-[10px] font-bold uppercase text-emerald-800">Net profit (plan)</p>
			<p class="mt-1 text-2xl font-bold tabular-nums" class:text-red-700={netProfit < 0} class:text-emerald-900={netProfit >= 0}>
				{formatPhp(netProfit)}
			</p>
		</div>
	</div>

	<p class="text-sm text-zinc-500">
		Set <strong>projected orders/month</strong> per recipe. When you record actual sales on the Sales tab, those quantities appear here automatically for the current month.
	</p>

	<div class="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[960px] text-left text-sm">
				<thead class="bg-zinc-50 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
					<tr>
						<th class="px-5 py-3">Recipe</th>
						<th class="px-5 py-3 text-right">Price</th>
						<th class="px-5 py-3 text-right">COGS</th>
						<th class="px-5 py-3 text-right">Profit/order</th>
						<th class="px-5 py-3 text-right">Projected/mo</th>
						<th class="px-5 py-3 text-right">Actual sold</th>
						<th class="px-5 py-3 text-right">Revenue/mo</th>
						<th class="px-5 py-3 text-right">Profit/mo</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each rows as row (row.id)}
						<tr class="hover:bg-zinc-50/60">
							<td class="px-5 py-3 font-semibold text-zinc-900">{row.name}</td>
							<td class="px-5 py-3 text-right tabular-nums">{formatPhp(row.sellingPrice)}</td>
							<td class="px-5 py-3 text-right tabular-nums text-zinc-600">{formatPhp(row.totalCost)}</td>
							<td class="px-5 py-3 text-right tabular-nums font-semibold text-emerald-700">{formatPhp(row.profitPerOrder)}</td>
							<td class="px-5 py-3 text-right">
								<input
									type="number"
									min="0"
									value={row.projected}
									onchange={(e) =>
										setRecipeOrdersPerMonth(row.id, +((e.currentTarget as HTMLInputElement).value || 0))}
									class="w-20 rounded-lg border border-zinc-200 px-2 py-1 text-right text-sm"
								/>
							</td>
							<td class="px-5 py-3 text-right tabular-nums font-semibold text-sky-700">
								{row.actualOrders > 0 ? row.actualOrders : '—'}
							</td>
							<td class="px-5 py-3 text-right tabular-nums">{formatPhp(row.revenuePerMonth)}</td>
							<td class="px-5 py-3 text-right tabular-nums font-semibold">{formatPhp(row.profitPerMonth)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
