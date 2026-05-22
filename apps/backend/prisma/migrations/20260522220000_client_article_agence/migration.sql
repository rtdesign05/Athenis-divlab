-- Add agenceId FK to clients and articles (nullable)
ALTER TABLE "clients"
  ADD COLUMN "agence_id" TEXT;

ALTER TABLE "clients"
  ADD CONSTRAINT "clients_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "clients_agence_id_idx" ON "clients"("agence_id");

ALTER TABLE "articles"
  ADD COLUMN "agence_id" TEXT;

ALTER TABLE "articles"
  ADD CONSTRAINT "articles_agence_id_fkey"
  FOREIGN KEY ("agence_id") REFERENCES "agences"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "articles_agence_id_idx" ON "articles"("agence_id");
