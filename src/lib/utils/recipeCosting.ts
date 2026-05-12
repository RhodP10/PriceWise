import type {
	IngredientMasterDTO,
	OtherItemMasterDTO,
	RecipeDTO,
	RecipePricingDTO
} from '$lib/types/recipe';
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

export type RecipeMarketSavingsChannel = 'lazada' | 'shopee';

/**
 * Compare catalog (local package) COGS vs Shopee/Lazada landed COGS from scraped marketplace prices.
 * A channel counts only when every ingredient and “other” line has that channel’s landed package total filled in.
 */
export function computeRecipeMarketIngredientSavingsVsCatalog(
	recipe: RecipeDTO,
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[]
): {
	localCogs: number;
	shopeeCogs: number | null;
	lazadaCogs: number | null;
	/** Per-order ingredient savings when the cheapest covered marketplace beats catalog COGS. */
	savedPerOrder: number | null;
	bestMarketplace: RecipeMarketSavingsChannel | null;
} {
	const localCogs = perOrderTotalCost(recipe, ingredientMasters, otherMasters);
	const shopeeCogs = perOrderTotalCostForMarketplace(recipe, ingredientMasters, otherMasters, 'shopee');
	const lazadaCogs = perOrderTotalCostForMarketplace(recipe, ingredientMasters, otherMasters, 'lazada');

	const market: { ch: RecipeMarketSavingsChannel; cogs: number }[] = [];
	if (lazadaCogs !== null) market.push({ ch: 'lazada', cogs: lazadaCogs });
	if (shopeeCogs !== null) market.push({ ch: 'shopee', cogs: shopeeCogs });

	if (market.length === 0) {
		return { localCogs, shopeeCogs, lazadaCogs, savedPerOrder: null, bestMarketplace: null };
	}

	let best = market[0]!;
	for (const m of market.slice(1)) {
		if (m.cogs < best.cogs - 1e-9) best = m;
		else if (Math.abs(m.cogs - best.cogs) < 1e-9 && m.ch === 'lazada') best = m;
	}

	if (best.cogs >= localCogs - 1e-9) {
		return { localCogs, shopeeCogs, lazadaCogs, savedPerOrder: null, bestMarketplace: null };
	}

	const savedPerOrder = Math.round((localCogs - best.cogs) * 100) / 100;
	return {
		localCogs,
		shopeeCogs,
		lazadaCogs,
		savedPerOrder: savedPerOrder > 0 ? savedPerOrder : null,
		bestMarketplace: best.ch
	};
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

const PRICE_EPS = 0.005;

/** True when stored recipe list prices already match auto-sync from catalog + settings. */
export function recipePricingMatchesSuggested(
	current: RecipePricingDTO,
	suggested: Pick<RecipePricingDTO, 'local' | 'shopee' | 'lazada'>
): boolean {
	return (
		Math.abs(current.local - suggested.local) < PRICE_EPS &&
		Math.abs(current.shopee - suggested.shopee) < PRICE_EPS &&
		Math.abs(current.lazada - suggested.lazada) < PRICE_EPS
	);
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
