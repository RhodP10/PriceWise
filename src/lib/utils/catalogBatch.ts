import type { IngredientMasterDTO, MeasureUnit, OtherItemMasterDTO, StockPurchaseLot } from '$lib/types/recipe';
import { formatCatalogDateShort } from '$lib/utils/catalogDisplay';
import { totalPackagesRemaining } from '$lib/utils/stockLots';
import { formatPhp } from '$lib/utils/numberFormat';

type CatalogMaster = IngredientMasterDTO | OtherItemMasterDTO;

export type BatchEconomics = Pick<
	CatalogMaster,
	'name' | 'supplier' | 'packagePrice' | 'shippingFee' | 'packageSize' | 'packageUnit'
>;

/** One inventory card = same product + supplier + package economics (price tier). */
export function catalogBatchKey(row: BatchEconomics): string {
	return [
		row.name.trim().toLowerCase(),
		row.supplier.trim().toLowerCase(),
		row.packagePrice.toFixed(4),
		row.shippingFee.toFixed(4),
		row.packageSize.toFixed(4),
		row.packageUnit
	].join('|');
}

export function batchKeyFromLot(
	name: string,
	supplier: string,
	lot: Pick<StockPurchaseLot, 'packagePrice' | 'shippingFee' | 'packageSize' | 'packageUnit'>
): string {
	return catalogBatchKey({
		name,
		supplier,
		packagePrice: lot.packagePrice,
		shippingFee: lot.shippingFee,
		packageSize: lot.packageSize,
		packageUnit: lot.packageUnit
	});
}

export function batchStockPackages(row: CatalogMaster): number {
	return totalPackagesRemaining(row.purchaseLots);
}

/** Recipe picker & cards: show name, batch price, and stock. */
export function catalogBatchLabel(row: CatalogMaster): string {
	const stock = batchStockPackages(row);
	const price = formatPhp(row.packagePrice);
	const supplier = row.supplier.trim();
	const stockLabel = `${stock} pkg`;
	if (supplier) return `${row.name} — ${price} (${stockLabel}) · ${supplier}`;
	return `${row.name} — ${price} (${stockLabel})`;
}

export function catalogBatchPriceTag(row: CatalogMaster): string {
	return formatPhp(row.packagePrice);
}

export function productNameKey(name: string): string {
	return name.trim().toLowerCase();
}

/** Batches for one product only (e.g. all Barista Milk price tiers). */
export function batchesForProductName<T extends CatalogMaster>(items: T[], productName: string): T[] {
	const key = productNameKey(productName);
	if (!key) return [];
	return items.filter((i) => productNameKey(i.name) === key);
}

export function uniqueProductNames(items: CatalogMaster[]): string[] {
	const seen = new Map<string, string>();
	for (const i of items) {
		const key = productNameKey(i.name);
		if (!key || seen.has(key)) continue;
		seen.set(key, i.name.trim());
	}
	return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function isBatchOutOfStock(row: CatalogMaster): boolean {
	return batchStockPackages(row) <= 1e-9;
}

/** Recipe batch dropdown — price, stock, date, out-of-stock marker. */
export function recipeBatchOptionLabel(row: CatalogMaster): string {
	const stock = batchStockPackages(row);
	const price = formatPhp(row.packagePrice);
	const added = formatCatalogDateShort(row.addedAt);
	const supplier = row.supplier.trim();
	if (isBatchOutOfStock(row)) {
		return `${row.name} — ${price} · OUT OF STOCK · added ${added}`;
	}
	const stockLabel = `${stock} pkg`;
	if (supplier) return `${row.name} — ${price} · ${stockLabel} · added ${added} · ${supplier}`;
	return `${row.name} — ${price} · ${stockLabel} · added ${added}`;
}

/** First in-stock batch for a product, else first batch. */
export function defaultBatchForProduct<T extends CatalogMaster>(
	items: T[],
	productName: string
): T | undefined {
	const batches = batchesForProductName(items, productName);
	return batches.find((b) => !isBatchOutOfStock(b)) ?? batches[0];
}
