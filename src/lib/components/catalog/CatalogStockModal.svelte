<script lang="ts">
	import type { IngredientMasterDTO, OtherItemMasterDTO } from '$lib/types/recipe';
	import { computeCatalogUnitCost } from '$lib/state/ingredientCatalog.svelte';
	import { todayYmd } from '$lib/utils/stockLots';
	import { formatPhp } from '$lib/utils/numberFormat';

	type Row = IngredientMasterDTO | OtherItemMasterDTO;
	type Mode = 'receive' | 'use';

	const {
		open = false,
		mode,
		row,
		onClose,
		onReceive,
		onUse
	}: {
		open?: boolean;
		mode: Mode;
		row: Row | null;
		onClose: () => void;
		onReceive: (packagesQty: number, purchasedOn: string) => void;
		onUse: (packagesQty: number) => void;
	} = $props();

	let packagesQty = $state(1);
	let purchasedOn = $state(todayYmd());
	let backdrop: HTMLDivElement | undefined = $state();

	const previewUnitCost = $derived(
		row
			? computeCatalogUnitCost({
					packagePrice: row.packagePrice,
					packageSize: row.packageSize,
					packageUnit: row.packageUnit,
					shippingFee: row.shippingFee
				})
			: 0
	);

	$effect(() => {
		if (open && row) {
			packagesQty = 1;
			purchasedOn = todayYmd();
		}
	});

	function onBackdropMouseDown(ev: MouseEvent): void {
		if (ev.target === backdrop) onClose();
	}

	function submit(e: Event): void {
		e.preventDefault();
		if (!row) return;
		if (mode === 'receive') onReceive(packagesQty, purchasedOn);
		else if (mode === 'use') onUse(packagesQty);
		onClose();
	}

	const title = $derived(mode === 'receive' ? 'Add stock' : 'Use stock (FIFO)');
</script>

{#if open && row}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<form class="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl" onsubmit={submit}>
			<h2 class="text-lg font-bold text-zinc-900">{title}</h2>
			<p class="mt-1 text-sm text-zinc-600">{row.name} · {row.supplier}</p>

			<div class="mt-4 space-y-3">
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="stk-qty">Packages</label>
						<input
							id="stk-qty"
							type="number"
							min="0.01"
							step="any"
							bind:value={packagesQty}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						/>
					</div>
					{#if mode === 'receive'}
						<div>
							<label class="text-xs font-semibold uppercase text-zinc-500" for="stk-date">Purchase date</label>
							<input
								id="stk-date"
								type="date"
								bind:value={purchasedOn}
								class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
							/>
						</div>
						<p class="text-xs text-zinc-500">
							Uses current pkg price {formatPhp(row.packagePrice)} → {formatPhp(previewUnitCost)}/{row.baseUnit}.
							Same day + same price merges with an existing lot.
						</p>
					{:else}
						<p class="text-xs text-zinc-500">Deducts from oldest purchase lots first (FIFO).</p>
					{/if}
				</div>
			<div class="mt-5 flex gap-2">
				<button type="submit" class="flex-1 rounded-xl bg-zinc-900 py-2.5 text-sm font-bold text-white">
					{mode === 'receive' ? 'Add stock' : 'Record usage'}
				</button>
				<button type="button" class="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold" onclick={onClose}>
					Cancel
				</button>
			</div>
		</form>
	</div>
{/if}
