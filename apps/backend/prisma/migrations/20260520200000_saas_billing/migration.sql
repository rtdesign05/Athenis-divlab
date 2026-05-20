-- SaaS Billing : Stripe (cards mondiales) + CinetPay (Mobile Money Afrique)
-- Tables Subscription (1 par company) + Payment (historique des transactions)

-- 1. Enums
CREATE TYPE "SubscriptionStatus" AS ENUM (
  'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED', 'INCOMPLETE'
);

CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'CINETPAY', 'FREE');

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- 2. Subscriptions
CREATE TABLE "subscriptions" (
  "id"                          TEXT NOT NULL,
  "company_id"                  TEXT NOT NULL,
  "plan"                        "Plan" NOT NULL,
  "status"                      "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "interval"                    "BillingInterval"   NOT NULL DEFAULT 'MONTHLY',
  "stripe_customer_id"          TEXT,
  "stripe_subscription_id"      TEXT,
  "stripe_price_id"             TEXT,
  "cinetpay_last_transaction_id" TEXT,
  "current_period_start"        TIMESTAMP(3),
  "current_period_end"          TIMESTAMP(3),
  "trial_end"                   TIMESTAMP(3),
  "cancel_at"                   TIMESTAMP(3),
  "canceled_at"                 TIMESTAMP(3),
  "amount_cents"                INTEGER NOT NULL,
  "currency"                    TEXT    NOT NULL,
  "provider"                    "PaymentProvider" NOT NULL DEFAULT 'FREE',
  "created_at"                  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"                  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_company_id_key"              ON "subscriptions"("company_id");
CREATE UNIQUE INDEX "subscriptions_stripe_customer_id_key"      ON "subscriptions"("stripe_customer_id");
CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key"  ON "subscriptions"("stripe_subscription_id");
CREATE INDEX        "subscriptions_status_idx"                  ON "subscriptions"("status");

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Payments
CREATE TABLE "payments" (
  "id"                     TEXT NOT NULL,
  "subscription_id"        TEXT,
  "company_id"             TEXT NOT NULL,
  "provider"               "PaymentProvider" NOT NULL,
  "provider_payment_id"    TEXT,
  "provider_invoice_id"    TEXT,
  "status"                 "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "amount_cents"           INTEGER NOT NULL,
  "currency"               TEXT    NOT NULL,
  "description"            TEXT,
  "failure_reason"         TEXT,
  "paid_at"                TIMESTAMP(3),
  "mobile_money_operator"  TEXT,
  "mobile_money_phone"     TEXT,
  "card_last4"             TEXT,
  "card_brand"             TEXT,
  "created_at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payments_provider_payment_id_key" ON "payments"("provider_payment_id");
CREATE INDEX        "payments_company_id_idx"          ON "payments"("company_id");
CREATE INDEX        "payments_provider_payment_id_idx" ON "payments"("provider_payment_id");
CREATE INDEX        "payments_status_idx"              ON "payments"("status");

ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Backfill : pour chaque company existante, créer une Subscription FREE
INSERT INTO "subscriptions" (
  "id", "company_id", "plan", "status", "interval", "amount_cents", "currency", "provider", "updated_at"
)
SELECT
  'sub_init_' || substring(c.id from 1 for 18),
  c.id,
  c.plan,
  'ACTIVE'::"SubscriptionStatus",
  'MONTHLY'::"BillingInterval",
  0,
  COALESCE(c.currency, 'XAF'),
  'FREE'::"PaymentProvider",
  NOW()
FROM "companies" c
ON CONFLICT ("company_id") DO NOTHING;
