import type { ChannelMarketplace, IngredientMasterDTO, OtherItemMasterDTO } from '$lib/types/recipe';

export type DisplayScrapeState = 'complete' | 'scraping' | 'pending' | 'error' | 'idle';

type Row = Pick<IngredientMasterDTO, 'supplierChannelLanded' | 'channelScrape'> &
	Pick<OtherItemMasterDTO, 'supplierChannelLanded' | 'channelScrape'>;

/** Show landed ₱ only after scrape workflow is marked complete (not before). */
export function showMarketplaceLandedPrice(row: Row, channel: ChannelMarketplace): boolean {
	const landed = row.supplierChannelLanded?.[channel] ?? 0;
	return row.channelScrape?.[channel]?.status === 'complete' && landed > 0;
}

/**
 * Badge state: “Synced” only when scrape is explicitly complete and we have landed data.
 * Raw landed prices in seed data stay hidden from the UI until marked complete.
 */
export function displayScrapeStatus(row: Row, channel: ChannelMarketplace): DisplayScrapeState {
	const meta = row.channelScrape?.[channel];
	const landed = row.supplierChannelLanded?.[channel] ?? 0;
	if (meta?.status === 'error') return 'error';
	if (meta?.status === 'scraping') return 'scraping';
	if (meta?.status === 'complete' && landed > 0) return 'complete';
	if (meta?.status === 'pending' || meta?.url?.trim()) return 'pending';
	return 'idle';
}

/** Landed estimate exists in data but user has not marked scrape complete yet */
export function canMarkScrapeComplete(row: Row, channel: ChannelMarketplace): boolean {
	const landed = row.supplierChannelLanded?.[channel] ?? 0;
	if (landed <= 0) return false;
	return row.channelScrape?.[channel]?.status !== 'complete';
}

/** Total landed ₱ for one supplier package from Lazada/Shopee (after scrape is marked complete). */
export function channelLandedPackagePeso(
	row: IngredientMasterDTO | OtherItemMasterDTO,
	channel: ChannelMarketplace
): number | null {
	if (!showMarketplaceLandedPrice(row, channel)) return null;
	const v = row.supplierChannelLanded?.[channel];
	if (v === undefined || v <= 0) return null;
	return v;
}

/** Unit cost (₱ per base g/ml/piece) from marketplace landed ÷ base qty — not local catalog unit cost. */
export function channelUnitCostFromLanded(
	row: IngredientMasterDTO | OtherItemMasterDTO,
	channel: ChannelMarketplace
): number | null {
	if (!showMarketplaceLandedPrice(row, channel)) return null;
	const landed = row.supplierChannelLanded?.[channel] ?? 0;
	const m = row.channelScrape?.[channel];
	const baseQty = m?.listingBaseQuantity ?? row.baseQuantity;
	if (landed <= 0 || baseQty <= 0) return null;
	return landed / baseQty;
}

/**
 * Lazada/Shopee table: pkg/base columns from optional listing snapshot when sync is complete.
 */
export function resolvedMarketplaceListingColumns(
	row: IngredientMasterDTO | OtherItemMasterDTO,
	channel: ChannelMarketplace
): null | {
	packageSize: number;
	packageUnit: IngredientMasterDTO['packageUnit'];
	shippingFee: number;
	baseQuantity: number;
	baseUnit: IngredientMasterDTO['baseUnit'];
} {
	if (!showMarketplaceLandedPrice(row, channel)) return null;
	const m = row.channelScrape?.[channel];
	return {
		packageSize: m?.listingPackageSize ?? row.packageSize,
		packageUnit: m?.listingPackageUnit ?? row.packageUnit,
		shippingFee: m?.listingShippingFee ?? row.shippingFee,
		baseQuantity: m?.listingBaseQuantity ?? row.baseQuantity,
		baseUnit: m?.listingBaseUnit ?? row.baseUnit
	};
}
