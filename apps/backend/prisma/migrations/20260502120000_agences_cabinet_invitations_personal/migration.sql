-- CreateEnum
CREATE TYPE "CabinetInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "agences" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_siege" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agence_members" (
    "id" TEXT NOT NULL,
    "agence_id" TEXT NOT NULL,
    "company_member_id" TEXT NOT NULL,
    "is_restricted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "agence_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinet_invitations" (
    "id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "company_email" TEXT,
    "company_name" TEXT,
    "type" "MandatType" NOT NULL DEFAULT 'COMPLET',
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "token" TEXT NOT NULL,
    "status" "CabinetInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cabinet_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_revenus" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "recurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_revenus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_depenses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_depenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_objectifs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_amount" DECIMAL(12,2) NOT NULL,
    "current_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_objectifs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "personal_comptes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'COURANT',
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "iban" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personal_comptes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agences_company_id_idx" ON "agences"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "agences_company_id_code_key" ON "agences"("company_id", "code");

-- CreateIndex
CREATE INDEX "agence_members_agence_id_idx" ON "agence_members"("agence_id");

-- CreateIndex
CREATE UNIQUE INDEX "agence_members_company_member_id_agence_id_key" ON "agence_members"("company_member_id", "agence_id");

-- CreateIndex
CREATE UNIQUE INDEX "cabinet_invitations_token_key" ON "cabinet_invitations"("token");

-- CreateIndex
CREATE INDEX "cabinet_invitations_cabinet_id_idx" ON "cabinet_invitations"("cabinet_id");

-- CreateIndex
CREATE INDEX "cabinet_invitations_token_idx" ON "cabinet_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "personal_profiles_user_id_key" ON "personal_profiles"("user_id");

-- CreateIndex
CREATE INDEX "personal_revenus_user_id_idx" ON "personal_revenus"("user_id");

-- CreateIndex
CREATE INDEX "personal_depenses_user_id_idx" ON "personal_depenses"("user_id");

-- CreateIndex
CREATE INDEX "personal_objectifs_user_id_idx" ON "personal_objectifs"("user_id");

-- CreateIndex
CREATE INDEX "personal_comptes_user_id_idx" ON "personal_comptes"("user_id");

-- AddForeignKey
ALTER TABLE "agences" ADD CONSTRAINT "agences_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agence_members" ADD CONSTRAINT "agence_members_agence_id_fkey" FOREIGN KEY ("agence_id") REFERENCES "agences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agence_members" ADD CONSTRAINT "agence_members_company_member_id_fkey" FOREIGN KEY ("company_member_id") REFERENCES "company_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cabinet_invitations" ADD CONSTRAINT "cabinet_invitations_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_profiles" ADD CONSTRAINT "personal_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_revenus" ADD CONSTRAINT "personal_revenus_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_depenses" ADD CONSTRAINT "personal_depenses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_objectifs" ADD CONSTRAINT "personal_objectifs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "personal_comptes" ADD CONSTRAINT "personal_comptes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

