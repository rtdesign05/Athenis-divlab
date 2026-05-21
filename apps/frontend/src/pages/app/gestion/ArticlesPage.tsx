import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type Article, type ArticleUnite } from '@/contexts/GestionContext'
import { CompteCombobox } from '@/components/accounting/CompteCombobox'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'

// ── Constantes ────────────────────────────────────────────────────────────────

const UNITES: ArticleUnite[] = ['pièce', 'kg', 'litre', 'm²', 'heure', 'forfait']
const AGENCES = ['Siège']

// Palette de couleurs pour les catégories (statiques pour Tailwind JIT)
const CATEGORY_PALETTE = [
  'bg-green-50 text-green-700 ring-green-200',
  'bg-orange-50 text-orange-700 ring-orange-200',
  'bg-blue-50 text-blue-700 ring-blue-200',
  'bg-amber-50 text-amber-700 ring-amber-200',
  'bg-purple-50 text-purple-700 ring-purple-200',
  'bg-teal-50 text-teal-700 ring-teal-200',
  'bg-pink-50 text-pink-700 ring-pink-200',
  'bg-indigo-50 text-indigo-700 ring-indigo-200',
  'bg-rose-50 text-rose-700 ring-rose-200',
  'bg-cyan-50 text-cyan-700 ring-cyan-200',
]

function getCategorieStyle(cat: string, allCats: string[]): string {
  const idx = allCats.indexOf(cat)
  return CATEGORY_PALETTE[(idx >= 0 ? idx : 0) % CATEGORY_PALETTE.length] ?? ''
}

// ── Modal nouvelle catégorie ──────────────────────────────────────────────────

interface ModalCategorieProps {
  existing:    string[]
  onSave:      (nom: string) => void
  onClose:     () => void
}

