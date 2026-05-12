<script lang="ts">
	import type { MeasureUnit, RecipeDTO } from '$lib/types/recipe';
	import { ingredientCatalog, MEASURE_UNIT_OPTIONS } from '$lib/state/ingredientCatalog.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import {
		addRecipeIngredientLine,
		addRecipeOtherLine,
		deleteRecipeIngredientLine,
		deleteRecipeOtherLine,
		updateRecipeIngredientLine,
		updateRecipeName,
		updateRecipeOtherLine
	} from '$lib/state/recipes.svelte';
	import { convertQuantity } from '$lib/utils/unitConvert';
	import { recipeIngredientSubtotal, recipeOtherSubtotal } from '$lib/utils/recipeCosting';

	const {
		recipe,
		open,
		onClose
	}: {
		recipe: RecipeDTO | null;
		open: boolean;
		onClose: () => void;
	} = $props();

	let backdrop: HTMLDivElement | undefined = $state();

	let draftName = $state('');
	let addMasterId = $state('');
	let addQty = $state(1);
	let addUnit = $state<MeasureUnit>('g');

	let addOtherMasterId = $state('');
	let otherQty = $state(1);
	let otherUnit = $state<MeasureUnit>('piece');

	let pendingLineRemove = $state<
		| { kind: 'ingredient'; lineId: string; label: string }
		| { kind: 'other'; lineId: string; label: string }
		| null
	>(null);

	function askRemoveIngredient(lineId: string, label: string): void {
		pendingLineRemove = { kind: 'ingredient', lineId, label };
	}

	function askRemoveOther(lineId: string, label: string): void {
		pendingLineRemove = { kind: 'other', lineId, label };
	}

	function executeLineRemove(): void {
		if (!recipe || !pendingLineRemove) return;
		if (pendingLineRemove.kind === 'ingredient') {
			deleteRecipeIngredientLine(recipe.id, pendingLineRemove.lineId);
		} else {
			deleteRecipeOtherLine(recipe.id, pendingLineRemove.lineId);
		}
		pendingLineRemove = null;
	}

	$effect(() => {
		if (recipe) draftName = recipe.name;
	});

	$effect(() => {
		const first = ingredientCatalog.items[0]?.id ?? '';
		if (!addMasterId && first) addMasterId = first;
	});

	$effect(() => {
		const first = otherCatalog.items[0]?.id ?? '';
		if (!addOtherMasterId && first) addOtherMasterId = first;
	});

	const masters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);

	function fmt(n: number): string {
		return `₱${n.toFixed(2)}`;
	}

	function ingLineCost(line: RecipeDTO['ingredientLines'][number]): number {
		const m = masters.find((x) => x.id === line.ingredientMasterId);
		if (!m) return 0;
		const q = convertQuantity(line.quantity, line.unit, m.baseUnit);
		if (q === null) return 0;
		return q * m.unitCost;
	}

	function otherLineCost(line: RecipeDTO['otherLines'][number]): number {
		const m = otherMasters.find((x) => x.id === line.otherMasterId);
		if (!m) return 0;
		const q = convertQuantity(line.quantity, line.unit, m.baseUnit);
		if (q === null) return 0;
		return q * m.unitCost;
	}

	function onBackdropMouseDown(e: MouseEvent): void {
		if (e.target === backdrop) onClose();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') onClose();
	}

	function persistName(): void {
		if (!recipe) return;
		updateRecipeName(recipe.id, draftName);
	}

	function submitIngredientLine(e: Event): void {
		e.preventDefault();
		if (!recipe || !addMasterId) return;
		addRecipeIngredientLine(recipe.id, addMasterId, addQty, addUnit);
		addQty = 1;
	}

	function submitOtherLine(e: Event): void {
		e.preventDefault();
		if (!recipe || !addOtherMasterId) return;
		addRecipeOtherLine(recipe.id, addOtherMasterId, otherQty, otherUnit);
		otherQty = 1;
	}
