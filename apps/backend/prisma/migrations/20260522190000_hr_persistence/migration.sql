-- Extend Employee with organizational metadata
ALTER TABLE "employees"
  ADD COLUMN "poste"       TEXT,
  ADD COLUMN "departement" TEXT,
  ADD COLUMN "manager_id"  TEXT;

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_manager_id_fkey"
  FOREIGN KEY ("manager_id") REFERENCES "employees"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "employees_manager_id_idx" ON "employees"("manager_id");

-- EmploymentContractStatus enum
CREATE TYPE "EmploymentContractStatus" AS ENUM ('DRAFT', 'SIGNED', 'TERMINATED');

-- EmploymentContract table
CREATE TABLE "employment_contracts" (
    "id"            TEXT NOT NULL,
    "company_id"    TEXT NOT NULL,
    "employee_id"   TEXT NOT NULL,
    "contract_type" "EmploymentType" NOT NULL,
    "status"        "EmploymentContractStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date"    TIMESTAMP(3) NOT NULL,
    "end_date"      TIMESTAMP(3),
    "gross_salary"  DECIMAL(12,2) NOT NULL,
    "poste"         TEXT NOT NULL,
    "departement"   TEXT NOT NULL,
    "lieu_travail"  TEXT NOT NULL,
    "content"       TEXT NOT NULL,
    "signed_at"     TIMESTAMP(3),
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "employment_contracts_company_id_idx" ON "employment_contracts"("company_id");
CREATE INDEX "employment_contracts_employee_id_idx" ON "employment_contracts"("employee_id");
CREATE INDEX "employment_contracts_status_idx" ON "employment_contracts"("status");

ALTER TABLE "employment_contracts"
  ADD CONSTRAINT "employment_contracts_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employment_contracts"
  ADD CONSTRAINT "employment_contracts_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "employees"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
