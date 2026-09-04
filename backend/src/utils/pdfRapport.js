import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DOSSIER_STATIC = path.join(__dirname, '..', '..', '..', 'frontend', 'static');
const CHEMIN_LOGO_MEDISHIELD = path.join(DOSSIER_STATIC, 'logo.png');
const CHEMIN_LOGO_CNHU = path.join(DOSSIER_STATIC, 'logo-cnhu.png');
const CHEMIN_BADGE_CONFIDENTIEL = path.join(DOSSIER_STATIC, 'badge_confidentiel.png');

const COULEURS = {
	bleuCnhu: '#003399',
	texte: '#333333',
	texteClair: '#666666',
	vert: '#28a745',
	orange: '#ffc107',
	rouge: '#dc3545',
	gris: '#e5e7eb'
};

const COULEUR_GRAVITE = {
	critique: COULEURS.rouge,
	elevee: '#fb923c',
	moyenne: COULEURS.orange,
	faible: COULEURS.vert
};

function couleurScore(score) {
	if (score >= 90) return COULEURS.vert;
	if (score >= 60) return COULEURS.orange;
	return COULEURS.rouge;
}

function imageExiste(chemin) {
	try {
		return fs.existsSync(chemin);
	} catch {
		return false;
	}
}

function ajouterPiedDePage(doc) {
	const margeBasOriginale = doc.page.margins.bottom;
	doc.page.margins.bottom = 0;

	const bas = doc.page.height - 30;
	doc
		.fontSize(8)
		.fillColor(COULEURS.texteClair)
		.text('Document Confidentiel – Rapport de Sécurité Réseau', 50, bas, {
			width: 320,
			lineBreak: false
		});
	doc.text('MédiShield', 300, bas, { width: 150, lineBreak: false });
	doc.text(`Page ${doc.bufferedPageRange().count}`, doc.page.width - 150, bas, {
		width: 100,
		align: 'right',
		lineBreak: false
	});

	doc.page.margins.bottom = margeBasOriginale;
}

function dessinerJaugeScore(doc, x, y, rayon, score) {
	const couleur = couleurScore(score);
	doc.save();
	doc.lineWidth(10);
	doc.strokeColor(COULEURS.gris);
	doc.circle(x, y, rayon).stroke();

	const angleDepart = -Math.PI / 2;
	const angleFin = angleDepart + (score / 100) * 2 * Math.PI;
	doc.strokeColor(couleur);
	doc.path(decrireArc(x, y, rayon, angleDepart, angleFin)).stroke();
	doc.restore();

	doc.fontSize(20).fillColor(couleur).text(String(score), x - rayon, y - 12, {
		width: rayon * 2,
		align: 'center'
	});
	doc.fontSize(8).fillColor(COULEURS.texteClair).text('/ 100', x - rayon, y + 10, {
		width: rayon * 2,
		align: 'center'
	});
}

function decrireArc(cx, cy, r, angleDepart, angleFin) {
	const points = 40;
	let d = '';
	for (let i = 0; i <= points; i++) {
		const angle = angleDepart + ((angleFin - angleDepart) * i) / points;
		const px = cx + r * Math.cos(angle);
		const py = cy + r * Math.sin(angle);
		d += i === 0 ? `M ${px} ${py} ` : `L ${px} ${py} `;
	}
	return d;
}

function dessinerBarresGravite(doc, x, y, largeur, repartition) {
	const maxValeur = Math.max(...Object.values(repartition), 1);
	const hauteurBarre = 16;
	const espacement = 26;

	Object.entries(repartition).forEach(([niveau, valeur], i) => {
		const yBarre = y + i * espacement;
		const largeurBarre = (valeur / maxValeur) * (largeur - 100);

		doc.fontSize(9).fillColor(COULEURS.texte).text(niveau, x, yBarre + 3, { width: 70 });
		doc.rect(x + 75, yBarre, Math.max(largeurBarre, 2), hauteurBarre).fill(
			COULEUR_GRAVITE[niveau] || COULEURS.texteClair
		);
		doc.fontSize(9).fillColor(COULEURS.texte).text(String(valeur), x + 80 + largeurBarre, yBarre + 3);
	});

	return y + Object.keys(repartition).length * espacement;
}

