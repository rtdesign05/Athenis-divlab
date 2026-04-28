import { useState, useEffect, useMemo } from 'react'
import { legalApi, type LegalContract, type LegalAlert, type AlertStats, type AlertSeverity } from '@/services/legalApi'

const STATUS_STYLE: Record<string, string> = {
  SIGNED:              'bg-green-100 text-green-700',
  PENDING_SIGNATURE:   'bg-amber-100 text-amber-700',
  DRAFT:               'bg-gray-100  text-gray-600',
  EXPIRED:             'bg-red-100   text-red-600',
  TERMINATED:          'bg-red-50    text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  SIGNED:              'Signé',
  PENDING_SIGNATURE:   'En attente',
  DRAFT:               'Brouillon',
  EXPIRED:             'Expiré',
  TERMINATED:          'Résilié',
}

const ALERT_STYLE: Record<AlertSeverity, string> = {
  INFO:     'border-blue-200 bg-blue-50 text-blue-800',
  WARNING:  'border-amber-200 bg-amber-50 text-amber-800',
  CRITICAL: 'border-red-200 bg-red-50 text-red-800',
}

const ALERT_ICON: Record<AlertSeverity, string> = {
  INFO: 'ℹ', WARNING: '⚠', CRITICAL: '🔴',
}

function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000)
}

export function LegalDashboard() {
  const [contracts, setContracts] = useState<LegalContract[]>([])
  const [alerts,    setAlerts]    = useState<LegalAlert[]>([])
  const [stats,     setStats]     = useState<AlertStats | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const [c, a, s] = await Promise.all([
          legalApi.contracts.list(),
          legalApi.alerts.list('OPEN'),
          legalApi.alerts.stats(),
        ])
        setContracts(c)
        setAlerts(a)
        setStats(s)
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const actifs  = useMemo(() => contracts.filter(c => c.status === 'SIGNED').length,        [contracts])
  const proches = useMemo(() =>
    contracts.filter(c => c.expiresAt && daysUntil(c.expiresAt) <= 90 && daysUntil(c.expiresAt) > 0).length,
    [contracts],
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-forest-500 border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="shrink-0 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Juridique</h1>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Données non disponibles — le module juridique n'est pas accessible.
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Juridique</h1>
        <p className="text-xs text-gray-500">Contrats actifs et alertes de conformité</p>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs font-medium text-gray-500">Contrats actifs</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{actifs}</p>
        </div>
        <div className={`rounded-xl border p-3 ${proches > 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-white'}`}>
          <p className={`text-xs font-medium ${proches > 0 ? 'text-amber-600' : 'text-gray-500'}`}>Échéances proches</p>
          <p className={`mt-1 text-2xl font-bold ${proches > 0 ? 'text-amber-700' : 'text-gray-900'}`}>{proches}</p>
        </div>
        <div className={`rounded-xl border p-3 ${(stats?.critical ?? 0) > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className={`text-xs font-medium ${(stats?.critical ?? 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            Alertes ouvertes
          </p>
          <p className={`mt-1 text-2xl font-bold ${(stats?.critical ?? 0) > 0 ? 'text-red-700' : 'text-gray-900'}`}>
            {stats?.total ?? alerts.length}
          </p>
        </div>
      </div>

      {/* Alertes ouvertes */}
      {alerts.length > 0 && (
        <div className="shrink-0 space-y-1.5 max-h-28 overflow-y-auto">
          {alerts.slice(0, 4).map(a => (
            <div key={a.id} className={`rounded-lg border px-3 py-2 flex items-center gap-2 text-xs ${ALERT_STYLE[a.severity]}`}>
              <span>{ALERT_ICON[a.severity]}</span>
              <span className="truncate">{a.title}</span>
              {a.dueDate && (
                <span className="ml-auto shrink-0 text-[10px] opacity-70">
                  {new Date(a.dueDate).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Contrats en cours */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 border-b border-gray-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-gray-900">
            Contrats en cours
            <span className="ml-2 text-xs font-normal text-gray-400">{contracts.length} total</span>
          </h2>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-gray-50">
          {contracts.length === 0 ? (
            <div className="flex items-center justify-center h-full py-8 text-sm text-gray-400">
              Aucun contrat — créez-en un dans le module Juridique
            </div>
          ) : contracts.slice(0, 8).map(c => (
            <div key={c.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                {c.expiresAt && (
                  <p className={`text-xs ${daysUntil(c.expiresAt) <= 90 ? 'text-amber-600' : 'text-gray-400'}`}>
                    Expire le {new Date(c.expiresAt).toLocaleDateString('fr-FR')}
                    {daysUntil(c.expiresAt) <= 90 && daysUntil(c.expiresAt) > 0 &&
                      ` (dans ${daysUntil(c.expiresAt)} j)`}
                  </p>
                )}
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[c.status] ?? c.status}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
