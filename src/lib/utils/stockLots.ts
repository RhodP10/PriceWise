import type { IngredientMasterDTO, MeasureUnit, OtherItemMasterDTO, StockPurchaseLot } from '$lib/types/recipe';
import { computeUnitCost, toBaseQuantity } from '$lib/utils/baseUnitCost';

type CatalogMaster = IngredientMasterDTO | OtherItemMasterDTO;

function newLotId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `lot_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function todayYmd(): string {
	return new Date().toISOString().slice(0, 10);
}

type LotEconomics = Pick<
	StockPurchaseLot,
	'purchasedOn' | 'packagePrice' | 'shippingFee' | 'packageSize' | 'packageUnit'
>;

/** Same calendar day + same package economics → one lot (quantities add up). */
export function lotMergeKey(lot: LotEconomics): string {
	return [
		lot.purchasedOn,
		lot.packagePrice.toFixed(4),
		lot.shippingFee.toFixed(4),
		lot.packageSize.toFixed(4),
		lot.packageUnit
	].join('|');
}

export interface ReceiveStockInput {
	packagePrice: number;
	shippingFee: number;
	packageSize: number;
	packageUnit: MeasureUnit;
	packagesQty: number;
	purchasedOn?: string;
}

/** Add packages to stock; merges into an existing lot when day + price match. */
export function receiveStock(lots: StockPurchaseLot[], input: ReceiveStockInput): StockPurchaseLot[] {
	const purchasedOn = input.purchasedOn ?? todayYmd();
	const base = toBaseQuantity(input.packageSize, input.packageUnit);
	const unitCost = computeUnitCost(input.packagePrice, input.shippingFee, base.quantity);
	const key = lotMergeKey({
		purchasedOn,
		packagePrice: input.packagePrice,
		shippingFee: input.shippingFee,
		packageSize: input.packageSize,
		packageUnit: input.packageUnit
	});

	const next = lots.map((l) => ({ ...l }));
	const idx = next.findIndex((l) => lotMergeKey(l) === key);
	if (idx >= 0) {
		const cur = next[idx]!;
		next[idx] = {
			...cur,
			packagesQty: cur.packagesQty + input.packagesQty,
			packagesRemaining: cur.packagesRemaining + input.packagesQty
		};
	} else {
		next.push({
			id: newLotId(),
			purchasedOn,
			packagePrice: input.packagePrice,
			shippingFee: input.shippingFee,
			packageSize: input.packageSize,
			packageUnit: input.packageUnit,
			baseQuantityPerPackage: base.quantity,
			unitCost,
			packagesQty: input.packagesQty,
			packagesRemaining: input.packagesQty,
			recordedAt: new Date().toISOString()
		});
	}

	next.sort(
		(a, b) => a.purchasedOn.localeCompare(b.purchasedOn) || a.recordedAt.localeCompare(b.recordedAt)
	);
	return next;
}

/** FIFO: deduct packages from oldest lots with remaining stock first. */
export function consumeStockFifo(
	lots: StockPurchaseLot[],
	packagesToUse: number
): { lots: StockPurchaseLot[]; consumed: number } {
	let remaining = Math.max(0, packagesToUse);
	const next = lots.map((l) => ({ ...l }));
	for (const lot of next) {
		if (remaining <= 1e-9) break;
		if (lot.packagesRemaining <= 1e-9) continue;
		const take = Math.min(lot.packagesRemaining, remaining);
		lot.packagesRemaining = Math.round((lot.packagesRemaining - take) * 1000) / 1000;
		remaining -= take;
	}
	return { lots: next, consumed: packagesToUse - remaining };
}

/** COGS uses the oldest open lot's unit cost (FIFO). */
export function fifoUnitCost(lots: StockPurchaseLot[] | undefined, fallback: number): number {
	const open = (lots ?? []).filter((l) => l.packagesRemaining > 1e-9);
	if (open.length === 0) return fallback;
	return open[0]!.unitCost;
}

export function weightedAvgUnitCost(lots: StockPurchaseLot[] | undefined, fallback: number): number {
	if (!lots?.length) return fallback;
	let totalBase = 0;
	let totalCost = 0;
	for (const l of lots) {
		if (l.packagesRemaining <= 1e-9) continue;
		const base = l.packagesRemaining * l.baseQuantityPerPackage;
		totalBase += base;
		totalCost += base * l.unitCost;
	}
	if (totalBase <= 1e-9) return fallback;
	return totalCost / totalBase;
}

export function totalPackagesRemaining(lots: StockPurchaseLot[] | undefined): number {
	if (!lots?.length) return 0;
	return lots.reduce((s, l) => s + l.packagesRemaining, 0);
}

/** One legacy lot when older workspace rows have no purchase history yet. */
export function ensurePurchaseLots(m: CatalogMaster): StockPurchaseLot[] {
	if (m.purchaseLots && m.purchaseLots.length > 0) return m.purchaseLots;
	const purchasedOn = (m.addedAt ?? new Date().toISOString()).slice(0, 10);
	return [
		{
			id: newLotId(),
			purchasedOn,
			packagePrice: m.packagePrice,
			shippingFee: m.shippingFee,
			packageSize: m.packageSize,
			packageUnit: m.packageUnit,
			baseQuantityPerPackage: m.baseQuantity,
			unitCost: m.unitCost,
			packagesQty: 1,
			packagesRemaining: 1,
			recordedAt: m.addedAt ?? new Date().toISOString()
		}
	];
}

/** Unit cost for recipe COGS — uses this batch's fixed price tier. */
export function catalogUnitCost(m: CatalogMaster): number {
	return m.unitCost;
}

export function buildInitialLotsFromMaster(
	m: Pick<
		CatalogMaster,
		'packagePrice' | 'shippingFee' | 'packageSize' | 'packageUnit' | 'baseQuantity' | 'unitCost'
	>,
	packagesQty = 1,
	purchasedOn?: string
): StockPurchaseLot[] {
	return receiveStock([], {
		packagePrice: m.packagePrice,
		shippingFee: m.shippingFee,
		packageSize: m.packageSize,
		packageUnit: m.packageUnit,
		packagesQty,
		purchasedOn
	});
}

export function syncMasterEconomicsFromLots(m: CatalogMaster): CatalogMaster {
	const lots = m.purchaseLots ?? [];
	const open = lots.filter((l) => l.packagesRemaining > 1e-9);
	const unitCost = fifoUnitCost(lots, m.unitCost);
	if (open.length === 0) {
		return { ...m, unitCost };
	}
	const lead = open[0]!;
	return {
		...m,
		packagePrice: lead.packagePrice,
		shippingFee: lead.shippingFee,
		packageSize: lead.packageSize,
		packageUnit: lead.packageUnit,
		baseQuantity: lead.baseQuantityPerPackage,
		unitCost
	};
}
