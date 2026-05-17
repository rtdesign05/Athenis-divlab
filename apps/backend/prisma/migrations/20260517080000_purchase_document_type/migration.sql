-- PurchaseOrder : distinction Bon de commande (ORDER, auto-incrément) vs Facture d'achat (INVOICE, ref manuelle)
CREATE TYPE "PurchaseDocumentType" AS ENUM ('ORDER', 'INVOICE');

ALTER TABLE "purchase_orders"
  ADD COLUMN "document_type" "PurchaseDocumentType" NOT NULL DEFAULT 'ORDER',
  ADD COLUMN "piece_url" TEXT,
  ADD COLUMN "piece_name" TEXT;
