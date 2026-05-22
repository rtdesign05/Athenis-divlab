-- CreateTable
CREATE TABLE "treasury_sources" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "agence_id" TEXT,
    "type" "TreasurySourceType" NOT NULL,
    "nom" TEXT NOT NULL,
    "solde" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "devise" TEXT NOT NULL DEFAULT 'XAF',
    "banque" TEXT,
    "numero" TEXT,
    "responsable" TEXT,
    "operateur" TEXT,
    "numero_telephone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "treasury_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "treasury_sources_company_id_type_idx" ON "treasury_sources"("company_id", "type");

-- CreateIndex
CREATE INDEX "treasury_sources_agence_id_idx" ON "treasury_sources"("agence_id");

-- AddForeignKey
ALTER TABLE "treasury_sources"
    ADD CONSTRAINT "treasury_sources_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "treasury_sources"
    ADD CONSTRAINT "treasury_sources_agence_id_fkey"
    FOREIGN KEY ("agence_id") REFERENCES "agences"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
