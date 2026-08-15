<script lang="ts">
	import { onMount } from 'svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import { listerAlertes } from '$lib/api/ressources';

	type Alerte = { gravite: string; type_attaque: string; ip_source: string };

	let alertes: Alerte[] = [];
	let chargement = true;

	$: parGravite = ['faible', 'moyenne', 'elevee', 'critique'].map((g) => ({
		name: g,
		value: alertes.filter((a) => a.gravite === g).length,
		color:
			g === 'faible' ? '#22d3ee' : g === 'moyenne' ? '#facc15' : g === 'elevee' ? '#fb923c' : '#f43f5e'
	}));

	$: topTypes = Object.entries(
		alertes.reduce<Record<string, number>>((acc, a) => {
			acc[a.type_attaque] = (acc[a.type_attaque] || 0) + 1;
			return acc;
		}, {})
	)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6);

	$: topIps = Object.entries(
		alertes.reduce<Record<string, number>>((acc, a) => {
			acc[a.ip_source] = (acc[a.ip_source] || 0) + 1;
			return acc;
		}, {})
	)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 6);

	$: maxType = Math.max(...topTypes.map(([, n]) => n), 1);
	$: maxIp = Math.max(...topIps.map(([, n]) => n), 1);

	onMount(async () => {
		alertes = await listerAlertes();
		chargement = false;
	});
</script>

<svelte:head><title>Statistiques - MediShield</title></svelte:head>

<div class="p-8">
	{#if chargement}
		<p class="text-center text-sm text-slate-500">Chargement…</p>
	{:else if alertes.length === 0}
		<div class="glass rounded-2xl p-8 text-center">
			<p class="text-sm text-slate-500">
				Aucune alerte enregistrée pour l'instant.. Les statistiques apparaîtront ici dès que des
				alertes seront créées (page Alertes, ou plus tard via Suricata).
			</p>
		</div>
	{:else}
		<div class="flex flex-wrap gap-5">
			<div class="glass min-w-[280px] flex-1 rounded-2xl p-5">
				<p class="mb-3 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
					Répartition par gravité
				</p>
				<DonutChart data={parGravite} />
			</div>

			<div class="glass min-w-[280px] flex-1 rounded-2xl p-5">
				<p class="mb-3 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
					Top types d'attaque
				</p>
				<div class="flex flex-col gap-2.5">
					{#each topTypes as [type, n]}
						<div>
							<div class="mb-1 flex justify-between text-xs text-slate-400">
								<span>{type}</span><span class="font-mono">{n}</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-slate-800">
								<div class="h-full bg-sky-400" style="width: {(n / maxType) * 100}%" />
							</div>
						</div>
					{/each}
				</div>
			</div>

			<div class="glass min-w-[280px] flex-1 rounded-2xl p-5">
				<p class="mb-3 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
					Top IP attaquantes
				</p>
				<div class="flex flex-col gap-2.5">
					{#each topIps as [ip, n]}
						<div>
							<div class="mb-1 flex justify-between text-xs text-slate-400">
								<span class="font-mono">{ip}</span><span class="font-mono">{n}</span>
							</div>
							<div class="h-2 overflow-hidden rounded-full bg-slate-800">
								<div class="h-full bg-rose-400" style="width: {(n / maxIp) * 100}%" />
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
