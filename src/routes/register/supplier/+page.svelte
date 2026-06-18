<script lang="ts">
	import { goto } from '$app/navigation';
	import { registerSupplierAccount } from '$lib/api/localStoreClient';

	let email = $state('');
	let password = $state('');
	let storeName = $state('');
	let storeDescription = $state('');
	let storeAddress = $state('');
	let contactNumber = $state('');
	let loading = $state(false);
	let error = $state('');

	async function submit(e: Event): Promise<void> {
		e.preventDefault();
		loading = true;
		error = '';
		if (!email.trim().toLowerCase().endsWith('@gmail.com')) {
			error = 'Please use a Gmail address (@gmail.com)';
			loading = false;
			return;
		}
		if (!storeName.trim()) {
			error = 'Store name is required';
			loading = false;
			return;
		}
		try {
			await registerSupplierAccount({
				email: email.trim(),
				password,
				storeName: storeName.trim(),
				storeDescription,
				storeAddress,
				contactNumber
			});
			await goto('/login?supplier=1');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Registration failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-[calc(100vh-4rem)] overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-2xl">
	<div class="relative hidden w-1/2 flex-col justify-between bg-amber-900 p-12 lg:flex">
		<div class="absolute inset-0 overflow-hidden">
			<div class="absolute -left-20 -top-20 h-80 w-80 rounded-full bg-amber-800/50 blur-3xl"></div>
		</div>
		<div class="relative z-10">
			<a href="/" class="text-2xl font-bold text-white">PriceWise Supplier</a>
		</div>
		<div class="relative z-10">
			<h2 class="text-3xl font-bold leading-tight text-amber-50">List your local prices for cafes nearby.</h2>
			<p class="mt-4 text-lg text-amber-200">A separate account from cafe owners — manage your own storefront and product prices.</p>
		</div>
	</div>

	<div class="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
		<div class="mx-auto w-full max-w-lg">
			<h2 class="text-3xl font-bold text-zinc-900">Register as local supplier</h2>
			<p class="mt-2 text-zinc-600">Step 1: create your supplier account and store.</p>

			<form onsubmit={submit} class="mt-8 space-y-4">
				<div>
					<label class="block text-sm font-semibold text-zinc-900" for="sup-store">Store name</label>
					<input id="sup-store" bind:value={storeName} required class="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" placeholder="e.g. Juan's Wet Market" />
				</div>
				<div>
					<label class="block text-sm font-semibold text-zinc-900" for="sup-email">Email (Gmail)</label>
					<input id="sup-email" type="email" bind:value={email} required class="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" />
				</div>
				<div>
					<label class="block text-sm font-semibold text-zinc-900" for="sup-pass">Password</label>
					<input id="sup-pass" type="password" bind:value={password} required minlength="6" class="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" />
				</div>
				<div>
					<label class="block text-sm font-semibold text-zinc-900" for="sup-addr">Address</label>
					<input id="sup-addr" bind:value={storeAddress} class="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" />
				</div>
				<div>
					<label class="block text-sm font-semibold text-zinc-900" for="sup-contact">Contact</label>
					<input id="sup-contact" bind:value={contactNumber} class="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm" />
				</div>
				<div>
					<label class="block text-sm font-semibold text-zinc-900" for="sup-desc">About your store</label>
					<textarea id="sup-desc" bind:value={storeDescription} rows="2" class="mt-1 w-full rounded-xl border border-zinc-200 px-4 py-3 text-sm"></textarea>
				</div>

				{#if error}
					<p class="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
				{/if}

				<button type="submit" disabled={loading} class="w-full rounded-xl bg-amber-600 py-3 text-sm font-bold text-white disabled:opacity-60">
					{loading ? 'Creating account…' : 'Create supplier account'}
				</button>
			</form>

			<p class="mt-8 text-center text-sm text-zinc-600">
				Cafe owner?
				<a href="/register" class="font-bold text-emerald-600 hover:underline">Register here</a>
				· Already registered?
				<a href="/login" class="font-bold text-amber-700 hover:underline">Sign in</a>
			</p>
		</div>
	</div>
</div>
