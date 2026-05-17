/**
 * JournalExtournesPage — Extournes des régularisations N-1
 *
 * Réglementation SYSCOHADA / PCG :
 * Toutes les régularisations d'inventaire (CCA, PCA, FNP, FAE) passées
 * à la clôture de l'exercice N-1 doivent être contre-passées (extournées)
 * au 1er jour de l'exercice N, afin de restituer la charge ou le produit
 * à son exercice d'origine.
 *
 * Cette page liste les régularisations de N-1 et indique pour chacune :
 *   - si son extourne a déjà été générée en N (statut "Extournée le …")
 *   - sinon, propose un bouton « Extourner » pour la créer dans N.
 * Une action en lot permet d'extourner toutes les régularisations en attente.
 */
import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import type { ExtourneRegularization, RegularizationType } from '@/services/accountingApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

interface TypeMeta {
  type:        RegularizationType
  label:       string
  bg:          string
  text:        string
}
const TYPES: TypeMeta[] = [
  { type: 'CCA', label: 'Charges Constatées d\'Avance',   bg: 'bg-blue-100',    text: 'text-blue-700'    },
  { type: 'PCA', label: 'Produits Constatés d\'Avance',   bg: 'bg-violet-100',  text: 'text-violet-700'  },
  { type: 'FNP', label: 'Factures Non Parvenues',         bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { type: 'FAE', label: 'Factures à Établir',             bg: 'bg-green-100',   text: 'text-green-700'   },
  { type: 'CAP', label: 'Charges à Payer',                bg: 'bg-orange-100',  text: 'text-orange-700'  },
  { type: 'PAR', label: 'Produits à Recevoir',            bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { type: 'CD',  label: 'Créances Douteuses (provision)', bg: 'bg-rose-100',    text: 'text-rose-700'    },
]
function typeMeta(t: RegularizationType | 'XXX'): TypeMeta | undefined {
  return TYPES.find(x => x.type === t)
}

// ── Page principale ───────────────────────────────────────────────────────────

export function JournalExtournesPage() {
  const { fmt: fmtAmount } = useCurrency()
  const qc = useQueryClient()

  const fyGlobal = useSelectedFiscalYearData()
  const { data: years = [] } = useFiscalYears()

  // Override possible (consultation d'un autre exercice)
  const [overrideFyId, setOverrideFyId] = useState<string | null>(null)
  const fyId = overrideFyId ?? fyGlobal?.id ?? null

  const [filter, setFilter]   = useState<RegularizationType | 'ALL' | 'PENDING' | 'DONE'>('ALL')
  const [toast,  setToast]    = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['extournes', fyId],
    queryFn:  () => accountingApi.listExtournes(fyId!),
    enabled:  !!fyId,
    staleTime: 15_000,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createOne = useMutation({
    mutationFn: (regPieceId: string) =>
      accountingApi.createExtourne({ fiscalYearId: fyId!, regPieceId }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['extournes',       fyId] })
      qc.invalidateQueries({ queryKey: ['journal',         fyId] })
      qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
      setToast(`✓ Extourne ${res.reference} créée`)
      setTimeout(() => setToast(null), 4000)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      setToast(`⚠️ ${err.response?.data?.error ?? 'Erreur lors de l\'extourne'}`)
      setTimeout(() => setToast(null), 6000)
    },
  })

  const createAll = useMutation({
    mutationFn: () => accountingApi.createAllPendingExtournes(fyId!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['extournes',       fyId] })
      qc.invalidateQueries({ queryKey: ['journal',         fyId] })
      qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
      const errSuffix = res.errors.length > 0 ? ` (${res.errors.length} erreur(s))` : ''
      setToast(`✓ ${res.created}/${res.processed} extourne(s) créées${errSuffix}`)
      setTimeout(() => setToast(null), 5000)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      setToast(`⚠️ ${err.response?.data?.error ?? 'Erreur du lot d\'extournes'}`)
      setTimeout(() => setToast(null), 6000)
    },
  })

  const deleteOne = useMutation({
    mutationFn: (extPieceId: string) => accountingApi.deleteExtourne(extPieceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['extournes',       fyId] })
      qc.invalidateQueries({ queryKey: ['journal',         fyId] })
      qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
      setToast(`✓ Extourne supprimée`)
      setTimeout(() => setToast(null), 4000)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      setToast(`⚠️ ${err.response?.data?.error ?? 'Erreur de suppression'}`)
      setTimeout(() => setToast(null), 6000)
    },
  })

  // ── Données filtrées ──────────────────────────────────────────────────────

  const regs    = data?.regularizations ?? []
  const pending = regs.filter(r => !r.extourne)
  const done    = regs.filter(r =>  r.extourne)

  const displayed: ExtourneRegularization[] = useMemo(() => {
    if (filter === 'ALL')     return regs
    if (filter === 'PENDING') return pending
    if (filter === 'DONE')    return done
    return regs.filter(r => r.type === filter)
  }, [regs, filter, pending, done])

  // Stats par type (uniquement pour les non extournées)
  const statsByType = useMemo(() => {
    const m: Record<RegularizationType, { pending: number; done: number; montant: number }> = {
      CCA: { pending: 0, done: 0, montant: 0 },
      PCA: { pending: 0, done: 0, montant: 0 },
      FNP: { pending: 0, done: 0, montant: 0 },
      FAE: { pending: 0, done: 0, montant: 0 },
      CAP: { pending: 0, done: 0, montant: 0 },
      PAR: { pending: 0, done: 0, montant: 0 },
      CD:  { pending: 0, done: 0, montant: 0 },
    }
    for (const r of regs) {
      if (r.type !== 'XXX' && m[r.type]) {
        if (r.extourne) m[r.type].done++
        else            m[r.type].pending++
        m[r.type].montant += r.montant
      }
    }
    return m
  }, [regs])

  const isReadOnly = data?.currentFyStatus === 'CLOSED'

  // ── Render ────────────────────────────────────────────────────────────────

  if (!fyId) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-sm text-gray-400 gap-2">
        <p>Sélectionnez un exercice comptable dans le menu en haut.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Extournes des régularisations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Contre-passation au 1er jour de l'exercice {data?.currentYear ?? ''} des écritures de régularisation
            passées à la clôture de l'exercice {data?.previousYear ?? ''}
          </p>
        </div>

        {years.length > 1 && (
          <select
            value={fyId ?? ''}
            onChange={e => setOverrideFyId(e.target.value || null)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
          >
            {years.map(y => (
              <option key={y.id} value={y.id}>Exercice {y.year} — {y.status}</option>
            ))}
          </select>
        )}
      </div>

      {/* Bandeau réglementaire */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>📚 Rappel réglementaire (SYSCOHADA / PCG)</strong>
        <p className="mt-1 text-xs">
          Toutes les régularisations d'inventaire (CCA, PCA, FNP, FAE) passées à la clôture de l'exercice précédent
          doivent être contre-passées au 1er jour de l'exercice en cours. Cette opération restitue la charge ou
          le produit à son exercice d'origine.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between ${
          toast.startsWith('✓')
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          <span>{toast}</span>
          <button onClick={() => setToast(null)} className="text-lg leading-none opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Read-only banner */}
      {isReadOnly && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800">
          🔒 Exercice {data?.currentYear} clôturé — consultation seule
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
        </div>
      ) : !data?.previousFyExists ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
          <p className="text-4xl">📅</p>
          <p className="text-sm font-medium">L'exercice {data?.previousYear ?? '?'} n'existe pas</p>
          <p className="text-xs">Aucune régularisation à extourner.</p>
        </div>
      ) : (
        <>
          {/* Carte récap par type */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {TYPES.map(t => {
              const s = statsByType[t.type]
              const total = s.pending + s.done
              const active = filter === t.type
              return (
                <button
                  key={t.type}
                  onClick={() => setFilter(active ? 'ALL' : t.type)}
                  className={`text-left rounded-xl border-2 p-3 transition-all ${
                    active ? `${t.bg} border-transparent ring-2` : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${active ? t.text : 'text-gray-700'}`}>{t.type}</span>
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-1.5">{total}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight line-clamp-2">{t.label}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                    {s.pending > 0 ? (
                      <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 font-semibold">
                        {s.pending} à extourner
                      </span>
                    ) : total > 0 ? (
                      <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 font-semibold">
                        ✓ toutes extournées
                      </span>
                    ) : (
                      <span className="text-gray-400 text-[10px]">aucune</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Barre d'action */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setFilter('ALL')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                  filter === 'ALL' ? 'bg-[#1b4332] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tout ({regs.length})
              </button>
              <button
                onClick={() => setFilter('PENDING')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                  filter === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
              >
                À extourner ({pending.length})
              </button>
              <button
                onClick={() => setFilter('DONE')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                  filter === 'DONE' ? 'bg-green-700 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                Extournées ({done.length})
              </button>
            </div>

            <div className="ml-auto">
              {!isReadOnly && pending.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm(`Extourner les ${pending.length} régularisation(s) restantes ?\n\nChaque écriture sera contre-passée au 1er jour de l'exercice ${data?.currentYear}.`)) {
                      createAll.mutate()
                    }
                  }}
                  disabled={createAll.isPending}
                  className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] transition-colors disabled:opacity-50"
                >
                  {createAll.isPending ? 'Traitement…' : `↩ Tout extourner (${pending.length})`}
                </button>
              )}
            </div>
          </div>

          {/* Tableau */}
          {displayed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <p className="text-4xl">{filter === 'PENDING' ? '✅' : '📋'}</p>
              <p className="text-sm font-medium">
                {regs.length === 0
                  ? `Aucune régularisation passée dans l'exercice ${data?.previousYear}`
                  : filter === 'PENDING'
                    ? 'Toutes les régularisations ont été extournées'
                    : filter === 'DONE'
                      ? 'Aucune extourne créée pour le moment'
                      : `Aucune ${filter} dans l'exercice ${data?.previousYear}`}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                    <th className="px-4 py-2.5 w-16">Type</th>
                    <th className="px-3 py-2.5">Date N-1</th>
                    <th className="px-3 py-2.5">Référence</th>
                    <th className="px-3 py-2.5">Libellé</th>
                    <th className="px-3 py-2.5">Comptes</th>
                    <th className="px-3 py-2.5 text-right">Montant</th>
                    <th className="px-3 py-2.5">Statut</th>
                    {!isReadOnly && <th className="px-3 py-2.5 w-28 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayed.map(r => {
                    const m = typeMeta(r.type)
                    const isExt = !!r.extourne
                    return (
                      <tr key={r.pieceId} className={`hover:bg-gray-50/60 ${isExt ? 'bg-green-50/30' : ''}`}>
                        <td className="px-4 py-2.5">
                          {m ? (
                            <span className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold ${m.bg} ${m.text}`}>
                              {r.type}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">{r.type}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-600">{r.reference}</td>
                        <td className="px-3 py-2.5 text-sm text-gray-700 max-w-xs truncate" title={r.libelle}>{r.libelle}</td>
                        <td className="px-3 py-2.5 text-xs">
                          <div className="flex flex-col gap-0.5">
                            {r.lignes.map(l => (
                              <div key={l.id} className="font-mono">
                                <span className="text-[#1b4332]">{l.compte}</span>
                                <span className="text-gray-400 ml-1.5">
                                  {l.debit > 0 ? `D ${fmtAmount(l.debit)}` : `C ${fmtAmount(l.credit)}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-sm font-semibold tabular-nums">
                          {fmtAmount(r.montant)}
                        </td>
                        <td className="px-3 py-2.5">
                          {isExt ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[11px] font-semibold w-fit">
                                ✓ Extournée
                              </span>
                              <span className="text-[10px] text-gray-500 font-mono">
                                {fmtDate(r.extourne?.date ?? null)}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">
                              ⏳ À extourner
                            </span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td className="px-3 py-2.5 text-center">
                            {isExt ? (
                              <button
                                onClick={() => {
                                  if (r.extourne?.pieceId && confirm(`Supprimer l'extourne de ${r.reference} ?`)) {
                                    deleteOne.mutate(r.extourne.pieceId)
                                  }
                                }}
                                disabled={deleteOne.isPending}
                                title="Supprimer l'extourne"
                                className="text-xs rounded-md border border-red-200 text-red-600 px-2 py-1 hover:bg-red-50 transition-colors"
                              >
                                ✕ Annuler
                              </button>
                            ) : (
                              <button
                                onClick={() => createOne.mutate(r.pieceId)}
                                disabled={createOne.isPending}
                                title="Créer l'extourne au 1er jour de l'exercice"
                                className="text-xs rounded-md border border-purple-200 bg-purple-50 text-purple-700 px-2 py-1 hover:bg-purple-100 transition-colors font-medium"
                              >
                                ↩ Extourner
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            💡 L'extourne inverse les débits/crédits de la pièce d'origine et est datée au 1er jour de l'exercice en cours.
            La référence porte le suffixe <code className="font-mono bg-gray-100 px-1 rounded">-EXT</code>.
          </p>
        </>
      )}
    </div>
  )
}
