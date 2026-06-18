import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
import type { MonthlyFinancialSnapshot, RecipeSalesSnapshotEntry } from '$lib/types/statistics';
import type { SaleTransaction, SalesPeriodTotals } from '$lib/types/sales';
import { batchStockPackages, isBatchOutOfStock } from '$lib/utils/catalogBatch';
import type { LiveMonthKpis } from '$lib/utils/dashboardFinance';
import { aggregateStockUsageFromSales } from '$lib/utils/recipeStockDeduction';
import { perOrderTotalCost } from '$lib/utils/recipeCosting';

function startOfDay(d: Date): Date {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function weekKey(d: Date): string {
	const day = startOfDay(d);
	const jan1 = new Date(day.getFullYear(), 0, 1);
	const days = Math.floor((day.getTime() - jan1.getTime()) / 86400000);
	const week = Math.ceil((days + jan1.getDay() + 1) / 7);
	return `${day.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function aggregateSales(
	sales: SaleTransaction[],
	granularity: 'day' | 'week' | 'month' | 'year'
): SalesPeriodTotals[] {
	const map = new Map<string, SalesPeriodTotals>();

	for (const s of sales) {
		const d = new Date(s.soldAt);
		if (Number.isNaN(d.getTime())) continue;
		let periodKey: string;
		let label: string;
		if (granularity === 'day') {
			periodKey = d.toISOString().slice(0, 10);
			label = periodKey;
		} else if (granularity === 'week') {
			periodKey = weekKey(d);
			label = periodKey;
		} else if (granularity === 'month') {
			periodKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
			label = periodKey;
		} else {
			periodKey = String(d.getFullYear());
			label = periodKey;
		}
		const cur = map.get(periodKey) ?? {
			periodKey,
			label,
			revenue: 0,
			profit: 0,
			quantity: 0,
			transactionCount: 0
		};
		cur.revenue += s.totalAmount;
		cur.profit += s.profit;
		cur.quantity += s.quantity;
		cur.transactionCount += 1;
		map.set(periodKey, cur);
	}

	return [...map.values()].sort((a, b) => a.periodKey.localeCompare(b.periodKey));
}

export function salesInYearMonth(sales: SaleTransaction[], yearMonth: string): SaleTransaction[] {
	return sales.filter((s) => s.soldAt.slice(0, 7) === yearMonth);
}

export function buildRecipeBreakdownFromSales(
	sales: SaleTransaction[],
	yearMonth: string
): RecipeSalesSnapshotEntry[] {
	const map = new Map<string, RecipeSalesSnapshotEntry>();
	for (const s of salesInYearMonth(sales, yearMonth)) {
		const cur = map.get(s.recipeId) ?? {
			recipeId: s.recipeId,
			recipeName: s.recipeName,
			orders: 0,
			revenue: 0,
			profit: 0
		};
		cur.orders += s.quantity;
		cur.revenue += s.totalAmount;
		cur.profit += s.profit;
		map.set(s.recipeId, cur);
	}
	return [...map.values()];
}

export function monthKpisFromActualSales(
	sales: SaleTransaction[],
	yearMonth: string,
	totalOpex: number
): Pick<LiveMonthKpis, 'totalRevenue' | 'grossProfit' | 'netProfit' | 'profitMarginPct'> | null {
	const month = salesInYearMonth(sales, yearMonth);
	if (month.length === 0) return null;
	const totalRevenue = month.reduce((s, t) => s + t.totalAmount, 0);
	const grossProfit = month.reduce((s, t) => s + t.profit, 0);
	const netProfit = grossProfit - totalOpex;
	const profitMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
	return { totalRevenue, grossProfit, netProfit, profitMarginPct };
}

export interface ProductRanking {
	recipeId: string;
	name: string;
	quantity: number;
	revenue: number;
	profit: number;
	marginPct: number;
}

export function productRankings(sales: SaleTransaction[]): ProductRanking[] {
	const map = new Map<string, ProductRanking>();
	for (const s of sales) {
		const cur = map.get(s.recipeId) ?? {
			recipeId: s.recipeId,
			name: s.recipeName,
			quantity: 0,
			revenue: 0,
			profit: 0,
			marginPct: 0
		};
		cur.quantity += s.quantity;
		cur.revenue += s.totalAmount;
		cur.profit += s.profit;
		map.set(s.recipeId, cur);
	}
	return [...map.values()].map((r) => ({
		...r,
		marginPct: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0
	}));
}

export interface InventoryHealthRow {
	id: string;
	name: string;
	packagePrice: number;
	stockPkgs: number;
	unitCost: number;
	value: number;
	status: 'ok' | 'low' | 'out';
}

export function inventoryHealth(
	ingredients: IngredientMasterDTO[],
	others: OtherItemMasterDTO[],
	lowThreshold = 3
): {
	totalValue: number;
	rows: InventoryHealthRow[];
	fastMoving: InventoryHealthRow[];
	slowMoving: InventoryHealthRow[];
	outOfStock: InventoryHealthRow[];
	lowStock: InventoryHealthRow[];
} {
	const rows: InventoryHealthRow[] = [...ingredients, ...others].map((m) => {
		const stockPkgs = batchStockPackages(m);
		const value = stockPkgs * m.packagePrice;
		let status: InventoryHealthRow['status'] = 'ok';
		if (isBatchOutOfStock(m)) status = 'out';
		else if (stockPkgs <= lowThreshold) status = 'low';
		return {
			id: m.id,
			name: m.name,
			packagePrice: m.packagePrice,
			stockPkgs,
			unitCost: m.unitCost,
			value,
			status
		};
	});
	const totalValue = rows.reduce((s, r) => s + r.value, 0);
	const outOfStock = rows.filter((r) => r.status === 'out');
	const lowStock = rows.filter((r) => r.status === 'low');
	return {
		totalValue,
		rows,
		fastMoving: [],
		slowMoving: [],
		outOfStock,
		lowStock
	};
}

export interface InventoryVelocityRow {
	id: string;
	name: string;
	kind: 'ingredient' | 'other';
	packagesUsed: number;
	stockPkgs: number;
	perDay: number;
}

/** Fast/slow inventory batches from recorded sales (stock deducted on each sale). */
export function inventoryVelocityFromSales(
	sales: SaleTransaction[],
	recipes: RecipeDTO[],
	ingredients: IngredientMasterDTO[],
	others: OtherItemMasterDTO[],
	windowDays = 30
): {
	rows: InventoryVelocityRow[];
	fastMoving: InventoryVelocityRow[];
	slowMoving: InventoryVelocityRow[];
} {
	const sinceMs = Date.now() - windowDays * 86400000;
	const usage = aggregateStockUsageFromSales(sales, recipes, ingredients, others, sinceMs);
	const rows: InventoryVelocityRow[] = [];

	for (const m of ingredients) {
		const key = `ingredient:${m.id}`;
		const used = usage.get(key)?.packages ?? 0;
		const stockPkgs = batchStockPackages(m);
		rows.push({
			id: m.id,
			name: m.name,
			kind: 'ingredient',
			packagesUsed: Math.round(used * 1000) / 1000,
			stockPkgs,
			perDay: Math.round((used / windowDays) * 1000) / 1000
		});
	}
	for (const m of others) {
		const key = `other:${m.id}`;
		const used = usage.get(key)?.packages ?? 0;
		const stockPkgs = batchStockPackages(m);
		rows.push({
			id: m.id,
			name: m.name,
			kind: 'other',
			packagesUsed: Math.round(used * 1000) / 1000,
			stockPkgs,
			perDay: Math.round((used / windowDays) * 1000) / 1000
		});
	}

	const withUsage = rows.filter((r) => r.packagesUsed > 1e-9).sort((a, b) => b.packagesUsed - a.packagesUsed);
	const withStock = rows.filter((r) => r.stockPkgs > 1e-9).sort((a, b) => a.packagesUsed - b.packagesUsed);

	return {
		rows,
		fastMoving: withUsage.slice(0, 5),
		slowMoving: withStock.slice(0, 5)
	};
}

export interface ExecutiveSummary {
	totalRevenue: number;
	totalOpex: number;
	grossProfit: number;
	netProfit: number;
	avgMarginPct: number;
	bestProduct: string;
	worstProduct: string;
	actualRevenue: number;
	actualProfit: number;
	projectedRevenue: number;
}

export function computeExecutiveSummary(
	live: LiveMonthKpis,
	snapshots: MonthlyFinancialSnapshot[],
	sales: SaleTransaction[],
	recipes: RecipeDTO[]
): ExecutiveSummary {
	const rankings = productRankings(sales);
	const actualRevenue = sales.reduce((s, t) => s + t.totalAmount, 0);
	const actualProfit = sales.reduce((s, t) => s + t.profit, 0);

	const latest = snapshots.length
		? [...snapshots].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))[0]
		: null;

	const totalRevenue = actualRevenue > 0 ? actualRevenue : (latest?.totalRevenue ?? live.totalRevenue);
	const grossProfit = actualProfit > 0 ? actualProfit + live.totalOpex : (latest?.grossProfit ?? live.grossProfit);
	const totalOpex = latest?.totalOpex ?? live.totalOpex;
	const netProfit = totalRevenue > 0 ? grossProfit - totalOpex : (latest?.netProfit ?? live.netProfit);
	const avgMarginPct = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

	const byProfit = [...rankings].sort((a, b) => b.profit - a.profit);
	const bestProduct = byProfit[0]?.name ?? recipes[0]?.name ?? '—';
	const worstProduct = byProfit.length > 1 ? byProfit[byProfit.length - 1]!.name : '—';

	return {
		totalRevenue,
		totalOpex,
		grossProfit,
		netProfit,
		avgMarginPct,
		bestProduct,
		worstProduct,
		actualRevenue,
		actualProfit,
		projectedRevenue: live.totalRevenue
	};
}

export interface FullExecutiveKpis {
	totalRevenue: number;
	totalTransactions: number;
	totalOpex: number;
	grossProfit: number;
	netProfit: number;
	avgMarginPct: number;
	bestSellingProduct: string;
	lowestPerformingProduct: string;
	totalInventoryValue: number;
	activeProducts: number;
	totalUnitsSold: number;
	actualRevenue: number;
	projectedRevenue: number;
}

export function computeFullExecutiveKpis(
	live: LiveMonthKpis,
	snapshots: MonthlyFinancialSnapshot[],
	sales: SaleTransaction[],
	recipes: RecipeDTO[],
	ingredients: IngredientMasterDTO[],
	others: OtherItemMasterDTO[]
): FullExecutiveKpis {
	const base = computeExecutiveSummary(live, snapshots, sales, recipes);
	const inv = inventoryHealth(ingredients, others);
	const rankings = productRankings(sales);
	const byQty = [...rankings].sort((a, b) => b.quantity - a.quantity);
	const byQtyAsc = [...rankings].filter((r) => r.quantity > 0).sort((a, b) => a.quantity - b.quantity);
	const soldRecipes = new Set(sales.map((s) => s.recipeId));

	return {
		totalRevenue: base.totalRevenue,
		totalTransactions: sales.length,
		totalOpex: base.totalOpex,
		grossProfit: base.grossProfit,
		netProfit: base.netProfit,
		avgMarginPct: base.avgMarginPct,
		bestSellingProduct: byQty[0]?.name ?? base.bestProduct,
		lowestPerformingProduct: byQtyAsc[0]?.name ?? base.worstProduct,
		totalInventoryValue: inv.totalValue,
		activeProducts: soldRecipes.size || recipes.length,
		totalUnitsSold: sales.reduce((s, t) => s + t.quantity, 0),
		actualRevenue: base.actualRevenue,
		projectedRevenue: base.projectedRevenue
	};
}

export interface SalesMetricsSummary {
	totalTransactions: number;
	totalUnits: number;
	averageOrderValue: number;
	revenueGrowthPct: number | null;
	daily: SalesPeriodTotals[];
	weekly: SalesPeriodTotals[];
	monthly: SalesPeriodTotals[];
	yearly: SalesPeriodTotals[];
}

export function computeSalesMetrics(sales: SaleTransaction[]): SalesMetricsSummary {
	const daily = aggregateSales(sales, 'day');
	const weekly = aggregateSales(sales, 'week');
	const monthly = aggregateSales(sales, 'month');
	const yearly = aggregateSales(sales, 'year');
	const totalRevenue = sales.reduce((s, t) => s + t.totalAmount, 0);
	const totalUnits = sales.reduce((s, t) => s + t.quantity, 0);
	let revenueGrowthPct: number | null = null;
	if (monthly.length >= 2) {
		const prev = monthly[monthly.length - 2]!.revenue;
		const cur = monthly[monthly.length - 1]!.revenue;
		if (prev > 1e-9) revenueGrowthPct = ((cur - prev) / prev) * 100;
	}
	return {
		totalTransactions: sales.length,
		totalUnits,
		averageOrderValue: sales.length > 0 ? totalRevenue / sales.length : 0,
		revenueGrowthPct,
		daily,
		weekly,
		monthly,
		yearly
	};
}

export function filterSalesByRange(
	sales: SaleTransaction[],
	from?: string,
	to?: string
): SaleTransaction[] {
	return sales.filter((s) => {
		const d = s.soldAt.slice(0, 10);
		if (from && d < from) return false;
		if (to && d > to) return false;
		return true;
	});
}

export interface ProductProfitabilityRow {
	recipeId: string;
	name: string;
	quantity: number;
	revenue: number;
	cogsPerOrder: number;
	totalCogs: number;
	profit: number;
	marginPct: number;
}

export function productProfitabilityTable(
	sales: SaleTransaction[],
	recipes: RecipeDTO[],
	ingredients: IngredientMasterDTO[],
	others: OtherItemMasterDTO[]
): ProductProfitabilityRow[] {
	const map = new Map<string, ProductProfitabilityRow>();
	for (const s of sales) {
		const recipe = recipes.find((r) => r.id === s.recipeId);
		const cogsPerOrder = recipe ? perOrderTotalCost(recipe, ingredients, others) : s.totalAmount - s.profit;
		const cur = map.get(s.recipeId) ?? {
			recipeId: s.recipeId,
			name: s.recipeName,
			quantity: 0,
			revenue: 0,
			cogsPerOrder,
			totalCogs: 0,
			profit: 0,
			marginPct: 0
		};
		cur.quantity += s.quantity;
		cur.revenue += s.totalAmount;
		cur.totalCogs += cogsPerOrder * s.quantity;
		cur.profit += s.profit;
		map.set(s.recipeId, cur);
	}
	return [...map.values()].map((r) => ({
		...r,
		marginPct: r.revenue > 0 ? (r.profit / r.revenue) * 100 : 0
	}));
}

export interface DecliningProductRow {
	recipeId: string;
	name: string;
	recentQty: number;
	priorQty: number;
	declinePct: number;
}

export function decliningProducts(
	sales: SaleTransaction[],
	daysRecent = 14,
	daysPrior = 14
): DecliningProductRow[] {
	const now = Date.now();
	const recentStart = now - daysRecent * 86400000;
	const priorStart = now - (daysRecent + daysPrior) * 86400000;
	const recent = new Map<string, { name: string; qty: number }>();
	const prior = new Map<string, { name: string; qty: number }>();

	for (const s of sales) {
		const t = new Date(s.soldAt).getTime();
		if (Number.isNaN(t)) continue;
		if (t >= recentStart) {
			const cur = recent.get(s.recipeId) ?? { name: s.recipeName, qty: 0 };
			cur.qty += s.quantity;
			recent.set(s.recipeId, cur);
		} else if (t >= priorStart && t < recentStart) {
			const cur = prior.get(s.recipeId) ?? { name: s.recipeName, qty: 0 };
			cur.qty += s.quantity;
			prior.set(s.recipeId, cur);
		}
	}

	const out: DecliningProductRow[] = [];
	for (const [recipeId, p] of prior) {
		const r = recent.get(recipeId);
		if (!r || p.qty <= 0) continue;
		if (r.qty < p.qty) {
			out.push({
				recipeId,
				name: p.name,
				recentQty: r.qty,
				priorQty: p.qty,
				declinePct: ((p.qty - r.qty) / p.qty) * 100
			});
		}
	}
	return out.sort((a, b) => b.declinePct - a.declinePct);
}

export interface IngredientCostTrendRow {
	id: string;
	name: string;
	kind: 'ingredient' | 'other';
	current: number;
	prior: number | null;
	changePct: number | null;
	direction: 'up' | 'down' | 'stable';
}

function costTrendForMaster(
	m: IngredientMasterDTO | OtherItemMasterDTO,
	kind: 'ingredient' | 'other'
): IngredientCostTrendRow {
	const hist = m.unitCostHistory ?? [];
	const current = m.unitCost;
	let prior: number | null = null;
	if (hist.length >= 2) {
		const sorted = [...hist].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
		prior = sorted[sorted.length - 2]!.unitCost;
	} else if (hist.length === 1) {
		prior = hist[0]!.unitCost;
	}
	let changePct: number | null = null;
	let direction: IngredientCostTrendRow['direction'] = 'stable';
	if (prior !== null && prior > 1e-9) {
		changePct = ((current - prior) / prior) * 100;
		if (changePct > 1) direction = 'up';
		else if (changePct < -1) direction = 'down';
	}
	return { id: m.id, name: m.name, kind, current, prior, changePct, direction };
}

export function ingredientCostTrends(
	ingredients: IngredientMasterDTO[],
	others: OtherItemMasterDTO[]
): {
	increases: IngredientCostTrendRow[];
	decreases: IngredientCostTrendRow[];
	all: IngredientCostTrendRow[];
} {
	const all = [
		...ingredients.map((m) => costTrendForMaster(m, 'ingredient')),
		...others.map((m) => costTrendForMaster(m, 'other'))
	];
	return {
		all,
		increases: all.filter((r) => r.direction === 'up').sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0)),
		decreases: all.filter((r) => r.direction === 'down').sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0))
	};
}

export interface ProfitabilityPoint {
	periodKey: string;
	label: string;
	revenue: number;
	expenses: number;
	grossProfit: number;
	netProfit: number;
	marginPct: number;
}

export function buildProfitabilitySeries(
	snapshots: MonthlyFinancialSnapshot[],
	sales: SaleTransaction[],
	monthlyOpex: number
): ProfitabilityPoint[] {
	const fromSnapshots: ProfitabilityPoint[] = [...snapshots]
		.sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
		.map((s) => ({
			periodKey: s.yearMonth,
			label: s.yearMonth,
			revenue: s.totalRevenue,
			expenses: s.totalOpex + (s.totalRevenue - s.grossProfit),
			grossProfit: s.grossProfit,
			netProfit: s.netProfit,
			marginPct: s.profitMarginPct
		}));

	if (fromSnapshots.length > 0) return fromSnapshots;

	return aggregateSales(sales, 'month').map((m) => {
		const grossProfit = m.profit;
		const netProfit = grossProfit - monthlyOpex;
		return {
			periodKey: m.periodKey,
			label: m.label,
			revenue: m.revenue,
			expenses: m.revenue - grossProfit + monthlyOpex,
			grossProfit,
			netProfit,
			marginPct: m.revenue > 0 ? (netProfit / m.revenue) * 100 : 0
		};
	});
}
