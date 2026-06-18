<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { getSupplierStore } from '$lib/api/localStoreClient';
	import type { LocalStoreDetailDTO } from '$lib/types/localStore';
	import { formatCatalogDateShort } from '$lib/utils/catalogDisplay';
	import { formatPhp } from '$lib/utils/numberFormat';

	let store = $state<LocalStoreDetailDTO | null>(null);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		const token = authState.token;
		if (!token) return;
		try {
			store = await getSupplierStore(token);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load your store';
		} finally {
			loading = false;
		}
	});

	const availableCount = $derived(
		store?.products.filter((p) => p.isAvailable).length ?? 0
	);
</script>

<section class="animate-in space-y-8">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl"></div>
		<div class="relative z-10 space-y-2">
			<p class="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Local supplier</p>
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
				{store?.storeName ?? 'Your store'}
			</h1>
			<p class="max-w-2xl text-lg text-zinc-400">
				List today's prices so cafe owners can discover your supplies on the Local Store and add them to
				their catalogs.
			</p>
		</div>
	</div>

	{#if loading}
		<p class="text-center text-sm text-zinc-500">Loading dashboard…</p>
	{:else if error}
		<p class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
	{:else if store}
		<div class="grid gap-4 sm:grid-cols-3">
			<div class="glass rounded-2xl p-5 shadow-lg">
				<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Listed products</p>
				<p class="mt-2 text-3xl font-bold tabular-nums text-zinc-900">{store.products.length}</p>
			</div>
			<div class="glass rounded-2xl p-5 shadow-lg">
				<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Available today</p>
				<p class="mt-2 text-3xl font-bold tabular-nums text-emerald-700">{availableCount}</p>
			</div>
			<div class="glass rounded-2xl p-5 shadow-lg">
				<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Store status</p>
				<p class="mt-2 text-lg font-bold {store.isActive ? 'text-emerald-700' : 'text-zinc-400'}">
					{store.isActive ? 'Visible on Local Store' : 'Hidden'}
				</p>
			</div>
		</div>

		<div class="glass rounded-3xl p-6 shadow-xl">
			<h2 class="text-lg font-bold text-zinc-900">Quick start</h2>
			<ol class="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-600">
				<li>Complete your <a href="/supplier/store" class="font-semibold text-amber-700 hover:underline">store profile</a> (address, contact).</li>
				<li>Add products with today's package price on <a href="/supplier/products" class="font-semibold text-amber-700 hover:underline">My products</a>.</li>
				<li>Cafe owners browse <strong class="text-zinc-800">Local Store</strong> and import your listings into Ingredients or Others.</li>
			</ol>
		</div>

		{#if store.products.length > 0}
			<div class="glass overflow-hidden rounded-3xl shadow-xl">
				<div class="border-b border-zinc-100 px-6 py-4">
					<h2 class="font-bold text-zinc-900">Recently updated</h2>
				</div>
				<ul class="divide-y divide-zinc-100">
					{#each store.products.slice(0, 5) as p (p.id)}
						<li class="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
							<div>
								<p class="font-semibold text-zinc-900">{p.name}</p>
								<p class="text-xs text-zinc-500 capitalize">{p.category} · updated {formatCatalogDateShort(p.updatedAt)}</p>
							</div>
							<p class="font-bold tabular-nums text-zinc-900">{formatPhp(p.unitCost)}<span class="text-xs font-normal text-zinc-500"> /{p.baseUnit}</span></p>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
	{/if}
</section>
