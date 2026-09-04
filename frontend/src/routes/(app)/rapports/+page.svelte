<script lang="ts">
	import { onMount } from 'svelte';
	import { FileText, Download, Loader2, Eye, EyeOff, Copy, Check, Lock } from 'lucide-svelte';
	import {
		listerRapports,
		genererRapport,
		urlTelechargementRapport,
		recupererProfil
	} from '$lib/api/ressources';

	type Rapport = {
		id: number;
		titre: string;
		type: string;
		periode_debut: string;
		periode_fin: string;
		genere_le: string;
		nb_alertes: number;
		nb_critiques: number;
		score_securite: number;
		mot_de_passe_pdf?: string;
	};

	let rapports: Rapport[] = [];
	let chargement = true;
	let generation = false;
	let erreur = '';
	let estSuperAdmin = false;

	let motsDePasseVisibles = new Set<number>();
	let motDePasseCopieId: number | null = null;

	const aujourdHui = new Date().toISOString().slice(0, 10);
	const ilYaUnMois = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);

	let type = 'personnalise';
	let periodeDebut = ilYaUnMois;
	let periodeFin = aujourdHui;

	async function charger() {
		chargement = true;
		rapports = await listerRapports();
		chargement = false;
	}

	async function generer() {
		generation = true;
		erreur = '';
		try {
			await genererRapport({ type, periodeDebut, periodeFin });
			await charger();
		} catch (e) {
			erreur = e instanceof Error ? e.message : 'Erreur lors de la génération.';
		} finally {
			generation = false;
		}
	}

	function basculerVisibilite(id: number) {
		if (motsDePasseVisibles.has(id)) {
			motsDePasseVisibles.delete(id);
		} else {
			motsDePasseVisibles.add(id);
		}
		motsDePasseVisibles = motsDePasseVisibles; 
	}

	async function copierMotDePasse(id: number, motDePasse: string) {
		await navigator.clipboard.writeText(motDePasse);
		motDePasseCopieId = id;
		setTimeout(() => {
			if (motDePasseCopieId === id) motDePasseCopieId = null;
		}, 1500);
	}

	onMount(async () => {
		const profil = await recupererProfil();
		estSuperAdmin = profil.role === 'super_admin';
		await charger();
	});
</script>

<svelte:head><title>Rapports — MediShield</title></svelte:head>

<div class="p-8">
	<div class="glass mb-5 flex flex-wrap items-end gap-4 rounded-2xl p-5">
		<div class="flex flex-col gap-1.5">
			<label for="type" class="text-xs font-semibold text-slate-500">Type de rapport</label>
			<select
				id="type"
				bind:value={type}
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			>
				<option value="quotidien">Quotidien</option>
				<option value="hebdomadaire">Hebdomadaire</option>
				<option value="mensuel">Mensuel</option>
				<option value="personnalise">Personnalisé</option>
			</select>
		</div>
		<div class="flex flex-col gap-1.5">
			<label for="debut" class="text-xs font-semibold text-slate-500">Début</label>
			<input
				id="debut"
				type="date"
				bind:value={periodeDebut}
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			/>
		</div>
		<div class="flex flex-col gap-1.5">
			<label for="fin" class="text-xs font-semibold text-slate-500">Fin</label>
			<input
				id="fin"
				type="date"
				bind:value={periodeFin}
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			/>
		</div>
		<button
			on:click={generer}
			disabled={generation}
			class="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
		>
			{#if generation}
				<Loader2 size={16} class="animate-spin" /> Génération…
			{:else}
				<FileText size={16} /> Générer le rapport PDF
			{/if}
		</button>
	</div>
	{#if erreur}
		<p class="mb-4 text-sm text-rose-400">{erreur}</p>
	{/if}

	<div class="mb-4 flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-xs text-sky-300">
		<Lock size={14} />
		Chaque PDF généré est protégé par un mot de passe unique — le fichier le redemandera à
		l'ouverture, quel que soit le lecteur utilisé.
		{#if !estSuperAdmin}
			<span class="text-slate-500">(mot de passe visible par le super administrateur uniquement)</span>
		{/if}
	</div>

	<!-- Historique -->
	<div class="glass overflow-hidden rounded-2xl p-0">
		<div class="border-b border-slate-800 p-5">
			<p class="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
				Historique des rapports
			</p>
		</div>
		{#if chargement}
			<p class="p-8 text-center text-sm text-slate-500">Chargement…</p>
		{:else if rapports.length === 0}
			<p class="p-8 text-center text-sm text-slate-500">Aucun rapport généré pour l'instant.</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead>
					<tr
						class="border-b border-sky-400/15 bg-slate-900/60 text-[11px] tracking-wider text-slate-500 uppercase"
					>
						<th class="px-4 py-3 font-bold">Titre</th>
						<th class="px-4 py-3 font-bold">Généré le</th>
						<th class="px-4 py-3 font-bold">Alertes</th>
						<th class="px-4 py-3 font-bold">Score</th>
						{#if estSuperAdmin}
							<th class="px-4 py-3 font-bold">Mot de passe PDF</th>
						{/if}
						<th class="px-4 py-3 font-bold">Télécharger</th>
					</tr>
				</thead>
				<tbody>
					{#each rapports as r (r.id)}
						<tr class="border-b border-slate-800/60 text-slate-300 hover:bg-sky-400/5">
							<td class="px-4 py-3">{r.titre}</td>
							<td class="px-4 py-3 font-mono text-xs"
								>{new Date(r.genere_le).toLocaleString('fr-FR')}</td
							>
							<td class="px-4 py-3">{r.nb_alertes} ({r.nb_critiques} critiques)</td>
							<td class="px-4 py-3 font-mono">{r.score_securite}/100</td>
							{#if estSuperAdmin}
								<td class="px-4 py-3">
									{#if r.mot_de_passe_pdf}
										<div class="flex items-center gap-2">
											<span class="font-mono text-xs text-amber-300">
												{motsDePasseVisibles.has(r.id) ? r.mot_de_passe_pdf : '••••••••••'}
											</span>
											<button
												on:click={() => basculerVisibilite(r.id)}
												title={motsDePasseVisibles.has(r.id) ? 'Masquer' : 'Afficher'}
												class="text-slate-500 hover:text-sky-400"
											>
												{#if motsDePasseVisibles.has(r.id)}
													<EyeOff size={14} />
												{:else}
													<Eye size={14} />
												{/if}
											</button>
											<button
												on:click={() => copierMotDePasse(r.id, r.mot_de_passe_pdf ?? '')}
												title="Copier"
												class="text-slate-500 hover:text-sky-400"
											>
												{#if motDePasseCopieId === r.id}
													<Check size={14} class="text-emerald-400" />
												{:else}
													<Copy size={14} />
												{/if}
											</button>
										</div>
									{:else}
										<span class="text-xs text-slate-600">—</span>
									{/if}
								</td>
							{/if}
							<td class="px-4 py-3">
								<a
									href={urlTelechargementRapport(r.id)}
									class="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
								>
									<Download size={14} /> PDF
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
