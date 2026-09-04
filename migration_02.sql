-- ============================================================
-- MediShield — Migration incrémentale
-- À exécuter APRÈS ton schema.sql existant (ne recrée rien,
-- ajoute seulement les nouvelles colonnes/tables nécessaires).
-- ============================================================

USE medishield;

-- ------------------------------------------------------------
-- 1. Mot de passe de chiffrement de chaque rapport PDF généré
--    (visible uniquement par le super_admin, via le dashboard)
-- ------------------------------------------------------------
ALTER TABLE rapports
    ADD COLUMN mot_de_passe_pdf VARCHAR(64) NULL AFTER chemin_fichier;

-- ------------------------------------------------------------
-- 2. Confirmation d'email obligatoire avant la première connexion
-- ------------------------------------------------------------
ALTER TABLE utilisateurs
    ADD COLUMN email_confirme BOOLEAN NOT NULL DEFAULT FALSE AFTER canal_otp_prefere;

CREATE TABLE IF NOT EXISTS confirmations_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL,
    code VARCHAR(6) NOT NULL,
    cree_le TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expire_le DATETIME NOT NULL,
    utilise BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);

CREATE INDEX idx_confirmations_utilisateur ON confirmations_email (utilisateur_id, utilise);
