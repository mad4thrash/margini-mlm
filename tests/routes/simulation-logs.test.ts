import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { POST } from '../../src/routes/simulation-logs/+server';
import type { FirstLaunchOrderLog } from '../../src/lib/simulation';

const logPath = path.resolve('logs/simulation-run-998-first-launch-orders.json');

afterEach(async () => {
	await rm(logPath, { force: true });
});

describe('simulation logs endpoint', () => {
	it('writes the posted first-launch order log to the logs folder', async () => {
		const log = {
			experimentRun: 998,
			launch: 1,
			orderLimit: 10,
			scenarios: []
		} satisfies FirstLaunchOrderLog;

		const response = await POST({
			request: new Request('http://localhost/simulation-logs', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(log)
			})
		} as Parameters<typeof POST>[0]);

		await expect(response.json()).resolves.toEqual({
			fileName: 'simulation-run-998-first-launch-orders.json'
		});
		await expect(readFile(logPath, 'utf8')).resolves.toBe(`${JSON.stringify(log, null, 2)}\n`);
	});
});
