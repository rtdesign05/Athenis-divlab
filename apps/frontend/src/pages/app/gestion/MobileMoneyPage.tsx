import { useCurrency } from '@/hooks/useCurrency'

const PORTEFEUILLES = [
  {
    id: 'mtn',
    operateur: 'MTN Mobile Money',
    couleur: 'bg-yellow-400',
    numero: '+237 6 70 12 34 56',
    solde: 3_850_000,
    operations: [
      { date: '25 avr.', heure: '15h22', libelle: 'Paiement reçu — Fournisseur Ebobolo',     montant:  1_200_000, type: 'in'  },
      { date: '25 avr.', heure: '11h05', libelle: 'Retrait agence MTN Akwa',                  montant:   -500_000, type: 'out' },
      { date: '24 avr.', heure: '16h48', libelle: 'Paiement reçu — Client Ayissi P.',         montant:    380_000, type: 'in'  },
      { date: '24 avr.', heure: '09h30', libelle: 'Transfert vers compte BICEC',               montant: -1_000_000, type: 'out' },
      { date: '23 avr.', heure: '14h10', libelle: 'Paiement reçu — Marché Sandaga',            montant:    215_000, type: 'in'  },
      { date: '23 avr.', heure: '08h55', libelle: 'Frais de transaction',                      montant:    -12_500, type: 'out' },
    ],
  },
  {
    id: 'orange',
    operateur: 'Orange Money',
    couleur: 'bg-orange-500',
    numero: '+237 6 90 56 78 90',
    solde: 1_620_000,
    operations: [
      { date: '25 avr.', heure: '13h40', libelle: 'Paiement reçu — Grossiste Ndokotti',       montant:    650_000, type: 'in'  },
      { date: '24 avr.', heure: '17h15', libelle: 'Paiement facture eau CAMWATER',             montant:    -95_000, type: 'out' },
      { date: '24 avr.', heure: '10h20', libelle: 'Paiement reçu — Client Mbo',               montant:    420_000, type: 'in'  },
      { date: '23 avr.', heure: '12h00', libelle: 'Retrait Orange Money Bépanda',              montant:   -300_000, type: 'out' },
      { date: '22 avr.', heure: '16h30', libelle: 'Paiement facture ENEO',                    montant:   -180_000, type: 'out' },
    ],
  },
]

export function MobileMoneyPage() {
  const { fmt } = useCurrency()
  const totalSolde = PORTEFEUILLES.reduce((s, p) => s + p.solde, 0)

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Mobile Money</h1>
        <div className="text-right">
          <p className="text-xs text-gray-400">Total portefeuilles</p>
          <p className="text-lg font-bold text-gray-900">{fmt(totalSolde)}</p>
        </div>
      </div>

      {/* Résumé portefeuilles */}
      <div className="shrink-0 grid grid-cols-2 gap-3">
        {PORTEFEUILLES.map((p) => (
          <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-3 flex items-center gap-3">
            <div className={`h-10 w-10 shrink-0 rounded-full ${p.couleur} flex items-center justify-center text-white font-bold text-sm`}>
              {p.operateur.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{p.operateur}</p>
              <p className="text-xs text-gray-400">{p.numero}</p>
            </div>
            <p className="text-base font-bold text-gray-900 shrink-0">{fmt(p.solde)}</p>
          </div>
        ))}
      </div>

      {/* Opérations par portefeuille */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {PORTEFEUILLES.map((p) => (
          <div key={p.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100">
              <div className={`h-7 w-7 shrink-0 rounded-full ${p.couleur} flex items-center justify-center text-white text-xs font-bold`}>
                {p.operateur.charAt(0)}
              </div>
              <p className="text-sm font-semibold text-gray-900">{p.operateur}</p>
              <p className="ml-auto text-sm font-bold text-gray-900">{fmt(p.solde)}</p>
            </div>
            <div className="divide-y divide-gray-50">
              {p.operations.map((op, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 text-center w-16">
                      <p className="text-xs text-gray-500">{op.date}</p>
                      <p className="text-[10px] text-gray-400">{op.heure}</p>
                    </div>
                    <div className={`h-6 w-6 shrink-0 flex items-center justify-center rounded-full text-[11px] ${op.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {op.type === 'in' ? '↓' : '↑'}
                    </div>
                    <span className="text-sm text-gray-700">{op.libelle}</span>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${op.type === 'in' ? 'text-green-600' : 'text-red-500'}`}>
                    {op.type === 'in' ? '+' : ''}{fmt(op.montant)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
