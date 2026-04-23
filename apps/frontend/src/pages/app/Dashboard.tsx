import { useDashboardStats, useCashFlow, useReminders } from '@/hooks/useBilling'
import { formatCurrency } from '@/shared/utils/currency'
import { Badge } from '@/shared/components/ui/Badge'
import { ErrorBoundary } from '@/shared/components/feedback/ErrorBoundary'
import type { CashFlowWeek } from '@/services/billingApi'

function trend(growth: number | null) {
  if (growth === null) return null
  const positive = growth >= 0
  return (
    <span className={`text-xs font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
      {positive ? '▲' : '▼'} {Math.abs(growth).toFixed(1)}%
    </span>
  )
}

function KpiCard({
  label, value, sub, accent = false,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  accent?: boolean
}) {
  return (
    <div className={`card ${accent ? 'border-l-4 border-l-amber-400' : ''}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  )
}

// SVG bar + line chart for cash flow
function CashFlowChart({ weeks }: { weeks: CashFlowWeek[] }) {
  const W = 660
  const H = 200
  const PAD = { t: 16, r: 16, b: 36, l: 64 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const maxIncome = Math.max(...weeks.map((w) => w.expectedIncome), 1)
  const minCum    = Math.min(...weeks.map((w) => w.cumulative), 0)
  const maxCum    = Math.max(...weeks.map((w) => w.cumulative), 1)
  const cumRange  = maxCum - minCum || 1

  const barW = (innerW / weeks.length) * 0.55

  const xPos  = (i: number) => PAD.l + (i + 0.5) * (innerW / weeks.length)
  const yInc  = (v: number) => PAD.t + innerH - (v / maxIncome) * innerH * 0.85
  const yCum  = (v: number) => PAD.t + innerH - ((v - minCum) / cumRange) * innerH

  const linePts = weeks.map((w, i) => `${xPos(i)},${yCum(w.cumulative)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44" role="img" aria-label="Trésorerie prévisionnelle 90 jours">
      {/* gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = PAD.t + t * innerH
        const val = maxIncome * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#f0f0f0" strokeWidth="1" />
            <text x={PAD.l - 6} y={y + 4} fontSize="10" fill="#9ca3af" textAnchor="end">
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
            </text>
          </g>
        )
      })}

      {/* income bars */}
      {weeks.map((w, i) => (
        <rect
          key={i}
          x={xPos(i) - barW / 2}
          y={yInc(w.expectedIncome)}
          width={barW}
          height={Math.max(0, innerH - (yInc(w.expectedIncome) - PAD.t))}
          fill="#4ade80"
          fillOpacity="0.7"
          rx="2"
        />
      ))}

      {/* expense bars (half width, overlaid) */}
      {weeks.map((w, i) => (
        <rect
          key={i}
          x={xPos(i) - barW / 4}
          y={yInc(w.expectedExpenses)}
          width={barW / 2}
          height={Math.max(0, innerH - (yInc(w.expectedExpenses) - PAD.t))}
          fill="#f87171"
          fillOpacity="0.7"
          rx="2"
        />
      ))}

      {/* cumulative line */}
      <polyline
        points={linePts}
        fill="none"
        stroke="#1d4ed8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {weeks.map((w, i) => (
        <circle key={i} cx={xPos(i)} cy={yCum(w.cumulative)} r="3" fill="#1d4ed8" />
      ))}

      {/* x labels */}
      {weeks.map((w, i) =>
        i % 2 === 0 ? (
          <text key={i} x={xPos(i)} y={H - 6} fontSize="9" fill="#6b7280" textAnchor="middle">
            {w.label}
          </text>
        ) : null,
      )}
    </svg>
  )
}

function RemindersPanel() {
  const { data: reminders } = useReminders()
  if (!reminders?.length) return null

  const level3 = reminders.filter((r) => r.reminderLevel === 3)
  const level2 = reminders.filter((r) => r.reminderLevel === 2)
  const level1 = reminders.filter((r) => r.reminderLevel === 1)

  const all = [...level3, ...level2, ...level1].slice(0, 5)
  if (!all.length) return null

  return (
    <div className="card border-l-4 border-l-red-400">
      <h3 className="font-semibold text-gray-900 mb-3">
        Relances en attente
        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
          {reminders.length}
        </span>
      </h3>
      <ul className="space-y-2">
        {all.map((inv) => (
          <li key={inv.id} className="flex items-center justify-between text-sm">
            <span className="text-gray-700">
              {inv.client?.name ?? inv.number} · {inv.number}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{formatCurrency(inv.total)}</span>
              <Badge variant={inv.reminderLevel === 3 ? 'danger' : inv.reminderLevel === 2 ? 'warning' : 'info'}>
                J+{inv.daysOverdue}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AppDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: cashFlow, isLoading: cfLoading }  = useCashFlow()

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="mt-1 text-sm text-gray-500">Vue d'ensemble de votre activité</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="CA (année en cours)"
            value={statsLoading ? '…' : formatCurrency(stats?.revenue.current ?? 0)}
            sub={stats ? trend(stats.revenue.growth) : undefined}
          />
          <KpiCard
            label="Marge brute"
            value={
              statsLoading
                ? '…'
                : stats?.grossProfit.margin != null
                ? `${(stats.grossProfit.margin * 100).toFixed(1)}%`
                : '—'
            }
            sub={
              stats
                ? <span className="text-xs text-gray-400">{formatCurrency(stats.grossProfit.amount)}</span>
                : undefined
            }
          />
          <KpiCard
            label="DSO (délai moyen)"
            value={statsLoading ? '…' : stats?.dso != null ? `${stats.dso} j` : '—'}
            sub={<span className="text-xs text-gray-400">jours de délai de paiement</span>}
          />
          <KpiCard
            label="Encours à encaisser"
            value={statsLoading ? '…' : formatCurrency(stats?.pendingAmount ?? 0)}
            accent={!!stats?.overdueAmount}
            sub={
              stats?.overdueAmount
                ? <span className="text-xs text-red-500">{formatCurrency(stats.overdueAmount)} en retard</span>
                : undefined
            }
          />
        </div>

        {/* Reminders */}
        <RemindersPanel />

        {/* Cash flow chart */}
        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Trésorerie prévisionnelle — 90 jours</h3>
            {cashFlow && (
              <span className={`text-sm font-medium ${cashFlow.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                Solde net : {formatCurrency(cashFlow.summary.netCashFlow)}
              </span>
            )}
          </div>
          {cfLoading
            ? <div className="h-44 animate-pulse bg-gray-100 rounded" />
            : cashFlow
            ? <CashFlowChart weeks={cashFlow.weeks} />
            : <p className="text-sm text-gray-400 py-8 text-center">Aucune donnée de trésorerie</p>
          }
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-green-400/70" /> Revenus attendus</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded bg-red-400/70" /> Dépenses</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 border-b-2 border-blue-700" /> Solde cumulé</span>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
