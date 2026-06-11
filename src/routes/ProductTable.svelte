<script lang="ts">
	import {
		createEditableProductRow,
		getMarginTone,
		type EditableProductRow,
		type ProductTableProduct
	} from '$lib/product-table';

	import { createProduct, deleteProduct, updateProduct } from './data.remote';

	type Props = {
		products: ProductTableProduct[];
		payoutPercent: number;
	};

	let { products, payoutPercent }: Props = $props();
	let rows = $state<EditableProductRow[]>([]);
	let productsKey = $derived(
		products
			.map(
				(product) =>
					`${product.id}:${product.code}:${product.description}:${product.category}:${product.listPrice}:${product.supplierPrice}:${product.vatRate}:${product.discountPercent}`
			)
			.join('|')
	);

	const currencyFormatter = new Intl.NumberFormat('it-IT', {
		style: 'currency',
		currency: 'EUR'
	});
	const percentFormatter = new Intl.NumberFormat('it-IT', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	$effect(() => {
		productsKey;
		rows = products.map((product) => createEditableProductRow(product));
	});

	function addProduct() {
		rows = [createEditableProductRow(), ...rows];
	}

	function productPayload(row: EditableProductRow) {
		return {
			code: row.code,
			description: row.description,
			category: row.category,
			listPrice: row.listPrice,
			supplierPrice: row.supplierPrice,
			vatRate: row.vatRate,
			discountPercent: row.discountPercent
		};
	}

	async function saveRow(row: EditableProductRow) {
		row.error = '';
		row.isSaving = true;

		try {
			if (row.isNew) {
				await createProduct(productPayload(row));
			} else if (row.id !== undefined) {
				await updateProduct({ id: row.id, ...productPayload(row) });
			}
		} catch {
			row.error = 'Controlla i campi obbligatori e riprova.';
		} finally {
			row.isSaving = false;
		}
	}

	async function removeRow(row: EditableProductRow) {
		if (row.isNew) {
			rows = rows.filter((candidate) => candidate.clientId !== row.clientId);
			return;
		}

		if (!row.pendingDelete) {
			row.pendingDelete = true;
			return;
		}

		if (row.id === undefined) {
			return;
		}

		row.error = '';
		row.isSaving = true;

		try {
			await deleteProduct({ id: row.id });
		} catch {
			row.error = 'Eliminazione non riuscita. Riprova.';
			row.pendingDelete = false;
		} finally {
			row.isSaving = false;
		}
	}

	function cancelDelete(row: EditableProductRow) {
		row.pendingDelete = false;
	}

	function formatCurrency(value: number) {
		return currencyFormatter.format(value);
	}

	function formatPercent(value: number) {
		return `${percentFormatter.format(value)}%`;
	}

	function toneClass(row: EditableProductRow) {
		const tone = getMarginTone(row.margin(payoutPercent).marginPercent);

		if (tone === 'negative') {
			return 'border-red-200 bg-red-50 text-red-700';
		}

		if (tone === 'low') {
			return 'border-amber-200 bg-amber-50 text-amber-800';
		}

		return 'border-emerald-200 bg-emerald-50 text-emerald-700';
	}
</script>

<section class="flex flex-col gap-4">
	<div class="flex flex-col gap-3 border-b border-zinc-200 pb-4 md:flex-row md:items-end md:justify-between">
		<div>
			<p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Prodotti</p>
			<h1 class="text-2xl font-semibold text-zinc-950">Margini prodotto</h1>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<p class="rounded border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600">
				Payout: <span class="font-semibold text-zinc-950">{formatPercent(payoutPercent)}</span>
			</p>
			<button
				type="button"
				class="inline-flex items-center gap-2 rounded bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2"
				onclick={addProduct}
			>
				<span aria-hidden="true">+</span>
				<span>Aggiungi prodotto</span>
			</button>
		</div>
	</div>

	<div class="overflow-x-auto border border-zinc-200 bg-white shadow-sm">
		<table class="min-w-[1120px] table-fixed border-collapse text-left text-sm">
			<thead class="bg-zinc-100 text-xs uppercase tracking-wide text-zinc-600">
				<tr>
					<th class="w-28 px-3 py-3 font-semibold">Codice</th>
					<th class="w-56 px-3 py-3 font-semibold">Descrizione</th>
					<th class="w-40 px-3 py-3 font-semibold">Categoria</th>
					<th class="w-32 px-3 py-3 font-semibold">Listino</th>
					<th class="w-32 px-3 py-3 font-semibold">Fornitore</th>
					<th class="w-24 px-3 py-3 font-semibold">IVA %</th>
					<th class="w-28 px-3 py-3 font-semibold">Sconto %</th>
					<th class="w-36 px-3 py-3 font-semibold">Margine</th>
					<th class="w-32 px-3 py-3 font-semibold">Margine %</th>
					<th class="w-48 px-3 py-3 font-semibold">Azioni</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-zinc-200">
				{#if rows.length === 0}
					<tr>
						<td colspan="10" class="px-3 py-8 text-center text-sm text-zinc-500">
							Nessun prodotto. Aggiungi una riga per iniziare.
						</td>
					</tr>
				{/if}

				{#each rows as row (row.clientId)}
					{@const margin = row.margin(payoutPercent)}
					<tr class="align-top transition hover:bg-zinc-50">
						<td class="px-3 py-3">
							<input
								aria-label="Codice prodotto"
								class="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
								bind:value={row.code}
							/>
						</td>
						<td class="px-3 py-3">
							<input
								aria-label="Descrizione prodotto"
								class="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
								bind:value={row.description}
							/>
						</td>
						<td class="px-3 py-3">
							<input
								aria-label="Categoria prodotto"
								class="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
								bind:value={row.category}
							/>
						</td>
						<td class="px-3 py-3">
							<input
								aria-label="Prezzo di listino"
								class="w-full rounded border border-zinc-300 px-2 py-1.5 text-right text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
								type="number"
								min="0"
								step="0.01"
								bind:value={row.listPrice}
							/>
						</td>
						<td class="px-3 py-3">
							<input
								aria-label="Prezzo fornitore"
								class="w-full rounded border border-zinc-300 px-2 py-1.5 text-right text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
								type="number"
								min="0"
								step="0.01"
								bind:value={row.supplierPrice}
							/>
						</td>
						<td class="px-3 py-3">
							<input
								aria-label="Aliquota IVA"
								class="w-full rounded border border-zinc-300 px-2 py-1.5 text-right text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
								type="number"
								min="0"
								step="0.1"
								bind:value={row.vatRate}
							/>
						</td>
						<td class="px-3 py-3">
							<input
								aria-label="Percentuale sconto"
								class="w-full rounded border border-zinc-300 px-2 py-1.5 text-right text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
								type="number"
								min="0"
								step="0.1"
								bind:value={row.discountPercent}
							/>
						</td>
						<td class="px-3 py-3">
							<span
								class={`inline-flex w-full justify-end rounded border px-2 py-1.5 font-semibold ${toneClass(row)}`}
							>
								{formatCurrency(margin.marginAmount)}
							</span>
						</td>
						<td class="px-3 py-3">
							<span
								class={`inline-flex w-full justify-end rounded border px-2 py-1.5 font-semibold ${toneClass(row)}`}
							>
								{formatPercent(margin.marginPercent)}
							</span>
						</td>
						<td class="px-3 py-3">
							<div class="flex flex-col gap-2">
								<div class="flex gap-2">
									<button
										type="button"
										class="rounded border border-zinc-950 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={row.isSaving}
										onclick={() => saveRow(row)}
									>
										{row.isSaving ? 'Salvo' : 'Salva'}
									</button>
									<button
										type="button"
										class="rounded border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
										disabled={row.isSaving}
										onclick={() => removeRow(row)}
									>
										{row.pendingDelete ? 'Conferma' : 'Elimina'}
									</button>
									{#if row.pendingDelete}
										<button
											type="button"
											class="rounded border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
											onclick={() => cancelDelete(row)}
										>
											Annulla
										</button>
									{/if}
								</div>
								{#if row.error}
									<p class="text-xs font-medium text-red-700">{row.error}</p>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>
