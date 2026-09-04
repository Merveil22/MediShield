import { randomInt } from 'node:crypto';
import { pool } from '../config/db.js';

const DUREE_OTP_SECONDES = Number(process.env.OTP_DUREE_SECONDES || 20);


function genererCodeOtp() {
	return String(randomInt(100000, 999999));
}

export async function creerOtp(utilisateurId, canal) {
	const code = genererCodeOtp();

	await pool.query(
		'UPDATE otp SET utilise = TRUE WHERE utilisateur_id = ? AND utilise = FALSE',
		[utilisateurId]
	);

	await pool.query(
		`INSERT INTO otp (utilisateur_id, code, canal, expire_le)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
		[utilisateurId, code, canal, DUREE_OTP_SECONDES]
	);

	return { code, dureeValiditeSecondes: DUREE_OTP_SECONDES };
}

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

	await pool.query('UPDATE otp SET utilise = TRUE WHERE id = ?', [otp.id]);

	return { valide: true };
}
