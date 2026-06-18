<script lang="ts">
	import type { LocalStoreDTO } from '$lib/types/localStore';
	import { formatCatalogDateShort } from '$lib/utils/catalogDisplay';

	const {
		open = false,
		store,
		onClose,
		onSeeProducts
	}: {
		open?: boolean;
		store: LocalStoreDTO | null;
		onClose: () => void;
		onSeeProducts: () => void;
	} = $props();

	let backdrop: HTMLDivElement | undefined = $state();

	function onBackdropMouseDown(ev: MouseEvent): void {
		if (ev.target === backdrop) onClose();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') onClose();
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open && store}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 backdrop-blur-sm sm:items-center"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div class="w-full max-w-md overflow-hidden rounded-3xl border border-violet-100 bg-white shadow-2xl">
			<div class="bg-gradient-to-br from-violet-600 to-violet-800 px-6 py-8 text-white">
				<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
					<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-7 w-7"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/></svg>
				</div>
				<h2 class="mt-4 text-2xl font-bold">{store.storeName}</h2>
				<p class="mt-1 text-sm text-violet-100">{store.productCount} products listed</p>
			</div>

			<div class="space-y-4 px-6 py-5 text-sm">
				{#if store.description}
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">About</p>
						<p class="mt-1 text-zinc-700">{store.description}</p>
					</div>
				{/if}
				{#if store.address}
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Address</p>
						<p class="mt-1 text-zinc-700">{store.address}</p>
					</div>
				{/if}
				{#if store.contactNumber}
					<div>
						<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Contact</p>
						<p class="mt-1 font-medium text-zinc-900">{store.contactNumber}</p>
					</div>
				{/if}
				<p class="text-[10px] text-zinc-400">Updated {formatCatalogDateShort(store.updatedAt)}</p>
			</div>

			<div class="flex gap-2 border-t border-zinc-100 px-6 py-4">
				<button
					type="button"
					class="flex-1 rounded-xl bg-violet-600 py-2.5 text-sm font-bold text-white hover:bg-violet-500"
					onclick={onSeeProducts}
				>
					See products
				</button>
				<button type="button" class="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50" onclick={onClose}>
					Close
				</button>
			</div>
		</div>
	</div>
{/if}
