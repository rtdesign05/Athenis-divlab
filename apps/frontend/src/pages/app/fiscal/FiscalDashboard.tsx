import { useFiscalDashboard } from '@/hooks/useFiscal'
import { useCurrency } from '@/hooks/useCurrency'
import { useRegimeDetection, useConfirmRegime } from '@/hooks/useFiscalRegime'
import { fiscalApi } from '@/services/fiscalApi'
import { useQuery } from '@tanstack/react-query'

function KpiCard({ title, value, sub, badge }: { title: string; value: string; sub: string; badge?: { label: string; color: string } }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{title}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      <div className="mt-0.5 flex items-center gap-2">
        <p className="text-xs text-gray-500">{sub}</p>
        {badge && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badge.color}`}>{badge.label}</span>}
      </div>
    </div>
  )
}

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

function BarChart({ data }: { data: Array<{ month: number; tva: number; is: number; patente: number; ras: number }> }) {
  const maxVal = Math.max(...data.map(d => d.tva + d.is + d.patente + d.ras), 1)
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 flex items-end gap-1">
        {data.map(d => {
          const total = d.tva + d.is + d.patente + d.ras
          const h = (total / maxVal) * 100
          return (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-0.5 h-full justify-end">
              <div className="w-full rounded-t overflow-hidden" style={{ height: `${h}%`, minHeight: total > 0 ? 3 : 0 }}>
                {d.tva     > 0 && <div style={{ height: `${(d.tva    / total) * 100}%` }} className="w-full bg-blue-400" />}
                {d.is      > 0 && <div style={{ height: `${(d.is     / total) * 100}%` }} className="w-full bg-violet-400" />}
                {d.patente > 0 && <div style={{ height: `${(d.patente/ total) * 100}%` }} className="w-full bg-amber-400" />}
                {d.ras     > 0 && <div style={{ height: `${(d.ras    / total) * 100}%` }} className="w-full bg-green-400" />}
              </div>
              <span className="text-[9px] text-gray-400">{MONTH_LABELS[(d.month - 1) % 12]}</span>
            </div>
          )
        })}
      </div>
      <div className="shrink-0 mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-400" />TVA</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-violet-400" />IS</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" />Patente</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-green-400" />RAS</span>
      </div>
    </div>
  )
}

function RegimeChangeBanner({ year }: { year: number }) {
  const { data: detection } = useRegimeDetection(year)
  const { data: config }    = useQuery({ queryKey: ['fiscal', 'config'], queryFn: fiscalApi.getConfig, staleTime: 5 * 60_000 })
  const confirm             = useConfirmRegime()

  if (!detection?.hasChanged || !config?.regimeChangeAlert) return null

  const REGIME_LABELS: Record<string, string> = {
    IGS: 'IGS', REEL_NORMAL: 'Réel Normal', REEL_SIMPLIFIE: 'Réel Simplifié', LIBERATOIRE: 'Libératoire',
  }

  return (
    <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-900">Changement de régime fiscal détecté</p>
        <p className="text-xs text-amber-800 truncate">
          {REGIME_LABELS[detection.currentRegime] ?? detection.currentRegime} → {REGIME_LABELS[detection.nextRegime] ?? detection.nextRegime} pour {year}
        </p>
      </div>
      <button onClick={() => confirm.mutate({ year, regime: detection.nextRegime })} disabled={confirm.isPending}
        className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
        {confirm.isPending ? '…' : 'Confirmer'}
      </button>
    </div>
  )
}

export function FiscalDashboard() {
  const year = new Date().getFullYear()
  const { data, isLoading } = useFiscalDashboard(year)
  const { fmt } = useCurrency()

  if (isLoading) {
    return (
      <div className="h-full flex flex-col gap-3">
        <div className="shrink-0 grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
        <div className="flex-1 min-h-0 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  if (!data) return null

  const { kpis, alerts, monthlyChart } = data

  return (
    <div className="h-full flex flex-col gap-3">

      <div className="shrink-0 flex items-center justify-between">
        <h1 className="text-base font-semibold text-gray-900">Tableau de bord fiscal</h1>
        <p className="text-xs text-gray-500">Exercice {year} — {data.country === 'CM' ? 'Cameroun · DGI' : 'France'}</p>
      </div>

      {data.country === 'CM' && <RegimeChangeBanner year={year} />}

      <div className="shrink-0 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          title="TVA à verser"
          value={kpis.tvaAPayer != null ? fmt(kpis.tvaAPayer) : '—'}
          sub={kpis.tvaDueDate ? `Échéance ${new Date(kpis.tvaDueDate).toLocaleDateString('fr-FR')}` : 'Aucune en attente'}
          {...(kpis.tvaAPayer != null ? { badge: { label: 'En attente', color: 'bg-amber-100 text-amber-700' } } : {})}
        />
        <KpiCard title="IS prévisionnel" value={fmt(kpis.isPrevisionnel)} sub={`Exercice ${kpis.isYear}`} />
        <KpiCard
          title={data.country === 'CM' ? `Patente ${year}` : `CFE ${year}`}
          value={kpis.patente != null ? fmt(kpis.patente) : '—'} sub=""
          {...(kpis.patenteStatus === 'PAID'   ? { badge: { label: 'Payée ✓', color: 'bg-green-100 text-green-700' } }
            : kpis.patenteStatus === 'PENDING' ? { badge: { label: 'À payer', color: 'bg-amber-100 text-amber-700' } }
            : {})}
        />
        <KpiCard
          title="Prochaine échéance"
          value={kpis.nextDeadlineDays != null ? `dans ${kpis.nextDeadlineDays} j` : '—'}
          sub={kpis.nextDeadlineLabel ?? ''}
          {...(kpis.nextDeadlineDays != null && kpis.nextDeadlineDays <= 7 ? { badge: { label: 'Urgent', color: 'bg-red-100 text-red-700' } } : {})}
        />
      </div>

      {alerts.length > 0 && (
        <div className="shrink-0 flex flex-col gap-1.5">
          {alerts.slice(0, 2).map((a, i) => (
            <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              a.level === 'error' ? 'border-red-200 bg-red-50 text-red-800'
              : a.level === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-green-200 bg-green-50 text-green-800'
            }`}>
              <span>{a.level === 'error' ? '🔴' : a.level === 'warning' ? '🟡' : '🟢'}</span>
              <span>{a.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 rounded-xl border border-gray-100 bg-white p-4 flex flex-col">
        <h2 className="shrink-0 mb-2 text-sm font-semibold text-gray-700">Charges fiscales {year} — 12 mois</h2>
        <BarChart data={monthlyChart} />
      </div>

    </div>
  )
}
