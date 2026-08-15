// test-connexion.js
// Usage : node test-connexion.js
//
// Teste le flux complet login -> OTP -> token, directement dans le
// terminal, sans avoir besoin de Postman ou d'un navigateur.

import readline from 'node:readline/promises';
import { stdin as entree, stdout as sortie } from 'node:process';

const URL_BASE = 'http://localhost:4000/api';
const rl = readline.createInterface({ input: entree, output: sortie });

async function main() {
	const email = await rl.question('Email admin (ex: admin@cnhu-hkm.bj) : ');
	const motDePasse = await rl.question('Mot de passe : ');

	console.log('\n→ Envoi de la requête /login...');
	const reponseLogin = await fetch(`${URL_BASE}/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, motDePasse })
	});
	const donneesLogin = await reponseLogin.json();

	if (!reponseLogin.ok) {
		console.error('❌ Échec du login :', donneesLogin.erreur);
		rl.close();
		return;
	}

	console.log('✅', donneesLogin.message);
	console.log(`   (tu as ${donneesLogin.dureeValiditeSecondes} secondes pour saisir le code)\n`);

	const code = await rl.question('Code OTP reçu par email : ');

	console.log('\n→ Envoi de la requête /verify-otp...');
	const reponseOtp = await fetch(`${URL_BASE}/verify-otp`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ utilisateurId: donneesLogin.utilisateurId, code })
	});
	const donneesOtp = await reponseOtp.json();

	if (!reponseOtp.ok) {
		console.error('❌ Échec de la vérification OTP :', donneesOtp.erreur);
		rl.close();
		return;
	}

	console.log('✅ Connexion réussie ! Token JWT reçu :\n');
	console.log(donneesOtp.token);

	console.log('\n→ Test de la route protégée /dashboard avec ce token...');
	const reponseDashboard = await fetch(`${URL_BASE}/dashboard`, {
		headers: { Authorization: `Bearer ${donneesOtp.token}` }
	});
	const donneesDashboard = await reponseDashboard.json();
	console.log(reponseDashboard.ok ? '✅' : '❌', donneesDashboard);

	rl.close();
}

main().catch((erreur) => {
	console.error('Erreur inattendue :', erreur);
	rl.close();
});
