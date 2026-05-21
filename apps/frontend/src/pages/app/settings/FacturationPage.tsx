import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/useAuth'
import type { Plan, Module } from '@athenis/shared-types'
import { getAllPlansPricing, getCountryConfig } from '@athenis/shared-types'
import { saasBillingApi } from '@/services/saasBillingApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<Plan, string> = {
  FREE:    'Gratuit',
  STARTER: 'Starter',
  PRO:     'Pro',
  PREMIUM: 'Premium',
}

const PLAN_BADGE_STYLES: Record<Plan, string> = {
  FREE:    'bg-gray-100 text-gray-700',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO:     'bg-forest-100 text-forest-700',
  PREMIUM: 'bg-purple-100 text-purple-700',
}

const PLAN_LIMITS: Record<Plan, number> = {
  FREE:    1,
  STARTER: 3,
  PRO:     5,
  PREMIUM: 20,
}

const MODULE_LABELS: Record<Module, string> = {
  gestion:      '📄 Gestion',
  comptabilite: '📊 Comptabilité',
  rh:           '👥 RH',
  juridique:    '⚖️ Juridique',
  esg:          '🌿 ESG',
  fiscalite:    '🏛️ Fiscalité',
}

// Renewal date fallback (réelle date issue de sub?.currentPeriodEnd si dispo)
const RENEWAL_DATE_FALLBACK = '—'

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-2 rounded-full bg-forest-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 shrink-0">
        {value}/{max}
      </span>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FacturationPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const plan: Plan = user?.plan ?? 'FREE'
  const modules: Module[] = (user?.modules ?? []) as Module[]
  const maxUsers = PLAN_LIMITS[plan]

  // ── Tarification multi-devise basée sur le pays de l'entreprise ─────────────
  // Cameroun → F CFA (XAF), France → €, Sénégal → F CFA (XOF), USA → $, etc.
  const countryCode  = user?.country ?? 'FR'
  const countryCfg   = getCountryConfig(countryCode)
  const allPricing   = getAllPlansPricing(countryCfg.currencyCode, countryCfg.locale, countryCfg.currencySymbol)
  const currentPrice = allPricing[plan]

  // ── Billing SaaS (Stripe + CinetPay) ────────────────────────────────────────
  const [upgradeOpen, setUpgradeOpen] = useState<Plan | null>(null)
  const [interval, setInterval] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
  const [provider, setProvider] = useState<'STRIPE' | 'CINETPAY'>(
    ['XAF', 'XOF', 'CDF', 'GNF'].includes(countryCfg.currencyCode) ? 'CINETPAY' : 'STRIPE'
  )

  const statusQuery = useQuery({
    queryKey: ['saas-billing', 'status'],
    queryFn:  () => saasBillingApi.status(),
    staleTime: 30_000,
  })

  const checkoutMut = useMutation({
    mutationFn: saasBillingApi.checkout,
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url
    },
  })

  const cancelMut = useMutation({
    mutationFn: saasBillingApi.cancel,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['saas-billing', 'status'] }) },
  })

  const portalMut = useMutation({
    mutationFn: saasBillingApi.portal,
    onSuccess: (data) => { if (data.url) window.location.href = data.url },
  })

  const sub = statusQuery.data

  return (
    <div className="max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Facturation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez votre forfait, vos modules et votre historique de paiements.
        </p>
      </div>

      {/* Current plan card */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Forfait actuel</h2>

        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          {/* Plan name + price */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${PLAN_BADGE_STYLES[plan]}`}
              >
                {PLAN_LABELS[plan]}
              </span>
              <span className="text-lg font-bold text-gray-900">
                {currentPrice.formatted}
                {plan !== 'FREE' && (
                  <span className="text-sm font-normal text-gray-500"> / mois</span>
                )}
              </span>
            </div>
            {plan !== 'FREE' && (
              <span className="text-xs text-gray-400">
                Renouvellement {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR') : RENEWAL_DATE_FALLBACK}
              </span>
            )}
          </div>

          {/* User count progress — 1 par défaut (vous-même) si pas encore d'autres membres */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Utilisateurs
              </span>
              <span className="text-xs text-gray-400">
                1 sur {maxUsers} inclus
              </span>
            </div>
            <ProgressBar value={1} max={maxUsers} />
          </div>

          {/* Status badges */}
          {sub && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {sub.status === 'TRIALING' && sub.trialEnd && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  Essai gratuit · fin le {new Date(sub.trialEnd).toLocaleDateString('fr-FR')}
                </span>
              )}
              {sub.status === 'ACTIVE' && (
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                  ● Actif
                </span>
              )}
              {sub.status === 'PAST_DUE' && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  ⚠️ Paiement en échec
                </span>
              )}
              {sub.cancelAtEnd && sub.currentPeriodEnd && (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                  Annulé à la fin de la période ({new Date(sub.currentPeriodEnd).toLocaleDateString('fr-FR')})
                </span>
              )}
              {sub.provider && sub.provider !== 'FREE' && (
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">
                  via {sub.provider === 'STRIPE' ? '💳 Carte bancaire' : '📱 Mobile Money'}
                </span>
              )}
            </div>
          )}

          {/* CTA */}
          <div className="pt-1 flex flex-wrap gap-2">
            {plan === 'FREE' && (
              <button
                onClick={() => { setUpgradeOpen('PRO') }}
                className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800"
              >
                🚀 Passer au plan Pro
              </button>
            )}
            {plan !== 'FREE' && sub?.provider === 'STRIPE' && (
              <button
                onClick={() => portalMut.mutate()}
                disabled={portalMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50"
              >
                {portalMut.isPending ? 'Chargement…' : '⚙️ Gérer mon abonnement'}
              </button>
            )}
            {plan !== 'FREE' && !sub?.cancelAtEnd && (
              <button
                onClick={() => { if (confirm('Annuler votre abonnement ? Vous restez actif jusqu\'à la fin de la période.')) cancelMut.mutate() }}
                disabled={cancelMut.isPending}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelMut.isPending ? 'Annulation…' : 'Annuler l\'abonnement'}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ── Compare all plans (multi-currency) ──────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Tous les forfaits</h2>
          <span className="text-xs text-gray-400">
            Prix affichés en <strong className="text-gray-600">{countryCfg.currency}</strong> ({countryCfg.currencySymbol})
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(['FREE', 'STARTER', 'PRO', 'PREMIUM'] as Plan[]).map((p) => {
            const pricing = allPricing[p]
            const isCurrent = p === plan
            return (
              <div
                key={p}
                className={`relative rounded-xl border p-4 transition-all ${
                  isCurrent
                    ? 'border-forest-500 bg-forest-50/40 ring-1 ring-forest-200'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-2 right-3 rounded-full bg-forest-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    Actuel
                  </span>
                )}
                <p className={`text-xs font-bold uppercase tracking-wide ${PLAN_BADGE_STYLES[p].split(' ')[1] ?? 'text-gray-600'}`}>
                  {PLAN_LABELS[p]}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 leading-none">
                  {pricing.amount === 0 ? '0' : pricing.formatted.replace(/[^\d\s.,]/g, '').trim()}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {pricing.amount === 0
                    ? 'Gratuit'
                    : <>{pricing.symbol} <span className="text-gray-400">/ mois</span></>
                  }
                </p>
                {pricing.amount > 0 && (
                  <p className="mt-2 text-[11px] text-gray-400">
                    ou {pricing.yearlyFormatted}/an (2 mois offerts)
                  </p>
                )}
                <p className="mt-3 text-xs font-medium text-gray-600">
                  Jusqu'à {PLAN_LIMITS[p]} utilisateur{PLAN_LIMITS[p] > 1 ? 's' : ''}
                </p>
                {!isCurrent && p !== 'FREE' && (
                  <button
                    onClick={() => setUpgradeOpen(p)}
                    className="mt-3 w-full rounded-lg bg-forest-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-800"
                  >
                    Choisir ce plan
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-gray-400 italic">
          Tarifs adaptés au pouvoir d'achat local. Paiements via Stripe (carte) ou CinetPay (Mobile Money).
        </p>
      </section>

      {/* ── Modal upgrade ─────────────────────────────────────────────────────── */}
      {upgradeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setUpgradeOpen(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900">Passer au plan {PLAN_LABELS[upgradeOpen]}</h2>
            <p className="mt-1 text-sm text-gray-500">14 jours d'essai gratuit. Annulez à tout moment.</p>

            {/* Interval toggle */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-700 mb-2">Périodicité</p>
              <div className="inline-flex bg-gray-100 rounded-lg p-1 w-full">
                <button
                  onClick={() => setInterval('MONTHLY')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${interval === 'MONTHLY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                >
                  Mensuel · {allPricing[upgradeOpen].formatted}/mois
                </button>
                <button
                  onClick={() => setInterval('YEARLY')}
                  className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium ${interval === 'YEARLY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
                >
                  Annuel · -17%
                </button>
              </div>
            </div>

            {/* Provider choice */}
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-700 mb-2">Méthode de paiement</p>
              <div className="space-y-2">
                <button
                  onClick={() => setProvider('STRIPE')}
                  className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${provider === 'STRIPE' ? 'border-forest-500 bg-forest-50/40' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className="text-xl">💳</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Carte bancaire</p>
                    <p className="text-xs text-gray-500">Visa, MasterCard. Sécurisé par Stripe. International.</p>
                  </div>
                  {sub?.capabilities?.stripeEnabled === false && (
                    <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Mode test</span>
                  )}
                </button>

                <button
                  onClick={() => setProvider('CINETPAY')}
                  disabled={!['XAF', 'XOF', 'CDF', 'GNF'].includes(countryCfg.currencyCode)}
                  className={`w-full flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-colors ${
                    provider === 'CINETPAY' ? 'border-forest-500 bg-forest-50/40' : 'border-gray-200 hover:border-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span className="text-xl">📱</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">Mobile Money</p>
                    <p className="text-xs text-gray-500">
                      {['XAF', 'XOF', 'CDF', 'GNF'].includes(countryCfg.currencyCode)
                        ? 'Orange Money, MTN MoMo, Moov, Wave. Via CinetPay.'
                        : 'Disponible uniquement pour la zone OHADA (F CFA)'}
                    </p>
                  </div>
                  {sub?.capabilities?.cinetpayEnabled === false && ['XAF', 'XOF', 'CDF', 'GNF'].includes(countryCfg.currencyCode) && (
                    <span className="text-[9px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Mode test</span>
                  )}
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                onClick={() => setUpgradeOpen(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={() => checkoutMut.mutate({ plan: upgradeOpen as 'STARTER' | 'PRO' | 'PREMIUM', interval, provider })}
                disabled={checkoutMut.isPending}
                className="rounded-lg bg-forest-900 px-5 py-2 text-sm font-semibold text-white hover:bg-forest-800 disabled:opacity-50"
              >
                {checkoutMut.isPending ? 'Redirection…' : `Payer ${interval === 'MONTHLY' ? allPricing[upgradeOpen].formatted : allPricing[upgradeOpen].yearlyFormatted}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modules section */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Modules inclus</h2>

        {modules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
            <p className="text-sm text-gray-400">Aucun module activé sur ce forfait.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white overflow-hidden">
            {modules.map((mod) => (
              <div key={mod} className="flex items-center gap-3 px-4 py-3">
                <svg
                  className="h-4 w-4 shrink-0 text-forest-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">
                  {MODULE_LABELS[mod] ?? mod}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Payment history — pas de paiements pour les nouveaux comptes */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Historique de paiements</h2>

        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-8 text-center">
          <p className="text-sm text-gray-500">
            Aucun paiement pour l'instant.
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Vos prochaines factures apparaîtront ici après votre premier renouvellement.
          </p>
        </div>
      </section>
    </div>
  )
}
