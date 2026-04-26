import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stocksApi } from '@/services/stocksApi'
import { useCurrency } from '@/hooks/useCurrency'

export function AlertesPage() {
  const { fmt } = useCurrency()
  const { data: alertes = [], isLoading } = useQuery({ queryKey: ['stocks', 'alertes'], queryFn: stocksApi.alertes })

  const ruptures = alertes.filter((a) => a.isRupture)
  const bas      = alertes.filter((a) => !a.isRupture)

  if (isLoading) return <p className="py-12 text-center text-gray-400">Chargement…</p>

  if (alertes.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Alertes de stock</h2>
        <div className="rounded-xl border border-dashed border-green-200 bg-green-50 py-16 text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-2 font-medium text-green-700">Tous les stocks sont au-dessus du minimum</p>
          <p className="mt-1 text-sm text-green-600">Aucune alerte en cours</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Alertes de stock</h2>
        <p className="text-sm text-gray-500">{alertes.length} article{alertes.length > 1 ? 's' : ''} sous le minimum</p>
      </div>

      {ruptures.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-red-600">🔴 Ruptures de stock ({ruptures.length})</h3>
          <div className="space-y-3">
            {ruptures.map((a) => (
              <AlerteCard key={a.id} alerte={a} fmt={fmt} />
            ))}
          </div>
        </div>
      )}

      {bas.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-amber-600">⚠️ Stock bas ({bas.length})</h3>
          <div className="space-y-3">
            {bas.map((a) => (
              <AlerteCard key={a.id} alerte={a} fmt={fmt} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type Alerte = Awaited<ReturnType<typeof stocksApi.alertes>>[number]

function AlerteCard({ alerte, fmt }: { alerte: Alerte; fmt: (v: number) => string }) {
  const [showEntree, setShowEntree] = useState(false)

  return (
    <div className={`rounded-xl border p-4 ${alerte.isRupture ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{alerte.isRupture ? '🔴' : '⚠️'}</span>
            <span className="font-mono text-xs text-gray-500">{alerte.reference}</span>
            <span className="font-semibold text-gray-900">{alerte.designation}</span>
            {alerte.famille && (
              <span className="rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-gray-500">{alerte.famille.nom}</span>
            )}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
            <div>
              <span className="text-gray-500">Stock actuel</span>
              <p className={`font-bold ${alerte.isRupture ? 'text-red-700' : 'text-amber-700'}`}>
                {alerte.stockActuel} {alerte.unite} {alerte.isRupture ? '— RUPTURE' : ''}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Stock minimum</span>
              <p className="font-medium text-gray-700">{alerte.stockMin} {alerte.unite}</p>
            </div>
            {alerte.fournisseur && (
              <div>
                <span className="text-gray-500">Fournisseur</span>
                <p className="font-medium text-gray-700">{alerte.fournisseur}</p>
              </div>
            )}
            {alerte.delaiAppro != null && (
              <div>
                <span className="text-gray-500">Délai appro</span>
                <p className="font-medium text-gray-700">{alerte.delaiAppro} jour{alerte.delaiAppro > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowEntree((v) => !v)} className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50">
            ➕ Entrée rapide
          </button>
        </div>
      </div>

      {showEntree && (
        <div className="mt-3 border-t border-current/10 pt-3">
          <QuickEntry articleId={alerte.id} unite={alerte.unite} onDone={() => setShowEntree(false)} />
        </div>
      )}
    </div>
  )
}

function QuickEntry({ articleId, unite, onDone }: { articleId: string; unite: string; onDone: () => void }) {
  const qc = useQueryClient()
  const [qty, setQty] = useState('')
  const [pu,  setPu]  = useState('')
  const [err, setErr] = useState('')

  const mouv = useMutation({
    mutationFn: stocksApi.createMouvement,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks'] }); onDone() },
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try { await mouv.mutateAsync({ articleId, type: 'ENTREE_ACHAT', quantite: Number(qty), prixUnitaire: Number(pu) }) }
    catch (e: unknown) { setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur') }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
      <div>
        <label className="label">Quantité ({unite})</label>
        <input className="input w-28" type="number" required min={0.001} step="any" value={qty} onChange={(e) => setQty(e.target.value)} />
      </div>
      <div>
        <label className="label">Prix unitaire HT</label>
        <input className="input w-32" type="number" required min={0} step="any" value={pu} onChange={(e) => setPu(e.target.value)} />
      </div>
      {err && <p className="w-full text-xs text-red-600">{err}</p>}
      <button type="submit" disabled={mouv.isPending} className="rounded-lg bg-green-700 px-4 py-2 text-xs font-medium text-white hover:bg-green-800 disabled:opacity-60">
        {mouv.isPending ? '…' : 'Enregistrer'}
      </button>
      <button type="button" onClick={onDone} className="text-xs text-gray-400 hover:text-gray-600">Annuler</button>
    </form>
  )
}
