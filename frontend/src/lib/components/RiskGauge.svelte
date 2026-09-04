<script lang="ts">
	export let score: number = 0;

	$: etiquette = score >= 90 ? 'Faible' : score >= 60 ? 'Moyen' : score >= 30 ? 'Élevé' : 'Critique';
	$: couleur =
		score >= 90 ? '#34d399' : score >= 60 ? '#facc15' : score >= 30 ? '#fb923c' : '#f43f5e';

	// Le risque affiché est l'inverse du score de sécurité :
	// score de sécurité élevé = risque faible, et inversement.
	$: risquePourcent = 100 - score;

	const rayon = 80;
	const centreX = 110;
	const centreY = 100;
	const circonference = Math.PI * rayon; // demi-cercle uniquement

	$: decalage = circonference - (risquePourcent / 100) * circonference;
</script>

<div class="flex flex-col items-center">
	<svg width="220" height="130" viewBox="0 0 220 130">
		<!-- Fond du demi-cercle -->
		<path
			d="M {centreX - rayon} {centreY} A {rayon} {rayon} 0 0 1 {centreX + rayon} {centreY}"
			fill="none"
			stroke="#1e293b"
			stroke-width="16"
			stroke-linecap="round"
		/>
		<!-- Arc de progression coloré selon le niveau de risque -->
		<path
			d="M {centreX - rayon} {centreY} A {rayon} {rayon} 0 0 1 {centreX + rayon} {centreY}"
			fill="none"
			stroke={couleur}
			stroke-width="16"
			stroke-linecap="round"
			stroke-dasharray={circonference}
			stroke-dashoffset={decalage}
			class="transition-all duration-700"
		/>
		<text x={centreX} y={centreY - 22} text-anchor="middle" fill={couleur} font-size="16" font-weight="700">
			{etiquette}
		</text>
		<text x={centreX} y={centreY - 2} text-anchor="middle" fill="#e2e8f0" font-size="22" font-weight="800">
			{risquePourcent.toFixed(1)}%
		</text>
	</svg>
	<p class="mt-1 text-sm font-semibold text-slate-300">Jauge de risque</p>
	<p class="mt-1 max-w-[220px] text-center text-xs text-slate-500">
		Niveau de risque global basé sur l'analyse des alertes et des équipements.
	</p>
</div>
