import { useState, useMemo, Fragment } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import { useFiscalYearGuard } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { CompteCombobox, normalizeCompteCode } from '@/components/accounting/CompteCombobox'
import type { CompteOption } from '@/components/accounting/CompteCombobox'

// ── Dynamic journal options (read from accounting config stored in localStorage) ──

const DEFAULT_JOURNAL_OPTIONS = [
  { code: 'VTE', label: 'Ventes' },
  { code: 'ACH', label: 'Achats' },
  { code: 'BQ',  label: 'Banque' },
  { code: 'CAI', label: 'Caisse' },
  { code: 'OD',  label: 'Opérations diverses' },
]

/** Reads active journal codes from ComptabiliteParamPage settings (Tab 4).
 *  Falls back to the defaults above if nothing is configured. */
function loadJournalOptions(): { code: string; label: string }[] {
  try {
    const raw = localStorage.getItem('athenis:accounting-config')
    if (!raw) return DEFAULT_JOURNAL_OPTIONS
    const cfg = JSON.parse(raw) as { journals?: { code: string; label: string; active?: boolean }[] }
    const active = (cfg.journals ?? [])
      .filter(j => j.active !== false && j.code?.trim())
      .map(j => ({ code: j.code.trim().toUpperCase(), label: j.label || j.code }))
    return active.length > 0 ? active : DEFAULT_JOURNAL_OPTIONS
  } catch {
    return DEFAULT_JOURNAL_OPTIONS
  }
}

const JOURNAL_COLOR: Record<string, string> = {
  VTE: 'bg-green-100 text-green-700',
  ACH: 'bg-red-100 text-red-700',
  BQ:  'bg-blue-100 text-blue-700',
  BNQ: 'bg-blue-100 text-blue-700',
  CAI: 'bg-yellow-100 text-yellow-700',
  OD:  'bg-purple-100 text-purple-700',
}

// Couleur de la bordure gauche par journal (identifie visuellement le journal de la pièce)
const JOURNAL_BORDER: Record<string, string> = {
  VTE: 'border-l-green-400',
  ACH: 'border-l-red-400',
  BQ:  'border-l-blue-400',
  BNQ: 'border-l-blue-400',
  CAI: 'border-l-yellow-400',
  OD:  'border-l-purple-400',
}

function formatDate(d: string | Date): string {
  const dt = new Date(d)
  return dt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
    </div>
  )
}

interface EntryLine {
  id: string
  compte: string
  libelle: string
  debit: string
  credit: string
  intituleCompte?: string
}

interface EntryForm {
  date: string
  journal: string
  customJournal: string
  reference: string
  lines: EntryLine[]
}

function newLine(): EntryLine {
  return { id: Math.random().toString(36).slice(2), compte: '', libelle: '', debit: '', credit: '' }
}

function makeEmptyForm(
  initialJournal?: string,
  opts: { code: string }[] = DEFAULT_JOURNAL_OPTIONS,
): EntryForm {
  const journal = initialJournal ?? opts[0]?.code ?? 'VTE'
  const isKnown = opts.some(o => o.code === journal)
  return {
    date: todayISO(),
    journal: isKnown ? journal : 'AUTRE',
    customJournal: isKnown ? '' : journal,
    reference: '',
    lines: [newLine(), newLine()],
  }
}

// ─────────────────────────────────────────────────────────────────────────────

interface NewEntryModalProps {
  fiscalYearId: string
  onClose: () => void
  initialJournal?: string
  // Edit mode
  editPieceId?: string
  editData?: {
    date: string
    journal: string
    reference: string | null
    lines: EntryLine[]
  }
}

