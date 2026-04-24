import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import {
  settingsApi,
  type SettingsUser,
  type CompanyRole,
  type UserStatus,
  type RolePermissions,
} from '@/services/settingsApi'

// ── Constants ─────────────────────────────────────────────────────────────────

const USER_LIMITS: Record<string, number> = {
  FREE: 1,
  STARTER: 3,
  PRO: 5,
  PREMIUM: 99,
}

const PERMISSION_LABELS: Record<keyof RolePermissions, string> = {
  gestion:      'Gestion',
  comptabilite: 'Comptabilité',
  rh:           'Ressources humaines',
  juridique:    'Juridique',
  esg:          'ESG',
  settings:     'Paramètres',
}

const PERMISSION_LEVEL_LABELS: Record<string, string> = {
  none:  'Aucun',
  read:  'Lecture',
  write: 'Écriture',
  admin: 'Admin',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

function getInitials(user: SettingsUser): string {
  if (user.firstName || user.lastName) {
    const f = user.firstName?.[0] ?? ''
    const l = user.lastName?.[0] ?? ''
    const initials = (f + l).toUpperCase()
    return initials !== '' ? initials : (user.email[0]?.toUpperCase() ?? '?')
  }
  return user.email[0]?.toUpperCase() ?? '?'
}

function getDisplayName(user: SettingsUser): string {
  if (user.firstName || user.lastName) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ')
  }
  return user.email
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: UserStatus }) {
  const map: Record<UserStatus, { label: string; cls: string }> = {
    ACTIVE:    { label: 'Actif',     cls: 'bg-green-100 text-green-700' },
    INACTIVE:  { label: 'Inactif',   cls: 'bg-gray-100 text-gray-500' },
    SUSPENDED: { label: 'Suspendu',  cls: 'bg-red-100 text-red-700' },
    INVITED:   { label: 'Invité',    cls: 'bg-amber-100 text-amber-700' },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

function RoleBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
      {name}
    </span>
  )
}

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-gray-900 px-5 py-3 text-sm text-white shadow-lg">
      {message}
    </div>
  )
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

interface InviteModalProps {
  roles: CompanyRole[]
  onClose: () => void
  onSuccess: () => void
}

