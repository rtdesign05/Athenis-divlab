-- Ajoute les moyens de paiement pour les employés (Mobile Money + Banque)
CREATE TYPE "PaymentMethod" AS ENUM ('MOBILE_MONEY', 'BANK_TRANSFER', 'CASH', 'CHECK');

ALTER TABLE "employees" ADD COLUMN "phone"                   TEXT;
ALTER TABLE "employees" ADD COLUMN "payment_method"          "PaymentMethod";
ALTER TABLE "employees" ADD COLUMN "mobile_money_number"     TEXT;
ALTER TABLE "employees" ADD COLUMN "mobile_money_provider"   TEXT;
ALTER TABLE "employees" ADD COLUMN "bank_name"               TEXT;
ALTER TABLE "employees" ADD COLUMN "bank_account_holder"     TEXT;
ALTER TABLE "employees" ADD COLUMN "bank_account_number"     TEXT;
ALTER TABLE "employees" ADD COLUMN "bank_swift_code"         TEXT;
