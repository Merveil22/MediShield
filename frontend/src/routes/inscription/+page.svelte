<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Shield,
		User,
		Mail,
		Phone,
		Lock,
		KeyRound,
		Loader2,
		AlertCircle,
		CheckCircle2,
		MailCheck
	} from 'lucide-svelte';
	import { inscription, confirmerEmail, renvoyerConfirmation, ErreurApi } from '$lib/api/auth';

	type Etape = 'formulaire' | 'confirmation' | 'succes';
	let etape: Etape = 'formulaire';

	let nom = '';
	let prenom = '';
	let email = '';
	let telephone = '';
	let motDePasse = '';
	let confirmationMotDePasse = '';
	let codeInscription = '';
	let role = 'admin';

	let codeConfirmation = '';
	let utilisateurId: number | null = null;

	let chargement = false;
	let erreur = '';
	let messageInfo = '';

	// Si on arrive depuis la page de connexion (compte créé mais
	// jamais confirmé), on saute directement à l'étape de
	// confirmation et on envoie un nouveau code.
	onMount(async () => {
		const idDepuisUrl = $page.url.searchParams.get('confirmation');
		if (idDepuisUrl) {
			utilisateurId = Number(idDepuisUrl);
			etape = 'confirmation';
			try {
				const resultat = await renvoyerConfirmation(utilisateurId);
				demarrerCompteARebours(resultat.dureeValiditeSecondes);
			} catch {
				erreur = "Impossible d'envoyer un nouveau code. Réessaie depuis l'inscription.";
			}
		}
	});

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

	// Si static/logo.png n'existe pas, on retombe sur l'icône bouclier.
	let logoManquant = false;

	async function soumettreFormulaire() {
		erreur = '';

		if (motDePasse !== confirmationMotDePasse) {
			erreur = 'Les mots de passe ne correspondent pas.';
			return;
		}
		if (motDePasse.length < 8) {
			erreur = 'Le mot de passe doit contenir au moins 8 caractères.';
			return;
		}

		chargement = true;
		try {
			const resultat = await inscription({
				nom,
				prenom,
				email,
				telephone,
				motDePasse,
				codeInscription,
				role
			});
			utilisateurId = resultat.utilisateurId;
			demarrerCompteARebours(resultat.dureeValiditeSecondes);
			etape = 'confirmation';
		} catch (e) {
			erreur = e instanceof ErreurApi ? e.message : 'Erreur de connexion au serveur.';
		} finally {
			chargement = false;
		}
	}

	async function soumettreConfirmation() {
		if (!utilisateurId) return;
		erreur = '';
		chargement = true;
		try {
			await confirmerEmail(utilisateurId, codeConfirmation);
			etape = 'succes';
			setTimeout(() => goto('/login'), 2000);
		} catch (e) {
			erreur = e instanceof ErreurApi ? e.message : 'Erreur de connexion au serveur.';
		} finally {
			chargement = false;
		}
	}

	async function demanderNouveauCode() {
		if (!utilisateurId) return;
		erreur = '';
		messageInfo = '';
		try {
			const resultat = await renvoyerConfirmation(utilisateurId);
			demarrerCompteARebours(resultat.dureeValiditeSecondes);
			messageInfo = 'Un nouveau code a été envoyé.';
		} catch (e) {
			erreur = e instanceof ErreurApi ? e.message : "Impossible d'envoyer un nouveau code.";
		}
	}
</script>

