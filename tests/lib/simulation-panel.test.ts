import { describe, expect, test } from 'vitest';

import {
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
});
