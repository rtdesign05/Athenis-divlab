import { useState } from 'react'
import { useAlertStats, useLegalAlerts, useUpdateAlert, useSyncAlerts } from '@/hooks/useLegal'
import type { AlertSeverity, AlertStatus } from '@/services/legalApi'

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  INFO:     'bg-blue-100 text-blue-700',
  WARNING:  'bg-yellow-100 text-yellow-700',
  CRITICAL: 'bg-red-100 text-red-700',
}

const SEVERITY_ICON: Record<AlertSeverity, string> = {
  INFO: 'ℹ', WARNING: '⚠', CRITICAL: '🔴',
}

const STATUS_LABEL: Record<AlertStatus, string> = {
  OPEN: 'Ouverte', DISMISSED: 'Ignorée', RESOLVED: 'Résolue',
}

export function AlertsPage() {
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('OPEN')
  const stats   = useAlertStats()
  const alerts  = useLegalAlerts(statusFilter !== 'ALL' ? statusFilter : undefined)
  const update  = useUpdateAlert()
  const sync    = useSyncAlerts()

  const statuses: (AlertStatus | 'ALL')[] = ['ALL', 'OPEN', 'DISMISSED', 'RESOLVED']

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alertes juridiques</h1>
          <p className="text-sm text-gray-500">Expiration de contrats, obligations légales, renouvellements</p>
        </div>
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
          {sync.isPending ? 'Synchronisation…' : '↻ Sync. expirations'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Alertes ouvertes</p>
          <p className="text-3xl font-bold text-gray-900">{stats.data?.total ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-600">Critiques</p>
          <p className="text-3xl font-bold text-red-700">{stats.data?.critical ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-xs font-medium text-yellow-600">Avertissements</p>
          <p className="text-3xl font-bold text-yellow-700">{stats.data?.warning ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-medium text-blue-600">Informations</p>
          <p className="text-3xl font-bold text-blue-700">{stats.data?.info ?? '—'}</p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
        {statuses.map(s => (
          <button key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {s === 'ALL' ? 'Toutes' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Alert list */}
      {alerts.isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Chargement…</div>
      ) : alerts.data?.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          {statusFilter === 'OPEN' ? 'Aucune alerte ouverte' : 'Aucune alerte'}
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.data?.map(alert => (
            <div key={alert.id}
              className={`rounded-xl border p-4 ${
                alert.severity === 'CRITICAL' ? 'border-red-200 bg-red-50' :
                alert.severity === 'WARNING'  ? 'border-yellow-200 bg-yellow-50' :
                                                'border-blue-200 bg-blue-50'
              }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{SEVERITY_ICON[alert.severity]}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{alert.title}</p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_BADGE[alert.severity]}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600">{alert.message}</p>
                    <div className="mt-1 flex gap-4 text-xs text-gray-400">
                      {alert.dueDate && (
                        <span>Échéance : {new Date(alert.dueDate).toLocaleDateString('fr-FR')}</span>
                      )}
                      {alert.contract && (
                        <span>Contrat : {alert.contract.title}</span>
                      )}
                      <span>Créée le {new Date(alert.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                </div>
                {alert.status === 'OPEN' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => update.mutate({ id: alert.id, status: 'RESOLVED' })}
                      disabled={update.isPending}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                      Résoudre
                    </button>
                    <button
                      onClick={() => update.mutate({ id: alert.id, status: 'DISMISSED' })}
                      disabled={update.isPending}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                      Ignorer
                    </button>
                  </div>
                )}
                {alert.status !== 'OPEN' && (
                  <span className="text-xs font-medium text-gray-400 shrink-0">
                    {STATUS_LABEL[alert.status]}
                    {alert.resolvedAt && ` le ${new Date(alert.resolvedAt).toLocaleDateString('fr-FR')}`}
                    {alert.dismissedAt && ` le ${new Date(alert.dismissedAt).toLocaleDateString('fr-FR')}`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
