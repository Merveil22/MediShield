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

export class ErreurApi extends Error {
	emailNonConfirme?: boolean;
	utilisateurId?: number;

	constructor(message: string, options?: { emailNonConfirme?: boolean; utilisateurId?: number }) {
		super(message);
		this.emailNonConfirme = options?.emailNonConfirme;
		this.utilisateurId = options?.utilisateurId;
	}
}

/**
 * Crée un nouveau compte administrateur (protégé par un code
 * d'inscription communiqué en interne). Le compte n'est PAS
 * utilisable tant que l'email n'a pas été confirmé (voir
 * confirmerEmail ci-dessous) — /login le refusera jusque-là.
 */
export async function inscription(donnees: {
	nom: string;
	prenom: string;
	email: string;
	telephone: string;
	motDePasse: string;
	codeInscription: string;
	role?: string;
}): Promise<{ message: string; utilisateurId: number; dureeValiditeSecondes: number }> {
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
 * Valide le code de confirmation envoyé par email après inscription.
 */
export async function confirmerEmail(
	utilisateurId: number,
	code: string
): Promise<{ message: string }> {
	const reponse = await fetch(`${URL_API}/confirm-email`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ utilisateurId, code })
	});

	const resultat = await reponse.json();

	if (!reponse.ok) {
		throw new ErreurApi(resultat.erreur || 'Code de confirmation invalide.');
	}

	return resultat;
}

/**
 * Redemande un code de confirmation (si le précédent a expiré).
 */
export async function renvoyerConfirmation(
	utilisateurId: number
): Promise<{ message: string; dureeValiditeSecondes: number }> {
	const reponse = await fetch(`${URL_API}/resend-confirmation`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ utilisateurId })
	});

	const resultat = await reponse.json();

	if (!reponse.ok) {
		throw new ErreurApi(resultat.erreur || "Échec de l'envoi du nouveau code.");
	}

	return resultat;
}

/**
 * Étape 1 : envoie email + mot de passe.
 * Si le compte n'est pas confirmé, l'erreur renvoyée contient
 * emailNonConfirme=true et utilisateurId, pour rediriger l'utilisateur
 * vers l'étape de confirmation plutôt que de simplement échouer.
 */
export async function login(email: string, motDePasse: string): Promise<ReponseLogin> {
	const reponse = await fetch(`${URL_API}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, motDePasse })
	});

	const donnees = await reponse.json();

	if (!reponse.ok) {
		throw new ErreurApi(donnees.erreur || 'Échec de la connexion.', {
			emailNonConfirme: donnees.emailNonConfirme,
			utilisateurId: donnees.utilisateurId
		});
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
