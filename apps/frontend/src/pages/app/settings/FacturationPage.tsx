import { useAuth } from '@/features/auth/useAuth'
import type { Plan, Module } from '@athenis/shared-types'
import { getAllPlansPricing, getCountryConfig } from '@athenis/shared-types'

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

// Demo data
const DEMO_USER_COUNT = 3

// Demo invoice dates — montants calculés dynamiquement avec la devise locale
const DEMO_INVOICE_DATES = ['01/04/2026', '01/03/2026', '01/02/2026']

// Renewal date: first day of next month
const RENEWAL_DATE = '01/05/2026'

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

  const plan: Plan = user?.plan ?? 'FREE'
  const modules: Module[] = (user?.modules ?? []) as Module[]
  const maxUsers = PLAN_LIMITS[plan]

  // ── Tarification multi-devise basée sur le pays de l'entreprise ─────────────
  // Cameroun → F CFA (XAF), France → €, Sénégal → F CFA (XOF), USA → $, etc.
  const countryCode  = user?.country ?? 'FR'
  const countryCfg   = getCountryConfig(countryCode)
  const allPricing   = getAllPlansPricing(countryCfg.currencyCode, countryCfg.locale, countryCfg.currencySymbol)
  const currentPrice = allPricing[plan]

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
                Renouvellement {RENEWAL_DATE}
              </span>
            )}
          </div>

          {/* User count progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Utilisateurs
              </span>
              <span className="text-xs text-gray-400">
                {DEMO_USER_COUNT} sur {maxUsers} inclus
              </span>
            </div>
            <ProgressBar value={DEMO_USER_COUNT} max={maxUsers} />
          </div>

          {/* CTA */}
          <div className="pt-1">
            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors">
              Changer de forfait
              <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
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
              </div>
            )
          })}
        </div>

        <p className="text-[11px] text-gray-400 italic">
          Tarifs adaptés au pouvoir d'achat local. Les paiements seront prélevés dans cette devise lorsque la facturation sera activée.
        </p>
      </section>

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

      {/* Payment history */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">Historique de paiements</h2>

        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Télécharger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DEMO_INVOICE_DATES.map((date, i) => (
                <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-700">{date}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {currentPrice.formatted}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                      Payé
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 opacity-60 cursor-not-allowed"
                      title="Fonctionnalité à venir"
                    >
                      <span aria-hidden="true">📄</span>
                      Télécharger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400">
          Fonctionnalité de facturation complète à venir.
        </p>
      </section>
    </div>
  )
}