export function genererPdfRapport({
	cheminFichier,
	type,
	periodeDebut,
	periodeFin,
	admin,
	motDePasse,
	donnees
}) {
	const {
		alertesPeriode,
		nbCritiques,
		nbElevees,
		nbMoyennes,
		nbFaibles,
		nbTraitees,
		scoreSecurite,
		equipements,
		activitesRecentes
	} = donnees;

	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({
			margin: 50,
			size: 'A4',
			bufferPages: true,
			userPassword: motDePasse,
			permissions: { printing: 'lowResolution', modifying: false, copying: false, annotating: false }
		});
		const flux = fs.createWriteStream(cheminFichier);
		doc.pipe(flux);

		const yHautPage = 45;
		if (imageExiste(CHEMIN_LOGO_CNHU)) {
			try {
				doc.image(CHEMIN_LOGO_CNHU, 50, yHautPage, { width: 85, height: 60, fit: [85, 60] });
			} catch {
			
			}
		}
		if (imageExiste(CHEMIN_LOGO_MEDISHIELD)) {
			try {
				doc.image(CHEMIN_LOGO_MEDISHIELD, doc.page.width - 175, yHautPage, {
					width: 125,
					height: 60,
					fit: [125, 60]
				});
			} catch {
				
			}
		}

		doc
			.fontSize(19)
			.fillColor(COULEURS.bleuCnhu)
			.text('RAPPORT DE SÉCURITÉ RÉSEAU', 50, yHautPage + 85, {
				width: doc.page.width - 100,
				align: 'center'
			});

		doc.y = yHautPage + 130;
		doc
			.fontSize(11)
			.fillColor(COULEURS.texte)
			.text('IDS - Réseau Hospitalier', { align: 'center' });
		doc
			.fontSize(10)
			.fillColor(COULEURS.texteClair)
			.text('Centre National Hospitalier Universitaire – HKM', { align: 'center' });

		doc.moveDown(2);

		
		const infos = [
			['Type de Rapport :', type],
			['Période Couverte :', `${periodeDebut} au ${periodeFin}`],
			['Généré le :', new Date().toLocaleString('fr-FR')],
			['Généré Par :', `${admin.prenom} ${admin.nom}`]
		];
		let yInfo = doc.y + 10;
		const xLabel = 170;
		const xValeur = 320;
		infos.forEach(([label, valeur]) => {
			doc.fontSize(10).fillColor(COULEURS.texte).text(label, xLabel, yInfo, { width: 140 });
			doc.fillColor(COULEURS.texteClair).text(valeur, xValeur, yInfo, { width: 200 });
			yInfo += 20;
		});

		doc.y = yInfo + 30;

		if (imageExiste(CHEMIN_BADGE_CONFIDENTIEL)) {
			try {
				doc.image(CHEMIN_BADGE_CONFIDENTIEL, doc.page.width / 2 - 55, doc.y, { width: 110 });
			} catch {

			}
		} else {
			doc.fontSize(9).fillColor(COULEURS.texteClair).text('DOCUMENT CONFIDENTIEL', { align: 'center' });
		}

		ajouterPiedDePage(doc);

		doc.addPage();
		doc.fontSize(16).fillColor(COULEURS.bleuCnhu).text('Résumé exécutif');
		doc.moveDown(1);

		dessinerJaugeScore(doc, 110, doc.y + 45, 45, scoreSecurite);

		const etatGeneral = scoreSecurite >= 90 ? 'Bon' : scoreSecurite >= 60 ? 'Moyen' : 'Critique';
		const yIndicateurs = doc.y - 20;
		doc
			.fontSize(10)
			.fillColor(COULEURS.texte)
			.text(`État général du réseau : ${etatGeneral}`, 200, yIndicateurs)
			.moveDown(0.8)
			.text(`Alertes totales : ${alertesPeriode.length}`, 200)
			.moveDown(0.3)
			.text(`Alertes critiques : ${nbCritiques}`, 200)
			.moveDown(0.3)
			.text(`Alertes traitées : ${nbTraitees}`, 200)
			.moveDown(0.3)
			.text(
				`Équipements en ligne : ${equipements.filter((e) => e.statut !== 'hors_service').length}/${equipements.length}`,
				200
			);

		doc.y = 260;
		doc.moveDown(2);

		doc.fontSize(13).fillColor(COULEURS.bleuCnhu).text('Répartition par niveau de gravité');
		doc.moveDown(1);
		const yApresBarres = dessinerBarresGravite(doc, 50, doc.y, 450, {
			critique: nbCritiques,
			elevee: nbElevees,
			moyenne: nbMoyennes,
			faible: nbFaibles
		});
		doc.y = yApresBarres + 20;

		ajouterPiedDePage(doc);

		doc.addPage();
		doc.fontSize(16).fillColor(COULEURS.bleuCnhu).text('Détail des alertes critiques');
		doc.moveDown(1);

		const alertesCritiques = alertesPeriode.filter((a) => a.gravite === 'critique').slice(0, 30);

		if (alertesCritiques.length === 0) {
			doc.fontSize(10).fillColor(COULEURS.texteClair).text('Aucune alerte critique sur cette période.');
		} else {
			const colonnes = [
				{ titre: 'Date', largeur: 90 },
				{ titre: 'Type', largeur: 140 },
				{ titre: 'IP source', largeur: 100 },
				{ titre: 'Statut', largeur: 90 }
			];
			let yLigne = doc.y;
			doc.rect(50, yLigne, 420, 20).fill(COULEURS.bleuCnhu);
			let xCol = 55;
			colonnes.forEach((c) => {
				doc.fontSize(9).fillColor('#ffffff').text(c.titre, xCol, yLigne + 6, { width: c.largeur });
				xCol += c.largeur;
			});
			yLigne += 20;

			alertesCritiques.forEach((a, i) => {
				if (yLigne > doc.page.height - 80) {
					ajouterPiedDePage(doc);
					doc.addPage();
					yLigne = 50;
				}
				if (i % 2 === 0) {
					doc.rect(50, yLigne, 420, 18).fill(COULEURS.gris);
				}
				xCol = 55;
				doc.fontSize(8).fillColor(COULEURS.texte);
				doc.text(new Date(a.date_heure).toLocaleString('fr-FR'), xCol, yLigne + 5, { width: 90 });
				xCol += 90;
				doc.text(a.type_attaque, xCol, yLigne + 5, { width: 140 });
				xCol += 140;
				doc.text(a.ip_source, xCol, yLigne + 5, { width: 100 });
				xCol += 100;
				doc.text(a.statut, xCol, yLigne + 5, { width: 90 });
				yLigne += 18;
			});
			doc.y = yLigne + 10;
		}

		ajouterPiedDePage(doc);

		doc.addPage();
		doc.fontSize(16).fillColor(COULEURS.bleuCnhu).text('Actions effectuées');
		doc.moveDown(1);

		if (activitesRecentes.length === 0) {
			doc.fontSize(10).fillColor(COULEURS.texteClair).text('Aucune action enregistrée sur cette période.');
		} else {
			activitesRecentes.slice(0, 20).forEach((act) => {
				doc
					.fontSize(9)
					.fillColor(COULEURS.texte)
					.text(
						`${new Date(act.date_heure).toLocaleString('fr-FR')} — ${act.action}${act.details ? ' (' + act.details + ')' : ''} — ${act.prenom} ${act.nom}`
					);
				doc.moveDown(0.3);
			});
		}

		doc.moveDown(1.5);
		doc.fontSize(16).fillColor(COULEURS.bleuCnhu).text('État des équipements');
		doc.moveDown(1);

		if (equipements.length === 0) {
			doc.fontSize(10).fillColor(COULEURS.texteClair).text('Aucun équipement enregistré.');
		} else {
			equipements.forEach((eq) => {
				const couleur =
					eq.statut === 'normal' ? COULEURS.vert : eq.statut === 'attention' ? COULEURS.orange : COULEURS.rouge;
				const yLigne = doc.y;
				doc.rect(50, yLigne + 3, 7, 7).fill(couleur);
				doc
					.fontSize(9)
					.fillColor(COULEURS.texte)
					.text(`${eq.nom} (${eq.ip}) — ${eq.statut}`, 64, yLigne);
				doc.moveDown(0.3);
			});
		}

		ajouterPiedDePage(doc);

		doc.end();

		flux.on('finish', resolve);
		flux.on('error', reject);
	});
}
