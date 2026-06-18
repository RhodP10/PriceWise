<script lang="ts">
	import type { IngredientMasterDTO, OtherItemMasterDTO } from '$lib/types/recipe';
	import { batchStockPackages, catalogBatchPriceTag } from '$lib/utils/catalogBatch';
	import { formatPhp } from '$lib/utils/numberFormat';

	type Row = IngredientMasterDTO | OtherItemMasterDTO;

	const {
		rows,
		accent = 'emerald',
		onSelect,
		onAddStock
	}: {
		rows: Row[];
		accent?: 'emerald' | 'sky';
		onSelect: (row: Row) => void;
		onAddStock: (row: Row, ev: MouseEvent) => void;
	} = $props();

	const accentRing = accent === 'sky' ? 'ring-sky-200 hover:ring-sky-300' : 'ring-emerald-200 hover:ring-emerald-300';
	const accentCost = accent === 'sky' ? 'text-sky-700' : 'text-emerald-700';
	const accentBtn = accent === 'sky' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500';
</script>

<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
	{#each rows as row (row.id)}
		<div class="glass flex flex-col rounded-2xl p-4 shadow-md ring-1 {accentRing}">
			<button type="button" class="flex flex-1 flex-col text-left" onclick={() => onSelect(row)}>
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-1.5">
							<h3 class="truncate font-bold text-zinc-900" title={row.name}>{row.name}</h3>
							<span class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold {accent === 'sky' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}">{catalogBatchPriceTag(row)}</span>
						</div>
						<span class="mt-1 inline-block max-w-full truncate rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-200/50" title={row.supplier}>{row.supplier}</span>
					</div>
					<span class="shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-[10px] font-bold text-white tabular-nums">{batchStockPackages(row)} pkg</span>
					{#if row.marketplaceSourcingLocalOnly}
						<span class="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-800">Local-only</span>
					{/if}
				</div>

				<dl class="mt-4 grid grid-cols-3 gap-2 text-xs">
					<div>
						<dt class="text-[9px] font-bold uppercase text-zinc-400">Price</dt>
						<dd class="font-bold tabular-nums text-zinc-900">{formatPhp(row.packagePrice)}</dd>
					</div>
					<div>
						<dt class="text-[9px] font-bold uppercase text-zinc-400">Size</dt>
						<dd class="font-semibold tabular-nums text-zinc-700">{row.packageSize}</dd>
					</div>
					<div>
						<dt class="text-[9px] font-bold uppercase text-zinc-400">Unit</dt>
						<dd class="font-bold uppercase text-zinc-400">{row.packageUnit}</dd>
					</div>
					<div>
						<dt class="text-[9px] font-bold uppercase text-zinc-400">Ship</dt>
						<dd class="font-semibold tabular-nums text-zinc-500">{row.shippingFee === 0 ? '—' : formatPhp(row.shippingFee)}</dd>
					</div>
					<div class="col-span-2">
						<dt class="text-[9px] font-bold uppercase text-zinc-400">Cost</dt>
						<dd class="font-bold tabular-nums {accentCost}">{formatPhp(row.unitCost)}<span class="text-[10px] font-normal text-zinc-400"> /{row.baseUnit}</span></dd>
					</div>
				</dl>

				<p class="mt-3 text-[10px] text-zinc-400">Tap for stock log · recipes use this batch price</p>
			</button>

			<button type="button" class="mt-3 w-full rounded-xl py-2 text-xs font-bold text-white {accentBtn}" onclick={(ev) => onAddStock(row, ev)}>
				+ Add stock
			</button>
		</div>
	{/each}
</div>

