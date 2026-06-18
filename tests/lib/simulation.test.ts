import { describe, expect, test } from 'vitest';

import {
	calculateSimulationTotals,
	generateComparableSimulationOrders,
	generateRandomOrders,
	type SimulationProduct
} from '../../src/lib/simulation';

const products: SimulationProduct[] = Array.from({ length: 10 }, (_, index) => ({
	code: `SKU-${index + 1}`,
	listPrice: 100 + index,
	supplierPrice: 40 + index,
	vatRate: 22,
	discountPercent: index
}));

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

describe('generateRandomOrders', () => {
	test('generates at least 1000 generic orders with bounded lines and quantities', () => {
		const orders = generateRandomOrders({ products, seed: 'generic-orders' });

		expect(orders.length).toBeGreaterThanOrEqual(1000);
		for (const order of orders) {
			expect(order.length).toBeGreaterThanOrEqual(1);
			expect(order.length).toBeLessThanOrEqual(8);

			for (const line of order) {
				expect(products).toContain(line.product);
				expect(line.quantity).toBeGreaterThanOrEqual(1);
				expect(line.quantity).toBeLessThanOrEqual(4);
			}
		}
	});

	test('generates 3x2 orders with exactly 3 or 6 product units', () => {
		const orders = generateRandomOrders({
			products,
			mode: '3x2',
			orderCount: 100,
			seed: 'three-for-two'
		});

		const unitCounts = new Set(orders.map(countOrderUnits));

		expect(unitCounts).toEqual(new Set([3, 6]));
	});

	test('generates 4x3 orders with exactly 4 or 8 product units', () => {
		const orders = generateRandomOrders({
			products,
			mode: '4x3',
			orderCount: 100,
			seed: 'four-for-three'
		});

		const unitCounts = new Set(orders.map(countOrderUnits));

		expect(unitCounts).toEqual(new Set([4, 8]));
	});

	test('uses deterministic seed support for repeatable orders', () => {
		const firstRun = generateRandomOrders({ products, seed: 42 });
		const secondRun = generateRandomOrders({ products, seed: 42 });
		const differentSeedRun = generateRandomOrders({ products, seed: 43 });

		expect(firstRun).toEqual(secondRun);
		expect(firstRun).not.toEqual(differentSeedRun);
	});
});

describe('generateComparableSimulationOrders', () => {
	test('reuses product counts and products across every option', () => {
		const ordersByOption = generateComparableSimulationOrders({
			products,
			options: ['base', 'discount-10', 'discount-20'],
			orderCount: 50,
			seed: 'comparable-options'
		});

		const baseline = orderFingerprints(ordersByOption.base);

		expect(orderFingerprints(ordersByOption['discount-10'])).toEqual(baseline);
		expect(orderFingerprints(ordersByOption['discount-20'])).toEqual(baseline);
	});
});

function countOrderUnits(order: { quantity: number }[]) {
	return order.reduce((total, line) => total + line.quantity, 0);
}

function orderFingerprints(orders: { product: SimulationProduct; quantity: number }[][]) {
	return orders.map((order) =>
		order.map((line) => ({ code: line.product.code, quantity: line.quantity }))
	);
}
