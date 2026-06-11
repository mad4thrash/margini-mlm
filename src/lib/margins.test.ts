import { describe, expect, test } from 'vitest';

import { calculateProductMargin } from './margins';

describe('calculateProductMargin', () => {
	test('calculates discounted price, revenue, payout, and margin values', () => {
		const result = calculateProductMargin({
			listPrice: 122,
			supplierPrice: 45,
			vatRate: 22,
			discountPercent: 10,
			payoutPercent: 5
		});

		expect(result.discountedGrossPrice).toBeCloseTo(109.8);
		expect(result.netRevenue).toBeCloseTo(90);
		expect(result.payoutAmount).toBeCloseTo(5.49);
		expect(result.marginAmount).toBeCloseTo(39.51);
		expect(result.marginPercent).toBeCloseTo(43.9);
	});

	test('returns zero margin percent when net revenue is zero', () => {
		const result = calculateProductMargin({
			listPrice: 0,
			supplierPrice: 10,
			vatRate: 22,
			discountPercent: 0,
			payoutPercent: 5
		});

		expect(result.discountedGrossPrice).toBe(0);
		expect(result.netRevenue).toBe(0);
		expect(result.payoutAmount).toBe(0);
		expect(result.marginAmount).toBe(-10);
		expect(result.marginPercent).toBe(0);
	});

	test('returns zero margin percent when net revenue is invalid', () => {
		const result = calculateProductMargin({
			listPrice: 100,
			supplierPrice: 10,
			vatRate: -100,
			discountPercent: 0,
			payoutPercent: 5
		});

		expect(result.netRevenue).toBe(0);
		expect(result.marginPercent).toBe(0);
	});
});
