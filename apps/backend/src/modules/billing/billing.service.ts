/**
 * Service Billing — orchestre Stripe et CinetPay.
 *
 * Architecture :
 *   Frontend choisit le plan + méthode (CARD via Stripe / MM via CinetPay)
 *     ↓
 *   createCheckout(...) → URL hébergée (Stripe Checkout ou CinetPay)
 *     ↓
 *   User paie sur l'URL externe
 *     ↓
 *   Webhook reçoit l'événement → handleWebhook(...) update DB
 *     ↓
 *   User revient sur /billing/success → on confirme
 */
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import { env } from '../../config/env.js'
import { getAllPlansPricing, getCountryConfig } from '@athenis/shared-types'
import type { Plan } from '@athenis/shared-types'
import {
  isStripeConfigured,
  createCheckoutSession as stripeCreateCheckout,
  createCustomerPortalSession,
  cancelSubscription as stripeCancel,
  verifyWebhook as stripeVerifyWebhook,
  type StripeInterval,
} from '../../lib/stripe.js'
import {
  isCinetpayConfigured,
  initPayment as cinetpayInit,
  checkTransaction as cinetpayCheck,
  verifyWebhookSignature as cinetpayVerifyWebhook,
} from '../../lib/cinetpay.js'

// ── Constants ────────────────────────────────────────────────────────────────

const TRIAL_DAYS = 14
const CINETPAY_CURRENCIES = ['XAF', 'XOF', 'CDF', 'GNF', 'KMF']

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Détermine quel provider utiliser selon la devise du pays */
export function recommendedProvider(currencyCode: string): 'STRIPE' | 'CINETPAY' {
  return CINETPAY_CURRENCIES.includes(currencyCode.toUpperCase()) ? 'CINETPAY' : 'STRIPE'
}

/** Calcule le montant en unité minimale (cents pour EUR, unité entière pour XAF) */
function toAmountCents(amount: number, currency: string): number {
  if (CINETPAY_CURRENCIES.includes(currency.toUpperCase())) return Math.round(amount)
  return Math.round(amount * 100)
}

// ── Status (lecture pour l'UI billing) ────────────────────────────────────────

export async function getBillingStatus(companyId: string): Promise<{
  currentPlan:     Plan
  status:          string
  provider:        string
  interval:        'MONTHLY' | 'YEARLY'
  currency:        string
  amountCents:     number
  trialEnd:        string | null
  currentPeriodEnd: string | null
  canceledAt:      string | null
  cancelAtEnd:     boolean
  recentPayments:  Array<{ id: string; amountCents: number; currency: string; status: string; paidAt: string | null; provider: string; description: string | null }>
  capabilities: {
    stripeEnabled:   boolean
    cinetpayEnabled: boolean
  }
}> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { id: true, plan: true, currency: true, pays: true },
  })

  const sub = await prisma.subscription.findUnique({ where: { companyId } })

  const payments = await prisma.payment.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, amountCents: true, currency: true, status: true, paidAt: true, provider: true, description: true },
  })

  return {
    currentPlan:      company.plan,
    status:           sub?.status ?? 'ACTIVE',
    provider:         sub?.provider ?? 'FREE',
    interval:         sub?.interval ?? 'MONTHLY',
    currency:         company.currency ?? 'XAF',
    amountCents:      sub?.amountCents ?? 0,
    trialEnd:         sub?.trialEnd?.toISOString() ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    canceledAt:       sub?.canceledAt?.toISOString() ?? null,
    cancelAtEnd:      Boolean(sub?.cancelAt),
    recentPayments:   payments.map((p) => ({
      ...p,
      paidAt: p.paidAt?.toISOString() ?? null,
    })),
    capabilities: {
      stripeEnabled:   isStripeConfigured(),
      cinetpayEnabled: isCinetpayConfigured(),
    },
  }
}

// ── Création checkout (Stripe ou CinetPay selon provider) ──────────────────

export interface CreateCheckoutInput {
  companyId:    string
  plan:         'STARTER' | 'PRO' | 'PREMIUM'
  interval:     'MONTHLY' | 'YEARLY'
  provider:     'STRIPE' | 'CINETPAY'
  customerEmail: string
  customerName:  string
  customerPhone?: string
}

