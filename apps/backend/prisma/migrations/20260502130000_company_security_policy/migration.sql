-- AlterTable: add security_policy JSONB column to companies
ALTER TABLE "companies" ADD COLUMN "security_policy" JSONB;
