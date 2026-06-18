export type SaleChannel = 'local' | 'shopee' | 'lazada';

/** One recorded sale line — persisted in workspace JSON. */
export interface SaleTransaction {
	id: string;
	transactionId: string;
	recipeId: string;
	recipeName: string;
	quantity: number;
	sellingPrice: number;
	totalAmount: number;
	profit: number;
	channel: SaleChannel;
	soldAt: string;
	notes?: string;
	/** Ingredient/other batches deducted when this sale was recorded */
	stockDeductions?: SaleStockDeduction[];
}

export interface SaleStockDeduction {
	kind: 'ingredient' | 'other';
	masterId: string;
	name: string;
	packages: number;
}

export interface SalesPeriodTotals {
	periodKey: string;
	label: string;
	revenue: number;
	profit: number;
	quantity: number;
	transactionCount: number;
}
