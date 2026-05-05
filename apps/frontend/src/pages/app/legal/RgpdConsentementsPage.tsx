import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ConsentType = 'MARKETING' | 'ANALYTICS' | 'COOKIES' | 'DATA_SHARING' | 'NEWSLETTER' | 'SMS'
type ConsentStatus = 'GRANTED' | 'REFUSED' | 'REVOKED' | 'PENDING'

interface Consent {
  id:        string
  person:    string
  email:     string
  type:      ConsentType
  status:    ConsentStatus
  date:      string
  source:    string
  notes?:    string
}

// ── Config ───────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<ConsentType, string> = {
  MARKETING:    'Marketing',
  ANALYTICS:    'Analytique',
  COOKIES:      'Cookies',
  DATA_SHARING: 'Partage de données',
  NEWSLETTER:   'Newsletter',
  SMS:          'SMS / Notifications',
}

const TYPE_COLOR: Record<ConsentType, string> = {
  MARKETING:    'bg-blue-100 text-blue-700',
  ANALYTICS:    'bg-purple-100 text-purple-700',
  COOKIES:      'bg-yellow-100 text-yellow-700',
  DATA_SHARING: 'bg-orange-100 text-orange-700',
  NEWSLETTER:   'bg-green-100 text-green-700',
  SMS:          'bg-teal-100 text-teal-700',
}

const STATUS_LABEL: Record<ConsentStatus, string> = {
  GRANTED: 'Accordé',
  REFUSED: 'Refusé',
  REVOKED: 'Révoqué',
  PENDING: 'En attente',
}

const STATUS_COLOR: Record<ConsentStatus, string> = {
  GRANTED: 'bg-green-100 text-green-700',
  REFUSED: 'bg-red-100 text-red-700',
  REVOKED: 'bg-gray-100 text-gray-500',
  PENDING: 'bg-yellow-100 text-yellow-700',
}

const INITIAL: Consent[] = [
  { id: 'c1', person: 'Marie Dupont',    email: 'marie.dupont@example.com',    type: 'MARKETING',  status: 'GRANTED', date: '2026-03-15', source: 'Formulaire web' },
  { id: 'c2', person: 'Jean Mballa',     email: 'j.mballa@acme.cm',            type: 'NEWSLETTER', status: 'GRANTED', date: '2026-04-01', source: 'Email opt-in' },
  { id: 'c3', person: 'Fatima Ngo',      email: 'fatima.ngo@mail.com',         type: 'ANALYTICS',  status: 'REFUSED', date: '2026-04-10', source: 'Bannière cookies' },
  { id: 'c4', person: 'Paul Eyenga',     email: 'paul.eyenga@example.org',     type: 'COOKIES',    status: 'GRANTED', date: '2026-04-12', source: 'Bannière cookies' },
  { id: 'c5', person: 'Claire Atangana', email: 'c.atangana@entreprise.cm',    type: 'MARKETING',  status: 'REVOKED', date: '2026-01-20', source: 'Formulaire web', notes: 'Révocation demandée par email le 25/04/2026' },
  { id: 'c6', person: 'Thomas Kamga',    email: 'thomas.kamga@gmail.com',      type: 'SMS',        status: 'PENDING', date: '2026-05-01', source: 'CRM import' },
]

// ── Add Form ──────────────────────────────────────────────────────────────────

