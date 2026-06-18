import { describe, expect, test } from "vitest";

import {
	createSimulationScenarioResults,
	createDefaultScenarioSelection,
	createFirstLaunchSimulationOrderLog,
	mergeSimulationScenarioResultBatches,
	toggleScenarioSelection,
	toSimulationProducts,
} from "../../src/lib/simulation-panel";
import {
	calculatePromotionScenarioTotals,
	generateRandomOrders,
	PROMOTION_SCENARIOS,
	type SimulationProduct,
} from "../../src/lib/simulation";

const simulationProducts: SimulationProduct[] = Array.from(
	{ length: 10 },
	(_, index) => ({
		code: `SKU-${index + 1}`,
		listPrice: 50 + index * 10,
		supplierPrice: 15 + index,
		vatRate: 22,
		discountPercent: 0,
		category: index === 0 ? "KIT" : "",
	}),
);

describe("simulation panel helpers", () => {
	test("selects every promotion scenario by default", () => {
		expect(createDefaultScenarioSelection()).toEqual(
			PROMOTION_SCENARIOS.map((scenario) => scenario.id),
		);
	});

	test("toggles scenario selection while preserving scenario display order", () => {
		const selected = createDefaultScenarioSelection();
		const withoutBase = toggleScenarioSelection(selected, "base", false);
		const withBaseAgain = toggleScenarioSelection(withoutBase, "base", true);

		expect(withoutBase).not.toContain("base");
		expect(withBaseAgain).toEqual(selected);
	});

	test("maps product table rows to simulation products", () => {
		expect(
			toSimulationProducts([
				{
					id: 1,
					code: "SKU-1",
					description: "Prodotto test",
					category: "KIT",
					listPrice: 122,
					supplierPrice: 40,
					vatRate: 22,
					discountPercent: null,
				},
			]),
		).toEqual([
			{
				code: "SKU-1",
				category: "KIT",
				listPrice: 122,
				supplierPrice: 40,
				vatRate: 22,
				discountPercent: 0,
			},
		]);
	});

	test("builds aggregate results for selected scenarios", () => {
		const results = createSimulationScenarioResults({
			products: [
				{
					code: "SKU-1",
					listPrice: 122,
					supplierPrice: 40,
					vatRate: 22,
					discountPercent: 0,
					category: "",
				},
				{
					code: "SKU-2",
					listPrice: 61,
					supplierPrice: 20,
					vatRate: 22,
					discountPercent: 0,
					category: "",
				},
			],
			scenarios: [scenario("base"), scenario("discount-10")],
			payoutPercent: 0,
			experimentRun: 1,
			launchCount: 1,
			orderCount: 3,
		});

		expect(results).toHaveLength(2);
		expect(results[0].scenario.name).toBe("DB/base");
		expect(results[0].orderCount).toBe(3);
		expect(results[0].productCount).toBeGreaterThanOrEqual(3);
		expect(results[0].totals.grossRevenue).toBeGreaterThan(0);
		expect(results[0].marginTone).toBe("healthy");
		expect(results[1].totals.grossRevenue).toBeLessThan(
			results[0].totals.grossRevenue,
		);
	});

	test("uses the same product count for every active scenario in a launch", () => {
		const results = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: PROMOTION_SCENARIOS,
			payoutPercent: 0,
			experimentRun: 1,
			launchCount: 1,
			orderCount: 100,
		});
		const productCounts = new Set(results.map((result) => result.productCount));

		expect(results).toHaveLength(PROMOTION_SCENARIOS.length);
		expect(productCounts.size).toBe(1);
	});

	test("reuses one order set for percentage and bundle scenarios", () => {
		const results = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: [scenario("base"), scenario("3x2"), scenario("4x3")],
			payoutPercent: 0,
			experimentRun: 2,
			launchCount: 1,
			orderCount: 100,
		});
		const [base, threeForTwo, fourForThree] = results;

		expect(threeForTwo.productCount).toBe(base.productCount);
		expect(fourForThree.productCount).toBe(base.productCount);
		expect(threeForTwo.totals.grossRevenue).toBeLessThan(
			base.totals.grossRevenue,
		);
		expect(fourForThree.totals.grossRevenue).toBeLessThan(
			base.totals.grossRevenue,
		);
	});

	test("reuses the exact same products and quantities for every scenario in a launch", () => {
		const scenarios = [scenario("base"), scenario("discount-10"), scenario("3x2")];
		const payoutPercent = 0;
		const experimentRun = 7;
		const orderCount = 25;
		const expectedOrders = generateRandomOrders({
			products: simulationProducts,
			orderCount,
			seed: `${experimentRun}:launch:1:orders`,
		});
		const results = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios,
			payoutPercent,
			experimentRun,
			launchCount: 1,
			orderCount,
		});

		for (const [index, scenario] of scenarios.entries()) {
			expect(results[index].orderCount).toBe(expectedOrders.length);
			expect(results[index].productCount).toBe(
				expectedOrders.reduce(
					(total, order) =>
						total +
						order.reduce((orderTotal, line) => orderTotal + line.quantity, 0),
					0,
				),
			);
			expect(results[index].totals).toEqual(
				calculatePromotionScenarioTotals({
					scenario,
					orders: expectedOrders,
					payoutPercent,
				}),
			);
		}
	});

	test("builds the first-launch order log from the same seeded orders used by simulations", () => {
		const scenarios = [scenario("base"), scenario("discount-10")];
		const experimentRun = 7;
		const orderCount = 25;
		const expectedOrders = generateRandomOrders({
			products: simulationProducts,
			orderCount,
			seed: `${experimentRun}:launch:1:orders`,
		});

		const log = createFirstLaunchSimulationOrderLog({
			products: simulationProducts,
			scenarios,
			experimentRun,
			orderCount,
		});

		expect(log.experimentRun).toBe(experimentRun);
		expect(log.launch).toBe(1);
		expect(log.orderLimit).toBe(10);
		expect(log.scenarios.map((loggedScenario) => loggedScenario.id)).toEqual([
			"base",
			"discount-10",
		]);
		expect(log.scenarios[0].orders).toHaveLength(10);
		expect(log.scenarios[0].orders[0].products.reduce(
			(total, product) => total + product.quantity,
			0,
		)).toBe(
			expectedOrders[0].reduce((total, line) => total + line.quantity, 0),
		);
	});

	test("uses the selected fixed unit count for results and first-launch logs", () => {
		const scenarios = [scenario("base"), scenario("3x2")];
		const experimentRun = 17;
		const orderCount = 8;
		const orderUnitCountSelection = { mode: "fixed", units: 5 } as const;

		const results = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios,
			payoutPercent: 0,
			experimentRun,
			launchCount: 1,
			orderCount,
			orderUnitCountSelection,
		});
		const log = createFirstLaunchSimulationOrderLog({
			products: simulationProducts,
			scenarios,
			experimentRun,
			orderCount,
			orderUnitCountSelection,
		});

		expect(results.map((result) => result.productCount)).toEqual([40, 40]);
		expect(log.scenarios[0].orders).toHaveLength(8);
		for (const loggedOrder of log.scenarios[0].orders) {
			expect(
				loggedOrder.products.reduce(
					(total, product) => total + product.quantity,
					0,
				),
			).toBe(5);
		}
	});

	test("reruns change generated orders while keeping scenarios comparable", () => {
		const firstRun = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: [scenario("base"), scenario("3x2")],
			payoutPercent: 0,
			experimentRun: 1,
			launchCount: 1,
			orderCount: 100,
		});
		const secondRun = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: [scenario("base"), scenario("3x2")],
			payoutPercent: 0,
			experimentRun: 2,
			launchCount: 1,
			orderCount: 100,
		});

		expect(firstRun[0].productCount).toBe(firstRun[1].productCount);
		expect(secondRun[0].productCount).toBe(secondRun[1].productCount);
		expect(secondRun[0].totals.grossRevenue).not.toBe(
			firstRun[0].totals.grossRevenue,
		);
	});

	test("averages scenario results across multiple launches", () => {
		const scenarios = [scenario("base"), scenario("discount-10")];
		const experimentRun = 9;
		const launchCount = 2;
		const orderCount = 6;
		const results = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios,
			payoutPercent: 5,
			experimentRun,
			launchCount,
			orderCount,
		});

		for (const [index, promotionScenario] of scenarios.entries()) {
			const launchTotals = Array.from({ length: launchCount }, (_, launchIndex) => {
				const orders = generateRandomOrders({
					products: simulationProducts,
					orderCount,
					seed: `${experimentRun}:launch:${launchIndex + 1}:orders`,
				});

				return {
					productCount: countProductsInOrders(orders),
					totals: calculatePromotionScenarioTotals({
						scenario: promotionScenario,
						orders,
						payoutPercent: 5,
					}),
				};
			});

			expect(results[index].orderCount).toBe(orderCount);
			expect(results[index].productCount).toBeCloseTo(
				average(launchTotals.map((launch) => launch.productCount)),
			);
			expect(results[index].totals.grossRevenue).toBeCloseTo(
				average(launchTotals.map((launch) => launch.totals.grossRevenue)),
			);
			expect(results[index].totals.marginPercent).toBeCloseTo(
				average(launchTotals.map((launch) => launch.totals.marginPercent)),
			);
		}
	});

	test("averages margin percent from launch percentages instead of averaged totals", () => {
		const products: SimulationProduct[] = [
			{
				code: "HIGH",
				listPrice: 100,
				supplierPrice: 20,
				vatRate: 0,
				discountPercent: 0,
				category: "",
			},
			{
				code: "LOW",
				listPrice: 10,
				supplierPrice: 9,
				vatRate: 0,
				discountPercent: 0,
				category: "",
			},
		];
		const experimentRun = 4;
		const launchCount = 3;
		const orderCount = 4;
		const result = createSimulationScenarioResults({
			products,
			scenarios: [scenario("base")],
			payoutPercent: 0,
			experimentRun,
			launchCount,
			orderCount,
		})[0];
		const launchTotals = Array.from({ length: launchCount }, (_, launchIndex) =>
			calculatePromotionScenarioTotals({
				scenario: scenario("base"),
				orders: generateRandomOrders({
					products,
					orderCount,
					seed: `${experimentRun}:launch:${launchIndex + 1}:orders`,
				}),
				payoutPercent: 0,
			}),
		);
		const averagedTotalsRatio =
			(average(launchTotals.map((totals) => totals.marginAmount)) /
				average(launchTotals.map((totals) => totals.netRevenue))) *
			100;

		expect(result.totals.marginPercent).toBeCloseTo(
			average(launchTotals.map((totals) => totals.marginPercent)),
		);
		expect(result.totals.marginPercent).not.toBeCloseTo(averagedTotalsRatio, 8);
	});

	test("merges launch range batches into the same averages as one full experiment", () => {
		const scenarios = [scenario("no-discounts"), scenario("base"), scenario("3x2")];
		const fullRun = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios,
			payoutPercent: 5,
			experimentRun: 11,
			launchCount: 4,
			orderCount: 8,
		});
		const firstBatch = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios,
			payoutPercent: 5,
			experimentRun: 11,
			firstLaunch: 1,
			launchCount: 2,
			orderCount: 8,
		});
		const secondBatch = createSimulationScenarioResults({
			products: simulationProducts,
			scenarios,
			payoutPercent: 5,
			experimentRun: 11,
			firstLaunch: 3,
			launchCount: 2,
			orderCount: 8,
		});

		const merged = mergeSimulationScenarioResultBatches([
			{ launchCount: 2, results: firstBatch },
			{ launchCount: 2, results: secondBatch },
		]);

		expect(merged.map((result) => result.scenario.id)).toEqual(
			fullRun.map((result) => result.scenario.id),
		);

		for (const [index, result] of merged.entries()) {
			expect(result.orderCount).toBeCloseTo(fullRun[index].orderCount);
			expect(result.productCount).toBeCloseTo(fullRun[index].productCount);
			expect(result.totals.grossRevenue).toBeCloseTo(
				fullRun[index].totals.grossRevenue,
			);
			expect(result.totals.netRevenue).toBeCloseTo(
				fullRun[index].totals.netRevenue,
			);
			expect(result.totals.marginAmount).toBeCloseTo(
				fullRun[index].totals.marginAmount,
			);
			expect(result.totals.marginPercent).toBeCloseTo(
				fullRun[index].totals.marginPercent,
			);
		}
	});
});

function scenario(id: (typeof PROMOTION_SCENARIOS)[number]["id"]) {
	const promotionScenario = PROMOTION_SCENARIOS.find((candidate) => candidate.id === id);

	if (!promotionScenario) {
		throw new Error(`Missing scenario ${id}`);
	}

	return promotionScenario;
}

function average(values: number[]) {
	return values.reduce((total, value) => total + value, 0) / values.length;
}

function countProductsInOrders(orders: { quantity: number }[][]) {
	return orders.reduce(
		(total, order) =>
			total + order.reduce((orderTotal, line) => orderTotal + line.quantity, 0),
		0,
	);
}
