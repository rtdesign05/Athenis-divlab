import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestType   = 'ACCESS' | 'RECTIFICATION' | 'ERASURE' | 'PORTABILITY' | 'OPPOSITION' | 'LIMITATION'
type RequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REFUSED'

interface RgpdRequest {
  id:          string
  person:      string
  email:       string
  type:        RequestType
  status:      RequestStatus
  receivedAt:  string
  dueAt:       string    // RGPD: 30 jours max
  completedAt: string | null
  description: string
  response:    string
}

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<RequestType, string> = {
  ACCESS:        'Droit d\'accès',
  RECTIFICATION: 'Rectification',
  ERASURE:       'Droit à l\'effacement',
  PORTABILITY:   'Portabilité',
  OPPOSITION:    'Droit d\'opposition',
  LIMITATION:    'Limitation du traitement',
}

const TYPE_ICON: Record<RequestType, string> = {
  ACCESS:        '👁',
  RECTIFICATION: '✏️',
  ERASURE:       '🗑️',
  PORTABILITY:   '📦',
  OPPOSITION:    '🚫',
  LIMITATION:    '⏸️',
}

const TYPE_COLOR: Record<RequestType, string> = {
  ACCESS:        'bg-blue-100 text-blue-700',
  RECTIFICATION: 'bg-purple-100 text-purple-700',
  ERASURE:       'bg-red-100 text-red-700',
  PORTABILITY:   'bg-green-100 text-green-700',
  OPPOSITION:    'bg-orange-100 text-orange-700',
  LIMITATION:    'bg-yellow-100 text-yellow-700',
}

const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING:     'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED:   'Traité',
  REFUSED:     'Refusé',
}

