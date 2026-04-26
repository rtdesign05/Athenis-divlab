import { useQuery } from '@tanstack/react-query'
import { stocksApi } from '@/services/stocksApi'
import { useCurrency } from '@/hooks/useCurrency'

export function StockDashboard() {
  const { fmt }      = useCurrency()
  const { data, isLoading } = useQuery({
    queryKey: ['stocks', 'tableau-de-bord'],
    queryFn:  () => stocksApi.tableauDeBord(),
  })

  const kpis = [
    { label: 'Articles actifs',    value: isLoading ? '…' : String(data?.articlesActifs ?? 0),  sub: 'références en stock', accent: false },
    { label: 'Valeur du stock',    value: isLoading ? '…' : fmt(data?.valeurTotale ?? 0),        sub: 'CMUP / FIFO',         accent: false },
    { label: 'Alertes de stock',   value: isLoading ? '…' : String(data?.alertesCount ?? 0),     sub: 'sous le minimum',     accent: (data?.alertesCount ?? 0) > 0 },
    { label: 'Mouvements / mois',  value: isLoading ? '…' : String(data?.mouvementsMois ?? 0),   sub: 'opérations ce mois',  accent: false },
  ]

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Tableau de bord — Stocks</h2>
        <p className="text-xs text-gray-500">Vue d'ensemble de l'inventaire</p>
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-xl border p-3 ${k.accent ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
            <p className={`text-xs font-medium ${k.accent ? 'text-amber-600' : 'text-gray-500'}`}>{k.label}</p>
            <p className={`mt-1 text-xl font-bold ${k.accent ? 'text-amber-700' : 'text-gray-900'}`}>{k.value}</p>
            <p className={`mt-0.5 text-xs ${k.accent ? 'text-amber-500' : 'text-gray-400'}`}>{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-gray-700">Top 5 articles par valeur de stock</h3>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2">Référence</th>
                <th className="px-4 py-2">Désignation</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">CMUP</th>
                <th className="px-4 py-2 text-right">Valeur</th>
                <th className="px-4 py-2 text-center">Méthode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Chargement…</td></tr>
              ) : !data?.top5Articles.length ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Aucun article</td></tr>
              ) : data.top5Articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{a.reference}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{a.designation}</td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{a.stockActuel} {a.unite}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmt(a.valeurCmup)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(a.valeurStock)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-medium text-forest-700">
                      {a.methodeValuation}
                    </span>
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
