import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stocksApi, type MouvType, type Article } from '@/services/stocksApi'
import { useCurrency } from '@/hooks/useCurrency'

const MOUV_LABELS: Record<MouvType, { label: string; entree: boolean }> = {
  ENTREE_ACHAT:       { label: 'Entrée achat',            entree: true },
  ENTREE_RETOUR:      { label: 'Retour client',            entree: true },
  ENTREE_INVENTAIRE:  { label: 'Ajustement inventaire +',  entree: true },
  SORTIE_VENTE:       { label: 'Sortie vente',             entree: false },
  SORTIE_CASSE:       { label: 'Casse / détérioration',    entree: false },
  SORTIE_INVENTAIRE:  { label: 'Ajustement inventaire −',  entree: false },
  TRANSFERT:          { label: 'Transfert',                entree: false },
  AJUSTEMENT:         { label: 'Ajustement',               entree: true },
}

function MouvModal({ articles, onClose }: { articles: Article[]; onClose: () => void }) {
  const qc = useQueryClient()
  const [articleId, setArticleId] = useState('')
  const [type,      setType]      = useState<MouvType>('ENTREE_ACHAT')
  const [qty,       setQty]       = useState('')
  const [pu,        setPu]        = useState('')
  const [ref,       setRef]       = useState('')
  const [desc,      setDesc]      = useState('')
  const [err,       setErr]       = useState('')

  const article = articles.find((a) => a.id === articleId)
  const isEntree = MOUV_LABELS[type]?.entree ?? true

  const preview = article && qty
    ? isEntree ? article.stockActuel + Number(qty) : article.stockActuel - Number(qty)
    : null

  const newCmup = article && qty && pu && isEntree && article.methodeValuation === 'CMUP'
    ? (article.stockActuel * article.valeurCmup + Number(qty) * Number(pu)) / (article.stockActuel + Number(qty))
    : null

  const mouv = useMutation({
    mutationFn: stocksApi.createMouvement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks'] }); onClose() },
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      await mouv.mutateAsync({ articleId, type, quantite: Number(qty), prixUnitaire: Number(pu), reference: ref || undefined, description: desc || undefined })
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur')
    }
  }

  const ENTREES: MouvType[] = ['ENTREE_ACHAT', 'ENTREE_RETOUR', 'ENTREE_INVENTAIRE']
  const SORTIES: MouvType[] = ['SORTIE_VENTE', 'SORTIE_CASSE', 'SORTIE_INVENTAIRE']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Nouveau mouvement</h2>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label">Type de mouvement *</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-green-600">Entrées</p>
                {ENTREES.map((t) => (
                  <label key={t} className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${type === t ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                    ➕ {MOUV_LABELS[t].label}
                  </label>
                ))}
              </div>
              <div>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-red-500">Sorties</p>
                {SORTIES.map((t) => (
                  <label key={t} className={`mb-1 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs ${type === t ? 'border-red-300 bg-red-50 text-red-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                    ➖ {MOUV_LABELS[t].label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Article *</label>
            <select className="input" required value={articleId} onChange={(e) => { setArticleId(e.target.value); const a = articles.find((x) => x.id === e.target.value); if (a) setPu(isEntree ? String(a.prixAchat) : String(a.prixVente)) }}>
              <option value="">— Sélectionner —</option>
              {articles.map((a) => <option key={a.id} value={a.id}>{a.reference} — {a.designation}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantité *</label>
              <input className="input" type="number" required min={0.001} step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
            </div>
            <div>
              <label className="label">Prix unitaire HT *</label>
              <input className="input" type="number" required min={0} step="any" value={pu} onChange={(e) => setPu(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Référence document</label>
              <input className="input" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="N° facture, BL…" />
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </div>
          </div>

          {/* Aperçu */}
          {article && qty && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Stock actuel</span><span className="font-medium">{article.stockActuel} {article.unite}</span></div>
              <div className={`flex justify-between font-medium ${isEntree ? 'text-green-600' : 'text-red-600'}`}>
                <span>Mouvement</span><span>{isEntree ? '+' : '-'}{qty} {article.unite}</span>
              </div>
              {preview !== null && <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-gray-500">Stock après</span><span className={`font-bold ${preview < 0 ? 'text-red-600' : 'text-gray-900'}`}>{preview} {article.unite}</span></div>}
              {newCmup !== null && <div className="flex justify-between"><span className="text-gray-500">CMUP après</span><span className="font-medium text-gray-700">{newCmup.toFixed(0)} (actuel : {article.valeurCmup})</span></div>}
            </div>
          )}

          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mouv.isPending} className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-60">
              {mouv.isPending ? 'Enregistrement…' : 'Enregistrer le mouvement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function MouvementsPage() {
  const { fmt }   = useCurrency()
  const [modal, setModal]     = useState(false)
  const [artFilter, setArtFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState<MouvType | ''>('')

  const { data, isLoading } = useQuery({
    queryKey: ['stocks', 'mouvements', { artFilter, typeFilter }],
    queryFn:  () => stocksApi.listMouvements({ articleId: artFilter || undefined, type: (typeFilter || undefined) as MouvType | undefined, limit: 100 }),
  })
  const { data: articlesData } = useQuery({ queryKey: ['stocks', 'articles', {}], queryFn: () => stocksApi.listArticles({ limit: 200 }) })
  const articles = articlesData?.items ?? []
  const mouvements = data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Mouvements de stock</h2>
          <p className="text-sm text-gray-500">{data?.total ?? 0} mouvement{(data?.total ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal(true)} className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
          + Nouveau mouvement
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select className="input w-auto" value={artFilter} onChange={(e) => setArtFilter(e.target.value)}>
          <option value="">Tous les articles</option>
          {articles.map((a) => <option key={a.id} value={a.id}>{a.reference} — {a.designation}</option>)}
        </select>
        <select className="input w-auto" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as MouvType | '')}>
          <option value="">Tous types</option>
          {Object.entries(MOUV_LABELS).map(([k, v]) => <option key={k} value={k}>{v.entree ? '➕' : '➖'} {v.label}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-right">Quantité</th>
              <th className="px-4 py-3 text-right">Prix U.</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Stock ap.</th>
              <th className="px-4 py-3">Référence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Chargement…</td></tr>
            ) : mouvements.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Aucun mouvement</td></tr>
            ) : mouvements.map((m) => {
              const info    = MOUV_LABELS[m.type]
              const isIn    = info?.entree ?? true
              return (
                <tr key={m.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-500">{m.article?.reference}</span>
                    <span className="ml-1.5 text-xs text-gray-700">{m.article?.designation}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isIn ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isIn ? '➕' : '➖'} {info?.label}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${isIn ? 'text-green-600' : 'text-red-600'}`}>
                    {isIn ? '+' : '-'}{m.quantite}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(m.prixUnitaire)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(m.prixTotal)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{m.stockApres} {m.article?.unite}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{m.reference ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && <MouvModal articles={articles} onClose={() => setModal(false)} />}
    </div>
  )
}
