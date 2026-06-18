import type { ProductTableProduct } from './product-table';
import { PROMOTION_SCENARIOS, type PromotionScenarioId, type SimulationProduct } from './simulation';

export function createDefaultScenarioSelection(): PromotionScenarioId[] {
	return PROMOTION_SCENARIOS.map((scenario) => scenario.id);
}

export function toggleScenarioSelection(
	selectedScenarioIds: PromotionScenarioId[],
	scenarioId: PromotionScenarioId,
	isSelected: boolean
): PromotionScenarioId[] {
	const selected = new Set(selectedScenarioIds);

	if (isSelected) {
		selected.add(scenarioId);
	} else {
		selected.delete(scenarioId);
	}

	return PROMOTION_SCENARIOS.map((scenario) => scenario.id).filter((id) => selected.has(id));
}

export function toSimulationProducts(products: ProductTableProduct[]): SimulationProduct[] {
	return products.map((product) => ({
		code: product.code,
		listPrice: product.listPrice,
		supplierPrice: product.supplierPrice,
		vatRate: product.vatRate,
		discountPercent: product.discountPercent ?? 0,
		category: product.category
	}));
}
