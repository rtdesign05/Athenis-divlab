/**
 * Adapter CinetPay — agrégateur Mobile Money + cartes pour OHADA.
 *
 * Couvre : CMR, SEN, RCI, BFA, TGO, BEN, MLI, COD, MDG
 * Opérateurs : Orange Money, MTN MoMo, Moov, Wave, cartes Visa/MasterCard
 *
 * Doc API : https://docs.cinetpay.com/api/1.0-fr/
 *
 * Activation via .env :
 *   CINETPAY_API_KEY=xxx
 *   CINETPAY_SITE_ID=xxx          (donné dans le dashboard CinetPay)
 *   CINETPAY_SECRET_KEY=xxx       (pour vérifier les webhooks HMAC)
 *
 * Sans clé, on tourne en mode mock — pratique pour tester l'UI.
 */
import crypto from 'crypto'
import { logger } from './logger.js'

export function isCinetpayConfigured(): boolean {
  return Boolean(process.env['CINETPAY_API_KEY'] && process.env['CINETPAY_SITE_ID'])
}

const CINETPAY_API_BASE = 'https://api-checkout.cinetpay.com/v2'

// ── Init transaction (= équivalent Checkout Session de Stripe) ──────────────

export interface CinetpayInitInput {
  companyId:       string
  amountCents:     number       // en unité minimale de la devise (FCFA = pas de centimes, donc montant entier)
  currency:        string       // XAF, XOF, CDF, GNF...
  description:     string
  customerName:    string
  customerEmail:   string
  customerPhone?:  string       // format E.164 sans le +
  notifyUrl:       string       // webhook backend
  returnUrl:       string       // page de retour user après paiement
  transactionId?:  string       // si fourni, on l'utilise (idempotence)
}

export interface CinetpayInitResult {
  paymentUrl:    string | null
  transactionId: string
  mock:          boolean
  error?:        string
}

export async function initPayment(input: CinetpayInitInput): Promise<CinetpayInitResult> {
  const apiKey  = process.env['CINETPAY_API_KEY']
  const siteId  = process.env['CINETPAY_SITE_ID']
  const txId    = input.transactionId ?? `athenis_${input.companyId}_${Date.now()}`

  if (!apiKey || !siteId) {
    logger.warn('initPayment: CinetPay not configured, returning mock payment URL')
    return {
      paymentUrl:    `${input.returnUrl}?mock=1&tx=${txId}`,
      transactionId: txId,
      mock:          true,
    }
  }

  // CinetPay attend les montants en unité entière de la devise.
  // Pour XAF/XOF (pas de centimes), amountCents == amount.
  // Pour EUR/USD, on divise par 100.
  const amount = ['XAF', 'XOF', 'CDF', 'GNF', 'KMF', 'BIF'].includes(input.currency)
    ? input.amountCents
    : Math.round(input.amountCents / 100)

  try {
    const res = await fetch(`${CINETPAY_API_BASE}/payment`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        apikey:           apiKey,
        site_id:          siteId,
        transaction_id:   txId,
        amount,
        currency:         input.currency,
        description:      input.description,
        customer_name:    input.customerName,
        customer_email:   input.customerEmail,
        customer_phone_number: input.customerPhone ?? '',
        notify_url:       input.notifyUrl,
        return_url:       input.returnUrl,
        channels:         'ALL', // toutes méthodes (MM + cartes)
        metadata:         JSON.stringify({ companyId: input.companyId }),
      }),
    })
    const data = await res.json() as { code?: string; message?: string; data?: { payment_url?: string; payment_token?: string } }

    if (data.code !== '201' && data.code !== '00') {
      logger.error('CinetPay initPayment error', { code: data.code, message: data.message })
      return { paymentUrl: null, transactionId: txId, mock: false, error: data.message ?? 'CinetPay init failed' }
    }

    return {
      paymentUrl:    data.data?.payment_url ?? null,
      transactionId: txId,
      mock:          false,
    }
  } catch (e) {
    logger.error('CinetPay initPayment network error', { error: e })
    return { paymentUrl: null, transactionId: txId, mock: false, error: 'Network error' }
  }
}

// ── Vérification d'une transaction (suite au webhook ou page de retour) ─────

export interface CinetpayCheckResult {
  status:     'SUCCESS' | 'PENDING' | 'FAILED' | 'UNKNOWN'
  amount:     number
  currency:   string
  operator?:  string | undefined
  phone?:     string | undefined
  paidAt?:    Date | undefined
  mock:       boolean
}

export async function checkTransaction(transactionId: string): Promise<CinetpayCheckResult> {
  const apiKey  = process.env['CINETPAY_API_KEY']
  const siteId  = process.env['CINETPAY_SITE_ID']

  if (!apiKey || !siteId) {
    return { status: 'SUCCESS', amount: 0, currency: 'XAF', mock: true }
  }

  try {
    const res = await fetch(`${CINETPAY_API_BASE}/payment/check`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ apikey: apiKey, site_id: siteId, transaction_id: transactionId }),
    })
    const data = await res.json() as {
      code?: string
      data?: {
        amount?: number; currency?: string; status?: string;
        payment_method?: string; operator_id?: string;
        payment_date?: string; phone?: string;
      }
    }

    const d = data.data ?? {}
    let status: CinetpayCheckResult['status'] = 'UNKNOWN'
    if      (d.status === 'ACCEPTED')                  status = 'SUCCESS'
    else if (d.status === 'PENDING' || d.status === 'WAITING')  status = 'PENDING'
    else if (d.status === 'REFUSED' || d.status === 'FAILED')   status = 'FAILED'

    return {
      status,
      amount:    d.amount ?? 0,
      currency:  d.currency ?? 'XAF',
      operator:  d.payment_method ?? d.operator_id,
      phone:     d.phone,
      paidAt:    d.payment_date ? new Date(d.payment_date) : undefined,
      mock:      false,
    }
  } catch (e) {
    logger.error('CinetPay checkTransaction error', { error: e })
    return { status: 'UNKNOWN', amount: 0, currency: 'XAF', mock: false }
  }
}

// ── Webhook signature verification (HMAC SHA-256) ───────────────────────────

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const secret = process.env['CINETPAY_SECRET_KEY']
  if (!secret) {
    logger.warn('CinetPay webhook: no CINETPAY_SECRET_KEY configured, accepting unverified')
    return true // dev/mock mode
  }
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
