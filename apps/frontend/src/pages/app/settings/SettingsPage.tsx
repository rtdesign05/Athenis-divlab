import { useState, useId, type FormEvent } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { getCountryConfig, getFlagEmoji } from '@athenis/shared-types'
import { useChangePassword } from '@/hooks/useSecurity'

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
  const currentId = useId()
  const newId     = useId()
  const confirmId = useId()

  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [clientError, setClientError] = useState('')
  const [success, setSuccess]         = useState(false)

  const mutation = useChangePassword()

  function validate(): string | null {
    if (!current)           return 'Mot de passe actuel requis'
    if (next.length < 8)   return 'Au moins 8 caractères'
    if (next.length > 128) return 'Trop long (128 max)'
    if (!/[A-Z]/.test(next)) return 'Doit contenir au moins une majuscule'
    if (!/[0-9]/.test(next)) return 'Doit contenir au moins un chiffre'
    if (next !== confirm)  return 'Les deux mots de passe ne correspondent pas'
    if (next === current)  return 'Le nouveau mot de passe doit être différent de l\'actuel'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setClientError(''); setSuccess(false); mutation.reset()
    const err = validate()
    if (err) { setClientError(err); return }
    try {
      await mutation.mutateAsync({ currentPassword: current, newPassword: next })
      setSuccess(true)
      setCurrent(''); setNext(''); setConfirm('')
    } catch { /* error shown below */ }
  }

  const serverError =
    (mutation.error as { response?: { data?: { error?: string } } })
      ?.response?.data?.error ?? null

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Sécurité du compte</h2>
        <p className="mt-1 text-sm text-gray-500">Modifiez votre mot de passe de connexion.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">Changer le mot de passe</h3>

        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            ✓ Mot de passe modifié avec succès.
          </div>
        )}
        {serverError && (
          <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}
        {clientError && (
          <div className="mb-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {clientError}
          </div>
        )}

        <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4">
          {/* Mot de passe actuel */}
          <div>
            <label htmlFor={currentId} className="mb-1 block text-sm font-medium text-gray-700">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                id={currentId}
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showCurrent ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <label htmlFor={newId} className="mb-1 block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <div className="relative">
              <input
                id={newId}
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                {showNew ? '🙈' : '👁'}
              </button>
            </div>
            {next.length > 0 && (
              <div className="mt-1.5 flex gap-1">
                {[next.length >= 8, /[A-Z]/.test(next), /[0-9]/.test(next), next.length >= 12].map((ok, i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${ok ? 'bg-green-500' : 'bg-gray-200'}`} />
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-400">Min. 8 caractères · 1 majuscule · 1 chiffre</p>
          </div>

          {/* Confirmation */}
          <div>
            <label htmlFor={confirmId} className="mb-1 block text-sm font-medium text-gray-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${
                confirm && next && confirm !== next ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60 transition"
          >
            {mutation.isPending ? 'Modification en cours…' : 'Modifier le mot de passe'}
          </button>
        </form>
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
