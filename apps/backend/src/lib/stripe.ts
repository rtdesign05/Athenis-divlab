/**
 * Adapter Stripe — wrapper minimal du SDK officiel.
 *
 * Activation via .env :
 *   STRIPE_SECRET_KEY=sk_test_xxx              (sk_live_ pour la prod)
 *   STRIPE_WEBHOOK_SECRET=whsec_xxx            (dashboard.stripe.com/webhooks)
 *   STRIPE_PRICE_STARTER_EUR=price_xxx         (créer dans dashboard.stripe.com/products)
 *   STRIPE_PRICE_STARTER_EUR_YEAR=price_xxx
 *   STRIPE_PRICE_PRO_EUR=price_xxx
 *   ...
 *
 * Sans clé Stripe, on tourne en mode "mock" : les fonctions retournent des
 * données simulées. Le frontend voit un faux flow checkout (utile pour
 * tester l'UI sans compte Stripe).
 */
import { logger } from './logger.js'

// On charge Stripe en lazy : si la clé n'existe pas, on n'importe pas le SDK
// (réduit la taille du bundle backend et évite l'erreur "no API key" au boot)

let stripeClient: import('stripe').Stripe | null = null

async function getStripeClient(): Promise<import('stripe').Stripe | null> {
  if (stripeClient) return stripeClient
  const key = process.env['STRIPE_SECRET_KEY']
  if (!key) return null
  try {
    const { default: Stripe } = await import('stripe')
    stripeClient = new Stripe(key, { apiVersion: '2025-09-30.acacia' as never })
    return stripeClient
  } catch (e) {
    logger.error('Failed to load Stripe SDK', { error: e })
    return null
  }
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env['STRIPE_SECRET_KEY'])
}

export function getWebhookSecret(): string | null {
  return process.env['STRIPE_WEBHOOK_SECRET'] ?? null
}

// ── Price IDs (configurés via env) ──────────────────────────────────────────

export type StripePlanKey = 'STARTER' | 'PRO' | 'PREMIUM'
export type StripeInterval = 'MONTHLY' | 'YEARLY'

export function getStripePriceId(plan: StripePlanKey, interval: StripeInterval, currency: 'EUR' | 'USD' = 'EUR'): string | null {
  const suffix = interval === 'YEARLY' ? '_YEAR' : ''
  const envKey = `STRIPE_PRICE_${plan}_${currency}${suffix}`
  return process.env[envKey] ?? null
}

// ── Création de session Checkout ─────────────────────────────────────────────

export interface CheckoutSessionInput {
  companyId:        string
  customerEmail:    string
  plan:             StripePlanKey
  interval:         StripeInterval
  currency:         'EUR' | 'USD'
  successUrl:       string
  cancelUrl:        string
  trialDays?:       number          // 14 par défaut pour les nouveaux
  existingCustomerId?: string | null
}

export interface CheckoutSessionResult {
  url:        string | null
  sessionId:  string
  mock:       boolean
}

export async function createCheckoutSession(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
  const stripe = await getStripeClient()
  const priceId = getStripePriceId(input.plan, input.interval, input.currency)

  if (!stripe || !priceId) {
    // Mode mock : on retourne une URL bidon. Le frontend va l'ouvrir, voir
    // une 404, mais ça permet de tester le flow côté code.
    logger.warn('createCheckoutSession: Stripe not configured, returning mock session', {
      plan: input.plan, hasStripe: !!stripe, hasPriceId: !!priceId,
    })
    return {
      url: `${input.successUrl}?mock=1&plan=${input.plan}`,
      sessionId: 'cs_mock_' + Math.random().toString(36).slice(2),
      mock: true,
    }
  }

  const sessionParams = {
    mode: 'subscription' as const,
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: input.companyId,
    success_url: `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  input.cancelUrl,
    subscription_data: {
      trial_period_days: input.trialDays ?? 14,
      metadata: { companyId: input.companyId, plan: input.plan },
    },
    metadata: { companyId: input.companyId, plan: input.plan },
    allow_promotion_codes: true,
    ...(input.existingCustomerId
      ? { customer: input.existingCustomerId }
      : { customer_email: input.customerEmail }
    ),
  }
  const session = await stripe.checkout.sessions.create(sessionParams)

  return { url: session.url, sessionId: session.id, mock: false }
}

// ── Customer portal (gestion abonnement par le user) ─────────────────────────

export async function createCustomerPortalSession(customerId: string, returnUrl: string): Promise<{ url: string; mock: boolean }> {
  const stripe = await getStripeClient()
  if (!stripe) {
    return { url: returnUrl + '?mock=portal', mock: true }
  }
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId, return_url: returnUrl,
  })
  return { url: session.url, mock: false }
}

// ── Cancel subscription (à la fin de la période) ─────────────────────────────

export async function cancelSubscription(subscriptionId: string): Promise<{ canceledAt: Date | null; mock: boolean }> {
  const stripe = await getStripeClient()
  if (!stripe) {
    return { canceledAt: new Date(), mock: true }
  }
  const sub = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
  return { canceledAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : null, mock: false }
}

// ── Webhook verification ─────────────────────────────────────────────────────

export async function verifyWebhook(
  rawBody: string | Buffer,
  signature: string,
): Promise<import('stripe').Stripe.Event | null> {
  const stripe = await getStripeClient()
  const secret = getWebhookSecret()
  if (!stripe || !secret) return null
  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret)
  } catch (e) {
    logger.error('Stripe webhook signature verification failed', { error: e })
    return null
  }
}
