-- Migration: agence_isolation_invoices_expenses
-- Adds agence_id to invoices and expenses tables for multi-site data isolation.

-- ── invoices ──────────────────────────────────────────────────────────────────
ALTER TABLE "invoices"
  ADD COLUMN IF NOT EXISTS "agence_id" TEXT;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "invoices_agence_id_idx" ON "invoices"("agence_id");

-- ── expenses ──────────────────────────────────────────────────────────────────
ALTER TABLE "expenses"
  ADD COLUMN IF NOT EXISTS "agence_id" TEXT;

ALTER TABLE "expenses"
  ADD CONSTRAINT "expenses_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "expenses_agence_id_idx" ON "expenses"("agence_id");
