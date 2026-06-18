<script lang="ts">
	import { onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import { formatPhp } from '$lib/utils/numberFormat';

	const {
		title,
		labels,
		values,
		color = 'rgb(5 150 105)',
		formatY = 'currency'
	}: {
		title: string;
		labels: string[];
		values: number[];
		color?: string;
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
			type: 'bar',
			data: {
				labels: labels.length ? labels : ['No data'],
				datasets: [
					{
						label: title,
						data: values.length ? values : [0],
						backgroundColor: color,
						borderRadius: 6
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
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
