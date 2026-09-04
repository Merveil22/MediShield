import { Router } from 'express';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';
import { enregistrerActivite } from '../utils/journal.js';

export const routeurParametres = Router();

routeurParametres.get('/parametres', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query('SELECT * FROM parametres ORDER BY cle');
		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /parametres :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurParametres.patch('/parametres/:cle', verifierToken, async (req, res) => {
	try {
		const { valeur } = req.body;
		if (valeur === undefined) {
			return res.status(400).json({ erreur: 'Le champ valeur est requis.' });
		}

		const [resultat] = await pool.query('UPDATE parametres SET valeur = ? WHERE cle = ?', [
			valeur,
			req.params.cle
		]);

		if (resultat.affectedRows === 0) {
			return res.status(404).json({ erreur: 'Paramètre introuvable.' });
		}

		await enregistrerActivite({
			utilisateurId: req.utilisateur.utilisateurId,
			action: 'Modification paramètre',
			details: `${req.params.cle} = ${valeur}`,
			ipUtilisateur: req.ip
		});

		res.json({ message: 'Paramètre mis à jour.' });
	} catch (erreur) {
		console.error('Erreur PATCH /parametres/:cle :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
