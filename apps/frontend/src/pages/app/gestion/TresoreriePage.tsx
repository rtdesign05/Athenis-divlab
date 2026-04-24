import { useCurrency } from '@/hooks/useCurrency'

export function TresoreriePage() {
  const forecast = [
    { label: 'Aujourd\'hui',  balance: 48_250 },
    { label: '+30 jours',     balance: 52_100 },
    { label: '+60 jours',     balance: 44_800 },
    { label: '+90 jours',     balance: 61_400 },
  ]

  const upcoming = [
    { date: '28 avr.', label: 'Loyer bureaux',          amount: -3_200, type: 'out' },
    { date: '30 avr.', label: 'Facture CLI-0042',        amount:  8_400, type: 'in'  },
    { date: '05 mai',  label: 'Charges sociales avril',  amount: -6_750, type: 'out' },
    { date: '10 mai',  label: 'Facture CLI-0039',        amount:  4_200, type: 'in'  },
    { date: '15 mai',  label: 'Abonnements SaaS',        amount:   -890, type: 'out' },
    { date: '20 mai',  label: 'Facture CLI-0044',        amount: 12_000, type: 'in'  },
  ]

  const { fmt } = useCurrency()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Trésorerie</h1>
        <p className="mt-1 text-sm text-gray-500">Solde actuel et prévisionnel sur 90 jours</p>
      </div>

      {/* Solde actuel */}
      <div className="rounded-xl bg-forest-900 p-6 text-white">
        <p className="text-sm font-medium text-forest-300">Solde actuel</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{fmt(48_250)}</p>
        <p className="mt-2 text-sm text-forest-400">Mis à jour aujourd'hui à 10h42</p>
      </div>

      {/* Prévisions */}
      <div className="grid grid-cols-3 gap-4">
        {forecast.slice(1).map((f) => (
          <div key={f.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{f.label}</p>
            <p className={`mt-1 text-lg font-bold ${f.balance >= 48_250 ? 'text-green-600' : 'text-red-500'}`}>
              {fmt(f.balance)}
            </p>
            <p className={`text-xs ${f.balance >= 48_250 ? 'text-green-500' : 'text-red-400'}`}>
              {f.balance >= 48_250 ? '▲' : '▼'} {fmt(Math.abs(f.balance - 48_250))}
            </p>
          </div>
        ))}
      </div>

      {/* Échéances à venir */}
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Calendrier des échéances</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {upcoming.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-4">
                <span className="w-16 text-xs text-gray-400">{item.date}</span>
                <span className="text-sm text-gray-700">{item.label}</span>
              </div>
              <span className={`text-sm font-medium ${item.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                {item.type === 'in' ? '+' : ''}{fmt(item.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
