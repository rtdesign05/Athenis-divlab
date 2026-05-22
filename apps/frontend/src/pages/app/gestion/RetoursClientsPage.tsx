import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type RetourStatut } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'

const STATUT_STYLE: Record<RetourStatut, string> = {
  'En cours':  'bg-amber-100 text-amber-700',
  'Validé':    'bg-blue-100 text-blue-700',
  'Remboursé': 'bg-green-100 text-green-700',
  'Refusé':    'bg-red-100 text-red-600',
}

const STATUTS: RetourStatut[] = ['En cours', 'Validé', 'Remboursé', 'Refusé']

const MOTIFS_COURANTS = [
  'Produit défectueux',
  'Erreur de référence',
  'Quantité non conforme',
  'Commande annulée',
  'Produit endommagé à la livraison',
  'Délai de livraison non respecté',
  'Autre',
]

// ── Modal nouveau retour ──────────────────────────────────────────────────────

interface ModalRetourProps {
  clients:    { nom: string }[]
  factures:   { id: string; client: string }[]
  agenceNom:  string | null
  onSave: (data: { facture: string; client: string; agence: string; date: string; motif: string; montant: number; statut: RetourStatut }) => void
  onClose: () => void
}

function ModalRetour({ clients, factures, agenceNom, onSave, onClose }: ModalRetourProps) {
  const { agences } = useCompanySettings()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    facture:  '',
    client:   '',
    agence:   agenceNom ?? 'Siège',
    date:     today,
    motif:    MOTIFS_COURANTS[0] ?? '',
    motifLib: '',
    montant:  0,
  })

  const set    = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const setNum = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, montant: Number(e.target.value) }))

  function handleFactureChange(e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) {
    const fav = factures.find(f => f.id === e.target.value)
    setForm(f => ({
      ...f,
      facture: e.target.value,
      client:  fav?.client ?? f.client,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client.trim() || form.montant <= 0) return
    const motifFinal = form.motif === 'Autre' ? form.motifLib.trim() || 'Autre' : form.motif
    onSave({
      facture:  form.facture.trim(),
      client:   form.client.trim(),
      agence:   form.agence,
      date:     form.date,
      motif:    motifFinal,
      montant:  form.montant,
      statut:   'En cours',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau retour client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Facture liée</label>
              {factures.length > 0 ? (
                <select value={form.facture} onChange={handleFactureChange}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  <option value="">— aucune —</option>
                  {factures.map(f => <option key={f.id} value={f.id}>{f.id}</option>)}
                </select>
              ) : (
                <input value={form.facture} onChange={set('facture')} placeholder="FAV-xxxx"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Client *</label>
              <input list="clients-ret-list" value={form.client} onChange={set('client')} required
                placeholder="Nom du client"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              <datalist id="clients-ret-list">
                {clients.map(c => <option key={c.nom} value={c.nom} />)}
              </datalist>
            </div>
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
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Motif *</label>
            <select value={form.motif} onChange={set('motif')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
              {MOTIFS_COURANTS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {form.motif === 'Autre' && (
              <input value={form.motifLib} onChange={set('motifLib')} placeholder="Précisez le motif…"
                className="mt-1.5 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
            {agenceNom ? (
              <input value={agenceNom} readOnly
                className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
            ) : (
              <select value={form.agence} onChange={set('agence')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {agences.length === 0
                  ? <option value="Siège">Siège</option>
                  : agences.map(a => <option key={a.id} value={a.nom}>{a.nom}{a.isSiege ? ' (Siège)' : ''}</option>)}
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
              Enregistrer le retour
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function RetoursClientsPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const { retoursClients, clients, facturesVentes, updateRetourStatut, addRetourClient } = useGestion()

  const agenceNom = user?.agenceNom ?? null
  const [search, setSearch] = useState('')
  const [modal,  setModal]  = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')

  const items = useMemo(() => {
    let list = agenceNom ? retoursClients.filter(r => r.agence === agenceNom) : retoursClients
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(r =>
        r.client.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.motif.toLowerCase().includes(q),
      )
    }
    list = filterByDateRange(list, r => r.date, dateFrom, dateTo)
    return list
  }, [retoursClients, agenceNom, search, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  const facturesForModal = useMemo(
    () => agenceNom
      ? facturesVentes.filter(f => f.agence === agenceNom).map(f => ({ id: f.id, client: f.client }))
      : facturesVentes.map(f => ({ id: f.id, client: f.client })),
    [facturesVentes, agenceNom],
  )

  const total        = items.length
  const montantTotal = items.reduce((s, r) => s + r.montant, 0)
  const enCours      = items.filter(r => r.statut === 'En cours').length
  const rembourses   = items.filter(r => r.statut === 'Remboursé').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Retours clients</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <button onClick={() => setModal(true)}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
          + Nouveau retour
        </button>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total retours</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Montant total</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{fmt(montantTotal)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-600">En cours</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{enCours}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Remboursés</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{rembourses}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Client, N° retour, motif…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <PeriodFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
            count={isFiltered ? `${items.length} résultat${items.length > 1 ? 's' : ''}` : null}
          />
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° retour</th>
                <th className="px-4 py-2.5">Facture</th>
                <th className="px-4 py-2.5">Client</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Motif</th>
                <th className="px-4 py-2.5 text-right">Montant</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Aucun retour trouvé</td></tr>
              ) : items.map(r => (
                <tr key={r.id} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{r.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.facture}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{r.client}</td>
                  {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{r.agence}</td>}
                  <td className="px-4 py-2.5 text-gray-500">{new Date(r.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-gray-600 max-w-[180px] truncate">{r.motif}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(r.montant)}</td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select value={r.statut}
                      onChange={e => updateRetourStatut(r.id, e.target.value as RetourStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[r.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalRetour
          clients={clients}
          factures={facturesForModal}
          agenceNom={agenceNom}
          onSave={data => { addRetourClient(data); setModal(false) }}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
