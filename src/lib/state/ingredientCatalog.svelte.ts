import { mockIngredientMasters } from '$lib/data/mockIngredientMasters';
import type {
	ChannelMarketplace,
	ChannelScrapeInfo,
	IngredientMasterDTO,
	IngredientMasterInput,
	MeasureUnit
} from '$lib/types/recipe';
import { computeUnitCost, toBaseQuantity } from '$lib/utils/baseUnitCost';

export const ingredientCatalog = $state({
	items: structuredClone(mockIngredientMasters) as IngredientMasterDTO[]
});

export function computeCatalogUnitCost(input: {
	packagePrice: number;
	shippingFee: number;
	packageSize: number;
	packageUnit: MeasureUnit;
}): number {
	const base = toBaseQuantity(input.packageSize, input.packageUnit);
	if (base.quantity <= 0) return 0;
	return computeUnitCost(input.packagePrice, input.shippingFee, base.quantity);
}

function mergeChannelScrape(
	prev: IngredientMasterDTO['channelScrape'],
	patch: Partial<Record<ChannelMarketplace, Partial<ChannelScrapeInfo>>>
): IngredientMasterDTO['channelScrape'] {
	const next: NonNullable<IngredientMasterDTO['channelScrape']> = { ...prev };
	for (const [k, v] of Object.entries(patch) as [ChannelMarketplace, Partial<ChannelScrapeInfo>][]) {
		const merged = { ...prev?.[k], ...v };
		next[k] = {
			status: merged.status ?? prev?.[k]?.status ?? 'idle',
			url: merged.url,
			updatedAt: merged.updatedAt,
			listingPackageSize: merged.listingPackageSize,
			listingPackageUnit: merged.listingPackageUnit,
			listingShippingFee: merged.listingShippingFee,
			listingBaseQuantity: merged.listingBaseQuantity,
			listingBaseUnit: merged.listingBaseUnit
		};
	}
	return next;
}

function newId(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `mid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function addIngredientMaster(input: IngredientMasterInput): IngredientMasterDTO {
	const base = toBaseQuantity(input.packageSize, input.packageUnit);
	const unitCost = computeUnitCost(input.packagePrice, input.shippingFee, base.quantity);
	const row: IngredientMasterDTO = {
		id: newId(),
		name: input.name.trim(),
		supplier: input.supplier.trim(),
		packagePrice: input.packagePrice,
		packageSize: input.packageSize,
		packageUnit: input.packageUnit,
		shippingFee: input.shippingFee,
		baseQuantity: base.quantity,
		baseUnit: base.unit,
		unitCost
	};
	ingredientCatalog.items = [...ingredientCatalog.items, row];
	return row;
}

export function updateIngredientMaster(
	id: string,
	patch: Partial<
		Pick<
			IngredientMasterDTO,
			'name' | 'supplier' | 'packagePrice' | 'packageSize' | 'packageUnit' | 'shippingFee'
		>
	> & {
		channelScrape?: Partial<Record<ChannelMarketplace, Partial<ChannelScrapeInfo>>>;
	}
): void {
	ingredientCatalog.items = ingredientCatalog.items.map((m) => {
		if (m.id !== id) return m;
		const { channelScrape: chPatch, ...fieldPatch } = patch;
		const next: IngredientMasterDTO = {
			...m,
			...fieldPatch,
			name: patch.name !== undefined ? patch.name.trim() : m.name,
			supplier: patch.supplier !== undefined ? patch.supplier.trim() : m.supplier
		};
		if (chPatch) {
			next.channelScrape = mergeChannelScrape(m.channelScrape, chPatch);
		}
		if (
			patch.packagePrice !== undefined ||
			patch.packageSize !== undefined ||
			patch.shippingFee !== undefined ||
			patch.packageUnit !== undefined
		) {
			const base = toBaseQuantity(next.packageSize, next.packageUnit);
			next.baseQuantity = base.quantity;
			next.baseUnit = base.unit;
			next.unitCost = computeUnitCost(next.packagePrice, next.shippingFee, next.baseQuantity);
		}
		return next;
	});
}

export function deleteIngredientMaster(id: string): void {
	ingredientCatalog.items = ingredientCatalog.items.filter((m) => m.id !== id);
}

export function getMaster(id: string): IngredientMasterDTO | undefined {
	return ingredientCatalog.items.find((m) => m.id === id);
}

export function resetIngredientCatalog(): void {
	ingredientCatalog.items = structuredClone(mockIngredientMasters);
}

/** Units shown in forms */
export const MEASURE_UNIT_OPTIONS: { value: MeasureUnit; label: string }[] = [
	{ value: 'g', label: 'g' },
	{ value: 'kg', label: 'kg' },
	{ value: 'oz', label: 'oz (weight)' },
	{ value: 'ml', label: 'ml' },
	{ value: 'cc', label: 'cc' },
	{ value: 'l', label: 'L' },
	{ value: 'gal', label: 'gal (US → ml)' },
	{ value: 'cup', label: 'cup (240 ml)' },
	{ value: 'tbsp', label: 'tbsp (15 ml)' },
	{ value: 'tsp', label: 'tsp (5 ml)' },
	{ value: 'shot', label: 'shot (30 ml)' },
	{ value: 'oz_fl', label: 'oz (fluid)' },
	{ value: 'piece', label: 'piece' }
];
