import type { ChannelLandedPrices } from '$lib/types/statistics';

/** Lazada / Shopee marketplace rows in catalogs */
export type ChannelMarketplace = 'lazada' | 'shopee';

/** Saved scrape hint + UI status (Help Scrape modal documents API/XHR-first workflows; no automated fetch in app yet) */
export type ScrapeStatus = 'idle' | 'pending' | 'scraping' | 'complete' | 'error';

/** Café-oriented units; liquids normalize to ml, mass to g, count to piece */
export type MeasureUnit =
	| 'g'
	| 'kg'
	| 'oz'
	| 'ml'
	| 'l'
	| 'cc'
	| 'oz_fl'
	| 'gal'
	| 'cup'
	| 'tbsp'
	| 'tsp'
	| 'shot'
	| 'piece';

export interface ChannelScrapeInfo {
	status: ScrapeStatus;
	/** Product or listing URL to speed up manual / future automated scraping */
	url?: string;
	/** ISO timestamp when status last changed (e.g. scrape marked complete) */
	updatedAt?: string;
	/** Optional listing snapshot from marketplace scrape — shown on Lazada/Shopee tabs when sync is complete */
	listingPackageSize?: number;
	listingPackageUnit?: MeasureUnit;
	listingShippingFee?: number;
	listingBaseQuantity?: number;
	listingBaseUnit?: 'g' | 'ml' | 'piece';
}

/** Master ingredient purchased in bulk — unit cost from package + shipping */
export interface IngredientMasterDTO {
	id: string;
	name: string;
	supplier: string;
	packagePrice: number;
	packageSize: number;
	packageUnit: MeasureUnit;
	shippingFee: number;
	baseQuantity: number;
	baseUnit: 'g' | 'ml' | 'piece';
	unitCost: number;
	/** Landed ₱ for same package from each channel (Statistics supplier comparison) */
	supplierChannelLanded?: ChannelLandedPrices;
	/** Optional scrape workflow metadata per marketplace */
	channelScrape?: Partial<Record<ChannelMarketplace, ChannelScrapeInfo>>;
}

export interface RecipeIngredientLineDTO {
	id: string;
	ingredientMasterId: string;
	quantity: number;
	unit: MeasureUnit;
}

/** Cups, lids, sleeves — same economics shape as ingredients */
export interface OtherItemMasterDTO {
	id: string;
	name: string;
	supplier: string;
	packagePrice: number;
	packageSize: number;
	packageUnit: MeasureUnit;
	shippingFee: number;
	baseQuantity: number;
	baseUnit: 'g' | 'ml' | 'piece';
	unitCost: number;
	supplierChannelLanded?: ChannelLandedPrices;
	channelScrape?: Partial<Record<ChannelMarketplace, ChannelScrapeInfo>>;
}

/** Packaging lines reference Others catalog */
export interface RecipeOtherLineDTO {
	id: string;
	otherMasterId: string;
	quantity: number;
	unit: MeasureUnit;
}

export interface RecipePricingDTO {
	local: number;
	shopee: number;
	lazada: number;
}

export interface RecipeDTO {
	id: string;
	name: string;
	pricing: RecipePricingDTO;
	ingredientLines: RecipeIngredientLineDTO[];
	otherLines: RecipeOtherLineDTO[];
}

export interface OpexLineDTO {
	id: string;
	label: string;
	amountPerMonth: number;
}

export interface IngredientMasterInput {
	name: string;
	supplier: string;
	packagePrice: number;
	packageSize: number;
	packageUnit: MeasureUnit;
	shippingFee: number;
}

export type OtherItemMasterInput = IngredientMasterInput;
