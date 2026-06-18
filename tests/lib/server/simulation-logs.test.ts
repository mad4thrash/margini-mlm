import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { writeFirstLaunchOrderLog } from '../../../src/lib/server/simulation-logs';
import type { FirstLaunchOrderLog } from '../../../src/lib/simulation';

let tempDir: string;

beforeEach(async () => {
	tempDir = await mkdtemp(path.join(tmpdir(), 'margini-logs-'));
});

afterEach(async () => {
	await rm(tempDir, { force: true, recursive: true });
});

describe('simulation log writer', () => {
	it('writes a readable JSON file for the first launch order log', async () => {
		const log = {
			experimentRun: 7,
			launch: 1,
			orderLimit: 10,
			scenarios: [
				{
					id: 'base',
					name: 'DB/base',
					orders: [
						{
							orderNumber: 1,
							products: [
								{
									code: 'SKU-1',
									category: 'KIT',
									quantity: 1,
									listPrice: 100,
									discountPercent: 20,
									paidGrossPrice: 80,
									lineGrossTotal: 80
								}
							],
							totalGross: 80
						}
					]
				}
			]
		} satisfies FirstLaunchOrderLog;

		const result = await writeFirstLaunchOrderLog(log, { logsDir: tempDir });

		expect(result.fileName).toBe('simulation-run-7-first-launch-orders.json');
		await expect(readFile(result.filePath, 'utf8')).resolves.toBe(
			`${JSON.stringify(log, null, 2)}\n`
		);
	});
});
