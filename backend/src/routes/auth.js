import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { pool } from '../config/db.js';
import { creerOtp, verifierOtp } from '../utils/otp.js';
import { envoyerOtp } from '../services/mailer.js';
import { enregistrerActivite } from '../utils/journal.js';

export const routeurAuth = Router();

// Anti-bruteforce : 8 tentatives max toutes les 15 minutes, par IP,
// sur les routes sensibles (login, OTP, inscription).
const limiteurAuth = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 8,
	standardHeaders: true,
	legacyHeaders: false,
	message: { erreur: 'Trop de tentatives. Réessaie dans quelques minutes.' }
});

/**
 * POST /signup
 * Crée un nouveau compte administrateur. Protégé par un code
 * d'inscription partagé (CODE_INSCRIPTION dans .env) — ça évite que
 * n'importe qui puisse créer un compte admin juste en visitant
 * /inscription. Le code est à communiquer en interne (par le
 * responsable du service) à tout nouvel administrateur.
 */
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

		await pool.query(
			`INSERT INTO utilisateurs (nom, prenom, email, telephone, password_hash, role, canal_otp_prefere)
             VALUES (?, ?, ?, ?, ?, ?, 'email')`,
			[nom, prenom, email, telephone || null, hash, roleFinal]
		);

		return res.status(201).json({ message: 'Compte créé avec succès. Tu peux te connecter.' });
	} catch (erreur) {
		console.error('Erreur /signup :', erreur);
		return res.status(500).json({ erreur: 'Erreur serveur.' });
	}
});

/**
 * ÉTAPE 1 — POST /login
 * Reçoit { email, motDePasse }.
 * Si les identifiants sont corrects, génère un OTP, l'enregistre en
 * base (valable 20s) et l'envoie sur le canal préféré de l'admin.
 * Ne renvoie JAMAIS le code au client — seulement une confirmation
 * d'envoi + l'id utilisateur nécessaire pour l'étape 2.
 */
routeurAuth.post('/login', limiteurAuth, async (req, res) => {
	const { email, motDePasse } = req.body;

	if (!email || !motDePasse) {
		return res.status(400).json({ erreur: 'Email et mot de passe requis.' });
	}

	try {
		const [lignes] = await pool.query(
			'SELECT id, nom, email, telephone, password_hash, canal_otp_prefere FROM utilisateurs WHERE email = ?',
			[email]
		);

		if (lignes.length === 0) {
			// Message volontairement générique : on ne révèle jamais si
			// c'est l'email ou le mot de passe qui est incorrect — ça
			// éviterait à un attaquant de deviner les comptes existants.
			return res.status(401).json({ erreur: 'Identifiants invalides.' });
		}

		const utilisateur = lignes[0];
		const motDePasseValide = await bcrypt.compare(motDePasse, utilisateur.password_hash);

		if (!motDePasseValide) {
			return res.status(401).json({ erreur: 'Identifiants invalides.' });
		}

		// Identifiants corrects → on génère et envoie l'OTP
		const { code, dureeValiditeSecondes } = await creerOtp(
			utilisateur.id,
			utilisateur.canal_otp_prefere
		);

		await envoyerOtp({
			canal: utilisateur.canal_otp_prefere,
			email: utilisateur.email,
			telephone: utilisateur.telephone,
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

/**
 * ÉTAPE 2 — POST /verify-otp
 * Reçoit { utilisateurId, code }.
 * Si le code est valide et non expiré, émet un token JWT et le
 * renvoie au client — c'est ce token qui donnera ensuite accès au
 * dashboard (routes protégées).
 */
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

		// OTP valide → on émet le token JWT de session
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

/**
 * Middleware à réutiliser sur toutes les routes protégées
 * (/dashboard, /alerts, /block-ip, etc.) pour vérifier le JWT.
 * Accepte le token soit dans le header Authorization (cas normal,
 * via fetch), soit en paramètre ?token=... (nécessaire pour les
 * liens de téléchargement de fichiers, ouverts directement par le
 * navigateur sans pouvoir poser de header).
 */
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
