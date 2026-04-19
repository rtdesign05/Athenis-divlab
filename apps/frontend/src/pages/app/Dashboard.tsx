import { usePermissions } from '@/hooks/usePermissions'
import { PLAN_INFO } from '@athenis/shared-types'

const MODULE_LABELS: Record<string, string> = {
  gestion: 'Gestion',
  rh: 'RH',
  comptabilite: 'Comptabilité',
  juridique: 'Juridique',
  esg: 'ESG & CSRD',
}

export function AppDashboard() {
  const { plan, modules } = usePermissions()
  const planInfo = PLAN_INFO.find((p) => p.plan === plan)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="mt-1 text-sm text-gray-500">Vue d'ensemble de votre activité</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Chiffre d\'affaires', value: '—' },
          { label: 'Factures en attente', value: '—' },
          { label: 'Dépenses du mois', value: '—' },
          { label: 'Résultat net', value: '—' },
        ].map((kpi) => (
          <div key={kpi.label} className="card">
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Modules actifs */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Modules actifs</h3>
          {planInfo && (
            <span className="rounded-full bg-forest-100 px-3 py-1 text-sm font-medium text-forest-800">
              Forfait {planInfo.label} · {planInfo.price === 0 ? 'Gratuit' : `${planInfo.price}€/mois`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {modules.map((m) => (
            <span
              key={m}
              className="rounded-lg border border-forest-200 bg-forest-50 px-3 py-1.5 text-sm font-medium text-forest-800"
            >
              {MODULE_LABELS[m] ?? m}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
