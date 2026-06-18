import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { FirstLaunchOrderLog } from '$lib/simulation';

export type WriteFirstLaunchOrderLogOptions = {
	logsDir?: string;
};

export type WriteFirstLaunchOrderLogResult = {
	fileName: string;
	filePath: string;
};

export async function writeFirstLaunchOrderLog(
	log: FirstLaunchOrderLog,
	options: WriteFirstLaunchOrderLogOptions = {}
): Promise<WriteFirstLaunchOrderLogResult> {
	const logsDir = options.logsDir ?? path.resolve('logs');
	const fileName = `simulation-run-${log.experimentRun}-first-launch-orders.json`;
	const filePath = path.join(logsDir, fileName);

	await mkdir(logsDir, { recursive: true });
	await writeFile(filePath, `${JSON.stringify(log, null, 2)}\n`, 'utf8');

	return { fileName, filePath };
}
