# MediShield

Système de supervision IDS pour la protection des données médicales
d'un réseau hospitalier — Cas du CNHU Hubert Koutoukou MAGA (CNHU-HKM).

Ce dossier contient le projet **repris à zéro et regroupé en un seul
endroit** : le backend, le frontend, et le schéma de base de données.
Seule la partie web est couverte pour l'instant (pas encore la
liaison avec Suricata/GNS3, ni le nombre réel de machines — ce sera
ajouté dans une étape suivante).

## Structure

```
medishield/
  backend/     -> API Node.js + Express + MySQL (auth + OTP par email)
  frontend/    -> Interface SvelteKit + Tailwind (login + dashboard)
  schema.sql   -> Schéma MySQL complet (12 tables), à la racine car
                  partagé conceptuellement par le backend et le
                  frontend
```

## Démarrage rapide

### 1. Base de données

```bash
mysql -u root -p < schema.sql
```

Avec XAMPP :
```
"C:\xampp1\mysql\bin\mysql.exe" -u root -p < schema.sql
```
(Entrée vide au prompt du mot de passe — XAMPP n'a pas de mot de
passe root par défaut.)

### 2. Backend (terminal n°1)

```bash
cd backend
npm install
copy .env.example .env
```
Édite `.env` (identifiants MySQL + SMTP Gmail), puis :
```bash
node creer-admin.js
npm run dev
```
Backend démarré sur `http://localhost:4000`.

### 3. Frontend (terminal n°2)

```bash
cd frontend
npm install
npm run dev
```
Frontend démarré sur `http://localhost:5173`. Ouvre
`http://localhost:5173/login`.

### 4. Ton logo

Dépose un fichier `logo.png` dans `frontend/static/logo.png` — il
s'affiche automatiquement sur la page de connexion et dans la sidebar
du dashboard. Aucune autre modification n'est nécessaire.

## Ce qui fonctionne déjà

- Page de connexion avec formulaire email/mot de passe
- Envoi d'un code OTP par email (valable 5 minutes)
- Vérification du code + génération d'un token JWT
- Redirection automatique vers le dashboard une fois connecté
- Dashboard protégé (redirige vers /login si pas de token)
- Déconnexion fonctionnelle
- Bascule visuelle de mode IDS/IPS
- Graphiques (courbe style trading + répartition par gravité) —
  encore alimentés par des données simulées

## Ce qui reste à faire

- Lecture réelle des événements Suricata (`eve.json`)
- Connexion WebSocket temps réel entre le backend et le dashboard
- Simulation réseau GNS3 + intégration Kali Linux
- Nombre réel de machines/équipements
- Génération de rapports PDF
- Pages Alertes, Réseau, Logs, Gestion IP, Statistiques,
  Administration, Paramètres
