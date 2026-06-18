<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { formatPhp } from '$lib/utils/numberFormat';

	export type ChartDataset = {
		label: string;
		data: number[];
		color: string;
		fill?: boolean;
	};

	const {
		title,
		labels,
		datasets,
		formatY = 'currency'
	}: {
		title: string;
		labels: string[];
		datasets: ChartDataset[];
		formatY?: 'currency' | 'number';
	} = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let chart: Chart | null = null;

	function destroy(): void {
		chart?.destroy();
		chart = null;
	}

	onMount(() => () => destroy());

	$effect(() => {
		if (!canvas) return;
		destroy();
		chart = new Chart(canvas, {
			type: 'line',
			data: {
				labels: labels.length ? labels : ['No data'],
				datasets: datasets.map((d) => ({
					label: d.label,
					data: d.data.length ? d.data : [0],
					borderColor: d.color,
					backgroundColor: d.fill ? `${d.color}33` : 'transparent',
					fill: d.fill ?? false,
					tension: 0.3,
					pointRadius: 3
				}))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { position: 'bottom' },
					title: { display: !!title, text: title }
				},
				scales: {
					y: {
						ticks: {
							callback: (v) => {
								const n = typeof v === 'number' ? v : Number(v);
								return formatY === 'currency' && Number.isFinite(n) ? formatPhp(n) : String(v);
							}
						}
					}
				}
			}
		});
	});
</script>

<div class="h-64 w-full min-h-[16rem]">
	<canvas bind:this={canvas}></canvas>
</div>
