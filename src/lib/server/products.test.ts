import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PrismaClient } from '../../generated/prisma/client';
import {
	createProduct,
	deleteProduct,
	getSettings,
	importProducts,
	listProducts,
	updateProduct,
	updateSettings
} from './products';

let db: PrismaClient;
let tempDir: string;

async function applyMigration(client: PrismaClient) {
	const migration = await readFile(
		path.resolve('prisma/migrations/20260611122959_init/migration.sql'),
		'utf8'
	);

	for (const statement of migration.split(';').map((sql) => sql.trim()).filter(Boolean)) {
		await client.$executeRawUnsafe(statement);
	}
}

beforeEach(async () => {
	tempDir = await mkdtemp(path.join(tmpdir(), 'margini-'));
	const databasePath = path.join(tempDir, 'test.db').replaceAll('\\', '/');
	db = new PrismaClient({
		adapter: new PrismaBetterSqlite3({ url: `file:${databasePath}` })
	});

	await applyMigration(db);
});

afterEach(async () => {
	await db.$disconnect();
	await rm(tempDir, { force: true, recursive: true });
});

describe('product data access', () => {
	it('lists products ordered by category then code', async () => {
		await createProduct(db, {
			code: 'B-002',
			description: 'Second body cream',
			category: 'Body',
			listPrice: 30,
			supplierPrice: 11,
			vatRate: 22,
			discountPercent: 5
		});
		await createProduct(db, {
			code: 'A-001',
			description: 'Face serum',
			category: 'Face',
			listPrice: 42,
			supplierPrice: 15,
			vatRate: 22,
			discountPercent: 0
		});
		await createProduct(db, {
			code: 'B-001',
			description: 'First body cream',
			category: 'Body',
			listPrice: 28,
			supplierPrice: 10,
			vatRate: 22,
			discountPercent: 10
		});

		const products = await listProducts(db);

		expect(products.map((product) => product.code)).toEqual(['B-001', 'B-002', 'A-001']);
	});

	it('creates, updates, and deletes products', async () => {
		const created = await createProduct(db, {
			code: 'SKU-1',
			description: 'Starter product',
			category: 'Starter',
			listPrice: 20,
			supplierPrice: 8,
			vatRate: 22,
			discountPercent: 0
		});

		const updated = await updateProduct(db, {
			id: created.id,
			code: 'SKU-1B',
			description: 'Updated product',
			category: 'Updated',
			listPrice: 25,
			supplierPrice: 9,
			vatRate: 10,
			discountPercent: 3
		});

		expect(updated).toMatchObject({
			id: created.id,
			code: 'SKU-1B',
			description: 'Updated product',
			category: 'Updated',
			listPrice: 25,
			supplierPrice: 9,
			vatRate: 10,
			discountPercent: 3
		});

		await deleteProduct(db, { id: created.id });

		await expect(listProducts(db)).resolves.toEqual([]);
	});

	it('imports products by creating new codes and updating existing codes', async () => {
		await createProduct(db, {
			code: 'SKU-1',
			description: 'Original product',
			category: 'Original',
			listPrice: 20,
			supplierPrice: 8,
			vatRate: 22,
			discountPercent: 0
		});

		const result = await importProducts(db, [
			{
				code: 'SKU-1',
				description: 'Updated product',
				category: 'Updated',
				listPrice: 25,
				supplierPrice: 9,
				vatRate: 10,
				discountPercent: 3
			},
			{
				code: 'SKU-2',
				description: 'New product',
				category: 'New',
				listPrice: 42,
				supplierPrice: 18,
				vatRate: 22,
				discountPercent: 0
			}
		]);

		expect(result).toEqual({ created: 1, updated: 1 });
		await expect(listProducts(db)).resolves.toMatchObject([
			{
				code: 'SKU-2',
				description: 'New product',
				category: 'New'
			},
			{
				code: 'SKU-1',
				description: 'Updated product',
				category: 'Updated',
				listPrice: 25,
				supplierPrice: 9,
				vatRate: 10,
				discountPercent: 3
			}
		]);
	});
});

describe('settings data access', () => {
	it('defaults payoutPercent to 0 when no settings row exists', async () => {
		await expect(getSettings(db)).resolves.toMatchObject({ payoutPercent: 0 });
	});

	it('persists payoutPercent in a singleton settings row', async () => {
		await updateSettings(db, { payoutPercent: 12.5 });

		await expect(getSettings(db)).resolves.toMatchObject({ payoutPercent: 12.5 });
	});
});
