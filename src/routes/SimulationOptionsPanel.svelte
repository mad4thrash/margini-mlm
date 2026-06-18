<script lang="ts">
	import type { ProductTableProduct } from '$lib/product-table';
	import { createDefaultScenarioSelection, toggleScenarioSelection, toSimulationProducts } from '$lib/simulation-panel';
	import {
		generateRandomOrders,
		PROMOTION_SCENARIOS,
		type PromotionScenarioId
	} from '$lib/simulation';

	type Props = {
		products: ProductTableProduct[];
	};

	let { products }: Props = $props();
	let selectedScenarioIds = $state<PromotionScenarioId[]>(createDefaultScenarioSelection());
	let simulationRun = $state(1);
	let simulationProducts = $derived(toSimulationProducts(products));
	let selectedScenarios = $derived(
		PROMOTION_SCENARIOS.filter((scenario) => selectedScenarioIds.includes(scenario.id))
	);
	let generatedOrderCount = $derived.by(() => {
		if (simulationProducts.length === 0) {
			return 0;
		}

		return selectedScenarios.reduce(
			(total, scenario) =>
				total +
				generateRandomOrders({
					products: simulationProducts,
					mode: scenario.orderMode,
					seed: `${simulationRun}:${scenario.orderMode}`
				}).length,
			0
		);
	});

	const numberFormatter = new Intl.NumberFormat('it-IT');

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
	{:else}
		<p class="mt-4 text-sm text-zinc-600" aria-live="polite">
			Ordini random pronti: <span class="font-semibold text-zinc-950"
				>{formatNumber(generatedOrderCount)}</span
			>
		</p>
	{/if}
</section>
