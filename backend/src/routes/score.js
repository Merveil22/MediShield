import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';

export const routeurScore = Router();

/**
 * GET /api/security-score
 * Calcule un score de sécurité global (0-100) à partir des alertes
 * des dernières 24h et de l'état des équipements — même logique que
 * pour la génération de rapports PDF, mais utilisable en direct sur
 * le dashboard.
 */
routeurScore.get('/security-score', verifierToken, async (req, res) => {
	try {
		const [[stats]] = await pool.query(
			`SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN gravite = 'critique' THEN 1 ELSE 0 END) AS critiques,
                SUM(CASE WHEN gravite = 'elevee' THEN 1 ELSE 0 END) AS elevees
             FROM alertes
             WHERE date_heure >= NOW() - INTERVAL 24 HOUR`
		);

		const [[equipements]] = await pool.query(
			`SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN statut = 'hors_service' THEN 1 ELSE 0 END) AS horsService
             FROM equipements`
		);

		const total = Number(stats.total) || 0;
		const critiques = Number(stats.critiques) || 0;
		const elevees = Number(stats.elevees) || 0;
		const horsService = Number(equipements.horsService) || 0;

		// Formule simple et transparente : on part de 100, on retire
		// des points selon la gravité et l'indisponibilité matérielle.
		let score = 100 - critiques * 8 - elevees * 3 - Math.max(0, total - critiques - elevees) * 1;
		score -= horsService * 5;
		score = Math.max(0, Math.min(100, Math.round(score)));

		const etat = score >= 90 ? 'Excellent' : score >= 60 ? 'Moyen' : 'Critique';

		res.json({
			score,
			etat,
			alertesTotal: total,
			alertesCritiques: critiques,
			alertesElevees: elevees,
			equipementsHorsService: horsService
		});
	} catch (erreur) {
		console.error('Erreur GET /security-score :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
