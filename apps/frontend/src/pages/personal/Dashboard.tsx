import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { personalApi, CATEGORIES_DEPENSES, CATEGORIES_REVENUS } from '@/services/personalApi'
import type { PersonalDashboard } from '@/services/personalApi'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
}

function catLabel(cat: string, type: 'REVENU' | 'DEPENSE') {
  const list = type === 'REVENU' ? CATEGORIES_REVENUS : CATEGORIES_DEPENSES
  const found = list.find((c) => c.value === cat)
  return found ? `${found.emoji} ${found.label}` : cat
}

/** Initialise au mois en cours en format 'YYYY-MM' (input[type=month]) */
function defaultPeriod(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

/** Parse 'YYYY-MM' → { annee, mois } (mois 1-12) */
function parsePeriod(s: string): { annee: number; mois: number } {
  const [y, m] = s.split('-')
  return {
    annee: parseInt(y ?? '0', 10) || new Date().getFullYear(),
    mois:  parseInt(m ?? '0', 10) || (new Date().getMonth() + 1),
  }
}

export function PersonalDashboard() {
  const { user } = useAuth()
  const [periode, setPeriode] = useState<string>(defaultPeriod)
  const [data, setData]       = useState<PersonalDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    const { annee, mois } = parsePeriod(periode)
    personalApi.dashboard({ annee, mois })
      .then(setData)
      .catch(() => setError('Impossible de charger le tableau de bord'))
      .finally(() => setLoading(false))
  }, [periode])

  // Libellé "Mai 2026" pour le sous-titre
  const { annee, mois } = parsePeriod(periode)
  const periodeLabel = new Date(annee, mois - 1, 1)
    .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Header avec sélecteur de période */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Bonjour{user?.email ? ` 👋` : ' 👋'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Situation financière — <span className="capitalize">{periodeLabel}</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="periode" className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Période
          </label>
          <input
            id="periode"
            type="month"
            className="input w-full sm:w-44"
            value={periode}
            onChange={(e) => setPeriode(e.target.value || defaultPeriod())}
            max={defaultPeriod()}
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
          Chargement…
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card">
              <p className="text-sm font-medium text-gray-500">Solde de la période</p>
              <p className={`mt-2 text-2xl font-bold ${data.soldeTotalComptes >= 0 ? 'text-forest-700' : 'text-red-500'}`}>
                {fmt(data.soldeTotalComptes)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {data.soldeTotalComptes >= 0 ? 'Revenus > Dépenses' : 'Dépenses > Revenus'}
              </p>
            </div>
            <div className="card">
              <p className="text-sm font-medium text-gray-500">Revenus du mois</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{fmt(data.revenusMois)}</p>
              <Link to="/personal/income" className="mt-1 block text-xs text-forest-700 hover:underline">Voir les revenus →</Link>
            </div>
            <div className="card">
              <p className="text-sm font-medium text-gray-500">Dépenses du mois</p>
              <p className="mt-2 text-2xl font-bold text-red-500">{fmt(data.depensesMois)}</p>
              <Link to="/personal/expenses" className="mt-1 block text-xs text-forest-700 hover:underline">Voir les dépenses →</Link>
            </div>
            <div className="card">
              <p className="text-sm font-medium text-gray-500">Taux d'épargne</p>
              <p className={`mt-2 text-2xl font-bold ${data.tauxEpargne >= 20 ? 'text-forest-700' : data.tauxEpargne >= 10 ? 'text-yellow-600' : 'text-red-500'}`}>
                {data.tauxEpargne}%
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {data.tauxEpargne >= 20 ? '✅ Excellent' : data.tauxEpargne >= 10 ? '⚠️ À améliorer' : '🔴 Attention'}
              </p>
            </div>
          </div>

          {/* Transactions récentes — DE LA PÉRIODE SÉLECTIONNÉE */}
          <div className="card">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Transactions de la période</h3>
              <div className="flex gap-3 text-xs">
                <Link to="/personal/income" className="text-green-700 hover:underline">Revenus</Link>
                <Link to="/personal/expenses" className="text-red-600 hover:underline">Dépenses</Link>
              </div>
            </div>
            {data.transactionsRecentes.length === 0 ? (
              <div className="rounded-lg bg-gray-50 py-10 text-center text-sm text-gray-400">
                Aucune transaction enregistrée sur cette période.<br />
                <Link to="/personal/income" className="mt-2 inline-block text-forest-700 hover:underline">Ajouter un revenu</Link>
                {' '}ou{' '}
                <Link to="/personal/expenses" className="text-forest-700 hover:underline">une dépense</Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data.transactionsRecentes.map((t) => (
                  <li key={`${t.type}-${t.id}`} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {catLabel(t.categorie, t.type).split(' ')[0]}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{t.libelle}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(t.date).toLocaleDateString('fr-FR')}
                          {' · '}{catLabel(t.categorie, t.type).split(' ').slice(1).join(' ')}
                          {t.recurrent && <span className="ml-1.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-blue-700 text-[10px]">Récurrent</span>}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === 'REVENU' ? 'text-green-600' : 'text-red-500'}`}>
                      {t.type === 'REVENU' ? '+' : '−'}{fmt(t.montant)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Comptes & Objectifs (atemporels — état actuel) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Mes comptes</h3>
                <Link to="/personal/savings" className="text-xs text-forest-700 hover:underline">Gérer →</Link>
              </div>
              {data.comptes.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Aucun compte.{' '}
                  <Link to="/personal/savings" className="text-forest-700 hover:underline">Ajouter un compte</Link>
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.comptes.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.nom}</p>
                        <p className="text-xs text-gray-400">{c.type}</p>
                      </div>
                      <span className={`text-sm font-bold ${c.solde >= 0 ? 'text-gray-900' : 'text-red-500'}`}>
                        {fmt(c.solde)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Objectifs d'épargne</h3>
                <Link to="/personal/savings" className="text-xs text-forest-700 hover:underline">Gérer →</Link>
              </div>
              {data.objectifs.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Aucun objectif.{' '}
                  <Link to="/personal/savings" className="text-forest-700 hover:underline">Créer un objectif</Link>
                </p>
              ) : (
                <ul className="space-y-4">
                  {data.objectifs.map((o) => {
                    const pct = Math.min(Math.round((o.montantActuel / o.montantCible) * 100), 100)
                    return (
                      <li key={o.id}>
                        <div className="mb-1 flex justify-between">
                          <span className="text-sm font-medium text-gray-900">{o.nom}</span>
                          <span className="text-sm text-gray-500">{pct}%</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-forest-600'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-gray-400">
                          <span>{fmt(o.montantActuel)}</span>
                          <span>{fmt(o.montantCible)}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
