<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { getLocalStore, listLocalStores } from '$lib/api/localStoreClient';
	import { importIngredientFromLocalStore } from '$lib/state/ingredientCatalog.svelte';
	import { importOtherFromLocalStore } from '$lib/state/otherCatalog.svelte';
	import LocalStoreInfoModal from '$lib/components/local-store/LocalStoreInfoModal.svelte';
	import LocalStoreProductsModal from '$lib/components/local-store/LocalStoreProductsModal.svelte';
	import type { LocalStoreDTO, LocalStoreDetailDTO, LocalStoreProductDTO } from '$lib/types/localStore';

	let stores = $state<LocalStoreDTO[]>([]);
	let selectedStore = $state<LocalStoreDTO | null>(null);
	let storeDetail = $state<LocalStoreDetailDTO | null>(null);
	let infoModalOpen = $state(false);
	let productsModalOpen = $state(false);
	let productsLoading = $state(false);
	let loading = $state(true);
	let error = $state('');
	let importMsg = $state('');
	let search = $state('');

	const filteredStores = $derived(
		stores.filter((s) => {
			const q = search.toLowerCase().trim();
			if (!q) return true;
			return (
				s.storeName.toLowerCase().includes(q) ||
				s.address.toLowerCase().includes(q) ||
				s.description.toLowerCase().includes(q)
			);
		})
	);

	async function loadStores(): Promise<void> {
		const token = authState.token;
		if (!token) return;
		loading = true;
		error = '';
		try {
			stores = await listLocalStores(token);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load local stores';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadStores();
	});

	function openStoreInfo(store: LocalStoreDTO): void {
		selectedStore = store;
		infoModalOpen = true;
		importMsg = '';
		error = '';
	}

	function closeInfoModal(): void {
		infoModalOpen = false;
	}

	async function openProductsModal(store?: LocalStoreDTO): Promise<void> {
		const target = store ?? selectedStore;
		const token = authState.token;
		if (!target || !token) return;
		selectedStore = target;
		infoModalOpen = false;
		productsModalOpen = true;
		productsLoading = true;
		storeDetail = null;
		importMsg = '';
		error = '';
		try {
			storeDetail = await getLocalStore(token, target.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load store products';
			productsModalOpen = false;
		} finally {
			productsLoading = false;
		}
	}

	function closeProductsModal(): void {
		productsModalOpen = false;
		storeDetail = null;
	}

	function importProduct(p: LocalStoreProductDTO): void {
		if (!storeDetail) return;
		if (p.category === 'other') {
			importOtherFromLocalStore(p, storeDetail.storeName, storeDetail.id);
			importMsg = `Added “${p.name}” to Others (merged if you already had this item).`;
		} else {
			importIngredientFromLocalStore(p, storeDetail.storeName, storeDetail.id);
			importMsg = `Added “${p.name}” to Ingredients (merged if you already had this item).`;
		}
	}
</script>

<section class="animate-in space-y-8">
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"></div>
		<div class="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
			<div class="space-y-2">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
					Local <span class="text-violet-400">Store</span>
				</h1>
				<p class="max-w-2xl text-lg text-zinc-400">
					Browse supplier storefronts. Tap a store for details, then see products in a card grid and import to your catalog.
				</p>
			</div>
			<input
				type="search"
				bind:value={search}
				placeholder="Search stores…"
				class="w-full max-w-sm rounded-2xl border-none bg-zinc-800/60 px-4 py-3 text-white placeholder-zinc-500 ring-1 ring-white/10 focus:ring-2 focus:ring-violet-500"
			/>
		</div>
	</div>

	{#if error}
		<p class="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
	{/if}
	{#if importMsg}
		<p class="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{importMsg}</p>
	{/if}

	{#if loading}
		<p class="py-16 text-center text-sm text-zinc-500">Loading local stores…</p>
	{:else if filteredStores.length === 0}
		<div class="glass rounded-3xl py-20 text-center shadow-xl">
			<p class="text-lg font-semibold text-zinc-700">No local suppliers yet</p>
			<p class="mt-1 text-sm text-zinc-500">When suppliers register and list products, they appear here.</p>
		</div>
	{:else}
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each filteredStores as store (store.id)}
				<article
					class="glass group flex flex-col rounded-3xl p-6 shadow-lg ring-1 ring-violet-100 transition hover:shadow-xl hover:ring-violet-300"
				>
					<button
						type="button"
						class="flex flex-1 flex-col text-left"
						onclick={() => openStoreInfo(store)}
					>
						<div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-6 w-6"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg>
						</div>
						<h2 class="mt-4 text-xl font-bold text-zinc-900 group-hover:text-violet-800">{store.storeName}</h2>
						{#if store.address}
							<p class="mt-1 line-clamp-2 text-sm text-zinc-500">{store.address}</p>
						{/if}
						<span class="mt-4 inline-flex w-fit rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-bold text-violet-800">
							{store.productCount} products
						</span>
					</button>
					<button
						type="button"
						class="mt-4 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white transition hover:bg-violet-500"
						onclick={() => openProductsModal(store)}
					>
						See products
					</button>
				</article>
			{/each}
		</div>
	{/if}
</section>

<LocalStoreInfoModal
	open={infoModalOpen}
	store={selectedStore}
	onClose={closeInfoModal}
	onSeeProducts={() => void openProductsModal()}
/>

<LocalStoreProductsModal
	open={productsModalOpen}
	store={storeDetail}
	loading={productsLoading}
	onClose={closeProductsModal}
	onImport={importProduct}
/>
