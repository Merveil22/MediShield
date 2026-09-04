import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';

export const routeurNotifications = Router();

routeurNotifications.get('/notifications', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query(
			`SELECT * FROM notifications WHERE utilisateur_id = ? ORDER BY envoye_le DESC LIMIT 30`,
			[req.utilisateur.utilisateurId]
		);
		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /notifications :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurNotifications.patch('/notifications/:id/lue', verifierToken, async (req, res) => {
	try {
		await pool.query(
			'UPDATE notifications SET lue = TRUE WHERE id = ? AND utilisateur_id = ?',
			[req.params.id, req.utilisateur.utilisateurId]
		);
		res.json({ message: 'Notification marquée comme lue.' });
	} catch (erreur) {
		console.error('Erreur PATCH /notifications/:id/lue :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurNotifications.patch('/notifications/tout-lire', verifierToken, async (req, res) => {
	try {
		await pool.query('UPDATE notifications SET lue = TRUE WHERE utilisateur_id = ?', [
			req.utilisateur.utilisateurId
		]);
		res.json({ message: 'Toutes les notifications ont été marquées comme lues.' });
	} catch (erreur) {
		console.error('Erreur PATCH /notifications/tout-lire :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
