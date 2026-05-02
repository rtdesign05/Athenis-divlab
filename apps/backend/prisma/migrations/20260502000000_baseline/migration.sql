-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('PERSONAL', 'COMPANY', 'CABINET');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMPTABLE', 'READONLY', 'RH', 'JURIDIQUE');

-- CreateEnum
CREATE TYPE "CompanySize" AS ENUM ('TPE', 'PME', 'ETI', 'GE');

-- CreateEnum
CREATE TYPE "AccountingZone" AS ENUM ('FRANCE', 'OHADA', 'IFRS');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PRO', 'PREMIUM');

-- CreateEnum
CREATE TYPE "MandatType" AS ENUM ('COMPLET', 'COMPTABILITE', 'GESTION', 'DECLARATIONS');

-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('DRAFT', 'OPEN', 'LOCKED', 'CLOSED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('TRAVEL', 'EQUIPMENT', 'SOFTWARE', 'SALARY', 'RENT', 'MARKETING', 'CONSULTING', 'OTHER');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN');

-- CreateEnum
CREATE TYPE "ChartAccountType" AS ENUM ('ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT');

-- CreateEnum
CREATE TYPE "AccountReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'ANOMALY');

-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('INCORPOREL', 'CORPOREL', 'FINANCIER', 'EN_COURS');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_SERVICE', 'DISPOSED', 'SCRAPPED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "DeprecMode" AS ENUM ('LINEAR', 'DEGRESSIVE');

-- CreateEnum
CREATE TYPE "StockMethod" AS ENUM ('CMUP', 'FIFO');

-- CreateEnum
CREATE TYPE "MouvType" AS ENUM ('ENTREE_ACHAT', 'ENTREE_RETOUR', 'ENTREE_INVENTAIRE', 'SORTIE_VENTE', 'SORTIE_CASSE', 'SORTIE_INVENTAIRE', 'TRANSFERT', 'AJUSTEMENT');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('IGS', 'REEL_NORMAL', 'REEL_SIMPLIFIE', 'FORFAIT_BIENNAL', 'MICRO_ENTREPRISE', 'LIBERATOIRE');

-- CreateEnum
CREATE TYPE "VatRegime" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'NON_ASSUJETTI');

-- CreateEnum
CREATE TYPE "TaxType" AS ENUM ('TVA', 'IS', 'IS_ACOMPTE', 'PATENTE', 'RAS', 'CNPS', 'FDFP', 'DSF');

-- CreateEnum
CREATE TYPE "TaxDeclStatus" AS ENUM ('PENDING', 'DECLARED', 'PAID', 'LATE', 'EXEMPTED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'INVITED');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'DISMISSED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'TOTP_ENABLED', 'TOTP_DISABLED', 'TOTP_FAILED', 'PASSWORD_CHANGED', 'ACCOUNT_LOCKED', 'TOKEN_REFRESHED', 'TOKEN_REVOKED', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'INVOICE_CREATED', 'INVOICE_UPDATED', 'INVOICE_DELETED', 'EXPENSE_CREATED', 'EXPENSE_UPDATED', 'CLIENT_CREATED', 'CLIENT_UPDATED', 'EMPLOYEE_CREATED', 'DATA_EXPORTED', 'CABINET_ACCESS', 'MANDAT_CREATED', 'MANDAT_REVOKED', 'COMPANY_INVITED');

-- CreateEnum
CREATE TYPE "BankTxType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'SIGNED', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('EMPLOYMENT', 'SERVICE', 'NDA', 'PARTNERSHIP', 'LEASE', 'SUPPLIER', 'CLIENT', 'OTHER');

-- CreateEnum
CREATE TYPE "EsgActionPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "EsgActionStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EsgPilier" AS ENUM ('E', 'S', 'G');

-- CreateEnum
CREATE TYPE "GdprLegalBasis" AS ENUM ('CONSENT', 'CONTRACT', 'LEGAL_OBLIGATION', 'VITAL_INTEREST', 'PUBLIC_TASK', 'LEGITIMATE_INTEREST');

