import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import {
  useGestion,
  type Article,
  type MouvementStock,
  type MouvementType,
} from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'

// ── Constantes ────────────────────────────────────────────────────────────────

const MVT_STYLE: Record<MouvementType, string> = {
  'Entrée':     'bg-green-50  text-green-700  ring-green-200',
  'Sortie':     'bg-red-50    text-red-700    ring-red-200',
  'Ajustement': 'bg-amber-50  text-amber-700  ring-amber-200',
}

const MVT_ICON: Record<MouvementType, string> = {
  'Entrée':     '↓',
  'Sortie':     '↑',
  'Ajustement': '↔',
}

function stockStatut(article: Article): { label: string; cls: string } {
  if (article.categorie === 'Service') return { label: '—', cls: 'bg-gray-50 text-gray-400 ring-gray-100' }
  if (article.stock === 0)             return { label: 'Rupture', cls: 'bg-red-50 text-red-700 ring-red-200' }
  if (article.stock < article.stockMin) return { label: 'Stock bas', cls: 'bg-amber-50 text-amber-700 ring-amber-200' }
  return { label: 'OK', cls: 'bg-green-50 text-green-700 ring-green-200' }
}

// ── Modal ajustement ──────────────────────────────────────────────────────────

interface ModalAjustementProps {
  articles:  Article[]
  agenceNom: string | null
  onSave:    (m: Omit<MouvementStock, 'id'>) => void
  onClose:   () => void
}

