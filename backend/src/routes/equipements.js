import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';

export const routeurEquipements = Router();

/**
 * GET /api/network
 * Liste les équipements réseau surveillés (utilisé par la page
 * "Réseau" — pas encore la vraie topologie GNS3, juste la liste
 * avec leur statut).
 */
routeurEquipements.get('/network', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query('SELECT * FROM equipements ORDER BY nom');
		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /network :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * POST /api/network
 * Ajoute un équipement à surveiller (saisie manuelle en attendant
 * la découverte automatique via GNS3/Suricata).
 */
routeurEquipements.post('/network', verifierToken, async (req, res) => {
	try {
		const { nom, ip, type, vlan, description } = req.body;

		if (!nom || !ip || !type) {
			return res.status(400).json({ erreur: 'Nom, IP et type sont requis.' });
		}

		const [resultat] = await pool.query(
			`INSERT INTO equipements (nom, ip, type, vlan, description, derniere_verification)
             VALUES (?, ?, ?, ?, ?, NOW())`,
			[nom, ip, type, vlan || null, description || null]
		);

		res.status(201).json({ id: resultat.insertId, message: 'Équipement ajouté.' });
	} catch (erreur) {
		console.error('Erreur POST /network :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
