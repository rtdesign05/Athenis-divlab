-- ── Enums ─────────────────────────────────────────────────────────────────────
CREATE TYPE "FournisseurCategorie" AS ENUM ('MATIERES_PREMIERES', 'SERVICES', 'EQUIPEMENT', 'LOGISTIQUE', 'INFORMATIQUE', 'AUTRE');
CREATE TYPE "DeliveryNoteStatus"   AS ENUM ('EN_PREPARATION', 'EXPEDIE', 'LIVRE', 'RETOURNE');
CREATE TYPE "GoodsReceiptStatus"   AS ENUM ('ATTENDU', 'RECU_PARTIEL', 'RECU', 'LITIGE');
CREATE TYPE "CustomerReturnStatus" AS ENUM ('EN_COURS', 'VALIDE', 'REMBOURSE', 'REFUSE');

-- ── Fournisseurs ──────────────────────────────────────────────────────────────
CREATE TABLE "fournisseurs" (
    "id"              TEXT NOT NULL,
    "company_id"      TEXT NOT NULL,
    "agence_id"       TEXT,
    "nom"             TEXT NOT NULL,
    "categorie"       "FournisseurCategorie" NOT NULL DEFAULT 'AUTRE',
    "email"           TEXT,
    "telephone"       TEXT,
    "adresse"         TEXT,
    "notes"           TEXT,
    "accounting_code" TEXT,
    "is_active"       BOOLEAN NOT NULL DEFAULT true,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "fournisseurs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "fournisseurs_company_id_idx" ON "fournisseurs"("company_id");
CREATE INDEX "fournisseurs_agence_id_idx"  ON "fournisseurs"("agence_id");

ALTER TABLE "fournisseurs"
  ADD CONSTRAINT "fournisseurs_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fournisseurs"
  ADD CONSTRAINT "fournisseurs_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Bons de livraison ─────────────────────────────────────────────────────────
CREATE TABLE "delivery_notes" (
    "id"                TEXT NOT NULL,
    "company_id"        TEXT NOT NULL,
    "agence_id"         TEXT,
    "commande"          TEXT,
    "client_nom"        TEXT NOT NULL,
    "date_creation"     TIMESTAMP(3) NOT NULL,
    "date_prevue"       TIMESTAMP(3),
    "date_livraison"    TIMESTAMP(3),
    "statut"            "DeliveryNoteStatus" NOT NULL DEFAULT 'EN_PREPARATION',
    "lignes"            JSONB NOT NULL DEFAULT '[]',
    "adresse_livraison" TEXT,
    "notes"             TEXT,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "delivery_notes_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "delivery_notes_company_id_idx" ON "delivery_notes"("company_id");
CREATE INDEX "delivery_notes_agence_id_idx"  ON "delivery_notes"("agence_id");

ALTER TABLE "delivery_notes"
  ADD CONSTRAINT "delivery_notes_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_notes"
  ADD CONSTRAINT "delivery_notes_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Bons de réception ─────────────────────────────────────────────────────────
CREATE TABLE "goods_receipts" (
    "id"             TEXT NOT NULL,
    "company_id"     TEXT NOT NULL,
    "agence_id"      TEXT,
    "commande"       TEXT,
    "fournisseur_nom" TEXT NOT NULL,
    "date_creation"  TIMESTAMP(3) NOT NULL,
    "date_prevue"    TIMESTAMP(3),
    "date_reception" TIMESTAMP(3),
    "statut"         "GoodsReceiptStatus" NOT NULL DEFAULT 'ATTENDU',
    "lignes"         JSONB NOT NULL DEFAULT '[]',
    "notes"          TEXT,
    "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "goods_receipts_company_id_idx" ON "goods_receipts"("company_id");
CREATE INDEX "goods_receipts_agence_id_idx"  ON "goods_receipts"("agence_id");

ALTER TABLE "goods_receipts"
  ADD CONSTRAINT "goods_receipts_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "goods_receipts"
  ADD CONSTRAINT "goods_receipts_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Retours clients ───────────────────────────────────────────────────────────
CREATE TABLE "customer_returns" (
    "id"         TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "agence_id"  TEXT,
    "facture"    TEXT,
    "client_nom" TEXT NOT NULL,
    "date"       TIMESTAMP(3) NOT NULL,
    "motif"      TEXT,
    "montant"    DECIMAL(15,2) NOT NULL DEFAULT 0,
    "statut"     "CustomerReturnStatus" NOT NULL DEFAULT 'EN_COURS',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_returns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "customer_returns_company_id_idx" ON "customer_returns"("company_id");
CREATE INDEX "customer_returns_agence_id_idx"  ON "customer_returns"("agence_id");

ALTER TABLE "customer_returns"
  ADD CONSTRAINT "customer_returns_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_returns"
  ADD CONSTRAINT "customer_returns_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id") ON DELETE SET NULL ON UPDATE CASCADE;
