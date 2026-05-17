/**
 * JournalLettragehPage — Lettrage des comptes de tiers
 *
 * Réglementation SYSCOHADA / PCG :
 *  - Le lettrage rapproche les débits et crédits d'un même compte de tiers (classe 4).
 *  - Une opération de lettrage n'est valide que si Σ Débit = Σ Crédit.
 *  - Le code de lettrage est généré automatiquement (A, B, …, Z, AA, AB, …).
 *  - Les écritures lettrées peuvent être masquées pour voir les impayés (solde réel).
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import type { ComptesTiersRow, LettrageEntry } from '@/services/accountingApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Palette de couleurs pour les codes de lettrage (cyclique)
const LETTER_COLORS: { bg: string; text: string; ring: string }[] = [
  { bg: 'bg-green-100',  text: 'text-green-800',  ring: 'ring-green-300'  },
  { bg: 'bg-blue-100',   text: 'text-blue-800',   ring: 'ring-blue-300'   },
  { bg: 'bg-violet-100', text: 'text-violet-800', ring: 'ring-violet-300' },
  { bg: 'bg-amber-100',  text: 'text-amber-800',  ring: 'ring-amber-300'  },
  { bg: 'bg-pink-100',   text: 'text-pink-800',   ring: 'ring-pink-300'   },
  { bg: 'bg-cyan-100',   text: 'text-cyan-800',   ring: 'ring-cyan-300'   },
]

function codeColor(code: string): { bg: string; text: string; ring: string } {
  // Stable color per code (A=0, B=1, … Z=25, AA=26, …)
  let idx = 0
  for (let i = 0; i < code.length; i++) idx = idx * 26 + code.charCodeAt(i) - 65
  return LETTER_COLORS[idx % LETTER_COLORS.length]!
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-forest-900 border-t-transparent" />
    </div>
  )
}

// ── Left panel: account list ───────────────────────────────────────────────────

interface AccountItemProps {
  row:       ComptesTiersRow
  selected:  boolean
  onClick:   () => void
  fmtAmount: (n: number) => string
}

function AccountItem({ row, selected, onClick, fmtAmount }: AccountItemProps) {
  const outstanding = Math.abs(row.solde)
  const isBalanced  = Math.abs(row.solde) < 0.01

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
        selected
          ? 'bg-forest-700 text-white'
          : 'hover:bg-gray-100 text-gray-800'
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <span className="font-mono text-xs font-semibold">{row.compte}</span>
        {row.nonLettres > 0 && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            selected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
          }`}>
            {row.nonLettres}
          </span>
        )}
      </div>
      <div className={`text-[11px] truncate ${selected ? 'text-white/80' : 'text-gray-500'}`}>
        {row.label}
      </div>
      {!isBalanced && (
        <div className={`text-[11px] font-medium mt-0.5 ${selected ? 'text-white/90' : row.solde > 0 ? 'text-blue-600' : 'text-red-600'}`}>
          {row.solde > 0 ? 'Débiteur' : 'Créditeur'} : {fmtAmount(outstanding)}
        </div>
      )}
    </button>
  )
}

// ── Entry row ─────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry:      LettrageEntry
  selected:   boolean
  onToggle:   () => void
  isReadOnly: boolean
  fmtAmount:  (n: number) => string
  onDeletter: (code: string) => void
  hoveredCode: string | null
  onHoverCode: (code: string | null) => void
}

function EntryRow({ entry, selected, onToggle, isReadOnly, fmtAmount, onDeletter, hoveredCode, onHoverCode }: EntryRowProps) {
  const letCode = entry.lettrage
  const col     = letCode ? codeColor(letCode) : null
  const isHoverGroup = letCode && hoveredCode === letCode

  return (
    <tr
      onClick={!letCode && !isReadOnly ? onToggle : undefined}
      onMouseEnter={() => letCode && onHoverCode(letCode)}
      onMouseLeave={() => letCode && onHoverCode(null)}
      className={`border-t border-gray-100 transition-colors ${
        letCode
          ? isHoverGroup
            ? 'bg-gray-100'
            : 'bg-gray-50/60'
          : selected
            ? 'bg-blue-50 cursor-pointer'
            : !isReadOnly
              ? 'hover:bg-gray-50 cursor-pointer'
              : ''
      }`}
    >
      {/* Checkbox */}
      <td className="w-8 pl-3 pr-1 py-2">
        {!letCode && !isReadOnly ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            onClick={e => e.stopPropagation()}
            className="rounded border-gray-300 text-forest-600 focus:ring-forest-500/30"
          />
        ) : (
          <span className="w-4 block" />
        )}
      </td>

      {/* Lettrage code */}
      <td className="px-2 py-2 w-14 text-center">
        {letCode && col ? (
          <span
            className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${col.bg} ${col.text} ${col.ring}`}
          >
            {letCode}
          </span>
        ) : null}
      </td>

      <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">{fmtDate(entry.date)}</td>
      <td className="px-3 py-2">
        <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium font-mono ${
          entry.journalCode === 'AN'  ? 'bg-sky-100 text-sky-700' :
          entry.journalCode === 'VTE' ? 'bg-green-100 text-green-700' :
          entry.journalCode === 'ACH' ? 'bg-red-100 text-red-700' :
          entry.journalCode === 'BQ' || entry.journalCode === 'BNQ' ? 'bg-blue-100 text-blue-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {entry.journalCode}
        </span>
      </td>
      <td className="px-3 py-2 text-xs text-gray-500 max-w-[160px] truncate" title={entry.reference ?? undefined}>
        {entry.reference}
      </td>
      <td className="px-3 py-2 text-sm text-gray-700 max-w-xs truncate" title={entry.label}>
        {entry.label}
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm font-medium text-gray-900 tabular-nums">
        {entry.debit > 0 ? fmtAmount(entry.debit) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2 text-right font-mono text-sm font-medium text-gray-900 tabular-nums">
        {entry.credit > 0 ? fmtAmount(entry.credit) : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-3 py-2 text-right font-mono text-xs tabular-nums">
        <span className={entry.solde > 0.01 ? 'text-blue-600' : entry.solde < -0.01 ? 'text-red-500' : 'text-gray-400'}>
          {entry.solde !== 0 ? fmtAmount(Math.abs(entry.solde)) : '—'}
        </span>
      </td>

      {/* Délettrage au survol du groupe */}
      <td className="px-2 py-2 w-10">
        {letCode && isHoverGroup && !isReadOnly && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeletter(letCode) }}
            title={`Délettrer le groupe ${letCode}`}
            className="flex h-6 w-6 items-center justify-center rounded-md border border-red-200 bg-white text-red-500 hover:bg-red-50 transition-colors text-xs"
          >
            ×
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function JournalLettragehPage() {
  const { fmt: fmtAmount } = useCurrency()
  const qc = useQueryClient()

  const fyGlobal = useSelectedFiscalYearData()
  const { data: years = [] } = useFiscalYears()

  // Allow override of fiscal year for lettrage (useful to letter past FY)
  const [overrideFyId, setOverrideFyId] = useState<string | null>(null)
  const fyId   = overrideFyId ?? fyGlobal?.id ?? null
  const fyObj  = years.find(y => y.id === fyId) ?? fyGlobal
  const isReadOnly = fyObj?.status === 'CLOSED'

  // Left panel state
  const [selectedCompte, setSelectedCompte] = useState<string | null>(null)
  const [compteSearch,   setCompteSearch]   = useState('')

  // Right panel state
  const [selected,        setSelected]        = useState<Set<string>>(new Set())
  const [hideLettrees,    setHideLettrees]    = useState(false)
  const [hoveredCode,     setHoveredCode]     = useState<string | null>(null)
  const [error,           setError]           = useState<string | null>(null)

  // ── Data queries ──────────────────────────────────────────────────────────

  const { data: comptesTiers = [], isLoading: loadingTiers } = useQuery({
    queryKey: ['comptes-tiers', fyId],
    queryFn:  () => accountingApi.getComptesTiers(fyId!),
    enabled:  !!fyId,
    staleTime: 30_000,
  })

  const { data: compteData, isLoading: loadingCompte } = useQuery({
    queryKey: ['lettrage-compte', fyId, selectedCompte],
    queryFn:  () => accountingApi.getLettragePourCompte(fyId!, selectedCompte!),
    enabled:  !!fyId && !!selectedCompte,
    staleTime: 15_000,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const { mutate: doLettrer, isPending: isLettering } = useMutation({
    mutationFn: (entryIds: string[]) => accountingApi.lettrer(fyId!, entryIds),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['lettrage-compte', fyId, selectedCompte] })
      qc.invalidateQueries({ queryKey: ['comptes-tiers',   fyId] })
      setSelected(new Set())
      setError(null)
      // Brief toast
      setError(`✅ Lettrage ${result.code} — ${result.lettered} écriture(s) rapprochées`)
      setTimeout(() => setError(null), 3000)
    },
    onError: (e: unknown) => {
      const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      setError(data?.error ?? data?.message ?? 'Erreur lors du lettrage')
    },
  })

  const { mutate: doDelettrer, isPending: isUnlettering } = useMutation({
    mutationFn: (code: string) => accountingApi.delettrer(code, fyId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lettrage-compte', fyId, selectedCompte] })
      qc.invalidateQueries({ queryKey: ['comptes-tiers',   fyId] })
      setError(null)
    },
    onError: (e: unknown) => {
      const data = (e as { response?: { data?: { error?: string; message?: string } } })?.response?.data
      setError(data?.error ?? data?.message ?? 'Erreur lors du délettrage')
    },
  })

  // ── Derived state ─────────────────────────────────────────────────────────

  const filteredComptes = useMemo(() => {
    if (!compteSearch.trim()) return comptesTiers
    const q = compteSearch.trim().toLowerCase()
    return comptesTiers.filter(c => c.compte.includes(q) || c.label.toLowerCase().includes(q))
  }, [comptesTiers, compteSearch])

  const allLignes = compteData?.lignes ?? []

  const displayed = useMemo(() => {
    if (!hideLettrees) return allLignes
    return allLignes.filter(l => !l.lettrage)
  }, [allLignes, hideLettrees])

  const selEntries    = useMemo(() =>
    [...selected].map(id => allLignes.find(l => l.id === id)).filter(Boolean) as LettrageEntry[],
    [selected, allLignes],
  )
  const selDebit   = selEntries.reduce((s, e) => s + e.debit,  0)
  const selCredit  = selEntries.reduce((s, e) => s + e.credit, 0)
  const isBalanced = Math.abs(selDebit - selCredit) < 0.01 && selEntries.length >= 2

  // Stats for selected compte
  const lettredCount    = allLignes.filter(l => l.lettrage).length
  const nonLettredCount = allLignes.filter(l => !l.lettrage).length

  // Active lettrage codes in current view
  const activeCodes = useMemo(() => {
    const codes = new Map<string, number>()
    for (const l of allLignes) {
      if (l.lettrage) codes.set(l.lettrage, (codes.get(l.lettrage) ?? 0) + 1)
    }
    return [...codes.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => a.code.localeCompare(b.code))
  }, [allLignes])

  function toggleEntry(id: string) {
    // Cannot select a lettered entry
    const entry = allLignes.find(l => l.id === id)
    if (!entry || entry.lettrage) return
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(displayed.filter(l => !l.lettrage).map(l => l.id)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  // ── When switching compte, reset selection ────────────────────────────────

  function selectCompte(compte: string) {
    setSelectedCompte(compte)
    setSelected(new Set())
    setError(null)
  }

  // ── Global totals ─────────────────────────────────────────────────────────

  const totalNonLettres = comptesTiers.reduce((s, c) => s + c.nonLettres, 0)
  const totalLettres    = comptesTiers.reduce((s, c) => s + c.lettres,    0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>

      {/* ── LEFT PANEL: compte list ────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-gray-200 bg-gray-50 overflow-hidden">

        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-200 bg-white shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">Comptes de tiers</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">Classe 4 (clients, fournisseurs…)</p>

          {/* FY selector */}
          {years.length > 1 && (
            <select
              value={fyId ?? ''}
              onChange={e => { setOverrideFyId(e.target.value || null); setSelectedCompte(null) }}
              className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-forest-500/30"
            >
              {years.map(y => (
                <option key={y.id} value={y.id}>
                  {y.year} — {y.status}
                </option>
              ))}
            </select>
          )}

          {/* Stats pills */}
          <div className="flex gap-2 mt-2">
            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
              {totalNonLettres} à lettrer
            </span>
            <span className="rounded-full bg-green-100 text-green-700 px-2 py-0.5 text-[10px] font-bold">
              {totalLettres} lettrées
            </span>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Filtrer (411, fournisseur…)"
            value={compteSearch}
            onChange={e => setCompteSearch(e.target.value)}
            className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-forest-500/30"
          />
        </div>

        {/* Compte list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {loadingTiers ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-forest-700 border-t-transparent" />
            </div>
          ) : filteredComptes.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6">
              {fyId ? 'Aucun compte de tiers' : 'Sélectionnez un exercice'}
            </p>
          ) : (
            filteredComptes.map(row => (
              <AccountItem
                key={row.compte}
                row={row}
                selected={selectedCompte === row.compte}
                onClick={() => selectCompte(row.compte)}
                fmtAmount={fmtAmount}
              />
            ))
          )}
        </div>
      </aside>

      {/* ── RIGHT PANEL: entries + lettrage ───────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white">

        {/* No compte selected */}
        {!selectedCompte && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
            <svg className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
            <p className="text-sm font-medium">Sélectionnez un compte de tiers</p>
            <p className="text-xs text-gray-400">pour afficher et lettrer ses écritures</p>
          </div>
        )}

        {selectedCompte && (
          <>
            {/* Top bar */}
            <div className="px-5 py-3 border-b border-gray-200 shrink-0">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-base font-semibold text-gray-900 font-mono">
                    {selectedCompte}
                    <span className="ml-2 text-sm font-sans text-gray-500 font-normal">
                      {comptesTiers.find(c => c.compte === selectedCompte)?.label}
                    </span>
                  </h1>
                  {compteData && (
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>Débit total : <b className="text-gray-700">{fmtAmount(compteData.totalDebit)}</b></span>
                      <span>Crédit total : <b className="text-gray-700">{fmtAmount(compteData.totalCredit)}</b></span>
                      <span className={`font-medium ${Math.abs(compteData.solde) < 0.01 ? 'text-green-600' : compteData.solde > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {Math.abs(compteData.solde) < 0.01
                          ? '✓ Soldé'
                          : `Solde ${compteData.solde > 0 ? 'débiteur' : 'créditeur'} : ${fmtAmount(Math.abs(compteData.solde))}`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Codes actifs + délettrage */}
                  {activeCodes.map(({ code, count }) => {
                    const col = codeColor(code)
                    return (
                      <button
                        key={code}
                        onClick={() => !isReadOnly && doDelettrer(code)}
                        disabled={isUnlettering || isReadOnly}
                        title={`Délettrer le groupe ${code} (${count} écritures)`}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 transition-colors ${col.bg} ${col.text} ${col.ring} ${
                          !isReadOnly ? 'hover:bg-red-100 hover:text-red-700 hover:ring-red-300' : 'cursor-default'
                        } disabled:opacity-50`}
                      >
                        {code}
                        {!isReadOnly && <span className="text-[10px] opacity-60">×</span>}
                      </button>
                    )
                  })}

                  {/* Hide lettered toggle */}
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600 select-none">
                    <input
                      type="checkbox"
                      checked={hideLettrees}
                      onChange={e => setHideLettrees(e.target.checked)}
                      className="rounded border-gray-300 text-forest-600 focus:ring-forest-500/30"
                    />
                    Masquer lettrées
                    {lettredCount > 0 && (
                      <span className={`rounded-full px-1.5 text-[10px] font-bold ${hideLettrees ? 'bg-gray-200 text-gray-500' : 'bg-green-100 text-green-700'}`}>
                        {lettredCount}
                      </span>
                    )}
                  </label>

                  {/* Stats badge */}
                  {nonLettredCount > 0 && (
                    <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[10px] font-bold">
                      {nonLettredCount} non lettrée{nonLettredCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error / success banner */}
            {error && (
              <div className={`mx-5 mt-3 rounded-lg border px-4 py-2.5 text-sm flex items-center justify-between shrink-0 ${
                error.startsWith('✅')
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                <span>{error}</span>
                <button onClick={() => setError(null)} className="text-lg leading-none opacity-60 hover:opacity-100 ml-4">×</button>
              </div>
            )}

            {/* Read-only banner */}
            {isReadOnly && (
              <div className="mx-5 mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-800 shrink-0">
                🔒 Exercice {fyObj?.year} clôturé — consultation seule. Aucun lettrage ne peut être modifié.
              </div>
            )}

            {/* Selection bar */}
            {selected.size > 0 && (
              <div className={`mx-5 mt-3 rounded-xl border px-4 py-3 shrink-0 flex items-center gap-4 flex-wrap ${
                isBalanced ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isBalanced ? 'text-green-800' : 'text-amber-800'}`}>
                    {selected.size} écriture{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Débit : <b>{fmtAmount(selDebit)}</b>
                    <span className="mx-2">·</span>
                    Crédit : <b>{fmtAmount(selCredit)}</b>
                    {isBalanced
                      ? <span className="ml-2 text-green-700 font-medium">✓ Équilibrées — lettrage possible</span>
                      : <span className="ml-2 text-amber-600">
                          ⚠ Écart {fmtAmount(Math.abs(selDebit - selCredit))} — sélectionnez des écritures équilibrées
                        </span>
                    }
                  </p>
                </div>
                <button onClick={clearSelection} className="text-xs text-gray-500 hover:text-gray-700 underline shrink-0">
                  Désélectionner
                </button>
                <button
                  onClick={() => doLettrer([...selected])}
                  disabled={!isBalanced || isLettering}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ${
                    isBalanced && !isLettering
                      ? 'bg-forest-700 text-white hover:bg-forest-800'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLettering ? 'Lettrage…' : '✓ Lettrer'}
                </button>
              </div>
            )}

            {/* Entries table */}
            <div className="flex-1 overflow-auto min-h-0 px-5 py-3">
              {loadingCompte ? (
                <Spinner />
              ) : displayed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
                  {allLignes.length === 0 ? (
                    <p className="text-sm">Aucune écriture sur ce compte dans cet exercice</p>
                  ) : (
                    <>
                      <p className="text-3xl">✅</p>
                      <p className="text-sm font-medium">Toutes les écritures sont lettrées</p>
                      <button onClick={() => setHideLettrees(false)} className="text-xs text-forest-600 underline">
                        Afficher les {lettredCount} écriture{lettredCount > 1 ? 's' : ''} lettrée{lettredCount > 1 ? 's' : ''}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm min-w-max">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {/* Select-all */}
                        <th className="w-8 pl-3 pr-1 py-2.5">
                          {!isReadOnly && (
                            <input
                              type="checkbox"
                              checked={selected.size > 0 && selected.size === displayed.filter(l => !l.lettrage).length}
                              onChange={e => e.target.checked ? selectAll() : clearSelection()}
                              className="rounded border-gray-300 text-forest-600 focus:ring-forest-500/30"
                              title="Sélectionner toutes les écritures non lettrées"
                            />
                          )}
                        </th>
                        <th className="px-2 py-2.5 w-14 text-center">Lettre</th>
                        <th className="px-3 py-2.5 text-left">Date</th>
                        <th className="px-3 py-2.5 text-left">Jnl</th>
                        <th className="px-3 py-2.5 text-left">Référence</th>
                        <th className="px-3 py-2.5 text-left">Libellé</th>
                        <th className="px-3 py-2.5 text-right">Débit</th>
                        <th className="px-3 py-2.5 text-right">Crédit</th>
                        <th className="px-3 py-2.5 text-right">Solde</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map(entry => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          selected={selected.has(entry.id)}
                          onToggle={() => toggleEntry(entry.id)}
                          isReadOnly={isReadOnly}
                          fmtAmount={fmtAmount}
                          onDeletter={code => doDelettrer(code)}
                          hoveredCode={hoveredCode}
                          onHoverCode={setHoveredCode}
                        />
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-gray-200 bg-gray-50 text-xs font-semibold text-gray-700">
                      <tr>
                        <td colSpan={6} className="px-3 py-2">
                          {displayed.length} ligne{displayed.length > 1 ? 's' : ''}
                          {hideLettrees && lettredCount > 0 && (
                            <span className="ml-2 text-green-600 font-normal">
                              ({lettredCount} lettrée{lettredCount > 1 ? 's' : ''} masquée{lettredCount > 1 ? 's' : ''})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                          {fmtAmount(displayed.reduce((s, l) => s + l.debit, 0))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                          {fmtAmount(displayed.reduce((s, l) => s + l.credit, 0))}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {(() => {
                            const s = displayed[displayed.length - 1]?.solde ?? 0
                            return (
                              <span className={s > 0.01 ? 'text-blue-600' : s < -0.01 ? 'text-red-500' : 'text-green-600'}>
                                {Math.abs(s) < 0.01 ? '0 — Soldé' : fmtAmount(Math.abs(s))}
                              </span>
                            )
                          })()}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="px-5 py-2.5 border-t border-gray-100 shrink-0">
              <p className="text-[11px] text-gray-400">
                💡 Sélectionnez des écritures dont Σ Débit = Σ Crédit et cliquez <strong>Lettrer</strong>.
                Survolez un groupe lettré pour le délettrer. Les codes sont générés automatiquement (A, B, …, AA, …).
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
