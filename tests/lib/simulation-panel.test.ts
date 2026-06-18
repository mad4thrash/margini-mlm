import { describe, expect, test } from 'vitest';

import {
	createSimulationScenarioResults,
	createDefaultScenarioSelection,
	toggleScenarioSelection,
	toSimulationProducts
} from '../../src/lib/simulation-panel';
import { PROMOTION_SCENARIOS } from '../../src/lib/simulation';

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
});
