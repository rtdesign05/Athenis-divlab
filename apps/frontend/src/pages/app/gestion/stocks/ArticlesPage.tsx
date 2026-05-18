import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stocksApi, type Article, type StockFamily, type StockMethod } from '@/services/stocksApi'
import { useCurrency } from '@/hooks/useCurrency'
import { CompteCombobox } from '@/components/accounting/CompteCombobox'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { TVA_CM_PCT } from '@athenis/shared-types'

// ── Status helper ─────────────────────────────────────────────────────────────

function statut(stock: number, min: number) {
  if (stock === 0)    return { label: '🔴 Rupture', cls: 'bg-red-100 text-red-700' }
  if (stock <= min)   return { label: '⚠️ Alerte',  cls: 'bg-amber-100 text-amber-700' }
  return                     { label: '✅ OK',       cls: 'bg-green-100 text-green-700' }
}

// ── Mouvement rapide modal ────────────────────────────────────────────────────

function MouvRapideModal({ article, type, onClose }: { article: Article; type: 'in' | 'out'; onClose: () => void }) {
  const qc = useQueryClient()
  const [qty, setQty]   = useState('')
  const [pu, setPu]     = useState(type === 'in' ? String(article.prixAchat) : String(article.prixVente))
  const [desc, setDesc] = useState('')
  const [err, setErr]   = useState('')

  const mouv = useMutation({
    mutationFn: stocksApi.createMouvement,
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['stocks'] }); onClose() },
  })

  const mouvType = type === 'in' ? 'ENTREE_ACHAT' : 'SORTIE_VENTE'
  const preview  = type === 'in'
    ? article.stockActuel + Number(qty || 0)
    : article.stockActuel - Number(qty || 0)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      await mouv.mutateAsync({ articleId: article.id, type: mouvType, quantite: Number(qty), prixUnitaire: Number(pu), ...(desc ? { description: desc } : {}) })
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-gray-900">
          {type === 'in' ? '➕ Entrée de stock' : '➖ Sortie de stock'}
        </h2>
        <p className="mb-4 text-sm text-gray-500">{article.reference} — {article.designation}</p>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Quantité *</label>
              <input className="input" type="number" required min={0.001} step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="label">Prix unitaire HT *</label>
              <input className="input" type="number" required min={0} step="any" value={pu} onChange={(e) => setPu(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Référence document…" />
          </div>

          {/* Aperçu */}
          {qty && (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-xs space-y-1">
              <div className="flex justify-between"><span className="text-gray-500">Stock actuel</span><span className="font-medium">{article.stockActuel} {article.unite}</span></div>
              <div className={`flex justify-between font-medium ${type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                <span>Mouvement</span><span>{type === 'in' ? '+' : '-'}{qty} {article.unite}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1"><span className="text-gray-500">Stock après</span><span className={`font-bold ${preview < 0 ? 'text-red-600' : 'text-gray-900'}`}>{preview} {article.unite}</span></div>
            </div>
          )}

          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={mouv.isPending} className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${type === 'in' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}`}>
              {mouv.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Article modal ─────────────────────────────────────────────────────────────

type ArticleTab = 'general' | 'prix' | 'comptabilite'

function ArticleModal({ families, onClose, initial }: { families: StockFamily[]; onClose: () => void; initial?: Article }) {
  const qc  = useQueryClient()
  const { company } = useCompanySettings()
  const zone = (company?.accountingZone ?? 'OHADA') as 'OHADA' | 'FRANCE' | 'IFRS'
  const [tab, setTab] = useState<ArticleTab>('general')
  const [err, setErr] = useState('')

  // Comptes par défaut suggérés selon la zone comptable
  const DEFAULT_COMPTE_ACHAT = zone === 'OHADA' ? '601' : '601'
  const DEFAULT_COMPTE_VENTE = zone === 'OHADA' ? '701' : '701'

  const [form, setForm] = useState({
    reference:        initial?.reference ?? '',
    designation:      initial?.designation ?? '',
    familleId:        initial?.familleId ?? '',
    unite:            initial?.unite ?? 'unité',
    prixAchat:        String(initial?.prixAchat ?? ''),
    prixVente:        String(initial?.prixVente ?? ''),
    tvaAchat:         String(initial ? initial.tvaAchat * 100 : TVA_CM_PCT),
    tvaVente:         String(initial ? initial.tvaVente * 100 : TVA_CM_PCT),
    stockInitial:     '',
    stockMin:         String(initial?.stockMin ?? '0'),
    stockMax:         String(initial?.stockMax ?? ''),
    methodeValuation: (initial?.methodeValuation ?? 'CMUP') as StockMethod,
    description:      initial?.description ?? '',
    codeBarres:       initial?.codeBarres ?? '',
    fournisseur:      initial?.fournisseur ?? '',
    delaiAppro:       String(initial?.delaiAppro ?? ''),
    emplacement:      initial?.emplacement ?? '',
    compteAchat:      initial?.compteAchat ?? '',
    compteVente:      initial?.compteVente ?? '',
  })

  const f = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const create = useMutation({ mutationFn: stocksApi.createArticle, onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks', 'articles'] }); onClose() } })
  const update = useMutation({ mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof stocksApi.updateArticle>[1] }) => stocksApi.updateArticle(id, dto), onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks', 'articles'] }); onClose() } })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    const dto = {
      designation:      form.designation,
      unite:            form.unite,
      prixAchat:        Number(form.prixAchat),
      prixVente:        Number(form.prixVente),
      tvaAchat:         Number(form.tvaAchat) / 100,
      tvaVente:         Number(form.tvaVente) / 100,
      stockMin:         Number(form.stockMin),
      methodeValuation: form.methodeValuation,
      ...(form.reference        ? { reference:        form.reference }              : {}),
      ...(form.familleId        ? { familleId:        form.familleId }              : {}),
      ...(form.stockInitial     ? { stockInitial:     Number(form.stockInitial) }   : {}),
      ...(form.stockMax         ? { stockMax:         Number(form.stockMax) }       : {}),
      ...(form.description      ? { description:      form.description }            : {}),
      ...(form.codeBarres       ? { codeBarres:       form.codeBarres }             : {}),
      ...(form.fournisseur      ? { fournisseur:      form.fournisseur }            : {}),
      ...(form.delaiAppro       ? { delaiAppro:       Number(form.delaiAppro) }     : {}),
      ...(form.emplacement      ? { emplacement:      form.emplacement }            : {}),
      ...(form.compteAchat      ? { compteAchat:      form.compteAchat }            : {}),
      ...(form.compteVente      ? { compteVente:      form.compteVente }            : {}),
    }
    try {
      if (initial) await update.mutateAsync({ id: initial.id, dto })
      else          await create.mutateAsync(dto)
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur')
    }
  }

  const busy = create.isPending || update.isPending
  const TABS: { id: ArticleTab; label: string }[] = [{ id: 'general', label: 'Général' }, { id: 'prix', label: 'Prix & Stock' }, { id: 'comptabilite', label: 'Comptabilité' }]
  const UNITES = ['unité', 'kg', 'litre', 'mètre', 'carton', 'lot', 'rame', 'boîte', 'paquet']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-6 pt-5 pb-0">
          <h2 className="mb-3 text-base font-semibold text-gray-900">{initial ? 'Modifier l\'article' : 'Nouvel article'}</h2>
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={`px-4 py-2 text-sm border-b-2 transition-colors -mb-px ${tab === t.id ? 'border-forest-700 text-forest-800 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={submit}>
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {tab === 'general' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Référence</label>
                    <input className="input font-mono" value={form.reference} onChange={(e) => f('reference', e.target.value)} placeholder="Auto (ART-00001)" />
                  </div>
                  <div>
                    <label className="label">Famille</label>
                    <select className="input" value={form.familleId} onChange={(e) => f('familleId', e.target.value)}>
                      <option value="">— Aucune —</option>
                      {families.map((fam) => <option key={fam.id} value={fam.id}>{fam.nom}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Désignation *</label>
                  <input className="input" required value={form.designation} onChange={(e) => f('designation', e.target.value)} placeholder="Nom de l'article" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Unité de mesure *</label>
                    <select className="input" value={form.unite} onChange={(e) => f('unite', e.target.value)}>
                      {UNITES.map((u) => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Code-barres</label>
                    <input className="input font-mono" value={form.codeBarres} onChange={(e) => f('codeBarres', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Fournisseur</label>
                    <input className="input" value={form.fournisseur} onChange={(e) => f('fournisseur', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Délai appro (jours)</label>
                    <input className="input" type="number" min={0} value={form.delaiAppro} onChange={(e) => f('delaiAppro', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="label">Emplacement</label>
                  <input className="input" value={form.emplacement} onChange={(e) => f('emplacement', e.target.value)} placeholder="Bureau 2 · Étagère B" />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => f('description', e.target.value)} />
                </div>
              </>
            )}

            {tab === 'prix' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Prix d'achat HT *</label>
                    <input className="input" type="number" required min={0} step="any" value={form.prixAchat} onChange={(e) => f('prixAchat', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Prix de vente HT *</label>
                    <input className="input" type="number" required min={0} step="any" value={form.prixVente} onChange={(e) => f('prixVente', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">TVA achat (%)</label>
                    <input className="input" type="number" min={0} max={100} step="0.01" value={form.tvaAchat} onChange={(e) => f('tvaAchat', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">TVA vente (%)</label>
                    <input className="input" type="number" min={0} max={100} step="0.01" value={form.tvaVente} onChange={(e) => f('tvaVente', e.target.value)} />
                  </div>
                </div>
                {!initial && (
                  <div>
                    <label className="label">Stock initial</label>
                    <input className="input" type="number" min={0} step="any" value={form.stockInitial} onChange={(e) => f('stockInitial', e.target.value)} placeholder="0" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Stock minimum (alerte)</label>
                    <input className="input" type="number" min={0} step="any" value={form.stockMin} onChange={(e) => f('stockMin', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Stock maximum</label>
                    <input className="input" type="number" min={0} step="any" value={form.stockMax} onChange={(e) => f('stockMax', e.target.value)} placeholder="Optionnel" />
                  </div>
                </div>
                <div>
                  <label className="label">Méthode de valorisation</label>
                  <div className="mt-1 space-y-2">
                    {(['CMUP', 'FIFO'] as StockMethod[]).map((m) => (
                      <label key={m} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${form.methodeValuation === m ? 'border-forest-300 bg-forest-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <input type="radio" name="methode" value={m} checked={form.methodeValuation === m} onChange={() => f('methodeValuation', m)} className="mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m} — {m === 'CMUP' ? 'Coût Moyen Unitaire Pondéré' : 'Premier Entré Premier Sorti'}</p>
                          <p className="text-xs text-gray-400">{m === 'CMUP' ? 'Recommandé pour la plupart des cas' : 'Recommandé pour les produits périssables'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}

            {tab === 'comptabilite' && (
              <>
                <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[11px] text-blue-800 leading-relaxed">
                  <p className="font-semibold mb-1">💡 Ces comptes seront utilisés automatiquement lors de la comptabilisation</p>
                  <ul className="space-y-0.5 ml-3 list-disc">
                    <li><strong>Compte de charge</strong> (classe 6) : crédité sur les factures d'achat de cet article</li>
                    <li><strong>Compte de produit</strong> (classe 7) : crédité sur les factures de vente de cet article</li>
                    <li>Si vide, les valeurs par défaut <code className="bg-blue-100 px-1 rounded">{DEFAULT_COMPTE_ACHAT}</code> / <code className="bg-blue-100 px-1 rounded">{DEFAULT_COMPTE_VENTE}</code> ({zone}) sont appliquées</li>
                  </ul>
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <span>Compte de charge (achats)</span>
                    <span className="text-[10px] font-normal text-gray-400">classe 6</span>
                  </label>
                  <CompteCombobox
                    value={form.compteAchat}
                    onChange={v => f('compteAchat', v)}
                    onSelect={c => f('compteAchat', c.code)}
                    filterClasses={['6']}
                    placeholder={`${DEFAULT_COMPTE_ACHAT} — Achats marchandises (par défaut)`}
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    Exemples : <code>601</code> Marchandises · <code>602</code> Matières premières · <code>604</code> Études et prestations · <code>605</code> Autres approv. · <code>608</code> Achats d'emballages
                  </p>
                </div>

                <div>
                  <label className="label flex items-center gap-2">
                    <span>Compte de produit (ventes)</span>
                    <span className="text-[10px] font-normal text-gray-400">classe 7</span>
                  </label>
                  <CompteCombobox
                    value={form.compteVente}
                    onChange={v => f('compteVente', v)}
                    onSelect={c => f('compteVente', c.code)}
                    filterClasses={['7']}
                    placeholder={`${DEFAULT_COMPTE_VENTE} — Ventes de marchandises (par défaut)`}
                  />
                  <p className="mt-1 text-[10px] text-gray-400">
                    Exemples : <code>701</code> Marchandises · <code>702</code> Produits finis · <code>704</code> Travaux · <code>706</code> Services vendus · <code>707</code> Produits accessoires
                  </p>
                </div>
              </>
            )}
          </div>

          {err && <p className="px-6 pb-2 text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-60">
              {busy ? 'Enregistrement…' : initial ? 'Modifier l\'article' : 'Créer l\'article'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ArticlesPage() {
  const { fmt } = useCurrency()
  const qc      = useQueryClient()

  const [search, setSearch]   = useState('')
  const [famille, setFamille] = useState('')
  const [modal, setModal]     = useState<'new' | Article | null>(null)
  const [mouvModal, setMouvModal] = useState<{ article: Article; type: 'in' | 'out' } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['stocks', 'articles', { search, famille }],
    queryFn:  () => stocksApi.listArticles({ ...(search ? { search } : {}), ...(famille ? { familleId: famille } : {}), limit: 100 }),
  })
  const { data: families = [] } = useQuery({ queryKey: ['stocks', 'families'], queryFn: stocksApi.listFamilies })

  const del = useMutation({
    mutationFn: stocksApi.deleteArticle,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocks', 'articles'] }),
    onError: (e: unknown) => alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur'),
  })

  const articles = data?.items ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Articles en stock</h2>
          <p className="text-sm text-gray-500">{data?.total ?? 0} article{(data?.total ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors"
        >
          + Nouvel article
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <input type="search" placeholder="Référence ou désignation…" value={search} onChange={(e) => setSearch(e.target.value)} className="input max-w-xs" />
        <select value={famille} onChange={(e) => setFamille(e.target.value)} className="input w-auto">
          <option value="">Toutes familles</option>
          {families.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-3">Réf.</th>
              <th className="px-4 py-3">Désignation</th>
              <th className="px-4 py-3">Famille</th>
              <th className="px-4 py-3">Unité</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">CMUP</th>
              <th className="px-4 py-3 text-right">Valeur</th>
              <th className="px-4 py-3 text-center" title="Comptes comptabilité (charge / produit)">Comptes</th>
              <th className="px-4 py-3 text-center">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">Chargement…</td></tr>
            ) : articles.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-gray-400">Aucun article trouvé</td></tr>
            ) : articles.map((a) => {
              const s = statut(a.stockActuel, a.stockMin)
              const valeur = a.stockActuel * a.valeurCmup
              return (
                <tr key={a.id} className={`hover:bg-gray-50/50 ${a.stockActuel === 0 ? 'bg-red-50/20' : ''}`}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.reference}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{a.designation}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.famille?.nom ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.unite}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${a.stockActuel === 0 ? 'text-red-600' : a.stockActuel <= a.stockMin ? 'text-amber-600' : 'text-gray-900'}`}>
                      {a.stockActuel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmt(a.valeurCmup)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">{fmt(valeur)}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        title={a.compteAchat ? `Compte de charge : ${a.compteAchat}` : 'Compte de charge non défini (défaut : 601)'}
                        className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${a.compteAchat ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-300'}`}
                      >
                        🛒 {a.compteAchat ?? '—'}
                      </span>
                      <span
                        title={a.compteVente ? `Compte de produit : ${a.compteVente}` : 'Compte de produit non défini (défaut : 701)'}
                        className={`font-mono text-[10px] rounded px-1.5 py-0.5 ${a.compteVente ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-300'}`}
                      >
                        💰 {a.compteVente ?? '—'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setMouvModal({ article: a, type: 'in' })}  title="Entrée" className="rounded p-1 text-green-600 hover:bg-green-50">➕</button>
                      <button onClick={() => setMouvModal({ article: a, type: 'out' })} title="Sortie" className="rounded p-1 text-red-500 hover:bg-red-50">➖</button>
                      <button onClick={() => setModal(a)} title="Modifier" className="rounded p-1 text-gray-500 hover:bg-gray-100">✏️</button>
                      {a.stockActuel === 0 && (
                        <button onClick={() => { if (confirm(`Supprimer "${a.designation}" ?`)) del.mutate(a.id) }} title="Supprimer" className="rounded p-1 text-red-400 hover:bg-red-50">🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && <ArticleModal families={families} onClose={() => setModal(null)} {...(modal !== 'new' ? { initial: modal } : {})} />}
      {mouvModal && <MouvRapideModal article={mouvModal.article} type={mouvModal.type} onClose={() => setMouvModal(null)} />}
    </div>
  )
}
