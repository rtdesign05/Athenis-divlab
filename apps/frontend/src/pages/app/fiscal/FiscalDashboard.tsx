import { useFiscalDashboard } from '@/hooks/useFiscal'
import { useCurrency } from '@/hooks/useCurrency'
import { useRegimeDetection, useConfirmRegime } from '@/hooks/useFiscalRegime'
import { fiscalApi } from '@/services/fiscalApi'
import { useQuery } from '@tanstack/react-query'

function KpiCard({ title, value, sub, badge }: { title: string; value: string; sub: string; badge?: { label: string; color: string } | undefined }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-sm text-gray-500">{sub}</p>
        {badge && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}>{badge.label}</span>}
      </div>
    </div>
  )
}

function AlertBanner({ level, message }: { level: 'error' | 'warning' | 'ok'; message: string }) {
  const cls = level === 'error'
    ? 'border-red-200 bg-red-50 text-red-800'
    : level === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-green-200 bg-green-50 text-green-800'
  const icon = level === 'error' ? '🔴' : level === 'warning' ? '🟡' : '🟢'
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${cls}`}>
      <span>{icon}</span>
      <span>{message}</span>
    </div>
  )
}

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function BarChart({ data }: { data: Array<{ month: number; tva: number; is: number; patente: number; ras: number }> }) {
  const maxVal = Math.max(...data.map(d => d.tva + d.is + d.patente + d.ras), 1)
  return (
    <div className="mt-4">
      <div className="flex h-40 items-end gap-1">
        {data.map(d => {
          const total = d.tva + d.is + d.patente + d.ras
          const h = (total / maxVal) * 100
          return (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="w-full rounded-t" style={{ height: `${h}%`, minHeight: total > 0 ? 4 : 0 }}>
                <div className="h-full w-full overflow-hidden rounded-t">
                  {d.tva > 0    && <div style={{ height: `${(d.tva    / total) * 100}%` }} className="w-full bg-blue-400" />}
                  {d.is > 0     && <div style={{ height: `${(d.is     / total) * 100}%` }} className="w-full bg-violet-400" />}
                  {d.patente > 0 && <div style={{ height: `${(d.patente/ total) * 100}%` }} className="w-full bg-amber-400" />}
                  {d.ras > 0    && <div style={{ height: `${(d.ras    / total) * 100}%` }} className="w-full bg-green-400" />}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex gap-1">
        {data.map(d => (
          <div key={d.month} className="flex-1 text-center text-[10px] text-gray-400">{MONTH_LABELS[d.month - 1]}</div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />TVA</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />IS</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Patente</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-green-400" />RAS</span>
      </div>
    </div>
  )
}

function RegimeChangeBanner({ year }: { year: number }) {
  const { data: detection } = useRegimeDetection(year)
  const { data: config } = useQuery({
    queryKey: ['fiscal', 'config'],
    queryFn:  fiscalApi.getConfig,
    staleTime: 5 * 60_000,
  })
  const confirm = useConfirmRegime()

  if (!detection?.hasChanged || !config?.regimeChangeAlert) return null

  const REGIME_LABELS: Record<string, string> = {
    IGS: 'IGS (Impôt Général Synthétique)',
    REEL_NORMAL: 'Réel Normal',
    REEL_SIMPLIFIE: 'Réel Simplifié',
    LIBERATOIRE: 'Régime libératoire',
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-bold text-amber-900">Changement de régime fiscal détecté</p>
          <p className="mt-1 text-sm text-amber-800">
            Votre régime va passer de{' '}
            <span className="font-semibold">{REGIME_LABELS[detection.currentRegime] ?? detection.currentRegime}</span>{' '}
            à{' '}
            <span className="font-semibold">{REGIME_LABELS[detection.nextRegime] ?? detection.nextRegime}</span>{' '}
            pour l'exercice {year}.
          </p>
          {detection.changeReason && (
            <p className="mt-1 text-xs text-amber-700">{detection.changeReason}</p>
          )}
          {detection.newObligations.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-amber-800">Nouvelles obligations :</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-700">
                {detection.newObligations.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
        </div>
        <button
          onClick={() => confirm.mutate({ year, regime: detection.nextRegime })}
          disabled={confirm.isPending}
          className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {confirm.isPending ? 'Confirmation…' : 'Confirmer'}
        </button>
      </div>
    </div>
  )
}

export function FiscalDashboard() {
  const year = new Date().getFullYear()
  const { data, isLoading } = useFiscalDashboard(year)
  const { fmt } = useCurrency()

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (!data) return null

  const { kpis, alerts, monthlyChart } = data

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Tableau de bord fiscal</h1>
        <p className="mt-0.5 text-sm text-gray-500">Exercice {year} — {data.country === 'CM' ? 'Cameroun · DGI' : 'France'}</p>
      </div>

      {data.country === 'CM' && <RegimeChangeBanner year={year} />}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="TVA à verser"
          value={kpis.tvaAPayer != null ? fmt(kpis.tvaAPayer) : '—'}
          sub={kpis.tvaDueDate ? `Échéance ${new Date(kpis.tvaDueDate).toLocaleDateString('fr-FR')}` : 'Aucune en attente'}
          {...(kpis.tvaAPayer != null ? { badge: { label: 'En attente', color: 'bg-amber-100 text-amber-700' } } : {})}
        />
        <KpiCard
          title="IS prévisionnel"
          value={fmt(kpis.isPrevisionnel)}
          sub={`Exercice ${kpis.isYear}`}
        />
        <KpiCard
          title={data.country === 'CM' ? `Patente ${year}` : `CFE ${year}`}
          value={kpis.patente != null ? fmt(kpis.patente) : '—'}
          sub=""
          {...(kpis.patenteStatus === 'PAID'    ? { badge: { label: 'Payée ✓', color: 'bg-green-100 text-green-700' } }
            : kpis.patenteStatus === 'PENDING'  ? { badge: { label: 'À payer', color: 'bg-amber-100 text-amber-700' } }
            : {})}
        />
        <KpiCard
          title="Prochaine échéance"
          value={kpis.nextDeadlineDays != null ? `dans ${kpis.nextDeadlineDays} jours` : '—'}
          sub={kpis.nextDeadlineLabel ?? ''}
          {...(kpis.nextDeadlineDays != null && kpis.nextDeadlineDays <= 7 ? { badge: { label: 'Urgent', color: 'bg-red-100 text-red-700' } } : {})}
        />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Alertes fiscales</h2>
          {alerts.map((a, i) => <AlertBanner key={i} level={a.level} message={a.message} />)}
        </div>
      )}

      {/* Chart */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-700">Charges fiscales {year} — 12 derniers mois</h2>
        <BarChart data={monthlyChart} />
      </div>
    </div>
  )
}
