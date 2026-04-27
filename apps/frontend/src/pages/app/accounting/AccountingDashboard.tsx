import { useCurrency } from '@/hooks/useCurrency'

export function AccountingDashboard() {
  const { fmt, currencySymbol } = useCurrency()

  const kpis = [
    { label: 'Chiffre d\'affaires',  value: 284_500, delta: '+12%', pos: true },
    { label: 'Charges d\'exploit.',  value: 198_200, delta: '+8%',  pos: false },
    { label: 'Résultat d\'exploit.', value:  86_300, delta: '+22%', pos: true },
    { label: 'Résultat net',         value:  64_700, delta: '+18%', pos: true },
  ]

  const months  = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  const produits = [22, 24, 21, 26, 28, 25, 20, 18, 27, 29, 24, 23]
  const charges  = [16, 17, 15, 18, 19, 17, 14, 13, 18, 20, 17, 16]
  const maxVal   = Math.max(...produits, ...charges)

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Comptabilité</h1>
        <p className="text-xs text-gray-500">Exercice 2026 — résultats consolidés</p>
      </div>

      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">{k.label}</p>
            <p className="mt-1 text-xl font-bold text-gray-900">{fmt(k.value)}</p>
            <p className={`mt-0.5 text-xs font-medium ${k.pos ? 'text-green-600' : 'text-red-500'}`}>
              {k.delta} vs N-1
            </p>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white p-4 flex flex-col">
        <h2 className="shrink-0 mb-3 text-sm font-semibold text-gray-900">Évolution mensuelle (k{currencySymbol})</h2>
        <div className="flex-1 min-h-0 flex items-end gap-1">
          {months.map((m, i) => (
            <div key={m} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
              <div className="w-full rounded-t bg-forest-200" style={{ height: `${((produits[i] ?? 0) / maxVal) * 100}%` }} />
              <div className="w-full rounded-t bg-red-200"    style={{ height: `${((charges[i]  ?? 0) / maxVal) * 100}%` }} />
              <span className="text-[9px] text-gray-400 mt-0.5">{m}</span>
            </div>
          ))}
        </div>
        <div className="shrink-0 mt-3 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-forest-200" />Produits</span>
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-200" />Charges</span>
        </div>
      </div>

    </div>
  )
}
