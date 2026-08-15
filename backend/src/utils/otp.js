import { randomInt } from 'node:crypto';
import { pool } from '../config/db.js';

const DUREE_OTP_SECONDES = Number(process.env.OTP_DUREE_SECONDES || 20);

/**
 * Génère un code OTP à 6 chiffres.
 * On utilise crypto.randomInt (et non Math.random) car c'est un
 * générateur cryptographiquement sûr : Math.random peut, en théorie,
 * être prédit — inacceptable pour un code de sécurité.
 */
function genererCodeOtp() {
	return String(randomInt(100000, 999999));
}

/**
 * Crée un nouvel OTP pour un utilisateur, l'enregistre en base avec
 * sa date d'expiration (maintenant + DUREE_OTP_SECONDES), et renvoie
 * le code généré pour qu'on puisse l'envoyer par email/SMS/WhatsApp.
 *
 * Important : on invalide d'abord les anciens OTP non utilisés de cet
 * utilisateur, pour qu'un seul code soit valide à la fois.
 */
export async function creerOtp(utilisateurId, canal) {
	const code = genererCodeOtp();

	// On invalide tous les OTP précédents encore "actifs" de cet utilisateur
	await pool.query(
		'UPDATE otp SET utilise = TRUE WHERE utilisateur_id = ? AND utilise = FALSE',
		[utilisateurId]
	);

	// expire_le = maintenant + 20 secondes (ou la valeur du .env)
	await pool.query(
		`INSERT INTO otp (utilisateur_id, code, canal, expire_le)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
		[utilisateurId, code, canal, DUREE_OTP_SECONDES]
	);

	return { code, dureeValiditeSecondes: DUREE_OTP_SECONDES };
}

/**
 * Vérifie un OTP saisi par l'utilisateur.
 * Renvoie { valide: true } si le code correspond ET n'a pas expiré
 * ET n'a pas déjà été utilisé — sinon { valide: false, raison }.
 */
export async function verifierOtp(utilisateurId, codeSaisi) {
	const [lignes] = await pool.query(
		`SELECT id, code, expire_le, utilise
         FROM otp
         WHERE utilisateur_id = ?
         ORDER BY cree_le DESC
         LIMIT 1`,
		[utilisateurId]
	);

	if (lignes.length === 0) {
		return { valide: false, raison: "Aucun OTP n'a été généré pour cet utilisateur." };
	}

	const otp = lignes[0];

	if (otp.utilise) {
		return { valide: false, raison: 'Ce code a déjà été utilisé.' };
	}

	if (new Date(otp.expire_le).getTime() < Date.now()) {
		return { valide: false, raison: 'Le code a expiré (délai de 20 secondes dépassé).' };
	}

	if (otp.code !== codeSaisi) {
		return { valide: false, raison: 'Code incorrect.' };
	}

	// Le code est valide : on le marque comme utilisé pour empêcher
	// une seconde utilisation (protection contre le rejeu).
	await pool.query('UPDATE otp SET utilise = TRUE WHERE id = ?', [otp.id]);

	return { valide: true };
}
