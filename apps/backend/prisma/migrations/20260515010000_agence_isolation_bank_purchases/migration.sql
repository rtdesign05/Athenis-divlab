-- Migration: agence_isolation_bank_purchases
-- 1. Add agence_id to bank_transactions (trésorerie isolation)
-- 2. Create purchase_orders and purchase_order_lines tables (achats)

-- ── bank_transactions ─────────────────────────────────────────────────────────
ALTER TABLE "bank_transactions"
  ADD COLUMN IF NOT EXISTS "agence_id" TEXT;

ALTER TABLE "bank_transactions"
  ADD CONSTRAINT "bank_transactions_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "bank_transactions_agence_id_idx"
  ON "bank_transactions"("agence_id");

-- ── purchase_orders ───────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id"                  TEXT          NOT NULL PRIMARY KEY,
  "company_id"          TEXT          NOT NULL,
  "agence_id"           TEXT,
  "fiscal_year_id"      TEXT,
  "number"              TEXT          NOT NULL,
  "fournisseur"         TEXT          NOT NULL,
  "objet"               TEXT          NOT NULL,
  "status"              "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "date"                TIMESTAMP(3)  NOT NULL,
  "reception_at"        TIMESTAMP(3),
  "montant_ht"          DECIMAL(12,2) NOT NULL,
  "vat_rate"            DECIMAL(5,2)  NOT NULL DEFAULT 0,
  "montant_ttc"         DECIMAL(12,2) NOT NULL,
  "conditions_paiement" TEXT,
  "notes"               TEXT,
  "created_at"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_orders_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "purchase_orders_agence_id_fkey"
    FOREIGN KEY ("agence_id") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "purchase_orders_fiscal_year_id_fkey"
    FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "purchase_orders_company_id_number_key"
    UNIQUE ("company_id", "number")
);

CREATE INDEX IF NOT EXISTS "purchase_orders_company_id_status_idx"
  ON "purchase_orders"("company_id", "status");

CREATE INDEX IF NOT EXISTS "purchase_orders_agence_id_idx"
  ON "purchase_orders"("agence_id");

-- ── purchase_order_lines ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
  "id"               TEXT          NOT NULL PRIMARY KEY,
  "order_id"         TEXT          NOT NULL,
  "reference"        TEXT,
  "designation"      TEXT          NOT NULL,
  "quantite"         DECIMAL(10,3) NOT NULL,
  "unite"            TEXT          NOT NULL DEFAULT 'pièce',
  "prix_unitaire_ht" DECIMAL(12,2) NOT NULL,
  "montant_ht"       DECIMAL(12,2) NOT NULL,
  CONSTRAINT "purchase_order_lines_order_id_fkey"
    FOREIGN KEY ("order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "purchase_order_lines_order_id_idx"
  ON "purchase_order_lines"("order_id");
