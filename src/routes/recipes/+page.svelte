<script lang="ts">
	import NewRecipeQuickModal from '$lib/components/recipes/NewRecipeQuickModal.svelte';
	import RecipeCard from '$lib/components/recipes/RecipeCard.svelte';
	import RecipeCostingDrawer from '$lib/components/recipes/RecipeCostingDrawer.svelte';
	import RecipeDetailsModal from '$lib/components/recipes/RecipeDetailsModal.svelte';
	import { addRecipe, recipeStore } from '$lib/state/recipes.svelte';

	let search = $state('');
	let detailRecipeId = $state<string | null>(null);
	let costingRecipeId = $state<string | null>(null);
	let quickAddOpen = $state(false);

	const filtered = $derived(
		recipeStore.recipes.filter((r) => r.name.toLowerCase().includes(search.toLowerCase().trim()))
	);

	const detailRecipe = $derived(
		detailRecipeId ? (recipeStore.recipes.find((r) => r.id === detailRecipeId) ?? null) : null
	);

	const costingRecipe = $derived(
		costingRecipeId ? (recipeStore.recipes.find((r) => r.id === costingRecipeId) ?? null) : null
	);

	function openCosting(id: string): void {
		quickAddOpen = false;
		detailRecipeId = null;
		costingRecipeId = id;
	}

	function closeCosting(): void {
		costingRecipeId = null;
	}

	function openDetail(id: string): void {
		quickAddOpen = false;
		costingRecipeId = null;
		detailRecipeId = id;
	}

	function closeDetail(): void {
		detailRecipeId = null;
	}

	function closeQuickRecipe(): void {
		quickAddOpen = false;
	}

	function onFabAddRecipe(): void {
		detailRecipeId = null;
		costingRecipeId = null;
		quickAddOpen = true;
	}

	function onConfirmAddRecipe(name: string): void {
		addRecipe(name);
		quickAddOpen = false;
	}
</script>

<section class="animate-in relative space-y-8 pb-32">
	<!-- Premium Header Section -->
	<div class="relative overflow-hidden rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl lg:p-12">
		<div class="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl"></div>
		<div class="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"></div>

		<div class="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
			<div class="space-y-2">
				<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
					Recipe <span class="text-orange-400">Manager</span>
				</h1>
				<p class="max-w-2xl text-lg text-zinc-400">
					Create, cost, and price your culinary creations with precision. Sync prices across local and marketplace channels.
				</p>
			</div>

			<div class="flex w-full max-w-sm shrink-0 flex-col gap-3">
				<div class="relative">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
					</div>
					<input
						id="recipe-search"
						type="search"
						bind:value={search}
						placeholder="Search recipes…"
						class="w-full rounded-2xl border-none bg-zinc-800/50 py-3 pl-10 pr-4 text-white placeholder-zinc-500 ring-1 ring-white/10 transition-all focus:bg-zinc-800 focus:ring-2 focus:ring-orange-500"
					/>
				</div>
			</div>
		</div>
	</div>

	{#if filtered.length === 0}
		<div class="flex flex-col items-center justify-center py-20 text-center">
			<div class="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50 shadow-inner">
				<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-300"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
			</div>
			<h3 class="text-lg font-bold text-zinc-900">
				{recipeStore.recipes.length === 0 ? 'No recipes yet' : 'No matches found'}
			</h3>
			<p class="mt-1 text-sm text-zinc-500">
				{recipeStore.recipes.length === 0 ? 'Start your culinary journey by adding your first recipe.' : `No recipes match “${search.trim()}”.`}
			</p>
			{#if recipeStore.recipes.length === 0}
				<button
					onclick={onFabAddRecipe}
					class="mt-6 rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105"
				>
					Create First Recipe
				</button>
			{/if}
		</div>
	{:else}
		<div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
			{#each filtered as recipe (recipe.id)}
				<RecipeCard
					recipe={recipe}
					onCosting={() => openCosting(recipe.id)}
					onSeeRecipe={() => openDetail(recipe.id)}
				/>
			{/each}
		</div>
	{/if}
</section>

<button
	type="button"
	class="fixed bottom-8 right-8 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-white shadow-2xl ring-4 ring-white transition-all hover:scale-110 hover:bg-orange-500 active:scale-95"
	onclick={onFabAddRecipe}
	aria-label="Add recipe"
>
	<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
</button>

<NewRecipeQuickModal open={quickAddOpen} onAdd={onConfirmAddRecipe} onClose={closeQuickRecipe} />

<RecipeCostingDrawer recipe={costingRecipe} open={costingRecipeId !== null} onClose={closeCosting} />

<RecipeDetailsModal recipe={detailRecipe} open={detailRecipeId !== null} onClose={closeDetail} />
