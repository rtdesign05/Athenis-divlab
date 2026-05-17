-- Intégration Gestion ↔ Comptabilité
-- Ajoute les comptes comptables sur Client, Invoice, PurchaseOrder + flag de comptabilisation

-- ── Client : compte comptable (411xxx) ────────────────────────────────────
ALTER TABLE "clients" ADD COLUMN "accounting_code" TEXT;

-- ── Invoice : flag de comptabilisation + référence pièce générée ─────────
ALTER TABLE "invoices" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invoices" ADD COLUMN "posted_piece_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN "posted_at" TIMESTAMP(3);

-- ── InvoiceLine : compte de vente par ligne (7xx) ─────────────────────────
ALTER TABLE "invoice_lines" ADD COLUMN "compte_vente" TEXT;

-- ── PurchaseOrder : compte fournisseur + comptabilisation ─────────────────
ALTER TABLE "purchase_orders" ADD COLUMN "supplier_account" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "posted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "purchase_orders" ADD COLUMN "posted_piece_id" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN "posted_at" TIMESTAMP(3);

-- ── PurchaseOrderLine : compte d'achat par ligne (6xx) ────────────────────
ALTER TABLE "purchase_order_lines" ADD COLUMN "compte_achat" TEXT;
