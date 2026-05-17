/**
 * EmpruntsPage — Module Comptabilité › Emprunts
 *
 * Réglementation SYSCOHADA / PCG : compte 16x (Emprunts et dettes assimilées)
 * Quatre types d'amortissement supportés (constant, linéaire, in fine, bullet).
 * Le tableau d'amortissement est calculé par le backend à chaque consultation.
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { CompteCombobox, type CompteOption } from '@/components/accounting/CompteCombobox'
import type {
  Loan, CreateLoanPayload, LoanAmortType, LoanStatus,
} from '@/services/accountingApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function todayIso(): string { return new Date().toISOString().slice(0, 10) }

const AMORT_LABELS: Record<LoanAmortType, string> = {
  CONSTANT_PAYMENT:   'Mensualité constante',
  CONSTANT_PRINCIPAL: 'Amortissement linéaire',
  IN_FINE:            'In fine',
  BULLET:             'Bullet (capital + intérêts à échéance)',
}

const STATUS_META: Record<LoanStatus, { label: string; bg: string; text: string }> = {
  ACTIVE:     { label: 'En cours',     bg: 'bg-green-100',  text: 'text-green-700'  },
  REPAID:     { label: 'Remboursé',    bg: 'bg-gray-100',   text: 'text-gray-600'   },
  IN_DEFAULT: { label: 'En défaut',    bg: 'bg-red-100',    text: 'text-red-700'    },
}

// ── Modal de création / édition ───────────────────────────────────────────────

interface ModalProps {
  loan?:   Loan
  onClose: () => void
  onSaved: () => void
}

function LoanFormModal({ loan, onClose, onSaved }: ModalProps) {
  const qc = useQueryClient()
  const isEdit = !!loan

  const [name,             setName]             = useState(loan?.name ?? '')
  const [lender,           setLender]           = useState(loan?.lender ?? '')
  const [principal,        setPrincipal]        = useState(loan?.principal?.toString() ?? '')
  const [rate,             setRate]             = useState(loan ? (loan.rate * 100).toString() : '8.5')
  const [durationMonths,   setDurationMonths]   = useState(loan?.durationMonths?.toString() ?? '60')
  const [startDate,        setStartDate]        = useState(loan?.startDate?.slice(0, 10) ?? todayIso())
  const [firstPaymentDate, setFirstPaymentDate] = useState(loan?.firstPaymentDate?.slice(0, 10) ?? todayIso())
  const [amortType,        setAmortType]        = useState<LoanAmortType>(loan?.amortType ?? 'CONSTANT_PAYMENT')
  const [account,          setAccount]          = useState(loan?.account ?? '')
  const [accountRaw,       setAccountRaw]       = useState(loan?.account ?? '')
  const [bankAccount,      setBankAccount]      = useState(loan?.bankAccount ?? '')
  const [bankAccountRaw,   setBankAccountRaw]   = useState(loan?.bankAccount ?? '')
  const [interestAccount,  setInterestAccount]  = useState(loan?.interestAccount ?? '')
  const [interestRaw,      setInterestRaw]      = useState(loan?.interestAccount ?? '')
  const [notes,            setNotes]            = useState(loan?.notes ?? '')
  const [error,            setError]            = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => {
      const payload: CreateLoanPayload = {
        name:             name.trim(),
        lender:           lender.trim(),
        principal:        Number(principal),
        rate:             Number(rate) / 100,
        durationMonths:   parseInt(durationMonths, 10),
        startDate,
        firstPaymentDate,
        amortType,
        account:          account.trim() || null,
        bankAccount:      bankAccount.trim() || null,
        interestAccount:  interestAccount.trim() || null,
        notes:            notes.trim() || null,
      }
      return isEdit
        ? accountingApi.updateLoan(loan!.id, payload)
        : accountingApi.createLoan(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['loans'] })
      onSaved()
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } }; message?: string }
      setError(err.response?.data?.error ?? err.message ?? 'Erreur')
    },
  })

  const valid =
    name.trim().length >= 2 &&
    lender.trim().length >= 2 &&
    Number(principal) > 0 &&
    Number(rate) >= 0 && Number(rate) <= 100 &&
    parseInt(durationMonths, 10) >= 1 &&
    !!startDate && !!firstPaymentDate &&
    new Date(firstPaymentDate) >= new Date(startDate)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form
        onSubmit={e => { e.preventDefault(); setError(null); if (valid) mutation.mutate() }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#1b4332] shrink-0">
          <h2 className="text-sm font-semibold text-white">
            {isEdit ? `Modifier l'emprunt ${loan!.reference}` : 'Nouvel emprunt'}
          </h2>
          <button type="button" onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Libellé</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex : Crédit acquisition véhicule"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Prêteur</label>
              <input type="text" value={lender} onChange={e => setLender(e.target.value)}
                placeholder="Ex : BICEC, Afriland First Bank…"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Capital</label>
              <input type="number" min="0" step="0.01" value={principal} onChange={e => setPrincipal(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Taux annuel (%)</label>
              <input type="number" min="0" max="100" step="0.01" value={rate} onChange={e => setRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Durée (mois)</label>
              <input type="number" min="1" step="1" value={durationMonths} onChange={e => setDurationMonths(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Mise à disposition</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">1ère échéance</label>
              <input type="date" value={firstPaymentDate} onChange={e => setFirstPaymentDate(e.target.value)}
                min={startDate}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Type d'amortissement</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(AMORT_LABELS) as LoanAmortType[]).map(t => (
                <button
                  key={t} type="button"
                  onClick={() => setAmortType(t)}
                  className={`text-left rounded-lg border-2 px-3 py-2 transition-all ${
                    amortType === t ? 'border-[#1b4332] bg-[#1b4332]/5 ring-1 ring-[#1b4332]/20' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-gray-800">{AMORT_LABELS[t]}</div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {t === 'CONSTANT_PAYMENT'   && 'Toutes les mensualités sont égales — le capital remboursé augmente avec le temps.'}
                    {t === 'CONSTANT_PRINCIPAL' && 'Capital remboursé constant — mensualités décroissantes.'}
                    {t === 'IN_FINE'            && 'Intérêts mensuels, capital intégral à la dernière échéance.'}
                    {t === 'BULLET'             && 'Aucun versement intermédiaire, tout à l\'échéance.'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Comptes comptables (avancé)
            </summary>
            <div className="grid grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Compte emprunt (16x)</label>
                <CompteCombobox value={accountRaw}
                  onChange={v => { setAccountRaw(v); setAccount(v) }}
                  onSelect={(o: CompteOption) => { setAccount(o.code); setAccountRaw(o.code) }}
                  placeholder="162 — par défaut"
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1b4332]/30" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Compte banque (5xx)</label>
                <CompteCombobox value={bankAccountRaw}
                  onChange={v => { setBankAccountRaw(v); setBankAccount(v) }}
                  onSelect={(o: CompteOption) => { setBankAccount(o.code); setBankAccountRaw(o.code) }}
                  placeholder="521 / 512"
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1b4332]/30" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-600 mb-1">Intérêts (6xx)</label>
                <CompteCombobox value={interestRaw}
                  onChange={v => { setInterestRaw(v); setInterestAccount(v) }}
                  onSelect={(o: CompteOption) => { setInterestAccount(o.code); setInterestRaw(o.code) }}
                  placeholder="671 / 661"
                  className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1b4332]/30" />
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Par défaut : 162 (emprunt) · 521 OHADA / 512 PCG (banque) · 671 OHADA / 661 PCG (intérêts).
            </p>
          </details>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">Notes (optionnel)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Garanties, conditions particulières…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">⚠️ {error}</div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button type="button" onClick={onClose} disabled={mutation.isPending}
            className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-white transition-colors disabled:opacity-50">
            Annuler
          </button>
          <button type="submit" disabled={!valid || mutation.isPending}
            className="flex-1 rounded-lg bg-[#1b4332] py-2.5 text-sm font-semibold text-white hover:bg-[#2d6a4f] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
            {mutation.isPending ? 'Enregistrement…' : (isEdit ? 'Mettre à jour' : '+ Créer l\'emprunt')}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Tableau d'amortissement (panneau de détail) ───────────────────────────────

function LoanDetailPanel({ loanId, onClose }: { loanId: string; onClose: () => void }) {
  const { fmt: fmtAmount } = useCurrency()
  const { data, isLoading } = useQuery({
    queryKey: ['loan', loanId],
    queryFn:  () => accountingApi.getLoan(loanId),
    staleTime: 5_000,
  })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#1b4332]">
          <div>
            <h2 className="text-base font-semibold text-white">{data?.name ?? 'Chargement…'}</h2>
            {data && (
              <p className="text-xs text-white/70 mt-0.5">
                {data.reference} · {data.lender} · {AMORT_LABELS[data.amortType]}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        {isLoading || !data ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
          </div>
        ) : (
          <>
            <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-gray-100">
              <KpiBox label="Capital emprunté"        value={fmtAmount(Number(data.principal))} />
              <KpiBox label="Capital restant dû"      value={fmtAmount(data.summary.remainingPrincipal)} color="text-blue-700" />
              <KpiBox label="Intérêts totaux"         value={fmtAmount(data.summary.totalInterest)} color="text-amber-700" />
              <KpiBox label="Mensualité"              value={fmtAmount(data.summary.monthlyPayment)} />
            </div>

            <div className="px-6 py-2 flex items-center gap-3 text-xs text-gray-500 border-b border-gray-100">
              <span>Taux annuel : <b>{(data.rate * 100).toFixed(2)}%</b></span>
              <span>·</span>
              <span>Durée : <b>{data.durationMonths} mois</b></span>
              <span>·</span>
              <span>1ère échéance : <b>{fmtDate(data.firstPaymentDate)}</b></span>
              {data.summary.nextDueDate && (
                <>
                  <span>·</span>
                  <span>Prochaine échéance : <b className="text-[#1b4332]">{fmtDate(data.summary.nextDueDate)}</b></span>
                </>
              )}
            </div>

            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide text-left">
                    <th className="px-2 py-2 w-12 text-center">#</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2 text-right">Capital dû</th>
                    <th className="px-2 py-2 text-right">Mensualité</th>
                    <th className="px-2 py-2 text-right">Intérêts</th>
                    <th className="px-2 py-2 text-right">Capital</th>
                    <th className="px-2 py-2 text-right">Capital restant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.schedule.map(l => {
                    const past = l.date <= todayIso()
                    return (
                      <tr key={l.period} className={past ? 'bg-gray-50/40' : ''}>
                        <td className="px-2 py-1.5 text-center font-mono text-xs text-gray-500">{l.period}</td>
                        <td className="px-2 py-1.5 text-xs text-gray-600 whitespace-nowrap">
                          {fmtDate(l.date)}
                          {past && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-green-500" title="Payée" />}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs text-gray-500">{fmtAmount(l.openingPrincipal)}</td>
                        <td className="px-2 py-1.5 text-right font-mono font-semibold text-gray-900">{fmtAmount(l.payment)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs text-amber-700">{fmtAmount(l.interest)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs text-blue-700">{fmtAmount(l.capital)}</td>
                        <td className="px-2 py-1.5 text-right font-mono text-xs text-gray-600">{fmtAmount(l.closingPrincipal)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-semibold text-sm">
                  <tr>
                    <td colSpan={3} className="px-2 py-2 text-gray-700">Totaux</td>
                    <td className="px-2 py-2 text-right font-mono">{fmtAmount(data.summary.totalPayments)}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-700">{fmtAmount(data.summary.totalInterest)}</td>
                    <td className="px-2 py-2 text-right font-mono text-blue-700">{fmtAmount(data.summary.totalPrincipal)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Schéma comptable réglementaire (informatif) */}
            <div className="px-6 py-3 border-t border-gray-100 bg-amber-50/50 text-[11px] text-amber-900 space-y-1">
              <p><strong>📚 Écritures comptables associées (SYSCOHADA / PCG) :</strong></p>
              <p>• <strong>Mise à disposition</strong> : D <code className="bg-white px-1 rounded">{data.bankAccount}</code> / C <code className="bg-white px-1 rounded">{data.account}</code></p>
              <p>• <strong>Échéance</strong> : D <code className="bg-white px-1 rounded">{data.account}</code> (capital) + D <code className="bg-white px-1 rounded">{data.interestAccount}</code> (intérêts) / C <code className="bg-white px-1 rounded">{data.bankAccount}</code></p>
              <p>• <strong>Intérêts courus en fin d'exercice</strong> : D <code className="bg-white px-1 rounded">{data.interestAccount}</code> / C <code className="bg-white px-1 rounded">1661</code> (intérêts courus non échus)</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function KpiBox({ label, value, color = 'text-gray-900' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-base font-bold tabular-nums mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────

