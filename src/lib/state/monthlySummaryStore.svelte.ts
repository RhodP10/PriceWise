import type { MonthlyFinancialSnapshot } from '$lib/types/statistics';

export const monthlySummaryStore = $state({
	rows: [] as MonthlyFinancialSnapshot[]
});

function newId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function upsertMonthlySnapshot(row: Omit<MonthlyFinancialSnapshot, 'id' | 'generatedAt'> & { id?: string }): void {
	const generatedAt = new Date().toISOString();
	const id = row.id ?? newId();
	const next: MonthlyFinancialSnapshot = {
		id,
		yearMonth: row.yearMonth,
		totalOpex: row.totalOpex,
		totalRevenue: row.totalRevenue,
		grossProfit: row.grossProfit,
		netProfit: row.netProfit,
		profitMarginPct: row.profitMarginPct,
		bestSupplier: row.bestSupplier,
		generatedAt,
		...(row.recipeBreakdown !== undefined ? { recipeBreakdown: row.recipeBreakdown } : {})
	};
	const without = monthlySummaryStore.rows.filter((r) => r.yearMonth !== row.yearMonth);
	monthlySummaryStore.rows = [...without, next].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

export function deleteMonthlySnapshot(id: string): void {
	monthlySummaryStore.rows = monthlySummaryStore.rows.filter((r) => r.id !== id);
}

export function replaceMonthlySummariesFromApi(next: MonthlyFinancialSnapshot[]): void {
	monthlySummaryStore.rows = structuredClone(next).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
}

export function resetMonthlySummaryStore(): void {
	monthlySummaryStore.rows = [];
}
