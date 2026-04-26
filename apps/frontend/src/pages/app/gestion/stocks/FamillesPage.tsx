import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { stocksApi, type StockFamily } from '@/services/stocksApi'
import { useCurrency } from '@/hooks/useCurrency'

function FamilleModal({ onClose, initial }: { onClose: () => void; initial?: StockFamily }) {
  const qc = useQueryClient()
  const [code, setCode]     = useState(initial?.code ?? '')
  const [nom, setNom]       = useState(initial?.nom ?? '')
  const [desc, setDesc]     = useState(initial?.description ?? '')
  const [err, setErr]       = useState('')

  const create = useMutation({ mutationFn: stocksApi.createFamily, onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks', 'families'] }); onClose() } })
  const update = useMutation({ mutationFn: ({ id, dto }: { id: string; dto: Parameters<typeof stocksApi.updateFamily>[1] }) => stocksApi.updateFamily(id, dto), onSuccess: () => { qc.invalidateQueries({ queryKey: ['stocks', 'families'] }); onClose() } })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    try {
      if (initial) await update.mutateAsync({ id: initial.id, dto: { code: code.toUpperCase(), nom, description: desc || undefined } })
      else          await create.mutateAsync({ code: code.toUpperCase(), nom, description: desc || undefined })
    } catch (e: unknown) {
      setErr((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur')
    }
  }

  const busy = create.isPending || update.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-900">{initial ? 'Modifier la famille' : 'Nouvelle famille'}</h2>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code *</label>
              <input className="input uppercase" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="PAP" />
              <p className="mt-0.5 text-[10px] text-gray-400">2–6 caractères</p>
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" required value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Papeterie" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">Annuler</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 disabled:opacity-60">
              {busy ? 'Enregistrement…' : initial ? 'Modifier' : 'Créer la famille'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function FamillesPage() {
  const { fmt }    = useCurrency()
  const qc         = useQueryClient()
  const [modal, setModal] = useState<'new' | StockFamily | null>(null)

  const { data: families = [], isLoading } = useQuery({ queryKey: ['stocks', 'families'], queryFn: stocksApi.listFamilies })
  const del = useMutation({
    mutationFn: stocksApi.deleteFamily,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stocks', 'families'] }),
    onError: (e: unknown) => alert((e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Erreur'),
  })

  const ICONS: Record<string, string> = { PAP: '📄', INFO: '💻', NET: '🔌', DIV: '📦' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Familles d'articles</h2>
          <p className="text-sm text-gray-500">{families.length} famille{families.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal('new')} className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
          + Nouvelle famille
        </button>
      </div>

      {isLoading ? (
        <p className="py-12 text-center text-gray-400">Chargement…</p>
      ) : families.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm text-gray-400">Aucune famille créée</p>
          <button onClick={() => setModal('new')} className="mt-3 text-sm font-medium text-forest-700 hover:underline">+ Créer la première famille</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {families.map((f) => (
            <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{ICONS[f.code] ?? '📦'}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{f.nom}</p>
                    <p className="text-xs text-gray-400">Code : {f.code}</p>
                  </div>
                </div>
              </div>
              {f.description && <p className="mt-2 text-xs text-gray-500">{f.description}</p>}
              <p className="mt-3 text-sm text-gray-600">
                <span className="font-medium">{f.articlesCount}</span> article{f.articlesCount !== 1 ? 's' : ''}{' '}
                · <span className="font-medium">{fmt(f.valeurStock)}</span>
              </p>
              <div className="mt-3 flex gap-2 border-t border-gray-100 pt-3">
                <button onClick={() => setModal(f)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50">✏️ Modifier</button>
                <button onClick={() => { if (confirm(`Supprimer la famille "${f.nom}" ?`)) del.mutate(f.id) }} className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">🗑 Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <FamilleModal
          onClose={() => setModal(null)}
          initial={modal === 'new' ? undefined : modal}
        />
      )}
    </div>
  )
}
