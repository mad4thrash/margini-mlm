export type PayoutSettings = {
	payoutPercent: number;
};

export type EditablePayoutSettings = PayoutSettings & {
	error: string;
};

export function createEditablePayoutSettings(settings: PayoutSettings): EditablePayoutSettings {
	return {
		payoutPercent: settings.payoutPercent,
		error: ''
	};
}

export function isValidPayoutPercent(value: number) {
	return Number.isFinite(value) && value >= 0;
}
