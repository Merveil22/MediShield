<script lang="ts">
	import { onMount } from 'svelte';
	import { listerActivites } from '$lib/api/ressources';

	type Activite = {
		id: number;
		action: string;
		details: string | null;
		ip_utilisateur: string | null;
		date_heure: string;
		nom: string;
		prenom: string;
	};

	let activites: Activite[] = [];
	let chargement = true;

	onMount(async () => {
		activites = await listerActivites();
		chargement = false;
	});
</script>

<svelte:head><title>Journal d'activités — MediShield</title></svelte:head>

<div class="p-8">
	<p class="mb-5 text-sm text-slate-400">
		Historique des actions effectuées par les administrateurs. Traçabilité pour audit et
		conformité.
	</p>

	<div class="glass overflow-hidden rounded-2xl p-0">
		{#if chargement}
			<p class="p-8 text-center text-sm text-slate-500">Chargement…</p>
		{:else if activites.length === 0}
			<p class="p-8 text-center text-sm text-slate-500">Aucune activité enregistrée pour l'instant.</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead>
					<tr
						class="border-b border-sky-400/15 bg-slate-900/60 text-[11px] tracking-wider text-slate-500 uppercase"
					>
						<th class="px-4 py-3 font-bold">Date</th>
						<th class="px-4 py-3 font-bold">Administrateur</th>
						<th class="px-4 py-3 font-bold">Action</th>
						<th class="px-4 py-3 font-bold">Détails</th>
						<th class="px-4 py-3 font-bold">IP</th>
					</tr>
				</thead>
				<tbody>
					{#each activites as a (a.id)}
						<tr class="border-b border-slate-800/60 text-slate-300 hover:bg-sky-400/5">
							<td class="px-4 py-3 font-mono text-xs"
								>{new Date(a.date_heure).toLocaleString('fr-FR')}</td
							>
							<td class="px-4 py-3">{a.prenom} {a.nom}</td>
							<td class="px-4 py-3">{a.action}</td>
							<td class="px-4 py-3 text-slate-500">{a.details || '—'}</td>
							<td class="px-4 py-3 font-mono text-xs text-slate-500">{a.ip_utilisateur || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
