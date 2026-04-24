import { useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { getCountryConfig, getFlagEmoji } from '@athenis/shared-types'

type SettingsTab = 'localisation' | 'compte' | 'securite'

const TABS: { key: SettingsTab; label: string }[] = [
  { key: 'localisation', label: 'Localisation' },
  { key: 'compte', label: 'Compte' },
  { key: 'securite', label: 'Sécurité' },
]

function LocalisationTab() {
  const { user } = useAuth()
  const country = user?.country ?? 'FR'
  const cfg = getCountryConfig(country)

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Localisation de l'entreprise</h2>
        <p className="mt-1 text-sm text-gray-500">
          Ces paramètres sont définis à l'inscription et déterminent les règles comptables appliquées.
        </p>
      </div>

      {/* Country + currency */}
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <Row label="Pays" value={`${getFlagEmoji(country)} ${cfg.name}`} />
        <Row label="Monnaie" value={`${cfg.currency} (${cfg.currencySymbol})`} />
        <Row label="Fuseau horaire" value={cfg.timezone} />
        <Row label="Format de date" value={cfg.locale.startsWith('fr') ? 'JJ/MM/AAAA' : 'MM/DD/YYYY'} />
      </div>

      {/* Accounting zone — read-only */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Cadre comptable appliqué</h3>
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          <Row
            label="Zone comptable"
            value={
              cfg.accountingZone === 'FRANCE' ? '🇫🇷 France'
              : cfg.accountingZone === 'OHADA' ? '🌍 OHADA'
              : '🌐 IFRS (International)'
            }
            badge
          />
          <Row label="Plan comptable" value={cfg.accountingPlan} readonly />
          <Row label="Normes applicables" value={cfg.accountingNorms} readonly />
          {cfg.vatRates.length > 0 && cfg.vatRates[0] !== 0 && (
            <Row
              label="Taux de TVA"
              value={cfg.vatRates.map((r) => `${r}%`).join(' · ')}
              readonly
            />
          )}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          La zone comptable est déterminée à l'inscription et ne peut être modifiée que par un super-administrateur.
        </p>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  readonly,
  badge,
}: {
  label: string
  value: string
  readonly?: boolean
  badge?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        {badge ? (
          <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-800">
            {value}
          </span>
        ) : (
          <span className={`text-sm font-medium ${readonly ? 'text-gray-400' : 'text-gray-900'}`}>
            {value}
          </span>
        )}
        {readonly && (
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">
            AUTO
          </span>
        )}
      </div>
    </div>
  )
}

function CompteTab() {
  const { user } = useAuth()
  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900">Informations du compte</h2>
      <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <Row label="Email" value={user?.email ?? '—'} />
        <Row label="Rôle" value={user?.role ?? '—'} />
        <Row label="Plan" value={user?.plan ?? '—'} />
      </div>
    </div>
  )
}

function SecuriteTab() {
  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-base font-semibold text-gray-900">Sécurité</h2>
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-500">Gestion du mot de passe et de l'authentification à deux facteurs.</p>
      </div>
    </div>
  )
}

export function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('localisation')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Paramètres</h1>
        <p className="mt-1 text-sm text-gray-500">Gérez votre compte et les préférences de votre entreprise</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key
                ? 'border-forest-900 text-forest-900'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'localisation' && <LocalisationTab />}
        {tab === 'compte' && <CompteTab />}
        {tab === 'securite' && <SecuriteTab />}
      </div>
    </div>
  )
}
