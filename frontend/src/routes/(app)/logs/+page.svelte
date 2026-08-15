<script lang="ts">
	import { onMount } from 'svelte';
	import { Download } from 'lucide-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { listerLogs } from '$lib/api/ressources';

	type Log = {
		id: number;
		date_heure: string;
		source: 'suricata' | 'auth' | 'admin' | 'system';
		type: 'info' | 'warn' | 'error' | 'debug';
		message: string;
	};

	let logs: Log[] = [];
	let chargement = true;
	let filtreSource = '';
	let filtreType = '';

	const couleurType: Record<string, 'green' | 'yellow' | 'rose' | 'slate'> = {
		info: 'green',
		warn: 'yellow',
		error: 'rose',
		debug: 'slate'
	};

	async function charger() {
		chargement = true;
		const filtres: Record<string, string> = {};
		if (filtreSource) filtres.source = filtreSource;
		if (filtreType) filtres.type = filtreType;
		logs = await listerLogs(filtres);
		chargement = false;
	}

	function exporterCsv() {
		const entetes = ['Date', 'Source', 'Niveau', 'Message'];
		const lignes = logs.map((l) => [
			new Date(l.date_heure).toLocaleString('fr-FR'),
			l.source,
			l.type,
			`"${l.message.replace(/"/g, '""')}"`
		]);
		const contenu = [entetes.join(','), ...lignes.map((l) => l.join(','))].join('\n');
		const blob = new Blob(['\uFEFF' + contenu], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const lien = document.createElement('a');
		lien.href = url;
		lien.download = `logs-medishield-${new Date().toISOString().slice(0, 10)}.csv`;
		lien.click();
		URL.revokeObjectURL(url);
	}

	onMount(charger);
</script>

<svelte:head><title>Journaux - MediShield</title></svelte:head>

<div class="p-8">
	<div class="glass mb-5 flex flex-wrap items-end gap-4 rounded-2xl p-5">
		<div class="flex flex-col gap-1.5">
			<label for="source" class="text-xs font-semibold text-slate-500">Source</label>
			<select
				id="source"
				bind:value={filtreSource}
				on:change={charger}
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			>
				<option value="">Toutes</option>
				<option value="suricata">Suricata</option>
				<option value="auth">Authentification</option>
				<option value="admin">Administrateur</option>
				<option value="system">Système</option>
			</select>
		</div>
		<div class="flex flex-col gap-1.5">
			<label for="type" class="text-xs font-semibold text-slate-500">Niveau</label>
			<select
				id="type"
				bind:value={filtreType}
				on:change={charger}
				class="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60"
			>
				<option value="">Tous</option>
				<option value="info">Info</option>
				<option value="warn">Warn</option>
				<option value="error">Error</option>
				<option value="debug">Debug</option>
			</select>
		</div>
		<button
			on:click={exporterCsv}
			disabled={logs.length === 0}
			class="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 disabled:opacity-40"
		>
			<Download size={16} /> Exporter CSV
		</button>
	</div>

	<div class="glass overflow-hidden rounded-2xl p-0">
		{#if chargement}
			<p class="p-8 text-center text-sm text-slate-500">Chargement…</p>
		{:else if logs.length === 0}
			<p class="p-8 text-center text-sm text-slate-500">
				Aucun log pour l'instant... Ils apparaîtront ici dès que le backend enregistrera des
				événements (connexions, actions admin, etc.).
			</p>
		{:else}
			<table class="w-full text-left text-sm">
				<thead>
					<tr
						class="border-b border-sky-400/15 bg-slate-900/60 text-[11px] tracking-wider text-slate-500 uppercase"
					>
						<th class="px-4 py-3 font-bold">Date</th>
						<th class="px-4 py-3 font-bold">Source</th>
						<th class="px-4 py-3 font-bold">Niveau</th>
						<th class="px-4 py-3 font-bold">Message</th>
					</tr>
				</thead>
				<tbody>
					{#each logs as log (log.id)}
						<tr class="border-b border-slate-800/60 text-slate-300 hover:bg-sky-400/5">
							<td class="px-4 py-3 font-mono text-xs"
								>{new Date(log.date_heure).toLocaleString('fr-FR')}</td
							>
							<td class="px-4 py-3">{log.source}</td>
							<td class="px-4 py-3"><Badge color={couleurType[log.type]}>{log.type}</Badge></td>
							<td class="px-4 py-3">{log.message}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
