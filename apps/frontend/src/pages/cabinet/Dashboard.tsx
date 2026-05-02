import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cabinetApi, MANDAT_TYPE_LABELS, MANDAT_TYPE_COLORS, PLAN_COLORS } from '@/services/cabinetApi'
import type { CabinetDashboard as CabinetDashboardData } from '@/services/cabinetApi'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

export function CabinetDashboard() {
  const { user, enterCompanyView } = useAuth()
  const navigate = useNavigate()
  const [switching, setSwitching] = useState<string | null>(null)

  async function handleOpen(companyId: string, companyName: string) {
    setSwitching(companyId)
    try {
      const { viewToken, company } = await cabinetApi.switchToCompany(companyId)
      enterCompanyView(viewToken, company.nom ?? companyName)
      navigate('/app')
    } catch {
      // silent — could show a toast
    } finally {
      setSwitching(null)
    }
  }
  const [data, setData]       = useState<CabinetDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    cabinetApi.dashboard()
      .then(setData)
      .catch(() => setError('Impossible de charger le tableau de bord'))
      .finally(() => setLoading(false))
  }, [])

  const moisFr = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bonjour 👋</h2>
        <p className="mt-1 text-sm text-gray-500">
          Vue d'ensemble du portefeuille — <span className="capitalize">{moisFr}</span>
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
          Chargement…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/cabinet/clients" className="card transition-shadow hover:shadow-md">
              <p className="text-sm font-medium text-gray-500">Clients actifs</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{data.summary.activeMandats}</p>
              <p className="mt-1 text-xs text-gray-400">
                {data.summary.totalMandats} mandat{data.summary.totalMandats > 1 ? 's' : ''} au total
              </p>
            </Link>

            <div className="card">
              <p className="text-sm font-medium text-gray-500">Total facturé portefeuille</p>
              <p className="mt-2 text-2xl font-bold text-forest-700">{fmt(data.summary.totalFacturePortefeuille)}</p>
              <p className="mt-1 text-xs text-gray-400">Cumul toutes entreprises</p>
            </div>

            <Link to="/cabinet/clients" className="card transition-shadow hover:shadow-md">
              <p className="text-sm font-medium text-gray-500">Alertes factures</p>
              <p className={`mt-2 text-3xl font-bold ${data.summary.companiesWithOverdueInvoices > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {data.summary.companiesWithOverdueInvoices}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {data.summary.companiesWithOverdueInvoices > 0
                  ? 'entreprise(s) avec factures en retard'
                  : 'Aucune alerte'}
              </p>
            </Link>

            <Link to="/cabinet/access" className="card transition-shadow hover:shadow-md">
              <p className="text-sm font-medium text-gray-500">Mandats inactifs</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{data.summary.inactiveMandats}</p>
              <p className="mt-1 text-xs text-forest-700">Gérer les mandats →</p>
            </Link>
          </div>

          {/* Portfolio récent */}
          {data.portfolio.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 p-10 text-center">
              <p className="text-3xl">💼</p>
              <p className="mt-2 font-semibold text-gray-700">Portefeuille vide</p>
              <p className="mt-1 text-sm text-gray-500">
                Vos entreprises clientes apparaîtront ici une fois les mandats créés.
              </p>
            </div>
          ) : (
            <div className="card overflow-hidden p-0">
              <div className="flex items-center justify-between px-5 py-4">
                <h3 className="font-semibold text-gray-900">Portefeuille clients</h3>
                <Link to="/cabinet/clients" className="text-sm text-forest-700 hover:underline">Voir tout →</Link>
              </div>
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Entreprise', 'Mandat', 'CA facturé', 'Alertes', 'Salariés', 'Plan', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.portfolio.slice(0, 8).map(({ company, mandat, kpis }) => (
                    <tr key={company.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{company.nom}</p>
                        <p className="text-xs text-gray-400">{company.secteur ?? company.taille}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${MANDAT_TYPE_COLORS[mandat.type]}`}>
                          {MANDAT_TYPE_LABELS[mandat.type]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">{fmt(kpis.totalFacture)}</td>
                      <td className="px-4 py-3">
                        {kpis.overdueInvoices > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            ⚠ {kpis.overdueInvoices}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{kpis.activeEmployees}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[company.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                          {company.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleOpen(company.id, company.nom)}
                          disabled={switching === company.id}
                          className="text-xs font-medium text-forest-700 hover:text-forest-900 disabled:opacity-50"
                        >
                          {switching === company.id ? '…' : 'Ouvrir →'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Identité cabinet */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Votre cabinet</p>
            <p className="mt-1 text-sm text-gray-700">{user?.email}</p>
            <p className="mt-0.5 text-xs text-gray-400">Plan Premium · Accès illimité</p>
          </div>
        </>
      )}
    </div>
  )
}
