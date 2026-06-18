<script lang="ts">
	import type { LocalStoreDetailDTO, LocalStoreProductDTO } from '$lib/types/localStore';
	import { formatCatalogDateShort } from '$lib/utils/catalogDisplay';
	import { formatPhp } from '$lib/utils/numberFormat';

	const {
		open = false,
		store,
		loading = false,
		onClose,
		onImport
	}: {
		open?: boolean;
		store: LocalStoreDetailDTO | null;
		loading?: boolean;
		onClose: () => void;
		onImport: (product: LocalStoreProductDTO) => void;
	} = $props();

	let backdrop: HTMLDivElement | undefined = $state();
	let productSearch = $state('');

	const filteredProducts = $derived.by(() => {
		if (!store) return [];
		const q = productSearch.toLowerCase().trim();
		if (!q) return store.products;
		return store.products.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.category.toLowerCase().includes(q) ||
				p.notes.toLowerCase().includes(q)
		);
	});

	function productThumb(p: LocalStoreProductDTO): string | null {
		const url = p.imageUrl?.trim();
		return url || null;
	}

	function onBackdropMouseDown(ev: MouseEvent): void {
		if (ev.target === backdrop) onClose();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 backdrop-blur-sm sm:items-center"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="ls-products-title"
		tabindex="-1"
	>
		<div class="flex max-h-[min(92vh,800px)] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-2xl">
			<div class="border-b border-zinc-100 bg-gradient-to-r from-violet-50 to-white px-6 py-5">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<p class="text-[10px] font-bold uppercase tracking-wider text-violet-600">Products</p>
						<h2 id="ls-products-title" class="mt-1 truncate text-xl font-bold text-zinc-900">
							{store?.storeName ?? 'Store'}
						</h2>
					</div>
					<button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50" onclick={onClose} aria-label="Close">×</button>
				</div>
				<input
					type="search"
					bind:value={productSearch}
					placeholder="Search products…"
					class="mt-4 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
				/>
			</div>

			<div class="min-h-0 flex-1 overflow-y-auto p-5">
				{#if loading}
					<p class="py-12 text-center text-sm text-zinc-500">Loading products…</p>
				{:else if !store}
					<p class="py-12 text-center text-sm text-zinc-500">Store not available.</p>
				{:else if filteredProducts.length === 0}
					<p class="py-12 text-center text-sm text-zinc-500">No products match your search.</p>
				{:else}
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each filteredProducts as p (p.id)}
							<article class="flex flex-col overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50/50 shadow-sm ring-1 ring-zinc-100">
								<div class="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-violet-100 to-violet-50">
									{#if productThumb(p)}
										<img
											src={productThumb(p)}
											alt={p.name}
											class="h-full w-full object-cover"
											loading="lazy"
											onerror={(e) => {
												const img = e.currentTarget as HTMLImageElement;
												img.style.display = 'none';
											}}
										/>
									{:else}
										<div class="flex h-full w-full flex-col items-center justify-center text-violet-400">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-10 w-10 opacity-60"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/></svg>
											<span class="mt-1 text-2xl font-bold text-violet-300">{p.name.slice(0, 1).toUpperCase()}</span>
										</div>
									{/if}
									<span class="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-800 shadow-sm">{p.category}</span>
								</div>
								<div class="flex flex-1 flex-col p-3">
									<h3 class="truncate font-bold text-zinc-900" title={p.name}>{p.name}</h3>
									<p class="mt-0.5 text-xs text-zinc-500">
										{p.packageSize} {p.packageUnit} · pkg {formatPhp(p.packagePrice)}
									</p>
									<p class="mt-2 text-lg font-bold tabular-nums text-violet-800">
										{formatPhp(p.unitCost)}<span class="text-xs font-normal text-zinc-500"> /{p.baseUnit}</span>
									</p>
									{#if p.notes}
										<p class="mt-1 line-clamp-2 text-[11px] text-zinc-600">{p.notes}</p>
									{/if}
									<p class="mt-1 text-[10px] text-zinc-400">Updated {formatCatalogDateShort(p.updatedAt)}</p>
									<button
										type="button"
										class="mt-auto w-full rounded-xl bg-violet-600 py-2 text-xs font-bold text-white hover:bg-violet-500"
										onclick={() => onImport(p)}
									>
										Add to {p.category === 'other' ? 'Others' : 'Ingredients'}
									</button>
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
