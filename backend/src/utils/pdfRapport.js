import PDFDocument from 'pdfkit';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Le logo est déposé côté frontend (static/logo.png). On le cherche
// ici pour l'inclure automatiquement sur la page de garde du PDF —
// aucune configuration supplémentaire n'est nécessaire si tu as déjà
// suivi les instructions du frontend.
const CHEMIN_LOGO = path.join(__dirname, '..', '..', '..', 'frontend', 'static', 'logo.png');
const LOGO_DISPONIBLE = fs.existsSync(CHEMIN_LOGO);

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

function ajouterPiedDePage(doc, texteGauche) {
	// PDFKit déclenche automatiquement un saut de page si le texte
	// écrit dépasse la marge basse définie. Le pied de page est
	// volontairement placé DANS cette marge (en bas de la feuille),
	// donc on désactive temporairement la marge basse le temps de
	// l'écrire, pour éviter de créer des pages vides en boucle.
	const margeBasOriginale = doc.page.margins.bottom;
	doc.page.margins.bottom = 0;

	const bas = doc.page.height - 30;
	doc
		.fontSize(8)
		.fillColor(COULEURS.texteClair)
		.text(texteGauche, 50, bas, { width: 250, lineBreak: false });
	doc.text(`Page ${doc.bufferedPageRange().count}`, doc.page.width - 150, bas, {
		width: 100,
		align: 'right',
		lineBreak: false
	});

	doc.page.margins.bottom = margeBasOriginale;
}

/**
 * Dessine une jauge circulaire simple pour le score de sécurité.
 */
function dessinerJaugeScore(doc, x, y, rayon, score) {
	const couleur = couleurScore(score);
	doc.save();
	doc.lineWidth(10);
	doc.strokeColor(COULEURS.gris);
	doc.circle(x, y, rayon).stroke();

	// Arc proportionnel au score (approximation avec des segments)
	const angleDepart = -Math.PI / 2;
	const angleFin = angleDepart + (score / 100) * 2 * Math.PI;
	doc.strokeColor(couleur);
	doc
		.path(
			decrireArc(x, y, rayon, angleDepart, angleFin)
		)
		.stroke();
	doc.restore();

	doc
		.fontSize(20)
		.fillColor(couleur)
		.text(String(score), x - rayon, y - 12, { width: rayon * 2, align: 'center' });
	doc
		.fontSize(8)
		.fillColor(COULEURS.texteClair)
		.text('/ 100', x - rayon, y + 10, { width: rayon * 2, align: 'center' });
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

/**
 * Dessine un graphique en barres horizontales simple (sans
 * dépendance externe) pour la répartition par gravité.
 */
function dessinerBarresGravite(doc, x, y, largeur, repartition) {
	const maxValeur = Math.max(...Object.values(repartition), 1);
	const hauteurBarre = 16;
	const espacement = 26;

	Object.entries(repartition).forEach(([niveau, valeur], i) => {
		const yBarre = y + i * espacement;
		const largeurBarre = (valeur / maxValeur) * (largeur - 100);

		doc
			.fontSize(9)
			.fillColor(COULEURS.texte)
			.text(niveau, x, yBarre + 3, { width: 70 });

		doc
			.rect(x + 75, yBarre, Math.max(largeurBarre, 2), hauteurBarre)
			.fill(COULEUR_GRAVITE[niveau] || COULEURS.texteClair);

		doc
			.fontSize(9)
			.fillColor(COULEURS.texte)
			.text(String(valeur), x + 80 + largeurBarre, yBarre + 3);
	});

	return y + Object.keys(repartition).length * espacement;
}

/**
 * Génère le PDF complet et l'écrit sur disque. Renvoie une Promise
 * résolue une fois le fichier entièrement écrit.
 */
export function genererPdfRapport({ cheminFichier, type, periodeDebut, periodeFin, admin, donnees }) {
	const { alertesPeriode, nbCritiques, nbElevees, nbMoyennes, nbFaibles, nbTraitees, scoreSecurite, equipements, activitesRecentes } =
		donnees;

	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
		const flux = fs.createWriteStream(cheminFichier);
		doc.pipe(flux);

		// ============================================================
		// PAGE DE GARDE
		// ============================================================
		if (LOGO_DISPONIBLE) {
			try {
				doc.image(CHEMIN_LOGO, doc.page.width / 2 - 40, 70, { width: 80, height: 80 });
			} catch {
				// si le fichier n'est pas une image valide, on ignore
			}
		}

		doc
			.fontSize(22)
			.fillColor(COULEURS.bleuCnhu)
			.text('RAPPORT DE SÉCURITÉ RÉSEAU', 50, LOGO_DISPONIBLE ? 170 : 100, {
				align: 'center'
			});
		doc
			.fontSize(13)
			.fillColor(COULEURS.texte)
			.text('Centre National Hospitalier Universitaire - HKM', { align: 'center' });
		doc.moveDown(1.5);

		doc
			.fontSize(10)
			.fillColor(COULEURS.texteClair)
			.text(`Type de rapport : ${type}`, { align: 'center' })
			.text(`Période couverte : ${periodeDebut} au ${periodeFin}`, { align: 'center' })
			.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, { align: 'center' })
			.text(`Généré par : ${admin.prenom} ${admin.nom}`, { align: 'center' });

		doc.moveDown(3);
		doc
			.fontSize(9)
			.fillColor(COULEURS.texteClair)
			.text('DOCUMENT CONFIDENTIEL', { align: 'center' });

		ajouterPiedDePage(doc, 'MediShield — Système de supervision IDS');

		// ============================================================
		// PAGE 2 — RÉSUMÉ EXÉCUTIF
		// ============================================================
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

		ajouterPiedDePage(doc, 'MediShield — Système de supervision IDS');

		// ============================================================
		// PAGE 3 — DÉTAIL DES ALERTES CRITIQUES
		// ============================================================
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
			doc.fontSize(9).fillColor('#ffffff');
			doc.rect(50, yLigne, 420, 20).fill(COULEURS.bleuCnhu);
			let xCol = 55;
			colonnes.forEach((c) => {
				doc.fillColor('#ffffff').text(c.titre, xCol, yLigne + 6, { width: c.largeur });
				xCol += c.largeur;
			});
			yLigne += 20;

			alertesCritiques.forEach((a, i) => {
				if (yLigne > doc.page.height - 80) {
					ajouterPiedDePage(doc, 'MediShield — Système de supervision IDS');
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

		ajouterPiedDePage(doc, 'MediShield — Système de supervision IDS');

		// ============================================================
		// PAGE 4 — ACTIONS EFFECTUÉES + ÉTAT DES ÉQUIPEMENTS
		// ============================================================
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

		ajouterPiedDePage(doc, 'MediShield — Système de supervision IDS');

		doc.end();

		flux.on('finish', resolve);
		flux.on('error', reject);
	});
}
