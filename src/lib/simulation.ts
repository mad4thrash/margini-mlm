import { calculateProductMargin } from './margins';

export type SimulationProduct = {
	code: string;
	listPrice: number;
	supplierPrice: number;
	vatRate: number;
	discountPercent?: number | null;
	category?: string | null;
};

export type SimulationLine = {
	product: SimulationProduct;
	quantity: number;
};

export type SimulationTotalsInput = {
	lines: SimulationLine[];
	payoutPercent: number;
	scenarioDiscountPercent?: number;
};

export type SimulationTotals = {
	grossRevenue: number;
	netRevenue: number;
	payout: number;
	supplierCost: number;
	marginAmount: number;
	marginPercent: number;
};

export type SimulationOrderMode = 'generic' | '3x2' | '4x3';

type GenericOrderKind = 'single' | 'multiples-of-3' | 'multiples-of-4';

export type GenerateRandomOrdersInput = {
	products: SimulationProduct[];
	mode?: SimulationOrderMode;
	orderCount?: number;
	seed?: string | number;
};

export type GenerateComparableSimulationOrdersInput = GenerateRandomOrdersInput & {
	options: string[];
};

export type PromotionScenarioId =
	| 'no-discounts'
	| 'base'
	| 'discount-10'
	| 'discount-20'
	| 'discount-25'
	| 'discount-30'
	| '3x2'
	| '4x3'
	| '3x2-no-kit'
	| '4x3-no-kit';

type ProductDiscountMode = 'saved' | 'zero';

export type PromotionScenario = {
	id: PromotionScenarioId;
	name: string;
	orderMode: SimulationOrderMode;
	productDiscountMode?: ProductDiscountMode;
	discountPercent?: number;
	bundleGroupSize?: 3 | 4;
	excludeKitFromBundle?: boolean;
	kitDiscountPercent?: number;
};

export type PromotionScenarioTotalsInput = {
	scenario: PromotionScenario;
	orders: SimulationLine[][];
	payoutPercent: number;
};

export type PromotionScenarioLineTotalsInput = {
	scenario: PromotionScenario;
	lines: SimulationLine[];
	payoutPercent: number;
};

export type FirstLaunchOrderLogInput = {
	experimentRun: number;
	launch: number;
	orderLimit?: number;
	scenarios: PromotionScenario[];
	orders: SimulationLine[][];
};

export type FirstLaunchOrderLog = {
	experimentRun: number;
	launch: number;
	orderLimit: number;
	scenarios: {
		id: PromotionScenarioId;
		name: string;
		orders: {
			orderNumber: number;
			products: {
				code: string;
				category: string;
				quantity: number;
				listPrice: number;
				discountPercent: number;
				paidGrossPrice: number;
				lineGrossTotal: number;
			}[];
			totalGross: number;
		}[];
	}[];
};

export const PROMOTION_SCENARIOS: PromotionScenario[] = [
	{ id: 'no-discounts', name: 'No sconti', orderMode: 'generic', productDiscountMode: 'zero' },
	{ id: 'base', name: 'DB/base', orderMode: 'generic' },
	{ id: 'discount-10', name: '10 percent', orderMode: 'generic', discountPercent: 10 },
	{ id: 'discount-20', name: '20 percent', orderMode: 'generic', discountPercent: 20 },
	{ id: 'discount-25', name: '25 percent', orderMode: 'generic', discountPercent: 25 },
	{ id: 'discount-30', name: '30 percent', orderMode: 'generic', discountPercent: 30 },
	{ id: '3x2', name: '3x2', orderMode: '3x2', bundleGroupSize: 3 },
	{ id: '4x3', name: '4x3', orderMode: '4x3', bundleGroupSize: 4 },
	{
		id: '3x2-no-kit',
		name: '3x2 no KIT',
		orderMode: '3x2',
		bundleGroupSize: 3,
		excludeKitFromBundle: true,
		kitDiscountPercent: 20
	},
	{
		id: '4x3-no-kit',
		name: '4x3 no KIT',
		orderMode: '4x3',
		bundleGroupSize: 4,
		excludeKitFromBundle: true,
		kitDiscountPercent: 20
	}
];

