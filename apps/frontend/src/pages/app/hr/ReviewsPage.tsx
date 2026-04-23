import { useState } from 'react'
import {
  useReviews, useReview, useCreateReview, useUpdateReview, useDeleteReview,
} from '@/hooks/useHr'
import { useEmployees } from '@/hooks/useHr'
import type { ReviewStatus, AnnualReview, ReviewObjective, UpdateReviewDto } from '@/services/hrApi'

const STATUS_BADGE: Record<ReviewStatus, string> = {
  DRAFT:     'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<ReviewStatus, string> = {
  DRAFT: 'Brouillon', SCHEDULED: 'Planifié', COMPLETED: 'Complété', CANCELLED: 'Annulé',
}

const STARS = [1, 2, 3, 4, 5]

function StarRating({ value, onChange }: { value: number | null; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {STARS.map(s => (
        <button key={s} type="button"
          onClick={() => onChange?.(s)}
          className={`text-xl ${s <= (value ?? 0) ? 'text-yellow-400' : 'text-gray-200'} ${onChange ? 'hover:text-yellow-300' : 'cursor-default'}`}>
          ★
        </button>
      ))}
    </div>
  )
}

// ── Objective row ─────────────────────────────────────────────────────────────
function ObjectiveRow({
  obj, editable, onChange, onDelete,
}: {
  obj: ReviewObjective
  editable: boolean
  onChange: (o: ReviewObjective) => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 space-y-1">
          {editable ? (
            <input
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm font-medium"
              value={obj.title}
              onChange={e => onChange({ ...obj, title: e.target.value })}
              placeholder="Titre de l'objectif"
            />
          ) : (
            <p className="text-sm font-medium text-gray-900">{obj.title}</p>
          )}
          {editable ? (
            <input
              className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-gray-600"
              value={obj.target}
              onChange={e => onChange({ ...obj, target: e.target.value })}
              placeholder="Cible / résultat attendu"
            />
          ) : (
            <p className="text-xs text-gray-500">{obj.target}</p>
          )}
        </div>
        {editable && (
          <button onClick={onDelete} className="text-xs text-red-400 hover:text-red-600">✕</button>
        )}
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Avancement</span>
          <span className="text-xs font-medium text-gray-700">{obj.progress}%</span>
        </div>
        {editable ? (
          <input type="range" min={0} max={100} value={obj.progress}
            onChange={e => onChange({ ...obj, progress: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
        ) : (
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className={`h-2 rounded-full ${obj.progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${obj.progress}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {obj.dueDate && (
          <span className="text-xs text-gray-400">
            Échéance : {new Date(obj.dueDate).toLocaleDateString('fr-FR')}
          </span>
        )}
        {editable && (
          <label className="flex items-center gap-1 text-xs text-gray-600">
            <input type="checkbox" checked={obj.done}
              onChange={e => onChange({ ...obj, done: e.target.checked })}
              className="accent-green-600"
            />
            Atteint
          </label>
        )}
        {!editable && obj.done && (
          <span className="text-xs font-medium text-green-600">✓ Atteint</span>
        )}
      </div>
    </div>
  )
}

// ── Review detail / edit panel ────────────────────────────────────────────────
function ReviewPanel({ reviewId, onClose }: { reviewId: string; onClose: () => void }) {
  const { data: review, isLoading } = useReview(reviewId)
  const updateReview = useUpdateReview()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<UpdateReviewDto>({})

  if (isLoading || !review) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-2xl rounded-xl bg-white p-8 text-center text-gray-400">Chargement…</div>
      </div>
    )
  }

  const objectives: ReviewObjective[] = (form.objectives ?? review.objectives) as ReviewObjective[]

  const startEdit = () => {
    const next: UpdateReviewDto = { status: review.status, objectives: review.objectives }
    if (review.scheduledAt) next.scheduledAt = review.scheduledAt
    if (review.completedAt) next.completedAt = review.completedAt
    if (review.rating)      next.rating      = review.rating
    if (review.notes)       next.notes       = review.notes
    setForm(next)
    setEditing(true)
  }

  const save = async () => {
    await updateReview.mutateAsync({ id: reviewId, dto: form })
    setEditing(false)
  }

  const addObjective = () => {
    const newObj: ReviewObjective = {
      id: crypto.randomUUID(),
      title: '',
      target: '',
      progress: 0,
      dueDate: null,
      done: false,
    }
    setForm(f => ({ ...f, objectives: [...objectives, newObj] }))
  }

  const updateObj = (idx: number, obj: ReviewObjective) => {
    const next = objectives.slice()
    next[idx] = obj
    setForm(f => ({ ...f, objectives: next }))
  }

  const deleteObj = (idx: number) => {
    setForm(f => ({ ...f, objectives: objectives.filter((_, i) => i !== idx) }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Entretien — {review.employee ? `${review.employee.firstName} ${review.employee.lastName}` : ''}
            </h2>
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[review.status]}`}>
              {STATUS_LABEL[review.status]}
            </span>
          </div>
          <div className="flex gap-2">
            {!editing && (
              <button onClick={startEdit}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                Modifier
              </button>
            )}
            {editing && (
              <>
                <button onClick={() => setEditing(false)}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={save} disabled={updateReview.isPending}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                  {updateReview.isPending ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
              </>
            )}
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date planifiée</label>
              {editing ? (
                <input type="datetime-local"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={form.scheduledAt?.slice(0, 16) ?? ''}
                  onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                />
              ) : (
                <p className="text-sm text-gray-700">
                  {review.scheduledAt ? new Date(review.scheduledAt).toLocaleString('fr-FR') : '—'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
              {editing ? (
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={form.status ?? review.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as ReviewStatus }))}
                >
                  {(Object.keys(STATUS_LABEL) as ReviewStatus[]).map(s => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-700">{STATUS_LABEL[review.status]}</p>
              )}
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Évaluation globale</label>
            <StarRating
              value={editing ? (form.rating ?? null) : review.rating}
              {...(editing ? { onChange: (v: number) => setForm(f => ({ ...f, rating: v })) } : {})}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes de l'entretien</label>
            {editing ? (
              <textarea rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                value={form.notes ?? ''}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Points abordés, retours, axes d'amélioration…"
              />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-line">{review.notes || '—'}</p>
            )}
          </div>

          {/* Objectives */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-medium text-gray-500">Objectifs ({objectives.length})</label>
              {editing && (
                <button onClick={addObjective}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  + Ajouter un objectif
                </button>
              )}
            </div>
            <div className="space-y-2">
              {objectives.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun objectif défini</p>
              ) : (
                objectives.map((obj, i) => (
                  <ObjectiveRow
                    key={obj.id}
                    obj={obj}
                    editable={editing}
                    onChange={o => updateObj(i, o)}
                    onDelete={() => deleteObj(i)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ onClose }: { onClose: () => void }) {
  const employees = useEmployees(true)
  const create = useCreateReview()
  const [employeeId, setEmployeeId] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    await create.mutateAsync({ employeeId, ...(scheduledAt ? { scheduledAt } : {}) })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Planifier un entretien</h2>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Employé</label>
            <select required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}>
              <option value="">Sélectionner…</option>
              {employees.data?.items.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Date & heure</label>
            <input type="datetime-local"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={create.isPending || !employeeId}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {create.isPending ? 'Création…' : 'Planifier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function ReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'ALL'>('ALL')
  const [showCreate, setShowCreate] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const reviews = useReviews(statusFilter !== 'ALL' ? { status: statusFilter } : undefined)
  const deleteReview = useDeleteReview()

  const statuses: (ReviewStatus | 'ALL')[] = ['ALL', 'DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED']

  const avgRating = (() => {
    const rated = reviews.data?.filter(r => r.rating) ?? []
    if (!rated.length) return null
    return (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1)
  })()

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entretiens annuels</h1>
          <p className="text-sm text-gray-500">Suivi des entretiens et objectifs</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Planifier un entretien
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: reviews.data?.length ?? '—', color: 'text-gray-900' },
          { label: 'Planifiés', value: reviews.data?.filter(r => r.status === 'SCHEDULED').length ?? '—', color: 'text-blue-600' },
          { label: 'Complétés', value: reviews.data?.filter(r => r.status === 'COMPLETED').length ?? '—', color: 'text-green-600' },
          { label: 'Note moy.', value: avgRating ? `${avgRating}/5` : '—', color: 'text-yellow-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {statuses.map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s === 'ALL' ? 'Tous' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {reviews.isLoading ? (
          <div className="p-8 text-center text-gray-400">Chargement…</div>
        ) : reviews.data?.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Aucun entretien</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Employé</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Statut</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date planifiée</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Note</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Objectifs</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reviews.data?.map((review: AnnualReview) => {
                const doneCount = review.objectives.filter(o => o.done).length
                const totalObj  = review.objectives.length
                return (
                  <tr key={review.id} className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedId(review.id)}>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {review.employee
                        ? `${review.employee.firstName} ${review.employee.lastName}`
                        : review.employeeId.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[review.status]}`}>
                        {STATUS_LABEL[review.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {review.scheduledAt
                        ? new Date(review.scheduledAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {review.rating ? (
                        <span className="text-sm font-medium text-yellow-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {totalObj > 0 ? (
                        <span className={`text-xs font-medium ${doneCount === totalObj ? 'text-green-600' : 'text-gray-600'}`}>
                          {doneCount}/{totalObj}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setSelectedId(review.id)}
                          className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50">
                          Ouvrir
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Supprimer cet entretien ?')) deleteReview.mutate(review.id)
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">
                          Suppr.
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {selectedId && <ReviewPanel reviewId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  )
}
