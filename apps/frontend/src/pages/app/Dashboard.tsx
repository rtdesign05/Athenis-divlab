import { useState, useMemo }      from 'react'
import { PeriodBar, MONTH_LABELS, getMonday, type PeriodMode } from '@/shared/components/ui/PeriodBar'
import { useQuery }               from '@tanstack/react-query'
import { useDashboardStats, useCashFlow, useReminders } from '@/hooks/useBilling'
import { getStats as getPurchaseStats } from '@/services/purchasesApi'
import { useLeaveStats, useEmployeeStats }              from '@/hooks/useHr'
import { useFiscalDashboard }                          from '@/hooks/useFiscal'
import { useEsgScore }                                 from '@/hooks/useEsg'
import { usePermissions }                              from '@/features/auth/usePermissions'
import { useCurrency }                                 from '@/hooks/useCurrency'
import { toSafeAmount }                                from '@/shared/utils/currency'
import { useTresorerie }                               from '@/contexts/TresorerieContext'
import { useAuth }                                     from '@/features/auth/useAuth'
import { AtheisId }                                    from '@/shared/components/ui/AtheisId'
import { ErrorBoundary }                               from '@/shared/components/feedback/ErrorBoundary'
import { api }                                         from '@/lib/api'
import type { CashFlowWeek }                           from '@/services/billingApi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface CRData {
  year: number
  produits: { chiffreAffaires: number; tvaCollectee: number; totalProduits: number }
  charges:  { chargesExploitation: number; masseSalariale: number; chargesTotal: number }
  resultatBrut: number
  margeNette:   number
}

// ── Hook: compte de résultat (silencieux si module indisponible) ───────────────

function useCompteResultat(year: number) {
  return useQuery<CRData>({
    queryKey: ['accounting', 'compte-resultat', year] as const,
    queryFn:  async () => {
      const r = await api.get<{ success: boolean; data: CRData }>(`/accounting/compte-de-resultat?year=${year}`)
      return r.data.data
    },
    retry:        false,
    staleTime:    5 * 60_000,
    // ne pas propager l'erreur si le module comptabilité n'est pas activé
  })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Kpi({ label, value, sub, accent }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode
  accent?: 'green' | 'red' | 'amber' | 'blue'
}) {
  const border =
    accent === 'red'   ? 'border-l-4 border-l-red-400'   :
    accent === 'amber' ? 'border-l-4 border-l-amber-400' :
    accent === 'green' ? 'border-l-4 border-l-green-400' : ''
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-3 ${border}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <div className="mt-0.5 text-[11px] text-gray-400">{sub}</div>}
    </div>
  )
}

function SectionCard({ title, icon, children }: {
  title: string; icon: string; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold text-gray-600 flex items-center gap-1.5">
        <span>{icon}</span>{title}
      </p>
      {children}
    </div>
  )
}

// ── Cash-flow chart (compact) ─────────────────────────────────────────────────

