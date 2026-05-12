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

<section class="relative space-y-6 pb-28">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight text-zinc-900">Recipes</h1>
			<p class="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500">
				<strong>+</strong> adds a new recipe. <strong>Click a card</strong> to open costing & pricing; use
				<strong>See recipes</strong> for ingredients and Others.
			</p>
		</div>
		<div class="w-full max-w-sm shrink-0">
			<label for="recipe-search" class="sr-only">Search recipes</label>
			<input
				id="recipe-search"
				type="search"
				bind:value={search}
				placeholder="Search recipes…"
				class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/15"
			/>
		</div>
	</div>

	{#if filtered.length === 0}
		<p
			class="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-14 text-center text-sm text-zinc-500 shadow-sm"
		>
			{#if recipeStore.recipes.length === 0}
				No recipes yet. Tap <strong>+</strong> to create one.
			{:else}
				No recipes match “{search.trim()}”.
			{/if}
		</p>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
	class="fixed bottom-6 right-6 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-3xl font-light leading-none text-white shadow-lg ring-4 ring-white transition hover:bg-emerald-500 hover:shadow-xl active:scale-95"
	onclick={onFabAddRecipe}
	aria-label="Add recipe"
>
	+
</button>

<NewRecipeQuickModal open={quickAddOpen} onAdd={onConfirmAddRecipe} onClose={closeQuickRecipe} />

<RecipeCostingDrawer recipe={costingRecipe} open={costingRecipeId !== null} onClose={closeCosting} />

<RecipeDetailsModal recipe={detailRecipe} open={detailRecipeId !== null} onClose={closeDetail} />
