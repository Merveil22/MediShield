import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';

export const routeurActivites = Router();

routeurActivites.get('/activites', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query(
			`SELECT a.*, u.nom, u.prenom
             FROM activites a
             JOIN utilisateurs u ON u.id = a.utilisateur_id
             ORDER BY a.date_heure DESC
             LIMIT 200`
		);
		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /activites :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
