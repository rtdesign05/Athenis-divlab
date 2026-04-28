import { useMemo } from 'react'
import { useEmployees, useLeaveStats, useEmployeeStats } from '@/hooks/useHr'
import { useCurrency } from '@/hooks/useCurrency'
import { toSafeAmount } from '@/shared/utils/currency'
import type { EmploymentType } from '@/services/hrApi'

const TYPE_LABEL: Record<EmploymentType, string> = {
  FULL_TIME:  'Temps plein',
  PART_TIME:  'Temps partiel',
  CONTRACT:   'Contractuel',
  INTERN:     'Stagiaire',
}

const TYPE_COLOR: Record<EmploymentType, string> = {
  FULL_TIME:  'bg-forest-600',
  PART_TIME:  'bg-blue-500',
  CONTRACT:   'bg-purple-500',
  INTERN:     'bg-amber-500',
}

export function HRDashboard() {
  const employeesQ  = useEmployees()
  const leaveStatsQ = useLeaveStats()
  const statsQ      = useEmployeeStats()
  const { fmt }     = useCurrency()

  // Priorité aux stats API (active.count) — plus fiable que filtrer !endDate sur la liste
  const actifs = statsQ.data?.active.count
    ?? (employeesQ.data?.items ?? []).filter(e => !e.endDate).length
  const masse  = statsQ.data
    ? toSafeAmount(statsQ.data.active.totalMonthly)
    : (employeesQ.data?.masseSalarialeMonth ?? 0)
  const leaves = leaveStatsQ.data

  // Répartition réelle par type de contrat depuis l'API
  const contrats = useMemo(() => {
    const byType = statsQ.data?.byType ?? []
    if (byType.length === 0) return [] as { label: string; count: number; color: string }[]
    return byType.map(b => ({
      label: TYPE_LABEL[b.employmentType] ?? b.employmentType,
      count: b._count,
      color: TYPE_COLOR[b.employmentType] ?? 'bg-gray-400',
    }))
  }, [statsQ.data])

  const totalContrats = contrats.reduce((s, c) => s + c.count, 0)
  const loading = statsQ.isLoading || leaveStatsQ.isLoading

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Ressources humaines</h1>
        <p className="text-xs text-gray-500">Vue d'ensemble des effectifs</p>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Effectif actif</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{loading ? '—' : actifs}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Masse salariale / mois</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{loading ? '—' : fmt(masse)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Congés en attente</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{leaveStatsQ.isLoading ? '—' : (leaves?.pending ?? 0)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Jours approuvés ce mois</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{leaveStatsQ.isLoading ? '—' : (leaves?.totalBusinessDays ?? 0)}</p>
        </div>
      </div>

      {/* Répartition par type de contrat */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white p-4 flex flex-col justify-between">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Répartition par type de contrat</h2>

          {statsQ.isLoading ? (
            <div className="h-3 w-full rounded-full bg-gray-100 animate-pulse" />
          ) : contrats.length > 0 ? (
            <>
              <div className="flex h-3 w-full overflow-hidden rounded-full gap-0.5">
                {contrats.map(c => (
                  <div
                    key={c.label}
                    className={`${c.color} transition-all`}
                    style={{ width: `${(c.count / totalContrats) * 100}%` }}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-4">
                {contrats.map(c => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-sm ${c.color}`} />
                    <span className="text-sm text-gray-600">{c.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{c.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">Aucune donnée de répartition disponible</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{totalContrats || actifs}</p>
            <p className="text-xs text-gray-500">Total effectif</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-forest-700">
              {contrats.find(c => c.label === 'Temps plein')?.count ?? 0}
            </p>
            <p className="text-xs text-gray-500">Temps plein</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {contrats.filter(c => c.label !== 'Temps plein').reduce((s, c) => s + c.count, 0)}
            </p>
            <p className="text-xs text-gray-500">Autres contrats</p>
          </div>
        </div>
      </div>

    </div>
  )
}
