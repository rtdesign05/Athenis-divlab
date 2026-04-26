import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { stocksApi } from '@/services/stocksApi'
import { useCurrency } from '@/hooks/useCurrency'

export function ValorisationPage() {
  const { fmt } = useCurrency()
  const { data, isLoading } = useQuery({ queryKey: ['stocks', 'valorisation'], queryFn: stocksApi.valorisation })

  const [openCmup, setOpenCmup] = useState(false)
  const [openFifo, setOpenFifo] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Valorisation du stock</h2>
          <p className="text-sm text-gray-500">Méthode CMUP ou FIFO par article</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">🖨️ Exporter PDF</button>
          <button className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-2 text-xs font-medium text-forest-700 hover:bg-forest-100">📝 Écriture comptable</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
              <th className="px-4 py-3">Réf.</th>
              <th className="px-4 py-3">Désignation</th>
              <th className="px-4 py-3 text-right">Qté</th>
              <th className="px-4 py-3 text-right">CMUP / PAMP</th>
              <th className="px-4 py-3 text-right">Valeur stock</th>
              <th className="px-4 py-3 text-center">Méthode</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Chargement…</td></tr>
            ) : !data?.lignes.length ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Aucun article actif</td></tr>
            ) : data.lignes.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{a.reference}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{a.designation}</td>
                <td className="px-4 py-3 text-right text-gray-700">{a.stockActuel} {a.unite}</td>
                <td className="px-4 py-3 text-right text-gray-600">{fmt(a.valeurCmup)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(a.valeurStock)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded-full bg-forest-100 px-2 py-0.5 text-[10px] font-medium text-forest-700">{a.methodeValuation}</span>
                </td>
              </tr>
            ))}
          </tbody>
          {data && (
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-gray-700">TOTAL STOCK</td>
                <td className="px-4 py-3 text-right text-base font-bold text-gray-900">{fmt(data.totalValeur)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <div className="space-y-2">
        {[
          { id: 'cmup', open: openCmup, setOpen: setOpenCmup, title: 'CMUP — Coût Moyen Unitaire Pondéré', content: 'À chaque entrée, le coût moyen est recalculé sur l\'ensemble du stock.\nFormule : CMUP = (Stock × CMUP ancien + Qté × Prix) / (Stock + Qté)' },
          { id: 'fifo', open: openFifo, setOpen: setOpenFifo, title: 'FIFO — Premier Entré Premier Sorti',   content: 'Les articles les plus anciens sont sortis en premier. Chaque lot conserve son prix d\'achat original. Recommandé pour les produits périssables.' },
        ].map((item) => (
          <div key={item.id} className="rounded-lg border border-gray-100">
            <button type="button" onClick={() => item.setOpen((v) => !v)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <span>{item.title}</span>
              <span className="text-gray-400">{item.open ? '▲' : '▼'}</span>
            </button>
            {item.open && (
              <div className="border-t border-gray-100 px-4 py-3 text-xs leading-relaxed text-gray-500 whitespace-pre-line">
                {item.content}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
