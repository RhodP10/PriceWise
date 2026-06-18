<script lang="ts">
	import { onMount } from 'svelte';
	import type { MeasureUnit } from '$lib/types/recipe';
	import type { LocalStoreProductCategory, LocalStoreProductDTO } from '$lib/types/localStore';
	import { authState } from '$lib/state/auth.svelte';
	import {
		createSupplierProduct,
		deleteSupplierProduct,
		getSupplierStore,
		updateSupplierProduct
	} from '$lib/api/localStoreClient';
	import { MEASURE_UNIT_OPTIONS, computeCatalogUnitCost } from '$lib/state/ingredientCatalog.svelte';
	import { toBaseQuantity } from '$lib/utils/baseUnitCost';
	import { formatPhp } from '$lib/utils/numberFormat';

	let products = $state<LocalStoreProductDTO[]>([]);
	let loading = $state(true);
	let error = $state('');
	let formOpen = $state(false);
	let editingId = $state<number | null>(null);

	let name = $state('');
	let category = $state<LocalStoreProductCategory>('ingredient');
	let packagePrice = $state(0);
	let packageSize = $state(1);
	let packageUnit = $state<MeasureUnit>('kg');
	let shippingFee = $state(0);
	let notes = $state('');
	let imageUrl = $state('');
	let isAvailable = $state(true);
	let saving = $state(false);

	const previewBase = $derived(toBaseQuantity(packageSize, packageUnit));
	const previewUnitCost = $derived(
		computeCatalogUnitCost({ packagePrice, packageSize, packageUnit, shippingFee })
	);

	function resetForm(): void {
		name = '';
		category = 'ingredient';
		packagePrice = 0;
		packageSize = 1;
		packageUnit = 'kg';
		shippingFee = 0;
		notes = '';
		imageUrl = '';
		isAvailable = true;
		editingId = null;
	}

	function openAdd(): void {
		resetForm();
		formOpen = true;
	}

	function openEdit(p: LocalStoreProductDTO): void {
		editingId = p.id;
		name = p.name;
		category = p.category;
		packagePrice = p.packagePrice;
		packageSize = p.packageSize;
		packageUnit = p.packageUnit;
		shippingFee = p.shippingFee;
		notes = p.notes;
		imageUrl = p.imageUrl ?? '';
		isAvailable = p.isAvailable;
		formOpen = true;
	}

	async function loadProducts(): Promise<void> {
		const token = authState.token;
		if (!token) return;
		loading = true;
		error = '';
		try {
			const store = await getSupplierStore(token);
			products = store.products;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load products';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		void loadProducts();
	});

	async function saveProduct(e: Event): Promise<void> {
		e.preventDefault();
		if (!name.trim()) return;
		const token = authState.token;
		if (!token) return;
		saving = true;
		error = '';
		const payload = {
			name: name.trim(),
			category,
			packagePrice,
			packageSize,
			packageUnit,
			shippingFee,
			baseQuantity: previewBase.quantity,
			baseUnit: previewBase.unit,
			unitCost: previewUnitCost,
			notes: notes.trim(),
			imageUrl: imageUrl.trim(),
			isAvailable
		};
		try {
			if (editingId !== null) {
				await updateSupplierProduct(token, editingId, payload);
			} else {
				await createSupplierProduct(token, payload);
			}
			formOpen = false;
			resetForm();
			await loadProducts();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}

	async function removeProduct(id: number): Promise<void> {
		const token = authState.token;
		if (!token) return;
		if (!confirm('Remove this product from your store?')) return;
		try {
			await deleteSupplierProduct(token, id);
			await loadProducts();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Delete failed';
		}
	}

	async function toggleAvailable(p: LocalStoreProductDTO): Promise<void> {
		const token = authState.token;
		if (!token) return;
		try {
			await updateSupplierProduct(token, p.id, { isAvailable: !p.isAvailable });
			await loadProducts();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Update failed';
		}
	}
</script>

<section class="animate-in space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold text-zinc-900">My products</h1>
			<p class="mt-1 text-sm text-zinc-500">Set today's local market prices for cafe owners to import.</p>
		</div>
		<button
			type="button"
			class="rounded-2xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-amber-500"
			onclick={openAdd}
		>
			Add product
		</button>
	</div>

	{#if error}
		<p class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
	{/if}

	{#if formOpen}
		<form
			class="glass space-y-4 rounded-3xl border border-amber-100 p-6 shadow-xl"
			onsubmit={saveProduct}
		>
			<h2 class="text-lg font-bold text-zinc-900">{editingId ? 'Edit product' : 'New product'}</h2>
			<div class="grid gap-4 sm:grid-cols-2">
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-name">Name</label>
					<input id="sp-name" bind:value={name} required class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
				</div>
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-cat">Catalog type</label>
					<select id="sp-cat" bind:value={category} class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm">
						<option value="ingredient">Ingredient</option>
						<option value="other">Other / packaging</option>
					</select>
				</div>
			</div>
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-price">Package price (₱)</label>
					<input id="sp-price" type="number" min="0" step="any" bind:value={packagePrice} class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
				</div>
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-size">Package size</label>
					<input id="sp-size" type="number" min="0" step="any" bind:value={packageSize} class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
				</div>
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-unit">Unit</label>
					<select id="sp-unit" bind:value={packageUnit} class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm">
						{#each MEASURE_UNIT_OPTIONS as u}
							<option value={u.value}>{u.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-ship">Shipping (₱)</label>
					<input id="sp-ship" type="number" min="0" step="any" bind:value={shippingFee} class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
				</div>
			</div>
			<div>
				<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-notes">Notes (optional)</label>
				<input id="sp-notes" bind:value={notes} placeholder="e.g. Fresh stock, min order 5 kg" class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
			</div>
			<div>
				<label class="text-xs font-semibold uppercase text-zinc-500" for="sp-image">Product image URL (optional)</label>
				<input id="sp-image" bind:value={imageUrl} type="url" placeholder="https://…" class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
				<p class="mt-1 text-[10px] text-zinc-400">Shown on Local Store product cards. Use a direct image link.</p>
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={isAvailable} class="rounded border-zinc-300" />
				Available on Local Store today
			</label>
			<div class="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-950">
				Unit cost: <strong class="tabular-nums">{formatPhp(previewUnitCost)}</strong> / {previewBase.unit}
			</div>
			<div class="flex gap-2">
				<button type="submit" disabled={saving} class="rounded-xl bg-amber-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-60">
					{saving ? 'Saving…' : 'Save product'}
				</button>
				<button type="button" class="rounded-xl border border-zinc-200 px-5 py-2 text-sm font-semibold" onclick={() => { formOpen = false; resetForm(); }}>
					Cancel
				</button>
			</div>
		</form>
	{/if}

	<div class="glass overflow-hidden rounded-3xl shadow-xl">
		{#if loading}
			<p class="py-12 text-center text-sm text-zinc-500">Loading…</p>
		{:else if products.length === 0}
			<p class="py-12 text-center text-sm text-zinc-500">No products yet. Add your first listing above.</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead>
					<tr class="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
						<th class="px-4 py-3">Product</th>
						<th class="px-4 py-3">Type</th>
						<th class="px-4 py-3 text-right">Pkg ₱</th>
						<th class="px-4 py-3 text-right">Unit ₱</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3 text-right">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-100">
					{#each products as p (p.id)}
						<tr class="hover:bg-zinc-50/50">
							<td class="px-4 py-3 font-semibold text-zinc-900">{p.name}</td>
							<td class="px-4 py-3 capitalize text-zinc-600">{p.category}</td>
							<td class="px-4 py-3 text-right tabular-nums">{formatPhp(p.packagePrice)}</td>
							<td class="px-4 py-3 text-right font-bold tabular-nums text-amber-800">{formatPhp(p.unitCost)}</td>
							<td class="px-4 py-3">
								<button
									type="button"
									class="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {p.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'}"
									onclick={() => toggleAvailable(p)}
								>
									{p.isAvailable ? 'Available' : 'Hidden'}
								</button>
							</td>
							<td class="px-4 py-3 text-right">
								<button type="button" class="mr-2 text-xs font-semibold text-amber-700 hover:underline" onclick={() => openEdit(p)}>Edit</button>
								<button type="button" class="text-xs font-semibold text-red-600 hover:underline" onclick={() => removeProduct(p.id)}>Delete</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</section>
