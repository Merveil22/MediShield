import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';
import { verifierToken } from './auth.js';
import { genererPdfRapport } from '../utils/pdfRapport.js';

export const routeurRapports = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOSSIER_RAPPORTS = path.join(__dirname, '..', '..', 'rapports_generes');

if (!fs.existsSync(DOSSIER_RAPPORTS)) {
	fs.mkdirSync(DOSSIER_RAPPORTS, { recursive: true });
}

/**
 * GET /api/reports
 * Liste l'historique des rapports déjà générés.
 */
routeurRapports.get('/reports', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query('SELECT * FROM rapports ORDER BY genere_le DESC');
		res.json(lignes);
	} catch (erreur) {
		console.error('Erreur GET /reports :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * POST /api/reports/generate
 * Génère un rapport PDF de sécurité complet pour une période donnée.
 * { type: 'quotidien'|'hebdomadaire'|'mensuel'|'personnalise',
 *   periodeDebut: 'YYYY-MM-DD', periodeFin: 'YYYY-MM-DD' }
 */
routeurRapports.post('/reports/generate', verifierToken, async (req, res) => {
	try {
		const { type, periodeDebut, periodeFin } = req.body;

		if (!type || !periodeDebut || !periodeFin) {
			return res.status(400).json({ erreur: 'type, periodeDebut et periodeFin sont requis.' });
		}

		// --- Récupération de toutes les données réelles nécessaires ---
		const [alertesPeriode] = await pool.query(
			`SELECT * FROM alertes WHERE date_heure BETWEEN ? AND ? ORDER BY date_heure DESC`,
			[periodeDebut, periodeFin]
		);
		const [equipements] = await pool.query('SELECT * FROM equipements ORDER BY nom');
		const [activitesRecentes] = await pool.query(
			`SELECT a.*, u.nom, u.prenom
             FROM activites a
             JOIN utilisateurs u ON u.id = a.utilisateur_id
             WHERE a.date_heure BETWEEN ? AND ?
             ORDER BY a.date_heure DESC`,
			[periodeDebut, periodeFin]
		);
		const [[admin]] = await pool.query('SELECT nom, prenom FROM utilisateurs WHERE id = ?', [
			req.utilisateur.utilisateurId
		]);

		const nbCritiques = alertesPeriode.filter((a) => a.gravite === 'critique').length;
		const nbElevees = alertesPeriode.filter((a) => a.gravite === 'elevee').length;
		const nbMoyennes = alertesPeriode.filter((a) => a.gravite === 'moyenne').length;
		const nbFaibles = alertesPeriode.filter((a) => a.gravite === 'faible').length;
		const nbTraitees = alertesPeriode.filter((a) => a.statut === 'traitee').length;
		const horsService = equipements.filter((e) => e.statut === 'hors_service').length;

		let scoreSecurite =
			100 - nbCritiques * 8 - nbElevees * 3 - Math.max(0, alertesPeriode.length - nbCritiques - nbElevees) * 1;
		scoreSecurite -= horsService * 5;
		scoreSecurite = Math.max(0, Math.min(100, Math.round(scoreSecurite)));

		const nomFichier = `rapport-${type}-${Date.now()}.pdf`;
		const cheminFichier = path.join(DOSSIER_RAPPORTS, nomFichier);

		await genererPdfRapport({
			cheminFichier,
			type,
			periodeDebut,
			periodeFin,
			admin: admin || { nom: '', prenom: 'Administrateur' },
			donnees: {
				alertesPeriode,
				nbCritiques,
				nbElevees,
				nbMoyennes,
				nbFaibles,
				nbTraitees,
				scoreSecurite,
				equipements,
				activitesRecentes
			}
		});

		const taille = fs.statSync(cheminFichier).size;

		const [resultat] = await pool.query(
			`INSERT INTO rapports
             (titre, type, periode_debut, periode_fin, chemin_fichier, taille, genere_par, statut, nb_alertes, nb_critiques, score_securite)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'genere', ?, ?, ?)`,
			[
				`Rapport ${type} — ${periodeDebut} au ${periodeFin}`,
				type,
				periodeDebut,
				periodeFin,
				nomFichier,
				taille,
				req.utilisateur.utilisateurId,
				alertesPeriode.length,
				nbCritiques,
				scoreSecurite
			]
		);

		res.status(201).json({ id: resultat.insertId, message: 'Rapport généré.', nomFichier });
	} catch (erreur) {
		console.error('Erreur POST /reports/generate :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * GET /api/reports/:id/download
 * Télécharge le PDF d'un rapport déjà généré.
 */
routeurRapports.get('/reports/:id/download', verifierToken, async (req, res) => {
	try {
		const [lignes] = await pool.query('SELECT * FROM rapports WHERE id = ?', [req.params.id]);
		if (lignes.length === 0) {
			return res.status(404).json({ erreur: 'Rapport introuvable.' });
		}

		const cheminFichier = path.join(DOSSIER_RAPPORTS, lignes[0].chemin_fichier);
		if (!fs.existsSync(cheminFichier)) {
			return res.status(404).json({ erreur: 'Fichier PDF introuvable sur le serveur.' });
		}

		res.download(cheminFichier, lignes[0].chemin_fichier);
	} catch (erreur) {
		console.error('Erreur GET /reports/:id/download :', erreur);
		res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});
