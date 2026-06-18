import { describe, expect, test } from 'vitest';

import {
	calculateSimulationTotals,
	calculatePromotionScenarioTotals,
	generateComparableSimulationOrders,
	generateRandomOrders,
	PROMOTION_SCENARIOS,
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

describe('promotion scenarios', () => {
	const scenarioProducts = {
		a: product({ code: 'A', listPrice: 30 }),
		b: product({ code: 'B', listPrice: 20 }),
		c: product({ code: 'C', listPrice: 10 }),
		d: product({ code: 'D', listPrice: 8 }),
		kit: product({ code: 'KIT-1', listPrice: 100, discountPercent: 10, category: 'kIt' })
	};

	test('defines the supported promotion scenarios in display order', () => {
		expect(PROMOTION_SCENARIOS.map((scenario) => scenario.id)).toEqual([
			'base',
			'discount-10',
			'discount-20',
			'discount-25',
			'discount-30',
			'3x2',
			'4x3',
			'3x2-no-kit',
			'4x3-no-kit'
		]);
	});

	test('applies percentage scenarios on top of product DB discounts', () => {
		const totals = calculatePromotionScenarioTotals({
			scenario: PROMOTION_SCENARIOS[2],
			orders: [
				[
					{
						product: product({ code: 'SKU-DISCOUNTED', listPrice: 100, discountPercent: 15 }),
						quantity: 1
					}
				]
			],
			payoutPercent: 0
		});

		expect(totals.grossRevenue).toBeCloseTo(65);
		expect(totals.netRevenue).toBeCloseTo(65);
	});

	test('makes the cheapest eligible unit free for each complete 3x2 group', () => {
		const totals = calculatePromotionScenarioTotals({
			scenario: PROMOTION_SCENARIOS[5],
			orders: [
				[
					{ product: scenarioProducts.a, quantity: 1 },
					{ product: scenarioProducts.b, quantity: 1 },
					{ product: scenarioProducts.c, quantity: 2 }
				]
			],
			payoutPercent: 0
		});

		expect(totals.grossRevenue).toBeCloseTo(60);
		expect(totals.netRevenue).toBeCloseTo(60);
	});

	test('makes the cheapest eligible unit free for each complete 4x3 group', () => {
		const totals = calculatePromotionScenarioTotals({
			scenario: PROMOTION_SCENARIOS[6],
			orders: [
				[
					{ product: scenarioProducts.a, quantity: 1 },
					{ product: scenarioProducts.b, quantity: 1 },
					{ product: scenarioProducts.c, quantity: 1 },
					{ product: scenarioProducts.d, quantity: 1 }
				]
			],
			payoutPercent: 0
		});

		expect(totals.grossRevenue).toBeCloseTo(60);
		expect(totals.netRevenue).toBeCloseTo(60);
	});

	test('excludes KIT products from no-KIT bundle counting and adds 20 percent to their DB discount', () => {
		const totals = calculatePromotionScenarioTotals({
			scenario: PROMOTION_SCENARIOS[7],
			orders: [
				[
					{ product: scenarioProducts.a, quantity: 1 },
					{ product: scenarioProducts.b, quantity: 1 },
					{ product: scenarioProducts.c, quantity: 1 },
					{ product: scenarioProducts.kit, quantity: 1 }
				]
			],
			payoutPercent: 0
		});

		expect(totals.grossRevenue).toBeCloseTo(120);
		expect(totals.netRevenue).toBeCloseTo(120);
	});
});

describe('generateRandomOrders', () => {
	test('generates at least 1000 realistic generic orders with weighted bundle-friendly sizes', () => {
		const orders = generateRandomOrders({ products, seed: 'generic-orders' });
		const allowedUnitCounts = new Set([1, 3, 4, 6, 8, 9, 12]);
		const unitCounts = new Set(orders.map(countOrderUnits));

		expect(orders.length).toBeGreaterThanOrEqual(1000);
		expect(unitCounts.has(1)).toBe(true);

		for (const order of orders) {
			expect(order.length).toBeGreaterThanOrEqual(1);
			expect(countOrderUnits(order)).toBeLessThanOrEqual(12);
			expect(allowedUnitCounts.has(countOrderUnits(order))).toBe(true);

			for (const line of order) {
				expect(products).toContain(line.product);
				expect(line.quantity).toBeGreaterThanOrEqual(1);
			}
		}
	});

	test('uses five percent single-product generic orders', () => {
		const orders = generateRandomOrders({ products, orderCount: 1000, seed: 'single-share' });
		const singleProductOrders = orders.filter((order) => countOrderUnits(order) === 1);

		expect(singleProductOrders).toHaveLength(50);
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

function product(overrides: Partial<SimulationProduct>): SimulationProduct {
	return {
		code: 'SKU',
		listPrice: 100,
		supplierPrice: 0,
		vatRate: 0,
		discountPercent: 0,
		...overrides
	};
}
