<script lang="ts">
	import { onMount } from 'svelte';
	import {
		ShieldAlert,
		Activity,
		Radar,
		Server,
		AlertTriangle,
		Fingerprint,
		Eye,
		Ban
	} from 'lucide-svelte';
	import RiskGauge from '$lib/components/RiskGauge.svelte';
	import VulnerabilityAreaChart from '$lib/components/VulnerabilityAreaChart.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { listerAlertes, listerEquipements, listerLogs, recupererScoreSecurite } from '$lib/api/ressources';

	type Alerte = {
		id: number;
		date_heure: string;
		ip_source: string;
		type_attaque: string;
		gravite: 'critique' | 'elevee' | 'moyenne' | 'faible';
		statut: string;
	};

	let chargement = true;
	let score = 0;
	let alertes: Alerte[] = [];
	let nbLogs = 0;
	let nbEquipementsEnLigne = 0;
	let nbEquipementsTotal = 0;

	let plagePeriode: '24h' | '7j' | '30j' | 'tout' = '24h';

	const COULEUR_GRAVITE: Record<string, string> = {
		critique: '#f43f5e',
		elevee: '#fb923c',
		moyenne: '#facc15',
		faible: '#22d3ee'
	};

	$: cutoff = (() => {
		const maintenant = Date.now();
		if (plagePeriode === '24h') return maintenant - 24 * 3600 * 1000;
		if (plagePeriode === '7j') return maintenant - 7 * 24 * 3600 * 1000;
		if (plagePeriode === '30j') return maintenant - 30 * 24 * 3600 * 1000;
		return 0;
	})();

	$: alertesFiltrees = alertes.filter((a) => new Date(a.date_heure).getTime() >= cutoff);

	$: nbCritiques = alertesFiltrees.filter((a) => a.gravite === 'critique').length;
	$: nbElevees = alertesFiltrees.filter((a) => a.gravite === 'elevee').length;
	$: nbMoyennes = alertesFiltrees.filter((a) => a.gravite === 'moyenne').length;
	$: nbFaibles = alertesFiltrees.filter((a) => a.gravite === 'faible').length;
	$: ipUniques = new Set(alertesFiltrees.map((a) => a.ip_source)).size;
	$: typesUniques = new Set(alertesFiltrees.map((a) => a.type_attaque)).size;

	$: donneesGravite = [
		{ name: 'Critique', value: nbCritiques, color: COULEUR_GRAVITE.critique },
		{ name: 'Élevée', value: nbElevees, color: COULEUR_GRAVITE.elevee },
		{ name: 'Moyenne', value: nbMoyennes, color: COULEUR_GRAVITE.moyenne },
		{ name: 'Faible', value: nbFaibles, color: COULEUR_GRAVITE.faible }
	];

	const PALETTE_TYPES = ['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#64748b'];
	$: donneesParType = (() => {
		const compteur: Record<string, number> = {};
		alertesFiltrees.forEach((a) => {
			compteur[a.type_attaque] = (compteur[a.type_attaque] || 0) + 1;
		});
		const trie = Object.entries(compteur).sort((a, b) => b[1] - a[1]);
		const top = trie.slice(0, 4);
		const reste = trie.slice(4).reduce((s, [, n]) => s + n, 0);
		const resultat = top.map(([nom, valeur], i) => ({
			name: nom,
			value: valeur,
			color: PALETTE_TYPES[i]
		}));
		if (reste > 0) resultat.push({ name: 'Autres', value: reste, color: PALETTE_TYPES[4] });
		return resultat;
	})();

	$: signatures = (() => {
		const groupes: Record<string, { total: number; ips: Set<string> }> = {};
		alertesFiltrees.forEach((a) => {
			if (!groupes[a.type_attaque]) groupes[a.type_attaque] = { total: 0, ips: new Set() };
			groupes[a.type_attaque].total += 1;
			groupes[a.type_attaque].ips.add(a.ip_source);
		});
		const total = alertesFiltrees.length || 1;
		return Object.entries(groupes)
			.map(([signature, d]) => ({
				signature,
				total: d.total,
				ipsUniques: d.ips.size,
				pourcentage: ((d.total / total) * 100).toFixed(2)
			}))
			.sort((a, b) => b.total - a.total)
			.slice(0, 6);
	})();

	$: derniereAlerte = [...alertesFiltrees].sort(
		(a, b) => new Date(b.date_heure).getTime() - new Date(a.date_heure).getTime()
	)[0];

	$: donneesTendance = (() => {
		const buckets: Record<number, { critique: number; elevee: number; moyenne: number; faible: number }> = {};
		alertesFiltrees.forEach((a) => {
			const heureUnix = Math.floor(new Date(a.date_heure).getTime() / 1000 / 3600) * 3600;
			if (!buckets[heureUnix]) buckets[heureUnix] = { critique: 0, elevee: 0, moyenne: 0, faible: 0 };
			buckets[heureUnix][a.gravite] += 1;
		});
		return Object.entries(buckets)
			.map(([time, valeurs]) => ({ time: Number(time), ...valeurs }))
			.sort((a, b) => a.time - b.time);
	})();

	const couleurBadgeGravite: Record<string, 'rose' | 'orange' | 'yellow' | 'cyan'> = {
		critique: 'rose',
		elevee: 'orange',
		moyenne: 'yellow',
		faible: 'cyan'
	};

	onMount(async () => {
		try {
			const [resultScore, resultAlertes, resultEquipements, resultLogs] = await Promise.all([
				recupererScoreSecurite(),
				listerAlertes(),
				listerEquipements(),
				listerLogs()
			]);
			score = resultScore.score;
			alertes = resultAlertes;
			nbEquipementsTotal = resultEquipements.length;
			nbEquipementsEnLigne = resultEquipements.filter((e: { statut: string }) => e.statut !== 'hors_service').length;
			nbLogs = resultLogs.length;
		} catch {

		} finally {
			chargement = false;
		}
	});
