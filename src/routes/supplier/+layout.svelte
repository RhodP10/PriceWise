<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		authState,
		clearAuth,
		fetchMe,
		homePathForUser,
		hydrateAuthFromStorage,
		isLocalSupplier
	} from '$lib/state/auth.svelte';

	const { children } = $props();

	const links = [
		{ href: '/supplier', label: 'Dashboard' },
		{ href: '/supplier/products', label: 'My products' },
		{ href: '/supplier/store', label: 'Store profile' }
	];

	$effect(() => {
		if (!browser) return;
		hydrateAuthFromStorage();
		if (authState.token) void fetchMe();
	});

	$effect(() => {
		if (!browser) return;
		const path = $page.url.pathname;
		const publicPaths = ['/login', '/register', '/register/supplier'];
		if (publicPaths.some((p) => path === p || path.startsWith(p + '/'))) return;
		if (!authState.token) {
			void goto('/login');
			return;
		}
		if (authState.user && !isLocalSupplier()) {
			void goto(homePathForUser());
		}
	});

	function logout(): void {
		clearAuth();
		void goto('/login');
	}
</script>

<div class="min-h-screen bg-zinc-100 text-zinc-900 antialiased">
	<header class="sticky top-0 z-40 border-b border-amber-200 bg-amber-50/95 backdrop-blur-md">
		<div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
			<a href="/supplier" class="text-lg font-semibold tracking-tight text-amber-950">
				PriceWise <span class="text-amber-600">Supplier</span>
			</a>
			<nav class="flex flex-wrap gap-1 rounded-xl bg-amber-100 p-1" aria-label="Supplier">
				{#each links as link}
					<a
						href={link.href}
						class={[
							'rounded-lg px-3 py-2 text-sm font-medium transition',
							$page.url.pathname === link.href
								? 'bg-amber-600 text-white shadow-sm'
								: 'text-amber-950 hover:bg-amber-200'
						].join(' ')}
					>
						{link.label}
					</a>
				{/each}
			</nav>
			<div class="flex flex-wrap items-center gap-2">
				{#if authState.user}
					<span class="max-w-[180px] truncate text-xs text-amber-900" title={authState.user.email}
						>{authState.user.email}</span
					>
					<button
						type="button"
						class="rounded-xl border border-amber-700/30 bg-amber-600/10 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-600/15"
						onclick={logout}
					>
						Logout
					</button>
				{/if}
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-6 sm:py-8">
		{@render children()}
	</main>
</div>
