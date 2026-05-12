<script lang="ts">
	import { authState } from '$lib/state/auth.svelte';
</script>

<svelte:head>
	<title>User settings — Pricewise</title>
</svelte:head>

<section class="mx-auto max-w-lg space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">User settings</h1>
		<p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
			Account preferences for your Pricewise workspace.
		</p>
	</div>

	<div
		class="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_-28px_rgba(15,118,110,0.25)] backdrop-blur-md dark:border-zinc-700 dark:bg-zinc-900/80"
	>
		<h2 class="text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Account</h2>
		<dl class="mt-4 space-y-4 text-sm">
			<div>
				<dt class="text-xs font-medium text-zinc-500 dark:text-zinc-400">Email</dt>
				<dd class="mt-1 font-medium text-zinc-900 dark:text-white">
					{authState.user?.email ?? '—'}
				</dd>
			</div>
			<div>
				<dt class="text-xs font-medium text-zinc-500 dark:text-zinc-400">User ID</dt>
				<dd class="mt-1 tabular-nums text-zinc-700 dark:text-zinc-300">{authState.user?.id ?? '—'}</dd>
			</div>
		</dl>
		<p class="mt-6 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
			More settings (notifications, export defaults, appearance) can be added here as the product grows.
		</p>
	</div>
</section>
