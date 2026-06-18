import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
import { convertQuantity } from '$lib/utils/unitConvert';

export interface StockUsageLine {
	kind: 'ingredient' | 'other';
	masterId: string;
	name: string;
	packages: number;
}

function packagesForLine(
	lineQty: number,
	lineUnit: import('$lib/types/recipe').MeasureUnit,
	m: IngredientMasterDTO | OtherItemMasterDTO
): number | null {
	if (m.baseQuantity <= 1e-9) return null;
	const qtyInMasterUnit = convertQuantity(lineQty, lineUnit, m.baseUnit);
	if (qtyInMasterUnit === null) return null;
	return qtyInMasterUnit / m.baseQuantity;
}

/** Packages to deduct per recipe order (ingredient + other batches). */
export function computeRecipeStockUsage(
	recipe: RecipeDTO,
	orderQty: number,
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[]
): StockUsageLine[] {
	const qty = Math.max(1, Math.round(orderQty));
	const map = new Map<string, StockUsageLine>();

	for (const line of recipe.ingredientLines) {
		const m = ingredientMasters.find((x) => x.id === line.ingredientMasterId);
		if (!m) continue;
		const pkgs = packagesForLine(line.quantity, line.unit, m);
		if (pkgs === null || pkgs <= 1e-9) continue;
		const total = pkgs * qty;
		const key = `ingredient:${m.id}`;
		const cur = map.get(key);
		if (cur) cur.packages += total;
		else map.set(key, { kind: 'ingredient', masterId: m.id, name: m.name, packages: total });
	}

	for (const line of recipe.otherLines) {
		const m = otherMasters.find((x) => x.id === line.otherMasterId);
		if (!m) continue;
		const pkgs = packagesForLine(line.quantity, line.unit, m);
		if (pkgs === null || pkgs <= 1e-9) continue;
		const total = pkgs * qty;
		const key = `other:${m.id}`;
		const cur = map.get(key);
		if (cur) cur.packages += total;
		else map.set(key, { kind: 'other', masterId: m.id, name: m.name, packages: total });
	}

	return [...map.values()].map((l) => ({
		...l,
		packages: Math.round(l.packages * 1000) / 1000
	}));
}

/** Sum batch usage across many sales (for velocity / fast-moving analytics). */
export function aggregateStockUsageFromSales(
	sales: { recipeId: string; quantity: number; soldAt: string }[],
	recipes: RecipeDTO[],
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[],
	sinceMs?: number
): Map<string, StockUsageLine & { packages: number }> {
	const recipeById = new Map(recipes.map((r) => [r.id, r]));
	const totals = new Map<string, StockUsageLine>();

	for (const sale of sales) {
		if (sinceMs !== undefined) {
			const t = new Date(sale.soldAt).getTime();
			if (Number.isNaN(t) || t < sinceMs) continue;
		}
		const recipe = recipeById.get(sale.recipeId);
		if (!recipe) continue;
		for (const line of computeRecipeStockUsage(recipe, sale.quantity, ingredientMasters, otherMasters)) {
			const key = `${line.kind}:${line.masterId}`;
			const cur = totals.get(key);
			if (cur) cur.packages += line.packages;
			else totals.set(key, { ...line });
		}
	}

	return totals;
}
