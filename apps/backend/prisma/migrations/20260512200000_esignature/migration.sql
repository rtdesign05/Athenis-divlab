-- ── Signature électronique avancée (AES) ─────────────────────────────────────
-- Conformité : OHADA Acte Uniforme 2010, Loi Cameroun 2010/021,
--              UEMOA ASA.2011/01, eIDAS AES (référence internationale)

-- 1. Stockage du document source dans legal_contracts
ALTER TABLE "legal_contracts"
  ADD COLUMN IF NOT EXISTS "file_data"  TEXT,          -- base64 du PDF/DOCX original
  ADD COLUMN IF NOT EXISTS "file_hash"  VARCHAR(64),   -- SHA-256 pour intégrité (preuve légale)
  ADD COLUMN IF NOT EXISTS "file_name"  VARCHAR(255),  -- nom original du fichier
  ADD COLUMN IF NOT EXISTS "file_mime"  VARCHAR(100);  -- MIME type (application/pdf …)

-- 2. Champs de signature et traçabilité dans contract_signatures
ALTER TABLE "contract_signatures"
  ADD COLUMN IF NOT EXISTS "signature_data"      TEXT,          -- base64 PNG du paraphe dessiné
  ADD COLUMN IF NOT EXISTS "signing_ip"          VARCHAR(45),   -- IPv4 ou IPv6 du signataire
  ADD COLUMN IF NOT EXISTS "signing_user_agent"  TEXT,          -- navigateur/OS (identification)
  ADD COLUMN IF NOT EXISTS "email_sent_at"       TIMESTAMPTZ,   -- horodatage envoi invitation
  ADD COLUMN IF NOT EXISTS "signing_order"       INTEGER NOT NULL DEFAULT 1; -- ordre séquentiel

-- 3. Journal d'audit contractuel (piste d'audit AES obligatoire)
CREATE TABLE IF NOT EXISTS "contract_audit_logs" (
    "id"          TEXT        NOT NULL,
    "contract_id" TEXT        NOT NULL,
    "event"       TEXT        NOT NULL,  -- CREATED | DOCUMENT_UPLOADED | SIGNATURE_REQUESTED | VIEWED | SIGNED | REFUSED | COMPLETED
    "actor_name"  TEXT,
    "actor_email" TEXT,
    "actor_ip"    TEXT,
    "metadata"    JSONB,
    "created_at"  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_audit_logs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "contract_audit_logs_contract_id_fkey"
        FOREIGN KEY ("contract_id")
        REFERENCES "legal_contracts"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "contract_audit_logs_contract_id_idx"
    ON "contract_audit_logs"("contract_id");

CREATE INDEX IF NOT EXISTS "contract_audit_logs_created_at_idx"
    ON "contract_audit_logs"("created_at");
