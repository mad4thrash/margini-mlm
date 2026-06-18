import { describe, expect, test } from 'vitest';

import { calculateSimulationTotals } from '../../src/lib/simulation';

describe('calculateSimulationTotals', () => {
	test('adds scenario discounts to product discounts and calculates totals from paid gross revenue', () => {
		const totals = calculateSimulationTotals({
			lines: [
				{
					product: {
						code: 'SKU-1',
						listPrice: 122,
						supplierPrice: 45,
						vatRate: 22,
						discountPercent: 10
					},
					quantity: 2
				},
				{
					product: {
						code: 'SKU-2',
						listPrice: 50,
						supplierPrice: 12,
						vatRate: 0,
						discountPercent: 95
					},
					quantity: 1
				}
			],
			payoutPercent: 5,
			scenarioDiscountPercent: 10
		});

		expect(totals.grossRevenue).toBeCloseTo(195.2);
		expect(totals.netRevenue).toBeCloseTo(160);
		expect(totals.payout).toBeCloseTo(9.76);
		expect(totals.supplierCost).toBeCloseTo(102);
		expect(totals.marginAmount).toBeCloseTo(48.24);
		expect(totals.marginPercent).toBeCloseTo(30.15);
	});
});