export function calculateSimulationTotals(_input: SimulationTotalsInput): SimulationTotals {
	const { lines, payoutPercent, scenarioDiscountPercent = 0 } = _input;
	const totals = lines.reduce(
		(accumulator, line) => {
			const quantity = line.quantity;
			const effectiveDiscountPercent = Math.min(
				(line.product.discountPercent ?? 0) + scenarioDiscountPercent,
				100
			);
			const margin = calculateProductMargin({
				listPrice: line.product.listPrice,
				supplierPrice: line.product.supplierPrice,
				vatRate: line.product.vatRate,
				discountPercent: effectiveDiscountPercent,
				payoutPercent
			});

			accumulator.grossRevenue += margin.discountedGrossPrice * quantity;
			accumulator.netRevenue += margin.netRevenue * quantity;
			accumulator.payout += margin.payoutAmount * quantity;
			accumulator.supplierCost += line.product.supplierPrice * quantity;
			accumulator.marginAmount += margin.marginAmount * quantity;

			return accumulator;
		},
		{
			grossRevenue: 0,
			netRevenue: 0,
			payout: 0,
			supplierCost: 0,
			marginAmount: 0
		}
	);

	return {
		...totals,
		marginPercent: totals.netRevenue > 0 ? (totals.marginAmount / totals.netRevenue) * 100 : 0
	};
}

export function calculatePromotionScenarioTotals(
	input: PromotionScenarioTotalsInput
): SimulationTotals {
	const { scenario, orders, payoutPercent } = input;

	if (!scenario.bundleGroupSize) {
		return calculatePromotionScenarioLineTotals({
			scenario,
			lines: countProductLinesInOrders(orders),
			payoutPercent
		});
	}

	const totals = createEmptyTotals();
	const marginCache = new Map<string, SimulationTotals>();

	for (const order of orders) {
		addBundleOrderTotals(totals, order, scenario, payoutPercent, marginCache);
	}

	return {
		...totals,
		marginPercent: totals.netRevenue > 0 ? (totals.marginAmount / totals.netRevenue) * 100 : 0
	};
}

export function calculatePromotionScenarioLineTotals(
	input: PromotionScenarioLineTotalsInput
): SimulationTotals {
	const { scenario, lines, payoutPercent } = input;

	return calculateSimulationTotals({
		lines: lines.map((line) => ({
			product: {
				...line.product,
				discountPercent: cappedPercent(
					scenarioProductDiscountPercent(line.product, scenario) +
						(scenario.discountPercent ?? 0)
				)
			},
			quantity: line.quantity
		})),
		payoutPercent
	});
}

export function generateRandomOrders(input: GenerateRandomOrdersInput): SimulationLine[][] {
	const { products, mode = 'generic', orderCount = 1000, seed } = input;
	const random = createRandom(seed);

	if (products.length === 0 || orderCount <= 0) {
		return [];
	}

	if (mode === 'generic') {
		return generateGenericOrders(products, random, orderCount);
	}

	return Array.from({ length: orderCount }, () =>
		generateBundleOrder(products, random, mode === '3x2' ? 3 : 4)
	);
}

export function generateComparableSimulationOrders(
	input: GenerateComparableSimulationOrdersInput
): Record<string, SimulationLine[][]> {
	const { options, ...orderInput } = input;
	const orders = generateRandomOrders(orderInput);

	return Object.fromEntries(
		options.map((option) => [
			option,
			orders.map((order) => order.map((line) => ({ product: line.product, quantity: line.quantity })))
		])
	);
}

export function createFirstLaunchOrderLog(input: FirstLaunchOrderLogInput): FirstLaunchOrderLog {
	const { experimentRun, launch, scenarios, orders, orderLimit = 10 } = input;
	const limitedOrders = orders.slice(0, orderLimit);

	return {
		experimentRun,
		launch,
		orderLimit,
		scenarios: scenarios.map((scenario) => ({
			id: scenario.id,
			name: scenario.name,
			orders: limitedOrders.map((order, orderIndex) => {
				const products = summarizeScenarioOrderProducts(order, scenario);

				return {
					orderNumber: orderIndex + 1,
					products,
					totalGross: roundCurrency(
						products.reduce((total, product) => total + product.lineGrossTotal, 0)
					)
				};
			})
		}))
	};
}