-- CreateEnum
CREATE TYPE "GdprRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "IgsPayment" AS ENUM ('ANNUEL', 'TRIMESTRIEL');

-- CreateEnum
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('CP', 'RTT', 'SICK', 'MATERNITY', 'UNPAID');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "ReconciliationStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'IGNORED');

-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatureStatus" AS ENUM ('PENDING', 'SIGNED', 'REFUSED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "athenis_number" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "account_type" "AccountType" NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'READONLY',
    "company_id" TEXT,
    "cabinet_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "replaced_by_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athenis_counters" (
    "id" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "last_number" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athenis_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_form" TEXT,
    "siren" TEXT,
    "siret" TEXT,
    "capital" DECIMAL(18,2),
    "secteur" TEXT,
    "taille" "CompanySize" NOT NULL DEFAULT 'PME',
    "logo" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postal_code" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "phone" TEXT,
    "contact_email" TEXT,
    "website" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "currency_symbol" TEXT NOT NULL DEFAULT '€',
    "accounting_zone" "AccountingZone" NOT NULL DEFAULT 'FRANCE',
    "accounting_plan" TEXT NOT NULL DEFAULT 'PCG',
    "account_number_length" INTEGER NOT NULL DEFAULT 4,
    "locale" TEXT NOT NULL DEFAULT 'fr-FR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "fiscal_year_start" INTEGER,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "plan_expires_at" TIMESTAMP(3),
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cabinet_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_users" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "invited_by" TEXT,
    "invited_at" TIMESTAMP(3),
    "joined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cabinets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siret" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cabinets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mandats" (
    "id" TEXT NOT NULL,
    "cabinet_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "MandatType" NOT NULL DEFAULT 'COMPLET',
    "modules" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mandats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'OPEN',
    "closed_by" TEXT,
    "closed_at" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "opening_balance" JSONB,
    "closing_balance" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "siren" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "total" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "quote_id" TEXT,
    "recurring_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL,
    "gross_salary" DECIMAL(12,2) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "journal_code" TEXT NOT NULL,
    "piece_id" TEXT,
    "account" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "debit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "lettrage" TEXT,
    "invoice_id" TEXT,
    "expense_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_plans" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "intitule" TEXT NOT NULL,
    "classe" INTEGER NOT NULL,
    "type" "ChartAccountType" NOT NULL,
    "zone" "AccountingZone" NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_reviews" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT,
    "year" INTEGER NOT NULL,
    "account_number" TEXT NOT NULL,
    "cycle" INTEGER NOT NULL,
    "status" "AccountReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "note" TEXT,
    "is_anomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomaly_note" TEXT,
    "anomaly_resolved_at" TIMESTAMP(3),
    "resolution_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT,
    "designation" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "category" "AssetCategory" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "acquisition_date" TIMESTAMP(3) NOT NULL,
    "service_date" TIMESTAMP(3),
    "disposal_date" TIMESTAMP(3),
    "gross_value" DECIMAL(15,2) NOT NULL,
    "residual_value" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "depreciation_mode" "DeprecMode" NOT NULL DEFAULT 'LINEAR',
    "useful_life_years" INTEGER NOT NULL,
    "depreciation_rate" DECIMAL(6,4) NOT NULL,
    "supplier" TEXT,
    "serial_number" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_depreciations" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "opening_value" DECIMAL(15,2) NOT NULL,
    "depreciation_amt" DECIMAL(15,2) NOT NULL,
    "closing_value" DECIMAL(15,2) NOT NULL,
    "entry_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_depreciations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_families" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_families_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "famille_id" TEXT,
    "reference" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT NOT NULL DEFAULT 'unité',
    "prix_achat" DECIMAL(15,4) NOT NULL,
    "prix_vente" DECIMAL(15,4) NOT NULL,
    "stock_actuel" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "stock_min" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "stock_max" DECIMAL(15,4),
    "valeur_cmup" DECIMAL(15,4) NOT NULL DEFAULT 0,
    "methode_valuation" "StockMethod" NOT NULL DEFAULT 'CMUP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "compte_achat" TEXT,
    "compte_vente" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_mouvements" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "type" "MouvType" NOT NULL,
    "quantite" DECIMAL(15,4) NOT NULL,
    "prix_unitaire" DECIMAL(15,4) NOT NULL,
    "prix_total" DECIMAL(15,4) NOT NULL,
    "stock_avant" DECIMAL(15,4) NOT NULL,
    "stock_apres" DECIMAL(15,4) NOT NULL,
    "cmup_avant" DECIMAL(15,4) NOT NULL,
    "cmup_apres" DECIMAL(15,4) NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_mouvements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "quantite_initiale" DECIMAL(15,4) NOT NULL,
    "quantite_restante" DECIMAL(15,4) NOT NULL,
    "prix_unitaire" DECIMAL(15,4) NOT NULL,
    "date_entree" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "is_epuise" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_data" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "energy_kwh" DECIMAL(12,2),
    "waste_kg" DECIMAL(10,2),
    "gender_pay_gap" DECIMAL(5,2),
    "training_hours" DECIMAL(8,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_configs" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'CM',
    "tax_regime" "TaxRegime" NOT NULL DEFAULT 'REEL_NORMAL',
    "vat_regime" "VatRegime" NOT NULL DEFAULT 'MENSUEL',
    "is_first_year" BOOLEAN NOT NULL DEFAULT true,
    "center_impots" TEXT,
    "niu" TEXT,
    "rccm" TEXT,
    "profession_liberale" BOOLEAN NOT NULL DEFAULT false,
    "cnps_rate" DECIMAL(6,4) NOT NULL DEFAULT 0.172,
    "igs_class" INTEGER,
    "igs_amount" DECIMAL(15,2),
    "regime_history" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_declarations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT,
    "type" "TaxType" NOT NULL,
    "period" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER,
    "base_amount" DECIMAL(14,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL,
    "status" "TaxDeclStatus" NOT NULL DEFAULT 'PENDING',
    "due_date" TIMESTAMP(3) NOT NULL,
    "declared_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "penalty_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tax_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "invoice_id" TEXT,
    "expense_id" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "company_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resource_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "igs_baremes" (
    "id" TEXT NOT NULL,
    "classe" INTEGER NOT NULL,
    "ca_min" DECIMAL(15,2) NOT NULL,
    "ca_max" DECIMAL(15,2) NOT NULL,
    "montant_base" DECIMAL(15,2) NOT NULL,
    "montant_cga" DECIMAL(15,2) NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 2026,

    CONSTRAINT "igs_baremes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_roles" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "permissions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "issue_date" TIMESTAMP(3) NOT NULL,
    "valid_until" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "tax_amount" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_invoices" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "frequency" "RecurringFrequency" NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "notes" TEXT,
    "next_due_date" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "type" "BankTxType" NOT NULL,
    "reference" TEXT,
    "status" "ReconciliationStatus" NOT NULL DEFAULT 'UNMATCHED',
    "lettrage" TEXT,
    "invoice_id" TEXT,
    "expense_id" TEXT,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_schedules" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "week_start" TIMESTAMP(3) NOT NULL,
    "monday" JSONB,
    "tuesday" JSONB,
    "wednesday" JSONB,
    "thursday" JSONB,
    "friday" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annual_reviews" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "rating" INTEGER,
    "strengths" TEXT,
    "improvements" TEXT,
    "objectives" JSONB,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "reviewer_id" TEXT,
    "notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "annual_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_contracts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ContractType" NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "parties" JSONB NOT NULL,
    "content" TEXT,
    "file_url" TEXT,
    "signed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "terminated_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_signatures" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "signer_name" TEXT NOT NULL,
    "signer_email" TEXT NOT NULL,
    "signer_role" TEXT,
    "status" "SignatureStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3),
    "refused_at" TIMESTAMP(3),
    "refused_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_alerts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "contract_id" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "due_date" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_actions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "pilier" "EsgPilier" NOT NULL,
    "priority" "EsgActionPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "EsgActionStatus" NOT NULL DEFAULT 'TODO',
    "target_year" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3),
    "owner" TEXT,
    "kpi_target" TEXT,
    "kpi_current" TEXT,
    "co2_saving" DECIMAL(10,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "esg_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gdpr_entries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "treatment_name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "legal_basis" "GdprLegalBasis" NOT NULL,
    "data_categories" TEXT[],
    "data_subjects" TEXT[],
    "retention_months" INTEGER NOT NULL,
    "responsible" TEXT NOT NULL,
    "subcontractors" TEXT[],
    "security_measures" TEXT[],
    "risk_level" "GdprRiskLevel" NOT NULL DEFAULT 'LOW',
    "dpia_required" BOOLEAN NOT NULL DEFAULT false,
    "last_reviewed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gdpr_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_year_closes" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "result_net" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "closed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_year_closes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_declarations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "fiscal_year_id" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "tva_collectee" DECIMAL(12,2) NOT NULL,
    "tva_deductible" DECIMAL(12,2) NOT NULL,
    "tva_nette" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "filed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_declarations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Nouvelle conversation',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_athenis_number_key" ON "users"("athenis_number");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_account_type_idx" ON "users"("account_type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "athenis_counters_type_key" ON "athenis_counters"("type");

-- CreateIndex
CREATE UNIQUE INDEX "companies_siren_key" ON "companies"("siren");

-- CreateIndex
CREATE INDEX "companies_cabinet_id_idx" ON "companies"("cabinet_id");

-- CreateIndex
CREATE INDEX "company_users_company_id_idx" ON "company_users"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_users_company_id_user_id_key" ON "company_users"("company_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_token_idx" ON "invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_company_id_idx" ON "invitations"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cabinets_siret_key" ON "cabinets"("siret");

-- CreateIndex
CREATE INDEX "mandats_cabinet_id_idx" ON "mandats"("cabinet_id");

-- CreateIndex
CREATE INDEX "mandats_company_id_idx" ON "mandats"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "mandats_cabinet_id_company_id_key" ON "mandats"("cabinet_id", "company_id");

-- CreateIndex
CREATE INDEX "fiscal_years_company_id_status_idx" ON "fiscal_years"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_company_id_year_key" ON "fiscal_years"("company_id", "year");

-- CreateIndex
CREATE INDEX "clients_company_id_idx" ON "clients"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_quote_id_key" ON "invoices"("quote_id");

-- CreateIndex
CREATE INDEX "invoices_company_id_status_idx" ON "invoices"("company_id", "status");

-- CreateIndex
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_number_key" ON "invoices"("company_id", "number");

-- CreateIndex
CREATE INDEX "expenses_company_id_date_idx" ON "expenses"("company_id", "date");

-- CreateIndex
CREATE INDEX "employees_company_id_idx" ON "employees"("company_id");

-- CreateIndex
CREATE INDEX "journal_entries_company_id_fiscal_year_id_idx" ON "journal_entries"("company_id", "fiscal_year_id");

-- CreateIndex
CREATE INDEX "journal_entries_account_idx" ON "journal_entries"("account");

-- CreateIndex
CREATE INDEX "journal_entries_piece_id_idx" ON "journal_entries"("piece_id");

-- CreateIndex
CREATE INDEX "account_plans_company_id_classe_idx" ON "account_plans"("company_id", "classe");

-- CreateIndex
CREATE UNIQUE INDEX "account_plans_company_id_numero_key" ON "account_plans"("company_id", "numero");

-- CreateIndex
CREATE INDEX "account_reviews_company_id_idx" ON "account_reviews"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_reviews_company_id_fiscal_year_id_account_number_key" ON "account_reviews"("company_id", "fiscal_year_id", "account_number");

-- CreateIndex
CREATE INDEX "assets_company_id_idx" ON "assets"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_depreciations_asset_id_year_key" ON "asset_depreciations"("asset_id", "year");

-- CreateIndex
CREATE INDEX "stock_families_company_id_idx" ON "stock_families"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_families_company_id_code_key" ON "stock_families"("company_id", "code");

-- CreateIndex
CREATE INDEX "articles_company_id_idx" ON "articles"("company_id");

-- CreateIndex
CREATE INDEX "articles_famille_id_idx" ON "articles"("famille_id");

-- CreateIndex
CREATE UNIQUE INDEX "articles_company_id_reference_key" ON "articles"("company_id", "reference");

-- CreateIndex
CREATE INDEX "stock_mouvements_company_id_article_id_idx" ON "stock_mouvements"("company_id", "article_id");

-- CreateIndex
CREATE INDEX "stock_mouvements_created_at_idx" ON "stock_mouvements"("created_at");

-- CreateIndex
CREATE INDEX "stock_lots_article_id_is_epuise_idx" ON "stock_lots"("article_id", "is_epuise");

-- CreateIndex
CREATE INDEX "esg_data_company_id_year_idx" ON "esg_data"("company_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "esg_data_company_id_year_key" ON "esg_data"("company_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "tax_configs_company_id_key" ON "tax_configs"("company_id");

-- CreateIndex
CREATE INDEX "tax_declarations_company_id_type_year_idx" ON "tax_declarations"("company_id", "type", "year");

-- CreateIndex
CREATE UNIQUE INDEX "attachments_storage_key_key" ON "attachments"("storage_key");

-- CreateIndex
CREATE INDEX "attachments_company_id_idx" ON "attachments"("company_id");

-- CreateIndex
CREATE INDEX "attachments_invoice_id_idx" ON "attachments"("invoice_id");

-- CreateIndex
CREATE INDEX "attachments_expense_id_idx" ON "attachments"("expense_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_company_id_idx" ON "audit_logs"("company_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "igs_baremes_classe_key" ON "igs_baremes"("classe");

-- CreateIndex
CREATE INDEX "company_roles_company_id_idx" ON "company_roles"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_roles_company_id_name_key" ON "company_roles"("company_id", "name");

-- CreateIndex
CREATE INDEX "quotes_company_id_idx" ON "quotes"("company_id");

-- CreateIndex
CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_company_id_number_key" ON "quotes"("company_id", "number");

-- CreateIndex
CREATE INDEX "recurring_invoices_company_id_idx" ON "recurring_invoices"("company_id");

-- CreateIndex
CREATE INDEX "recurring_invoices_client_id_idx" ON "recurring_invoices"("client_id");

-- CreateIndex
CREATE INDEX "bank_transactions_company_id_idx" ON "bank_transactions"("company_id");

-- CreateIndex
CREATE INDEX "bank_transactions_date_idx" ON "bank_transactions"("date");

-- CreateIndex
CREATE INDEX "bank_transactions_status_idx" ON "bank_transactions"("status");

-- CreateIndex
CREATE INDEX "leave_requests_company_id_idx" ON "leave_requests"("company_id");

-- CreateIndex
CREATE INDEX "leave_requests_employee_id_idx" ON "leave_requests"("employee_id");

-- CreateIndex
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");

-- CreateIndex
CREATE INDEX "work_schedules_company_id_idx" ON "work_schedules"("company_id");

-- CreateIndex
CREATE INDEX "work_schedules_employee_id_idx" ON "work_schedules"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_schedules_company_id_employee_id_week_start_key" ON "work_schedules"("company_id", "employee_id", "week_start");

-- CreateIndex
CREATE INDEX "annual_reviews_company_id_idx" ON "annual_reviews"("company_id");

-- CreateIndex
CREATE INDEX "annual_reviews_employee_id_idx" ON "annual_reviews"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "annual_reviews_company_id_employee_id_year_key" ON "annual_reviews"("company_id", "employee_id", "year");

-- CreateIndex
CREATE INDEX "legal_contracts_company_id_idx" ON "legal_contracts"("company_id");

-- CreateIndex
CREATE INDEX "legal_contracts_status_idx" ON "legal_contracts"("status");

-- CreateIndex
CREATE INDEX "legal_contracts_type_idx" ON "legal_contracts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "contract_signatures_token_key" ON "contract_signatures"("token");

-- CreateIndex
CREATE INDEX "contract_signatures_contract_id_idx" ON "contract_signatures"("contract_id");

-- CreateIndex
CREATE INDEX "contract_signatures_token_idx" ON "contract_signatures"("token");

-- CreateIndex
CREATE INDEX "legal_alerts_company_id_idx" ON "legal_alerts"("company_id");

-- CreateIndex
CREATE INDEX "legal_alerts_severity_idx" ON "legal_alerts"("severity");

-- CreateIndex
CREATE INDEX "legal_alerts_status_idx" ON "legal_alerts"("status");

-- CreateIndex
CREATE INDEX "esg_actions_company_id_idx" ON "esg_actions"("company_id");

-- CreateIndex
CREATE INDEX "esg_actions_status_idx" ON "esg_actions"("status");

-- CreateIndex
CREATE INDEX "gdpr_entries_company_id_idx" ON "gdpr_entries"("company_id");

-- CreateIndex
CREATE INDEX "fiscal_year_closes_company_id_idx" ON "fiscal_year_closes"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_year_closes_company_id_year_key" ON "fiscal_year_closes"("company_id", "year");

-- CreateIndex
CREATE INDEX "vat_declarations_fiscal_year_id_idx" ON "vat_declarations"("fiscal_year_id");

-- CreateIndex
CREATE UNIQUE INDEX "vat_declarations_company_id_year_quarter_key" ON "vat_declarations"("company_id", "year", "quarter");

-- CreateIndex
CREATE INDEX "ai_conversations_company_id_idx" ON "ai_conversations"("company_id");

-- CreateIndex
CREATE INDEX "ai_messages_conversation_id_idx" ON "ai_messages"("conversation_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_users" ADD CONSTRAINT "company_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "company_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandats" ADD CONSTRAINT "mandats_cabinet_id_fkey" FOREIGN KEY ("cabinet_id") REFERENCES "cabinets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mandats" ADD CONSTRAINT "mandats_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_recurring_invoice_id_fkey" FOREIGN KEY ("recurring_invoice_id") REFERENCES "recurring_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_plans" ADD CONSTRAINT "account_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reviews" ADD CONSTRAINT "account_reviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_reviews" ADD CONSTRAINT "account_reviews_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciations" ADD CONSTRAINT "asset_depreciations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_depreciations" ADD CONSTRAINT "asset_depreciations_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_families" ADD CONSTRAINT "stock_families_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_famille_id_fkey" FOREIGN KEY ("famille_id") REFERENCES "stock_families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_mouvements" ADD CONSTRAINT "stock_mouvements_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_data" ADD CONSTRAINT "esg_data_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_configs" ADD CONSTRAINT "tax_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_declarations" ADD CONSTRAINT "tax_declarations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_declarations" ADD CONSTRAINT "tax_declarations_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_roles" ADD CONSTRAINT "company_roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_invoices" ADD CONSTRAINT "recurring_invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_schedules" ADD CONSTRAINT "work_schedules_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_reviews" ADD CONSTRAINT "annual_reviews_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annual_reviews" ADD CONSTRAINT "annual_reviews_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_contracts" ADD CONSTRAINT "legal_contracts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_signatures" ADD CONSTRAINT "contract_signatures_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "legal_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_alerts" ADD CONSTRAINT "legal_alerts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "legal_alerts" ADD CONSTRAINT "legal_alerts_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "legal_contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "esg_actions" ADD CONSTRAINT "esg_actions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gdpr_entries" ADD CONSTRAINT "gdpr_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_year_closes" ADD CONSTRAINT "fiscal_year_closes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_declarations" ADD CONSTRAINT "vat_declarations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_declarations" ADD CONSTRAINT "vat_declarations_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

