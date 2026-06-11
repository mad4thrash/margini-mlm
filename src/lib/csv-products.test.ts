import { describe, expect, it } from 'vitest';

import {
	CSV_PRODUCT_TEMPLATE,
	parseProductsCsv,
	type CsvProductInput
} from './csv-products';

describe('product CSV helpers', () => {
	it('provides the import template headers without payoutPercent', () => {
		expect(CSV_PRODUCT_TEMPLATE.trim()).toBe(
			'code,description,category,listPrice,supplierPrice,vatRate,discountPercent'
		);
		expect(CSV_PRODUCT_TEMPLATE).not.toContain('payoutPercent');
	});

	it('parses valid template rows and defaults a missing discountPercent to 0', () => {
		const result = parseProductsCsv(`code,description,category,listPrice,supplierPrice,vatRate,discountPercent
SKU-1,Face serum,Viso,42.50,15,22,
SKU-2,"Body, cream",Corpo,28,10.5,10,5`);

		expect(result.errors).toEqual([]);
		expect(result.products).toEqual<CsvProductInput[]>([
			{
				code: 'SKU-1',
				description: 'Face serum',
				category: 'Viso',
				listPrice: 42.5,
				supplierPrice: 15,
				vatRate: 22,
				discountPercent: 0
			},
			{
				code: 'SKU-2',
				description: 'Body, cream',
				category: 'Corpo',
				listPrice: 28,
				supplierPrice: 10.5,
				vatRate: 10,
				discountPercent: 5
			}
		]);
	});

	it('reports row-level errors and keeps valid rows', () => {
		const result = parseProductsCsv(`code,description,category,listPrice,supplierPrice,vatRate,discountPercent
SKU-1,Valid product,Category,20,8,22,0
,Missing code,Category,20,8,22,0
SKU-3,Bad price,Category,nope,8,22,0
SKU-4,Bad discount,Category,20,8,22,-1`);

		expect(result.products).toHaveLength(1);
		expect(result.errors).toEqual([
			{ row: 3, message: 'code is required' },
			{ row: 4, message: 'listPrice must be a valid non-negative number' },
			{ row: 5, message: 'discountPercent must be a valid non-negative number' }
		]);
	});
});
