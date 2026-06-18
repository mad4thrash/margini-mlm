import { getMarginTone, type MarginTone, type ProductTableProduct } from './product-table';
import {
	calculatePromotionScenarioTotals,
	generateRandomOrders,
	PROMOTION_SCENARIOS,
	type PromotionScenario,
	type PromotionScenarioId,
	type SimulationLine,
	type SimulationProduct,
	type SimulationTotals
} from './simulation';

export type SimulationScenarioResult = {
	scenario: PromotionScenario;
	orderCount: number;
	productCount: number;
	totals: SimulationTotals;
	marginTone: MarginTone;
};

export type CreateSimulationScenarioResultsInput = {
	products: SimulationProduct[];
	scenarios: PromotionScenario[];
	payoutPercent: number;
	simulationRun: number;
	orderCount?: number;
};

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

export function createSimulationScenarioResults(
	input: CreateSimulationScenarioResultsInput
): SimulationScenarioResult[] {
	const { products, scenarios, payoutPercent, simulationRun, orderCount } = input;
	const ordersByMode = new Map<string, SimulationLine[][]>();

	if (products.length === 0) {
		return [];
	}

	return scenarios.map((scenario) => {
		const orders = getOrdersForMode({
			ordersByMode,
			products,
			scenario,
			simulationRun,
			orderCount
		});
		const totals = calculatePromotionScenarioTotals({
			scenario,
			orders,
			payoutPercent
		});

		return {
			scenario,
			orderCount: orders.length,
			productCount: countProductsInOrders(orders),
			totals,
			marginTone: getMarginTone(totals.marginPercent)
		};
	});
}

function getOrdersForMode(input: {
	ordersByMode: Map<string, SimulationLine[][]>;
	products: SimulationProduct[];
	scenario: PromotionScenario;
	simulationRun: number;
	orderCount?: number;
}): SimulationLine[][] {
	const { ordersByMode, products, scenario, simulationRun, orderCount } = input;
	const cacheKey = scenario.orderMode;
	const cachedOrders = ordersByMode.get(cacheKey);

	if (cachedOrders) {
		return cachedOrders;
	}

	const orders = generateRandomOrders({
		products,
		mode: scenario.orderMode,
		orderCount,
		seed: `${simulationRun}:${scenario.orderMode}`
	});

	ordersByMode.set(cacheKey, orders);
	return orders;
}

function countProductsInOrders(orders: SimulationLine[][]): number {
	return orders.reduce(
		(total, order) => total + order.reduce((orderTotal, line) => orderTotal + line.quantity, 0),
		0
	);
}
