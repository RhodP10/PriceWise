<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { MonthlySeriesPoint } from '$lib/utils/dashboardSeries';

	const {
		series,
		supplierCounts,
		avgLanded
	}: {
		series: MonthlySeriesPoint[];
		supplierCounts: Record<string, number>;
		avgLanded: { lazada: number; shopee: number; local: number };
	} = $props();

	let lineCanvas = $state<HTMLCanvasElement | null>(null);
	let doughnutCanvas = $state<HTMLCanvasElement | null>(null);
	let lineChart: Chart | null = null;
	let doughnutChart: Chart | null = null;

	function destroyCharts(): void {
		lineChart?.destroy();
		doughnutChart?.destroy();
		lineChart = null;
		doughnutChart = null;
	}

	onMount(() => () => destroyCharts());

	$effect(() => {
		if (!lineCanvas || !doughnutCanvas) return;
		destroyCharts();

		const labels =
			series.length > 0 ? series.map((p) => p.yearMonth) : ['No data'];
		const revenue = series.length > 0 ? series.map((p) => p.revenue) : [0];
		const netProfit = series.length > 0 ? series.map((p) => p.netProfit) : [0];

		lineChart = new Chart(lineCanvas, {
			type: 'line',
			data: {
				labels,
				datasets: [
					{
						label: 'Revenue',
						data: revenue,
						borderColor: 'rgb(5 150 105)',
						backgroundColor: 'rgba(5 150 105 / 0.08)',
						fill: true,
						tension: 0.25
					},
					{
						label: 'Net profit',
						data: netProfit,
						borderColor: 'rgb(37 99 235)',
						backgroundColor: 'rgba(37 99 235 / 0.06)',
						fill: true,
						tension: 0.25
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom' },
					title: { display: true, text: 'Monthly trend (saved months + live)' }
				},
				scales: {
					y: {
						ticks: {
							callback: (v) => `₱${Number(v).toLocaleString()}`
						}
					}
				}
			}
		});

		const lz = supplierCounts.lazada ?? 0;
		const sh = supplierCounts.shopee ?? 0;
		const loc = supplierCounts.local ?? 0;
		const sum = lz + sh + loc;
		const doughData = sum === 0 ? [1] : [lz, sh, loc];
		const doughLabels = sum === 0 ? ['No wins yet'] : ['Lazada', 'Shopee', 'Local'];

		doughnutChart = new Chart(doughnutCanvas, {
			type: 'doughnut',
			data: {
				labels: doughLabels,
				datasets: [
					{
						data: sum === 0 ? [1] : doughData,
						backgroundColor: sum === 0 ? ['#e4e4e7'] : ['#fb923c', '#f97316', '#10b981'],
						borderWidth: 0
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom' },
					title: { display: true, text: 'Cheapest channel (per SKU)' }
				}
			}
		});
	});
</script>

<div class="grid gap-4 lg:grid-cols-3">
	<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
		<div class="h-72 w-full">
			<canvas bind:this={lineCanvas} class="max-h-72"></canvas>
		</div>
	</div>
	<div class="flex flex-col gap-4">
		<div class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
			<div class="h-56 w-full">
				<canvas bind:this={doughnutCanvas} class="max-h-56"></canvas>
			</div>
		</div>
		<div class="rounded-2xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm">
			<p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Avg landed pkg (₱)</p>
			<dl class="mt-3 space-y-2 tabular-nums text-zinc-800">
				<div class="flex justify-between gap-2">
					<dt>Lazada</dt>
					<dd>₱{avgLanded.lazada.toFixed(2)}</dd>
				</div>
				<div class="flex justify-between gap-2">
					<dt>Shopee</dt>
					<dd>₱{avgLanded.shopee.toFixed(2)}</dd>
				</div>
				<div class="flex justify-between gap-2">
					<dt>Local</dt>
					<dd>₱{avgLanded.local.toFixed(2)}</dd>
				</div>
			</dl>
		</div>
	</div>
</div>
