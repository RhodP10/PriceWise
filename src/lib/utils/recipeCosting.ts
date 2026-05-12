import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
import { convertQuantity } from '$lib/utils/unitConvert';

export function lineTotal(qty: number, costPerUnit: number): number {
	return qty * costPerUnit;
}

export function recipeIngredientSubtotal(recipe: RecipeDTO, masters: IngredientMasterDTO[]): number {
	let sum = 0;
	for (const line of recipe.ingredientLines) {
		const m = masters.find((x) => x.id === line.ingredientMasterId);
		if (!m) continue;
		const qtyInMasterUnit = convertQuantity(line.quantity, line.unit, m.baseUnit);
		if (qtyInMasterUnit === null) continue;
		sum += qtyInMasterUnit * m.unitCost;
	}
	return sum;
}

export function recipeOtherSubtotal(recipe: RecipeDTO, otherMasters: OtherItemMasterDTO[]): number {
	let sum = 0;
	for (const line of recipe.otherLines) {
		const m = otherMasters.find((x) => x.id === line.otherMasterId);
		if (!m) continue;
		const qtyInMasterUnit = convertQuantity(line.quantity, line.unit, m.baseUnit);
		if (qtyInMasterUnit === null) continue;
		sum += qtyInMasterUnit * m.unitCost;
	}
	return sum;
}

export function perOrderTotalCost(
	recipe: RecipeDTO,
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[]
): number {
	return recipeIngredientSubtotal(recipe, ingredientMasters) + recipeOtherSubtotal(recipe, otherMasters);
}

export interface CostingSettingsInput {
	vatRegistered: boolean;
	vatPct: number;
	batchSize: number;
	targetMarginPct: number;
	discountPct: number;
}

export interface SpreadsheetCostingResult {
	perOrder: {
		subtotalIngredients: number;
		otherCosts: number;
		totalCost: number;
		regularSellingPrice: number;
		priceBeforeVAT: number;
		vatAmount: number;
		profitPerOrder: number;
	};
	perBatch: {
		subtotalIngredients: number;
		otherCosts: number;
		totalCost: number;
	};
	discount: {
		discountAmount: number;
		discountedPrice: number;
	};
}

/** Mirrors spreadsheet: margin on selling price, optional VAT-inclusive breakdown, discount row */
export function computeSpreadsheetCosting(
	recipe: RecipeDTO,
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[],
	settings: CostingSettingsInput
): SpreadsheetCostingResult {
	const B = Math.max(1, settings.batchSize);
	const I = recipeIngredientSubtotal(recipe, ingredientMasters);
	const O = recipeOtherSubtotal(recipe, otherMasters);
	const T = I + O;

	const margin = settings.targetMarginPct;
	const regularSellingPrice = margin >= 100 ? T : T / (1 - margin / 100);

	let priceBeforeVAT: number;
	let vatAmount: number;
	if (settings.vatRegistered && settings.vatPct > 0) {
		priceBeforeVAT = regularSellingPrice / (1 + settings.vatPct / 100);
		vatAmount = regularSellingPrice - priceBeforeVAT;
	} else {
		priceBeforeVAT = regularSellingPrice;
		vatAmount = 0;
	}

	const profitPerOrder = regularSellingPrice - T;
	const discountAmount = regularSellingPrice * (settings.discountPct / 100);
	const discountedPrice = regularSellingPrice - discountAmount;

	return {
		perOrder: {
			subtotalIngredients: I,
			otherCosts: O,
			totalCost: T,
			regularSellingPrice,
			priceBeforeVAT,
			vatAmount,
			profitPerOrder
		},
		perBatch: {
			subtotalIngredients: I * B,
			otherCosts: O * B,
			totalCost: T * B
		},
		discount: {
			discountAmount,
			discountedPrice
		}
	};
}

export function marginPercentAtPrice(sellingPrice: number, totalCost: number): number {
	if (sellingPrice <= 0) return 0;
	return ((sellingPrice - totalCost) / sellingPrice) * 100;
}
