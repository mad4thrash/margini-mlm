import { command, query } from '$app/server';
import * as v from 'valibot';

import { prisma } from '$lib/server/db';
import {
	createProduct as createProductRecord,
	deleteProduct as deleteProductRecord,
	getSettings as getSettingsRecord,
	listProducts,
	updateProduct as updateProductRecord,
	updateSettings as updateSettingsRecord
} from '$lib/server/products';

const idSchema = v.object({
	id: v.pipe(v.number(), v.integer(), v.minValue(1))
});

const productSchema = v.object({
	code: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	description: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	category: v.pipe(v.string(), v.trim(), v.nonEmpty()),
	listPrice: v.pipe(v.number(), v.minValue(0)),
	supplierPrice: v.pipe(v.number(), v.minValue(0)),
	vatRate: v.pipe(v.number(), v.minValue(0)),
	discountPercent: v.optional(v.pipe(v.number(), v.minValue(0)), 0)
});

const productUpdateSchema = v.object({
	...productSchema.entries,
	id: v.pipe(v.number(), v.integer(), v.minValue(1))
});

const settingsSchema = v.object({
	payoutPercent: v.pipe(v.number(), v.minValue(0))
});

export const getProducts = query(async () => {
	return listProducts(prisma);
});

export const getSettings = query(async () => {
	return getSettingsRecord(prisma);
});

export const createProduct = command(productSchema, async (input) => {
	const product = await createProductRecord(prisma, input);
	getProducts().set(await listProducts(prisma));
	return product;
});

export const updateProduct = command(productUpdateSchema, async (input) => {
	const product = await updateProductRecord(prisma, input);
	getProducts().set(await listProducts(prisma));
	return product;
});

export const deleteProduct = command(idSchema, async (input) => {
	await deleteProductRecord(prisma, input);
	getProducts().set(await listProducts(prisma));
});

export const updateSettings = command(settingsSchema, async (input) => {
	const settings = await updateSettingsRecord(prisma, input);
	getSettings().set(settings);
	return settings;
});