export function EmpruntsPage() {
  const { fmt: fmtAmount } = useCurrency()
  const qc = useQueryClient()

  const [showModal, setShowModal] = useState(false)
  const [editLoan,  setEditLoan]  = useState<Loan | null>(null)
  const [detailId,  setDetailId]  = useState<string | null>(null)
  const [toast,     setToast]     = useState<string | null>(null)

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ['loans'],
    queryFn:  () => accountingApi.listLoans(),
    staleTime: 15_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountingApi.deleteLoan(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['loans'] })
      setToast('✓ Emprunt supprimé')
      setTimeout(() => setToast(null), 3000)
    },
  })

  // KPIs globaux
  const kpis = useMemo(() => {
    const active = loans.filter(l => l.status === 'ACTIVE')
    const totalRemaining = active.reduce((s, l) => s + (l.summary?.remainingPrincipal ?? Number(l.principal)), 0)
    const totalMonthly   = active.reduce((s, l) => s + (l.summary?.monthlyPayment ?? 0), 0)
    const totalInterest  = active.reduce((s, l) => s + (l.summary?.totalInterest ?? 0), 0)
    return {
      activeCount:    active.length,
      totalRemaining,
      totalMonthly,
      totalInterest,
    }
  }, [loans])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Emprunts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestion des emprunts et dettes assimilées — classe 16 (SYSCOHADA / PCG)
          </p>
        </div>
        <button
          onClick={() => { setEditLoan(null); setShowModal(true) }}
          className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] transition-colors"
        >
          + Nouvel emprunt
        </button>
      </div>

      {toast && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
          {toast}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Emprunts actifs</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{kpis.activeCount}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-white p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Capital restant dû</p>
          <p className="text-xl font-bold text-blue-700 mt-1 tabular-nums">{fmtAmount(kpis.totalRemaining)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-white p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Mensualités cumulées</p>
          <p className="text-xl font-bold text-amber-700 mt-1 tabular-nums">{fmtAmount(kpis.totalMonthly)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Intérêts totaux</p>
          <p className="text-xl font-bold text-gray-700 mt-1 tabular-nums">{fmtAmount(kpis.totalInterest)}</p>
        </div>
      </div>

      {/* Tableau des emprunts */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
        </div>
      ) : loans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
          <p className="text-4xl">💰</p>
          <p className="text-sm font-medium">Aucun emprunt enregistré</p>
          <button onClick={() => { setEditLoan(null); setShowModal(true) }}
            className="mt-2 text-sm text-[#1b4332] underline">
            Créer le premier emprunt
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">
                <th className="px-3 py-2.5">Référence</th>
                <th className="px-3 py-2.5">Libellé / Prêteur</th>
                <th className="px-3 py-2.5 text-right">Capital</th>
                <th className="px-3 py-2.5 text-center">Taux</th>
                <th className="px-3 py-2.5 text-center">Durée</th>
                <th className="px-3 py-2.5 text-right">Restant dû</th>
                <th className="px-3 py-2.5 text-right">Mensualité</th>
                <th className="px-3 py-2.5 text-center">Statut</th>
                <th className="px-3 py-2.5 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loans.map(l => {
                const sm = l.summary
                const status = STATUS_META[l.status]
                return (
                  <tr key={l.id} className="hover:bg-gray-50/60 cursor-pointer"
                      onClick={() => setDetailId(l.id)}>
                    <td className="px-3 py-2.5 font-mono text-xs text-[#1b4332] font-semibold">{l.reference}</td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-medium text-gray-800">{l.name}</div>
                      <div className="text-[11px] text-gray-500">{l.lender}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm">{fmtAmount(Number(l.principal))}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-xs">{(Number(l.rate) * 100).toFixed(2)}%</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{l.durationMonths} mois</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm text-blue-700 font-semibold">
                      {fmtAmount(sm?.remainingPrincipal ?? Number(l.principal))}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-sm">{fmtAmount(sm?.monthlyPayment ?? 0)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setDetailId(l.id)}
                          title="Voir le tableau d'amortissement"
                          className="text-xs rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-50 transition-colors">
                          📊
                        </button>
                        <button onClick={() => { setEditLoan(l); setShowModal(true) }}
                          title="Modifier"
                          className="text-xs rounded-md border border-gray-200 px-2 py-1 hover:bg-gray-50 transition-colors">
                          ✎
                        </button>
                        <button onClick={() => {
                          if (confirm(`Supprimer l'emprunt ${l.reference} ?`)) deleteMutation.mutate(l.id)
                        }}
                          title="Supprimer"
                          className="text-xs rounded-md border border-red-200 text-red-600 px-2 py-1 hover:bg-red-50 transition-colors">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-gray-400">
        💡 Conforme SYSCOHADA / PCG : compte 16 (emprunts), 521/512 (banque), 671/661 (charges d'intérêts).
        Le tableau d'amortissement est calculé en temps réel.
      </p>

      {showModal && (
        <LoanFormModal
          {...(editLoan ? { loan: editLoan } : {})}
          onClose={() => { setShowModal(false); setEditLoan(null) }}
          onSaved={() => {
            setShowModal(false); setEditLoan(null)
            setToast(editLoan ? '✓ Emprunt mis à jour' : '✓ Emprunt créé')
            setTimeout(() => setToast(null), 3000)
          }}
        />
      )}

      {detailId && (
        <LoanDetailPanel loanId={detailId} onClose={() => setDetailId(null)} />
      )}
    </div>
  )
}