export async function createCheckout(input: CreateCheckoutInput): Promise<{ url: string | null; provider: string; mock: boolean }> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: input.companyId },
    select: { currency: true, pays: true },
  })

  const countryCfg = getCountryConfig(company.pays ?? 'CM')
  const pricing    = getAllPlansPricing(countryCfg.currencyCode, countryCfg.locale, countryCfg.currencySymbol)
  const planPrice  = pricing[input.plan as Plan]

  const amountForBilling = input.interval === 'YEARLY' ? planPrice.yearlyAmount : planPrice.amount
  const amountCents      = toAmountCents(amountForBilling, planPrice.currency)

  // Get or create subscription record
  await prisma.subscription.upsert({
    where: { companyId: input.companyId },
    create: {
      companyId: input.companyId,
      plan: input.plan as Plan,
      status: 'INCOMPLETE',
      interval: input.interval,
      amountCents,
      currency: planPrice.currency,
      provider: input.provider === 'STRIPE' ? 'STRIPE' : 'CINETPAY',
    },
    update: { plan: input.plan as Plan, interval: input.interval, amountCents, currency: planPrice.currency, status: 'INCOMPLETE' },
  })

  const successUrl = `${env.frontendUrl}/billing/success`
  const cancelUrl  = `${env.frontendUrl}/billing/cancel`

  if (input.provider === 'STRIPE') {
    // Stripe ne supporte pas XAF/XOF nativement (sauf via comptes spécifiques).
    // Si le user est en CMR et choisit Stripe, on bascule en EUR pour la facturation.
    const stripeCurrency: 'EUR' | 'USD' = CINETPAY_CURRENCIES.includes(planPrice.currency) ? 'EUR' : (planPrice.currency as 'EUR' | 'USD')

    const session = await stripeCreateCheckout({
      companyId:     input.companyId,
      customerEmail: input.customerEmail,
      plan:          input.plan,
      interval:      input.interval as StripeInterval,
      currency:      stripeCurrency,
      successUrl,
      cancelUrl,
      trialDays:     TRIAL_DAYS,
    })
    return { url: session.url, provider: 'STRIPE', mock: session.mock }
  }

  // CinetPay
  const result = await cinetpayInit({
    companyId:     input.companyId,
    amountCents,
    currency:      planPrice.currency,
    description:   `Abonnement Athenis ${input.plan} (${input.interval === 'YEARLY' ? 'annuel' : 'mensuel'})`,
    customerName:  input.customerName,
    customerEmail: input.customerEmail,
    ...(input.customerPhone ? { customerPhone: input.customerPhone } : {}),
    notifyUrl:     `${env.frontendUrl}/api/billing/webhook/cinetpay`,
    returnUrl:     successUrl,
  })

  if (result.transactionId) {
    await prisma.subscription.update({
      where: { companyId: input.companyId },
      data:  { cinetpayLastTransactionId: result.transactionId },
    })
  }

  return { url: result.paymentUrl, provider: 'CINETPAY', mock: result.mock }
}

// ── Customer portal (Stripe) ─────────────────────────────────────────────────

export async function getCustomerPortalUrl(companyId: string): Promise<{ url: string }> {
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { companyId } })
  if (!sub.stripeCustomerId) {
    throw new AppError('Aucun abonnement Stripe actif pour ce compte.', 400, 'NO_STRIPE_CUSTOMER')
  }
  const { url } = await createCustomerPortalSession(sub.stripeCustomerId, `${env.frontendUrl}/app/settings/facturation`)
  return { url }
}

// ── Cancel subscription ──────────────────────────────────────────────────────

export async function cancelSubscription(companyId: string): Promise<void> {
  const sub = await prisma.subscription.findUniqueOrThrow({ where: { companyId } })
  if (sub.provider === 'STRIPE' && sub.stripeSubscriptionId) {
    const { canceledAt } = await stripeCancel(sub.stripeSubscriptionId)
    await prisma.subscription.update({
      where: { companyId },
      data:  { canceledAt, cancelAt: canceledAt, status: 'CANCELED' },
    })
  } else {
    // CinetPay : on n'a pas de subscription native, on marque juste comme annulée
    await prisma.subscription.update({
      where: { companyId },
      data:  { canceledAt: new Date(), status: 'CANCELED' },
    })
  }
}

// ── Webhook Stripe ──────────────────────────────────────────────────────────