</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open && recipe}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="recipe-name-field"
		tabindex="-1"
	>
		<div
			class="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
		>
			<div
				class="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-6"
			>
				<div class="min-w-0 flex-1">
					<label for="recipe-name-field" class="sr-only">Recipe name</label>
					<input
						id="recipe-name-field"
						bind:value={draftName}
						onchange={persistName}
						class="w-full max-w-md border-b border-transparent text-xl font-semibold text-zinc-900 outline-none focus:border-emerald-400"
					/>
					<p class="mt-1 text-sm text-zinc-500">
						{recipe.ingredientLines.length} catalog ingredient line(s) · {recipe.otherLines.length}
						other line(s)
					</p>
				</div>
				<button
					type="button"
					class="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
					onclick={onClose}
					aria-label="Close"
				>
					<span class="text-xl leading-none">×</span>
				</button>
			</div>

			<div
				class="recipe-details-scroll min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
			>
				<!-- Ingredients + others -->
				<div class="mx-auto max-w-4xl space-y-6">
					<section>
						<h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Ingredients</h3>
						<p class="mt-1 text-xs leading-snug text-zinc-500">
							Catalog stores <strong>purchase cost</strong> and <strong>package size</strong>; the app converts to a
							café base unit (liquids → ml, solids → g, packaging → piece), then
							<strong>cost per line = recipe qty (in base) × unit cost</strong>. Example: water ₱30 per 1 gal → ~3785 ml
							base → cost per ml = 30 ÷ 3785; recipe 150 ml → 150 × that rate.
						</p>

						<div class="mt-3 overflow-hidden rounded-xl border border-zinc-200">
							<table class="w-full text-left text-sm">
								<thead class="bg-zinc-50 text-xs uppercase text-zinc-500">
									<tr>
										<th class="px-3 py-2 font-medium">Item</th>
										<th class="px-3 py-2 font-medium">Qty</th>
										<th class="px-3 py-2 font-medium text-right">₱/unit</th>
										<th class="px-3 py-2 font-medium text-right">Line</th>
										<th class="px-3 py-2 w-16"></th>
									</tr>
								</thead>
								<tbody class="divide-y divide-zinc-100">
									{#each recipe.ingredientLines as line (line.id)}
										{@const m = masters.find((x) => x.id === line.ingredientMasterId)}
										<tr class="bg-white">
											<td class="px-3 py-2 align-top">
												{#if m}
													<span class="font-medium text-zinc-900">{m.name}</span>
													<span class="mt-1 block text-[10px] text-zinc-400">{m.supplier}</span>
												{:else}
													<span class="text-amber-700">Missing catalog ID — pick again</span>
												{/if}
												<select
													class="mt-2 block w-full max-w-[220px] rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.ingredientMasterId}
													onchange={(e) =>
														updateRecipeIngredientLine(recipe.id, line.id, {
															ingredientMasterId: (e.currentTarget as HTMLSelectElement).value
														})}
												>
													{#each masters as cat}
														<option value={cat.id}>{cat.name}</option>
													{/each}
												</select>
											</td>
											<td class="px-3 py-2 align-top">
												<input
													type="number"
													min="0"
													step="any"
													class="mb-1 w-20 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.quantity}
													onchange={(e) =>
														updateRecipeIngredientLine(recipe.id, line.id, {
															quantity: +((e.currentTarget as HTMLInputElement).value || 0)
														})}
												/>
												<select
													class="block w-[100px] rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.unit}
													onchange={(e) =>
														updateRecipeIngredientLine(recipe.id, line.id, {
															unit: (e.currentTarget as HTMLSelectElement).value as MeasureUnit
														})}
												>
													{#each MEASURE_UNIT_OPTIONS as u}
														<option value={u.value}>{u.label}</option>
													{/each}
												</select>
											</td>
											<td class="px-3 py-2 text-right align-top tabular-nums text-zinc-600">
												{m ? fmt(m.unitCost) : '—'}
											</td>
											<td class="px-3 py-2 text-right align-top tabular-nums font-medium text-zinc-900">
												{fmt(ingLineCost(line))}
											</td>
											<td class="px-3 py-2 align-top">
												<button
													type="button"
													class="text-xs font-medium text-red-600 hover:underline"
													onclick={() =>
														askRemoveIngredient(line.id, m?.name ?? 'Ingredient line')}
												>
													Remove
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
							{#if recipe.ingredientLines.length === 0}
								<p class="border-t border-zinc-100 bg-zinc-50/50 px-3 py-6 text-center text-sm text-zinc-500">
									No ingredients yet — add a line below.
								</p>
							{/if}
						</div>

						<form
							class="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-3"
							onsubmit={submitIngredientLine}
						>
							<span class="w-full text-xs font-semibold uppercase text-zinc-500">Add ingredient line</span>
							<select
								bind:value={addMasterId}
								class="min-w-[140px] flex-1 rounded-lg border border-zinc-200 px-2 py-2 text-sm"
							>
								{#each masters as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
							<input
								type="number"
								min="0"
								step="any"
								bind:value={addQty}
								class="w-24 rounded-lg border border-zinc-200 px-2 py-2 text-sm"
								title="Quantity needed"
							/>
							<select bind:value={addUnit} class="rounded-lg border border-zinc-200 px-2 py-2 text-sm">
								{#each MEASURE_UNIT_OPTIONS as u}
									<option value={u.value}>{u.label}</option>
								{/each}
							</select>
							<button
								type="submit"
								class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
							>
								Add
							</button>
						</form>

						<p class="mt-2 text-xs text-zinc-500">
							Subtotal (ingredients): <strong>{fmt(recipeIngredientSubtotal(recipe, masters))}</strong>
						</p>
					</section>

					<section class="border-t border-zinc-200 pt-6">
						<h3 class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Others</h3>
						<p class="mt-1 text-xs text-zinc-500">
							Cups, lids, sleeves — pick from the <strong>Others</strong> catalog (same flow as ingredients).
						</p>

						<div class="mt-3 overflow-hidden rounded-xl border border-zinc-200">
							<table class="w-full text-left text-sm">
								<thead class="bg-zinc-50 text-xs uppercase text-zinc-500">
									<tr>
										<th class="px-3 py-2 font-medium">Item</th>
										<th class="px-3 py-2 font-medium">Qty</th>
										<th class="px-3 py-2 font-medium text-right">₱/unit</th>
										<th class="px-3 py-2 font-medium text-right">Line</th>
										<th class="w-16 px-3 py-2"></th>
									</tr>
								</thead>
								<tbody class="divide-y divide-zinc-100">
									{#each recipe.otherLines as line (line.id)}
										{@const om = otherMasters.find((x) => x.id === line.otherMasterId)}
										<tr class="bg-white">
											<td class="px-3 py-2 align-top">
												{#if om}
													<span class="font-medium text-zinc-900">{om.name}</span>
													<span class="mt-1 block text-[10px] text-zinc-400">{om.supplier}</span>
												{:else}
													<span class="text-amber-700">Missing catalog ID — pick again</span>
												{/if}
												<select
													class="mt-2 block w-full max-w-[220px] rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.otherMasterId}
													onchange={(e) =>
														updateRecipeOtherLine(recipe.id, line.id, {
															otherMasterId: (e.currentTarget as HTMLSelectElement).value
														})}
												>
													{#each otherMasters as cat}
														<option value={cat.id}>{cat.name}</option>
													{/each}
												</select>
											</td>
											<td class="px-3 py-2 align-top">
												<input
													type="number"
													min="0"
													step="any"
													class="mb-1 w-20 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.quantity}
													onchange={(e) =>
														updateRecipeOtherLine(recipe.id, line.id, {
															quantity: +((e.currentTarget as HTMLInputElement).value || 0)
														})}
												/>
												<select
													class="block w-[100px] rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.unit}
													onchange={(e) =>
														updateRecipeOtherLine(recipe.id, line.id, {
															unit: (e.currentTarget as HTMLSelectElement).value as MeasureUnit
														})}
												>
													{#each MEASURE_UNIT_OPTIONS as u}
														<option value={u.value}>{u.label}</option>
													{/each}
												</select>
											</td>
											<td class="px-3 py-2 text-right align-top tabular-nums text-zinc-600">
												{om ? fmt(om.unitCost) : '—'}
											</td>
											<td class="px-3 py-2 text-right align-top tabular-nums font-medium text-zinc-900">
												{fmt(otherLineCost(line))}
											</td>
											<td class="px-3 py-2 align-top">
												<button
													type="button"
													class="text-xs font-medium text-red-600 hover:underline"
													onclick={() => askRemoveOther(line.id, om?.name ?? 'Other line')}
												>
													Remove
												</button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
							{#if recipe.otherLines.length === 0}
								<p class="border-t border-zinc-100 bg-zinc-50/50 px-3 py-6 text-center text-sm text-zinc-500">
									Add cups, lids, sleeves from the catalog below.
								</p>
							{/if}
						</div>

						<form
							class="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/50 p-3"
							onsubmit={submitOtherLine}
						>
							<span class="w-full text-xs font-semibold uppercase text-zinc-500">Add other line</span>
							<select
								bind:value={addOtherMasterId}
								class="min-w-[140px] flex-1 rounded-lg border border-zinc-200 px-2 py-2 text-sm"
							>
								{#each otherMasters as cat}
									<option value={cat.id}>{cat.name}</option>
								{/each}
							</select>
							<input
								type="number"
								min="0"
								step="any"
								bind:value={otherQty}
								class="w-24 rounded-lg border border-zinc-200 px-2 py-2 text-sm"
								title="Quantity needed"
							/>
							<select bind:value={otherUnit} class="rounded-lg border border-zinc-200 px-2 py-2 text-sm">
								{#each MEASURE_UNIT_OPTIONS as u}
									<option value={u.value}>{u.label}</option>
								{/each}
							</select>
							<button
								type="submit"
								class="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
							>
								Add
							</button>
						</form>

						<p class="mt-2 text-xs text-zinc-500">
							Subtotal (others): <strong>{fmt(recipeOtherSubtotal(recipe, otherMasters))}</strong>
						</p>
					</section>
				</div>
			</div>
		</div>
	</div>
{/if}

<TypeToConfirmDeleteModal
	open={pendingLineRemove !== null}
	title={pendingLineRemove?.kind === 'other' ? 'Remove other line?' : 'Remove ingredient line?'}
	description={pendingLineRemove
		? `Remove “${pendingLineRemove.label}” from this recipe.`
		: ''}
	onClose={() => (pendingLineRemove = null)}
	onConfirm={executeLineRemove}
/>
