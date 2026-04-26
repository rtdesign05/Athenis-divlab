import { useCurrency } from '@/hooks/useCurrency'

const MOCK_COMMANDES = [
  { id: 'ACH-0018', fournisseur: 'Supplies Pro',    date: '2026-04-23', montant:   780_000, statut: 'En cours',   reception: '2026-04-28' },
  { id: 'ACH-0017', fournisseur: 'Tech Matériaux',  date: '2026-04-20', montant: 1_350_000, statut: 'Reçue',      reception: '2026-04-24' },
  { id: 'ACH-0016', fournisseur: 'Distrib Central', date: '2026-04-18', montant:   420_000, statut: 'En attente', reception: '2026-05-05' },
  { id: 'ACH-0015', fournisseur: 'Fournisseur XYZ', date: '2026-04-15', montant: 2_600_000, statut: 'Reçue',      reception: '2026-04-19' },
  { id: 'ACH-0014', fournisseur: 'Import Express',  date: '2026-04-10', montant:   195_000, statut: 'Annulée',    reception: null },
]

const STATUT_STYLE: Record<string, string> = {
  'En cours':   'bg-blue-100 text-blue-700',
  'Reçue':      'bg-green-100 text-green-700',
  'En attente': 'bg-amber-100 text-amber-700',
  'Annulée':    'bg-red-100 text-red-600',
}

export function AchatsPage() {
  const { fmt } = useCurrency()

  const totalAchats = MOCK_COMMANDES.filter(c => c.statut !== 'Annulée').reduce((s, c) => s + c.montant, 0)
  const enCours     = MOCK_COMMANDES.filter(c => c.statut === 'En cours').length
  const recues      = MOCK_COMMANDES.filter(c => c.statut === 'Reçue').length
  const enAttente   = MOCK_COMMANDES.filter(c => c.statut === 'En attente').length

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Commandes fournisseurs</h1>
        <button className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
          + Nouvelle commande
        </button>
      </div>

      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Total achats</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalAchats)}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs text-blue-600">En cours</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">{enCours}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-600">En attente</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{enAttente}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Reçues</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{recues}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-gray-900">Commandes récentes</h2>
          <input
            type="search"
            placeholder="Rechercher…"
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° commande</th>
                <th className="px-4 py-2.5">Fournisseur</th>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5 text-right">Montant</th>
                <th className="px-4 py-2.5">Réception prévue</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_COMMANDES.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{c.id}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{c.fournisseur}</td>
                  <td className="px-4 py-2.5 text-gray-500">{new Date(c.date).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(c.montant)}</td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {c.reception ? new Date(c.reception).toLocaleDateString('fr-FR') : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_STYLE[c.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.statut}
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
