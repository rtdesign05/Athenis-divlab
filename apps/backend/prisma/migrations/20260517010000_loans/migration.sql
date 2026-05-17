-- CreateEnum
CREATE TYPE "LoanAmortType" AS ENUM ('CONSTANT_PAYMENT', 'CONSTANT_PRINCIPAL', 'IN_FINE', 'BULLET');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'REPAID', 'IN_DEFAULT');

-- CreateTable
CREATE TABLE "loans" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT NOT NULL,
    "principal" DECIMAL(15,2) NOT NULL,
    "rate" DECIMAL(7,4) NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "first_payment_date" TIMESTAMP(3) NOT NULL,
    "amort_type" "LoanAmortType" NOT NULL DEFAULT 'CONSTANT_PAYMENT',
    "currency" TEXT NOT NULL DEFAULT 'XAF',
    "account" TEXT,
    "bank_account" TEXT,
    "interest_account" TEXT,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "loans_company_id_reference_key" ON "loans"("company_id", "reference");

-- CreateIndex
CREATE INDEX "loans_company_id_status_idx" ON "loans"("company_id", "status");

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