function ModalNouvelleCategorie({ existing, onSave, onClose }: ModalCategorieProps) {
  const [nom, setNom] = useState('')
  const alreadyExists = existing.map(c => c.toLowerCase()).includes(nom.trim().toLowerCase())
  const empty         = nom.trim() === ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (empty || alreadyExists) return
    onSave(nom.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xs rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Nouvelle catégorie</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nom de la catégorie *</label>
            <input
              autoFocus
              value={nom}
              onChange={e => setNom(e.target.value)}
              placeholder="Ex : Pièces détachées"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
            {alreadyExists && !empty && (
              <p className="mt-1 text-[11px] text-red-500">Cette catégorie existe déjà.</p>
            )}
          </div>

          {/* Prévisualisation du badge */}
          {nom.trim() && !alreadyExists && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">Aperçu :</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CATEGORY_PALETTE[existing.length % CATEGORY_PALETTE.length]}`}>
                {nom.trim()}
              </span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit" disabled={empty || alreadyExists}
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:opacity-40">
              Créer
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Modal article ─────────────────────────────────────────────────────────────

interface ModalArticleProps {
  initial?:   Partial<Article>
  agenceNom:  string | null
  categories: string[]
  onSave:     (data: Omit<Article, 'id' | 'createdAt'>) => void
  onClose:    () => void
}

function ModalArticle({ initial, agenceNom, categories, onSave, onClose }: ModalArticleProps) {
  const [form, setForm] = useState({
    reference:   initial?.reference   ?? '',
    nom:         initial?.nom         ?? '',
    categorie:   initial?.categorie   ?? (categories[0] ?? ''),
    unite:       initial?.unite       ?? 'pièce' as ArticleUnite,
    prixVenteHT: initial?.prixVenteHT ?? 0,
    prixAchatHT: initial?.prixAchatHT ?? 0,
    stock:       initial?.stock       ?? 0,
    stockMin:    initial?.stockMin    ?? 0,
    agence:      initial?.agence      ?? agenceNom ?? 'Siège',
    description: initial?.description ?? '',
    actif:       initial?.actif       ?? true,
    compteAchat: initial?.compteAchat ?? '',
    compteVente: initial?.compteVente ?? '',
  })

  const set    = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))
  const setNum  = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: Number(e.target.value) }))
  const setBool = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.checked }))

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim() || !form.reference.trim()) return
    onSave({ ...form, unite: form.unite as ArticleUnite })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-sm font-semibold text-gray-900">{initial?.id ? "Modifier l'article" : 'Nouvel article'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Référence *</label>
              <input value={form.reference} onChange={set('reference')} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie</label>
              <select value={form.categorie} onChange={set('categorie')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Désignation *</label>
              <input value={form.nom} onChange={set('nom')} required
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unité</label>
              <select value={form.unite} onChange={set('unite')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30">
                {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Prix vente HT (XAF)</label>
              <input type="number" min={0} value={form.prixVenteHT} onChange={setNum('prixVenteHT')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prix achat HT (XAF)</label>
              <input type="number" min={0} value={form.prixAchatHT} onChange={setNum('prixAchatHT')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock actuel</label>
              <input type="number" min={0} value={form.stock} onChange={setNum('stock')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock minimum (alerte)</label>
              <input type="number" min={0} value={form.stockMin} onChange={setNum('stockMin')}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea value={form.description} onChange={set('description')} rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none" />
            </div>

            {/* Comptabilité — comptes mouvementés à la facturation */}
            <div className="col-span-2 mt-2 rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[11px] text-blue-800 leading-relaxed">
              <p className="font-semibold mb-1">💡 Comptabilité SYSCOHADA</p>
              <ul className="ml-3 list-disc space-y-0.5">
                <li><strong>Compte de charge</strong> (classe 6) : utilisé dans les factures d'achat</li>
                <li><strong>Compte de produit</strong> (classe 7) : utilisé dans les factures de vente</li>
                <li>Si vide, défauts <code className="bg-blue-100 px-1 rounded">601</code> / <code className="bg-blue-100 px-1 rounded">701</code> appliqués</li>
              </ul>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Compte de charge <span className="text-[10px] font-normal text-gray-400">(achats)</span>
              </label>
              <CompteCombobox
                value={form.compteAchat}
                onChange={v => setForm(f => ({ ...f, compteAchat: v }))}
                onSelect={c => setForm(f => ({ ...f, compteAchat: c.code }))}
                filterClasses={['6']}
                placeholder="601 — Achats marchandises (par défaut)"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Compte de produit <span className="text-[10px] font-normal text-gray-400">(ventes)</span>
              </label>
              <CompteCombobox
                value={form.compteVente}
                onChange={v => setForm(f => ({ ...f, compteVente: v }))}
                onSelect={c => setForm(f => ({ ...f, compteVente: c.code }))}
                filterClasses={['7']}
                placeholder="701 — Ventes marchandises (par défaut)"
              />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <input id="actif" type="checkbox" checked={form.actif} onChange={setBool('actif')}
                className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
              <label htmlFor="actif" className="text-xs font-medium text-gray-600">Article actif (visible dans les commandes)</label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
              Annuler
            </button>
            <button type="submit"
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              {initial?.id ? 'Enregistrer' : "Créer l'article"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ArticlesPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const {
    articles, addArticle, updateArticle, deleteArticle,
    categoriesArticles, addCategorieArticle,
  } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [search,       setSearch]       = useState('')
  const [catFilter,    setCatFilter]    = useState<string>('all')
  const [actifFilter,  setActifFilter]  = useState<'all' | 'actif' | 'inactif'>('all')
  const [showModal,    setShowModal]    = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [editing,      setEditing]      = useState<Article | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null)
  const [dateFrom,     setDateFrom]     = useState('')
  const [dateTo,       setDateTo]       = useState('')

  const visible = useMemo(() => {
    let list = agenceNom ? articles.filter(a => a.agence === agenceNom) : articles
    if (catFilter   !== 'all')    list = list.filter(a => a.categorie === catFilter)
    if (actifFilter === 'actif')   list = list.filter(a => a.actif)
    if (actifFilter === 'inactif') list = list.filter(a => !a.actif)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.nom.toLowerCase().includes(q) ||
        a.reference.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
      )
    }
    list = filterByDateRange(list, a => a.createdAt, dateFrom, dateTo)
    return list
  }, [articles, agenceNom, catFilter, actifFilter, search, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  const enRupture     = visible.filter(a => a.stock <= a.stockMin && a.categorie !== 'Service').length
  const valeurStockHT = visible.reduce((s, a) => s + a.prixVenteHT * a.stock, 0)
  const actifs        = visible.filter(a => a.actif).length

  function handleSave(data: Omit<Article, 'id' | 'createdAt'>) {
    if (editing) { updateArticle(editing.id, data); setEditing(null) }
    else         { addArticle(data);                setShowModal(false) }
  }

  function handleNewCategory(nom: string) {
    addCategorieArticle(nom)
    setShowCatModal(false)
  }

  return (
    <div className="h-full flex flex-col gap-3">

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total articles</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{visible.length}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Actifs</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{actifs}</p>
        </div>
        <div className={`rounded-xl border p-3 ${enRupture > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className={`text-xs ${enRupture > 0 ? 'text-red-600' : 'text-gray-500'}`}>En rupture / alerte</p>
          <p className={`mt-1 text-2xl font-bold ${enRupture > 0 ? 'text-red-700' : 'text-gray-900'}`}>{enRupture}</p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs text-indigo-600">Valeur stock HT</p>
          <p className="mt-1 text-lg font-bold text-indigo-700">{fmt(valeurStockHT)}</p>
        </div>
      </div>

      {/* Catégories — liste des badges + bouton créer */}
      <div className="shrink-0 flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">Catégories :</span>
        <button
          onClick={() => setCatFilter('all')}
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${catFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          Toutes
        </button>
        {categoriesArticles.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(c => c === cat ? 'all' : cat)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset transition ${
              catFilter === cat
                ? getCategorieStyle(cat, categoriesArticles) + ' ring-2 ring-offset-1'
                : getCategorieStyle(cat, categoriesArticles) + ' opacity-70 hover:opacity-100'
            }`}
          >
            {cat}
          </button>
        ))}
        <button
          onClick={() => setShowCatModal(true)}
          className="rounded-full border border-dashed border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-400 hover:border-gray-400 hover:text-gray-600 transition"
        >
          + Nouvelle catégorie
        </button>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Réf, désignation, description…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
          </div>
          <select value={actifFilter} onChange={e => setActifFilter(e.target.value as 'all' | 'actif' | 'inactif')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30">
            <option value="all">Actifs + inactifs</option>
            <option value="actif">Actifs seulement</option>
            <option value="inactif">Inactifs seulement</option>
          </select>
          <PeriodFilter
            label="Créé entre"
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
            count={isFiltered ? `${visible.length} résultat${visible.length > 1 ? 's' : ''}` : null}
          />
          <button onClick={() => setShowModal(true)}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800 shrink-0">
            + Nouvel article
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-gray-400">
              <span className="text-3xl mb-2">📦</span>
              <p className="text-sm font-medium">Aucun article trouvé</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
                <tr className="text-left text-xs font-semibold text-gray-500">
                  <th className="px-4 py-2.5">Référence</th>
                  <th className="px-4 py-2.5">Désignation</th>
                  <th className="px-4 py-2.5">Catégorie</th>
                  <th className="px-4 py-2.5">Unité</th>
                  <th className="px-4 py-2.5 text-right">Prix vente HT</th>
                  <th className="px-4 py-2.5 text-right">Prix achat HT</th>
                  <th className="px-4 py-2.5 text-center">Stock</th>
                  <th className="px-4 py-2.5 text-center" title="Comptes comptables (charge / produit)">Comptes</th>
                  <th className="px-4 py-2.5 text-center">Statut</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.map(a => {
                  const rupture = a.categorie !== 'Service' && a.stock <= a.stockMin
                  return (
                    <tr key={a.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-gray-600">{a.reference}</td>
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800">{a.nom}</p>
                        {a.description && <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{a.description}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${getCategorieStyle(a.categorie, categoriesArticles)}`}>
                          {a.categorie}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{a.unite}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-900">
                        {a.prixVenteHT > 0 ? fmt(a.prixVenteHT) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-600">
                        {a.prixAchatHT > 0 ? fmt(a.prixAchatHT) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {a.categorie === 'Service' ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <span className={`text-xs font-semibold ${rupture ? 'text-red-600' : 'text-gray-800'}`}>
                            {rupture && <span className="mr-1">⚠️</span>}{a.stock}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            title={a.compteAchat ? `Compte de charge : ${a.compteAchat}` : 'Compte de charge non défini — défaut 601'}
                            className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${a.compteAchat ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-300'}`}
                          >
                            🛒 {a.compteAchat ?? '—'}
                          </span>
                          <span
                            title={a.compteVente ? `Compte de produit : ${a.compteVente}` : 'Compte de produit non défini — défaut 701'}
                            className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${a.compteVente ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-300'}`}
                          >
                            💰 {a.compteVente ?? '—'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${a.actif ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {a.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setEditing(a)} className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-gray-100 hover:text-gray-600">✏️</button>
                          <button onClick={() => setConfirmDel(a.id)} className="rounded px-2 py-1 text-[10px] text-gray-400 hover:bg-red-50 hover:text-red-500">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal article */}
      {(showModal || editing) && (
        <ModalArticle
          {...(editing ? { initial: editing } : {})}
          agenceNom={agenceNom}
          categories={categoriesArticles}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditing(null) }}
        />
      )}

      {/* Modal nouvelle catégorie */}
      {showCatModal && (
        <ModalNouvelleCategorie
          existing={categoriesArticles}
          onSave={handleNewCategory}
          onClose={() => setShowCatModal(false)}
        />
      )}

      {/* Confirmation suppression */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <p className="text-sm font-semibold text-gray-900 mb-1">Supprimer cet article ?</p>
            <p className="text-xs text-gray-500 mb-4">Cette action est irréversible.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDel(null)} className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">Annuler</button>
              <button onClick={() => { deleteArticle(confirmDel); setConfirmDel(null) }} className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
