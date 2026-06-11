<script lang="ts">
	import { createEditablePayoutSettings, isValidPayoutPercent } from '$lib/settings';

	import { updateSettings } from './data.remote';

	type Props = {
		payoutPercent: number;
		onPayoutSaved: (payoutPercent: number) => void;
	};

	let { payoutPercent, onPayoutSaved }: Props = $props();
	let settings = $state(createEditablePayoutSettings({ payoutPercent: 0 }));
	let lastPayoutPercent = $state<number | null>(null);
	let isSaving = $state(false);
	let savedMessage = $state('');
	let canSave = $derived(isValidPayoutPercent(settings.payoutPercent) && !isSaving);
	let currentPayoutPercent = $derived(lastPayoutPercent ?? settings.payoutPercent);

	const percentFormatter = new Intl.NumberFormat('it-IT', {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1
	});

	$effect(() => {
		if (!isSaving && payoutPercent !== lastPayoutPercent) {
			settings = createEditablePayoutSettings({ payoutPercent });
			lastPayoutPercent = payoutPercent;
		}
	});

	function clearStatus() {
		savedMessage = '';
		settings.error = isValidPayoutPercent(settings.payoutPercent)
			? ''
			: 'Inserisci una percentuale maggiore o uguale a 0.';
	}

	async function saveSettings() {
		clearStatus();

		if (!isValidPayoutPercent(settings.payoutPercent)) {
			return;
		}

		isSaving = true;

		try {
			const saved = await updateSettings({ payoutPercent: settings.payoutPercent });
			settings.payoutPercent = saved.payoutPercent;
			lastPayoutPercent = saved.payoutPercent;
			onPayoutSaved(saved.payoutPercent);
			savedMessage = 'Impostazioni salvate.';
		} catch {
			settings.error = 'Salvataggio non riuscito. Riprova.';
		} finally {
			isSaving = false;
		}
	}

	function formatPercent(value: number) {
		return `${percentFormatter.format(value)}%`;
	}
</script>

<section
	aria-labelledby="settings-title"
	class="border border-zinc-200 bg-white px-4 py-4 shadow-sm"
>
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="max-w-2xl">
			<p class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Impostazioni</p>
			<h2 id="settings-title" class="text-lg font-semibold text-zinc-950">
				Payout incaricate alla vendita
			</h2>
			<p class="mt-1 text-sm text-zinc-600">
				Percentuale corrente usata nei margini: <span class="font-semibold text-zinc-950"
					>{formatPercent(currentPayoutPercent)}</span
				>
			</p>
		</div>

		<div class="flex flex-col gap-2 sm:flex-row sm:items-start">
			<label class="flex min-w-52 flex-col gap-1 text-sm font-medium text-zinc-700">
				<span>Percentuale payout</span>
				<input
					aria-label="Percentuale payout"
					aria-describedby="payout-status"
					class="rounded border border-zinc-300 px-3 py-2 text-right text-sm text-zinc-950 focus:border-zinc-950 focus:outline-none focus:ring-1 focus:ring-zinc-950"
					type="number"
					min="0"
					step="0.1"
					bind:value={settings.payoutPercent}
					oninput={clearStatus}
				/>
			</label>
			<button
				type="button"
				class="mt-6 rounded border border-zinc-950 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-6"
				disabled={!canSave}
				onclick={saveSettings}
			>
				{isSaving ? 'Salvo' : 'Salva impostazioni'}
			</button>
		</div>
	</div>

	<div id="payout-status" class="mt-3 min-h-5 text-sm" aria-live="polite">
		{#if settings.error}
			<p class="font-medium text-red-700">{settings.error}</p>
		{:else if savedMessage}
			<p class="font-medium text-emerald-700">{savedMessage}</p>
		{/if}
	</div>
</section>
