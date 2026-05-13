import type { ChannelLandedPrices } from '$lib/types/statistics';
import type { IngredientMasterDTO, MeasureUnit, OtherItemMasterDTO } from '$lib/types/recipe';
import { toBaseQuantity } from '$lib/utils/baseUnitCost';

export type CatalogRowForImport = Pick<
	IngredientMasterDTO,
	'packageSize' | 'packageUnit' | 'baseQuantity' | 'baseUnit'
>;

/** Successful parse fills landed ₱ for one channel + listing snapshot fields for display. */
export type MarketplaceImportPatch = {
	supplierChannelLanded: Partial<ChannelLandedPrices>;
	listingPackageSize: number;
	listingPackageUnit: MeasureUnit;
	listingShippingFee: number;
	listingBaseQuantity: number;
	listingBaseUnit: 'g' | 'ml' | 'piece';
};

function pesoFromShopeeInt(raw: number): number {
	if (!Number.isFinite(raw) || raw <= 0) return 0;
	// PH storefront APIs typically encode peso × 100_000 as integer
	let php = raw / 100_000;
	if (php > 5_000_000) php = raw / 100_000_000;
	return Math.round(php * 100) / 100;
}

function looksLikeShopeeItem(o: Record<string, unknown>): boolean {
	const id = o.itemid ?? (o as { item_id?: unknown }).item_id;
	const hasId = typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id));
	if (!hasId) return false;
	return (
		typeof o.name === 'string' ||
		typeof (o as { title?: unknown }).title === 'string' ||
		typeof o.price_min === 'number' ||
		typeof o.price_max === 'number' ||
		typeof o.price === 'number' ||
		Array.isArray(o.tier_variations) ||
		o.price_info !== undefined
	);
}

/** PDP APIs expose data.item or nested item blobs — route names differ by Shopee version/region. */
function walkFindShopeeItem(obj: unknown, depth = 0): Record<string, unknown> | null {
	if (depth > 22) return null;
	if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
		const r = obj as Record<string, unknown>;
		if (looksLikeShopeeItem(r)) return r;
		const nestedItem = r.item;
		if (nestedItem && typeof nestedItem === 'object') {
			const inner = nestedItem as Record<string, unknown>;
			if (looksLikeShopeeItem(inner)) return inner;
		}
		for (const v of Object.values(r)) {
			const hit = walkFindShopeeItem(v, depth + 1);
			if (hit) return hit;
		}
	} else if (Array.isArray(obj)) {
		for (const el of obj) {
			const hit = walkFindShopeeItem(el, depth + 1);
			if (hit) return hit;
		}
	}
	return null;
}

function pickShopeeItem(root: Record<string, unknown>): Record<string, unknown> | null {
	const data = root.data;
	if (data && typeof data === 'object') {
		const d = data as Record<string, unknown>;
		const item = d.item;
		if (item && typeof item === 'object') return item as Record<string, unknown>;
	}
	const item = root.item;
	if (item && typeof item === 'object') return item as Record<string, unknown>;
	return walkFindShopeeItem(root);
}

function shopeeListedPricePeso(item: Record<string, unknown>): number {
	const keys = ['price_min', 'price_max', 'price', 'item_min_price', 'item_price'] as const;
	for (const k of keys) {
		const v = item[k];
		if (typeof v === 'number' && v > 0) return pesoFromShopeeInt(v);
	}
	const pi = item.price_info;
	if (pi && typeof pi === 'object') {
		const pr = (pi as Record<string, unknown>).price;
		if (typeof pr === 'number' && pr > 0) return pesoFromShopeeInt(pr);
	}
	const tiers = item.tier_variations;
	if (Array.isArray(tiers) && tiers.length > 0) {
		for (const t0 of tiers) {
			if (t0 && typeof t0 === 'object') {
				const rec = t0 as Record<string, unknown>;
				const price = rec.price ?? rec.price_min;
				if (typeof price === 'number' && price > 0) return pesoFromShopeeInt(price);
			}
		}
	}
	return 0;
}