<svelte:head>
	<title>Créer un compte - MediShield</title>
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
					{etape === 'confirmation' ? 'CONFIRMATION EMAIL' : 'CRÉATION DE COMPTE ADMIN'}
				</p>
			</div>
			<p class="text-sm text-slate-500">CNHU Hubert Koutoukou MAGA</p>
		</div>

		<div class="glass rounded-2xl p-8">
			{#if etape === 'succes'}
				<div class="flex flex-col items-center gap-3 py-4 text-center">
					<CheckCircle2 size={40} class="text-emerald-400" />
					<p class="text-white">Email confirmé avec succès.</p>
					<p class="text-sm text-slate-400">Redirection vers la page de connexion…</p>
				</div>
			{:else if etape === 'confirmation'}
				<div class="mb-4 flex justify-center">
					<div
						class="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/40 bg-sky-400/10"
					>
						<MailCheck size={26} class="text-sky-400" />
					</div>
				</div>
				<h2 class="mb-1 text-center text-lg font-bold text-white">Confirme ton adresse email</h2>
				<p class="mb-6 text-center text-sm text-slate-400">
					Un code à 6 chiffres a été envoyé à <span class="text-slate-300">{email}</span>.
				</p>

				<form on:submit|preventDefault={soumettreConfirmation} class="flex flex-col gap-4">
					<div>
						<label
							for="codeConfirmation"
							class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase"
						>
							Code de confirmation
						</label>
						<div class="relative">
							<KeyRound size={18} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
							<input
								id="codeConfirmation"
								type="text"
								inputmode="numeric"
								maxlength="6"
								bind:value={codeConfirmation}
								required
								placeholder="123456"
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-4 pl-10 text-center font-mono text-lg tracking-[0.3em] text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					<div class="flex items-center justify-between text-xs">
						<span class="text-slate-500">
							{#if secondesRestantes > 0}
								Le code expire dans <span class="font-mono text-sky-400"
									>{Math.floor(secondesRestantes / 60)}:{String(secondesRestantes % 60).padStart(2, '0')}</span
								>
							{:else}
								<span class="text-rose-400">Le code a expiré</span>
							{/if}
						</span>
						<button
							type="button"
							on:click={demanderNouveauCode}
							class="font-semibold text-sky-400 hover:text-sky-300"
						>
							Renvoyer un code
						</button>
					</div>

					{#if messageInfo}
						<div class="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-sm text-sky-400">
							<CheckCircle2 size={16} />{messageInfo}
						</div>
					{/if}
					{#if erreur}
						<div class="flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
							<AlertCircle size={16} />{erreur}
						</div>
					{/if}

					<button
						type="submit"
						disabled={chargement || secondesRestantes <= 0}
						class="mt-2 flex items-center justify-center gap-2 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if chargement}
							<Loader2 size={18} class="animate-spin" />
							Vérification…
						{:else}
							Confirmer mon email
						{/if}
					</button>
				</form>
			{:else}
				<h2 class="mb-1 text-lg font-bold text-white"><center>Nouveau compte administrateur</center></h2>
				<p class="mb-6 text-sm text-slate-400">
					Réservé à la prise de service. Un code d'inscription est requis, communiqué en
					interne.
				</p>

				<form on:submit|preventDefault={soumettreFormulaire} class="flex flex-col gap-4">
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="prenom" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
								Prénom
							</label>
							<div class="relative">
								<User size={16} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
								<input
									id="prenom"
									bind:value={prenom}
									required
									class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
								/>
							</div>
						</div>
						<div>
							<label for="nom" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
								Nom
							</label>
							<input
								id="nom"
								bind:value={nom}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					<div>
						<label for="email" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
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
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					<div>
						<label for="telephone" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
							Téléphone
						</label>
						<div class="relative">
							<Phone size={18} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
							<input
								id="telephone"
								type="tel"
								bind:value={telephone}
								placeholder="+229 01 97 70 16 16"
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="motDePasse" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
								Mot de passe
							</label>
							<div class="relative">
								<Lock size={16} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
								<input
									id="motDePasse"
									type="password"
									bind:value={motDePasse}
									required
									class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-3 pl-9 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
								/>
							</div>
						</div>
						<div>
							<label for="confirmation" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
								Confirmer
							</label>
							<input
								id="confirmation"
								type="password"
								bind:value={confirmationMotDePasse}
								required
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
							/>
						</div>
					</div>

					<div>
						<label for="role" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
							Rôle
						</label>
						<select
							id="role"
							bind:value={role}
							class="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
						>
							<option value="admin">Administrateur</option>
							<option value="super_admin">Super administrateur</option>
						</select>
					</div>

					<div>
						<label for="code" class="mb-1.5 block text-xs font-semibold tracking-wide text-slate-500 uppercase">
							Code d'inscription
						</label>
						<div class="relative">
							<KeyRound size={18} class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-500" />
							<input
								id="code"
								type="text"
								bind:value={codeInscription}
								required
								placeholder="Fourni par le responsable du service"
								class="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-2.5 pr-4 pl-10 text-sm text-white placeholder-slate-600 outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
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
							Création…
						{:else}
							Créer mon compte
						{/if}
					</button>

					<a href="/login" class="text-center text-xs text-slate-500 hover:text-sky-400">
						Déjà un compte ? Se connecter
					</a>
				</form>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-slate-600">
			© 2027 Merveille ALLIHA GLE - Tous droits réservés SSI-3
		</p>
	</div>
</div>