export async function handleStripeWebhook(rawBody: Buffer | string, signature: string): Promise<{ received: boolean }> {
  const event = await stripeVerifyWebhook(rawBody, signature)
  if (!event) {
    logger.warn('Stripe webhook: invalid signature, ignored')
    return { received: false }
  }

  logger.info('Stripe webhook received', { type: event.type, id: event.id })

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as { client_reference_id?: string; customer?: string; subscription?: string; metadata?: { companyId?: string; plan?: string } }
      const companyId = session.metadata?.companyId ?? session.client_reference_id
      if (!companyId) break
      await prisma.subscription.update({
        where: { companyId },
        data:  {
          stripeCustomerId:     session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          status:               'ACTIVE',
        },
      })
      // Update company plan
      const plan = session.metadata?.plan as Plan | undefined
      if (plan) {
        await prisma.company.update({ where: { id: companyId }, data: { plan } })
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as { id: string; status: string; current_period_end?: number; cancel_at?: number; canceled_at?: number; metadata?: { companyId?: string } }
      const companyId = sub.metadata?.companyId
      if (!companyId) break
      const statusMap: Record<string, 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED'> = {
        trialing: 'TRIALING', active: 'ACTIVE', past_due: 'PAST_DUE', canceled: 'CANCELED', unpaid: 'PAST_DUE', incomplete_expired: 'EXPIRED',
      }
      await prisma.subscription.update({
        where: { companyId },
        data: {
          status:             statusMap[sub.status] ?? 'EXPIRED',
          currentPeriodEnd:   sub.current_period_end ? new Date(sub.current_period_end * 1000) : null,
          cancelAt:           sub.cancel_at  ? new Date(sub.cancel_at * 1000)  : null,
          canceledAt:         sub.canceled_at ? new Date(sub.canceled_at * 1000) : null,
        },
      })
      if (event.type === 'customer.subscription.deleted') {
        await prisma.company.update({ where: { id: companyId }, data: { plan: 'FREE' } })
      }
      break
    }

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed': {
      const invoice = event.data.object as {
        id?: string; payment_intent?: string; amount_paid?: number; amount_due?: number; currency?: string;
        subscription?: string; customer?: string; status?: string; metadata?: { companyId?: string };
        last_payment_error?: { message?: string }
      }
      // Trouver companyId via la subscription
      const subRecord = invoice.subscription
        ? await prisma.subscription.findFirst({ where: { stripeSubscriptionId: invoice.subscription as string } })
        : null
      const companyId = subRecord?.companyId ?? invoice.metadata?.companyId
      if (!companyId) break

      await prisma.payment.create({
        data: {
          subscriptionId:   subRecord?.id ?? null,
          companyId,
          provider:         'STRIPE',
          providerPaymentId: invoice.payment_intent ?? invoice.id ?? null,
          providerInvoiceId: invoice.id ?? null,
          status:           event.type === 'invoice.payment_succeeded' ? 'SUCCEEDED' : 'FAILED',
          amountCents:      invoice.amount_paid ?? invoice.amount_due ?? 0,
          currency:         (invoice.currency ?? 'eur').toUpperCase(),
          description:      'Abonnement Stripe',
          failureReason:    event.type === 'invoice.payment_failed' ? (invoice.last_payment_error?.message ?? 'Échec inconnu') : null,
          paidAt:           event.type === 'invoice.payment_succeeded' ? new Date() : null,
        },
      })
      break
    }

    default:
      logger.info('Stripe webhook: unhandled event type', { type: event.type })
  }

  return { received: true }
}

// ── Webhook CinetPay ────────────────────────────────────────────────────────

export async function handleCinetpayWebhook(payload: { transaction_id?: string; cpm_trans_status?: string; signature?: string }, rawBody: string): Promise<{ received: boolean }> {
  if (!payload.transaction_id) {
    logger.warn('CinetPay webhook: missing transaction_id')
    return { received: false }
  }

  // Vérif signature HMAC (optionnel selon config)
  if (payload.signature && !cinetpayVerifyWebhook(rawBody, payload.signature)) {
    logger.warn('CinetPay webhook: invalid signature', { tx: payload.transaction_id })
    return { received: false }
  }

  // Confirmer le statut auprès de CinetPay (anti-fraude)
  const check = await cinetpayCheck(payload.transaction_id)
  logger.info('CinetPay webhook check result', { tx: payload.transaction_id, status: check.status })

  const sub = await prisma.subscription.findFirst({
    where: { cinetpayLastTransactionId: payload.transaction_id },
  })
  if (!sub) {
    logger.warn('CinetPay webhook: no subscription found for tx', { tx: payload.transaction_id })
    return { received: true }
  }

  if (check.status === 'SUCCESS') {
    const periodMonths = sub.interval === 'YEARLY' ? 12 : 1
    const now = new Date()
    const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + periodMonths)

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status:             'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd:   periodEnd,
          provider:           'CINETPAY',
        },
      }),
      prisma.company.update({ where: { id: sub.companyId }, data: { plan: sub.plan, planExpiresAt: periodEnd } }),
      prisma.payment.create({
        data: {
          subscriptionId:    sub.id,
          companyId:         sub.companyId,
          provider:          'CINETPAY',
          providerPaymentId: payload.transaction_id,
          status:            'SUCCEEDED',
          amountCents:       sub.amountCents,
          currency:          sub.currency,
          description:       `Abonnement ${sub.plan} (Mobile Money)`,
          mobileMoneyOperator: check.operator ?? null,
          mobileMoneyPhone:    check.phone ?? null,
          paidAt:            check.paidAt ?? new Date(),
        },
      }),
    ])
  } else if (check.status === 'FAILED') {
    await prisma.payment.create({
      data: {
        subscriptionId:    sub.id,
        companyId:         sub.companyId,
        provider:          'CINETPAY',
        providerPaymentId: payload.transaction_id,
        status:            'FAILED',
        amountCents:       sub.amountCents,
        currency:          sub.currency,
        description:       `Échec de paiement ${sub.plan}`,
        failureReason:     'Refusé par l\'opérateur Mobile Money',
      },
    })
  }

  return { received: true }
}
