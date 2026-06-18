<script lang="ts">
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlySummaryStore } from '$lib/state/monthlySummaryStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import { salesStore } from '$lib/state/salesStore.svelte';
	import {
		aggregateSales,
		computeExecutiveSummary,
		inventoryHealth,
		inventoryVelocityFromSales,
		productRankings
	} from '$lib/utils/businessAnalytics';
	import type { LiveMonthKpis } from '$lib/utils/dashboardFinance';
	import { formatPhp, formatPercent1 } from '$lib/utils/numberFormat';

	const { live }: { live: LiveMonthKpis } = $props();

	const exec = $derived(
		computeExecutiveSummary(live, monthlySummaryStore.rows, salesStore.transactions, recipeStore.recipes)
	);
	const rankings = $derived(productRankings(salesStore.transactions));
	const inv = $derived(inventoryHealth(ingredientCatalog.items, otherCatalog.items));
	const velocity = $derived(
		inventoryVelocityFromSales(
			salesStore.transactions,
			recipeStore.recipes,
			ingredientCatalog.items,
			otherCatalog.items
		)
	);
	const monthlySales = $derived(aggregateSales(salesStore.transactions, 'month'));

	const topSold = $derived([...rankings].sort((a, b) => b.quantity - a.quantity).slice(0, 5));
	const topMargin = $derived([...rankings].sort((a, b) => b.marginPct - a.marginPct).slice(0, 5));
	const leastSold = $derived([...rankings].sort((a, b) => a.quantity - b.quantity).slice(0, 5));
</script>

<div class="space-y-8">
	<div>
		<h2 class="text-xl font-bold text-zinc-900">Executive summary</h2>
		<p class="mt-1 text-sm text-zinc-500">Actual sales + saved snapshots + live Summary projections</p>
		<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-bold uppercase text-zinc-500">Total revenue</p>
				<p class="mt-1 text-xl font-bold tabular-nums text-zinc-900">{formatPhp(exec.totalRevenue)}</p>
				<p class="text-[10px] text-zinc-400">Actual {formatPhp(exec.actualRevenue)} · Proj {formatPhp(exec.projectedRevenue)}</p>
			</div>
			<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-bold uppercase text-zinc-500">Net profit</p>
				<p class="mt-1 text-xl font-bold tabular-nums text-emerald-700">{formatPhp(exec.netProfit)}</p>
			</div>
			<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-bold uppercase text-zinc-500">Avg margin</p>
				<p class="mt-1 text-xl font-bold tabular-nums text-violet-700">{formatPercent1(exec.avgMarginPct)}</p>
			</div>
			<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-bold uppercase text-zinc-500">OPEX</p>
				<p class="mt-1 text-xl font-bold tabular-nums text-zinc-900">{formatPhp(exec.totalOpex)}</p>
			</div>
		</div>
		<p class="mt-3 text-xs text-zinc-500">
			Best seller: <strong>{exec.bestProduct}</strong> · Needs attention: <strong>{exec.worstProduct}</strong>
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-2">
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<h3 class="font-bold text-zinc-900">Product analytics</h3>
			<p class="mt-1 text-xs text-zinc-500">From recorded sales</p>
			<div class="mt-4 grid gap-4 sm:grid-cols-2">
				<div>
					<p class="text-[10px] font-bold uppercase text-emerald-600">Most sold</p>
					<ul class="mt-2 space-y-1 text-sm">
						{#each topSold as p (p.recipeId)}
							<li class="flex justify-between gap-2"><span class="truncate">{p.name}</span><span class="shrink-0 tabular-nums font-semibold">{p.quantity}</span></li>
						{:else}
							<li class="text-zinc-400">Record sales to see rankings</li>
						{/each}
					</ul>
				</div>
				<div>
					<p class="text-[10px] font-bold uppercase text-violet-600">Highest margin</p>
					<ul class="mt-2 space-y-1 text-sm">
						{#each topMargin as p (p.recipeId)}
							<li class="flex justify-between gap-2"><span class="truncate">{p.name}</span><span class="shrink-0 tabular-nums font-semibold">{formatPercent1(p.marginPct)}</span></li>
						{:else}
							<li class="text-zinc-400">—</li>
						{/each}
					</ul>
				</div>
			</div>
			{#if leastSold.length > 0 && rankings.length > 1}
				<p class="mt-4 text-[10px] font-bold uppercase text-amber-600">Least sold</p>
				<ul class="mt-1 space-y-1 text-sm">
					{#each leastSold as p (p.recipeId)}
						<li class="flex justify-between gap-2"><span>{p.name}</span><span class="tabular-nums">{p.quantity}</span></li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<h3 class="font-bold text-zinc-900">Inventory health</h3>
			<p class="mt-1 text-xs text-zinc-500">Batch stock value: {formatPhp(inv.totalValue)}</p>
			<div class="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
				<div class="rounded-xl bg-red-50 px-2 py-3">
					<p class="font-bold text-red-700">{inv.outOfStock.length}</p>
					<p class="text-red-600">Out of stock</p>
				</div>
				<div class="rounded-xl bg-amber-50 px-2 py-3">
					<p class="font-bold text-amber-800">{inv.lowStock.length}</p>
					<p class="text-amber-700">Low stock</p>
				</div>
				<div class="rounded-xl bg-emerald-50 px-2 py-3">
					<p class="font-bold text-emerald-800">{inv.rows.filter((r) => r.status === 'ok').length}</p>
					<p class="text-emerald-700">Healthy</p>
				</div>
			</div>
			{#if inv.outOfStock.length > 0}
				<p class="mt-3 text-[10px] font-bold uppercase text-red-600">Out of stock</p>
				<p class="text-xs text-zinc-600">{inv.outOfStock.map((r) => r.name).slice(0, 5).join(', ')}</p>
			{/if}
			{#if velocity.fastMoving.length > 0}
				<p class="mt-4 text-[10px] font-bold uppercase text-emerald-600">Fast moving (30d sales)</p>
				<ul class="mt-1 space-y-1 text-xs">
					{#each velocity.fastMoving as row (row.id)}
						<li class="flex justify-between gap-2">
							<span class="truncate">{row.name}</span>
							<span class="shrink-0 tabular-nums font-semibold">{row.packagesUsed} pkg</span>
						</li>
					{/each}
				</ul>
			{/if}
			{#if velocity.slowMoving.length > 0}
				<p class="mt-3 text-[10px] font-bold uppercase text-amber-600">Slow moving (stock on hand)</p>
				<ul class="mt-1 space-y-1 text-xs">
					{#each velocity.slowMoving as row (row.id)}
						<li class="flex justify-between gap-2">
							<span class="truncate">{row.name}</span>
							<span class="shrink-0 tabular-nums text-zinc-500">{row.packagesUsed} used · {row.stockPkgs} left</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>

	{#if monthlySales.length > 0}
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
			<h3 class="font-bold text-zinc-900">Sales trend (actual)</h3>
			<div class="mt-3 overflow-x-auto">
				<table class="w-full text-sm">
					<thead class="text-[10px] font-bold uppercase text-zinc-500">
						<tr>
							<th class="py-2 text-left">Month</th>
							<th class="py-2 text-right">Revenue</th>
							<th class="py-2 text-right">Profit</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100">
						{#each monthlySales as m (m.periodKey)}
							<tr>
								<td class="py-2">{m.label}</td>
								<td class="py-2 text-right tabular-nums font-semibold text-sky-700">{formatPhp(m.revenue)}</td>
								<td class="py-2 text-right tabular-nums text-emerald-700">{formatPhp(m.profit)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
