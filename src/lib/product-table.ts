import { calculateProductMargin, type ProductMargin } from './margins';

export type MarginTone = 'negative' | 'low' | 'healthy';

export type ProductTableProduct = {
	id?: number;
	code: string;
	description: string;
	category: string;
	listPrice: number;
	supplierPrice: number;
	vatRate: number;
	discountPercent?: number | null;
};

export type EditableProductRow = {
	id?: number;
	clientId: string;
	code: string;
	description: string;
	category: string;
	listPrice: number;
	supplierPrice: number;
	vatRate: number;
	discountPercent: number;
	isNew: boolean;
	isSaving: boolean;
	pendingDelete: boolean;
	error: string;
	margin: (payoutPercent: number) => ProductMargin;
};

let nextClientId = 1;

export function createEditableProductRow(product: ProductTableProduct = createBlankProduct()) {
	return {
		...product,
		clientId: product.id ? `product-${product.id}` : `new-${nextClientId++}`,
		discountPercent: product.discountPercent ?? 0,
		isNew: product.id === undefined,
		isSaving: false,
		pendingDelete: false,
		error: '',
		margin(payoutPercent: number) {
			return calculateProductMargin({
				listPrice: this.listPrice,
				supplierPrice: this.supplierPrice,
				vatRate: this.vatRate,
				discountPercent: this.discountPercent,
				payoutPercent
			});
		}
	} satisfies EditableProductRow;
}

export function getMarginTone(marginPercent: number): MarginTone {
	if (marginPercent < 0) {
		return 'negative';
	}

	if (marginPercent < 15) {
		return 'low';
	}

	return 'healthy';
}

function createBlankProduct(): ProductTableProduct {
	return {
		code: '',
		description: '',
		category: '',
		listPrice: 0,
		supplierPrice: 0,
		vatRate: 22,
		discountPercent: 0
	};
}
