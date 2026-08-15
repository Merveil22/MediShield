import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';
import { enregistrerActivite, creerNotification } from '../utils/journal.js';

export const routeurAlertes = Router();

/**
 * GET /api/alerts
 * Liste les alertes, avec filtres optionnels par query string :
 * ?gravite=critique&statut=nouvelle&recherche=192.168
 */
routeurAlertes.get('/alerts', verifierToken, async (req, res) => {
	try {
		const { gravite, statut, recherche } = req.query;
		const conditions = [];
		const valeurs = [];

		if (gravite) {
			conditions.push('gravite = ?');
			valeurs.push(gravite);
		}
		if (statut) {
			conditions.push('statut = ?');
			valeurs.push(statut);
		}
		if (recherche) {
			conditions.push('(ip_source LIKE ? OR type_attaque LIKE ? OR message LIKE ?)');
			valeurs.push(`%${recherche}%`, `%${recherche}%`, `%${recherche}%`);
		}

		const clauseOu = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

		const [lignes] = await pool.query(
			`SELECT * FROM alertes ${clauseOu} ORDER BY date_heure DESC LIMIT 200`,
			valeurs
		);

		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /alerts :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * PATCH /api/alerts/:id
 * Met à jour le statut d'une alerte : { statut: 'traitee' | 'ignoree' | 'en_cours', notes? }
 */
routeurAlertes.patch('/alerts/:id', verifierToken, async (req, res) => {
	try {
		const { statut, notes } = req.body;
		const statutsValides = ['nouvelle', 'en_cours', 'traitee', 'ignoree'];

		if (!statutsValides.includes(statut)) {
			return res.status(400).json({ erreur: 'Statut invalide.' });
		}

		await pool.query(
			`UPDATE alertes SET statut = ?, notes = ?, traite_par = ?, traite_le = NOW() WHERE id = ?`,
			[statut, notes || null, req.utilisateur.utilisateurId, req.params.id]
		);

		await enregistrerActivite({
			utilisateurId: req.utilisateur.utilisateurId,
			action: `Alerte #${req.params.id} — statut : ${statut}`,
			ipUtilisateur: req.ip
		});

		res.json({ message: 'Alerte mise à jour.' });
	} catch (erreur) {
		console.error('Erreur PATCH /alerts/:id :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * POST /api/alerts
 * Crée une alerte manuellement — utile pour tester l'interface tant
 * que la vraie connexion Suricata n'est pas branchée.
 */
routeurAlertes.post('/alerts', verifierToken, async (req, res) => {
	try {
		const { ip_source, ip_cible, type_attaque, gravite, message } = req.body;

		if (!ip_source || !type_attaque || !gravite || !message) {
			return res.status(400).json({ erreur: 'Champs requis manquants.' });
		}

		const [resultat] = await pool.query(
			`INSERT INTO alertes (date_heure, ip_source, ip_cible, type_attaque, gravite, message)
             VALUES (NOW(), ?, ?, ?, ?, ?)`,
			[ip_source, ip_cible || null, type_attaque, gravite, message]
		);

		await creerNotification({
			utilisateurId: req.utilisateur.utilisateurId,
			alerteId: resultat.insertId,
			type: 'alerte',
			message: `Nouvelle alerte ${gravite} : ${type_attaque} depuis ${ip_source}`
		});

		res.status(201).json({ id: resultat.insertId, message: 'Alerte créée.' });
	} catch (erreur) {
		console.error('Erreur POST /alerts :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
