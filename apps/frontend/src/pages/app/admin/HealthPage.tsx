import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

interface HealthData {
  status: 'ok' | 'degraded' | 'down'
  uptime: number
  checks: {
    database: 'ok' | 'error'
    smtp:     'ok' | 'unconfigured' | 'error'
    sentry:   'ok' | 'unconfigured'
    posthog:  'ok' | 'unconfigured'
  }
  version?: string
  nodeEnv?: string
}

const fetchHealth = () =>
  api.get<{ success: true; data: HealthData }>('/admin/health').then(r => r.data.data)

function StatusDot({ status }: { status: 'ok' | 'error' | 'unconfigured' | 'degraded' | 'down' }) {
  const colors: Record<string, string> = {
    ok:           'bg-green-500',
    degraded:     'bg-amber-400',
    unconfigured: 'bg-gray-300',
    error:        'bg-red-500',
    down:         'bg-red-600',
  }
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status] ?? 'bg-gray-300'}`} />
  )
}

function CheckRow({ label, status, desc }: { label: string; status: string; desc?: string }) {
  const texts: Record<string, string> = {
    ok:           'Opérationnel',
    error:        'Erreur',
    unconfigured: 'Non configuré',
    degraded:     'Dégradé',
    down:         'Hors ligne',
  }
  const textColors: Record<string, string> = {
    ok:           'text-green-700',
    error:        'text-red-600',
    unconfigured: 'text-gray-400',
    degraded:     'text-amber-600',
    down:         'text-red-700',
  }
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <StatusDot status={status as 'ok'} />
        <div>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          {desc && <p className="text-xs text-gray-400">{desc}</p>}
        </div>
      </div>
      <span className={`text-sm font-semibold ${textColors[status] ?? 'text-gray-500'}`}>
        {texts[status] ?? status}
      </span>
    </div>
  )
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}j ${h}h ${m}min`
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

export function HealthPage() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Santé du système</h1>
          <p className="mt-1 text-sm text-gray-500">
            Surveillance en temps réel de l'infrastructure
          </p>
        </div>
        <button
          onClick={() => { void refetch() }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition"
        >
          🔄 Rafraîchir
        </button>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Impossible de récupérer les données de santé.
        </div>
      )}

      {data && (
        <>
          {/* Statut global */}
          <div className={`flex items-center gap-4 rounded-xl border p-5 ${
            data.status === 'ok'       ? 'border-green-200 bg-green-50'  :
            data.status === 'degraded' ? 'border-amber-200 bg-amber-50'  :
                                         'border-red-200 bg-red-50'
          }`}>
            <StatusDot status={data.status} />
            <div>
              <p className={`text-lg font-bold ${
                data.status === 'ok' ? 'text-green-800' :
                data.status === 'degraded' ? 'text-amber-800' : 'text-red-800'
              }`}>
                {data.status === 'ok'       ? 'Tous les systèmes sont opérationnels' :
                 data.status === 'degraded' ? 'Système partiellement dégradé' :
                                              'Système hors ligne'}
              </p>
              <p className="text-sm text-gray-500">
                Uptime : {formatUptime(data.uptime)}
                {data.version && ` · v${data.version}`}
                {data.nodeEnv && ` · ${data.nodeEnv}`}
              </p>
            </div>
            {dataUpdatedAt && (
              <p className="ml-auto text-xs text-gray-400">
                Vérifié à {new Date(dataUpdatedAt).toLocaleTimeString('fr')}
              </p>
            )}
          </div>

          {/* Détails des vérifications */}
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-5 py-3">
              <p className="text-sm font-semibold text-gray-700">Composants</p>
            </div>
            <div className="divide-y divide-gray-50 px-5">
              <CheckRow label="Base de données (PostgreSQL)" status={data.checks.database} desc="Connexion Prisma" />
              <CheckRow label="Serveur SMTP"                  status={data.checks.smtp}     desc="Envoi d'e-mails" />
              <CheckRow label="Sentry — Monitoring erreurs"   status={data.checks.sentry}   desc="DSN backend" />
              <CheckRow label="PostHog — Analytics"           status={data.checks.posthog}  desc="VITE_POSTHOG_KEY" />
            </div>
          </div>

          {/* Variables frontend */}
          <div className="rounded-xl border border-dashed border-gray-200 p-5">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">Variables d'environnement frontend</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              {(['VITE_POSTHOG_KEY', 'VITE_POSTHOG_HOST', 'VITE_SENTRY_DSN'] as string[]).map(v => {
                const val = (import.meta.env as Record<string, string>)[v]
                return (
                  <div key={v} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <code className="text-xs text-gray-600">{v}</code>
                    <span className={`text-xs font-medium ${val ? 'text-green-700' : 'text-gray-400'}`}>
                      {val ? '✓ configuré' : 'non défini'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
