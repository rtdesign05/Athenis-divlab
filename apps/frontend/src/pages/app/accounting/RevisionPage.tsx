import { useState, useMemo } from 'react'
import { useFiscalYear } from '@/contexts/FiscalYearContext'
import {
  useRevisionCycles,
  useRevisionProgress,
  useReviewAccount,
  useUnreviewAccount,
  useMarkAnomaly,
  useResolveAnomaly,
  useMarkAllReviewed,
} from '@/hooks/useRevision'
import type { ReviewCycle, ReviewedAccount } from '@/services/revisionApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ReviewedAccount['status'] }) {
  if (status === 'REVIEWED')
    return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">✓ Révisé</span>
  if (status === 'ANOMALY')
    return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">⚠ Anomalie</span>
  return <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">— En attente</span>
}

function fmt(n: number) {
  const abs = Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n < 0 ? `(${abs})` : abs
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR')
}

// ── Anomaly modal ─────────────────────────────────────────────────────────────

function AnomalyModal({ account, year, onClose }: { account: ReviewedAccount; year: number; onClose: () => void }) {
  const [note, setNote] = useState('')
  const markAnomaly = useMarkAnomaly()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    await markAnomaly.mutateAsync({ accountNumber: account.number, year, anomalyNote: note })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Signaler une anomalie — Compte {account.number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={e => void handleSubmit(e)} className="p-6 space-y-4">
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm">
            <p className="font-medium text-gray-700">{account.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Solde : <span className={account.solde < 0 ? 'text-red-600 font-medium' : 'text-gray-700 font-medium'}>{fmt(account.solde)}</span>
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description de l'anomalie *</label>
            <textarea
              rows={4}
              required
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex : Solde débiteur anormal, pièce justificative manquante…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/30"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={!note.trim() || markAnomaly.isPending}
              className="flex-1 h-9 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">
              {markAnomaly.isPending ? 'Envoi…' : 'Signaler l\'anomalie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Resolve modal ─────────────────────────────────────────────────────────────

function ResolveModal({ account, year, onClose }: { account: ReviewedAccount; year: number; onClose: () => void }) {
  const [note, setNote] = useState('')
  const resolveAnomaly = useResolveAnomaly()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!note.trim()) return
    await resolveAnomaly.mutateAsync({ accountNumber: account.number, year, resolutionNote: note })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Résoudre l'anomalie — Compte {account.number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        {account.anomalyNote && (
          <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-xs text-red-700">
            <span className="font-semibold">Anomalie signalée :</span> {account.anomalyNote}
          </div>
        )}
        <form onSubmit={e => void handleSubmit(e)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Note de résolution *</label>
            <textarea
              rows={4}
              required
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Ex : Pièce retrouvée et intégrée, écriture de régularisation passée…"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-400/30"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 h-9 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={!note.trim() || resolveAnomaly.isPending}
              className="flex-1 h-9 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60 transition-colors">
              {resolveAnomaly.isPending ? 'Résolution…' : 'Résoudre l\'anomalie'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Account row ───────────────────────────────────────────────────────────────

function AccountRow({ account, year, isLast }: { account: ReviewedAccount; year: number; isLast: boolean }) {
  const [anomalyOpen, setAnomalyOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const reviewAccount   = useReviewAccount()
  const unreviewAccount = useUnreviewAccount()

  const soldeColor = account.solde < 0 ? 'text-red-600' : account.solde === 0 ? 'text-gray-400' : 'text-gray-800'

  return (
    <>
      <tr className={`group transition-colors hover:bg-gray-50/60 ${!isLast ? 'border-b border-gray-50' : ''}`}>
        <td className="px-4 py-3 font-mono text-xs text-gray-500">{account.number}</td>
        <td className="px-4 py-3 text-sm text-gray-800 max-w-[260px] truncate" title={account.label}>{account.label}</td>
        <td className={`px-4 py-3 text-sm font-medium text-right tabular-nums ${soldeColor}`}>
          {fmt(account.solde)}
        </td>
        <td className="px-4 py-3"><StatusBadge status={account.status} /></td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {account.reviewedBy && (
            <span title={account.reviewedAt ? fmtDate(account.reviewedAt) : undefined}>
              {account.reviewedBy.split('@')[0]}
              {account.reviewedAt && <span className="ml-1 text-gray-300">· {fmtDate(account.reviewedAt)}</span>}
            </span>
          )}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {account.status === 'PENDING' && (
              <>
                <button
                  onClick={() => void reviewAccount.mutateAsync({ accountNumber: account.number, year })}
                  disabled={reviewAccount.isPending}
                  className="px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 disabled:opacity-50 transition-colors">
                  ✓ Valider
                </button>
                <button
                  onClick={() => setAnomalyOpen(true)}
                  className="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors">
                  ⚠ Anomalie
                </button>
              </>
            )}
            {account.status === 'REVIEWED' && !account.anomalyNote && (
              <button
                onClick={() => void unreviewAccount.mutateAsync({ accountNumber: account.number, year })}
                disabled={unreviewAccount.isPending}
                className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-500 text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors">
                ↩ Annuler
              </button>
            )}
            {account.status === 'ANOMALY' && (
              <button
                onClick={() => setResolveOpen(true)}
                className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors">
                ✓ Résoudre
              </button>
            )}
          </div>
        </td>
      </tr>
      {/* Anomaly/resolution notes row */}
      {(account.anomalyNote || account.resolutionNote) && (
        <tr className={account.status === 'ANOMALY' ? 'bg-red-50/40' : 'bg-green-50/40'}>
          <td colSpan={6} className="px-4 pb-2 pt-0.5">
            <div className="flex items-start gap-4 text-xs">
              {account.anomalyNote && (
                <span className="flex items-start gap-1 text-red-600">
                  <span className="mt-0.5 shrink-0">⚠</span>
                  <span><span className="font-semibold">Anomalie :</span> {account.anomalyNote}</span>
                </span>
              )}
              {account.resolutionNote && (
                <span className="flex items-start gap-1 text-green-700">
                  <span className="mt-0.5 shrink-0">✓</span>
                  <span><span className="font-semibold">Résolution :</span> {account.resolutionNote}</span>
                </span>
              )}
            </div>
          </td>
        </tr>
      )}
      {anomalyOpen && <AnomalyModal account={account} year={year} onClose={() => setAnomalyOpen(false)} />}
      {resolveOpen && <ResolveModal account={account} year={year} onClose={() => setResolveOpen(false)} />}
    </>
  )
}

// ── Cycle card ────────────────────────────────────────────────────────────────

function CycleCard({
  cycle, year, search, filterStatus,
}: {
  cycle:        ReviewCycle
  year:         number
  search:       string
  filterStatus: string
}) {
  const [open, setOpen] = useState(false)

  // Filter accounts by search + status
  const filteredAccounts = useMemo(() => {
    let accounts = cycle.accounts
    if (search) {
      const q = search.toLowerCase()
      accounts = accounts.filter(a =>
        a.number.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q),
      )
    }
    if (filterStatus !== 'all') {
      accounts = accounts.filter(a => a.status === filterStatus)
    }
    return accounts
  }, [cycle.accounts, search, filterStatus])

  // Auto-open if search/filter matches accounts inside
  const hasMatch = filteredAccounts.length > 0

  const statusColor =
    cycle.cycleStatus === 'complete' ? 'border-green-200 bg-green-50/60' :
    cycle.cycleStatus === 'partial'  ? 'border-amber-200 bg-amber-50/60' :
    cycle.cycleStatus === 'na'       ? 'border-gray-100 bg-gray-50'     :
    'border-gray-200 bg-white'

  const badgeColor =
    cycle.cycleStatus === 'complete' ? 'bg-green-100 text-green-700' :
    cycle.cycleStatus === 'partial'  ? 'bg-amber-100 text-amber-700' :
    cycle.cycleStatus === 'na'       ? 'bg-gray-100 text-gray-500'   :
    'bg-gray-100 text-gray-500'

  const badgeLabel =
    cycle.cycleStatus === 'complete' ? 'Complet' :
    cycle.cycleStatus === 'partial'  ? 'En cours' :
    cycle.cycleStatus === 'na'       ? 'N/A (aucune écriture)' :
    'Non révisé'

  if (cycle.cycleStatus === 'na') return null  // Hide empty cycles by default

  return (
    <div className={`rounded-xl border ${statusColor} overflow-hidden transition-all`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        {/* Cycle id badge */}
        <div className="shrink-0 h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
          C{cycle.id}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{cycle.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>{badgeLabel}</span>
            {cycle.anomalyCount > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {cycle.anomalyCount} anomalie{cycle.anomalyCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${cycle.cycleStatus === 'complete' ? 'bg-green-500' : 'bg-amber-400'}`}
                style={{ width: `${cycle.percentage}%` }}
              />
            </div>
            <span className="shrink-0 text-xs text-gray-500">
              {cycle.reviewedCount}/{cycle.totalAccounts} comptes
            </span>
          </div>
        </div>

        <span className="shrink-0 text-gray-400 text-sm transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-white">
          {filteredAccounts.length === 0 ? (
            <p className="px-5 py-4 text-sm text-gray-400 text-center">
              {search || filterStatus !== 'all' ? 'Aucun compte correspond aux filtres.' : 'Aucun compte dans ce cycle.'}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/80">
                <tr>
                  {['N° compte', 'Intitulé', 'Solde', 'Statut', 'Révisé par', 'Actions'].map(h => (
                    <th key={h} className={`px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Solde' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((acct, i) => (
                  <AccountRow
                    key={acct.number}
                    account={acct}
                    year={year}
                    isLast={i === filteredAccounts.length - 1}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Auto-open cycle if search matches and it's currently closed */}
      {hasMatch && (search || filterStatus !== 'all') && !open && (
        <button
          onClick={() => setOpen(true)}
          className="w-full text-center py-2 text-xs text-[#1b4332] font-medium hover:underline border-t border-gray-100 bg-white"
        >
          Voir {filteredAccounts.length} compte{filteredAccounts.length > 1 ? 's' : ''} correspondant{filteredAccounts.length > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}

// ── Progress panel ────────────────────────────────────────────────────────────

function ProgressPanel({ year }: { year: number }) {
  const { data: progress, isLoading } = useRevisionProgress(year)
  const markAll = useMarkAllReviewed()

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse h-24" />
    )
  }
  if (!progress) return null

  const { percentage, reviewed, total, anomalies, canClose, blockingReasons } = progress
  const barColor = canClose ? 'bg-green-500' : percentage > 0 ? 'bg-amber-400' : 'bg-gray-300'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">Avancement global</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${canClose ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {percentage}%
            </span>
            <span className="text-xs text-gray-500">{reviewed} / {total} comptes révisés</span>
            {anomalies > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {anomalies} anomalie{anomalies > 1 ? 's' : ''} ouverte{anomalies > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => void markAll.mutateAsync(year)}
          disabled={markAll.isPending || canClose}
          className="shrink-0 h-9 px-4 rounded-lg bg-[#1b4332] text-white text-xs font-medium hover:bg-[#1b4332]/90 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          {markAll.isPending ? 'En cours…' : '✓ Tout valider'}
        </button>
      </div>

      {/* Blocking reasons */}
      {blockingReasons.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-800 mb-1">Blocages avant clôture :</p>
          {blockingReasons.map((r, i) => (
            <p key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
              <span className="mt-0.5 shrink-0">•</span>{r}
            </p>
          ))}
        </div>
      )}

      {/* Ready to close */}
      {canClose && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <p className="text-xs font-semibold text-green-700">Révision complète — la clôture de l'exercice est possible</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RevisionPage() {
  const { selectedYear }                          = useFiscalYear()
  const { data: cycles, isLoading, isError }      = useRevisionCycles(selectedYear)
  const [search,       setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]           = useState<'all' | 'PENDING' | 'REVIEWED' | 'ANOMALY'>('all')
  const [showNA,       setShowNA]                 = useState(false)

  // Total account counts for status filter badges
  const allAccounts = useMemo(() =>
    (cycles ?? []).flatMap(c => c.accounts),
    [cycles],
  )
  const pendingCount  = allAccounts.filter(a => a.status === 'PENDING').length
  const reviewedCount = allAccounts.filter(a => a.status === 'REVIEWED').length
  const anomalyCount  = allAccounts.filter(a => a.status === 'ANOMALY').length

  // Decide which cycles to show
  const visibleCycles = useMemo(() => {
    if (!cycles) return []
    return cycles.filter(c => showNA ? true : !c.isNA)
  }, [cycles, showNA])

  const naCycleCount = (cycles ?? []).filter(c => c.isNA).length

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Révision comptable</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Exercice {selectedYear} — 9 cycles SYSCOHADA
          </p>
        </div>
      </div>

      {/* Progress panel */}
      <ProgressPanel year={selectedYear} />

      {/* Search + filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un compte…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5">
          {([
            { key: 'all',      label: 'Tous' },
            { key: 'PENDING',  label: `En attente${pendingCount > 0 ? ` (${pendingCount})` : ''}` },
            { key: 'REVIEWED', label: `Révisés${reviewedCount > 0 ? ` (${reviewedCount})` : ''}` },
            { key: 'ANOMALY',  label: `Anomalies${anomalyCount > 0 ? ` (${anomalyCount})` : ''}` },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                filterStatus === key
                  ? key === 'ANOMALY' ? 'bg-red-600 text-white' :
                    key === 'REVIEWED' ? 'bg-green-600 text-white' :
                    'bg-[#1b4332] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cycle list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          Impossible de charger les cycles de révision. Vérifiez la connexion au serveur.
        </div>
      ) : allAccounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10.5V5a2 2 0 012-2h14a2 2 0 012 2v5.5" />
          </svg>
          <p className="text-sm font-medium">Aucune écriture pour l'exercice {selectedYear}</p>
          <p className="text-xs text-gray-400">Saisissez des écritures dans le journal pour démarrer la révision.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visibleCycles.map(cycle => (
              <CycleCard
                key={cycle.id}
                cycle={cycle}
                year={selectedYear}
                search={search}
                filterStatus={filterStatus}
              />
            ))}
          </div>

          {/* Toggle N/A cycles */}
          {naCycleCount > 0 && (
            <button
              onClick={() => setShowNA(v => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 underline-offset-2 hover:underline transition-colors"
            >
              {showNA
                ? `Masquer les cycles sans écriture (${naCycleCount})`
                : `Afficher les cycles sans écriture (${naCycleCount})`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
