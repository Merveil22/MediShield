import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';
import { enregistrerActivite } from '../utils/journal.js';

export const routeurMe = Router();

routeurMe.get('/me', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query(
			'SELECT id, nom, prenom, email, role, last_login FROM utilisateurs WHERE id = ?',
			[req.utilisateur.utilisateurId]
		);

		if (lignes.length === 0) {
			return res.status(404).json({ erreur: 'Utilisateur introuvable.' });
		}

		res.json(lignes[0]);
	} catch (erreur) {
		console.error('Erreur /me :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurMe.patch('/me/password', verifierToken, async (req, res) => {
	try {
		const { motDePasseActuel, nouveauMotDePasse } = req.body;

		if (!motDePasseActuel || !nouveauMotDePasse) {
			return res.status(400).json({ erreur: 'Les deux mots de passe sont requis.' });
		}
		if (nouveauMotDePasse.length < 8) {
			return res.status(400).json({ erreur: 'Le nouveau mot de passe doit faire au moins 8 caractères.' });
		}

		const [lignes] = await pool.query('SELECT password_hash FROM utilisateurs WHERE id = ?', [
			req.utilisateur.utilisateurId
		]);
		if (lignes.length === 0) {
			return res.status(404).json({ erreur: 'Utilisateur introuvable.' });
		}

		const valide = await bcrypt.compare(motDePasseActuel, lignes[0].password_hash);
		if (!valide) {
			return res.status(401).json({ erreur: 'Mot de passe actuel incorrect.' });
		}

		const nouveauHash = await bcrypt.hash(nouveauMotDePasse, 10);
		await pool.query('UPDATE utilisateurs SET password_hash = ? WHERE id = ?', [
			nouveauHash,
			req.utilisateur.utilisateurId
		]);

		await enregistrerActivite({
			utilisateurId: req.utilisateur.utilisateurId,
			action: 'Changement de mot de passe',
			ipUtilisateur: req.ip
		});

		res.json({ message: 'Mot de passe mis à jour.' });
	} catch (erreur) {
		console.error('Erreur PATCH /me/password :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

