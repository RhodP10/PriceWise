<script lang="ts">
	import type { ChannelMarketplace, IngredientMasterDTO, OtherItemMasterDTO } from '$lib/types/recipe';
	import {
		canMarkScrapeComplete,
		channelLandedPackagePeso,
		channelUnitCostFromLanded,
		resolvedMarketplaceListingColumns,
		showMarketplaceLandedPrice
	} from '$lib/utils/channelCatalogDisplay';
	import { formatRelativeTime, marketplaceStatusPresentation } from '$lib/utils/marketplaceCatalogUi';

	type Row = IngredientMasterDTO | OtherItemMasterDTO;

	const {
		rows,
		channel,
		channelLabel,
		itemHeader = 'Item',
		accent = 'emerald',
		onHelpScrape,
		onMarkDone,
		onDelete
	}: {
		rows: Row[];
		channel: ChannelMarketplace;
		channelLabel: string;
		itemHeader?: string;
		accent?: 'emerald' | 'sky';
		onHelpScrape: (row: Row) => void;
		onMarkDone: (row: Row) => void;
		onDelete: (row: Row) => void;
	} = $props();

	const linkMark = $derived(
		accent === 'sky'
			? 'text-teal-700 hover:underline dark:text-teal-400'
			: 'text-teal-700 hover:underline dark:text-teal-400'
	);
	const btnHelp = $derived(
		accent === 'sky'
			? 'border-sky-200 text-sky-800 hover:bg-sky-50 dark:border-sky-600 dark:text-sky-100 dark:hover:bg-sky-950/50'
			: 'border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-600 dark:text-emerald-100 dark:hover:bg-emerald-950/50'
	);
</script>

<div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
	<table class="w-full min-w-[1180px] text-left text-sm">
		<thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
			<tr>
				<th class="px-3 py-3 font-medium">{itemHeader}</th>
				<th class="px-3 py-3 font-medium">Scrape status</th>
				<th class="px-3 py-3 font-medium text-right">{channelLabel} pkg ₱</th>
				<th class="px-3 py-3 font-medium text-right">Pkg size</th>
				<th class="px-3 py-3 font-medium">Pkg unit</th>
				<th class="px-3 py-3 font-medium text-right">Ship ₱</th>
				<th class="px-3 py-3 font-medium text-right">Base qty</th>
				<th class="px-3 py-3 font-medium">Base unit</th>
				<th class="px-3 py-3 font-medium text-right">{channelLabel} unit ₱</th>
				<th class="px-3 py-3 font-medium text-center">Help scrape</th>
				<th class="px-3 py-3 font-medium text-right">Actions</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
			{#each rows as row (row.id)}
				{@const ui = marketplaceStatusPresentation(row, channel)}
				{@const pkg = channelLandedPackagePeso(row, channel)}
				{@const chUnit = channelUnitCostFromLanded(row, channel)}
				{@const dims = resolvedMarketplaceListingColumns(row, channel)}
				{@const meta = row.channelScrape?.[channel]}
				{@const updatedLine = meta?.updatedAt ? formatRelativeTime(meta.updatedAt) : ''}
				<tr class="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
					<td class="px-3 py-2.5 font-medium text-zinc-900 dark:text-white">{row.name}</td>
					<td class="px-3 py-2.5 align-top">
						<div class="flex max-w-[200px] flex-col gap-1">
							<span
								class="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 {ui.badgeClass}"
							>
								{ui.shortLabel}
							</span>
							<span class="text-[11px] leading-snug text-zinc-500 dark:text-zinc-400">{ui.description}</span>
							{#if updatedLine}
								<span class="text-[10px] text-zinc-400">{updatedLine}</span>
							{/if}
						</div>
					</td>
					<td class="px-3 py-2.5 text-right tabular-nums">
						{#if showMarketplaceLandedPrice(row, channel) && pkg !== null}
							₱{pkg.toFixed(2)}
						{:else}
							<span class="text-zinc-400">—</span>
						{/if}
					</td>
					<td class="px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
						{#if dims}{dims.packageSize}{:else}<span class="text-zinc-400">—</span>{/if}
					</td>
					<td class="px-3 py-2.5 text-zinc-600 dark:text-zinc-300">
						{#if dims}{dims.packageUnit}{:else}<span class="text-zinc-400">—</span>{/if}
					</td>
					<td class="px-3 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-300">
						{#if dims}₱{dims.shippingFee.toFixed(2)}{:else}<span class="text-zinc-400">—</span>{/if}
					</td>
					<td class="px-3 py-2.5 text-right tabular-nums">
						{#if dims}{dims.baseQuantity}{:else}<span class="text-zinc-400">—</span>{/if}
					</td>
					<td class="px-3 py-2.5">
						{#if dims}{dims.baseUnit}{:else}<span class="text-zinc-400">—</span>{/if}
					</td>
					<td class="px-3 py-2.5 text-right tabular-nums font-medium text-emerald-800 dark:text-emerald-300">
						{#if showMarketplaceLandedPrice(row, channel) && chUnit !== null}
							₱{chUnit.toFixed(4)}
						{:else}
							<span class="font-normal text-zinc-400">—</span>
						{/if}
					</td>
					<td class="px-3 py-2.5 text-center align-middle">
						<button
							type="button"
							class="inline-flex rounded-lg border bg-white px-2.5 py-1.5 text-xs font-semibold shadow-sm dark:bg-zinc-900 {btnHelp}"
							onclick={() => onHelpScrape(row)}
						>
							Help scrape
						</button>
					</td>
					<td class="px-3 py-2.5 text-right align-top">
						<div class="flex flex-col items-end gap-2">
							{#if canMarkScrapeComplete(row, channel)}
								<button
									type="button"
									class="text-xs font-medium {linkMark}"
									onclick={() => onMarkDone(row)}
								>
									Mark scrape done
								</button>
							{/if}
							<button
								type="button"
								class="text-xs font-medium text-red-600 hover:underline dark:text-red-400"
								onclick={() => onDelete(row)}
							>
								Delete
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
	{#if rows.length === 0}
		<p class="py-12 text-center text-sm text-zinc-500 dark:text-zinc-400">No rows in this view.</p>
	{/if}
</div>
