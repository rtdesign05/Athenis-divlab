import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type Fournisseur, type FournisseurCategorie } from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { CompteCombobox } from '@/components/accounting/CompteCombobox'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'

const CATEGORIE_STYLE: Record<FournisseurCategorie, string> = {
  'Matières premières': 'bg-orange-50 text-orange-700 ring-orange-200',
  'Services':           'bg-blue-50 text-blue-700 ring-blue-200',
  'Équipement':         'bg-purple-50 text-purple-700 ring-purple-200',
  'Logistique':         'bg-cyan-50 text-cyan-700 ring-cyan-200',
  'Informatique':       'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'Autre':              'bg-gray-100 text-gray-600 ring-gray-200',
}

const CATEGORIES: FournisseurCategorie[] = [
  'Matières premières', 'Services', 'Équipement', 'Logistique', 'Informatique', 'Autre',
]

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalFournisseurProps {
  initial?: Partial<Fournisseur>
  agenceNom: string | null
  onSave: (data: Omit<Fournisseur, 'id' | 'createdAt'>) => void
  onClose: () => void
}

function ModalFournisseur({ initial, agenceNom, onSave, onClose }: ModalFournisseurProps) {
  const { agences } = useCompanySettings()
  const [form, setForm] = useState({
    nom:       initial?.nom       ?? '',
    categorie: initial?.categorie ?? 'Autre' as FournisseurCategorie,
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
      categorie: rest.categorie as FournisseurCategorie,
      ...(compte.trim() ? { compte: compte.trim() } : {}),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{initial?.id ? 'Modifier le fournisseur' : 'Nouveau fournisseur'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Raison sociale *</label>
              <input value={form.nom} onChange={set('nom')} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
              <select value={form.categorie} onChange={set('categorie')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agence</label>
              {agenceNom ? (
                <input value={agenceNom} readOnly className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-500" />
              ) : (
                <select value={form.agence} onChange={set('agence')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                  {agences.length === 0
                    ? <option value="Siège">Siège</option>
                    : agences.map(a => <option key={a.id} value={a.nom}>{a.nom}{a.isSiege ? ' (Siège)' : ''}</option>)}
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
                <span className="ml-1 font-normal text-gray-400">(facultatif — ex : 401100)</span>
              </label>
              <CompteCombobox
                value={form.compte}
                onChange={v => setForm(f => ({ ...f, compte: v }))}
                onSelect={c => setForm(f => ({ ...f, compte: c.code }))}
                placeholder="401100"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500/30"
                filterClasses={['4']}
              />
              {form.compte.trim() && (
                <p className="mt-1 text-[11px] text-orange-600">
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
              {initial?.id ? 'Enregistrer' : 'Créer le fournisseur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FournisseursPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const {
    fournisseurs, achats, facturesAchats,
    addFournisseur, updateFournisseur, deleteFournisseur,
  } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [search,     setSearch]     = useState('')
  const [catFilter,  setCatFilter]  = useState<FournisseurCategorie | 'all'>('all')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<Fournisseur | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  // Détail fournisseur : drawer drill-down avec liste des achats sur la période
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null)
  const [drawerDateFrom,      setDrawerDateFrom]      = useState('')
  const [drawerDateTo,        setDrawerDateTo]        = useState('')

  // Le total fournisseur agrège désormais commandes (ORDER) + factures
  // d'achat (INVOICE), conformément à la nouvelle KPI du tableau de bord.
  const totalMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of achats) {
      if (a.statut !== 'Annulée') m[a.fournisseur] = (m[a.fournisseur] ?? 0) + a.montant
    }
    for (const fa of facturesAchats) {
      if (fa.statut !== 'Annulée') m[fa.fournisseur] = (m[fa.fournisseur] ?? 0) + fa.montantHT
    }
    return m
  }, [achats, facturesAchats])

  const nbCmdMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const a of achats)         m[a.fournisseur]  = (m[a.fournisseur]  ?? 0) + 1
    for (const fa of facturesAchats) m[fa.fournisseur] = (m[fa.fournisseur] ?? 0) + 1
    return m
  }, [achats, facturesAchats])

  // Lignes du drawer : fusion commandes + factures du fournisseur sélectionné,
  // filtrées par la période et triées par date décroissante.
  type LigneDetail = {
    id: string; type: 'commande' | 'facture'; date: string;
    montant: number; statut: string; objet: string
  }
  const drawerLignes = useMemo<LigneDetail[]>(() => {
    if (!selectedFournisseur) return []
    const nom = selectedFournisseur.nom
    const fromOrders = achats
      .filter(a => a.fournisseur === nom)
      .map<LigneDetail>(a => ({
        id: a.id, type: 'commande',
        date: a.date, montant: a.montant, statut: a.statut, objet: a.objet ?? '—',
      }))
    const fromInvoices = facturesAchats
      .filter(fa => fa.fournisseur === nom)
      .map<LigneDetail>(fa => ({
        id: fa.id, type: 'facture',
        date: fa.date, montant: fa.montantHT, statut: fa.statut, objet: fa.commande || fa.notes || '—',
      }))
    const merged = [...fromOrders, ...fromInvoices]
    const filtered = filterByDateRange(merged, l => l.date, drawerDateFrom, drawerDateTo)
    return filtered.sort((a, b) => b.date.localeCompare(a.date))
  }, [selectedFournisseur, achats, facturesAchats, drawerDateFrom, drawerDateTo])

  const drawerSummary = useMemo(() => {
    const total = drawerLignes
      .filter(l => l.statut !== 'Annulée')
      .reduce((s, l) => s + l.montant, 0)
    return { total, count: drawerLignes.length }
  }, [drawerLignes])

  const visible = useMemo(() => {
    let list = agenceNom ? fournisseurs.filter(f => f.agence === agenceNom) : fournisseurs
    if (catFilter !== 'all') list = list.filter(f => f.categorie === catFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.nom.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        f.telephone.includes(q),
      )
    }
    return list
  }, [fournisseurs, agenceNom, catFilter, search])

  function handleSave(data: Omit<Fournisseur, 'id' | 'createdAt'>) {
    if (editing) { updateFournisseur(editing.id, data); setEditing(null) }
    else         { addFournisseur(data);                setShowModal(false) }
  }

  return (
    <div className="h-full flex flex-col gap-3">

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total fournisseurs</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{visible.length}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3">
          <p className="text-xs text-orange-600">Matières / Équipement</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">
            {visible.filter(f => f.categorie === 'Matières premières' || f.categorie === 'Équipement').length}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">Services / Logistique</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {visible.filter(f => f.categorie === 'Services' || f.categorie === 'Logistique').length}
          </p>
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
          <select value={catFilter} onChange={e => setCatFilter(e.target.value as FournisseurCategorie | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setShowModal(true)}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 shrink-0">
            + Nouveau fournisseur
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <span className="text-3xl mb-2">🏭</span>
              <p className="text-sm font-medium">Aucun fournisseur trouvé</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                <tr className="text-left text-xs font-semibold text-gray-500">
                  <th className="px-4 py-2.5">Fournisseur</th>
                  <th className="px-4 py-2.5">Catégorie</th>
                  <th className="px-4 py-2.5">Contact</th>
                  <th className="px-4 py-2.5">Agence</th>
                  <th className="px-4 py-2.5">Compte</th>
                  <th className="px-4 py-2.5 text-right">Total achats</th>
                  <th className="px-4 py-2.5 text-center">Cmds</th>
                  <th className="px-4 py-2.5 text-right">Depuis</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(f => (
                  <tr key={f.id}
                    onClick={() => setSelectedFournisseur(f)}
                    className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                    title="Voir le détail des achats">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-semibold text-gray-800">{f.nom}</p>
                      {f.notes && <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{f.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CATEGORIE_STYLE[f.categorie]}`}>
                        {f.categorie}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-xs text-gray-600">{f.email || '—'}</p>
                      <p className="text-[10px] text-gray-400">{f.telephone || '—'}</p>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-gray-500">{f.agence}</td>
                    <td className="px-4 py-2.5">
                      {f.compte ? (
                        <span className="font-mono text-xs text-orange-700 bg-orange-50 rounded px-1.5 py-0.5">{f.compte}</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">
                      {totalMap[f.nom] ? fmt(totalMap[f.nom]!) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-600">{nbCmdMap[f.nom] ?? 0}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                      {new Date(f.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={e => { e.stopPropagation(); setEditing(f) }} className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600">✏️</button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDel(f.id) }} className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-red-50 hover:text-red-500">🗑️</button>
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
        <ModalFournisseur
          {...(editing ? { initial: editing } : {})}
          agenceNom={agenceNom}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {/* ── Drawer : détail des achats du fournisseur sélectionné ─────────── */}
      {selectedFournisseur && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/30"
            onClick={() => setSelectedFournisseur(null)}
          />
          <aside className="w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* En-tête drawer */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-4 flex items-start justify-between bg-gradient-to-r from-orange-50/40 to-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-gray-900 truncate">{selectedFournisseur.nom}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CATEGORIE_STYLE[selectedFournisseur.categorie]}`}>
                    {selectedFournisseur.categorie}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {selectedFournisseur.email || '—'}
                  {selectedFournisseur.telephone && <span> · {selectedFournisseur.telephone}</span>}
                  {selectedFournisseur.compte && (
                    <span className="ml-2 font-mono text-[10px] text-orange-700 bg-orange-50 rounded px-1.5 py-0.5">
                      {selectedFournisseur.compte}
                    </span>
                  )}
                </p>
              </div>
              <button onClick={() => setSelectedFournisseur(null)}
                className="ml-3 text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
                title="Fermer">
                ×
              </button>
            </div>

            {/* Filtre de période + résumé */}
            <div className="shrink-0 border-b border-gray-100 px-5 py-3 bg-gray-50/40 space-y-3">
              <PeriodFilter
                dateFrom={drawerDateFrom}
                dateTo={drawerDateTo}
                onChange={({ dateFrom, dateTo }) => { setDrawerDateFrom(dateFrom); setDrawerDateTo(dateTo) }}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Total achats</p>
                  <p className="mt-0.5 text-base font-bold text-gray-900 tabular-nums">{fmt(drawerSummary.total)}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Pièces</p>
                  <p className="mt-0.5 text-base font-bold text-gray-900 tabular-nums">
                    {drawerSummary.count}
                    {drawerSummary.count > 0 && <span className="ml-1 text-[10px] font-normal text-gray-400">cmd + facture</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Liste des achats */}
            <div className="flex-1 min-h-0 overflow-auto">
              {drawerLignes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
                  <span className="text-3xl mb-2">📦</span>
                  <p className="text-sm font-medium">Aucun achat enregistré</p>
                  <p className="text-xs mt-1">
                    {drawerDateFrom || drawerDateTo ? 'sur la période sélectionnée' : 'auprès de ce fournisseur'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                    <tr className="text-left text-[11px] font-semibold text-gray-500">
                      <th className="px-4 py-2 w-20">Type</th>
                      <th className="px-4 py-2">Référence</th>
                      <th className="px-4 py-2">Objet / Notes</th>
                      <th className="px-4 py-2 w-24">Date</th>
                      <th className="px-4 py-2 w-20 text-center">Statut</th>
                      <th className="px-4 py-2 w-28 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {drawerLignes.map(l => (
                      <tr key={`${l.type}-${l.id}`} className="hover:bg-gray-50/60">
                        <td className="px-4 py-2">
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${
                            l.type === 'commande' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                          }`}>
                            {l.type === 'commande' ? 'CMD' : 'FA'}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-[11px] text-gray-700">{l.id}</td>
                        <td className="px-4 py-2 text-gray-600 truncate max-w-[200px]" title={l.objet}>{l.objet}</td>
                        <td className="px-4 py-2 text-gray-500">{new Date(l.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                            l.statut === 'Annulée' ? 'bg-red-50 text-red-500' :
                            l.statut === 'Payée' || l.statut === 'Reçue' ? 'bg-green-50 text-green-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {l.statut}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-gray-900">
                          {fmt(l.montant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </aside>
        </div>
      )}

      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-gray-900 mb-1">Supprimer ce fournisseur ?</p>
            <p className="text-xs text-gray-500 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={() => { deleteFournisseur(confirmDel); setConfirmDel(null) }} className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
