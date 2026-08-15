<script lang="ts">
	import { onMount } from 'svelte';
	import { Save, Loader2, CheckCircle2 } from 'lucide-svelte';
	import { listerParametres, majParametre } from '$lib/api/ressources';

	type Parametre = { id: number; cle: string; valeur: string; description: string };

	let parametres: Parametre[] = [];
	let chargement = true;
	let enregistrementEnCours: string | null = null;
	let succesRecent: string | null = null;

	async function charger() {
		chargement = true;
		parametres = await listerParametres();
		chargement = false;
	}

	async function enregistrer(p: Parametre) {
		enregistrementEnCours = p.cle;
		try {
			await majParametre(p.cle, p.valeur);
			succesRecent = p.cle;
			setTimeout(() => {
				if (succesRecent === p.cle) succesRecent = null;
			}, 2000);
		} finally {
			enregistrementEnCours = null;
		}
	}

	onMount(charger);
</script>

<svelte:head><title>Paramètres - MediShield</title></svelte:head>

<div class="p-8">
	<div class="glass max-w-2xl rounded-2xl p-6">
		<p class="mb-1 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
			Configuration générale
		</p>
		<p class="mb-5 text-sm text-slate-500">
			Ces valeurs sont stockées dans la table <code class="text-xs">parametres</code> et modifiables
			directement ici.
		</p>

		{#if chargement}
			<p class="text-sm text-slate-500">Chargement…</p>
		{:else}
			<div class="flex flex-col gap-4">
				{#each parametres as p (p.id)}
					<div class="flex items-end gap-3 border-b border-slate-800 pb-4 last:border-0">
						<div class="flex-1">
							<label for="p-{p.id}" class="mb-1.5 block text-xs font-semibold text-slate-500">
								{p.description || p.cle}
							</label>
							<input
								id="p-{p.id}"
								bind:value={p.valeur}
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
							/>
						</div>
						<button
							on:click={() => enregistrer(p)}
							disabled={enregistrementEnCours === p.cle}
							class="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
						>
							{#if enregistrementEnCours === p.cle}
								<Loader2 size={14} class="animate-spin" />
							{:else if succesRecent === p.cle}
								<CheckCircle2 size={14} />
							{:else}
								<Save size={14} />
							{/if}
							Enregistrer
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<div class="glass mt-5 max-w-2xl rounded-2xl p-6">
		<p class="mb-4 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
			Configuration SMTP / Suricata
		</p>
		<p class="text-sm text-slate-500">
			Ces paramètres restent gérés côté serveur, dans le fichier
			<code class="text-xs">backend/.env</code> Une interface web pour les modifier en direct
			n'est pas recommandée pour la sécurité (elle exposerait des identifiants sensibles).
		</p>
	</div>
</div>
