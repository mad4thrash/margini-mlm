export type ProductMarginInput = {
	listPrice: number;
	supplierPrice: number;
	vatRate: number;
	discountPercent: number;
	payoutPercent: number;
};

export type ProductMargin = {
	discountedGrossPrice: number;
	netRevenue: number;
	payoutAmount: number;
	marginAmount: number;
	marginPercent: number;
};

export function calculateProductMargin(_input: ProductMarginInput): ProductMargin {
	const { listPrice, supplierPrice, vatRate, discountPercent, payoutPercent } = _input;
	const discountedGrossPrice = listPrice * (1 - discountPercent / 100);
	const rawNetRevenue = discountedGrossPrice / (1 + vatRate / 100);
	const netRevenue = Number.isFinite(rawNetRevenue) ? rawNetRevenue : 0;
	const payoutAmount = discountedGrossPrice * (payoutPercent / 100);
	const marginAmount = netRevenue - supplierPrice - payoutAmount;
	const marginPercent = netRevenue > 0 ? (marginAmount / netRevenue) * 100 : 0;

	return {
		discountedGrossPrice,
		netRevenue,
		payoutAmount,
		marginAmount,
		marginPercent
	};
}
