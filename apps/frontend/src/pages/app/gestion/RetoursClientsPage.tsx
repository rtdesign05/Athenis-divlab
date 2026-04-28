import { useMemo, useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useGestion, type RetourStatut } from '@/contexts/GestionContext'

const STATUT_STYLE: Record<RetourStatut, string> = {
  'En cours':  'bg-amber-100 text-amber-700',
  'Validé':    'bg-blue-100 text-blue-700',
  'Remboursé': 'bg-green-100 text-green-700',
  'Refusé':    'bg-red-100 text-red-600',
}

const STATUTS: RetourStatut[] = ['En cours', 'Validé', 'Remboursé', 'Refusé']

export function RetoursClientsPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const { retoursClients, updateRetourStatut } = useGestion()

  const agenceNom = user?.agenceNom ?? null

  const [search, setSearch] = useState('')

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
    return list
  }, [retoursClients, agenceNom, search])

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
        <button className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
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
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Client, N° retour, motif…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
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
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                    Aucun retour trouvé
                  </td>
                </tr>
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
                    <select
                      value={r.statut}
                      onChange={e => updateRetourStatut(r.id, e.target.value as RetourStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[r.statut] ?? 'bg-gray-100 text-gray-600'}`}
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
