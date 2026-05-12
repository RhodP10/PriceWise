<script lang="ts">
	import AddOtherMasterModal from '$lib/components/recipes/AddOtherMasterModal.svelte';
	import ChannelScrapeHelpModal from '$lib/components/catalog/ChannelScrapeHelpModal.svelte';
	import MarketplaceCatalogTable from '$lib/components/catalog/MarketplaceCatalogTable.svelte';
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import { MEASURE_UNIT_OPTIONS } from '$lib/state/ingredientCatalog.svelte';
	import { computeUnitCost, toBaseQuantity } from '$lib/utils/baseUnitCost';
	import {
		deleteOtherMaster,
		otherCatalog,
		updateOtherMaster
	} from '$lib/state/otherCatalog.svelte';
	import type { ChannelMarketplace, MeasureUnit, OtherItemMasterDTO } from '$lib/types/recipe';

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
		otherCatalog.items.filter((row) => {
			const q = search.toLowerCase().trim();
			if (!q) return true;
			return row.name.toLowerCase().includes(q) || row.supplier.toLowerCase().includes(q);
		})
	);

	let editingId = $state<string | null>(null);
	let draft = $state<Partial<OtherItemMasterDTO>>({});

	function startEdit(row: OtherItemMasterDTO): void {
		editingId = row.id;
		draft = { ...row };
	}

	function saveEdit(): void {
		if (!editingId) return;
		updateOtherMaster(editingId, {
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

	function openScrapeHelp(row: OtherItemMasterDTO): void {
		if (activeTab === 'local') return;
		scrapeRowId = row.id;
		scrapeInitialUrl = row.channelScrape?.[activeTab]?.url ?? '';
		scrapeOpen = true;
	}

	function saveScrapeHint(url: string): void {
		if (!scrapeRowId || activeTab === 'local') return;
		const market = activeTab as ChannelMarketplace;
		const ts = new Date().toISOString();
		updateOtherMaster(scrapeRowId, {
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

	function markScrapeDone(row: OtherItemMasterDTO): void {
		if (activeTab === 'local') return;
		const ch = activeTab as ChannelMarketplace;
		const ts = new Date().toISOString();
		updateOtherMaster(row.id, {
			channelScrape: {
				[ch]: {
					...row.channelScrape?.[ch],
					status: 'complete',
					updatedAt: ts
				}
			}
		});
	}

	function requestDelete(row: OtherItemMasterDTO): void {
		deleteTarget = { id: row.id, name: row.name };
	}

	function executeDelete(): void {
		if (deleteTarget) deleteOtherMaster(deleteTarget.id);
		deleteTarget = null;
	}

	const channelLabel = $derived(activeTab === 'lazada' ? 'Lazada' : 'Shopee');
</script>

<section class="space-y-6">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="min-w-0 flex-1">
			<h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Others catalog</h1>
			<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
				Local: supplier grid. Lazada/Shopee: marketplace table with scrape status (no supplier column).
			</p>
		</div>
		<div class="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
			<label for="oth-search" class="sr-only">Search others</label>
			<input
				id="oth-search"
				type="search"
				bind:value={search}
				placeholder="Search name or supplier…"
				class="w-full min-w-[200px] rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/15 sm:max-w-xs dark:border-zinc-600 dark:bg-zinc-900 dark:text-white"
			/>
			<button
				type="button"
				class="shrink-0 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
				onclick={() => (addModalOpen = true)}
			>
				Add other
			</button>
		</div>
	</div>

	<div class="border-b border-zinc-200 dark:border-zinc-700">
		<nav class="-mb-px flex space-x-8" aria-label="Tabs">
			{#each tabs as tab}
				<button
					type="button"
					onclick={() => (activeTab = tab.id)}
					class="whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium {activeTab === tab.id
						? 'border-sky-500 text-sky-600'
						: 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}"
				>
					{tab.label}
				</button>
			{/each}
		</nav>
	</div>

	{#if activeTab === 'local'}
		<div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
			<table class="w-full min-w-[920px] text-left text-sm">
				<thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
					<tr>
						<th class="px-3 py-3 font-medium">Item</th>
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
				<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
					{#each filtered as row (row.id)}
						{#if editingId === row.id}
							<tr class="bg-sky-50/50 dark:bg-sky-950/25">
								<td class="px-3 py-2 align-top">
									<input bind:value={draft.name} class="w-full rounded-lg border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900" />
								</td>
								<td class="px-3 py-2 align-top">
									<input bind:value={draft.supplier} class="w-full rounded-lg border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900" />
								</td>
								<td class="px-3 py-2 align-top">
									<input
										type="number"
										min="0"
										step="any"
										bind:value={draft.packagePrice}
										class="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
									/>
								</td>
								<td class="px-3 py-2 align-top">
									<input
										type="number"
										min="0"
										step="any"
										bind:value={draft.packageSize}
										class="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
									/>
								</td>
								<td class="px-3 py-2 align-top">
									<select bind:value={draft.packageUnit} class="w-full rounded-lg border px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900">
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
										class="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-900"
									/>
								</td>
								<td class="px-3 py-2 align-top text-right text-xs text-zinc-500">Auto</td>
								<td class="px-3 py-2 align-top text-xs text-zinc-500">Auto</td>
								<td class="px-3 py-2 align-top text-right tabular-nums font-medium dark:text-sky-300">
									₱{computeUnitCost(
										draft.packagePrice ?? 0,
										draft.shippingFee ?? 0,
										toBaseQuantity(draft.packageSize ?? 0, (draft.packageUnit ?? 'piece') as MeasureUnit)
											.quantity
									).toFixed(4)}
								</td>
								<td class="px-3 py-2 align-top text-right">
									<button
										type="button"
										class="mr-2 text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
										onclick={saveEdit}
									>
										Save
									</button>
									<button type="button" class="text-xs text-zinc-600 hover:underline dark:text-zinc-400" onclick={cancelEdit}>
										Cancel
									</button>
								</td>
							</tr>
						{:else}
							<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
								<td class="px-3 py-2.5 font-medium text-zinc-900 dark:text-white">{row.name}</td>
								<td class="px-3 py-2.5 text-zinc-600 dark:text-zinc-300">{row.supplier}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">₱{row.packagePrice.toFixed(2)}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">{row.packageSize}</td>
								<td class="px-3 py-2.5">{row.packageUnit}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">₱{row.shippingFee.toFixed(2)}</td>
								<td class="px-3 py-2.5 text-right tabular-nums">{row.baseQuantity}</td>
								<td class="px-3 py-2.5">{row.baseUnit}</td>
								<td class="px-3 py-2.5 text-right tabular-nums font-medium text-sky-800 dark:text-sky-300">
									₱{row.unitCost.toFixed(4)}
								</td>
								<td class="px-3 py-2.5 text-right">
									<button
										type="button"
										class="mr-2 text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
										onclick={() => startEdit(row)}
									>
										Edit
									</button>
									<button
										type="button"
										class="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
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
			{#if otherCatalog.items.length === 0}
				<p class="py-12 text-center text-sm text-zinc-500">No items yet.</p>
			{:else if filtered.length === 0}
				<p class="py-12 text-center text-sm text-zinc-500">No matches for “{search.trim()}”.</p>
			{/if}
		</div>
	{:else}
		{#if filtered.length === 0}
			<p class="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">
				No matches for “{search.trim()}”. Try the Local tab to add items first.
			</p>
		{:else}
			<MarketplaceCatalogTable
				rows={filtered}
				channel={activeTab as ChannelMarketplace}
				channelLabel={channelLabel}
				itemHeader="Item"
				accent="sky"
				onHelpScrape={openScrapeHelp}
				onMarkDone={markScrapeDone}
				onDelete={requestDelete}
			/>
		{/if}
	{/if}
</section>

<AddOtherMasterModal bind:open={addModalOpen} />

<ChannelScrapeHelpModal
	open={scrapeOpen}
	initialUrl={scrapeInitialUrl}
	channelLabel={channelLabel}
	onSave={saveScrapeHint}
	onClose={() => (scrapeOpen = false)}
/>

<TypeToConfirmDeleteModal
	open={deleteTarget !== null}
	title="Delete item?"
	description={deleteTarget
		? `This removes “${deleteTarget.name}” from your Others catalog. Recipes referencing it may need updating.`
		: ''}
	onClose={() => (deleteTarget = null)}
	onConfirm={executeDelete}
/>
