import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
import type { SaleTransaction } from '$lib/types/sales';
import type { MonthlyFinancialSnapshot } from '$lib/types/statistics';
import type { SmartPricingAnalyzePayload } from '$lib/types/smartPricing';
import type { CostingSettingsInput } from '$lib/utils/recipeCosting';
import { computeSpreadsheetCosting } from '$lib/utils/recipeCosting';

function catalogSlice(items: IngredientMasterDTO[] | OtherItemMasterDTO[]) {
	return items.map((m) => ({
		id: m.id,
		name: m.name,
		unitCost: m.unitCost,
		supplier: m.supplier ?? '',
		unitCostHistory: m.unitCostHistory ?? []
	}));
}

export function buildSmartPricingPayload(
	recipes: RecipeDTO[],
	ingredients: IngredientMasterDTO[],
	others: OtherItemMasterDTO[],
	summarySales: Record<string, number>,
	settings: CostingSettingsInput,
	historicalSnapshots: MonthlyFinancialSnapshot[] = [],
	actualSales: SaleTransaction[] = [],
	monthlyOpex: number = 0
): SmartPricingAnalyzePayload {
	const recipeRows = recipes.map((r) => {
		const sheet = computeSpreadsheetCosting(r, ingredients, others, settings);
		const suggested = Math.round(sheet.perOrder.regularSellingPrice * 100) / 100;
		const cogs = Math.round(sheet.perOrder.totalCost * 10000) / 10000;
		return {
			id: r.id,
			name: r.name,
			cogs,
			currentLocal: r.pricing.local,
			suggestedLocal: suggested,
			currentShopee: r.pricing.shopee,
			currentLazada: r.pricing.lazada,
			ingredientCogs: Math.round(sheet.perOrder.subtotalIngredients * 10000) / 10000,
			packagingCogs: Math.round(sheet.perOrder.otherCosts * 10000) / 10000
		};
	});

	return {
		ingredients: catalogSlice(ingredients),
		others: catalogSlice(others),
		recipes: recipeRows,
		summarySales: { ...summarySales },
		targetMarginPct: settings.targetMarginPct,
		monthlyOpex,
		historicalSnapshots: historicalSnapshots.map((s) => ({
			yearMonth: s.yearMonth,
			totalRevenue: s.totalRevenue,
			grossProfit: s.grossProfit,
			totalOpex: s.totalOpex,
			netProfit: s.netProfit
		})),
		actualSales: actualSales.map((s) => ({
			recipeId: s.recipeId,
			recipeName: s.recipeName,
			quantity: s.quantity,
			totalAmount: s.totalAmount,
			profit: s.profit,
			soldAt: s.soldAt
		}))
	};
}
