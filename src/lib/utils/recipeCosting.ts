import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
import { convertQuantity } from '$lib/utils/unitConvert';

type MarketplaceChannel = 'lazada' | 'shopee';

function unitCostFromMarketplaceLanded(
	m: IngredientMasterDTO | OtherItemMasterDTO,
	ch: MarketplaceChannel
): number | null {
	const v = m.supplierChannelLanded?.[ch];
	if (typeof v !== 'number' || v <= 0 || m.baseQuantity <= 0) return null;
	return v / m.baseQuantity;
}

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

/** COGS for one order using marketplace landed prices; null if any line is missing that channel. */
export function perOrderTotalCostForMarketplace(
	recipe: RecipeDTO,
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[],
	ch: MarketplaceChannel
): number | null {
	let sum = 0;
	for (const line of recipe.ingredientLines) {
		const m = ingredientMasters.find((x) => x.id === line.ingredientMasterId);
		if (!m) return null;
		const u = unitCostFromMarketplaceLanded(m, ch);
		if (u === null) return null;
		const qtyInMasterUnit = convertQuantity(line.quantity, line.unit, m.baseUnit);
		if (qtyInMasterUnit === null) return null;
		sum += qtyInMasterUnit * u;
	}
	for (const line of recipe.otherLines) {
		const m = otherMasters.find((x) => x.id === line.otherMasterId);
		if (!m) return null;
		const u = unitCostFromMarketplaceLanded(m, ch);
		if (u === null) return null;
		const qtyInMasterUnit = convertQuantity(line.quantity, line.unit, m.baseUnit);
		if (qtyInMasterUnit === null) return null;
		sum += qtyInMasterUnit * u;
	}
	return sum;
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

/** Target list price from total COGS and margin-on-revenue rule (same as spreadsheet “regular selling price”). */
export function regularSellingPriceFromTotalCost(T: number, settings: CostingSettingsInput): number {
	const margin = settings.targetMarginPct;
	if (!Number.isFinite(T) || T < 0) return 0;
	return margin >= 100 ? T : T / (1 - margin / 100);
}

/** Local + optional marketplace list prices; Shopee/Lazada stay 0 until every line has that channel’s landed price. */
export function computeAutoSyncedRecipePricing(
	recipe: RecipeDTO,
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[],
	settings: CostingSettingsInput
): {
	local: number;
	shopee: number;
	lazada: number;
	cogsShopee: number | null;
	cogsLazada: number | null;
} {
	const sheet = computeSpreadsheetCosting(recipe, ingredientMasters, otherMasters, settings);
	const local = Math.round(sheet.perOrder.regularSellingPrice * 100) / 100;

	const tShopee = perOrderTotalCostForMarketplace(recipe, ingredientMasters, otherMasters, 'shopee');
	const tLazada = perOrderTotalCostForMarketplace(recipe, ingredientMasters, otherMasters, 'lazada');
	const shopee =
		tShopee === null ? 0 : Math.round(regularSellingPriceFromTotalCost(tShopee, settings) * 100) / 100;
	const lazada =
		tLazada === null ? 0 : Math.round(regularSellingPriceFromTotalCost(tLazada, settings) * 100) / 100;

	return { local, shopee, lazada, cogsShopee: tShopee, cogsLazada: tLazada };
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

	const regularSellingPrice = regularSellingPriceFromTotalCost(T, settings);

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
