-- Migration: treasury_entries
-- Table pour les mouvements manuels de trésorerie (caisse, banque, mobile money)

DO $$ BEGIN
  CREATE TYPE "TreasurySourceType" AS ENUM ('banque', 'caisse', 'mobile_money');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "treasury_entries" (
  "id"          TEXT                NOT NULL PRIMARY KEY,
  "company_id"  TEXT                NOT NULL,
  "agence_id"   TEXT,
  "date"        TIMESTAMP(3)        NOT NULL,
  "libelle"     TEXT                NOT NULL,
  "montant"     DECIMAL(12,2)       NOT NULL,
  "source_type" "TreasurySourceType" NOT NULL,
  "source_name" TEXT                NOT NULL,
  "piece_name"  TEXT,
  "created_at"  TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "treasury_entries_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "treasury_entries_agence_id_fkey"
    FOREIGN KEY ("agence_id") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "treasury_entries_company_id_idx"
  ON "treasury_entries"("company_id");
CREATE INDEX IF NOT EXISTS "treasury_entries_agence_id_idx"
  ON "treasury_entries"("agence_id");
CREATE INDEX IF NOT EXISTS "treasury_entries_source_name_idx"
  ON "treasury_entries"("company_id", "source_name");
