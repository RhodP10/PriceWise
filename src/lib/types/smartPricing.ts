/** Request body for `POST /ml/smart-pricing/analyze` (camelCase JSON). */
export type SmartPricingAnalyzePayload = {
	ingredients: {
		id: string;
		name: string;
		unitCost: number;
		supplier: string;
		unitCostHistory: { recordedAt: string; unitCost: number }[];
	}[];
	others: {
		id: string;
		name: string;
		unitCost: number;
		supplier: string;
		unitCostHistory: { recordedAt: string; unitCost: number }[];
	}[];
	recipes: {
		id: string;
		name: string;
		cogs: number;
		currentLocal: number;
		suggestedLocal: number;
		currentShopee: number;
		currentLazada: number;
		ingredientCogs?: number;
		packagingCogs?: number;
	}[];
	summarySales: Record<string, number>;
	targetMarginPct: number;
	monthlyOpex?: number;
	historicalSnapshots?: {
		yearMonth: string;
		totalRevenue: number;
		grossProfit: number;
		totalOpex: number;
		netProfit: number;
	}[];
	actualSales?: {
		recipeId: string;
		recipeName: string;
		quantity: number;
		totalAmount: number;
		profit: number;
		soldAt: string;
	}[];
};

export type SmartPricingAnalysisResult = {
	ingredientForecasts: {
		id: string;
		name: string;
		current: number;
		predictedNext: number;
		confidence: number;
		trendPct: number | null;
	}[];
	volatility: { id: string; name: string; risk: string; note: string }[];
	demandSignals: {
		recipeId: string;
		name: string;
		level: string;
		ordersNextMonthHint?: number;
		actualQtyTotal?: number;
	}[];
	sellingPriceRecommendations: {
		recipeId: string;
		name: string;
		channel: string;
		current: number;
		suggested: number;
		cogs: number;
		marginPctCurrent: number;
		marginPctSuggested: number;
		competitorAvg: number | null;
		deltaPctVsCurrent: number;
		confidence: number;
		reasons: string[];
	}[];
	profitPerOrderHint: {
		recipeId: string;
		name: string;
		profitPerOrderCurrent: number;
		profitPerOrderSuggested: number;
	}[];
	supplierTips: { severity: string; text: string }[];
	alerts: { type: string; text: string }[];
	modelNotes: string;
	echo?: { ingredientCount: number; recipeCount: number };
	salesForecasts?: {
		recipeId: string;
		name: string;
		actualMonthlyAvg: number;
		projectedNextMonth: number;
		confidence: number;
		source: string;
	}[];
	businessForecasts?: {
		metric: string;
		label: string;
		current: number;
		projectedNextMonth: number;
		confidence: number;
	}[];
	actualVsProjectedDemand?: {
		recipeId: string;
		name: string;
		actualQty: number;
		projectedQty: number;
		variancePct: number | null;
	}[];
	costBreakdown?: {
		recipeId: string;
		name: string;
		ingredientCost: number;
		packagingCost: number;
		utilityCost: number;
		laborCost: number;
		opexAllocation: number;
		totalCost: number;
	}[];
	regressionModels?: {
		recipeId: string;
		name: string;
		linearPrice: number;
		multipleRegressionPrice: number;
		polynomialPrice: number;
		recommendedPrice: number;
		expectedMarginPct: number;
		confidence: number;
		revenueImpact: number;
	}[];
	mlInsights?: {
		pricedTooLow: { recipeId: string; name: string; current: number; suggested: number }[];
		pricedTooHigh: { recipeId: string; name: string; current: number; suggested: number }[];
		mostProfitable: { recipeId: string; name: string; profitPerOrder: number }[];
		growthPotential: { recipeId: string; name: string; reason: string }[];
		needsAdjustment: { recipeId: string; name: string; reason: string }[];
	};
};
