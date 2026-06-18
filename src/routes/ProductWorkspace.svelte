<script lang="ts">
	import type { ProductTableProduct } from '$lib/product-table';

	import ProductTable from './ProductTable.svelte';
	import SimulationOptionsPanel from './SimulationOptionsPanel.svelte';
	import SettingsPanel from './SettingsPanel.svelte';

	type Props = {
		productsQuery: Promise<ProductTableProduct[]>;
		payoutPercent: number;
	};

	let { productsQuery, payoutPercent: initialPayoutPercent }: Props = $props();
	let payoutPercent = $state(0);
	let lastInitialPayoutPercent = $state<number | null>(null);

	$effect(() => {
		if (initialPayoutPercent !== lastInitialPayoutPercent) {
			payoutPercent = initialPayoutPercent;
			lastInitialPayoutPercent = initialPayoutPercent;
		}
	});

	function handlePayoutSaved(savedPayoutPercent: number) {
		payoutPercent = savedPayoutPercent;
	}
</script>

<div class="flex flex-col gap-4">
	<SettingsPanel payoutPercent={payoutPercent} onPayoutSaved={handlePayoutSaved} />
	{#await productsQuery}
		<section class="flex flex-col gap-4">
			<div class="flex flex-col gap-3 border-b border-zinc-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
				<div class="min-w-0">
					<p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prodotti</p>
					<h1 class="text-2xl font-semibold text-zinc-950">Margini prodotto</h1>
				</div>
			</div>
			<p class="border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-600 shadow-sm">
				Caricamento prodotti...
			</p>
		</section>
	{:then products}
		<SimulationOptionsPanel {products} {payoutPercent} />
		<ProductTable {products} {payoutPercent} />
	{:catch}
		<section class="flex flex-col gap-4">
			<div class="flex flex-col gap-3 border-b border-zinc-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
				<div class="min-w-0">
					<p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prodotti</p>
					<h1 class="text-2xl font-semibold text-zinc-950">Margini prodotto</h1>
				</div>
			</div>
			<p class="border border-red-200 bg-red-50 px-4 py-6 text-center text-sm font-medium text-red-700 shadow-sm">
				Impossibile caricare i prodotti. Riprova.
			</p>
		</section>
	{/await}
</div>
