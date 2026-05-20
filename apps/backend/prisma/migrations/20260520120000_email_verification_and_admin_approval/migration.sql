-- Email verification + admin approval workflow
-- Phase de test : chaque inscription doit être validée par un SUPER_ADMIN
-- après que l'utilisateur ait confirmé son adresse email.

-- 1. Enum ApprovalStatus
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- 2. Colonnes sur users
ALTER TABLE "users"
  ADD COLUMN "email_verified"                 BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN "email_verification_token"       TEXT,
  ADD COLUMN "email_verification_expires_at"  TIMESTAMP(3),
  ADD COLUMN "approval_status"                "ApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN "approved_at"                    TIMESTAMP(3),
  ADD COLUMN "approved_by_id"                 TEXT,
  ADD COLUMN "rejected_at"                    TIMESTAMP(3),
  ADD COLUMN "rejection_reason"               TEXT;

-- 3. Unique index sur le token de vérification
CREATE UNIQUE INDEX "users_email_verification_token_key"
  ON "users"("email_verification_token");

-- 4. Pour ne pas casser les comptes déjà créés (notamment le SUPER_ADMIN
--    actuel mouafoulrich15@gmail.com), on marque tous les users existants
--    comme déjà vérifiés et approuvés. Les futures inscriptions partiront
--    de PENDING_APPROVAL / email_verified=false.
UPDATE "users"
   SET "email_verified"  = true,
       "approval_status" = 'APPROVED',
       "approved_at"     = NOW();
