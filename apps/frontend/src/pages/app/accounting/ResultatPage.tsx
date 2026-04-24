import { useCurrency } from '@/hooks/useCurrency'

export function ResultatPage() {
  const { fmt } = useCurrency()

  const produits = [
    { label: 'Ventes de marchandises',     montant: 142_800 },
    { label: 'Production vendue services', montant:  98_400 },
    { label: 'Autres produits d\'exploit.',montant:  43_300 },
  ]
  const charges = [
    { label: 'Achats et charges externes', montant:  84_200 },
    { label: 'Charges de personnel',       montant:  68_400 },
    { label: 'Amortissements',             montant:  12_600 },
    { label: 'Autres charges',             montant:  33_000 },
  ]

  const totalProd   = produits.reduce((s, r) => s + r.montant, 0)
  const totalCharge = charges.reduce((s, r)  => s + r.montant, 0)
  const rex         = totalProd - totalCharge
  const is          = rex > 0 ? Math.round(rex * 0.25) : 0
  const net         = rex - is

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Compte de résultat</h1>
        <p className="mt-1 text-sm text-gray-500">Exercice 2025 — 12 mois</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-green-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-green-800">PRODUITS</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {produits.map((r) => (
              <div key={r.label} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-medium text-gray-900">{fmt(r.montant)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 bg-green-50 flex justify-between px-5 py-3">
            <span className="text-sm font-semibold text-green-800">Total Produits</span>
            <span className="text-sm font-bold text-green-800">{fmt(totalProd)}</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 bg-red-50 px-5 py-3">
            <h2 className="text-sm font-semibold text-red-800">CHARGES</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {charges.map((r) => (
              <div key={r.label} className="flex justify-between px-5 py-3 text-sm">
                <span className="text-gray-600">{r.label}</span>
                <span className="font-medium text-gray-900">{fmt(r.montant)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-200 bg-red-50 flex justify-between px-5 py-3">
            <span className="text-sm font-semibold text-red-800">Total Charges</span>
            <span className="text-sm font-bold text-red-800">{fmt(totalCharge)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Résultat d'exploitation (REX)</span>
          <span className={`font-semibold ${rex >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(rex)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Impôt sur les sociétés (IS 25%)</span>
          <span className="font-medium text-gray-900">−{fmt(is)}</span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between">
          <span className="font-semibold text-gray-900">Résultat net</span>
          <span className={`text-lg font-bold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(net)}</span>
        </div>
      </div>
    </div>
  )
}
