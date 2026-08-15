-- ============================================================
-- MediShield — Schéma MySQL complet
-- Système de supervision IDS pour le CNHU-HKM
-- Basé sur le Document de Conception Technique et Fonctionnelle v1.0
-- ============================================================

-- ATTENTION : cette ligne supprime la base existante si elle existe
-- déjà, pour repartir sur une base propre à chaque exécution (utile
-- en développement). Commente-la si tu ne veux JAMAIS effacer les
-- données existantes.
DROP DATABASE IF EXISTS medishield;

CREATE DATABASE IF NOT EXISTS medishield
    CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE medishield;

-- ------------------------------------------------------------
-- 1. UTILISATEURS — comptes administrateurs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    pseudo VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    telephone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('super_admin', 'admin') NOT NULL DEFAULT 'super_admin',
    otp_active BOOLEAN NOT NULL DEFAULT TRUE,
    canal_otp_prefere ENUM('email') NOT NULL DEFAULT 'email',
    status ENUM('actif', 'inactif', 'bloque') NOT NULL DEFAULT 'actif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME NULL
);

-- ------------------------------------------------------------
-- 2. OTP — codes d'authentification temporaires
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    code VARCHAR(6) NOT NULL,
    canal ENUM('email') NOT NULL DEFAULT 'email',
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expire_le DATETIME NOT NULL,
    utilise BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 3. SESSIONS — sessions actives (JWT émis après OTP validé)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    token_jti VARCHAR(64) NOT NULL UNIQUE,
    ip_connexion VARCHAR(45),
    creee_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expire_le DATETIME NOT NULL,
    revoquee BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 4. EQUIPEMENTS — éléments du réseau à surveiller
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    type ENUM('serveur', 'routeur', 'switch', 'pare_feu', 'poste') NOT NULL,
    vlan VARCHAR(50),
    statut ENUM('normal', 'attention', 'hors_service') NOT NULL DEFAULT 'normal',
    derniere_alerte_id INT NULL,
    derniere_verification DATETIME NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 5. ALERTES — événements de sécurité détectés par Suricata
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alertes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_heure DATETIME NOT NULL,
    ip_source VARCHAR(45) NOT NULL,
    ip_cible VARCHAR(45),
    type_attaque VARCHAR(100) NOT NULL,
    gravite ENUM('critique', 'elevee', 'moyenne', 'faible') NOT NULL,
    statut ENUM('nouvelle', 'en_cours', 'traitee', 'ignoree') NOT NULL DEFAULT 'nouvelle',
    message TEXT NOT NULL,
    suricata_event_id VARCHAR(100),
    equipement_id INT NULL,
    notes TEXT,
    traite_par INT NULL,
    traite_le DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (equipement_id) REFERENCES equipements(id) ON DELETE SET NULL,
    FOREIGN KEY (traite_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- Ajout de la clé étrangère différée pour equipements.derniere_alerte_id
-- (créée après alertes car référence croisée)
ALTER TABLE equipements
    ADD CONSTRAINT fk_equipement_derniere_alerte
    FOREIGN KEY (derniere_alerte_id) REFERENCES alertes(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- 6. BLOCAGES_IP — adresses IP bloquées via iptables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blocages_ip (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip VARCHAR(45) NOT NULL UNIQUE,
    raison VARCHAR(255) NOT NULL,
    alerte_id INT NULL,
    bloque_par INT NOT NULL,
    bloque_le DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duree ENUM('permanent', 'temporaire') NOT NULL DEFAULT 'permanent',
    expire_le DATETIME NULL,
    debloque_par INT NULL,
    debloque_le DATETIME NULL,
    commentaire TEXT,
    FOREIGN KEY (alerte_id) REFERENCES alertes(id) ON DELETE SET NULL,
    FOREIGN KEY (bloque_par) REFERENCES utilisateurs(id) ON DELETE RESTRICT,
    FOREIGN KEY (debloque_par) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 7. LOGS — journal des événements système
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_heure DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source ENUM('suricata', 'auth', 'admin', 'system') NOT NULL,
    type ENUM('info', 'warn', 'error', 'debug') NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    details JSON NULL,
    utilisateur_id INT NULL,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 8. NOTIFICATIONS — alertes envoyées à l'utilisateur
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    alerte_id INT NULL,
    type VARCHAR(50) NOT NULL,
    canal ENUM('email', 'dashboard') NOT NULL DEFAULT 'dashboard',
    message TEXT NOT NULL,
    lue BOOLEAN NOT NULL DEFAULT FALSE,
    envoye_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
    FOREIGN KEY (alerte_id) REFERENCES alertes(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 9. PARAMETRES — configuration générale du système
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parametres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cle VARCHAR(100) NOT NULL UNIQUE,
    valeur TEXT,
    description VARCHAR(255),
    modifie_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Quelques paramètres par défaut (URL, fuseau horaire, seuils…)
INSERT INTO parametres (cle, valeur, description) VALUES
    ('nom_application', 'MediShield', 'Nom affiché de l\'application'),
    ('fuseau_horaire', 'Africa/Porto-Novo', 'Fuseau horaire du système'),
    ('otp_duree_secondes', '300', 'Durée de validité d\'un code OTP'),
    ('seuil_criticite_email', 'critique', 'Niveau minimum déclenchant un email immédiat')
ON DUPLICATE KEY UPDATE cle = cle;

-- ------------------------------------------------------------
-- 10. ACTIVITES — actions effectuées par les administrateurs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    details TEXT,
    ip_utilisateur VARCHAR(45),
    date_heure TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 11. STATISTIQUES — métriques agrégées (calculées périodiquement)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS statistiques (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_jour DATE NOT NULL UNIQUE,
    nb_alertes_total INT NOT NULL DEFAULT 0,
    nb_alertes_critiques INT NOT NULL DEFAULT 0,
    nb_alertes_elevees INT NOT NULL DEFAULT 0,
    nb_alertes_moyennes INT NOT NULL DEFAULT 0,
    nb_alertes_faibles INT NOT NULL DEFAULT 0,
    nb_ip_bloquees INT NOT NULL DEFAULT 0,
    nb_alertes_traitees INT NOT NULL DEFAULT 0,
    score_securite TINYINT UNSIGNED NOT NULL DEFAULT 100,
    genere_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 12. RAPPORTS — rapports PDF générés
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rapports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    type ENUM('quotidien', 'hebdomadaire', 'mensuel', 'personnalise') NOT NULL,
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    chemin_fichier VARCHAR(500),
    taille INT UNSIGNED COMMENT 'Taille du fichier en octets',
    genere_par INT NOT NULL,
    genere_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    statut ENUM('en_attente', 'genere', 'erreur') NOT NULL DEFAULT 'en_attente',
    nb_alertes INT DEFAULT 0,
    nb_critiques INT DEFAULT 0,
    score_securite TINYINT UNSIGNED,
    notes TEXT,
    FOREIGN KEY (genere_par) REFERENCES utilisateurs(id) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- INDEX — pour les performances sur les requêtes fréquentes
-- ------------------------------------------------------------
CREATE INDEX idx_alertes_recherche ON alertes (date_heure, ip_source, gravite, statut);
CREATE INDEX idx_blocages_ip ON blocages_ip (ip, bloque_le);
CREATE INDEX idx_rapports_periode ON rapports (periode_debut, periode_fin, type);
CREATE INDEX idx_logs_recherche ON logs (date_heure, source, type);
CREATE INDEX idx_equipements_statut ON equipements (statut, type);
CREATE INDEX idx_otp_utilisateur ON otp (utilisateur_id, utilise);
CREATE INDEX idx_sessions_utilisateur ON sessions (utilisateur_id, revoquee);
CREATE INDEX idx_notifications_utilisateur ON notifications (utilisateur_id, lue);

-- ------------------------------------------------------------
-- DONNÉES DE DÉMONSTRATION — équipements du CNHU-HKM
-- (à retirer ou adapter une fois la vraie topologie GNS3 connectée)
-- ------------------------------------------------------------
INSERT INTO equipements (nom, ip, type, vlan, statut, description) VALUES
    ('Serveur Web', '192.168.40.10', 'serveur', 'VLAN 40 - Serveurs', 'normal', 'Serveur applicatif principal'),
    ('Serveur Base de données', '192.168.40.20', 'serveur', 'VLAN 40 - Serveurs', 'normal', 'MySQL de production'),
    ('Poste Urgences 1', '192.168.20.11', 'poste', 'VLAN 20 - Urgences', 'normal', NULL),
    ('Poste Laboratoire 1', '192.168.30.11', 'poste', 'VLAN 30 - Laboratoire', 'normal', NULL),
    ('Poste Administration 1', '192.168.10.11', 'poste', 'VLAN 10 - Administration', 'normal', NULL),
    ('Pare-feu principal', '192.168.99.1', 'pare_feu', 'VLAN 99 - Gestion', 'normal', 'Firewall périmétrique'),
    ('Switch cœur', '192.168.99.2', 'switch', 'VLAN 99 - Gestion', 'normal', NULL);
