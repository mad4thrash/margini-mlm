import { describe, expect, test } from 'vitest';

import { createEditableProductRow, getMarginTone } from './product-table';

describe('product table helpers', () => {
	test('creates editable rows with a zero discount default', () => {
		const row = createEditableProductRow({
			id: 3,
			code: 'SKU-3',
			description: 'Firming cream',
			category: 'Body',
			listPrice: 50,
			supplierPrice: 18,
			vatRate: 22,
			discountPercent: null
		});

		expect(row.discountPercent).toBe(0);
		expect(row.isNew).toBe(false);
		expect(row.pendingDelete).toBe(false);
	});

	test('calculates row margins with the current payout percent', () => {
		const row = createEditableProductRow({
			id: 4,
			code: 'SKU-4',
			description: 'Face serum',
			category: 'Face',
			listPrice: 122,
			supplierPrice: 45,
			vatRate: 22,
			discountPercent: 10
		});

		expect(row.margin(5).marginAmount).toBeCloseTo(39.51);
		expect(row.margin(5).marginPercent).toBeCloseTo(43.9);
	});

	test('classifies negative, low, and healthy margin percentages', () => {
		expect(getMarginTone(-0.1)).toBe('negative');
		expect(getMarginTone(0)).toBe('low');
		expect(getMarginTone(14.99)).toBe('low');
		expect(getMarginTone(15)).toBe('healthy');
	});
});
