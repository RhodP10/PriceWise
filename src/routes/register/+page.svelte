<script lang="ts">
	import { goto } from '$app/navigation';

	let email = $state('');
	let password = $state('');
	let firstName = $state('');
	let lastName = $state('');
	let middleName = $state('');
	let contactNumber = $state('');
	let loading = $state(false);
	let error = $state('');
	let emailError = $state('');
	let passwordError = $state('');
	let firstNameError = $state('');
	let lastNameError = $state('');
	let contactNumberError = $state('');

	async function submit(e: Event): Promise<void> {
		e.preventDefault();
		loading = true;
		error = '';
		emailError = '';
		passwordError = '';
		firstNameError = '';
		lastNameError = '';
		contactNumberError = '';

		if (!email.trim()) emailError = 'Email is required';
		if (!password.trim()) passwordError = 'Password is required';
		if (!firstName.trim()) firstNameError = 'First Name is required';
		if (!lastName.trim()) lastNameError = 'Last Name is required';
		if (!contactNumber.trim()) contactNumberError = 'Contact Number is required';

		if (emailError || passwordError || firstNameError || lastNameError || contactNumberError) {
			loading = false;
			return;
		}

		try {
			const res = await fetch('http://localhost:8000/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), password })
			});
			if (!res.ok) {
				const msg = await res.text();
				throw new Error(msg || 'Registration failed');
			}
			await goto('/login');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Registration failed';
		} finally {
			loading = false;
		}
	}
</script>

{#if loading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm">
		<div class="flex flex-col items-center gap-4">
			<div class="h-12 w-12 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
			<p class="font-medium text-emerald-900">Creating your account...</p>
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
				Start your journey with PriceWise today.
			</h2>
			<p class="mt-4 text-lg text-emerald-300">
				Join hundreds of cafe owners optimizing their business logic.
			</p>
		</div>

		<div class="relative z-10 text-sm text-emerald-400">
			&copy; 2026 PriceWise Inc. All rights reserved.
		</div>
	</div>

	<!-- Form Panel -->
	<div class="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
		<div class="mx-auto w-full max-w-lg">
			<div class="lg:hidden mb-8 flex justify-center">
				<img src="/icon.png" alt="PriceWise" class="h-16 w-16 object-contain" />
			</div>

			<h2 class="text-3xl font-bold tracking-tight text-zinc-900">Create account</h2>
			<p class="mt-2 text-zinc-600">Enter your details to get started with PriceWise.</p>

			<form onsubmit={submit} class="mt-10 space-y-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label for="firstName" class="block text-sm font-semibold text-zinc-900">First Name</label>
						<input
							type="text"
							id="firstName"
							bind:value={firstName}
							placeholder="Jane"
							class="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
						/>
						{#if firstNameError}<p class="mt-1 text-xs text-red-500">{firstNameError}</p>{/if}
					</div>
					<div>
						<label for="lastName" class="block text-sm font-semibold text-zinc-900">Last Name</label>
						<input
							type="text"
							id="lastName"
							bind:value={lastName}
							placeholder="Doe"
							class="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
						/>
						{#if lastNameError}<p class="mt-1 text-xs text-red-500">{lastNameError}</p>{/if}
					</div>
				</div>

				<div>
					<label for="email" class="block text-sm font-semibold text-zinc-900">Email address</label>
					<input
						type="email"
						id="email"
						bind:value={email}
						placeholder="jane@example.com"
						class="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
					/>
					{#if emailError}<p class="mt-1 text-xs text-red-500">{emailError}</p>{/if}
				</div>

				<div>
					<label for="password" class="block text-sm font-semibold text-zinc-900">Password</label>
					<input
						type="password"
						id="password"
						bind:value={password}
						placeholder="••••••••"
						class="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
					/>
					{#if passwordError}<p class="mt-1 text-xs text-red-500">{passwordError}</p>{/if}
				</div>

				<div>
					<label for="contactNumber" class="block text-sm font-semibold text-zinc-900">Contact Number</label>
					<input
						type="tel"
						id="contactNumber"
						bind:value={contactNumber}
						placeholder="+63 900 000 0000"
						class="mt-2 block w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
					/>
					{#if contactNumberError}<p class="mt-1 text-xs text-red-500">{contactNumberError}</p>{/if}
				</div>

				{#if error}
					<div class="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">
						{error}
					</div>
				{/if}

				<button
					type="submit"
					disabled={loading}
					class="mt-4 flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-xl active:scale-95 disabled:opacity-60"
				>
					{loading ? 'Creating account...' : 'Create account'}
				</button>
			</form>

			<p class="mt-10 text-center text-sm text-zinc-600">
				Already have an account?
				<a href="/login" class="font-bold text-emerald-600 hover:text-emerald-500 underline underline-offset-4">
					Sign in instead
				</a>
			</p>
		</div>
	</div>
</div>


