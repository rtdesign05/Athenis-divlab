import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type Client, type ClientType } from '@/contexts/GestionContext'

const TYPE_STYLE: Record<ClientType, string> = {
  entreprise:  'bg-indigo-50 text-indigo-700 ring-indigo-200',
  particulier: 'bg-pink-50 text-pink-700 ring-pink-200',
}

const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Agence Bafoussam']

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalClientProps {
  initial?: Partial<Client>
  agenceNom: string | null
  onSave: (data: Omit<Client, 'id' | 'createdAt'>) => void
  onClose: () => void
}

function ModalClient({ initial, agenceNom, onSave, onClose }: ModalClientProps) {
  const [form, setForm] = useState({
    nom:       initial?.nom       ?? '',
    type:      initial?.type      ?? 'entreprise' as ClientType,
    email:     initial?.email     ?? '',
    telephone: initial?.telephone ?? '',
    adresse:   initial?.adresse   ?? '',
    agence:    initial?.agence    ?? agenceNom ?? 'Siège',
    notes:     initial?.notes     ?? '',
    compte:    initial?.compte    ?? '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return
    const { compte, ...rest } = form
    onSave({
      ...rest,
      type: rest.type as ClientType,
      ...(compte.trim() ? { compte: compte.trim() } : {}),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Modifier le client' : 'Nouveau client'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom / Raison sociale *</label>
              <input value={form.nom} onChange={set('nom')} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={form.type} onChange={set('type')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="entreprise">Entreprise</option>
                <option value="particulier">Particulier</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
              {agenceNom ? (
                <input value={agenceNom} readOnly className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
              ) : (
                <select value={form.agence} onChange={set('agence')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  {AGENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" value={form.email} onChange={set('email')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
              <input value={form.telephone} onChange={set('telephone')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Adresse</label>
              <input value={form.adresse} onChange={set('adresse')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={set('notes')} rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Compte comptable
                <span className="ml-1 font-normal text-gray-400">(facultatif — ex : 411100)</span>
              </label>
              <input
                value={form.compte}
                onChange={set('compte')}
                placeholder="411100"
                maxLength={10}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
              {form.compte.trim() && (
                <p className="mt-1 text-[11px] text-indigo-600">
                  → Ce compte apparaîtra automatiquement dans Comptabilité › Comptes
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              {initial?.id ? 'Enregistrer' : 'Créer le client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const { clients, commandes, addClient, updateClient, deleteClient } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<Client | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const caMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of commandes) {
      if (c.statut !== 'Annulée') m[c.client] = (m[c.client] ?? 0) + c.montant
    }
    return m
  }, [commandes])

  const nbCmdMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of commandes) m[c.client] = (m[c.client] ?? 0) + 1
    return m
  }, [commandes])

  const visible = useMemo(() => {
    let list = agenceNom ? clients.filter(c => c.agence === agenceNom) : clients
    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.nom.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.telephone.includes(q),
      )
    }
    return list
  }, [clients, agenceNom, typeFilter, search])

  function handleSave(data: Omit<Client, 'id' | 'createdAt'>) {
    if (editing) { updateClient(editing.id, data); setEditing(null) }
    else         { addClient(data);                setShowModal(false) }
  }

  return (
    <div className="h-full flex flex-col gap-3">

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total clients</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{visible.length}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs text-indigo-600">Entreprises</p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">{visible.filter(c => c.type === 'entreprise').length}</p>
        </div>
        <div className="rounded-xl border border-pink-200 bg-pink-50 p-3">
          <p className="text-xs text-pink-600">Particuliers</p>
          <p className="mt-1 text-2xl font-bold text-pink-700">{visible.filter(c => c.type === 'particulier').length}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nom, email, téléphone…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as ClientType | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="all">Tous les types</option>
            <option value="entreprise">Entreprise</option>
            <option value="particulier">Particulier</option>
          </select>
          <button onClick={() => setShowModal(true)}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 shrink-0">
            + Nouveau client
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <span className="text-3xl mb-2">👤</span>
              <p className="text-sm font-medium">Aucun client trouvé</p>

            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                <tr className="text-left text-xs font-semibold text-gray-500">
                  <th className="px-4 py-2.5">Client</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5">Agence</th>
                  <th className="px-4 py-2.5">Compte</th>
                  <th className="px-4 py-2.5 text-right">CA total</th>
                  <th className="px-4 py-2.5 text-center">Cmds</th>
                  <th className="px-4 py-2.5 text-right">Depuis</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset shrink-0 ${TYPE_STYLE[c.type]}`}>
                          {c.type === 'entreprise' ? '🏢' : '👤'}
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{c.nom}</p>
                          {c.notes && <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{c.notes}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs text-gray-600">{c.email || '—'}</p>
                      <p className="text-[10px] text-gray-400">{c.telephone || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">{c.agence}</td>
                    <td className="px-4 py-2.5">
                      {c.compte ? (
                        <span className="font-mono text-xs text-indigo-700 bg-indigo-50 rounded px-1.5 py-0.5">{c.compte}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">
                      {caMap[c.nom] ? fmt(caMap[c.nom]!) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-600">{nbCmdMap[c.nom] ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditing(c)} className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600">✏️</button>
                        <button onClick={() => setConfirmDel(c.id)} className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-red-50 hover:text-red-500">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {(showModal || editing) && (
        <ModalClient
          {...(editing ? { initial: editing } : {})}
          agenceNom={agenceNom}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-gray-900 mb-1">Supprimer ce client ?</p>
            <p className="text-xs text-gray-500 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={() => { deleteClient(confirmDel); setConfirmDel(null) }} className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
