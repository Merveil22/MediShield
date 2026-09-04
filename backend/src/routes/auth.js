import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { creerOtp, verifierOtp } from '../utils/otp.js';
import { creerConfirmationEmail, verifierConfirmationEmail } from '../utils/confirmationEmail.js';
import { envoyerOtp, envoyerCodeConfirmation } from '../services/mailer.js';
import { enregistrerActivite } from '../utils/journal.js';

export const routeurAuth = Router();

const limiteurAuth = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 8,
	standardHeaders: true,
	legacyHeaders: false,
	message: { erreur: 'Trop de tentatives. Réessaie dans quelques minutes.' }
});

routeurAuth.post('/signup', limiteurAuth, async (req, res) => {
	const { nom, prenom, email, telephone, motDePasse, codeInscription, role } = req.body;

	if (!nom || !prenom || !email || !motDePasse || !codeInscription) {
		return res.status(400).json({ erreur: 'Tous les champs sont requis.' });
	}

	if (codeInscription !== process.env.CODE_INSCRIPTION) {
		return res.status(403).json({ erreur: "Code d'inscription invalide." });
	}

	if (motDePasse.length < 8) {
		return res.status(400).json({ erreur: 'Le mot de passe doit contenir au moins 8 caractères.' });
	}

	const roleFinal = ['admin', 'super_admin'].includes(role) ? role : 'admin';

	try {
		const [existant] = await pool.query('SELECT id FROM utilisateurs WHERE email = ?', [email]);
		if (existant.length > 0) {
			return res.status(409).json({ erreur: 'Un compte existe déjà avec cet email.' });
		}

		const hash = await bcrypt.hash(motDePasse, 10);

		const [resultat] = await pool.query(
			`INSERT INTO utilisateurs (nom, prenom, email, telephone, password_hash, role, canal_otp_prefere, email_confirme)
             VALUES (?, ?, ?, ?, ?, ?, 'email', FALSE)`,
			[nom, prenom, email, telephone || null, hash, roleFinal]
		);

		const utilisateurId = resultat.insertId;

		const { code, dureeValiditeSecondes } = await creerConfirmationEmail(utilisateurId);
		await envoyerCodeConfirmation(email, code, dureeValiditeSecondes);

		return res.status(201).json({
			message: 'Compte créé. Un code de confirmation a été envoyé par email.',
			utilisateurId,
			dureeValiditeSecondes
		});
	} catch (erreur) {
		console.error('Erreur /signup :', erreur);
		return res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurAuth.post('/confirm-email', limiteurAuth, async (req, res) => {
	const { utilisateurId, code } = req.body;

	if (!utilisateurId || !code) {
		return res.status(400).json({ erreur: "Identifiant utilisateur et code requis." });
	}

	try {
		const resultat = await verifierConfirmationEmail(utilisateurId, code);

		if (!resultat.valide) {
			return res.status(401).json({ erreur: resultat.raison });
		}

		await enregistrerActivite({
			utilisateurId,
			action: 'Email confirmé',
			ipUtilisateur: req.ip
		});

		return res.json({ message: 'Email confirmé avec succès. Tu peux maintenant te connecter.' });
	} catch (erreur) {
		console.error('Erreur /confirm-email :', erreur);
		return res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurAuth.post('/resend-confirmation', limiteurAuth, async (req, res) => {
	const { utilisateurId } = req.body;
	if (!utilisateurId) {
		return res.status(400).json({ erreur: 'Identifiant utilisateur requis.' });
	}

	try {
		const [lignes] = await pool.query('SELECT email, email_confirme FROM utilisateurs WHERE id = ?', [
			utilisateurId
		]);
		if (lignes.length === 0) {
			return res.status(404).json({ erreur: 'Compte introuvable.' });
		}
		if (lignes[0].email_confirme) {
			return res.status(409).json({ erreur: 'Cet email est déjà confirmé.' });
		}

		const { code, dureeValiditeSecondes } = await creerConfirmationEmail(utilisateurId);
		await envoyerCodeConfirmation(lignes[0].email, code, dureeValiditeSecondes);

		return res.json({ message: 'Nouveau code envoyé.', dureeValiditeSecondes });
	} catch (erreur) {
		console.error('Erreur /resend-confirmation :', erreur);
		return res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurAuth.post('/login', limiteurAuth, async (req, res) => {
	const { email, motDePasse } = req.body;

	if (!email || !motDePasse) {
		return res.status(400).json({ erreur: 'Email et mot de passe requis.' });
	}

	try {
		const [lignes] = await pool.query(
			'SELECT id, nom, email, telephone, password_hash, canal_otp_prefere, email_confirme FROM utilisateurs WHERE email = ?',
			[email]
		);

		if (lignes.length === 0) {
			return res.status(401).json({ erreur: 'Identifiants invalides.' });
		}

		const utilisateur = lignes[0];
		const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.password_hash);

		if (!motDePasseValide) {
			return res.status(401).json({ erreur: 'Identifiants invalides.' });
		}

		if (!utilisateur.email_confirme) {
			return res.status(403).json({
				erreur: "Adresse email non confirmée. Vérifie ta boîte mail ou demande un nouveau code.",
				emailNonConfirme: true,
				utilisateurId: utilisateur.id
			});
		}

		const { code, dureeValiditeSecondes } = await creerOtp(utilisateur.id, utilisateur.canal_otp_prefere);

		await envoyerOtp({
			canal: utilisateur.canal_otp_prefere,
			email: utilisateur.email,
			code,
			dureeValiditeSecondes
		});

		return res.json({
			message: `Code envoyé par ${utilisateur.canal_otp_prefere}.`,
			utilisateurId: utilisateur.id,
			dureeValiditeSecondes
		});
	} catch (erreur) {
		console.error('Erreur /login :', erreur);
		return res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

routeurAuth.post('/verify-otp', limiteurAuth, async (req, res) => {
	const { utilisateurId, code } = req.body;

	if (!utilisateurId || !code) {
		return res.status(400).json({ erreur: "Identifiant utilisateur et code requis." });
	}

	try {
		const resultat = await verifierOtp(utilisateurId, code);

		if (!resultat.valide) {
			return res.status(401).json({ erreur: resultat.raison });
		}

		const token = jwt.sign({ utilisateurId }, process.env.JWT_SECRET, {
			expiresIn: process.env.JWT_EXPIRATION || '8h'
		});

		await pool.query('UPDATE utilisateurs SET last_login = NOW() WHERE id = ?', [utilisateurId]);
		await enregistrerActivite({
			utilisateurId,
			action: 'Connexion réussie',
			ipUtilisateur: req.ip
		});

		return res.json({ message: 'Connexion réussie.', token });
	} catch (erreur) {
		console.error('Erreur /verify-otp :', erreur);
		return res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

export function verifierToken(req, res, next) {
	const enTete = req.headers.authorization;
	const tokenHeader = enTete && enTete.startsWith('Bearer ') ? enTete.split(' ')[1] : null;
	const token = tokenHeader || req.query.token;

	if (!token) {
		return res.status(401).json({ erreur: 'Token manquant.' });
	}

	try {
		req.utilisateur = jwt.verify(token, process.env.JWT_SECRET);
		next();
	} catch {
		return res.status(401).json({ erreur: 'Token invalide ou expiré.' });
	}
}
