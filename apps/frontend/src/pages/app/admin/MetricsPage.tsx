import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface AdminMetrics {
  generatedAt: string
  users: {
    total: number
    byType: Record<string, number>
    newThisMonth: number
    activeLast30Days: number
    activeLast7Days: number
  }
  companies: {
    total: number
    byPlan: Record<string, number>
    expiringSoon: number
  }
  cabinets: { total: number }
}

// ── API ───────────────────────────────────────────────────────────────────────
const fetchMetrics = () =>
  api.get<{ success: true; data: AdminMetrics }>('/admin/metrics').then(r => r.data.data)

const fetchCompanies = (plan?: string) =>
  api.get<{ success: true; data: { items: CompanyRow[]; total: number; totalPages: number } }>(
    '/admin/companies', { params: { limit: 10, ...(plan ? { plan } : {}) } }
  ).then(r => r.data.data)

interface CompanyRow {
  id: string
  nom: string
  plan: string
  planExpiresAt: string | null
  createdAt: string
  _count: { members: number }
}

// ── Composants utilitaires ────────────────────────────────────────────────────
const PLAN_COLOR: Record<string, string> = {
  FREE:    'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO:     'bg-purple-100 text-purple-700',
  PREMIUM: 'bg-amber-100 text-amber-700',
}

function KPI({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: 'green' | 'blue' | 'amber' | 'red' }) {
  const colors = {
    green: 'text-green-700',
    blue:  'text-blue-700',
    amber: 'text-amber-700',
    red:   'text-red-700',
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ? colors[accent] : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

function PlanBar({ plan, count, total }: { plan: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${PLAN_COLOR[plan] ?? 'bg-gray-100 text-gray-600'}`}>
        {plan}
      </span>
      <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
        <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-semibold text-gray-700">{count}</span>
      <span className="w-8 shrink-0 text-right text-xs text-gray-400">{pct}%</span>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export function MetricsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 60_000, // rafraîchit toutes les minutes
  })

  const { data: companies } = useQuery({
    queryKey: ['admin', 'companies'],
    queryFn: () => fetchCompanies(),
  })

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-700">
          Accès refusé ou erreur serveur — vérifiez votre rôle (SUPER_ADMIN requis)
        </p>
      </div>
    )
  }

  const totalCompanies = data.companies.total
  const plans = ['FREE', 'STARTER', 'PRO', 'PREMIUM'] as const

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Métriques Athenis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tableau de bord opérateur — mis à jour le {new Date(data.generatedAt).toLocaleString('fr')}
        </p>
      </div>

      {/* KPI Utilisateurs */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Utilisateurs</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KPI label="Total inscrits"    value={data.users.total}             accent="blue" />
          <KPI label="Entreprises"       value={data.users.byType['COMPANY'] ?? 0} />
          <KPI label="Cabinets"          value={data.cabinets.total} />
          <KPI label="Actifs 30 j"       value={data.users.activeLast30Days}  accent="green"
               sub={`${Math.round((data.users.activeLast30Days / (data.users.total || 1)) * 100)}% du total`} />
          <KPI label="Nouveaux ce mois"  value={data.users.newThisMonth}      accent="green" />
        </div>
      </section>

      {/* Répartition par plan */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Abonnements — {totalCompanies} entreprises
        </h2>
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="space-y-3">
            {plans.map(plan => (
              <PlanBar
                key={plan}
                plan={plan}
                count={data.companies.byPlan[plan] ?? 0}
                total={totalCompanies}
              />
            ))}
          </div>

          {data.companies.expiringSoon > 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
              ⚠️ {data.companies.expiringSoon} abonnement{data.companies.expiringSoon > 1 ? 's' : ''} expire dans les 30 prochains jours
            </div>
          )}
        </div>
      </section>

      {/* Rétention */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Engagement</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500">DAU / MAU</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">
              {data.users.activeLast7Days > 0 && data.users.activeLast30Days > 0
                ? `${Math.round((data.users.activeLast7Days / data.users.activeLast30Days) * 100)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-400">rétention hebdo</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500">Actifs 7 jours</p>
            <p className="mt-1 text-3xl font-bold text-green-700">{data.users.activeLast7Days}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500">Taux payants</p>
            <p className="mt-1 text-3xl font-bold text-purple-700">
              {totalCompanies > 0
                ? `${Math.round(((totalCompanies - (data.companies.byPlan['FREE'] ?? 0)) / totalCompanies) * 100)}%`
                : '—'}
            </p>
            <p className="text-xs text-gray-400">STARTER / PRO / PREMIUM</p>
          </div>
        </div>
      </section>

      {/* Dernières entreprises */}
      {companies && companies.items.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Dernières entreprises inscrites
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Entreprise</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Utilisateurs</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Inscrite le</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Expire le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {companies.items.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.nom}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${PLAN_COLOR[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                        {c.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c._count.members}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(c.createdAt).toLocaleDateString('fr')}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.planExpiresAt
                        ? new Date(c.planExpiresAt).toLocaleDateString('fr')
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Légende services externes */}
      <section className="rounded-xl border border-dashed border-gray-200 p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">Services de monitoring externes</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ServiceStatus
            name="PostHog Analytics"
            envVar="VITE_POSTHOG_KEY"
            url="https://eu.posthog.com"
            desc="Suivi comportemental, funnels, feature flags"
          />
          <ServiceStatus
            name="Sentry (Frontend)"
            envVar="VITE_SENTRY_DSN"
            url="https://sentry.io"
            desc="Monitoring des erreurs React, replay de sessions"
          />
          <ServiceStatus
            name="Sentry (Backend)"
            envVar="SENTRY_DSN"
            url="https://sentry.io"
            desc="Capture des erreurs Node/Express, traces"
          />
        </div>
      </section>
    </div>
  )
}

function ServiceStatus({ name, envVar, url, desc }: {
  name: string; envVar: string; url: string; desc: string
}) {
  // On détecte côté client si la variable frontend est définie
  const isConfigured = envVar.startsWith('VITE_')
    ? Boolean((import.meta.env as Record<string, string>)[envVar])
    : true // les vars backend ne sont pas visibles côté client

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
    >
      <span className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-amber-400'}`} />
      <div>
        <p className="text-sm font-medium text-gray-800">{name}</p>
        <p className="text-xs text-gray-400">{desc}</p>
        {!isConfigured && (
          <p className="mt-0.5 text-xs text-amber-600">
            Non configuré — ajouter <code className="bg-amber-50 px-1">{envVar}</code>
          </p>
        )}
      </div>
    </a>
  )
}
