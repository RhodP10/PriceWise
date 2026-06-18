<script lang="ts">
	import { browser } from '$app/environment';
	import AnalyticsBarChart from '$lib/components/analytics/AnalyticsBarChart.svelte';
	import AnalyticsLineChart from '$lib/components/analytics/AnalyticsLineChart.svelte';
	import DashboardTabNav from '$lib/components/analytics/DashboardTabNav.svelte';
	import KpiCard from '$lib/components/analytics/KpiCard.svelte';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlyOpexTotal } from '$lib/state/opexStore.svelte';
	import { monthlySummaryStore } from '$lib/state/monthlySummaryStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import { salesStore } from '$lib/state/salesStore.svelte';
	import {
		buildProfitabilitySeries,
		computeFullExecutiveKpis,
		computeSalesMetrics,
		decliningProducts,
		filterSalesByRange,
		ingredientCostTrends,
		inventoryHealth,
		inventoryVelocityFromSales,
		productProfitabilityTable,
		productRankings
	} from '$lib/utils/businessAnalytics';
	import { computeLiveMonthKpis } from '$lib/utils/dashboardFinance';
	import {
		avgLandedByChannel,
		buildIngredientSupplierCompares,
		supplierWinCounts
	} from '$lib/utils/supplierAnalytics';
	import { formatPhp, formatPercent1, formatPercent1Signed } from '$lib/utils/numberFormat';

	let activeTab = $state('overview');
	let dateFrom = $state('');
	let dateTo = $state('');

	const tabs = [
		{ id: 'overview', label: 'Executive' },
		{ id: 'sales', label: 'Sales' },
		{ id: 'products', label: 'Products' },
		{ id: 'inventory', label: 'Inventory' },
		{ id: 'suppliers', label: 'Suppliers' },
		{ id: 'profit', label: 'Profitability' }
	];

	const ingredientMasters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);
	const recipes = $derived(recipeStore.recipes);
	const live = $derived(computeLiveMonthKpis(recipes, ingredientMasters, otherMasters));
	const filteredSales = $derived(filterSalesByRange(salesStore.transactions, dateFrom || undefined, dateTo || undefined));
	const salesMetrics = $derived(computeSalesMetrics(filteredSales));
	const exec = $derived(
		computeFullExecutiveKpis(live, monthlySummaryStore.rows, filteredSales, recipes, ingredientMasters, otherMasters)
	);
	const rankings = $derived(productRankings(filteredSales));
	const profitability = $derived(productProfitabilityTable(filteredSales, recipes, ingredientMasters, otherMasters));
	const declining = $derived(decliningProducts(filteredSales));
	const inv = $derived(inventoryHealth(ingredientMasters, otherMasters));
	const velocity = $derived(inventoryVelocityFromSales(filteredSales, recipes, ingredientMasters, otherMasters));
	const costTrends = $derived(ingredientCostTrends(ingredientMasters, otherMasters));
	const profitSeries = $derived(buildProfitabilitySeries(monthlySummaryStore.rows, filteredSales, monthlyOpexTotal()));
	const compares = $derived(buildIngredientSupplierCompares(ingredientMasters));
	const supplierCounts = $derived(supplierWinCounts(ingredientMasters));
	const avgLanded = $derived(avgLandedByChannel(compares));

	const topRevenue = $derived([...rankings].sort((a, b) => b.revenue - a.revenue).slice(0, 5));
	const topProfit = $derived([...rankings].sort((a, b) => b.profit - a.profit).slice(0, 5));
	const lowSales = $derived([...rankings].filter((r) => r.quantity > 0).sort((a, b) => a.quantity - b.quantity).slice(0, 5));
</script>

