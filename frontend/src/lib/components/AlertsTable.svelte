<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { Eye, Ban } from 'lucide-svelte';

	export type Alerte = {
		heure: string;
		type: string;
		source_ip: string;
		niveau: 'Faible' | 'Moyen' | 'Élevé' | 'Critique';
		bloquee: boolean;
	};

	export let alertes: Alerte[] = [];

	const badgeColor: Record<Alerte['niveau'], 'green' | 'yellow' | 'orange' | 'rose'> = {
		Faible: 'green',
		Moyen: 'yellow',
		Élevé: 'orange',
		Critique: 'rose'
	};
</script>

<div class="overflow-hidden rounded-2xl">
	<table class="w-full text-left text-sm">
		<thead>
			<tr class="border-b border-sky-400/15 bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-500">
				<th class="px-4 py-3 font-bold">Heure</th>
				<th class="px-4 py-3 font-bold">Type d'attaque</th>
				<th class="px-4 py-3 font-bold">IP Source</th>
				<th class="px-4 py-3 font-bold">Niveau</th>
				<th class="px-4 py-3 font-bold">Bloquée (IPS)</th>
			</tr>
		</thead>
		<tbody>
			{#each alertes as a (a.heure + a.source_ip)}
				<tr class="border-b border-slate-800/60 text-slate-300 transition-colors hover:bg-sky-400/5">
					<td class="px-4 py-3 font-mono">{a.heure}</td>
					<td class="px-4 py-3">{a.type}</td>
					<td class="px-4 py-3 font-mono">{a.source_ip}</td>
					<td class="px-4 py-3"><Badge color={badgeColor[a.niveau]}>{a.niveau}</Badge></td>
					<td class="px-4 py-3">
						<span class="inline-flex items-center gap-1.5">
							{#if a.bloquee}
								<Ban size={16} class="text-rose-400" /> Oui
							{:else}
								<Eye size={16} class="text-slate-500" /> Non
							{/if}
						</span>
					</td>
				</tr>
			{/each}
			{#if alertes.length === 0}
				<tr>
					<td colspan="5" class="px-4 py-8 text-center text-slate-500">
						En attente des premières alertes…
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>
