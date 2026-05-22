-- Add missing fields to Mandat
ALTER TABLE "mandats"
  ADD COLUMN "date_debut" TIMESTAMP(3),
  ADD COLUMN "date_fin"   TIMESTAMP(3),
  ADD COLUMN "notes"      TEXT;

-- Extend MandatType enum with FISCAL and PARTIEL
ALTER TYPE "MandatType" ADD VALUE IF NOT EXISTS 'FISCAL';
ALTER TYPE "MandatType" ADD VALUE IF NOT EXISTS 'PARTIEL';
