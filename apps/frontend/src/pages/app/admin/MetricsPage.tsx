import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
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

interface CompanyRow {
  id: string
  nom: string
  plan: string
  createdAt: string
  _count: { members: number }
}

interface GrowthPoint {
  date: string
  count: number
}

interface GrowthData {
  daily: GrowthPoint[]
}

// ── API ───────────────────────────────────────────────────────────────────────

const fetchMetrics  = () => api.get<{ success: true; data: AdminMetrics }>('/admin/metrics').then(r => r.data.data)
const fetchCompanies = () => api.get<{ success: true; data: { items: CompanyRow[] } }>('/admin/companies', { params: { limit: 8 } }).then(r => r.data.data)
const fetchGrowth   = () => api.get<{ success: true; data: GrowthData }>('/admin/stats/growth').then(r => r.data.data)

// ── Couleurs plans ────────────────────────────────────────────────────────────

const PLAN_COLOR: Record<string, string> = {
  FREE:    'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO:     'bg-purple-100 text-purple-700',
  PREMIUM: 'bg-amber-100 text-amber-700',
}

const PLAN_BAR_COLOR: Record<string, string> = {
  FREE:    'bg-gray-400',
  STARTER: 'bg-blue-500',
  PRO:     'bg-purple-500',
  PREMIUM: 'bg-amber-500',
}

// ── KPI card ──────────────────────────────────────────────────────────────────

function KPI({
  label, value, sub, accent, icon,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'green' | 'blue' | 'amber' | 'red' | 'purple'
  icon?: string
}) {
  const colors: Record<string, string> = {
    green:  'text-green-700',
    blue:   'text-blue-700',
    amber:  'text-amber-600',
    red:    'text-red-600',
    purple: 'text-purple-700',
  }
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`mt-2 text-3xl font-bold ${accent ? colors[accent] : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Barre plan ────────────────────────────────────────────────────────────────

function PlanBar({ plan, count, total }: { plan: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className={`w-20 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${PLAN_COLOR[plan] ?? 'bg-gray-100 text-gray-600'}`}>
        {plan}
      </span>
      <div className="flex-1 overflow-hidden rounded-full bg-gray-100 h-2">
        <div
          className={`h-2 rounded-full transition-all ${PLAN_BAR_COLOR[plan] ?? 'bg-gray-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-sm font-semibold text-gray-700">{count}</span>
      <span className="w-8 shrink-0 text-right text-xs text-gray-400">{pct}%</span>
    </div>
  )
}

// ── Minibar chart 14 jours ────────────────────────────────────────────────────

function SparkBar({ points }: { points: GrowthPoint[] }) {
  const maxVal = Math.max(...points.map(p => p.count), 1)
  return (
    <div className="flex items-end gap-0.5 h-10">
      {points.map((p, i) => {
        const h = Math.max(Math.round((p.count / maxVal) * 40), p.count > 0 ? 3 : 1)
        return (
          <div
            key={i}
            title={`${p.date}: ${p.count}`}
            className="flex-1 rounded-t bg-green-400 hover:bg-green-600 transition-colors cursor-default"
            style={{ height: `${h}px` }}
          />
        )
      })}
    </div>
  )
}

// ── Statut services externes ──────────────────────────────────────────────────

