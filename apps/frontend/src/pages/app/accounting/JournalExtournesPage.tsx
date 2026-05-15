import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import type { JournalEntryRow, FiscalYear } from '@/services/accountingApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Math.round(n))
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function formatDateFR(s: string): string {
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const JOURNAL_COLOR: Record<string, string> = {
  VTE: 'bg-green-100 text-green-700',
  ACH: 'bg-red-100 text-red-700',
  BQ:  'bg-blue-100 text-blue-700',
  BNQ: 'bg-blue-100 text-blue-700',
  CAI: 'bg-yellow-100 text-yellow-700',
  OD:  'bg-purple-100 text-purple-700',
}

// ── Extourne Modal ────────────────────────────────────────────────────────────

interface ExtourneModalProps {
  entries:    JournalEntryRow[]     // all entries of the same pieceId
  fyId:       string
  fiscalYear: FiscalYear | null     // for date validation
  onSuccess:  () => void
  onClose:    () => void
}

/** Suggests Jan 1 of the year AFTER the fiscal year — recommended SYSCOHADA/PCG practice. */
function suggestExtourneDate(fy: FiscalYear | null): string {
  if (!fy) return todayISO()
  const nextYear = fy.year + 1
  return `${nextYear}-01-01`
}

function ExtourneModal({ entries, fyId, fiscalYear, onSuccess, onClose }: ExtourneModalProps) {
  const [date, setDate] = useState(() => suggestExtourneDate(fiscalYear))
  const [done, setDone] = useState(false)

  // ── Date validation relative to fiscal year ────────────────────────────────
  const fyStart = fiscalYear ? new Date(fiscalYear.startDate) : null
  const fyEnd   = fiscalYear ? new Date(fiscalYear.endDate)   : null
  const selectedDate = date ? new Date(date) : null

  const isBeforeFY = selectedDate && fyStart && selectedDate < fyStart
  const isAfterFY  = selectedDate && fyEnd   && selectedDate > fyEnd
  const isOutsideFY = !!(isBeforeFY || isAfterFY)
  const isNextYear = selectedDate && fiscalYear && selectedDate.getFullYear() === fiscalYear.year + 1

  const qc = useQueryClient()
  const { mutate: createBatch, isPending } = useMutation({
    mutationFn: (data: Parameters<typeof accountingApi.createJournalEntryBatch>[0]) =>
      accountingApi.createJournalEntryBatch(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', fyId] })
      setDone(true)
      setTimeout(() => { onSuccess(); onClose() }, 1200)
    },
  })

  // The extourne swaps debit↔credit for each line
  const extourneLines = entries.map(e => ({
    compte:  e.account,
    libelle: `Extourne — ${e.label}`,
    debit:   e.credit,   // swap
    credit:  e.debit,    // swap
  }))

  const originalRef = entries[0]?.reference ?? entries[0]?.pieceId ?? '?'

  function handleConfirm() {
    createBatch({
      fiscalYearId: fyId,
      date,
      journal:   entries[0]?.journalCode ?? 'OD',
      reference: `EXT-${originalRef}`,
      lines:     extourneLines,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Créer une extourne</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Contre-passation de la pièce {originalRef} ({entries.length} ligne{entries.length !== 1 ? 's' : ''})
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-4xl mb-2">✅</p>
              <p className="text-sm font-semibold text-green-700">Extourne créée avec succès</p>
            </div>
          ) : (
            <>
              {/* Date picker */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">Date de l'extourne</label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      isOutsideFY
                        ? 'border-amber-400 focus:ring-amber-400/30'
                        : 'border-gray-200 focus:ring-forest-500/30'
                    }`}
                  />
                  {fiscalYear && (
                    <button
                      type="button"
                      onClick={() => setDate(suggestExtourneDate(fiscalYear))}
                      className="text-xs text-forest-700 underline hover:text-forest-900"
                    >
                      ← 1 jan. {fiscalYear.year + 1} (recommandé)
                    </button>
                  )}
                </div>

                {/* Validation messages */}
                {isOutsideFY && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    ⚠️ Cette date est en dehors de l'exercice {fiscalYear?.year} ({fiscalYear?.startDate?.slice(0,10)} – {fiscalYear?.endDate?.slice(0,10)}).
                    L'extourne sera enregistrée dans l'exercice de la date choisie.
                  </div>
                )}
                {isNextYear && !isOutsideFY && (
                  <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                    ✅ Bonne pratique SYSCOHADA/PCG : extourne au 1er janvier {fiscalYear?.year + 1} pour régulariser l'exercice {fiscalYear?.year}.
                  </div>
                )}
                {!isOutsideFY && !isNextYear && (
                  <p className="text-xs text-gray-400">
                    💡 Conseil : datez l'extourne au 1er janvier {fiscalYear ? fiscalYear.year + 1 : 'N+1'} selon les normes comptables.
                  </p>
                )}
              </div>

              {/* Preview table */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Écritures qui seront créées</p>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr className="text-gray-500 uppercase tracking-wide">
                        <th className="px-3 py-2 text-left">Compte</th>
                        <th className="px-3 py-2 text-left">Libellé</th>
                        <th className="px-3 py-2 text-right">Débit</th>
                        <th className="px-3 py-2 text-right">Crédit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {extourneLines.map((line, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-700">{line.compte}</td>
                          <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{line.libelle}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">
                            {line.debit > 0 ? fmt(line.debit) : ''}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-gray-800">
                            {line.credit > 0 ? fmt(line.credit) : ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                ⚠️ L'extourne inversera les débits et crédits de la pièce d'origine. Cette opération ne peut pas être annulée automatiquement.
              </div>

              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={handleConfirm} disabled={isPending}
                  className="flex-1 rounded-lg bg-forest-900 py-2 text-sm font-medium text-white hover:bg-forest-800 disabled:opacity-60">
                  {isPending ? 'Création…' : 'Confirmer l\'extourne'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function JournalExtournesPage() {
  const fy  = useSelectedFiscalYearData()
  const { data: years } = useFiscalYears()

  const [selectedFyId, setSelectedFyId] = useState<string | null>(null)
  const fyId = selectedFyId ?? fy?.id ?? null

  // Resolve the full FiscalYear object for the active fyId
  const activeFY = useMemo(() => {
    if (!years || !fyId) return null
    return years.find(y => y.id === fyId) ?? null
  }, [years, fyId])

  const { data: journal, isLoading } = useQuery({
    queryKey: ['journal', fyId],
    queryFn:  () => accountingApi.getJournal(fyId!),
    enabled:  !!fyId,
    staleTime: 30_000,
  })

  const [extourning, setExtourning] = useState<JournalEntryRow[] | null>(null)
  const [journalFilter, setJournalFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  // Group entries by pieceId (a "pièce" is a set of balanced lines)
  const pieces = useMemo(() => {
    if (!journal) return []
    const map = new Map<string, JournalEntryRow[]>()
    for (const e of journal.entries) {
      const key = e.pieceId ?? e.id
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    // Sort pieces by date descending
    return [...map.entries()]
      .map(([id, entries]) => ({ id, entries, date: entries[0]!.date, journal: entries[0]!.journalCode }))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [journal])

  const journals = useMemo(() => {
    const codes = new Set(pieces.map(p => p.journal))
    return [...codes].sort()
  }, [pieces])

  const filtered = pieces.filter(p => {
    if (journalFilter !== 'ALL' && p.journal !== journalFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const match = p.entries.some(e =>
        e.label.toLowerCase().includes(s) ||
        e.account.toLowerCase().includes(s) ||
        (e.reference ?? '').toLowerCase().includes(s)
      )
      if (!match) return false
    }
    return true
  })

  if (!fyId) {
    return (
      <div className="flex items-center justify-center py-32 text-sm text-gray-400">
        Aucun exercice fiscal sélectionné
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Extournes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Contre-passation d'écritures comptables — sélectionnez une pièce pour créer son extourne
          </p>
        </div>

        {years && years.length > 0 && (
          <select
            value={fyId ?? ''}
            onChange={e => setSelectedFyId(e.target.value || null)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500/30"
          >
            {years.map(y => (
              <option key={y.id} value={y.id}>Exercice {y.year} — {y.status}</option>
            ))}
          </select>
        )}
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Qu'est-ce qu'une extourne ?</strong> Une extourne inverse les débits et crédits d'une écriture existante.
        Elle est utilisée pour annuler une provision, une charge à payer ou une régularisation de fin de période.
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-3 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher libellé, compte, référence…"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-forest-500/30" />
        <select value={journalFilter} onChange={e => setJournalFilter(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none">
          <option value="ALL">Tous journaux</option>
          {journals.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} pièce{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Pieces table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-3xl mb-2">📒</p>
            <p className="text-sm font-semibold text-gray-500">Aucune pièce comptable</p>
            <p className="text-xs text-gray-400 mt-1">Saisissez des écritures dans le journal pour les voir ici</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Journal</th>
                  <th className="px-4 py-2.5 text-left">Référence</th>
                  <th className="px-4 py-2.5 text-left">Libellé (1re ligne)</th>
                  <th className="px-4 py-2.5 text-right">Total débit</th>
                  <th className="px-4 py-2.5 text-right">Total crédit</th>
                  <th className="px-4 py-2.5 text-center">Lignes</th>
                  <th className="px-4 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(p => {
                  const totalDebit  = p.entries.reduce((s, e) => s + e.debit, 0)
                  const totalCredit = p.entries.reduce((s, e) => s + e.credit, 0)
                  const firstLabel  = p.entries[0]?.label ?? '—'
                  const ref         = p.entries[0]?.reference ?? p.id.slice(0, 8)

                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateFR(p.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${JOURNAL_COLOR[p.journal] ?? 'bg-gray-100 text-gray-600'}`}>
                          {p.journal}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{ref}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[220px] truncate text-xs">{firstLabel}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(totalDebit)}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(totalCredit)}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{p.entries.length}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setExtourning(p.entries)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors font-medium"
                        >
                          ↩ Extourner
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        💡 Bonne pratique : créez les extournes en début d'exercice suivant (janvier N+1) pour régulariser les charges à payer ou produits à recevoir de N.
      </p>

      {extourning && fyId && (
        <ExtourneModal
          entries={extourning}
          fyId={fyId}
          fiscalYear={activeFY}
          onSuccess={() => {}}
          onClose={() => setExtourning(null)}
        />
      )}
    </div>
  )
}