function applyPromotionScenarioToOrder(
	order: SimulationLine[],
	scenario: PromotionScenario
): SimulationLine[] {
	const units = expandOrderUnits(order).map((line, index) => ({
		line,
		index,
		discountPercent: scenarioProductDiscountPercent(line.product, scenario) + (scenario.discountPercent ?? 0)
	}));

	if (scenario.excludeKitFromBundle) {
		for (const unit of units) {
			if (isKitProduct(unit.line.product)) {
				unit.discountPercent =
					scenarioProductDiscountPercent(unit.line.product, scenario) +
					(scenario.kitDiscountPercent ?? 0);
			}
		}
	}

	if (scenario.bundleGroupSize) {
		const eligibleUnits = units
			.filter((unit) => !(scenario.excludeKitFromBundle && isKitProduct(unit.line.product)))
			.map((unit) => ({
				...unit,
				paidGrossPrice: unit.line.product.listPrice * (1 - cappedPercent(unit.discountPercent) / 100)
			}))
			.sort(
				(first, second) =>
					first.paidGrossPrice - second.paidGrossPrice || first.index - second.index
			);
		const freeUnitCount = Math.floor(eligibleUnits.length / scenario.bundleGroupSize);

		for (const unit of eligibleUnits.slice(0, freeUnitCount)) {
			units[unit.index].discountPercent = 100;
		}
	}

	return units.map((unit) => ({
		product: {
			...unit.line.product,
			discountPercent: cappedPercent(unit.discountPercent)
		},
		quantity: 1
	}));
}

function summarizeScenarioOrderProducts(
	order: SimulationLine[],
	scenario: PromotionScenario
): FirstLaunchOrderLog['scenarios'][number]['orders'][number]['products'] {
	const products = new Map<
		string,
		FirstLaunchOrderLog['scenarios'][number]['orders'][number]['products'][number]
	>();

	for (const line of applyPromotionScenarioToOrder(order, scenario)) {
		const discountPercent = line.product.discountPercent ?? 0;
		const paidGrossPrice = roundCurrency(
			line.product.listPrice * (1 - cappedPercent(discountPercent) / 100)
		);
		const key = [
			line.product.code,
			line.product.category ?? '',
			line.product.listPrice,
			discountPercent,
			paidGrossPrice
		].join('|');
		const existing = products.get(key);

		if (existing) {
			existing.quantity += 1;
			existing.lineGrossTotal = roundCurrency(existing.lineGrossTotal + paidGrossPrice);
		} else {
			products.set(key, {
				code: line.product.code,
				category: line.product.category ?? '',
				quantity: 1,
				listPrice: line.product.listPrice,
				discountPercent,
				paidGrossPrice,
				lineGrossTotal: paidGrossPrice
			});
		}
	}

	return Array.from(products.values());
}

function addBundleOrderTotals(
	totals: Omit<SimulationTotals, 'marginPercent'>,
	order: SimulationLine[],
	scenario: PromotionScenario,
	payoutPercent: number,
	marginCache: Map<string, SimulationTotals>
) {
	const units: {
		product: SimulationProduct;
		discountPercent: number;
		index: number;
	}[] = [];

	for (const line of order) {
		for (let unit = 0; unit < line.quantity; unit += 1) {
			const productDiscountPercent = scenarioProductDiscountPercent(line.product, scenario);
			const discountPercent =
				scenario.excludeKitFromBundle && isKitProduct(line.product)
					? productDiscountPercent + (scenario.kitDiscountPercent ?? 0)
					: productDiscountPercent + (scenario.discountPercent ?? 0);

			units.push({
				product: line.product,
				discountPercent,
				index: units.length
			});
		}
	}

	const eligibleUnits = units
		.filter((unit) => !(scenario.excludeKitFromBundle && isKitProduct(unit.product)))
		.map((unit) => ({
			...unit,
			paidGrossPrice: unit.product.listPrice * (1 - cappedPercent(unit.discountPercent) / 100)
		}))
		.sort(
			(first, second) => first.paidGrossPrice - second.paidGrossPrice || first.index - second.index
		);
	const freeUnitCount = Math.floor(eligibleUnits.length / (scenario.bundleGroupSize ?? 1));

	for (const unit of eligibleUnits.slice(0, freeUnitCount)) {
		units[unit.index].discountPercent = 100;
	}

	for (const unit of units) {
		const margin = cachedUnitMargin(unit.product, unit.discountPercent, payoutPercent, marginCache);

		totals.grossRevenue += margin.grossRevenue;
		totals.netRevenue += margin.netRevenue;
		totals.payout += margin.payout;
		totals.supplierCost += margin.supplierCost;
		totals.marginAmount += margin.marginAmount;
	}
}

function cachedUnitMargin(
	product: SimulationProduct,
	discountPercent: number,
	payoutPercent: number,
	marginCache: Map<string, SimulationTotals>
): SimulationTotals {
	const effectiveDiscountPercent = cappedPercent(discountPercent);
	const cacheKey = [
		product.code,
		product.listPrice,
		product.supplierPrice,
		product.vatRate,
		effectiveDiscountPercent,
		payoutPercent
	].join('|');
	const cachedMargin = marginCache.get(cacheKey);

	if (cachedMargin) {
		return cachedMargin;
	}

	const margin = calculateProductMargin({
		listPrice: product.listPrice,
		supplierPrice: product.supplierPrice,
		vatRate: product.vatRate,
		discountPercent: effectiveDiscountPercent,
		payoutPercent
	});
	const totals = {
		grossRevenue: margin.discountedGrossPrice,
		netRevenue: margin.netRevenue,
		payout: margin.payoutAmount,
		supplierCost: product.supplierPrice,
		marginAmount: margin.marginAmount,
		marginPercent: margin.marginPercent
	};

	marginCache.set(cacheKey, totals);

	return totals;
}

