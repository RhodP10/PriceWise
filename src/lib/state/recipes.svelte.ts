import { mockRecipes } from '$lib/data/mockRecipes';
import type {
	MeasureUnit,
	RecipeDTO,
	RecipeIngredientLineDTO,
	RecipeOtherLineDTO,
	RecipePricingDTO
} from '$lib/types/recipe';

export const recipeStore = $state({
	recipes: structuredClone(mockRecipes) as RecipeDTO[]
});

function newId(prefix: string): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addRecipe(name: string): string {
	const id = newId('rec');
	const recipe: RecipeDTO = {
		id,
		name: name.trim() || 'New recipe',
		pricing: { local: 0, shopee: 0, lazada: 0 },
		ingredientLines: [],
		otherLines: []
	};
	recipeStore.recipes = [...recipeStore.recipes, recipe];
	return id;
}

export function updateRecipeName(recipeId: string, name: string): void {
	recipeStore.recipes = recipeStore.recipes.map((r) =>
		r.id === recipeId ? { ...r, name: name.trim() || 'Untitled recipe' } : r
	);
}

export function updateRecipePricing(recipeId: string, pricing: RecipePricingDTO): void {
	recipeStore.recipes = recipeStore.recipes.map((r) => (r.id === recipeId ? { ...r, pricing } : r));
}

export function deleteRecipe(recipeId: string): void {
	recipeStore.recipes = recipeStore.recipes.filter((r) => r.id !== recipeId);
}

export function addRecipeIngredientLine(
	recipeId: string,
	ingredientMasterId: string,
	quantity: number,
	unit: MeasureUnit
): void {
	const line: RecipeIngredientLineDTO = {
		id: newId('rl'),
		ingredientMasterId,
		quantity,
		unit
	};
	recipeStore.recipes = recipeStore.recipes.map((r) =>
		r.id === recipeId ? { ...r, ingredientLines: [...r.ingredientLines, line] } : r
	);
}

export function updateRecipeIngredientLine(
	recipeId: string,
	lineId: string,
	patch: Partial<Pick<RecipeIngredientLineDTO, 'ingredientMasterId' | 'quantity' | 'unit'>>
): void {
	recipeStore.recipes = recipeStore.recipes.map((r) => {
		if (r.id !== recipeId) return r;
		return {
			...r,
			ingredientLines: r.ingredientLines.map((l) => (l.id === lineId ? { ...l, ...patch } : l))
		};
	});
}

export function deleteRecipeIngredientLine(recipeId: string, lineId: string): void {
	recipeStore.recipes = recipeStore.recipes.map((r) =>
		r.id === recipeId
			? { ...r, ingredientLines: r.ingredientLines.filter((l) => l.id !== lineId) }
			: r
	);
}

export function addRecipeOtherLine(
	recipeId: string,
	otherMasterId: string,
	quantity: number,
	unit: MeasureUnit
): void {
	const line: RecipeOtherLineDTO = {
		id: newId('ol'),
		otherMasterId,
		quantity,
		unit
	};
	recipeStore.recipes = recipeStore.recipes.map((r) =>
		r.id === recipeId ? { ...r, otherLines: [...r.otherLines, line] } : r
	);
}

export function updateRecipeOtherLine(
	recipeId: string,
	lineId: string,
	patch: Partial<Pick<RecipeOtherLineDTO, 'otherMasterId' | 'quantity' | 'unit'>>
): void {
	recipeStore.recipes = recipeStore.recipes.map((r) => {
		if (r.id !== recipeId) return r;
		return {
			...r,
			otherLines: r.otherLines.map((l) => (l.id === lineId ? { ...l, ...patch } : l))
		};
	});
}

export function deleteRecipeOtherLine(recipeId: string, lineId: string): void {
	recipeStore.recipes = recipeStore.recipes.map((r) =>
		r.id === recipeId ? { ...r, otherLines: r.otherLines.filter((l) => l.id !== lineId) } : r
	);
}

export function replaceRecipesFromApi(next: RecipeDTO[]): void {
	recipeStore.recipes = structuredClone(next);
}

export function resetRecipes(): void {
	recipeStore.recipes = structuredClone(mockRecipes);
}