function ModalAjustement({ articles, agenceNom, onSave, onClose }: ModalAjustementProps) {
  const { agences } = useCompanySettings()
  const stockables = articles.filter(a => a.categorie !== 'Service' && a.actif)

  const [form, setForm] = useState({
    articleId: stockables[0]?.id ?? '',
    type:      'Ajustement' as MouvementType,
    quantite:  0,
    reference: '',
    agence:    agenceNom ?? 'Siège',
    notes:     '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.articleId || form.quantite === 0) return
    const article = articles.find(a => a.id === form.articleId)
    if (!article) return
    const qte = form.type === 'Sortie' ? -Math.abs(Number(form.quantite)) : Number(form.quantite)
    onSave({
      articleId:  form.articleId,
      articleNom: article.nom,
      type:       form.type,
      quantite:   qte,
      reference:  form.reference.trim() || 'Saisie manuelle',
      agence:     form.agence,
      date:       new Date().toISOString().slice(0, 10),
      notes:      form.notes.trim(),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouveau mouvement de stock</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Article *</label>
            <select value={form.articleId} onChange={set('articleId')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
              {stockables.map(a => (
                <option key={a.id} value={a.id}>{a.reference} — {a.nom}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
              <select value={form.type} onChange={set('type')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                <option value="Entrée">Entrée</option>
                <option value="Sortie">Sortie</option>
                <option value="Ajustement">Ajustement</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantité * {form.type === 'Ajustement' ? '(+ ou −)' : ''}
              </label>
              <input type="number"
                value={form.quantite}
                onChange={e => setForm(f => ({ ...f, quantite: Number(e.target.value) }))}
                step={1}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Référence</label>
              <input value={form.reference} onChange={set('reference')} placeholder="CMD-xxxx, BL-xxxx…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
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
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={set('notes')} rows={2} placeholder="Motif du mouvement…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              Enregistrer le mouvement
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function StockPage() {
  const { user }                                         = useAuth()
  const { fmt }                                          = useCurrency()
  const { articles, mouvementsStock, addMouvementStock, categoriesArticles } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [tab,          setTab]          = useState<'niveaux' | 'mouvements'>('niveaux')
  const [search,       setSearch]       = useState('')
  const [filterCat,    setFilterCat]    = useState<string>('tous')
  const [filterStatut, setFilterStatut] = useState<string>('tous')
  const [filterType,   setFilterType]   = useState<string>('tous')
  const [modal,        setModal]        = useState(false)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  const allArticles = useMemo(
    () => agenceNom ? articles.filter(a => a.agence === agenceNom) : articles,
    [articles, agenceNom],
  )

  const allMouvements = useMemo(
    () => agenceNom ? mouvementsStock.filter(m => m.agence === agenceNom) : mouvementsStock,
    [mouvementsStock, agenceNom],
  )

  // KPIs
  const kpis = useMemo(() => {
    const stockables = allArticles.filter(a => a.categorie !== 'Service')
    const ruptures   = stockables.filter(a => a.stock === 0).length
    const basSeuil   = stockables.filter(a => a.stock > 0 && a.stock < a.stockMin).length
    const valeurHT   = stockables.reduce((s, a) => s + a.stock * a.prixAchatHT, 0)
    const today      = new Date().toISOString().slice(0, 7)
    const mouvMois   = allMouvements.filter(m => m.date.startsWith(today)).length
    return { total: stockables.length, ruptures, basSeuil, valeurHT, mouvMois }
  }, [allArticles, allMouvements])

  // Niveaux filtrés
  const niveaux = useMemo(() => {
    const q = search.toLowerCase()
    return allArticles.filter(a => {
      if (a.categorie === 'Service') return false
      if (filterCat !== 'tous' && a.categorie !== filterCat) return false
      if (filterStatut !== 'tous') {
        const s = stockStatut(a).label
        if (filterStatut === 'rupture' && s !== 'Rupture')   return false
        if (filterStatut === 'bas'     && s !== 'Stock bas') return false
      }
      if (!q) return true
      return a.nom.toLowerCase().includes(q) || a.reference.toLowerCase().includes(q)
    })
  }, [allArticles, search, filterCat, filterStatut])

  // Mouvements filtrés (avec filtre période)
  const mouvements = useMemo(() => {
    const q = search.toLowerCase()
    let list = allMouvements.filter(m => {
      if (filterType !== 'tous' && m.type !== filterType) return false
      if (!q) return true
      return m.articleNom.toLowerCase().includes(q) || m.reference.toLowerCase().includes(q)
    })
    list = filterByDateRange(list, m => m.date, dateFrom, dateTo)
    return list
  }, [allMouvements, search, filterType, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Stock</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Niveaux d'inventaire et mouvements de stock
            {agenceNom && <> · <span className="text-gray-700">{agenceNom}</span></>}
          </p>
        </div>
        <button onClick={() => setModal(true)}
          className="flex items-center gap-1.5 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 transition">
          <span className="text-base leading-none">+</span>
          Mouvement
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 py-4 border-b border-gray-100">
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Articles stockables</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{kpis.total}</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${kpis.ruptures > 0 ? 'border-red-100 bg-red-50' : 'border-gray-100 bg-white'}`}>
          <p className={`text-xs ${kpis.ruptures > 0 ? 'text-red-600' : 'text-gray-500'}`}>En rupture</p>
          <p className={`mt-1 text-2xl font-bold ${kpis.ruptures > 0 ? 'text-red-700' : 'text-gray-900'}`}>{kpis.ruptures}</p>
          {kpis.basSeuil > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">{kpis.basSeuil} sous le seuil</p>
          )}
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Valeur stock HT</p>
          <p className="mt-1 text-xl font-bold text-gray-900 leading-tight">{fmt(kpis.valeurHT)}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Mouvements ce mois</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{kpis.mouvMois}</p>
        </div>
      </div>

      {/* Tabs internes */}
      <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-6">
        {(['niveaux', 'mouvements'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch('') }}
            className={`text-sm font-medium pb-1 border-b-2 transition ${
              tab === t
                ? 'border-green-700 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {t === 'niveaux' ? 'Niveaux de stock' : 'Mouvements'}
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="px-6 py-3 flex items-center gap-3 border-b border-gray-50">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={tab === 'niveaux' ? 'Rechercher un article…' : 'Article, référence…'}
          className="w-56 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />

        {tab === 'niveaux' && (
          <>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
              <option value="tous">Toutes catégories</option>
              {categoriesArticles.filter(c => c !== 'Service').map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
              <option value="tous">Tous statuts</option>
              <option value="rupture">Rupture</option>
              <option value="bas">Stock bas</option>
            </select>
          </>
        )}

        {tab === 'mouvements' && (
          <>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
              <option value="tous">Tous types</option>
              <option value="Entrée">Entrées</option>
              <option value="Sortie">Sorties</option>
              <option value="Ajustement">Ajustements</option>
            </select>
            <PeriodFilter
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
              count={isFiltered ? `${mouvements.length} résultat${mouvements.length > 1 ? 's' : ''}` : null}
            />
          </>
        )}

        <span className="ml-auto text-xs text-gray-400">
          {tab === 'niveaux'
            ? `${niveaux.length} article${niveaux.length !== 1 ? 's' : ''}`
            : `${mouvements.length} mouvement${mouvements.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-auto">

        {tab === 'niveaux' && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Article</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3 text-right">Stock actuel</th>
                <th className="px-4 py-3 text-right">Stock min</th>
                <th className="px-4 py-3">Unité</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3 text-right">Valeur HT</th>
                <th className="px-4 py-3">Agence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {niveaux.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-400">Aucun article trouvé</td></tr>
              ) : niveaux.map(a => {
                const s = stockStatut(a)
                return (
                  <tr key={a.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900 leading-snug">{a.nom}</p>
                      <p className="text-xs text-gray-400">{a.reference}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{a.categorie}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold tabular-nums ${a.stock === 0 ? 'text-red-600' : a.stock < a.stockMin ? 'text-amber-600' : 'text-gray-900'}`}>
                        {a.stock.toLocaleString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                      {a.stockMin > 0 ? a.stockMin.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{a.unite}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {a.prixAchatHT > 0 ? fmt(a.stock * a.prixAchatHT) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{a.agence}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {tab === 'mouvements' && (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                <th className="px-6 py-3">Date</th>
                <th className="px-4 py-3">Article</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Quantité</th>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Agence</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mouvements.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">Aucun mouvement trouvé</td></tr>
              ) : mouvements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50/60 transition">
                  <td className="px-6 py-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 leading-snug">{m.articleNom}</p>
                    <p className="text-xs text-gray-400">{m.articleId}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MVT_STYLE[m.type]}`}>
                      <span>{MVT_ICON[m.type]}</span>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold tabular-nums ${m.quantite > 0 ? 'text-green-700' : m.quantite < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {m.quantite > 0 ? `+${m.quantite}` : m.quantite}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {m.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{m.agence}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ModalAjustement
          articles={articles}
          agenceNom={agenceNom}
          onSave={m => { addMouvementStock(m); setModal(false) }}
          onClose={() => setModal(false)}
        />
      )}
    </div>
  )
}
