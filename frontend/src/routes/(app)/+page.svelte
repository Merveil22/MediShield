<script lang="ts">
	import { onMount } from 'svelte';
	import { ShieldAlert, Gauge, Server, Ban } from 'lucide-svelte';

	import StatCard from '$lib/components/StatCard.svelte';
	import AlertsTable, { type Alerte } from '$lib/components/AlertsTable.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import TradingChart from '$lib/components/TradingChart.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { recupererScoreSecurite } from '$lib/api/ressources';

	// ------------------------------------------------------------------
	// Score de sécurité — donnée RÉELLE, calculée côté backend à partir
	// des vraies alertes en base (contrairement au reste du dashboard,
	// encore simulé en attendant la connexion Suricata).
	// ------------------------------------------------------------------
	let score: { score: number; etat: string } | null = null;

	onMount(async () => {
		try {
			score = await recupererScoreSecurite();
		} catch {
			// silencieux : si le backend n'est pas prêt, on masque juste le widget
		}
	});

	$: couleurScore =
		!score || score.score >= 90
			? '#34d399'
			: score.score >= 60
				? '#facc15'
				: '#f43f5e';

	// ------------------------------------------------------------------
	// État simulé — à remplacer par les vraies données Node.js/Express + WebSocket
	// une fois la connexion Suricata branchée.
	// ------------------------------------------------------------------

	let alertes: Alerte[] = [];
	let nbBloquees = 0;
	let paquetsParSec = 0;
	let tradingChart: TradingChart;

	const TYPES_ATTAQUES = [
		"Scan de ports (Nmap)",
		"Brute-force SSH (Hydra)",
		"Flood ICMP (hping3)",
		"Tentative d'exfiltration de données",
		'Connexion suspecte VLAN Radiologie'
	];
	const NIVEAUX: Alerte['niveau'][] = ['Faible', 'Moyen', 'Élevé', 'Critique'];
	const POIDS: Record<Alerte['niveau'], number> = { Faible: 1, Moyen: 2, Élevé: 3, Critique: 4 };

	$: compteurNiveaux = NIVEAUX.map((n) => ({
		name: n,
		value: alertes.filter((a) => a.niveau === n).length,
		color:
			n === 'Faible' ? '#22d3ee' : n === 'Moyen' ? '#facc15' : n === 'Élevé' ? '#fb923c' : '#f43f5e'
	}));

	function genererAlerte(): Alerte {
		return {
			heure: new Date().toLocaleTimeString('fr-FR'),
			type: TYPES_ATTAQUES[Math.floor(Math.random() * TYPES_ATTAQUES.length)],
			source_ip: `10.0.${1 + Math.floor(Math.random() * 3)}.${2 + Math.floor(Math.random() * 252)}`,
			niveau: NIVEAUX[Math.floor(Math.random() * NIVEAUX.length)],
			bloquee: false
		};
	}

	function nouvelleAlerte() {
		const a = genererAlerte();
		alertes = [a, ...alertes].slice(0, 50);
		paquetsParSec = 800 + Math.floor(Math.random() * 2700);

		const poids = POIDS[a.niveau];
		const base = 10 + poids * 3;
		const ouverture = base + (Math.random() * 2 - 1);
		const cloture = base + (Math.random() * 4 - 2) + poids;
		const haut = Math.max(ouverture, cloture) + Math.random() * 1.5;
		const bas = Math.min(ouverture, cloture) - Math.random() * 1.5;
		const volume = poids * (50 + Math.floor(Math.random() * 100));
		tradingChart?.pushPoint(Math.floor(Date.now() / 1000), ouverture, haut, bas, cloture, volume);
	}

	onMount(() => {
		const interval = setInterval(nouvelleAlerte, 4000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>MediShield - Supervision SOC</title>
</svelte:head>

<!-- Score de sécurité (donnée réelle) -->
{#if score}
	<div class="glass mx-8 mt-8 flex items-center gap-5 rounded-2xl p-5">
		<div
			class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 text-lg font-extrabold"
			style="border-color: {couleurScore}; color: {couleurScore};"
		>
			{score.score}
		</div>
		<div>
			<p class="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
				Score de sécurité global
			</p>
			<p class="text-lg font-bold" style="color: {couleurScore}">
				{score.etat} — {score.score}/100
			</p>
			<p class="text-xs text-slate-500">
				Calculé à partir des vraies alertes des dernières 24h en base de données.
			</p>
		</div>
	</div>
{/if}

<!-- Cartes de stats -->
<div class="flex flex-wrap gap-5 p-8 pb-4">
	<StatCard icon={ShieldAlert} label="Alertes (24h)" value={alertes.length} color="#f43f5e" />
	<StatCard icon={Gauge} label="Paquets / sec" value={paquetsParSec} color="#38bdf8" />
	<StatCard icon={Server} label="Hôtes surveillés" value={42} color="#34d399" />
	<StatCard icon={Ban} label="Attaques bloquées" value={nbBloquees} color="#fb923c" />
</div>

<!-- Graphiques -->
<div class="flex flex-wrap gap-5 px-8 pb-4">
	<div class="glass min-w-[340px] flex-[2] rounded-2xl p-5">
		<div class="mb-3 flex items-center justify-between">
			<div>
				<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
					Flux d'alertes réseau
				</p>
				<p class="text-sm text-slate-400">Intensité des menaces détectées</p>
			</div>
			<Badge color="rose">TEMPS RÉEL</Badge>
		</div>
		<TradingChart bind:this={tradingChart} />
	</div>

	<div class="glass min-w-[280px] flex-1 rounded-2xl p-5">
		<p class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
			Répartition par gravité
		</p>
		<DonutChart data={compteurNiveaux} />
	</div>
</div>

<!-- Table d'alertes -->
<div class="glass mx-8 mb-8 overflow-hidden rounded-2xl p-0">
	<div class="flex items-center justify-between border-b border-slate-800 p-5">
		<div>
			<p class="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
				Journal des alertes
			</p>
			<p class="text-sm text-slate-400">Détections en provenance de Suricata</p>
		</div>
	</div>
	<AlertsTable {alertes} />
</div>
