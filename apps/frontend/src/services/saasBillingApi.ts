/**
 * Service pour la facturation SaaS d'Athenis (vs billingApi.ts qui gère les
 * factures clients de l'utilisateur). Ici : Stripe + CinetPay pour les
 * abonnements Athenis.
 */
import { api } from '@/lib/api'

export interface BillingStatus {
  currentPlan:      'FREE' | 'STARTER' | 'PRO' | 'PREMIUM'
  status:           'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED' | 'INCOMPLETE'
  provider:         'STRIPE' | 'CINETPAY' | 'FREE'
  interval:         'MONTHLY' | 'YEARLY'
  currency:         string
  amountCents:      number
  trialEnd:         string | null
  currentPeriodEnd: string | null
  canceledAt:       string | null
  cancelAtEnd:      boolean
  recentPayments:   Array<{
    id: string
    amountCents: number
    currency: string
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED'
    paidAt: string | null
    provider: string
    description: string | null
  }>
  capabilities: {
    stripeEnabled:   boolean
    cinetpayEnabled: boolean
  }
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const saasBillingApi = {
  status:   () => api.get<{ data: BillingStatus }>('/billing/status').then(d),
  checkout: (input: {
    plan:     'STARTER' | 'PRO' | 'PREMIUM'
    interval: 'MONTHLY' | 'YEARLY'
    provider: 'STRIPE' | 'CINETPAY'
    phone?:   string
  }) => api.post<{ data: { url: string | null; provider: string; mock: boolean } }>('/billing/checkout', input).then(d),
  portal:   () => api.post<{ data: { url: string } }>('/billing/portal').then(d),
  cancel:   () => api.post<{ data: null }>('/billing/cancel').then(d),
  verifySession: () => api.get<{ data: BillingStatus }>('/billing/verify-session').then(d),
}
