-- Multi-factor authentication : TOTP (existant), EMAIL, SMS
-- Garde twoFAEnabled comme flag "any MFA enabled" pour rester rétro-compat
-- avec le code TOTP existant. Ajoute mfaMethod pour distinguer les méthodes.

-- 1. Enum MfaMethod
CREATE TYPE "MfaMethod" AS ENUM ('NONE', 'TOTP', 'EMAIL', 'SMS');

-- 2. Colonnes sur users
ALTER TABLE "users"
  ADD COLUMN "mfa_method"               "MfaMethod" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "mfa_phone"                TEXT,
  ADD COLUMN "mfa_phone_verified"       BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN "mfa_active_code_hash"     TEXT,
  ADD COLUMN "mfa_code_expires_at"      TIMESTAMP(3),
  ADD COLUMN "mfa_code_attempts"        INTEGER     NOT NULL DEFAULT 0;

-- 3. Pour les users qui avaient déjà twoFAEnabled=true (TOTP via app), on
--    migre leur mfa_method vers TOTP pour la cohérence des données.
UPDATE "users"
   SET "mfa_method" = 'TOTP'
 WHERE "totp_enabled" = true;
