<script lang="ts">
	const {
		open,
		initialUrl,
		channelLabel,
		onSave,
		onClose
	}: {
		open: boolean;
		initialUrl: string;
		channelLabel: string;
		onSave: (url: string) => void;
		onClose: () => void;
	} = $props();

	let backdrop: HTMLDivElement | undefined = $state();
	let draftUrl = $state('');

	$effect(() => {
		if (open) draftUrl = initialUrl;
	});

	function close(): void {
		onClose();
	}

	function onBackdropMouseDown(e: MouseEvent): void {
		if (e.target === backdrop) close();
	}

	function submit(e: Event): void {
		e.preventDefault();
		onSave(draftUrl.trim());
		close();
	}
</script>

{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={backdrop}
		class="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm"
		onmousedown={onBackdropMouseDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="scrape-help-title"
		tabindex="-1"
	>
		<form
			class="w-full max-w-md rounded-3xl border border-white/60 bg-white/90 p-6 shadow-2xl shadow-zinc-900/10 backdrop-blur-xl"
			onsubmit={submit}
		>
			<div class="flex items-start justify-between gap-3">
				<div>
					<h2 id="scrape-help-title" class="text-lg font-semibold tracking-tight text-zinc-900">
						Help scraping ({channelLabel})
					</h2>
					<p class="mt-1 text-sm text-zinc-500">
						Paste a product or listing URL. The app stores it with this row so future scraping runs can start
						faster (no live scrape runs in the browser yet).
					</p>
				</div>
				<button type="button" class="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" onclick={close} aria-label="Close">
					×
				</button>
			</div>

			<label class="mt-5 block">
				<span class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Listing URL</span>
				<input
					type="url"
					bind:value={draftUrl}
					placeholder="https://…"
					class="mt-1.5 w-full rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 text-sm outline-none ring-emerald-500/0 transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15"
				/>
			</label>

			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="rounded-2xl px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
					onclick={close}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500"
				>
					Save hint
				</button>
			</div>
		</form>
	</div>
{/if}
