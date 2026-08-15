<script lang="ts">
	import { onMount } from 'svelte';
	import { Eye, Ban, Check } from 'lucide-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { listerAlertes, majAlerte } from '$lib/api/ressources';

	type Alerte = {
		id: number;
		date_heure: string;
		ip_source: string;
		ip_cible: string | null;
		type_attaque: string;
		gravite: 'critique' | 'elevee' | 'moyenne' | 'faible';
		statut: 'nouvelle' | 'en_cours' | 'traitee' | 'ignoree';
		message: string;
	};

	let alertes: Alerte[] = [];
	let chargement = true;
	let erreur = '';

	let filtreGravite = '';
	let filtreStatut = '';
	let recherche = '';

	const couleurGravite: Record<string, 'green' | 'yellow' | 'orange' | 'rose'> = {
		faible: 'green',
		moyenne: 'yellow',
		elevee: 'orange',
		critique: 'rose'
	};

	async function chargerAlertes() {
		chargement = true;
		erreur = '';
		try {
			const filtres: Record<string, string> = {};
			if (filtreGravite) filtres.gravite = filtreGravite;
			if (filtreStatut) filtres.statut = filtreStatut;
			if (recherche) filtres.recherche = recherche;
			alertes = await listerAlertes(filtres);
		} catch (e) {
			erreur = e instanceof Error ? e.message : 'Erreur de chargement.';
		} finally {
			chargement = false;
		}
	}

	async function traiter(id: number) {
		await majAlerte(id, 'traitee');
		chargerAlertes();
	}

	async function ignorer(id: number) {
		await majAlerte(id, 'ignoree');
		chargerAlertes();
	}

	onMount(chargerAlertes);
</script>

<svelte:head><title>Alertes - MediShield</title></svelte:head>

<div class="p-8">
	<!-- Filtres -->
	<div class="glass mb-5 flex flex-wrap items-end gap-4 rounded-2xl p-5">
		<div class="flex flex-col gap-1.5">
			<label for="f-gravite" class="text-xs font-semibold text-slate-500">Gravité</label>
			<select
				id="f-gravite"
				bind:value={filtreGravite}
				on:change={chargerAlertes}
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			>
				<option value="">Toutes</option>
				<option value="critique">Critique</option>
				<option value="elevee">Élevée</option>
				<option value="moyenne">Moyenne</option>
				<option value="faible">Faible</option>
			</select>
		</div>
		<div class="flex flex-col gap-1.5">
			<label for="f-statut" class="text-xs font-semibold text-slate-500">Statut</label>
			<select
				id="f-statut"
				bind:value={filtreStatut}
				on:change={chargerAlertes}
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			>
				<option value="">Tous</option>
				<option value="nouvelle">Nouvelle</option>
				<option value="en_cours">En cours</option>
				<option value="traitee">Traitée</option>
				<option value="ignoree">Ignorée</option>
			</select>
		</div>
		<div class="flex flex-1 flex-col gap-1.5">
			<label for="f-recherche" class="text-xs font-semibold text-slate-500">Recherche</label>
			<input
				id="f-recherche"
				type="text"
				bind:value={recherche}
				on:keydown={(e) => e.key === 'Enter' && chargerAlertes()}
				placeholder="IP, type d'attaque, message…"
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60"
			/>
		</div>
		<button
			on:click={chargerAlertes}
			class="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
		>
			Filtrer
		</button>
	</div>

	<!-- Table -->
	<div class="glass overflow-hidden rounded-2xl p-0">
		{#if chargement}
			<p class="p-8 text-center text-sm text-slate-500">Chargement…</p>
		{:else if erreur}
			<p class="p-8 text-center text-sm text-rose-400">{erreur}</p>
		{:else if alertes.length === 0}
			<p class="p-8 text-center text-sm text-slate-500">Aucune alerte trouvée.</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead>
					<tr
						class="border-b border-sky-400/15 bg-slate-900/60 text-[11px] tracking-wider text-slate-500 uppercase"
					>
						<th class="px-4 py-3 font-bold">Date</th>
						<th class="px-4 py-3 font-bold">Type</th>
						<th class="px-4 py-3 font-bold">IP Source</th>
						<th class="px-4 py-3 font-bold">Gravité</th>
						<th class="px-4 py-3 font-bold">Statut</th>
						<th class="px-4 py-3 font-bold">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each alertes as a (a.id)}
						<tr class="border-b border-slate-800/60 text-slate-300 hover:bg-sky-400/5">
							<td class="px-4 py-3 font-mono text-xs"
								>{new Date(a.date_heure).toLocaleString('fr-FR')}</td
							>
							<td class="px-4 py-3">{a.type_attaque}</td>
							<td class="px-4 py-3 font-mono">{a.ip_source}</td>
							<td class="px-4 py-3"
								><Badge color={couleurGravite[a.gravite]}>{a.gravite}</Badge></td
							>
							<td class="px-4 py-3 text-xs text-slate-400">{a.statut}</td>
							<td class="px-4 py-3">
								<div class="flex gap-2">
									<button
										on:click={() => traiter(a.id)}
										title="Marquer comme traitée"
										class="rounded-md p-1.5 text-emerald-400 hover:bg-emerald-400/10"
									>
										<Check size={16} />
									</button>
									<button
										on:click={() => ignorer(a.id)}
										title="Ignorer"
										class="rounded-md p-1.5 text-slate-500 hover:bg-slate-700/40"
									>
										<Eye size={16} />
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
