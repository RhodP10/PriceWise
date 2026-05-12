<script lang="ts">
	import type { MeasureUnit } from '$lib/types/recipe';
	import {
		addIngredientMaster,
		computeCatalogUnitCost,
		MEASURE_UNIT_OPTIONS
	} from '$lib/state/ingredientCatalog.svelte';
	import { toBaseQuantity } from '$lib/utils/baseUnitCost';

	let {
		open = $bindable(false)
	}: {
		open?: boolean;
	} = $props();

	let name = $state('');
	let supplier = $state('');
	let packagePrice = $state(0);
	let packageSize = $state(1);
	let shippingFee = $state(0);
	let packageUnit = $state<MeasureUnit>('kg');

	let backdrop: HTMLDivElement | undefined = $state();

	const previewUnitCost = $derived(
		computeCatalogUnitCost({ packagePrice, packageSize, packageUnit, shippingFee })
	);
	const previewBase = $derived(toBaseQuantity(packageSize, packageUnit));

	function reset(): void {
		name = '';
		supplier = '';
		packagePrice = 0;
		packageSize = 1;
		shippingFee = 0;
		packageUnit = 'kg';
	}

	function submit(e: Event): void {
		e.preventDefault();
		if (!name.trim()) return;
		addIngredientMaster({
			name: name.trim(),
			supplier: supplier.trim(),
			packagePrice,
			packageSize,
			packageUnit,
			shippingFee,
		});
		reset();
		open = false;
	}

	function onBackdropMouseDown(ev: MouseEvent): void {
		if (ev.target === backdrop) open = false;
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') open = false;
	}

	$effect(() => {
		if (open) reset();
	});
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/50 p-4 backdrop-blur-sm"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="add-ing-title"
		tabindex="-1"
	>
		<form
			class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
			onsubmit={submit}
		>
			<div class="flex items-start justify-between gap-3">
				<h2 id="add-ing-title" class="text-lg font-semibold text-zinc-900">Add ingredient</h2>
				<button type="button" class="text-zinc-500 hover:text-zinc-800" onclick={() => (open = false)} aria-label="Close">
					×
				</button>
			</div>
			<p class="mt-1 text-sm text-zinc-500">
				Enter human-friendly package (1kg, 1L, 500g). System auto-converts to base units (g/ml/piece).
			</p>

			<div class="mt-5 space-y-3">
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="im-name">Ingredient</label>
					<input
						id="im-name"
						bind:value={name}
						required
						class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						placeholder="e.g. Matcha powder"
					/>
				</div>
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="im-sup">Supplier</label>
					<input
						id="im-sup"
						bind:value={supplier}
						class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						placeholder="Supplier name"
					/>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-packp">Package price (₱)</label>
						<input
							id="im-packp"
							type="number"
							min="0"
							step="any"
							bind:value={packagePrice}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-packq">Package size</label>
						<input
							id="im-packq"
							type="number"
							min="0"
							step="any"
							bind:value={packageSize}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						/>
					</div>
				</div>
				<div class="grid gap-3 sm:grid-cols-2">
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-ship">Shipping (₱)</label>
						<input
							id="im-ship"
							type="number"
							min="0"
							step="any"
							bind:value={shippingFee}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						/>
					</div>
					<div>
						<label class="text-xs font-semibold uppercase text-zinc-500" for="im-unit">Package unit</label>
						<select
							id="im-unit"
							bind:value={packageUnit}
							class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
						>
							{#each MEASURE_UNIT_OPTIONS as u}
								<option value={u.value}>{u.label}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="rounded-xl bg-emerald-50 px-4 py-3 text-sm">
					<div class="text-emerald-900">
						Base quantity: <strong>{previewBase.quantity.toFixed(2)}</strong> {previewBase.unit}
					</div>
					<span class="text-emerald-800">Computed unit cost:</span>
					<strong class="ml-2 tabular-nums text-emerald-950">₱{previewUnitCost.toFixed(4)}</strong>
					<span class="text-emerald-700"> / base unit</span>
				</div>
			</div>

			<div class="mt-6 flex gap-2">
				<button
					type="button"
					class="flex-1 rounded-xl border border-zinc-200 py-2.5 text-sm font-medium hover:bg-zinc-50"
					onclick={() => (open = false)}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
				>
					Save ingredient
				</button>
			</div>
		</form>
	</div>
{/if}
