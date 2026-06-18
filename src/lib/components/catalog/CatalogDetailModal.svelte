<script lang="ts">

	import type { IngredientMasterDTO, OtherItemMasterDTO, StockTransaction } from '$lib/types/recipe';

	import { batchStockPackages, catalogBatchPriceTag } from '$lib/utils/catalogBatch';

	import { formatCatalogDateShort } from '$lib/utils/catalogDisplay';

	import { formatPhp } from '$lib/utils/numberFormat';



	type Row = IngredientMasterDTO | OtherItemMasterDTO;



	const {

		open = false,

		row,

		itemLabel = 'Item',

		accent = 'emerald',

		onClose,

		onAddStock,

		onDeductStock,

		onEdit,

		onDelete

	}: {

		open?: boolean;

		row: Row | null;

		itemLabel?: string;

		accent?: 'emerald' | 'sky';

		onClose: () => void;

		onAddStock: () => void;

		onDeductStock: () => void;

		onEdit: () => void;

		onDelete: () => void;

	} = $props();



	let backdrop: HTMLDivElement | undefined = $state();

	let logSearch = $state('');

	let logType = $state<'all' | 'receive' | 'deduct' | 'adjust'>('all');



	const accentCost = accent === 'sky' ? 'text-sky-700' : 'text-emerald-700';

	const accentBtn = accent === 'sky' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500';

	const accentRing = accent === 'sky' ? 'ring-sky-200' : 'ring-emerald-200';

	const accentBadge = accent === 'sky' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800';



	const stockPkgs = $derived(row ? batchStockPackages(row) : 0);

	const transactions = $derived.by(() => {

		if (!row?.stockTransactions?.length) return [] as StockTransaction[];

		const q = logSearch.toLowerCase().trim();

		return [...row.stockTransactions]

			.reverse()

			.filter((t) => {

				if (logType !== 'all' && t.type !== logType) return false;

				if (!q) return true;

				return (

					t.notes?.toLowerCase().includes(q) ||

					t.type.includes(q) ||

					formatCatalogDateShort(t.createdAt).toLowerCase().includes(q)

				);

			});

	});



	function onBackdropMouseDown(ev: MouseEvent): void {

		if (ev.target === backdrop) onClose();

	}



	function onKeydown(e: KeyboardEvent): void {

		if (e.key === 'Escape') onClose();

	}



	function txnAdded(t: StockTransaction): string {

		return t.type === 'receive' ? `+${t.quantity}` : '—';

	}



	function txnDeducted(t: StockTransaction): string {

		return t.type === 'deduct' ? `−${t.quantity}` : '—';

	}

</script>



<svelte:window onkeydown={open ? onKeydown : undefined} />