function NewEntryModal({ fiscalYearId, onClose, initialJournal, editPieceId, editData }: NewEntryModalProps) {
  const isEditMode = !!editPieceId
  const queryClient = useQueryClient()

  // Load journal options from config once at mount
  const journalOptions = useMemo(() => loadJournalOptions(), [])
  // Options shown in the select, with an "Autre…" escape hatch
  const journalSelectOptions = useMemo(
    () => [...journalOptions, { code: 'AUTRE', label: 'Autre…' }],
    [journalOptions],
  )

  const [form, setForm] = useState<EntryForm>(() => {
    const opts = loadJournalOptions()
    if (editData) {
      const journal = editData.journal
      const isKnown = opts.some(o => o.code === journal)
      return {
        date: editData.date,
        journal: isKnown ? journal : 'AUTRE',
        customJournal: isKnown ? '' : journal,
        reference: editData.reference ?? '',
        lines: editData.lines.map(l => ({ ...l, id: Math.random().toString(36).slice(2) })),
      }
    }
    return makeEmptyForm(initialJournal, opts)
  })
  const [error, setError] = useState<string | null>(null)

  const isCustom = form.journal === 'AUTRE'
  const resolvedJournal = isCustom ? form.customJournal.trim().toUpperCase() : form.journal

  const totalDebit  = form.lines.reduce((s, l) => s + (parseFloat(l.debit)  || 0), 0)
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
  const diff        = Math.abs(totalDebit - totalCredit)
  const isBalanced  = diff < 0.001 && totalDebit > 0
  const hasEnoughLines = form.lines.length >= 2

  const mutation = useMutation({
    mutationFn: (payload: {
      date: string; journal: string; reference?: string
      lines: { compte: string; libelle: string; intituleCompte?: string; debit: number; credit: number }[]
    }) => isEditMode && editPieceId
      ? accountingApi.updateJournalPiece(editPieceId, payload)
      : accountingApi.createJournalEntryBatch({ fiscalYearId, ...payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', fiscalYearId] })
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Une erreur est survenue.')
    },
  })

  function setHeader(field: keyof Omit<EntryForm, 'lines'>, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    setError(null)
  }

  function setLine(id: string, field: keyof Omit<EntryLine, 'id'>, value: string) {
    setForm(f => ({
      ...f,
      lines: f.lines.map(l => l.id === id ? { ...l, [field]: value } : l),
    }))
    setError(null)
  }

  function selectCompte(lineId: string, c: CompteOption) {
    setForm(f => ({
      ...f,
      lines: f.lines.map(l =>
        l.id === lineId
          ? { ...l, compte: c.code, libelle: l.libelle.trim() === '' ? c.label : l.libelle, intituleCompte: c.label }
          : l
      ),
    }))
    setError(null)
  }

  function addLine() {
    setForm(f => ({ ...f, lines: [...f.lines, newLine()] }))
  }

  function removeLine(id: string) {
    if (form.lines.length <= 2) return
    setForm(f => ({ ...f, lines: f.lines.filter(l => l.id !== id) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolvedJournal) { setError('Veuillez saisir un code journal.'); return }
    if (!hasEnoughLines)  { setError('Au moins 2 lignes sont requises.'); return }

    for (const l of form.lines) {
      if (!l.compte.trim())  { setError(`Ligne "${l.libelle || '?'}" : numéro de compte manquant.`); return }
      if (!l.libelle.trim()) { setError(`Ligne compte ${l.compte} : libellé manquant.`); return }
      const d = parseFloat(l.debit) || 0
      const c = parseFloat(l.credit) || 0
      if (d === 0 && c === 0) { setError(`Ligne ${l.compte} : débit ou crédit requis.`); return }
      if (d > 0 && c > 0)     { setError(`Ligne ${l.compte} : saisissez débit OU crédit, pas les deux.`); return }
    }

    if (!isBalanced) {
      setError(`Écriture déséquilibrée : débit ${totalDebit.toFixed(2)} ≠ crédit ${totalCredit.toFixed(2)}.`)
      return
    }

    mutation.mutate({
      date:    form.date,
      journal: resolvedJournal,
      ...(form.reference.trim() ? { reference: form.reference.trim() } : {}),
      lines: form.lines.map(l => ({
        compte:         normalizeCompteCode(l.compte.trim()),  // ← normalisation avant envoi
        libelle:        l.libelle.trim(),
        ...(l.intituleCompte ? { intituleCompte: l.intituleCompte } : {}),
        debit:          parseFloat(l.debit)  || 0,
        credit:         parseFloat(l.credit) || 0,
      })),
    })
  }

  const INPUT = 'w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-900/30'
  const INPUT_MONO = INPUT + ' font-mono'
  const INPUT_NUM  = INPUT + ' text-right tabular-nums'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{isEditMode ? 'Modifier l\'écriture' : 'Nouvelle écriture comptable'}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-4 space-y-4 shrink-0">

            {/* Date / Journal / Référence */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Date</label>
                <input type="date" value={form.date} onChange={e => setHeader('date', e.target.value)} required className={INPUT} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Journal
                  <span className="ml-1.5 text-gray-400 font-normal">(commun à toutes les lignes)</span>
                </label>
                <select value={form.journal} onChange={e => setHeader('journal', e.target.value)} className={INPUT}>
                  {journalSelectOptions.map(o => (
                    <option key={o.code} value={o.code}>{o.code !== 'AUTRE' ? `${o.code} / ${o.label}` : o.label}</option>
                  ))}
                </select>
              </div>
              {isCustom ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Code journal</label>
                  <input type="text" placeholder="ex. AN, SAL…" value={form.customJournal}
                    onChange={e => setHeader('customJournal', e.target.value.toUpperCase())}
                    maxLength={10} className={INPUT_MONO} />
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Référence <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <input type="text" placeholder="ex. FAC-2026-001" value={form.reference}
                    onChange={e => setHeader('reference', e.target.value)} className={INPUT} />
                </div>
              )}
            </div>
            {isCustom && (
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Référence <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <input type="text" placeholder="ex. FAC-2026-001" value={form.reference}
                  onChange={e => setHeader('reference', e.target.value)} className={INPUT} />
              </div>
            )}
            {/* Journal badge */}
            {resolvedJournal && (
              <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
                <span className={`rounded px-2 py-0.5 text-xs font-semibold ${JOURNAL_COLOR[resolvedJournal] ?? 'bg-gray-100 text-gray-600'}`}>
                  {resolvedJournal}
                </span>
                <span className="text-xs text-gray-500">
                  Toutes les lignes de cette écriture seront enregistrées dans ce journal — une écriture ne peut appartenir qu'à un seul journal.
                </span>
              </div>
            )}
          </div>

          {/* ── Lines table ── */}
          <div className="flex-1 overflow-y-auto px-6 pb-2">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold text-gray-500">
                  <th className="pb-2 pr-2 w-32">N° Compte</th>
                  <th className="pb-2 pr-2">Libellé</th>
                  <th className="pb-2 pr-2 w-36 text-right">Débit</th>
                  <th className="pb-2 pr-2 w-36 text-right">Crédit</th>
                  <th className="pb-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {form.lines.map((line) => (
                  <tr key={line.id} className="group">
                    <td className="py-1.5 pr-2">
                      <CompteCombobox
                        value={line.compte}
                        onChange={v => setLine(line.id, 'compte', v)}
                        onSelect={c => selectCompte(line.id, c)}
                        className={INPUT_MONO}
                        placeholder="ex. 411000"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="text" placeholder="Description…" value={line.libelle}
                        onChange={e => setLine(line.id, 'libelle', e.target.value)}
                        className={INPUT} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={line.debit}
                        onChange={e => setLine(line.id, 'debit', e.target.value)}
                        className={INPUT_NUM} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input type="number" min="0" step="0.01" placeholder="0.00" value={line.credit}
                        onChange={e => setLine(line.id, 'credit', e.target.value)}
                        className={INPUT_NUM} />
                    </td>
                    <td className="py-1.5 text-center">
                      {form.lines.length > 2 && (
                        <button type="button" onClick={() => removeLine(line.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none opacity-0 group-hover:opacity-100">
                          ×
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={2} className="pt-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Totaux</td>
                  <td className="pt-2 pr-2 text-right font-semibold tabular-nums text-sm text-gray-900">
                    {totalDebit > 0 ? totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td className="pt-2 pr-2 text-right font-semibold tabular-nums text-sm text-gray-900">
                    {totalCredit > 0 ? totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>

            {/* Add line */}
            <button type="button" onClick={addLine}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-forest-900 hover:text-forest-700 transition-colors">
              <span className="flex h-5 w-5 items-center justify-center rounded border border-forest-900/30 text-base leading-none">+</span>
              Ajouter une ligne
            </button>
          </div>

          {/* ── Balance indicator + actions ── */}
          <div className="border-t border-gray-200 px-6 py-4 shrink-0 space-y-3">
            {/* Balance status */}
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              isBalanced
                ? 'bg-green-50 text-green-700 border border-green-200'
                : totalDebit === 0 && totalCredit === 0
                  ? 'bg-gray-50 text-gray-500 border border-gray-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {isBalanced ? (
                <><span>✓</span><span>Écriture équilibrée — Débit = Crédit = {totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span></>
              ) : totalDebit === 0 && totalCredit === 0 ? (
                <><span>○</span><span>Saisissez les montants (au moins 2 lignes, débit = crédit obligatoires)</span></>
              ) : (
                <><span>⚠</span><span>
                  Déséquilibre : débit {totalDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} / crédit {totalCredit.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} — écart {Math.abs(totalDebit - totalCredit).toLocaleString('fr-FR', { minimumFractionDigits: 2 })}
                </span></>
              )}
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button type="submit" disabled={mutation.isPending || !isBalanced}
                className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {mutation.isPending ? 'Enregistrement…' : isEditMode ? 'Enregistrer les modifications' : 'Enregistrer l\'écriture'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Piece grouping helper ────────────────────────────────────────────────────

function groupEntries(entries: import('@/services/accountingApi').JournalEntryRow[]) {
  const groups: { key: string; pieceId: string | null; rows: typeof entries }[] = []
  const seenPiece = new Map<string, typeof entries>()
  const seenRef   = new Map<string, typeof entries>()

  for (const e of entries) {
    if (e.pieceId) {
      // Regroupement prioritaire par pieceId (pièce comptable)
      if (!seenPiece.has(e.pieceId)) {
        const rows: typeof entries = []
        seenPiece.set(e.pieceId, rows)
        groups.push({ key: e.pieceId, pieceId: e.pieceId, rows })
      }
      seenPiece.get(e.pieceId)!.push(e)
    } else if (e.reference) {
      // Fallback : regroupement par référence + date (même écriture sans pieceId)
      const refKey = `${e.date.slice(0, 10)}_${e.reference}`
      if (!seenRef.has(refKey)) {
        const rows: typeof entries = []
        seenRef.set(refKey, rows)
        groups.push({ key: refKey, pieceId: null, rows })
      }
      seenRef.get(refKey)!.push(e)
    } else {
      // Ligne isolée sans référence ni pieceId
      groups.push({ key: e.id, pieceId: null, rows: [e] })
    }
  }
  return groups
}

// ── Confirm delete dialog ────────────────────────────────────────────────────

function ConfirmDeleteModal({ lineCount, onConfirm, onCancel, isPending }: {
  lineCount: number
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-lg">⚠</div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Supprimer cette écriture ?</h3>
            <p className="mt-1 text-xs text-gray-500">
              {lineCount > 1
                ? `Cette écriture comporte ${lineCount} lignes qui seront toutes supprimées.`
                : 'Cette ligne sera supprimée définitivement.'}
              {' '}Cette action est irréversible.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={isPending}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Annuler
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50">
            {isPending ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export function JournalPage() {
  const { fmt: fmtAmount } = useCurrency()
  const fmt = (n: number) => n === 0 ? '' : fmtAmount(n)
  const queryClient = useQueryClient()

  const [filter, setFilter]             = useState<string>('ALL')
  const [showModal, setShowModal]       = useState(false)
  const [modalJournal, setModalJournal] = useState<string | undefined>(undefined)
  const [hoveredKey, setHoveredKey]     = useState<string | null>(null)

  // Edit state
  const [editPieceId, setEditPieceId]   = useState<string | undefined>(undefined)
  const [editData, setEditData]         = useState<NewEntryModalProps['editData']>(undefined)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<{ key: string; pieceId: string | null; lineCount: number } | null>(null)

  const { isLoading: yearsLoading } = useFiscalYears()
  const fyData = useSelectedFiscalYearData()
  const { isReadOnly } = useFiscalYearGuard()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['journal', fyData?.id],
    queryFn:  () => fyData ? accountingApi.getJournal(fyData.id) : Promise.reject(new Error('no fy')),
    enabled:  !!fyData?.id,
    staleTime: 30_000,
  })

  const deleteMutation = useMutation({
    mutationFn: ({ pieceId, entryId }: { pieceId: string | null; entryId?: string }) =>
      pieceId
        ? accountingApi.deleteJournalPiece(pieceId)
        : accountingApi.deleteJournalEntry(entryId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal', fyData?.id] })
      setDeleteTarget(null)
    },
  })

  // Build dynamic filter tabs: configured journals + any extra codes in actual data
  const journalOptions = useMemo(() => loadJournalOptions(), [])
  const entries = data?.entries ?? []
  const filterOptions = useMemo(() => {
    const configCodes = new Set(journalOptions.map(j => j.code))
    const dataCodes = [...new Set(entries.map(e => e.journalCode))].filter(c => !configCodes.has(c))
    return [
      ...journalOptions,
      ...dataCodes.map(c => ({ code: c, label: c })),
    ]
  }, [journalOptions, entries])

  const visible = filter === 'ALL' ? entries : entries.filter(e => e.journalCode === filter)
  const groups  = groupEntries(visible)

  const totalDebit  = visible.reduce((s, e) => s + e.debit,  0)
  const totalCredit = visible.reduce((s, e) => s + e.credit, 0)

  function openNewModal(journal?: string) {
    setEditPieceId(undefined)
    setEditData(undefined)
    setModalJournal(journal)
    setShowModal(true)
  }

  function openEditModal(group: ReturnType<typeof groupEntries>[0]) {
    const first = group.rows[0]!
    setEditPieceId(group.pieceId ?? undefined)
    setEditData({
      date:      new Date(first.date).toISOString().slice(0, 10),
      journal:   first.journalCode,
      reference: first.reference,
      lines: group.rows.map(r => ({
        id:      r.id,
        compte:  r.account,
        libelle: r.label,
        debit:   r.debit  ? String(r.debit)  : '',
        credit:  r.credit ? String(r.credit) : '',
      })),
    })
    setShowModal(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Journal comptable</h1>
          <p className="mt-1 text-sm text-gray-500">
            {data ? `Exercice ${data.year} — ${entries.length} ligne${entries.length !== 1 ? 's' : ''}` : 'Chargement…'}
          </p>
        </div>
        {!isReadOnly && (
          <button onClick={() => openNewModal()}
            className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
            + Nouvelle écriture
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-forest-500/30"
        >
          <option value="ALL">Tous les journaux</option>
          {filterOptions.map(j => (
            <option key={j.code} value={j.code}>{j.code} — {j.label}</option>
          ))}
        </select>
        {!isReadOnly && fyData && (
          <div className="relative group">
            <button onClick={() => openNewModal('')} title="Ajouter un journal"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-forest-900 hover:text-forest-900 transition-colors text-sm">
              +
            </button>
            <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
              Ajouter un journal
            </span>
          </div>
        )}
      </div>

      {(yearsLoading || isLoading) && <Spinner />}

      {!yearsLoading && !fyData && (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
          <p className="text-sm">Sélectionnez un exercice comptable ci-dessus.</p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger le journal. Vérifiez la connexion au serveur.
        </div>
      )}

      {data && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-3 w-6" />
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Journal</th>
                <th className="px-4 py-3">Pièce / Réf.</th>
                <th className="px-4 py-3">Compte</th>
                <th className="px-4 py-3">Libellé</th>
                <th className="px-4 py-3 text-right">Débit</th>
                <th className="px-4 py-3 text-right">Crédit</th>
                {!isReadOnly && <th className="px-2 py-3 w-16" />}
              </tr>
            </thead>
            <tbody>
              {groups.length === 0 ? (
                <tr>
                  <td colSpan={isReadOnly ? 8 : 9} className="px-4 py-10 text-center text-sm text-gray-400">
                    Aucune écriture{filter !== 'ALL' ? ` pour le journal ${filter}` : ''} sur cet exercice.
                  </td>
                </tr>
              ) : (
                groups.map((group, gi) => {
                  const isHovered  = hoveredKey === group.key
                  const isMulti    = group.rows.length > 1
                  const groupBg    = isHovered
                    ? 'bg-blue-50/60'
                    : gi % 2 === 0 ? '' : 'bg-slate-50/60'
                  const borderCol  = JOURNAL_BORDER[group.rows[0]?.journalCode ?? ''] ?? 'border-l-gray-300'
                  return (
                    <Fragment key={group.key}>
                      {group.rows.map((e, ri) => {
                        const isFirstRow = ri === 0
                        const isLastRow  = ri === group.rows.length - 1
                        return (
                          <tr key={e.id}
                            onMouseEnter={() => setHoveredKey(group.key)}
                            onMouseLeave={() => setHoveredKey(null)}
                            className={`transition-colors ${groupBg} ${
                              isFirstRow && gi > 0 ? 'border-t-2 border-gray-200' : 'border-t border-gray-100'
                            }`}>

                            {/* Colonne indicateur : bordure colorée (première ligne) + trait de continuation */}
                            <td className="w-1.5 p-0">
                              {isFirstRow ? (
                                <div className={`h-full w-1.5 border-l-4 ${borderCol} ${isMulti ? 'rounded-tl' : 'rounded-l'}`} />
                              ) : (
                                <div className={`h-full w-1.5 border-l-4 ${borderCol} opacity-30 ${isLastRow ? 'rounded-bl' : ''}`} />
                              )}
                            </td>

                            <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                              {isFirstRow ? formatDate(e.date) : ''}
                            </td>
                            <td className="px-4 py-2">
                              {isFirstRow && (
                                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${JOURNAL_COLOR[e.journalCode] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {e.journalCode}
                                </span>
                              )}
                            </td>
                            {/* Pièce / Référence : uniquement sur première ligne + badge nb lignes */}
                            <td className="px-4 py-2">
                              {isFirstRow && (
                                <div className="flex items-center gap-1.5">
                                  {e.reference && (
                                    <span className="font-mono text-xs text-gray-500 truncate max-w-[110px]" title={e.reference}>
                                      {e.reference}
                                    </span>
                                  )}
                                  {isMulti && (
                                    <span className="inline-flex items-center rounded-full bg-[#1b4332]/10 text-[#1b4332] text-[10px] font-semibold px-1.5 py-0.5 leading-none whitespace-nowrap">
                                      {group.rows.length} L
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-2 font-mono text-xs text-gray-600">{e.account}</td>
                            <td className="px-4 py-2 text-gray-700 text-sm">{e.label}</td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900 text-sm tabular-nums">
                              {e.debit > 0 ? fmt(e.debit) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-2 text-right font-medium text-gray-900 text-sm tabular-nums">
                              {e.credit > 0 ? fmt(e.credit) : <span className="text-gray-300">—</span>}
                            </td>
                            {!isReadOnly && (
                              <td className="px-2 py-2 w-16">
                                {isFirstRow && (
                                  <div className={`flex items-center justify-end gap-1 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                                    {group.pieceId && (
                                      <button
                                        onClick={() => openEditModal(group)}
                                        title="Modifier l'écriture"
                                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:border-[#1b4332]/40 hover:text-[#1b4332] hover:bg-[#1b4332]/5 transition-colors text-sm shadow-sm"
                                      >
                                        ✎
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setDeleteTarget({ key: group.key, pieceId: group.pieceId, lineCount: group.rows.length })}
                                      title="Supprimer"
                                      className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors text-sm shadow-sm"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </Fragment>
                  )
                })
              )}
            </tbody>
            {visible.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold text-sm">
                  <td colSpan={isReadOnly ? 6 : 6} className="px-4 py-2.5 text-gray-700">TOTAUX</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">{fmtAmount(totalDebit)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 tabular-nums">{fmtAmount(totalCredit)}</td>
                  {!isReadOnly && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {showModal && fyData && (
        <NewEntryModal
          fiscalYearId={fyData.id}
          onClose={() => { setShowModal(false); setEditPieceId(undefined); setEditData(undefined) }}
          {...(modalJournal  !== undefined ? { initialJournal: modalJournal }  : {})}
          {...(editPieceId   !== undefined ? { editPieceId }                   : {})}
          {...(editData      !== undefined ? { editData }                      : {})}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          lineCount={deleteTarget.lineCount}
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate({ pieceId: deleteTarget.pieceId, entryId: deleteTarget.key })}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
