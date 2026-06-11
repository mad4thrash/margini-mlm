<script lang="ts">
	import type { ProductTableProduct } from '$lib/product-table';

	import ProductTable from './ProductTable.svelte';
	import SettingsPanel from './SettingsPanel.svelte';

	type Props = {
		products: ProductTableProduct[];
		payoutPercent: number;
	};

	let { products, payoutPercent: initialPayoutPercent }: Props = $props();
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
	<ProductTable {products} {payoutPercent} />
</div>
