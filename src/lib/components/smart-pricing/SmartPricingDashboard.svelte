<script lang="ts">
	import { browser } from '$app/environment';
	import AnalyticsBarChart from '$lib/components/analytics/AnalyticsBarChart.svelte';
	import AnalyticsLineChart from '$lib/components/analytics/AnalyticsLineChart.svelte';
	import DashboardTabNav from '$lib/components/analytics/DashboardTabNav.svelte';
	import KpiCard from '$lib/components/analytics/KpiCard.svelte';
	import type { SmartPricingAnalysisResult } from '$lib/types/smartPricing';
	import { formatPhp, formatPercent1, formatPercent1Signed } from '$lib/utils/numberFormat';

	const { data }: { data: SmartPricingAnalysisResult } = $props();

	let tab = $state('recommendations');

	const tabs = [
		{ id: 'recommendations', label: 'AI Recommendations' },
		{ id: 'costs', label: 'Cost Breakdown' },
		{ id: 'forecasts', label: 'Forecasts' },
		{ id: 'insights', label: 'ML Insights' }
	];

	const avgConf = $derived.by(() => {
		const m = data.regressionModels ?? [];
		if (!m.length) return 0;
		return m.reduce((s, x) => s + x.confidence, 0) / m.length;
	});

	function pctBar(p: number): string {
		return `${Math.round(Math.max(0, Math.min(1, p)) * 100)}%`;
	}

	function riskClass(risk: string): string {
		if (risk === 'HIGH') return 'bg-red-100 text-red-800';
		if (risk === 'MED') return 'bg-amber-100 text-amber-900';
		return 'bg-emerald-100 text-emerald-900';
	}
</script>

