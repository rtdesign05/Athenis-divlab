import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAllPlansPricing, getCountryConfig, ALL_COUNTRIES } from '@athenis/shared-types'
import type { Plan } from '@athenis/shared-types'
import { useDetectedCountry } from '@/hooks/useDetectedCountry'

const PLAN_FEATURES: Record<Plan, { limits: string[]; modules: string[]; support: string }> = {
  FREE: {
    limits:  ['1 utilisateur', '30 factures/mois', '50 clients', 'Stockage 500 MB'],
    modules: ['Gestion commerciale (essentiel)', 'Tableau de bord'],
    support: 'Email — 48h ouvrées',
  },
  STARTER: {
    limits:  ['3 utilisateurs', '200 factures/mois', '500 clients', 'Stockage 5 GB'],
    modules: ['Tout du Gratuit', 'RH (employés + congés)', 'Facturation récurrente', 'Multi-comptes bancaires'],
    support: 'Email — 24h ouvrées',
  },
  PRO: {
    limits:  ['5 utilisateurs', 'Factures illimitées', 'Clients illimités', 'Stockage 50 GB'],
    modules: ['Tout du Starter', 'Comptabilité complète', 'Juridique + signature électronique', 'États financiers normés'],
    support: 'Email + Chat — 12h ouvrées',
  },
  PREMIUM: {
    limits:  ['20 utilisateurs', 'Tout illimité', 'Multi-entreprises (cabinet)', 'Stockage 500 GB'],
    modules: ['Tout du Pro', 'ESG / CSRD reporting', 'Fiscalité avancée (DSF, déclarations)', 'API & exports custom'],
    support: 'Téléphone dédié — 4h ouvrées',
  },
}

const PLAN_INFO_LOCAL: Array<{ plan: Plan; label: string; tagline: string; cta: string; popular: boolean }> = [
  { plan: 'FREE',    label: 'Gratuit', tagline: 'Pour démarrer en douceur',                cta: 'Créer un compte gratuit', popular: false },
  { plan: 'STARTER', label: 'Starter', tagline: 'Pour les TPE qui se structurent',         cta: 'Démarrer avec Starter',    popular: false },
  { plan: 'PRO',     label: 'Pro',     tagline: 'Pour les PME en croissance',              cta: 'Démarrer avec Pro',        popular: true  },
  { plan: 'PREMIUM', label: 'Premium', tagline: 'Pour les cabinets et grandes structures', cta: 'Démarrer avec Premium',    popular: false },
]

export function PricingPage() {
  // Pays détecté automatiquement via IP (défaut CM), modifiable par le sélecteur.
  const { countryCode, setCountryCode } = useDetectedCountry('CM')
  const [yearly, setYearly] = useState(false)

  const cfg     = getCountryConfig(countryCode)
  const pricing = getAllPlansPricing(cfg.currencyCode, cfg.locale, cfg.currencySymbol)

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-forest-50/40 to-white pt-12 pb-8 lg:pt-20 lg:pb-12 border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-forest-700 mb-3">Tarifs</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900">
            Des tarifs adaptés à <span className="text-forest-700">votre marché</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Démarrez gratuitement, évoluez à votre rythme. Tarifs en monnaie locale,
            sans frais cachés, sans engagement.
          </p>

          {/* Sélecteur pays / billing */}
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="country-select" className="text-sm text-gray-600">Pays :</label>
              <select
                id="country-select"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              >
                {ALL_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                ))}
              </select>
            </div>
            <div className="hidden sm:block h-6 w-px bg-gray-200"></div>
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setYearly(false)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${yearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                Annuel <span className="text-forest-700 font-bold">-17%</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Plans */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-6">
            {PLAN_INFO_LOCAL.map(({ plan, label, tagline, cta, popular }) => {
              const price = pricing[plan]
              const features = PLAN_FEATURES[plan]
              return (
                <div
                  key={plan}
                  className={`relative rounded-2xl bg-white p-7 ${
                    popular
                      ? 'ring-2 ring-forest-600 shadow-xl scale-[1.02]'
                      : 'border border-gray-200 shadow-sm'
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      Le plus populaire
                    </span>
                  )}

                  <h3 className="text-lg font-bold text-gray-900">{label}</h3>
                  <p className="mt-1 text-sm text-gray-500 min-h-[36px]">{tagline}</p>

                  <div className="mt-6 flex items-baseline gap-1.5">
                    {price.amount === 0 ? (
                      <p className="text-4xl font-bold text-gray-900">Gratuit</p>
                    ) : (
                      <>
                        <p className="text-4xl font-bold text-gray-900">
                          {yearly
                            ? price.yearlyFormatted.replace(/[^\d\s.,]/g, '').trim()
                            : price.formatted.replace(/[^\d\s.,]/g, '').trim()}
                        </p>
                        <span className="text-sm font-medium text-gray-500">{price.symbol}</span>
                      </>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {price.amount === 0 ? 'Pour toujours' : (yearly ? '/ an (2 mois offerts)' : '/ mois')}
                  </p>

                  <Link
                    to="/auth/register"
                    className={`mt-6 block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                      popular
                        ? 'bg-forest-900 text-white hover:bg-forest-800'
                        : 'border-2 border-gray-200 text-gray-700 hover:border-forest-300 hover:text-forest-700'
                    }`}
                  >
                    {cta}
                  </Link>

                  {/* Features */}
                  <div className="mt-7 pt-7 border-t border-gray-100 space-y-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Limites</p>
                      <ul className="space-y-1.5">
                        {features.limits.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                            <svg className="h-4 w-4 shrink-0 text-forest-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/></svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Modules inclus</p>
                      <ul className="space-y-1.5">
                        {features.modules.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                            <svg className="h-4 w-4 shrink-0 text-forest-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd"/></svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Support</p>
                      <p className="text-sm text-gray-600">{features.support}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Note tarification locale */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Prix affichés en <strong>{cfg.currency}</strong> ({cfg.currencySymbol}) pour <strong>{cfg.flag} {cfg.name}</strong> — sélecteur pays en haut de page
          </p>
        </div>
      </section>

      {/* FAQ tarification */}
      <section className="py-16 bg-gray-50/30 border-t border-gray-100">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-12">
            Questions sur les tarifs
          </h2>
          <div className="space-y-6">
            {[
              { q: 'Puis-je changer de plan à tout moment ?',         a: 'Oui. Vous pouvez passer à un plan supérieur ou inférieur quand vous le souhaitez. Le nouveau tarif s\'applique au prorata du temps restant dans votre période de facturation.' },
              { q: 'Y a-t-il des frais cachés ?',                     a: 'Non. Le prix affiché est le prix payé. Pas de frais d\'installation, pas de frais de mise à jour, pas de surcoût pour les fonctionnalités annoncées dans votre plan.' },
              { q: 'Que se passe-t-il si je dépasse une limite ?',    a: 'Nous vous prévenons à 80% et 100% de votre limite. Vous pouvez upgrader instantanément ou attendre le mois suivant. Aucune action n\'est jamais bloquée brutalement.' },
              { q: 'Acceptez-vous Mobile Money ?',                    a: 'Oui, Orange Money et MTN Mobile Money pour les pays africains. Carte bancaire et virement SEPA pour la France et l\'Europe.' },
              { q: 'Y a-t-il une réduction pour les cabinets comptables ?', a: 'Le plan Premium inclut le mode cabinet multi-clients à un tarif unique, quel que soit le nombre de dossiers clients gérés. Un tarif sur mesure est possible pour les grands cabinets — contactez-nous.' },
            ].map((f) => (
              <div key={f.q} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="font-semibold text-gray-900">{f.q}</p>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