function extractGramsMlPiece(text: string): { qty: number; unit: 'g' | 'ml' | 'piece' } | null {
	const s = text.toLowerCase();
	let m = s.match(/(\d+(?:\.\d+)?)\s*(kg)\b/);
	if (m) return { qty: parseFloat(m[1]) * 1000, unit: 'g' };
	m = s.match(/(\d+(?:\.\d+)?)\s*(g)\b/);
	if (m) return { qty: parseFloat(m[1]), unit: 'g' };
	m = s.match(/(\d+(?:\.\d+)?)\s*(l)\b/);
	if (m) return { qty: parseFloat(m[1]) * 1000, unit: 'ml' };
	m = s.match(/(\d+(?:\.\d+)?)\s*(ml)\b/);
	if (m) return { qty: parseFloat(m[1]), unit: 'ml' };
	m = s.match(/(\d+)\s*(pcs?|pieces?|pc)\b/);
	if (m) return { qty: parseFloat(m[1]), unit: 'piece' };
	return null;
}

function shopeeShippingPeso(item: Record<string, unknown>): number {
	const feeInfo = item.shipping_fee_info;
	if (feeInfo && typeof feeInfo === 'object') {
		const fi = feeInfo as Record<string, unknown>;
		const mod = fi.modified_fee;
		if (typeof mod === 'number' && mod > 0) return pesoFromShopeeInt(mod);
		const plain = fi.fee;
		if (typeof plain === 'number' && plain > 0) return pesoFromShopeeInt(plain);
		const priceObj = fi.price;
		if (priceObj && typeof priceObj === 'object') {
			const sv = (priceObj as Record<string, unknown>).single_value;
			if (typeof sv === 'number' && sv > 0) return pesoFromShopeeInt(sv);
		}
	}
	return 0;
}

/** get_pc nests shipping under data.product_shipping, not on data.item */
function shopeeShippingFromPdpRoot(root: Record<string, unknown>): number {
	const data = root.data;
	if (!data || typeof data !== 'object') return 0;
	const d = data as Record<string, unknown>;
	const ps = d.product_shipping;
	if (!ps || typeof ps !== 'object') return 0;
	const sfi = (ps as Record<string, unknown>).shipping_fee_info;
	return shopeeShippingPeso({ shipping_fee_info: sfi } as Record<string, unknown>);
}

function shopeeProductLabel(item: Record<string, unknown>): string {
	if (typeof item.name === 'string' && item.name.trim()) return item.name;
	if (typeof item.title === 'string' && item.title.trim()) return item.title;
	return '';
}

function guessListingDimsFromShopee(
	item: Record<string, unknown>,
	local: CatalogRowForImport
): Pick<
	MarketplaceImportPatch,
	'listingPackageSize' | 'listingPackageUnit' | 'listingBaseQuantity' | 'listingBaseUnit'
> {
	const label = shopeeProductLabel(item);
	const blobs: string[] = [];
	if (label) blobs.push(label);
	if (typeof item.description === 'string' && item.description.trim()) {
		blobs.push(item.description.slice(0, 2500));
	}
	const attrs = item.attributes;
	if (Array.isArray(attrs)) {
		for (const a of attrs) {
			if (a && typeof a === 'object') {
				const v = (a as Record<string, unknown>).value;
				if (typeof v === 'string') blobs.push(v);
			}
		}
	}
	let parsed: ReturnType<typeof extractGramsMlPiece> | null = null;
	for (const b of blobs) {
		parsed = extractGramsMlPiece(b);
		if (parsed) break;
	}

	const listingPackageSize = parsed ? parsed.qty : local.packageSize;
	const listingPackageUnit = parsed
		? parsed.unit === 'g'
			? 'g'
			: parsed.unit === 'ml'
				? 'ml'
				: 'piece'
		: local.packageUnit;

	const base = toBaseQuantity(listingPackageSize, listingPackageUnit);
	return {
		listingPackageSize,
		listingPackageUnit,
		listingBaseQuantity: base.quantity,
		listingBaseUnit: base.unit
	};
}

/** One SKU / tier from Shopee `data.item.models[]` (e.g. Ceremonial vs Culinary). */
export type ShopeeVariantOption = {
	index: number;
	modelId: number | null;
	name: string;
	pricePeso: number;
};

