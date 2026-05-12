<script lang="ts">
	import { browser } from '$app/environment';
	import StatisticsCharts from '$lib/components/statistics/StatisticsCharts.svelte';
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import { ingredientCatalog } from '$lib/state/ingredientCatalog.svelte';
	import { monthlySummaryStore, deleteMonthlySnapshot } from '$lib/state/monthlySummaryStore.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import { recipeStore } from '$lib/state/recipes.svelte';
	import type { MonthlyFinancialSnapshot } from '$lib/types/statistics';
	import {
		averageChannelPrice,
		averageSuggestedPrice,
		computeLiveMonthKpis
	} from '$lib/utils/dashboardFinance';
	import { buildMonthlySeries, pctChange } from '$lib/utils/dashboardSeries';
	import {
		avgLandedByChannel,
		avgPctCheaperThan,
		bestSupplierLabel,
		buildIngredientSupplierCompares,
		supplierWinCounts
	} from '$lib/utils/supplierAnalytics';

	const ingredientMasters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);
	const recipes = $derived(recipeStore.recipes);

	const costingInput = $derived({
		vatRegistered: costingSettings.vatRegistered,
		vatPct: costingSettings.vatPct,
		batchSize: costingSettings.batchSize,
		targetMarginPct: costingSettings.targetMarginPct,
		discountPct: costingSettings.discountPct
	});

	const live = $derived(computeLiveMonthKpis(recipes, ingredientMasters, otherMasters));
	const series = $derived(buildMonthlySeries(monthlySummaryStore.rows, live, 6));
	const compares = $derived(buildIngredientSupplierCompares(ingredientMasters));
	const supplierCounts = $derived(supplierWinCounts(ingredientMasters));
	const avgLanded = $derived(avgLandedByChannel(compares));
	const bestSup = $derived(bestSupplierLabel(ingredientMasters));

	const shopeeVsLazada = $derived(avgPctCheaperThan(ingredientMasters, 'shopee', 'lazada'));
	const localVsLazada = $derived(avgPctCheaperThan(ingredientMasters, 'local', 'lazada'));

	const avgSuggest = $derived(averageSuggestedPrice(recipes, ingredientMasters, otherMasters, costingInput));
	const avgLocal = $derived(averageChannelPrice(recipes, 'local'));
	const avgShopee = $derived(averageChannelPrice(recipes, 'shopee'));
	const avgLazada = $derived(averageChannelPrice(recipes, 'lazada'));
	const momNet = $derived.by(() => {
		const pts = series;
		if (pts.length < 2) return null;
		const a = pts[pts.length - 2]!.netProfit;
		const b = pts[pts.length - 1]!.netProfit;
		return pctChange(a, b);
	});
	const momRev = $derived.by(() => {
		const pts = series;
		if (pts.length < 2) return null;
		return pctChange(pts[pts.length - 2]!.revenue, pts[pts.length - 1]!.revenue);
	});

	const costTrendPct = $derived.by(() => {
		const pts = series;
		if (pts.length < 2) return null;
		const a = pts[pts.length - 2]!.revenue - pts[pts.length - 2]!.netProfit;
		const b = pts[pts.length - 1]!.revenue - pts[pts.length - 1]!.netProfit;
		return pctChange(a, b);
	});

	let search = $state('');
	let filterYear = $state('');
	let filterMonth = $state('');
	let detail: MonthlyFinancialSnapshot | null = $state(null);

	let deleteSnapshotTarget = $state<{ id: string; label: string } | null>(null);

	/** Keep the detail modal in sync when the store updates (e.g. after Summary save + navigation). */
	$effect(() => {
		const rows = monthlySummaryStore.rows;
		const d = detail;
		if (!d) return;
		const next = rows.find((r) => r.id === d.id);
		if (next) detail = next;
		else detail = null;
	});

	function requestDeleteSnapshot(r: MonthlyFinancialSnapshot): void {
		deleteSnapshotTarget = { id: r.id, label: r.yearMonth };
	}

	function executeDeleteSnapshot(): void {
		if (deleteSnapshotTarget) deleteMonthlySnapshot(deleteSnapshotTarget.id);
		deleteSnapshotTarget = null;
	}

	const tableRows = $derived(
		[...monthlySummaryStore.rows].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
	);

	const filteredRows = $derived.by(() => {
		let list = tableRows;
		const q = search.trim().toLowerCase();
		if (q) {
			list = list.filter(
				(r) =>
					r.yearMonth.includes(q) ||
					r.bestSupplier.toLowerCase().includes(q) ||
					r.generatedAt.toLowerCase().includes(q)
			);
		}
		if (filterYear) list = list.filter((r) => r.yearMonth.startsWith(filterYear));
		if (filterMonth) list = list.filter((r) => r.yearMonth.endsWith(`-${filterMonth}`));
		return list;
	});

	const yearOptions = $derived.by(() => {
		const ys = new Set<string>();
		for (const r of monthlySummaryStore.rows) ys.add(r.yearMonth.slice(0, 4));
		return [...ys].sort((a, b) => b.localeCompare(a));
	});

	function fmt(n: number): string {
		return `₱${n.toFixed(2)}`;
	}

	function csvEscape(s: string): string {
		if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
		return s;
	}

	function exportCsv(): void {
		const headers = [
			'Month',
			'Total OPEX',
			'Total Revenue',
			'Gross Profit',
			'Net Profit',
			'Profit Margin %',
			'Best Supplier',
			'Generated'
		];
		const lines = [headers.join(',')];
		for (const r of filteredRows) {
			lines.push(
				[
					r.yearMonth,
					r.totalOpex.toFixed(2),
					r.totalRevenue.toFixed(2),
					r.grossProfit.toFixed(2),
					r.netProfit.toFixed(2),
					r.profitMarginPct.toFixed(2),
					csvEscape(r.bestSupplier),
					csvEscape(r.generatedAt)
				].join(',')
			);
		}
		const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `pricewise-statistics-${live.yearMonth}.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function exportJsonSummary(): void {
		const payload = {
			generatedAt: new Date().toISOString(),
			liveMonth: live,
			supplierWins: supplierCounts,
			avgLanded,
			insights: {
				shopeeVsLazadaPct: shopeeVsLazada,
				localVsLazadaPct: localVsLazada,
				avgSuggestedPrice: avgSuggest,
				avgLocalSelling: avgLocal
			},
			monthlySummaries: filteredRows
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `pricewise-analytics-${live.yearMonth}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function printReport(): void {
		window.print();
	}
</script>

<svelte:head>
	<title>Statistics — Pricewise</title>
</svelte:head>

<section class="statistics-print space-y-8 print:max-w-none">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Statistics</h1>
			<p class="mt-1 max-w-2xl text-sm text-zinc-500">
				Monthly financials from your Summary inputs (orders × Local price, COGS, OPEX), supplier channel comparison on
				ingredients, and saved month history.
			</p>
		</div>
		<div class="flex flex-wrap gap-2 print:hidden">
			<button
				type="button"
				class="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
				onclick={exportCsv}
			>
				Export CSV
			</button>
			<button
				type="button"
				class="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
				onclick={exportJsonSummary}
			>
				Download analytics JSON
			</button>
			<button
				type="button"
				class="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
				onclick={printReport}
			>
				Print / PDF
			</button>
		</div>
	</div>

	<!-- KPI cards -->
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
		<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-semibold uppercase text-zinc-500">Monthly OPEX</p>
			<p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{fmt(live.totalOpex)}</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-semibold uppercase text-zinc-500">Monthly revenue</p>
			<p class="mt-1 text-xl font-semibold tabular-nums text-zinc-900">{fmt(live.totalRevenue)}</p>
			{#if momRev !== null}
				<p
					class="mt-1 text-xs font-medium tabular-nums"
					class:text-emerald-700={momRev >= 0}
					class:text-red-600={momRev < 0}
				>
					{momRev >= 0 ? '▲' : '▼'} {Math.abs(momRev).toFixed(1)}% vs prior month
				</p>
			{/if}
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-semibold uppercase text-zinc-500">Gross profit</p>
			<p class="mt-1 text-xl font-semibold tabular-nums text-emerald-800">{fmt(live.grossProfit)}</p>
		</div>
		<div class="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
			<p class="text-xs font-semibold uppercase text-emerald-900">Net profit</p>
			<p
				class="mt-1 text-xl font-semibold tabular-nums"
				class:text-red-700={live.netProfit < 0}
				class:text-emerald-900={live.netProfit >= 0}
			>
				{fmt(live.netProfit)}
			</p>
			{#if momNet !== null}
				<p
					class="mt-1 text-xs font-medium tabular-nums"
					class:text-emerald-700={momNet >= 0}
					class:text-red-600={momNet < 0}
				>
					{momNet >= 0 ? '▲' : '▼'} {Math.abs(momNet).toFixed(1)}% vs prior month
				</p>
			{/if}
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-semibold uppercase text-zinc-500">Profit margin</p>
			<p
				class="mt-1 text-xl font-semibold tabular-nums"
				class:text-red-700={live.profitMarginPct < 0}
				class:text-emerald-900={live.profitMarginPct >= 0}
			>
				{live.profitMarginPct.toFixed(1)}%
			</p>
		</div>
	</div>

	{#if browser}
		<StatisticsCharts {series} supplierCounts={supplierCounts} avgLanded={avgLanded} />
	{:else}
		<p class="text-sm text-zinc-500">Charts load in the browser.</p>
	{/if}

	<!-- Supplier analytics -->
	<div class="grid gap-4 lg:grid-cols-3">
		<div class="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-sm lg:col-span-1">
			<p class="text-xs font-semibold uppercase text-emerald-800">Best supplier (SKUs)</p>
			<p class="mt-2 text-2xl font-bold text-emerald-950">{bestSup}</p>
			<p class="mt-2 text-xs text-emerald-900/80">
				Counts which channel has the lowest landed package cost per ingredient (uses catalog triple or estimates).
			</p>
		</div>
		<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm lg:col-span-2">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-500">Channel insights</h2>
			<ul class="mt-3 space-y-2 text-sm text-zinc-700">
				<li>
					{#if shopeeVsLazada !== null}
						<strong>Shopee</strong> averages <span class="text-emerald-700">{shopeeVsLazada.toFixed(1)}%</span> cheaper
						than <strong>Lazada</strong> on comparable SKUs (where Shopee wins on price).
					{:else}
						Not enough Shopee &lt; Lazada pairs to compare averages.
					{/if}
				</li>
				<li>
					{#if localVsLazada !== null}
						<strong>Local</strong> averages <span class="text-emerald-700">{localVsLazada.toFixed(1)}%</span> cheaper
						than <strong>Lazada</strong> where Local undercuts Lazada.
					{:else}
						Local vs Lazada comparison needs more SKU spread.
					{/if}
				</li>
				<li>
					Average savings vs most expensive channel per SKU:
					<strong class="tabular-nums text-zinc-900"
						>{(compares.reduce((s, c) => s + c.savingsVsWorstPct, 0) / Math.max(1, compares.length)).toFixed(1)}%</strong
					>.
				</li>
			</ul>
		</div>
	</div>

	<div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm print:hidden">
		<table class="w-full min-w-[720px] text-left text-sm">
			<thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
				<tr>
					<th class="px-3 py-2 font-medium">Ingredient</th>
					<th class="px-3 py-2 font-medium text-right">Catalog landed</th>
					<th class="px-3 py-2 font-medium text-right">Lazada</th>
					<th class="px-3 py-2 font-medium text-right">Shopee</th>
					<th class="px-3 py-2 font-medium text-right">Local</th>
					<th class="px-3 py-2 font-medium">Cheapest</th>
					<th class="px-3 py-2 font-medium text-right">Save vs worst</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-100">
				{#each compares as c (c.ingredientId)}
					<tr class="hover:bg-zinc-50/80">
						<td class="px-3 py-2 font-medium text-zinc-900">{c.name}</td>
						<td class="px-3 py-2 text-right tabular-nums text-zinc-600">{fmt(c.catalogLanded)}</td>
						<td class="px-3 py-2 text-right tabular-nums">{fmt(c.channels.lazada)}</td>
						<td class="px-3 py-2 text-right tabular-nums">{fmt(c.channels.shopee)}</td>
						<td class="px-3 py-2 text-right tabular-nums">{fmt(c.channels.local)}</td>
						<td class="px-3 py-2 capitalize text-emerald-800">{c.cheapest}</td>
						<td class="px-3 py-2 text-right tabular-nums font-medium text-emerald-800">
							{c.savingsVsWorstPct.toFixed(1)}%
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Recommendations -->
	<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
		<h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-500">Recommendation analytics</h2>
		<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<div>
				<p class="text-xs text-zinc-500">Avg AI suggested price</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{fmt(avgSuggest)}</p>
				<p class="mt-0.5 text-[10px] text-zinc-400">From costing engine (margin / VAT / batch settings)</p>
			</div>
			<div>
				<p class="text-xs text-zinc-500">Avg Local list price</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{fmt(avgLocal)}</p>
			</div>
			<div>
				<p class="text-xs text-zinc-500">Target markup (setting)</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">{costingSettings.targetMarginPct}%</p>
			</div>
			<div>
				<p class="text-xs text-zinc-500">Cost pressure (est.)</p>
				<p class="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
					{#if costTrendPct !== null}
						<span class:text-red-600={costTrendPct > 0} class:text-emerald-700={costTrendPct <= 0}>
							{costTrendPct > 0 ? '+' : ''}{costTrendPct.toFixed(1)}%
						</span>
					{:else}
						—
					{/if}
				</p>
				<p class="mt-0.5 text-[10px] text-zinc-400">MoM implied COGS from chart series (est. months blended)</p>
			</div>
		</div>
		<p class="mt-4 text-xs leading-relaxed text-zinc-500">
			<strong>Competitive pricing:</strong> compare avg Local ({fmt(avgLocal)}) to Shopee ({fmt(avgShopee)}) and Lazada ({fmt(
				avgLazada
			)}) recipe list prices — align channels with your target margin in recipe costing.
		</p>
		{#if costTrendPct !== null && costTrendPct > 2}
			<p class="mt-2 text-xs font-medium text-amber-800">
				Predicted pressure: costs in the trend series are rising — consider refreshing supplier quotes or menu prices.
			</p>
		{/if}
	</div>

	<!-- History -->
	<div class="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<h2 class="text-sm font-semibold uppercase tracking-wide text-zinc-500">Monthly summary history</h2>
			<div class="flex flex-wrap gap-2 print:hidden">
				<input
					bind:value={search}
					placeholder="Search month, supplier…"
					class="min-w-[160px] rounded-lg border border-zinc-200 px-3 py-1.5 text-sm"
				/>
				<select bind:value={filterYear} class="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
					<option value="">All years</option>
					{#each yearOptions as y}
						<option value={y}>{y}</option>
					{/each}
				</select>
				<select bind:value={filterMonth} class="rounded-lg border border-zinc-200 px-2 py-1.5 text-sm">
					<option value="">All months</option>
					{#each ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'] as m}
						<option value={m}>{m}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="mt-4 overflow-x-auto">
			<table class="w-full min-w-[960px] text-left text-sm">
				<thead class="border-b border-zinc-200 bg-zinc-900 text-xs uppercase tracking-wide text-white">
					<tr>
						<th class="px-3 py-2 font-medium">Month</th>
						<th class="px-3 py-2 font-medium text-right">OPEX</th>
						<th class="px-3 py-2 font-medium text-right">Revenue</th>
						<th class="px-3 py-2 font-medium text-right">Gross</th>
						<th class="px-3 py-2 font-medium text-right">Net</th>
						<th class="px-3 py-2 font-medium text-right">Margin %</th>
						<th class="px-3 py-2 font-medium">Best supplier</th>
						<th class="px-3 py-2 font-medium">Generated</th>
						<th class="px-3 py-2 w-28 print:hidden"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each filteredRows as r (r.id)}
						<tr class="hover:bg-zinc-50/80">
							<td class="px-3 py-2 font-medium text-zinc-900">{r.yearMonth}</td>
							<td class="px-3 py-2 text-right tabular-nums">{fmt(r.totalOpex)}</td>
							<td class="px-3 py-2 text-right tabular-nums">{fmt(r.totalRevenue)}</td>
							<td class="px-3 py-2 text-right tabular-nums text-emerald-800">{fmt(r.grossProfit)}</td>
							<td
								class="px-3 py-2 text-right tabular-nums font-medium"
								class:text-red-600={r.netProfit < 0}
								class:text-emerald-800={r.netProfit >= 0}
							>
								{fmt(r.netProfit)}
							</td>
							<td class="px-3 py-2 text-right tabular-nums">{r.profitMarginPct.toFixed(1)}%</td>
							<td class="px-3 py-2">{r.bestSupplier}</td>
							<td class="px-3 py-2 text-xs text-zinc-500">{new Date(r.generatedAt).toLocaleString()}</td>
							<td class="px-3 py-2 print:hidden">
								<button
									type="button"
									class="text-xs font-medium text-emerald-700 hover:underline"
									onclick={() => (detail = r)}
								>
									View
								</button>
								<button
									type="button"
									class="ml-2 text-xs font-medium text-red-600 hover:underline"
									onclick={() => requestDeleteSnapshot(r)}
								>
									Delete
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			{#if filteredRows.length === 0}
				<p class="py-10 text-center text-sm text-zinc-500">
					No saved rows match. Use <strong>Save Summary to Statistics</strong> to add this month.
				</p>
			{/if}
		</div>
	</div>
</section>

{#if detail}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 print:hidden"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		onmousedown={(e) => e.target === e.currentTarget && (detail = null)}
	>
		<div class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
			<div class="flex items-start justify-between gap-2">
				<h3 class="text-lg font-semibold text-zinc-900">Month {detail.yearMonth}</h3>
				<button type="button" class="text-zinc-500 hover:text-zinc-800" onclick={() => (detail = null)} aria-label="Close"
					>×</button
				>
			</div>
			<dl class="mt-4 space-y-2 text-sm">
				<div class="flex justify-between gap-4"><dt class="text-zinc-500">OPEX</dt><dd class="tabular-nums">{fmt(detail.totalOpex)}</dd></div>
				<div class="flex justify-between gap-4"><dt class="text-zinc-500">Revenue</dt><dd class="tabular-nums">{fmt(detail.totalRevenue)}</dd></div>
				<div class="flex justify-between gap-4"><dt class="text-zinc-500">Gross profit</dt><dd class="tabular-nums">{fmt(detail.grossProfit)}</dd></div>
				<div class="flex justify-between gap-4"><dt class="text-zinc-500">Net profit</dt><dd class="tabular-nums font-medium">{fmt(detail.netProfit)}</dd></div>
				<div class="flex justify-between gap-4"><dt class="text-zinc-500">Margin</dt><dd class="tabular-nums">{detail.profitMarginPct.toFixed(1)}%</dd></div>
				<div class="flex justify-between gap-4"><dt class="text-zinc-500">Best supplier</dt><dd>{detail.bestSupplier}</dd></div>
				<div class="flex justify-between gap-4"><dt class="text-zinc-500">Generated</dt><dd class="text-xs">{new Date(detail.generatedAt).toLocaleString()}</dd></div>
			</dl>
			{#if detail.recipeBreakdown && detail.recipeBreakdown.length > 0}
				<div class="mt-6 border-t border-zinc-100 pt-4">
					<h4 class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recipes with orders (saved)</h4>
					<ul class="mt-3 max-h-52 space-y-2 overflow-y-auto text-sm">
						{#each detail.recipeBreakdown as line}
							<li class="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2">
								<span class="font-medium text-zinc-900">{line.recipeName}</span>
								<span class="tabular-nums text-zinc-600">
									{line.orders} orders · {fmt(line.revenue)} rev · {fmt(line.profit)} profit
								</span>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>
{/if}

<TypeToConfirmDeleteModal
	open={deleteSnapshotTarget !== null}
	title="Delete saved month?"
	description={deleteSnapshotTarget
		? `Remove the statistics snapshot for ${deleteSnapshotTarget.label}. This cannot be undone.`
		: ''}
	onClose={() => (deleteSnapshotTarget = null)}
	onConfirm={executeDeleteSnapshot}
/>

<style>
	@media print {
		:global(header),
		:global(nav) {
			display: none !important;
		}
	}
</style>
