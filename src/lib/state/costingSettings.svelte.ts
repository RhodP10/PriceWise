/** Global costing inputs (VAT, batch, margin, discount) — used in recipe detail costing panel */
export const costingSettings = $state({
	vatRegistered: false,
	vatPct: 12,
	batchSize: 1,
	targetMarginPct: 70,
	discountPct: 20
});
