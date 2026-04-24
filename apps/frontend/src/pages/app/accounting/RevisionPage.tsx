import { useState } from 'react'
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
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('fr-FR')
}

// ── Anomaly modal ─────────────────────────────────────────────────────────────

interface AnomalyModalProps {
  account: ReviewedAccount
  year: number
  onClose: () => void
}

function AnomalyModal({ account, year, onClose }: AnomalyModalProps) {
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
              {markAnomaly.isPending ? 'Envoi…' : 'Signaler'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Resolve modal ─────────────────────────────────────────────────────────────

interface ResolveModalProps {
  account: ReviewedAccount
  year: number
  onClose: () => void
}

function ResolveModal({ account, year, onClose }: ResolveModalProps) {
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
            <span className="font-semibold">Anomalie :</span> {account.anomalyNote}
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
              {resolveAnomaly.isPending ? 'Résolution…' : 'Résoudre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Account row ───────────────────────────────────────────────────────────────

interface AccountRowProps {
  account: ReviewedAccount
  year: number
  isLast: boolean
}

function AccountRow({ account, year, isLast }: AccountRowProps) {
  const [anomalyOpen, setAnomalyOpen] = useState(false)
  const [resolveOpen, setResolveOpen] = useState(false)
  const reviewAccount   = useReviewAccount()
  const unreviewAccount = useUnreviewAccount()

  const soldeColor = account.solde < 0 ? 'text-red-600' : account.solde > 0 ? 'text-gray-900' : 'text-gray-400'

  return (
    <>
      <tr className={`group transition-colors hover:bg-gray-50/60 ${!isLast ? 'border-b border-gray-50' : ''}`}>
        <td className="px-4 py-3 font-mono text-xs text-gray-600">{account.number}</td>
        <td className="px-4 py-3 text-sm text-gray-800">{account.label}</td>
        <td className={`px-4 py-3 text-sm font-medium text-right ${soldeColor}`}>{fmt(account.solde)}</td>
        <td className="px-4 py-3"><StatusBadge status={account.status} /></td>
        <td className="px-4 py-3 text-xs text-gray-400">
          {account.reviewedBy && (
            <span title={account.reviewedAt ? fmtDate(account.reviewedAt) : undefined}>
              {account.reviewedBy}
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
                  Valider
                </button>
                <button
                  onClick={() => setAnomalyOpen(true)}
                  className="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors">
                  Anomalie
                </button>
              </>
            )}
            {account.status === 'REVIEWED' && !account.anomalyResolvedAt && (
              <button
                onClick={() => void unreviewAccount.mutateAsync({ accountNumber: account.number, year })}
                disabled={unreviewAccount.isPending}
                className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors">
                Annuler
              </button>
            )}
            {account.status === 'ANOMALY' && (
              <button
                onClick={() => setResolveOpen(true)}
                className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors">
                Résoudre
              </button>
            )}
          </div>
        </td>
      </tr>
      {account.anomalyNote && (
        <tr className="bg-red-50/50">
          <td colSpan={6} className="px-4 pb-2 pt-0">
            <div className="text-xs text-red-600 flex items-start gap-1.5">
              <span className="mt-0.5">⚠</span>
              <span><span className="font-medium">Anomalie :</span> {account.anomalyNote}</span>
              {account.resolutionNote && (
                <span className="ml-3 text-green-700"><span className="font-medium">Résolution :</span> {account.resolutionNote}</span>
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

interface CycleCardProps {
  cycle: ReviewCycle
  year: number
}

function CycleCard({ cycle, year }: CycleCardProps) {
  const [open, setOpen] = useState(false)

  const statusColor =
    cycle.cycleStatus === 'complete' ? 'border-green-200 bg-green-50' :
    cycle.cycleStatus === 'partial'  ? 'border-amber-200 bg-amber-50' :
    cycle.cycleStatus === 'na'       ? 'border-gray-100 bg-gray-50'   :
    'border-gray-200 bg-white'

  const badgeColor =
    cycle.cycleStatus === 'complete' ? 'bg-green-100 text-green-700' :
    cycle.cycleStatus === 'partial'  ? 'bg-amber-100 text-amber-700' :
    cycle.cycleStatus === 'na'       ? 'bg-gray-100 text-gray-500'   :
    'bg-gray-100 text-gray-500'

  const badgeLabel =
    cycle.cycleStatus === 'complete' ? 'Complet' :
    cycle.cycleStatus === 'partial'  ? 'En cours' :
    cycle.cycleStatus === 'na'       ? 'N/A'      :
    'Non révisé'

  return (
    <div className={`rounded-xl border ${statusColor} overflow-hidden transition-all`}>
      <button
        onClick={() => !cycle.isNA && setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
        disabled={cycle.isNA}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">C{cycle.id}</span>
            <span className="text-sm font-semibold text-gray-900">{cycle.name}</span>
            <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor}`}>{badgeLabel}</span>
          </div>
          {!cycle.isNA && (
            <div className="mt-2 flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${cycle.cycleStatus === 'complete' ? 'bg-green-500' : 'bg-amber-400'}`}
                  style={{ width: `${cycle.percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {cycle.reviewedCount}/{cycle.totalAccounts} comptes
                {cycle.anomalyCount > 0 && <span className="ml-1.5 text-red-500">· {cycle.anomalyCount} anomalie{cycle.anomalyCount > 1 ? 's' : ''}</span>}
              </span>
            </div>
          )}
        </div>
        {!cycle.isNA && (
          <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
        )}
      </button>

      {open && !cycle.isNA && (
        <div className="border-t border-gray-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                {['N° compte', 'Intitulé', 'Solde', 'Statut', 'Révisé par', 'Actions'].map(h => (
                  <th key={h} className={`px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === 'Solde' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cycle.accounts.map((acct, i) => (
                <AccountRow
                  key={acct.number}
                  account={acct}
                  year={year}
                  isLast={i === cycle.accounts.length - 1}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressPanel({ year }: { year: number }) {
  const { data: progress, isLoading } = useRevisionProgress(year)
  const markAll = useMarkAllReviewed()

  if (isLoading || !progress) return null

  const barColor = progress.canClose ? 'bg-green-500' : progress.percentage > 0 ? 'bg-amber-400' : 'bg-gray-300'

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-semibold text-gray-900">Avancement global</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${progress.canClose ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {progress.percentage}%
            </span>
            {progress.anomalies > 0 && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                {progress.anomalies} anomalie{progress.anomalies > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${progress.percentage}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">{progress.reviewed} / {progress.total} comptes révisés</p>
        </div>
        <button
          onClick={() => void markAll.mutateAsync(year)}
          disabled={markAll.isPending || progress.canClose}
          className="shrink-0 h-9 px-4 rounded-lg bg-forest-900 text-white text-xs font-medium hover:bg-forest-800 disabled:opacity-50 transition-colors">
          {markAll.isPending ? 'En cours…' : 'Tout valider'}
        </button>
      </div>

      {progress.blockingReasons.length > 0 && (
        <div className="mt-4 rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 space-y-1">
          <p className="text-xs font-semibold text-amber-800">Blocages avant clôture :</p>
          {progress.blockingReasons.map((r, i) => (
            <p key={i} className="text-xs text-amber-700">• {r}</p>
          ))}
        </div>
      )}

      {progress.canClose && (
        <div className="mt-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-xs font-semibold text-green-700">✓ Révision complète — la clôture est possible</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function RevisionPage() {
  const { selectedYear } = useFiscalYear()
  const { data: cycles, isLoading } = useRevisionCycles(selectedYear)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Révision comptable</h1>
        <p className="text-sm text-gray-500 mt-0.5">Exercice {selectedYear} — cycles SYSCOHADA</p>
      </div>

      <ProgressPanel year={selectedYear} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {(cycles ?? []).map(cycle => (
            <CycleCard key={cycle.id} cycle={cycle} year={selectedYear} />
          ))}
        </div>
      )}
    </div>
  )
}
