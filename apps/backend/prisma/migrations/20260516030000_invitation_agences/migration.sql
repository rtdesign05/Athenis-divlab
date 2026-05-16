-- AlterTable: add agence assignment fields to invitations
ALTER TABLE "invitations"
  ADD COLUMN IF NOT EXISTS "agence_ids"    TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "is_restricted" BOOLEAN NOT NULL DEFAULT false;
