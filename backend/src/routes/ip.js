import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';
import { enregistrerActivite, creerNotification } from '../utils/journal.js';

export const routeurIp = Router();

/**
 * GET /api/block-ip
 * Liste toutes les IP actuellement bloquées.
 */
routeurIp.get('/block-ip', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query(
			`SELECT b.*, u1.nom AS bloque_par_nom, u2.nom AS debloque_par_nom
             FROM blocages_ip b
             LEFT JOIN utilisateurs u1 ON u1.id = b.bloque_par
             LEFT JOIN utilisateurs u2 ON u2.id = b.debloque_par
             ORDER BY b.bloque_le DESC`
		);
		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /block-ip :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * POST /api/block-ip
 * Bloque une nouvelle IP. { ip, raison, duree, commentaire }
 * NOTE : pour l'instant, ceci enregistre seulement le blocage en base
 * (pas encore de vraie commande iptables — ça viendra avec la
 * connexion réseau réelle).
 */
routeurIp.post('/block-ip', verifierToken, async (req, res) => {
	try {
		const { ip, raison, duree, commentaire } = req.body;

		// Validation stricte du format IP (empêche l'injection de
		// commande le jour où on branchera iptables pour de vrai).
		const regexIp = /^(\d{1,3}\.){3}\d{1,3}$/;
		if (!ip || !regexIp.test(ip)) {
			return res.status(400).json({ erreur: 'Adresse IP invalide.' });
		}

		await pool.query(
			`INSERT INTO blocages_ip (ip, raison, bloque_par, duree, commentaire)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE raison = VALUES(raison), commentaire = VALUES(commentaire)`,
			[ip, raison || 'Non spécifiée', req.utilisateur.utilisateurId, duree || 'permanent', commentaire || null]
		);

		await enregistrerActivite({
			utilisateurId: req.utilisateur.utilisateurId,
			action: `IP bloquée : ${ip}`,
			details: raison,
			ipUtilisateur: req.ip
		});
		await creerNotification({
			utilisateurId: req.utilisateur.utilisateurId,
			type: 'blocage_ip',
			message: `IP ${ip} bloquée (${raison || 'raison non spécifiée'})`
		});

		res.status(201).json({ message: `IP ${ip} bloquée.` });
	} catch (erreur) {
		console.error('Erreur POST /block-ip :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * DELETE /api/block-ip/:id
 * Débloque une IP (marque debloque_par / debloque_le).
 */
routeurIp.delete('/block-ip/:id', verifierToken, async (req, res) => {
	try {
		await pool.query(
			`UPDATE blocages_ip SET debloque_par = ?, debloque_le = NOW() WHERE id = ?`,
			[req.utilisateur.utilisateurId, req.params.id]
		);
		await enregistrerActivite({
			utilisateurId: req.utilisateur.utilisateurId,
			action: `IP débloquée (id ${req.params.id})`,
			ipUtilisateur: req.ip
		});
		res.json({ message: 'IP débloquée.' });
	} catch (erreur) {
		console.error('Erreur DELETE /block-ip/:id :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
