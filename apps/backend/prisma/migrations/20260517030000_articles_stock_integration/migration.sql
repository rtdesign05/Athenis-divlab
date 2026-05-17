-- Intégration Articles ↔ Stock ↔ Comptabilité
-- Lie les lignes facture/commande aux articles + ajoute compte de stock

-- ── Article : comptes de stock et variation ───────────────────────────────
ALTER TABLE "articles" ADD COLUMN "compte_stock" TEXT;
ALTER TABLE "articles" ADD COLUMN "compte_variation_stock" TEXT;

-- ── InvoiceLine : FK article (mouvement de stock SORTIE_VENTE) ────────────
ALTER TABLE "invoice_lines" ADD COLUMN "article_id" TEXT;
CREATE INDEX "invoice_lines_article_id_idx" ON "invoice_lines"("article_id");
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── PurchaseOrderLine : FK article (mouvement ENTREE_ACHAT) ───────────────
ALTER TABLE "purchase_order_lines" ADD COLUMN "article_id" TEXT;
CREATE INDEX "purchase_order_lines_article_id_idx" ON "purchase_order_lines"("article_id");
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_article_id_fkey"
  FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
