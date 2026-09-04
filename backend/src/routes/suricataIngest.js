import { Router } from 'express';
import { pool } from '../config/db.js';
import { creerNotification } from '../utils/journal.js';

export const routeurIngestionSuricata = Router();

/**
 * Convertit la sévérité Suricata (1 = la plus grave, 3 = la moins
 * grave — c'est l'inverse de l'intuition !) vers nos niveaux de
 * gravité internes.
 */
function convertirGravite(severiteSuricata) {
	if (severiteSuricata === 1) return 'critique';
	if (severiteSuricata === 2) return 'elevee';
	if (severiteSuricata === 3) return 'moyenne';
	return 'faible';
}

/**
 * POST /api/suricata/ingest
 * Reçoit UN événement d'alerte au format eve.json de Suricata,
 * envoyé par le petit agent qui tourne sur la VM Ubuntu.
 *
 * Pas de JWT ici : ce n'est pas un administrateur qui appelle cette
 * route, mais une machine (Suricata). On protège donc avec une clé
 * API partagée (SURICATA_API_KEY dans .env) au lieu d'un token de
 * session.
 */
routeurIngestionSuricata.post('/suricata/ingest', async (req, res) => {
	try {
		const cleFournie = req.headers['x-api-key'];
		if (!cleFournie || cleFournie !== process.env.SURICATA_API_KEY) {
			return res.status(401).json({ erreur: 'Clé API invalide ou manquante.' });
		}

		const evenement = req.body;

		// On ne traite que les vrais événements d'alerte — eve.json
		// contient aussi des stats, du DNS, etc. (l'agent Ubuntu filtre
		// déjà, mais on revérifie ici par sécurité).
		if (evenement.event_type !== 'alert' || !evenement.alert) {
			return res.status(200).json({ message: 'Événement ignoré (pas une alerte).' });
		}

		const gravite = convertirGravite(evenement.alert.severity);

		const [resultat] = await pool.query(
			`INSERT INTO alertes (date_heure, ip_source, ip_cible, type_attaque, gravite, message, suricata_event_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[
				new Date(evenement.timestamp),
				evenement.src_ip || 'inconnue',
				evenement.dest_ip || null,
				evenement.alert.signature || 'Signature inconnue',
				gravite,
				evenement.alert.signature || 'Alerte Suricata',
				String(evenement.alert.signature_id || '')
			]
		);

		// Notification uniquement pour les alertes vraiment sérieuses,
		// pour ne pas noyer l'admin sous des alertes "Informational".
		if (gravite === 'critique' || gravite === 'elevee') {
			// On notifie tous les super_admin (pas un utilisateur précis
			// puisque personne n'est "connecté" quand Suricata détecte).
			const [admins] = await pool.query(
				"SELECT id FROM utilisateurs WHERE role = 'super_admin'"
			);
			for (const admin of admins) {
				await creerNotification({
					utilisateurId: admin.id,
					alerteId: resultat.insertId,
					type: 'alerte_suricata',
					message: `${gravite === 'critique' ? '🚨' : '⚠️'} ${evenement.alert.signature} depuis ${evenement.src_ip}`
				});
			}
		}

		res.status(201).json({ id: resultat.insertId, message: 'Alerte enregistrée.' });
	} catch (erreur) {
		console.error('Erreur POST /suricata/ingest :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
