<script lang="ts">
	import AddIngredientMasterModal from '$lib/components/recipes/AddIngredientMasterModal.svelte';
	import ChannelScrapeHelpModal from '$lib/components/catalog/ChannelScrapeHelpModal.svelte';
	import MarketplaceCatalogTable from '$lib/components/catalog/MarketplaceCatalogTable.svelte';
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import { computeUnitCost, toBaseQuantity } from '$lib/utils/baseUnitCost';
	import {
		deleteIngredientMaster,
		ingredientCatalog,
		updateIngredientMaster,
		MEASURE_UNIT_OPTIONS
	} from '$lib/state/ingredientCatalog.svelte';
	import type { ChannelMarketplace, IngredientMasterDTO, MeasureUnit } from '$lib/types/recipe';

	let search = $state('');
	let addModalOpen = $state(false);

	let activeTab = $state<'local' | 'lazada' | 'shopee'>('local');
	const tabs = [
		{ id: 'local', label: 'Local' },
		{ id: 'lazada', label: 'Lazada' },
		{ id: 'shopee', label: 'Shopee' }
	] as const;

	let scrapeOpen = $state(false);
	let scrapeRowId = $state<string | null>(null);
	let scrapeInitialUrl = $state('');

	let deleteTarget = $state<{ id: string; name: string } | null>(null);

	const filtered = $derived(
		ingredientCatalog.items.filter((row) => {
			const q = search.toLowerCase().trim();
			if (!q) return true;
			return row.name.toLowerCase().includes(q) || row.supplier.toLowerCase().includes(q);
		})
	);

	let editingId = $state<string | null>(null);
	let draft = $state<Partial<IngredientMasterDTO>>({});

	function startEdit(row: IngredientMasterDTO): void {
		editingId = row.id;
		draft = { ...row };
	}

	function saveEdit(): void {
		if (!editingId) return;
		updateIngredientMaster(editingId, {
			name: draft.name,
			supplier: draft.supplier,
			packagePrice: draft.packagePrice,
			packageSize: draft.packageSize,
			packageUnit: draft.packageUnit as MeasureUnit | undefined,
			shippingFee: draft.shippingFee
		});
		editingId = null;
		draft = {};
	}

	function cancelEdit(): void {
		editingId = null;
		draft = {};
	}

	function openScrapeHelp(row: IngredientMasterDTO): void {
		if (activeTab === 'local') return;
		scrapeRowId = row.id;
		scrapeInitialUrl = row.channelScrape?.[activeTab]?.url ?? '';
		scrapeOpen = true;
	}

	function saveScrapeHint(url: string): void {
		if (!scrapeRowId || activeTab === 'local') return;
		const market = activeTab as ChannelMarketplace;
		const ts = new Date().toISOString();
		updateIngredientMaster(scrapeRowId, {
			channelScrape: {
				[market]: {
					url: url || undefined,
					status: url ? 'pending' : 'idle',
					updatedAt: ts
				}
			}
		});
		scrapeRowId = null;
		scrapeInitialUrl = '';
	}

	function markScrapeDone(row: IngredientMasterDTO): void {
		if (activeTab === 'local') return;
		const ch = activeTab as ChannelMarketplace;
		const ts = new Date().toISOString();
		updateIngredientMaster(row.id, {
			channelScrape: {
				[ch]: {
					...row.channelScrape?.[ch],
					status: 'complete',
					updatedAt: ts
				}
			}
		});
	}

	function requestDelete(row: IngredientMasterDTO): void {
		deleteTarget = { id: row.id, name: row.name };
	}

	function executeDelete(): void {
		if (deleteTarget) deleteIngredientMaster(deleteTarget.id);
		deleteTarget = null;
	}

	const channelLabel = $derived(activeTab === 'lazada' ? 'Lazada' : 'Shopee');
</script>

