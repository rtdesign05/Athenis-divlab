import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { useTresorerie } from '@/contexts/TresorerieContext'

export function TresoreriePage() {
  const { fmt }                    = useCurrency()
  const { user }                   = useAuth()
  const { totalSolde, balances }   = useTresorerie()

  // Fix #3 : filtrer la trésorerie par agence pour les utilisateurs restreints
  const agenceNom = user?.agenceNom ?? null

  const visibleBalances = useMemo(
    () => agenceNom ? balances.filter(b => b.agence === agenceNom) : balances,
    [balances, agenceNom],
  )

  const soldeAgence = useMemo(
    () => visibleBalances.reduce((s, b) => s + b.solde, 0),
    [visibleBalances],
  )

  const solde = agenceNom ? soldeAgence : totalSolde

  // Prévisions et échéances à venir — vides par défaut, à venir avec les vraies
  // données de l'API de prévisionnel et des factures à échéance.
  const forecast: { label: string; balance: number }[] = []
  const upcoming: { date: string; label: string; amount: number; type: string }[] = []

  const TYPE_ICON: Record<string, string> = {
    banque:         '🏦',
    'mobile-money': '📱',
    caisse:         '💵',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Trésorerie</h1>
          <p className="mt-1 text-sm text-gray-500">Solde actuel et prévisionnel sur 90 jours</p>
        </div>
        {agenceNom && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            🏢 {agenceNom}
          </span>
        )}
      </div>

      {/* Bandeau vue restreinte */}
      {agenceNom && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-center gap-3">
          <span className="text-sm">🔒</span>
          <p className="text-xs text-amber-800">
            Vue restreinte — seuls les comptes de l'agence <strong>{agenceNom}</strong> sont affichés.
            {' '}
            <Link to="/app/settings/utilisateurs" className="underline hover:no-underline">
              Gérer les accès →
            </Link>
          </p>
        </div>
      )}

      {/* Solde actuel */}
      <div className="rounded-xl bg-forest-900 p-6 text-white">
        <p className="text-sm font-medium text-forest-300">
          {agenceNom ? `Solde — ${agenceNom}` : 'Solde consolidé (toutes agences)'}
        </p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{fmt(solde)}</p>
        <p className="mt-2 text-sm text-forest-400">Mis à jour aujourd'hui à 10h42</p>
      </div>

      {/* Prévisions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {forecast.slice(1).map((f) => (
          <div key={f.label} className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs font-medium text-gray-500">{f.label}</p>
            <p className={`mt-1 text-lg font-bold ${f.balance >= solde ? 'text-green-600' : 'text-red-500'}`}>
              {fmt(f.balance)}
            </p>
            <p className={`text-xs ${f.balance >= solde ? 'text-green-500' : 'text-red-400'}`}>
              {f.balance >= solde ? '▲' : '▼'} {fmt(Math.abs(f.balance - solde))}
            </p>
          </div>
        ))}
      </div>

      {/* Détail par compte */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Soldes par compte
            {agenceNom && (
              <span className="ml-2 text-xs font-normal text-gray-400">({visibleBalances.length} compte{visibleBalances.length !== 1 ? 's' : ''})</span>
            )}
          </h2>
        </div>
        <div className="divide-y divide-gray-50">
          {visibleBalances.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-gray-400">
              Aucun compte pour cette agence
            </p>
          ) : (
            visibleBalances.map((b) => (
              <div key={b.name} className="flex items-center gap-3 px-5 py-3">
                <span className="text-base shrink-0">{TYPE_ICON[b.type] ?? '💰'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{b.label}</p>
                  <p className="text-[10px] text-gray-400">{b.agence}</p>
                </div>
                <p className="shrink-0 text-sm font-bold text-gray-900">{fmt(b.solde)}</p>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-green-900">
          <p className="text-xs font-medium text-green-300">
            {agenceNom ? `Total — ${agenceNom}` : 'Total consolidé'}
          </p>
          <p className="text-sm font-black text-white">{fmt(solde)}</p>
        </div>
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
