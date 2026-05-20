import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuth } from '@/features/auth/useAuth'

interface UserRow {
  id: string
  email: string
  accountType: string
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
  platformRole: string
  companyId: string | null
  cabinetId: string | null
}

interface UserListData {
  items: UserRow[]
  total: number
  page: number
  totalPages: number
}

const TYPE_BADGE: Record<string, string> = {
  PERSONAL: 'bg-gray-100 text-gray-600',
  COMPANY:  'bg-blue-100 text-blue-700',
  CABINET:  'bg-purple-100 text-purple-700',
}

type StatusFilter = 'all' | 'active' | 'inactive'

const fetchUsers = (page: number, search: string) =>
  api.get<{ success: true; data: UserListData }>('/admin/users', {
    params: { page, limit: 20, ...(search ? { q: search } : {}) },
  }).then(r => r.data.data)

// ── Action modal (deactivate / delete) ───────────────────────────────────────

function ConfirmActionModal({
  user, action, onClose, onConfirm, loading,
}: {
  user:    UserRow
  action:  'deactivate' | 'delete'
  onClose: () => void
  onConfirm: (reason: string) => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const requiredText = action === 'delete' ? user.email : null

  const isDelete = action === 'delete'
  const canConfirm = !requiredText || confirmText === requiredText

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className={`h-10 w-10 flex items-center justify-center rounded-full text-xl ${isDelete ? 'bg-red-100' : 'bg-amber-100'}`}>
            {isDelete ? '🗑️' : '⚠️'}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">
              {isDelete ? 'Supprimer définitivement ce compte ?' : 'Désactiver ce compte ?'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              <strong className="text-gray-700">{user.email}</strong>
            </p>
          </div>
        </div>

        <div className={`rounded-lg border p-3 text-sm mb-4 ${isDelete ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          {isDelete ? (
            <>
              <p className="font-semibold mb-1">⚠️ Action irréversible</p>
              <p>
                Toutes les données personnelles de l'utilisateur seront effacées.
                Les données comptables seront conservées 10 ans (obligation légale)
                dans un format anonymisé.
              </p>
            </>
          ) : (
            <p>
              L'utilisateur ne pourra plus se connecter. Toutes ses sessions actives
              seront fermées immédiatement. Ses données restent conservées et
              peuvent être restaurées en réactivant le compte.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Raison (facultative — sera incluse dans l'e-mail)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={isDelete ? 'Ex : Demande de suppression de l\'utilisateur (RGPD)' : 'Ex : Non-respect des CGU'}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <p className="mt-1 text-[11px] text-gray-400">{reason.length}/500 caractères</p>
          </div>

          {isDelete && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tapez <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">{user.email}</code> pour confirmer :
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={loading || !canConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              isDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {loading ? '…' : (isDelete ? 'Supprimer définitivement' : 'Désactiver')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function UsersPage() {
  const { user: currentUser, startImpersonation } = useAuth()
  const qc = useQueryClient()

  const [page, setPage]     = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [modalTarget, setModalTarget] = useState<{ user: UserRow; action: 'deactivate' | 'delete' } | null>(null)
  const [feedback, setFeedback]       = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', page, debouncedSearch],
    queryFn: () => fetchUsers(page, debouncedSearch),
    placeholderData: (prev) => prev,
  })

  // ── Mutations ────────────────────────────────────────────────────────────
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'users'] })

  const deactivateMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(`/admin/users/${id}/deactivate`, { reason }).then(r => r.data),
    onSuccess: () => {
      setFeedback({ kind: 'ok', msg: 'Compte désactivé. Un e-mail a été envoyé à l\'utilisateur.' })
      setModalTarget(null)
      invalidate()
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setFeedback({ kind: 'err', msg: err.response?.data?.error ?? 'Erreur lors de la désactivation.' })
    },
  })

  const reactivateMut = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reactivate`).then(r => r.data),
    onSuccess: () => {
      setFeedback({ kind: 'ok', msg: 'Compte réactivé.' })
      invalidate()
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setFeedback({ kind: 'err', msg: err.response?.data?.error ?? 'Erreur.' })
    },
  })

  const deleteMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.delete(`/admin/users/${id}`, { data: { reason } }).then(r => r.data),
    onSuccess: () => {
      setFeedback({ kind: 'ok', msg: 'Compte supprimé. Un e-mail de confirmation a été envoyé.' })
      setModalTarget(null)
      invalidate()
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setFeedback({ kind: 'err', msg: err.response?.data?.error ?? 'Erreur lors de la suppression.' })
    },
  })

  const impersonateMut = useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: { accessToken: string; targetUser: { accountType: string } } }>(`/admin/users/${id}/impersonate`).then(r => r.data.data),
    onSuccess: (data) => {
      startImpersonation(data.accessToken)
      // Redirige vers l'espace adapté au type de compte impersonné
      const home =
        data.targetUser.accountType === 'PERSONAL' ? '/personal'
        : data.targetUser.accountType === 'CABINET'  ? '/cabinet'
        : '/app'
      // Hard navigation pour forcer un reload propre avec le nouveau JWT actif
      window.location.href = home
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setFeedback({ kind: 'err', msg: err.response?.data?.error ?? 'Impossible d\'accéder à ce compte.' })
    },
  })

  function handleSearch(v: string) {
    setSearch(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(v)
      setPage(1)
    }, 300)
  }

  // Filter client-side by status (since backend doesn't support it yet)
  const filteredItems = data?.items.filter((u) => {
    if (statusFilter === 'active')   return u.isActive
    if (statusFilter === 'inactive') return !u.isActive
    return true
  }) ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `${data.total} comptes enregistrés` : 'Chargement…'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filter */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                {f === 'all' ? 'Tous' : f === 'active' ? '● Actifs' : '○ Inactifs'}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Rechercher par email…"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 w-56"
          />
        </div>
      </div>

      {feedback && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
          feedback.kind === 'ok'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Rôle</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Dernière connexion</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Inscrit le</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map(u => {
                const isSelf = u.id === currentUser?.sub
                return (
                  <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {u.email}
                      {u.platformRole === 'SUPER_ADMIN' && (
                        <span className="ml-1.5 rounded bg-green-100 px-1 py-0.5 text-[10px] font-bold text-green-700">SA</span>
                      )}
                      {isSelf && (
                        <span className="ml-1.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] font-bold text-blue-700">VOUS</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TYPE_BADGE[u.accountType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.accountType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{u.platformRole === 'SUPER_ADMIN' ? 'Super Admin' : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('fr') : <span className="text-gray-300">Jamais</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString('fr')}</td>
                    <td className="px-4 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-gray-400 italic">votre compte</span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          {/* Impersonation : accessible seulement pour les comptes ACTIFS et NON super-admin */}
                          {u.isActive && u.platformRole !== 'SUPER_ADMIN' && (
                            <button
                              onClick={() => {
                                if (confirm(`Accéder au compte ${u.email} ?\n\nVous allez agir en tant que cet utilisateur pendant 30 min. Toutes vos actions seront tracées et le user recevra un email de notification.`)) {
                                  impersonateMut.mutate(u.id)
                                }
                              }}
                              disabled={impersonateMut.isPending}
                              className="text-xs font-medium text-amber-700 hover:text-amber-900 px-2 py-1 rounded hover:bg-amber-50 disabled:opacity-50"
                              title="Accéder à ce compte (impersonation)"
                            >
                              🎭 Accéder
                            </button>
                          )}
                          {u.isActive ? (
                            <button
                              onClick={() => setModalTarget({ user: u, action: 'deactivate' })}
                              className="text-xs font-medium text-amber-700 hover:text-amber-900 px-2 py-1 rounded hover:bg-amber-50"
                              title="Désactiver"
                            >
                              ⏸ Désactiver
                            </button>
                          ) : (
                            <button
                              onClick={() => reactivateMut.mutate(u.id)}
                              disabled={reactivateMut.isPending}
                              className="text-xs font-medium text-green-700 hover:text-green-900 px-2 py-1 rounded hover:bg-green-50 disabled:opacity-50"
                              title="Réactiver"
                            >
                              ▶ Réactiver
                            </button>
                          )}
                          <button
                            onClick={() => setModalTarget({ user: u, action: 'delete' })}
                            className="text-xs font-medium text-red-700 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                            title="Supprimer définitivement"
                          >
                            🗑 Supprimer
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredItems.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    Aucun utilisateur correspondant à ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {data.page} / {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={data.page <= 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Précédent
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={data.page >= data.totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}

      {/* Modal confirmation */}
      {modalTarget && (
        <ConfirmActionModal
          user={modalTarget.user}
          action={modalTarget.action}
          onClose={() => setModalTarget(null)}
          loading={modalTarget.action === 'deactivate' ? deactivateMut.isPending : deleteMut.isPending}
          onConfirm={(reason) => {
            if (modalTarget.action === 'deactivate') deactivateMut.mutate({ id: modalTarget.user.id, reason })
            else deleteMut.mutate({ id: modalTarget.user.id, reason })
          }}
        />
      )}
    </div>
  )
}
