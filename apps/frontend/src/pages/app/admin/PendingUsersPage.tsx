import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PendingUser {
  id:           string
  email:        string
  nom:          string
  prenom:       string | null
  accountType:  'PERSONAL' | 'COMPANY' | 'CABINET'
  atheisNumber: string | null
  createdAt:    string
  companyId:    string | null
  cabinetId:    string | null
  company:  { nom: string; pays: string | null; plan: string; secteur: string | null; taille: string } | null
  cabinet:  { nom: string; siret: string | null } | null
}

interface PendingData { items: PendingUser[]; total: number }

// ── API ────────────────────────────────────────────────────────────────────────

const fetchPending = () =>
  api.get<{ success: true; data: PendingData }>('/admin/users/pending').then(r => r.data.data)

const approveUser = (id: string) =>
  api.post(`/admin/users/${id}/approve`).then(r => r.data)

const rejectUser = (id: string, reason: string) =>
  api.post(`/admin/users/${id}/reject`, { reason }).then(r => r.data)

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  PERSONAL: 'bg-gray-100 text-gray-700',
  COMPANY:  'bg-blue-100 text-blue-700',
  CABINET:  'bg-purple-100 text-purple-700',
}

const TYPE_LABEL: Record<string, string> = {
  PERSONAL: 'Personnel',
  COMPANY:  'Entreprise',
  CABINET:  'Cabinet',
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return iso }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `il y a ${minutes} min`
  if (hours < 24)   return `il y a ${hours} h`
  if (days < 7)     return `il y a ${days} j`
  return formatDate(iso)
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  user, onClose, onConfirm,
}: {
  user: PendingUser
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">Refuser ce compte ?</h2>
        <p className="mt-1 text-sm text-gray-500">
          <strong>{user.email}</strong> recevra un e-mail avec la raison du refus (optionnelle).
        </p>
        <div className="mt-4">
          <label className="text-xs font-medium text-gray-600">Raison (facultative, affichée dans l'e-mail)</label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex : « Athenis est en phase de test fermée, recontactez-nous dans 3 mois. »"
            rows={3}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <p className="mt-1 text-[11px] text-gray-400">{reason.length}/500 caractères</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason)}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Confirmer le refus
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function PendingUsersPage() {
  const qc = useQueryClient()
  const [rejectTarget, setRejectTarget] = useState<PendingUser | null>(null)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', 'pending'],
    queryFn:  fetchPending,
    refetchInterval: 30_000, // refresh toutes les 30 s
  })

  const approveMut = useMutation({
    mutationFn: approveUser,
    onSuccess: (_d, id) => {
      setFeedback({ kind: 'ok', msg: 'Compte approuvé. Un e-mail de bienvenue a été envoyé.' })
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'pending'] })
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setTimeout(() => setFeedback(null), 4000)
      void id
    },
    onError: () => setFeedback({ kind: 'err', msg: 'Erreur lors de l\'approbation.' }),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectUser(id, reason),
    onSuccess: () => {
      setFeedback({ kind: 'ok', msg: 'Compte refusé. Un e-mail a été envoyé à l\'utilisateur.' })
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'pending'] })
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      setRejectTarget(null)
      setTimeout(() => setFeedback(null), 4000)
    },
    onError: () => setFeedback({ kind: 'err', msg: 'Erreur lors du refus.' }),
  })

  const items = data?.items ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Demandes d'inscription à valider</h1>
        <p className="mt-1 text-sm text-gray-500">
          Comptes ayant confirmé leur e-mail et en attente de votre validation.
        </p>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.kind === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Count */}
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-900">
          {data ? `${data.total} en attente` : '…'}
        </div>
        {data && data.total === 0 && (
          <span className="text-sm text-gray-400">Aucun compte à valider pour le moment ✨</span>
        )}
      </div>

      {/* Loading / Error */}
      {isLoading && <div className="rounded-xl bg-white p-8 text-center text-sm text-gray-400 shadow-sm">Chargement…</div>}
      {isError   && <div className="rounded-xl bg-red-50 p-8 text-center text-sm text-red-700">Impossible de charger les demandes.</div>}

      {/* List */}
      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map(user => {
            const isProcessing = approveMut.isPending && approveMut.variables === user.id
            const isRejecting  = rejectMut.isPending && rejectMut.variables?.id === user.id
            return (
              <div
                key={user.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  {/* Left : identité */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_BADGE[user.accountType]}`}>
                        {TYPE_LABEL[user.accountType]}
                      </span>
                      <h3 className="truncate text-base font-semibold text-gray-900">
                        {user.nom}{user.prenom ? ` ${user.prenom}` : ''}
                      </h3>
                      {user.atheisNumber && (
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600">
                          {user.atheisNumber}
                        </code>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{user.email}</p>

                    {/* Detail box */}
                    {user.company && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 text-xs">
                        <div>
                          <dt className="text-gray-400">Entreprise</dt>
                          <dd className="font-medium text-gray-900">{user.company.nom}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">Pays</dt>
                          <dd className="font-medium text-gray-900">{user.company.pays ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">Plan</dt>
                          <dd className="font-medium text-gray-900">{user.company.plan}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-400">Taille</dt>
                          <dd className="font-medium text-gray-900">{user.company.taille}</dd>
                        </div>
                      </dl>
                    )}
                    {user.cabinet && (
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 text-xs">
                        <div>
                          <dt className="text-gray-400">Cabinet</dt>
                          <dd className="font-medium text-gray-900">{user.cabinet.nom}</dd>
                        </div>
                        {user.cabinet.siret && (
                          <div>
                            <dt className="text-gray-400">SIRET</dt>
                            <dd className="font-mono text-gray-900">{user.cabinet.siret}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    {user.accountType === 'PERSONAL' && (
                      <p className="mt-2 text-xs text-gray-400">Compte personnel — pas d'entreprise rattachée</p>
                    )}

                    <p className="mt-3 text-[11px] text-gray-400">
                      Inscrit {timeAgo(user.createdAt)} · {formatDate(user.createdAt)}
                    </p>
                  </div>

                  {/* Right : actions */}
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => approveMut.mutate(user.id)}
                      disabled={isProcessing || isRejecting}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                    >
                      {isProcessing ? '…' : '✓ Approuver'}
                    </button>
                    <button
                      onClick={() => setRejectTarget(user)}
                      disabled={isProcessing || isRejecting}
                      className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl">✨</div>
          <p className="text-sm font-medium text-gray-900">Tout est validé !</p>
          <p className="mt-1 text-sm text-gray-500">Aucune demande en attente. Vous recevrez un e-mail à chaque nouvelle inscription.</p>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          user={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={(reason) => rejectMut.mutate({ id: rejectTarget.id, reason })}
        />
      )}
    </div>
  )
}
