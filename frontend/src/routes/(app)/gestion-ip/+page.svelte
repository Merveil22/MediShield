<script lang="ts">
	import { onMount } from 'svelte';
	import { Ban, Unlock } from 'lucide-svelte';
	import { listerIpBloquees, bloquerIp, debloquerIp } from '$lib/api/ressources';

	type BlocageIp = {
		id: number;
		ip: string;
		raison: string;
		duree: 'permanent' | 'temporaire';
		bloque_le: string;
		debloque_le: string | null;
		bloque_par_nom: string | null;
	};

	let blocages: BlocageIp[] = [];
	let chargement = true;
	let erreur = '';

	let nouvelleIp = '';
	let raison = '';

	async function charger() {
		chargement = true;
		blocages = await listerIpBloquees();
		chargement = false;
	}

	async function bloquer() {
		erreur = '';
		try {
			await bloquerIp({ ip: nouvelleIp, raison });
			nouvelleIp = '';
			raison = '';
			charger();
		} catch (e) {
			erreur = e instanceof Error ? e.message : 'Erreur lors du blocage.';
		}
	}

	async function debloquer(id: number) {
		await debloquerIp(id);
		charger();
	}

	onMount(charger);
</script>

<svelte:head><title>Gestion des IP - MediShield</title></svelte:head>

<div class="p-8">
	<!-- Formulaire de blocage -->
	<div class="glass mb-5 flex flex-wrap items-end gap-4 rounded-2xl p-5">
		<div class="flex flex-col gap-1.5">
			<label for="ip" class="text-xs font-semibold text-slate-500">Adresse IP à bloquer</label>
			<input
				id="ip"
				bind:value={nouvelleIp}
				placeholder="192.168.1.45"
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			/>
		</div>
		<div class="flex flex-1 flex-col gap-1.5">
			<label for="raison" class="text-xs font-semibold text-slate-500">Raison</label>
			<input
				id="raison"
				bind:value={raison}
				placeholder="Tentative de brute-force SSH"
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			/>
		</div>
		<button
			on:click={bloquer}
			class="flex items-center gap-2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400"
		>
			<Ban size={16} /> Bloquer
		</button>
	</div>
	{#if erreur}
		<p class="mb-4 text-sm text-rose-400">{erreur}</p>
	{/if}
	<p class="mb-5 text-xs text-slate-500">
		Note : pour l'instant, le blocage est enregistré en base uniquement. La vraie commande
		iptables sera exécutée une fois la connexion réseau réelle branchée.
	</p>

	<div class="glass overflow-hidden rounded-2xl p-0">
		{#if chargement}
			<p class="p-8 text-center text-sm text-slate-500">Chargement…</p>
		{:else if blocages.length === 0}
			<p class="p-8 text-center text-sm text-slate-500">Aucune IP bloquée pour l'instant.</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead>
					<tr
						class="border-b border-sky-400/15 bg-slate-900/60 text-[11px] tracking-wider text-slate-500 uppercase"
					>
						<th class="px-4 py-3 font-bold">IP</th>
						<th class="px-4 py-3 font-bold">Raison</th>
						<th class="px-4 py-3 font-bold">Bloqué le</th>
						<th class="px-4 py-3 font-bold">Par</th>
						<th class="px-4 py-3 font-bold">Statut</th>
						<th class="px-4 py-3 font-bold">Action</th>
					</tr>
				</thead>
				<tbody>
					{#each blocages as b (b.id)}
						<tr class="border-b border-slate-800/60 text-slate-300 hover:bg-sky-400/5">
							<td class="px-4 py-3 font-mono">{b.ip}</td>
							<td class="px-4 py-3">{b.raison}</td>
							<td class="px-4 py-3 font-mono text-xs"
								>{new Date(b.bloque_le).toLocaleString('fr-FR')}</td
							>
							<td class="px-4 py-3 text-slate-500">{b.bloque_par_nom || '—'}</td>
							<td class="px-4 py-3">
								{#if b.debloque_le}
									<span class="text-xs text-slate-500">Débloquée</span>
								{:else}
									<span class="text-xs text-rose-400">Active</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								{#if !b.debloque_le}
									<button
										on:click={() => debloquer(b.id)}
										title="Débloquer"
										class="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-400/10"
									>
										<Unlock size={14} /> Débloquer
									</button>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
