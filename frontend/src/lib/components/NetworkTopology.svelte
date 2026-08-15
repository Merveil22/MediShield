<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	export let equipements: { nom: string; ip: string; type: string; vlan: string | null; statut: string }[] = [];

	// ------------------------------------------------------------------
	// Structure fixe de l'architecture (conforme au schéma du document
	// de conception : Internet -> Pare-feu -> Routeur -> Switch -> VLANs).
	// Les équipements réels (issus de la base) sont rattachés au VLAN
	// correspondant par correspondance de texte sur le champ `vlan`.
	// ------------------------------------------------------------------

	const VLANS = [
		{ id: 'serveurs', label: 'VLAN 40 — Serveurs', match: 'Serveurs', x: 90 },
		{ id: 'urgences', label: 'VLAN 20 — Urgences', match: 'Urgences', x: 260 },
		{ id: 'labo', label: 'VLAN 30 — Laboratoire', match: 'Laboratoire', x: 430 },
		{ id: 'admin', label: 'VLAN 10 — Administration', match: 'Administration', x: 600 },
		{ id: 'gestion', label: 'VLAN 99 — Gestion', match: 'Gestion', x: 770 }
	];

	function equipementsDuVlan(match: string) {
		const trouves = equipements.filter((e) => (e.vlan || '').includes(match));
		// Si aucun équipement réel ne correspond, on affiche un nœud
		// générique "en attente" pour ne pas laisser le VLAN vide.
		return trouves.length > 0 ? trouves.slice(0, 3) : [{ nom: 'Aucun équipement', ip: '—', type: '', vlan: '', statut: 'inconnu' }];
	}

	function couleurStatut(statut: string) {
		if (statut === 'normal') return '#34d399';
		if (statut === 'attention') return '#facc15';
		if (statut === 'hors_service') return '#f43f5e';
		return '#475569';
	}

	// ------------------------------------------------------------------
	// Animation de "paquets" qui transitent — déclenchée périodiquement
	// entre deux points du schéma, pour simuler du trafic réseau en
	// attendant la vraie connexion GNS3/Suricata.
	// ------------------------------------------------------------------

	type Impulsion = { id: number; x1: number; y1: number; x2: number; y2: number };
	let impulsions: Impulsion[] = [];
	let compteurId = 0;
	let intervalle: ReturnType<typeof setInterval>;

	const CHEMIN_PRINCIPAL = [
		{ x: 435, y: 40 }, // Internet
		{ x: 435, y: 100 }, // Pare-feu
		{ x: 435, y: 160 }, // Routeur
		{ x: 435, y: 220 } // Switch
	];

	function declencherImpulsion() {
		const vlan = VLANS[Math.floor(Math.random() * VLANS.length)];
		const depuisInternet = Math.random() > 0.5;

		const nouvelles: Impulsion[] = [];
		// Segment 1 : Internet -> Switch (le long du tronc commun)
		for (let i = 0; i < CHEMIN_PRINCIPAL.length - 1; i++) {
			const a = depuisInternet ? CHEMIN_PRINCIPAL[i] : CHEMIN_PRINCIPAL[CHEMIN_PRINCIPAL.length - 1 - i];
			const b = depuisInternet ? CHEMIN_PRINCIPAL[i + 1] : CHEMIN_PRINCIPAL[CHEMIN_PRINCIPAL.length - 2 - i];
			nouvelles.push({ id: compteurId++, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
		}
		// Segment 2 : Switch -> VLAN ciblé
		nouvelles.push({
			id: compteurId++,
			x1: depuisInternet ? 435 : vlan.x + 40,
			y1: depuisInternet ? 220 : 280,
			x2: depuisInternet ? vlan.x + 40 : 435,
			y2: depuisInternet ? 280 : 220
		});

		impulsions = [...impulsions, ...nouvelles];
		// Nettoyage après la durée de l'animation
		setTimeout(() => {
			const idsARetirer = new Set(nouvelles.map((n) => n.id));
			impulsions = impulsions.filter((imp) => !idsARetirer.has(imp.id));
		}, 1800);
	}

	onMount(() => {
		intervalle = setInterval(declencherImpulsion, 2200);
	});
	onDestroy(() => clearInterval(intervalle));
</script>

<div class="glass overflow-x-auto rounded-2xl p-5">
	<div class="mb-4 flex items-center justify-between">
		<div>
			<p class="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
				Topologie réseau simulée
			</p>
			<p class="text-sm text-slate-400">
				Architecture GNS3 (Internet → Pare-feu → Routeur → Switch → VLANs) — trafic animé simulé
			</p>
		</div>
		<div class="flex items-center gap-4 text-xs text-slate-400">
			<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-emerald-400" />Normal</span>
			<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-yellow-400" />Attention</span>
			<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-rose-500" />Hors service</span>
		</div>
	</div>

	<svg viewBox="0 0 900 420" class="w-full min-w-[820px]" style="min-height: 420px">
		<!-- Lignes du tronc principal -->
		<line x1="435" y1="40" x2="435" y2="220" stroke="#334155" stroke-width="2" />
		{#each VLANS as vlan}
			<line x1="435" y1="220" x2={vlan.x + 40} y2="280" stroke="#334155" stroke-width="2" />
		{/each}

		<!-- Impulsions animées (paquets qui transitent) -->
		{#each impulsions as imp (imp.id)}
			<circle r="4" fill="#38bdf8">
				<animateMotion
					dur="0.9s"
					fill="freeze"
					path="M {imp.x1} {imp.y1} L {imp.x2} {imp.y2}"
				/>
				<animate attributeName="opacity" values="1;1;0" dur="0.9s" fill="freeze" />
			</circle>
		{/each}

		<!-- Internet -->
		<g>
			<rect x="385" y="15" width="100" height="34" rx="8" fill="#0f172a" stroke="#38bdf8" />
			<text x="435" y="36" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="Inter, sans-serif">Internet</text>
		</g>

		<!-- Pare-feu -->
		<g>
			<rect x="385" y="83" width="100" height="34" rx="8" fill="#0f172a" stroke="#fb923c" />
			<text x="435" y="104" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="Inter, sans-serif">Pare-feu</text>
		</g>

		<!-- Routeur -->
		<g>
			<rect x="385" y="143" width="100" height="34" rx="8" fill="#0f172a" stroke="#818cf8" />
			<text x="435" y="164" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="Inter, sans-serif">Routeur</text>
		</g>

		<!-- Switch cœur -->
		<g>
			<rect x="385" y="203" width="100" height="34" rx="8" fill="#0f172a" stroke="#38bdf8" />
			<text x="435" y="224" text-anchor="middle" fill="#e2e8f0" font-size="11" font-family="Inter, sans-serif">Switch cœur</text>
		</g>

		<!-- VLANs et leurs équipements -->
		{#each VLANS as vlan}
			<g>
				<rect x={vlan.x} y="280" width="140" height="26" rx="6" fill="#1e293b" stroke="#475569" />
				<text x={vlan.x + 70} y="297" text-anchor="middle" fill="#94a3b8" font-size="9" font-family="Inter, sans-serif">
					{vlan.label}
				</text>
			</g>
			{#each equipementsDuVlan(vlan.match) as eq, i}
				<g>
					<circle cx={vlan.x + 20 + i * 45} cy={340} r="9" fill={couleurStatut(eq.statut)} />
					<text
						x={vlan.x + 20 + i * 45}
						y={362}
						text-anchor="middle"
						fill="#64748b"
						font-size="7"
						font-family="Inter, sans-serif"
					>
						{eq.nom.length > 14 ? eq.nom.slice(0, 13) + '…' : eq.nom}
					</text>
					<line x1={vlan.x + 70} y1="306" x2={vlan.x + 20 + i * 45} y2="331" stroke="#334155" stroke-width="1" />
				</g>
			{/each}
		{/each}
	</svg>
</div>
