import { useState, useEffect, useId, type FormEvent } from 'react'
import { settingsApi, type SecurityPolicy, type AuditLogEntry } from '@/services/settingsApi'
import { useChangePassword } from '@/hooks/useSecurity'
import { MyTwoFactorSection } from './MyTwoFactorSection'

// ── Toggle component ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/50 ${
        checked ? 'bg-forest-600' : 'bg-gray-200'
      }`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

// ── Form row ──────────────────────────────────────────────────────────────────

function FormRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-4">
      <div className="min-w-0">
        <span className="text-sm text-gray-700">{label}</span>
        {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ── Number input ──────────────────────────────────────────────────────────────

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10)
        if (!isNaN(n)) onChange(n)
      }}
      className="w-24 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 text-right focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
    />
  )
}

// ── Audit action helpers ──────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  LOGIN:             'Connexion',
  LOGOUT:            'Déconnexion',
  LOGIN_FAILED:      'Échec connexion',
  PASSWORD_CHANGED:  'Mot de passe modifié',
  TOTP_ENABLED:      '2FA activé',
  TOTP_DISABLED:     '2FA désactivé',
  TOKEN_REFRESHED:   'Session renouvelée',
  ACCOUNT_LOCKED:    'Compte bloqué',
  ACCOUNT_UNLOCKED:  'Compte débloqué',
  ROLE_CHANGED:      'Rôle modifié',
  USER_INVITED:      'Utilisateur invité',
  USER_DELETED:      'Utilisateur supprimé',
  SETTINGS_UPDATED:  'Paramètres mis à jour',
  SECURITY_UPDATED:  'Politique de sécurité mise à jour',
}

const SUCCESS_ACTIONS = new Set(['LOGIN', 'LOGOUT', 'TOKEN_REFRESHED'])
const FAILURE_ACTIONS = new Set(['LOGIN_FAILED', 'ACCOUNT_LOCKED'])

function auditStatus(action: string): { label: string; className: string } {
  if (SUCCESS_ACTIONS.has(action)) {
    return { label: 'Succès', className: 'text-green-700 bg-green-50' }
  }
  if (FAILURE_ACTIONS.has(action)) {
    return { label: 'Échec', className: 'text-red-700 bg-red-50' }
  }
  return { label: '—', className: 'text-gray-500 bg-gray-50' }
}

function formatAuditDate(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('fr-FR') +
    ' ' +
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  )
}

function auditUserLabel(
  user: AuditLogEntry['user'],
): string {
  if (!user) return '—'
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return name || user.email
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      <div className="rounded-xl border border-gray-200 bg-white px-4 divide-y divide-gray-100">
        {children}
      </div>
    </div>
  )
}

// ── Default policy ────────────────────────────────────────────────────────────

const DEFAULT_POLICY: SecurityPolicy = {
  passwordMinLength:      8,
  requireUppercase:       true,
  requireNumbers:         true,
  requireSpecial:         false,
  passwordExpiryDays:     0,
  require2faAll:          false,
  require2faAdmin:        true,
  sessionDurationMinutes: 60,
  autoLogoutMinutes:      30,
  ipWhitelist:            [],
  blockOutsideHours:      false,
  maxLoginAttempts:       5,
  lockoutDurationMinutes: 15,
}

// ── Change password section ───────────────────────────────────────────────────

function ChangePasswordSection() {
  const currentId = useId()
  const newId     = useId()
  const confirmId = useId()

  const [current, setCurrent]         = useState('')
  const [next, setNext]               = useState('')
  const [confirm, setConfirm]         = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew]         = useState(false)
  const [clientError, setClientError] = useState('')
  const [success, setSuccess]         = useState(false)

  const mutation = useChangePassword()

  function validate(): string | null {
    if (!current)             return 'Mot de passe actuel requis'
    if (next.length < 8)     return 'Au moins 8 caractères'
    if (next.length > 128)   return 'Trop long (128 max)'
    if (!/[A-Z]/.test(next)) return 'Doit contenir au moins une majuscule'
    if (!/[0-9]/.test(next)) return 'Doit contenir au moins un chiffre'
    if (next !== confirm)    return 'Les deux mots de passe ne correspondent pas'
    if (next === current)    return "Le nouveau mot de passe doit être différent de l'actuel"
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
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="mb-1 text-sm font-semibold text-gray-700">Changer le mot de passe</h3>
      <p className="mb-4 text-xs text-gray-400">Min. 8 caractères · 1 majuscule · 1 chiffre</p>

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

      <form onSubmit={(e) => { void handleSubmit(e) }} className="space-y-4 max-w-sm">
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500"
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
            className={`w-full rounded-lg border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 ${
              confirm && next && confirm !== next ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-lg bg-forest-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-60 transition"
        >
          {mutation.isPending ? 'Modification en cours…' : 'Modifier le mot de passe'}
        </button>
      </form>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SecuritePage() {
  const [policy, setPolicy] = useState<SecurityPolicy>(DEFAULT_POLICY)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([settingsApi.getSecurity(), settingsApi.getAuditLogs()])
      .then(([sec, logs]) => {
        setPolicy(sec)
        setAuditLogs(logs)
      })
      .catch(() => setLoadError('Impossible de charger les paramètres de sécurité.'))
      .finally(() => setLoading(false))
  }, [])

  function set<K extends keyof SecurityPolicy>(key: K, value: SecurityPolicy[K]) {
    setPolicy((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const updated = await settingsApi.updateSecurity(policy)
      setPolicy(updated)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError('Erreur lors de la sauvegarde. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <div className="h-6 w-48 rounded-lg bg-gray-100 animate-pulse" />
          <div className="mt-1 h-4 w-72 rounded-lg bg-gray-100 animate-pulse" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 h-32 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Sécurité</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configurez la politique de sécurité et consultez le journal d'activité.
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      {/* Change password */}
      <ChangePasswordSection />

      {/* Personal 2FA setup (QR code + backup codes) */}
      <MyTwoFactorSection />

      {/* Passwords */}
      <Section title="Politique de mots de passe">
        <FormRow label="Longueur minimum" hint="Entre 8 et 20 caractères">
          <NumberInput
            value={policy.passwordMinLength}
            onChange={(v) => set('passwordMinLength', Math.min(20, Math.max(8, v)))}
            min={8}
            max={20}
          />
        </FormRow>
        <FormRow label="Majuscules obligatoires">
          <Toggle
            checked={policy.requireUppercase}
            onChange={(v) => set('requireUppercase', v)}
          />
        </FormRow>
        <FormRow label="Chiffres obligatoires">
          <Toggle
            checked={policy.requireNumbers}
            onChange={(v) => set('requireNumbers', v)}
          />
        </FormRow>
        <FormRow label="Caractères spéciaux obligatoires">
          <Toggle
            checked={policy.requireSpecial}
            onChange={(v) => set('requireSpecial', v)}
          />
        </FormRow>
        <FormRow label="Expiration du mot de passe (jours)" hint="0 = jamais">
          <NumberInput
            value={policy.passwordExpiryDays}
            onChange={(v) => set('passwordExpiryDays', Math.max(0, v))}
            min={0}
          />
        </FormRow>
      </Section>

      {/* Authentication */}
      <Section title="Authentification">
        <FormRow label="2FA obligatoire pour tous les utilisateurs">
          <Toggle
            checked={policy.require2faAll}
            onChange={(v) => set('require2faAll', v)}
          />
        </FormRow>
        <FormRow label="2FA obligatoire pour les administrateurs">
          <Toggle
            checked={policy.require2faAdmin}
            onChange={(v) => set('require2faAdmin', v)}
          />
        </FormRow>
        <FormRow label="Durée de session (minutes)" hint="Entre 15 et 480 min">
          <NumberInput
            value={policy.sessionDurationMinutes}
            onChange={(v) => set('sessionDurationMinutes', Math.min(480, Math.max(15, v)))}
            min={15}
            max={480}
          />
        </FormRow>
        <FormRow label="Déconnexion automatique après inactivité (minutes)">
          <NumberInput
            value={policy.autoLogoutMinutes}
            onChange={(v) => set('autoLogoutMinutes', Math.max(1, v))}
            min={1}
          />
        </FormRow>
      </Section>

      {/* Restrictions */}
      <Section title="Restrictions">
        <FormRow label="Tentatives de connexion avant blocage" hint="Entre 3 et 10">
          <NumberInput
            value={policy.maxLoginAttempts}
            onChange={(v) => set('maxLoginAttempts', Math.min(10, Math.max(3, v)))}
            min={3}
            max={10}
          />
        </FormRow>
        <FormRow label="Durée de blocage (minutes)" hint="Entre 5 et 1440 min">
          <NumberInput
            value={policy.lockoutDurationMinutes}
            onChange={(v) => set('lockoutDurationMinutes', Math.min(1440, Math.max(5, v)))}
            min={5}
            max={1440}
          />
        </FormRow>
        <FormRow label="Bloquer les connexions hors horaires de bureau">
          <Toggle
            checked={policy.blockOutsideHours}
            onChange={(v) => set('blockOutsideHours', v)}
          />
        </FormRow>
      </Section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Sauvegarde…' : 'Sauvegarder la politique'}
        </button>
        {saveSuccess && (
          <span className="text-sm text-green-600 font-medium">
            Politique sauvegardée avec succès.
          </span>
        )}
        {saveError && (
          <span className="text-sm text-red-600">{saveError}</span>
        )}
      </div>

      {/* Audit log */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Journal de sécurité</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Les 20 dernières activités de sécurité de votre espace.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Utilisateur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      Aucune activité enregistrée.
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 20).map((log) => {
                    const status = auditStatus(log.action)
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                          {formatAuditDate(log.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                          {auditUserLabel(log.user)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-700">
                          {ACTION_LABELS[log.action] ?? log.action}
                          {log.resource && (
                            <span className="text-gray-400 ml-1">· {log.resource}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">
                          {log.ipAddress ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
