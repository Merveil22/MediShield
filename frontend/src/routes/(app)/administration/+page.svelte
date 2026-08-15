<script lang="ts">
	import { onMount } from 'svelte';
	import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-svelte';
	import { recupererProfil, changerMotDePasse } from '$lib/api/ressources';

	let profil: {
		nom: string;
		prenom: string;
		email: string;
		role: string;
		last_login: string | null;
	} | null = null;

	let motDePasseActuel = '';
	let nouveauMotDePasse = '';
	let confirmation = '';
	let chargement = false;
	let erreur = '';
	let succes = '';

	onMount(async () => {
		profil = await recupererProfil();
	});

	async function soumettre() {
		erreur = '';
		succes = '';

		if (nouveauMotDePasse !== confirmation) {
			erreur = 'Les nouveaux mots de passe ne correspondent pas.';
			return;
		}

		chargement = true;
		try {
			await changerMotDePasse(motDePasseActuel, nouveauMotDePasse);
			succes = 'Mot de passe mis à jour avec succès.';
			motDePasseActuel = '';
			nouveauMotDePasse = '';
			confirmation = '';
		} catch (e) {
			erreur = e instanceof Error ? e.message : 'Erreur lors de la mise à jour.';
		} finally {
			chargement = false;
		}
	}
</script>

<svelte:head><title>Administration - MediShield</title></svelte:head>

<div class="p-8">
	<div class="glass max-w-xl rounded-2xl p-6">
		<p class="mb-4 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
			Profil administrateur
		</p>
		{#if profil}
			<div class="flex flex-col gap-3 text-sm">
				<div class="flex justify-between border-b border-slate-800 pb-2">
					<span class="text-slate-500">Nom complet</span>
					<span class="text-white">{profil.prenom} {profil.nom}</span>
				</div>
				<div class="flex justify-between border-b border-slate-800 pb-2">
					<span class="text-slate-500">Email</span>
					<span class="text-white">{profil.email}</span>
				</div>
				<div class="flex justify-between border-b border-slate-800 pb-2">
					<span class="text-slate-500">Rôle</span>
					<span class="text-white capitalize">{profil.role.replace('_', ' ')}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-slate-500">Dernière connexion</span>
					<span class="text-white">
						{profil.last_login
							? new Date(profil.last_login).toLocaleString('fr-FR')
							: 'Première connexion'}
					</span>
				</div>
			</div>
		{:else}
			<p class="text-sm text-slate-500">Chargement…</p>
		{/if}
	</div>

	<div class="glass mt-5 max-w-xl rounded-2xl p-6">
		<p class="mb-4 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
			Changer le mot de passe
		</p>
		<form on:submit|preventDefault={soumettre} class="flex flex-col gap-4">
			<div>
				<label for="actuel" class="mb-1.5 block text-xs font-semibold text-slate-500">
					Mot de passe actuel
				</label>
				<input
					id="actuel"
					type="password"
					bind:value={motDePasseActuel}
					required
					class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/60"
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label for="nouveau" class="mb-1.5 block text-xs font-semibold text-slate-500">
						Nouveau mot de passe
					</label>
					<input
						id="nouveau"
						type="password"
						bind:value={nouveauMotDePasse}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/60"
					/>
				</div>
				<div>
					<label for="confirmation" class="mb-1.5 block text-xs font-semibold text-slate-500">
						Confirmer
					</label>
					<input
						id="confirmation"
						type="password"
						bind:value={confirmation}
						required
						class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/60"
					/>
				</div>
			</div>

			{#if erreur}
				<div class="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
					<AlertCircle size={16} />{erreur}
				</div>
			{/if}
			{#if succes}
				<div class="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
					<CheckCircle2 size={16} />{succes}
				</div>
			{/if}

			<button
				type="submit"
				disabled={chargement}
				class="flex items-center justify-center gap-2 self-start rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 disabled:opacity-60"
			>
				{#if chargement}<Loader2 size={16} class="animate-spin" />{/if}
				Mettre à jour
			</button>
		</form>
	</div>
</div>
