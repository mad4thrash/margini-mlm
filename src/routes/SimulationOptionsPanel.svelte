<script lang="ts">
	import { untrack } from 'svelte';
	import type { ProductTableProduct } from '$lib/product-table';
	import {
		createDefaultScenarioSelection,
		createFirstLaunchSimulationOrderLog,
		createSimulationScenarioResults,
		mergeSimulationScenarioResultBatches,
		toggleScenarioSelection,
		toSimulationProducts,
		type SimulationScenarioResultBatch,
		type SimulationScenarioResult
	} from '$lib/simulation-panel';
	import { PROMOTION_SCENARIOS, type PromotionScenarioId } from '$lib/simulation';

	type Props = {
		products: ProductTableProduct[];
		payoutPercent: number;
	};

	let { products, payoutPercent }: Props = $props();
	let selectedScenarioIds = $state<PromotionScenarioId[]>(createDefaultScenarioSelection());
	let experimentRun = $state(0);
	let scenarioResults = $state<SimulationScenarioResult[]>([]);
	let isSimulationLoading = $state(false);
	let completedLaunches = $state(0);
	let simulationProducts = $derived(toSimulationProducts(products));
	let selectedScenarios = $derived(
		PROMOTION_SCENARIOS.filter((scenario) => selectedScenarioIds.includes(scenario.id))
	);
	const launchCount = 1000;
	const orderCount = 1000;
	const launchBatchSize = 25;
	let simulationJobId = 0;
	let simulationProgress = $derived(
		launchCount > 0 ? Math.round((completedLaunches / launchCount) * 100) : 0
	);
	let experimentLabel = $derived(
		isSimulationLoading || scenarioResults.length > 0 ? `#${experimentRun}` : 'non lanciato'
	);

	const numberFormatter = new Intl.NumberFormat('it-IT');
	const currencyFormatter = new Intl.NumberFormat('it-IT', {
		style: 'currency',
		currency: 'EUR'
	});
	const percentFormatter = new Intl.NumberFormat('it-IT', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	function handleScenarioChange(scenarioId: PromotionScenarioId, event: Event) {
		selectedScenarioIds = toggleScenarioSelection(
			selectedScenarioIds,
			scenarioId,
			(event.currentTarget as HTMLInputElement).checked
		);
	}

	function rerunSimulation() {
		if (simulationProducts.length === 0 || selectedScenarios.length === 0 || isSimulationLoading) {
			return;
		}

		const nextExperimentRun = experimentRun + 1;
		experimentRun = nextExperimentRun;
		startSimulationJob({
			products: simulationProducts,
			scenarios: selectedScenarios,
			payoutPercent,
			experimentRun: nextExperimentRun
		});
	}

	$effect(() => {
		simulationProducts;
		selectedScenarios;
		payoutPercent;
		untrack(cancelSimulationJob);
	});

	type SimulationJobInput = {
		jobId: number;
		products: typeof simulationProducts;
		scenarios: typeof selectedScenarios;
		payoutPercent: number;
		experimentRun: number;
	};

	function startSimulationJob(input: Omit<SimulationJobInput, 'jobId'>) {
		const jobId = simulationJobId + 1;
		simulationJobId = jobId;
		isSimulationLoading = true;
		completedLaunches = 0;
		scenarioResults = [];
		void runSimulationJob({ jobId, ...input });
	}

	function cancelSimulationJob() {
		simulationJobId += 1;
		isSimulationLoading = false;
		completedLaunches = 0;
		scenarioResults = [];
	}

	async function runSimulationJob(input: SimulationJobInput) {
		const batches: SimulationScenarioResultBatch[] = [];
		void saveFirstLaunchOrderLog(input);

		for (let firstLaunch = 1; firstLaunch <= launchCount; firstLaunch += launchBatchSize) {
			if (input.jobId !== simulationJobId) {
				return;
			}

			const currentLaunchCount = Math.min(launchBatchSize, launchCount - firstLaunch + 1);
			const results = createSimulationScenarioResults({
				products: input.products,
				scenarios: input.scenarios,
				payoutPercent: input.payoutPercent,
				experimentRun: input.experimentRun,
				firstLaunch,
				launchCount: currentLaunchCount,
				orderCount
			});

			batches.push({ launchCount: currentLaunchCount, results });
			completedLaunches = firstLaunch + currentLaunchCount - 1;
			await yieldToBrowser();
		}

		if (input.jobId !== simulationJobId) {
			return;
		}

		scenarioResults = mergeSimulationScenarioResultBatches(batches);
		isSimulationLoading = false;
	}

	async function saveFirstLaunchOrderLog(input: SimulationJobInput) {
		try {
			const log = createFirstLaunchSimulationOrderLog({
				products: input.products,
				scenarios: input.scenarios,
				experimentRun: input.experimentRun,
				orderCount,
				orderLimit: 10
			});
			const response = await fetch('/simulation-logs', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(log)
			});

			if (!response.ok) {
				throw new Error(`Simulation order log request failed with ${response.status}`);
			}
		} catch (error) {
			console.error('Unable to write simulation order log', error);
		}
	}

	function yieldToBrowser() {
		return new Promise<void>((resolve) => {
			window.setTimeout(resolve, 0);
		});
	}

	function formatNumber(value: number) {
		return numberFormatter.format(value);
	}

	function formatCurrency(value: number) {
		return currencyFormatter.format(value);
	}

	function formatPercent(value: number) {
		return `${percentFormatter.format(value)}%`;
	}

	function toneClass(result: SimulationScenarioResult) {
		if (result.marginTone === 'negative') {
			return 'border-red-200 bg-red-50 text-red-700';
		}

		if (result.marginTone === 'low') {
			return 'border-amber-200 bg-amber-50 text-amber-800';
		}

		return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	}
