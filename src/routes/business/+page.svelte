<script lang="ts">
	import { page } from '$app/stores';
	import BusinessCloseTab from '$lib/components/business/BusinessCloseTab.svelte';
	import BusinessPlanTab from '$lib/components/business/BusinessPlanTab.svelte';
	import BusinessSalesTab from '$lib/components/business/BusinessSalesTab.svelte';
	import DashboardTabNav from '$lib/components/analytics/DashboardTabNav.svelte';

	const tabs = [
		{ id: 'plan', label: 'Plan & Projections' },
		{ id: 'sales', label: 'Record Sales' },
		{ id: 'close', label: 'Month Close' }
	];

	let activeTab = $state('plan');

	$effect(() => {
		const t = $page.url.searchParams.get('tab');
		if (t === 'plan' || t === 'sales' || t === 'close') activeTab = t;
	});
</script>

<svelte:head>
	<title>Business Hub — PriceWise</title>
</svelte:head>

<section class="space-y-8 pb-16">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl"></div>
		<div class="relative z-10 max-w-3xl space-y-3">
			<p class="text-xs font-bold uppercase tracking-[0.2em] text-sky-300/90">Operations center</p>
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">Business Hub</h1>
			<p class="text-lg text-zinc-400">
				Plan monthly projections, record actual sales, and close the month — all in one place. Data flows to Statistics and Smart Pricing ML automatically.
			</p>
		</div>
	</div>

	<DashboardTabNav {tabs} active={activeTab} onchange={(id) => (activeTab = id)} />

	{#if activeTab === 'plan'}
		<BusinessPlanTab />
	{:else if activeTab === 'sales'}
		<BusinessSalesTab />
	{:else}
		<BusinessCloseTab />
	{/if}
</section>