<div class="space-y-6">
	<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
		<KpiCard label="Products modeled" value={String(data.echo?.recipeCount ?? data.regressionModels?.length ?? 0)} accent="violet" />
		<KpiCard label="Ingredients tracked" value={String(data.echo?.ingredientCount ?? data.ingredientForecasts.length)} />
		<KpiCard label="Active alerts" value={String(data.alerts.length)} accent="amber" />
		<KpiCard label="Avg ML confidence" value={pctBar(avgConf)} accent="emerald" />
	</div>

	<DashboardTabNav {tabs} active={tab} onchange={(id) => (tab = id)} />

	{#if tab === 'recommendations'}
		{#each (data.regressionModels ?? []).slice(0, 3) as model (model.recipeId)}
			{@const rec = data.sellingPriceRecommendations.find((s) => s.recipeId === model.recipeId)}
			<div class="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white p-6 shadow-sm">
				<p class="text-xs font-bold uppercase tracking-wider text-emerald-700">AI recommendation — {model.name}</p>
				<div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<p class="text-[10px] uppercase text-zinc-500">Current price</p>
						<p class="text-2xl font-bold tabular-nums">{formatPhp(rec?.current ?? model.linearPrice)}</p>
					</div>
					<div>
						<p class="text-[10px] uppercase text-zinc-500">ML recommended</p>
						<p class="text-2xl font-bold tabular-nums text-emerald-700">{formatPhp(model.recommendedPrice)}</p>
					</div>
					<div>
						<p class="text-[10px] uppercase text-zinc-500">Expected margin</p>
						<p class="text-2xl font-bold tabular-nums text-violet-700">{formatPercent1(model.expectedMarginPct)}</p>
					</div>
					<div>
						<p class="text-[10px] uppercase text-zinc-500">Confidence</p>
						<p class="text-2xl font-bold tabular-nums">{pctBar(model.confidence)}</p>
					</div>
				</div>
				<p class="mt-4 text-sm text-zinc-600">
					Est. revenue impact at current demand: <strong class="text-emerald-800">{formatPhp(model.revenueImpact)}</strong>
				</p>
				{#if rec?.reasons?.length}
					<ul class="mt-3 list-inside list-disc text-sm text-zinc-600">
						{#each rec.reasons as reason}
							<li>{reason}</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}

		<div class="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
			<table class="w-full min-w-[900px] text-sm">
				<thead class="bg-zinc-50 text-[10px] font-bold uppercase text-zinc-500">
					<tr>
						<th class="px-5 py-3 text-left">Product</th>
						<th class="px-5 py-3 text-right">Linear</th>
						<th class="px-5 py-3 text-right">Multiple reg.</th>
						<th class="px-5 py-3 text-right">Polynomial</th>
						<th class="px-5 py-3 text-right">Recommended</th>
						<th class="px-5 py-3 text-right">Margin</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each data.regressionModels ?? [] as m (m.recipeId)}
						<tr>
							<td class="px-5 py-2.5 font-semibold">{m.name}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(m.linearPrice)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(m.multipleRegressionPrice)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(m.polynomialPrice)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums font-bold text-emerald-700">{formatPhp(m.recommendedPrice)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPercent1(m.expectedMarginPct)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if tab === 'costs'}
		<div class="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-zinc-50 text-[10px] font-bold uppercase text-zinc-500">
					<tr>
						<th class="px-5 py-3 text-left">Product</th>
						<th class="px-5 py-3 text-right">Ingredients</th>
						<th class="px-5 py-3 text-right">Packaging</th>
						<th class="px-5 py-3 text-right">Utility</th>
						<th class="px-5 py-3 text-right">Labor</th>
						<th class="px-5 py-3 text-right">OPEX alloc.</th>
						<th class="px-5 py-3 text-right">Total</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each data.costBreakdown ?? [] as row (row.recipeId)}
						<tr>
							<td class="px-5 py-2.5 font-medium">{row.name}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(row.ingredientCost)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(row.packagingCost)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(row.utilityCost)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(row.laborCost)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums">{formatPhp(row.opexAllocation)}</td>
							<td class="px-5 py-2.5 text-right tabular-nums font-semibold">{formatPhp(row.totalCost)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if tab === 'forecasts'}
		{#if browser && (data.businessForecasts?.length ?? 0) > 0}
			<div class="grid gap-3 sm:grid-cols-3">
				{#each data.businessForecasts ?? [] as bf (bf.metric)}
					<KpiCard label={bf.label} value={formatPhp(bf.projectedNextMonth)} sub="Latest {formatPhp(bf.current)} · conf {pctBar(bf.confidence)}" accent="sky" />
				{/each}
			</div>
		{/if}
		{#if browser}
			<div class="grid gap-6 lg:grid-cols-2">
				<div class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
					<p class="mb-2 text-sm font-bold">Ingredient cost forecast (30d)</p>
					<AnalyticsLineChart
						title=""
						labels={(data.ingredientForecasts ?? []).slice(0, 8).map((f) => f.name)}
						datasets={[
							{ label: 'Current', data: (data.ingredientForecasts ?? []).slice(0, 8).map((f) => f.current), color: 'rgb(100, 116, 139)' },
							{ label: 'Predicted', data: (data.ingredientForecasts ?? []).slice(0, 8).map((f) => f.predictedNext), color: 'rgb(139, 92, 246)' }
						]}
					/>
				</div>
				<div class="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
					<p class="mb-2 text-sm font-bold">Sales volume forecast</p>
					<AnalyticsBarChart
						title=""
						labels={(data.salesForecasts ?? []).slice(0, 8).map((s) => s.name)}
						values={(data.salesForecasts ?? []).slice(0, 8).map((s) => s.projectedNextMonth)}
						color="rgb(14, 165, 233)"
						formatY="number"
					/>
				</div>
			</div>
		{/if}
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-3xl border border-zinc-200 bg-white p-5">
				<h3 class="font-bold">Cost volatility</h3>
				<ul class="mt-3 divide-y divide-zinc-100 text-sm">
					{#each data.volatility as v (v.id)}
						<li class="flex justify-between py-2">
							<span>{v.name}</span>
							<span class="rounded-full px-2 py-0.5 text-xs font-bold {riskClass(v.risk)}">{v.risk}</span>
						</li>
					{/each}
				</ul>
			</div>
			<div class="rounded-3xl border border-violet-200 bg-violet-50/40 p-5">
				<h3 class="font-bold text-violet-950">Smart alerts</h3>
				<ul class="mt-3 space-y-2 text-sm">
					{#each data.alerts as a, i (i)}
						<li class="rounded-xl bg-white/90 px-3 py-2">{a.text}</li>
					{:else}
						<li class="text-violet-800/70">No critical alerts.</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	{#if tab === 'insights'}
		{@const ins = data.mlInsights}
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-3xl border border-amber-200 bg-amber-50/40 p-5">
				<h3 class="font-bold text-amber-950">Priced too low</h3>
				<ul class="mt-2 space-y-1 text-sm">
					{#each ins?.pricedTooLow ?? [] as p (p.recipeId)}
						<li>{p.name}: {formatPhp(p.current)} → {formatPhp(p.suggested)}</li>
					{:else}<li class="text-zinc-500">None flagged</li>{/each}
				</ul>
			</div>
			<div class="rounded-3xl border border-red-200 bg-red-50/40 p-5">
				<h3 class="font-bold text-red-950">Priced too high</h3>
				<ul class="mt-2 space-y-1 text-sm">
					{#each ins?.pricedTooHigh ?? [] as p (p.recipeId)}
						<li>{p.name}: {formatPhp(p.current)} vs {formatPhp(p.suggested)}</li>
					{:else}<li class="text-zinc-500">None flagged</li>{/each}
				</ul>
			</div>
		</div>
		<div class="grid gap-6 lg:grid-cols-2">
			<div class="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
				<h3 class="font-bold text-emerald-900">Most profitable (ML)</h3>
				<ul class="mt-2 space-y-1 text-sm">
					{#each ins?.mostProfitable ?? [] as p (p.recipeId)}
						<li class="flex justify-between"><span>{p.name}</span><span class="font-semibold text-emerald-700">{formatPhp(p.profitPerOrder)}/order</span></li>
					{/each}
				</ul>
			</div>
			<div class="rounded-3xl border border-sky-200 bg-white p-5 shadow-sm">
				<h3 class="font-bold text-sky-900">Growth potential</h3>
				<ul class="mt-2 space-y-2 text-sm">
					{#each ins?.growthPotential ?? [] as g (g.recipeId)}
						<li class="rounded-lg bg-sky-50 px-3 py-2">{g.reason}</li>
					{:else}<li class="text-zinc-500">Record more sales for demand signals.</li>{/each}
				</ul>
			</div>
		</div>
		{#if (ins?.needsAdjustment?.length ?? 0) > 0}
			<div class="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
				<h3 class="font-bold">Needs price adjustment</h3>
				<ul class="mt-2 space-y-1 text-sm">
					{#each ins?.needsAdjustment ?? [] as n (n.recipeId)}
						<li><strong>{n.name}</strong> — {n.reason}</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}

	<p class="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs leading-relaxed text-zinc-600">{data.modelNotes}</p>
</div>
