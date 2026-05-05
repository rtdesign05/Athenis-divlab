-- ESG Extended Indicators
-- Adds scope CO₂, renewable ratio, social indicators and governance flags to esg_data

ALTER TABLE "esg_data"
  ADD COLUMN IF NOT EXISTS "renewable_ratio"      DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "scope1_tco2e"         DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS "scope2_tco2e"         DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS "scope3_tco2e"         DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS "absenteeism_rate"     DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "workplace_accidents"  INTEGER,
  ADD COLUMN IF NOT EXISTS "board_female_ratio"   DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS "has_ethics_code"      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "has_anticorruption"   BOOLEAN NOT NULL DEFAULT false;
