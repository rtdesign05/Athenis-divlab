import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { getCountryConfig, getFlagEmoji } from '@athenis/shared-types'
import { settingsApi, type CompanySettings } from '@/services/settingsApi'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(locale: string): string {
  return locale.startsWith('fr') ? 'JJ/MM/AAAA' : 'MM/DD/YYYY'
}

function formatNumber(locale: string): string {
  return locale.startsWith('fr') ? '1\u202f234,56' : '1,234.56'
}

function accountingZoneLabel(zone: string): string {
  if (zone === 'FRANCE') return '🇫🇷 France'
  if (zone === 'OHADA')  return '🌍 OHADA'
  return '🌐 IFRS (International)'
}

// ── sub-components ────────────────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-800">
      {children}
    </span>
  )
}

function AutoBadge() {
  return (
    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
      AUTO
    </span>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export function LocalisationPage() {
  const { user } = useAuth()
  const [company, setCompany]   = useState<CompanySettings | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [uiLang, setUiLang]     = useState<'fr' | 'en'>('fr')

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const data = await settingsApi.getCompany()
      setCompany(data)
    } catch {
      setError('Impossible de charger les paramètres de localisation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-500 border-t-transparent" />
      </div>
    )
  }

  if (error || !company) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-600">
        {error ?? 'Une erreur est survenue.'}
        <button onClick={loadData} className="ml-2 underline">Réessayer</button>
      </div>
    )
  }

  // Prefer company country; fall back to JWT claim
  const countryCode = company.country || user?.country || 'FR'
  const cfg = getCountryConfig(countryCode)
  const locale = company.locale || cfg.locale

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Localisation</h1>
        <p className="mt-1 text-sm text-gray-500">
          Paramètres régionaux et cadre comptable de votre entreprise
        </p>
      </div>

      {/* ── SECTION 1 : Paramètres régionaux ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Paramètres régionaux</h2>
        <div className="divide-y divide-gray-100">
          <Row label="Pays">
            <span className="text-sm font-medium text-gray-900">
              {getFlagEmoji(countryCode)} {cfg.name}
            </span>
          </Row>

          <Row label="Monnaie">
            <span className="text-sm font-medium text-gray-900">
              {cfg.currency} ({cfg.currencySymbol})
            </span>
          </Row>

          <Row label="Fuseau horaire">
            <span className="text-sm font-medium text-gray-900">
              {company.timezone || cfg.timezone}
            </span>
          </Row>

          <Row label="Format de date">
            <span className="text-sm font-medium text-gray-900">
              {formatDate(locale)}
            </span>
          </Row>

          <Row label="Format des nombres">
            <span className="text-sm font-medium text-gray-900">
              {formatNumber(locale)}
            </span>
          </Row>
        </div>
      </div>

      {/* ── SECTION 2 : Cadre comptable ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Cadre comptable appliqué</h2>
        <div className="divide-y divide-gray-100">
          <Row label="Zone comptable">
            <Badge>
              {accountingZoneLabel(company.accountingZone)}
            </Badge>
          </Row>

          <Row label="Plan comptable">
            <span className="text-sm font-medium text-gray-400">
              {company.accountingPlan}
            </span>
            <AutoBadge />
          </Row>
        </div>
        <p className="text-xs text-gray-400 pt-1">
          Ces paramètres sont définis à l'inscription.
        </p>
      </div>

      {/* ── SECTION 3 : Langue de l'interface ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Langue de l'interface</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setUiLang('fr')}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              uiLang === 'fr'
                ? 'bg-forest-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🇫🇷 Français
          </button>
          <button
            onClick={() => setUiLang('en')}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              uiLang === 'en'
                ? 'bg-forest-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            🇬🇧 English
          </button>
        </div>
        <p className="text-xs text-gray-400">
          {uiLang === 'fr'
            ? "L\u2019interface est affich\u00e9e en fran\u00e7ais."
            : 'The interface is displayed in English.'}
        </p>
      </div>

      {/* ── SECTION 4 : Modification du pays ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <span className="text-xl leading-none">⚠️</span>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-semibold text-amber-900">
              Attention : modifier le pays réinitialise le plan comptable.
            </p>
            <p className="text-sm text-amber-800">
              Cette action nécessite une confirmation et votre mot de passe.
            </p>
            <button className="mt-2 rounded-lg border border-amber-300 bg-white px-4 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50 transition-colors">
              Contacter le support
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
