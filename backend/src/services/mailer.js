import nodemailer from 'nodemailer';

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

export async function envoyerOtp({ canal, email, code, dureeValiditeSecondes }) {
	switch (canal) {
		case 'email':
			return envoyerParEmail(email, code, dureeValiditeSecondes);
		default:
			throw new Error(`Canal OTP non pris en charge : ${canal}`);
	}
}

export async function envoyerCodeConfirmation(destinataire, code, dureeValiditeSecondes) {
	const minutes = Math.round(dureeValiditeSecondes / 60);
	await transporteur.sendMail({
		from: `"MediShield — CNHU-HKM" <${process.env.SMTP_USER}>`,
		to: destinataire,
		subject: 'Confirmez votre adresse email — MediShield',
		text: `Bienvenue sur MediShield. Pour confirmer ton adresse email, saisis ce code : ${code}\nIl expire dans ${minutes} minutes.`,
		html: `<p>Bienvenue sur <strong>MediShield</strong>.</p>
               <p>Pour confirmer ton adresse email, saisis ce code dans l'application :</p>
               <p style="font-size:22px"><strong>${code}</strong></p>
               <p>Il expire dans <strong>${minutes} minutes</strong>.</p>`
	});
}
