-- Treasury entry validation status
CREATE TYPE "TreasuryEntryStatus" AS ENUM ('a_traiter', 'traite');

ALTER TABLE "treasury_entries"
  ADD COLUMN "status"       "TreasuryEntryStatus" NOT NULL DEFAULT 'a_traiter',
  ADD COLUMN "contrepartie" JSONB,
  ADD COLUMN "extra_pieces" JSONB;
