# MediShield — Frontend (SvelteKit + Tailwind)

Interface web : page de connexion (email/mdp + OTP) et dashboard de
supervision.

## Ajouter ton logo

Dépose un seul fichier, `logo.png`, directement dans le dossier
`static/` (donc : `medishield/frontend/static/logo.png`).

C'est tout — aucune modification de code n'est nécessaire. Le logo
s'affiche automatiquement :
1. Sur la page de connexion (grand format, centré)
2. Dans la barre latérale du dashboard (petit format)

Si le fichier est absent, une icône bouclier de secours s'affiche
à la place, l'interface reste fonctionnelle.

## Installation et lancement

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173/login`.

## Backend requis

Cette interface a besoin du backend MediShield (dossier `../backend`)
démarré en parallèle sur `http://localhost:4000`. Sans lui, le login
renverra une erreur de connexion.

## Structure du projet

```
src/routes/
  login/+page.svelte   -> page de connexion (email/mdp + OTP)
  +page.svelte          -> dashboard (protégé, redirige vers /login
                            si aucun token n'est présent)
src/lib/
  api/auth.ts            -> client API pour /login et /verify-otp
  components/            -> StatCard, AlertsTable, DonutChart, TradingChart
  components/ui/         -> Card, Badge, Switch (façon shadcn)
static/logo.png          -> dépose ton logo ici (voir plus haut)
```

## Ce qui n'est PAS encore fait (volontairement)

- Connexion réelle à Suricata / lecture de eve.json
- Simulation réseau GNS3
- Nombre réel de machines/équipements (stats simulées via setInterval)
- Génération de rapports PDF
- Pages Alertes, Réseau, Logs, Gestion IP, Statistiques, Administration,
  Paramètres (seule la navigation existe dans la sidebar)
