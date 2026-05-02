const VIREMENTS = [
  { mois: 'Mai 2026', nbEmployes: 8, montantBrut: 7380000, montantNet: 5918000, dateVirement: '31/05/2026', statut: 'Planifié', reference: '' },
  { mois: 'Avril 2026', nbEmployes: 8, montantBrut: 7380000, montantNet: 5918000, dateVirement: '25/04/2026', statut: 'Effectué', reference: 'VIR-2604-001' },
  { mois: 'Mars 2026', nbEmployes: 8, montantBrut: 7380000, montantNet: 5918000, dateVirement: '25/03/2026', statut: 'Effectué', reference: 'VIR-2603-001' },
  { mois: 'Février 2026', nbEmployes: 7, montantBrut: 7080000, montantNet: 5672000, dateVirement: '25/02/2026', statut: 'Effectué', reference: 'VIR-2602-001' },
  { mois: 'Janvier 2026', nbEmployes: 7, montantBrut: 7080000, montantNet: 5672000, dateVirement: '25/01/2026', statut: 'Effectué', reference: 'VIR-2601-001' },
  { mois: 'Décembre 2025', nbEmployes: 6, montantBrut: 6580000, montantNet: 5280000, dateVirement: '20/12/2025', statut: 'Effectué', reference: 'VIR-2512-001' },
]

const fmtShort = (n: number) =>
  new Intl.NumberFormat('fr-CM').format(n)

export function VirementsPage() {
  const effectues2026 = VIREMENTS.filter(v => v.statut === 'Effectué' && v.mois.endsWith('2026'))
  const totalYTD = effectues2026.reduce((sum, v) => sum + v.montantNet, 0)
  const nbVirements2026 = effectues2026.length
  const prochain = VIREMENTS.find(v => v.statut === 'Planifié')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Virements de salaires</h1>
        <p className="text-sm text-gray-500 mt-1">Historique des paiements de paie</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total versé YTD 2026</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmtShort(totalYTD)}</p>
              <p className="text-xs text-gray-400 mt-0.5">FCFA (net)</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Virements effectués 2026</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{nbVirements2026}</p>
              <p className="text-xs text-gray-400 mt-0.5">sur {new Date().getMonth() + 1} mois</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Prochain virement</p>
              {prochain ? (
                <>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{fmtShort(prochain.montantNet)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">FCFA — prévu le {prochain.dateVirement}</p>
                </>
              ) : (
                <p className="text-lg font-semibold text-gray-400 mt-1">Aucun planifié</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Historique des virements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left font-medium">Mois</th>
                <th className="px-4 py-2 text-right font-medium">Employés</th>
                <th className="px-4 py-2 text-right font-medium">Brut</th>
                <th className="px-4 py-2 text-right font-medium">Net versé</th>
                <th className="px-4 py-2 text-center font-medium">Date virement</th>
                <th className="px-4 py-2 text-left font-medium">Référence</th>
                <th className="px-4 py-2 text-center font-medium">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {VIREMENTS.map((v, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{v.mois}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{v.nbEmployes}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{fmtShort(v.montantBrut)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmtShort(v.montantNet)}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{v.dateVirement}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {v.reference || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {v.statut === 'Effectué' ? (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                        Effectué
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700">
                        Planifié
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 font-semibold text-gray-700" colSpan={2}>Total 2026</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-700">
                  {fmtShort(VIREMENTS.filter(v => v.mois.endsWith('2026')).reduce((s, v) => s + v.montantBrut, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-gray-800">
                  {fmtShort(VIREMENTS.filter(v => v.mois.endsWith('2026')).reduce((s, v) => s + v.montantNet, 0))}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">* Montants en FCFA. Net = Brut - charges salariales (CNPS 4,2% + IRPP estimé).</p>
    </div>
  )
}
