import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type CommandeStatut } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

// ── Styles statut commandes ───────────────────────────────────────────────────

const STATUT_STYLE: Record<string, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Livrée':     'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

const AGENCES_DEFAULT = ['Siège', 'Agence Douala — Akwa', 'Succursale Yaoundé — Centre', 'Agence Bafoussam']

// ── Modal nouvelle commande ───────────────────────────────────────────────────

interface ModalCommandeProps {
  clients:   { nom: string }[]
  agenceNom: string | null
  agences:   string[]
  onSave:    (data: { client: string; agence: string; date: string; montant: number; livraison: string | null; statut: CommandeStatut }) => void
  onClose:   () => void
}

function ModalCommande({ clients, agenceNom, agences, onSave, onClose }: ModalCommandeProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    client:    '',
    agence:    agenceNom ?? 'Siège',
    date:      today,
    montant:   0,
    livraison: '',
    statut:    'En cours' as CommandeStatut,
  })

  const set    = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const setNum = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, montant: Number(e.target.value) }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client.trim() || form.montant <= 0) return
    onSave({
      client:    form.client.trim(),
      agence:    form.agence,
      date:      form.date,
      montant:   form.montant,
      livraison: form.livraison || null,
      statut:    form.statut,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouvelle commande client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
            <input list="clients-list" value={form.client} onChange={set('client')} required
              placeholder="Nom du client…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            <datalist id="clients-list">
              {clients.map(c => <option key={c.nom} value={c.nom} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={set('date')} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant (XAF) *</label>
              <input type="number" min={1} value={form.montant} onChange={setNum} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Livraison prévue</label>
              <input type="date" value={form.livraison} onChange={set('livraison')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select value={form.statut} onChange={set('statut')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="En cours">En cours</option>
                <option value="En attente">En attente</option>
                <option value="Livrée">Livrée</option>
                <option value="Annulée">Annulée</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
            {agenceNom ? (
              <input value={agenceNom} readOnly
                className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
            ) : (
              <select value={form.agence} onChange={set('agence')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {agences.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              Créer la commande
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function VentesPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const { commandes: allCommandes, clients, updateCommandeStatut, addCommande } = useGestion()

  const { agences } = useCompanySettings()
  const activeAgences = useMemo(() => agences.filter(a => a.isActive), [agences])
  const agencesList   = useMemo(
    () => activeAgences.length > 0 ? activeAgences.map(a => a.nom) : AGENCES_DEFAULT,
    [activeAgences],
  )

  const agenceNom = user?.agenceNom ?? null
  const [agenceFilter, setAgenceFilter] = useState<string>('all')
  const [modal, setModal] = useState(false)

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

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Commandes clients</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!agenceNom && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 shrink-0">🔗 Agence :</span>
              <select value={agenceFilter} onChange={e => setAgenceFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="all">Toutes ({activeAgences.length})</option>
                {activeAgences.map(a => <option key={a.id} value={a.nom}>{a.nom}</option>)}
              </select>
              <Link to="/app/settings/agences" className="text-[10px] text-gray-400 hover:text-green-700 transition-colors" title="Gérer les agences">⚙️</Link>
            </div>
          )}
          <button onClick={() => setModal(true)}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
            + Nouvelle commande
          </button>
        </div>
      </div>

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
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select value={c.statut}
                      onChange={e => updateCommandeStatut(c.id, e.target.value as CommandeStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[c.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      <option value="En cours">En cours</option>
                      <option value="Livrée">Livrée</option>
                      <option value="En attente">En attente</option>
                      <option value="Annulée">Annulée</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalCommande
          clients={clients}
          agenceNom={agenceNom}
          agences={agencesList}
          onSave={data => { addCommande(data); setModal(false) }}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
