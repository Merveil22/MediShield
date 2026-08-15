<script lang="ts">
	import { goto } from '$app/navigation';
	import { Shield, User, Mail, Phone, Lock, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-svelte';
	import { inscription, ErreurApi } from '$lib/api/auth';

	let nom = '';
	let prenom = '';
	let email = '';
	let telephone = '';
	let motDePasse = '';
	let confirmationMotDePasse = '';
	let codeInscription = '';
	let role = 'admin';

	let chargement = false;
	let erreur = '';
	let succes = false;

	// Si static/logo.png n'existe pas, on retombe sur l'icône bouclier.
	let logoManquant = false;

	async function soumettre() {
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
			await inscription({ nom, prenom, email, telephone, motDePasse, codeInscription, role });
			succes = true;
			setTimeout(() => goto('/login'), 2000);
		} catch (e) {
			erreur = e instanceof ErreurApi ? e.message : 'Erreur de connexion au serveur.';
		} finally {
			chargement = false;
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
				<p class="font-mono text-xs tracking-widest text-slate-500">CRÉATION DE COMPTE ADMIN</p>
			</div>
			<p class="text-sm text-slate-500">CNHU Hubert Koutoukou MAGA</p>
		</div>

		<div class="glass rounded-2xl p-8">
			{#if succes}
				<div class="flex flex-col items-center gap-3 py-4 text-center">
					<CheckCircle2 size={40} class="text-emerald-400" />
					<p class="text-white">Compte créé avec succès.</p>
					<p class="text-sm text-slate-400">Redirection vers la page de connexion…</p>
				</div>
			{:else}
				<h2 class="mb-1 text-lg font-bold text-white"><center>Nouveau Compte Administrateur</center></h2>
				<p class="mb-6 text-sm text-slate-400">
					Réservé à la prise de service. Un code d'inscription est requis, communiqué en
					interne.
				</p>

				<form on:submit|preventDefault={soumettre} class="flex flex-col gap-4">
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
								placeholder="+229 00 00 00 00"
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

					<a
						href="/login"
						class="text-center text-xs text-slate-500 hover:text-sky-400"
					>
						Déjà un compte ? Se connecter
					</a>
				</form>
			{/if}
		</div>

		<p class="mt-6 text-center text-xs text-slate-600">
			© 2027 Nelly & Merveille - Tous droits réservés SSI-3
		</p>
	</div>
</div>
