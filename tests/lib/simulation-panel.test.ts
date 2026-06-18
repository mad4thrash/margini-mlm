import { describe, expect, test } from 'vitest';

import {
	createSimulationScenarioResults,
	createDefaultScenarioSelection,
	toggleScenarioSelection,
	toSimulationProducts
} from '../../src/lib/simulation-panel';
import { PROMOTION_SCENARIOS, type SimulationProduct } from '../../src/lib/simulation';

const simulationProducts: SimulationProduct[] = Array.from({ length: 10 }, (_, index) => ({
	code: `SKU-${index + 1}`,
	listPrice: 50 + index * 10,
	supplierPrice: 15 + index,
	vatRate: 22,
	discountPercent: 0,
	category: index === 0 ? 'KIT' : ''
}));

describe('simulation panel helpers', () => {
	test('selects every promotion scenario by default', () => {
		expect(createDefaultScenarioSelection()).toEqual(
			PROMOTION_SCENARIOS.map((scenario) => scenario.id)
		);
	});

	test('toggles scenario selection while preserving scenario display order', () => {
		const selected = createDefaultScenarioSelection();
		const withoutBase = toggleScenarioSelection(selected, 'base', false);
		const withBaseAgain = toggleScenarioSelection(withoutBase, 'base', true);

		expect(withoutBase).not.toContain('base');
		expect(withBaseAgain).toEqual(selected);
	});

	test('maps product table rows to simulation products', () => {
		expect(
			toSimulationProducts([
				{
					id: 1,
					code: 'SKU-1',
					description: 'Prodotto test',
					category: 'KIT',
					listPrice: 122,
					supplierPrice: 40,
					vatRate: 22,
					discountPercent: null
				}
			])
		).toEqual([
			{
				code: 'SKU-1',
				category: 'KIT',
				listPrice: 122,
				supplierPrice: 40,
				vatRate: 22,
				discountPercent: 0
			}
		]);
	});

	test('builds aggregate results for selected scenarios', () => {
		const results = createSimulationScenarioResults({
			products: [
				{
					code: 'SKU-1',
					listPrice: 122,
					supplierPrice: 40,
					vatRate: 22,
					discountPercent: 0,
					category: ''
				},
				{
					code: 'SKU-2',
					listPrice: 61,
					supplierPrice: 20,
					vatRate: 22,
					discountPercent: 0,
					category: ''
				}
			],
			scenarios: [PROMOTION_SCENARIOS[0], PROMOTION_SCENARIOS[1]],
			payoutPercent: 0,
			simulationRun: 1,
			orderCount: 3
		});

		expect(results).toHaveLength(2);
		expect(results[0].scenario.name).toBe('DB/base');
		expect(results[0].orderCount).toBe(3);
		expect(results[0].productCount).toBeGreaterThanOrEqual(3);
		expect(results[0].totals.grossRevenue).toBeGreaterThan(0);
		expect(results[0].marginTone).toBe('healthy');
		expect(results[1].totals.grossRevenue).toBeLessThan(results[0].totals.grossRevenue);
	});

	test('uses the same product count for every active scenario in a launch', () => {
		const results = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: PROMOTION_SCENARIOS,
			payoutPercent: 0,
			simulationRun: 1,
			orderCount: 100
		});
		const productCounts = new Set(results.map((result) => result.productCount));

		expect(results).toHaveLength(PROMOTION_SCENARIOS.length);
		expect(productCounts.size).toBe(1);
	});

	test('reuses one order set for percentage and bundle scenarios', () => {
		const results = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: [PROMOTION_SCENARIOS[0], PROMOTION_SCENARIOS[5], PROMOTION_SCENARIOS[6]],
			payoutPercent: 0,
			simulationRun: 2,
			orderCount: 100
		});
		const [base, threeForTwo, fourForThree] = results;

		expect(threeForTwo.productCount).toBe(base.productCount);
		expect(fourForThree.productCount).toBe(base.productCount);
		expect(threeForTwo.totals.grossRevenue).toBeLessThan(base.totals.grossRevenue);
		expect(fourForThree.totals.grossRevenue).toBeLessThan(base.totals.grossRevenue);
	});

	test('reruns change generated orders while keeping scenarios comparable', () => {
		const firstRun = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: [PROMOTION_SCENARIOS[0], PROMOTION_SCENARIOS[5]],
			payoutPercent: 0,
			simulationRun: 1,
			orderCount: 100
		});
		const secondRun = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: [PROMOTION_SCENARIOS[0], PROMOTION_SCENARIOS[5]],
			payoutPercent: 0,
			simulationRun: 2,
			orderCount: 100
		});

		expect(firstRun[0].productCount).toBe(firstRun[1].productCount);
		expect(secondRun[0].productCount).toBe(secondRun[1].productCount);
		expect(secondRun[0].totals.grossRevenue).not.toBe(firstRun[0].totals.grossRevenue);
	});
});
