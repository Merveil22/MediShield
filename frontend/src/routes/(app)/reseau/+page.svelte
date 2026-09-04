<script lang="ts">
	import { onMount } from 'svelte';
	import { Server, Router, Plus } from 'lucide-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import NetworkTopology from '$lib/components/NetworkTopology.svelte';
	import { listerEquipements, ajouterEquipement } from '$lib/api/ressources';

	type Equipement = {
		id: number;
		nom: string;
		ip: string;
		type: string;
		vlan: string | null;
		statut: 'normal' | 'attention' | 'hors_service';
	};

	let equipements: Equipement[] = [];
	let chargement = true;
	let afficherFormulaire = false;

	let nouveauNom = '';
	let nouvelleIp = '';
	let nouveauType = 'poste';
	let nouveauVlan = '';

	const couleurStatut: Record<string, 'green' | 'yellow' | 'rose'> = {
		normal: 'green',
		attention: 'yellow',
		hors_service: 'rose'
	};

	async function charger() {
		chargement = true;
		equipements = await listerEquipements();
		chargement = false;
	}

	async function ajouter() {
		if (!nouveauNom || !nouvelleIp) return;
		await ajouterEquipement({ nom: nouveauNom, ip: nouvelleIp, type: nouveauType, vlan: nouveauVlan });
		nouveauNom = '';
		nouvelleIp = '';
		nouveauVlan = '';
		afficherFormulaire = false;
		charger();
	}

	onMount(charger);
</script>

<svelte:head><title>Réseau — MediShield</title></svelte:head>

<div class="p-8">
	<div class="mb-5">
		{#if chargement}
			<div class="glass rounded-2xl p-8 text-center text-sm text-slate-500">
				Chargement de la topologie…
			</div>
		{:else}
			<NetworkTopology {equipements} />
		{/if}
	</div>

	<div class="mb-5 flex items-center justify-between">
		<p class="text-sm text-slate-400">
			Liste détaillée des équipements surveillés — le trafic affiché ci-dessus est simulé, en
			attendant la connexion réelle à GNS3/Suricata.
		</p>
		<button
			on:click={() => (afficherFormulaire = !afficherFormulaire)}
			class="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
		>
			<Plus size={16} /> Ajouter un équipement
		</button>
	</div>

	{#if afficherFormulaire}
		<div class="glass mb-5 flex flex-wrap items-end gap-4 rounded-2xl p-5">
			<div class="flex flex-col gap-1.5">
				<label for="nom" class="text-xs font-semibold text-slate-500">Nom</label>
				<input
					id="nom"
					bind:value={nouveauNom}
					class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="ip" class="text-xs font-semibold text-slate-500">Adresse IP</label>
				<input
					id="ip"
					bind:value={nouvelleIp}
					placeholder="192.168.10.10"
					class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
				/>
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="type" class="text-xs font-semibold text-slate-500">Type</label>
				<select
					id="type"
					bind:value={nouveauType}
					class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
				>
					<option value="serveur">Serveur</option>
					<option value="routeur">Routeur</option>
					<option value="switch">Switch</option>
					<option value="pare_feu">Pare-feu</option>
					<option value="poste">Poste utilisateur</option>
				</select>
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="vlan" class="text-xs font-semibold text-slate-500">VLAN (optionnel)</label>
				<input
					id="vlan"
					bind:value={nouveauVlan}
					placeholder="VLAN 20 - Urgences"
					class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
				/>
			</div>
			<button
				on:click={ajouter}
				class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
			>
				Enregistrer
			</button>
		</div>
	{/if}

	<div class="glass overflow-hidden rounded-2xl p-0">
		{#if chargement}
			<p class="p-8 text-center text-sm text-slate-500">Chargement…</p>
		{:else if equipements.length === 0}
			<p class="p-8 text-center text-sm text-slate-500">
				Aucun équipement enregistré pour l'instant.
			</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead>
					<tr
						class="border-b border-sky-400/15 bg-slate-900/60 text-[11px] tracking-wider text-slate-500 uppercase"
					>
						<th class="px-4 py-3 font-bold">Nom</th>
						<th class="px-4 py-3 font-bold">IP</th>
						<th class="px-4 py-3 font-bold">Type</th>
						<th class="px-4 py-3 font-bold">VLAN</th>
						<th class="px-4 py-3 font-bold">Statut</th>
					</tr>
				</thead>
				<tbody>
					{#each equipements as eq (eq.id)}
						<tr class="border-b border-slate-800/60 text-slate-300 hover:bg-sky-400/5">
							<td class="flex items-center gap-2 px-4 py-3">
								{#if eq.type === 'routeur' || eq.type === 'switch'}
									<Router size={14} class="text-slate-500" />
								{:else}
									<Server size={14} class="text-slate-500" />
								{/if}
								{eq.nom}
							</td>
							<td class="px-4 py-3 font-mono">{eq.ip}</td>
							<td class="px-4 py-3">{eq.type}</td>
							<td class="px-4 py-3 text-slate-500">{eq.vlan || '—'}</td>
							<td class="px-4 py-3"
								><Badge color={couleurStatut[eq.statut]}>{eq.statut}</Badge></td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