<div class="space-y-6">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:hidden">
		<DashboardTabNav {tabs} active={activeTab} onchange={(id) => (activeTab = id)} />
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<label class="text-[10px] font-bold uppercase text-zinc-500">From</label>
			<input type="date" bind:value={dateFrom} class="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
			<label class="text-[10px] font-bold uppercase text-zinc-500">To</label>
			<input type="date" bind:value={dateTo} class="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm" />
		</div>
	</div>

	{#if activeTab === 'overview'}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
			<KpiCard label="Total revenue" value={formatPhp(exec.totalRevenue)} sub="Actual {formatPhp(exec.actualRevenue)}" accent="sky" />
			<KpiCard label="Transactions" value={String(exec.totalTransactions)} accent="violet" />
			<KpiCard label="OPEX" value={formatPhp(exec.totalOpex)} />
			<KpiCard label="Gross profit" value={formatPhp(exec.grossProfit)} accent="emerald" />
			<KpiCard label="Net profit" value={formatPhp(exec.netProfit)} accent={exec.netProfit >= 0 ? 'emerald' : 'red'} />
			<KpiCard label="Avg margin" value={formatPercent1(exec.avgMarginPct)} accent="violet" />
			<KpiCard label="Best seller" value={exec.bestSellingProduct} />
			<KpiCard label="Lowest performer" value={exec.lowestPerformingProduct} accent="amber" />
			<KpiCard label="Inventory value" value={formatPhp(exec.totalInventoryValue)} />
			<KpiCard label="Units sold" value={String(exec.totalUnitsSold)} sub="{exec.activeProducts} active products" />
		</div>
		{#if browser && profitSeries.length > 0}
			<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
				<p class="text-sm font-bold text-zinc-900">Revenue & profit trend</p>
				<AnalyticsLineChart
					title=""
					labels={profitSeries.map((p) => p.label)}
					datasets={[
						{ label: 'Revenue', data: profitSeries.map((p) => p.revenue), color: 'rgb(14 165 233)', fill: true },
						{ label: 'Net profit', data: profitSeries.map((p) => p.netProfit), color: 'rgb(5 150 105)', fill: true }
					]}
				/>
			</div>
		{/if}
	{/if}

	{#if activeTab === 'sales'}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<KpiCard label="Daily periods" value={String(salesMetrics.daily.length)} sub={formatPhp(salesMetrics.daily.at(-1)?.revenue ?? 0) + ' latest'} />
			<KpiCard label="Avg order value" value={formatPhp(salesMetrics.averageOrderValue)} accent="sky" />
			<KpiCard label="Units sold" value={String(salesMetrics.totalUnits)} />
			<KpiCard
				label="Revenue growth"
				value={salesMetrics.revenueGrowthPct === null ? '—' : formatPercent1Signed(salesMetrics.revenueGrowthPct)}
				accent={salesMetrics.revenueGrowthPct !== null && salesMetrics.revenueGrowthPct >= 0 ? 'emerald' : 'amber'}
			/>
		</div>
		{#if browser}
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
					<p class="mb-2 text-sm font-bold text-zinc-900">Daily revenue</p>
					<AnalyticsLineChart
						title=""
						labels={salesMetrics.daily.map((d) => d.label)}
						datasets={[{ label: 'Revenue', data: salesMetrics.daily.map((d) => d.revenue), color: 'rgb(14 165 233)', fill: true }]}
					/>
				</div>
				<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
					<p class="mb-2 text-sm font-bold text-zinc-900">Monthly revenue</p>
					<AnalyticsBarChart
						title=""
						labels={salesMetrics.monthly.map((m) => m.label)}
						values={salesMetrics.monthly.map((m) => m.revenue)}
						color="rgb(5 150 105)"
					/>
				</div>
			</div>
			<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
				<p class="mb-2 text-sm font-bold text-zinc-900">Revenue vs expenses (monthly)</p>
				<AnalyticsLineChart
					title=""
					labels={profitSeries.map((p) => p.label)}
					datasets={[
						{ label: 'Revenue', data: profitSeries.map((p) => p.revenue), color: 'rgb(14 165 233)' },
						{ label: 'Expenses', data: profitSeries.map((p) => p.expenses), color: 'rgb(239 68 68)' }
					]}
				/>
			</div>
		{/if}
	{/if}

	{#if activeTab === 'products'}
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
				<h3 class="font-bold text-emerald-800">Best selling</h3>
				<ul class="mt-3 space-y-2 text-sm">
					{#each topRevenue as p (p.recipeId)}
						<li class="flex justify-between"><span>{p.name}</span><span class="font-semibold tabular-nums">{p.quantity} sold</span></li>
					{:else}<li class="text-zinc-400">Record sales in Business Hub</li>{/each}
				</ul>
			</div>
			<div class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
				<h3 class="font-bold text-violet-800">Highest profit</h3>
				<ul class="mt-3 space-y-2 text-sm">
					{#each topProfit as p (p.recipeId)}
						<li class="flex justify-between"><span>{p.name}</span><span class="font-semibold tabular-nums text-emerald-700">{formatPhp(p.profit)}</span></li>
					{:else}<li class="text-zinc-400">—</li>{/each}
				</ul>
			</div>
		</div>
		{#if declining.length > 0}
			<div class="rounded-3xl border border-amber-200 bg-amber-50/50 p-5">
				<h3 class="font-bold text-amber-900">Declining sales (14d vs prior 14d)</h3>
				<ul class="mt-2 space-y-1 text-sm">
					{#each declining as d (d.recipeId)}
						<li>{d.name}: {d.priorQty} → {d.recentQty} ({formatPercent1Signed(-d.declinePct)})</li>
					{/each}
				</ul>
			</div>
		{/if}
		<div class="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-zinc-50 text-[10px] font-bold uppercase text-zinc-500">
					<tr>
						<th class="px-5 py-3 text-left">Product</th>
						<th class="px-5 py-3 text-right">Sales</th>
						<th class="px-5 py-3 text-right">Revenue</th>
						<th class="px-5 py-3 text-right">COGS</th>
						<th class="px-5 py-3 text-right">Profit</th>
						<th class="px-5 py-3 text-right">Margin</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each profitability as row (row.recipeId)}
						<tr>
							<td class="px-5 py-2.5 font-medium">{row.name}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{row.quantity}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(row.revenue)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums text-zinc-600">{formatPhp(row.totalCogs)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums text-emerald-700">{formatPhp(row.profit)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPercent1(row.marginPct)}</td>
						</tr>
					{:else}
						<tr><td colspan="6" class="px-5 py-10 text-center text-zinc-400">No product sales in range</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if lowSales.length > 0}
			<p class="text-xs text-zinc-500">Lowest sales: {lowSales.map((p) => p.name).join(', ')}</p>
		{/if}
	{/if}

	{#if activeTab === 'inventory'}
		<div class="grid gap-3 sm:grid-cols-4">
			<KpiCard label="Inventory value" value={formatPhp(inv.totalValue)} accent="sky" />
			<KpiCard label="Batches tracked" value={String(inv.rows.length)} />
			<KpiCard label="Low stock" value={String(inv.lowStock.length)} accent="amber" />
			<KpiCard label="Out of stock" value={String(inv.outOfStock.length)} accent="red" />
		</div>
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-3xl border border-emerald-200 bg-emerald-50/30 p-5">
				<h3 class="font-bold text-emerald-900">Fast moving (30d)</h3>
				<ul class="mt-3 space-y-2 text-sm">
					{#each velocity.fastMoving as r (r.id)}
						<li class="flex justify-between"><span>{r.name}</span><span class="font-semibold">{r.packagesUsed} pkg</span></li>
					{:else}<li class="text-zinc-500">Sell products to see movement</li>{/each}
				</ul>
			</div>
			<div class="rounded-3xl border border-amber-200 bg-amber-50/30 p-5">
				<h3 class="font-bold text-amber-900">Slow moving</h3>
				<ul class="mt-3 space-y-2 text-sm">
					{#each velocity.slowMoving as r (r.id)}
						<li class="flex justify-between"><span>{r.name}</span><span class="text-zinc-600">{r.packagesUsed} used · {r.stockPkgs} left</span></li>
					{/each}
				</ul>
			</div>
		</div>
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-3xl border border-red-100 bg-white p-5 shadow-sm">
				<h3 class="font-bold text-red-800">Price increases</h3>
				<ul class="mt-2 space-y-1 text-sm">
					{#each costTrends.increases.slice(0, 6) as t (t.id)}
						<li>{t.name}: {formatPercent1Signed(t.changePct ?? 0)}</li>
					{:else}<li class="text-zinc-400">No increases logged</li>{/each}
				</ul>
			</div>
			<div class="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
				<h3 class="font-bold text-emerald-800">Price decreases</h3>
				<ul class="mt-2 space-y-1 text-sm">
					{#each costTrends.decreases.slice(0, 6) as t (t.id)}
						<li>{t.name}: {formatPercent1Signed(t.changePct ?? 0)}</li>
					{:else}<li class="text-zinc-400">No decreases logged</li>{/each}
				</ul>
			</div>
		</div>
	{/if}

	{#if activeTab === 'suppliers'}
		<div class="grid gap-3 sm:grid-cols-3">
			<KpiCard label="Lazada avg landed" value={avgLanded.lazada === null ? '—' : formatPhp(avgLanded.lazada)} accent="sky" />
			<KpiCard label="Shopee avg landed" value={avgLanded.shopee === null ? '—' : formatPhp(avgLanded.shopee)} accent="amber" />
			<KpiCard label="Local avg" value={avgLanded.local === null ? '—' : formatPhp(avgLanded.local)} accent="emerald" />
		</div>
		<div class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
			<h3 class="font-bold text-zinc-900">Channel wins (cheapest per SKU)</h3>
			<p class="mt-1 text-sm text-zinc-500">Lazada {supplierCounts.lazada ?? 0} · Shopee {supplierCounts.shopee ?? 0} · Local {supplierCounts.local ?? 0}</p>
		</div>
		<div class="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-zinc-50 text-[10px] font-bold uppercase text-zinc-500">
					<tr>
						<th class="px-5 py-3 text-left">Ingredient</th>
						<th class="px-5 py-3 text-right">Lazada</th>
						<th class="px-5 py-3 text-right">Shopee</th>
						<th class="px-5 py-3 text-right">Local</th>
						<th class="px-5 py-3">Best</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each compares.slice(0, 12) as c (c.ingredientId)}
						<tr>
							<td class="px-5 py-2.5">{c.name}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{c.channels.lazada === null ? '—' : formatPhp(c.channels.lazada)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{c.channels.shopee === null ? '—' : formatPhp(c.channels.shopee)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(c.channels.local)}</td>
							<td class="px-5 py-2.5 text-xs font-bold uppercase text-emerald-700">{c.tiedWinners.join(' / ')}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if activeTab === 'profit'}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			<KpiCard label="Revenue" value={formatPhp(exec.totalRevenue)} accent="sky" />
			<KpiCard label="Expenses (OPEX+COGS)" value={formatPhp(exec.totalRevenue - exec.grossProfit + exec.totalOpex)} />
			<KpiCard label="Gross profit" value={formatPhp(exec.grossProfit)} accent="emerald" />
			<KpiCard label="Net profit" value={formatPhp(exec.netProfit)} accent={exec.netProfit >= 0 ? 'emerald' : 'red'} />
		</div>
		{#if browser && profitSeries.length > 0}
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
					<p class="mb-2 text-sm font-bold">Profit margin trend</p>
					<AnalyticsLineChart
						title=""
						labels={profitSeries.map((p) => p.label)}
						datasets={[{ label: 'Margin %', data: profitSeries.map((p) => p.marginPct), color: 'rgb(139 92 246)' }]}
						formatY="number"
					/>
				</div>
				<div class="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
					<p class="mb-2 text-sm font-bold">Monthly net profit</p>
					<AnalyticsBarChart
						title=""
						labels={profitSeries.map((p) => p.label)}
						values={profitSeries.map((p) => p.netProfit)}
						color="rgb(5 150 105)"
					/>
				</div>
			</div>
		{/if}
		<p class="text-xs text-zinc-500">Target margin setting: {costingSettings.targetMarginPct}% · VAT registered: {costingSettings.vatRegistered ? 'Yes' : 'No'}</p>
	{/if}
</div>
