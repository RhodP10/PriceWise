import {
	getMaster as getIngredientMaster,
	receiveIngredientStock,
	useIngredientStock
} from '$lib/state/ingredientCatalog.svelte';
import {
	getOtherMaster,
	receiveOtherStock,
	useOtherStock
} from '$lib/state/otherCatalog.svelte';
import type { IngredientMasterDTO, OtherItemMasterDTO, RecipeDTO } from '$lib/types/recipe';
import type { SaleChannel, SaleStockDeduction, SaleTransaction } from '$lib/types/sales';
import { perOrderTotalCost } from '$lib/utils/recipeCosting';
import { computeRecipeStockUsage } from '$lib/utils/recipeStockDeduction';

export const salesStore = $state({
	transactions: [] as SaleTransaction[]
});

function newId(prefix: string): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
	return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function resetSalesStore(): void {
	salesStore.transactions = [];
}

export function replaceSalesTransactions(next: SaleTransaction[]): void {
	salesStore.transactions = structuredClone(next);
}

function deductStockForSale(
	saleId: string,
	recipe: RecipeDTO,
	orderQty: number,
	ingredientMasters: IngredientMasterDTO[],
	otherMasters: OtherItemMasterDTO[]
): SaleStockDeduction[] {
	const usage = computeRecipeStockUsage(recipe, orderQty, ingredientMasters, otherMasters);
	const note = `Sale ${saleId}: ${recipe.name} ×${orderQty}`;
	const deductions: SaleStockDeduction[] = [];

	for (const line of usage) {
		if (line.kind === 'ingredient') {
			const result = useIngredientStock(line.masterId, line.packages, note);
			if (result) {
				deductions.push({
					kind: 'ingredient',
					masterId: line.masterId,
					name: line.name,
					packages: result.consumed
				});
			}
		} else {
			const result = useOtherStock(line.masterId, line.packages, note);
			if (result) {
				deductions.push({
					kind: 'other',
					masterId: line.masterId,
					name: line.name,
					packages: result.consumed
				});
			}
		}
	}

	return deductions;
}

function restoreStockForSale(deductions: SaleStockDeduction[], saleId: string): void {
	const note = `Restored from deleted sale ${saleId}`;
	for (const d of deductions) {
		if (d.kind === 'ingredient') {
			const m = getIngredientMaster(d.masterId);
			if (!m) continue;
			receiveIngredientStock(
				d.masterId,
				{
					packagePrice: m.packagePrice,
					shippingFee: m.shippingFee,
					packageSize: m.packageSize,
					packageUnit: m.packageUnit,
					packagesQty: d.packages
				},
				note
			);
		} else {
			const m = getOtherMaster(d.masterId);
			if (!m) continue;
			receiveOtherStock(
				d.masterId,
				{
					packagePrice: m.packagePrice,
					shippingFee: m.shippingFee,
					packageSize: m.packageSize,
					packageUnit: m.packageUnit,
					packagesQty: d.packages
				},
				note
			);
		}
	}
}

export function recordSale(input: {
	recipe: RecipeDTO;
	quantity: number;
	sellingPrice?: number;
	channel?: SaleChannel;
	soldAt?: string;
	notes?: string;
	ingredientMasters: IngredientMasterDTO[];
	otherMasters: OtherItemMasterDTO[];
}): SaleTransaction {
	const qty = Math.max(1, Math.round(input.quantity));
	const unitPrice = input.sellingPrice ?? input.recipe.pricing.local;
	const cogs = perOrderTotalCost(input.recipe, input.ingredientMasters, input.otherMasters);
	const totalAmount = Math.round(unitPrice * qty * 100) / 100;
	const profit = Math.round((unitPrice - cogs) * qty * 100) / 100;
	const txnId = newId('txn');
	const saleId = newId('sale');
	const stockDeductions = deductStockForSale(
		saleId,
		input.recipe,
		qty,
		input.ingredientMasters,
		input.otherMasters
	);
	const row: SaleTransaction = {
		id: saleId,
		transactionId: txnId,
		recipeId: input.recipe.id,
		recipeName: input.recipe.name,
		quantity: qty,
		sellingPrice: unitPrice,
		totalAmount,
		profit,
		channel: input.channel ?? 'local',
		soldAt: input.soldAt ?? new Date().toISOString(),
		notes: input.notes?.trim() || undefined,
		stockDeductions: stockDeductions.length ? stockDeductions : undefined
	};
	salesStore.transactions = [row, ...salesStore.transactions];
	return row;
}

export function deleteSale(id: string): void {
	const sale = salesStore.transactions.find((t) => t.id === id);
	if (sale?.stockDeductions?.length) {
		restoreStockForSale(sale.stockDeductions, sale.id);
	}
	salesStore.transactions = salesStore.transactions.filter((t) => t.id !== id);
}
