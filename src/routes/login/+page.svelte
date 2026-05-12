<script lang="ts">
	import { goto } from '$app/navigation';
	import { saveToken, fetchMe } from '$lib/state/auth.svelte';

	let email = $state('');
	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let showAccountError = $state(false);

	async function submit(e: Event): Promise<void> {
		e.preventDefault();
		loading = true;
		error = '';
		showAccountError = false;
		try {
			const body = new URLSearchParams();
			body.set('username', email.trim());
			body.set('password', password);
			const res = await fetch('http://localhost:8000/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body
			});
			if (!res.ok) throw new Error('Invalid email or password');
			const data = await res.json();
			saveToken(data.access_token);
			await fetchMe();
			await goto('/recipes');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Login failed';
			showAccountError = true;
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
		<div class="flex flex-col items-center gap-4">
			<div class="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
			<p class="font-medium text-emerald-900">Signing in...</p>
		</div>
	</div>
{/if}

<div class="flex min-h-[calc(100vh-4rem)] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
	<!-- Side Panel -->
	<div class="relative hidden w-1/2 flex-col justify-between bg-emerald-900 p-12 lg:flex">
		<!-- Background shapes -->
		<div class="absolute inset-0 overflow-hidden">
			<div class="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-emerald-800/50 blur-3xl"></div>
			<div class="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-teal-800/30 blur-3xl"></div>
		</div>

		<div class="relative z-10">
			<a href="/" class="flex items-center gap-2 text-2xl font-bold text-white">
				<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-2">
					<img src="/icon.png" alt="PriceWise" class="h-full w-full object-contain" />
				</div>
				PriceWise
			</a>
		</div>

		<div class="relative z-10">
			<h2 class="text-3xl font-bold leading-tight text-emerald-50">
				The smarter way to manage your cafe margins.
			</h2>
			<p class="mt-4 text-lg text-emerald-300">
				Track ingredients, calculate costs, and optimize your pricing in one place.
			</p>
		</div>

		<div class="relative z-10 text-sm text-emerald-400">
			&copy; 2026 PriceWise Inc. All rights reserved.
		</div>
	</div>

	<!-- Form Panel -->
	<div class="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
		<div class="mx-auto w-full max-w-sm">
			<div class="lg:hidden mb-8 flex justify-center">
				<img src="/icon.png" alt="PriceWise" class="h-16 w-16 object-contain" />
			</div>

			<h2 class="text-3xl font-bold tracking-tight text-zinc-900">Welcome back</h2>
			<p class="mt-2 text-zinc-600">Enter your credentials to access your dashboard.</p>

			<form onsubmit={submit} class="mt-10 space-y-6">
				<div>
					<label for="email" class="block text-sm font-semibold text-zinc-900">Email address</label>
					<div class="mt-2">
						<input
							type="email"
							id="email"
							bind:value={email}
							required
							placeholder="you@example.com"
							class="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
						/>
					</div>
				</div>

				<div>
					<div class="flex items-center justify-between">
						<label for="password" class="block text-sm font-semibold text-zinc-900">Password</label>
						<div class="text-sm">
							<a href="#" class="font-medium text-emerald-600 hover:text-emerald-500">Forgot password?</a>
						</div>
					</div>
					<div class="mt-2">
						<input
							type="password"
							id="password"
							bind:value={password}
							required
							placeholder="••••••••"
							class="block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
						/>
					</div>
				</div>

				{#if showAccountError && error}
					<div class="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
						{error}
					</div>
				{/if}

				<button
					type="submit"
					class="flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-xl active:scale-95"
				>
					Sign in
				</button>
			</form>

			<p class="mt-10 text-center text-sm text-zinc-600">
				Not a member?
				<a href="/register" class="font-bold text-emerald-600 hover:text-emerald-500 underline underline-offset-4">
					Create an account
				</a>
			</p>
		</div>
	</div>
</div>


