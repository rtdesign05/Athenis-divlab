-- Ajout des colonnes de personnalisation des factures et identité légale
-- au modèle Company.
--
-- Ces colonnes étaient déjà attendues par le frontend (page Paramètres → Entreprise)
-- mais le backend les ignorait silencieusement (commentaire "Fields not in DB —
-- silently ignored" dans settings.service.ts). Cela causait une perte de données
-- silencieuse à chaque sauvegarde.
--
-- Utilise IF NOT EXISTS car certaines colonnes (vat_number) peuvent déjà avoir été
-- ajoutées hors du système de migration.

ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "naf_code"            TEXT,
  ADD COLUMN IF NOT EXISTS "vat_number"          TEXT,
  ADD COLUMN IF NOT EXISTS "primary_color"       TEXT,
  ADD COLUMN IF NOT EXISTS "secondary_color"     TEXT,
  ADD COLUMN IF NOT EXISTS "font"                TEXT,
  ADD COLUMN IF NOT EXISTS "invoice_mentions"    TEXT,
  ADD COLUMN IF NOT EXISTS "payment_terms"       INTEGER,
  ADD COLUMN IF NOT EXISTS "late_interest_rate"  DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "discount_rate"       DECIMAL(5, 2);
