<script lang="ts">
	import ProductTable from './ProductTable.svelte';
	import { getProducts, getSettings } from './data.remote';

	const productsQuery = getProducts();
	const settingsQuery = getSettings();
</script>

<svelte:head>
	<title>Margini prodotto</title>
	<meta
		name="description"
		content="Tabella operativa per calcolare e salvare margini prodotto."
	/>
</svelte:head>

<main class="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 sm:px-6 lg:px-8">
	<div class="mx-auto flex max-w-7xl flex-col gap-5">
		{#await Promise.all([productsQuery, settingsQuery])}
			<p class="border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600 shadow-sm">
				Caricamento prodotti...
			</p>
		{:then [products, settings]}
			<ProductTable products={products} payoutPercent={settings.payoutPercent} />
		{:catch}
			<p class="border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
				Impossibile caricare i prodotti. Riprova.
			</p>
		{/await}
	</div>
</main>
