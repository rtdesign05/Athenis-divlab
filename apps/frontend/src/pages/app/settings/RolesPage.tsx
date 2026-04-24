import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  settingsApi,
  type CompanyRole,
  type RolePermissions,
  type PermissionLevel,
} from '@/services/settingsApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const MODULES: (keyof RolePermissions)[] = [
  'gestion',
  'comptabilite',
  'rh',
  'juridique',
  'esg',
  'settings',
]

const MODULE_LABELS: Record<keyof RolePermissions, string> = {
  gestion:      'Gestion',
  comptabilite: 'Comptabilité',
  rh:           'RH',
  juridique:    'Juridique',
  esg:          'ESG',
  settings:     'Paramètres',
}

const LEVELS: PermissionLevel[] = ['none', 'read', 'write', 'admin']

const LEVEL_LABELS: Record<PermissionLevel, string> = {
  none:  'Aucun',
  read:  'Lecture',
  write: 'Écriture',
  admin: 'Admin',
}

const SYSTEM_ROLE_ICONS: Record<string, string> = {
  Admin:    '👑',
  Comptable:'📊',
  RH:       '👥',
  Readonly: '📖',
}

const DEFAULT_PERMISSIONS: RolePermissions = {
  gestion:      'none',
  comptabilite: 'none',
  rh:           'none',
  juridique:    'none',
  esg:          'none',
  settings:     'none',
}

// ── Toggle ────────────────────────────────────────────────────────────────────

// ── Permission badge ──────────────────────────────────────────────────────────

function PermissionBadge({ level }: { level: PermissionLevel }) {
  if (level === 'none') return null
  const styles: Record<Exclude<PermissionLevel, 'none'>, string> = {
    read:  'bg-blue-100 text-blue-700',
    write: 'bg-forest-100 text-forest-700',
    admin: 'bg-purple-100 text-purple-700',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[level as Exclude<PermissionLevel, 'none'>]}`}
    >
      {LEVEL_LABELS[level]}
    </span>
  )
}

// ── System role card ──────────────────────────────────────────────────────────

function SystemRoleCard({ role }: { role: CompanyRole }) {
  const icon =
    SYSTEM_ROLE_ICONS[role.name] ??
    Object.entries(SYSTEM_ROLE_ICONS).find(([k]) =>
      role.name.toLowerCase().includes(k.toLowerCase()),
    )?.[1] ??
    '🔐'

  const activePerms = MODULES.filter((m) => role.permissions[m] !== 'none')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">
            {icon}
          </span>
          <span className="text-sm font-semibold text-gray-900">{role.name}</span>
        </div>
        <span className="text-xs text-gray-400">
          {role.userCount} utilisateur{role.userCount !== 1 ? 's' : ''}
        </span>
      </div>
      {role.description && (
        <p className="text-xs text-gray-500">{role.description}</p>
      )}
      {activePerms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activePerms.map((m) => (
            <div key={m} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                {MODULE_LABELS[m]}:
              </span>
              <PermissionBadge level={role.permissions[m]} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Permission matrix ─────────────────────────────────────────────────────────

function PermissionMatrix({
  permissions,
  onChange,
}: {
  permissions: RolePermissions
  onChange: (p: RolePermissions) => void
}) {
  function setLevel(module: keyof RolePermissions, level: PermissionLevel) {
    onChange({ ...permissions, [module]: level })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">
              Module
            </th>
            {LEVELS.map((l) => (
              <th
                key={l}
                className="py-2 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide"
              >
                {LEVEL_LABELS[l]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {MODULES.map((mod) => (
            <tr key={mod} className="hover:bg-gray-50/50">
              <td className="py-2.5 pr-4 text-sm font-medium text-gray-700">
                {MODULE_LABELS[mod]}
              </td>
              {LEVELS.map((level) => {
                const selected = permissions[mod] === level
                return (
                  <td key={level} className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => setLevel(mod, level)}
                      className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                        selected
                          ? 'border-forest-600 bg-forest-600'
                          : 'border-gray-300 bg-white hover:border-forest-400'
                      }`}
                      aria-label={`${MODULE_LABELS[mod]} — ${LEVEL_LABELS[level]}`}
                    >
                      {selected && (
                        <span className="block h-2 w-2 rounded-full bg-white" />
                      )}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Create role modal ─────────────────────────────────────────────────────────

function CreateRoleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (role: CompanyRole) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<RolePermissions>(DEFAULT_PERMISSIONS)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      const trimmedDesc = description.trim()
      const role = await settingsApi.createRole(
        trimmedDesc
          ? { name: name.trim(), description: trimmedDesc, permissions }
          : { name: name.trim(), permissions },
      )
      onCreate(role)
    } catch {
      setError('Erreur lors de la création du rôle. Veuillez réessayer.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Créer un rôle personnalisé
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex. Responsable commercial"
                required
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description{' '}
                <span className="text-gray-400 font-normal">(optionnel)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez les responsabilités de ce rôle"
                className="block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-500/20"
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Matrice des permissions
            </h3>
            <PermissionMatrix permissions={permissions} onChange={setPermissions} />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Création…' : 'Créer le rôle'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Custom role card ──────────────────────────────────────────────────────────

function CustomRoleCard({
  role,
  onDelete,
}: {
  role: CompanyRole
  onDelete: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Supprimer le rôle "${role.name}" ? Cette action est irréversible.`)) return
    setDeleting(true)
    try {
      await settingsApi.deleteRole(role.id)
      onDelete(role.id)
    } catch {
      alert('Erreur lors de la suppression du rôle.')
      setDeleting(false)
    }
  }

  const activePerms = MODULES.filter((m) => role.permissions[m] !== 'none')

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{role.name}</span>
            <span className="text-xs text-gray-400">
              {role.userCount} utilisateur{role.userCount !== 1 ? 's' : ''}
            </span>
          </div>
          {role.description && (
            <p className="text-xs text-gray-500 truncate">{role.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors"
          title="Supprimer ce rôle"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>
      {activePerms.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activePerms.map((m) => (
            <div key={m} className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
                {MODULE_LABELS[m]}:
              </span>
              <PermissionBadge level={role.permissions[m]} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Aucune permission accordée</p>
      )}
    </div>
  )
}

// ── Upgrade banner ────────────────────────────────────────────────────────────

function UpgradeBanner() {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 p-6 text-center space-y-3">
      <div className="flex items-center justify-center gap-2">
        <span className="text-xl" aria-hidden="true">🔒</span>
        <span className="text-sm font-semibold text-gray-800">
          Rôles personnalisés — Forfait Pro requis
        </span>
      </div>
      <p className="text-sm text-gray-500">
        Créez des rôles sur mesure pour votre équipe et définissez des permissions granulaires par module.
      </p>
      <button className="inline-flex items-center gap-2 rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 transition-colors">
        Découvrir le forfait Pro
      </button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RolesPage() {
  const { user } = useAuth()
  const [roles, setRoles] = useState<CompanyRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const plan = user?.plan ?? 'FREE'
  const canCreateCustom = plan === 'PRO' || plan === 'PREMIUM'

  useEffect(() => {
    setLoading(true)
    settingsApi
      .listRoles()
      .then(setRoles)
      .catch(() => setError('Impossible de charger les rôles.'))
      .finally(() => setLoading(false))
  }, [])

  const systemRoles = roles.filter((r) => r.isSystem)
  const customRoles = roles.filter((r) => !r.isSystem)

  function handleCreated(role: CompanyRole) {
    setRoles((prev) => [...prev, role])
    setShowModal(false)
  }

  function handleDeleted(id: string) {
    setRoles((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Rôles &amp; Accès</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gérez les rôles et les niveaux d'accès des membres de votre équipe.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* System roles */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Rôles système</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Ces rôles sont prédéfinis et ne peuvent pas être modifiés.
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4 h-24 animate-pulse bg-gray-50"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {systemRoles.map((role) => (
              <SystemRoleCard key={role.id} role={role} />
            ))}
          </div>
        )}
      </section>

      {/* Custom roles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Rôles personnalisés</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Créez des rôles sur mesure adaptés à votre organisation.
            </p>
          </div>
          {canCreateCustom && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-2 text-sm font-medium text-white hover:bg-forest-800 transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Créer un rôle
            </button>
          )}
        </div>

        {!canCreateCustom ? (
          <UpgradeBanner />
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-gray-200 bg-white p-4 h-24 animate-pulse bg-gray-50"
              />
            ))}
          </div>
        ) : customRoles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-sm text-gray-500">
              Aucun rôle personnalisé pour l'instant.{' '}
              <button
                onClick={() => setShowModal(true)}
                className="text-forest-700 hover:underline font-medium"
              >
                Créer le premier
              </button>
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {customRoles.map((role) => (
              <CustomRoleCard key={role.id} role={role} onDelete={handleDeleted} />
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {showModal && (
        <CreateRoleModal onClose={() => setShowModal(false)} onCreate={handleCreated} />
      )}
    </div>
  )
}
