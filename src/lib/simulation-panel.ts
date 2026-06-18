import { getMarginTone, type MarginTone, type ProductTableProduct } from './product-table';
import {
	calculatePromotionScenarioLineTotals,
	calculatePromotionScenarioTotals,
	createFirstLaunchOrderLog,
	generateRandomOrders,
	PROMOTION_SCENARIOS,
	type FirstLaunchOrderLog,
	type PromotionScenario,
	type PromotionScenarioId,
	type SimulationLine,
	type SimulationOrderUnitCountSelection,
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
	experimentRun: number;
	firstLaunch?: number;
	launchCount?: number;
	orderCount?: number;
	orderUnitCountSelection?: SimulationOrderUnitCountSelection;
};

export type CreateFirstLaunchSimulationOrderLogInput = {
	products: SimulationProduct[];
	scenarios: PromotionScenario[];
	experimentRun: number;
	orderCount?: number;
	orderLimit?: number;
	orderUnitCountSelection?: SimulationOrderUnitCountSelection;
};

export type SimulationScenarioResultBatch = {
	launchCount: number;
	results: SimulationScenarioResult[];
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
	const {
		products,
		scenarios,
		payoutPercent,
		experimentRun,
		firstLaunch = 1,
		launchCount = 1000,
		orderCount,
		orderUnitCountSelection
	} = input;

	if (products.length === 0 || scenarios.length === 0 || launchCount <= 0) {
		return [];
	}

	const accumulators = scenarios.map((scenario) => ({
		scenario,
		orderCount: 0,
		productCount: 0,
		totals: createEmptyTotals()
	}));

	for (let launchOffset = 0; launchOffset < launchCount; launchOffset += 1) {
		const launchIndex = firstLaunch + launchOffset;
		const orders = generateRandomOrders({
			products,
			orderCount,
			orderUnitCountSelection,
			seed: `${experimentRun}:launch:${launchIndex}:orders`
		});
		const launchOrderCount = orders.length;
		const launchProductCount = countProductsInOrders(orders);
		const productLines = countProductLinesInOrders(orders);

		for (const accumulator of accumulators) {
			const totals = accumulator.scenario.bundleGroupSize
				? calculatePromotionScenarioTotals({
						scenario: accumulator.scenario,
						orders,
						payoutPercent
					})
				: calculatePromotionScenarioLineTotals({
						scenario: accumulator.scenario,
						lines: productLines,
						payoutPercent
					});

			accumulator.orderCount += launchOrderCount;
			accumulator.productCount += launchProductCount;
			addTotals(accumulator.totals, totals);
		}
	}

	return accumulators.map((accumulator) => {
		const totals = divideTotals(accumulator.totals, launchCount);

		return {
			scenario: accumulator.scenario,
			orderCount: accumulator.orderCount / launchCount,
			productCount: accumulator.productCount / launchCount,
			totals,
			marginTone: getMarginTone(totals.marginPercent)
		};
	});
}

export function createFirstLaunchSimulationOrderLog(
	input: CreateFirstLaunchSimulationOrderLogInput
): FirstLaunchOrderLog {
	const {
		products,
		scenarios,
		experimentRun,
		orderCount,
		orderLimit = 10,
		orderUnitCountSelection
	} = input;
	const launch = 1;
	const orders = generateRandomOrders({
		products,
		orderCount,
		orderUnitCountSelection,
		seed: `${experimentRun}:launch:${launch}:orders`
	});

	return createFirstLaunchOrderLog({
		experimentRun,
		launch,
		orderLimit,
		scenarios,
		orders
	});
}

export function mergeSimulationScenarioResultBatches(
	batches: SimulationScenarioResultBatch[]
): SimulationScenarioResult[] {
	const totalLaunchCount = batches.reduce((total, batch) => total + batch.launchCount, 0);

	if (totalLaunchCount <= 0 || batches.length === 0) {
		return [];
	}

	const firstResults = batches[0].results;

	return firstResults.map((result, resultIndex) => {
		const totals = createEmptyTotals();
		let orderCount = 0;
		let productCount = 0;

		for (const batch of batches) {
			const batchResult = batch.results[resultIndex];

			orderCount += batchResult.orderCount * batch.launchCount;
			productCount += batchResult.productCount * batch.launchCount;
			addWeightedTotals(totals, batchResult.totals, batch.launchCount);
		}

		const averagedTotals = divideTotals(totals, totalLaunchCount);

		return {
			scenario: result.scenario,
			orderCount: orderCount / totalLaunchCount,
			productCount: productCount / totalLaunchCount,
			totals: averagedTotals,
			marginTone: getMarginTone(averagedTotals.marginPercent)
		};
	});
}

function createEmptyTotals(): SimulationTotals {
	return {
		grossRevenue: 0,
		netRevenue: 0,
		payout: 0,
		supplierCost: 0,
		marginAmount: 0,
		marginPercent: 0
	};
}

function addTotals(target: SimulationTotals, source: SimulationTotals) {
	target.grossRevenue += source.grossRevenue;
	target.netRevenue += source.netRevenue;
	target.payout += source.payout;
	target.supplierCost += source.supplierCost;
	target.marginAmount += source.marginAmount;
	target.marginPercent += source.marginPercent;
}

function addWeightedTotals(target: SimulationTotals, source: SimulationTotals, weight: number) {
	target.grossRevenue += source.grossRevenue * weight;
	target.netRevenue += source.netRevenue * weight;
	target.payout += source.payout * weight;
	target.supplierCost += source.supplierCost * weight;
	target.marginAmount += source.marginAmount * weight;
	target.marginPercent += source.marginPercent * weight;
}

function divideTotals(totals: SimulationTotals, divisor: number): SimulationTotals {
	return {
		grossRevenue: totals.grossRevenue / divisor,
		netRevenue: totals.netRevenue / divisor,
		payout: totals.payout / divisor,
		supplierCost: totals.supplierCost / divisor,
		marginAmount: totals.marginAmount / divisor,
		marginPercent: totals.marginPercent / divisor
	};
}

function countProductsInOrders(orders: { quantity: number }[][]): number {
	return orders.reduce(
		(total, order) => total + order.reduce((orderTotal, line) => orderTotal + line.quantity, 0),
		0
	);
}

function countProductLinesInOrders(orders: SimulationLine[][]): SimulationLine[] {
	const lines = new Map<string, SimulationLine>();

	for (const order of orders) {
		for (const line of order) {
			const existing = lines.get(line.product.code);

			if (existing) {
				existing.quantity += line.quantity;
			} else {
				lines.set(line.product.code, { product: line.product, quantity: line.quantity });
			}
		}
	}

	return Array.from(lines.values());
}
