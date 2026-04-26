import { useCurrency } from '@/hooks/useCurrency'

const PREVISIONS = [
  { periode: 'Aujourd\'hui',  solde: 48_250_000, variation:        0 },
  { periode: '+7 jours',      solde: 44_900_000, variation: -3_350_000 },
  { periode: '+30 jours',     solde: 52_100_000, variation:  3_850_000 },
  { periode: '+60 jours',     solde: 44_800_000, variation: -3_450_000 },
  { periode: '+90 jours',     solde: 61_400_000, variation: 13_150_000 },
]

const ECHEANCES = [
  { date: '28 avr.', libelle: 'Loyer bureaux Douala',           montant: -3_200_000, cat: 'Charges fixes' },
  { date: '30 avr.', libelle: 'Encaissement FAC-0042 (ACME)',   montant:  8_400_000, cat: 'Clients' },
  { date: '05 mai',  libelle: 'Charges sociales CNPS avril',    montant: -6_750_000, cat: 'RH' },
  { date: '10 mai',  libelle: 'Encaissement FAC-0039 (TechX)',  montant:  4_200_000, cat: 'Clients' },
  { date: '15 mai',  libelle: 'Abonnements SaaS & infra',       montant:   -890_000, cat: 'Opex' },
  { date: '20 mai',  libelle: 'Encaissement FAC-0044 (Delta)',  montant: 12_000_000, cat: 'Clients' },
  { date: '25 mai',  libelle: 'Salaires mai 2026',              montant: -9_400_000, cat: 'RH' },
  { date: '31 mai',  libelle: 'Patente 2026 (solde)',           montant: -1_200_000, cat: 'Fiscal' },
]

const CAT_COLOR: Record<string, string> = {
  'Clients':       'bg-green-100 text-green-700',
  'Charges fixes': 'bg-gray-100 text-gray-600',
  'RH':            'bg-purple-100 text-purple-700',
  'Fiscal':        'bg-amber-100 text-amber-700',
  'Opex':          'bg-blue-100 text-blue-700',
}

export function PrevisionsPage() {
  const { fmt } = useCurrency()
  const base = PREVISIONS[0]!.solde

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0">
        <h1 className="text-base font-semibold text-gray-900">Prévisions de trésorerie</h1>
        <p className="text-xs text-gray-400 mt-0.5">Projections sur 90 jours — mis à jour automatiquement</p>
      </div>

      {/* Solde prévisionnel */}
      <div className="shrink-0 grid grid-cols-5 gap-2">
        {PREVISIONS.map((p) => {
          const isPositif = p.solde >= base
          return (
            <div key={p.periode} className={`rounded-xl border p-3 ${p.periode === "Aujourd'hui" ? 'bg-green-900 border-green-800 text-white' : 'border-gray-200 bg-white'}`}>
              <p className={`text-[11px] font-medium ${p.periode === "Aujourd'hui" ? 'text-green-300' : 'text-gray-500'}`}>{p.periode}</p>
              <p className={`mt-1 text-base font-bold leading-tight ${p.periode === "Aujourd'hui" ? 'text-white' : isPositif ? 'text-green-700' : 'text-red-600'}`}>
                {fmt(p.solde)}
              </p>
              {p.variation !== 0 && (
                <p className={`mt-0.5 text-[11px] font-medium ${p.variation >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                  {p.variation >= 0 ? '▲' : '▼'} {fmt(Math.abs(p.variation))}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Calendrier des échéances */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Calendrier des échéances à venir</h2>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="text-green-600 font-medium">
              Entrées : {fmt(ECHEANCES.filter(e => e.montant > 0).reduce((s, e) => s + e.montant, 0))}
            </span>
            <span className="text-red-500 font-medium">
              Sorties : {fmt(Math.abs(ECHEANCES.filter(e => e.montant < 0).reduce((s, e) => s + e.montant, 0)))}
            </span>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
          {ECHEANCES.map((e, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-xs font-medium text-gray-500">{e.date}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${CAT_COLOR[e.cat] ?? 'bg-gray-100 text-gray-600'}`}>{e.cat}</span>
                <span className="text-sm text-gray-700">{e.libelle}</span>
              </div>
              <span className={`shrink-0 text-sm font-semibold ${e.montant >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {e.montant >= 0 ? '+' : ''}{fmt(e.montant)}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
