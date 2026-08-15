import nodemailer from 'nodemailer';

// Transporteur SMTP pour l'envoi d'email — configuré une seule fois.
// L'OTP est envoyé uniquement par email (le SMS via FasterMessage a
// été abandonné : la vérification KYC demandait des documents hors
// de portée pour ce projet). Si besoin de réactiver un canal SMS plus
// tard, ajoute une fonction envoyerParSms() ici et un cas dans
// envoyerOtp() ci-dessous.
const transporteur = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: Number(process.env.SMTP_PORT),
	secure: false,
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASSWORD
	}
});

async function envoyerParEmail(destinataire, code, dureeValiditeSecondes) {
	const minutes = Math.round(dureeValiditeSecondes / 60);
	await transporteur.sendMail({
		from: `"MediShield — CNHU-HKM" <${process.env.SMTP_USER}>`,
		to: destinataire,
		subject: 'Votre code de connexion MediShield',
		text: `Votre code de vérification est : ${code}\nIl expire dans ${minutes} minute(s).`,
		html: `<p>Votre code de vérification est : <strong style="font-size:20px">${code}</strong></p>
               <p>Il expire dans <strong>${minutes} minute(s)</strong>. Ne le partagez avec personne.</p>`
	});
}

/**
 * Point d'entrée unique : envoie le code par le canal demandé.
 * Pour l'instant, seul 'email' est implémenté.
 */
export async function envoyerOtp({ canal, email, code, dureeValiditeSecondes }) {
	switch (canal) {
		case 'email':
			return envoyerParEmail(email, code, dureeValiditeSecondes);
		default:
			throw new Error(`Canal OTP non pris en charge : ${canal}`);
	}
}
