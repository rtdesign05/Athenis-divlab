import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import type { JournalEntryRow } from '@/services/accountingApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0 }).format(Math.round(n))
}

function isLettrageAccount(compte: string): boolean {
  // Comptes de tiers : classes 4 (fournisseurs 401, clients 411, etc.)
  // and certain class 5 bank entries
  const trimmed = compte.replace(/\s/g, '')
  return trimmed.startsWith('4') || trimmed.startsWith('41') || trimmed.startsWith('40')
}

function nextLetterCode(existing: string[]): string {
  const used = new Set(existing)
  for (let i = 65; i <= 90; i++) {
    const code = String.fromCharCode(i)
    if (!used.has(code)) return code
  }
  // Double letters AA, AB, ...
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const code = String.fromCharCode(i) + String.fromCharCode(j)
      if (!used.has(code)) return code
    }
  }
  return '??'
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lettrage {
  code:    string
  entries: string[]    // list of entry ids
}

// ── Row component ─────────────────────────────────────────────────────────────

interface RowProps {
  entry:      JournalEntryRow
  letCode:    string | null
  selected:   boolean
  onToggle:   () => void
  isReadOnly: boolean
}

function EntryRow({ entry, letCode, selected, onToggle, isReadOnly }: RowProps) {
  const d = new Date(entry.date)
  const dateFmt = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })

  return (
    <tr
      className={`transition-colors ${
        letCode        ? 'bg-green-50/60'
        : selected     ? 'bg-blue-50'
        : 'hover:bg-gray-50'
      }`}
      onClick={isReadOnly || !!letCode ? undefined : onToggle}
      style={{ cursor: isReadOnly || !!letCode ? 'default' : 'pointer' }}
    >
      {/* Checkbox */}
      <td className="px-3 py-2.5 w-8">
        {!letCode && !isReadOnly && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={e => e.stopPropagation()}
            className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
          />
        )}
      </td>

      {/* Lettrage code */}
      <td className="px-3 py-2.5 text-center w-12">
        {letCode && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">
            {letCode}
          </span>
        )}
      </td>

      <td className="px-3 py-2.5 text-xs text-gray-400">{dateFmt}</td>
      <td className="px-3 py-2.5">
        <span className="text-xs px-2 py-0.5 rounded-full font-mono font-medium bg-gray-100 text-gray-600">
          {entry.journalCode}
        </span>
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-gray-700">{entry.account}</td>
      <td className="px-3 py-2.5 text-xs text-gray-700 max-w-xs truncate">{entry.label}</td>
      <td className="px-3 py-2.5 text-right font-medium text-gray-800">
        {entry.debit > 0 ? fmt(entry.debit) : ''}
      </td>
      <td className="px-3 py-2.5 text-right font-medium text-gray-800">
        {entry.credit > 0 ? fmt(entry.credit) : ''}
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function JournalLettragehPage() {
  const fy = useSelectedFiscalYearData()
  const { data: years } = useFiscalYears()
  const qc = useQueryClient()

  const [selectedFyId, setSelectedFyId] = useState<string | null>(null)

  const fyId = selectedFyId ?? fy?.id ?? null

  const { data: journal, isLoading } = useQuery({
    queryKey: ['journal', fyId],
    queryFn:  () => accountingApi.getJournal(fyId!),
    enabled:  !!fyId,
    staleTime: 30_000,
  })

  const [selected,  setSelected]  = useState<Set<string>>(new Set())
  const [accountFilter, setAccountFilter] = useState('')
  const [showOnlyUnlettered, setShowOnlyUnlettered] = useState(true)
  const [lettrageError, setLettrageError] = useState<string | null>(null)

  // ── Mutations ────────────────────────────────────────────────────────────────

  const { mutate: doSetLettrage, isPending: isLettering } = useMutation({
    mutationFn: ({ entryIds, code }: { entryIds: string[]; code: string }) =>
      accountingApi.setLettrage(entryIds, code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', fyId] })
      setSelected(new Set())
      setLettrageError(null)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setLettrageError(msg ?? 'Erreur lors du lettrage')
    },
  })

  const { mutate: doDeleteLettrage, isPending: isUnlettering } = useMutation({
    mutationFn: (code: string) => accountingApi.deleteLettrage(code, fyId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journal', fyId] })
      setLettrageError(null)
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setLettrageError(msg ?? 'Erreur lors du délettrage')
    },
  })

  // ── Derived state ────────────────────────────────────────────────────────────

  // Entries that are candidates for lettrage (class 4 accounts)
  const candidates = useMemo(() => {
    if (!journal) return []
    return journal.entries.filter(e => isLettrageAccount(e.account))
  }, [journal])

  // Build lettrage map from actual entry.lettrage field (from DB)
  const letMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of candidates) {
      if (e.lettrage) m.set(e.id, e.lettrage)
    }
    return m
  }, [candidates])

  // Unique lettrage codes currently in use
  const activeLettrages = useMemo((): Lettrage[] => {
    const byCode = new Map<string, string[]>()
    for (const [id, code] of letMap.entries()) {
      if (!byCode.has(code)) byCode.set(code, [])
      byCode.get(code)!.push(id)
    }
    return [...byCode.entries()].map(([code, entries]) => ({ code, entries }))
  }, [letMap])

  // Filter displayed entries
  const displayed = useMemo(() => {
    return candidates.filter(e => {
      const isLettered = letMap.has(e.id)
      if (showOnlyUnlettered && isLettered) return false
      if (accountFilter) {
        const trimmed = accountFilter.replace(/\s/g, '')
        if (!e.account.replace(/\s/g, '').startsWith(trimmed)) return false
      }
      return true
    })
  }, [candidates, letMap, showOnlyUnlettered, accountFilter])

  // Stats
  const letteredCount   = candidates.filter(e => letMap.has(e.id)).length
  const unletteredCount = candidates.length - letteredCount

  // Selected entries info
  const selEntries    = [...selected].map(id => candidates.find(e => e.id === id)).filter(Boolean) as JournalEntryRow[]
  const selDebitTotal  = selEntries.reduce((s, e) => s + e.debit, 0)
  const selCreditTotal = selEntries.reduce((s, e) => s + e.credit, 0)
  const isBalanced     = Math.abs(selDebitTotal - selCreditTotal) < 0.01

  function toggleEntry(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleLetter() {
    if (selected.size < 2) return
    // Use next available letter code (not already used in this FY)
    const code = nextLetterCode(activeLettrages.map(l => l.code))
    doSetLettrage({ entryIds: [...selected], code })
  }

  function handleUnletter(code: string) {
    if (!fyId) return
    doDeleteLettrage(code)
  }

  function clearSelection() {
    setSelected(new Set())
  }

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
      {/* Error banner */}
      {lettrageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>⚠️ {lettrageError}</span>
          <button onClick={() => setLettrageError(null)} className="text-red-500 hover:text-red-700 text-lg leading-none">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lettrage des comptes</h1>
          <p className="mt-1 text-sm text-gray-500">Rapprochement des écritures clients et fournisseurs (comptes de classe 4)</p>
        </div>

        {/* Fiscal year selector */}
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

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Écritures tiers</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{candidates.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Lettrées</p>
          <p className="text-2xl font-bold text-green-700 mt-1">{letteredCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">À lettrer</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{unletteredCount}</p>
        </div>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className={`rounded-xl border px-4 py-3 flex items-center gap-4 ${
          isBalanced ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
        }`}>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${isBalanced ? 'text-green-800' : 'text-amber-800'}`}>
              {selected.size} écriture{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Débit : {fmt(selDebitTotal)} · Crédit : {fmt(selCreditTotal)}
              {isBalanced
                ? <span className="ml-2 text-green-600 font-medium">✓ Équilibrées</span>
                : <span className="ml-2 text-amber-600">⚠ Écart : {fmt(Math.abs(selDebitTotal - selCreditTotal))}</span>
              }
            </p>
          </div>
          <button onClick={clearSelection}
            className="text-xs text-gray-500 hover:text-gray-700 underline">
            Désélectionner
          </button>
          <button
            onClick={handleLetter}
            disabled={selected.size < 2 || isLettering}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selected.size >= 2 && !isLettering
                ? 'bg-green-700 text-white hover:bg-green-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLettering ? 'Lettrage…' : 'Lettrer la sélection'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">Compte</label>
          <input
            value={accountFilter}
            onChange={e => setAccountFilter(e.target.value)}
            placeholder="411, 401…"
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showOnlyUnlettered}
            onChange={e => setShowOnlyUnlettered(e.target.checked)}
            className="rounded border-gray-300 text-forest-600 focus:ring-forest-500"
          />
          <span className="text-xs text-gray-600">Masquer les écritures lettrées</span>
        </label>
        {activeLettrages.length > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <p className="text-xs text-gray-500">{activeLettrages.length} lettre{activeLettrages.length > 1 ? 's' : ''} :</p>
            {activeLettrages.map(l => (
              <button
                key={l.code}
                onClick={() => handleUnletter(l.code)}
                disabled={isUnlettering}
                title="Délettrer ce code"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50"
              >
                {l.code}
                <span className="text-[10px] opacity-70">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-sm font-semibold text-gray-500">
              {candidates.length === 0
                ? 'Aucune écriture de tiers dans cet exercice'
                : 'Toutes les écritures sont lettrées'
              }
            </p>
            {showOnlyUnlettered && letteredCount > 0 && (
              <button
                onClick={() => setShowOnlyUnlettered(false)}
                className="mt-2 text-xs text-forest-600 underline"
              >
                Afficher les {letteredCount} écriture{letteredCount > 1 ? 's' : ''} lettrée{letteredCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm min-w-max">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr className="text-xs text-gray-500 uppercase tracking-wide">
                  <th className="px-3 py-2.5 w-8" />
                  <th className="px-3 py-2.5 w-12 text-center">Lettre</th>
                  <th className="px-3 py-2.5 text-left">Date</th>
                  <th className="px-3 py-2.5 text-left">Jnl</th>
                  <th className="px-3 py-2.5 text-left">Compte</th>
                  <th className="px-3 py-2.5 text-left">Libellé</th>
                  <th className="px-3 py-2.5 text-right">Débit</th>
                  <th className="px-3 py-2.5 text-right">Crédit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayed.map(e => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    letCode={letMap.get(e.id) ?? null}
                    selected={selected.has(e.id)}
                    onToggle={() => toggleEntry(e.id)}
                    isReadOnly={false}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        💡 Le lettrage rapproche les débits et crédits d'un même tiers (clients 411, fournisseurs 401…).
        Sélectionnez au moins 2 écritures s'équilibrant, puis cliquez « Lettrer ».
      </p>
    </div>
  )
}
