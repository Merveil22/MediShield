import { URL_API } from './auth';

function enTetes() {
	const token = localStorage.getItem('medishield_token');
	return {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${token}`
	};
}

async function traiterReponse(reponse: Response) {
	const donnees = await reponse.json();
	if (!reponse.ok) throw new Error(donnees.erreur || 'Erreur serveur.');
	return donnees;
}

// ---- Profil admin ----
export async function recupererProfil() {
	const reponse = await fetch(`${URL_API}/me`, { headers: enTetes() });
	return traiterReponse(reponse);
}

// ---- Alertes ----
export async function listerAlertes(filtres: Record<string, string> = {}) {
	const params = new URLSearchParams(filtres).toString();
	const reponse = await fetch(`${URL_API}/alerts${params ? `?${params}` : ''}`, {
		headers: enTetes()
	});
	return traiterReponse(reponse);
}

export async function majAlerte(id: number, statut: string, notes?: string) {
	const reponse = await fetch(`${URL_API}/alerts/${id}`, {
		method: 'PATCH',
		headers: enTetes(),
		body: JSON.stringify({ statut, notes })
	});
	return traiterReponse(reponse);
}

export async function creerAlerte(alerte: {
	ip_source: string;
	ip_cible?: string;
	type_attaque: string;
	gravite: string;
	message: string;
}) {
	const reponse = await fetch(`${URL_API}/alerts`, {
		method: 'POST',
		headers: enTetes(),
		body: JSON.stringify(alerte)
	});
	return traiterReponse(reponse);
}

// ---- Gestion IP ----
export async function listerIpBloquees() {
	const reponse = await fetch(`${URL_API}/block-ip`, { headers: enTetes() });
	return traiterReponse(reponse);
}

export async function bloquerIp(donnees: {
	ip: string;
	raison?: string;
	duree?: string;
	commentaire?: string;
}) {
	const reponse = await fetch(`${URL_API}/block-ip`, {
		method: 'POST',
		headers: enTetes(),
		body: JSON.stringify(donnees)
	});
	return traiterReponse(reponse);
}

export async function debloquerIp(id: number) {
	const reponse = await fetch(`${URL_API}/block-ip/${id}`, {
		method: 'DELETE',
		headers: enTetes()
	});
	return traiterReponse(reponse);
}

// ---- Logs ----
export async function listerLogs(filtres: Record<string, string> = {}) {
	const params = new URLSearchParams(filtres).toString();
	const reponse = await fetch(`${URL_API}/logs${params ? `?${params}` : ''}`, {
		headers: enTetes()
	});
	return traiterReponse(reponse);
}

// ---- Équipements / Réseau ----
export async function listerEquipements() {
	const reponse = await fetch(`${URL_API}/network`, { headers: enTetes() });
	return traiterReponse(reponse);
}

export async function ajouterEquipement(donnees: {
	nom: string;
	ip: string;
	type: string;
	vlan?: string;
	description?: string;
}) {
	const reponse = await fetch(`${URL_API}/network`, {
		method: 'POST',
		headers: enTetes(),
		body: JSON.stringify(donnees)
	});
	return traiterReponse(reponse);
}

// ---- Rapports ----
export async function listerRapports() {
	const reponse = await fetch(`${URL_API}/reports`, { headers: enTetes() });
	return traiterReponse(reponse);
}

export async function genererRapport(donnees: {
	type: string;
	periodeDebut: string;
	periodeFin: string;
}) {
	const reponse = await fetch(`${URL_API}/reports/generate`, {
		method: 'POST',
		headers: enTetes(),
		body: JSON.stringify(donnees)
	});
	return traiterReponse(reponse);
}

export function urlTelechargementRapport(id: number) {
	const token = localStorage.getItem('medishield_token');
	return `${URL_API}/reports/${id}/download?token=${token}`;
}

// ---- Mot de passe ----
export async function changerMotDePasse(motDePasseActuel: string, nouveauMotDePasse: string) {
	const reponse = await fetch(`${URL_API}/me/password`, {
		method: 'PATCH',
		headers: enTetes(),
		body: JSON.stringify({ motDePasseActuel, nouveauMotDePasse })
	});
	return traiterReponse(reponse);
}

// ---- Paramètres ----
export async function listerParametres() {
	const reponse = await fetch(`${URL_API}/parametres`, { headers: enTetes() });
	return traiterReponse(reponse);
}

export async function majParametre(cle: string, valeur: string) {
	const reponse = await fetch(`${URL_API}/parametres/${cle}`, {
		method: 'PATCH',
		headers: enTetes(),
		body: JSON.stringify({ valeur })
	});
	return traiterReponse(reponse);
}

// ---- Score de sécurité ----
export async function recupererScoreSecurite() {
	const reponse = await fetch(`${URL_API}/security-score`, { headers: enTetes() });
	return traiterReponse(reponse);
}

// ---- Notifications ----
export async function listerNotifications() {
	const reponse = await fetch(`${URL_API}/notifications`, { headers: enTetes() });
	return traiterReponse(reponse);
}

export async function marquerNotificationLue(id: number) {
	const reponse = await fetch(`${URL_API}/notifications/${id}/lue`, {
		method: 'PATCH',
		headers: enTetes()
	});
	return traiterReponse(reponse);
}

export async function marquerToutesNotificationsLues() {
	const reponse = await fetch(`${URL_API}/notifications/tout-lire`, {
		method: 'PATCH',
		headers: enTetes()
	});
	return traiterReponse(reponse);
}

// ---- Activités (journal d'audit) ----
export async function listerActivites() {
	const reponse = await fetch(`${URL_API}/activites`, { headers: enTetes() });
	return traiterReponse(reponse);
}
