import type { IngredientMasterDTO } from '$lib/types/recipe';
import type { SupplierChannel } from '$lib/types/statistics';

export interface IngredientSupplierCompare {
	ingredientId: string;
	name: string;
	catalogLanded: number;
	channels: { lazada: number; shopee: number; local: number };
	cheapest: SupplierChannel;
	savingsVsWorstPct: number;
}

/** Local catalog landed package (₱). */
function packageLandedLocal(m: IngredientMasterDTO): number {
	return m.packagePrice + m.shippingFee;
}

/** Effective landed ₱ per channel; missing marketplace values fall back to local package for comparison. */
function channelPackagePeso(m: IngredientMasterDTO, ch: SupplierChannel): number {
	const local = packageLandedLocal(m);
	if (ch === 'local') return local;
	const v = m.supplierChannelLanded?.[ch] ?? 0;
	return v > 0 ? v : local;
}

export function buildIngredientSupplierCompares(items: IngredientMasterDTO[]): IngredientSupplierCompare[] {
	return items.map((m) => {
		const catalogLanded = packageLandedLocal(m);
		const lazada = channelPackagePeso(m, 'lazada');
		const shopee = channelPackagePeso(m, 'shopee');
		const local = channelPackagePeso(m, 'local');
		const prices = [
			{ ch: 'lazada' as const, v: lazada },
			{ ch: 'shopee' as const, v: shopee },
			{ ch: 'local' as const, v: local }
		];
		const max = Math.max(lazada, shopee, local);
		const minEntry = prices.reduce((a, b) => (b.v < a.v ? b : a));
		const savingsVsWorstPct = max > 0 ? ((max - minEntry.v) / max) * 100 : 0;
		return {
			ingredientId: m.id,
			name: m.name,
			catalogLanded,
			channels: { lazada, shopee, local },
			cheapest: minEntry.ch,
			savingsVsWorstPct
		};
	});
}

export function supplierWinCounts(items: IngredientMasterDTO[]): Record<string, number> {
	const counts: Record<string, number> = { lazada: 0, shopee: 0, local: 0 };
	for (const row of buildIngredientSupplierCompares(items)) {
		counts[row.cheapest] = (counts[row.cheapest] ?? 0) + 1;
	}
	return counts;
}

/** Label for snapshot row — channel name with the most “cheapest SKU” wins. */
export function bestSupplierLabel(items: IngredientMasterDTO[]): string {
	const counts = supplierWinCounts(items);
	const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
	if (entries.length === 0 || entries[0]![1] === 0) return '—';
	const label = entries[0]![0];
	return label.charAt(0).toUpperCase() + label.slice(1);
}

export function avgLandedByChannel(compares: IngredientSupplierCompare[]): {
	lazada: number;
	shopee: number;
	local: number;
} {
	if (compares.length === 0) return { lazada: 0, shopee: 0, local: 0 };
	let lz = 0;
	let sh = 0;
	let loc = 0;
	for (const c of compares) {
		lz += c.channels.lazada;
		sh += c.channels.shopee;
		loc += c.channels.local;
	}
	const n = compares.length;
	return { lazada: lz / n, shopee: sh / n, local: loc / n };
}

/**
 * Average % by which `winner` is cheaper than `loser`, only among SKUs where winner &lt; loser.
 */
export function avgPctCheaperThan(
	items: IngredientMasterDTO[],
	winner: SupplierChannel,
	loser: SupplierChannel
): number | null {
	const compares = buildIngredientSupplierCompares(items);
	const pcts: number[] = [];
	for (const c of compares) {
		const w = c.channels[winner];
		const l = c.channels[loser];
		if (l <= 0 || w >= l) continue;
		pcts.push(((l - w) / l) * 100);
	}
	if (pcts.length === 0) return null;
	return pcts.reduce((a, b) => a + b, 0) / pcts.length;
}
