-- Paie : Payroll (lot mensuel) + Payslip (bulletin par employé)
-- Compte de tiers employé (422xxxxx)

CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'POSTED', 'PAID', 'SENT', 'CANCELLED');
CREATE TYPE "PayslipStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');

-- Compte comptable de tiers de chaque salarié
ALTER TABLE "employees" ADD COLUMN "accounting_code" TEXT;

-- Table Payroll
CREATE TABLE "payrolls" (
  "id"              TEXT NOT NULL,
  "company_id"      TEXT NOT NULL,
  "fiscal_year_id"  TEXT,
  "month"           INTEGER NOT NULL,
  "year"            INTEGER NOT NULL,
  "status"          "PayrollStatus" NOT NULL DEFAULT 'DRAFT',
  "posted_piece_id" TEXT,
  "posted_at"       TIMESTAMP(3),
  "journal_code"    TEXT NOT NULL DEFAULT 'PAY',
  "treasury_account" TEXT,
  "paid_at"         TIMESTAMP(3),
  "sent_at"         TIMESTAMP(3),
  "total_gross"     DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_net"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_cnps_sal"  DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_cnps_emp"  DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_irpp"      DECIMAL(15,2) NOT NULL DEFAULT 0,
  "total_cac"       DECIMAL(15,2) NOT NULL DEFAULT 0,
  "employees_count" INTEGER NOT NULL DEFAULT 0,
  "notes"           TEXT,
  "created_by"      TEXT,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payrolls_company_id_year_month_key" ON "payrolls"("company_id","year","month");
CREATE INDEX "payrolls_company_id_status_idx" ON "payrolls"("company_id","status");
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_fiscal_year_id_fkey"
  FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Table Payslip
CREATE TABLE "payslips" (
  "id"                TEXT NOT NULL,
  "payroll_id"        TEXT NOT NULL,
  "employee_id"       TEXT NOT NULL,
  "employee_name"     TEXT NOT NULL,
  "employee_email"    TEXT,
  "employment_type"   "EmploymentType" NOT NULL,
  "days_worked"       INTEGER NOT NULL DEFAULT 30,
  "days_absent_unpaid" INTEGER NOT NULL DEFAULT 0,
  "gross_salary"      DECIMAL(15,2) NOT NULL,
  "cnps_sal"          DECIMAL(15,2) NOT NULL DEFAULT 0,
  "cnps_emp"          DECIMAL(15,2) NOT NULL DEFAULT 0,
  "irpp"              DECIMAL(15,2) NOT NULL DEFAULT 0,
  "cac"               DECIMAL(15,2) NOT NULL DEFAULT 0,
  "net_to_pay"        DECIMAL(15,2) NOT NULL,
  "total_cost"        DECIMAL(15,2) NOT NULL,
  "payment_method"    "PaymentMethod",
  "payment_ref"       TEXT,
  "payment_status"    "PayslipStatus" NOT NULL DEFAULT 'PENDING',
  "paid_at"           TIMESTAMP(3),
  "email_sent_at"     TIMESTAMP(3),
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payslips_payroll_id_employee_id_key" ON "payslips"("payroll_id","employee_id");
CREATE INDEX "payslips_employee_id_idx" ON "payslips"("employee_id");
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_id_fkey"
  FOREIGN KEY ("payroll_id") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
