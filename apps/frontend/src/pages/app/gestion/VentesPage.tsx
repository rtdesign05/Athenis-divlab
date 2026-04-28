import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type Client, type ClientType } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

// ── Styles statut commandes ───────────────────────────────────────────────────

const STATUT_STYLE: Record<string, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Livrée':     'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

const TYPE_STYLE: Record<ClientType, string> = {
  entreprise:  'bg-indigo-50 text-indigo-700 ring-indigo-200',
  particulier: 'bg-pink-50 text-pink-700 ring-pink-200',
}

// ── Modal Client ──────────────────────────────────────────────────────────────

interface ModalClientProps {
  initial?: Partial<Client>
  agenceNom: string | null
  onSave: (data: Omit<Client, 'id' | 'createdAt'>) => void
  onClose: () => void
}

function ModalClient({ initial, agenceNom, onSave, onClose }: ModalClientProps) {
  const AGENCES = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Agence Bafoussam']
  const [form, setForm] = useState({
    nom:       initial?.nom       ?? '',
    type:      initial?.type      ?? 'entreprise' as ClientType,
    email:     initial?.email     ?? '',
    telephone: initial?.telephone ?? '',
    adresse:   initial?.adresse   ?? '',
    agence:    initial?.agence    ?? agenceNom ?? 'Siège',
    notes:     initial?.notes     ?? '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return
    onSave({ ...form, type: form.type as ClientType })
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

// ── Onglet Clients ────────────────────────────────────────────────────────────

function ClientsTab({ agenceNom }: { agenceNom: string | null }) {
  const { fmt } = useCurrency()
  const { clients, commandes, addClient, updateClient, deleteClient } = useGestion()

  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<Client | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  // CA par client depuis les commandes
  const caMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const c of commandes) {
      if (c.statut !== 'Annulée') m[c.client] = (m[c.client] ?? 0) + c.montant
    }
    return m
  }, [commandes])

  // Nombre de commandes par client
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
    if (editing) {
      updateClient(editing.id, data)
      setEditing(null)
    } else {
      addClient(data)
      setShowModal(false)
    }
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
        {/* Barre d'outils */}
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

        {/* Liste */}
        <div className="flex-1 min-h-0 overflow-y-auto">
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
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">
                      {caMap[c.nom] ? fmt(caMap[c.nom]!) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-600">
                      {nbCmdMap[c.nom] ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                      {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => setEditing(c)}
                          className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                          ✏️
                        </button>
                        <button onClick={() => setConfirmDel(c.id)}
                          className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      {(showModal || editing) && (
        <ModalClient
          initial={editing ?? undefined}
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
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={() => { deleteClient(confirmDel); setConfirmDel(null) }}
                className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function VentesPage() {
  const { fmt }   = useCurrency()
  const { user }  = useAuth()
  const { commandes: allCommandes } = useGestion()

  const { agences } = useCompanySettings()
  const activeAgences = useMemo(() => agences.filter(a => a.isActive), [agences])

  const agenceNom = user?.agenceNom ?? null
  const [agenceFilter, setAgenceFilter] = useState<string>('all')
  const [tab, setTab] = useState<'commandes' | 'clients'>('commandes')

  const commandes = useMemo(() => {
    let list = agenceNom ? allCommandes.filter(c => c.agence === agenceNom) : allCommandes
    if (!agenceNom && agenceFilter !== 'all') list = list.filter(c => c.agence === agenceFilter)
    return list
  }, [allCommandes, agenceNom, agenceFilter])

  const totalCA   = commandes.filter(c => c.statut !== 'Annulée').reduce((s, c) => s + c.montant, 0)
  const enCours   = commandes.filter(c => c.statut === 'En cours').length
  const livrees   = commandes.filter(c => c.statut === 'Livrée').length
  const enAttente = commandes.filter(c => c.statut === 'En attente').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* ── En-tête + onglets ── */}
      <div className="shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-gray-900">Ventes</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
          {/* Onglets */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setTab('commandes')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'commandes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Commandes
            </button>
            <button
              onClick={() => setTab('clients')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === 'clients' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              👥 Clients
            </button>
          </div>
        </div>

        {tab === 'commandes' && (
          <div className="flex items-center gap-2">
            {!agenceNom && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 shrink-0">🔗 Agence :</span>
                <select
                  value={agenceFilter}
                  onChange={e => setAgenceFilter(e.target.value)}
                  className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                >
                  <option value="all">Toutes ({activeAgences.length})</option>
                  {activeAgences.map(a => (
                    <option key={a.id} value={a.nom}>{a.nom}</option>
                  ))}
                </select>
                <Link to="/app/settings/agences" className="text-[10px] text-gray-400 hover:text-green-700 transition-colors" title="Gérer les agences">⚙️</Link>
              </div>
            )}
            <button className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
              + Nouvelle commande
            </button>
          </div>
        )}
      </div>

      {/* ── Contenu selon onglet ── */}
      {tab === 'commandes' ? (
        <>
          {/* KPIs */}
          <div className="shrink-0 grid grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">CA commandes</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalCA)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs text-blue-600">En cours</p>
              <p className="mt-1 text-2xl font-bold text-blue-700">{enCours}</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-600">En attente</p>
              <p className="mt-1 text-2xl font-bold text-amber-700">{enAttente}</p>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 p-3">
              <p className="text-xs text-green-600">Livrées</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{livrees}</p>
            </div>
          </div>

          {/* Tableau commandes */}
          <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
            <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
              <h2 className="text-sm font-semibold text-gray-900">
                Commandes récentes
                {agenceFilter !== 'all' && !agenceNom && (
                  <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">{agenceFilter}</span>
                )}
              </h2>
              <input type="search" placeholder="Rechercher…"
                className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2.5">N° commande</th>
                    <th className="px-4 py-2.5">Client</th>
                    {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5 text-right">Montant</th>
                    <th className="px-4 py-2.5">Livraison prévue</th>
                    <th className="px-4 py-2.5">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {commandes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                        {agenceFilter !== 'all' && !agenceNom ? `Aucune commande pour « ${agenceFilter} »` : 'Aucune commande pour cette agence'}
                      </td>
                    </tr>
                  ) : commandes.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{c.id}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{c.client}</td>
                      {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{c.agence}</td>}
                      <td className="px-4 py-2.5 text-gray-500">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(c.montant)}</td>
                      <td className="px-4 py-2.5 text-gray-500">{c.livraison ? new Date(c.livraison).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLE[c.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.statut}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <ClientsTab agenceNom={agenceNom} />
      )}
    </div>
  )
}
