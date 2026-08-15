<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Shield,
		LayoutDashboard,
		BellRing,
		Share2,
		History,
		Settings,
		ShieldAlert,
		ShieldCheck,
		BarChart3,
		FileText,
		UserCog,
		LogOut,
		ClipboardList,
		Bell,
		Check
	} from 'lucide-svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import {
		recupererProfil,
		listerNotifications,
		marquerNotificationLue,
		marquerToutesNotificationsLues
	} from '$lib/api/ressources';

	// ------------------------------------------------------------------
	// Authentification + profil admin
	// ------------------------------------------------------------------

	let nomAdmin = '';
	let chargementProfil = true;

	onMount(async () => {
		const token = localStorage.getItem('medishield_token');
		if (!token) {
			goto('/login');
			return;
		}
		try {
			const profil = await recupererProfil();
			nomAdmin = `${profil.prenom} ${profil.nom}`;
			await chargerNotifications();
		} catch {
			// Token invalide/expiré -> retour au login
			localStorage.removeItem('medishield_token');
			goto('/login');
		} finally {
			chargementProfil = false;
		}
	});

	function deconnexion() {
		localStorage.removeItem('medishield_token');
		goto('/login');
	}

	// Mode IDS/IPS — état partagé visuel (branché plus tard au backend
	// une fois Suricata connecté).
	let modeIps = false;

	// Si static/logo.png n'existe pas, on retombe sur l'icône bouclier.
	let logoManquant = false;

	// ------------------------------------------------------------------
	// Notifications (cloche 🔔)
	// ------------------------------------------------------------------

	type Notification = { id: number; type: string; message: string; lue: boolean; envoye_le: string };

	let notifications: Notification[] = [];
	let panneauNotifOuvert = false;

	$: nbNonLues = notifications.filter((n) => !n.lue).length;

	async function chargerNotifications() {
		try {
			notifications = await listerNotifications();
		} catch {
			// silencieux
		}
	}

	async function marquerLue(n: Notification) {
		if (n.lue) return;
		await marquerNotificationLue(n.id);
		notifications = notifications.map((x) => (x.id === n.id ? { ...x, lue: true } : x));
	}

	async function toutMarquerLu() {
		await marquerToutesNotificationsLues();
		notifications = notifications.map((x) => ({ ...x, lue: true }));
	}

	// ------------------------------------------------------------------
	// Navigation
	// ------------------------------------------------------------------

	const liensNav = [
		{ href: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
		{ href: '/alertes', icon: BellRing, label: 'Alertes' },
		{ href: '/reseau', icon: Share2, label: 'Réseau' },
		{ href: '/logs', icon: History, label: 'Journaux' },
		{ href: '/gestion-ip', icon: Shield, label: 'Gestion des IP' },
		{ href: '/statistiques', icon: BarChart3, label: 'Statistiques' },
		{ href: '/rapports', icon: FileText, label: 'Rapports' },
		{ href: '/activites', icon: ClipboardList, label: "Journal d'activités" },
		{ href: '/administration', icon: UserCog, label: 'Administration' },
		{ href: '/parametres', icon: Settings, label: 'Paramètres' }
	];

	$: cheminActuel = $page.url.pathname;

	// Titre de page affiché dans l'en-tête, déduit de l'URL
	$: titrePage =
		liensNav.find((l) => l.href === cheminActuel)?.label === 'Tableau de bord'
			? "IDS - Réseau Hospitalier"
			: liensNav.find((l) => l.href === cheminActuel)?.label || 'MediShield';
</script>

<div class="relative flex min-h-screen">
	<div class="bg-grid pointer-events-none fixed inset-0 z-0" />

	<!-- Barre latérale -->
	<aside
		class="relative z-10 hidden w-64 shrink-0 border-r border-slate-800/60 bg-slate-950/85 md:flex md:flex-col"
	>
		<div class="flex items-center gap-3 p-5">
			<!--
				Affiche automatiquement static/logo.png dès qu'il est
				présent. S'il est absent, on retombe sur l'icône bouclier.
				Dépose ton fichier ici : medishield/frontend/static/logo.png
			-->
			<div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl">
				{#if !logoManquant}
					<img
						src="/logo.png"
						alt="Logo MediShield"
						class="h-full w-full object-contain"
						on:error={() => (logoManquant = true)}
					/>
				{:else}
					<Shield size={30} class="text-sky-400" />
				{/if}
			</div>
			<span class="truncate text-xl font-extrabold tracking-tight">MediShield</span>
		</div>
		<p class="px-5 pb-4 font-mono text-xs text-slate-500">SOC - Supervision réseau</p>

		<nav class="flex flex-col gap-1 overflow-y-auto px-3">
			{#each liensNav as item}
				{@const actif = cheminActuel === item.href}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors"
					class:border-transparent={!actif}
					class:text-slate-300={!actif}
					class:hover:bg-sky-400={!actif}
					class:hover:bg-opacity-5={!actif}
					class:border-sky-400={actif}
					class:bg-sky-400={actif}
					class:bg-opacity-10={actif}
					class:text-white={actif}
				>
					<svelte:component this={item.icon} size={18} class={actif ? 'text-sky-400' : ''} />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="mt-auto w-full px-5 py-4">
			<div class="mb-3 border-t border-slate-800" />
			<p class="text-xs text-slate-500">CHU Hubert Koutoukou MAGA</p>
			<p class="text-xs text-slate-600">© 2027 Nelly & Merveille - Tous droits réservés SSI-3</p>
		</div>
	</aside>

	<!-- Contenu principal -->
	<div class="relative z-10 flex-1 overflow-x-hidden">
		<!-- En-tête -->
		<header
			class="flex flex-wrap items-center justify-between gap-4 border-b border-sky-400/15 bg-slate-950/75 px-8 py-4 backdrop-blur-xl"
		>
			<div class="min-w-0">
				<div class="flex items-center gap-2">
					<span class="live-dot h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" />
					<span class="font-mono text-xs tracking-widest whitespace-nowrap text-rose-400"
						>SUPERVISION EN DIRECT</span
					>
				</div>
				<h1 class="glow-text truncate text-lg font-bold">{titrePage}</h1>
			</div>

			<div class="flex flex-wrap items-center gap-4">
				{#if modeIps}
					<Badge color="orange"><ShieldAlert size={14} /> IPS · PRÉVENTION ACTIVE</Badge>
				{:else}
					<Badge color="cyan"><ShieldCheck size={14} /> IDS · DÉTECTION</Badge>
				{/if}
				<Switch bind:checked={modeIps} label="Mode IPS" />

				<div class="relative">
					<button
						type="button"
						on:click={() => (panneauNotifOuvert = !panneauNotifOuvert)}
						class="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800/60 hover:text-white"
					>
						<Bell size={18} />
						{#if nbNonLues > 0}
							<span
								class="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white"
							>
								{nbNonLues}
							</span>
						{/if}
					</button>

					{#if panneauNotifOuvert}
						<div
							class="glass absolute top-full right-0 z-20 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl p-0"
						>
							<div class="flex items-center justify-between border-b border-slate-800 p-3">
								<span class="text-xs font-semibold text-slate-400">Notifications</span>
								{#if nbNonLues > 0}
									<button
										on:click={toutMarquerLu}
										class="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300"
									>
										<Check size={12} /> Tout marquer lu
									</button>
								{/if}
							</div>
							{#if notifications.length === 0}
								<p class="p-4 text-center text-xs text-slate-500">Aucune notification.</p>
							{:else}
								{#each notifications as n (n.id)}
									<button
										on:click={() => marquerLue(n)}
										class="flex w-full flex-col gap-0.5 border-b border-slate-800/60 p-3 text-left hover:bg-sky-400/5"
										class:opacity-50={n.lue}
									>
										<span class="text-xs text-slate-300">{n.message}</span>
										<span class="text-[10px] text-slate-600"
											>{new Date(n.envoye_le).toLocaleString('fr-FR')}</span
										>
									</button>
								{/each}
							{/if}
						</div>
					{/if}
				</div>

				<div class="flex items-center gap-2.5 border-l border-slate-800 pl-4">
					<div class="relative shrink-0">
						<div
							class="flex h-9 w-9 items-center justify-center rounded-full bg-sky-900 text-sm font-bold"
						>
							{chargementProfil ? '…' : nomAdmin.charAt(0) || 'A'}
						</div>
						<span
							class="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 bg-emerald-400"
						/>
					</div>
					<div class="flex flex-col leading-tight">
						<span class="text-sm font-semibold whitespace-nowrap text-white">
							{chargementProfil ? 'Chargement…' : nomAdmin || 'Administrateur'}
						</span>
						<span class="flex items-center gap-1 text-xs whitespace-nowrap text-emerald-400">
							<span class="h-1.5 w-1.5 rounded-full bg-emerald-400" />
							En ligne
						</span>
					</div>
				</div>

				<button
					type="button"
					on:click={deconnexion}
					class="flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-slate-500 transition-colors hover:text-rose-400"
				>
					<LogOut size={14} />
					Déconnexion
				</button>
			</div>
		</header>
		<div class="gradient-bar h-[3px] w-full" />

		<slot />
	</div>
</div>
