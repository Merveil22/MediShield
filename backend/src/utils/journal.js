import { pool } from '../config/db.js';

export async function enregistrerActivite({ utilisateurId, action, details, ipUtilisateur }) {
	try {
		await pool.query(
			`INSERT INTO activites (utilisateur_id, action, details, ip_utilisateur)
             VALUES (?, ?, ?, ?)`,
			[utilisateurId, action, details || null, ipUtilisateur || null]
		);
	} catch (erreur) {
		
		console.error('Erreur enregistrement activité :', erreur);
	}
}

export async function creerNotification({ utilisateurId, alerteId, type, message }) {
	try {
		await pool.query(
			`INSERT INTO notifications (utilisateur_id, alerte_id, type, canal, message)
             VALUES (?, ?, ?, 'dashboard', ?)`,
			[utilisateurId, alerteId || null, type, message]
		);
	} catch (erreur) {
		console.error('Erreur création notification :', erreur);
	}
}