function CashFlowChart({ weeks }: { weeks: CashFlowWeek[] }) {
  const W = 660, H = 110
  const PAD = { t: 8, r: 10, b: 22, l: 40 }
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b
  const maxInc = Math.max(...weeks.map(w => w.expectedIncome), 1)
  const minCum = Math.min(...weeks.map(w => w.cumulative), 0)
  const maxCum = Math.max(...weeks.map(w => w.cumulative), 1)
  const range  = maxCum - minCum || 1
  const bW     = (iW / weeks.length) * 0.5
  const xPos   = (i: number) => PAD.l + (i + 0.5) * (iW / weeks.length)
  const yInc   = (v: number) => PAD.t + iH - (v / maxInc) * iH * 0.85
  const yCum   = (v: number) => PAD.t + iH - ((v - minCum) / range) * iH
  const pts    = weeks.map((w, i) => `${xPos(i)},${yCum(w.cumulative)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" role="img">
      {[0, 0.5, 1].map(t => {
        const y = PAD.t + t * iH, val = maxInc * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.l - 4} y={y + 3} fontSize="7" fill="#9ca3af" textAnchor="end">
              {val >= 1_000_000 ? `${(val/1_000_000).toFixed(1)}M` : val >= 1000 ? `${(val/1000).toFixed(0)}k` : val.toFixed(0)}
            </text>
          </g>
        )
      })}
      {weeks.map((w, i) => (
        <rect key={i} x={xPos(i) - bW/2} y={yInc(w.expectedIncome)}
          width={bW} height={Math.max(0, iH - (yInc(w.expectedIncome) - PAD.t))}
          fill="#4ade80" fillOpacity="0.65" rx="1.5" />
      ))}
      {weeks.map((w, i) => (
        <rect key={i} x={xPos(i) - bW/4} y={yInc(w.expectedExpenses)}
          width={bW/2} height={Math.max(0, iH - (yInc(w.expectedExpenses) - PAD.t))}
          fill="#f87171" fillOpacity="0.65" rx="1.5" />
      ))}
      <polyline points={pts} fill="none" stroke="#1d4ed8" strokeWidth="1.5" strokeLinejoin="round" />
      {weeks.map((w, i) => <circle key={i} cx={xPos(i)} cy={yCum(w.cumulative)} r="2" fill="#1d4ed8" />)}
      {weeks.map((w, i) => i % 2 === 0 ? (
        <text key={i} x={xPos(i)} y={H - 3} fontSize="7" fill="#9ca3af" textAnchor="middle">{w.label}</text>
      ) : null)}
    </svg>
  )
}

// ── SIG Card ──────────────────────────────────────────────────────────────────

function SigCard({
  label, value, sub, positive, loading,
}: {
  label: string; value: string; sub?: string; positive?: boolean; loading?: boolean
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold leading-tight ${
        loading ? 'text-gray-300' :
        positive === undefined ? 'text-gray-900' :
        positive ? 'text-emerald-700' : 'text-red-600'
      }`}>
        {loading ? '…' : value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Side-panel widgets ────────────────────────────────────────────────────────

function RelancesWidget() {
  const { fmt } = useCurrency()
  const { data } = useReminders()
  if (!data?.length) return null
  const top = [...data].sort((a, b) => (b.reminderLevel ?? 0) - (a.reminderLevel ?? 0)).slice(0, 3)
  return (
    <SectionCard title="Relances en attente" icon="⚠️">
      <ul className="space-y-1.5">
        {top.map(inv => (
          <li key={inv.id} className="flex items-center justify-between text-xs">
            <span className="truncate text-gray-700 max-w-[120px]">{inv.client?.name ?? inv.number}</span>
            <span className={`ml-1 shrink-0 font-medium ${(inv.reminderLevel ?? 0) >= 3 ? 'text-red-600' : (inv.reminderLevel ?? 0) === 2 ? 'text-amber-600' : 'text-blue-600'}`}>
              {fmt(inv.total)}
            </span>
          </li>
        ))}
      </ul>
      {data.length > 3 && (
        <p className="mt-1.5 text-[10px] text-gray-400">+{data.length - 3} autres</p>
      )}
    </SectionCard>
  )
}

function RhWidget({ modules }: { modules: string[] }) {
  const { fmt } = useCurrency()
  const statsQ  = useEmployeeStats()
  const leaveQ  = useLeaveStats()
  if (!modules.includes('rh')) return null
  const actifs  = statsQ.data?.active.count ?? 0
  const masse   = statsQ.data ? toSafeAmount(statsQ.data.active.totalMonthly) : 0
  const pending = leaveQ.data?.pending ?? 0
  return (
    <SectionCard title="Ressources humaines" icon="👥">
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <p className="text-base font-bold text-gray-900">{statsQ.isLoading ? '—' : actifs}</p>
          <p className="text-[10px] text-gray-400">Effectif</p>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-gray-900">{leaveQ.isLoading ? '—' : pending}</p>
          <p className="text-[10px] text-gray-400">Congés att.</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-bold text-gray-900 leading-tight">{statsQ.isLoading ? '—' : fmt(masse)}</p>
          <p className="text-[10px] text-gray-400">Masse sal.</p>
        </div>
      </div>
    </SectionCard>
  )
}

function FiscalWidget({ modules }: { modules: string[] }) {
  const year = new Date().getFullYear()
  const { data, isLoading } = useFiscalDashboard(year)
  if (!modules.includes('fiscalite')) return null
  const days  = data?.kpis.nextDeadlineDays
  const label = data?.kpis.nextDeadlineLabel ?? ''
  const urgent = days != null && days <= 7
  return (
    <SectionCard title="Fiscalité" icon="🏛️">
      {isLoading ? (
        <p className="text-xs text-gray-400">Chargement…</p>
      ) : data ? (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-600 truncate max-w-[120px]">{label || 'Aucune échéance'}</p>
          {days != null && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${urgent ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              {days === 0 ? "Aujourd'hui" : `dans ${days} j`}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">Aucune donnée</p>
      )}
    </SectionCard>
  )
}

function EsgWidget({ modules }: { modules: string[] }) {
  const year = new Date().getFullYear()
  const { data, isLoading, isError } = useEsgScore(year)
  if (!modules.includes('esg')) return null
  if (isError || (!isLoading && !data)) return null
  const score = data?.scores.global
  const color = score == null ? '#6b7280' : score >= 80 ? '#16a34a' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : '#dc2626'
  return (
    <SectionCard title="Score ESG" icon="🌿">
      {isLoading ? (
        <p className="text-xs text-gray-400">Calcul…</p>
      ) : (
        <div className="flex items-center gap-3">
          <p className="text-2xl font-black" style={{ color }}>{score ?? '—'}</p>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full transition-all" style={{ width: `${score ?? 0}%`, backgroundColor: color }} />
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-gray-400">
              <span>E: {data?.scores.environnement ?? '—'}</span>
              <span>S: {data?.scores.social ?? '—'}</span>
              <span>G: {data?.scores.gouvernance ?? '—'}</span>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

export function AppDashboard() {
  const { fmt }     = useCurrency()
  const { user }    = useAuth()
  const { modules } = usePermissions()

  const now         = new Date()
  const currentYear = now.getFullYear()

  // ── Period selector state ────────────────────────────────────────────────────
  const [selectedYear,  setSelectedYear]  = useState(currentYear)
  const [periodMode,    setPeriodMode]    = useState<PeriodMode>('full')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [weekStart,     setWeekStart]     = useState<Date>(() => getMonday(now))

  const { periodFrom, periodTo } = useMemo(() => {
    if (periodMode === 'full') {
      return {
        periodFrom: `${selectedYear}-01-01`,
        periodTo:   `${selectedYear}-12-31`,
      }
    }
    if (periodMode === 'month') {
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const mm      = String(selectedMonth).padStart(2, '0')
      return {
        periodFrom: `${selectedYear}-${mm}-01`,
        periodTo:   `${selectedYear}-${mm}-${String(lastDay).padStart(2, '0')}`,
      }
    }
    // week
    const sunday = new Date(weekStart.getTime() + 6 * 86_400_000)
    return {
      periodFrom: weekStart.toISOString().slice(0, 10),
      periodTo:   sunday.toISOString().slice(0, 10),
    }
  }, [selectedYear, periodMode, selectedMonth, weekStart])

  const periodParams = { from: periodFrom, to: periodTo }

  const { data: stats,    isLoading: stL } = useDashboardStats(periodParams)
  const { data: cashFlow, isLoading: cfL } = useCashFlow()
  const { data: reminders }                = useReminders()
  const { totalSolde }                     = useTresorerie()
  const { data: cr,       isLoading: crL } = useCompteResultat(selectedYear)
  // Achats et dettes fournisseurs — même période que les KPIs ventes.
  // staleTime=0 + refetchOnMount='always' : le KPI doit refléter immédiatement
  // toute saisie faite ailleurs (factures d'achat, commandes, paiements).
  const { data: purchaseStats, isLoading: psL } = useQuery({
    queryKey: ['purchases', 'stats', periodParams.from, periodParams.to] as const,
    queryFn:  () => getPurchaseStats(periodParams),
    staleTime:      0,
    refetchOnMount: 'always',
  })

  const firstName   = (user as { firstName?: string } | null)?.firstName || user?.email?.split('@')[0] || 'vous'
  const companyName = (user as { companyName?: string } | null)?.companyName ?? null
  const hasReminders = (reminders?.length ?? 0) > 0

  // ── SIG ─────────────────────────────────────────────────────────────────────
  // Préférer les données HT du compte de résultat si disponibles,
  // sinon utiliser dashboardStats (valeurs TTC, moins précises).
  const sig = (() => {
    if (cr) {
      const ca  = cr.produits.chiffreAffaires
      const va  = ca - cr.charges.chargesExploitation          // VA = CA - consommations intermédiaires
      const ebe = va - cr.charges.masseSalariale                // EBE = VA - charges de personnel
      const rn  = cr.resultatBrut                              // Résultat net (avant IS)
      return {
        ca,  va, ebe, rn,
        marge:    cr.margeNette,
        growth:   stats?.revenue.growth ?? null,
        fromCR:   true,
      }
    }
    if (stats) {
      const ca = stats.revenue.current
      const mb = stats.grossProfit.amount
      return {
        ca,  va: null, ebe: null, rn: mb,
        marge:   (stats.grossProfit.margin ?? 0) * 100,
        growth:  stats.revenue.growth,
        fromCR:  false,
      }
    }
    return null
  })()

  const loading = stL && crL

  return (
    <ErrorBoundary>
      <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Bonjour, {firstName}</h1>
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              {companyName && <>{companyName} · </>}
              {user?.atheisNumber && <AtheisId number={user.atheisNumber} size="sm" />}
              {user?.isRestricted && user?.agenceNom && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                  <span>🏢</span>{user.agenceNom}
                </span>
              )}
            </p>
          </div>
          <p className="text-xs text-gray-400">
            {now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── Sélecteur exercice / période ─────────────────────────────── */}
        <PeriodBar
          selectedYear={selectedYear}
          currentYear={currentYear}
          onYearChange={y => { setSelectedYear(y); if (periodMode === 'week') setWeekStart(getMonday(new Date(y, now.getMonth(), now.getDate()))) }}
          mode={periodMode}
          onModeChange={m => { setPeriodMode(m); if (m === 'week') setWeekStart(getMonday(now)) }}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          weekStart={weekStart}
          onWeekShift={dir => setWeekStart(prev => new Date(prev.getTime() + dir * 7 * 86_400_000))}
        />

        {/* ── KPI row ─────────────────────────────────────────────────────── */}
        <div className="shrink-0 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          <Kpi
            label={periodMode === 'full' ? 'CA exercice' : periodMode === 'month' ? `CA — ${MONTH_LABELS[selectedMonth - 1]}` : 'CA semaine'}
            value={stL ? '…' : fmt(stats?.revenue.current ?? 0)}
            sub={
              stats?.revenue.growth != null
                ? `${stats.revenue.growth >= 0 ? '▲' : '▼'} ${Math.abs(stats.revenue.growth).toFixed(1)}% vs N-1`
                : stats?.salesCount
                  ? `${stats.salesCount} facture${stats.salesCount > 1 ? 's' : ''} émise${stats.salesCount > 1 ? 's' : ''}`
                  : undefined
            }
            accent={stats?.revenue.growth != null && stats.revenue.growth >= 0 ? 'green' : 'red'}
          />
          <Kpi
            label={periodMode === 'full' ? 'Achats exercice' : periodMode === 'month' ? `Achats — ${MONTH_LABELS[selectedMonth - 1]}` : 'Achats semaine'}
            value={psL ? '…' : fmt(purchaseStats?.periodMontantHT ?? 0)}
            sub={purchaseStats?.periodCount
              ? `HT · ${purchaseStats.periodCount} pièce${purchaseStats.periodCount > 1 ? 's' : ''}`
              : 'Aucun achat sur la période'}
          />
          <Kpi
            label="Dettes fournisseurs"
            value={psL ? '…' : fmt(purchaseStats?.dettesFournisseurs ?? 0)}
            sub={purchaseStats?.dettesCount
              ? `${purchaseStats.dettesCount} facture${purchaseStats.dettesCount > 1 ? 's' : ''} à régler`
              : 'Aucune dette'}
            {...(purchaseStats?.dettesFournisseurs ? { accent: 'red' as const } : {})}
          />
          <Kpi
            label="Marge brute"
            value={stL ? '…' : stats?.grossProfit.margin != null ? `${(stats.grossProfit.margin * 100).toFixed(1)}%` : '—'}
            sub={stats ? fmt(stats.grossProfit.amount) : undefined}
          />
          <Kpi
            label="DSO"
            value={stL ? '…' : stats?.dso != null ? `${stats.dso} j` : '—'}
            sub="délai moyen de paiement"
          />
          <Kpi
            label="Encours clients"
            value={stL ? '…' : fmt(stats?.pendingAmount ?? 0)}
            sub={stats?.overdueAmount ? `${fmt(stats.overdueAmount)} en retard` : 'Aucun retard'}
            {...(stats?.overdueAmount ? { accent: 'red' as const } : {})}
          />
          <Kpi
            label="Trésorerie nette"
            value={fmt(totalSolde)}
            sub="solde consolidé actuel"
            accent={totalSolde > 0 ? 'green' : 'red'}
          />
        </div>

        {/* ── Main area ───────────────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">

          {/* Left column */}
          <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">

            {/* Graphique cash-flow — hauteur fixe, compact */}
            <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-3" style={{ height: 160 }}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold text-gray-700">
                  Trésorerie prévisionnelle — 90 jours
                </h2>
                {cashFlow && (
                  <span className={`text-xs font-semibold ${cashFlow.summary.netCashFlow >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    Solde net : {fmt(cashFlow.summary.netCashFlow)}
                  </span>
                )}
              </div>
              <div className="flex-1" style={{ height: 108 }}>
                {cfL
                  ? <div className="h-full animate-pulse rounded-lg bg-gray-100" />
                  : cashFlow
                  ? <CashFlowChart weeks={cashFlow.weeks} />
                  : <div className="h-full flex items-center justify-center text-xs text-gray-400">Aucune donnée de trésorerie</div>
                }
              </div>
              <div className="mt-1 flex gap-4 text-[10px] text-gray-400">
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-green-400/65" /> Revenus att.</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded bg-red-400/65" /> Dépenses</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 border-b-2 border-blue-700" /> Solde cumulé</span>
              </div>
            </div>

            {/* ── Soldes Intermédiaires de Gestion ──────────────────────── */}
            <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex items-center justify-between mb-2.5">
                <h2 className="text-xs font-semibold text-gray-700">
                  Soldes intermédiaires de gestion
                  <span className="ml-1.5 font-normal text-gray-400">{selectedYear}</span>
                </h2>
                {sig?.fromCR && (
                  <span className="text-[10px] text-gray-400">Données comptables HT</span>
                )}
                {sig && !sig.fromCR && (
                  <span className="text-[10px] text-amber-500">Données de facturation TTC</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {/* CA */}
                <SigCard
                  label="Chiffre d'affaires"
                  value={sig ? fmt(sig.ca) : '—'}
                  {...(sig?.growth != null ? { sub: `${sig.growth >= 0 ? '▲' : '▼'} ${Math.abs(sig.growth).toFixed(1)}% N-1` } : {})}
                  loading={loading}
                />

                {/* Valeur Ajoutée ou Marge brute */}
                {sig?.fromCR ? (
                  <SigCard
                    label="Valeur ajoutée"
                    value={sig.va !== null ? fmt(sig.va) : '—'}
                    sub="CA − consommations ext."
                    {...(sig.va !== null ? { positive: sig.va >= 0 } : {})}
                    loading={loading}
                  />
                ) : (
                  <SigCard
                    label="Marge brute"
                    value={sig ? fmt(sig.rn) : '—'}
                    sub="CA − charges d'exploit."
                    {...(sig ? { positive: sig.rn >= 0 } : {})}
                    loading={loading}
                  />
                )}

                {/* EBE */}
                {sig?.fromCR ? (
                  <SigCard
                    label="EBE"
                    value={sig.ebe !== null ? fmt(sig.ebe) : '—'}
                    sub="VA − charges personnel"
                    {...(sig.ebe !== null ? { positive: sig.ebe >= 0 } : {})}
                    loading={loading}
                  />
                ) : (
                  <SigCard
                    label="EBE"
                    value="—"
                    sub="Module comptabilité requis"
                  />
                )}

                {/* Résultat net */}
                <SigCard
                  label={sig?.fromCR ? 'Résultat net' : 'Résultat brut'}
                  value={sig ? fmt(sig.rn) : '—'}
                  sub={sig?.fromCR ? 'Avant impôt sur les bénéfices' : 'CA − total charges'}
                  {...(sig ? { positive: sig.rn >= 0 } : {})}
                  loading={loading}
                />

                {/* Taux de marge */}
                <SigCard
                  label="Taux de marge"
                  value={sig ? `${sig.marge >= 0 ? '+' : ''}${sig.marge.toFixed(1)} %` : '—'}
                  sub="Marge nette / CA"
                  {...(sig ? { positive: sig.marge >= 0 } : {})}
                  loading={loading}
                />
              </div>
            </div>

            {/* Activité ventes — card en bas (ancienne widget déplacée ici) */}
            <div className="shrink-0 rounded-xl border border-gray-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                <span>💹</span>Activité ventes
              </p>
              <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div>
                  <p className="text-lg font-bold text-gray-900">{stL ? '—' : stats?.pendingCount ?? 0}</p>
                  <p className="text-[10px] text-gray-400">Factures ouvertes</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${(stats?.overdueCount ?? 0) > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {stL ? '—' : stats?.overdueCount ?? 0}
                  </p>
                  <p className="text-[10px] text-gray-400">En retard</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-900">{stL ? '—' : fmt(stats?.pendingAmount ?? 0)}</p>
                  <p className="text-[10px] text-gray-400">Encours</p>
                </div>
                <div>
                  <p className={`text-sm font-bold leading-tight ${(stats?.overdueAmount ?? 0) > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {stL ? '—' : fmt(stats?.overdueAmount ?? 0)}
                  </p>
                  <p className="text-[10px] text-gray-400">Échus</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right — cross-module widgets */}
          <div className="w-56 shrink-0 flex flex-col gap-2.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {hasReminders && <RelancesWidget />}
            <RhWidget modules={modules} />
            <FiscalWidget modules={modules} />
            <EsgWidget modules={modules} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
