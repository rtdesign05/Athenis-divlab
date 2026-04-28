import { useMemo, useState } from 'react'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type BLStatut } from '@/contexts/GestionContext'

const STATUT_STYLE: Record<BLStatut, string> = {
  'En préparation': 'bg-amber-100 text-amber-700',
  'Expédié':        'bg-blue-100 text-blue-700',
  'Livré':          'bg-green-100 text-green-700',
  'Retourné':       'bg-red-100 text-red-600',
}

const STATUTS: BLStatut[] = ['En préparation', 'Expédié', 'Livré', 'Retourné']

export function BonsLivraisonPage() {
  const { user } = useAuth()
  const { bonsLivraison, updateBLStatut } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [search, setSearch] = useState('')

  const items = useMemo(() => {
    let list = agenceNom ? bonsLivraison.filter(b => b.agence === agenceNom) : bonsLivraison
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(b =>
        b.client.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.commande.toLowerCase().includes(q),
      )
    }
    return list
  }, [bonsLivraison, agenceNom, search])

  const total     = items.length
  const livres    = items.filter(b => b.statut === 'Livré').length
  const enCours   = items.filter(b => b.statut === 'En préparation' || b.statut === 'Expédié').length
  const retournes = items.filter(b => b.statut === 'Retourné').length

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Bons de livraison</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <button className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
          + Nouveau BL
        </button>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total BL</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Livrés</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{livres}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">En cours</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{enCours}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600">Retournés</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{retournes}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Client, N° BL, N° commande…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° BL</th>
                <th className="px-4 py-2.5">Commande</th>
                <th className="px-4 py-2.5">Client</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Date création</th>
                <th className="px-4 py-2.5">Date prévue</th>
                <th className="px-4 py-2.5">Date livraison</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    Aucun bon de livraison trouvé
                  </td>
                </tr>
              ) : items.map(b => (
                <tr key={b.id} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{b.id}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{b.commande}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{b.client}</td>
                  {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{b.agence}</td>}
                  <td className="px-4 py-2.5 text-gray-500">{new Date(b.dateCreation).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(b.datePrevue).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {b.dateLivraison ? new Date(b.dateLivraison).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select
                      value={b.statut}
                      onChange={e => updateBLStatut(b.id, e.target.value as BLStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[b.statut] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
