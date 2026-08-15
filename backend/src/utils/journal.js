import { pool } from '../config/db.js';

/**
 * Enregistre une action administrateur dans la table `activites`
 * (traçabilité/audit — utile pour les rapports de conformité).
 */
export async function enregistrerActivite({ utilisateurId, action, details, ipUtilisateur }) {
	try {
		await pool.query(
			`INSERT INTO activites (utilisateur_id, action, details, ip_utilisateur)
             VALUES (?, ?, ?, ?)`,
			[utilisateurId, action, details || null, ipUtilisateur || null]
		);
	} catch (erreur) {
		// Une erreur de journalisation ne doit jamais faire échouer
		// l'action principale — on log juste côté serveur.
		console.error('Erreur enregistrement activité :', erreur);
	}
}

/**
 * Crée une notification pour un administrateur (affichée dans la
 * cloche 🔔 du dashboard).
 */
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
