import bcrypt from 'bcrypt';
import 'dotenv/config';
import { pool } from './src/config/db.js';

const NOM = 'Test';
const PRENOM = 'Admin';
const EMAIL = 'bidossessimerveille@gmail.com';
const TELEPHONE = '+2290197701616';
const MOT_DE_PASSE = 'Merveille22072006';

async function main() {
	const hash = await bcrypt.hash(MOT_DE_PASSE, 10);

	await pool.query(
		`INSERT INTO utilisateurs (nom, prenom, email, telephone, password_hash, role, canal_otp_prefere)
         VALUES (?, ?, ?, ?, ?, 'super_admin', 'email')`,
		[NOM, PRENOM, EMAIL, TELEPHONE, hash]
	);

	console.log(`Compte créé : ${EMAIL} / mot de passe : ${MOT_DE_PASSE}`);
	process.exit(0);
}

main().catch((erreur) => {
	console.error('Erreur lors de la création du compte :', erreur);
	process.exit(1);
});