</script>

<svelte:head>
	<title>MediShield — Supervision SOC</title>
</svelte:head>

<div class="p-8">
	<div class="mb-5 flex justify-end">
		<select
			bind:value={plagePeriode}
			class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
		>
			<option value="24h">Dernières 24 heures</option>
			<option value="7j">7 derniers jours</option>
			<option value="30j">30 derniers jours</option>
			<option value="tout">Toute la période</option>
		</select>
	</div>

	{#if chargement}
		<p class="text-center text-sm text-slate-500">Chargement du tableau de bord…</p>
	{:else}
		<div class="mb-5 flex flex-wrap gap-5">
			<div class="glass flex flex-1 min-w-[260px] flex-col items-center justify-center rounded-2xl p-6">
				<RiskGauge {score} />
			</div>
			<div class="glass min-w-[400px] flex-[2.2] rounded-2xl p-5">
				<p class="mb-2 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
					Vue d'ensemble des vulnérabilités
				</p>
				<VulnerabilityAreaChart donnees={donneesTendance} />
			</div>
		</div>

		<div class="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
			{#each [
				{ icone: ShieldAlert, label: 'Alertes totales', valeur: alertesFiltrees.length, couleur: '#38bdf8' },
				{ icone: AlertTriangle, label: 'Alertes critiques', valeur: nbCritiques, couleur: '#f43f5e' },
				{ icone: Activity, label: 'Événements', valeur: nbLogs, couleur: '#818cf8' },
				{ icone: Radar, label: 'Types de menaces', valeur: typesUniques, couleur: '#34d399' },
				{ icone: Server, label: 'Équipements en ligne', valeur: `${nbEquipementsEnLigne}/${nbEquipementsTotal}`, couleur: '#22d3ee' },
				{ icone: Eye, label: 'Sévérité élevée', valeur: nbElevees, couleur: '#fb923c' },
				{ icone: Fingerprint, label: 'IP distinctes', valeur: ipUniques, couleur: '#facc15' }
			] as carte}
				<div class="glass rounded-2xl p-4">
					<div class="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style="background:{carte.couleur}22">
						<svelte:component this={carte.icone} size={18} style="color:{carte.couleur}" />
					</div>
					<p class="font-mono text-2xl font-extrabold text-white">{carte.valeur}</p>
					<p class="text-[11px] tracking-wide text-slate-500 uppercase">{carte.label}</p>
				</div>
			{/each}
		</div>
		<div class="mb-5 flex flex-wrap gap-5">
			<div class="glass min-w-[300px] flex-1 rounded-2xl p-5">
				<p class="mb-3 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
					Répartition par type d'attaque
				</p>
				<DonutChart data={donneesParType} />
			</div>
			<div class="glass min-w-[300px] flex-1 rounded-2xl p-5">
				<p class="mb-3 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
					Répartition par gravité
				</p>
				<DonutChart data={donneesGravite} />
			</div>
		</div>

		<div class="flex flex-wrap gap-5">
			<div class="glass min-w-[400px] flex-[2] overflow-hidden rounded-2xl p-0">
				<div class="border-b border-slate-800 p-5">
					<p class="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
						Signatures les plus ciblées
					</p>
				</div>
				{#if signatures.length === 0}
					<p class="p-8 text-center text-sm text-slate-500">Aucune alerte sur cette période.</p>
				{:else}
					<table class="w-full text-left text-sm">
						<thead>
							<tr class="border-b border-sky-400/15 text-[11px] tracking-wider text-slate-500 uppercase">
								<th class="px-5 py-2 font-bold">Signature</th>
								<th class="px-5 py-2 font-bold">Alertes</th>
								<th class="px-5 py-2 font-bold">IP uniques</th>
								<th class="px-5 py-2 font-bold">% des alertes</th>
							</tr>
						</thead>
						<tbody>
							{#each signatures as s}
								<tr class="border-b border-slate-800/60 text-slate-300 hover:bg-sky-400/5">
									<td class="px-5 py-2.5">{s.signature}</td>
									<td class="px-5 py-2.5 font-mono">{s.total}</td>
									<td class="px-5 py-2.5 font-mono">{s.ipsUniques}</td>
									<td class="px-5 py-2.5 font-mono">{s.pourcentage}%</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<div class="glass min-w-[280px] flex-1 rounded-2xl p-5">
				<p class="mb-3 text-[11px] font-semibold tracking-widest text-emerald-400 uppercase">
					Dernière alerte
				</p>
				{#if derniereAlerte}
					<div class="flex items-start justify-between gap-2">
						<p class="text-sm font-semibold text-white">{derniereAlerte.type_attaque}</p>
						<Badge color={couleurBadgeGravite[derniereAlerte.gravite]}>{derniereAlerte.gravite}</Badge>
					</div>
					<p class="mt-2 text-xs text-slate-500">IP source</p>
					<p class="font-mono text-sm text-slate-300">{derniereAlerte.ip_source}</p>
					<p class="mt-2 text-xs text-slate-500">Date</p>
					<p class="text-sm text-slate-300">{new Date(derniereAlerte.date_heure).toLocaleString('fr-FR')}</p>
					<a href="/alertes" class="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sky-400 hover:text-sky-300">
						Voir toutes les alertes →
					</a>
				{:else}
					<p class="text-sm text-slate-500">Aucune alerte pour l'instant.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>
