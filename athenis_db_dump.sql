--
-- PostgreSQL database dump
--

\restrict FLCsud0jRrPVrYlShEU8G8PjTcepg1ZoTLsYkeBOSJS70vhaS7NcY2AOZUGHYMw

-- Dumped from database version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.13 (Ubuntu 16.13-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: AccountReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountReviewStatus" AS ENUM (
    'PENDING',
    'REVIEWED',
    'ANOMALY'
);


--
-- Name: AccountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountType" AS ENUM (
    'PERSONAL',
    'COMPANY',
    'CABINET'
);


--
-- Name: AccountingZone; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccountingZone" AS ENUM (
    'FRANCE',
    'OHADA',
    'IFRS'
);


--
-- Name: AlertSeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AlertSeverity" AS ENUM (
    'INFO',
    'WARNING',
    'CRITICAL'
);


--
-- Name: AlertStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AlertStatus" AS ENUM (
    'OPEN',
    'DISMISSED',
    'RESOLVED'
);


--
-- Name: AssetCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssetCategory" AS ENUM (
    'INCORPOREL',
    'CORPOREL',
    'FINANCIER',
    'EN_COURS'
);


--
-- Name: AssetStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssetStatus" AS ENUM (
    'IN_SERVICE',
    'DISPOSED',
    'SCRAPPED',
    'IN_PROGRESS'
);


--
-- Name: AuditAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuditAction" AS ENUM (
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'TOTP_ENABLED',
    'TOTP_DISABLED',
    'TOTP_FAILED',
    'PASSWORD_CHANGED',
    'ACCOUNT_LOCKED',
    'TOKEN_REFRESHED',
    'TOKEN_REVOKED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'INVOICE_CREATED',
    'INVOICE_UPDATED',
    'INVOICE_DELETED',
    'EXPENSE_CREATED',
    'EXPENSE_UPDATED',
    'CLIENT_CREATED',
    'CLIENT_UPDATED',
    'EMPLOYEE_CREATED',
    'DATA_EXPORTED',
    'CABINET_ACCESS',
    'MANDAT_CREATED',
    'MANDAT_REVOKED',
    'COMPANY_INVITED'
);


--
-- Name: BankTxType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BankTxType" AS ENUM (
    'CREDIT',
    'DEBIT'
);


--
-- Name: CabinetInvitationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CabinetInvitationStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: ChartAccountType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChartAccountType" AS ENUM (
    'ACTIF',
    'PASSIF',
    'CHARGE',
    'PRODUIT'
);


--
-- Name: CompanySize; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CompanySize" AS ENUM (
    'TPE',
    'PME',
    'ETI',
    'GE'
);


--
-- Name: ContractStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractStatus" AS ENUM (
    'DRAFT',
    'PENDING_SIGNATURE',
    'SIGNED',
    'EXPIRED',
    'TERMINATED'
);


--
-- Name: ContractType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContractType" AS ENUM (
    'EMPLOYMENT',
    'SERVICE',
    'NDA',
    'PARTNERSHIP',
    'LEASE',
    'SUPPLIER',
    'CLIENT',
    'OTHER'
);


--
-- Name: DeprecMode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeprecMode" AS ENUM (
    'LINEAR',
    'DEGRESSIVE'
);


--
-- Name: EmploymentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EmploymentType" AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERN'
);


--
-- Name: EsgActionPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EsgActionPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: EsgActionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EsgActionStatus" AS ENUM (
    'TODO',
    'IN_PROGRESS',
    'DONE',
    'CANCELLED'
);


--
-- Name: EsgPilier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EsgPilier" AS ENUM (
    'E',
    'S',
    'G'
);


--
-- Name: ExpenseCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExpenseCategory" AS ENUM (
    'TRAVEL',
    'EQUIPMENT',
    'SOFTWARE',
    'SALARY',
    'RENT',
    'MARKETING',
    'CONSULTING',
    'OTHER'
);


--
-- Name: FiscalYearStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FiscalYearStatus" AS ENUM (
    'DRAFT',
    'OPEN',
    'LOCKED',
    'CLOSED'
);


--
-- Name: GdprLegalBasis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GdprLegalBasis" AS ENUM (
    'CONSENT',
    'CONTRACT',
    'LEGAL_OBLIGATION',
    'VITAL_INTEREST',
    'PUBLIC_TASK',
    'LEGITIMATE_INTEREST'
);


--
-- Name: GdprRiskLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."GdprRiskLevel" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH'
);


--
-- Name: IgsPayment; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."IgsPayment" AS ENUM (
    'ANNUEL',
    'TRIMESTRIEL'
);


--
-- Name: InvoiceStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InvoiceStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'PAID',
    'OVERDUE',
    'CANCELLED'
);


--
-- Name: LeaveStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


--
-- Name: LeaveType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeaveType" AS ENUM (
    'CP',
    'RTT',
    'SICK',
    'MATERNITY',
    'UNPAID'
);


--
-- Name: MandatType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MandatType" AS ENUM (
    'COMPLET',
    'COMPTABILITE',
    'GESTION',
    'DECLARATIONS'
);


--
-- Name: MouvType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."MouvType" AS ENUM (
    'ENTREE_ACHAT',
    'ENTREE_RETOUR',
    'ENTREE_INVENTAIRE',
    'SORTIE_VENTE',
    'SORTIE_CASSE',
    'SORTIE_INVENTAIRE',
    'TRANSFERT',
    'AJUSTEMENT'
);


--
-- Name: Plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Plan" AS ENUM (
    'FREE',
    'STARTER',
    'PRO',
    'PREMIUM'
);


--
-- Name: PlatformRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PlatformRole" AS ENUM (
    'USER',
    'SUPER_ADMIN'
);


--
-- Name: QuoteStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuoteStatus" AS ENUM (
    'DRAFT',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'CONVERTED'
);


--
-- Name: ReconciliationStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReconciliationStatus" AS ENUM (
    'UNMATCHED',
    'MATCHED',
    'IGNORED'
);


--
-- Name: RecurringFrequency; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RecurringFrequency" AS ENUM (
    'MONTHLY',
    'QUARTERLY',
    'ANNUAL'
);


--
-- Name: ReviewStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ReviewStatus" AS ENUM (
    'DRAFT',
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: Role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'COMPTABLE',
    'READONLY',
    'RH',
    'JURIDIQUE'
);


--
-- Name: SignatureStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SignatureStatus" AS ENUM (
    'PENDING',
    'SIGNED',
    'REFUSED'
);


--
-- Name: StockMethod; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StockMethod" AS ENUM (
    'CMUP',
    'FIFO'
);


--
-- Name: TaxDeclStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaxDeclStatus" AS ENUM (
    'PENDING',
    'DECLARED',
    'PAID',
    'LATE',
    'EXEMPTED'
);


--
-- Name: TaxRegime; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaxRegime" AS ENUM (
    'IGS',
    'REEL_NORMAL',
    'REEL_SIMPLIFIE',
    'FORFAIT_BIENNAL',
    'MICRO_ENTREPRISE',
    'LIBERATOIRE'
);


--
-- Name: TaxType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."TaxType" AS ENUM (
    'TVA',
    'IS',
    'IS_ACOMPTE',
    'PATENTE',
    'RAS',
    'CNPS',
    'FDFP',
    'DSF'
);


--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'INVITED'
);


--
-- Name: VatRegime; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VatRegime" AS ENUM (
    'MENSUEL',
    'TRIMESTRIEL',
    'NON_ASSUJETTI'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: account_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_plans (
    id text NOT NULL,
    company_id text NOT NULL,
    numero text NOT NULL,
    intitule text NOT NULL,
    classe integer NOT NULL,
    type public."ChartAccountType" NOT NULL,
    zone public."AccountingZone" NOT NULL,
    is_system boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: account_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_reviews (
    id text NOT NULL,
    company_id text NOT NULL,
    year integer NOT NULL,
    account_number text NOT NULL,
    cycle integer NOT NULL,
    status public."AccountReviewStatus" DEFAULT 'PENDING'::public."AccountReviewStatus" NOT NULL,
    reviewed_by text,
    reviewed_at timestamp(3) without time zone,
    note text,
    anomaly_note text,
    anomaly_resolved_at timestamp(3) without time zone,
    resolution_note text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    fiscal_year_id text,
    is_anomaly boolean DEFAULT false NOT NULL
);


--
-- Name: agence_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agence_members (
    id text NOT NULL,
    agence_id text NOT NULL,
    company_member_id text NOT NULL,
    is_restricted boolean DEFAULT false NOT NULL
);


--
-- Name: agences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agences (
    id text NOT NULL,
    company_id text NOT NULL,
    code text NOT NULL,
    nom text NOT NULL,
    adresse text,
    ville text,
    telephone text,
    email text,
    is_active boolean DEFAULT true NOT NULL,
    is_siege boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ai_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_conversations (
    id text NOT NULL,
    company_id text NOT NULL,
    title text DEFAULT 'Nouvelle conversation'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: ai_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_messages (
    id text NOT NULL,
    conversation_id text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    input_tokens integer,
    output_tokens integer,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: annual_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.annual_reviews (
    id text NOT NULL,
    company_id text NOT NULL,
    employee_id text NOT NULL,
    year integer NOT NULL,
    rating integer,
    strengths text,
    improvements text,
    objectives jsonb,
    status public."ReviewStatus" DEFAULT 'DRAFT'::public."ReviewStatus" NOT NULL,
    scheduled_at timestamp(3) without time zone,
    completed_at timestamp(3) without time zone,
    reviewer_id text,
    notes text,
    reviewed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: articles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.articles (
    id text NOT NULL,
    company_id text NOT NULL,
    reference text NOT NULL,
    designation text NOT NULL,
    famille_id text,
    unite text DEFAULT 'unité'::text NOT NULL,
    prix_achat numeric(15,4) NOT NULL,
    prix_vente numeric(15,4) NOT NULL,
    tva_achat numeric(5,4) DEFAULT 0.1925 NOT NULL,
    tva_vente numeric(5,4) DEFAULT 0.1925 NOT NULL,
    stock_actuel numeric(15,4) DEFAULT 0 NOT NULL,
    stock_min numeric(15,4) DEFAULT 0 NOT NULL,
    stock_max numeric(15,4),
    valeur_cmup numeric(15,4) DEFAULT 0 NOT NULL,
    methode_valuation public."StockMethod" DEFAULT 'CMUP'::public."StockMethod" NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    code_barres text,
    fournisseur text,
    delai_appro integer,
    emplacement text,
    compte_achat text,
    compte_vente text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: asset_depreciations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_depreciations (
    id text NOT NULL,
    asset_id text NOT NULL,
    fiscal_year_id text NOT NULL,
    year integer NOT NULL,
    opening_value numeric(15,2) NOT NULL,
    depreciation_amt numeric(15,2) NOT NULL,
    closing_value numeric(15,2) NOT NULL,
    entry_generated boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id text NOT NULL,
    company_id text NOT NULL,
    fiscal_year_id text,
    designation text NOT NULL,
    account_number text NOT NULL,
    category public."AssetCategory" NOT NULL,
    status public."AssetStatus" DEFAULT 'IN_SERVICE'::public."AssetStatus" NOT NULL,
    acquisition_date timestamp(3) without time zone NOT NULL,
    service_date timestamp(3) without time zone,
    disposal_date timestamp(3) without time zone,
    gross_value numeric(15,2) NOT NULL,
    residual_value numeric(15,2) DEFAULT 0 NOT NULL,
    depreciation_mode public."DeprecMode" DEFAULT 'LINEAR'::public."DeprecMode" NOT NULL,
    useful_life_years integer NOT NULL,
    depreciation_rate numeric(6,4) NOT NULL,
    supplier text,
    serial_number text,
    location text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: athenis_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.athenis_counters (
    id text NOT NULL,
    type public."AccountType" NOT NULL,
    last_number integer DEFAULT 0 NOT NULL
);


--
-- Name: attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachments (
    id text NOT NULL,
    company_id text NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    mime_type text NOT NULL,
    storage_key text NOT NULL,
    uploaded_by text NOT NULL,
    uploaded_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    invoice_id text,
    expense_id text
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    user_id text,
    cabinet_user_id text,
    company_id text,
    action text NOT NULL,
    resource text,
    resource_id text,
    ip_address text,
    user_agent text,
    metadata jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_transactions (
    id text NOT NULL,
    company_id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    label text NOT NULL,
    amount numeric(12,2) NOT NULL,
    type public."BankTxType" NOT NULL,
    reference text,
    status public."ReconciliationStatus" DEFAULT 'UNMATCHED'::public."ReconciliationStatus" NOT NULL,
    lettrage text,
    invoice_id text,
    expense_id text,
    imported_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cabinet_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cabinet_invitations (
    id text NOT NULL,
    cabinet_id text NOT NULL,
    company_email text,
    company_name text,
    type public."MandatType" DEFAULT 'COMPLET'::public."MandatType" NOT NULL,
    modules text[] DEFAULT ARRAY[]::text[],
    notes text,
    token text NOT NULL,
    status public."CabinetInvitationStatus" DEFAULT 'PENDING'::public."CabinetInvitationStatus" NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    accepted_at timestamp(3) without time zone,
    rejected_at timestamp(3) without time zone,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: cabinets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cabinets (
    id text NOT NULL,
    name text NOT NULL,
    siret text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clients (
    id text NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    siren text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id text NOT NULL,
    name text NOT NULL,
    siren text,
    secteur text,
    taille public."CompanySize" DEFAULT 'PME'::public."CompanySize" NOT NULL,
    plan public."Plan" DEFAULT 'FREE'::public."Plan" NOT NULL,
    modules text[] DEFAULT ARRAY[]::text[],
    cabinet_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    accounting_plan text DEFAULT 'PCG'::text NOT NULL,
    accounting_zone public."AccountingZone" DEFAULT 'FRANCE'::public."AccountingZone" NOT NULL,
    address text,
    capital numeric(18,2),
    city text,
    contact_email text,
    country text DEFAULT 'FR'::text NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    currency_symbol text DEFAULT '€'::text NOT NULL,
    discount_rate numeric(6,4),
    font text,
    invoice_mentions text,
    late_interest_rate numeric(6,4),
    legal_form text,
    locale text DEFAULT 'fr-FR'::text NOT NULL,
    logo text,
    naf text,
    payment_terms integer,
    phone text,
    postal_code text,
    primary_color text,
    secondary_color text,
    security_policy jsonb,
    siret text,
    timezone text DEFAULT 'Europe/Paris'::text NOT NULL,
    vat_number text,
    vat_rates jsonb,
    website text,
    account_number_length integer DEFAULT 4 NOT NULL,
    fiscal_year_start integer DEFAULT 1,
    plan_expires_at timestamp(3) without time zone
);


--
-- Name: company_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_roles (
    id text NOT NULL,
    company_id text NOT NULL,
    name text NOT NULL,
    description text,
    is_system boolean DEFAULT false NOT NULL,
    permissions jsonb NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: company_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_users (
    id text NOT NULL,
    company_id text NOT NULL,
    user_id text NOT NULL,
    role_id text NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    invited_by text,
    invited_at timestamp(3) without time zone,
    joined_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: contract_signatures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contract_signatures (
    id text NOT NULL,
    contract_id text NOT NULL,
    signer_name text NOT NULL,
    signer_email text NOT NULL,
    signer_role text,
    status public."SignatureStatus" DEFAULT 'PENDING'::public."SignatureStatus" NOT NULL,
    token text NOT NULL,
    signed_at timestamp(3) without time zone,
    refused_at timestamp(3) without time zone,
    refused_note text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id text NOT NULL,
    company_id text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    employment_type public."EmploymentType" NOT NULL,
    gross_salary numeric(12,2) NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: esg_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.esg_actions (
    id text NOT NULL,
    company_id text NOT NULL,
    title text NOT NULL,
    description text,
    pilier public."EsgPilier" NOT NULL,
    priority public."EsgActionPriority" DEFAULT 'MEDIUM'::public."EsgActionPriority" NOT NULL,
    status public."EsgActionStatus" DEFAULT 'TODO'::public."EsgActionStatus" NOT NULL,
    target_year integer NOT NULL,
    deadline timestamp(3) without time zone,
    owner text,
    kpi_target text,
    kpi_current text,
    co2_saving numeric(10,2),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: esg_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.esg_data (
    id text NOT NULL,
    company_id text NOT NULL,
    year integer NOT NULL,
    energy_kwh numeric(12,2),
    waste_kg numeric(10,2),
    gender_pay_gap numeric(5,2),
    training_hours numeric(8,2),
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    absenteeism_rate numeric(5,2),
    board_female_ratio numeric(5,2),
    has_anticorruption boolean DEFAULT false NOT NULL,
    has_ethics_code boolean DEFAULT false NOT NULL,
    renewable_ratio numeric(5,2),
    scope1_details jsonb,
    scope1_total numeric(10,2),
    scope2_kwh numeric(12,2),
    scope2_total numeric(10,2),
    scope3_details jsonb,
    scope3_total numeric(10,2),
    workplace_accidents integer,
    scope1_tco2e numeric(10,4),
    scope2_tco2e numeric(10,4),
    scope3_tco2e numeric(10,4)
);


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id text NOT NULL,
    company_id text NOT NULL,
    category public."ExpenseCategory" NOT NULL,
    amount numeric(12,2) NOT NULL,
    description text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    receipt_url text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    fiscal_year_id text
);


--
-- Name: fiscal_year_closes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_year_closes (
    id text NOT NULL,
    company_id text NOT NULL,
    year integer NOT NULL,
    result_net numeric(12,2) NOT NULL,
    notes text,
    closed_by text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: fiscal_years; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_years (
    id text NOT NULL,
    company_id text NOT NULL,
    year integer NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    status public."FiscalYearStatus" DEFAULT 'OPEN'::public."FiscalYearStatus" NOT NULL,
    opening_balance jsonb,
    closing_balance jsonb,
    created_by text NOT NULL,
    closed_by text,
    closed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: gdpr_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gdpr_entries (
    id text NOT NULL,
    company_id text NOT NULL,
    treatment_name text NOT NULL,
    purpose text NOT NULL,
    legal_basis public."GdprLegalBasis" NOT NULL,
    data_categories text[],
    data_subjects text[],
    retention_months integer NOT NULL,
    responsible text NOT NULL,
    subcontractors text[],
    security_measures text[],
    risk_level public."GdprRiskLevel" DEFAULT 'LOW'::public."GdprRiskLevel" NOT NULL,
    dpia_required boolean DEFAULT false NOT NULL,
    last_reviewed_at timestamp(3) without time zone,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: igs_baremes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.igs_baremes (
    id text NOT NULL,
    classe integer NOT NULL,
    ca_min numeric(15,2) NOT NULL,
    ca_max numeric(15,2) NOT NULL,
    montant_base numeric(15,2) NOT NULL,
    montant_cga numeric(15,2) NOT NULL,
    year integer DEFAULT 2026 NOT NULL
);


--
-- Name: invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invitations (
    id text NOT NULL,
    company_id text NOT NULL,
    email text NOT NULL,
    role_id text NOT NULL,
    token text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    accepted_at timestamp(3) without time zone,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id text NOT NULL,
    number text NOT NULL,
    company_id text NOT NULL,
    client_id text NOT NULL,
    status public."InvoiceStatus" DEFAULT 'DRAFT'::public."InvoiceStatus" NOT NULL,
    issue_date timestamp(3) without time zone NOT NULL,
    due_date timestamp(3) without time zone NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 20 NOT NULL,
    tax_amount numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    fiscal_year_id text,
    paid_at timestamp(3) without time zone,
    quote_id text,
    recurring_invoice_id text
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id text NOT NULL,
    company_id text NOT NULL,
    fiscal_year_id text NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    account text NOT NULL,
    label text NOT NULL,
    debit numeric(12,2) DEFAULT 0 NOT NULL,
    credit numeric(12,2) DEFAULT 0 NOT NULL,
    reference text,
    journal_code text DEFAULT 'OD'::text NOT NULL,
    invoice_id text,
    expense_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    piece_id text,
    lettrage text,
    created_by text
);


--
-- Name: leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leave_requests (
    id text NOT NULL,
    company_id text NOT NULL,
    employee_id text NOT NULL,
    type public."LeaveType" NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    days integer NOT NULL,
    status public."LeaveStatus" DEFAULT 'PENDING'::public."LeaveStatus" NOT NULL,
    reason text,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: legal_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_alerts (
    id text NOT NULL,
    company_id text NOT NULL,
    contract_id text,
    title text NOT NULL,
    message text NOT NULL,
    severity public."AlertSeverity" DEFAULT 'INFO'::public."AlertSeverity" NOT NULL,
    status public."AlertStatus" DEFAULT 'OPEN'::public."AlertStatus" NOT NULL,
    due_date timestamp(3) without time zone,
    dismissed_at timestamp(3) without time zone,
    resolved_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: legal_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.legal_contracts (
    id text NOT NULL,
    company_id text NOT NULL,
    title text NOT NULL,
    type public."ContractType" NOT NULL,
    status public."ContractStatus" DEFAULT 'DRAFT'::public."ContractStatus" NOT NULL,
    parties jsonb NOT NULL,
    content text,
    file_url text,
    signed_at timestamp(3) without time zone,
    expires_at timestamp(3) without time zone,
    terminated_at timestamp(3) without time zone,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: mandats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mandats (
    id text NOT NULL,
    cabinet_id text NOT NULL,
    company_id text NOT NULL,
    type public."MandatType" NOT NULL,
    modules text[],
    actif boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: personal_comptes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_comptes (
    id text NOT NULL,
    user_id text NOT NULL,
    nom text NOT NULL,
    type text DEFAULT 'COURANT'::text NOT NULL,
    balance numeric(12,2) DEFAULT 0 NOT NULL,
    iban text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: personal_depenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_depenses (
    id text NOT NULL,
    user_id text NOT NULL,
    label text NOT NULL,
    amount numeric(12,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    category text DEFAULT 'OTHER'::text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: personal_objectifs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_objectifs (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    target_amount numeric(12,2) NOT NULL,
    current_amount numeric(12,2) DEFAULT 0 NOT NULL,
    deadline timestamp(3) without time zone,
    achieved boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: personal_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_profiles (
    id text NOT NULL,
    user_id text NOT NULL,
    currency text DEFAULT 'EUR'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: personal_revenus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.personal_revenus (
    id text NOT NULL,
    user_id text NOT NULL,
    label text NOT NULL,
    amount numeric(12,2) NOT NULL,
    date timestamp(3) without time zone NOT NULL,
    type text DEFAULT 'OTHER'::text NOT NULL,
    recurrent boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id text NOT NULL,
    number text NOT NULL,
    company_id text NOT NULL,
    client_id text NOT NULL,
    status public."QuoteStatus" DEFAULT 'DRAFT'::public."QuoteStatus" NOT NULL,
    issue_date timestamp(3) without time zone NOT NULL,
    valid_until timestamp(3) without time zone NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 20 NOT NULL,
    tax_amount numeric(12,2) NOT NULL,
    total numeric(12,2) NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: recurring_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recurring_invoices (
    id text NOT NULL,
    company_id text NOT NULL,
    client_id text NOT NULL,
    frequency public."RecurringFrequency" NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 20 NOT NULL,
    notes text,
    next_due_date timestamp(3) without time zone NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    token_hash text NOT NULL,
    user_id text NOT NULL,
    expires_at timestamp(3) without time zone NOT NULL,
    revoked_at timestamp(3) without time zone,
    replaced_by_hash text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: stock_families; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_families (
    id text NOT NULL,
    company_id text NOT NULL,
    code text NOT NULL,
    nom text NOT NULL,
    description text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: stock_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_lots (
    id text NOT NULL,
    article_id text NOT NULL,
    quantite_initiale numeric(15,4) NOT NULL,
    quantite_restante numeric(15,4) NOT NULL,
    prix_unitaire numeric(15,4) NOT NULL,
    date_entree timestamp(3) without time zone NOT NULL,
    reference text,
    is_epuise boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: stock_mouvements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_mouvements (
    id text NOT NULL,
    company_id text NOT NULL,
    article_id text NOT NULL,
    type public."MouvType" NOT NULL,
    quantite numeric(15,4) NOT NULL,
    prix_unitaire numeric(15,4) NOT NULL,
    prix_total numeric(15,4) NOT NULL,
    stock_avant numeric(15,4) NOT NULL,
    stock_apres numeric(15,4) NOT NULL,
    cmup_avant numeric(15,4) NOT NULL,
    cmup_apres numeric(15,4) NOT NULL,
    reference text,
    description text,
    invoice_id text,
    fiscal_year_id text,
    created_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: tax_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_configs (
    id text NOT NULL,
    company_id text NOT NULL,
    country text DEFAULT 'CM'::text NOT NULL,
    tax_regime public."TaxRegime" DEFAULT 'REEL_NORMAL'::public."TaxRegime" NOT NULL,
    vat_regime public."VatRegime" DEFAULT 'MENSUEL'::public."VatRegime" NOT NULL,
    is_first_year boolean DEFAULT true NOT NULL,
    first_year_ca numeric(15,2),
    igs_class integer,
    igs_amount numeric(15,2),
    igs_payment_mode public."IgsPayment",
    igs_adherent_cga boolean DEFAULT false NOT NULL,
    regime_history jsonb,
    regime_change_alert boolean DEFAULT false NOT NULL,
    last_regime_check timestamp(3) without time zone,
    next_regime_check timestamp(3) without time zone,
    center_impots text,
    niu text,
    rccm text,
    code_activite text,
    profession_liberale boolean DEFAULT false NOT NULL,
    cnps_rate numeric(6,4) DEFAULT 0.172 NOT NULL,
    is_rate numeric(6,4) DEFAULT 0.33 NOT NULL,
    vat_rate numeric(6,4) DEFAULT 0.1925 NOT NULL,
    is_assujetti boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Name: tax_declarations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_declarations (
    id text NOT NULL,
    company_id text NOT NULL,
    type public."TaxType" NOT NULL,
    period text NOT NULL,
    year integer NOT NULL,
    month integer,
    quarter integer,
    base_amount numeric(14,2) NOT NULL,
    tax_amount numeric(14,2) NOT NULL,
    status public."TaxDeclStatus" DEFAULT 'PENDING'::public."TaxDeclStatus" NOT NULL,
    due_date timestamp(3) without time zone NOT NULL,
    declared_at timestamp(3) without time zone,
    paid_at timestamp(3) without time zone,
    penalty_amount numeric(14,2) DEFAULT 0 NOT NULL,
    reference text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    fiscal_year_id text
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    account_type public."AccountType" NOT NULL,
    role public."Role" DEFAULT 'READONLY'::public."Role" NOT NULL,
    first_name text DEFAULT ''::text NOT NULL,
    last_name text,
    is_active boolean DEFAULT true NOT NULL,
    company_id text,
    cabinet_id text,
    totp_secret text,
    totp_enabled boolean DEFAULT false NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp(3) without time zone,
    last_login_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    athenis_number text,
    platform_role public."PlatformRole" DEFAULT 'USER'::public."PlatformRole" NOT NULL
);


--
-- Name: vat_declarations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vat_declarations (
    id text NOT NULL,
    company_id text NOT NULL,
    fiscal_year_id text NOT NULL,
    quarter integer NOT NULL,
    year integer NOT NULL,
    tva_collectee numeric(12,2) NOT NULL,
    tva_deductible numeric(12,2) NOT NULL,
    tva_nette numeric(12,2) NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    filed_at timestamp(3) without time zone,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: work_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_schedules (
    id text NOT NULL,
    company_id text NOT NULL,
    employee_id text NOT NULL,
    week_start timestamp(3) without time zone NOT NULL,
    monday jsonb,
    tuesday jsonb,
    wednesday jsonb,
    thursday jsonb,
    friday jsonb,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
45fb2363-dcca-47a0-bb4b-b4954acb7c52	d3f5bc441e66163637c8ceb9ac93aea077cba175e2ebacd524c2f1a05b180e0d	\N	20260511000000_fix_athenis_counters	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260511000000_fix_athenis_counters\n\nDatabase error code: 42601\n\nDatabase error:\nERROR: syntax error at or near "﻿"\n\nPosition:\n[1m  0[0m\n[1m  1[1;31m ﻿-- Fix athenis_counters: drop the problematic updated_at column that was[0m\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42601), message: "syntax error at or near \\"\\u{feff}\\"", detail: None, hint: None, position: Some(Original(1)), where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("scan.l"), line: Some(1244), routine: Some("scanner_yyerror") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260511000000_fix_athenis_counters"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260511000000_fix_athenis_counters"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2026-05-11 23:22:19.226991+02	2026-05-11 23:22:09.608913+02	0
8f6dde3c-bec8-489e-b55e-269bd3143e3c	ec00f9836fc98721b52b390f09ff8edf4ff6f68efcc349df92426ad328e2ac28	2026-05-11 23:22:23.247106+02	20260511000000_fix_athenis_counters	\N	\N	2026-05-11 23:22:23.233513+02	1
fa66c842-9972-41b8-be53-57eb2c71b2b1	f32506875d5ae0084a215b5911ed0ec3b2947a13592363d35fe097eb8d2cecda	2026-05-02 11:44:54.837943+02	20260502000000_baseline		\N	2026-05-02 11:44:54.837943+02	0
88f141d5-feb2-48a8-9a80-e117996c010c	674b498287b52e2d866c63bdf16ab206e0adf26f5ac422d6e6e94e2baea5ffc7	2026-05-02 12:12:58.731355+02	20260502120000_agences_cabinet_invitations_personal	\N	\N	2026-05-02 12:12:58.571265+02	1
f0ae1935-9025-45c1-acbc-729e3ec3cdcd	e0a847997098b962142c331ab6e34abe61f72c90420840f709a4463254b80bff	\N	20260502130000_company_security_policy	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20260502130000_company_security_policy\n\nDatabase error code: 42701\n\nDatabase error:\nERROR: column "security_policy" of relation "companies" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42701), message: "column \\"security_policy\\" of relation \\"companies\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("tablecmds.c"), line: Some(7347), routine: Some("check_for_column_name_collision") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20260502130000_company_security_policy"\n             at schema-engine\\connectors\\sql-schema-connector\\src\\apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20260502130000_company_security_policy"\n             at schema-engine\\core\\src\\commands\\apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine\\core\\src\\state.rs:226	2026-05-02 16:05:39.47353+02	2026-05-02 16:05:25.931711+02	0
c62fb33d-600e-4737-bbb7-c3da4c84e4f7	e0a847997098b962142c331ab6e34abe61f72c90420840f709a4463254b80bff	2026-05-02 16:05:39.477602+02	20260502130000_company_security_policy		\N	2026-05-02 16:05:39.477602+02	0
97e64dd5-0d32-4b20-943d-3ec8f5f5c117	3a1c07b7379bbceae7fed07d525bfe8a7d5579058b33dd015c9877be9a349741	2026-05-02 20:46:02.484001+02	20260502140000_platform_role	\N	\N	2026-05-02 20:46:02.441177+02	1
3bae6ef4-aace-414c-bc06-0855a36089e6	0a722b877cf6a834530b659ae9dad374e731c3e17b2f940735682d6ce1cdf7d3	2026-05-05 10:03:48.981898+02	20260505000000_esg_extended_indicators	\N	\N	2026-05-05 10:03:48.935989+02	1
\.


--
-- Data for Name: account_plans; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account_plans (id, company_id, numero, intitule, classe, type, zone, is_system, is_active, created_at) FROM stdin;
ap-ubm-11	cmoe00wty003sanv8seavfjqn	11	Réserves	1	PASSIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-12	cmoe00wty003sanv8seavfjqn	12	Report à nouveau	1	PASSIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-13	cmoe00wty003sanv8seavfjqn	13	Résultat net de l'exercice	1	PASSIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-101	cmoe00wty003sanv8seavfjqn	101	Capital social	1	PASSIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-411	cmoe00wty003sanv8seavfjqn	411	Clients	4	ACTIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-401	cmoe00wty003sanv8seavfjqn	401	Fournisseurs	4	PASSIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-4435	cmoe00wty003sanv8seavfjqn	4435	TVA collectée	4	PASSIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-4432	cmoe00wty003sanv8seavfjqn	4432	TVA déductible sur achats	4	ACTIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-521	cmoe00wty003sanv8seavfjqn	521	Banques comptes courants	5	ACTIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-571	cmoe00wty003sanv8seavfjqn	571	Caisse	5	ACTIF	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-601	cmoe00wty003sanv8seavfjqn	601	Achats de marchandises	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-604	cmoe00wty003sanv8seavfjqn	604	Achats de prestations de services	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-612	cmoe00wty003sanv8seavfjqn	612	Locations et charges locatives	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-615	cmoe00wty003sanv8seavfjqn	615	Entretiens, réparations et maintenance	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-625	cmoe00wty003sanv8seavfjqn	625	Déplacements, missions et réceptions	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-631	cmoe00wty003sanv8seavfjqn	631	Rémunérations du personnel	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-641	cmoe00wty003sanv8seavfjqn	641	Cotisations aux organismes sociaux	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-661	cmoe00wty003sanv8seavfjqn	661	Rémunérations directes versées	6	CHARGE	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-701	cmoe00wty003sanv8seavfjqn	701	Ventes de produits finis	7	PRODUIT	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-706	cmoe00wty003sanv8seavfjqn	706	Prestations de services	7	PRODUIT	OHADA	t	t	2026-05-02 02:01:55.564
ap-ubm-707	cmoe00wty003sanv8seavfjqn	707	Rabais, remises, ristournes accordés	7	PRODUIT	OHADA	t	t	2026-05-02 02:01:55.564
\.


--
-- Data for Name: account_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.account_reviews (id, company_id, year, account_number, cycle, status, reviewed_by, reviewed_at, note, anomaly_note, anomaly_resolved_at, resolution_note, created_at, updated_at, fiscal_year_id, is_anomaly) FROM stdin;
cmoe0r0bx00d7az7ccprlmlh0	cmoe00wty003sanv8seavfjqn	2025	635	2	REVIEWED	carine.ekodeck@ubm.cm	2025-12-20 09:00:00	\N	\N	\N	\N	2026-04-25 07:29:32.781	2026-04-25 07:29:32.781	cmoe00xg60044anv82abzeyun	f
cmoe0r0bx00daaz7cz7a8lh43	cmoe00wty003sanv8seavfjqn	2025	521	3	REVIEWED	carine.ekodeck@ubm.cm	2025-12-18 10:00:00	Rapprochement Afriland OK	\N	\N	\N	2026-04-25 07:29:32.781	2026-04-25 07:29:32.781	cmoe00xg60044anv82abzeyun	f
cmoe0r0bx00d9az7cn1pm5uaf	cmoe00wty003sanv8seavfjqn	2025	522	3	REVIEWED	carine.ekodeck@ubm.cm	2025-12-18 10:30:00	Rapprochement BGFI OK	\N	\N	\N	2026-04-25 07:29:32.782	2026-04-25 07:29:32.782	cmoe00xg60044anv82abzeyun	f
cmoe0r0bx00d8az7cnsvecl6s	cmoe00wty003sanv8seavfjqn	2025	612	2	REVIEWED	carine.ekodeck@ubm.cm	2025-12-20 09:00:00	Loyers vérifiés, baux à jour	\N	\N	\N	2026-04-25 07:29:32.781	2026-04-25 07:29:32.781	cmoe00xg60044anv82abzeyun	f
cmoe0r0bz00dcaz7c490tvpla	cmoe00wty003sanv8seavfjqn	2025	661	4	REVIEWED	carine.ekodeck@ubm.cm	2025-12-19 08:00:00	\N	\N	\N	\N	2026-04-25 07:29:32.783	2026-04-25 07:29:32.783	cmoe00xg60044anv82abzeyun	f
cmoe0r0bz00ddaz7c4m9s6wu9	cmoe00wty003sanv8seavfjqn	2025	101	8	REVIEWED	carine.ekodeck@ubm.cm	2025-12-17 14:00:00	\N	\N	\N	\N	2026-04-25 07:29:32.784	2026-04-25 07:29:32.784	cmoe00xg60044anv82abzeyun	f
cmoe0r0bz00deaz7c247qwxs7	cmoe00wty003sanv8seavfjqn	2025	118	8	REVIEWED	carine.ekodeck@ubm.cm	2025-12-17 14:00:00	\N	\N	\N	\N	2026-04-25 07:29:32.784	2026-04-25 07:29:32.784	cmoe00xg60044anv82abzeyun	f
cmoe0r0bz00dbaz7cs6abefhl	cmoe00wty003sanv8seavfjqn	2025	664	4	REVIEWED	carine.ekodeck@ubm.cm	2025-12-19 08:00:00	\N	\N	\N	\N	2026-04-25 07:29:32.783	2026-04-25 07:29:32.783	cmoe00xg60044anv82abzeyun	f
cmoe0r0bz00dfaz7cnr0ex5nz	cmoe00wty003sanv8seavfjqn	2025	12	8	REVIEWED	carine.ekodeck@ubm.cm	2025-12-17 14:30:00	\N	\N	\N	\N	2026-04-25 07:29:32.784	2026-04-25 07:29:32.784	cmoe00xg60044anv82abzeyun	f
cmoe0r0c500dgaz7cqs1ueia9	cmoe00wty003sanv8seavfjqn	2025	421	4	REVIEWED	carine.ekodeck@ubm.cm	2025-12-19 08:30:00	\N	\N	\N	\N	2026-04-25 07:29:32.784	2026-04-25 07:29:32.784	cmoe00xg60044anv82abzeyun	f
cmoe0r0c800dhaz7c4b47xbff	cmoe00wty003sanv8seavfjqn	2025	431	4	ANOMALY	carine.ekodeck@ubm.cm	2025-12-19 09:00:00	\N	Solde CNPS ne correspond pas au calcul des cotisations — écart de 128 400 F CFA à investiguer	\N	\N	2026-04-25 07:29:32.786	2026-04-25 07:29:32.786	cmoe00xg60044anv82abzeyun	f
\.


--
-- Data for Name: agence_members; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agence_members (id, agence_id, company_member_id, is_restricted) FROM stdin;
\.


--
-- Data for Name: agences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.agences (id, company_id, code, nom, adresse, ville, telephone, email, is_active, is_siege, created_at) FROM stdin;
\.


--
-- Data for Name: ai_conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_conversations (id, company_id, title, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: ai_messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.ai_messages (id, conversation_id, role, content, input_tokens, output_tokens, created_at) FROM stdin;
\.


--
-- Data for Name: annual_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.annual_reviews (id, company_id, employee_id, year, rating, strengths, improvements, objectives, status, scheduled_at, completed_at, reviewer_id, notes, reviewed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: articles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.articles (id, company_id, reference, designation, famille_id, unite, prix_achat, prix_vente, tva_achat, tva_vente, stock_actuel, stock_min, stock_max, valeur_cmup, methode_valuation, is_active, description, code_barres, fournisseur, delai_appro, emplacement, compte_achat, compte_vente, created_at, updated_at) FROM stdin;
cmoe0r1pe00epaz7cc43hz4az	cmoe00wty003sanv8seavfjqn	ART-00001	Rame papier A4 500 feuilles	cmoe0r1nl00ekaz7crqtb5gv7	rame	2500.0000	4000.0000	0.1925	0.1925	45.0000	10.0000	\N	2490.0000	CMUP	t	\N	\N	Bureau Express Douala	\N	\N	\N	\N	2026-04-25 07:29:34.562	2026-04-25 07:29:34.562
cmoe0r1pw00eraz7cn51ejphu	cmoe00wty003sanv8seavfjqn	ART-00002	Cartouche encre HP noir	cmoe0r1o300elaz7cs3oarao0	unité	14800.0000	22000.0000	0.1925	0.1925	3.0000	5.0000	\N	14900.0000	CMUP	t	\N	\N	Bureau Express Douala	3	\N	\N	\N	2026-04-25 07:29:34.58	2026-04-25 07:29:34.58
cmoe0r1qc00etaz7cuhyb8684	cmoe00wty003sanv8seavfjqn	ART-00003	Stylos bille (lot 10)	cmoe0r1nl00ekaz7crqtb5gv7	lot	3200.0000	5000.0000	0.1925	0.1925	8.0000	3.0000	\N	3200.0000	FIFO	t	\N	\N	\N	\N	\N	\N	\N	2026-04-25 07:29:34.596	2026-04-25 07:29:34.596
cmoe0r1qp00evaz7cx1qtfbgj	cmoe00wty003sanv8seavfjqn	ART-00004	Câble RJ45 (1m)	cmoe0r1oe00emaz7cbgphuv2j	unité	1500.0000	2500.0000	0.1925	0.1925	20.0000	5.0000	\N	1500.0000	FIFO	t	\N	\N	\N	\N	\N	\N	\N	2026-04-25 07:29:34.609	2026-04-25 07:29:34.609
cmoe0r1r100exaz7cer8hfvac	cmoe00wty003sanv8seavfjqn	ART-00005	Toner imprimante	cmoe0r1o300elaz7cs3oarao0	unité	45000.0000	65000.0000	0.1925	0.1925	0.0000	2.0000	\N	45000.0000	CMUP	t	\N	\N	\N	\N	\N	\N	\N	2026-04-25 07:29:34.621	2026-04-25 07:29:34.621
\.


--
-- Data for Name: asset_depreciations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.asset_depreciations (id, asset_id, fiscal_year_id, year, opening_value, depreciation_amt, closing_value, entry_generated, created_at) FROM stdin;
cmoe0r0dx00dtaz7cscl0ujcd	cmoe0r0cv00dnaz7cf396vjs1		2024	1400000.00	466620.00	933380.00	t	2026-04-25 07:29:32.853
cmoe0r0eb00dvaz7cnxydt1l5	cmoe0r0cv00dnaz7cf396vjs1		2025	933380.00	466620.00	466760.00	t	2026-04-25 07:29:32.867
cmoe0r0f200dxaz7cgevjryqq	cmoe0r0cu00dkaz7cm2q1hqds		2024	1400000.00	466620.00	933380.00	t	2026-04-25 07:29:32.893
cmoe0r0fm00dzaz7cgm6ryzj6	cmoe0r0cu00dkaz7cm2q1hqds		2025	933380.00	466620.00	466760.00	t	2026-04-25 07:29:32.914
cmoe0r0g500e1az7cvpmx92zm	cmoe0r0cv00dlaz7ct1lovval		2024	600000.00	120000.00	480000.00	t	2026-04-25 07:29:32.933
cmoe0r0gj00e3az7cymlwdqbq	cmoe0r0cv00dlaz7ct1lovval		2025	480000.00	120000.00	360000.00	t	2026-04-25 07:29:32.947
cmoe0r0h000e5az7cw9piike1	cmoe0r0cv00dpaz7cvefduk1y		2024	350000.00	70000.00	280000.00	t	2026-04-25 07:29:32.963
cmoe0r0hf00e7az7c2b64n6id	cmoe0r0cv00dpaz7cvefduk1y		2025	280000.00	70000.00	210000.00	t	2026-04-25 07:29:32.979
cmoe0r0hq00e9az7caelz0cra	cmoe0r0cy00draz7c21ktzmam		2024	250000.00	50000.00	200000.00	t	2026-04-25 07:29:32.99
cmoe0r0i100ebaz7cwffw2vy9	cmoe0r0cy00draz7c21ktzmam		2025	200000.00	50000.00	150000.00	t	2026-04-25 07:29:33.001
\.


--
-- Data for Name: assets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assets (id, company_id, fiscal_year_id, designation, account_number, category, status, acquisition_date, service_date, disposal_date, gross_value, residual_value, depreciation_mode, useful_life_years, depreciation_rate, supplier, serial_number, location, notes, created_at, updated_at) FROM stdin;
cmoe0r0cv00dnaz7cf396vjs1	cmoe00wty003sanv8seavfjqn	\N	MacBook Pro 14 (Direction)	2445	CORPOREL	IN_SERVICE	2024-01-01 00:00:00	\N	\N	1400000.00	0.00	LINEAR	3	0.3333	\N	\N	\N	\N	2026-04-25 07:29:32.815	2026-04-25 07:29:32.815
cmoe0r0cu00dkaz7cm2q1hqds	cmoe00wty003sanv8seavfjqn	\N	MacBook Pro 14 (Comptable)	2445	CORPOREL	IN_SERVICE	2024-01-01 00:00:00	\N	\N	1400000.00	0.00	LINEAR	3	0.3333	\N	\N	\N	\N	2026-04-25 07:29:32.814	2026-04-25 07:29:32.814
cmoe0r0cy00draz7c21ktzmam	cmoe00wty003sanv8seavfjqn	\N	Climatiseur Akwa Palace	2446	CORPOREL	IN_SERVICE	2024-01-01 00:00:00	\N	\N	250000.00	0.00	LINEAR	5	0.2000	\N	\N	\N	\N	2026-04-25 07:29:32.816	2026-04-25 07:29:32.816
cmoe0r0cv00dpaz7cvefduk1y	cmoe00wty003sanv8seavfjqn	\N	Chaises de bureau (lot)	2446	CORPOREL	IN_SERVICE	2024-01-01 00:00:00	\N	\N	350000.00	0.00	LINEAR	5	0.2000	\N	\N	\N	\N	2026-04-25 07:29:32.816	2026-04-25 07:29:32.816
cmoe0r0cv00dlaz7ct1lovval	cmoe00wty003sanv8seavfjqn	\N	Bureau direction	2446	CORPOREL	IN_SERVICE	2024-01-01 00:00:00	\N	\N	600000.00	0.00	LINEAR	5	0.2000	\N	\N	\N	\N	2026-04-25 07:29:32.814	2026-04-25 07:29:32.814
\.


--
-- Data for Name: athenis_counters; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.athenis_counters (id, type, last_number) FROM stdin;
1b495078-5805-4e45-9f61-4740783fd1a0	CABINET	1
b289dcf1-2910-4b5a-9c5d-840b6b584d1b	PERSONAL	3
6f059713-15fc-4203-8f2e-b3396f1217a4	COMPANY	20
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.attachments (id, company_id, file_name, file_size, mime_type, storage_key, uploaded_by, uploaded_at, invoice_id, expense_id) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.audit_logs (id, user_id, cabinet_user_id, company_id, action, resource, resource_id, ip_address, user_agent, metadata, created_at) FROM stdin;
cmo5wm5890004twmcz7em34l9	cmo5wm55t0000twmc1xh0znn3	\N	\N	USER_CREATED	\N	\N	::1	curl/8.18.0	\N	2026-04-19 15:11:37.975
cmo68cxmy0007ikv6shlwbxwi	cmo68cxkt0003ikv6yqjzmol3	\N	cmo68cxjy0001ikv6lbj1fspu	USER_CREATED	\N	\N	::1	curl/8.18.0	\N	2026-04-19 20:40:23.626
cmo68f72b000cikv6xisizekv	cmo68f70a0008ikv6fvphkg7r	\N	\N	USER_CREATED	\N	\N	::1	curl/8.18.0	\N	2026-04-19 20:42:09.155
cmo68wv60000kikv623eced1q	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-19 20:55:53.544
cmo68zsa9000mikv6r87uw68x	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-19 20:58:09.777
cmo68zui8000qikv6hjpkr8j2	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-19 20:58:12.656
cmo6dfrhz000wikv6qdbfymzp	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-19 23:02:33.719
cmo6r2qky0015ikv6v5jdrldf	cmo6r2qkf0011ikv6w51wfo22	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:24:20.627
cmo6r3h8m001eikv6e8ybc2md	cmo6r3h8b001aikv6wjizkaty	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:24:55.174
cmo6r5fvj001nikv6xryhrqye	cmo6r5fvb001jikv61aco8voa	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:26:26.719
cmo6s20kj0004qye64rqzzxuu	cmo6s20ij0000qye6w1hbhegk	\N	\N	USER_CREATED	\N	\N	::1	curl/8.18.0	\N	2026-04-20 05:51:46.531
cmo6s3grw000bqye6do93k5x9	cmo6s3gq70007qye6m4qvpxmx	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:52:54.188
cmo6s64c3000jqye6q46fyli5	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:54:58.035
cmo6s6btt000lqye6fqfs94e0	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:55:07.745
cmo6s72pv000tqye6gjdp6azy	cmo6s72pa000pqye6tie3e9mh	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:55:42.595
cmo6s7li7000vqye6ijrdxgha	cmo6s72pa000pqye6tie3e9mh	\N	\N	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 05:56:06.943
cmo6sucjl0003jaau6ocw3khq	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 06:13:48.417
cmo6sxs3w000cjaau2jhi8dop	cmo6sxs3f0008jaau0v0nb1bt	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 06:16:28.556
cmo6tto0r0004ttfvpm8drczy	cmo6tto030000ttfvrr6tk40i	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 06:41:16.251
cmo6tyli4000attfvnh6e3y22	cmo6tto030000ttfvrr6tk40i	\N	\N	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 06:45:06.268
cmo6ujgci000ettfvwrvwqisq	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 07:01:19.362
cmo727i7x000mttfvnn8p6c0w	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:35:58.845
cmo727mrm000ottfvxs7e40ts	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:36:04.738
cmo728a8d000sttfv6zi2i7gq	cmo71zrgz000e8ffp8f86bns1	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:36:35.15
cmo72a8kj0010ttfv50hfxiq3	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:38:06.307
cmo72brwv0018ttfvu39lp02l	cmo6s72pa000pqye6tie3e9mh	\N	\N	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:39:18.031
cmo72tong001gttfvrzxy6z3t	cmo6s72pa000pqye6tie3e9mh	\N	\N	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:53:13.613
cmo72twwq001ittfvv2b7mcin	cmo6s72pa000pqye6tie3e9mh	\N	\N	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:53:24.314
cmo72tzxr001mttfv1658lao8	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 10:53:28.239
cmo734dmy001uttfvg4vddona	cmo71zrgz000e8ffp8f86bns1	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 11:01:32.554
cmo7eoi6f0022ttfv1xbbzeoc	cmo68wv3c000gikv6trg913mt	\N	cmo68wv31000eikv68dra4xh6	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 16:25:07.335
cmo7ep6iu0026ttfvhj6yb30c	cmo6s72pa000pqye6tie3e9mh	\N	\N	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 16:25:38.886
cmo7i3l5u002fttfvrhedbv99	cmo7i3l5g002bttfvi95van66	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 18:00:49.89
cmo7i7hr30031ttfv3sf4hif1	cmo7i7hp1002xttfv3plqhit2	\N	\N	USER_CREATED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 18:03:52.095
cmo7i99ys0037ttfvmvdofjyi	cmo7i7hp1002xttfv3plqhit2	\N	\N	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 18:05:15.316
cmo7i9he8003bttfv3llbbfpg	cmo7i7hp1002xttfv3plqhit2	\N	\N	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 18:05:24.944
cmo7i9n76003fttfvkzlqc4uy	cmo71zrgz000e8ffp8f86bns1	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-20 18:05:32.466
cmo8b91hf003vttfv3vgzxoym	cmo71zrgz000e8ffp8f86bns1	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0	\N	2026-04-21 07:36:53.187
cmodnakq3000311gag2x5rrwl	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 01:12:51.051
cmodndaur000711gae1c9lnab	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.4758.0 Chrome/146.0.7680.188 Electron/41.3.0 Safari/537.36 MSIX	\N	2026-04-25 01:14:58.227
cmodzjbmw000b11ga2dixrp8b	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 06:55:34.568
cmodzjej4000f11gaeiwq4dp2	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 06:55:38.32
cmodzkhjt000l11gavnmrdjb1	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.4758.0 Chrome/146.0.7680.188 Electron/41.3.0 Safari/537.36 MSIX	\N	2026-04-25 06:56:28.889
cmodzkmeg000p11gag2pmkml4	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.4758.0 Chrome/146.0.7680.188 Electron/41.3.0 Safari/537.36 MSIX	\N	2026-04-25 06:56:35.176
cmodzr43x0003ky94tm8fhl0v	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 07:01:38.061
cmodzto9x0007ky94lvkr05ij	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 07:03:37.509
cmodzu9ai000bky945l9lhusz	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Claude/1.4758.0 Chrome/146.0.7680.188 Electron/41.3.0 Safari/537.36 MSIX	\N	2026-04-25 07:04:04.746
cmodzvawk000fky9407njwo0i	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 07:04:53.492
cmodzwllc000jky94uwdymo0b	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 07:05:54
cmodzygxo000311f7m8fwk152	cmo4xfky400071x08l2a3mbs4	\N	cmo4xfkl000021x08yhdvbebz	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 07:07:21.276
cmoe012aa000711f7ik8y174q	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	curl/8.18.0	\N	2026-04-25 07:09:22.258
cmoe02yi5000b11f7bcpeu8l2	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 07:10:50.669
cmoe16b8k0003yrjuuu22456m	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 07:41:26.756
cmoe16hmy0007yrjualy62lv1	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 07:41:35.05
cmoe176kj000byrjunp2brgx9	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 07:42:07.364
cmoe7ibw0000fyrju7g1n50h7	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 10:38:45.168
cmoe9cdh70007ddynkf7gvuw5	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 11:30:06.524
cmoexk4q2000dddyn1qxurlz8	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 22:47:59.21
cmoexkheu000hddynxa7ryl1l	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 22:48:15.654
cmoexknr7000jddynwjsjt7o0	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 22:48:23.875
cmoeydt8b000nddynv2i8nxb6	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:11:03.995
cmoeydzab000pddyneszba3vv	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:11:11.844
cmoeygfcw000tddynms8qjwht	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:13:05.985
cmoeygm2g000vddynj1j9486h	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:13:14.68
cmoeyt5p7000zddynpm70xlas	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:22:59.995
cmoez28t70011ddyn48ogcc5a	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:30:03.931
cmoez2ugx0015ddynqdsnz6pe	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:30:32.001
cmoez4qmh0017ddyn5011kq4c	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGOUT	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:32:00.33
cmoez7ci9001bddynqab9csgy	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:34:02.002
cmoezsan5001hddyna5475ab0	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-25 23:50:19.361
cmof0j6jx001nddyng49shhcs	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-26 00:11:13.774
cmof0y3p3001vddynclw5zf20	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-26 00:22:49.911
cmof1dicx001zddynu4j53gip	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-26 00:34:48.753
cmof23omg0027ddynn41bswmf	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-26 00:55:09.928
cmof37y8r002dddynpkua3n9o	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-04-26 01:26:28.635
cmonfngn40001vqcniltl0h5o	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN_FAILED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	{"attempts": 1}	2026-05-01 21:36:37.118
cmonfpl7c0003vqcnyb9zwjge	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN_FAILED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	{"attempts": 2}	2026-05-01 21:38:16.344
cmong6ngi0007vqcntyam8zst	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-05-01 21:51:32.419
cmong7j2x0009vqcna3xs9jcu	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN_FAILED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	{"attempts": 1}	2026-05-01 21:52:13.401
cmong7je7000dvqcnavyrq9th	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN_FAILED	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	{"attempts": 2}	2026-05-01 21:52:13.807
cmong8dl2000hvqcn7s9il3ux	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-05-01 21:52:52.935
cmongws4q0003ucngql77ef8k	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-05-01 22:11:51.531
cmonh38ux0005tj1ugyagsgsj	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-05-01 22:16:53.145
cmonh5euf000dtj1uo85z6xxz	cmoe00wu9003uanv8h810i81r	\N	cmoe00wty003sanv8seavfjqn	LOGIN	\N	\N	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36	\N	2026-05-01 22:18:34.215
\.


--
-- Data for Name: bank_transactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.bank_transactions (id, company_id, date, label, amount, type, reference, status, lettrage, invoice_id, expense_id, imported_at, created_at) FROM stdin;
\.


--
-- Data for Name: cabinet_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cabinet_invitations (id, cabinet_id, company_email, company_name, type, modules, notes, token, status, expires_at, accepted_at, rejected_at, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: cabinets; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cabinets (id, name, siret, created_at, updated_at) FROM stdin;
cmo4xfkke00001x08juvbhn5s	Expert Compta & Associés	12345678900012	2026-04-18 22:46:44.7	2026-04-18 22:46:44.7
cmo6s72p0000nqye6y7et8yns	cgm	78945612311234	2026-04-20 05:55:42.563	2026-04-20 05:55:42.563
cmo7i7hov002vttfv0jixq4i3	cgm	78945612345675	2026-04-20 18:03:52.016	2026-04-20 18:03:52.016
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clients (id, company_id, name, email, phone, address, siren, created_at, updated_at) FROM stdin;
seed-client-acme	cmo4xfkl000021x08yhdvbebz	Acme Corp	billing@acme.example	\N	\N	987654321	2026-04-18 22:46:45.282	2026-04-18 22:46:45.282
seed-client-techstart	cmo4xfkl000021x08yhdvbebz	TechStart SAS	finance@techstart.example	\N	\N	456789123	2026-04-18 22:46:45.282	2026-04-18 22:46:45.282
seed-client-global	cmo4xfkl000021x08yhdvbebz	Global Trade SARL	compta@globaltrade.example	\N	\N	\N	2026-04-18 22:46:45.282	2026-04-18 22:46:45.282
seed-cl-dupont	cmo4xfkl000021x08yhdvbebz	SARL Dupont & Fils	contact@dupont.example	\N	\N	111222333	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
seed-cl-btp	cmo4xfkl000021x08yhdvbebz	BTP Solutions	admin@btpsolutions.example	\N	\N	\N	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
seed-cl-martin	cmo4xfkl000021x08yhdvbebz	Cabinet Martin	compta@martin.example	\N	\N	333444555	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
seed-cl-lefevre	cmo4xfkl000021x08yhdvbebz	Groupe Lefèvre	finance@lefevre.example	\N	\N	444555666	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
seed-cl-startupco	cmo4xfkl000021x08yhdvbebz	StartupCo	cfo@startupco.example	\N	\N	555666777	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
seed-cl-perrin	cmo4xfkl000021x08yhdvbebz	Julie Perrin	julie.perrin@example.com	\N	\N	\N	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
seed-cl-fontaine	cmo4xfkl000021x08yhdvbebz	Marc Fontaine	marc.fontaine@example.com	\N	\N	\N	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
seed-cl-technova	cmo4xfkl000021x08yhdvbebz	Tech Nova SAS	billing@technova.example	\N	\N	222333444	2026-04-20 10:29:57.659	2026-04-20 10:29:57.659
ubm-cl-sgcm	cmoe00wty003sanv8seavfjqn	Société Générale CM	info@sgcameroun.cm	+237 233 504 444	Douala, Cameroun	CM-SGCM-001	2026-04-25 07:09:15.852	2026-04-25 07:09:15.852
ubm-cl-kadji	cmoe00wty003sanv8seavfjqn	Groupe Kadji & Cie	direction@groupekadji.cm	+237 233 421 500	Douala, Cameroun	CM-KADJI-01	2026-04-25 07:09:15.852	2026-04-25 07:09:15.852
ubm-cl-bgfi	cmoe00wty003sanv8seavfjqn	BGFI Bank Cameroun	contact@bgfibank.cm	+237 233 505 000	Douala, Cameroun	CM-BGFI-001	2026-04-25 07:09:15.852	2026-04-25 07:09:15.852
ubm-cl-dangote	cmoe00wty003sanv8seavfjqn	Dangote Cement CM	cm@dangotecement.com	+237 699 888 777	Douala, Cameroun	CM-DANG-001	2026-04-25 07:09:15.852	2026-04-25 07:09:15.852
ubm-cl-mtn	cmoe00wty003sanv8seavfjqn	MTN Cameroun SA	procurement@mtn.cm	+237 222 504 000	Douala, Cameroun	CM-MTN-001	2026-04-25 07:09:15.852	2026-04-25 07:09:15.852
ubm-cl-afriland	cmoe00wty003sanv8seavfjqn	Afriland First Bank	direction@afrilandfirstbank.com	+237 222 237 010	Yaoundé, Cameroun	CM-AFL-001	2026-04-25 07:09:15.853	2026-04-25 07:09:15.853
ubm-cl-camtel	cmoe00wty003sanv8seavfjqn	CAMTEL	dg@camtel.cm	+237 222 233 000	Yaoundé, Cameroun	CM-CAMTEL-1	2026-04-25 07:09:15.853	2026-04-25 07:09:15.853
ubm-cl-fatou	cmoe00wty003sanv8seavfjqn	Fatou Ndiaye Consulting	fatou.ndiaye@consulting.sn	+221 77 123 4567	Dakar, Sénégal	\N	2026-04-25 07:09:15.853	2026-04-25 07:09:15.853
ubm-cl-total	cmoe00wty003sanv8seavfjqn	Total Energies CM	cm.procurement@totalenergies.com	+237 233 401 000	Douala, Cameroun	CM-TOTAL-01	2026-04-25 07:09:15.853	2026-04-25 07:09:15.853
ubm-cl-mbarga	cmoe00wty003sanv8seavfjqn	Jean-Paul Mbarga	jpmbarga@gmail.com	+237 677 234 567	Yaoundé, Cameroun	\N	2026-04-25 07:09:15.852	2026-04-25 07:09:15.852
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.companies (id, name, siren, secteur, taille, plan, modules, cabinet_id, created_at, updated_at, accounting_plan, accounting_zone, address, capital, city, contact_email, country, currency, currency_symbol, discount_rate, font, invoice_mentions, late_interest_rate, legal_form, locale, logo, naf, payment_terms, phone, postal_code, primary_color, secondary_color, security_policy, siret, timezone, vat_number, vat_rates, website, account_number_length, fiscal_year_start, plan_expires_at) FROM stdin;
cmo68cxjy0001ikv6lbj1fspu	Test SAS	\N	\N	PME	FREE	{gestion}	\N	2026-04-19 20:40:23.518	2026-04-19 20:40:23.518	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
cmoe00wty003sanv8seavfjqn	UBM Consulting SARL	CM-UBM-001	Services / Conseil aux entreprises	PME	PREMIUM	{gestion,rh,comptabilite,juridique,esg,fiscalite}	\N	2026-04-25 07:09:15.19	2026-04-25 07:29:31.293	SYSCOHADA Révisé 2017	OHADA	Rue Joss, Akwa, Douala	5000000.00	Douala	contact@ubm-consulting.cm	CM	XAF	F CFA	\N	\N	\N	\N	SARL	fr-CM	\N	\N	30	+237 699 123 456	\N	\N	\N	{"sessionExpiry": 4, "maxFailedAttempts": 5, "minPasswordLength": 8, "require2faForAdmin": false}	RC/DLA/2020/B/1247	Africa/Douala	M021512789456K	[19.25]	www.ubm-consulting.cm	9	1	\N
cmo71ynsp0006ib2j0kpkmfpv	Tech Nova SAS	987654321	Technologie	TPE	PRO	{gestion,rh,comptabilite,juridique}	cmo4xfkke00001x08juvbhn5s	2026-04-20 10:29:06.169	2026-04-20 10:29:06.169	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
cmo71yntq0008ib2jwvwv0oer	BTP Solutions SARL	456789123	BTP	PME	STARTER	{gestion,rh}	cmo4xfkke00001x08juvbhn5s	2026-04-20 10:29:06.203	2026-04-20 10:29:06.203	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
cmo68wv31000eikv68dra4xh6	azer	987456123	azer	PME	PREMIUM	{gestion,rh,comptabilite,juridique,esg,fiscalite}	\N	2026-04-19 20:55:53.438	2026-04-19 20:55:53.438	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
cmoe00w4r0003anv87we7c147	Démo Sénégal SARL	SN-DEMO-001	Commerce général	PME	PRO	{gestion,rh,comptabilite,juridique}	\N	2026-04-25 07:09:14.282	2026-04-25 07:29:30.511	SYSCOHADA Révisé 2017	OHADA	\N	\N	\N	\N	SN	XOF	F CFA	\N	\N	\N	\N	\N	fr-SN	\N	\N	\N	\N	\N	\N	\N	\N	\N	Africa/Dakar	\N	[18]	\N	4	1	\N
cmoe00w4y0004anv8gyccjwse	Demo USA Corp	US-DEMO-001	Technology	PME	PRO	{gestion,rh,comptabilite,juridique}	\N	2026-04-25 07:09:14.29	2026-04-25 07:29:30.518	IFRS	IFRS	\N	\N	\N	\N	US	USD	$	\N	\N	\N	\N	\N	en-US	\N	\N	\N	\N	\N	\N	\N	\N	\N	America/New_York	\N	[0]	\N	4	1	\N
cmoe00ygr00ecanv8tdkgb4wc	Atanga Commerce SARL	CM-ATANGA-001	Commerce de détail	TPE	PREMIUM	{gestion,rh,comptabilite,juridique,esg,fiscalite}	\N	2026-04-25 07:09:17.307	2026-04-25 07:29:34.414	SYSCOHADA Révisé 2017	OHADA	Marché Congo, Douala	1000000.00	Douala	\N	CM	XAF	F CFA	\N	\N	\N	\N	SARL	fr-CM	\N	\N	\N	\N	\N	\N	\N	\N	\N	Africa/Douala	\N	[]	\N	4	1	\N
cmo4xfkl000021x08yhdvbebz	Athenis Demo SAS	123456789	Services informatiques	PME	PREMIUM	{gestion,rh,comptabilite,juridique,esg,fiscalite}	cmo4xfkke00001x08juvbhn5s	2026-04-18 22:46:44.722	2026-04-25 07:29:30.488	SYSCOHADA	OHADA	\N	\N	\N	\N	CM	XAF	F CFA	\N	\N	\N	\N	\N	fr-CM	\N	\N	\N	\N	\N	\N	\N	\N	\N	Africa/Douala	\N	[20, 10, 5.5, 2.1]	\N	4	1	\N
cmp1pp7rt000huz8n1u41fh81	Nouvelle Entreprise SARL	\N	\N	PME	FREE	{gestion}	\N	2026-05-11 21:26:41.561	2026-05-11 21:26:41.561	SYSCOHADA Révisé 2017	OHADA	\N	\N	\N	\N	CM	XAF	F CFA	\N	\N	\N	\N	\N	fr-CM	\N	\N	\N	\N	\N	\N	\N	\N	\N	Africa/Douala	\N	\N	\N	4	1	\N
cmp1pph96000ruz8no7qqhurn	Test Final Corp	\N	\N	PME	FREE	{gestion}	\N	2026-05-11 21:26:53.851	2026-05-11 21:26:53.851	SYSCOHADA Révisé 2017	OHADA	\N	\N	\N	\N	CM	XAF	F CFA	\N	\N	\N	\N	\N	fr-CM	\N	\N	\N	\N	\N	\N	\N	\N	\N	Africa/Douala	\N	\N	\N	4	1	\N
cmp1q9iei0011uz8n5z0h26le	Test Company	\N	\N	PME	FREE	{gestion}	\N	2026-05-11 21:42:28.458	2026-05-11 21:42:28.458	SYSCOHADA Révisé 2017	OHADA	\N	\N	\N	\N	CM	XAF	F CFA	\N	\N	\N	\N	\N	fr-CM	\N	\N	\N	\N	\N	\N	\N	\N	\N	Africa/Douala	\N	\N	\N	4	1	\N
cmp1qd220001guz8nmwghk5so	Mon Entreprise SARL	\N	\N	PME	FREE	{gestion}	\N	2026-05-11 21:45:13.896	2026-05-11 21:45:13.896	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
cmp1rpitd0005yqt1prybxrn7	azore	\N	\N	PME	FREE	{gestion}	\N	2026-05-11 22:22:55.105	2026-05-11 22:22:55.105	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
cmp1rqk26000hyqt1x1k6cqr2	somer	\N	\N	PME	FREE	{gestion}	\N	2026-05-11 22:23:43.374	2026-05-11 22:23:43.374	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
cmp1rycpa000512dmx4xmqwx7	acump	\N	\N	PME	PREMIUM	{gestion,rh,comptabilite,juridique,esg,fiscalite}	\N	2026-05-11 22:29:47.086	2026-05-11 22:29:47.086	PCG	FRANCE	\N	\N	\N	\N	FR	EUR	€	\N	\N	\N	\N	\N	fr-FR	\N	\N	\N	\N	\N	\N	\N	\N	\N	Europe/Paris	\N	\N	\N	4	1	\N
\.


--
-- Data for Name: company_roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_roles (id, company_id, name, description, is_system, permissions, created_at) FROM stdin;
cmoe00whh0035anv8zcmqzfe2	cmo4xfkl000021x08yhdvbebz	Administrateur	Accès total à tous les modules	t	{"rh": "admin", "esg": "admin", "gestion": "admin", "settings": "admin", "juridique": "admin", "comptabilite": "admin"}	2026-04-25 07:09:14.741
cmoe00wht0037anv8n55tfqh0	cmo4xfkl000021x08yhdvbebz	Comptable	Accès Gestion + Comptabilité	t	{"rh": "read", "esg": "read", "gestion": "write", "settings": "none", "juridique": "read", "comptabilite": "write"}	2026-04-25 07:09:14.754
cmoe00wi20039anv8kpbgmu27	cmo4xfkl000021x08yhdvbebz	Responsable RH	Accès RH uniquement	t	{"rh": "write", "esg": "none", "gestion": "read", "settings": "none", "juridique": "read", "comptabilite": "none"}	2026-04-25 07:09:14.762
cmoe00wi9003banv89g1e1hsw	cmo4xfkl000021x08yhdvbebz	Lecture seule	Accès en lecture sur tous les modules	t	{"rh": "read", "esg": "read", "gestion": "read", "settings": "none", "juridique": "read", "comptabilite": "read"}	2026-04-25 07:09:14.77
cmoe00wih003danv86syac6im	cmo4xfkl000021x08yhdvbebz	Responsable commercial	Gestion écriture + Comptabilité lecture	f	{"rh": "none", "esg": "none", "gestion": "write", "settings": "none", "juridique": "read", "comptabilite": "read"}	2026-04-25 07:09:14.777
cmoe00xze00bwanv8g8ex23ty	cmoe00wty003sanv8seavfjqn	Administrateur	Accès total — DG	t	{"rh": "admin", "esg": "admin", "gestion": "admin", "settings": "admin", "juridique": "admin", "comptabilite": "admin"}	2026-04-25 07:09:16.682
cmoe00xzk00byanv8c9bm3msg	cmoe00wty003sanv8seavfjqn	Comptable	Gestion + Comptabilité lecture/écriture	t	{"rh": "read", "esg": "read", "gestion": "write", "settings": "none", "juridique": "read", "comptabilite": "write"}	2026-04-25 07:09:16.688
cmoe00xzs00c0anv86u0na19y	cmoe00wty003sanv8seavfjqn	Comptable Junior	Comptabilité lecture uniquement	t	{"rh": "none", "esg": "none", "gestion": "read", "settings": "none", "juridique": "none", "comptabilite": "read"}	2026-04-25 07:09:16.696
\.


--
-- Data for Name: company_users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.company_users (id, company_id, user_id, role_id, status, invited_by, invited_at, joined_at, created_at) FROM stdin;
cmoe00wiq003fanv8ez64zser	cmo4xfkl000021x08yhdvbebz	cmo4xfky400071x08l2a3mbs4	cmoe00whh0035anv8zcmqzfe2	ACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:14.786
cmoe00wj8003hanv83c4k2dgc	cmo4xfkl000021x08yhdvbebz	cmo4xfkyj00091x088b88wghz	cmoe00wht0037anv8n55tfqh0	ACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:14.804
cmoe00wjl003janv82uui09gb	cmo4xfkl000021x08yhdvbebz	cmo4xfkyu000b1x089kxz7zuw	cmoe00wi20039anv8kpbgmu27	ACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:14.818
cmoe00wjz003lanv86y8swfzz	cmo4xfkl000021x08yhdvbebz	cmo4xfkz7000d1x083o4kh5b1	cmoe00wi9003banv89g1e1hsw	INACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:14.831
cmoe00wkd003nanv8dy5c699o	cmo4xfkl000021x08yhdvbebz	cmo4xfkzm000f1x082c0zg6wa	cmoe00wih003danv86syac6im	ACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:14.845
cmoe00xzx00c2anv87lf7dplm	cmoe00wty003sanv8seavfjqn	cmoe00wu9003uanv8h810i81r	cmoe00xze00bwanv8g8ex23ty	ACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:16.701
cmoe00y0c00c6anv8vno2dyos	cmoe00wty003sanv8seavfjqn	cmoe00xbs003yanv8vp531l6k	cmoe00xzs00c0anv86u0na19y	ACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:16.717
cmoe00y0500c4anv8s2gnpt7h	cmoe00wty003sanv8seavfjqn	cmoe00x2n003wanv8ok8708pu	cmoe00xzk00byanv8c9bm3msg	ACTIVE	\N	\N	2026-01-01 00:00:00	2026-04-25 07:09:16.71
\.


--
-- Data for Name: contract_signatures; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.contract_signatures (id, contract_id, signer_name, signer_email, signer_role, status, token, signed_at, refused_at, refused_note, created_at) FROM stdin;
cmoe00xxu00b7anv82b1qkpcs	cmoe00xxn00b6anv8eq4wc7g6	Urbain Bello Moukouri	ubm@ubm-consulting.cm	DG UBM	SIGNED	e981213b-fd31-4dc6-b40d-2df03878e2b7	2025-12-20 00:00:00	\N	\N	2026-04-25 07:09:16.626
cmoe00xxu00b8anv8np0gfzoc	cmoe00xxn00b6anv8eq4wc7g6	DG MTN Cameroun	dg@mtn.cm	Directeur Général MTN	SIGNED	ff5c562c-dc17-4dd7-8e33-1882d5b5f171	2025-12-22 00:00:00	\N	\N	2026-04-25 07:09:16.626
cmoe0r05b00b7az7cibh0pa0j	cmoe0r05400b6az7cq0mwgabd	Urbain Bello Moukouri	ubm@ubm-consulting.cm	DG UBM	SIGNED	4f983cbd-af54-4948-8c38-fd13861e07f3	2025-12-20 00:00:00	\N	\N	2026-04-25 07:29:32.544
cmoe0r05b00b8az7comkwnpoq	cmoe0r05400b6az7cq0mwgabd	DG MTN Cameroun	dg@mtn.cm	Directeur Général MTN	SIGNED	5a360811-7f11-4d6a-8152-aef948a70d3c	2025-12-22 00:00:00	\N	\N	2026-04-25 07:29:32.544
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.employees (id, company_id, first_name, last_name, email, employment_type, gross_salary, start_date, end_date, created_at, updated_at) FROM stdin;
cmoe0r04s00auaz7cz6rtm1kt	cmoe00wty003sanv8seavfjqn	Carine	Ekodeck	c.ekodeck@ubm.cm	FULL_TIME	850000.00	2020-03-01 00:00:00	\N	2026-04-25 07:29:32.525	2026-04-25 07:29:32.525
cmoe0r04u00b2az7c7u5bplkf	cmoe00wty003sanv8seavfjqn	Romuald	Essomba	r.essomba@ubm.cm	FULL_TIME	420000.00	2023-01-01 00:00:00	\N	2026-04-25 07:29:32.526	2026-04-25 07:29:32.526
cmoe0qyqc001caz7ca9mvjm1i	cmo4xfkl000021x08yhdvbebz	Sophie	Martin	sophie.martin@demo-sa.example	FULL_TIME	52000.00	2024-01-15 00:00:00	\N	2026-04-25 07:29:30.708	2026-04-25 07:29:30.708
cmoe0r04t00b0az7c9vc4yidb	cmoe00wty003sanv8seavfjqn	Hervé	Manga	h.manga@ubm.cm	FULL_TIME	480000.00	2022-02-01 00:00:00	\N	2026-04-25 07:29:32.526	2026-04-25 07:29:32.526
cmoe0r04s00awaz7cegmtsfp2	cmoe00wty003sanv8seavfjqn	Aminata	Fofana	a.fofana@ubm.cm	FULL_TIME	720000.00	2021-09-01 00:00:00	\N	2026-04-25 07:29:32.525	2026-04-25 07:29:32.525
cmoe0qyqc001daz7cmfo5mbk0	cmo4xfkl000021x08yhdvbebz	Lucas	Dupont	lucas.dupont@demo-sa.example	FULL_TIME	45000.00	2023-09-01 00:00:00	\N	2026-04-25 07:29:30.708	2026-04-25 07:29:30.708
cmoe0r04s00avaz7ckcxpdk79	cmoe00wty003sanv8seavfjqn	Patrick	Ngo Biyong	p.ngobiyong@ubm.cm	FULL_TIME	720000.00	2021-06-15 00:00:00	\N	2026-04-25 07:29:32.525	2026-04-25 07:29:32.525
cmoe0r04w00b4az7cr60n3v3j	cmoe00wty003sanv8seavfjqn	Christelle	Mbia	c.mbia@ubm.cm	INTERN	100000.00	2026-02-01 00:00:00	\N	2026-04-25 07:29:32.528	2026-04-25 07:29:32.528
cmoe0qyqc001baz7cgbdea3ku	cmo4xfkl000021x08yhdvbebz	Emma	Bernard	emma.bernard@demo-sa.example	PART_TIME	24000.00	2025-03-01 00:00:00	\N	2026-04-25 07:29:30.708	2026-04-25 07:29:30.708
cmoe0r04t00azaz7cacb1c9cr	cmoe00wty003sanv8seavfjqn	Nadège	Tchoupo	n.tchoupo@ubm.cm	FULL_TIME	380000.00	2022-05-01 00:00:00	\N	2026-04-25 07:29:32.526	2026-04-25 07:29:32.526
cmoe0r04s00ataz7csxe14usg	cmoe00wty003sanv8seavfjqn	Urbain	Bello Moukouri	ubm@ubm-consulting.cm	FULL_TIME	1200000.00	2020-01-01 00:00:00	\N	2026-04-25 07:29:32.525	2026-04-25 07:29:32.525
\.


--
-- Data for Name: esg_actions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.esg_actions (id, company_id, title, description, pilier, priority, status, target_year, deadline, owner, kpi_target, kpi_current, co2_saving, created_at, updated_at) FROM stdin;
cmoe00xz600bqanv8kxaeqqpn	cmoe00wty003sanv8seavfjqn	Réduction impact coupures électriques AES-SONEL	Acquisition groupe électrogène hybride + panneaux solaires pour résilience énergétique	E	HIGH	IN_PROGRESS	2026	2026-06-30 00:00:00	Urbain Bello Moukouri	Réduction interruptions > 4h : objectif 0/mois	\N	3.20	2026-04-25 07:09:16.675	2026-04-25 07:09:16.675
cmoe00xz600branv8xs24gmer	cmoe00wty003sanv8seavfjqn	Partenariat universités pour recrutement profils seniors	Convention avec ESSEC Douala et Université de Yaoundé II pour vivier de talents	S	HIGH	IN_PROGRESS	2026	2026-09-30 00:00:00	Carine Ekodeck	2 recrutements seniors via partenariat université	\N	\N	2026-04-25 07:09:16.675	2026-04-25 07:09:16.675
cmoe00xz600bsanv8cvaagopc	cmoe00wty003sanv8seavfjqn	Veille juridique OHADA et conformité réglementaire	Mise en place veille mensuelle OHADA, DSF, CNPS et évolutions législatives camerounaises	G	HIGH	TODO	2026	2026-12-31 00:00:00	Romuald Essomba	Zéro pénalité fiscale ou sociale en 2026	\N	\N	2026-04-25 07:09:16.675	2026-04-25 07:09:16.675
cmoe00xz600btanv8g4kegviq	cmoe00wty003sanv8seavfjqn	Réduction empreinte carbone transports aériens	Priorité visioconférence pour réunions clients ; bilan carbone annuel transport	E	MEDIUM	TODO	2026	2026-12-31 00:00:00	Urbain Bello Moukouri	Réduction vols d’affaires : −20% vs 2025	\N	4.50	2026-04-25 07:09:16.675	2026-04-25 07:09:16.675
cmoe00xz600buanv8w9jbxp02	cmoe00wty003sanv8seavfjqn	Publication premier rapport RSE UBM Consulting	Rédaction et diffusion du rapport RSE 2025 selon référentiel GRI Afrique	G	MEDIUM	TODO	2026	2026-06-30 00:00:00	Carine Ekodeck	Rapport RSE publié et partagé clients avant 30/06/2026	\N	\N	2026-04-25 07:09:16.675	2026-04-25 07:09:16.675
cmoe0r06l00bqaz7cb66yhyqy	cmoe00wty003sanv8seavfjqn	Réduction impact coupures électriques AES-SONEL	Acquisition groupe électrogène hybride + panneaux solaires pour résilience énergétique	E	HIGH	IN_PROGRESS	2026	2026-06-30 00:00:00	Urbain Bello Moukouri	Réduction interruptions > 4h : objectif 0/mois	\N	3.20	2026-04-25 07:29:32.589	2026-04-25 07:29:32.589
cmoe0r06l00braz7c74olu6s0	cmoe00wty003sanv8seavfjqn	Partenariat universités pour recrutement profils seniors	Convention avec ESSEC Douala et Université de Yaoundé II pour vivier de talents	S	HIGH	IN_PROGRESS	2026	2026-09-30 00:00:00	Carine Ekodeck	2 recrutements seniors via partenariat université	\N	\N	2026-04-25 07:29:32.589	2026-04-25 07:29:32.589
cmoe0r06l00bsaz7cxit2kdlf	cmoe00wty003sanv8seavfjqn	Veille juridique OHADA et conformité réglementaire	Mise en place veille mensuelle OHADA, DSF, CNPS et évolutions législatives camerounaises	G	HIGH	TODO	2026	2026-12-31 00:00:00	Romuald Essomba	Zéro pénalité fiscale ou sociale en 2026	\N	\N	2026-04-25 07:29:32.589	2026-04-25 07:29:32.589
cmoe0r06l00btaz7c7cyxh29p	cmoe00wty003sanv8seavfjqn	Réduction empreinte carbone transports aériens	Priorité visioconférence pour réunions clients ; bilan carbone annuel transport	E	MEDIUM	TODO	2026	2026-12-31 00:00:00	Urbain Bello Moukouri	Réduction vols d’affaires : −20% vs 2025	\N	4.50	2026-04-25 07:29:32.589	2026-04-25 07:29:32.589
cmoe0r06l00buaz7cq5zxp6ao	cmoe00wty003sanv8seavfjqn	Publication premier rapport RSE UBM Consulting	Rédaction et diffusion du rapport RSE 2025 selon référentiel GRI Afrique	G	MEDIUM	TODO	2026	2026-06-30 00:00:00	Carine Ekodeck	Rapport RSE publié et partagé clients avant 30/06/2026	\N	\N	2026-04-25 07:29:32.589	2026-04-25 07:29:32.589
cmosgo41e0001vgw8rhtfumrb	cmo4xfkl000021x08yhdvbebz	Réduire consommation énergétique de 20%	\N	E	MEDIUM	TODO	2026	1970-01-01 00:00:00	\N	\N	\N	\N	2026-05-05 10:03:57.938	2026-05-05 10:03:57.938
cmosgr6d0000bhwiwll0zdadf	cmoe00wty003sanv8seavfjqn	Test sans échéance	\N	E	MEDIUM	TODO	2026	\N	\N	\N	\N	\N	2026-05-05 10:06:20.916	2026-05-05 10:06:20.916
\.


--
-- Data for Name: esg_data; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.esg_data (id, company_id, year, energy_kwh, waste_kg, gender_pay_gap, training_hours, created_at, updated_at, absenteeism_rate, board_female_ratio, has_anticorruption, has_ethics_code, renewable_ratio, scope1_details, scope1_total, scope2_kwh, scope2_total, scope3_details, scope3_total, workplace_accidents, scope1_tco2e, scope2_tco2e, scope3_tco2e) FROM stdin;
cmoe00xyy00bpanv8ospgnjsn	cmoe00wty003sanv8seavfjqn	2025	48000.00	2400.00	8.00	32.00	2026-04-25 07:09:16.666	2026-04-25 07:09:16.666	2.10	25.00	f	t	0.00	{"fuelOil": 0, "process": 0, "vehicles": 12.5, "naturalGas": 5.9}	18.40	48000.00	12.80	{"waste": 1.8, "freight": 0, "businessTravel": 18.2, "purchasedGoods": 2.4}	22.40	0	\N	\N	\N
cmo71zrtn001t8ffpnwjhbdx6	cmo4xfkl000021x08yhdvbebz	2026	180000.00	280.00	2.10	26.00	2026-04-20 10:29:58.043	2026-05-05 09:11:51.249	\N	\N	t	t	\N	\N	\N	\N	\N	\N	\N	\N	45.0000	\N	\N
cmo71zrt7001r8ffp2g5cfofr	cmo4xfkl000021x08yhdvbebz	2025	48500.00	320.00	3.20	24.00	2026-04-20 10:29:58.028	2026-05-05 09:56:11.67	\N	25.00	f	f	15.00	\N	\N	\N	\N	\N	\N	\N	12.6900	2.7693	\N
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.expenses (id, company_id, category, amount, description, date, receipt_url, created_at, updated_at, fiscal_year_id) FROM stdin;
cmoe0qyoy0011az7c8j8gc7ia	cmo4xfkl000021x08yhdvbebz	TRAVEL	540.00	Déplacement Paris-Lyon	2026-02-14 00:00:00	\N	2026-04-25 07:29:30.659	2026-04-25 07:29:30.87	cmoe00wde001lanv89fdntjh0
cmoe0qyoz0013az7cj7mf7lft	cmo4xfkl000021x08yhdvbebz	SOFTWARE	299.00	Licence SaaS CRM	2026-01-05 00:00:00	\N	2026-04-25 07:29:30.659	2026-04-25 07:29:30.87	cmoe00wde001lanv89fdntjh0
cmoe0qyoz0012az7cuh5vamsm	cmo4xfkl000021x08yhdvbebz	EQUIPMENT	1800.00	MacBook Pro 14"	2026-03-20 00:00:00	\N	2026-04-25 07:29:30.659	2026-04-25 07:29:30.87	cmoe00wde001lanv89fdntjh0
cmoe0qypw0015az7ch4cuuy17	cmo4xfkl000021x08yhdvbebz	CONSULTING	2400.00	Mission comptable externe	2026-04-02 00:00:00	\N	2026-04-25 07:29:30.659	2026-04-25 07:29:30.87	cmoe00wde001lanv89fdntjh0
cmoe0qypz0017az7ct1p4uin6	cmo4xfkl000021x08yhdvbebz	MARKETING	750.00	Google Ads Q1	2026-01-31 00:00:00	\N	2026-04-25 07:29:30.659	2026-04-25 07:29:30.87	cmoe00wde001lanv89fdntjh0
cmoe0qzvq005naz7czd9ghp4e	cmoe00wty003sanv8seavfjqn	SOFTWARE	85000.00	Orange Business CM — Internet fibre	2026-01-05 00:00:00	\N	2026-04-25 07:29:32.198	2026-04-25 07:29:32.198	cmoe00xgj0046anv8uircw5kh
cmoe0qzvq005laz7cuep8vabi	cmoe00wty003sanv8seavfjqn	TRAVEL	120000.00	Carburant véhicule société (Toyota)	2026-01-15 00:00:00	\N	2026-04-25 07:29:32.198	2026-04-25 07:29:32.198	cmoe00xgj0046anv8uircw5kh
cmoe0qzvq005oaz7cns4khjlq	cmoe00wty003sanv8seavfjqn	TRAVEL	245000.00	Hôtel Hilton Douala — séminaire MTN	2026-01-25 00:00:00	\N	2026-04-25 07:29:32.198	2026-04-25 07:29:32.198	cmoe00xgj0046anv8uircw5kh
cmoe0qzvq005iaz7ce24ft7ts	cmoe00wty003sanv8seavfjqn	RENT	650000.00	Loyer bureaux Akwa Douala — mars 2026	2026-03-01 00:00:00	\N	2026-04-25 07:29:32.198	2026-04-25 07:29:32.198	cmoe00xgj0046anv8uircw5kh
cmoe0qzvq005kaz7cfobmdlv9	cmoe00wty003sanv8seavfjqn	RENT	650000.00	Loyer bureaux Akwa Douala — février 2026	2026-02-01 00:00:00	\N	2026-04-25 07:29:32.198	2026-04-25 07:29:32.198	cmoe00xgj0046anv8uircw5kh
cmoe0qzvq005raz7c4fvhjhhr	cmoe00wty003sanv8seavfjqn	EQUIPMENT	95000.00	Fournitures bureau — Score CM	2026-02-02 00:00:00	\N	2026-04-25 07:29:32.199	2026-04-25 07:29:32.199	cmoe00xgj0046anv8uircw5kh
cmoe0qzvq005jaz7c2s1g6jxc	cmoe00wty003sanv8seavfjqn	RENT	650000.00	Loyer bureaux Akwa Douala — avril 2026	2026-04-01 00:00:00	\N	2026-04-25 07:29:32.198	2026-04-25 07:29:32.198	cmoe00xgj0046anv8uircw5kh
cmoe0qzvr005saz7cccu0lq1t	cmoe00wty003sanv8seavfjqn	SALARY	4850000.00	Salaires nets janvier 2026	2026-01-28 00:00:00	\N	2026-04-25 07:29:32.199	2026-04-25 07:29:32.199	cmoe00xgj0046anv8uircw5kh
cmoe0qzvq005haz7c6qz9oiyg	cmoe00wty003sanv8seavfjqn	RENT	650000.00	Loyer bureaux Akwa Douala — janvier 2026	2026-01-01 00:00:00	\N	2026-04-25 07:29:32.198	2026-04-25 07:29:32.198	cmoe00xgj0046anv8uircw5kh
cmoe0qzvv005uaz7cx8l38i0v	cmoe00wty003sanv8seavfjqn	SALARY	4850000.00	Salaires nets février 2026	2026-02-28 00:00:00	\N	2026-04-25 07:29:32.199	2026-04-25 07:29:32.199	cmoe00xgj0046anv8uircw5kh
cmoe0qzvx005xaz7c0mzozfbx	cmoe00wty003sanv8seavfjqn	TRAVEL	580000.00	Billet Air France DLA-CDG — mission Paris	2026-01-20 00:00:00	\N	2026-04-25 07:29:32.199	2026-04-25 07:29:32.199	cmoe00xgj0046anv8uircw5kh
cmoe0qzvx005yaz7c8c96gart	cmoe00wty003sanv8seavfjqn	SALARY	4850000.00	Salaires nets mars 2026	2026-03-31 00:00:00	\N	2026-04-25 07:29:32.199	2026-04-25 07:29:32.199	cmoe00xgj0046anv8uircw5kh
cmoe0qzvz0062az7cljy09a6x	cmoe00wty003sanv8seavfjqn	OTHER	320000.00	Assurance ACTIVA Cameroun — RC Pro annuelle	2026-01-01 00:00:00	\N	2026-04-25 07:29:32.2	2026-04-25 07:29:32.2	cmoe00xgj0046anv8uircw5kh
cmoe0qzw00064az7cpt6c1k5i	cmoe00wty003sanv8seavfjqn	CONSULTING	150000.00	Maintenance informatique — prestataire Douala	2026-03-15 00:00:00	\N	2026-04-25 07:29:32.201	2026-04-25 07:29:32.201	cmoe00xgj0046anv8uircw5kh
cmoe0qzvx0060az7cikzpk9ko	cmoe00wty003sanv8seavfjqn	MARKETING	180000.00	Publicité LinkedIn + Facebook — recrutement	2026-02-10 00:00:00	\N	2026-04-25 07:29:32.2	2026-04-25 07:29:32.2	cmoe00xgj0046anv8uircw5kh
\.


--
-- Data for Name: fiscal_year_closes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fiscal_year_closes (id, company_id, year, result_net, notes, closed_by, created_at) FROM stdin;
cmoe00wcz001hanv85khvzuxk	cmo4xfkl000021x08yhdvbebz	2024	22300.00	\N	cmo4xfky400071x08l2a3mbs4	2026-04-25 07:09:14.58
cmoe00xfm0042anv8n4z11kv7	cmoe00wty003sanv8seavfjqn	2024	12800000.00	Clôture exercice 2024 validée par Carine Ekodeck (DAF) le 31/03/2025	cmoe00x2n003wanv8ok8708pu	2026-04-25 07:09:15.97
\.


--
-- Data for Name: fiscal_years; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fiscal_years (id, company_id, year, start_date, end_date, status, opening_balance, closing_balance, created_by, closed_by, closed_at, created_at, updated_at) FROM stdin;
cmoe00wcm001fanv82zb71wzx	cmo4xfkl000021x08yhdvbebz	2024	2024-01-01 00:00:00	2024-12-31 00:00:00	CLOSED	{"actif": 45000, "passif": 45000}	{"actif": 185000, "passif": 185000, "resultNet": 22300}	cmo4xfky400071x08l2a3mbs4	cmo4xfky400071x08l2a3mbs4	2025-01-15 00:00:00	2026-04-25 07:09:14.566	2026-04-25 07:09:14.566
cmoe00wde001lanv89fdntjh0	cmo4xfkl000021x08yhdvbebz	2026	2026-01-01 00:00:00	2026-12-31 00:00:00	OPEN	{"actif": 285000, "passif": 285000}	\N	cmo4xfky400071x08l2a3mbs4	\N	\N	2026-04-25 07:09:14.595	2026-04-25 07:09:14.595
cmoe00xez0040anv8vr6mqnm9	cmoe00wty003sanv8seavfjqn	2024	2024-01-01 00:00:00	2024-12-31 00:00:00	CLOSED	{"actif": 8000000, "passif": 8000000}	{"actif": 42000000, "passif": 42000000, "resultatNet": 12800000}	cmoe00wu9003uanv8h810i81r	cmoe00x2n003wanv8ok8708pu	2025-03-31 00:00:00	2026-04-25 07:09:15.947	2026-04-25 07:09:15.947
cmoe00xgj0046anv8uircw5kh	cmoe00wty003sanv8seavfjqn	2026	2026-01-01 00:00:00	2026-12-31 00:00:00	OPEN	{"actif": 46550000, "passif": 46550000}	\N	cmoe00wu9003uanv8h810i81r	\N	\N	2026-04-25 07:09:16.003	2026-04-25 07:09:16.003
cmoe00wd9001janv86z99iu80	cmo4xfkl000021x08yhdvbebz	2025	2025-01-01 00:00:00	2025-12-31 00:00:00	OPEN	{"actif": 185000, "passif": 185000}	\N	cmo4xfky400071x08l2a3mbs4	\N	\N	2026-04-25 07:09:14.589	2026-04-25 07:29:30.738
cmoe00xg60044anv82abzeyun	cmoe00wty003sanv8seavfjqn	2025	2025-01-01 00:00:00	2025-12-31 00:00:00	OPEN	{"actif": 42000000, "passif": 42000000}	\N	cmoe00wu9003uanv8h810i81r	\N	\N	2026-04-25 07:09:15.99	2026-04-25 07:29:32.069
\.


--
-- Data for Name: gdpr_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.gdpr_entries (id, company_id, treatment_name, purpose, legal_basis, data_categories, data_subjects, retention_months, responsible, subcontractors, security_measures, risk_level, dpia_required, last_reviewed_at, notes, created_at, updated_at) FROM stdin;
cmoe00xyp00blanv85um2ijhl	cmoe00wty003sanv8seavfjqn	Gestion clients et facturation	Suivi commercial, émission de factures, recouvrement créances	CONTRACT	{Identité,Coordonnées,"Données financières"}	{Clients,"Contacts clients"}	120	Carine Ekodeck (DAF)	{"Afriland First Bank (facturation)"}	{"Accès rôle","Chiffrement HTTPS","Audit log"}	LOW	f	2026-01-15 00:00:00	\N	2026-04-25 07:09:16.657	2026-04-25 07:09:16.657
cmoe00xyp00bmanv8bja0wpn2	cmoe00wty003sanv8seavfjqn	Gestion RH et paie	Administration du personnel, calcul de la paie, déclarations CNPS	LEGAL_OBLIGATION	{Identité,"Données bancaires","Données RH",Salaire}	{Employés,"Anciens employés"}	60	Carine Ekodeck (DAF)	{"CNPS Cameroun"}	{"Accès restreint RH","Sauvegarde chiffrée"}	MEDIUM	f	2026-01-15 00:00:00	\N	2026-04-25 07:09:16.657	2026-04-25 07:09:16.657
cmoe00xyp00bnanv8xcyhquim	cmoe00wty003sanv8seavfjqn	Prospection commerciale	Développement du portefeuille clients, relances commerciales	LEGITIMATE_INTEREST	{Identité,"Coordonnées professionnelles"}	{Prospects,"Anciens clients"}	36	Urbain Bello Moukouri (DG)	{}	{"Liste opt-out","Désinscription sous 48h"}	LOW	f	2026-01-15 00:00:00	\N	2026-04-25 07:09:16.657	2026-04-25 07:09:16.657
cmoe0r06600blaz7c62mi6bvz	cmoe00wty003sanv8seavfjqn	Gestion clients et facturation	Suivi commercial, émission de factures, recouvrement créances	CONTRACT	{Identité,Coordonnées,"Données financières"}	{Clients,"Contacts clients"}	120	Carine Ekodeck (DAF)	{"Afriland First Bank (facturation)"}	{"Accès rôle","Chiffrement HTTPS","Audit log"}	LOW	f	2026-01-15 00:00:00	\N	2026-04-25 07:29:32.574	2026-04-25 07:29:32.574
cmoe0r06600bmaz7chl2bcdse	cmoe00wty003sanv8seavfjqn	Gestion RH et paie	Administration du personnel, calcul de la paie, déclarations CNPS	LEGAL_OBLIGATION	{Identité,"Données bancaires","Données RH",Salaire}	{Employés,"Anciens employés"}	60	Carine Ekodeck (DAF)	{"CNPS Cameroun"}	{"Accès restreint RH","Sauvegarde chiffrée"}	MEDIUM	f	2026-01-15 00:00:00	\N	2026-04-25 07:29:32.574	2026-04-25 07:29:32.574
cmoe0r06600bnaz7cbp94b9o0	cmoe00wty003sanv8seavfjqn	Prospection commerciale	Développement du portefeuille clients, relances commerciales	LEGITIMATE_INTEREST	{Identité,"Coordonnées professionnelles"}	{Prospects,"Anciens clients"}	36	Urbain Bello Moukouri (DG)	{}	{"Liste opt-out","Désinscription sous 48h"}	LOW	f	2026-01-15 00:00:00	\N	2026-04-25 07:29:32.574	2026-04-25 07:29:32.574
\.


--
-- Data for Name: igs_baremes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.igs_baremes (id, classe, ca_min, ca_max, montant_base, montant_cga, year) FROM stdin;
cmoe00y0i00c7anv8j2hptgz2	1	0.00	500000.00	5000.00	3500.00	2026
cmoe00y0p00c8anv8mk0a57y2	2	500001.00	1000000.00	10000.00	7000.00	2026
cmoe00y0s00c9anv8zxdcqlv7	3	1000001.00	2000000.00	20000.00	14000.00	2026
cmoe00y0v00caanv8rgrkq3dx	4	2000001.00	3000000.00	35000.00	24500.00	2026
cmoe00y0x00cbanv84twhnbqx	5	3000001.00	5000000.00	55000.00	38500.00	2026
cmoe00y1100ccanv8w18zrlkp	6	5000001.00	7500000.00	85000.00	59500.00	2026
cmoe00y1400cdanv8sd9e9f6h	7	7500001.00	10000000.00	120000.00	84000.00	2026
cmoe00y1800ceanv8u5hj8ige	8	10000001.00	20000000.00	200000.00	140000.00	2026
cmoe00y1b00cfanv8nd0xdal4	9	20000001.00	30000000.00	350000.00	245000.00	2026
cmoe00y1g00cganv8hdet3cit	10	30000001.00	50000000.00	550000.00	385000.00	2026
\.


--
-- Data for Name: invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invitations (id, company_id, email, role_id, token, expires_at, accepted_at, created_by, created_at) FROM stdin;
cmoe00wks003panv8lvp68lwl	cmo4xfkl000021x08yhdvbebz	invitation@test.fr	cmoe00wi9003banv89g1e1hsw	demo-invitation-token-fixed	2026-04-27 07:09:14.858	\N	cmo4xfky400071x08l2a3mbs4	2026-04-25 07:09:14.86
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, number, company_id, client_id, status, issue_date, due_date, subtotal, tax_rate, tax_amount, total, notes, created_at, updated_at, fiscal_year_id, paid_at, quote_id, recurring_invoice_id) FROM stdin;
cmoe00xgx0048anv88bahj9zi	FAC-2025/001	cmoe00wty003sanv8seavfjqn	ubm-cl-mtn	PAID	2025-01-15 00:00:00	2025-02-15 00:00:00	8500000.00	19.25	1636250.00	10136250.00	Audit organisationnel MTN Q1 2025	2026-04-25 07:09:16.017	2026-04-25 07:09:16.017	cmoe00xg60044anv82abzeyun	2025-02-10 00:00:00	\N	\N
cmoe00xhd004aanv84isbdsv1	FAC-2025/002	cmoe00wty003sanv8seavfjqn	ubm-cl-total	PAID	2025-03-01 00:00:00	2025-04-01 00:00:00	12000000.00	19.25	2310000.00	14310000.00	Conseil stratégique HSE — Phase 1	2026-04-25 07:09:16.033	2026-04-25 07:09:16.033	cmoe00xg60044anv82abzeyun	2025-03-28 00:00:00	\N	\N
cmoe00xhk004canv8xhion7k8	FAC-2025/003	cmoe00wty003sanv8seavfjqn	ubm-cl-kadji	PAID	2025-05-10 00:00:00	2025-06-10 00:00:00	9500000.00	19.25	1828750.00	11328750.00	Restructuration organisationnelle Kadji 2025	2026-04-25 07:09:16.04	2026-04-25 07:09:16.04	cmoe00xg60044anv82abzeyun	2025-06-05 00:00:00	\N	\N
cmoe00xhx004eanv81jzm6amy	FAC-2025/004	cmoe00wty003sanv8seavfjqn	ubm-cl-bgfi	PAID	2025-07-01 00:00:00	2025-08-01 00:00:00	7200000.00	19.25	1386000.00	8586000.00	Transformation digitale BGFI — Phase 2	2026-04-25 07:09:16.053	2026-04-25 07:09:16.053	cmoe00xg60044anv82abzeyun	2025-07-28 00:00:00	\N	\N
cmoe00xib004ganv8m62dix4i	FAC-2025/005	cmoe00wty003sanv8seavfjqn	ubm-cl-camtel	PAID	2025-09-01 00:00:00	2025-10-01 00:00:00	6800000.00	19.25	1309000.00	8109000.00	Audit SI CAMTEL — rapport final	2026-04-25 07:09:16.067	2026-04-25 07:09:16.067	cmoe00xg60044anv82abzeyun	2025-09-25 00:00:00	\N	\N
cmoe00xik004ianv8rhb5rk9s	FAC-2025/006	cmoe00wty003sanv8seavfjqn	ubm-cl-sgcm	PAID	2025-11-01 00:00:00	2025-12-01 00:00:00	8700000.00	19.25	1674750.00	10374750.00	Conseil conformité réglementaire SGCM	2026-04-25 07:09:16.076	2026-04-25 07:09:16.076	cmoe00xg60044anv82abzeyun	2025-11-28 00:00:00	\N	\N
cmoe00xiw004kanv8d8tc4q23	FAC-2025/007	cmoe00wty003sanv8seavfjqn	ubm-cl-mbarga	OVERDUE	2025-10-01 00:00:00	2025-11-01 00:00:00	1200000.00	19.25	231000.00	1431000.00	Conseil création entreprise — solde dû	2026-04-25 07:09:16.088	2026-04-25 07:09:16.088	cmoe00xg60044anv82abzeyun	\N	\N	\N
cmoe00xj8004manv8l1hbnjnu	FAC-2025/008	cmoe00wty003sanv8seavfjqn	ubm-cl-afriland	OVERDUE	2025-12-01 00:00:00	2025-12-31 00:00:00	14600000.00	19.25	2810500.00	17410500.00	Mission audit interne Afriland — facture non réglée	2026-04-25 07:09:16.1	2026-04-25 07:09:16.1	cmoe00xg60044anv82abzeyun	\N	\N	\N
cmoe00xjf004oanv8cbd5dyak	FAC-2026/001	cmoe00wty003sanv8seavfjqn	ubm-cl-mtn	PAID	2026-01-05 00:00:00	2026-02-05 00:00:00	4500000.00	19.25	866250.00	5366250.00	Audit organisationnel et transformation digitale Q1	2026-04-25 07:09:16.107	2026-04-25 07:09:16.107	cmoe00xgj0046anv8uircw5kh	2026-01-20 00:00:00	\N	\N
cmoe00xjq004qanv8vqb6wgbr	FAC-2026/002	cmoe00wty003sanv8seavfjqn	ubm-cl-bgfi	PAID	2026-01-10 00:00:00	2026-02-10 00:00:00	3200000.00	19.25	616000.00	3816000.00	Conseil stratégie digitale BGFI — Phase 1	2026-04-25 07:09:16.118	2026-04-25 07:09:16.118	cmoe00xgj0046anv8uircw5kh	2026-01-25 00:00:00	\N	\N
cmoe00xjy004sanv8l5ofgpsl	FAC-2026/003	cmoe00wty003sanv8seavfjqn	ubm-cl-kadji	PAID	2026-01-15 00:00:00	2026-02-15 00:00:00	6800000.00	19.25	1309000.00	8109000.00	Restructuration organisationnelle Groupe Kadji	2026-04-25 07:09:16.126	2026-04-25 07:09:16.126	cmoe00xgj0046anv8uircw5kh	2026-01-30 00:00:00	\N	\N
cmoe00xk7004uanv8xccw0t71	FAC-2026/004	cmoe00wty003sanv8seavfjqn	ubm-cl-total	PAID	2026-02-01 00:00:00	2026-03-01 00:00:00	8500000.00	19.25	1636250.00	10136250.00	Formation management — 5 jours Douala	2026-04-25 07:09:16.135	2026-04-25 07:09:16.135	cmoe00xgj0046anv8uircw5kh	2026-02-15 00:00:00	\N	\N
cmoe00xkf004wanv8os1vpj58	FAC-2026/005	cmoe00wty003sanv8seavfjqn	ubm-cl-camtel	PAID	2026-02-10 00:00:00	2026-03-10 00:00:00	5200000.00	19.25	1001000.00	6201000.00	Audit système d’information CAMTEL	2026-04-25 07:09:16.143	2026-04-25 07:09:16.143	cmoe00xgj0046anv8uircw5kh	2026-02-25 00:00:00	\N	\N
cmoe00xkn004yanv8uhhhqm17	FAC-2026/006	cmoe00wty003sanv8seavfjqn	ubm-cl-sgcm	PAID	2026-03-01 00:00:00	2026-04-01 00:00:00	4800000.00	19.25	924000.00	5724000.00	Conseil conformité réglementaire SGCM	2026-04-25 07:09:16.151	2026-04-25 07:09:16.151	cmoe00xgj0046anv8uircw5kh	2026-03-15 00:00:00	\N	\N
cmoe00xkv0050anv80xk45y8b	FAC-2026/007	cmoe00wty003sanv8seavfjqn	ubm-cl-dangote	PAID	2026-03-10 00:00:00	2026-04-10 00:00:00	7200000.00	19.25	1386000.00	8586000.00	Optimisation chaîne logistique Dangote	2026-04-25 07:09:16.159	2026-04-25 07:09:16.159	cmoe00xgj0046anv8uircw5kh	2026-03-28 00:00:00	\N	\N
cmoe00xl90052anv8p9rdocs0	FAC-2026/008	cmoe00wty003sanv8seavfjqn	ubm-cl-mtn	SENT	2026-04-01 00:00:00	2026-05-01 00:00:00	5500000.00	19.25	1058750.00	6558750.00	Transformation digitale Q2 — Phase 2	2026-04-25 07:09:16.173	2026-04-25 07:09:16.173	cmoe00xgj0046anv8uircw5kh	\N	\N	\N
cmoe00xln0054anv8i8g13jfr	FAC-2026/009	cmoe00wty003sanv8seavfjqn	ubm-cl-total	SENT	2026-04-05 00:00:00	2026-05-05 00:00:00	9200000.00	19.25	1771000.00	10971000.00	Conseil stratégique HSE et RSE	2026-04-25 07:09:16.187	2026-04-25 07:09:16.187	cmoe00xgj0046anv8uircw5kh	\N	\N	\N
cmoe00xlz0056anv8fou5ao7v	FAC-2026/010	cmoe00wty003sanv8seavfjqn	ubm-cl-afriland	SENT	2026-04-08 00:00:00	2026-05-08 00:00:00	6500000.00	19.25	1251250.00	7751250.00	Audit interne et contrôle de gestion Afriland	2026-04-25 07:09:16.199	2026-04-25 07:09:16.199	cmoe00xgj0046anv8uircw5kh	\N	\N	\N
cmoe00xmc0058anv8bnffglkk	FAC-2026/011	cmoe00wty003sanv8seavfjqn	ubm-cl-mbarga	OVERDUE	2026-02-01 00:00:00	2026-03-03 00:00:00	850000.00	19.25	163625.00	1013625.00	Conseil création d’entreprise — OVERDUE	2026-04-25 07:09:16.212	2026-04-25 07:09:16.212	cmoe00xgj0046anv8uircw5kh	\N	\N	\N
cmoe00xmk005aanv8d6ca75ix	FAC-2026/012	cmoe00wty003sanv8seavfjqn	ubm-cl-fatou	OVERDUE	2026-02-15 00:00:00	2026-03-17 00:00:00	1500000.00	19.25	288750.00	1788750.00	Formation comptabilité SYSCOHADA — OVERDUE	2026-04-25 07:09:16.22	2026-04-25 07:09:16.22	cmoe00xgj0046anv8uircw5kh	\N	\N	\N
seed-inv-001	FA-2025-001	cmo4xfkl000021x08yhdvbebz	seed-cl-dupont	PAID	2025-10-15 00:00:00	2025-11-15 00:00:00	8000.00	20.00	1600.00	9600.00	\N	2026-04-20 10:29:57.811	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-002	FA-2025-002	cmo4xfkl000021x08yhdvbebz	seed-cl-technova	PAID	2025-11-01 00:00:00	2025-12-01 00:00:00	12500.00	20.00	2500.00	15000.00	\N	2026-04-20 10:29:57.827	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-003	FA-2025-003	cmo4xfkl000021x08yhdvbebz	seed-cl-martin	PAID	2025-11-20 00:00:00	2025-12-20 00:00:00	5600.00	20.00	1120.00	6720.00	\N	2026-04-20 10:29:57.834	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-004	FA-2025-004	cmo4xfkl000021x08yhdvbebz	seed-cl-lefevre	PAID	2025-12-05 00:00:00	2026-01-05 00:00:00	3200.00	20.00	640.00	3840.00	\N	2026-04-20 10:29:57.843	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-005	FA-2025-005	cmo4xfkl000021x08yhdvbebz	seed-cl-startupco	PAID	2025-12-20 00:00:00	2026-01-20 00:00:00	9800.00	20.00	1960.00	11760.00	\N	2026-04-20 10:29:57.849	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-006	FA-2026-001	cmo4xfkl000021x08yhdvbebz	seed-cl-dupont	SENT	2026-02-01 00:00:00	2026-03-01 00:00:00	7500.00	20.00	1500.00	9000.00	\N	2026-04-20 10:29:57.858	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-007	FA-2026-002	cmo4xfkl000021x08yhdvbebz	seed-cl-technova	SENT	2026-02-15 00:00:00	2026-03-15 00:00:00	14200.00	20.00	2840.00	17040.00	\N	2026-04-20 10:29:57.864	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-008	FA-2026-003	cmo4xfkl000021x08yhdvbebz	seed-cl-btp	SENT	2026-03-01 00:00:00	2026-04-01 00:00:00	2900.00	20.00	580.00	3480.00	\N	2026-04-20 10:29:57.874	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-009	FA-2026-004	cmo4xfkl000021x08yhdvbebz	seed-cl-perrin	SENT	2026-03-10 00:00:00	2026-04-10 00:00:00	1800.00	20.00	360.00	2160.00	\N	2026-04-20 10:29:57.881	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-011	FA-2026-006	cmo4xfkl000021x08yhdvbebz	seed-cl-lefevre	OVERDUE	2026-01-10 00:00:00	2026-02-10 00:00:00	11000.00	20.00	2200.00	13200.00	\N	2026-04-20 10:29:57.897	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-012	FA-2026-007	cmo4xfkl000021x08yhdvbebz	seed-cl-startupco	OVERDUE	2026-01-25 00:00:00	2026-02-25 00:00:00	4300.00	20.00	860.00	5160.00	\N	2026-04-20 10:29:57.906	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-013	FA-2026-008	cmo4xfkl000021x08yhdvbebz	seed-cl-fontaine	OVERDUE	2026-02-05 00:00:00	2026-03-05 00:00:00	8750.00	20.00	1750.00	10500.00	\N	2026-04-20 10:29:57.912	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-014	FA-2026-009	cmo4xfkl000021x08yhdvbebz	seed-cl-btp	CANCELLED	2026-03-12 00:00:00	2026-04-12 00:00:00	3600.00	20.00	720.00	4320.00	\N	2026-04-20 10:29:57.921	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-015	FA-2026-010	cmo4xfkl000021x08yhdvbebz	seed-cl-technova	CANCELLED	2026-04-01 00:00:00	2026-05-01 00:00:00	1200.00	20.00	240.00	1440.00	\N	2026-04-20 10:29:57.928	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
seed-inv-010	FA-2026-005	cmo4xfkl000021x08yhdvbebz	seed-cl-martin	PAID	2026-03-25 00:00:00	2026-04-25 00:00:00	6400.00	20.00	1280.00	7680.00	\N	2026-04-20 10:29:57.89	2026-04-25 07:29:30.864	cmoe00wde001lanv89fdntjh0	\N	\N	\N
\.


--
-- Data for Name: journal_entries; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.journal_entries (id, company_id, fiscal_year_id, date, account, label, debit, credit, reference, journal_code, invoice_id, expense_id, created_at, piece_id, lettrage, created_by) FROM stdin;
cmoe0qyrn001naz7cjgfmyylx	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-03-15 00:00:00	411	Acme Corp — FA-2024-012	19200.00	0.00	FA-2024-012	VTE	\N	\N	2026-04-25 07:29:30.755	\N	\N	\N
cmoe0qyru001paz7ckiar8nwc	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-03-15 00:00:00	706	Acme Corp — FA-2024-012	0.00	16000.00	FA-2024-012	VTE	\N	\N	2026-04-25 07:29:30.762	\N	\N	\N
cmoe0qyry001raz7c1uvvseq9	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-03-15 00:00:00	4457	TVA collectée FA-2024-012	0.00	3200.00	FA-2024-012	VTE	\N	\N	2026-04-25 07:29:30.766	\N	\N	\N
cmoe0qys1001taz7c5atfxu7b	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-06-30 00:00:00	512	Règlement Acme Corp	19200.00	0.00	VIR-2024-001	BNQ	\N	\N	2026-04-25 07:29:30.769	\N	\N	\N
cmoe0qys3001vaz7c21rr74yu	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-06-30 00:00:00	411	Règlement Acme Corp	0.00	19200.00	VIR-2024-001	BNQ	\N	\N	2026-04-25 07:29:30.772	\N	\N	\N
cmoe0qys7001xaz7cx54d19v6	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-09-10 00:00:00	606	Achat matériel bureau	1800.00	0.00	ACH-2024-045	ACH	\N	\N	2026-04-25 07:29:30.776	\N	\N	\N
cmoe0qysd001zaz7c8ij2fylp	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-09-10 00:00:00	401	Fournisseur matériel	0.00	1800.00	ACH-2024-045	ACH	\N	\N	2026-04-25 07:29:30.781	\N	\N	\N
cmoe0qysh0021az7cbxq84evu	cmo4xfkl000021x08yhdvbebz	cmoe00wcm001fanv82zb71wzx	2024-12-31 00:00:00	120	Résultat de l'exercice 2024	0.00	22300.00	CLOTURE-2024	OD	\N	\N	2026-04-25 07:29:30.786	\N	\N	\N
cmoe0qysk0023az7cvx3sqo61	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-02-20 00:00:00	411	TechStart SAS — FA-2025-003	15000.00	0.00	FA-2025-003	VTE	\N	\N	2026-04-25 07:29:30.789	\N	\N	\N
cmoe0qysp0025az7ccxakbtv4	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-02-20 00:00:00	706	TechStart SAS — prestation	0.00	12500.00	FA-2025-003	VTE	\N	\N	2026-04-25 07:29:30.793	\N	\N	\N
cmoe0qyss0027az7c8po69v6x	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-02-20 00:00:00	4457	TVA collectée FA-2025-003	0.00	2500.00	FA-2025-003	VTE	\N	\N	2026-04-25 07:29:30.796	\N	\N	\N
cmoe0qysw0029az7cr1oyuw1c	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-05-15 00:00:00	512	Virement TechStart	15000.00	0.00	VIR-2025-002	BNQ	\N	\N	2026-04-25 07:29:30.8	\N	\N	\N
cmoe0qysz002baz7cj4deb4dg	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-05-15 00:00:00	411	Lettrage TechStart	0.00	15000.00	VIR-2025-002	BNQ	\N	\N	2026-04-25 07:29:30.803	\N	\N	\N
cmoe0qyt2002daz7ckbkh19wd	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-07-01 00:00:00	641	Salaires juillet 2025	42000.00	0.00	PAY-2025-07	OD	\N	\N	2026-04-25 07:29:30.806	\N	\N	\N
cmoe0qyt6002faz7co0pgcis6	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-07-01 00:00:00	421	Personnel rémunérations	0.00	42000.00	PAY-2025-07	OD	\N	\N	2026-04-25 07:29:30.811	\N	\N	\N
cmoe0qyta002haz7cj7jmgc63	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-12-31 00:00:00	110	Report à nouveau 2024	22300.00	0.00	RAN-2025	OD	\N	\N	2026-04-25 07:29:30.814	\N	\N	\N
cmoe0qytd002jaz7cl035wbc8	cmo4xfkl000021x08yhdvbebz	cmoe00wd9001janv86z99iu80	2025-12-31 00:00:00	120	Résultat exercice 2025	0.00	31200.00	CLOTURE-2025	OD	\N	\N	2026-04-25 07:29:30.818	\N	\N	\N
cmoe0qytg002laz7c3qz9ac7y	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-01-15 00:00:00	411	Acme Corp — FA-2026-001	9600.00	0.00	FA-2026-001	VTE	\N	\N	2026-04-25 07:29:30.821	\N	\N	\N
cmoe0qytj002naz7cjlcq95rr	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-01-15 00:00:00	706	Acme Corp — prestation	0.00	8000.00	FA-2026-001	VTE	\N	\N	2026-04-25 07:29:30.824	\N	\N	\N
cmoe0qyto002paz7cjv881uni	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-01-15 00:00:00	4457	TVA FA-2026-001	0.00	1600.00	FA-2026-001	VTE	\N	\N	2026-04-25 07:29:30.828	\N	\N	\N
cmoe0qyts002raz7cs0klhdiv	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-03-01 00:00:00	411	TechStart SAS — FA-2026-002	15000.00	0.00	FA-2026-002	VTE	\N	\N	2026-04-25 07:29:30.832	\N	\N	\N
cmoe0qytv002taz7cod52n84e	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-03-01 00:00:00	706	TechStart prestation	0.00	12500.00	FA-2026-002	VTE	\N	\N	2026-04-25 07:29:30.835	\N	\N	\N
cmoe0qytx002vaz7c80sg0mqu	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-03-01 00:00:00	4457	TVA FA-2026-002	0.00	2500.00	FA-2026-002	VTE	\N	\N	2026-04-25 07:29:30.838	\N	\N	\N
cmoe0qyu1002xaz7cbffej7rp	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-01-05 00:00:00	606	Licence SaaS CRM	299.00	0.00	EXP-001	ACH	\N	\N	2026-04-25 07:29:30.842	\N	\N	\N
cmoe0qyu5002zaz7cokd7yh1r	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2026-01-05 00:00:00	401	Fournisseur SaaS	0.00	299.00	EXP-001	ACH	\N	\N	2026-04-25 07:29:30.846	\N	\N	\N
cmoe0qzwe0066az7cl4scnoxp	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-03-15 00:00:00	411	Clients MTN — FAC-2024/010	10146250.00	0.00	FAC-2024/010	VTE	\N	\N	2026-04-25 07:29:32.222	\N	\N	\N
cmoe0qzwl0068az7c6bl9snkg	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-03-15 00:00:00	701	Prestations services FAC-2024/010	0.00	8500000.00	FAC-2024/010	VTE	\N	\N	2026-04-25 07:29:32.229	\N	\N	\N
cmoe0qzwq006aaz7cmeeejxe0	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-03-15 00:00:00	4435	TVA collectée FAC-2024/010	0.00	1646250.00	FAC-2024/010	VTE	\N	\N	2026-04-25 07:29:32.234	\N	\N	\N
cmoe0qzws006caz7cb5ou5y9u	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-06-30 00:00:00	521	Virement MTN — règlement	10146250.00	0.00	VIR-2024/010	BNQ	\N	\N	2026-04-25 07:29:32.237	\N	\N	\N
cmoe0qzww006eaz7cjpcqj0gq	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-06-30 00:00:00	411	Lettrage MTN FAC-2024/010	0.00	10146250.00	VIR-2024/010	BNQ	\N	\N	2026-04-25 07:29:32.24	\N	\N	\N
cmoe0qzx1006gaz7c1s5iqf5p	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-07-01 00:00:00	661	Rémunérations Q2 2024	14550000.00	0.00	PAY-2024-Q2	OD	\N	\N	2026-04-25 07:29:32.245	\N	\N	\N
cmoe0qzx4006iaz7cejjdcqt7	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-07-01 00:00:00	521	Virement salaires Q2 2024	0.00	14550000.00	PAY-2024-Q2	OD	\N	\N	2026-04-25 07:29:32.249	\N	\N	\N
cmoe0qzx7006kaz7c1zbjwyj5	cmoe00wty003sanv8seavfjqn	cmoe00xez0040anv8vr6mqnm9	2024-12-31 00:00:00	12	Résultat exercice 2024	0.00	12800000.00	CLOTURE-2024	OD	\N	\N	2026-04-25 07:29:32.251	\N	\N	\N
cmoe0qzx9006maz7cco4s9ivx	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-01-15 00:00:00	411	Clients MTN — FAC-2025/001	10146250.00	0.00	FAC-2025/001	VTE	\N	\N	2026-04-25 07:29:32.253	\N	\N	\N
cmoe0qzxc006oaz7chcp03ud9	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-01-15 00:00:00	701	Prestations FAC-2025/001	0.00	8500000.00	FAC-2025/001	VTE	\N	\N	2026-04-25 07:29:32.256	\N	\N	\N
cmoe0qzxg006qaz7caizsnzdr	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-01-15 00:00:00	4435	TVA collectée FAC-2025/001	0.00	1646250.00	FAC-2025/001	VTE	\N	\N	2026-04-25 07:29:32.26	\N	\N	\N
cmoe0qzxj006saz7c85ltmi1s	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-03-01 00:00:00	411	Clients Total Energies — FAC-2025/002	14310000.00	0.00	FAC-2025/002	VTE	\N	\N	2026-04-25 07:29:32.263	\N	\N	\N
cmoe0qzxm006uaz7c1coie2y6	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-03-01 00:00:00	701	Prestations FAC-2025/002	0.00	12000000.00	FAC-2025/002	VTE	\N	\N	2026-04-25 07:29:32.267	\N	\N	\N
cmoe0qzxo006waz7c0mbkikur	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-03-01 00:00:00	4435	TVA collectée FAC-2025/002	0.00	2310000.00	FAC-2025/002	VTE	\N	\N	2026-04-25 07:29:32.269	\N	\N	\N
cmoe0qzxq006yaz7c7bbl5b4y	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-02-10 00:00:00	521	Virement MTN — FAC-2025/001	10146250.00	0.00	VIR-2025/001	BNQ	\N	\N	2026-04-25 07:29:32.271	\N	\N	\N
cmoe0qzxu0070az7cysc45lch	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-02-10 00:00:00	411	Lettrage MTN FAC-2025/001	0.00	10146250.00	VIR-2025/001	BNQ	\N	\N	2026-04-25 07:29:32.275	\N	\N	\N
cmoe0qzxx0072az7cnbdjhvlv	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-03-28 00:00:00	521	Virement Total — FAC-2025/002	14310000.00	0.00	VIR-2025/002	BNQ	\N	\N	2026-04-25 07:29:32.278	\N	\N	\N
cmoe0qzy10074az7capbt06yt	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-03-28 00:00:00	411	Lettrage Total FAC-2025/002	0.00	14310000.00	VIR-2025/002	BNQ	\N	\N	2026-04-25 07:29:32.281	\N	\N	\N
cmoe0qzy40076az7c4dk4ds0u	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-05-10 00:00:00	411	Clients Kadji — FAC-2025/003	11328750.00	0.00	FAC-2025/003	VTE	\N	\N	2026-04-25 07:29:32.284	\N	\N	\N
cmoe0qzy60078az7c9507i4sd	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-05-10 00:00:00	701	Prestations FAC-2025/003	0.00	9500000.00	FAC-2025/003	VTE	\N	\N	2026-04-25 07:29:32.286	\N	\N	\N
cmoe0qzy8007aaz7c2oyra5hz	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-05-10 00:00:00	4435	TVA collectée FAC-2025/003	0.00	1828750.00	FAC-2025/003	VTE	\N	\N	2026-04-25 07:29:32.289	\N	\N	\N
cmoe0qzyd007caz7c2oed1aky	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-06-30 00:00:00	661	Rémunérations nettes H1 2025	29100000.00	0.00	PAY-2025-H1	OD	\N	\N	2026-04-25 07:29:32.293	\N	\N	\N
cmoe0qzyg007eaz7cs8yzeqsn	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-06-30 00:00:00	521	Virement salaires H1 2025	0.00	29100000.00	PAY-2025-H1	OD	\N	\N	2026-04-25 07:29:32.296	\N	\N	\N
cmoe0qzyj007gaz7cep7gausm	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-06-30 00:00:00	612	Locations bureaux H1 2025	3900000.00	0.00	LOY-2025-H1	ACH	\N	\N	2026-04-25 07:29:32.3	\N	\N	\N
cmoe0qzym007iaz7c33061uc6	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-06-30 00:00:00	521	Paiements loyers H1 2025	0.00	3900000.00	LOY-2025-H1	ACH	\N	\N	2026-04-25 07:29:32.302	\N	\N	\N
cmoe0qzyo007kaz7cfocs83fl	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-01-01 00:00:00	11	Report à nouveau exercice 2024	0.00	12800000.00	RAN-2025	OD	\N	\N	2026-04-25 07:29:32.304	\N	\N	\N
cmoe0qzys007maz7clumd7cxs	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-01-01 00:00:00	12	Afectation résultat 2024	12800000.00	0.00	RAN-2025	OD	\N	\N	2026-04-25 07:29:32.308	\N	\N	\N
cmoe0qzyv007oaz7cf5c48hr5	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-11-01 00:00:00	411	Clients SGCM — FAC-2025/006	10374750.00	0.00	FAC-2025/006	VTE	\N	\N	2026-04-25 07:29:32.311	\N	\N	\N
cmoe0qzyz007qaz7chqbk2nhr	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-11-01 00:00:00	701	Prestations FAC-2025/006	0.00	8700000.00	FAC-2025/006	VTE	\N	\N	2026-04-25 07:29:32.315	\N	\N	\N
cmoe0qzz1007saz7c07s8xjns	cmoe00wty003sanv8seavfjqn	cmoe00xg60044anv82abzeyun	2025-11-01 00:00:00	4435	TVA collectée FAC-2025/006	0.00	1674750.00	FAC-2025/006	VTE	\N	\N	2026-04-25 07:29:32.318	\N	\N	\N
cmoe0qzz3007uaz7czizqtnb4	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-05 00:00:00	411	Clients MTN — FAC-2026/001	5366250.00	0.00	FAC-2026/001	VTE	\N	\N	2026-04-25 07:29:32.32	\N	\N	\N
cmoe0qzz6007waz7c9xq2pnbl	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-05 00:00:00	701	Prestations services FAC-2026/001	0.00	4500000.00	FAC-2026/001	VTE	\N	\N	2026-04-25 07:29:32.322	\N	\N	\N
cmoe0qzza007yaz7ce5hxomi8	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-05 00:00:00	4435	TVA collectée FAC-2026/001	0.00	866250.00	FAC-2026/001	VTE	\N	\N	2026-04-25 07:29:32.327	\N	\N	\N
cmoe0qzze0080az7c3ogxdlgl	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-10 00:00:00	411	Clients BGFI — FAC-2026/002	3816000.00	0.00	FAC-2026/002	VTE	\N	\N	2026-04-25 07:29:32.33	\N	\N	\N
cmoe0qzzh0082az7cxql1n2dc	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-10 00:00:00	701	Prestations services FAC-2026/002	0.00	3200000.00	FAC-2026/002	VTE	\N	\N	2026-04-25 07:29:32.333	\N	\N	\N
cmoe0qzzj0084az7cr9z3b8vv	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-10 00:00:00	4435	TVA collectée FAC-2026/002	0.00	616000.00	FAC-2026/002	VTE	\N	\N	2026-04-25 07:29:32.336	\N	\N	\N
cmoe0qzzm0086az7cm3ani2rz	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-15 00:00:00	411	Clients Kadji — FAC-2026/003	8109000.00	0.00	FAC-2026/003	VTE	\N	\N	2026-04-25 07:29:32.338	\N	\N	\N
cmoe0qzzq0088az7cr5lma042	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-15 00:00:00	701	Prestations services FAC-2026/003	0.00	6800000.00	FAC-2026/003	VTE	\N	\N	2026-04-25 07:29:32.343	\N	\N	\N
cmoe0qzzv008aaz7cssi4ve0j	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-15 00:00:00	4435	TVA collectée FAC-2026/003	0.00	1309000.00	FAC-2026/003	VTE	\N	\N	2026-04-25 07:29:32.347	\N	\N	\N
cmoe0qzzz008caz7cyz23hbk0	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-01 00:00:00	612	Location bureaux Akwa — janvier 2026	650000.00	0.00	DEP-2026/001	ACH	\N	\N	2026-04-25 07:29:32.351	\N	\N	\N
cmoe0r001008eaz7caed2vmak	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-01 00:00:00	521	Paiement loyer janvier 2026	0.00	650000.00	DEP-2026/001	ACH	\N	\N	2026-04-25 07:29:32.354	\N	\N	\N
cmoe0r005008gaz7c5kqtc7un	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-01 00:00:00	625	Assurance RC Pro ACTIVA 2026	320000.00	0.00	DEP-2026/014	ACH	\N	\N	2026-04-25 07:29:32.358	\N	\N	\N
cmoe0r009008iaz7cxmh1rhtg	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-01 00:00:00	521	Règlement assurance ACTIVA	0.00	320000.00	DEP-2026/014	ACH	\N	\N	2026-04-25 07:29:32.361	\N	\N	\N
cmoe0r00c008kaz7cejp37m1s	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-28 00:00:00	661	Rémunérations directes jan. 2026	4850000.00	0.00	PAY-2026/01	OD	\N	\N	2026-04-25 07:29:32.365	\N	\N	\N
cmoe0r00f008maz7cccosslro	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-28 00:00:00	521	Virement salaires janvier 2026	0.00	4850000.00	PAY-2026/01	OD	\N	\N	2026-04-25 07:29:32.368	\N	\N	\N
cmoe0r00h008oaz7cj4wvqecr	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-20 00:00:00	521	Virement MTN — règlement FAC-2026/001	5366250.00	0.00	VIR-2026/001	BNQ	\N	\N	2026-04-25 07:29:32.37	\N	\N	\N
cmoe0r00k008qaz7c76223bh9	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-20 00:00:00	411	Lettrage MTN FAC-2026/001	0.00	5366250.00	VIR-2026/001	BNQ	\N	\N	2026-04-25 07:29:32.373	\N	\N	\N
cmoe0r00p008saz7cs2psryvs	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-01 00:00:00	411	Clients Total Energies — FAC-2026/004	10136250.00	0.00	FAC-2026/004	VTE	\N	\N	2026-04-25 07:29:32.378	\N	\N	\N
cmoe0r00u008uaz7crn4cqtfv	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-01 00:00:00	701	Prestations services FAC-2026/004	0.00	8500000.00	FAC-2026/004	VTE	\N	\N	2026-04-25 07:29:32.382	\N	\N	\N
cmoe0r00y008waz7cl8ril9j0	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-01 00:00:00	4435	TVA collectée FAC-2026/004	0.00	1636250.00	FAC-2026/004	VTE	\N	\N	2026-04-25 07:29:32.387	\N	\N	\N
cmoe0r013008yaz7ckh6lm3s1	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-10 00:00:00	411	Clients CAMTEL — FAC-2026/005	6201000.00	0.00	FAC-2026/005	VTE	\N	\N	2026-04-25 07:29:32.391	\N	\N	\N
cmoe0r0160090az7cgq2xihuc	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-10 00:00:00	701	Prestations services FAC-2026/005	0.00	5200000.00	FAC-2026/005	VTE	\N	\N	2026-04-25 07:29:32.394	\N	\N	\N
cmoe0r0180092az7cqujzz342	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-10 00:00:00	4435	TVA collectée FAC-2026/005	0.00	1001000.00	FAC-2026/005	VTE	\N	\N	2026-04-25 07:29:32.396	\N	\N	\N
cmoe0r01a0094az7chaf5tsz0	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-01 00:00:00	612	Location bureaux Akwa — février 2026	650000.00	0.00	DEP-2026/002	ACH	\N	\N	2026-04-25 07:29:32.399	\N	\N	\N
cmoe0r01d0096az7cugh90b3g	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-01 00:00:00	521	Paiement loyer février 2026	0.00	650000.00	DEP-2026/002	ACH	\N	\N	2026-04-25 07:29:32.401	\N	\N	\N
cmoe0r01h0098az7cee0o5kn4	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-28 00:00:00	661	Rémunérations directes fév. 2026	4850000.00	0.00	PAY-2026/02	OD	\N	\N	2026-04-25 07:29:32.405	\N	\N	\N
cmoe0r01n009aaz7cxy98qe00	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-28 00:00:00	521	Virement salaires février 2026	0.00	4850000.00	PAY-2026/02	OD	\N	\N	2026-04-25 07:29:32.411	\N	\N	\N
cmoe0r01r009caz7czald1qq3	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-15 00:00:00	521	Virement Total — règlement FAC-2026/004	10136250.00	0.00	VIR-2026/004	BNQ	\N	\N	2026-04-25 07:29:32.415	\N	\N	\N
cmoe0r01v009eaz7cfiy0ticv	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-15 00:00:00	411	Lettrage Total FAC-2026/004	0.00	10136250.00	VIR-2026/004	BNQ	\N	\N	2026-04-25 07:29:32.419	\N	\N	\N
cmoe0r01x009gaz7cwdm4xo6q	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-25 00:00:00	521	Virement CAMTEL — FAC-2026/005	6201000.00	0.00	VIR-2026/005	BNQ	\N	\N	2026-04-25 07:29:32.422	\N	\N	\N
cmoe0r022009iaz7c8e2d81o8	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-02-25 00:00:00	411	Lettrage CAMTEL FAC-2026/005	0.00	6201000.00	VIR-2026/005	BNQ	\N	\N	2026-04-25 07:29:32.426	\N	\N	\N
cmoe0r025009kaz7cwnqi9r7j	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-01 00:00:00	411	Clients SGCM — FAC-2026/006	5724000.00	0.00	FAC-2026/006	VTE	\N	\N	2026-04-25 07:29:32.43	\N	\N	\N
cmoe0r029009maz7crx6eusch	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-01 00:00:00	701	Prestations services FAC-2026/006	0.00	4800000.00	FAC-2026/006	VTE	\N	\N	2026-04-25 07:29:32.433	\N	\N	\N
cmoe0r02b009oaz7caogjapld	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-01 00:00:00	4435	TVA collectée FAC-2026/006	0.00	924000.00	FAC-2026/006	VTE	\N	\N	2026-04-25 07:29:32.436	\N	\N	\N
cmoe0r02e009qaz7col0k1pj8	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-10 00:00:00	411	Clients Dangote — FAC-2026/007	8586000.00	0.00	FAC-2026/007	VTE	\N	\N	2026-04-25 07:29:32.438	\N	\N	\N
cmoe0r02i009saz7c2lyu8rrk	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-10 00:00:00	701	Prestations services FAC-2026/007	0.00	7200000.00	FAC-2026/007	VTE	\N	\N	2026-04-25 07:29:32.442	\N	\N	\N
cmoe0r02m009uaz7c6rt4hows	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-10 00:00:00	4435	TVA collectée FAC-2026/007	0.00	1386000.00	FAC-2026/007	VTE	\N	\N	2026-04-25 07:29:32.446	\N	\N	\N
cmoe0r02p009waz7c7m3epgzr	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-01 00:00:00	612	Location bureaux Akwa — mars 2026	650000.00	0.00	DEP-2026/003	ACH	\N	\N	2026-04-25 07:29:32.45	\N	\N	\N
cmoe0r02s009yaz7c1b46aiz5	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-01 00:00:00	521	Paiement loyer mars 2026	0.00	650000.00	DEP-2026/003	ACH	\N	\N	2026-04-25 07:29:32.452	\N	\N	\N
cmoe0r02u00a0az7ce1lumaz3	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-31 00:00:00	661	Rémunérations directes mars 2026	4850000.00	0.00	PAY-2026/03	OD	\N	\N	2026-04-25 07:29:32.454	\N	\N	\N
cmoe0r02y00a2az7cooafa9td	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-31 00:00:00	521	Virement salaires mars 2026	0.00	4850000.00	PAY-2026/03	OD	\N	\N	2026-04-25 07:29:32.458	\N	\N	\N
cmoe0r03200a4az7cjp85qi9v	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-15 00:00:00	521	Virement SGCM — règlement FAC-2026/006	5724000.00	0.00	VIR-2026/006	BNQ	\N	\N	2026-04-25 07:29:32.462	\N	\N	\N
cmoe0r03500a6az7cz7l1w0s0	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-15 00:00:00	411	Lettrage SGCM FAC-2026/006	0.00	5724000.00	VIR-2026/006	BNQ	\N	\N	2026-04-25 07:29:32.466	\N	\N	\N
cmoe0r03900a8az7cz4muct6c	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-28 00:00:00	521	Virement Dangote — FAC-2026/007	8586000.00	0.00	VIR-2026/007	BNQ	\N	\N	2026-04-25 07:29:32.469	\N	\N	\N
cmoe0r03b00aaaz7cddypt5mh	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-28 00:00:00	411	Lettrage Dangote FAC-2026/007	0.00	8586000.00	VIR-2026/007	BNQ	\N	\N	2026-04-25 07:29:32.471	\N	\N	\N
cmoe0r03g00acaz7c88hda6a7	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-15 00:00:00	615	Maintenance informatique — Douala	150000.00	0.00	DEP-2026/015	ACH	\N	\N	2026-04-25 07:29:32.476	\N	\N	\N
cmoe0r03l00aeaz7clvzvbwz0	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-03-15 00:00:00	521	Paiement maintenance IT	0.00	150000.00	DEP-2026/015	ACH	\N	\N	2026-04-25 07:29:32.481	\N	\N	\N
cmoe0r03p00agaz7cn3x96c70	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-25 00:00:00	521	Virement BGFI — règlement FAC-2026/002	3816000.00	0.00	VIR-2026/002	BNQ	\N	\N	2026-04-25 07:29:32.486	\N	\N	\N
cmoe0r03t00aiaz7ch66avj2r	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2026-01-25 00:00:00	411	Lettrage BGFI FAC-2026/002	0.00	3816000.00	VIR-2026/002	BNQ	\N	\N	2026-04-25 07:29:32.489	\N	\N	\N
\.


--
-- Data for Name: leave_requests; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leave_requests (id, company_id, employee_id, type, start_date, end_date, days, status, reason, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: legal_alerts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.legal_alerts (id, company_id, contract_id, title, message, severity, status, due_date, dismissed_at, resolved_at, created_at, updated_at) FROM stdin;
cmoe00xyc00bganv80etguca3	cmoe00wty003sanv8seavfjqn	cmoe00xy800beanv8cvdh9foh	Renouvellement bail Akwa	Le bail commercial bureaux Akwa expire le 31/12/2027. Prévoir négociation 6 mois avant échéance.	INFO	OPEN	2027-06-30 00:00:00	\N	\N	2026-04-25 07:09:16.645	2026-04-25 07:09:16.645
cmoe00xyl00bkanv89k0rvhxn	cmoe00wty003sanv8seavfjqn	cmoe00xy100baanv8jumh6wja	Rapport d’étape Total Energies Q1	Livraison rapport Q1 2026 attendue avant le 30/04/2026 (clause contractuelle).	WARNING	OPEN	2026-04-30 00:00:00	\N	\N	2026-04-25 07:09:16.653	2026-04-25 07:09:16.653
cmoe0r05u00bgaz7cmtfsdzsn	cmoe00wty003sanv8seavfjqn	cmoe0r05q00beaz7cp0z0dmei	Renouvellement bail Akwa	Le bail commercial bureaux Akwa expire le 31/12/2027. Prévoir négociation 6 mois avant échéance.	INFO	OPEN	2027-06-30 00:00:00	\N	\N	2026-04-25 07:29:32.563	2026-04-25 07:29:32.563
cmoe0r06200bkaz7c8rxumfxo	cmoe00wty003sanv8seavfjqn	cmoe0r05j00baaz7car260bel	Rapport d’étape Total Energies Q1	Livraison rapport Q1 2026 attendue avant le 30/04/2026 (clause contractuelle).	WARNING	OPEN	2026-04-30 00:00:00	\N	\N	2026-04-25 07:29:32.57	2026-04-25 07:29:32.57
\.


--
-- Data for Name: legal_contracts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.legal_contracts (id, company_id, title, type, status, parties, content, file_url, signed_at, expires_at, terminated_at, notes, created_at, updated_at) FROM stdin;
cmoe00xxn00b6anv8eq4wc7g6	cmoe00wty003sanv8seavfjqn	Contrat cadre de prestations de services — MTN Cameroun SA	CLIENT	SIGNED	[{"name": "UBM Consulting SARL", "role": "Prestataire", "email": "ubm@ubm-consulting.cm"}, {"name": "MTN Cameroun SA", "role": "Client", "email": "procurement@mtn.cm"}]	\N	\N	2025-12-20 00:00:00	2026-12-31 00:00:00	\N	Contrat annuel 45 000 000 F CFA HT. Rénovable tacitement.	2026-04-25 07:09:16.62	2026-04-25 07:09:16.62
cmoe00xy100baanv8jumh6wja	cmoe00wty003sanv8seavfjqn	Convention de conseil stratégique — Total Energies CM	SERVICE	SIGNED	[{"name": "UBM Consulting SARL", "role": "Prestataire", "email": "ubm@ubm-consulting.cm"}, {"name": "Total Energies CM", "role": "Client", "email": "cm.procurement@totalenergies.com"}]	\N	\N	2026-01-20 00:00:00	2027-01-31 00:00:00	\N	Convention annuelle 35 000 000 F CFA HT — HSE & RSE.	2026-04-25 07:09:16.633	2026-04-25 07:09:16.633
cmoe00xy400bcanv8n3n0s903	cmoe00wty003sanv8seavfjqn	Contrat de travail CDI — Patrick Ngo Biyong	EMPLOYMENT	SIGNED	[{"name": "UBM Consulting SARL", "role": "Employeur", "email": "ubm@ubm-consulting.cm"}, {"name": "Patrick Ngo Biyong", "role": "Employé", "email": "p.ngobiyong@ubm.cm"}]	\N	\N	2021-06-15 00:00:00	\N	\N	CDI Consultant Senior — 900 000 F CFA brut/mois. Convention collective services OHADA.	2026-04-25 07:09:16.636	2026-04-25 07:09:16.636
cmoe00xy800beanv8cvdh9foh	cmoe00wty003sanv8seavfjqn	Bail commercial bureaux Akwa — Immobilière Douala SA	LEASE	SIGNED	[{"name": "UBM Consulting SARL", "role": "Locataire", "email": "ubm@ubm-consulting.cm"}, {"name": "Immobilière Douala SA", "role": "Bailleur", "email": "info@immo-dla.cm"}]	\N	\N	2024-12-15 00:00:00	2027-12-31 00:00:00	\N	Bail 3 ans — 650 000 F CFA HT/mois. Rue Joss, Akwa, Douala.	2026-04-25 07:09:16.641	2026-04-25 07:09:16.641
cmoe00xyi00bianv85iy0refx	cmoe00wty003sanv8seavfjqn	Accord de confidentialité (NDA) — Groupe Kadji & Cie	NDA	SIGNED	[{"name": "UBM Consulting SARL", "role": "Prestataire", "email": "ubm@ubm-consulting.cm"}, {"name": "Groupe Kadji & Cie", "role": "Commanditaire", "email": "direction@groupekadji.cm"}]	\N	\N	2025-12-01 00:00:00	2030-12-01 00:00:00	\N	NDA 5 ans — informations stratégiques groupe Kadji. Signé 01/12/2025.	2026-04-25 07:09:16.65	2026-04-25 07:09:16.65
cmoe0r05400b6az7cq0mwgabd	cmoe00wty003sanv8seavfjqn	Contrat cadre de prestations de services — MTN Cameroun SA	CLIENT	SIGNED	[{"name": "UBM Consulting SARL", "role": "Prestataire", "email": "ubm@ubm-consulting.cm"}, {"name": "MTN Cameroun SA", "role": "Client", "email": "procurement@mtn.cm"}]	\N	\N	2025-12-20 00:00:00	2026-12-31 00:00:00	\N	Contrat annuel 45 000 000 F CFA HT. Rénovable tacitement.	2026-04-25 07:29:32.536	2026-04-25 07:29:32.536
cmoe0r05j00baaz7car260bel	cmoe00wty003sanv8seavfjqn	Convention de conseil stratégique — Total Energies CM	SERVICE	SIGNED	[{"name": "UBM Consulting SARL", "role": "Prestataire", "email": "ubm@ubm-consulting.cm"}, {"name": "Total Energies CM", "role": "Client", "email": "cm.procurement@totalenergies.com"}]	\N	\N	2026-01-20 00:00:00	2027-01-31 00:00:00	\N	Convention annuelle 35 000 000 F CFA HT — HSE & RSE.	2026-04-25 07:29:32.551	2026-04-25 07:29:32.551
cmoe0r05l00bcaz7ci6bl6mqv	cmoe00wty003sanv8seavfjqn	Contrat de travail CDI — Patrick Ngo Biyong	EMPLOYMENT	SIGNED	[{"name": "UBM Consulting SARL", "role": "Employeur", "email": "ubm@ubm-consulting.cm"}, {"name": "Patrick Ngo Biyong", "role": "Employé", "email": "p.ngobiyong@ubm.cm"}]	\N	\N	2021-06-15 00:00:00	\N	\N	CDI Consultant Senior — 900 000 F CFA brut/mois. Convention collective services OHADA.	2026-04-25 07:29:32.554	2026-04-25 07:29:32.554
cmoe0r05q00beaz7cp0z0dmei	cmoe00wty003sanv8seavfjqn	Bail commercial bureaux Akwa — Immobilière Douala SA	LEASE	SIGNED	[{"name": "UBM Consulting SARL", "role": "Locataire", "email": "ubm@ubm-consulting.cm"}, {"name": "Immobilière Douala SA", "role": "Bailleur", "email": "info@immo-dla.cm"}]	\N	\N	2024-12-15 00:00:00	2027-12-31 00:00:00	\N	Bail 3 ans — 650 000 F CFA HT/mois. Rue Joss, Akwa, Douala.	2026-04-25 07:29:32.559	2026-04-25 07:29:32.559
cmoe0r05z00biaz7cyem5cvbu	cmoe00wty003sanv8seavfjqn	Accord de confidentialité (NDA) — Groupe Kadji & Cie	NDA	SIGNED	[{"name": "UBM Consulting SARL", "role": "Prestataire", "email": "ubm@ubm-consulting.cm"}, {"name": "Groupe Kadji & Cie", "role": "Commanditaire", "email": "direction@groupekadji.cm"}]	\N	\N	2025-12-01 00:00:00	2030-12-01 00:00:00	\N	NDA 5 ans — informations stratégiques groupe Kadji. Signé 01/12/2025.	2026-04-25 07:29:32.568	2026-04-25 07:29:32.568
\.


--
-- Data for Name: mandats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.mandats (id, cabinet_id, company_id, type, modules, actif, created_at, updated_at) FROM stdin;
cmo4xfkla00041x08tebijy14	cmo4xfkke00001x08juvbhn5s	cmo4xfkl000021x08yhdvbebz	COMPLET	{gestion,rh,comptabilite,juridique}	t	2026-04-18 22:46:44.734	2026-04-18 22:46:44.734
cmo71zrga000a8ffp12osttoj	cmo4xfkke00001x08juvbhn5s	cmo71ynsp0006ib2j0kpkmfpv	COMPTABILITE	{gestion,comptabilite}	t	2026-04-20 10:29:57.563	2026-04-20 10:29:57.563
cmo71zrgp000c8ffpcmb0x5ml	cmo4xfkke00001x08juvbhn5s	cmo71yntq0008ib2jwvwv0oer	COMPTABILITE	{gestion,comptabilite}	t	2026-04-20 10:29:57.577	2026-04-20 10:29:57.577
\.


--
-- Data for Name: personal_comptes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personal_comptes (id, user_id, nom, type, balance, iban, is_active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: personal_depenses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personal_depenses (id, user_id, label, amount, date, category, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: personal_objectifs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personal_objectifs (id, user_id, name, target_amount, current_amount, deadline, achieved, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: personal_profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personal_profiles (id, user_id, currency, created_at, updated_at) FROM stdin;
cmp1rbva10020uz8nma8josbo	cmp1rbuj3001uuz8nd5aummwg	EUR	2026-05-11 22:12:18.073	2026-05-11 22:12:18.073
cmp1rs4wu000yyqt1zln2y9ou	cmp1rs4r8000syqt1lgtewdo9	EUR	2026-05-11 22:24:57.055	2026-05-11 22:24:57.055
\.


--
-- Data for Name: personal_revenus; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.personal_revenus (id, user_id, label, amount, date, type, recurrent, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotes (id, number, company_id, client_id, status, issue_date, valid_until, subtotal, tax_rate, tax_amount, total, notes, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: recurring_invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.recurring_invoices (id, company_id, client_id, frequency, subtotal, tax_rate, notes, next_due_date, active, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.refresh_tokens (id, token_hash, user_id, expires_at, revoked_at, replaced_by_hash, created_at) FROM stdin;
cmo5wm57p0002twmclus4topt	b32465cc9e1b9e2c70c00c6147c8a03fe5470a5e64396390f75c879103bb8db7	cmo5wm55t0000twmc1xh0znn3	2026-04-26 15:11:37.954	\N	\N	2026-04-19 15:11:37.956
cmo68cxmg0005ikv6y072dbik	f2c71047f53a50b261667ecdcfbcb02216cd15227f127009d32a30b736acbc4b	cmo68cxkt0003ikv6yqjzmol3	2026-04-26 20:40:23.593	\N	\N	2026-04-19 20:40:23.608
cmo68f722000aikv675gryodj	17fd9668b39001c0dd2eb6ecfe1db8b03c42791563743486d3828ec6b7cd4318	cmo68f70a0008ikv6fvphkg7r	2026-04-26 20:42:09.142	\N	\N	2026-04-19 20:42:09.146
cmo68wv5m000iikv61lkpxnii	59e07fce997315ca4bc6f89032cd4f97b5213b8bd9dfbcf788c0dc75c5c091ea	cmo68wv3c000gikv6trg913mt	2026-04-26 20:55:53.527	2026-04-19 20:58:09.762	\N	2026-04-19 20:55:53.53
cmo68zuhe000oikv6e3ikd3a9	6be8db2781383071ccc869c8eb41f2a96da9280bb0e89d94212da0d4a2a5e7b3	cmo68wv3c000gikv6trg913mt	2026-04-26 20:58:12.624	2026-04-19 21:27:51.873	a523803d598036e568f8dee8add1f35a924f860d6063a940682928683a0852b5	2026-04-19 20:58:12.626
cmo6a1zdc000sikv6ygcnyk5d	a523803d598036e568f8dee8add1f35a924f860d6063a940682928683a0852b5	cmo68wv3c000gikv6trg913mt	2026-04-26 21:27:51.873	2026-04-19 21:30:39.399	\N	2026-04-19 21:27:51.882
cmo6s5fau000dqye6jiaeorq2	4f2e8f94966a29bcdbd21041dc120e60be25f093dc0b39980304604126efc7df	cmo6s3gq70007qye6m4qvpxmx	2026-04-27 05:54:25.57	2026-04-20 05:54:54.394	\N	2026-04-20 05:54:25.578
cmo6dfrho000uikv689orybxl	cb0d339ffc908cb19d80ece534ce3a6ec0f9d5e2a91fdb1e6474d5d25f4a11c9	cmo68wv3c000gikv6trg913mt	2026-04-26 23:02:33.707	2026-04-20 05:23:56.977	f61009bc29cc48911252bb7495486b82466c7368535d80634f06081431d3d318	2026-04-19 23:02:33.708
cmo6r28c1000yikv63i6eox0v	b33b87f12f8d51e7004483548239402433445b46965d4f84bc66cf58c81dd493	cmo68wv3c000gikv6trg913mt	2026-04-27 05:23:56.973	2026-04-20 05:24:00.914	\N	2026-04-20 05:23:56.975
cmo6r28c70010ikv62114tmgi	f61009bc29cc48911252bb7495486b82466c7368535d80634f06081431d3d318	cmo68wv3c000gikv6trg913mt	2026-04-27 05:23:56.977	2026-04-20 05:24:00.914	\N	2026-04-20 05:23:56.981
cmo6s5fbz000fqye6y7rsowcy	72356ce23f1bff570c7c04daabc7e0139a79b78b0c4541fe061d0c779c2f5d8c	cmo6s3gq70007qye6m4qvpxmx	2026-04-27 05:54:25.62	2026-04-20 05:54:54.394	\N	2026-04-20 05:54:25.625
cmo6r2qku0013ikv629jdla2p	3c006531818e1ca63bd50fa558cdc20c2bdbe46ec5d2c99099acb8ea43f686fd	cmo6r2qkf0011ikv6w51wfo22	2026-04-27 05:24:20.621	2026-04-20 05:24:33.876	17c247a34b3db096ce2e1cedf578f87e1586b35e166dc9367c82dddd7ae193e7	2026-04-20 05:24:20.622
cmo6r30t10017ikv6sj6q8q16	a3fa3ddfa1697eaf6395376dcd0259c0e08981e277d57f52ff570979293fdc69	cmo6r2qkf0011ikv6w51wfo22	2026-04-27 05:24:33.87	2026-04-20 05:24:38.186	\N	2026-04-20 05:24:33.876
cmo6r30t40019ikv6wccybdxr	17c247a34b3db096ce2e1cedf578f87e1586b35e166dc9367c82dddd7ae193e7	cmo6r2qkf0011ikv6w51wfo22	2026-04-27 05:24:33.876	2026-04-20 05:24:38.186	\N	2026-04-20 05:24:33.879
cmo6r3h8j001cikv6st25ph8a	f5026ddbf9b3df4a053bb735629b4002d0331d0f29bf46b6a572fc0f016ceabd	cmo6r3h8b001aikv6wjizkaty	2026-04-27 05:24:55.165	2026-04-20 05:26:14.338	3490a092f7960157fa3fef05d5b573e8d2aa03751bce7f59af7f3b27fa5779c9	2026-04-20 05:24:55.171
cmo6r56bp001iikv6svcumla1	4fb809e2f72a6a8be6c749e213ed628068dbfbd1b279b85f1e5551c110cbc08a	cmo6r3h8b001aikv6wjizkaty	2026-04-27 05:26:14.339	2026-04-20 05:26:16.618	\N	2026-04-20 05:26:14.34
cmo6r56bo001gikv6v2jzsfsj	3490a092f7960157fa3fef05d5b573e8d2aa03751bce7f59af7f3b27fa5779c9	cmo6r3h8b001aikv6wjizkaty	2026-04-27 05:26:14.338	2026-04-20 05:26:16.618	\N	2026-04-20 05:26:14.339
cmo6s20jr0002qye6om81rhui	f461f8460158dd1224fd668adc5307c1620055fb8635fa202bb06eb9e41027ae	cmo6s20ij0000qye6w1hbhegk	2026-04-27 05:51:46.501	\N	\N	2026-04-20 05:51:46.503
cmo6r5fvf001likv65vb0e5cf	3713fd6db5deaccd3ce63d14269d10277bd7f32242be0abc1ef0d6942fc28f73	cmo6r5fvb001jikv61aco8voa	2026-04-27 05:26:26.714	2026-04-20 05:52:23.845	654b27da2890f7438954dadd778d3f4b39aa26d912b06b8d98ecccc9bc227177	2026-04-20 05:26:26.715
cmo6s2td80006qye66gvci9uc	654b27da2890f7438954dadd778d3f4b39aa26d912b06b8d98ecccc9bc227177	cmo6r5fvb001jikv61aco8voa	2026-04-27 05:52:23.846	2026-04-20 05:52:23.976	\N	2026-04-20 05:52:23.85
cmo6s64bp000hqye68phc3u9n	10e4120ae014148f36658019a789764fff4645f66476f3998455fe7dc14d55b6	cmo68wv3c000gikv6trg913mt	2026-04-27 05:54:58.019	2026-04-20 05:55:07.686	\N	2026-04-20 05:54:58.021
cmo6s3gro0009qye64gkwvv5v	64c0fbc9aae4f5e92dde027ce351af8c20a48a18a47c9283df07fbb170f2bf72	cmo6s3gq70007qye6m4qvpxmx	2026-04-27 05:52:54.176	2026-04-20 05:54:25.62	72356ce23f1bff570c7c04daabc7e0139a79b78b0c4541fe061d0c779c2f5d8c	2026-04-20 05:52:54.181
cmo6s72pm000rqye6pwabf36c	7aef3c86f7e9948329db2db45bcfb4f71cf506c6f442127345dbf215f04eaa40	cmo6s72pa000pqye6tie3e9mh	2026-04-27 05:55:42.584	2026-04-20 05:56:06.933	\N	2026-04-20 05:55:42.586
cmo6sz2t1000ejaautbw0lv4u	f1775d0d6504310d107e2b22c86e5bc3e3d92e053f281dd621c41b516c9b4ec2	cmo6sxs3f0008jaau0v0nb1bt	2026-04-27 06:17:29.074	2026-04-20 06:17:31.864	\N	2026-04-20 06:17:29.075
cmo6sucj00001jaau8zr9fclr	2ba33bf1e8589cf5194566cea388f83605a5d8a4dafcc994d9f47a2ca6a73d32	cmo68wv3c000gikv6trg913mt	2026-04-27 06:13:48.392	2026-04-20 06:13:54.243	15c0baf8f006b45cc04ddf349df0738f6fbf4e3c4d8e3eadba1ac6210e3202ad	2026-04-20 06:13:48.396
cmo6suh1l0005jaaukka3w2wp	ca9882948947613d69a2f1955f13bfdc56c0737f97b1c2db5a0d544d28ee6ab2	cmo68wv3c000gikv6trg913mt	2026-04-27 06:13:54.24	2026-04-20 06:16:12.16	\N	2026-04-20 06:13:54.246
cmo6suh1o0007jaauf3lyjxl8	15c0baf8f006b45cc04ddf349df0738f6fbf4e3c4d8e3eadba1ac6210e3202ad	cmo68wv3c000gikv6trg913mt	2026-04-27 06:13:54.243	2026-04-20 06:16:12.16	\N	2026-04-20 06:13:54.25
cmo6sz2t4000gjaaumutssxe6	f8f7be8d1f284b5f8e17c751e304a466808c9924d03355e55652bfa853a3b6c4	cmo6sxs3f0008jaau0v0nb1bt	2026-04-27 06:17:29.075	2026-04-20 06:17:31.864	\N	2026-04-20 06:17:29.077
cmo6sxs3p000ajaau6pa94cz5	4fa2de49efc464290f48910cf1bb2ad7548e538e82094b659ece37fdbbbbcde4	cmo6sxs3f0008jaau0v0nb1bt	2026-04-27 06:16:28.547	2026-04-20 06:17:29.075	f8f7be8d1f284b5f8e17c751e304a466808c9924d03355e55652bfa853a3b6c4	2026-04-20 06:16:28.549
cmo71t6wx000gttfvdz9yz07n	26c4ff8fa0cd60d385ab21eed5fe478cff71640bdd27f4f021f1c41017c0df5c	cmo68wv3c000gikv6trg913mt	2026-04-27 10:24:51.004	2026-04-20 10:24:56.456	\N	2026-04-20 10:24:51.006
cmo6tyjn70008ttfv2jnqwlll	d6920831ae60cd49ce98215762c646a6ab0f049c8b591f764addb7b12cb7c8cd	cmo6tto030000ttfvrr6tk40i	2026-04-27 06:45:03.857	\N	\N	2026-04-20 06:45:03.858
cmo71t6wx000ittfvvrobi5vv	639b1ab1b3eceb9c03bd4f39d30e6efdee10d9285ee2fbd98a42d67874cf26c8	cmo68wv3c000gikv6trg913mt	2026-04-27 10:24:51.006	2026-04-20 10:24:56.456	\N	2026-04-20 10:24:51.008
cmo6tyjn60006ttfv6kmbmzvn	cf122d823704b9e1cb4552c6fb557b6dfc9db72375123fc04049116c007f03c8	cmo6tto030000ttfvrr6tk40i	2026-04-27 06:45:03.83	\N	\N	2026-04-20 06:45:03.857
cmo6tto0l0002ttfvv29yj9n0	23562112080711081842554c87483b46aa7bad878d91abaf565a6018c7438cf1	cmo6tto030000ttfvrr6tk40i	2026-04-27 06:41:16.244	2026-04-20 06:45:06.261	cf122d823704b9e1cb4552c6fb557b6dfc9db72375123fc04049116c007f03c8	2026-04-20 06:41:16.246
cmo6ujgc2000cttfv1t4fvy57	8a424c44d4efb3721bef1fb2375a3cec9c59b8c3ca9d336dab5f80287c1d0585	cmo68wv3c000gikv6trg913mt	2026-04-27 07:01:19.346	2026-04-20 10:24:51.006	639b1ab1b3eceb9c03bd4f39d30e6efdee10d9285ee2fbd98a42d67874cf26c8	2026-04-20 07:01:19.347
cmo727i7d000kttfvllyn1h6g	8892dd7a4fd31bda659f55a59769fcbe42f465bd2f761b80b667c57729d7294d	cmo68wv3c000gikv6trg913mt	2026-04-27 10:35:58.823	2026-04-20 10:36:04.73	\N	2026-04-20 10:35:58.825
cmo72ahyo0012ttfve21zn2jt	6fe949ce0196590ee67944bef023077d2515d096015ac7c7212af2658804927e	cmo68wv3c000gikv6trg913mt	2026-04-27 10:38:18.478	2026-04-20 11:01:12.993	\N	2026-04-20 10:38:18.48
cmo728a86000qttfv2urud4gg	838b12f18bffcde47ff73dfde40a3bceebae149f4be93dc9aa0673d04d861c88	cmo71zrgz000e8ffp8f86bns1	2026-04-27 10:36:35.142	2026-04-20 10:37:26.095	f72375fb322a1bf780137d63f8673d4e08271cf3dde4e2cc484394237f46b32d	2026-04-20 10:36:35.143
cmo729dje000uttfvwuvtr3v1	a59fb9b137cdb095dacdc86da56ee7fef8767cfa20ef293755ea0c2783f83278	cmo71zrgz000e8ffp8f86bns1	2026-04-27 10:37:26.082	2026-04-20 16:24:57.499	\N	2026-04-20 10:37:26.089
cmo729djn000wttfv8tsik1vb	f72375fb322a1bf780137d63f8673d4e08271cf3dde4e2cc484394237f46b32d	cmo71zrgz000e8ffp8f86bns1	2026-04-27 10:37:26.095	2026-04-20 16:24:57.499	\N	2026-04-20 10:37:26.098
cmo72a8k9000yttfvkz0qefz8	be05291f6c24b874173702dfadb931ff8e97dd1033c9370fe396cf615ebc9738	cmo68wv3c000gikv6trg913mt	2026-04-27 10:38:06.296	2026-04-20 10:38:18.484	8458bf452188c82712d650752fd29aae90cf4219ddd2355499fdc3fa00a5caa1	2026-04-20 10:38:06.297
cmo72brwg0016ttfvou2eoxgp	d0226d86b347e4b44de88e3e8d28eba0dc1ca65c40956f8779d288a27595b901	cmo6s72pa000pqye6tie3e9mh	2026-04-27 10:39:18.015	2026-04-20 10:53:00.259	dcba948e77561be7313da52a3879db1a37966927543ca08a2f14b7536d445ec7	2026-04-20 10:39:18.017
cmo72teck001attfv7wbkfsu5	bdf666bd77725bd7b0efae6de481b667bf83d2cb78024de9815aaf7d86a06891	cmo6s72pa000pqye6tie3e9mh	2026-04-27 10:53:00.258	2026-04-20 10:53:09.229	\N	2026-04-20 10:53:00.259
cmo72teck001cttfvzbltk00r	dcba948e77561be7313da52a3879db1a37966927543ca08a2f14b7536d445ec7	cmo6s72pa000pqye6tie3e9mh	2026-04-27 10:53:00.259	2026-04-20 10:53:09.229	\N	2026-04-20 10:53:00.26
cmo72ton9001ettfv5luq4lvt	714469abf986dea637863ece314f9004b129aa17d850ac967aa639de932814de	cmo6s72pa000pqye6tie3e9mh	2026-04-27 10:53:13.605	2026-04-20 10:53:24.259	\N	2026-04-20 10:53:13.606
cmo7i8t1u0033ttfvy9tkxkd5	77bc903479ffe51361edd049a57a66e48bb3ce93334f489e1d8e5850cf0cfdd6	cmo7i7hp1002xttfv3plqhit2	2026-04-27 18:04:53.391	2026-04-20 18:05:08.125	\N	2026-04-20 18:04:53.393
cmo72tzxj001kttfv5njl63vt	49a3f67c20e8c421b0498a5eb6dd2520f901cbc43761b016823a9066716608ab	cmo68wv3c000gikv6trg913mt	2026-04-27 10:53:28.23	2026-04-20 11:00:53.988	a3eb56357f8e928d8c293e99a03f371efcdbbf93a05adb2e36aa4b5c26a57ba6	2026-04-20 10:53:28.231
cmo72ahz00014ttfvv2xemf5n	8458bf452188c82712d650752fd29aae90cf4219ddd2355499fdc3fa00a5caa1	cmo68wv3c000gikv6trg913mt	2026-04-27 10:38:18.488	2026-04-20 11:01:12.993	\N	2026-04-20 10:38:18.492
cmo733jvq001qttfvs2pd8fov	e732417ef68294be2c3f8b27ae2a9fda7d3f39097139cf7656a7359f58bf2ca7	cmo68wv3c000gikv6trg913mt	2026-04-27 11:00:53.987	2026-04-20 11:01:12.993	\N	2026-04-20 11:00:53.989
cmo733jvq001pttfvsh0f5i0n	a3eb56357f8e928d8c293e99a03f371efcdbbf93a05adb2e36aa4b5c26a57ba6	cmo68wv3c000gikv6trg913mt	2026-04-27 11:00:53.988	2026-04-20 11:01:12.993	\N	2026-04-20 11:00:53.99
cmo734dmr001sttfvo8nv7sal	a79ae4a7f434cd0abd1bf79e9081025efd11564298281d8582ea12ff3f3a4115	cmo71zrgz000e8ffp8f86bns1	2026-04-27 11:01:32.547	2026-04-20 15:42:33.542	7334933a70f7a326041af3d42ca390add82e87779d89e76653cbb9b1ab41131d	2026-04-20 11:01:32.548
cmo7d5rns001yttfvgus16shg	2bf791f458d3b17248b5f0736fc56ffa35f9d49f3e25448ce1d130aecd6b2a82	cmo71zrgz000e8ffp8f86bns1	2026-04-27 15:42:33.54	2026-04-20 16:24:57.499	\N	2026-04-20 15:42:33.543
cmo7d5rns001xttfvb5ed6c9s	7334933a70f7a326041af3d42ca390add82e87779d89e76653cbb9b1ab41131d	cmo71zrgz000e8ffp8f86bns1	2026-04-27 15:42:33.542	2026-04-20 16:24:57.499	\N	2026-04-20 15:42:33.544
cmo7eoi640020ttfvir6biz2x	b3b331426d32641bde0f5b4b7c05ac4b1c48e33ed24a83ce2528a92910624815	cmo68wv3c000gikv6trg913mt	2026-04-27 16:25:07.323	\N	\N	2026-04-20 16:25:07.324
cmodnakk6000111gal1pu0kbw	70e3f3d78a8e579f58749c0f08732e0f951efacb530c489cf395b7580e35dbb7	cmo4xfky400071x08l2a3mbs4	2026-05-02 01:12:50.833	2026-04-25 06:55:48.159	\N	2026-04-25 01:12:50.836
cmo7i2kil002attfvbt2phxcq	1991585b911169593e707c0b39c8a97c00027815e452c18b49174abda9a35fbf	cmo6s72pa000pqye6tie3e9mh	2026-04-27 18:00:02.395	\N	\N	2026-04-20 18:00:02.397
cmo7ep6im0024ttfvudnh6pz9	308db16d7487e3128602c067e254be692849eac5873a928a487efecbb1b586ba	cmo6s72pa000pqye6tie3e9mh	2026-04-27 16:25:38.877	2026-04-20 18:00:02.393	6948309c6388ab4f52ef1eac710baa9b59de0a6fcf91348e75816d3a315501ea	2026-04-20 16:25:38.878
cmo7i2kil0028ttfvxxtvj5pj	6948309c6388ab4f52ef1eac710baa9b59de0a6fcf91348e75816d3a315501ea	cmo6s72pa000pqye6tie3e9mh	2026-04-27 18:00:02.393	\N	\N	2026-04-20 18:00:02.396
cmo7i9hdg0039ttfvpc3tkh3h	f95c4dec859f937cf7b4ba8018b14907f7c3ba3fa71e0de3e7d0e0926487253c	cmo7i7hp1002xttfv3plqhit2	2026-04-27 18:05:24.914	\N	\N	2026-04-20 18:05:24.915
cmo7i3l5o002dttfvif5p36tg	7e98d6b0a54426730890a33a6a1a7f3513d94aff61330a4df7d25b3f164cf3a8	cmo7i3l5g002bttfvi95van66	2026-04-27 18:00:49.883	2026-04-20 18:01:20.792	87734a9a218ff9009d602948ddc448fb07bae28fec6a2596758fc1a7f7736c4a	2026-04-20 18:00:49.884
cmo7i4906002httfvz94f2q5w	df1660d8e2729105fbbcaaae984aa4ecbb38976581cc5f759d19e8e1685dc1bd	cmo7i3l5g002bttfvi95van66	2026-04-27 18:01:20.786	2026-04-20 18:03:15.947	\N	2026-04-20 18:01:20.789
cmo7i490b002jttfvy6dz7h3l	87734a9a218ff9009d602948ddc448fb07bae28fec6a2596758fc1a7f7736c4a	cmo7i3l5g002bttfvi95van66	2026-04-27 18:01:20.792	2026-04-20 18:03:15.947	\N	2026-04-20 18:01:20.795
cmo7i7hqu002zttfvzewcswwj	0e79d5143785d11cdcba714dfb2388a14734bc4afff0037c7f8586e0a8395c87	cmo7i7hp1002xttfv3plqhit2	2026-04-27 18:03:52.085	2026-04-20 18:04:53.391	77bc903479ffe51361edd049a57a66e48bb3ce93334f489e1d8e5850cf0cfdd6	2026-04-20 18:03:52.086
cmo7i99yd0035ttfv18mb3wm7	231e0b519bf3985df529be45455bdebef09aae6e635216721cb95f4637c068d9	cmo7i7hp1002xttfv3plqhit2	2026-04-27 18:05:15.3	2026-04-20 18:05:24.937	f95c4dec859f937cf7b4ba8018b14907f7c3ba3fa71e0de3e7d0e0926487253c	2026-04-20 18:05:15.301
cmodzjbml000911ga7z3lk65v	e4416052b06b3104a457fcefb6db437f718636dd82544a9738da29274d4c2926	cmo4xfky400071x08l2a3mbs4	2026-05-02 06:55:34.556	2026-04-25 06:55:48.159	\N	2026-04-25 06:55:34.557
cmo7i9n6s003dttfv42s13bnu	a71e06537219d73eb06847c1206500394e9ee673efcd033e18c50c2f4c1bc8b3	cmo71zrgz000e8ffp8f86bns1	2026-04-27 18:05:32.451	2026-04-20 18:06:06.598	01a5f7e95ae83ec05f2377fc4a1ec6110cdad5e92949e9b7044b99d9f2c83d97	2026-04-20 18:05:32.452
cmo7iadja003httfvsdv8fhd1	1ee9c8258e5388bcf5afe0560671b9cad3b8d06e69ea6dd83a1a9df097016a99	cmo71zrgz000e8ffp8f86bns1	2026-04-27 18:06:06.593	2026-04-20 18:17:16.753	\N	2026-04-20 18:06:06.595
cmo7iadjd003jttfvpgunb961	01a5f7e95ae83ec05f2377fc4a1ec6110cdad5e92949e9b7044b99d9f2c83d97	cmo71zrgz000e8ffp8f86bns1	2026-04-27 18:06:06.598	2026-04-20 18:17:16.753	\N	2026-04-20 18:06:06.6
cmodndau7000511gaz08qy5ho	aea3a52bd05f3e83e7cb9dd7e0c4921cd8d0b5e21291832014101bb711f75988	cmo4xfky400071x08l2a3mbs4	2026-05-02 01:14:58.189	2026-04-25 06:55:48.09	11023ff0371264a138e930336c2d2bf0bd99ee43e6697bcf6e5dbc8f7e138ec0	2026-04-25 01:14:58.207
cmodzjeir000d11gave2a8w5a	bd2f51a7c5859834923fb31b546f10a85a9a17fa2c3e9ef20924ab1113139729	cmo4xfky400071x08l2a3mbs4	2026-05-02 06:55:38.306	2026-04-25 06:55:48.159	\N	2026-04-25 06:55:38.307
cmodzjm3m000h11gadb7vngmd	11023ff0371264a138e930336c2d2bf0bd99ee43e6697bcf6e5dbc8f7e138ec0	cmo4xfky400071x08l2a3mbs4	2026-05-02 06:55:48.09	2026-04-25 06:55:48.159	\N	2026-04-25 06:55:48.1
cmodzkme7000n11gam18x4d1v	e8f9e861c418483f351e84d126233f85826aa02806a08af0196193480c95a130	cmo4xfky400071x08l2a3mbs4	2026-05-02 06:56:35.165	2026-04-25 06:56:35.34	09dedd1d788c9a439b464fba2d0a5d87b1af2c11735ff800d28fced0d3e6760f	2026-04-25 06:56:35.167
cmodzkhjg000j11ga098jg2ay	ebc6b6282e51aa709c4f64e24a0dc9274bc7cfe02b63b2de4e00b01a0dba7baf	cmo4xfky400071x08l2a3mbs4	2026-05-02 06:56:28.874	2026-04-25 06:56:52.095	\N	2026-04-25 06:56:28.876
cmodzkmiz000r11ga1sxiqpxj	0efd36d76a65ebf6557a2587354fb342aa8b859727ddc629664265d79e04b6b9	cmo4xfky400071x08l2a3mbs4	2026-05-02 06:56:35.335	2026-04-25 06:56:52.095	\N	2026-04-25 06:56:35.338
cmodzkmj4000t11ga5i7886xa	09dedd1d788c9a439b464fba2d0a5d87b1af2c11735ff800d28fced0d3e6760f	cmo4xfky400071x08l2a3mbs4	2026-05-02 06:56:35.34	2026-04-25 06:56:52.095	\N	2026-04-25 06:56:35.343
cmodzr43n0001ky94e40bnvr8	0ab0697f7dedfb13e6d9a7022a9954595352f9fb65d1ad29d726f057adbb2671	cmo4xfky400071x08l2a3mbs4	2026-05-02 07:01:38.047	2026-04-25 11:19:42.75	\N	2026-04-25 07:01:38.051
cmodzu9a10009ky94r42zsu4x	986fcea021a66d29dd9176573cb582890262a0b1245dacddb811cb7f575862f3	cmo4xfky400071x08l2a3mbs4	2026-05-02 07:04:04.728	2026-04-25 11:10:47.478	483a654dbf2bc9b23c74ebe697e924c1b77c2be14d555aad44a74ec7a9e448c7	2026-04-25 07:04:04.729
cmodzto9m0005ky94gjmdrues	bd8138f2f5054c7d53868c906eb9ef08ccdd4a815fb35333dc3bd1f78143acb1	cmo4xfky400071x08l2a3mbs4	2026-05-02 07:03:37.494	2026-04-25 11:19:42.75	\N	2026-04-25 07:03:37.498
cmo8b91gr003tttfvpzwukc2l	ec8c4241cc777b71efe2f580675c4817fc6a6c1a9baeff4158be84c8d697fa92	cmo71zrgz000e8ffp8f86bns1	2026-04-28 07:36:53.161	2026-05-02 20:11:24.37	\N	2026-04-21 07:36:53.163
cmof0j6jl001lddyns6l2fl5r	ebd114aaa09e7d7cf7d6f6f75ddd163a6dbead2afbf1b5155a100a220c138895	cmoe00wu9003uanv8h810i81r	2026-05-03 00:11:13.76	2026-04-26 00:18:46.704	498478e59e4be5afd63cb62e8aa585eb84dfef4c50d69a8972e34c83d031925a	2026-04-26 00:11:13.761
cmoe176kd0009yrjuwhc5tb4j	ce05bab07c9d2542ea69705154568a3cd5861c5d01ea59283c52465772b36604	cmoe00wu9003uanv8h810i81r	2026-05-02 07:42:07.34	2026-04-25 10:38:45.151	bf7f15d4add9ab1b53e408955a668d69b0cdfff4ba370b537063845b79ed8495	2026-04-25 07:42:07.357
cmodzvaw3000dky941xwivo5h	e87f6abfa72d3ea7b800b480519491370586c512df9c107b0d597cbcb0e4778c	cmo4xfky400071x08l2a3mbs4	2026-05-02 07:04:53.473	2026-04-25 11:19:42.75	\N	2026-04-25 07:04:53.475
cmodzwll3000hky94mmp42i0n	eb500f80bac3186e597ea282e6c5396afcec7ecc2e2fd91e4c40af98b188fa2c	cmo4xfky400071x08l2a3mbs4	2026-05-02 07:05:53.989	2026-04-25 11:19:42.75	\N	2026-04-25 07:05:53.991
cmodzygxd000111f7fdtr2wfo	6b00e076ec4e778da702546529f0988c6e52497c7c323606ebeb4007898db8bb	cmo4xfky400071x08l2a3mbs4	2026-05-02 07:07:21.261	2026-04-25 11:19:42.75	\N	2026-04-25 07:07:21.265
cmoe8nj5m0003ddyn1bp9yngn	3f5a097c6c755753b17f87fe2511a65dbeca35f6a2728c86e994db17abee9b64	cmo4xfky400071x08l2a3mbs4	2026-05-02 11:10:47.48	2026-04-25 11:19:42.75	\N	2026-04-25 11:10:47.482
cmoe8nj5m0001ddyntus6l7q9	483a654dbf2bc9b23c74ebe697e924c1b77c2be14d555aad44a74ec7a9e448c7	cmo4xfky400071x08l2a3mbs4	2026-05-02 11:10:47.478	2026-04-25 11:19:42.75	\N	2026-04-25 11:10:47.481
cmoe9cdgq0005ddynyfw1gavn	11502a1b8a53cc2633c5c6c324ba713876c035ba2561a4340d468b21dc1eb6b3	cmoe00wu9003uanv8h810i81r	2026-05-02 11:30:06.504	2026-04-25 22:47:59.194	e3d383e1d7e2fc8f599cade3e50dac21055b8716ddb6fc93362c6fe37f855929	2026-04-25 11:30:06.506
cmoexkhef000fddynezq7gtb2	fbfb212b423db02d9e2aec5481fff23c308be086f7aba3a397ba52b6f1167b84	cmoe00wu9003uanv8h810i81r	2026-05-02 22:48:15.636	2026-04-25 22:48:23.866	\N	2026-04-25 22:48:15.639
cmoeydt7s000lddynpl71p56m	3452d292e3fd3fd5d13dd6135f52bb8c3e74beb83f79042dce226d569f51ff0c	cmoe00wu9003uanv8h810i81r	2026-05-02 23:11:03.974	2026-04-25 23:11:11.788	\N	2026-04-25 23:11:03.976
cmoeygfcj000rddyngkx2nqz3	50099c7408014da8b96789f4fa513f85c600b4eb910975d8edfcfbc6aac1fa88	cmoe00wu9003uanv8h810i81r	2026-05-02 23:13:05.969	2026-04-25 23:13:14.671	\N	2026-04-25 23:13:05.971
cmoeyt5ok000xddynklw0cjs4	2df247e493d6fc554366d61d211b375b85c2be24309ee2863b143a96b9bce209	cmoe00wu9003uanv8h810i81r	2026-05-02 23:22:59.969	2026-04-25 23:30:03.874	\N	2026-04-25 23:22:59.972
cmoez2ugi0013ddynv99j1jyt	2485a98540475e586d23b7b245134257ecfee7dea2da9c88d06770d4d656340d	cmoe00wu9003uanv8h810i81r	2026-05-02 23:30:31.985	2026-04-25 23:32:00.273	\N	2026-04-25 23:30:31.986
cmoez7chu0019ddyngnks9xrm	90112f7b898200ce2fe01ddbf5a463a880c4373f2962538e9e499c67b98fc46b	cmoe00wu9003uanv8h810i81r	2026-05-02 23:34:01.984	2026-04-25 23:49:55.237	16e39b4b665de2a6c8763c7b0983019cf650c3148ade9de64f63f50b17f8af39	2026-04-25 23:34:01.986
cmoezsamq001fddynz0xzkh08	958502feb6902b2bf6f032d1376b1ba0dde2392050668b08d65f769c4be7522c	cmoe00wu9003uanv8h810i81r	2026-05-02 23:50:19.345	2026-04-26 00:08:06.484	89a662c337dde347d6b0d3c51e3f5fad9139565fc05dafca40bed722f92ac4d1	2026-04-25 23:50:19.346
cmof1dich001xddynsz6c01k1	67aa647f0a598a4306cd422979210cf91b79c7fbb708a66907c95311cd033f68	cmoe00wu9003uanv8h810i81r	2026-05-03 00:34:48.735	2026-04-26 00:41:01.587	c7a3c8966b8d9debc42f7a8c1dec7afd1b913a727a5a3c9a6afbcafd7d6cb6b5	2026-04-26 00:34:48.737
cmoe0129l000511f70h1wj1eu	be23b7a0f0b27bcba976d17eb0deb9d0a90f6b045b761798c86666622f3b119f	cmoe00wu9003uanv8h810i81r	2026-05-02 07:09:22.23	2026-04-26 00:55:07.188	\N	2026-04-25 07:09:22.234
cmoe02yhz000911f7ddpcmu94	44982d3ea9076193986af9930d2a33a7c7178141a55b5905e7c6b0e4b7725a60	cmoe00wu9003uanv8h810i81r	2026-05-02 07:10:50.661	2026-04-26 00:55:07.188	\N	2026-04-25 07:10:50.663
cmoe16b8a0001yrjuio9udxxv	79caae51e108d30b3c5bc8946f320365c09d94ac46223b29455dbb1c68f54640	cmoe00wu9003uanv8h810i81r	2026-05-02 07:41:26.735	2026-04-26 00:55:07.188	\N	2026-04-25 07:41:26.747
cmoe16hmq0005yrjub9ubatna	c2b6555e3bbb7aebdba5646291a4399599d7c5430824d17b1702e53564262e9c	cmoe00wu9003uanv8h810i81r	2026-05-02 07:41:35.03	2026-04-26 00:55:07.188	\N	2026-04-25 07:41:35.042
cmoe76dun000dyrjumvihvz5f	bf7f15d4add9ab1b53e408955a668d69b0cdfff4ba370b537063845b79ed8495	cmoe00wu9003uanv8h810i81r	2026-05-02 10:29:27.836	2026-04-26 00:55:07.188	\N	2026-04-25 10:29:27.838
cmof0sw1g001rddynjxcou94v	498478e59e4be5afd63cb62e8aa585eb84dfef4c50d69a8972e34c83d031925a	cmoe00wu9003uanv8h810i81r	2026-05-03 00:18:46.704	2026-04-26 00:55:07.188	\N	2026-04-26 00:18:46.706
cmoexk0ll0009ddynac40u31x	f2be26765dac157e5acdd3a8bd1ac0c33dd20c041f7d4aa053a3a245b74f1d1e	cmoe00wu9003uanv8h810i81r	2026-05-02 22:47:53.859	2026-04-26 00:55:07.188	\N	2026-04-25 22:47:53.863
cmof0y3oj001tddynj5ancg2u	64fad04678b5f7fbe42077189bc82ccdb00b3101dd8fcd6c7091dd9a34b5bae8	cmoe00wu9003uanv8h810i81r	2026-05-03 00:22:49.888	2026-04-26 00:55:07.188	\N	2026-04-26 00:22:49.891
cmoexk0ln000bddyna5kayyru	e3d383e1d7e2fc8f599cade3e50dac21055b8716ddb6fc93362c6fe37f855929	cmoe00wu9003uanv8h810i81r	2026-05-02 22:47:53.862	2026-04-26 00:55:07.188	\N	2026-04-25 22:47:53.866
cmoezrs16001dddynf2c99sub	16e39b4b665de2a6c8763c7b0983019cf650c3148ade9de64f63f50b17f8af39	cmoe00wu9003uanv8h810i81r	2026-05-02 23:49:55.238	2026-04-26 00:55:07.188	\N	2026-04-25 23:49:55.24
cmof0f61k001jddyn1arowqs3	89a662c337dde347d6b0d3c51e3f5fad9139565fc05dafca40bed722f92ac4d1	cmoe00wu9003uanv8h810i81r	2026-05-03 00:08:06.484	2026-04-26 00:55:07.188	\N	2026-04-26 00:08:06.487
cmof0svzw001pddyny259pb6a	8bcbcf642bf9d5654e2c48945536a21ded642803f2fff1da93c20ae288965299	cmoe00wu9003uanv8h810i81r	2026-05-03 00:18:46.647	2026-04-26 00:55:07.188	\N	2026-04-26 00:18:46.649
cmof1li1a0021ddyn6qvddn5o	cab699163f996438b4477921d1feaf7c81f18f95c2062b548350fc488f8a1a91	cmoe00wu9003uanv8h810i81r	2026-05-03 00:41:01.575	2026-04-26 00:55:07.188	\N	2026-04-26 00:41:01.578
cmof1li1l0023ddynwxgyoi64	c7a3c8966b8d9debc42f7a8c1dec7afd1b913a727a5a3c9a6afbcafd7d6cb6b5	cmoe00wu9003uanv8h810i81r	2026-05-03 00:41:01.588	2026-04-26 00:55:07.188	\N	2026-04-26 00:41:01.591
cmof23om40025ddyncwwhjh40	6b588060804ed43c4fadcebce422dd4b104923c6064fba67073c3c765d801733	cmoe00wu9003uanv8h810i81r	2026-05-03 00:55:09.914	2026-04-26 01:10:33.959	1177a8d1ab9f9e7c7baae04fc7ef2b3119ded1d95214052950afcaf11975de54	2026-04-26 00:55:09.916
cmof2nhm40029ddynis73h6s8	1177a8d1ab9f9e7c7baae04fc7ef2b3119ded1d95214052950afcaf11975de54	cmoe00wu9003uanv8h810i81r	2026-05-03 01:10:33.96	2026-04-26 01:26:21.258	\N	2026-04-26 01:10:33.962
cmof37y8g002bddynwg2r8oiv	d657281724b8ba1eed5248cac96376305f4273628456b5d6d8859846c8ba9914	cmoe00wu9003uanv8h810i81r	2026-05-03 01:26:28.623	2026-04-26 01:51:39.242	8b9be9f332b236139422090e6baac8e46b7f8ba9a92848608048f29c5877d8a5	2026-04-26 01:26:28.624
cmof44bu4002hddyn2kyx1vtz	8b9be9f332b236139422090e6baac8e46b7f8ba9a92848608048f29c5877d8a5	cmoe00wu9003uanv8h810i81r	2026-05-03 01:51:39.242	2026-04-26 11:42:11.848	\N	2026-04-26 01:51:39.243
cmong6ng30005vqcn9t7yfqo2	6b68e8285b3e130481b07db07d8b697acc7756bbf8e6d1be3209f5d57c2d40fc	cmoe00wu9003uanv8h810i81r	2026-05-08 21:51:32.401	2026-05-01 21:52:13.44	d8d75cda4f286ba0ef82b81c14dd686ced80d89beb5a684b96343428f9a6a61d	2026-05-01 21:51:32.403
cmong8dkv000fvqcnz3j0n0lb	633278802cd62bc872aa5d9f4d75e480bc510e09751f0722cff7815399a5b895	cmoe00wu9003uanv8h810i81r	2026-05-08 21:52:52.925	2026-05-01 22:03:26.478	f5193e808c5b93991788c9d00e1ef96f2d2318f2f226720527fb9a141f232502	2026-05-01 21:52:52.927
cmonh5eu5000btj1u906ctofj	a75beb1d60b6e1d8441cde00d2d0e269bf653a39a7999d9b4770914293874eb8	cmoe00wu9003uanv8h810i81r	2026-05-08 22:18:34.205	2026-05-01 22:32:12.758	9c1fc8be398faf96112336caa9d335e7d0284ff4beb05097f47791cdc6061bb1	2026-05-01 22:18:34.206
cmongws4e0001ucngsj970v71	a31c9268472dca4043098fcca00fd3ec8189faffe5ca7ef576f5e7e40561bde9	cmoe00wu9003uanv8h810i81r	2026-05-08 22:11:51.503	2026-05-01 22:12:05.643	2b147f6f152dd31a20bdb6dca31596857f2b2a0eb976e724ba7850435a2c4f91	2026-05-01 22:11:51.518
cmongx31c0007ucngg36ryvqp	2b147f6f152dd31a20bdb6dca31596857f2b2a0eb976e724ba7850435a2c4f91	cmoe00wu9003uanv8h810i81r	2026-05-08 22:12:05.644	2026-05-01 22:15:44.668	b70efea00058d4f8511a1733c132709fa6bcaf5f38493122f544eaf6af07faa1	2026-05-01 22:12:05.661
cmong7j48000bvqcnopkknjkz	d8d75cda4f286ba0ef82b81c14dd686ced80d89beb5a684b96343428f9a6a61d	cmoe00wu9003uanv8h810i81r	2026-05-08 21:52:13.44	2026-05-01 22:15:44.707	\N	2026-05-01 21:52:13.444
cmonglyfl000jvqcnfbnf3bvz	87d85c164141b60fb66ad936d8c29455380b7f2c5353b089c79eaad8965e92af	cmoe00wu9003uanv8h810i81r	2026-05-08 22:03:26.477	2026-05-01 22:15:44.707	\N	2026-05-01 22:03:26.479
cmonglyfm000lvqcnhkkeueei	f5193e808c5b93991788c9d00e1ef96f2d2318f2f226720527fb9a141f232502	cmoe00wu9003uanv8h810i81r	2026-05-08 22:03:26.478	2026-05-01 22:15:44.707	\N	2026-05-01 22:03:26.48
cmongx3180005ucngmr99efnd	4a593edc2f1e427a7a1c64ecd63bbc8dd9ae4d6d7795248ba88be7e3ab9daf13	cmoe00wu9003uanv8h810i81r	2026-05-08 22:12:05.639	2026-05-01 22:15:44.707	\N	2026-05-01 22:12:05.657
cmonh1s0y0001tj1uepwmeo3x	b70efea00058d4f8511a1733c132709fa6bcaf5f38493122f544eaf6af07faa1	cmoe00wu9003uanv8h810i81r	2026-05-08 22:15:44.668	2026-05-01 22:15:44.707	\N	2026-05-01 22:15:44.673
cmonh38ur0003tj1u6c0lqcin	bc2bb8319ea6685f40b4a9ec76689eb5797fb74974007a418ba3fc20818ed859	cmoe00wu9003uanv8h810i81r	2026-05-08 22:16:53.138	2026-05-01 22:17:06.476	a3f6e1821de3e5c41cfd62a1fea566568152cebe23d66a23fe0d28612fc7a575	2026-05-01 22:16:53.14
cmonjznr6000jjxo1avc2jor5	7e107f58920bccd2dd53c3186d31b4e9b911bf3652221fc5e2029f6b9bf46723	cmoe00wu9003uanv8h810i81r	2026-05-08 23:38:04.669	2026-05-01 23:53:45.185	\N	2026-05-01 23:38:04.672
cmonhmyfx0003xzeirxphw0fu	9c1fc8be398faf96112336caa9d335e7d0284ff4beb05097f47791cdc6061bb1	cmoe00wu9003uanv8h810i81r	2026-05-08 22:32:12.759	2026-05-01 23:36:04.235	\N	2026-05-01 22:32:12.762
cmonhmyfq0001xzei46sn77yw	c8119ae856dbe98fd2b0c233e3d35f87bd2a0fc6cf94df1e891462ebd99c3232	cmoe00wu9003uanv8h810i81r	2026-05-08 22:32:12.749	2026-05-01 23:36:04.292	\N	2026-05-01 22:32:12.755
cmonh3j560007tj1urdjd4hij	da27257faf7072db6ae11f4f8bc1a364ff69a03ae475633b2974bd1a2a885cdc	cmoe00wu9003uanv8h810i81r	2026-05-08 22:17:06.47	2026-05-01 23:36:04.292	\N	2026-05-01 22:17:06.472
cmonh3j5c0009tj1uvczoitwr	a3f6e1821de3e5c41cfd62a1fea566568152cebe23d66a23fe0d28612fc7a575	cmoe00wu9003uanv8h810i81r	2026-05-08 22:17:06.476	2026-05-01 23:36:04.292	\N	2026-05-01 22:17:06.479
cmonjw2cj0001jxo1dcvteopz	5cb32778c2a562b03aba7e9c6d49ac57057351bfb785f2025e93b7a5dc84e6f2	cmoe00wu9003uanv8h810i81r	2026-05-08 23:35:16.953	2026-05-01 23:36:04.292	\N	2026-05-01 23:35:16.964
cmonjwben0005jxo1t1zu8pbr	02ed1c15f5110bb8137d1d8794b8c80822c2782feccc92f0554c52a4fca42c97	cmoe00wu9003uanv8h810i81r	2026-05-08 23:35:28.695	2026-05-01 23:36:04.292	\N	2026-05-01 23:35:28.704
cmonjwilp0009jxo14vwfs0pj	7156886f6fd3cff439a750c49972ba8368dd8ba010dbc580baab88dccc5e37d3	cmoe00wu9003uanv8h810i81r	2026-05-08 23:35:38.02	2026-05-01 23:36:04.292	\N	2026-05-01 23:35:38.029
cmonjx2u2000djxo1yyilbnr1	bf4fcae5478449536f8c1fd30ad48642f8ec7a0bc63870f93105e646f89b1068	cmoe00wu9003uanv8h810i81r	2026-05-08 23:36:04.235	2026-05-01 23:36:04.292	\N	2026-05-01 23:36:04.248
cmonjzd4t000fjxo145i1ki4z	15e5ca16f76ac57cc21bdf2e9167a89ffa579df6890364a638ce4f4df879394e	cmoe00wu9003uanv8h810i81r	2026-05-08 23:37:50.908	2026-05-01 23:38:04.673	\N	2026-05-01 23:37:50.909
cmonkjtgl000njxo1scole9dy	b54d246a63a2592b68e5ac0e5a8e89b935c366fdd61cbd06baf3b36291a4d585	cmoe00wu9003uanv8h810i81r	2026-05-08 23:53:45.185	2026-05-02 00:07:18.714	\N	2026-05-01 23:53:45.189
cmonjznr8000ljxo1t2b5iqlt	f80fda95c7708b217248af37ce302b54aea62875b2f5882a545dc35726e0eb2c	cmoe00wu9003uanv8h810i81r	2026-05-08 23:38:04.673	2026-05-02 00:07:18.755	\N	2026-05-01 23:38:04.675
cmonktq25000pjxo1w4ajl626	d322aa459a2c1d6ad583de073d6989fe9e6471c1f9001378d9e06e33ad170f32	cmoe00wu9003uanv8h810i81r	2026-05-09 00:01:27.339	2026-05-02 00:07:18.755	\N	2026-05-02 00:01:27.342
cmonl196q00011rb23mvptli7	e3a25ab577226e140ec0ccbef8d059f116ace6a6c18f83a12e7d3dc22d5db1d2	cmoe00wu9003uanv8h810i81r	2026-05-09 00:07:18.714	2026-05-02 00:07:18.755	\N	2026-05-02 00:07:18.72
cmonlz2tx000ffs39vj0sbtyy	d701a4415c8b2aa83e39f048d3ca9bbb31a1aab62e6892686d3256bf6791c8a0	cmoe00wu9003uanv8h810i81r	2026-05-09 00:33:36.787	2026-05-02 20:11:24.398	\N	2026-05-02 00:33:36.79
cmonl7t750001yypc0ip0fydp	5dc884796320ac2ccdccdb6bb86bf7f6a7e2c90426e323e414dcf5be0f7e8d9c	cmoe00wu9003uanv8h810i81r	2026-05-09 00:12:24.59	2026-05-02 00:57:48.907	\N	2026-05-02 00:12:24.593
cmonlzbno000jfs39rjx0atty	2dc6878d99d29e39444fc586da2a4b1eacb9a7e676b85f1228ac44f1118f2401	cmoe00wu9003uanv8h810i81r	2026-05-09 00:33:48.225	2026-05-02 20:11:24.398	\N	2026-05-02 00:33:48.228
cmonmnxe2000nfs39hmjs2w3s	259ba2b30911ddb4704364410167d244780b2ba9ccca3fcf85ffdbdc725ae33b	cmoe00wu9003uanv8h810i81r	2026-05-09 00:52:56.137	2026-05-02 20:11:24.398	\N	2026-05-02 00:52:56.138
cmonmqkka000rfs39v6p444w1	bab27a971746656111d173721dbe94b7920b580e1d0f160b4b33df08cc4be402	cmoe00wu9003uanv8h810i81r	2026-05-09 00:54:59.479	2026-05-02 20:11:24.398	\N	2026-05-02 00:54:59.482
cmonmu7as0015fs3935fk6se6	99c703d899fe166f0bf74c8892f8a6d97499d7347fbdbbe0c4090216ead7fb5e	cmoe00wu9003uanv8h810i81r	2026-05-09 00:57:48.907	2026-05-02 03:14:14.721	\N	2026-05-02 00:57:48.915
cmooq40fz002nfs39cz8xb037	d1c69543209a4640adf04ec646137d1bbc69205c4c4be1d5f1b6131d859f4e3b	cmoopvlb70000xqddt3etffru	2026-05-09 19:17:11.61	2026-05-02 19:35:26.625	\N	2026-05-02 19:17:11.612
cmonrpyoh001bfs39ev2ona4d	aef93c871ae5d82c90c74426fde6283e33a98f88897b5ac01fcefde2008ec1ca	cmoe00wu9003uanv8h810i81r	2026-05-09 03:14:29.2	2026-05-02 03:14:42.599	\N	2026-05-02 03:14:29.201
cmooq3wtd002hfs39adlrsn4r	fdd830dcd4d2ec748fef4e7cfe8f3345b51877c862d276d4c691c4eb76d71cbd	cmoopvlb70000xqddt3etffru	2026-05-09 19:17:06.906	2026-05-02 19:39:28.324	\N	2026-05-02 19:17:06.912
cmonrq90r001ffs39skhtae93	a62300041768befc30a6670a4027681fd2162a589fdea05919fee2c08d75c063	cmoe00wu9003uanv8h810i81r	2026-05-09 03:14:42.599	2026-05-02 03:15:12.486	\N	2026-05-02 03:14:42.601
cmooq40fx002lfs39p1w14w8d	1d921d548dd7141f6f688754976449f830439295794c899a0db9fbd84ab4bca3	cmoopvlb70000xqddt3etffru	2026-05-09 19:17:11.609	2026-05-02 19:39:28.324	\N	2026-05-02 19:17:11.611
cmonrra8d001nfs39h8m5ycx3	0d947fdc046454681edcb58c5720afd91d009be84983c0348bfacc40d1a9d3bf	cmoe00wu9003uanv8h810i81r	2026-05-09 03:15:30.827	2026-05-02 08:21:57.135	\N	2026-05-02 03:15:30.829
cmoo2pd79001tfs39wrb3tbxz	4bfa400c9fc12cf22da8467a24f5cb55ff12dcf6a090b2975ad940c92a26453a	cmoe00wu9003uanv8h810i81r	2026-05-09 08:21:57.135	2026-05-02 09:04:40.256	\N	2026-05-02 08:21:57.139
cmooq8o3k002pfs39ie9ffsmj	e2fefdd5f5004344552f603e9f82d1afe7145362b191bc237b619bc0cea09052	cmoopvlb70000xqddt3etffru	2026-05-09 19:20:48.894	2026-05-02 19:39:28.324	\N	2026-05-02 19:20:48.896
cmoo48awx001vfs39hrjn1ger	a1974f34284aa2c7c47c9ea399d295d9b0674d4f54be43212a394050a3cbc869	cmoe00wu9003uanv8h810i81r	2026-05-09 09:04:40.256	2026-05-02 09:10:24.116	\N	2026-05-02 09:04:40.257
cmoo4fo8p001zfs39valomxl9	a895f0b5119688fb109f38e81b83b4be6e4d9a91af356ad1345103ce9e8bf9f7	cmoe00wu9003uanv8h810i81r	2026-05-09 09:10:24.117	2026-05-02 18:50:43.169	\N	2026-05-02 09:10:24.119
cmoop5ysp0029fs39ukg3smee	cae46e39f39f5381f2c5b1058d5fa68e84f111bde2d0ce62b506ab3b06ea0c24	cmoe00wu9003uanv8h810i81r	2026-05-09 18:50:43.169	2026-05-02 18:50:43.327	\N	2026-05-02 18:50:43.175
cmooq9g3b002tfs399wrhkbhz	cae89b5c7b5a7c8dce43de78b115d392ddfcd097925953263853741cd95f539d	cmoopvlb70000xqddt3etffru	2026-05-09 19:21:25.173	2026-05-02 19:39:28.324	\N	2026-05-02 19:21:25.175
cmoopvxoj002dfs39z1rtjmz1	9ee86ca621aed1f4dd6d15d5c695fe0af41e976ec233735c43d008432af0ac86	cmoopvlb70000xqddt3etffru	2026-05-09 19:10:54.785	2026-05-02 19:17:06.911	\N	2026-05-02 19:10:54.787
cmooqeaql0001x7kj54cyikaz	44efef1e4b5efe0ff6ff302779656e47a853a8f87290e4b0163eeaf260e09043	cmoopvlb70000xqddt3etffru	2026-05-09 19:25:11.514	2026-05-02 19:39:28.324	\N	2026-05-02 19:25:11.517
cmooq3wtf002jfs39pkry9qnm	95e170f3dbb36bfd7147ff986340dd9eda26f2d39bc2e10b1716038b16694ef6	cmoopvlb70000xqddt3etffru	2026-05-09 19:17:06.912	2026-05-02 19:17:11.61	\N	2026-05-02 19:17:06.913
cmooqek1m0005x7kj9fya6ixf	6fd35d84f654d7fbf84758d40d439b5bd2692f1d5ac08fe117b82d40e9e4586d	cmoopvlb70000xqddt3etffru	2026-05-09 19:25:23.576	2026-05-02 19:39:28.324	\N	2026-05-02 19:25:23.579
cmooqeqrj0009x7kjmbh7unqs	3345b9a32bb393fcdc446f3b35b7df64704686595a90d1fb8af6db998aa01a8f	cmoopvlb70000xqddt3etffru	2026-05-09 19:25:32.284	2026-05-02 19:39:28.324	\N	2026-05-02 19:25:32.287
cmooqf69v000dx7kje2dky5nv	c3d7e27a75bd9ea1195bc01a495a5cab4ae8234f34f4eaa1afff7599dc0a5881	cmoopvlb70000xqddt3etffru	2026-05-09 19:25:52.384	2026-05-02 19:39:28.324	\N	2026-05-02 19:25:52.387
cmooqfpok000hx7kjq6z5bb9a	3e32150c91aafe8e023b347bd5ee89ddcc0d19a3938a722f4957dce965d6e37e	cmoopvlb70000xqddt3etffru	2026-05-09 19:26:17.539	2026-05-02 19:39:28.324	\N	2026-05-02 19:26:17.541
cmonmtn4f000zfs39mhrv9hrj	4372843ae3ddba2c3ad9dd5e1e6dc491e48a5f246cf254364a086e5e6cb8fac7	cmoe00wu9003uanv8h810i81r	2026-05-09 00:57:22.762	2026-05-02 20:11:24.398	\N	2026-05-02 00:57:22.767
cmonmu79g0013fs3949jcsdtb	5f1bac4cb47cdf13ef72fe27dcde5134c3fcf026176b20dd0332216c023da285	cmoe00wu9003uanv8h810i81r	2026-05-09 00:57:48.857	2026-05-02 20:11:24.398	\N	2026-05-02 00:57:48.866
cmonrpnib0017fs39s7ld11n6	2d4c4a20e3e3f46ea079dcb16ff81b48fbab57a4cce5c6fff7d5b8763cbb748c	cmoe00wu9003uanv8h810i81r	2026-05-09 03:14:14.718	2026-05-02 20:11:24.398	\N	2026-05-02 03:14:14.72
cmonrpnie0019fs393aps2qj5	418b18c9e3e021ce362b5a8ef1d8dd68fb2c9a48e5dbcc584c1cfcff08533fe9	cmoe00wu9003uanv8h810i81r	2026-05-09 03:14:14.721	2026-05-02 20:11:24.398	\N	2026-05-02 03:14:14.724
cmonrq90s001hfs39evomlr39	30b45bec8b65489fe7ea93a6a752b674b2c1d5111cd2b8c39418fe09b379d61d	cmoe00wu9003uanv8h810i81r	2026-05-09 03:14:42.601	2026-05-02 20:11:24.398	\N	2026-05-02 03:14:42.603
cmonrqw2r001jfs39s2x0zr1h	2402f553037eff034fe1a59cd30d980984678d93e6819038aee71911db9f3585	cmoe00wu9003uanv8h810i81r	2026-05-09 03:15:12.479	2026-05-02 20:11:24.398	\N	2026-05-02 03:15:12.481
cmooqszfi000d145yjpotg0qo	c3f447e8ae64df656172735cc23c10e2301fb701a416e5c3056bb9dfd150c1f3	cmoopvlb70000xqddt3etffru	2026-05-09 19:36:36.701	2026-05-02 19:39:28.255	\N	2026-05-02 19:36:36.702
cmooqkm6s0001k364bofy4sm5	9ab95ff564c289aed10201e8dbdaf8ec4013d7ac52f14e74ae6bd1c5c1237d6e	cmoopvlb70000xqddt3etffru	2026-05-09 19:30:06.29	2026-05-02 19:39:28.324	\N	2026-05-02 19:30:06.292
cmooqktnn0005k3644eb7ourm	55dec19c13abbe20d87f5ba71957c0d5847e0fdecbd93557ab897466b552e953	cmoopvlb70000xqddt3etffru	2026-05-09 19:30:15.969	2026-05-02 19:39:28.324	\N	2026-05-02 19:30:15.971
cmooqlb040009k3649mon0kje	68a4f0b81ddc54c04b16bfef85a52dfbab5c7b343992428f154f7b1e6e8479de	cmoopvlb70000xqddt3etffru	2026-05-09 19:30:38.45	2026-05-02 19:39:28.324	\N	2026-05-02 19:30:38.452
cmooqoxw90001145y3g6z23tk	4ba38cfb32b96cc1fa7fad9e89c4b6fcfb94085235a0b14e30dc0b842c2cf0d8	cmoopvlb70000xqddt3etffru	2026-05-09 19:33:28.086	2026-05-02 19:39:28.324	\N	2026-05-02 19:33:28.09
cmooqrhd30005145y0bqhl6x7	ab7e2d2b64603d96efc0289321a80539ca4bc9bee48c735616833e4310bb1190	cmoopvlb70000xqddt3etffru	2026-05-09 19:35:26.622	2026-05-02 19:39:28.324	\N	2026-05-02 19:35:26.629
cmooqrhd50007145yblfoiesy	de037e0d635c97f235989889d472c6090f242d283e9b90e84d3c1fb512b7dd05	cmoopvlb70000xqddt3etffru	2026-05-09 19:35:26.625	2026-05-02 19:39:28.324	\N	2026-05-02 19:35:26.631
cmooqs7600009145ymjtn2zdk	a9bc1a2505e28fd08476a518064deaf079d582fd350bc12b05a06238b5738013	cmoopvlb70000xqddt3etffru	2026-05-09 19:36:00.071	2026-05-02 19:39:28.324	\N	2026-05-02 19:36:00.072
cmooqwnt8000h145yg454xy7z	58ff02c332e06f67aef297a2402f19abf75ca47a37490585f8122bb80623a903	cmoopvlb70000xqddt3etffru	2026-05-09 19:39:28.255	2026-05-02 19:39:28.324	\N	2026-05-02 19:39:28.266
cmooqwq33000j145ydwbabwma	489949c2497b082c8763d2521b00e17698f6059c0f893ad6ecb2238f46e846dc	cmoopvlb70000xqddt3etffru	2026-05-09 19:39:31.207	2026-05-02 19:39:59.904	\N	2026-05-02 19:39:31.215
cmoorqpbr000v145yqr7dxdy9	5b0c5dd093be83f8b55f51a86ba64c46a95850901941d7f37bf1096c74414d2d	cmoopvlb70000xqddt3etffru	2026-05-09 20:02:49.908	2026-05-02 20:03:05.773	\N	2026-05-02 20:02:49.911
cmonmt87j000vfs39zdylm3u8	e2f5495d75f2f0454feaea2736f982d1c12fa811ef0f0abe290ebaa5aab350f0	cmoe00wu9003uanv8h810i81r	2026-05-09 00:57:03.436	2026-05-02 20:11:24.398	\N	2026-05-02 00:57:03.44
cmonrqw2z001lfs39qlhi9lu0	a8a78948c66948e0a81f7202a0ed0ba63b2954c6dbcd812afe7ee79be42d806c	cmoe00wu9003uanv8h810i81r	2026-05-09 03:15:12.486	2026-05-02 20:11:24.398	\N	2026-05-02 03:15:12.489
cmoo2pd76001rfs393aipog8r	70ca5ab824e282f8019282156f7b2f39fe363403c60408f22da47e63a3eac4d8	cmoe00wu9003uanv8h810i81r	2026-05-09 08:21:57.131	2026-05-02 20:11:24.398	\N	2026-05-02 08:21:57.135
cmoo4fo8h001xfs39eumlseeb	f2ad36fce64bda36e80acd84502f5b0b4abffc9a71696aa37639f5e36a65267c	cmoe00wu9003uanv8h810i81r	2026-05-09 09:10:24.109	2026-05-02 20:11:24.398	\N	2026-05-02 09:10:24.111
cmoo5queq0021fs39evm5kyj9	3b571b7e4cfa6c61c9d94dabba57174ecb6a69ba6d4b87930a0244c1a2bf18c2	cmoe00wu9003uanv8h810i81r	2026-05-09 09:47:04.945	2026-05-02 20:11:24.398	\N	2026-05-02 09:47:04.946
cmoo5rrph0025fs39m0a21o7l	82ababf30820aaa173fda09e73ef563c338180a699b14fec8d2c0e22440c9ff4	cmoe00wu9003uanv8h810i81r	2026-05-09 09:47:48.102	2026-05-02 20:11:24.398	\N	2026-05-02 09:47:48.102
cmoos2cm10015145ygofmtgc0	f4416d5700c64f5aeb0c877fb2a87a1ecfcba25115f1b9c62ad8552b8a7f2314	cmoe00wu9003uanv8h810i81r	2026-05-09 20:11:53.303	2026-05-02 20:12:28.586	\N	2026-05-02 20:11:53.306
cmoos392v001b145yem9ysz6n	01e84b750a89527ca53346979c7325ee713a45e44a95040c9020af77216ff4f5	cmoopvlb70000xqddt3etffru	2026-05-09 20:12:35.38	2026-05-02 20:17:13.826	\N	2026-05-02 20:12:35.383
cmootfn2c001h145yz6ahv844	f5344d267979112c7c9ca717b0f1662bd2e0e66bf6a5a348da9873483ceff61e	cmoopvlb70000xqddt3etffru	2026-05-09 20:50:12.995	2026-05-02 21:00:41.033	\N	2026-05-02 20:50:12.996
cmoott3o600013clomw8gwnxt	58306065a39e8ff6af944877b31a308277340019d6d01e214d2d4f4233b9ab91	cmoopvlb70000xqddt3etffru	2026-05-09 21:00:41.033	2026-05-02 21:00:41.118	\N	2026-05-02 21:00:41.044
cmopxx5e500033clo85yr7g5d	bc02ede8f2054290c22d13d97e66ef0d224537b5e505b5e0d7754670c635b3b4	cmoe00wu9003uanv8h810i81r	2026-05-10 15:43:34.542	2026-05-03 15:49:07.144	\N	2026-05-03 15:43:34.542
cmopyiw1k00093clogm44hjry	98dad1b3e531794eb306bb8142424732195c68e64dec19b968c8dc69a7909b49	cmoe00wu9003uanv8h810i81r	2026-05-10 16:00:28.853	2026-05-05 07:02:49.046	\N	2026-05-03 16:00:28.856
cmosa8v5a000h3cloefpmpohz	26cb33274cdda4b8ab09b4e3562869576b0d1ba4f5ee92c51365c7f956b7c9aa	cmoe00wu9003uanv8h810i81r	2026-05-12 07:04:08.868	2026-05-05 07:57:42.165	\N	2026-05-05 07:04:08.877
cmosa75jv000d3cloueqadcef	d392ad345341e45d2e088e75b9224c65d35570d085f8514f09819890aefa4fc2	cmoe00wu9003uanv8h810i81r	2026-05-12 07:02:49.047	2026-05-05 07:04:08.868	\N	2026-05-05 07:02:49.049
cmosc9vhh000r3clo8nrdrxaj	c6d474c9a0a949511913b714edfda6737c05766924319b4399944f7dbfbbfc77	cmoe00wu9003uanv8h810i81r	2026-05-12 08:00:55.201	2026-05-05 09:21:21.974	d9049b0be09521c5690962034c5c82db9b312153a9e910246532aafba07a2d69	2026-05-05 08:00:55.205
cmosc657u000l3cloh4sq0bdn	c56935647eb558cb15aabbe83a32900a169a94c653713385eefbdb3ff8ab5dcd	cmoe00wu9003uanv8h810i81r	2026-05-12 07:58:01.192	2026-05-05 08:00:55.201	\N	2026-05-05 07:58:01.194
cmosehz3400051267zt93s1ws	c6e92a3c64db0fdce956036e64570353692eadd844d0a46b1709606c147cbe5f	cmo4xfkxg00051x08vonvclre	2026-05-12 09:03:12.351	\N	\N	2026-05-05 09:03:12.352
cmosei0jg00091267cqmm2vxq	d7fd040247f11cd0b147ecb836ac570b739f0a0d0b3bf3106a76eadafd771ce2	cmo4xfl02000h1x086b0hsx3c	2026-05-12 09:03:14.235	\N	\N	2026-05-05 09:03:14.236
cmosf0mbd000f7ug6bf1xy8xl	1be79dd0820a021b384b7abf8f546bf6df9a06dd40f7547b65740f985d08c361	cmo4xfkxg00051x08vonvclre	2026-05-12 09:17:42.263	\N	\N	2026-05-05 09:17:42.265
cmosf0mpq000j7ug63oke0qny	2cb81b558bb0c9f9d88ed6f2054b4e8e7058f9f8ef862d75002c3f2ee2c5ee9f	cmo4xfl02000h1x086b0hsx3c	2026-05-12 09:17:42.78	\N	\N	2026-05-05 09:17:42.782
cmosa8v4s000f3cloo9qnei8d	a23e6b3cee0a1defcdb91cd29fea46428af7b393177d83094ae714427214928d	cmoe00wu9003uanv8h810i81r	2026-05-12 07:04:08.857	2026-05-05 09:21:22.008	\N	2026-05-05 07:04:08.859
cmosc5qjf000j3clomwqs53fn	28cd15acad67e02f32870541551fdf4846823b82a91224bc52bf088684e8fef1	cmoe00wu9003uanv8h810i81r	2026-05-12 07:57:42.165	2026-05-05 09:21:22.008	\N	2026-05-05 07:57:42.169
cmosc9vhh000p3clo29ta7vbp	b104261098cdde676936fee6eda1eac5f600e6a4869355d48449eb16f4c9cb43	cmoe00wu9003uanv8h810i81r	2026-05-12 08:00:55.2	2026-05-05 09:21:22.008	\N	2026-05-05 08:00:55.204
cmosf5bun000n7ug6lbcivx53	d9049b0be09521c5690962034c5c82db9b312153a9e910246532aafba07a2d69	cmoe00wu9003uanv8h810i81r	2026-05-12 09:21:21.974	2026-05-05 09:21:22.008	\N	2026-05-05 09:21:21.978
cmosehxhz00011267apmu6xwi	45fa05e9c40e2ab0018c70914b70f3e16ed7fa7a8be2b03064dfb82614c20275	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:03:10.294	2026-05-05 10:05:09.133	\N	2026-05-05 09:03:10.295
cmoseiac2000d1267074stdow	3734c570fd50c677209714a38132ad6e09e52331865e79910d35b221dbe3f0eb	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:03:26.929	2026-05-05 10:05:09.133	\N	2026-05-05 09:03:26.931
cmoseiep8000h1267ahz9txzn	972ee8baabb998add10c7e5be8703de6a25a7d64200b8e098f8f0df157513368	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:03:32.587	2026-05-05 10:05:09.133	\N	2026-05-05 09:03:32.589
cmoseix6n000l1267ngz9ywk0	0cf44759103db21f3705956742ab38c7049576ffb695f898cf19ff5d1068dd9c	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:03:56.543	2026-05-05 10:05:09.133	\N	2026-05-05 09:03:56.544
cmosfgcfo000x7ug6islujr56	c909db888858814b21c0bf66738828145e81393b756afc27f8a183f4354c5832	cmo4xfkxg00051x08vonvclre	2026-05-12 09:29:55.953	\N	\N	2026-05-05 09:29:55.956
cmosfgdkb00117ug6btnmr3ej	620e02d4c81df85c1f4165c43956b6809fc700d1448c6427713837f7df7dad56	cmo4xfl02000h1x086b0hsx3c	2026-05-12 09:29:57.416	\N	\N	2026-05-05 09:29:57.419
cmosfgeta00157ug6arteaeta	c78c1a356e9a388dde606ff5e687ac201bd97e2e605ab634083704ce38eacdc0	cmo4xfkyj00091x088b88wghz	2026-05-12 09:29:59.036	\N	\N	2026-05-05 09:29:59.039
cmosfhcm600197ug6hun3pjo9	680a4de1b834c5a6540b13cbe144923ef3b5de54abb0d9d93a98208b99f6e300	cmoe00wu9003uanv8h810i81r	2026-05-12 09:30:42.843	2026-05-05 09:37:26.817	\N	2026-05-05 09:30:42.846
cmosfq0bw0009ugs4z4u97cmv	97799b9ad00c357aabbf029ba562a61f8b7010e64303bbde5d3483a89ae2e7f6	cmoe00wu9003uanv8h810i81r	2026-05-12 09:37:26.817	2026-05-05 09:37:26.862	\N	2026-05-05 09:37:26.826
cmosfc4jt000p7ug6xm0ye3dp	5f6b3ecfd4bbf1ef5765b2a5f013cbadd5a31bbe9f08900378abc85461e0cbb8	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:26:39.111	2026-05-05 10:05:09.133	\N	2026-05-05 09:26:39.113
cmosgeuxa0009hlkitq8gwosb	46c1878f88bc07ab8c810c5b83f85429ab794f18bade19334d3b00b2ed5a7c1b	cmoe00wu9003uanv8h810i81r	2026-05-12 09:56:46.22	2026-05-05 09:59:03.295	\N	2026-05-05 09:56:46.222
cmosfga38000t7ug6ramw8o2a	061bfc7360865e08766fe41aad28a6ed9f0590fa0c2103e3ee70b4667f746276	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:29:52.913	2026-05-05 10:05:09.133	\N	2026-05-05 09:29:52.916
cmosgiacz000hhlkiu14yph0q	457bc604cb07f75eabbebd75228f3b28f943447fc9633a71dec9d19998470446	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:59:26.194	2026-05-05 10:00:09.713	\N	2026-05-05 09:59:26.195
cmosfp3ms0001ugs4bpekvpp0	5548ddd7125400754cf0cbadd9390aed72b701cc73983bc9309dbbc43dd98ca1	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:36:44.45	2026-05-05 10:05:09.133	\N	2026-05-05 09:36:44.453
cmosgj7xy000nhlkifyaatbun	e4de1131261714340bd2120f29d902251aea92e2126f239508fe41e58138603c	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:09.713	2026-05-05 10:00:18.241	\N	2026-05-05 10:00:09.716
cmosfpayk0005ugs4y9z2i65n	1b5c3d6a28c573de24c02e73064d544febe630aaa7f4eefae6e2531d3edf407e	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:36:53.947	2026-05-05 10:05:09.133	\N	2026-05-05 09:36:53.948
cmosgjeis000phlki5r5z9viu	528b371799aa6d3af60f91625caec77f68cf51402b6f72dbbba3fd08da200d94	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:18.241	2026-05-05 10:00:28.454	\N	2026-05-05 10:00:18.243
cmosfqnfm000bugs4ak01bi41	c4b7972bc16c92cd0adfca0609fd0aea7411954762bdb746dc28302c557cdc66	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:37:56.765	2026-05-05 10:05:09.133	\N	2026-05-05 09:37:56.771
cmosgjmej000vhlkiroijtvi1	1c2502bb9bea9a93ec34e5d6c8f4ee4d8680211947bda9ac2d9338dc59d5f9c7	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:28.454	2026-05-05 10:00:36.03	\N	2026-05-05 10:00:28.457
cmosg0ork000nugs4396uhkke	80d95d18df9d4a0ef5cd65d6d07822e84fede1ece4d3b07be21ddb7c2c93e081	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:45:45.055	2026-05-05 10:05:09.133	\N	2026-05-05 09:45:45.057
cmosgjs8x000zhlkiyhv1fu76	88edce6fdc288a1f6ead2282799ce7878af537eaf9bf573003bde9c1ebe84ae5	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:36.03	2026-05-05 10:00:43.103	\N	2026-05-05 10:00:36.032
cmosgjxph0013hlki4y0xvnl4	d75dae5e89bb76fde238eb94f6b4a6981a6087fc6015184eb03c0224468d42db	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:43.103	2026-05-05 10:05:09.098	\N	2026-05-05 10:00:43.106
cmosejdww000p12679kwbqkcy	60e6f0ddff5f8934018ed5faccbe6833ae24f59d533e1dfb1be932ebdfcc4002	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:04:18.223	2026-05-05 10:05:09.133	\N	2026-05-05 09:04:18.225
cmosestlx00017ug6zqft3bhs	06ba3e4d1fe9dc20183b15bf1d294275e597cb42cd210384349e8c8cfef1235a	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:11:38.466	2026-05-05 10:05:09.133	\N	2026-05-05 09:11:38.47
cmoset2wy00057ug68zzo2rrh	5b05fa274c32a769a69b262cf583bd2fb437742a71601eb1e52fbe5f9089ab77	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:11:50.528	2026-05-05 10:05:09.133	\N	2026-05-05 09:11:50.53
cmosf0luy000b7ug6sbqhehl6	64373e812d9e8ac446b24ad78093ce2ea51dac2f5d36bd3d2d66123c8b35f09e	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:17:41.672	2026-05-05 10:05:09.133	\N	2026-05-05 09:17:41.674
cmosge3xp0001hlki3khb1599	2bb15db6784efb410d7801a2cd5ab83de1a19dfacb1c0c7e72f0ab0af3af1e9d	cmo4xfky400071x08l2a3mbs4	2026-05-12 09:56:11.244	2026-05-05 10:05:09.133	\N	2026-05-05 09:56:11.246
cmosgj7xr000lhlkics235v26	83835776ed8226959ed67c12b6b8e9642c6881fc1ea105873abfe2bd2d027be4	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:09.708	2026-05-05 10:05:09.133	\N	2026-05-05 10:00:09.71
cmosgjeiv000rhlki7oxzkcha	5e8036c1290d3366e3db04e0971cc4cc8e6f6a098efe444f943488e9975d98ee	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:18.243	2026-05-05 10:05:09.133	\N	2026-05-05 10:00:18.245
cmosgjmee000thlkivxtg895q	a47cbd37178664dc2fe737259a42b90e38586b95f31fa01cd54951194b0119b0	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:28.45	2026-05-05 10:05:09.133	\N	2026-05-05 10:00:28.453
cmosgjs8u000xhlkiqk3tff2l	2513be0b825f4556d11574b51a4715c2e93eb0c74c58fbdfbab1bf7cb10093a3	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:36.025	2026-05-05 10:05:09.133	\N	2026-05-05 10:00:36.027
cmosgjxpe0011hlkinieeb0rn	ce8ac1855d0afb046e856e21f182558ee36965a67d61153e1b55e7b1eb44ad1e	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:00:43.101	2026-05-05 10:05:09.133	\N	2026-05-05 10:00:43.103
cmosgpmya0001hwiwabz0fwp0	87098017921069d0cd88bdf8f555f072d0280bdfda141451945e789df8fc5127	cmo4xfky400071x08l2a3mbs4	2026-05-12 10:05:09.098	2026-05-05 10:05:09.133	\N	2026-05-05 10:05:09.105
cmosfu13l000fugs4on4ezarc	20f2ae8e773be51a019c68960f29390a05edd9c2c47640780ef168cec12df948	cmoe00wu9003uanv8h810i81r	2026-05-12 09:40:34.447	2026-05-05 12:23:27.559	\N	2026-05-05 09:40:34.449
cmosgpy940003hwiwbavtvh1d	914e9ecfc0d0c26f3c41003077e07896669b62cb540dff20408cfa8795d50b71	cmoe00wu9003uanv8h810i81r	2026-05-12 10:05:23.75	2026-05-05 10:05:37.278	\N	2026-05-05 10:05:23.752
cmosgq8oz0009hwiwgaik5jde	f093700fad25b0edccdb14a291d6721e407cfb0f42e2eb5a78a22d44462020d5	cmoe00wu9003uanv8h810i81r	2026-05-12 10:05:37.278	2026-05-05 10:14:15.384	\N	2026-05-05 10:05:37.281
cmosh4vvm000hhwiwv1fru47z	6215801bcdaa94658ff82825d55ba142fe4a3224437c183bc88bd3eb63b3bbef	cmoe00wu9003uanv8h810i81r	2026-05-12 10:17:00.507	2026-05-05 10:17:14.123	\N	2026-05-05 10:17:00.513
cmosh1cgu000fhwiw1vogni8v	b0a981826dee54dab9fcef988fd169c4ec2281a7e50c8e446e449285305340ae	cmoe00wu9003uanv8h810i81r	2026-05-12 10:14:15.384	2026-05-05 10:17:00.507	\N	2026-05-05 10:14:15.388
cmosh56e5000nhwiw8cey4g9v	cf0734136402fac4b88a5440c662610d284fbf4201d19b7be910291e76b44993	cmoe00wu9003uanv8h810i81r	2026-05-12 10:17:14.123	2026-05-05 10:17:30.561	\N	2026-05-05 10:17:14.14
cmosfubr6000jugs4c45fyqjy	61323c7da82974570cb9e97ad8f319151d5bd947e9b4668ca97def5d323a7691	cmoe00wu9003uanv8h810i81r	2026-05-12 09:40:48.256	2026-05-05 12:23:27.559	\N	2026-05-05 09:40:48.258
cmosh6m79000thwiwn3xdmb19	ec71ab2288382e1a76926c68d2ede7ef87458423c699bc99a06c33572d1bdb78	cmoe00wu9003uanv8h810i81r	2026-05-12 10:18:21.284	2026-05-05 10:18:52.181	\N	2026-05-05 10:18:21.285
cmoshxua1003bhwiwxt11wav5	7d175088472b470b60a9d30345baf3f8e6c36a3ebc9e9a3469a3b96284a8a0fe	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:31.463	2026-05-05 12:12:10.875	\N	2026-05-05 10:39:31.464
cmosh7a1l000zhwiwwch5cb4n	afcb1055926732bc731918442f42a6a87164a808b1e75d029d8d66c95e0894e6	cmoe00wu9003uanv8h810i81r	2026-05-12 10:18:52.182	2026-05-05 10:19:42.595	\N	2026-05-05 10:18:52.184
cmosh8cxy0013hwiw4i7t1q4w	7c1e7f4fbd3a226e6a8cd4a869a1b71db9c81099b0652ac6be70ea9005907ba4	cmoe00wu9003uanv8h810i81r	2026-05-12 10:19:42.595	2026-05-05 10:19:51.308	\N	2026-05-05 10:19:42.597
cmoshhzwn002hhwiwmvpqycqs	56bebac622dd5247c07c81e84c8901a428424f175a2881095662989ec0964f32	cmoe00wu9003uanv8h810i81r	2026-05-12 10:27:12.262	2026-05-05 10:37:49.006	\N	2026-05-05 10:27:12.263
cmosh8jo10017hwiwvyawxauy	4fed85c4752e59558a7cd908e464c3f7a77f23894a042b41d9de7aa51450b6ea	cmoe00wu9003uanv8h810i81r	2026-05-12 10:19:51.309	2026-05-05 10:20:01.066	\N	2026-05-05 10:19:51.311
cmosh8r76001bhwiw4d5llvog	7ffcb8e6434582fdcce6d551a0b2d270406b7a58f4c3a13eadc12a9745e89322	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:01.066	2026-05-05 10:20:09.691	\N	2026-05-05 10:20:01.071
cmosh8xun001fhwiwt0r61nbs	9ada49853ac0c2b97f67f2f2313a192c8ad8db6adbef1cdfe83d02c213400d06	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:09.692	2026-05-05 10:20:17.807	\N	2026-05-05 10:20:09.694
cmosh9442001jhwiwex030u2m	a8b2addb30b3b04180a83afedd8ea2cf22a640d28e251c2560aa5192b2e78906	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:17.807	2026-05-05 10:20:30.172	\N	2026-05-05 10:20:17.809
cmoshvn81002nhwiwjtyjd2zu	30f85f19d27b58659adae9d235981262444ffd6ab3bfbf0c76c63c960a3e3990	cmoe00wu9003uanv8h810i81r	2026-05-12 10:37:49.006	2026-05-05 10:38:06.794	\N	2026-05-05 10:37:49.008
cmosh9dno001nhwiwpfjwhsb2	17d1b3d16913e62acf6d319d80bf8a46fa3a5f5af1385d9ee5cb70de47cb9a53	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:30.172	2026-05-05 10:21:22.448	\N	2026-05-05 10:20:30.175
cmoshahzo001rhwiwdnqvi259	1e81b4ef518da277629e333aa2beec104bcd52d840c34d4d6613e4b9ec9750ff	cmoe00wu9003uanv8h810i81r	2026-05-12 10:21:22.448	2026-05-05 10:21:38.694	\N	2026-05-05 10:21:22.451
cmoshxi9y0033hwiw5ajssrlt	85857992dbaf1c93e140b6b0d6afbe93a1483b49ea34c9ea6d6c1f1b03e9d13c	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:15.905	2026-05-05 10:39:23.576	\N	2026-05-05 10:39:15.906
cmoshauj0001vhwiwfq257xee	a740d3f452c322364b23627e18df908a1ecd11838a25c576434fe24d5270911a	cmoe00wu9003uanv8h810i81r	2026-05-12 10:21:38.695	2026-05-05 10:21:53.432	\N	2026-05-05 10:21:38.698
cmoshdwvq0029hwiwh4nskn86	fd355c7448085b349c0b320b3844a961161502d7052903055c7df6fd675f0430	cmoe00wu9003uanv8h810i81r	2026-05-12 10:24:01.712	2026-05-05 10:26:53.432	\N	2026-05-05 10:24:01.718
cmoshw0y9002rhwiwvbdydrvc	71c3fe6b270126eb9dd8b9b4f3276a19e1e6bc5767825456d94cec6c99f5723f	cmoe00wu9003uanv8h810i81r	2026-05-12 10:38:06.794	2026-05-05 10:38:20.497	\N	2026-05-05 10:38:06.797
cmoshwbit002vhwiwqbzdtnc8	647bd9dc9a456c399a13bbe0fdec6591105f605f5e1bddebfbeedc7a1cfbd50f	cmoe00wu9003uanv8h810i81r	2026-05-12 10:38:20.497	2026-05-05 10:39:07.392	\N	2026-05-05 10:38:20.499
cmoshxbpf002xhwiwddcrse5g	c70a4619d5048d5e4a032733873b2af1aa19cbc4dc4efcc836f15c4b0edda8bb	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:07.392	2026-05-05 10:39:15.905	\N	2026-05-05 10:39:07.394
cmoshxo6z0037hwiwgoksyelg	024ca1a6bf06931b867de8cc0e8ae3b9bcfab432a8edb0ed9f239359f7d7d667	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:23.576	2026-05-05 10:39:31.463	\N	2026-05-05 10:39:23.578
cmosl9454003hhwiw9fk3qcrf	e47028e7ee3f6cd0125d4ce43436d1dcfec67d5a49c21e8682cee870dda17358	cmoe00wu9003uanv8h810i81r	2026-05-12 12:12:16.306	2026-05-05 12:23:27.491	\N	2026-05-05 12:12:16.308
cmosl8zy7003dhwiweahemiq2	aa86f5a1360938249bc13c326a599d8a824b43fd1ca736fa694a84062f3d8ca6	cmoe00wu9003uanv8h810i81r	2026-05-12 12:12:10.875	2026-05-05 12:12:16.305	\N	2026-05-05 12:12:10.877
cmosghsot000dhlkid3xa1ae3	606e92dbce121b0dac6bfd6f25883cc479d55f0195b36d6f82edd8b85901abe0	cmoe00wu9003uanv8h810i81r	2026-05-12 09:59:03.279	2026-05-05 12:23:27.559	\N	2026-05-05 09:59:03.289
cmosghsp3000fhlki687m8gh2	8e20988c65a66c790827837f387874885aa398175bbb219db54ebbdb02c3c2dd	cmoe00wu9003uanv8h810i81r	2026-05-12 09:59:03.296	2026-05-05 12:23:27.559	\N	2026-05-05 09:59:03.3
cmosgq8ns0007hwiwyu6fomzz	dcba6408e2d4f4494f782d6d53025adc5a16c5fd9df1f18687f12dca5f4f49fe	cmoe00wu9003uanv8h810i81r	2026-05-12 10:05:37.235	2026-05-05 12:23:27.559	\N	2026-05-05 10:05:37.238
cmosh56d6000lhwiw598fetwa	596f1d5712ce93b8d2c40aab59bbc04beebd6a20e0d38635aefabd733cd30daf	cmoe00wu9003uanv8h810i81r	2026-05-12 10:17:14.102	2026-05-05 12:23:27.559	\N	2026-05-05 10:17:14.105
cmosh1cgm000dhwiwlt069tm6	1e1df9808eea01485c199f657c6350e176f35cc1860ffbdc5c5dce532514d7fa	cmoe00wu9003uanv8h810i81r	2026-05-12 10:14:15.377	2026-05-05 12:23:27.559	\N	2026-05-05 10:14:15.379
cmosh4vvr000jhwiwh4s7s9no	7b949102dcc924eeab8ca290f3fd337e9cbaf6c6af4162567e9b8db4fedc5b76	cmoe00wu9003uanv8h810i81r	2026-05-12 10:17:00.514	2026-05-05 12:23:27.559	\N	2026-05-05 10:17:00.516
cmosh5j25000phwiwnrjbiflh	26498121f9e12f1cefdc4ed2046a81f48d0c9039d1392a401e64e000dd51e1f4	cmoe00wu9003uanv8h810i81r	2026-05-12 10:17:30.554	2026-05-05 12:23:27.559	\N	2026-05-05 10:17:30.556
cmosh5j2c000rhwiwwuoxbwf4	49f7d345881c38f1b2e56acc09b4bdb9d3c9c09c83b578bb6a6aee2fbba3144d	cmoe00wu9003uanv8h810i81r	2026-05-12 10:17:30.561	2026-05-05 12:23:27.559	\N	2026-05-05 10:17:30.563
cmosh7a1k000xhwiw8al6grsr	9508c4dc592993df9c71227a460ac586d3bbdeeeb4e90f64ce64f661520adca8	cmoe00wu9003uanv8h810i81r	2026-05-12 10:18:52.18	2026-05-05 12:23:27.559	\N	2026-05-05 10:18:52.183
cmosh8cxx0011hwiwtmsmsfp3	5d090f467b0e5af8e22627118b1a9592173bdb45a7f8e55ab5d08ffaaaec4c8a	cmoe00wu9003uanv8h810i81r	2026-05-12 10:19:42.594	2026-05-05 12:23:27.559	\N	2026-05-05 10:19:42.596
cmoshvn80002lhwiwey4p42l7	46bd3f99110a92b11f13f8a5e9d8d7bbef7aa0d8d54de8c36c8dcf08e31ebf22	cmoe00wu9003uanv8h810i81r	2026-05-12 10:37:49.005	2026-05-05 12:23:27.559	\N	2026-05-05 10:37:49.007
cmosh8jo10016hwiw5rp44etw	6d203a652f264b1358a7e5c80824c841b27a8b78367d4043d20bc4a367f76c23	cmoe00wu9003uanv8h810i81r	2026-05-12 10:19:51.304	2026-05-05 12:23:27.559	\N	2026-05-05 10:19:51.306
cmosh8r720019hwiwv6a6o4f6	7d1eb5091c9ceea12cd8945e7e3e63f8ce4a8abfe8150db139e4f07145050620	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:01.064	2026-05-05 12:23:27.559	\N	2026-05-05 10:20:01.066
cmosh8xul001dhwiwkbvhdzzc	f82aff22f94b469964a8878103e17c458851c486ae3c9a86054cfa1836660e89	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:09.688	2026-05-05 12:23:27.559	\N	2026-05-05 10:20:09.691
cmoshxo6v0035hwiwiubvveje	2f4a2e03b79103c31dea0189a3ed10a9e9b4f7f09b07c0e1d5b0dde707ae6e18	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:23.572	2026-05-05 12:23:27.559	\N	2026-05-05 10:39:23.574
cmosh9441001hhwiw36m6nmjr	332e697b172c48467311ed104fd89363b988ebf1198b75e505ff133a007d898f	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:17.801	2026-05-05 12:23:27.559	\N	2026-05-05 10:20:17.803
cmoshw0xx002phwiwq3fs06rk	43d07ba440ea78e19b78d3582781705421995f8f8f7774a95f5e68560f0873b6	cmoe00wu9003uanv8h810i81r	2026-05-12 10:38:06.786	2026-05-05 12:23:27.559	\N	2026-05-05 10:38:06.788
cmosh9dmz001lhwiwpy33oh98	7a3b03e00a3e1eafe16df4e759533a217ef49fc4c03baa6745a92c89bcf14310	cmoe00wu9003uanv8h810i81r	2026-05-12 10:20:30.151	2026-05-05 12:23:27.559	\N	2026-05-05 10:20:30.153
cmoshahzg001phwiwf1erzy0p	a05b561fde0da4d813f8b12c316c7ccb320eb10730212a68bb7f298fbc8a41f8	cmoe00wu9003uanv8h810i81r	2026-05-12 10:21:22.439	2026-05-05 12:23:27.559	\N	2026-05-05 10:21:22.442
cmoshauit001thwiwua57524f	da42807008d0c15dbfb00289e0cc156093ddccfa179a16491571ab1fb575a122	cmoe00wu9003uanv8h810i81r	2026-05-12 10:21:38.69	2026-05-05 12:23:27.559	\N	2026-05-05 10:21:38.692
cmoshb5w7001xhwiwox0z7tvk	e38afe16a189e01aaaf76cc17293e004187af4e9811cd3db78603947cde926ad	cmoe00wu9003uanv8h810i81r	2026-05-12 10:21:53.426	2026-05-05 12:23:27.559	\N	2026-05-05 10:21:53.429
cmoshb5we001zhwiwamt2h51d	87c78fc2c46850d573ab9af899069abc22514d83e0b896527f0d54e99bbc0f01	cmoe00wu9003uanv8h810i81r	2026-05-12 10:21:53.432	2026-05-05 12:23:27.559	\N	2026-05-05 10:21:53.435
cmoshdjin0021hwiwrm254t3e	bfde9648351829f263f12185f68ffd2fc80e355c6fb0b0ee92ea16facd1a0a1b	cmoe00wu9003uanv8h810i81r	2026-05-12 10:23:44.394	2026-05-05 12:23:27.559	\N	2026-05-05 10:23:44.399
cmoshdoxk0025hwiw2978u2u5	4d6918b315d106578510c7925786554d9b377391c6c3c7bcc6465861eaac3475	cmoe00wu9003uanv8h810i81r	2026-05-12 10:23:51.409	2026-05-05 12:23:27.559	\N	2026-05-05 10:23:51.416
cmoshwbis002thwiwyly05bqc	0ce009f0b78d19485fab7930ae6de509197925371db64bd55dcae23f431c02d9	cmoe00wu9003uanv8h810i81r	2026-05-12 10:38:20.496	2026-05-05 12:23:27.559	\N	2026-05-05 10:38:20.498
cmoshhlb1002dhwiw4dxyyt3s	3148da2e59af0153beea0c1d1d7e4a731ed8a797531eb09efd9feb17e3967c9d	cmoe00wu9003uanv8h810i81r	2026-05-12 10:26:53.338	2026-05-05 12:23:27.559	\N	2026-05-05 10:26:53.339
cmoshhldo002fhwiwv5nhasyr	c81d296d6330959f11a8857df8f1af3fb576c97b3f455d43d5746c31779236bb	cmoe00wu9003uanv8h810i81r	2026-05-12 10:26:53.432	2026-05-05 12:23:27.559	\N	2026-05-05 10:26:53.434
cmoshxbpg002zhwiwlhds8t14	e71cac6e93b1683d1770ad629ca82e9497c834e3394b484e12e53664deb6360b	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:07.389	2026-05-05 12:23:27.559	\N	2026-05-05 10:39:07.394
cmoshxi9t0031hwiwbkdkg40z	10c9d6471d1f7234f00d0c95acaf40c9b9c283052d6be22f406a341a66f6d4be	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:15.903	2026-05-05 12:23:27.559	\N	2026-05-05 10:39:15.904
cmoshxua00039hwiw1yoe3xg1	b86f1a845c2f3ff9e28dddc5752c49b182c3866a72b651179b0fd8988b0e3483	cmoe00wu9003uanv8h810i81r	2026-05-12 10:39:31.462	2026-05-05 12:23:27.559	\N	2026-05-05 10:39:31.463
cmosl9450003fhwiwr70cfdfd	91b805e853522ea42ef9472d596f5b50f8f3fed803c8326b0438f90f3b21d31c	cmoe00wu9003uanv8h810i81r	2026-05-12 12:12:16.3	2026-05-05 12:23:27.559	\N	2026-05-05 12:12:16.306
cmoslni14003jhwiwm3ebq3z1	63e00c2783edc032b96953c49bc3dbc2b1773c5816d8873b4cb5de06b91728fa	cmoe00wu9003uanv8h810i81r	2026-05-12 12:23:27.491	2026-05-05 12:23:27.559	\N	2026-05-05 12:23:27.493
cmosnuii40043hwiwphawxxl1	8dc9da67177418d5f6c3b15a2c6cbb7ff9c03c8adcab3dfef20c61000384bb54	cmoe00wu9003uanv8h810i81r	2026-05-12 13:24:53.926	2026-05-05 13:46:10.212	\N	2026-05-05 13:24:53.932
cmoslnph5003lhwiwi3ys6h01	1b0d3638e18b944253e10f59859eb12fc49cf1b1ff626d3ad6699d21f5124f1e	cmoe00wu9003uanv8h810i81r	2026-05-12 12:23:37.144	2026-05-05 12:23:44.625	\N	2026-05-05 12:23:37.145
cmoslnv90003rhwiw5jxlrijn	b207fb1ac4f66e6020cd2b0820d6540ba026ff3a6f33a511e8ef746c5fc4d05c	cmoe00wu9003uanv8h810i81r	2026-05-12 12:23:44.625	2026-05-05 12:24:10.823	\N	2026-05-05 12:23:44.627
cmoslofgu003vhwiw6yc218ig	5c779f27a1610ebb275ce7a28741487f01365bf989a0f9a282c7222d48d13081	cmoe00wu9003uanv8h810i81r	2026-05-12 12:24:10.823	2026-05-05 12:50:17.751	\N	2026-05-05 12:24:10.826
cmosolvaf0001u5tay85foq2m	1ed87122f6bdd7515aa5b44f2229ebe0a08dc6cd66fefd77d76f193044cd8911	cmoe00wu9003uanv8h810i81r	2026-05-12 13:46:10.212	2026-05-05 14:10:09.831	\N	2026-05-05 13:46:10.214
cmosmm0ii003xhwiwbz8xlqac	3c55211dc958779b05d97bd8453268958767cdee2549511c5b08ce5af867d921	cmoe00wu9003uanv8h810i81r	2026-05-12 12:50:17.751	2026-05-05 13:11:50.397	\N	2026-05-05 12:50:17.754
cmospnkyi0007l3fswb321lcx	5cc28130c2573802cab7637bd355a1c2af52b4e3faa081ccce4fa98e47a23096	cmoe00wu9003uanv8h810i81r	2026-05-12 14:15:29.749	2026-05-05 14:16:25.784	\N	2026-05-05 14:15:29.753
cmospgq3u0003u5tab16tgl2j	4848e1d38b16f36b2557c1049fc1fe9b1d2646bd143d3cba84d6ecf5cda07c63	cmoe00wu9003uanv8h810i81r	2026-05-12 14:10:09.831	2026-05-05 14:14:59.142	\N	2026-05-05 14:10:09.833
cmospmxc80003l3fsr3vj9rjk	45d01a9689e78a1b6d6c075d4e09b8331c6daac5a59d3d1ea237d952c6fa2c77	cmoe00wu9003uanv8h810i81r	2026-05-12 14:14:59.142	2026-05-05 14:15:29.749	\N	2026-05-05 14:14:59.143
cmoslnv8w003phwiw4y1dchim	b9106e548e8a1b4dcb7f90a402ed7691cc23a9b8145b2ee68dfeaaf67ee7020f	cmoe00wu9003uanv8h810i81r	2026-05-12 12:23:44.621	2026-05-11 21:44:03.494	\N	2026-05-05 12:23:44.623
cmospos6y0009l3fsrtb6xktg	5c3dd26e67525427db0fcf3d33bd2d73319da4710309c201cd0d923380c73838	cmoe00wu9003uanv8h810i81r	2026-05-12 14:16:25.784	2026-05-05 14:17:58.024	\N	2026-05-05 14:16:25.786
cmospqrd7000dl3fszo50lrx3	432380510da960e29f37c5171b85c84d89f609d4d33e33c591898fbc80449263	cmoe00wu9003uanv8h810i81r	2026-05-12 14:17:58.024	2026-05-05 14:19:03.611	\N	2026-05-05 14:17:58.026
cmosps5yv000fl3fs1hu7ux6n	0f6ea367e1828c83f851c095eb9c88cbdd6b1ee652fcac27493f8eba930bd59a	cmoe00wu9003uanv8h810i81r	2026-05-12 14:19:03.605	2026-05-11 21:44:03.494	\N	2026-05-05 14:19:03.607
cmospst2w000jl3fsv7zxaajt	64493ed4f40523cea5dd990835ef01bb01c0700a3a34aff8a98cd1d25b2cba46	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:19:33.558	2026-05-05 14:19:43.286	\N	2026-05-05 14:19:33.56
cmospt0l6000pl3fsx5ttmrm6	3ecafd9ba697fb4b6ff3cbb0f60d42f1f02edad04cfbec19327ee5b904674a5c	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:19:43.286	2026-05-05 14:22:09.056	\N	2026-05-05 14:19:43.289
cmospw52f000rl3fsiiygvjqa	45be21b6d7141e6b6853dd7d6b7dc062ed20b9875fd2f2acb1095d6ec495fd99	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:22:09.056	2026-05-05 14:42:16.008	\N	2026-05-05 14:22:09.059
cmosps5z5000hl3fswxgrxr5a	617a140415f145d1d20513c6b7315c4367cf4d6f6b438b81ffd3a9a044cc053a	cmoe00wu9003uanv8h810i81r	2026-05-12 14:19:03.612	2026-05-11 21:44:03.494	\N	2026-05-05 14:19:03.616
cmosqm0ct001xl3fsk0xyqu2w	6d169aab37094487792a15fe39405d26e9eab1aaf1defe299e13378cfa407cc6	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:42:16.009	2026-05-05 14:42:42.147	\N	2026-05-05 14:42:16.011
cmosqmkiv0021l3fsj0dh399u	43b7717bcdeba976f7811adebff5431061d2217ddf81f1d3a5ea404adfdd8a18	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:42:42.148	2026-05-05 14:43:05.529	\N	2026-05-05 14:42:42.15
cmosqn2kf0025l3fsboletls3	86da6c3c514bedbea4ff6f1fa7e021255edcef5945c4eb37dfcb5a6096547a0f	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:43:05.529	2026-05-05 14:45:27.619	\N	2026-05-05 14:43:05.531
cmosqq47a0029l3fs7ueh4dp7	26bf4770dafed88b4c302ca4a66184e849ee244d67783dd045dbadd059715ea7	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:45:27.619	2026-05-05 14:45:42.646	\N	2026-05-05 14:45:27.621
cmosqqfsq002dl3fs5ymk702z	2dbe72b644f6394aede7e03eb323497e3896974e8ed01b21aaf550a6b6ee6d78	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:45:42.646	2026-05-05 14:45:52.545	\N	2026-05-05 14:45:42.649
cmosqqnfs002hl3fs2unoeucw	0dd67347074a718e1a5d79cdffd7fb220aa9c60691ce0fa2d169ae7a39245644	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:45:52.545	2026-05-05 14:46:27.302	\N	2026-05-05 14:45:52.548
cmospt0l2000nl3fsrwjasy2q	7f45acd672e198fc766f364612c84b3fcc3e620a681048cc172b16cabba868e8	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:19:43.281	2026-05-05 14:46:27.405	\N	2026-05-05 14:19:43.285
cmosqfxvr000tl3fs6xcczm34	2e6210d72cb46db424e827c8641bcac675c014b93e5580cc8f370fd53b756675	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:37:32.87	2026-05-05 14:46:27.405	\N	2026-05-05 14:37:32.872
cmosqg3x2000xl3fsjxcqorsu	c33ed28e28560c6529e77de3dc6c286199fe30ef2802e4d7022ea30367e4ad2c	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:37:40.693	2026-05-05 14:46:27.405	\N	2026-05-05 14:37:40.694
cmosqgka00011l3fsngyfgzpj	28bf831da87b6517fe6884b6194a98248ed96d73bd15433e1e33a98faaa91bbc	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:38:01.894	2026-05-05 14:46:27.405	\N	2026-05-05 14:38:01.897
cmosqh0k30015l3fs2hn45oxv	3ef06b8b82ed58ffee697aaca2ffc8d778f1fe642f316025b50e58228ae07228	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:38:22.994	2026-05-05 14:46:27.405	\N	2026-05-05 14:38:22.996
cmosqhio10019l3fslukw29ea	397445a72fa8b4ce524306560d8ac3f05701ac58971650cf738f6441ee47697e	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:38:46.463	2026-05-05 14:46:27.405	\N	2026-05-05 14:38:46.465
cmosqi0p8001dl3fscm6pvhak	7f24a7540f335bc29d65f2121c44a5379a13d18b244a94c8c6a15609c941bda1	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:39:09.834	2026-05-05 14:46:27.405	\N	2026-05-05 14:39:09.837
cmosqj6tq001hl3fso8prza1t	a8e038c8313cec8bc30d88acf0aaee75c71826f973948b017b0d5c9cd6047023	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:40:04.43	2026-05-05 14:46:27.405	\N	2026-05-05 14:40:04.431
cmosqjmvy001ll3fsxavj8d0p	cb11c61419ce1c614b617f2ce8407f2338bf70801e9a37df5abeaeb478592e08	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:40:25.243	2026-05-05 14:46:27.405	\N	2026-05-05 14:40:25.246
cmosqjzuv001pl3fszrbrsjbb	a1ea136ec6d389ac8240408f0cd2db40a27ad672eae603f16ab0d2cf6d63b1c1	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:40:42.054	2026-05-05 14:46:27.405	\N	2026-05-05 14:40:42.055
cmosqk83y001tl3fsimshbndn	fda1f1c8968a57e42ba95386476c3dd18a200ff5f324d037c22d5b588ba627b9	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:40:52.748	2026-05-05 14:46:27.405	\N	2026-05-05 14:40:52.751
cmosqmkig001zl3fsfgianok2	f260268d41e6c496f26b6aa9304cbd3d25952077298a0d0a150fd7c46a40b9ab	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:42:42.133	2026-05-05 14:46:27.405	\N	2026-05-05 14:42:42.135
cmosqn2k70023l3fskzx379ks	10f8adcc9a40fd25373d3ba1a43bb7d5905786e6a7311a9f9c0bd2604ab07108	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:43:05.523	2026-05-05 14:46:27.405	\N	2026-05-05 14:43:05.526
cmosqq4750027l3fs41w2y0mg	c4ec902750704283dd9aa8126989c86eaf40b3d67b3f1e9a4a9d2bacb42ff028	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:45:27.613	2026-05-05 14:46:27.405	\N	2026-05-05 14:45:27.616
cmosqqfsp002bl3fsumf74156	68082eaea1e8f6170795220effa4b6196b8322e5bdb1d2070a2404fbd1bfe064	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:45:42.645	2026-05-05 14:46:27.405	\N	2026-05-05 14:45:42.647
cmosqqne4002fl3fsxf56tqp2	36ed28575c298802ee725e2707792de2406931917ffccf256d01f005b64969ff	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:45:52.487	2026-05-05 14:46:27.405	\N	2026-05-05 14:45:52.49
cmosqre9d002jl3fsrrptfrrl	30068c251b376844ab36bb99fee4cb54ce6dd3192d9032c619e690df93645de1	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:46:27.302	2026-05-05 14:46:27.405	\N	2026-05-05 14:46:27.306
cmosqrvn7002ll3fs6kuf1tzf	415cc7c3d402ca34fda0e5fff35df1ae791869fabd178cf675b857bdbb1138b8	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:46:49.842	2026-05-05 14:46:59.508	\N	2026-05-05 14:46:49.843
cmosqzb0l003ll3fs1i02v3l6	9ad267e8ba14b38288d936a8a09c73b137dda1c3eeb1bc765589627c4c2b4db1	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:36.349	\N	\N	2026-05-05 14:52:36.351
cmosqs33z002rl3fsxsgtac2r	304051f3fdbbb8ad3dc06d770774c5354ef5b824170106a76a4b34d45c306c12	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:46:59.509	2026-05-05 14:47:13.255	\N	2026-05-05 14:46:59.511
cmosqyzqo003hl3fs4i5f6tej	12d12bed4a727460954d32af79312b6ae8ed0d78d7aeffb2f75afe688f01381e	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:21.735	2026-05-05 14:52:36.347	\N	2026-05-05 14:52:21.741
cmosqsdpp002tl3fs5dwkbyuy	0fe103ee104bc2c4e206f32c92ad26fb8e4e1a7a2ea521d1f5f6dc6ebae2981b	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:47:13.255	2026-05-05 14:47:24.319	\N	2026-05-05 14:47:13.258
cmosqsm92002zl3fswmwh02ys	04b9d5206535d27442fbd0b1558acd90de6ecae139ef5e521778adadcd6010eb	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:47:24.319	2026-05-05 14:47:36.352	\N	2026-05-05 14:47:24.321
cmosqsvj80033l3fshg03vb6c	7a539b2e056bf286ad404e38c1f3455ea52d4152ae185aaf1f48854074abaf27	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:47:36.352	2026-05-05 14:47:48.804	\N	2026-05-05 14:47:36.355
cmosqs33r002pl3fsj45w4bg5	f9425c43e78f1b623532dfc190a97be7aeb561681282a2434e6c82823a22c5ae	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:46:59.506	2026-05-05 14:47:48.923	\N	2026-05-05 14:46:59.509
cmosqsdps002vl3fsit31hvok	1b3fd0ede88313921cbc5b9a3f2c032613deb14ecba6dcc5a42fbeaedc6602d3	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:47:13.257	2026-05-05 14:47:48.923	\N	2026-05-05 14:47:13.26
cmosqsm8v002xl3fs3pst6yip	03168e1a544106c5db50e727d9e45cfe2c4a7959078ef86dcec3b066f0fdc892	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:47:24.315	2026-05-05 14:47:48.923	\N	2026-05-05 14:47:24.318
cmosqsvj20031l3fsion9xhu2	1689e9f0b34e98a1e624aacf6369adbb9af4603a24c7e28ddfb3c42020f463ec	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:47:36.346	2026-05-05 14:47:48.923	\N	2026-05-05 14:47:36.348
cmosqt5560035l3fsx251wm4p	d0efc52431080cd5f43636236eb1420beedf84454a959f9fe7089f2d6ff3ceeb	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:47:48.805	2026-05-05 14:47:48.923	\N	2026-05-05 14:47:48.808
cmosr05xe003zl3fsn8zfff9x	61012c4769890aeb71b0153878a7a137517ad9594053986e4969faf190e00137	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:53:16.412	\N	\N	2026-05-05 14:53:16.414
cmosquf4t003bl3fsb1hw2bys	ae5304666df9c831f8fb98fdc2d67116aa33baa60a374858f0c85c315cc01f77	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:48:48.409	\N	\N	2026-05-05 14:48:48.411
cmosqu8d80037l3fss6wfnq8p	408767d7fbf3c9a6aabad13f791b8c01b596d1a575e89c631bc799a667f1d4b9	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:48:39.643	2026-05-05 14:48:48.411	\N	2026-05-05 14:48:39.645
cmosqzj04003nl3fsjawd0j7a	3bbc347001dc7d793885f928d3da03ecea2fcee975fe7d92971865c600da61dd	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:46.703	\N	\N	2026-05-05 14:52:46.706
cmosqyzm8003fl3fsfrbcbp4w	fb8fa16e3789b4d84c4c620f85b5834efae775f72b7eaf6cabfde315d78d7d89	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:21.571	\N	\N	2026-05-05 14:52:21.581
cmosquf4w003dl3fsb24nge94	42ccf373060c3831062e641114d9489882841cd74447e7ac628d649ec8aa38ae	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:48:48.411	2026-05-05 14:52:21.735	\N	2026-05-05 14:48:48.414
cmosqzb0g003jl3fsjn8bcxhl	cdb07d747adcd8e12b904e01620e5756c81e6f94d60b97e6212330a215294893	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:36.347	2026-05-05 14:52:46.707	\N	2026-05-05 14:52:36.35
cmosqzyfh003xl3fsuv6rx1s9	fdb3332eabff0b971834d3c5910f3699c9e941ab991b2c37159a7a41ac73c640	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:53:06.695	2026-05-05 14:53:16.449	\N	2026-05-05 14:53:06.697
cmosqzrcs003tl3fsnjn2cfbm	3954aa0a326b75f1872563c103e11259d611e509e86b62df08073ad0a8cb17c3	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:57.527	\N	\N	2026-05-05 14:52:57.53
cmosqzj0i003pl3fskf9283bv	a80519451a42e0c1276d520bca6005381dcb2ca6d0758bd2f982b3c40f1b6e9f	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:46.708	2026-05-05 14:52:57.522	\N	2026-05-05 14:52:46.712
cmosqzyfe003vl3fsgzkwj1jn	5a67c394668ff926517fc90ef19e69eb9583cef1a2e5787abede126161243a08	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:53:06.694	\N	\N	2026-05-05 14:53:06.696
cmosqzrcp003rl3fsrucj025w	013a692bd28474851ffb3d71283382e850d3303fcd6a6e0cb904c8a460632d5b	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:52:57.523	2026-05-05 14:53:06.695	\N	2026-05-05 14:52:57.526
cmosr1fu10047l3fsk3euobug	7423cff7f90cf2e85ea1d8ffa626f7194d89ad183a488e6c1c43950501b8c1a6	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:54:15.907	\N	\N	2026-05-05 14:54:15.91
cmosr16tv0043l3fs4w1ufkzu	90a1755d1624380434f213f46dd19c777acc105c0687652740fd51897a00f3a1	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:54:04.239	\N	\N	2026-05-05 14:54:04.241
cmosr05yi0041l3fstipspvvm	359615ea86a1f8440130fa13449a4c131687b07a147bc9f883846f50616e7c69	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:53:16.45	2026-05-05 14:54:04.349	\N	2026-05-05 14:53:16.457
cmosr16yp0045l3fso4z9g8t5	ba904989b28d0515e912dbc6aaa04ca446ea169f24fc0ee227dc06c4919fb70f	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:54:04.35	2026-05-05 14:54:15.91	\N	2026-05-05 14:54:04.352
cmosr1fu30049l3fsnp0cex8n	39348785cf6f89c81c2c8facb87c9ac0fdd3f6d4370e99c86a7b7634112f5671	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:54:15.91	\N	\N	2026-05-05 14:54:15.913
cmosr3rn7000553fld33tyjab	84bcdaa8a93e726bba9a11e945de58a0021335e45071a7f10bacf72f02d2eab8	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:56:04.524	\N	\N	2026-05-05 14:56:04.529
cmosr3qg2000153floqpstbke	c542b2e53dd10c4c8b2c218f8aab43d955d02c27585088d5b271a06410b2c2b2	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:56:02.975	2026-05-05 14:56:04.528	\N	2026-05-05 14:56:02.978
cmosr4pmo000953flxyylldqi	a56e5ff0bee9890cb210529abc5de7dda0931e5fb9f62173cba9704f841b8e3f	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:56:48.572	\N	\N	2026-05-05 14:56:48.574
cmosr3rn9000753fl5bgtovmi	8625c3041dd3fb999d3dfb49e7bdb5288db480fbaf399cb0ca85935b2bd7ad17	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:56:04.528	2026-05-05 14:56:48.578	\N	2026-05-05 14:56:04.531
cmosr4pn0000b53flit2rxybi	bae090f941fe39b4d0847ea09d29db7333f34c01d164c7ed714cc7c0a23a39df	cmo4xfky400071x08l2a3mbs4	2026-05-12 14:56:48.578	2026-05-05 14:58:19.774	\N	2026-05-05 14:56:48.582
cmp1o3nco002j53flog4x7dbz	d60a05280ef8d920aae820875fe1f1d8c8acbe9e63967241d37145e4e18fa1f2	cmoe00wu9003uanv8h810i81r	2026-05-18 20:41:55.703	2026-05-11 21:44:03.4	\N	2026-05-11 20:41:55.704
cmoxg15cd000f53fltc7n6lmz	7d18fd8bbf6dd859c70590ec3248e8fd79bea723b82151a7810a2f66abef5a18	cmoe00wu9003uanv8h810i81r	2026-05-15 21:44:57.419	2026-05-08 22:02:08.05	\N	2026-05-08 21:44:57.421
cmoxgo4av000t53fl1eopeb6o	a6c9aed360b77aec7235f7f8032d8bced75f8a6dd512dcc485fa5cefe196b088	cmo4xfky400071x08l2a3mbs4	2026-05-15 22:02:49.105	\N	\N	2026-05-08 22:02:49.114
cmoxgnf6w000p53flvzx70jwc	1a9d1ab7eaf8f88dab594bbcaab996ab42911fcccaf4d6edd56887d6bde882a7	cmo4xfky400071x08l2a3mbs4	2026-05-15 22:02:16.614	2026-05-08 22:02:49.374	\N	2026-05-08 22:02:16.617
cmoxgo4h9000v53fljin4ba29	d37bd86e458a1e01c8687db90f6836d3d6f16246cfcdffeeff35a94d3e6fefcd	cmo4xfky400071x08l2a3mbs4	2026-05-15 22:02:49.375	\N	\N	2026-05-08 22:02:49.386
cmoslofgs003thwiwgdrqey2b	f0191e000a7f88e98d3187a63e6e82e1958f6cc854240d06f3e355af2c4e70e1	cmoe00wu9003uanv8h810i81r	2026-05-12 12:24:10.82	2026-05-11 21:44:03.494	\N	2026-05-05 12:24:10.824
cmoxgosfz001153flr6takbhx	f6205b49494b70f291b954ee4c8956df467d57e605479c40b4868c08da832551	cmo4xfky400071x08l2a3mbs4	2026-05-15 22:03:20.444	\N	\N	2026-05-08 22:03:20.446
cmoxgod61000x53flxuq8vrwc	2632209c3fda3a4f672c2ad07cf3ba5442e83c1c9dac641eacb1f4e47c8853b6	cmo4xfky400071x08l2a3mbs4	2026-05-15 22:03:00.637	2026-05-08 22:03:20.445	\N	2026-05-08 22:03:00.649
cmosndpxe0041hwiw56yrs5yg	888223a9328266abacc3108be9fe1114ec43afdfc24519da4f7c21836e5940c0	cmoe00wu9003uanv8h810i81r	2026-05-12 13:11:50.398	2026-05-11 21:44:03.494	\N	2026-05-05 13:11:50.399
cmozqiu4w001553fliktfgdc7	df1364d71f4cd34dc0add29ea6d090cc0270e8802a68aab7602f71e467e19b5d	cmo4xfky400071x08l2a3mbs4	2026-05-17 12:14:11.212	\N	\N	2026-05-10 12:14:11.214
cmoxgosg1001353fl0j0jnte3	73a5441c742711590c5ee1d8e5d2646984a122718e68843dc100192f8613d388	cmo4xfky400071x08l2a3mbs4	2026-05-15 22:03:20.445	2026-05-10 12:14:11.215	\N	2026-05-08 22:03:20.447
cmosndpxc003zhwiwm89630nt	96c618bedc521ec25d0d3fe21eb017ae3ef1ba36645f2405d5fe96900a3607b5	cmoe00wu9003uanv8h810i81r	2026-05-12 13:11:50.397	2026-05-11 21:44:03.494	\N	2026-05-05 13:11:50.398
cmp1j0f4i001b53flf8axqdav	12e3e9f681a11b8272efa88891da10e13bf99be35c5bca666f28fc0789fb25e5	cmo4xfky400071x08l2a3mbs4	2026-05-18 18:19:26.985	\N	\N	2026-05-11 18:19:26.989
cmozqiu4y001753flhyw70f6x	4bcc8dd9b9e6557975988aa73f58fdb85e4f19e2b9aba4050f256d3f0f4762a7	cmo4xfky400071x08l2a3mbs4	2026-05-17 12:14:11.215	2026-05-11 18:19:26.988	\N	2026-05-10 12:14:11.217
cmospmxc60001l3fs6737zf1p	e27f0a3ad0fd709c89137c9eaaf7f4519686ecc62eb18aaa9190f920c21ff642	cmoe00wu9003uanv8h810i81r	2026-05-12 14:14:59.137	2026-05-11 21:44:03.494	\N	2026-05-05 14:14:59.141
cmp1jefnp001d53flsg1kxhms	3ebb8ed72c439611279e022be650831b3d606af1c0927a37d3f3cc2b342da1d8	cmo4xfky400071x08l2a3mbs4	2026-05-18 18:30:20.865	\N	\N	2026-05-11 18:30:20.868
cmp1j0f4i001a53fla44xxeun	5ebeb6b00edb3dc2faa93cdb75faa00b3566320bcbab7d049325b9a638063d3b	cmo4xfky400071x08l2a3mbs4	2026-05-18 18:19:26.988	2026-05-11 18:30:20.929	\N	2026-05-11 18:19:26.991
cmospnkyd0005l3fs0muofrbi	2eb6887b17874fc270b429a662d79bf8b7312cbbb2e8bdc05899a808a7e56744	cmoe00wu9003uanv8h810i81r	2026-05-12 14:15:29.746	2026-05-11 21:44:03.494	\N	2026-05-05 14:15:29.748
cmp1k0z4a001h53fltuemrdy7	125c430fb481136fd1a40ea56bd28046f6625530f8294677e81f02df5b4f0861	cmo4xfky400071x08l2a3mbs4	2026-05-18 18:47:52.513	\N	\N	2026-05-11 18:47:52.516
cmp1jefpj001f53fluhzs75wt	5e922f59706d9fc63a9b6623189319af61b8105856162309ca4fe266709c4316	cmo4xfky400071x08l2a3mbs4	2026-05-18 18:30:20.93	2026-05-11 18:47:52.81	\N	2026-05-11 18:30:20.933
cmospqrd2000bl3fsmnt31zsi	3a6ef5e4168a3f2ae98c825f2573294c9a70067f9eb76f9e553791945399143c	cmoe00wu9003uanv8h810i81r	2026-05-12 14:17:58.019	2026-05-11 21:44:03.494	\N	2026-05-05 14:17:58.02
cmp1nchsd001l53flfnsp1r42	e60ad7388c5a5822dd87ffc4d25d5f6b4ac4994e37dc1afab95ea3a38c556d5a	cmo4xfky400071x08l2a3mbs4	2026-05-18 20:20:48.761	\N	\N	2026-05-11 20:20:48.771
cmp1k0zcf001j53flmws1fq2n	77ade3e2a8de6a9ff0bbdf639052f22347035edd1dc17f0981300e72bbc92f28	cmo4xfky400071x08l2a3mbs4	2026-05-18 18:47:52.81	2026-05-11 20:20:48.766	\N	2026-05-11 18:47:52.813
cmp1nchsf001n53fll8zrlq7b	42147c48de2f5ab410bd7bd1ca302e0b1807eb0851108ed78e27db90015fe55b	cmo4xfky400071x08l2a3mbs4	2026-05-18 20:20:48.766	2026-05-11 20:21:23.696	\N	2026-05-11 20:20:48.772
cmp1necyx001r53flg7l9gvnj	9c1acfa87d69c2b5db4649a1c597db73c07039a4c75db5862d5983e83f3b179d	cmoe00wu9003uanv8h810i81r	2026-05-18 20:22:15.848	2026-05-11 20:23:41.259	\N	2026-05-11 20:22:15.849
cmp1nx4lq001x53flqsgklnpe	63b72b334d83ae194d7ef3fdf3605160c3deee7c069de17883a2aa597dc4b8e1	cmoe00wu9003uanv8h810i81r	2026-05-18 20:36:51.469	2026-05-11 20:36:54.466	\N	2026-05-11 20:36:51.47
cmp1pp7sw000nuz8n9h7xcn0k	412cd86dad48c8469aa46ce3a014e3f35265dd96996aec962bbca92dcd71b632	cmp1pp7rv000juz8nox897vhj	2026-05-18 21:26:41.59	\N	\N	2026-05-11 21:26:41.6
cmp1pph9w000xuz8n5zmoxoq9	46f8fa00cb3caa1fd94761d6cba7f40541a4d13794199f94fa5a58a77247843a	cmp1pph99000tuz8n16qmv7g5	2026-05-18 21:26:53.865	\N	\N	2026-05-11 21:26:53.876
cmp1q9ifl0017uz8nccvlmxl8	a8b2643082fcf6099de55379bb63b57483af25ba1c6d1ec574b5227deeb603be	cmp1q9iep0013uz8n0yur9qel	2026-05-18 21:42:28.493	\N	\N	2026-05-11 21:42:28.497
cmoxgn8l0000l53fluq7shllf	1c09d39c62e501e857ef32c9ae2edad8763276b25a50915cb0b94cc057db5e7e	cmoe00wu9003uanv8h810i81r	2026-05-15 22:02:08.048	2026-05-11 21:44:03.494	\N	2026-05-08 22:02:08.051
cmoxgn8l4000n53flk3jkgkji	0c9650765093a88a669cbe7773884c135b0348b99518747a2b68d825e938ea12	cmoe00wu9003uanv8h810i81r	2026-05-15 22:02:08.05	2026-05-11 21:44:03.494	\N	2026-05-08 22:02:08.052
cmp1qbjo50019uz8nfeqhshl1	97f05c22da5447a1e87b45a73c5e24c3d91d6b0facd2cad18b6afce00de93cfc	cmoe00wu9003uanv8h810i81r	2026-05-18 21:44:03.401	2026-05-11 21:44:03.494	\N	2026-05-11 21:44:03.411
cmp1qd24c001puz8n95wqw0qp	0edcde5919b6c3b1c59587412f19ab980e3778f09d0025b10c931e690cc8adf7	cmp1qd22a001juz8nktpfznio	2026-05-18 21:45:13.978	2026-05-11 22:11:55.459	\N	2026-05-11 21:45:13.98
cmp1rbuju001yuz8nn0i4k1w9	6591355cfa9340b5a4b00796fe2a4d3570118f86ac71ed148d6aac41604faed2	cmp1rbuj3001uuz8nd5aummwg	2026-05-18 22:12:17.127	2026-05-11 22:22:23.422	\N	2026-05-11 22:12:17.13
cmp1roudi0001yqt1dus52plm	84108bd6da8e2c52966ff4adb6be47bd7765f3ae7d481de632d9a26680792272	cmp1rbuj3001uuz8nd5aummwg	2026-05-18 22:22:23.422	2026-05-11 22:22:23.479	\N	2026-05-11 22:22:23.428
cmp1rpiv8000byqt13opclspj	1a2a5f66d3c211632ca8520e71d184b8a8ae61f237e098deeaf99913997c256a	cmp1rpitl0007yqt1fhm4p3vf	2026-05-18 22:22:55.17	2026-05-11 22:23:01.561	\N	2026-05-11 22:22:55.172
cmp1rqk3b000nyqt1y9ig87ly	ef93dd354ecfa56d71618b05fd475d1e41af8dcca941174464c147b52e96175b	cmp1rqk2e000jyqt1rgi6bncp	2026-05-18 22:23:43.413	2026-05-11 22:24:44.743	\N	2026-05-11 22:23:43.415
cmp1rs4rn000wyqt1bgmsm5zx	7313a9dd29e24c020c021ba1e7545668aaa9f5266172f263aab2ac52d7ce8023	cmp1rs4r8000syqt1lgtewdo9	2026-05-18 22:24:56.865	2026-05-11 22:29:17.654	\N	2026-05-11 22:24:56.868
cmp1suwq0000f12dmd43fb7a9	cbafc0d39bec1cb843726f74fc6998e9908d67cb3d4cc81d07147cd9994354db	cmp1rycpi000712dmboyku63e	2026-05-18 22:55:06.02	\N	\N	2026-05-11 22:55:06.023
cmp1rycql000b12dmbwf9u46w	8cadad04c622af6ac5b0232fa049e5af70b25a791bac6ffdc50c5a5b93f2bae9	cmp1rycpi000712dmboyku63e	2026-05-18 22:29:47.132	2026-05-11 22:55:06.009	\N	2026-05-11 22:29:47.133
cmp1suzen000h12dmxo79gjn4	38e2a0805a24ce16f2db1285ac819a005bee1e31bbcad500f2e80058bf59075d	cmp1rycpi000712dmboyku63e	2026-05-18 22:55:09.496	\N	\N	2026-05-11 22:55:09.5
cmp1suwq0000d12dm5t79r2v2	bde90378e0eb4edc1f2e39c7c10a656bee41acd3cd7da500a5b029c45284bea8	cmp1rycpi000712dmboyku63e	2026-05-18 22:55:06.01	2026-05-11 22:55:09.523	\N	2026-05-11 22:55:06.022
cmp1sxod7000l12dm53hqb66b	f19ab8805d77af006f647a6af2ca5bfebd2e9e6af75fb1e0103631478c80f9dd	cmp1rycpi000712dmboyku63e	2026-05-18 22:57:15.159	\N	\N	2026-05-11 22:57:15.162
cmp1suzff000j12dm392k5hwa	44b353d8aae89acbbfc58c453ecc31c2ec592b22e79cc690f381d05496ffb038	cmp1rycpi000712dmboyku63e	2026-05-18 22:55:09.523	2026-05-11 22:57:15.161	\N	2026-05-11 22:55:09.528
cmp1u16zw002112dmi5a52ek2	7ccfc20838cb84193fedc788331da1691accfb809981dd3dcc608972b235c8c9	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:58.878	\N	\N	2026-05-11 23:27:58.891
cmp1t5rdu000p12dm5jwhncl3	7eaa9c2c4325a2a0c70a3471316a08c5aca3105b3d7e883eeb6fa22a206a60b4	cmp1rycpi000712dmboyku63e	2026-05-18 23:03:32.315	\N	\N	2026-05-11 23:03:32.319
cmp1sxod8000n12dmnf5vv5lg	d6e7b1c317f5a5c9ae7c91cdf7eecb3472febdff2bbbe2377220c5d053a34958	cmp1rycpi000712dmboyku63e	2026-05-18 22:57:15.161	2026-05-11 23:03:32.318	\N	2026-05-11 22:57:15.163
cmp1u15ae001z12dmz0otp80y	7632764870129f838627c0de64a08b71b6d544a60804ec884a600e923bc413e9	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:56.663	2026-05-11 23:27:58.879	\N	2026-05-11 23:27:56.677
cmp1tfeyc000t12dmk6nfjin6	6ac59e1645f7572c41e18169cb2468a3dcc345d977aa6b5badab391c9d625a2f	cmp1rycpi000712dmboyku63e	2026-05-18 23:11:02.766	\N	\N	2026-05-11 23:11:02.77
cmp1t5rdw000r12dmsm4m4meo	4f27eb5e9fa8c93e57f89d12b4f723aabc797eb135e8d9aba636ef076cafac33	cmp1rycpi000712dmboyku63e	2026-05-18 23:03:32.318	2026-05-11 23:11:02.769	\N	2026-05-11 23:03:32.322
cmp1tzz6l000x12dm1zzyea14	4da67301f9512db7949264821087655b7a3a3c001ce58a838fe3b91bad1040e0	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:02.107	\N	\N	2026-05-11 23:27:02.11
cmp1u0s2t001512dm3scc47lp	b98419db182c1ffff2aca2d420df6a4eeba1c499f4774b80d77a2af274bad96c	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:39.541	\N	\N	2026-05-11 23:27:39.553
cmp1u0pvl001112dmjgll8uhr	629e1fa3ff2e6ff7f27de3d737a1eedf2f9ee41099d3b671c34d3015552de5eb	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:36.695	2026-05-11 23:27:39.55	\N	2026-05-11 23:27:36.705
cmp1u1ghw002l12dmjjaxtz4r	47031aac5cdf49457d8a8cf4efc04b31dd965e69e32dd271fb8171181c388f9e	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:11.199	\N	\N	2026-05-11 23:28:11.203
cmp1u0une001912dm13ka7d13	0404dcf376f6935c606897b951d137bc920c83405f620f465838ba2e36e45885	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:42.855	\N	\N	2026-05-11 23:27:42.866
cmp1u0s32001712dmdiwcg5rz	7fcfa3771876660195b9ac0f204250913114c6c363f0e3dc373e26cd4a0da93b	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:39.55	2026-05-11 23:27:42.896	\N	2026-05-11 23:27:39.562
cmp1u18vr002512dmgoefey17	e38a2f661ebcca5b4c7f9f5d26db4bec236a13c50bea259a96800a60c673bb5d	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:01.329	\N	\N	2026-05-11 23:28:01.332
cmp1u0wqy001d12dmxkhwjrkz	833da3bbf00b673ba4f473aab221facc86ae5c61ac0d46898d2e6e700ac5d1f5	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:45.596	\N	\N	2026-05-11 23:27:45.608
cmp1u0uo0001b12dmqod0yxau	73f41744ca03230dad50edb9767a0804e7df4314645e496f0523d2bc85ad3dcb	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:42.896	2026-05-11 23:27:45.606	\N	2026-05-11 23:27:42.907
cmp1u16zx002312dm7cwhb7ga	ae40e3e4a1e16e945d99c0e696e7976693f4f3f42af386e07e6c80fe99615fd4	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:58.879	2026-05-11 23:28:01.357	\N	2026-05-11 23:27:58.892
cmp1u0ylj001h12dm43xnwk0n	8cf586f64cf64384eaa8cdee27da6905fc59b42d65d04c3f6169913c2e89d163	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:47.985	\N	\N	2026-05-11 23:27:47.997
cmp1u0wra001f12dmj3n58jhy	8389cc064b1587f403742520ffa2ab5e6c5d5e118ee750817b0f8fbcc2c97feb	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:45.608	2026-05-11 23:27:47.987	\N	2026-05-11 23:27:45.62
cmp1u108s001l12dmy9l4sqci	f40a3cca204856d362241d0a62b0a74c0beead60fea0c713742da3b2d40253e4	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:50.126	\N	\N	2026-05-11 23:27:50.138
cmp1u0ylt001j12dmgw1pd14f	dbea200aceec6a82fca3b244145adcb5a25a22d6aa8fd599314451479500c0c9	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:47.987	2026-05-11 23:27:50.127	\N	2026-05-11 23:27:47.998
cmp1u1euk002j12dmtcevkhr3	f446e95aa995c474e41b9c60e6a47f092d7354070fc85e4654f0dc77a3b3f6b1	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:09.064	2026-05-11 23:28:11.201	\N	2026-05-11 23:28:09.067
cmp1u11wa001p12dmn7duawb7	66d6fa59a3423b1224617aa2c034638cf749b3cab234dfe18c686cafae06b0a7	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:52.269	\N	\N	2026-05-11 23:27:52.281
cmp1u108u001n12dmgha80ihl	ac76fa347fa6f9571520f95d3c76985da6247e5ae955769c8311ff30655d84e4	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:50.127	2026-05-11 23:27:52.273	\N	2026-05-11 23:27:50.14
cmp1u1b2r002912dmsbrg7rw2	f501b253aaa2bf61a9dad1078859f7820a55d1c6bc478b706739c9afdc9df932	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:04.171	\N	\N	2026-05-11 23:28:04.175
cmp1u13m9001t12dmohohjwyv	bb03e98f8468e5191ae435569521ecce9f147fc2cb91007bcb3c7fcb9690e365	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:54.499	\N	\N	2026-05-11 23:27:54.512
cmp1u11wg001r12dm228qp91x	befe0ea142161fde3a6cae1afcf223203182fe87d0c95a249a1b3227642c0fd0	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:52.273	2026-05-11 23:27:54.5	\N	2026-05-11 23:27:52.287
cmp1u18wh002712dmq4ghc277	7d409aaf4768b5199b21096e769037c429f62e38c5f1146f2ed6c61ac875de2c	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:01.358	2026-05-11 23:28:04.215	\N	2026-05-11 23:28:01.359
cmp1u15ad001x12dmw044vo18	17c6d6428139b4964327b10f82fbf2384c79d22822c41badeb738a6c53ddd3b5	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:56.66	\N	\N	2026-05-11 23:27:56.674
cmp1u13me001v12dm816q46gi	94d8fed2d92dbbeda0b92e7c6a064040989352f111f08f8f07a25dc733fe8762	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:27:54.5	2026-05-11 23:27:56.663	\N	2026-05-11 23:27:54.513
cmp1u1lej002z12dmrbao7crh	f6620f37e1b170223a07f2239d6248dad0a26ff27a98a4c64a9842cdbc0540e3	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:17.555	2026-05-11 23:28:19.676	\N	2026-05-11 23:28:17.56
cmp1u1d62002d12dmrdtwu2i5	2e7dc7f85963405d2f5fd086cf02d7b995825797b79c6e6603de84a3425a42b2	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:06.886	\N	\N	2026-05-11 23:28:06.889
cmp1u1b3x002b12dm1vahfb5z	f13f171e527205bc4fc3146d256922ca9ae84e853a47bcf2dc55b97f973ef813	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:04.215	2026-05-11 23:28:06.887	\N	2026-05-11 23:28:04.218
cmp1u1i63002p12dmy8gu33j0	2b1f9016a01e25adda1ec2b04028d015f4a8771c80fde101f32bdbf277176615	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:13.365	\N	\N	2026-05-11 23:28:13.37
cmp1u1eui002h12dmqby6k9ci	d8cb90895a0f63932dddc4be7e59082cd5b593d24b901480a70c5aa50cc3102c	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:09.061	\N	\N	2026-05-11 23:28:09.064
cmp1u1d64002f12dmk1cmz9us	fdddc702ccdcfd891f6a75a3011cf82d2974be3c980034cb8e83f348d2ab2be0	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:06.887	2026-05-11 23:28:09.064	\N	2026-05-11 23:28:06.89
cmp1u1leh002x12dmd4004vqm	8d3d57270eb2e6d818b4cb25b0d77be12d7db210d068f82c346ef919d1491457	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:17.553	\N	\N	2026-05-11 23:28:17.558
cmp1u1ghy002n12dm3ssr51fu	d284b1be322949e35ede1b12cf4d75a28a8835b5c2c85572d35911c4319c74ac	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:11.202	2026-05-11 23:28:13.367	\N	2026-05-11 23:28:11.205
cmp1u1js2002v12dm1tvxnahj	12a2674b6b5dc683aa66807e5141cfa67ed742cd662dc3d8da8d4beca9d91e79	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:15.452	2026-05-11 23:28:17.555	\N	2026-05-11 23:28:15.456
cmp1u1js0002t12dm2zsa50xe	f3061bb49ffe210131ff5bcee38995b7d5a4a6f28fea312fdc8549528cd1a9e5	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:15.45	\N	\N	2026-05-11 23:28:15.455
cmp1u1i64002r12dmtixsewrm	1ef461d5e162dbceeb6b65df8b069c9675c9a74c9e869905638677f07e26b0e6	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:13.367	2026-05-11 23:28:15.452	\N	2026-05-11 23:28:13.371
cmp1u1n1c003112dm4qpovldr	a06319ddfe9d3c2eee9111479896ef7c8543a88047b1b0da66ec558cc3605260	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:19.672	\N	\N	2026-05-11 23:28:19.677
cmp1u1p1n003512dmwql4kvp7	a4dea3270cd2546ec5e129a3d93bc00c4cc714cdc7eb43b1d0efef1931a40600	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:22.275	\N	\N	2026-05-11 23:28:22.281
cmp1u1n1j003312dmla03kgda	7c05bf496f0ca44c4a8ceaa86ba228396eb9f3b0acfdb7958d3a712a612122a0	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:19.676	2026-05-11 23:28:22.277	\N	2026-05-11 23:28:19.684
cmp1u1p1p003712dm3mnklmuh	b1fb835c0fa80fa92ef82dfeba868a4dde0fbb411ec18eacd19c8ba32745050c	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:22.277	\N	\N	2026-05-11 23:28:22.282
cmp1u28vv003d12dmiyvmef0m	688e5e4e23cb48ea62e56dc11dd119df830f40312a6ce561b611d3a19de2d8b3	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:47.985	\N	\N	2026-05-11 23:28:47.995
cmp1tfeyd000v12dmxl9wblkg	8ef6c308845677c928c4e4d15cf97b37d4128792d607a53f130dca56511ecbba	cmp1rycpi000712dmboyku63e	2026-05-18 23:11:02.769	2026-05-11 23:41:21.473	\N	2026-05-11 23:11:02.772
cmp1u26qu003912dmqi91jib4	dee7ad69eeed3b266fff3e87aa3082f92685f12facb439650e43a8022f160516	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:45.212	2026-05-11 23:28:47.988	\N	2026-05-11 23:28:45.223
cmp1u28w0003f12dm7h3l7x88	759832b210d57ec07baaca531f7d63f6dbb6f84435670c32c1b3f98846d51437	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:47.988	2026-05-11 23:28:50.318	\N	2026-05-11 23:28:47.998
cmp1u3ear005v12dm8fsz3qja	04c2280934f4532ab218f9ae273299e801cbecb05396dd677baf820a7b2c4783	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:41.655	2026-05-11 23:29:43.837	\N	2026-05-11 23:29:41.663
cmp1u2aor003j12dmeg8h43gr	4d096de90576b84ccc26b18860dccb1bfbdf1f03686f4a2ce664aa00e28dd43e	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:50.319	2026-05-11 23:28:52.442	\N	2026-05-11 23:28:50.329
cmp1u2du3003p12dmua36fm4l	f81fac3f4e44e2094b38b5ed14ba2bb22dc93990a16295b7032ad7cac9952515	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:54.398	\N	\N	2026-05-11 23:28:54.41
cmp1u2cbq003n12dmynocnc69	61fec6c64d4c2a693742134e84c7923dfa84e7a619990b94943170b4c1757686	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:52.442	2026-05-11 23:28:54.409	\N	2026-05-11 23:28:52.453
cmp1u2gmp003v12dms4yk6aq3	5f8771c5786cf836ed9993a7a5d4f8a4d50dabdac55882392895c8d6a7e23d1b	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:58.018	2026-05-11 23:29:00.756	\N	2026-05-11 23:28:58.03
cmp1u2krw004112dmv2g9s47n	a5bbdcdd9ce41aa50e38509396549c45c0785a66fa216e140cc7cf3c54bac4fa	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:03.401	\N	\N	2026-05-11 23:29:03.403
cmp1u2iqs003z12dmbk3hgl3x	b4b9ff43e054301ae549c753466ea19fd1a78efc1e62d76b693833518ead9961	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:00.757	2026-05-11 23:29:03.402	\N	2026-05-11 23:29:00.769
cmp1u2mf6004712dmsq4day2y	85e69517a786bd78f91831235dc9f34da8deb3c5c229d5d0f95f8f123835b9f5	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:05.536	2026-05-11 23:29:07.747	\N	2026-05-11 23:29:05.537
cmp1u2prn004d12dmw7oty9ax	31243c99e51a7eb500bdfeb572b81fa0d00cdbfd407f940b865bab7b9b5e50e2	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:09.87	\N	\N	2026-05-11 23:29:09.873
cmp1u2o4n004b12dmvbpofoqt	e63050f09982e9272eb335fdb5371897d46af39c814ef916f7ceba8b946115cf	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:07.747	2026-05-11 23:29:09.871	\N	2026-05-11 23:29:07.75
cmp1u2rh2004i12dm9m4jewwo	b63b3af2232b5795a8ec0558e3310ccb2b8bf72c11c23542543c0eb715ed3ceb	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:12.082	\N	\N	2026-05-11 23:29:12.085
cmp1u2t48004l12dm4g6r0p8m	7c4ada93cefcdd461be6e291d5e798e2cf84b7072918f0eade206f3173d5017b	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:14.212	\N	\N	2026-05-11 23:29:14.215
cmp1u2vgq004p12dmxgaznplh	51c6c9406e815a58110aa2a71496168c3776f06de32a702444f0a7f330bc32d4	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:17.25	\N	\N	2026-05-11 23:29:17.255
cmp1u2y1k004t12dmw6tq4tv7	53e69bbcc9abc1d796e8a036cb9362d72c2de9d4db1aedd6c9fc9c90efadd638	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:20.582	\N	\N	2026-05-11 23:29:20.591
cmp1u2zp9004x12dmhrjfdj2v	5db9e7ae8013e02999d8d294d495b424d74c8d95c8765793537661e2cf2c526b	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:22.742	\N	\N	2026-05-11 23:29:22.749
cmp1u32w5005512dmivn92vmv	ab553d949a4439f9d5ea64b05d3c9d4e22117134b279a1f8da9548d4b32f12f3	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:26.878	\N	\N	2026-05-11 23:29:26.884
cmp1u31c6005312dmb7g2mo3v	dd4a4db6abe3375bee6eccad9d0a17bb70b3600da56a822762447882c1087901	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:24.863	2026-05-11 23:29:26.879	\N	2026-05-11 23:29:24.868
cmp1u34ht005912dmox5529vt	6fdab49b352eca6d42a77639a4bc2cb36de8148911c2802c462f4b624e21f19f	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:28.952	\N	\N	2026-05-11 23:29:28.959
cmp1u3831005h12dmdj4c0yte	1cb9b58ff64d90d9e0b4a35a10209ad308531608f5436c57c70583938c575332	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:33.598	\N	\N	2026-05-11 23:29:33.609
cmp1u365z005d12dmmx9ruzlf	eba8c80fc4668cff1e7e49ec086c0a0dfc76fb34ced36cae4321ba20f9788ffd	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:31.115	2026-05-11 23:29:33.592	\N	2026-05-11 23:29:31.123
cmp1u3cj0005p12dm46walmg6	a2450a7434ac47c716e023a9c03e17916acc0d1384e287129808fa199155d754	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:39.362	\N	\N	2026-05-11 23:29:39.37
cmp1u3acg005n12dmee1r5evz	9a827892aa89787fb8ccc297dc333fac6a54cb1c7d3be84e5ff049abdc87eb0c	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:36.517	2026-05-11 23:29:39.363	\N	2026-05-11 23:29:36.525
cmp1u2aoq003h12dms0wo9n39	59fa91a657fa2aff04ff57c9d75f30a8e619beabd37b4c5569e8b60ee2702761	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:50.317	\N	\N	2026-05-11 23:28:50.328
cmp1u2cbq003l12dm94h2w4hm	d6cd26e7e600ba426f80fc39c34f770ea525439b75d64727c918b6195c95f813	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:52.441	\N	\N	2026-05-11 23:28:52.452
cmp1u3eap005t12dmtep68ig3	97e988db3e1dc3efd403d9b18295cf6481718b72938b2a17ebb912d6e8343a4e	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:41.655	\N	\N	2026-05-11 23:29:41.663
cmp1u2gmn003t12dmywtzjgwm	fa75b5739047da3352c1fdda95cbabf6afe6a27302fb22ead90c06a5734a3dfc	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:58.017	\N	\N	2026-05-11 23:28:58.029
cmp1u2dug003r12dm2ojahfx6	ab819f07b2e164d2113f327109fd15e67f47a818b48ccb8527745ecd59d2345e	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:28:54.41	2026-05-11 23:28:58.018	\N	2026-05-11 23:28:54.421
cmp1u2iqq003x12dmbkfucrl0	eace8e0ba2045b9b7b8a1ac8f481e3968b24ea2ef347b7bb38fe5f83a78f7f5e	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:00.754	\N	\N	2026-05-11 23:29:00.768
cmp1u3cj1005r12dmjthoyjag	4a1d04afd496fdc3fda0f2cd757acb3abf362c60ad172dac754f4bf55133e381	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:39.364	2026-05-11 23:29:41.655	\N	2026-05-11 23:29:39.372
cmp1u2mf5004512dm2gi7s32n	0e29a392eb88dd3dd4ea228c095132aa4a15c93123547682e12baddcdc85546a	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:05.533	\N	\N	2026-05-11 23:29:05.536
cmp1u2krx004312dm2gfrvrr1	48fe722d2aab55bf5a4257c44f618fccb843f25cb7783479a8b56c462b0989a8	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:03.402	2026-05-11 23:29:05.535	\N	2026-05-11 23:29:03.404
cmp1u2o4j004912dmoeq0s565	0801d08cc370c0cc41758d1d65938d7f036b28343a839db6e66e4e6db972dcee	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:07.742	\N	\N	2026-05-11 23:29:07.745
cmp1u3fz9005x12dmc35v8am3	20893ade4e2942e1f21b33f662b4196609c4bf94a77316d4940f419e4fceba21	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:43.834	\N	\N	2026-05-11 23:29:43.844
cmp1u2prs004f12dmdodhnq6j	61408a50980c6c7407020e6c56474af80ba673ad789699bcfad29347afd02970	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:09.872	2026-05-11 23:29:12.081	\N	2026-05-11 23:29:09.876
cmp1u2rh2004j12dmdrtip61r	8f9ed319fee20b62339d151f12f2f715befd9eb1f07d9b7356b2372712583625	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:12.081	2026-05-11 23:29:14.215	\N	2026-05-11 23:29:12.084
cmp1u2t4c004n12dme9ocp0e7	d156ba4ccb0d5eef8249f3b8ccea56eb3da0e47766c0172a6d9b5a91c7535616	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:14.216	2026-05-11 23:29:17.249	\N	2026-05-11 23:29:14.219
cmp1u3hwn006112dmc9me79x3	0a70e682a742334ff0cd073689b701583a536e3f8ed536bf3195fa8cf785992f	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:46.331	\N	\N	2026-05-11 23:29:46.341
cmp1u2vgt004r12dmqvrvuglp	94ea3992b70bab8d1e5b3d5df7fc0eebe703af78084d39ae70881b93e34b57c8	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:17.249	2026-05-11 23:29:20.583	\N	2026-05-11 23:29:17.254
cmp1u3fzb005z12dmas2lu63c	acb5224c985ba72e99fad8fe01a915b512ab471fb17e0a778d23694c6eedfbd6	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:43.837	2026-05-11 23:29:46.336	\N	2026-05-11 23:29:43.845
cmp1u2y1k004v12dmdfdfaovk	8a2b47969255cea47afc1e18f97b73c3278e91e9cc929816e4022546343834ba	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:20.583	2026-05-11 23:29:22.745	\N	2026-05-11 23:29:20.594
cmp1u31c4005112dm72q6rvwa	59ab814a619432ed39a6e3b719a4979220f5b6db236fffcf63cf90405b288dd4	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:24.862	\N	\N	2026-05-11 23:29:24.867
cmp1u2zpb004z12dmx5osjxha	159a9eb9cbf434caa7eb58fe581a23c40c29c1c3052e0caad70772c1c0a8987d	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:22.745	2026-05-11 23:29:24.863	\N	2026-05-11 23:29:22.75
cmp1u3rt6006l12dm9zb7019p	df12509926b3a71d15542ddf4ef3f434d27a50852263487b513e2e2c8bae785f	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:59.164	\N	\N	2026-05-11 23:29:59.176
cmp1u32w7005712dmqclh1zph	6c811eb3cfd6ccdcfd2237f6c8baab61cda1475f8a514e8cef22ac08faed4a63	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:26.879	2026-05-11 23:29:28.958	\N	2026-05-11 23:29:26.884
cmp1u3jnn006512dmfjka422j	58457523ed4def86bd55a69a16795d3cfcbae38842ea290e74869a9952a7ba3a	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:48.6	\N	\N	2026-05-11 23:29:48.61
cmp1u365z005f12dmlp1rld8j	8b07adf4cc77126ea9af0ef31bd53ed85b5b1bf3cc166d371531f81f4499ec7f	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:31.117	\N	\N	2026-05-11 23:29:31.124
cmp1u34hz005b12dmgtu8u1fk	93d8d292237037ec28442f5ab047347b72c9ec160ec2771cfed880aadb785bf8	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:28.958	2026-05-11 23:29:31.115	\N	2026-05-11 23:29:28.965
cmp1u3hwv006312dmq62bkl49	b4bec88490fc44ec4fde36f1fb2a01a624a06d9a25c8a95a82008f9fa1baf771	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:46.337	2026-05-11 23:29:48.601	\N	2026-05-11 23:29:46.347
cmp1u3ab7005l12dm90cp6h1n	f4f23dd7ec351a8d0fdca51ddb015e2f4806503575a100107a1019dbadeefd45	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:36.467	\N	\N	2026-05-11 23:29:36.476
cmp1u383e005j12dmkl0p0mbd	ec7a76083d60bd252bbc88be89fa6dd000c02fd5cd27183fddc9da502aca6acf	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:33.593	2026-05-11 23:29:36.517	\N	2026-05-11 23:29:33.603
cmp1u3pg3006h12dmptw3o4p7	39ac1543ec34e0877761354f620e375ce2ba9eaa04e519043978ac09872dea73	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:56.098	2026-05-11 23:29:59.165	\N	2026-05-11 23:29:56.112
cmp1u3rt7006n12dmygpj9pbs	12562023d3528369bd0856e74486c60366206d3d2a172ec1202cdd9a58bbb140	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:59.166	\N	\N	2026-05-11 23:29:59.178
cmp1u3lo0006912dmdqid2du3	da205f24407b3dcbf7844bd262dc9808a63a47fe7a3e15fd4f2c4823490631c1	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:51.201	\N	\N	2026-05-11 23:29:51.213
cmp1u3jnq006712dmxvrl8fnb	37946a8e4f74f7b81f405d525a7f1271efaa7f9c590e4fdca037c92d600f3353	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:48.602	2026-05-11 23:29:51.216	\N	2026-05-11 23:29:48.611
cmp1uie9g006p12dmeonm0ejp	f7bec6862d4cbccfe74cab1e4b284ec518efb8eedc1a9ac50614a3bc395e08f7	cmp1rycpi000712dmboyku63e	2026-05-18 23:41:21.456	\N	\N	2026-05-11 23:41:21.458
cmp1u3nj3006e12dmvb1q7yt9	b22b04c911a90270a9578ea11838d617cee6951eb977c28df9f116743ff0d6d9	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:53.618	\N	\N	2026-05-11 23:29:53.629
cmp1u3loc006b12dmc9hsw4l9	37feb8ad6f5d52eaf060abb1fe636d910fb3573e580db8cbb9fc8e0d81656843	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:51.216	2026-05-11 23:29:53.616	\N	2026-05-11 23:29:51.226
cmp1u3pg5006j12dmr9gfqc3u	4b19a01d9f172532dd380938b249588c134006e9c8e6ea6816c9aa4f9051cbed	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:56.102	\N	\N	2026-05-11 23:29:56.114
cmp1u3nj3006f12dmsp5yidfy	c7bca60a89d509e60494b8adf38334baabb38704d2592acdd1ea78d0314636dc	cmo4xfky400071x08l2a3mbs4	2026-05-18 23:29:53.616	2026-05-11 23:29:56.098	\N	2026-05-11 23:29:53.629
cmp22qk0u007112dm0480pjgm	c2fd25890610c99bc0a4850cf5be28e3d20d0fcd85df0d8dbc288cede8304755	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:39.099	\N	\N	2026-05-12 03:31:39.101
cmp22qhar006x12dm7ioy8ys4	523ea3a0bdc421a9ab44145e85f80bb45e29c5d3d260b0a46f24133c78c7366e	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:35.568	\N	\N	2026-05-12 03:31:35.569
cmp22qfg6006t12dmvr8ue7xx	aa9dfbc8aded68ba1643fba733a59b347134125d677f1564a96fb227dd57d9f9	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:33.173	2026-05-12 03:31:35.576	\N	2026-05-12 03:31:33.175
cmp22qhay006z12dmj581geaa	150a9ecbdc6c4ff174bed95eb9b905074cd843617d8677c3ebc5f8b34b37cfdc	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:35.576	2026-05-12 03:31:39.101	\N	2026-05-12 03:31:35.577
cmp22qnt8007512dmnwtbrrd1	b8865ae7d29248567686e8f8b455b4f6b3a1ef0183530bb9f26684b841cf022e	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:44.004	\N	\N	2026-05-12 03:31:44.007
cmp22qk0w007312dmac7nr06l	dbfea7eadb26b3b55963aa6d70ce2e879000567c7114bd438bec566c5ce20755	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:39.101	2026-05-12 03:31:44.012	\N	2026-05-12 03:31:39.103
cmp22qs4z007912dmaukh99i4	a773d7aabea78522864195206f8f8ce08ffc81a0921b5e4234dddc0215b51a03	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:49.614	\N	\N	2026-05-12 03:31:49.617
cmp22qntl007712dmyghdy9g5	2e4ebe88398818251002e8915363fd6a84bdcc3462281cd60b21e51cebf5c5e5	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:44.013	2026-05-12 03:31:49.616	\N	2026-05-12 03:31:44.016
cmp1uie9x006r12dm7k0y02ad	e075ac43ef46e030e8e3b34c7a9a3cb8c3b922de8710f07a193cb89f659fe74b	cmp1rycpi000712dmboyku63e	2026-05-18 23:41:21.473	2026-05-12 03:33:30.586	\N	2026-05-11 23:41:21.476
cmp22qtqn007d12dmtn1vbicg	0d05c26d7979061edca76b1602c27f8a22751e69ee77d9ed843f694a24dc8154	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:51.691	\N	\N	2026-05-12 03:31:51.694
cmp22qs50007b12dmcrwhuda9	c3712daf5443a83e5f379751ed2aa21ec1ca96fa4ac7b5a0de7b9bf5120e764f	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:49.616	2026-05-12 03:31:51.694	\N	2026-05-12 03:31:49.618
cmp22qvsf007j12dmoaoxrrfh	2af990c2d8ef27ad9d339e45791ada1edfc69c8503bcbc9725d791e6d11fd082	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:54.345	\N	\N	2026-05-12 03:31:54.349
cmp22qy3b007l12dmz84fd8g3	283cd05af9263aabe9e3ccf391daeba26b5595d17d5577ffcbe79561b6d1c31c	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:57.332	\N	\N	2026-05-12 03:31:57.334
cmp22r09q007p12dmcjn8e7ff	222018ef978ef4503e29f1af8f8b8fc1ba0052b12d947b1fb6a4d1c1d7baafa3	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:00.154	\N	\N	2026-05-12 03:32:00.157
cmp22qy3q007n12dmzw76r9iu	6a5948b408029ef461686a1c4e0a74ce4db081c17eb502419a3000f86c020d22	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:57.346	2026-05-12 03:32:00.158	\N	2026-05-12 03:31:57.348
cmp22r2pt007v12dml33l3x7j	9ab35549f53374739b231afdca3aee6b96684d72a22b5487b0cc855b78b1d1be	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:03.32	2026-05-12 03:32:05.46	\N	2026-05-12 03:32:03.326
cmp22r6f9008112dmjmnast8a	b3733edce9a117791c755b915654e19102a0d609ed14f54752af456850c52fdc	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:08.129	\N	\N	2026-05-12 03:32:08.131
cmp22r4d4007z12dm5ircg4ek	0650ed12b632a96be37d779c079914965b9e4c0e2aae3fcb9aecc5be67c0a364	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:05.461	2026-05-12 03:32:08.133	\N	2026-05-12 03:32:05.462
cmp22ra2h008912dmurav87dr	70b1e825ced424dc1973cbb2c279890f7341ff88863ace0ceb17bc7fdd3b850a	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:12.854	\N	\N	2026-05-12 03:32:12.856
cmp22r8ha008712dmxxj0zfl9	3d2f9cc449ddc38c2396a79142bdfb2e36725d136f3b89e088e2057f691aa34e	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:10.794	2026-05-12 03:32:12.855	\N	2026-05-12 03:32:10.796
cmp22rc3z008d12dmyoqts76r	c774c6467fbb2939b6e1dc8fc734fac81e15f91de48e06eb83100c45750d94ee	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:15.499	\N	\N	2026-05-12 03:32:15.501
cmp22re7g008h12dmoh91nif5	a7184cc045ed27e328ad27ebbd75687de50441ff4315f1f6d7478b63e419fb12	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:18.216	\N	\N	2026-05-12 03:32:18.218
cmp22riz3008p12dmlz1n0u7j	d55a73ab124749ecc15609afe1bbf256cc17b7fda15118cbd47963927cc15029	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:24.396	\N	\N	2026-05-12 03:32:24.398
cmp22rgcf008n12dmc4gei51p	7e0d4e2f3092685a493a826880851dfd7e6aba1eb1b34f9e8f1a9ce57964be94	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:20.988	2026-05-12 03:32:24.415	\N	2026-05-12 03:32:20.99
cmp22rlau008t12dmu09g8ty7	7ed1a960091c6185e92089f41a8062f8f4a8dbd12fde43d1bf125247a47a4e92	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:27.41	\N	\N	2026-05-12 03:32:27.412
cmp22rizm008r12dmqqkzhbfv	e939bd42ad1375a0932754c4d1f68bc6c652f16e903c99150aae42ffed50bb45	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:24.415	2026-05-12 03:32:27.413	\N	2026-05-12 03:32:24.417
cmp22rse4009712dmkysl856x	cac6e7300c2a4e912d0c822f04ac901b76a5ec6c9e18cd5ebea9ec3faa1e6892	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:36.601	2026-05-12 03:32:39.424	\N	2026-05-12 03:32:36.603
cmp22rwu7009f12dmwpkyg3vm	ff57d7b606631f4c8cc15b27f816ef71842c8f25689a9a4865010e5edec9a782	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:42.36	2026-05-12 03:32:45.143	\N	2026-05-12 03:32:42.361
cmp22qtqo007f12dmga22d1h2	93495d6785cf24c94a1cd12cae8c4b1814a1f48d5973ff98dd0823018ab129d8	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:51.694	2026-05-12 03:31:54.343	\N	2026-05-12 03:31:51.695
cmp22qvsc007h12dmdzmnq8vc	d997fc591f0f4b548fdb1c97e533ab6e004aef6bf857be896122fdd1d7bea739	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:31:54.343	2026-05-12 03:31:57.346	\N	2026-05-12 03:31:54.346
cmp22r2ph007t12dmd5pep91f	7958f86b1e2d6cbf8da212cdfe186415d89f74e905c26b9b048810719f66b732	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:03.314	\N	\N	2026-05-12 03:32:03.316
cmp22r09u007r12dmu68il17w	ad7f2523130b0a725b9b27c2fbcd90ee2db452d1d58f199208e717a5523c3f03	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:00.159	2026-05-12 03:32:03.32	\N	2026-05-12 03:32:00.161
cmp22r4d3007x12dmz6rbrv9c	c62da920d42a2786fb9ca6f02d7168d916d6941bf4cca3eace2ab4a91c23b86c	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:05.46	\N	\N	2026-05-12 03:32:05.461
cmp22r8h9008512dmzel5zf1e	20b0b7bfee62131c257fa6f02b30b605ebeb3ae77289b501b1485c6b706972e9	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:10.793	\N	\N	2026-05-12 03:32:10.795
cmp22r6fe008312dmuuzg1udp	33c0a64232de711fcda7ccbc25b84bb05c2532a3838ec3af9e7504fcb1b956f0	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:08.134	2026-05-12 03:32:10.794	\N	2026-05-12 03:32:08.136
cmp22ra2i008b12dmd48gx2b3	3eeb4b9b4eeccf8e5f505341f155b55fff49702628f830b9bf4d4b6957ae170d	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:12.855	2026-05-12 03:32:15.505	\N	2026-05-12 03:32:12.857
cmp22rc45008f12dmy5g0xuve	c47aa5d5b94eb085b09546d47e6890dd58ebdf54b616055cd59ccf459419c3c6	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:15.506	2026-05-12 03:32:18.219	\N	2026-05-12 03:32:15.507
cmp22rgc4008l12dm7e5ld0pr	24857bcdfd1e167fb40eea7750cb6bb77bf3cab4c0daca09b9734e8f5d628878	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:20.976	\N	\N	2026-05-12 03:32:20.978
cmp22re7j008j12dmdwvbn1e8	1b79cb71edffb04a883de61a64beb1aeace1ae0a5a33dddff72883b010d30ca3	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:18.219	2026-05-12 03:32:20.988	\N	2026-05-12 03:32:18.221
cmp22rnod008z12dmm3s0ooss	4c29de5ca7fb7d063cba98ee1788542c88791f5071f81c8dcab481e39108701a	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:30.49	\N	\N	2026-05-12 03:32:30.492
cmp22rlaw008v12dmi69rm8oj	0eb20a42d6c71fc3bd890fa5be089ad854d59a327438476ea5c8bd6200cadbb3	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:27.413	2026-05-12 03:32:30.489	\N	2026-05-12 03:32:27.415
cmp22rsdz009512dmftmxxq2p	9a3d8b4e9ec3dd665f790dd315380707ba567b3d2eb7e29969915bc93f8fe7f0	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:36.596	\N	\N	2026-05-12 03:32:36.598
cmp22rpw7009312dm9d5y0x5e	433c3bcfa2545a76d6e1235a14273d6cb6804be31ab6ad595e5058d2bf1d38cb	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:33.365	2026-05-12 03:32:36.601	\N	2026-05-12 03:32:33.366
cmp22rwu2009d12dmb8vjquto	5e03db059da574fe1c12c24ede1cf15be7f9af3846511fc59795a2fc6a10c811	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:42.359	\N	\N	2026-05-12 03:32:42.36
cmp22rpw4009112dmsvxqny5m	87e84d9769c7997866f151b4dd421d23d06dbd0170ec6f7db0c311d4307fc879	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:33.361	\N	\N	2026-05-12 03:32:33.363
cmp22rnoc008x12dmkt976pyb	1857b6646ade8dacd3119f42b799c80ef8f92ee734fb359332e5901891f57179	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:30.489	2026-05-12 03:32:33.365	\N	2026-05-12 03:32:30.49
cmp22rukg009912dm55u399ox	4896a8a78a3e9199a36fde532b0f1341ac25914aab02b2ac428edcf3c572cf0c	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:39.419	\N	\N	2026-05-12 03:32:39.42
cmp22rukj009b12dmfv3srnj5	7819a1be2492484f7114d6a7f3595ff398303f3251dff526652267ffef595fa0	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:39.424	2026-05-12 03:32:42.36	\N	2026-05-12 03:32:39.426
cmp22ryz9009h12dmhpngp9gc	4c8857660ad5067833f83c5a6f858e6dc06937c13faee018eac7a0a2eb9ec7fb	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:45.139	\N	\N	2026-05-12 03:32:45.14
cmp22s1fd009l12dmog81qm4a	d605f7ddc36a15505fc73ab12c28679214c1b7c0ee93c11a4035eca0b77d3cfd	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:48.31	\N	\N	2026-05-12 03:32:48.311
cmp22ryze009j12dmmmw4bsvz	60087de6ed07f45b397dd8e9339d3088a52f9738300d7e1f83a85a5aa59690f3	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:45.144	2026-05-12 03:32:48.313	\N	2026-05-12 03:32:45.145
cmp22s3fx009p12dmwshe55ed	e539fdcbd6231db538b8407e0429f078577a3df3a96f59eb75b204e7f0dd3d23	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:50.922	\N	\N	2026-05-12 03:32:50.924
cmp22s1fh009n12dmyx0tcpzc	6337a61b8d059562647dd9adc2a6d74c623445c735a8b5fdf0edb51a5f46e43f	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:48.313	2026-05-12 03:32:50.923	\N	2026-05-12 03:32:48.315
cmp22s5yx009t12dmvsffi961	338dd1d55033c25b3a3b40657e89622c73473a2964fae03426dd31a49b2defd5	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:54.196	\N	\N	2026-05-12 03:32:54.199
cmp22s3g0009r12dmuuh34m11	a6cf4ef2de3b757e6d739b3561ff8a7fcd2a33c8367df79bed8206709b0f6211	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:50.924	2026-05-12 03:32:54.203	\N	2026-05-12 03:32:50.926
cmp22s8ar009x12dmaxh06mbo	f121b946dc78d6711c784befda6abbb0a12ff99ba412262840853672e4f7dd53	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:57.217	\N	\N	2026-05-12 03:32:57.218
cmp22s5z1009v12dmxivyww94	7d1cd0d74b98a5c9562f64a552202d96b7a99bcd0bec455d48bc9548927d8eb4	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:54.203	2026-05-12 03:32:57.218	\N	2026-05-12 03:32:54.204
cmp22savn00a112dmgzo8zvaq	0ff63704ab3b10f4a36e604120a3c9c0519c549c926b2d120244549ca5e730c6	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:33:00.56	\N	\N	2026-05-12 03:33:00.561
cmp22s8as009z12dmf04dj7wc	0cc0933da21975f0b4eb5f10d5b1ccd8b976630aa57b8a07de3ca129abf4050d	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:32:57.218	2026-05-12 03:33:00.561	\N	2026-05-12 03:32:57.219
cmp22sfdl00a512dm5vz193qg	a02a97de4948fdf61660b92d007e3081df84bf22929ea33152f5cf48593c0a11	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:33:06.39	\N	\N	2026-05-12 03:33:06.391
cmp22savn00a312dm4tipu4xy	a686a16f7dedc94ad2e30d0edbf094182d7e049d0306ea73d126fca0d8a4f22a	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:33:00.561	2026-05-12 03:33:06.393	\N	2026-05-12 03:33:00.562
cmp22shtx00a912dmuwl4262c	9a7190fc25292d7d05c25af3b7e9021fe752c3cadc5c3c889916294a5670bacc	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:33:09.566	\N	\N	2026-05-12 03:33:09.567
cmp22sfdp00a712dmvk41jin1	79f68f8c0b260366d23886910be2a66ea85bff7a5b26414079534b4780dcbe55	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:33:06.393	2026-05-12 03:33:09.567	\N	2026-05-12 03:33:06.395
cmp22shtz00ab12dmuza0rmml	0cfecf4641f962522474585c7d3711ec26d8263d6bd340198e8e5533924642dd	cmo4xfky400071x08l2a3mbs4	2026-05-19 03:33:09.568	\N	\N	2026-05-12 03:33:09.571
cmp22sy1p00ad12dmmj05bxzx	7c9012e7b6fc4514d0d45e505e79553bf0df25a94a11d0fdc9da32b89bb6b404	cmp1rycpi000712dmboyku63e	2026-05-19 03:33:30.584	\N	\N	2026-05-12 03:33:30.587
cmp22sy1t00af12dmp0nohc3v	dc03eef3735953f04456a1fb67b4bcc4ef05aa46369ccd1bacffa19ccd51f6b6	cmp1rycpi000712dmboyku63e	2026-05-19 03:33:30.586	\N	\N	2026-05-12 03:33:30.59
\.


--
-- Data for Name: stock_families; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_families (id, company_id, code, nom, description, created_at, updated_at) FROM stdin;
cmoe0r1nl00ekaz7crqtb5gv7	cmoe00wty003sanv8seavfjqn	PAP	Papeterie et fournitures bureau	\N	2026-04-25 07:29:34.497	2026-04-25 07:29:34.497
cmoe0r1o300elaz7cs3oarao0	cmoe00wty003sanv8seavfjqn	INFO	Matériel informatique et consommables	\N	2026-04-25 07:29:34.515	2026-04-25 07:29:34.515
cmoe0r1oe00emaz7cbgphuv2j	cmoe00wty003sanv8seavfjqn	NET	Réseau et câblage	\N	2026-04-25 07:29:34.527	2026-04-25 07:29:34.527
cmoe0r1os00enaz7cgcsyxe2f	cmoe00wty003sanv8seavfjqn	DIV	Divers	\N	2026-04-25 07:29:34.54	2026-04-25 07:29:34.54
\.


--
-- Data for Name: stock_lots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_lots (id, article_id, quantite_initiale, quantite_restante, prix_unitaire, date_entree, reference, is_epuise, created_at) FROM stdin;
cmoe0r1rh00eyaz7cgt710t4i	cmoe0r1qc00etaz7cuhyb8684	5.0000	5.0000	3100.0000	2026-02-15 00:00:00	BC-2026-011	f	2026-04-25 07:29:34.638
cmoe0r1rh00ezaz7cq6f3mwio	cmoe0r1qc00etaz7cuhyb8684	5.0000	3.0000	3200.0000	2026-03-20 00:00:00	BC-2026-019	f	2026-04-25 07:29:34.638
cmoe0r1rw00f0az7cxmmjtx8z	cmoe0r1qp00evaz7cx1qtfbgj	20.0000	20.0000	1500.0000	2026-03-10 00:00:00	BC-2026-017	f	2026-04-25 07:29:34.653
\.


--
-- Data for Name: stock_mouvements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stock_mouvements (id, company_id, article_id, type, quantite, prix_unitaire, prix_total, stock_avant, stock_apres, cmup_avant, cmup_apres, reference, description, invoice_id, fiscal_year_id, created_by, created_at) FROM stdin;
cmoe0r1se00f1az7c354m97xi	cmoe00wty003sanv8seavfjqn	cmoe0r1pe00epaz7cc43hz4az	ENTREE_ACHAT	50.0000	2500.0000	125000.0000	0.0000	50.0000	0.0000	2500.0000	BC-2026-001	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-01-10 00:00:00
cmoe0r1sf00f2az7c6w2gr4b2	cmoe00wty003sanv8seavfjqn	cmoe0r1pe00epaz7cc43hz4az	SORTIE_VENTE	20.0000	2500.0000	50000.0000	50.0000	30.0000	2500.0000	2500.0000	FAC-2026-003	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-01-25 00:00:00
cmoe0r1sf00f3az7c1v4dh6ma	cmoe00wty003sanv8seavfjqn	cmoe0r1pw00eraz7cn51ejphu	ENTREE_ACHAT	10.0000	14800.0000	148000.0000	0.0000	10.0000	0.0000	14800.0000	BC-2026-003	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-01-15 00:00:00
cmoe0r1sf00f4az7cvpzj7w97	cmoe00wty003sanv8seavfjqn	cmoe0r1pw00eraz7cn51ejphu	SORTIE_VENTE	5.0000	14800.0000	74000.0000	10.0000	5.0000	14800.0000	14800.0000	FAC-2026-007	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-02-10 00:00:00
cmoe0r1sf00f5az7c2hk98ien	cmoe00wty003sanv8seavfjqn	cmoe0r1pw00eraz7cn51ejphu	ENTREE_ACHAT	5.0000	15000.0000	75000.0000	5.0000	10.0000	14800.0000	14900.0000	BC-2026-009	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-02-20 00:00:00
cmoe0r1sf00f6az7cvxx3f59d	cmoe00wty003sanv8seavfjqn	cmoe0r1pw00eraz7cn51ejphu	SORTIE_VENTE	7.0000	14900.0000	104300.0000	10.0000	3.0000	14900.0000	14900.0000	FAC-2026-015	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-03-05 00:00:00
cmoe0r1sf00f7az7c1gat8ge9	cmoe00wty003sanv8seavfjqn	cmoe0r1pe00epaz7cc43hz4az	ENTREE_ACHAT	50.0000	2480.0000	124000.0000	30.0000	80.0000	2500.0000	2490.0000	BC-2026-012	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-03-01 00:00:00
cmoe0r1sf00f8az7clmp2qm9k	cmoe00wty003sanv8seavfjqn	cmoe0r1pe00epaz7cc43hz4az	SORTIE_VENTE	35.0000	2490.0000	87150.0000	80.0000	45.0000	2490.0000	2490.0000	FAC-2026-022	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-03-15 00:00:00
cmoe0r1sf00f9az7chwvyj1ii	cmoe00wty003sanv8seavfjqn	cmoe0r1qp00evaz7cx1qtfbgj	ENTREE_ACHAT	20.0000	1500.0000	30000.0000	0.0000	20.0000	0.0000	1500.0000	BC-2026-017	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-03-10 00:00:00
cmoe0r1sf00faaz7cqsxky66b	cmoe00wty003sanv8seavfjqn	cmoe0r1pe00epaz7cc43hz4az	SORTIE_VENTE	10.0000	2490.0000	24900.0000	45.0000	35.0000	2490.0000	2490.0000	FAC-2026-028	\N	\N	\N	cmoe00wu9003uanv8h810i81r	2026-04-10 00:00:00
\.


--
-- Data for Name: tax_configs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tax_configs (id, company_id, country, tax_regime, vat_regime, is_first_year, first_year_ca, igs_class, igs_amount, igs_payment_mode, igs_adherent_cga, regime_history, regime_change_alert, last_regime_check, next_regime_check, center_impots, niu, rccm, code_activite, profession_liberale, cnps_rate, is_rate, vat_rate, is_assujetti, created_at, updated_at) FROM stdin;
cmoe00yhe00eganv84jicd7nu	cmoe00ygr00ecanv8tdkgb4wc	CM	IGS	NON_ASSUJETTI	f	8500000.00	7	120000.00	ANNUEL	f	{"2024": "IGS", "2025": "IGS", "2026": "IGS"}	f	\N	\N	CDI Douala Bonanjo	P012345678901A	RC/DLA/2022/B/4521	4711Z	f	0.1620	0.3300	0.1925	f	2026-04-25 07:09:17.33	2026-04-25 07:29:34.445
cmospfp7i000110x0gb7dels8	cmo4xfkl000021x08yhdvbebz	CM	REEL_NORMAL	MENSUEL	f	\N	1	5000.00	\N	f	{"2026": "REEL_NORMAL", "2027": "IGS"}	f	\N	\N	DGI Douala	M000000001A	RC/DLA/2024/B/0001	\N	f	0.1620	0.3300	0.1925	t	2026-05-05 14:09:22.014	2026-05-05 14:42:42.588
cmoe00y1s00cianv8nova7pzz	cmoe00wty003sanv8seavfjqn	CM	REEL_NORMAL	MENSUEL	f	12000000.00	\N	\N	\N	f	{"2024": "REEL_NORMAL", "2025": "REEL_NORMAL", "2026": "REEL_NORMAL", "2027": "REEL_NORMAL"}	f	2026-04-26 00:57:54.907	2026-12-31 23:00:00	CDI Douala Wouri	M021512789456K	RC/DLA/2020/B/1247	7020Z	t	0.1720	0.3300	0.1925	t	2026-04-25 07:09:16.767	2026-05-11 20:22:36.719
\.


--
-- Data for Name: tax_declarations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.tax_declarations (id, company_id, type, period, year, month, quarter, base_amount, tax_amount, status, due_date, declared_at, paid_at, penalty_amount, reference, created_at, fiscal_year_id) FROM stdin;
cmoe00y2n00ckanv8kpwj134j	cmoe00wty003sanv8seavfjqn	TVA	01/2026	2026	1	\N	13275000.00	2558000.00	PAID	2026-02-15 00:00:00	\N	2026-02-10 00:00:00	0.00	\N	2026-04-25 07:09:16.799	\N
cmoe00y3500cmanv8kilirkxn	cmoe00wty003sanv8seavfjqn	TVA	02/2026	2026	2	\N	22010000.00	4238500.00	PAID	2026-03-15 00:00:00	\N	2026-03-12 00:00:00	0.00	\N	2026-04-25 07:09:16.817	\N
cmoe00y3e00coanv8yg3b5pjx	cmoe00wty003sanv8seavfjqn	TVA	03/2026	2026	3	\N	20330000.00	3914487.00	PENDING	2026-04-15 00:00:00	\N	\N	0.00	\N	2026-04-25 07:09:16.826	\N
cmoe00y3n00cqanv86syuwlyd	cmoe00wty003sanv8seavfjqn	IS_ACOMPTE	Acompte 1/2026	2026	\N	1	7656000.00	3828000.00	PAID	2026-02-15 00:00:00	\N	2026-02-10 00:00:00	0.00	\N	2026-04-25 07:09:16.835	\N
cmoe00y3x00csanv8wccxdonh	cmoe00wty003sanv8seavfjqn	IS_ACOMPTE	Acompte 2/2026	2026	\N	2	7656000.00	3828000.00	PENDING	2026-08-15 00:00:00	\N	\N	0.00	\N	2026-04-25 07:09:16.846	\N
cmoe00y4600cuanv8phr15yqp	cmoe00wty003sanv8seavfjqn	PATENTE	2026	2026	\N	\N	68500000.00	230000.00	PAID	2026-03-31 00:00:00	\N	2026-03-25 00:00:00	0.00	N°DGI/2026/PAT/00847	2026-04-25 07:09:16.854	\N
cmoe00y4e00cwanv8wtzgqra3	cmoe00wty003sanv8seavfjqn	RAS	01/2026	2026	1	\N	150000.00	7500.00	PAID	2026-02-15 00:00:00	\N	2026-02-10 00:00:00	0.00	\N	2026-04-25 07:09:16.862	\N
cmoe00y4j00cyanv851fnbu6i	cmoe00wty003sanv8seavfjqn	RAS	02/2026	2026	2	\N	200000.00	20000.00	PAID	2026-03-15 00:00:00	\N	2026-03-12 00:00:00	0.00	\N	2026-04-25 07:09:16.868	\N
cmoe00y4t00d0anv8sy5vdrup	cmoe00wty003sanv8seavfjqn	DSF	2024	2024	\N	\N	52300000.00	6124000.00	PAID	2025-03-15 00:00:00	2025-03-10 00:00:00	2025-03-10 00:00:00	0.00	\N	2026-04-25 07:09:16.877	\N
cmoe00y5200d2anv82zb7jpqa	cmoe00wty003sanv8seavfjqn	DSF	2025	2025	\N	\N	68500000.00	7656000.00	LATE	2026-03-15 00:00:00	\N	\N	0.00	\N	2026-04-25 07:09:16.887	\N
cmoe00y5e00d4anv8diz0agl6	cmoe00wty003sanv8seavfjqn	IS	2024	2024	\N	\N	18543000.00	6124000.00	PAID	2025-03-15 00:00:00	\N	2025-03-10 00:00:00	0.00	\N	2026-04-25 07:09:16.898	\N
cmoe00y5l00d6anv8gnhso7wd	cmoe00wty003sanv8seavfjqn	IS	2025	2025	\N	\N	23200000.00	7656000.00	DECLARED	2026-03-15 00:00:00	2026-03-10 00:00:00	\N	0.00	\N	2026-04-25 07:09:16.905	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, email, password_hash, account_type, role, first_name, last_name, is_active, company_id, cabinet_id, totp_secret, totp_enabled, failed_login_attempts, locked_until, last_login_at, created_at, updated_at, athenis_number, platform_role) FROM stdin;
cmo68wv3c000gikv6trg913mt	azer@gmail.com	$2a$12$NuvU0YCjY2fh7MOoOV8twePJZI..qBvEEpCobVASsMqbsCVcvyu3u	COMPANY	ADMIN	zaee	eee	t	cmo68wv31000eikv68dra4xh6	\N	\N	f	0	\N	2026-04-20 16:25:07.328	2026-04-19 20:55:53.448	2026-04-20 16:25:07.329	\N	USER
cmo6s72pa000pqye6tie3e9mh	azeraa@gmail.com	$2a$12$F8qglB42tlPIqmwraC3uneBhLhJFJZMBtnGfpm89hFdfISjzTjo/6	CABINET	ADMIN	azer	az	t	\N	cmo6s72p0000nqye6y7et8yns	\N	f	0	\N	2026-04-20 16:25:38.882	2026-04-20 05:55:42.574	2026-04-20 16:25:38.883	\N	USER
cmo6r2qkf0011ikv6w51wfo22	azerty@gmail.com	$2a$12$7x7HsFg2sXBjlkP0dxYtCePga4K/sntNbjjiKe5E8BfKRWW/P5wl2	PERSONAL	ADMIN	ulrichc	zzzz	t	\N	\N	\N	f	0	\N	\N	2026-04-20 05:24:20.607	2026-04-20 05:24:20.607	\N	USER
cmo6r3h8b001aikv6wjizkaty	azertyr@gmail.com	$2a$12$QwWkBE.hIct.yrS3uVbx3etQvsAZ9SlpjGpgndP63eLBSf8Kd9ObO	PERSONAL	ADMIN	ertty	eerr	t	\N	\N	\N	f	0	\N	\N	2026-04-20 05:24:55.164	2026-04-20 05:24:55.164	\N	USER
cmo6r5fvb001jikv61aco8voa	azera@gmail.com	$2a$12$Lmz2IXucfMDoSze60EqMLeOai3B01f/82xeF/HFofy/8pjhKg/VD6	PERSONAL	ADMIN	zerr	rrr	t	\N	\N	\N	f	0	\N	\N	2026-04-20 05:26:26.711	2026-04-20 05:26:26.711	\N	USER
cmo6s3gq70007qye6m4qvpxmx	azero@gmail.com	$2a$12$UGJHOzt1cKNUfU7AUyujR.aBjrBw2X8BNvecqihEeoU07TtPnNnHe	PERSONAL	ADMIN	aze	eee	t	\N	\N	\N	f	0	\N	\N	2026-04-20 05:52:54.127	2026-04-20 05:52:54.127	\N	USER
cmo7i3l5g002bttfvi95van66	perso@gmail.com	$2a$12$3ZgeoAPLY4F78.exD.ogwexiIBLcNLYw6tMm4YOtr4NG0CvKbBiTm	PERSONAL	ADMIN	ulrich	gger	t	\N	\N	\N	f	0	\N	\N	2026-04-20 18:00:49.876	2026-04-20 18:00:49.876	\N	USER
cmo6sxs3f0008jaau0v0nb1bt	azeer@gmail.com	$2a$12$WAbThFxP2dQhYkapXeY9Vuw6hSOPbViuIWSg6VvZIRSxtmsVKU97m	PERSONAL	ADMIN	err	rrr	t	\N	\N	\N	f	0	\N	\N	2026-04-20 06:16:28.54	2026-04-20 06:16:28.54	\N	USER
cmo6tto030000ttfvrr6tk40i	azerzz@gmail.com	$2a$12$zoOB4iBz0.snMhvjuB16t.AdlnRsAPq3oFlKuZono90kTPeyV2QHO	PERSONAL	ADMIN	aaa	zzz	t	\N	\N	\N	f	0	\N	\N	2026-04-20 06:41:16.228	2026-04-20 06:41:16.228	\N	USER
cmo7i7hp1002xttfv3plqhit2	cabinet@gmail.com	$2a$12$CdWH6aDOVnA52GxBbARugu6q4.oxggM9Zf1r0yToFMnPPd9R9n0Qy	CABINET	ADMIN	azer	typo	t	\N	cmo7i7hov002vttfv0jixq4i3	\N	f	0	\N	2026-04-20 18:05:15.308	2026-04-20 18:03:52.021	2026-04-20 18:05:15.309	\N	USER
cmo71zrh7000g8ffptovza7nl	comptable@demo.athenis.io	$2a$12$V0Y/vP2x.q7yePqoY8cLf.Ny8IVJ0CS4ZKSsJsSrksn9P9Radk0.m	COMPANY	COMPTABLE	Bernard	Durand	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-20 10:29:57.595	2026-04-20 10:29:57.595	\N	USER
cmo71zrhl000i8ffphy9u39j4	rh@demo.athenis.io	$2a$12$V0Y/vP2x.q7yePqoY8cLf.Ny8IVJ0CS4ZKSsJsSrksn9P9Radk0.m	COMPANY	RH	Claire	Petit	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-20 10:29:57.61	2026-04-20 10:29:57.61	\N	USER
cmo71zrhv000k8ffped4gva8r	juridique@demo.athenis.io	$2a$12$V0Y/vP2x.q7yePqoY8cLf.Ny8IVJ0CS4ZKSsJsSrksn9P9Radk0.m	COMPANY	JURIDIQUE	Élise	Bernard	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-20 10:29:57.619	2026-04-20 10:29:57.619	\N	USER
cmo71zri4000m8ffppkjn0pe9	viewer@demo.athenis.io	$2a$12$V0Y/vP2x.q7yePqoY8cLf.Ny8IVJ0CS4ZKSsJsSrksn9P9Radk0.m	COMPANY	READONLY	David	Leroy	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-20 10:29:57.628	2026-04-20 10:29:57.628	\N	USER
cmo71zrgz000e8ffp8f86bns1	demo@athenis.io	$2a$12$g0fjC7bk/P.mF/dHbn/EfuBav4WK1QycWsCTdce.badfwJKYjOFT2	COMPANY	ADMIN	Alex	Démo	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	1	\N	2026-04-21 07:36:53.175	2026-04-20 10:29:57.587	2026-05-08 21:54:37.33	\N	USER
cmo4xfkyu000b1x089kxz7zuw	rh@demo-sa.demo	$2a$12$ky8sBPuP1lZez.eFF6BP..pMAV9Vh81VMW72AMYv.Xl/0Vp1Bjc96	COMPANY	RH	Claire	Petit	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-18 22:46:45.222	2026-04-25 07:29:30.549	ATH-E-00008	USER
cmo4xfkz7000d1x083o4kh5b1	viewer@demo-sa.demo	$2a$12$ky8sBPuP1lZez.eFF6BP..pMAV9Vh81VMW72AMYv.Xl/0Vp1Bjc96	COMPANY	READONLY	David	Leroy	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-18 22:46:45.234	2026-04-25 07:29:30.552	ATH-E-00009	USER
cmo4xfkzm000f1x082c0zg6wa	juridique@demo-sa.demo	$2a$12$ky8sBPuP1lZez.eFF6BP..pMAV9Vh81VMW72AMYv.Xl/0Vp1Bjc96	COMPANY	JURIDIQUE	Elise	Bernard	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-18 22:46:45.25	2026-04-25 07:29:30.555	ATH-E-00010	USER
cmo4xfl02000h1x086b0hsx3c	expert@cabinet.demo	$2a$12$ky8sBPuP1lZez.eFF6BP..pMAV9Vh81VMW72AMYv.Xl/0Vp1Bjc96	CABINET	ADMIN	François	Expert	t	\N	cmo4xfkke00001x08juvbhn5s	\N	f	0	\N	2026-05-05 09:29:57.423	2026-04-18 22:46:45.266	2026-05-05 09:29:57.427	ATH-C-00001	USER
cmoe00w73000lanv8oj18k40p	demo-senegal@athenis.io	$2a$12$iTvAxUzHUQFfkHFDmtKrx.uILfexRVlpl5Il1rcMLWcYiLqk01ixi	COMPANY	ADMIN	Aminata	Diallo	t	cmoe00w4r0003anv87we7c147	\N	\N	f	0	\N	\N	2026-04-25 07:09:14.367	2026-04-25 07:29:30.566	ATH-E-00003	USER
cmo4xfkyj00091x088b88wghz	comptable@demo-sa.demo	$2a$12$ky8sBPuP1lZez.eFF6BP..pMAV9Vh81VMW72AMYv.Xl/0Vp1Bjc96	COMPANY	COMPTABLE	Bernard	Durand	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	2026-05-05 09:29:59.041	2026-04-18 22:46:45.21	2026-05-05 09:29:59.044	ATH-E-00007	USER
cmoe00w78000nanv8yejz07ve	demo-usa@athenis.io	$2a$12$iTvAxUzHUQFfkHFDmtKrx.uILfexRVlpl5Il1rcMLWcYiLqk01ixi	COMPANY	ADMIN	John	Smith	t	cmoe00w4y0004anv8gyccjwse	\N	\N	f	0	\N	\N	2026-04-25 07:09:14.373	2026-04-25 07:29:30.569	ATH-E-00006	USER
cmo4xfkxg00051x08vonvclre	marie@personal.demo	$2a$12$ky8sBPuP1lZez.eFF6BP..pMAV9Vh81VMW72AMYv.Xl/0Vp1Bjc96	PERSONAL	ADMIN	Marie	Dubois	t	\N	\N	\N	f	0	\N	2026-05-05 09:29:55.96	2026-04-18 22:46:45.172	2026-05-05 09:29:55.963	ATH-P-00001	USER
cmoe00x2n003wanv8ok8708pu	carine.ekodeck@ubm.cm	$2a$12$zNFcuBYbCr2HwjdvrtC5eOhQ884ju6EhOIaBUqh1GhjLgpqs2r3/2	COMPANY	COMPTABLE	Carine	Ekodeck	t	cmoe00wty003sanv8seavfjqn	\N	\N	t	0	\N	\N	2026-04-25 07:09:15.503	2026-04-25 07:29:31.629	ATH-E-00011	USER
cmoe00w7f000panv8mfnv7nwa	demo-france@athenis.io	$2a$12$iTvAxUzHUQFfkHFDmtKrx.uILfexRVlpl5Il1rcMLWcYiLqk01ixi	COMPANY	ADMIN	Léa	Dupont	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	\N	2026-04-25 07:09:14.379	2026-04-25 07:29:30.572	ATH-E-00002	USER
cmoe00xbs003yanv8vp531l6k	romuald.essomba@ubm.cm	$2a$12$1zHXUDyoVCfzq7ak6T1W0uIwKY7BjAr49Efg/2u/8JGvvGNZjaHLS	COMPANY	READONLY	Romuald	Essomba	t	cmoe00wty003sanv8seavfjqn	\N	\N	f	0	\N	\N	2026-04-25 07:09:15.832	2026-04-25 07:29:31.98	ATH-E-00012	USER
cmoe00yh800eeanv8eakn5nx2	demo-igs@athenis.io	$2a$12$JhYcMERvvzU2K8c1/BBFc.4amn3N3EzoPnRSL/F4Xo4uXhrZteBie	COMPANY	ADMIN	Paul	Atanga	t	cmoe00ygr00ecanv8tdkgb4wc	\N	\N	f	0	\N	\N	2026-04-25 07:09:17.324	2026-04-25 07:29:34.433	ATH-E-00005	USER
cmoopvlb70000xqddt3etffru	superadmin@athenis.io	$2a$12$g0fjC7bk/P.mF/dHbn/EfuBav4WK1QycWsCTdce.badfwJKYjOFT2	PERSONAL	ADMIN	Admin	Super	t	\N	\N	\N	f	0	\N	2026-05-02 20:50:13.002	2026-05-02 19:10:38.755	2026-05-02 20:50:13.003	\N	SUPER_ADMIN
cmoe00wu9003uanv8h810i81r	ubm@comptalia.fr	$2a$12$g0fjC7bk/P.mF/dHbn/EfuBav4WK1QycWsCTdce.badfwJKYjOFT2	COMPANY	ADMIN	Urbain	Bello Moukouri	t	cmoe00wty003sanv8seavfjqn	\N	\N	f	0	\N	2026-05-11 20:41:55.711	2026-04-25 07:09:15.201	2026-05-11 20:41:55.712	ATH-E-00004	USER
cmo5wm55t0000twmc1xh0znn3	test@test.com	$2a$12$NQ4LfDh0CmVOFsSTRngsWOXCyFOjJVB4fmQWGxI07KZNaXZ7kiGFS	PERSONAL	ADMIN		\N	t	\N	\N	\N	f	0	\N	\N	2026-04-19 15:11:37.888	2026-04-19 15:11:37.888	\N	USER
cmo68cxkt0003ikv6yqjzmol3	test@example.com	$2a$12$SFCe9VlbJTqbGWmBZ2Cy/uSJ2n70NQqheuF0T/9NVqUSkkenRsgTe	COMPANY	ADMIN		\N	t	cmo68cxjy0001ikv6lbj1fspu	\N	\N	f	0	\N	\N	2026-04-19 20:40:23.548	2026-04-19 20:40:23.548	\N	USER
cmo68f70a0008ikv6fvphkg7r	demo2@example.com	$2a$12$5n03XUmxljsOkM.nxQIHhurew27ipf5LTLdlhv2lyxCeZlGviwmp2	PERSONAL	ADMIN		\N	t	\N	\N	\N	f	0	\N	\N	2026-04-19 20:42:09.082	2026-04-19 20:42:09.082	\N	USER
cmo6s20ij0000qye6w1hbhegk	test2@test.com	$2a$12$e5c/N/pC4adrt2YpNOTxhuQIKby.l3yNE8fnUGhz94qjY.UAa6BVu	PERSONAL	ADMIN		\N	t	\N	\N	\N	f	0	\N	\N	2026-04-20 05:51:46.46	2026-04-20 05:51:46.46	\N	USER
cmp1pp7rv000juz8nox897vhj	paul.test@demo.cm	$2a$12$BbdHcMlDXJvx1zmN.MyzSuXDQ6kdbAsqBakSJd5qKMlIGKN5NmB16	COMPANY	ADMIN	Paul	Martin	t	cmp1pp7rt000huz8n1u41fh81	\N	\N	f	0	\N	\N	2026-05-11 21:26:41.563	2026-05-11 21:26:41.563	ATH-E-00013	USER
cmp1pph99000tuz8n16qmv7g5	test.final2@demo.cm	$2a$12$31QyiDsgJhlR4hViwD3oQeTBUHmKSusGL5cAydENfwiQWUS6EE4tG	COMPANY	ADMIN	Alice	Dupont	t	cmp1pph96000ruz8no7qqhurn	\N	\N	f	0	\N	\N	2026-05-11 21:26:53.853	2026-05-11 21:26:53.853	ATH-E-00014	USER
cmp1q9iep0013uz8n0yur9qel	test.nouveau@demo.cm	$2a$12$6dtS5eVVUAtVeKQ3uoVI9ePW6PBnP7ImT9YjjPibDqycRAGjGdpHO	COMPANY	ADMIN	Test	User	t	cmp1q9iei0011uz8n5z0h26le	\N	\N	f	0	\N	\N	2026-05-11 21:42:28.465	2026-05-11 21:42:28.465	ATH-E-00015	USER
cmp1qd22a001juz8nktpfznio	jean.dupont.test@demo.cm	$2a$12$dxwcTwjPwnFU9zQA/Cd6.u44I5VsUt9XsWtRjJX.366id/oHDIqzS	COMPANY	ADMIN	Jean	Dupont	t	cmp1qd220001guz8nmwghk5so	\N	\N	f	0	\N	\N	2026-05-11 21:45:13.905	2026-05-11 21:45:13.905	ATH-E-00016	USER
cmp1rbuj3001uuz8nd5aummwg	asu@gmail.com	$2a$12$wdg.8wTX3v5JPXdKyJtDPuBFQRuINK0xxbJS/qv1jo2UuJFBHcyUO	PERSONAL	ADMIN	azeet	rrrr	t	\N	\N	\N	f	0	\N	\N	2026-05-11 22:12:17.102	2026-05-11 22:12:17.102	ATH-P-00002	USER
cmp1rpitl0007yqt1fhm4p3vf	aquo@comptalia.fr	$2a$12$k89aT0jAW9XTi11UK6UCNeVY9tpt8x/0TLhkHTJ755XxryR6yp/C2	COMPANY	ADMIN	zera	ery	t	cmp1rpitd0005yqt1prybxrn7	\N	\N	f	0	\N	\N	2026-05-11 22:22:55.113	2026-05-11 22:22:55.113	ATH-E-00018	USER
cmp1rqk2e000jyqt1rgi6bncp	aqmop@comptalia.fr	$2a$12$yMsC/7Gbcm.wdH.0wZL9heycpucGcylRhF/CAADnLGMG0cMkqp5ku	COMPANY	ADMIN	aquous	sddc	t	cmp1rqk26000hyqt1x1k6cqr2	\N	\N	f	0	\N	\N	2026-05-11 22:23:43.382	2026-05-11 22:23:43.382	ATH-E-00019	USER
cmp1rs4r8000syqt1lgtewdo9	bto@comptalia.fr	$2a$12$KZl.TtdAE/dLxpnbnERmy.g/EEmfVkdqtUvJgOOX85OCKXBzPAWz2	PERSONAL	ADMIN	dfr	tttt	t	\N	\N	\N	f	0	\N	\N	2026-05-11 22:24:56.852	2026-05-11 22:24:56.852	ATH-P-00003	USER
cmp1rycpi000712dmboyku63e	acu@comptalia.fr	$2a$12$pK2hy3ilh1uGDyk07oQTu.dZ22pkJPllLEeQNCLqglkS0zRM5nlWm	COMPANY	ADMIN	acu	om	t	cmp1rycpa000512dmx4xmqwx7	\N	\N	f	0	\N	\N	2026-05-11 22:29:47.094	2026-05-11 22:29:47.094	ATH-E-00020	USER
cmo4xfky400071x08l2a3mbs4	admin@demo-sa.demo	$2a$12$ky8sBPuP1lZez.eFF6BP..pMAV9Vh81VMW72AMYv.Xl/0Vp1Bjc96	COMPANY	ADMIN	Alice	Martin	t	cmo4xfkl000021x08yhdvbebz	\N	\N	f	0	\N	2026-05-12 03:31:33.189	2026-04-18 22:46:45.196	2026-05-12 03:31:33.191	ATH-E-00001	USER
\.


--
-- Data for Name: vat_declarations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vat_declarations (id, company_id, fiscal_year_id, quarter, year, tva_collectee, tva_deductible, tva_nette, status, filed_at, created_at) FROM stdin;
cmoe00wga0031anv8ncfdhbo9	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	1	2026	4100.00	1200.00	2900.00	FILED	2026-04-20 00:00:00	2026-04-25 07:09:14.698
cmoe00wgn0033anv8tpqud8es	cmo4xfkl000021x08yhdvbebz	cmoe00wde001lanv89fdntjh0	2	2026	0.00	0.00	0.00	DRAFT	\N	2026-04-25 07:09:14.711
cmoe00xwh00akanv8lwnogdv4	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	1	2026	3682250.00	1124250.00	2558000.00	FILED	2026-02-15 00:00:00	2026-04-25 07:09:16.577
cmoe00xwv00amanv80p58rntj	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	2	2026	5191000.00	952500.00	4238500.00	FILED	2026-03-15 00:00:00	2026-04-25 07:09:16.591
cmoe00xx500aoanv8y9act7ea	cmoe00wty003sanv8seavfjqn	cmoe00xgj0046anv8uircw5kh	3	2026	4046250.00	791250.00	3255000.00	DRAFT	\N	2026-04-25 07:09:16.601
\.


--
-- Data for Name: work_schedules; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.work_schedules (id, company_id, employee_id, week_start, monday, tuesday, wednesday, thursday, friday, created_at, updated_at) FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_plans account_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_plans
    ADD CONSTRAINT account_plans_pkey PRIMARY KEY (id);


--
-- Name: account_reviews account_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reviews
    ADD CONSTRAINT account_reviews_pkey PRIMARY KEY (id);


--
-- Name: agence_members agence_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agence_members
    ADD CONSTRAINT agence_members_pkey PRIMARY KEY (id);


--
-- Name: agences agences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agences
    ADD CONSTRAINT agences_pkey PRIMARY KEY (id);


--
-- Name: ai_conversations ai_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);


--
-- Name: ai_messages ai_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);


--
-- Name: annual_reviews annual_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_reviews
    ADD CONSTRAINT annual_reviews_pkey PRIMARY KEY (id);


--
-- Name: articles articles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_pkey PRIMARY KEY (id);


--
-- Name: asset_depreciations asset_depreciations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_depreciations
    ADD CONSTRAINT asset_depreciations_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: athenis_counters athenis_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athenis_counters
    ADD CONSTRAINT athenis_counters_pkey PRIMARY KEY (id);


--
-- Name: athenis_counters athenis_counters_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.athenis_counters
    ADD CONSTRAINT athenis_counters_type_key UNIQUE (type);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: cabinet_invitations cabinet_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinet_invitations
    ADD CONSTRAINT cabinet_invitations_pkey PRIMARY KEY (id);


--
-- Name: cabinets cabinets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinets
    ADD CONSTRAINT cabinets_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_roles company_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_pkey PRIMARY KEY (id);


--
-- Name: company_users company_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_pkey PRIMARY KEY (id);


--
-- Name: contract_signatures contract_signatures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_signatures
    ADD CONSTRAINT contract_signatures_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: esg_actions esg_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esg_actions
    ADD CONSTRAINT esg_actions_pkey PRIMARY KEY (id);


--
-- Name: esg_data esg_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esg_data
    ADD CONSTRAINT esg_data_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fiscal_year_closes fiscal_year_closes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_closes
    ADD CONSTRAINT fiscal_year_closes_pkey PRIMARY KEY (id);


--
-- Name: fiscal_years fiscal_years_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_pkey PRIMARY KEY (id);


--
-- Name: gdpr_entries gdpr_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_entries
    ADD CONSTRAINT gdpr_entries_pkey PRIMARY KEY (id);


--
-- Name: igs_baremes igs_baremes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.igs_baremes
    ADD CONSTRAINT igs_baremes_pkey PRIMARY KEY (id);


--
-- Name: invitations invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: leave_requests leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_pkey PRIMARY KEY (id);


--
-- Name: legal_alerts legal_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_alerts
    ADD CONSTRAINT legal_alerts_pkey PRIMARY KEY (id);


--
-- Name: legal_contracts legal_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_contracts
    ADD CONSTRAINT legal_contracts_pkey PRIMARY KEY (id);


--
-- Name: mandats mandats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mandats
    ADD CONSTRAINT mandats_pkey PRIMARY KEY (id);


--
-- Name: personal_comptes personal_comptes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_comptes
    ADD CONSTRAINT personal_comptes_pkey PRIMARY KEY (id);


--
-- Name: personal_depenses personal_depenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_depenses
    ADD CONSTRAINT personal_depenses_pkey PRIMARY KEY (id);


--
-- Name: personal_objectifs personal_objectifs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_objectifs
    ADD CONSTRAINT personal_objectifs_pkey PRIMARY KEY (id);


--
-- Name: personal_profiles personal_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_profiles
    ADD CONSTRAINT personal_profiles_pkey PRIMARY KEY (id);


--
-- Name: personal_revenus personal_revenus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_revenus
    ADD CONSTRAINT personal_revenus_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: recurring_invoices recurring_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT recurring_invoices_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: stock_families stock_families_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_families
    ADD CONSTRAINT stock_families_pkey PRIMARY KEY (id);


--
-- Name: stock_lots stock_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_lots
    ADD CONSTRAINT stock_lots_pkey PRIMARY KEY (id);


--
-- Name: stock_mouvements stock_mouvements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_mouvements
    ADD CONSTRAINT stock_mouvements_pkey PRIMARY KEY (id);


--
-- Name: tax_configs tax_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_configs
    ADD CONSTRAINT tax_configs_pkey PRIMARY KEY (id);


--
-- Name: tax_declarations tax_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_declarations
    ADD CONSTRAINT tax_declarations_pkey PRIMARY KEY (id);


--
-- Name: users users_athenis_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_athenis_number_key UNIQUE (athenis_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vat_declarations vat_declarations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vat_declarations
    ADD CONSTRAINT vat_declarations_pkey PRIMARY KEY (id);


--
-- Name: work_schedules work_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT work_schedules_pkey PRIMARY KEY (id);


--
-- Name: account_plans_company_id_classe_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_plans_company_id_classe_idx ON public.account_plans USING btree (company_id, classe);


--
-- Name: account_plans_company_id_numero_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX account_plans_company_id_numero_key ON public.account_plans USING btree (company_id, numero);


--
-- Name: account_reviews_company_id_year_cycle_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX account_reviews_company_id_year_cycle_idx ON public.account_reviews USING btree (company_id, year, cycle);


--
-- Name: account_reviews_uniq_fy_account; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX account_reviews_uniq_fy_account ON public.account_reviews USING btree (company_id, fiscal_year_id, account_number);


--
-- Name: agence_members_agence_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agence_members_agence_id_idx ON public.agence_members USING btree (agence_id);


--
-- Name: agence_members_company_member_id_agence_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agence_members_company_member_id_agence_id_key ON public.agence_members USING btree (company_member_id, agence_id);


--
-- Name: agences_company_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX agences_company_id_code_key ON public.agences USING btree (company_id, code);


--
-- Name: agences_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX agences_company_id_idx ON public.agences USING btree (company_id);


--
-- Name: ai_conversations_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_conversations_company_id_idx ON public.ai_conversations USING btree (company_id);


--
-- Name: ai_messages_conversation_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_messages_conversation_id_idx ON public.ai_messages USING btree (conversation_id);


--
-- Name: annual_reviews_company_id_employee_id_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX annual_reviews_company_id_employee_id_year_key ON public.annual_reviews USING btree (company_id, employee_id, year);


--
-- Name: annual_reviews_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX annual_reviews_company_id_idx ON public.annual_reviews USING btree (company_id);


--
-- Name: annual_reviews_employee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX annual_reviews_employee_id_idx ON public.annual_reviews USING btree (employee_id);


--
-- Name: articles_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_company_id_idx ON public.articles USING btree (company_id);


--
-- Name: articles_company_id_reference_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX articles_company_id_reference_key ON public.articles USING btree (company_id, reference);


--
-- Name: articles_famille_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX articles_famille_id_idx ON public.articles USING btree (famille_id);


--
-- Name: asset_depreciations_asset_id_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX asset_depreciations_asset_id_year_key ON public.asset_depreciations USING btree (asset_id, year);


--
-- Name: assets_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assets_company_id_idx ON public.assets USING btree (company_id);


--
-- Name: attachments_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_company_id_idx ON public.attachments USING btree (company_id);


--
-- Name: attachments_expense_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_expense_id_idx ON public.attachments USING btree (expense_id);


--
-- Name: attachments_invoice_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attachments_invoice_id_idx ON public.attachments USING btree (invoice_id);


--
-- Name: attachments_storage_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX attachments_storage_key_key ON public.attachments USING btree (storage_key);


--
-- Name: audit_logs_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_action_idx ON public.audit_logs USING btree (action);


--
-- Name: audit_logs_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_company_id_idx ON public.audit_logs USING btree (company_id);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at);


--
-- Name: audit_logs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_user_id_idx ON public.audit_logs USING btree (user_id);


--
-- Name: bank_transactions_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_transactions_company_id_idx ON public.bank_transactions USING btree (company_id);


--
-- Name: bank_transactions_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_transactions_date_idx ON public.bank_transactions USING btree (date);


--
-- Name: bank_transactions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bank_transactions_status_idx ON public.bank_transactions USING btree (status);


--
-- Name: cabinet_invitations_cabinet_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cabinet_invitations_cabinet_id_idx ON public.cabinet_invitations USING btree (cabinet_id);


--
-- Name: cabinet_invitations_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cabinet_invitations_token_idx ON public.cabinet_invitations USING btree (token);


--
-- Name: cabinet_invitations_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cabinet_invitations_token_key ON public.cabinet_invitations USING btree (token);


--
-- Name: cabinets_siret_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cabinets_siret_key ON public.cabinets USING btree (siret);


--
-- Name: clients_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX clients_company_id_idx ON public.clients USING btree (company_id);


--
-- Name: companies_cabinet_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX companies_cabinet_id_idx ON public.companies USING btree (cabinet_id);


--
-- Name: companies_siren_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX companies_siren_key ON public.companies USING btree (siren);


--
-- Name: company_roles_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_roles_company_id_idx ON public.company_roles USING btree (company_id);


--
-- Name: company_roles_company_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX company_roles_company_id_name_key ON public.company_roles USING btree (company_id, name);


--
-- Name: company_users_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_users_company_id_idx ON public.company_users USING btree (company_id);


--
-- Name: company_users_company_id_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX company_users_company_id_user_id_key ON public.company_users USING btree (company_id, user_id);


--
-- Name: contract_signatures_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_signatures_contract_id_idx ON public.contract_signatures USING btree (contract_id);


--
-- Name: contract_signatures_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX contract_signatures_token_idx ON public.contract_signatures USING btree (token);


--
-- Name: contract_signatures_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX contract_signatures_token_key ON public.contract_signatures USING btree (token);


--
-- Name: employees_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX employees_company_id_idx ON public.employees USING btree (company_id);


--
-- Name: esg_actions_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX esg_actions_company_id_idx ON public.esg_actions USING btree (company_id);


--
-- Name: esg_actions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX esg_actions_status_idx ON public.esg_actions USING btree (status);


--
-- Name: esg_data_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX esg_data_company_id_idx ON public.esg_data USING btree (company_id);


--
-- Name: esg_data_company_id_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX esg_data_company_id_year_key ON public.esg_data USING btree (company_id, year);


--
-- Name: expenses_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_company_id_idx ON public.expenses USING btree (company_id);


--
-- Name: expenses_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_date_idx ON public.expenses USING btree (date);


--
-- Name: expenses_fiscal_year_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX expenses_fiscal_year_id_idx ON public.expenses USING btree (fiscal_year_id);


--
-- Name: fiscal_year_closes_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fiscal_year_closes_company_id_idx ON public.fiscal_year_closes USING btree (company_id);


--
-- Name: fiscal_year_closes_company_id_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fiscal_year_closes_company_id_year_key ON public.fiscal_year_closes USING btree (company_id, year);


--
-- Name: fiscal_years_company_id_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX fiscal_years_company_id_status_idx ON public.fiscal_years USING btree (company_id, status);


--
-- Name: fiscal_years_company_id_year_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fiscal_years_company_id_year_key ON public.fiscal_years USING btree (company_id, year);


--
-- Name: gdpr_entries_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX gdpr_entries_company_id_idx ON public.gdpr_entries USING btree (company_id);


--
-- Name: igs_baremes_classe_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX igs_baremes_classe_key ON public.igs_baremes USING btree (classe);


--
-- Name: invitations_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invitations_company_id_idx ON public.invitations USING btree (company_id);


--
-- Name: invitations_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invitations_token_idx ON public.invitations USING btree (token);


--
-- Name: invitations_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invitations_token_key ON public.invitations USING btree (token);


--
-- Name: invoices_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_client_id_idx ON public.invoices USING btree (client_id);


--
-- Name: invoices_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_company_id_idx ON public.invoices USING btree (company_id);


--
-- Name: invoices_company_id_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_company_id_number_key ON public.invoices USING btree (company_id, number);


--
-- Name: invoices_fiscal_year_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_fiscal_year_id_idx ON public.invoices USING btree (fiscal_year_id);


--
-- Name: invoices_quote_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX invoices_quote_id_key ON public.invoices USING btree (quote_id);


--
-- Name: invoices_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX invoices_status_idx ON public.invoices USING btree (status);


--
-- Name: journal_entries_account_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_account_idx ON public.journal_entries USING btree (account);


--
-- Name: journal_entries_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_company_id_idx ON public.journal_entries USING btree (company_id);


--
-- Name: journal_entries_fiscal_year_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_fiscal_year_id_idx ON public.journal_entries USING btree (fiscal_year_id);


--
-- Name: journal_entries_piece_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_piece_id_idx ON public.journal_entries USING btree (piece_id) WHERE (piece_id IS NOT NULL);


--
-- Name: leave_requests_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leave_requests_company_id_idx ON public.leave_requests USING btree (company_id);


--
-- Name: leave_requests_employee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leave_requests_employee_id_idx ON public.leave_requests USING btree (employee_id);


--
-- Name: leave_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leave_requests_status_idx ON public.leave_requests USING btree (status);


--
-- Name: legal_alerts_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX legal_alerts_company_id_idx ON public.legal_alerts USING btree (company_id);


--
-- Name: legal_alerts_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX legal_alerts_severity_idx ON public.legal_alerts USING btree (severity);


--
-- Name: legal_alerts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX legal_alerts_status_idx ON public.legal_alerts USING btree (status);


--
-- Name: legal_contracts_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX legal_contracts_company_id_idx ON public.legal_contracts USING btree (company_id);


--
-- Name: legal_contracts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX legal_contracts_status_idx ON public.legal_contracts USING btree (status);


--
-- Name: legal_contracts_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX legal_contracts_type_idx ON public.legal_contracts USING btree (type);


--
-- Name: mandats_cabinet_id_company_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX mandats_cabinet_id_company_id_key ON public.mandats USING btree (cabinet_id, company_id);


--
-- Name: mandats_cabinet_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mandats_cabinet_id_idx ON public.mandats USING btree (cabinet_id);


--
-- Name: mandats_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX mandats_company_id_idx ON public.mandats USING btree (company_id);


--
-- Name: personal_comptes_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_comptes_user_id_idx ON public.personal_comptes USING btree (user_id);


--
-- Name: personal_depenses_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_depenses_user_id_idx ON public.personal_depenses USING btree (user_id);


--
-- Name: personal_objectifs_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_objectifs_user_id_idx ON public.personal_objectifs USING btree (user_id);


--
-- Name: personal_profiles_user_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX personal_profiles_user_id_key ON public.personal_profiles USING btree (user_id);


--
-- Name: personal_revenus_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX personal_revenus_user_id_idx ON public.personal_revenus USING btree (user_id);


--
-- Name: quotes_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_client_id_idx ON public.quotes USING btree (client_id);


--
-- Name: quotes_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX quotes_company_id_idx ON public.quotes USING btree (company_id);


--
-- Name: quotes_company_id_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX quotes_company_id_number_key ON public.quotes USING btree (company_id, number);


--
-- Name: recurring_invoices_client_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recurring_invoices_client_id_idx ON public.recurring_invoices USING btree (client_id);


--
-- Name: recurring_invoices_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX recurring_invoices_company_id_idx ON public.recurring_invoices USING btree (company_id);


--
-- Name: refresh_tokens_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_expires_at_idx ON public.refresh_tokens USING btree (expires_at);


--
-- Name: refresh_tokens_token_hash_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON public.refresh_tokens USING btree (token_hash);


--
-- Name: refresh_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_user_id_idx ON public.refresh_tokens USING btree (user_id);


--
-- Name: stock_families_company_id_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX stock_families_company_id_code_key ON public.stock_families USING btree (company_id, code);


--
-- Name: stock_families_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_families_company_id_idx ON public.stock_families USING btree (company_id);


--
-- Name: stock_lots_article_id_is_epuise_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_lots_article_id_is_epuise_idx ON public.stock_lots USING btree (article_id, is_epuise);


--
-- Name: stock_mouvements_company_id_article_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_mouvements_company_id_article_id_idx ON public.stock_mouvements USING btree (company_id, article_id);


--
-- Name: stock_mouvements_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX stock_mouvements_created_at_idx ON public.stock_mouvements USING btree (created_at);


--
-- Name: tax_configs_company_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tax_configs_company_id_key ON public.tax_configs USING btree (company_id);


--
-- Name: tax_declarations_company_id_type_year_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tax_declarations_company_id_type_year_idx ON public.tax_declarations USING btree (company_id, type, year);


--
-- Name: users_cabinet_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_cabinet_id_idx ON public.users USING btree (cabinet_id);


--
-- Name: users_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_company_id_idx ON public.users USING btree (company_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: vat_declarations_company_id_year_quarter_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vat_declarations_company_id_year_quarter_key ON public.vat_declarations USING btree (company_id, year, quarter);


--
-- Name: vat_declarations_fiscal_year_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vat_declarations_fiscal_year_id_idx ON public.vat_declarations USING btree (fiscal_year_id);


--
-- Name: work_schedules_company_id_employee_id_week_start_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX work_schedules_company_id_employee_id_week_start_key ON public.work_schedules USING btree (company_id, employee_id, week_start);


--
-- Name: work_schedules_company_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_schedules_company_id_idx ON public.work_schedules USING btree (company_id);


--
-- Name: work_schedules_employee_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX work_schedules_employee_id_idx ON public.work_schedules USING btree (employee_id);


--
-- Name: account_plans account_plans_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_plans
    ADD CONSTRAINT account_plans_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: account_reviews account_reviews_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reviews
    ADD CONSTRAINT account_reviews_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agence_members agence_members_agence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agence_members
    ADD CONSTRAINT agence_members_agence_id_fkey FOREIGN KEY (agence_id) REFERENCES public.agences(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agence_members agence_members_company_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agence_members
    ADD CONSTRAINT agence_members_company_member_id_fkey FOREIGN KEY (company_member_id) REFERENCES public.company_users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: agences agences_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agences
    ADD CONSTRAINT agences_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_conversations ai_conversations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ai_messages ai_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: annual_reviews annual_reviews_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_reviews
    ADD CONSTRAINT annual_reviews_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: annual_reviews annual_reviews_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.annual_reviews
    ADD CONSTRAINT annual_reviews_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: articles articles_famille_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.articles
    ADD CONSTRAINT articles_famille_id_fkey FOREIGN KEY (famille_id) REFERENCES public.stock_families(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: asset_depreciations asset_depreciations_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_depreciations
    ADD CONSTRAINT asset_depreciations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assets assets_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attachments attachments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attachments attachments_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: attachments attachments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_transactions bank_transactions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: bank_transactions bank_transactions_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: bank_transactions bank_transactions_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: cabinet_invitations cabinet_invitations_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cabinet_invitations
    ADD CONSTRAINT cabinet_invitations_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: clients clients_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: companies companies_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: company_roles company_roles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_roles
    ADD CONSTRAINT company_roles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_users company_users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: company_users company_users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.company_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: company_users company_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_users
    ADD CONSTRAINT company_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: contract_signatures contract_signatures_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contract_signatures
    ADD CONSTRAINT contract_signatures_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.legal_contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: employees employees_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: esg_actions esg_actions_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esg_actions
    ADD CONSTRAINT esg_actions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: esg_data esg_data_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.esg_data
    ADD CONSTRAINT esg_data_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: expenses expenses_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: fiscal_year_closes fiscal_year_closes_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_closes
    ADD CONSTRAINT fiscal_year_closes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: fiscal_years fiscal_years_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_years
    ADD CONSTRAINT fiscal_years_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: gdpr_entries gdpr_entries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gdpr_entries
    ADD CONSTRAINT gdpr_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invitations invitations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: invoices invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: invoices invoices_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: invoices invoices_recurring_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_recurring_invoice_id_fkey FOREIGN KEY (recurring_invoice_id) REFERENCES public.recurring_invoices(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: journal_entries journal_entries_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: leave_requests leave_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leave_requests
    ADD CONSTRAINT leave_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legal_alerts legal_alerts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_alerts
    ADD CONSTRAINT legal_alerts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legal_alerts legal_alerts_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_alerts
    ADD CONSTRAINT legal_alerts_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.legal_contracts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: legal_contracts legal_contracts_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.legal_contracts
    ADD CONSTRAINT legal_contracts_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mandats mandats_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mandats
    ADD CONSTRAINT mandats_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: mandats mandats_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mandats
    ADD CONSTRAINT mandats_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personal_comptes personal_comptes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_comptes
    ADD CONSTRAINT personal_comptes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personal_depenses personal_depenses_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_depenses
    ADD CONSTRAINT personal_depenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personal_objectifs personal_objectifs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_objectifs
    ADD CONSTRAINT personal_objectifs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personal_profiles personal_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_profiles
    ADD CONSTRAINT personal_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: personal_revenus personal_revenus_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.personal_revenus
    ADD CONSTRAINT personal_revenus_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quotes quotes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: quotes quotes_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: recurring_invoices recurring_invoices_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT recurring_invoices_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: recurring_invoices recurring_invoices_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recurring_invoices
    ADD CONSTRAINT recurring_invoices_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_lots stock_lots_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_lots
    ADD CONSTRAINT stock_lots_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: stock_mouvements stock_mouvements_article_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_mouvements
    ADD CONSTRAINT stock_mouvements_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tax_configs tax_configs_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_configs
    ADD CONSTRAINT tax_configs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tax_declarations tax_declarations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_declarations
    ADD CONSTRAINT tax_declarations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: tax_declarations tax_declarations_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_declarations
    ADD CONSTRAINT tax_declarations_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_cabinet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_cabinet_id_fkey FOREIGN KEY (cabinet_id) REFERENCES public.cabinets(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vat_declarations vat_declarations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vat_declarations
    ADD CONSTRAINT vat_declarations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vat_declarations vat_declarations_fiscal_year_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vat_declarations
    ADD CONSTRAINT vat_declarations_fiscal_year_id_fkey FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: work_schedules work_schedules_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT work_schedules_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: work_schedules work_schedules_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_schedules
    ADD CONSTRAINT work_schedules_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FLCsud0jRrPVrYlShEU8G8PjTcepg1ZoTLsYkeBOSJS70vhaS7NcY2AOZUGHYMw