function createEmptyTotals(): Omit<SimulationTotals, 'marginPercent'> {
	return {
		grossRevenue: 0,
		netRevenue: 0,
		payout: 0,
		supplierCost: 0,
		marginAmount: 0
	};
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

function expandOrderUnits(order: SimulationLine[]): SimulationLine[] {
	return order.flatMap((line) =>
		Array.from({ length: line.quantity }, () => ({ product: line.product, quantity: 1 }))
	);
}

function baseDiscountPercent(product: SimulationProduct): number {
	return product.discountPercent ?? 0;
}

function scenarioProductDiscountPercent(
	product: SimulationProduct,
	scenario: PromotionScenario
): number {
	if (scenario.productDiscountMode === 'zero') {
		return 0;
	}

	return baseDiscountPercent(product);
}

function cappedPercent(percent: number): number {
	return Math.min(percent, 100);
}

function roundCurrency(value: number): number {
	return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isKitProduct(product: SimulationProduct): boolean {
	return product.category?.trim().toLocaleLowerCase() === 'kit';
}

function generateGenericOrders(
	products: SimulationProduct[],
	random: () => number,
	orderCount: number
): SimulationLine[][] {
	const orderKinds = shuffledGenericOrderKinds(orderCount, random);

	return orderKinds.map((orderKind) =>
		generateOrderWithUnitCount(products, random, genericOrderUnitCount(orderKind, random))
	);
}

function shuffledGenericOrderKinds(orderCount: number, random: () => number): GenericOrderKind[] {
	const singleCount = Math.round(orderCount * 0.05);
	const remainingCount = orderCount - singleCount;
	const multiplesOfThreeCount = Math.floor(remainingCount / 2);
	const multiplesOfFourCount = remainingCount - multiplesOfThreeCount;
	const orderKinds: GenericOrderKind[] = [
		...Array<GenericOrderKind>(singleCount).fill('single'),
		...Array<GenericOrderKind>(multiplesOfThreeCount).fill('multiples-of-3'),
		...Array<GenericOrderKind>(multiplesOfFourCount).fill('multiples-of-4')
	];

	for (let index = orderKinds.length - 1; index > 0; index -= 1) {
		const swapIndex = randomInteger(random, 0, index);
		[orderKinds[index], orderKinds[swapIndex]] = [orderKinds[swapIndex], orderKinds[index]];
	}

	return orderKinds;
}

function genericOrderUnitCount(orderKind: GenericOrderKind, random: () => number): number {
	if (orderKind === 'single') {
		return 1;
	}

	if (orderKind === 'multiples-of-3') {
		return randomChoice([3, 6, 9, 12], random);
	}

	return randomChoice([4, 8, 12], random);
}

function generateBundleOrder(
	products: SimulationProduct[],
	random: () => number,
	groupSize: 3 | 4
): SimulationLine[] {
	const totalUnits = randomInteger(random, 1, 2) * groupSize;

	return generateOrderWithUnitCount(products, random, totalUnits);
}

function generateOrderWithUnitCount(
	products: SimulationProduct[],
	random: () => number,
	totalUnits: number
): SimulationLine[] {
	const lines = new Map<string, SimulationLine>();

	for (let unit = 0; unit < totalUnits; unit += 1) {
		const product = products[randomInteger(random, 0, products.length - 1)];
		const line = lines.get(product.code);

		if (line) {
			line.quantity += 1;
		} else {
			lines.set(product.code, { product, quantity: 1 });
		}
	}

	return Array.from(lines.values());
}

function randomChoice<T>(options: T[], random: () => number): T {
	return options[randomInteger(random, 0, options.length - 1)];
}

function createRandom(seed: string | number | undefined): () => number {
	if (seed === undefined) {
		return Math.random;
	}

	let state = hashSeed(seed);

	return () => {
		state += 0x6d2b79f5;
		let value = state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
}

function hashSeed(seed: string | number): number {
	const value = String(seed);
	let hash = 2166136261;

	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

function randomInteger(random: () => number, min: number, max: number): number {
	return Math.floor(random() * (max - min + 1)) + min;
}
