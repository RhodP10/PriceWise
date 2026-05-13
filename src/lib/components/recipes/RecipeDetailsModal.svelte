<script lang="ts">
	import type { MeasureUnit, RecipeDTO } from '$lib/types/recipe';
	import { ingredientCatalog, MEASURE_UNIT_OPTIONS } from '$lib/state/ingredientCatalog.svelte';
	import { otherCatalog } from '$lib/state/otherCatalog.svelte';
	import AddIngredientMasterModal from '$lib/components/recipes/AddIngredientMasterModal.svelte';
	import AddOtherMasterModal from '$lib/components/recipes/AddOtherMasterModal.svelte';
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import { costingSettings } from '$lib/state/costingSettings.svelte';
	import {
		addRecipeIngredientLine,
		addRecipeOtherLine,
		deleteRecipe,
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
	/** Single add form: switch type with segmented control */
	let addMode = $state<'ingredient' | 'other'>('ingredient');
	let addIngredientMasterId = $state('');
	let addOtherMasterId = $state('');
	let addQty = $state(1);
	let addUnit = $state<MeasureUnit>('g');

	let quickAddIngredientOpen = $state(false);
	let quickAddOtherOpen = $state(false);

	let openedRecipeId = $state<string | null>(null);

	let pendingLineRemove = $state<
		| { kind: 'ingredient'; lineId: string; label: string }
		| { kind: 'other'; lineId: string; label: string }
		| null
	>(null);

	let pendingRecipeDelete = $state(false);

	type CombinedRow =
		| { kind: 'ingredient'; line: RecipeDTO['ingredientLines'][number] }
		| { kind: 'other'; line: RecipeDTO['otherLines'][number] };

	const masters = $derived(ingredientCatalog.items);
	const otherMasters = $derived(otherCatalog.items);

	const combinedLines = $derived.by((): CombinedRow[] => {
		if (!recipe) return [];
		return [
			...recipe.ingredientLines.map((line) => ({ kind: 'ingredient' as const, line })),
			...recipe.otherLines.map((line) => ({ kind: 'other' as const, line }))
		];
	});

	const ingSub = $derived(recipe ? recipeIngredientSubtotal(recipe, masters) : 0);
	const othSub = $derived(recipe ? recipeOtherSubtotal(recipe, otherMasters) : 0);

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

	function executeRecipeDelete(): void {
		if (!recipe) return;
		deleteRecipe(recipe.id);
		pendingRecipeDelete = false;
		pendingLineRemove = null;
		onClose();
	}

	$effect(() => {
		if (open && recipe && openedRecipeId !== recipe.id) {
			openedRecipeId = recipe.id;
			addMode = 'ingredient';
		}
		if (!open) openedRecipeId = null;
	});

	$effect(() => {
		if (recipe) draftName = recipe.name;
	});

	$effect(() => {
		if (!open) {
			quickAddIngredientOpen = false;
			quickAddOtherOpen = false;
			pendingRecipeDelete = false;
		}
	});

	$effect(() => {
		const firstIng = masters[0]?.id ?? '';
		if (!addIngredientMasterId && firstIng) addIngredientMasterId = firstIng;
		if (masters.length && !masters.some((m) => m.id === addIngredientMasterId)) {
			addIngredientMasterId = firstIng;
		}
	});

	$effect(() => {
		const firstOth = otherMasters[0]?.id ?? '';
		if (!addOtherMasterId && firstOth) addOtherMasterId = firstOth;
		if (otherMasters.length && !otherMasters.some((m) => m.id === addOtherMasterId)) {
			addOtherMasterId = firstOth;
		}
	});

	function fmt(n: number): string {
		return `₱${n.toFixed(2)}`;
	}

	function catalogPickLabel(name: string, supplier: string): string {
		const s = supplier.trim();
		return s ? `${name} · ${s}` : name;
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
		if (quickAddIngredientOpen || quickAddOtherOpen || pendingRecipeDelete) return;
		if (e.target === backdrop) onClose();
	}

	function onKeydown(e: KeyboardEvent): void {
		if (e.key === 'Escape') {
			if (pendingRecipeDelete) {
				pendingRecipeDelete = false;
				return;
			}
			if (quickAddIngredientOpen || quickAddOtherOpen) return;
			onClose();
		}
	}

	function persistName(): void {
		if (!recipe) return;
		updateRecipeName(recipe.id, draftName);
	}

	function submitAddLine(e: Event): void {
		e.preventDefault();
		if (!recipe) return;
		if (addMode === 'ingredient') {
			if (!masters.length || !addIngredientMasterId) return;
			addRecipeIngredientLine(recipe.id, addIngredientMasterId, addQty, addUnit);
		} else {
			if (!otherMasters.length || !addOtherMasterId) return;
			addRecipeOtherLine(recipe.id, addOtherMasterId, addQty, addUnit);
		}
		addQty = 1;
	}

	const canAddIngredient = $derived(masters.length > 0 && Boolean(addIngredientMasterId));
	const canAddOther = $derived(otherMasters.length > 0 && Boolean(addOtherMasterId));
	const canSubmitAdd = $derived(addMode === 'ingredient' ? canAddIngredient : canAddOther);

	type AddPreview =
		| {
				kind: 'ingredient' | 'other';
				name: string;
				baseUnit: string;
				unitCost: number;
				lineCost: number | null;
				qtyOk: boolean;
		  }
		| null;

	const addPreview = $derived.by((): AddPreview => {
		if (addMode === 'ingredient') {
			const m = masters.find((x) => x.id === addIngredientMasterId);
			if (!m || !addIngredientMasterId) return null;
			const q = convertQuantity(addQty, addUnit, m.baseUnit);
			const qtyOk = q !== null && q >= 0;
			const lineCost = qtyOk && q !== null ? q * m.unitCost : null;
			return { kind: 'ingredient', name: m.name, baseUnit: m.baseUnit, unitCost: m.unitCost, lineCost, qtyOk };
		}
		const m = otherMasters.find((x) => x.id === addOtherMasterId);
		if (!m || !addOtherMasterId) return null;
		const q = convertQuantity(addQty, addUnit, m.baseUnit);
		const qtyOk = q !== null && q >= 0;
		const lineCost = qtyOk && q !== null ? q * m.unitCost : null;
		return { kind: 'other', name: m.name, baseUnit: m.baseUnit, unitCost: m.unitCost, lineCost, qtyOk };
	});

</script>

<svelte:window onkeydown={open ? onKeydown : undefined} />

{#if open && recipe}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-4"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="recipe-name-field"
		tabindex="-1"
	>
		<div
			class="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-700/80 bg-white shadow-2xl ring-1 ring-black/5"
		>
			<!-- Recipe Manager–style header -->
			<div
				class="relative shrink-0 overflow-hidden bg-zinc-900 px-4 py-5 text-white sm:px-6 sm:py-6"
			>
				<div
					class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-orange-500/25 blur-3xl"
				></div>
				<div
					class="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-500/10 blur-2xl"
				></div>
				<div class="relative flex flex-wrap items-start justify-between gap-3">
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-lg shadow-orange-900/30"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="20"
									height="20"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
									<path d="M7 2v20" />
									<path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Recipe details</p>
								<label for="recipe-name-field" class="sr-only">Recipe name</label>
								<input
									id="recipe-name-field"
									bind:value={draftName}
									onchange={persistName}
									class="mt-0.5 w-full max-w-md border-b border-transparent bg-transparent text-xl font-bold tracking-tight text-white outline-none placeholder-zinc-600 focus:border-orange-400"
								/>
							</div>
						</div>
						<div class="mt-3 flex flex-wrap gap-2">
							<span
								class="inline-flex items-center rounded-lg bg-zinc-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 ring-1 ring-white/10"
							>
								{recipe.ingredientLines.length} ingredients
							</span>
							<span
								class="inline-flex items-center rounded-lg bg-zinc-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-300 ring-1 ring-white/10"
							>
								{recipe.otherLines.length} others
							</span>
							<span class="text-xs tabular-nums text-zinc-500">
								Lines total: <span class="font-semibold text-zinc-300">{combinedLines.length}</span>
							</span>
						</div>
					</div>
					<button
						type="button"
						class="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
						onclick={onClose}
						aria-label="Close"
					>
						<span class="text-xl leading-none">×</span>
					</button>
				</div>
			</div>

			<!-- Scroll: one compact categorized table -->
			<div class="recipe-details-scroll min-h-0 flex-1 overflow-y-auto bg-zinc-50/80 p-4 sm:p-5">
				<div class="mx-auto max-w-2xl">
					<p class="mb-2 text-center text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
						Recipe lines
					</p>
					<p class="mb-3 text-center text-xs leading-relaxed text-zinc-500">
						Each row is either an <strong class="text-zinc-700">ingredient</strong> or an
						<strong class="text-zinc-700">other</strong> (cups, lids, etc.). Pick the catalog item, qty, and unit.
					</p>

					<div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
						<table class="w-full text-left text-sm">
							<thead class="bg-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
								<tr>
									<th class="px-3 py-2.5 font-medium">Type</th>
									<th class="px-3 py-2.5 font-medium">Item</th>
									<th class="px-3 py-2.5 font-medium">Qty</th>
									<th class="hidden px-3 py-2.5 font-medium text-right sm:table-cell">₱/u</th>
									<th class="px-3 py-2.5 font-medium text-right">Line</th>
									<th class="w-10 px-2 py-2.5"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-zinc-100">
								{#each combinedLines as row (row.kind + row.line.id)}
									{#if row.kind === 'ingredient'}
										{@const line = row.line}
										{@const m = masters.find((x) => x.id === line.ingredientMasterId)}
										<tr class="bg-white">
											<td class="px-3 py-2.5 align-top">
												<span
													class="inline-flex rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800 ring-1 ring-emerald-200/80"
												>
													Ingr.
												</span>
											</td>
											<td class="max-w-[140px] px-3 py-2.5 align-top sm:max-w-none">
												{#if m}
													<span class="font-medium text-zinc-900">{m.name}</span>
													<span class="mt-0.5 block truncate text-[10px] text-zinc-400">{m.supplier}</span>
												{:else}
													<span class="text-amber-700">Missing item</span>
												{/if}
												<select
													class="mt-1.5 block w-full min-w-0 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.ingredientMasterId}
													onchange={(e) =>
														updateRecipeIngredientLine(recipe.id, line.id, {
															ingredientMasterId: (e.currentTarget as HTMLSelectElement).value
														})}
												>
													{#each masters as cat}
														<option value={cat.id}>{catalogPickLabel(cat.name, cat.supplier)}</option>
													{/each}
												</select>
											</td>
											<td class="px-3 py-2.5 align-top">
												<input
													type="number"
													min="0"
													step="any"
													class="mb-1 w-full min-w-[3.5rem] max-w-[5rem] rounded-lg border border-zinc-200 px-1.5 py-1 text-xs"
													value={line.quantity}
													onchange={(e) =>
														updateRecipeIngredientLine(recipe.id, line.id, {
															quantity: +((e.currentTarget as HTMLInputElement).value || 0)
														})}
												/>
												<select
													class="block w-full min-w-0 max-w-[6.5rem] rounded-lg border border-zinc-200 px-1 py-1 text-[10px]"
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
											<td class="hidden px-3 py-2.5 text-right align-top tabular-nums text-zinc-600 sm:table-cell">
												{m ? fmt(m.unitCost) : '—'}
											</td>
											<td class="px-3 py-2.5 text-right align-top tabular-nums text-sm font-semibold text-zinc-900">
												{fmt(ingLineCost(line))}
											</td>
											<td class="px-2 py-2.5 align-top">
												<button
													type="button"
													class="text-[11px] font-medium text-red-600 hover:underline"
													onclick={() => askRemoveIngredient(line.id, m?.name ?? 'Line')}
												>
													×
												</button>
											</td>
										</tr>
									{:else}
										{@const line = row.line}
										{@const om = otherMasters.find((x) => x.id === line.otherMasterId)}
										<tr class="bg-white">
											<td class="px-3 py-2.5 align-top">
												<span
													class="inline-flex rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-sky-900 ring-1 ring-sky-200/80"
												>
													Other
												</span>
											</td>
											<td class="max-w-[140px] px-3 py-2.5 align-top sm:max-w-none">
												{#if om}
													<span class="font-medium text-zinc-900">{om.name}</span>
													<span class="mt-0.5 block truncate text-[10px] text-zinc-400">{om.supplier}</span>
												{:else}
													<span class="text-amber-700">Missing item</span>
												{/if}
												<select
													class="mt-1.5 block w-full min-w-0 rounded-lg border border-zinc-200 px-2 py-1 text-xs"
													value={line.otherMasterId}
													onchange={(e) =>
														updateRecipeOtherLine(recipe.id, line.id, {
															otherMasterId: (e.currentTarget as HTMLSelectElement).value
														})}
												>
													{#each otherMasters as cat}
														<option value={cat.id}>{catalogPickLabel(cat.name, cat.supplier)}</option>
													{/each}
												</select>
											</td>
											<td class="px-3 py-2.5 align-top">
												<input
													type="number"
													min="0"
													step="any"
													class="mb-1 w-full min-w-[3.5rem] max-w-[5rem] rounded-lg border border-zinc-200 px-1.5 py-1 text-xs"
													value={line.quantity}
													onchange={(e) =>
														updateRecipeOtherLine(recipe.id, line.id, {
															quantity: +((e.currentTarget as HTMLInputElement).value || 0)
														})}
												/>
												<select
													class="block w-full min-w-0 max-w-[6.5rem] rounded-lg border border-zinc-200 px-1 py-1 text-[10px]"
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
											<td class="hidden px-3 py-2.5 text-right align-top tabular-nums text-zinc-600 sm:table-cell">
												{om ? fmt(om.unitCost) : '—'}
											</td>
											<td class="px-3 py-2.5 text-right align-top tabular-nums text-sm font-semibold text-zinc-900">
												{fmt(otherLineCost(line))}
											</td>
											<td class="px-2 py-2.5 align-top">
												<button
													type="button"
													class="text-[11px] font-medium text-red-600 hover:underline"
													onclick={() => askRemoveOther(line.id, om?.name ?? 'Line')}
												>
													×
												</button>
											</td>
										</tr>
									{/if}
								{/each}
							</tbody>
						</table>
						{#if combinedLines.length === 0}
							<p class="border-t border-zinc-100 bg-zinc-50/60 px-4 py-8 text-center text-sm text-zinc-500">
								No lines yet. Use <strong class="text-zinc-800">Add ingredient</strong> or
								<strong class="text-zinc-800">Add other</strong> below — add catalog items on the
								<strong>Ingredients</strong> and <strong>Others</strong> pages first if lists are empty.
							</p>
						{/if}
					</div>

					<div class="mt-4 rounded-2xl border border-red-200/80 bg-red-50/50 px-4 py-3 sm:px-5">
						<p class="text-[10px] font-bold uppercase tracking-wider text-red-800">Danger zone</p>
						<p class="mt-1 text-xs leading-snug text-red-900/85">
							Delete this recipe and all its lines here. Your catalog ingredients and others are not removed.
						</p>
						<button
							type="button"
							class="mt-2 rounded-xl border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-50"
							onclick={() => (pendingRecipeDelete = true)}
						>
							Delete entire recipe
						</button>
					</div>

					<div
						class="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 text-xs shadow-sm sm:grid-cols-3"
					>
						<div>
							<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Ingredients</p>
							<p class="mt-0.5 font-bold tabular-nums text-zinc-900">{fmt(ingSub)}</p>
						</div>
						<div>
							<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Others</p>
							<p class="mt-0.5 font-bold tabular-nums text-zinc-900">{fmt(othSub)}</p>
						</div>
						<div class="col-span-2 border-t border-zinc-100 pt-2 sm:col-span-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
							<p class="text-[10px] font-bold uppercase tracking-wider text-orange-600">COGS this recipe</p>
							<p class="mt-0.5 text-lg font-bold tabular-nums text-zinc-900">{fmt(ingSub + othSub)}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Add bar: one row + costing clarity -->
			<div
				class="shrink-0 border-t border-zinc-200 bg-white px-4 py-3 shadow-[0_-10px_40px_rgba(0,0,0,0.06)] sm:px-6 sm:py-4"
			>
				<div class="mx-auto max-w-4xl space-y-2">
					<div class="flex rounded-xl bg-zinc-100 p-1 ring-1 ring-zinc-200/80">
						<button
							type="button"
							class="flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition sm:text-sm {addMode ===
							'ingredient'
								? 'bg-white text-emerald-800 shadow-sm ring-1 ring-zinc-200/80'
								: 'text-zinc-500 hover:text-zinc-800'}"
							onclick={() => (addMode = 'ingredient')}
						>
							Add ingredient
						</button>
						<button
							type="button"
							class="flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-wide transition sm:text-sm {addMode ===
							'other'
								? 'bg-white text-sky-900 shadow-sm ring-1 ring-zinc-200/80'
								: 'text-zinc-500 hover:text-zinc-800'}"
							onclick={() => (addMode = 'other')}
						>
							Add other
						</button>
					</div>

					<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
						<p class="max-w-xl text-[11px] leading-snug text-zinc-600">
							<span class="font-bold text-zinc-800">Costing path:</span>
							you attach a <strong>catalog {addMode === 'ingredient' ? 'ingredient' : 'other'}</strong> (price is
							already per g, ml, or piece from that item’s package). This recipe then uses your
							<strong>quantity + unit</strong> here — we convert to the catalog’s base unit and multiply by its
							<strong>₱/base</strong> to get this line’s cost.
						</p>
						<button
							type="button"
							class="shrink-0 self-start rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition {addMode ===
							'ingredient'
								? 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
								: 'border-sky-200 bg-sky-50 text-sky-950 hover:bg-sky-100'}"
							onclick={() =>
								addMode === 'ingredient' ? (quickAddIngredientOpen = true) : (quickAddOtherOpen = true)}
						>
							+ New {addMode === 'ingredient' ? 'ingredient' : 'other'}
						</button>
					</div>

					<form class="space-y-2" onsubmit={submitAddLine}>
						{#if addMode === 'ingredient' && !masters.length}
							<p class="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900 ring-1 ring-amber-200">
								Catalog is empty — tap <strong>+ New ingredient</strong> (e.g. matcha), then pick it in the row
								below.
							</p>
						{:else if addMode === 'other' && !otherMasters.length}
							<p class="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-900 ring-1 ring-amber-200">
								Catalog is empty — tap <strong>+ New other</strong>, then pick it below.
							</p>
						{/if}

						<div
							class="flex min-w-0 flex-nowrap items-stretch gap-2 overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50/40 p-2 ring-1 ring-zinc-100"
							aria-label="Add line: catalog, quantity, unit, add"
						>
							{#if addMode === 'ingredient'}
								<label class="sr-only" for="add-ing-select">Catalog ingredient</label>
								<select
									id="add-ing-select"
									bind:value={addIngredientMasterId}
									disabled={masters.length === 0}
									class="min-h-[44px] min-w-[min(100%,11rem)] flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-50"
									title="Pick catalog ingredient"
								>
									{#if masters.length === 0}
										<option value="">— No items yet —</option>
									{:else}
										{#each masters as cat}
											<option value={cat.id}>{catalogPickLabel(cat.name, cat.supplier)}</option>
										{/each}
									{/if}
								</select>
							{:else}
								<label class="sr-only" for="add-oth-select">Catalog other</label>
								<select
									id="add-oth-select"
									bind:value={addOtherMasterId}
									disabled={otherMasters.length === 0}
									class="min-h-[44px] min-w-[min(100%,11rem)] flex-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 disabled:opacity-50"
									title="Pick catalog other"
								>
									{#if otherMasters.length === 0}
										<option value="">— No items yet —</option>
									{:else}
										{#each otherMasters as cat}
											<option value={cat.id}>{catalogPickLabel(cat.name, cat.supplier)}</option>
										{/each}
									{/if}
								</select>
							{/if}

							<label class="sr-only" for="add-line-qty">Recipe quantity</label>
							<input
								id="add-line-qty"
								type="number"
								min="0"
								step="any"
								bind:value={addQty}
								class="min-h-[44px] w-[4.5rem] shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-sm tabular-nums outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15"
								title="How much this recipe uses"
							/>

							<label class="sr-only" for="add-line-unit">Unit for quantity</label>
							<select
								id="add-line-unit"
								bind:value={addUnit}
								class="min-h-[44px] w-[5.75rem] shrink-0 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/15 sm:w-[6.5rem]"
							>
								{#each MEASURE_UNIT_OPTIONS as u}
									<option value={u.value}>{u.label}</option>
								{/each}
							</select>

							<button
								type="submit"
								disabled={!canSubmitAdd}
								class="min-h-[44px] shrink-0 rounded-lg px-4 text-sm font-bold text-white shadow-md transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40 {addMode ===
								'ingredient'
									? 'bg-orange-600'
									: 'bg-zinc-900'}"
							>
								Add line
							</button>
						</div>

						{#if addPreview}
							<div class="rounded-lg bg-zinc-100/80 px-2.5 py-2 text-[11px] leading-snug text-zinc-700">
								<strong class="text-zinc-900">{addPreview.name}</strong>
								<span class="text-zinc-500"> · catalog base </span>
								<span class="font-mono tabular-nums text-zinc-800">{addPreview.baseUnit}</span>
								<span class="text-zinc-500"> at </span>
								<span class="font-semibold tabular-nums text-zinc-900">{fmt(addPreview.unitCost)}</span>
								<span class="text-zinc-500"> /{addPreview.baseUnit}</span>
								{#if addPreview.lineCost !== null && addPreview.qtyOk}
									<span class="text-zinc-500"> → </span>
									<span class="font-semibold text-emerald-800">this line ≈ {fmt(addPreview.lineCost)}</span>
								{:else if !addPreview.qtyOk}
									<span class="text-amber-800"> — unit can’t convert to this catalog’s base; try g, ml, or piece.</span>
								{/if}
							</div>
						{/if}
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}

<AddIngredientMasterModal bind:open={quickAddIngredientOpen} />
<AddOtherMasterModal bind:open={quickAddOtherOpen} />

<TypeToConfirmDeleteModal
	open={pendingLineRemove !== null}
	title={pendingLineRemove?.kind === 'other' ? 'Remove other line?' : 'Remove ingredient line?'}
	description={pendingLineRemove ? `Remove “${pendingLineRemove.label}” from this recipe.` : ''}
	onClose={() => (pendingLineRemove = null)}
	onConfirm={executeLineRemove}
/>

<TypeToConfirmDeleteModal
	open={pendingRecipeDelete}
	title="Delete this recipe?"
	description={recipe
		? `This removes “${recipe.name}” and every ingredient / other line in it. Type delete to confirm.`
		: ''}
	confirmPhrase="delete"
	onClose={() => (pendingRecipeDelete = false)}
	onConfirm={executeRecipeDelete}
/>
