import type { PrismaClient } from '../../generated/prisma/client';

export type ProductInput = {
	code: string;
	description: string;
	category: string;
	listPrice: number;
	supplierPrice: number;
	vatRate: number;
	discountPercent?: number;
};

export type ProductUpdateInput = ProductInput & {
	id: number;
};

export type ProductDeleteInput = {
	id: number;
};

export type ProductImportResult = {
	created: number;
	updated: number;
};

export type SettingsInput = {
	payoutPercent: number;
};

export async function listProducts(db: PrismaClient) {
	return db.product.findMany({
		orderBy: [{ category: 'asc' }, { code: 'asc' }]
	});
}

export async function getSettings(db: PrismaClient) {
	return (
		(await db.settings.findUnique({
			where: { id: 1 }
		})) ?? { id: 1, payoutPercent: 0, createdAt: new Date(0), updatedAt: new Date(0) }
	);
}

export async function createProduct(db: PrismaClient, input: ProductInput) {
	return db.product.create({
		data: {
			...input,
			discountPercent: input.discountPercent ?? 0
		}
	});
}

export async function updateProduct(db: PrismaClient, input: ProductUpdateInput) {
	const { id, ...data } = input;

	return db.product.update({
		where: { id },
		data: {
			...data,
			discountPercent: data.discountPercent ?? 0
		}
	});
}

export async function deleteProduct(db: PrismaClient, input: ProductDeleteInput) {
	await db.product.delete({
		where: { id: input.id }
	});
}

export async function importProducts(
	db: PrismaClient,
	products: ProductInput[]
): Promise<ProductImportResult> {
	let created = 0;
	let updated = 0;

	for (const product of products) {
		const existing = await db.product.findUnique({
			where: { code: product.code },
			select: { id: true }
		});

		await db.product.upsert({
			where: { code: product.code },
			create: {
				...product,
				discountPercent: product.discountPercent ?? 0
			},
			update: {
				description: product.description,
				category: product.category,
				listPrice: product.listPrice,
				supplierPrice: product.supplierPrice,
				vatRate: product.vatRate,
				discountPercent: product.discountPercent ?? 0
			}
		});

		if (existing) {
			updated += 1;
		} else {
			created += 1;
		}
	}

	return { created, updated };
}

export async function updateSettings(db: PrismaClient, input: SettingsInput) {
	return db.settings.upsert({
		where: { id: 1 },
		create: {
			id: 1,
			payoutPercent: input.payoutPercent
		},
		update: {
			payoutPercent: input.payoutPercent
		}
	});
}