function ServiceStatus({ name, envVar, url, desc }: { name: string; envVar: string; url: string; desc: string }) {
  const isConfigured = envVar.startsWith('VITE_')
    ? Boolean((import.meta.env as Record<string, string>)[envVar])
    : true
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

// ── Page principale ───────────────────────────────────────────────────────────

export function MetricsPage() {
  const { data, isLoading, error, dataUpdatedAt } = useQuery({
    queryKey: ['admin', 'metrics'],
    queryFn: fetchMetrics,
    refetchInterval: 60_000,
  })
  const { data: companies } = useQuery({ queryKey: ['admin', 'companies'], queryFn: fetchCompanies })
  const { data: growth }    = useQuery({ queryKey: ['admin', 'growth'],    queryFn: fetchGrowth })

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
  const plans          = ['FREE', 'STARTER', 'PRO', 'PREMIUM'] as const
  const payingCount    = totalCompanies - (data.companies.byPlan['FREE'] ?? 0)
  const retentionHebdo = data.users.activeLast30Days > 0
    ? Math.round((data.users.activeLast7Days / data.users.activeLast30Days) * 100)
    : 0
  const tauxPayants    = totalCompanies > 0 ? Math.round((payingCount / totalCompanies) * 100) : 0

  return (
    <div className="space-y-8">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord opérateur</h1>
          <p className="mt-1 text-sm text-gray-500">
            Indicateurs Athenis SaaS · mis à jour {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr') : '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/users"  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition">👥 Utilisateurs</Link>
          <Link to="/admin/health" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition">🔧 Santé</Link>
        </div>
      </div>

      {/* ── KPI Utilisateurs ────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Utilisateurs</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <KPI label="Total inscrits"    value={data.users.total}                icon="👤" accent="blue" />
          <KPI label="Comptes COMPANY"   value={data.users.byType['COMPANY'] ?? 0} icon="🏢" />
          <KPI label="Cabinets"          value={data.cabinets.total}               icon="🏦" />
          <KPI label="Comptes PERSONAL"  value={data.users.byType['PERSONAL'] ?? 0} icon="👤" />
          <KPI label="Actifs 30 j"       value={data.users.activeLast30Days}       icon="📅" accent="green"
               sub={`${Math.round((data.users.activeLast30Days / (data.users.total || 1)) * 100)}% du total`} />
          <KPI label="Nouveaux ce mois"  value={data.users.newThisMonth}           icon="🆕" accent="green" />
        </div>
      </section>

      {/* ── Engagement & Monétisation ────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Engagement & Monétisation</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500">Rétention hebdo (DAU/MAU)</p>
            <p className="mt-2 text-3xl font-bold text-green-700">{retentionHebdo}%</p>
            <p className="text-xs text-gray-400">actifs 7j / actifs 30j</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500">Actifs 7 jours</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">{data.users.activeLast7Days}</p>
            <p className="text-xs text-gray-400">connexions récentes</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500">Taux payants</p>
            <p className="mt-2 text-3xl font-bold text-purple-700">{tauxPayants}%</p>
            <p className="text-xs text-gray-400">STARTER / PRO / PREMIUM</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm text-center">
            <p className="text-xs text-gray-500">Abonnements payants</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">{payingCount}</p>
            <p className="text-xs text-gray-400">entreprises clientes</p>
          </div>
        </div>
      </section>

      {/* ── Croissance 14 jours ──────────────────────────────────────────────── */}
      {growth && growth.daily.length > 0 && (
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Inscriptions — 14 derniers jours</h2>
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Nouveaux utilisateurs</p>
              <p className="text-xs text-gray-400">
                Total : {growth.daily.reduce((s, p) => s + p.count, 0)}
              </p>
            </div>
            <SparkBar points={growth.daily} />
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>{growth.daily[0]?.date}</span>
              <span>{growth.daily[growth.daily.length - 1]?.date}</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Répartition par plan ─────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
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

      {/* ── Dernières entreprises ─────────────────────────────────────────────── */}
      {companies && companies.items.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Dernières entreprises inscrites</h2>
            <Link to="/admin/users" className="text-xs text-green-700 hover:underline">Voir tout →</Link>
          </div>
          <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Entreprise</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Membres</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Inscrite le</th>
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
                    <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('fr')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Services monitoring ───────────────────────────────────────────────── */}
      <section className="rounded-xl border border-dashed border-gray-200 p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-500">Services de monitoring</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ServiceStatus name="PostHog Analytics"    envVar="VITE_POSTHOG_KEY"  url="https://eu.posthog.com" desc="Suivi comportemental, funnels, feature flags" />
          <ServiceStatus name="Sentry (Frontend)"    envVar="VITE_SENTRY_DSN"   url="https://sentry.io"      desc="Monitoring erreurs React, replay sessions" />
          <ServiceStatus name="Sentry (Backend)"     envVar="SENTRY_DSN"        url="https://sentry.io"      desc="Capture erreurs Node/Express, traces APM" />
        </div>
      </section>

    </div>
  )
}
