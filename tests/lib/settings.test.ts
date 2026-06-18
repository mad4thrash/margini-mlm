import { describe, expect, test } from 'vitest';

import { createEditablePayoutSettings, isValidPayoutPercent } from '../../src/lib/settings';

describe('payout settings helpers', () => {
	test('creates editable payout settings from the persisted percentage', () => {
		expect(createEditablePayoutSettings({ payoutPercent: 12.5 })).toEqual({
			payoutPercent: 12.5,
			error: ''
		});
	});

	test('rejects negative and invalid payout percentages', () => {
		expect(isValidPayoutPercent(0)).toBe(true);
		expect(isValidPayoutPercent(7.25)).toBe(true);
		expect(isValidPayoutPercent(-0.01)).toBe(false);
		expect(isValidPayoutPercent(Number.NaN)).toBe(false);
		expect(isValidPayoutPercent(Number.POSITIVE_INFINITY)).toBe(false);
	});
});
