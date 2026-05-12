<script lang="ts">
	import TypeToConfirmDeleteModal from '$lib/components/TypeToConfirmDeleteModal.svelte';
	import {
		addOpexLine,
		deleteOpexLine,
		monthlyOpexTotal,
		opexStore,
		updateOpexLine
	} from '$lib/state/opexStore.svelte';

	let labelDraft = $state('');
	let amountDraft = $state(0);

	let editingId = $state<string | null>(null);
	let editLabel = $state('');
	let editAmount = $state(0);

	const monthly = $derived(monthlyOpexTotal());

	function submit(e: Event): void {
		e.preventDefault();
		if (!labelDraft.trim()) return;
		addOpexLine(labelDraft.trim(), amountDraft);
		labelDraft = '';
		amountDraft = 0;
	}

	function startEdit(row: (typeof opexStore.lines)[number]): void {
		editingId = row.id;
		editLabel = row.label;
		editAmount = row.amountPerMonth;
	}

	function saveEdit(): void {
		if (!editingId) return;
		updateOpexLine(editingId, { label: editLabel, amountPerMonth: editAmount });
		editingId = null;
	}

	function cancelEdit(): void {
		editingId = null;
	}

	let deleteTarget = $state<{ id: string; label: string } | null>(null);

	function requestDelete(row: (typeof opexStore.lines)[number]): void {
		deleteTarget = { id: row.id, label: row.label };
	}

	function executeDelete(): void {
		if (deleteTarget) deleteOpexLine(deleteTarget.id);
		deleteTarget = null;
	}
</script>

<section class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Operating expenses</h1>
		<p class="mt-1 text-sm text-zinc-500">
			Fixed monthly costs (rent, salaries, utilities, maintenance). Totals roll into the Summary page.
		</p>
	</div>

	<div class="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm">
		<p class="text-xs font-semibold uppercase text-emerald-800">Monthly OPEX total</p>
		<p class="mt-1 text-3xl font-semibold tabular-nums text-emerald-950">₱{monthly.toFixed(2)}</p>
	</div>

	<form
		class="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
		onsubmit={submit}
	>
		<div class="min-w-[180px] flex-1">
			<label class="text-xs font-semibold uppercase text-zinc-500" for="ox-label">OPEX item</label>
			<input
				id="ox-label"
				bind:value={labelDraft}
				placeholder="e.g. Rent, Electricity"
				class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
			/>
		</div>
		<div class="w-full sm:w-40">
			<label class="text-xs font-semibold uppercase text-zinc-500" for="ox-amt">Amount / month (₱)</label>
			<input
				id="ox-amt"
				type="number"
				step="any"
				bind:value={amountDraft}
				class="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm tabular-nums"
			/>
		</div>
		<button
			type="submit"
			class="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
		>
			Add OPEX
		</button>
	</form>

	<div class="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
		<table class="w-full min-w-[480px] text-left text-sm">
			<thead class="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-500">
				<tr>
					<th class="px-4 py-3 font-medium">Item</th>
					<th class="px-4 py-3 font-medium text-right">₱ / month</th>
					<th class="px-4 py-3 font-medium text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-100">
				{#each opexStore.lines as row (row.id)}
					{#if editingId === row.id}
						<tr class="bg-amber-50/40">
							<td class="px-4 py-2">
								<input bind:value={editLabel} class="w-full rounded-lg border px-2 py-1 text-sm" />
							</td>
							<td class="px-4 py-2">
								<input
									type="number"
									step="any"
									bind:value={editAmount}
									class="w-full rounded-lg border px-2 py-1 text-right text-sm tabular-nums"
								/>
							</td>
							<td class="px-4 py-2 text-right">
								<button type="button" class="mr-2 text-xs font-medium text-emerald-700 hover:underline" onclick={saveEdit}>
									Save
								</button>
								<button type="button" class="text-xs text-zinc-600 hover:underline" onclick={cancelEdit}>
									Cancel
								</button>
							</td>
						</tr>
					{:else}
						<tr class="hover:bg-zinc-50/80">
							<td class="px-4 py-3 font-medium text-zinc-900">{row.label}</td>
							<td class="px-4 py-3 text-right tabular-nums">₱{row.amountPerMonth.toFixed(2)}</td>
							<td class="px-4 py-3 text-right">
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
		{#if opexStore.lines.length === 0}
			<p class="py-12 text-center text-sm text-zinc-500">No OPEX lines yet.</p>
		{/if}
	</div>
</section>

<TypeToConfirmDeleteModal
	open={deleteTarget !== null}
	title="Delete OPEX line?"
	description={deleteTarget
		? `Remove “${deleteTarget.label}” from monthly operating expenses.`
		: ''}
	onClose={() => (deleteTarget = null)}
	onConfirm={executeDelete}
/>
