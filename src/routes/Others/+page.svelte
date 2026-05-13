<script lang="ts">
	import AddOtherMasterModal from '$lib/components/recipes/AddOtherMasterModal.svelte';
	import ChannelScrapeHelpModal from '$lib/components/catalog/ChannelScrapeHelpModal.svelte';
	import MarketplaceCatalogTable from '$lib/components/catalog/MarketplaceCatalogTable.svelte';
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import { scrapeMarketplaceFromBrowser } from '$lib/api/marketplaceScrapeClient';
	import { MEASURE_UNIT_OPTIONS } from '$lib/state/ingredientCatalog.svelte';
	import { computeUnitCost, toBaseQuantity } from '$lib/utils/baseUnitCost';
	import {
		deleteOtherMaster,
		getOtherMaster,
		otherCatalog,
		updateOtherMaster
	} from '$lib/state/otherCatalog.svelte';
	import {
		parseLazadaProductJson,
		parseShopeeItemGetJson,
		type MarketplaceImportPatch,
		type MarketplaceListingSubmitResult
	} from '$lib/utils/marketplaceJsonImport';
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
	let scrapeChannel = $state<ChannelMarketplace>('lazada');

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
		scrapeChannel = activeTab as ChannelMarketplace;
		scrapeRowId = row.id;
		scrapeInitialUrl = row.channelScrape?.[activeTab]?.url ?? '';
		scrapeOpen = true;
	}

	function applyMarketplaceImport(patch: MarketplaceImportPatch, listingUrl: string): void {
		if (!scrapeRowId) return;
		const m = getOtherMaster(scrapeRowId);
		if (!m) return;
		const ch = scrapeChannel;
		const ts = new Date().toISOString();
		const urlToSave = listingUrl.trim() || m.channelScrape?.[ch]?.url;
		updateOtherMaster(scrapeRowId, {
			supplierChannelLanded: patch.supplierChannelLanded,
			channelScrape: {
				[ch]: {
					status: 'complete',
					url: urlToSave,
					updatedAt: ts,
					listingPackageSize: patch.listingPackageSize,
					listingPackageUnit: patch.listingPackageUnit,
					listingShippingFee: patch.listingShippingFee,
					listingBaseQuantity: patch.listingBaseQuantity,
					listingBaseUnit: patch.listingBaseUnit
				}
			}
		});
		scrapeRowId = null;
		scrapeInitialUrl = '';
	}

	async function submitListingUrl(url: string): Promise<MarketplaceListingSubmitResult> {
		if (!scrapeRowId) return { kind: 'error', message: 'No catalog row selected.' };
		const id = scrapeRowId;
		const market = scrapeChannel;
		const ts = new Date().toISOString();

		if (!url.trim()) {
			updateOtherMaster(id, {
				channelScrape: {
					[market]: { url: undefined, status: 'idle', updatedAt: ts }
				}
			});
			scrapeRowId = null;
			scrapeInitialUrl = '';
			return { kind: 'success' };
		}

		updateOtherMaster(id, {
			channelScrape: {
				[market]: { url, status: 'scraping', updatedAt: ts }
			}
		});

		const row = getOtherMaster(id);
		if (!row) {
			return { kind: 'error', message: 'This item was removed from the catalog.' };
		}

		try {
			const scrape = await scrapeMarketplaceFromBrowser(url, market);
			if (!scrape.ok) {
				updateOtherMaster(id, {
					channelScrape: {
						[market]: { url, status: 'error', updatedAt: new Date().toISOString() }
					}
				});
				return { kind: 'error', message: scrape.error };
			}

			if (market === 'shopee') {
				const sp = parseShopeeItemGetJson(scrape.bodyJson, row);
				if (!sp.ok) {
					if (sp.needVariant === true) {
						return {
							kind: 'shopee_variants',
							variants: sp.variants,
							bodyJson: scrape.bodyJson
						};
					}
					updateOtherMaster(id, {
						channelScrape: {
							[market]: { url, status: 'error', updatedAt: new Date().toISOString() }
						}
					});
					return { kind: 'error', message: sp.error };
				}
				const ts2 = new Date().toISOString();
				updateOtherMaster(id, {
					supplierChannelLanded: sp.patch.supplierChannelLanded,
					channelScrape: {
						[market]: {
							status: 'complete',
							url,
							updatedAt: ts2,
							listingPackageSize: sp.patch.listingPackageSize,
							listingPackageUnit: sp.patch.listingPackageUnit,
							listingShippingFee: sp.patch.listingShippingFee,
							listingBaseQuantity: sp.patch.listingBaseQuantity,
							listingBaseUnit: sp.patch.listingBaseUnit
						}
					}
				});
				scrapeRowId = null;
				scrapeInitialUrl = '';
				return { kind: 'success' };
			}

			const lp = parseLazadaProductJson(scrape.bodyJson, row);
			if (!lp.ok) {
				updateOtherMaster(id, {
					channelScrape: {
						[market]: { url, status: 'error', updatedAt: new Date().toISOString() }
					}
				});
				return { kind: 'error', message: lp.error };
			}

			const ts2 = new Date().toISOString();
			updateOtherMaster(id, {
				supplierChannelLanded: lp.patch.supplierChannelLanded,
				channelScrape: {
					[market]: {
						status: 'complete',
						url,
						updatedAt: ts2,
						listingPackageSize: lp.patch.listingPackageSize,
						listingPackageUnit: lp.patch.listingPackageUnit,
						listingShippingFee: lp.patch.listingShippingFee,
						listingBaseQuantity: lp.patch.listingBaseQuantity,
						listingBaseUnit: lp.patch.listingBaseUnit
					}
				}
			});
			scrapeRowId = null;
			scrapeInitialUrl = '';
			return { kind: 'success' };
		} catch (e) {
			updateOtherMaster(id, {
				channelScrape: {
					[market]: {
						url,
						status: 'error',
						updatedAt: new Date().toISOString()
					}
				}
			});
			return {
				kind: 'error',
				message: e instanceof Error ? e.message : 'Sync failed.'
			};
		}
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

<section class="animate-in space-y-8">
	<!-- Premium Header Section -->
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl"></div>

		<div class="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-2">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
					Others <span class="text-sky-400">Catalog</span>
				</h1>
				<p class="max-w-2xl text-lg text-zinc-400">
					Manage packaging, disposable items, and other non-ingredient components of your recipes.
				</p>
			</div>

			<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div class="relative">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						id="oth-search"
						type="search"
						bind:value={search}
						placeholder="Search name or supplier…"
						class="w-full min-w-[280px] rounded-2xl border-none bg-zinc-800/50 py-3 pl-10 pr-4 text-white placeholder-zinc-500 ring-1 ring-white/10 transition-all focus:bg-zinc-800 focus:ring-2 focus:ring-sky-500 sm:max-w-xs"
					/>
				</div>
				<button
					type="button"
					class="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-500 hover:-translate-y-0.5"
					onclick={() => (addModalOpen = true)}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-circle"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
					Add Item
				</button>
			</div>
		</div>
	</div>

	<!-- Modern Segmented Tabs -->
	<div class="flex justify-center">
		<div class="inline-flex rounded-2xl bg-zinc-100 p-1.5 shadow-inner">
			{#each tabs as tab}
				<button
					type="button"
					onclick={() => (activeTab = tab.id)}
					class="relative px-8 py-2.5 text-sm font-bold transition-all {activeTab === tab.id
						? 'rounded-xl bg-white text-zinc-900 shadow-md'
						: 'text-zinc-500 hover:text-zinc-700'}"
				>
					{tab.label}
					{#if activeTab === tab.id}
						<div class="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-500"></div>
					{/if}
				</button>
			{/each}
		</div>
	</div>

	{#if activeTab === 'local'}
		<div class="glass overflow-hidden rounded-3xl shadow-xl transition-all">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[1000px] text-left text-sm">
					<thead>
						<tr class="border-b border-zinc-200/50 bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
							<th class="px-6 py-4">Item</th>
							<th class="px-6 py-4">Supplier</th>
							<th class="px-6 py-4 text-right">Pkg Price</th>
							<th class="px-6 py-4 text-right">Size</th>
							<th class="px-6 py-4">Unit</th>
							<th class="px-6 py-4 text-right">Ship Fee</th>
							<th class="px-6 py-4 text-right">Unit Cost</th>
							<th class="px-6 py-4 text-right">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-zinc-100/50">
						{#each filtered as row (row.id)}
							{#if editingId === row.id}
								<tr class="bg-sky-50/30 transition-colors">
									<td class="px-6 py-4">
										<input bind:value={draft.name} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
									</td>
									<td class="px-6 py-4">
										<input bind:value={draft.supplier} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
									</td>
									<td class="px-6 py-4">
										<input type="number" step="any" bind:value={draft.packagePrice} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-right text-sm tabular-nums focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
									</td>
									<td class="px-6 py-4">
										<input type="number" step="any" bind:value={draft.packageSize} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-right text-sm tabular-nums focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
									</td>
									<td class="px-6 py-4">
										<select bind:value={draft.packageUnit} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10">
											{#each MEASURE_UNIT_OPTIONS as u}
												<option value={u.value}>{u.label}</option>
											{/each}
										</select>
									</td>
									<td class="px-6 py-4">
										<input type="number" step="any" bind:value={draft.shippingFee} class="w-full rounded-xl border-zinc-200 bg-white px-3 py-2 text-right text-sm tabular-nums focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
									</td>
									<td class="px-6 py-4 text-right">
										<span class="font-bold text-sky-600">
											₱{computeUnitCost(
												draft.packagePrice ?? 0,
												draft.shippingFee ?? 0,
												toBaseQuantity(draft.packageSize ?? 0, (draft.packageUnit ?? 'piece') as MeasureUnit).quantity
											).toFixed(4)}
										</span>
									</td>
									<td class="px-6 py-4 text-right">
										<div class="flex justify-end gap-2">
											<button onclick={saveEdit} class="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-sky-500">Save</button>
											<button onclick={cancelEdit} class="rounded-lg bg-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-300">Cancel</button>
										</div>
									</td>
								</tr>
							{:else}
								<tr class="group transition-colors hover:bg-zinc-50/50">
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
											</div>
											<span class="font-semibold text-zinc-900">{row.name}</span>
										</div>
									</td>
									<td class="px-6 py-4 text-zinc-600">
										<span class="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200/50">{row.supplier}</span>
									</td>
									<td class="px-6 py-4 text-right font-medium tabular-nums text-zinc-900">₱{row.packagePrice.toFixed(2)}</td>
									<td class="px-6 py-4 text-right tabular-nums text-zinc-600">{row.packageSize}</td>
									<td class="px-6 py-4">
										<span class="text-xs font-bold uppercase text-zinc-400">{row.packageUnit}</span>
									</td>
									<td class="px-6 py-4 text-right tabular-nums text-zinc-500">₱{row.shippingFee.toFixed(2)}</td>
									<td class="px-6 py-4 text-right">
										<div class="flex flex-col items-end">
											<span class="font-bold text-sky-700">₱{row.unitCost.toFixed(4)}</span>
											<span class="text-[10px] text-zinc-400">per {row.baseUnit}</span>
										</div>
									</td>
									<td class="px-6 py-4 text-right">
										<div class="flex justify-end gap-1">
											<button
												type="button"
												class="rounded-lg p-2 text-zinc-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
												onclick={() => startEdit(row)}
												title="Edit item"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit-2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
											</button>
											<button
												type="button"
												class="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
												onclick={() => requestDelete(row)}
												title="Delete item"
											>
												<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
											</button>
										</div>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>

			{#if otherCatalog.items.length === 0}
				<div class="flex flex-col items-center justify-center py-20 text-center">
					<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 shadow-inner">
						<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-300"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
					</div>
					<h3 class="text-lg font-bold text-zinc-900">No items yet</h3>
					<p class="mt-1 text-sm text-zinc-500">Add packaging or other supplies to your catalog.</p>
					<button
						onclick={() => (addModalOpen = true)}
						class="mt-6 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
					>
						Add Your First Item
					</button>
				</div>
			{:else if filtered.length === 0}
				<div class="flex flex-col items-center justify-center py-20 text-center">
					<p class="text-lg font-medium text-zinc-900">No matches for “{search.trim()}”</p>
					<p class="text-sm text-zinc-500">Try adjusting your search terms.</p>
				</div>
			{/if}
		</div>
	{:else}
		{#if filtered.length === 0}
			<p class="py-12 text-center text-sm text-zinc-500">
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
	marketplace={scrapeChannel}
	channelLabel={scrapeChannel === 'lazada' ? 'Lazada' : 'Shopee'}
	localRow={scrapeRowId ? (getOtherMaster(scrapeRowId) ?? null) : null}
	onSubmitListing={submitListingUrl}
	onApplyImport={applyMarketplaceImport}
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
