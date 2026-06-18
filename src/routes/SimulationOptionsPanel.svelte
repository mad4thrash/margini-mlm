<script lang="ts">
	import type { ProductTableProduct } from '$lib/product-table';
	import {
		createDefaultScenarioSelection,
		createSimulationScenarioResults,
		toggleScenarioSelection,
		toSimulationProducts,
		type SimulationScenarioResult
	} from '$lib/simulation-panel';
	import { PROMOTION_SCENARIOS, type PromotionScenarioId } from '$lib/simulation';

	type Props = {
		products: ProductTableProduct[];
		payoutPercent: number;
	};

	let { products, payoutPercent }: Props = $props();
	let selectedScenarioIds = $state<PromotionScenarioId[]>(createDefaultScenarioSelection());
	let simulationRun = $state(1);
	let simulationProducts = $derived(toSimulationProducts(products));
	let selectedScenarios = $derived(
		PROMOTION_SCENARIOS.filter((scenario) => selectedScenarioIds.includes(scenario.id))
	);
	let scenarioResults = $derived(
		createSimulationScenarioResults({
			products: simulationProducts,
			scenarios: selectedScenarios,
			payoutPercent,
			simulationRun
		})
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
		simulationRun += 1;
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
				Lancio: <span class="font-semibold text-zinc-950">#{simulationRun}</span>
			</p>
		</div>

		<button
			type="button"
			class="h-10 rounded border border-zinc-950 bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 lg:mt-6"
			disabled={simulationProducts.length === 0}
			onclick={rerunSimulation}
		>
			Rilancia simulazione
		</button>
	</div>

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
	{:else if scenarioResults.length === 0}
		<p class="mt-4 border border-zinc-200 bg-zinc-50 px-3 py-4 text-center text-sm text-zinc-500">
			Nessuno scenario selezionato.
		</p>
	{:else}
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
