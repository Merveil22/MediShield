import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';

export const routeurLogs = Router();

routeurLogs.get('/logs', verifierToken, async (req, res) => {
	try {
		const { source, type, recherche } = req.query;
		const conditions = [];
		const valeurs = [];

		if (source) {
			conditions.push('source = ?');
			valeurs.push(source);
		}
		if (type) {
			conditions.push('type = ?');
			valeurs.push(type);
		}
		if (recherche) {
			conditions.push('message LIKE ?');
			valeurs.push(`%${recherche}%`);
		}

		const clauseOu = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

		const [lignes] = await pool.query(
			`SELECT * FROM logs ${clauseOu} ORDER BY date_heure DESC LIMIT 300`,
			valeurs
		);

		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /logs :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
