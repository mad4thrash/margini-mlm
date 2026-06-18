import { json, type RequestHandler } from '@sveltejs/kit';

import { writeFirstLaunchOrderLog } from '$lib/server/simulation-logs';
import type { FirstLaunchOrderLog } from '$lib/simulation';

export const POST = (async ({ request }) => {
	const log = (await request.json()) as FirstLaunchOrderLog;
	const result = await writeFirstLaunchOrderLog(log);

	return json({ fileName: result.fileName });
}) satisfies RequestHandler;
