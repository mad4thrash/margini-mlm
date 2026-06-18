export type SimulationProduct = {
	code: string;
	listPrice: number;
	supplierPrice: number;
	vatRate: number;
	discountPercent?: number | null;
};

export type SimulationLine = {
	product: SimulationProduct;
	quantity: number;
};

export type SimulationTotalsInput = {
	lines: SimulationLine[];
	payoutPercent: number;
	scenarioDiscountPercent?: number;
};

export type SimulationTotals = {
	grossRevenue: number;
	netRevenue: number;
	payout: number;
	supplierCost: number;
	marginAmount: number;
	marginPercent: number;
};

export function calculateSimulationTotals(_input: SimulationTotalsInput): SimulationTotals {
	const { lines, payoutPercent, scenarioDiscountPercent = 0 } = _input;
	const totals = lines.reduce(
		(accumulator, line) => {
			const quantity = line.quantity;
			const effectiveDiscountPercent = Math.min(
				(line.product.discountPercent ?? 0) + scenarioDiscountPercent,
				100
			);
			const margin = calculateProductMargin({
				listPrice: line.product.listPrice,
				supplierPrice: line.product.supplierPrice,
				vatRate: line.product.vatRate,
				discountPercent: effectiveDiscountPercent,
				payoutPercent
			});

			accumulator.grossRevenue += margin.discountedGrossPrice * quantity;
			accumulator.netRevenue += margin.netRevenue * quantity;
			accumulator.payout += margin.payoutAmount * quantity;
			accumulator.supplierCost += line.product.supplierPrice * quantity;
			accumulator.marginAmount += margin.marginAmount * quantity;

			return accumulator;
		},
		{
			grossRevenue: 0,
			netRevenue: 0,
			payout: 0,
			supplierCost: 0,
			marginAmount: 0
		}
	);

	return {
		...totals,
		marginPercent: totals.netRevenue > 0 ? (totals.marginAmount / totals.netRevenue) * 100 : 0
	};
}
import { calculateProductMargin } from './margins';
