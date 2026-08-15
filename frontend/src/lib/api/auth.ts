// Point de configuration unique de l'URL du backend.
// Change cette valeur si ton API Node.js/Express tourne ailleurs.
export const URL_API = 'http://localhost:4000/api';

export type ReponseLogin = {
	message: string;
	utilisateurId: number;
	dureeValiditeSecondes: number;
};

export type ReponseOtp = {
	message: string;
	token: string;
};

export class ErreurApi extends Error {}

/**
 * Crée un nouveau compte administrateur (protégé par un code
 * d'inscription communiqué en interne).
 */
export async function inscription(donnees: {
	nom: string;
	prenom: string;
	email: string;
	telephone: string;
	motDePasse: string;
	codeInscription: string;
	role?: string;
}): Promise<{ message: string }> {
	const reponse = await fetch(`${URL_API}/signup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(donnees)
	});

	const resultat = await reponse.json();

	if (!reponse.ok) {
		throw new ErreurApi(resultat.erreur || "Échec de l'inscription.");
	}

	return resultat;
}

/**
 * Étape 1 : envoie email + mot de passe.
 * Si correct, le backend génère et envoie un OTP par email, et
 * renvoie l'id utilisateur + la durée de validité du code.
 */
export async function login(email: string, motDePasse: string): Promise<ReponseLogin> {
	const reponse = await fetch(`${URL_API}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, motDePasse })
	});

	const donnees = await reponse.json();

	if (!reponse.ok) {
		throw new ErreurApi(donnees.erreur || 'Échec de la connexion.');
	}

	return donnees;
}

/**
 * Étape 2 : envoie l'id utilisateur + le code OTP saisi.
 * Si valide, le backend renvoie un token JWT.
 */
export async function verifierOtp(utilisateurId: number, code: string): Promise<ReponseOtp> {
	const reponse = await fetch(`${URL_API}/verify-otp`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ utilisateurId, code })
	});

	const donnees = await reponse.json();

	if (!reponse.ok) {
		throw new ErreurApi(donnees.erreur || 'Code OTP invalide.');
	}

	return donnees;
}