<section class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0 flex-1">
			<h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Ingredients catalog</h1>
			<p class="mt-1 text-sm text-zinc-500">
				Local: full supplier grid. Lazada/Shopee: marketplace table with scrape status (no supplier column); pkg/base
				columns fill in after scrape is marked complete.
			</p>
		</div>
		<div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
			<label for="ing-search" class="sr-only">Search ingredients</label>
			<input
				id="ing-search"
				type="search"
				bind:value={search}
				placeholder="Search name or supplier…"
				class="w-full min-w-[200px] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15 sm:max-w-xs"
			/>
			<button
				type="button"
				class="shrink-0 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
				onclick={() => (addModalOpen = true)}
			>
				Add ingredient
			</button>
		</div>
	</div>

	<div class="border-b border-zinc-200">
		<nav class="-mb-px flex space-x-8" aria-label="Tabs">
			{#each tabs as tab}
				<button
					type="button"
					onclick={() => (activeTab = tab.id)}
					class="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium {activeTab === tab.id
						? 'border-emerald-500 text-emerald-600'
						: 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'}"
				>
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	{#if activeTab === 'local'}
		<div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
			<table class="w-full min-w-[920px] text-left text-sm">
				<thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
					<tr>
						<th class="px-3 py-3 font-medium">Ingredient</th>
						<th class="px-3 py-3 font-medium">Supplier</th>
						<th class="px-3 py-3 font-medium text-right">Pkg ₱</th>
						<th class="px-3 py-3 font-medium text-right">Pkg size</th>
						<th class="px-3 py-3 font-medium">Pkg unit</th>
						<th class="px-3 py-3 font-medium text-right">Ship ₱</th>
						<th class="px-3 py-3 font-medium text-right">Base qty</th>
						<th class="px-3 py-3 font-medium">Base unit</th>
						<th class="px-3 py-3 font-medium text-right">Unit cost</th>
						<th class="px-3 py-3 font-medium text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each filtered as row (row.id)}
						{#if editingId === row.id}
							<tr class="bg-emerald-50/50">
								<td class="px-3 py-2 align-top">
									<input bind:value={draft.name} class="w-full rounded-lg border px-2 py-1 text-sm" />
								</td>
								<td class="px-3 py-2 align-top">
									<input bind:value={draft.supplier} class="w-full rounded-lg border px-2 py-1 text-sm" />
								</td>
								<td class="px-3 py-2 align-top">
									<input
										type="number"
										min="0"
										step="any"
										bind:value={draft.packagePrice}
										class="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums"
									/>
								</td>
								<td class="px-3 py-2 align-top">
									<input
										type="number"
										min="0"
										step="any"
										bind:value={draft.packageSize}
										class="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums"
									/>
								</td>
								<td class="px-3 py-2 align-top">
									<select bind:value={draft.packageUnit} class="w-full rounded-lg border px-2 py-1 text-sm">
										{#each MEASURE_UNIT_OPTIONS as u}
											<option value={u.value}>{u.label}</option>
										{/each}
									</select>
								</td>
								<td class="px-3 py-2 align-top">
									<input
										type="number"
										min="0"
										step="any"
										bind:value={draft.shippingFee}
										class="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums"
									/>
								</td>
								<td class="px-3 py-2 align-top text-right text-xs text-zinc-500">Auto</td>
								<td class="px-3 py-2 align-top text-xs text-zinc-500">Auto</td>
								<td class="px-3 py-2 align-top text-right tabular-nums font-medium">
									₱{computeUnitCost(
										draft.packagePrice ?? 0,
										draft.shippingFee ?? 0,
										toBaseQuantity(draft.packageSize ?? 0, (draft.packageUnit ?? 'g') as MeasureUnit).quantity
									).toFixed(4)}
								</td>
								<td class="px-3 py-2 align-top text-right">
									<button
										type="button"
										class="mr-2 text-xs font-medium text-emerald-700 hover:underline"
										onclick={saveEdit}
									>
										Save
									</button>
									<button type="button" class="text-xs text-zinc-600 hover:underline" onclick={cancelEdit}>
										Cancel
									</button>
								</td>
							</tr>
						{:else}
							<tr class="hover:bg-zinc-50/80">
								<td class="px-3 py-2.5 font-medium text-zinc-900">{row.name}</td>
								<td class="px-3 py-2.5 text-zinc-600">{row.supplier}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">₱{row.packagePrice.toFixed(2)}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">{row.packageSize}</td>
								<td class="px-3 py-2.5">{row.packageUnit}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">₱{row.shippingFee.toFixed(2)}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">{row.baseQuantity}</td>
								<td class="px-3 py-2.5">{row.baseUnit}</td>
								<td class="px-3 py-2.5 text-right tabular-nums font-medium text-emerald-800">
									₱{row.unitCost.toFixed(4)}
								</td>
								<td class="px-3 py-2.5 text-right">
									<button
										type="button"
										class="mr-2 text-xs font-medium text-emerald-700 hover:underline"
										onclick={() => startEdit(row)}
									>
										Edit
									</button>
									<button
										type="button"
										class="text-xs font-medium text-red-600 hover:underline"
										onclick={() => requestDelete(row)}
									>
										Delete
									</button>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
			{#if ingredientCatalog.items.length === 0}
				<p class="py-12 text-center text-sm text-zinc-500">No ingredients yet.</p>
			{:else if filtered.length === 0}
				<p class="py-12 text-center text-sm text-zinc-500">No matches for “{search.trim()}”.</p>
			{/if}
		</div>
	{:else}
		{#if filtered.length === 0}
			<p class="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
				No matches for “{search.trim()}”. Try the Local tab to add ingredients first.
			</p>
		{:else}
			<MarketplaceCatalogTable
				rows={filtered}
				channel={activeTab as ChannelMarketplace}
				channelLabel={channelLabel}
				itemHeader="Ingredient"
				accent="emerald"
				onHelpScrape={openScrapeHelp}
				onMarkDone={markScrapeDone}
				onDelete={requestDelete}
			/>
		{/if}
	{/if}
</section>

<AddIngredientMasterModal bind:open={addModalOpen} />

<ChannelScrapeHelpModal
	open={scrapeOpen}
	initialUrl={scrapeInitialUrl}
	channelLabel={channelLabel}
	onSave={saveScrapeHint}
	onClose={() => (scrapeOpen = false)}
/>

<TypeToConfirmDeleteModal
	open={deleteTarget !== null}
	title="Delete ingredient?"
	description={deleteTarget
		? `This removes “${deleteTarget.name}” from your catalog. Recipes referencing it may need updating.`
		: ''}
	onClose={() => (deleteTarget = null)}
	onConfirm={executeDelete}
/>
