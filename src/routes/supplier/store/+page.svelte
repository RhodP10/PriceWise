<script lang="ts">
	import { onMount } from 'svelte';
	import { authState } from '$lib/state/auth.svelte';
	import { getSupplierStore, updateSupplierStore } from '$lib/api/localStoreClient';
	import type { LocalStoreDTO } from '$lib/types/localStore';

	let store = $state<LocalStoreDTO | null>(null);
	let storeName = $state('');
	let description = $state('');
	let address = $state('');
	let contactNumber = $state('');
	let isActive = $state(true);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state('');
	let saved = $state(false);

	onMount(async () => {
		const token = authState.token;
		if (!token) return;
		try {
			const detail = await getSupplierStore(token);
			store = detail;
			storeName = detail.storeName;
			description = detail.description;
			address = detail.address;
			contactNumber = detail.contactNumber;
			isActive = detail.isActive;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Could not load store';
		} finally {
			loading = false;
		}
	});

	async function save(e: Event): Promise<void> {
		e.preventDefault();
		const token = authState.token;
		if (!token) return;
		saving = true;
		error = '';
		saved = false;
		try {
			store = await updateSupplierStore(token, {
				storeName: storeName.trim(),
				description: description.trim(),
				address: address.trim(),
				contactNumber: contactNumber.trim(),
				isActive
			});
			saved = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Save failed';
		} finally {
			saving = false;
		}
	}
</script>

<section class="animate-in max-w-2xl space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-zinc-900">Store profile</h1>
		<p class="mt-1 text-sm text-zinc-500">How cafe owners see your business on the Local Store page.</p>
	</div>

	{#if loading}
		<p class="text-sm text-zinc-500">Loading…</p>
	{:else}
		<form class="glass space-y-4 rounded-3xl p-6 shadow-xl" onsubmit={save}>
			<div>
				<label class="text-xs font-semibold uppercase text-zinc-500" for="st-name">Store name</label>
				<input id="st-name" bind:value={storeName} required minlength="2" class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
			</div>
			<div>
				<label class="text-xs font-semibold uppercase text-zinc-500" for="st-desc">Description</label>
				<textarea id="st-desc" bind:value={description} rows="3" class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" placeholder="What you sell, delivery areas, hours…"></textarea>
			</div>
			<div>
				<label class="text-xs font-semibold uppercase text-zinc-500" for="st-addr">Address</label>
				<input id="st-addr" bind:value={address} class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
			</div>
			<div>
				<label class="text-xs font-semibold uppercase text-zinc-500" for="st-contact">Contact number</label>
				<input id="st-contact" bind:value={contactNumber} class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm" />
			</div>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" bind:checked={isActive} class="rounded border-zinc-300" />
				Show my store on the Local Store marketplace
			</label>
			{#if error}
				<p class="text-sm text-red-600">{error}</p>
			{/if}
			{#if saved}
				<p class="text-sm font-medium text-emerald-700">Store profile saved.</p>
			{/if}
			<button type="submit" disabled={saving} class="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">
				{saving ? 'Saving…' : 'Save profile'}
			</button>
		</form>
	{/if}
</section>