const STATUS_COLOR: Record<RequestStatus, string> = {
  PENDING:     'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED:   'bg-green-100 text-green-700',
  REFUSED:     'bg-red-100 text-red-700',
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

// ── Edit Modal ────────────────────────────────────────────────────────────────

function EditModal({ req, onSave, onClose }: {
  req: RgpdRequest
  onSave: (r: RgpdRequest) => void
  onClose: () => void
}) {
  const [status,   setStatus]   = useState<RequestStatus>(req.status)
  const [response, setResponse] = useState(req.response)

  function handleSave() {
    const completed = status === 'COMPLETED' || status === 'REFUSED'
      ? (req.completedAt ?? new Date().toISOString().slice(0, 10))
      : null
    onSave({ ...req, status, response, completedAt: completed })
  }

  const isOverdue = !req.completedAt && new Date(req.dueAt) < new Date()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Traiter la demande — {req.person}</h2>
            <p className="text-xs text-gray-500">{TYPE_LABEL[req.type]} · Reçue le {new Date(req.receivedAt).toLocaleDateString('fr-FR')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Deadline warning */}
          {isOverdue && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>⚠️</span>
              <span>Délai réglementaire dépassé — répondre dans les meilleurs délais (RGPD art. 12 : 1 mois max)</span>
            </div>
          )}

          {/* Description */}
          <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <p className="text-xs font-semibold text-gray-500 mb-1">Demande de la personne</p>
            {req.description}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Statut du traitement</label>
            <select value={status} onChange={e => setStatus(e.target.value as RequestStatus)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30">
              {(Object.keys(STATUS_LABEL) as RequestStatus[]).map(k => (
                <option key={k} value={k}>{STATUS_LABEL[k]}</option>
              ))}
            </select>
          </div>

          {/* Response */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Réponse apportée</label>
            <textarea value={response} onChange={e => setResponse(e.target.value)} rows={4}
              placeholder="Décrivez les actions effectuées en réponse à cette demande…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button onClick={handleSave}
              className="flex-1 rounded-lg bg-forest-900 py-2 text-sm font-medium text-white hover:bg-forest-800">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Add Modal ─────────────────────────────────────────────────────────────────

function AddModal({ onAdd, onClose }: { onAdd: (r: RgpdRequest) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    person: '', email: '', type: 'ACCESS' as RequestType, description: '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.person) return
    const today = new Date().toISOString().slice(0, 10)
    onAdd({
      id: `r-${Date.now()}`,
      ...form,
      status:      'PENDING',
      receivedAt:  today,
      dueAt:       addDays(today, 30),
      completedAt: null,
      response:    '',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouvelle demande RGPD</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Personne *</label>
              <input value={form.person} onChange={set('person')} required placeholder="Prénom Nom"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input value={form.email} onChange={set('email')} type="email" placeholder="email@exemple.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type de droit exercé</label>
            <select value={form.type} onChange={set('type')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none">
              {(Object.keys(TYPE_LABEL) as RequestType[]).map(k => (
                <option key={k} value={k}>{TYPE_ICON[k]} {TYPE_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description de la demande</label>
            <textarea value={form.description} onChange={set('description')} rows={3}
              placeholder="Décrivez la demande de la personne…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none resize-none" />
          </div>
          <p className="text-xs text-gray-400">Le délai réglementaire de réponse (30 jours) sera calculé automatiquement.</p>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-forest-900 py-2 text-sm font-medium text-white hover:bg-forest-800">
              Créer la demande
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RgpdDemandesPage() {
  const [requests, setRequests] = useState<RgpdRequest[]>([])
  const [showAdd,  setShowAdd]  = useState(false)
  const [editing,  setEditing]  = useState<RgpdRequest | null>(null)
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL')

  function addRequest(r: RgpdRequest) {
    setRequests(prev => [r, ...prev])
    setShowAdd(false)
  }

  function updateRequest(updated: RgpdRequest) {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r))
    setEditing(null)
  }

  const today = new Date().toISOString().slice(0, 10)
  const overdue = requests.filter(r => !r.completedAt && r.dueAt < today && r.status !== 'REFUSED')

  const filtered = statusFilter === 'ALL' ? requests : requests.filter(r => r.status === statusFilter)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes RGPD</h1>
          <p className="mt-1 text-sm text-gray-500">Exercice des droits — accès, rectification, effacement, portabilité…</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-forest-900 text-white rounded-lg text-sm font-medium hover:bg-forest-800">
          + Nouvelle demande
        </button>
      </div>

      {/* Overdue alert */}
      {overdue.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <span className="text-red-600 text-lg shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-800">
              {overdue.length} demande{overdue.length > 1 ? 's' : ''} en retard (délai RGPD 30 j dépassé)
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              {overdue.map(r => r.person).join(', ')} — Traitez ces demandes immédiatement.
            </p>
          </div>
        </div>
      )}

      {/* Rights grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.entries(TYPE_LABEL) as [RequestType, string][]).map(([type, label]) => {
          const count = requests.filter(r => r.type === type).length
          return (
            <div key={type} className={`rounded-xl border p-3 text-center ${count > 0 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100'}`}>
              <p className="text-2xl">{TYPE_ICON[type]}</p>
              <p className="text-xs font-medium text-gray-700 mt-1 leading-tight">{label}</p>
              <p className={`text-xl font-bold mt-0.5 ${count > 0 ? 'text-gray-800' : 'text-gray-300'}`}>{count}</p>
            </div>
          )
        })}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', ...Object.keys(STATUS_LABEL)] as (RequestStatus | 'ALL')[]).map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-forest-900 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'ALL' ? 'Toutes' : STATUS_LABEL[s]}
            <span className="ml-1.5 text-xs opacity-70">
              ({s === 'ALL' ? requests.length : requests.filter(r => r.status === s).length})
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-semibold text-gray-500">Aucune demande</p>
            <p className="text-xs text-gray-400 mt-1">Les demandes d'exercice des droits RGPD apparaîtront ici</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Personne</th>
                <th className="px-4 py-2 text-left font-medium">Droit</th>
                <th className="px-4 py-2 text-left font-medium">Reçue le</th>
                <th className="px-4 py-2 text-left font-medium">Délai</th>
                <th className="px-4 py-2 text-center font-medium">Statut</th>
                <th className="px-4 py-2 text-center font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => {
                const isPast = !r.completedAt && r.dueAt < today && r.status !== 'REFUSED'
                return (
                  <tr key={r.id} className={`hover:bg-gray-50 ${isPast ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.person}</p>
                      <p className="text-xs text-gray-400">{r.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[r.type]}`}>
                        {TYPE_ICON[r.type]} {TYPE_LABEL[r.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(r.receivedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-xs font-medium ${isPast ? 'text-red-600' : 'text-gray-600'}`}>
                        {isPast ? '⚠️ ' : ''}{new Date(r.dueAt).toLocaleDateString('fr-FR')}
                      </p>
                      {r.completedAt && (
                        <p className="text-xs text-green-600">✓ traité le {new Date(r.completedAt).toLocaleDateString('fr-FR')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setEditing(r)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
                        {r.status === 'COMPLETED' || r.status === 'REFUSED' ? '👁 Voir' : '✏️ Traiter'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        * RGPD Art. 12 : délai de réponse maximum 1 mois (extensible à 3 mois pour demandes complexes, avec notification dans le premier mois).
      </p>

      {showAdd  && <AddModal  onAdd={addRequest}     onClose={() => setShowAdd(false)} />}
      {editing  && <EditModal req={editing} onSave={updateRequest} onClose={() => setEditing(null)} />}
    </div>
  )
}
