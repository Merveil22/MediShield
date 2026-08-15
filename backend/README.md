# MediShield — Backend (Node.js + Express + MySQL)

API d'authentification en 2 étapes (login + OTP par email) pour
l'application MediShield (CNHU-HKM).

## La logique, expliquée simplement

```
1. POST /api/login  { email, motDePasse }
   -> Vérifie l'email + le mot de passe (bcrypt) dans MySQL
   -> Si correct : génère un code à 6 chiffres (crypto.randomInt)
   -> Enregistre ce code en base avec expiration = maintenant + 5 min
   -> Envoie le code par email
   -> Renvoie { utilisateurId, dureeValiditeSecondes } (jamais le code)

2. POST /api/verify-otp  { utilisateurId, code }
   -> Vérifie : le code correspond ? pas expiré ? pas déjà utilisé ?
   -> Si tout est bon : marque l'OTP comme utilisé, émet un JWT
   -> Renvoie { token }

3. Le frontend envoie ce token dans le header
   Authorization: Bearer <token> pour toutes les requêtes protégées
```

## Installation

Prérequis : Node.js 18+, MySQL (via XAMPP ou autre).

```bash
npm install
```

## Configuration

```bash
copy .env.example .env      (Windows CMD)
# ou : cp .env.example .env  (PowerShell/Mac/Linux)
```

Édite `.env` avec tes identifiants MySQL (avec XAMPP : `DB_USER=root`,
`DB_PASSWORD=` vide) et SMTP (Gmail : utilise un "mot de passe
d'application", pas ton mot de passe normal).

## Créer la base de données

Le schéma complet est à la racine du projet global, dans
`../schema.sql` (12 tables, partagées avec le frontend qui décrit la
même structure de données).

```bash
mysql -u root -p < ../schema.sql
```

Avec XAMPP :
```
"C:\xampp1\mysql\bin\mysql.exe" -u root -p < ../schema.sql
```
(Entrée vide au prompt du mot de passe.)

## Créer un compte admin de test

```bash
node creer-admin.js
```

## Lancer le serveur

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:4000`.

## Tester sans interface (optionnel)

```bash
node test-connexion.js
```

Ce script te demande email/mot de passe puis le code OTP reçu par
email, et affiche le token JWT obtenu — utile pour vérifier que le
backend fonctionne avant de brancher le frontend.
