<script lang="ts">
	import { onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { fade } from 'svelte/transition';
	import { Shield, Mail, Lock, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-svelte';
	import { login, verifierOtp, ErreurApi } from '$lib/api/auth';

	type Etape = 'identifiants' | 'otp';

	let etape: Etape = 'identifiants';
	let email = '';
	let motDePasse = '';
	let code = '';
	let utilisateurId: number | null = null;

	let chargement = false;
	let verificationReussie = false;
	let erreur = '';

	let logoManquant = false;

	let secondesRestantes = 0;
	let intervalleCompteARebours: ReturnType<typeof setInterval> | null = null;

	function demarrerCompteARebours(duree: number) {
		secondesRestantes = duree;
		if (intervalleCompteARebours) clearInterval(intervalleCompteARebours);
		intervalleCompteARebours = setInterval(() => {
			secondesRestantes -= 1;
			if (secondesRestantes <= 0 && intervalleCompteARebours) {
				clearInterval(intervalleCompteARebours);
			}
		}, 1000);
	}

	onDestroy(() => {
		if (intervalleCompteARebours) clearInterval(intervalleCompteARebours);
	});

	async function soumettreIdentifiants() {
		erreur = '';
		chargement = true;
		try {
			const resultat = await login(email, motDePasse);
			utilisateurId = resultat.utilisateurId;
			demarrerCompteARebours(resultat.dureeValiditeSecondes);
			etape = 'otp';
		} catch (e) {
			if (e instanceof ErreurApi && e.emailNonConfirme && e.utilisateurId) {
				goto(`/inscription?confirmation=${e.utilisateurId}`);
				return;
			}
			erreur = e instanceof ErreurApi ? e.message : 'Erreur de connexion au serveur.';
		} finally {
			chargement = false;
		}
	}

	async function soumettreOtp() {
		if (!utilisateurId) return;
		erreur = '';
		chargement = true;
		try {
			const resultat = await verifierOtp(utilisateurId, code);
		
			localStorage.setItem('medishield_token', resultat.token);

			verificationReussie = true;
			await new Promise((resolve) => setTimeout(resolve, 900));
			goto('/');
		} catch (e) {
			erreur = e instanceof ErreurApi ? e.message : 'Erreur de connexion au serveur.';
			chargement = false;
		}
	}

	function renvoyerCode() {
		etape = 'identifiants';
		code = '';
		erreur = '';
	}
</script>

<svelte:head>
	<title>Connexion - MediShield</title>
</svelte:head>

<div class="bg-grid relative flex min-h-screen items-center justify-center p-4">
	<div class="pointer-events-none fixed inset-0 z-0" />

	<div class="relative z-10 w-full max-w-md">
		<div class="mb-8 flex flex-col items-center gap-3 text-center">
			<div
				class="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-sky-400/40 bg-sky-400/10"
			>
				{#if !logoManquant}
					<img
						src="/logo.png"
						alt="Logo MediShield"
						class="h-full w-full object-contain p-1.5"
						on:error={() => (logoManquant = true)}
					/>
				{:else}
					<Shield size={32} class="text-sky-400" />
				{/if}
			</div>
			<div>
				<h1 class="glow-text text-2xl font-extrabold tracking-tight">MediShield</h1>
				<p class="font-mono text-xs tracking-widest text-slate-500">
					SUPERVISION SOC - IDS
				</p>
			</div>
			<p class="text-sm text-slate-500">CNHU Hubert Koutoukou MAGA</p>
		</div>

		<div class="glass rounded-2xl p-8">
			{#if etape === 'identifiants'}
				<h2 class="mb-1 text-center text-lg font-bold text-white">Connexion administrateur</h2>
				<p class="mb-6 text-sm text-slate-400">
					Saisis tes identifiants pour recevoir un code de vérification par email.
				</p>

				<form
					on:submit|preventDefault={soumettreIdentifiants}
					class="flex flex-col gap-4"
				>
					<div>
						<label for="email" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
							Email
						</label>
						<div class="relative">
							<Mail size={18} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
							<input
								id="email"
								type="email"
								bind:value={email}
								required
								placeholder="admin@cnhu-hkm.bj"
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					<div>
						<label for="motDePasse" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
							Mot de passe
						</label>
						<div class="relative">
							<Lock size={18} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
							<input
								id="motDePasse"
								type="password"
								bind:value={motDePasse}
								required
								placeholder="••••••••"
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-600 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					{#if erreur}
						<div class="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
							<AlertCircle size={16} />
							{erreur}
						</div>
					{/if}

					<button
						type="submit"
						disabled={chargement}
						class="mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if chargement}
							<Loader2 size={18} class="animate-spin" />
							Vérification…
						{:else}
							Se connecter
						{/if}
					</button>

					<a
						href="/inscription"
						class="text-center text-xs text-slate-500 hover:text-sky-400"
					>
						Nouvel administrateur ? Créer un compte
					</a>
				</form>
			{:else}
				<h2 class="mb-1 text-lg font-bold text-white">Vérification par email</h2>
				<p class="mb-6 text-sm text-slate-400">
					Un code à 6 chiffres a été envoyé à <span class="text-slate-300">{email}</span>.
				</p>

				<form on:submit|preventDefault={soumettreOtp} class="flex flex-col gap-4">
					<div>
						<label for="code" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
							Code de vérification
						</label>
						<div class="relative">
							<KeyRound size={18} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
							<input
								id="code"
								type="text"
								inputmode="numeric"
								maxlength="6"
								bind:value={code}
								required
								placeholder="123456"
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-4 pl-10 text-center font-mono text-lg tracking-[0.3em] text-white placeholder-slate-600 outline-none transition-colors focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					<div class="flex items-center justify-between text-xs">
						<span class="text-slate-500">
							{#if secondesRestantes > 0}
								Le code expire dans <span class="font-mono text-sky-400">{secondesRestantes}s</span>
							{:else}
								<span class="text-rose-400">Le code a expiré</span>
							{/if}
						</span>
						<button
							type="button"
							on:click={renvoyerCode}
							class="font-semibold text-sky-400 hover:text-sky-300"
						>
							Recommencer
						</button>
					</div>

					{#if erreur}
						<div class="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
							<AlertCircle size={16} />
							{erreur}
						</div>
					{/if}

					<button
						type="submit"
						disabled={chargement || secondesRestantes <= 0}
						class="mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if verificationReussie}
							<CheckCircle2 size={18} />
							Accès autorisé…
						{:else if chargement}
							<Loader2 size={18} class="animate-spin" />
							Validation…
						{:else}
							Valider le code
						{/if}
					</button>
				</form>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-slate-600">
			© 2027 Merveille ALLIHA GLE - Tous droits réservés SSI-3
		</p>
	</div>

	{#if verificationReussie}
		<div
			transition:fade={{ duration: 200 }}
			class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-slate-950/90 backdrop-blur-sm"
		>
			<div
				class="flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400/40 bg-emerald-400/10"
			>
				<CheckCircle2 size={32} class="text-emerald-400" />
			</div>
			<div class="text-center">
				<p class="text-base font-semibold text-white">Identité vérifiée</p>
				<p class="mt-1 flex items-center justify-center gap-2 text-sm text-slate-400">
					<Loader2 size={14} class="animate-spin" />
					Redirection vers le tableau de bord…
				</p>
			</div>
		</div>
	{/if}
</div>