{#if open && row}

	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->

	<div

		bind:this={backdrop}

		class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/50 p-4 backdrop-blur-sm sm:items-center"

		onmousedown={onBackdropMouseDown}

		role="dialog"

		aria-modal="true"

		tabindex="-1"

	>

		<div class="flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">

			<div class="border-b border-zinc-100 px-6 py-5">

				<div class="flex items-start justify-between gap-3">

					<div class="min-w-0">

						<p class="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{itemLabel} batch</p>

						<h2 class="mt-0.5 truncate text-xl font-bold text-zinc-900">{row.name}</h2>

						<div class="mt-1.5 flex flex-wrap items-center gap-1.5">

							<span class="rounded-md px-2 py-0.5 text-xs font-bold {accentBadge}">{catalogBatchPriceTag(row)}</span>

							<span class="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">{row.supplier}</span>

							<span class="rounded-md bg-zinc-900 px-2 py-0.5 text-xs font-bold text-white">{stockPkgs} pkg on hand</span>

						</div>

					</div>

					<button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 hover:bg-zinc-50" onclick={onClose} aria-label="Close">×</button>

				</div>



				<dl class="mt-4 grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">

					<div class="rounded-xl bg-zinc-50 px-2 py-2 ring-1 {accentRing}">

						<dt class="text-[9px] font-bold uppercase text-zinc-400">Price</dt>

						<dd class="font-bold tabular-nums text-zinc-900">{formatPhp(row.packagePrice)}</dd>

					</div>

					<div class="rounded-xl bg-zinc-50 px-2 py-2">

						<dt class="text-[9px] font-bold uppercase text-zinc-400">Size</dt>

						<dd class="font-semibold tabular-nums text-zinc-800">{row.packageSize}</dd>

					</div>

					<div class="rounded-xl bg-zinc-50 px-2 py-2">

						<dt class="text-[9px] font-bold uppercase text-zinc-400">Unit</dt>

						<dd class="font-bold uppercase text-zinc-500">{row.packageUnit}</dd>

					</div>

					<div class="rounded-xl bg-zinc-50 px-2 py-2">

						<dt class="text-[9px] font-bold uppercase text-zinc-400">Ship</dt>

						<dd class="font-semibold tabular-nums text-zinc-600">{row.shippingFee === 0 ? '—' : formatPhp(row.shippingFee)}</dd>

					</div>

					<div class="col-span-2 rounded-xl bg-zinc-50 px-2 py-2 sm:col-span-2">

						<dt class="text-[9px] font-bold uppercase text-zinc-400">Unit cost</dt>

						<dd class="font-bold tabular-nums {accentCost}">{formatPhp(row.unitCost)}<span class="text-[10px] font-normal text-zinc-400"> /{row.baseUnit}</span></dd>

					</div>

				</dl>

			</div>



			<div class="min-h-0 flex-1 overflow-y-auto px-6 py-4">

				<div class="flex flex-wrap items-center justify-between gap-2">

					<h3 class="text-xs font-bold uppercase tracking-wider text-zinc-500">Stock movement log</h3>

					<div class="flex flex-wrap gap-1.5">

						<input

							type="search"

							bind:value={logSearch}

							placeholder="Search log…"

							class="rounded-lg border border-zinc-200 px-2 py-1 text-xs"

						/>

						<select bind:value={logType} class="rounded-lg border border-zinc-200 px-2 py-1 text-xs">

							<option value="all">All</option>

							<option value="receive">Added</option>

							<option value="deduct">Deducted</option>

							<option value="adjust">Adjusted</option>

						</select>

					</div>

				</div>

				<p class="mt-0.5 text-[10px] text-zinc-400">Same name + same price merges · different prices stay separate batches</p>



				{#if transactions.length === 0}

					<p class="mt-4 rounded-xl bg-zinc-50 py-8 text-center text-sm text-zinc-500">No log entries yet. Use + Add stock to record purchases.</p>

				{:else}

					<div class="mt-3 overflow-x-auto rounded-xl border border-zinc-100">

						<table class="w-full min-w-[32rem] text-left text-xs">

							<thead class="bg-zinc-50 text-[10px] font-bold uppercase tracking-wide text-zinc-500">

								<tr>

									<th class="px-3 py-2">Date</th>

									<th class="px-3 py-2">Batch ₱</th>

									<th class="px-3 py-2 text-right">Added</th>

									<th class="px-3 py-2 text-right">Deducted</th>

									<th class="px-3 py-2 text-right">Stock</th>

									<th class="px-3 py-2">Notes</th>

								</tr>

							</thead>

							<tbody class="divide-y divide-zinc-100">

								{#each transactions as t (t.id)}

									<tr class="hover:bg-zinc-50/80">

										<td class="px-3 py-2 tabular-nums text-zinc-700">{formatCatalogDateShort(t.createdAt)}</td>

										<td class="px-3 py-2 font-semibold tabular-nums text-zinc-900">{formatPhp(row.packagePrice)}</td>

										<td class="px-3 py-2 text-right font-semibold tabular-nums text-emerald-700">{txnAdded(t)}</td>

										<td class="px-3 py-2 text-right font-semibold tabular-nums text-red-600">{txnDeducted(t)}</td>

										<td class="px-3 py-2 text-right font-bold tabular-nums text-zinc-900">{t.stockAfter}</td>

										<td class="max-w-[8rem] truncate px-3 py-2 text-zinc-500" title={t.notes}>{t.notes ?? '—'}</td>

									</tr>

								{/each}

							</tbody>

						</table>

					</div>

				{/if}

			</div>



			<div class="flex flex-wrap gap-2 border-t border-zinc-100 px-6 py-4">

				<button type="button" class="rounded-xl px-4 py-2 text-xs font-bold text-white {accentBtn}" onclick={onAddStock}>+ Add stock</button>

				<button type="button" class="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" onclick={onDeductStock}>− Deduct stock</button>

				<button type="button" class="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50" onclick={onEdit}>Edit</button>

				<button type="button" class="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50" onclick={onDelete}>Delete</button>

			</div>

		</div>

	</div>

{/if}