function InviteModal({ roles, onClose, onSuccess }: InviteModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedRole = roles.find((r) => r.id === roleId) ?? null

  async function handleSend() {
    setLoading(true)
    setError(null)
    try {
      const inviteBody: { email: string; roleId: string; firstName?: string; lastName?: string } = {
        email,
        roleId,
      }
      if (firstName) inviteBody.firstName = firstName
      if (lastName) inviteBody.lastName = lastName
      await settingsApi.inviteUser(inviteBody)
      onSuccess()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  function handleNext() {
    if (step === 1) {
      if (!email.trim()) { setError('L\'email est requis'); return }
      if (!roleId) { setError('Veuillez sélectionner un rôle'); return }
      setError(null)
      setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Inviter un utilisateur</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 px-6 pt-4">
          {([1, 2, 3] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  step === s
                    ? 'bg-gray-900 text-white'
                    : step > s
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > s ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {i < 2 && <div className={`h-px w-8 ${step > s ? 'bg-green-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Renseignez les informations de l'utilisateur à inviter.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="utilisateur@exemple.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Prénom"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Nom"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rôle <span className="text-red-500">*</span>
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && selectedRole && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Permissions accordées avec le rôle <strong className="text-gray-800">{selectedRole.name}</strong>.
              </p>
              {selectedRole.description && (
                <p className="text-sm text-gray-400 italic">{selectedRole.description}</p>
              )}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {(Object.entries(selectedRole.permissions) as [keyof RolePermissions, string][]).map(
                  ([key, level], i) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                        i > 0 ? 'border-t border-gray-100' : ''
                      }`}
                    >
                      <span className="text-gray-600">{PERMISSION_LABELS[key]}</span>
                      <span
                        className={`font-medium ${
                          level === 'none'
                            ? 'text-gray-300'
                            : level === 'admin'
                            ? 'text-purple-600'
                            : level === 'write'
                            ? 'text-blue-600'
                            : 'text-green-600'
                        }`}
                      >
                        {PERMISSION_LEVEL_LABELS[level] ?? level}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Récapitulatif avant envoi de l'invitation.</p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-gray-500">Email</span>
                  <span className="font-medium text-gray-900">{email}</span>
                </div>
                {(firstName || lastName) && (
                  <div className="flex items-center justify-between px-4 py-2.5 text-sm border-t border-gray-100">
                    <span className="text-gray-500">Nom</span>
                    <span className="font-medium text-gray-900">
                      {[firstName, lastName].filter(Boolean).join(' ')}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2.5 text-sm border-t border-gray-100">
                  <span className="text-gray-500">Rôle</span>
                  <span className="font-medium text-gray-900">{selectedRole?.name ?? '—'}</span>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
          )}

          {step !== 3 && error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <button
            onClick={() => {
              if (step === 1) onClose()
              else setStep((s) => (s - 1) as 1 | 2 | 3)
            }}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {step === 1 ? 'Annuler' : '← Précédent'}
          </button>
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              Suivant →
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={loading}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Envoi…' : 'Envoyer l\'invitation'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

function ConfirmDialog({ message, onConfirm, onCancel, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm text-gray-700">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'Suppression…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── User Row ──────────────────────────────────────────────────────────────────

interface UserRowProps {
  user: SettingsUser
  roles: CompanyRole[]
  isSelf: boolean
  onRoleUpdated: (userId: string, roleId: string) => Promise<void>
  onStatusToggled: (userId: string, current: UserStatus) => Promise<void>
  onDeleted: (userId: string) => Promise<void>
  onCancelInvite: (userId: string) => Promise<void>
}

function UserRow({
  user,
  roles,
  isSelf,
  onRoleUpdated,
  onStatusToggled,
  onDeleted,
  onCancelInvite,
}: UserRowProps) {
  const [editingRole, setEditingRole] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState(user.companyRoleId ?? '')
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const displayRole = user.companyRoleName ?? user.globalRole

  async function handleSaveRole() {
    if (!selectedRoleId) return
    setActionLoading(true)
    try {
      await onRoleUpdated(user.id, selectedRoleId)
      setEditingRole(false)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleStatusToggle() {
    setActionLoading(true)
    try {
      await onStatusToggled(user.id, user.status)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDelete() {
    setActionLoading(true)
    try {
      await onDeleted(user.id)
      setConfirmDelete(false)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancelInvite() {
    setActionLoading(true)
    try {
      await onCancelInvite(user.id)
    } finally {
      setActionLoading(false)
    }
  }

  const lastActivity = user.isInvitation
    ? formatDate(user.invitedAt)
    : formatDate(user.lastLoginAt)

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          message={`Supprimer l'utilisateur "${getDisplayName(user)}" ? Cette action est irréversible.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
          loading={actionLoading}
        />
      )}
      <tr className="hover:bg-gray-50 transition-colors">
        {/* Utilisateur */}
        <td className="py-3 pl-4 pr-3">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 rounded-full h-8 w-8 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
              {getInitials(user)}
            </div>
            <span className="text-sm font-medium text-gray-900">{getDisplayName(user)}</span>
          </div>
        </td>

        {/* Email */}
        <td className="py-3 px-3">
          <span className="text-sm text-gray-500">{user.email}</span>
        </td>

        {/* Rôle */}
        <td className="py-3 px-3">
          {editingRole ? (
            <div className="flex items-center gap-2">
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="rounded-lg border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                onClick={handleSaveRole}
                disabled={actionLoading}
                className="rounded px-2 py-1 text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50"
              >
                {actionLoading ? '…' : 'OK'}
              </button>
              <button
                onClick={() => { setEditingRole(false); setSelectedRoleId(user.companyRoleId ?? '') }}
                className="rounded px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
          ) : (
            <RoleBadge name={displayRole} />
          )}
        </td>

        {/* Statut */}
        <td className="py-3 px-3">
          <StatusBadge status={user.status} />
        </td>

        {/* Dernière connexion */}
        <td className="py-3 px-3">
          <span className="text-sm text-gray-500">{lastActivity}</span>
        </td>

        {/* 2FA */}
        <td className="py-3 px-3 text-center">
          {user.totpEnabled ? (
            <span className="text-green-600 font-bold">✓</span>
          ) : (
            <span className="text-gray-300 font-bold">✗</span>
          )}
        </td>

        {/* Actions */}
        <td className="py-3 pl-3 pr-4">
          {isSelf ? (
            <span className="text-xs text-gray-300">Vous</span>
          ) : user.isInvitation ? (
            <button
              onClick={handleCancelInvite}
              disabled={actionLoading}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {actionLoading ? '…' : 'Annuler invitation'}
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  setSelectedRoleId(user.companyRoleId ?? roles[0]?.id ?? '')
                  setEditingRole(true)
                }}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Modifier rôle
              </button>
              <button
                onClick={handleStatusToggle}
                disabled={actionLoading}
                className={`text-sm transition-colors disabled:opacity-50 ${
                  user.status === 'SUSPENDED'
                    ? 'text-green-600 hover:text-green-800'
                    : 'text-amber-600 hover:text-amber-800'
                }`}
              >
                {actionLoading
                  ? '…'
                  : user.status === 'SUSPENDED'
                  ? 'Activer'
                  : 'Suspendre'}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-red-500 hover:text-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          )}
        </td>
      </tr>
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function UtilisateursPage() {
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<SettingsUser[]>([])
  const [roles, setRoles] = useState<CompanyRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const plan = authUser?.plan ?? 'FREE'
  const limit = USER_LIMITS[plan] ?? 1

  const activeAndInvited = users.filter(
    (u) => u.status === 'ACTIVE' || u.status === 'INVITED',
  ).length

  const limitReached = activeAndInvited >= limit

  const loadData = useCallback(async () => {
    try {
      const [fetchedUsers, fetchedRoles] = await Promise.all([
        settingsApi.listUsers(),
        settingsApi.listRoles(),
      ])
      setUsers(fetchedUsers)
      setRoles(fetchedRoles)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const handleRoleUpdated = useCallback(async (userId: string, roleId: string) => {
    await settingsApi.updateUserRole(userId, roleId)
    const role = roles.find((r) => r.id === roleId)
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, companyRoleId: roleId, companyRoleName: role?.name ?? u.companyRoleName }
          : u,
      ),
    )
  }, [roles])

  const handleStatusToggled = useCallback(async (userId: string, current: UserStatus) => {
    const next: UserStatus = current === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
    await settingsApi.updateUserStatus(userId, next)
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: next } : u)),
    )
  }, [])

  const handleDeleted = useCallback(async (userId: string) => {
    await settingsApi.deleteUser(userId)
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }, [])

  const handleCancelInvite = useCallback(async (userId: string) => {
    await settingsApi.deleteUser(userId)
    setUsers((prev) => prev.filter((u) => u.id !== userId))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  return (
    <>
      {toast && (
        <Toast message={toast} onDone={() => setToast(null)} />
      )}

      {showInviteModal && (
        <InviteModal
          roles={roles}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setToast('Invitation envoyée avec succès !')
            void loadData()
          }}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Utilisateurs ({activeAndInvited}/{limit})
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gérez les membres de votre équipe et leurs accès.
            </p>
          </div>
          {!limitReached && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Inviter un utilisateur
            </button>
          )}
        </div>

        {/* Limit warning banner */}
        {limitReached && (
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-lg leading-none">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  Limite atteinte ({activeAndInvited}/{limit} utilisateurs)
                </p>
                <p className="mt-0.5 text-sm text-amber-700">
                  Passez au forfait supérieur pour ajouter d'autres utilisateurs.
                </p>
              </div>
              <button className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 transition-colors">
                Voir les forfaits
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="py-3 pl-4 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Utilisateur
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Rôle
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Statut
                  </th>
                  <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Dernière connexion
                  </th>
                  <th className="py-3 px-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    2FA
                  </th>
                  <th className="py-3 pl-3 pr-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      roles={roles}
                      isSelf={user.email === authUser?.email}
                      onRoleUpdated={handleRoleUpdated}
                      onStatusToggled={handleStatusToggled}
                      onDeleted={handleDeleted}
                      onCancelInvite={handleCancelInvite}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
