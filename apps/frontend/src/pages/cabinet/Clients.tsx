import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cabinetApi, MANDAT_TYPE_LABELS, MANDAT_TYPE_COLORS, PLAN_COLORS } from '@/services/cabinetApi'
import type { PortfolioItem } from '@/services/cabinetApi'
import { useAuth } from '@/hooks/useAuth'

function fmt(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

export function CabinetClients() {
  const { enterCompanyView }              = useAuth()
  const navigate                          = useNavigate()
  const [items, setItems]                 = useState<PortfolioItem[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [search, setSearch]               = useState('')
  const [filterMandat, setFilterMandat]   = useState<string>('ALL')
  const [filterAlert, setFilterAlert]     = useState(false)
  const [switching, setSwitching]         = useState<string | null>(null)
  const [switchError, setSwitchError]     = useState('')

  async function handleOpenCompany(companyId: string, companyName: string) {
    setSwitching(companyId)
    setSwitchError('')
    try {
      const { viewToken, company } = await cabinetApi.switchToCompany(companyId)
      enterCompanyView(viewToken, company.nom ?? companyName)
      navigate('/app')
    } catch (err: any) {
      setSwitchError(err?.response?.data?.message ?? 'Impossible d\'accéder à cette entreprise')
    } finally {
      setSwitching(null)
    }
  }

  useEffect(() => {
    cabinetApi.portfolio()
      .then(setItems)
      .catch(() => setError('Impossible de charger le portefeuille'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return items.filter(({ company, mandat, kpis }) => {
      const q = search.toLowerCase()
      if (q && !company.nom.toLowerCase().includes(q) && !(company.siren ?? '').includes(q)) return false
      if (filterMandat !== 'ALL' && mandat.type !== filterMandat) return false
      if (filterAlert && kpis.overdueInvoices === 0) return false
      return true
    })
  }, [items, search, filterMandat, filterAlert])

  const alertCount = items.filter(({ kpis }) => kpis.overdueInvoices > 0).length

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portefeuille clients</h2>
          <p className="mt-1 text-sm text-gray-500">
            {items.length} entreprise{items.length > 1 ? 's' : ''} gérée{items.length > 1 ? 's' : ''} par votre cabinet
          </p>
        </div>
        {alertCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
            ⚠ {alertCount} alerte{alertCount > 1 ? 's' : ''} facture
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Rechercher par nom ou SIREN…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input h-9 w-64 text-sm"
        />
        <select
          value={filterMandat}
          onChange={(e) => setFilterMandat(e.target.value)}
          className="input h-9 pr-8 text-sm"
        >
          <option value="ALL">Tous les mandats</option>
          {Object.entries(MANDAT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          onClick={() => setFilterAlert((p) => !p)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            filterAlert
              ? 'border-red-300 bg-red-50 text-red-700'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          ⚠ Alertes uniquement
        </button>
      </div>

      {switchError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{switchError}</div>
      )}

      {/* States */}
      {loading && (
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
          Chargement…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-4xl">💼</p>
          <p className="mt-3 font-semibold text-gray-700">Portefeuille vide</p>
          <p className="mt-1 text-sm text-gray-500">
            Vos entreprises clientes apparaîtront ici une fois les mandats créés.
          </p>
        </div>
      )}

      {!loading && !error && items.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-500">Aucun résultat pour ces filtres.</p>
          <button
            onClick={() => { setSearch(''); setFilterMandat('ALL'); setFilterAlert(false) }}
            className="mt-2 text-sm text-forest-700 hover:underline"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}

      {/* Cards grid */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ company, mandat, kpis }) => (
            <div key={company.id} className="card flex flex-col gap-4">

              {/* Company header */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{company.nom}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {company.siren ? `SIREN ${company.siren}` : company.secteur ?? company.taille}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${PLAN_COLORS[company.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                  {company.plan}
                </span>
              </div>

              {/* Mandat badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${MANDAT_TYPE_COLORS[mandat.type]}`}>
                  {MANDAT_TYPE_LABELS[mandat.type]}
                </span>
                {mandat.modules.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {mandat.modules.length} module{mandat.modules.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* KPI grid */}
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 p-3">
                <div className="text-center">
                  <p className="text-xs text-gray-500">CA facturé</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{fmt(kpis.totalFacture)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Salariés</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{kpis.activeEmployees}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Factures</p>
                  <p className="mt-0.5 text-sm font-semibold text-gray-900">{kpis.invoiceCount}</p>
                </div>
              </div>

              {/* Overdue alert */}
              {kpis.overdueInvoices > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                  <span className="text-red-500">⚠</span>
                  <p className="text-xs font-medium text-red-700">
                    {kpis.overdueInvoices} facture{kpis.overdueInvoices > 1 ? 's' : ''} en retard
                  </p>
                </div>
              )}

              {/* Footer: since date + open button */}
              <div className="mt-auto flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Mandat depuis {new Date(mandat.since).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
                <button
                  onClick={() => handleOpenCompany(company.id, company.nom)}
                  disabled={switching === company.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-forest-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-forest-800 disabled:opacity-60"
                >
                  {switching === company.id ? (
                    <>
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Ouverture…
                    </>
                  ) : 'Ouvrir →'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
