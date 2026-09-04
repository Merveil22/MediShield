import { randomInt } from 'node:crypto';
import { pool } from '../config/db.js';

const DUREE_CONFIRMATION_SECONDES = 15 * 60; 

function genererCode() {
	return String(randomInt(100000, 999999));
}

export async function creerConfirmationEmail(utilisateurId) {
	const code = genererCode();

	await pool.query(
		'UPDATE confirmations_email SET utilise = TRUE WHERE utilisateur_id = ? AND utilise = FALSE',
		[utilisateurId]
	);

	await pool.query(
		`INSERT INTO confirmations_email (utilisateur_id, code, expire_le)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))`,
		[utilisateurId, code, DUREE_CONFIRMATION_SECONDES]
	);

	return { code, dureeValiditeSecondes: DUREE_CONFIRMATION_SECONDES };
}

export async function verifierConfirmationEmail(utilisateurId, codeSaisi) {
	const [lignes] = await pool.query(
		`SELECT id, code, expire_le, utilise
         FROM confirmations_email
         WHERE utilisateur_id = ?
         ORDER BY cree_le DESC
         LIMIT 1`,
		[utilisateurId]
	);

	if (lignes.length === 0) {
		return { valide: false, raison: 'Aucun code de confirmation trouvé.' };
	}

	const confirmation = lignes[0];

	if (confirmation.utilise) {
		return { valide: false, raison: 'Ce code a déjà été utilisé.' };
	}
	if (new Date(confirmation.expire_le).getTime() < Date.now()) {
		return { valide: false, raison: 'Le code a expiré. Demande un nouveau code.' };
	}
	if (confirmation.code !== codeSaisi) {
		return { valide: false, raison: 'Code incorrect.' };
	}

	await pool.query('UPDATE confirmations_email SET utilise = TRUE WHERE id = ?', [confirmation.id]);
	await pool.query('UPDATE utilisateurs SET email_confirme = TRUE WHERE id = ?', [utilisateurId]);

	return { valide: true };
}
