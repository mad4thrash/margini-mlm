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
	| 'base'
	| 'discount-10'
	| 'discount-20'
	| 'discount-25'
	| 'discount-30'
	| '3x2'
	| '4x3'
	| '3x2-no-kit'
	| '4x3-no-kit';

export type PromotionScenario = {
	id: PromotionScenarioId;
	name: string;
	orderMode: SimulationOrderMode;
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

export const PROMOTION_SCENARIOS: PromotionScenario[] = [
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
	const totals = orders.reduce(
		(accumulator, order) => {
			const orderTotals = calculateSimulationTotals({
				lines: applyPromotionScenarioToOrder(order, scenario),
				payoutPercent
			});

			accumulator.grossRevenue += orderTotals.grossRevenue;
			accumulator.netRevenue += orderTotals.netRevenue;
			accumulator.payout += orderTotals.payout;
			accumulator.supplierCost += orderTotals.supplierCost;
			accumulator.marginAmount += orderTotals.marginAmount;

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

export function generateRandomOrders(input: GenerateRandomOrdersInput): SimulationLine[][] {
	const { products, mode = 'generic', orderCount = 1000, seed } = input;
	const random = createRandom(seed);

	if (products.length === 0 || orderCount <= 0) {
		return [];
	}

	return Array.from({ length: orderCount }, () => {
		if (mode === '3x2') {
			return generateBundleOrder(products, random, 3);
		}

		if (mode === '4x3') {
			return generateBundleOrder(products, random, 4);
		}

		return generateGenericOrder(products, random);
	});
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

function applyPromotionScenarioToOrder(
	order: SimulationLine[],
	scenario: PromotionScenario
): SimulationLine[] {
	const units = expandOrderUnits(order).map((line, index) => ({
		line,
		index,
		discountPercent: baseDiscountPercent(line.product) + (scenario.discountPercent ?? 0)
	}));

	if (scenario.excludeKitFromBundle) {
		for (const unit of units) {
			if (isKitProduct(unit.line.product)) {
				unit.discountPercent =
					baseDiscountPercent(unit.line.product) + (scenario.kitDiscountPercent ?? 0);
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

function expandOrderUnits(order: SimulationLine[]): SimulationLine[] {
	return order.flatMap((line) =>
		Array.from({ length: line.quantity }, () => ({ product: line.product, quantity: 1 }))
	);
}

function baseDiscountPercent(product: SimulationProduct): number {
	return product.discountPercent ?? 0;
}

function cappedPercent(percent: number): number {
	return Math.min(percent, 100);
}

function isKitProduct(product: SimulationProduct): boolean {
	return product.category?.trim().toLocaleLowerCase() === 'kit';
}

function generateGenericOrder(
	products: SimulationProduct[],
	random: () => number
): SimulationLine[] {
	const lineCount = randomInteger(random, 1, Math.min(8, products.length));
	const selectedProducts = takeRandomProducts(products, lineCount, random);

	return selectedProducts.map((product) => ({
		product,
		quantity: randomInteger(random, 1, 4)
	}));
}

function generateBundleOrder(
	products: SimulationProduct[],
	random: () => number,
	groupSize: 3 | 4
): SimulationLine[] {
	const totalUnits = randomInteger(random, 1, 2) * groupSize;
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

function takeRandomProducts(
	products: SimulationProduct[],
	count: number,
	random: () => number
): SimulationProduct[] {
	const pool = [...products];
	const selected: SimulationProduct[] = [];

	for (let index = 0; index < count; index += 1) {
		const poolIndex = randomInteger(random, 0, pool.length - 1);
		const [product] = pool.splice(poolIndex, 1);
		selected.push(product);
	}

	return selected;
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
