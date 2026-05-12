import { ingredientCatalog, resetIngredientCatalog } from '$lib/state/ingredientCatalog.svelte';
import { opexStore, resetOpexStore } from '$lib/state/opexStore.svelte';
import { otherCatalog, resetOtherCatalog } from '$lib/state/otherCatalog.svelte';
import { recipeStore, resetRecipes } from '$lib/state/recipes.svelte';
import { resetSummarySales, summarySales } from '$lib/state/summarySales.svelte';

function key(userId: number, scope: string): string {
	return `pricewise_u${userId}_${scope}`;
}

export function loadUserData(userId: number): void {
	if (typeof localStorage === 'undefined') return;
	try {
		const recipes = localStorage.getItem(key(userId, 'recipes'));
		const ingredients = localStorage.getItem(key(userId, 'ingredients'));
		const others = localStorage.getItem(key(userId, 'others'));
		const opex = localStorage.getItem(key(userId, 'opex'));
		const sales = localStorage.getItem(key(userId, 'summary_sales'));

		resetRecipes();
		resetIngredientCatalog();
		resetOtherCatalog();
		resetOpexStore();
		resetSummarySales();

		if (recipes) recipeStore.recipes = JSON.parse(recipes);
		if (ingredients) ingredientCatalog.items = JSON.parse(ingredients);
		if (others) otherCatalog.items = JSON.parse(others);
		if (opex) opexStore.lines = JSON.parse(opex);
		if (sales) summarySales.ordersPerMonthByRecipeId = JSON.parse(sales);
	} catch {
		resetRecipes();
		resetIngredientCatalog();
		resetOtherCatalog();
		resetOpexStore();
		resetSummarySales();
	}
}

export function persistUserData(userId: number): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(key(userId, 'recipes'), JSON.stringify(recipeStore.recipes));
	localStorage.setItem(key(userId, 'ingredients'), JSON.stringify(ingredientCatalog.items));
	localStorage.setItem(key(userId, 'others'), JSON.stringify(otherCatalog.items));
	localStorage.setItem(key(userId, 'opex'), JSON.stringify(opexStore.lines));
	localStorage.setItem(key(userId, 'summary_sales'), JSON.stringify(summarySales.ordersPerMonthByRecipeId));
}

export function clearInMemoryUserData(): void {
	resetRecipes();
	resetIngredientCatalog();
	resetOtherCatalog();
	resetOpexStore();
	resetSummarySales();
}