/** Pick a row from `models[]` after the user chooses (required when multiple models exist). */
export type ShopeeVariantPick = { by: 'index'; index: number };

export type ParseShopeeItemResult =
	| { ok: true; patch: MarketplaceImportPatch; productName?: string }
	| { ok: false; error: string; needVariant?: never }
	| { ok: false; needVariant: true; variants: ShopeeVariantOption[]; error: string };

/** Result from Save & sync — Shopee multi-SKU listings may need a variant step in the modal. */
export type MarketplaceListingSubmitResult =
	| { kind: 'success' }
	| { kind: 'error'; message?: string }
	| { kind: 'shopee_variants'; variants: ShopeeVariantOption[]; bodyJson: string };

export function extractShopeeModelVariants(item: Record<string, unknown>): ShopeeVariantOption[] {
	const models = item.models;
	if (!Array.isArray(models) || models.length === 0) return [];
	const out: ShopeeVariantOption[] = [];
	for (let i = 0; i < models.length; i++) {
		const m = models[i];
		if (!m || typeof m !== 'object') continue;
		const rec = m as Record<string, unknown>;
		const price = rec.price;
		if (typeof price !== 'number' || price <= 0) continue;
		const name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : `Option ${i + 1}`;
		const mid = rec.model_id;
		out.push({
			index: i,
			modelId: typeof mid === 'number' ? mid : null,
			name,
			pricePeso: pesoFromShopeeInt(price)
		});
	}
	return out;
}

/** Parse pasted DevTools JSON — any XHR/Fetch body that contains Shopee item + price fields. */
export function parseShopeeItemGetJson(
	raw: string,
	local: CatalogRowForImport,
	pick?: ShopeeVariantPick
): ParseShopeeItemResult {
	let root: unknown;
	try {
		root = JSON.parse(raw) as unknown;
	} catch {
		return {
			ok: false,
			error:
				'Invalid JSON. In Network → click a Fetch/XHR row → Response tab → copy the full JSON body.'
		};
	}
	if (!root || typeof root !== 'object') return { ok: false, error: 'Unexpected JSON root.' };
	const rootObj = root as Record<string, unknown>;
	const item = pickShopeeItem(rootObj);
	if (!item) {
		if (rootObj.error !== undefined) {
			return {
				ok: false,
				error: `Shopee error payload (error=${String(JSON.stringify(rootObj.error)).slice(0, 160)}). Try another XHR with a 200 response whose Preview shows itemid and prices, or paste JSON after the page fully loads.`
			};
		}
		return {
			ok: false,
			error:
				'Could not find product fields (itemid + price) in this JSON. In DevTools → Network → Fetch/XHR, reload the product page and paste a response whose Preview includes itemid / price_min / name (request names are not always "item/get").'
		};
	}

	const modelsOpts = extractShopeeModelVariants(item);
	let listPeso = 0;

	if (modelsOpts.length > 1) {
		if (!pick) {
			return {
				ok: false,
				needVariant: true,
				variants: modelsOpts,
				error:
					'This listing has multiple SKUs — choose Ceremonial, Culinary, or another option below.'
			};
		}
		const chosen = modelsOpts.find((m) => m.index === pick.index);
		if (!chosen) {
			return { ok: false, error: 'Invalid variant selection — try another option.' };
		}
		listPeso = chosen.pricePeso;
	} else if (modelsOpts.length === 1) {
		listPeso = modelsOpts[0].pricePeso;
	} else {
		listPeso = shopeeListedPricePeso(item);
	}

	if (listPeso <= 0) return { ok: false, error: 'Could not read a list price from this JSON.' };

	let ship = shopeeShippingPeso(item);
	if (ship <= 0) ship = shopeeShippingFromPdpRoot(rootObj);
	const landed = Math.round((listPeso + ship) * 100) / 100;
	const dims = guessListingDimsFromShopee(item, local);
	const baseName =
		typeof item.name === 'string'
			? item.name
			: typeof item.title === 'string'
				? item.title
				: undefined;
	let productName = baseName;
	if (pick?.by === 'index' && modelsOpts.length > 0) {
		const vn = modelsOpts.find((m) => m.index === pick.index);
		if (vn?.name) {
			productName = baseName ? `${baseName} · ${vn.name}` : vn.name;
		}
	}

	return {
		ok: true,
		productName,
		patch: {
			supplierChannelLanded: { shopee: landed },
			...dims,
			listingShippingFee: ship
		}
	};
}