</script>

<section
	id="simulations"
	aria-labelledby="simulations-title"
	class="scroll-mt-4 border border-zinc-200 bg-white px-3 py-3 shadow-sm sm:px-4"
>
	<div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
		<div class="max-w-2xl">
			<p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Simulazioni</p>
			<h2 id="simulations-title" class="text-base font-semibold text-zinc-950 sm:text-lg">
				Scenari promozionali
			</h2>
			<p class="mt-1 text-sm text-zinc-600">
				Scenari attivi: <span class="font-semibold text-zinc-950"
					>{selectedScenarioIds.length}/{PROMOTION_SCENARIOS.length}</span
				>
				<span class="mx-2 text-zinc-300">|</span>
				Esperimento: <span class="font-semibold text-zinc-950">{experimentLabel}</span>
				<span class="mx-2 text-zinc-300">|</span>
				<span class="font-semibold text-zinc-950"
					>{formatNumber(launchCount)} lanci x {formatNumber(orderCount)} ordini</span
				>
			</p>
		</div>

		<button
			type="button"
			class="h-10 cursor-pointer rounded border border-zinc-950 bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-6"
			disabled={simulationProducts.length === 0 || selectedScenarios.length === 0 || isSimulationLoading}
			onclick={rerunSimulation}
		>
			{isSimulationLoading ? 'Calcolo simulazione' : 'Rilancia simulazione'}
		</button>
	</div>

	{#if isSimulationLoading}
		<div class="mt-4 border border-zinc-200 bg-zinc-50 px-3 py-3" role="status" aria-live="polite">
			<div class="flex items-center justify-between gap-3 text-sm">
				<p class="font-medium text-zinc-800">Calcolo medie simulazione</p>
				<p class="tabular-nums text-zinc-600">
					{formatNumber(completedLaunches)}/{formatNumber(launchCount)} lanci
				</p>
			</div>
			<div class="mt-2 h-2 overflow-hidden rounded bg-zinc-200">
				<div
					class="h-full rounded bg-zinc-950 transition-[width] duration-150"
					style={`width: ${simulationProgress}%`}
				></div>
			</div>
		</div>
	{/if}

	<div class="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
		{#each PROMOTION_SCENARIOS as scenario}
			<label
				class="flex min-h-11 cursor-pointer items-center gap-3 border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-300 hover:bg-white"
			>
				<input
					class="h-4 w-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
					type="checkbox"
					checked={selectedScenarioIds.includes(scenario.id)}
					onchange={(event) => handleScenarioChange(scenario.id, event)}
				/>
				<span>{scenario.name}</span>
			</label>
		{/each}
	</div>

	{#if simulationProducts.length === 0}
		<p class="mt-4 border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
			Nessun prodotto salvato. Le simulazioni saranno disponibili dopo il salvataggio dei prodotti.
		</p>
	{:else if selectedScenarioIds.length === 0 && !isSimulationLoading}
		<p class="mt-4 border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
			Nessuno scenario selezionato.
		</p>
	{:else if scenarioResults.length === 0 && !isSimulationLoading}
		<p class="mt-4 border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
			Nessun esperimento lanciato. Usa Rilancia simulazione per calcolare le medie.
		</p>
	{:else if scenarioResults.length > 0}
		<div class="mt-4 hidden overflow-auto border border-zinc-200 md:block">
			<table class="min-w-[58rem] table-fixed border-collapse text-left text-sm" aria-live="polite">
				<thead class="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600">
					<tr>
						<th class="w-40 px-3 py-3 font-semibold">Scenario</th>
						<th class="w-28 px-3 py-3 text-right font-semibold">Ordini</th>
						<th class="w-28 px-3 py-3 text-right font-semibold">Prodotti</th>
						<th class="w-40 px-3 py-3 text-right font-semibold">Fatturato lordo</th>
						<th class="w-40 px-3 py-3 text-right font-semibold">Margine</th>
						<th class="w-32 px-3 py-3 text-right font-semibold">Margine %</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-zinc-200">
					{#each scenarioResults as result}
						<tr class="bg-white align-middle transition hover:bg-zinc-50">
							<th class="px-3 py-3 font-semibold text-zinc-950">{result.scenario.name}</th>
							<td class="px-3 py-3 text-right tabular-nums text-zinc-700">
								{formatNumber(result.orderCount)}
							</td>
							<td class="px-3 py-3 text-right tabular-nums text-zinc-700">
								{formatNumber(result.productCount)}
							</td>
							<td class="px-3 py-3 text-right tabular-nums font-medium text-zinc-950">
								{formatCurrency(result.totals.grossRevenue)}
							</td>
							<td class="px-3 py-3 text-right">
								<span
									class={`inline-flex min-w-28 justify-end rounded border px-2 py-1.5 tabular-nums font-semibold ${toneClass(result)}`}
								>
									{formatCurrency(result.totals.marginAmount)}
								</span>
							</td>
							<td class="px-3 py-3 text-right">
								<span
									class={`inline-flex min-w-20 justify-end rounded border px-2 py-1.5 tabular-nums font-semibold ${toneClass(result)}`}
								>
									{formatPercent(result.totals.marginPercent)}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-4 grid gap-2 md:hidden" aria-live="polite">
			{#each scenarioResults as result}
				<article class="border border-zinc-200 bg-white px-3 py-3 shadow-sm">
					<div class="flex items-start justify-between gap-3">
						<h3 class="min-w-0 text-sm font-semibold text-zinc-950">{result.scenario.name}</h3>
						<span
							class={`shrink-0 rounded border px-2 py-1 text-xs font-semibold ${toneClass(result)}`}
						>
							{formatPercent(result.totals.marginPercent)}
						</span>
					</div>
					<dl class="mt-3 grid grid-cols-2 gap-2 text-sm">
						<div>
							<dt class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Ordini</dt>
							<dd class="tabular-nums text-zinc-950">{formatNumber(result.orderCount)}</dd>
						</div>
						<div>
							<dt class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prodotti</dt>
							<dd class="tabular-nums text-zinc-950">{formatNumber(result.productCount)}</dd>
						</div>
						<div>
							<dt class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lordo</dt>
							<dd class="tabular-nums font-medium text-zinc-950">
								{formatCurrency(result.totals.grossRevenue)}
							</dd>
						</div>
						<div>
							<dt class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Margine</dt>
							<dd
								class={`inline-flex rounded border px-2 py-1 tabular-nums font-semibold ${toneClass(result)}`}
							>
								{formatCurrency(result.totals.marginAmount)}
							</dd>
						</div>
					</dl>
				</article>
			{/each}
		</div>
	{/if}
</section>
