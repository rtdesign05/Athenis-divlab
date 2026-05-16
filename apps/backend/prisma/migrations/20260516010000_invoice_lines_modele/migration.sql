-- Migration: invoice_lines_modele
-- 1. Ajoute modele et conditions_paiement aux invoices
-- 2. Crée la table invoice_lines

-- ── invoices — nouveaux champs ────────────────────────────────────────────────
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "modele"              TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "conditions_paiement" TEXT;

-- ── invoice_lines ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "invoice_lines" (
  "id"               TEXT          NOT NULL PRIMARY KEY,
  "invoice_id"       TEXT          NOT NULL,
  "description"      TEXT          NOT NULL,
  "quantite"         DECIMAL(10,3) NOT NULL DEFAULT 1,
  "unite"            TEXT          NOT NULL DEFAULT 'pièce',
  "prix_unitaire_ht" DECIMAL(12,2) NOT NULL,
  "tva_rate"         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  "montant_ht"       DECIMAL(12,2) NOT NULL,
  CONSTRAINT "invoice_lines_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "invoice_lines_invoice_id_idx"
  ON "invoice_lines"("invoice_id");