/**
 * Best-effort Lazada product JSON (pdpModule, product, or similar) from Network tab.
 * Prices are often plain PHP already; we also look for fields named *Price*.
 */
export function parseLazadaProductJson(
	raw: string,
	local: CatalogRowForImport
): { ok: true; patch: MarketplaceImportPatch; productName?: string } | { ok: false; error: string } {
	let root: unknown;
	try {
		root = JSON.parse(raw) as unknown;
	} catch {
		return { ok: false, error: 'Invalid JSON. Copy a product XHR response that includes price fields.' };
	}
	if (!root || typeof root !== 'object') return { ok: false, error: 'Unexpected JSON root.' };

	const r = root as Record<string, unknown>;
	let title: string | undefined;
	let pricePhp = 0;

	const globalRaw = r.global;
	const globalObj =
		globalRaw && typeof globalRaw === 'object' ? (globalRaw as Record<string, unknown>) : null;
	const payloadRoot =
		r.module ??
		r.data ??
		r.result ??
		r.mainModule ??
		globalObj?.product ??
		globalObj?.skuOverlay ??
		r;
	const flat =
		typeof payloadRoot === 'object' && payloadRoot !== null
			? (payloadRoot as Record<string, unknown>)
			: r;

	const skuInfos = flat.skuInfos;
	const skuList = flat.skuList;
	const priceCandidates: unknown[] = [
		flat.price,
		flat.originalPrice,
		Array.isArray(skuInfos) ? skuInfos[0] : undefined,
		Array.isArray(skuList) ? skuList[0] : undefined
	];
	for (const c of priceCandidates) {
		if (typeof c === 'number' && c > 0) {
			pricePhp = c;
			break;
		}
		if (c && typeof c === 'object') {
			const o = c as Record<string, unknown>;
			const p = o.price ?? o.originalPrice ?? o.salePrice ?? o.finalPrice;
			if (typeof p === 'number' && p > 0) {
				pricePhp = p;
				break;
			}
		}
	}

	if (pricePhp > 100_000_000) pricePhp /= 100_000;
	else if (pricePhp > 10_000_000) pricePhp /= 100;

	pricePhp = Math.round(pricePhp * 100) / 100;

	if (pricePhp <= 0 || pricePhp > 10_000_000) {
		return {
			ok: false,
			error:
				'Could not find a sensible price. Paste the JSON from the main product / sku API response (Network tab).'
		};
	}

	const titleBlob =
		(typeof flat.title === 'string' && flat.title) ||
		(typeof flat.subject === 'string' && flat.subject) ||
		(typeof flat.productTitle === 'string' && flat.productTitle) ||
		'';
	title = titleBlob || undefined;

	let parsed = title ? extractGramsMlPiece(title) : null;
	const listingPackageSize = parsed ? parsed.qty : local.packageSize;
	const listingPackageUnit = parsed
		? parsed.unit === 'g'
			? 'g'
			: parsed.unit === 'ml'
				? 'ml'
				: 'piece'
		: local.packageUnit;
	const base = toBaseQuantity(listingPackageSize, listingPackageUnit);

	const ship = typeof flat.shippingFee === 'number' ? flat.shippingFee : 0;
	const landed = Math.round((pricePhp + ship) * 100) / 100;

	return {
		ok: true,
		productName: title,
		patch: {
			supplierChannelLanded: { lazada: landed },
			listingPackageSize,
			listingPackageUnit,
			listingShippingFee: ship,
			listingBaseQuantity: base.quantity,
			listingBaseUnit: base.unit
		}
	};
}

export function mergeChannelLanded(
	prev: ChannelLandedPrices | undefined,
	patch: Partial<ChannelLandedPrices>
): ChannelLandedPrices {
	return {
		lazada: patch.lazada ?? prev?.lazada ?? 0,
		shopee: patch.shopee ?? prev?.shopee ?? 0,
		local: patch.local ?? prev?.local ?? 0
	};
}