function AddModal({ onAdd, onClose }: { onAdd: (c: Omit<Consent, 'id'>) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    person: '', email: '', type: 'MARKETING' as ConsentType,
    status: 'GRANTED' as ConsentStatus, source: 'Formulaire web', notes: '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.person || !form.email) return
    onAdd({ ...form, date: new Date().toISOString().slice(0, 10) })
  }

  const INPUT = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Enregistrer un consentement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Personne *</label>
              <input value={form.person} onChange={set('person')} required placeholder="Prénom Nom" className={INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input value={form.email} onChange={set('email')} required type="email" placeholder="email@exemple.com" className={INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type de consentement</label>
              <select value={form.type} onChange={set('type')} className={INPUT}>
                {(Object.keys(TYPE_LABEL) as ConsentType[]).map(k => (
                  <option key={k} value={k}>{TYPE_LABEL[k]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select value={form.status} onChange={set('status')} className={INPUT}>
                {(Object.keys(STATUS_LABEL) as ConsentStatus[]).map(k => (
                  <option key={k} value={k}>{STATUS_LABEL[k]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Source / Canal</label>
            <input value={form.source} onChange={set('source')} placeholder="ex: Formulaire web, Email opt-in…" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Remarques éventuelles…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-forest-900 py-2 text-sm font-medium text-white hover:bg-forest-800">
              Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function RgpdConsentementsPage() {
  const [consents, setConsents] = useState<Consent[]>(INITIAL)
  const [showAdd, setShowAdd]   = useState(false)
  const [typeFilter, setTypeFilter] = useState<ConsentType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<ConsentStatus | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  function addConsent(c: Omit<Consent, 'id'>) {
    setConsents(prev => [{ ...c, id: `c-${Date.now()}` }, ...prev])
    setShowAdd(false)
  }

  function revokeConsent(id: string) {
    setConsents(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'REVOKED', notes: (c.notes ? c.notes + '\n' : '') + `Révoqué le ${new Date().toLocaleDateString('fr-FR')}` } : c
    ))
  }

  const filtered = consents.filter(c => {
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (!c.person.toLowerCase().includes(s) && !c.email.toLowerCase().includes(s)) return false
    }
    return true
  })

  const stats = {
    total:   consents.length,
    granted: consents.filter(c => c.status === 'GRANTED').length,
    refused: consents.filter(c => c.status === 'REFUSED').length,
    revoked: consents.filter(c => c.status === 'REVOKED').length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consentements RGPD</h1>
          <p className="mt-1 text-sm text-gray-500">Registre des consentements des personnes concernées</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-forest-900 text-white rounded-lg text-sm font-medium hover:bg-forest-800"
        >
          + Nouveau consentement
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Accordés</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{stats.granted}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Refusés</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{stats.refused}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Révoqués</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">{stats.revoked}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Recherche</label>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nom ou email…"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30 w-48" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as ConsentType | 'ALL')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none">
            <option value="ALL">Tous types</option>
            {(Object.keys(TYPE_LABEL) as ConsentType[]).map(k => (
              <option key={k} value={k}>{TYPE_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ConsentStatus | 'ALL')}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none">
            <option value="ALL">Tous statuts</option>
            {(Object.keys(STATUS_LABEL) as ConsentStatus[]).map(k => (
              <option key={k} value={k}>{STATUS_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <button onClick={() => { setSearch(''); setTypeFilter('ALL'); setStatusFilter('ALL') }}
          className="text-sm text-gray-400 hover:text-gray-700 underline">
          Réinitialiser
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">
            {filtered.length} consentement{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">Aucun consentement ne correspond aux filtres.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Personne</th>
                  <th className="px-4 py-2 text-left font-medium">Email</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Source</th>
                  <th className="px-4 py-2 text-center font-medium">Statut</th>
                  <th className="px-4 py-2 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{c.person}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[c.type]}`}>
                        {TYPE_LABEL[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{c.source}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOR[c.status]}`}>
                        {STATUS_LABEL[c.status]}
                      </span>
                      {c.notes && (
                        <p className="text-[10px] text-gray-400 mt-0.5 max-w-[140px] truncate" title={c.notes}>{c.notes}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.status === 'GRANTED' && (
                        <button
                          onClick={() => revokeConsent(c.id)}
                          className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                          Révoquer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        * Conformément au RGPD (Règlement UE 2016/679), les consentements doivent être libres, spécifiques, éclairés et univoques. Conservez la preuve de chaque consentement.
      </p>

      {showAdd && <AddModal onAdd={addConsent} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
