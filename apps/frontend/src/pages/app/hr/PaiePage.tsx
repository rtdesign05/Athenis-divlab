/**
 * PaiePage — Traitement mensuel de la paie
 *
 * Wizard 4 étapes :
 *  1. CALCUL      — sélection mois, calcul des bulletins (avec congés non payés)
 *  2. COMPTABILISATION — génération écritures journal PAY
 *  3. PAIEMENT    — exécution des virements + débit trésorerie
 *  4. ENVOI       — bulletins par email à chaque salarié
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrApi, type Payroll, type PayslipRow } from '@/services/hrApi'

const MONTHS = ['Janv','Févr','Mars','Avril','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc']

// NOTE : formatter spécifique CNPS Cameroun. Utilisé par des sous-composants
// qui n'ont pas accès au hook useCurrency. Pour FR le module Paie sera adapté
// dans une itération dédiée (DSN + bulletins URSSAF).
function fmt(n: string | number) {
  return new Intl.NumberFormat('fr-CM').format(Math.round(Number(n))) + ' FCFA'
}

const STATUS_META: Record<Payroll['status'], { label: string; color: string; step: number }> = {
  DRAFT:     { label: 'Brouillon',     color: 'bg-gray-100 text-gray-700',   step: 1 },
  POSTED:    { label: 'Comptabilisée', color: 'bg-blue-100 text-blue-700',   step: 2 },
  PAID:      { label: 'Payée',         color: 'bg-green-100 text-green-700', step: 3 },
  SENT:      { label: 'Envoyée',       color: 'bg-purple-100 text-purple-700', step: 4 },
  CANCELLED: { label: 'Annulée',       color: 'bg-red-100 text-red-700',     step: 0 },
}

const PAYMENT_LABEL: Record<string, string> = {
  MOBILE_MONEY:  '📱 Mobile Money',
  BANK_TRANSFER: '🏦 Virement',
  CASH:          '💵 Espèces',
  CHECK:         '📄 Chèque',
}

// ── Page principale ─────────────────────────────────────────────────────────

export function PaiePage() {
  const qc = useQueryClient()
  const now  = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [treasury, setTreasury] = useState('521')
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  function pushToast(kind: 'ok' | 'err', msg: string) {
    setToast({ kind, msg })
    setTimeout(() => setToast(null), 4500)
  }

  const { data: payrolls = [], isLoading: loadingList } = useQuery({
    queryKey: ['payrolls'],
    queryFn:  () => hrApi.payroll.list(),
    staleTime: 5_000,
  })

  // Sélection auto : si on a un payroll pour year/month, on le sélectionne
  const currentPayroll = useMemo(
    () => payrolls.find(p => p.year === year && p.month === month) ?? null,
    [payrolls, year, month],
  )
  const effectiveId = selectedId ?? currentPayroll?.id ?? null

  const { data: detail } = useQuery({
    queryKey: ['payroll', effectiveId],
    queryFn:  () => effectiveId ? hrApi.payroll.get(effectiveId) : Promise.reject('no id'),
    enabled:  !!effectiveId,
    staleTime: 5_000,
  })

  // ── Mutations ────────────────────────────────────────────────────────────
  const calculate = useMutation({
    mutationFn: () => hrApi.payroll.calculate(year, month),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['payrolls'] })
      setSelectedId(p.id)
      pushToast('ok', `✓ Paie ${year}-${String(month).padStart(2,'0')} calculée : ${p.employeesCount} bulletin(s)`)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      pushToast('err', `⚠️ ${err.response?.data?.error ?? 'Erreur'}`)
    },
  })

  const post = useMutation({
    mutationFn: () => hrApi.payroll.post(effectiveId!),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['payrolls'] })
      qc.invalidateQueries({ queryKey: ['payroll', effectiveId] })
      pushToast('ok', `✓ Comptabilisée : ${r.lines} lignes (pièce ${r.pieceId.slice(0, 18)}…)`)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      pushToast('err', `⚠️ ${err.response?.data?.error ?? 'Erreur'}`)
    },
  })

  const pay = useMutation({
    mutationFn: () => hrApi.payroll.pay(effectiveId!, treasury),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['payrolls'] })
      qc.invalidateQueries({ queryKey: ['payroll', effectiveId] })
      pushToast('ok', `✓ Paiements effectués : ${r.paid} bulletin(s), ${fmt(r.totalPaid)} décaissés depuis ${treasury}`)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      pushToast('err', `⚠️ ${err.response?.data?.error ?? 'Erreur'}`)
    },
  })

  const send = useMutation({
    mutationFn: () => hrApi.payroll.send(effectiveId!),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['payrolls'] })
      qc.invalidateQueries({ queryKey: ['payroll', effectiveId] })
      pushToast('ok', `✓ ${r.sent} bulletin(s) envoyé(s) par email (${r.skipped} sans email)`)
    },
    onError: (e: unknown) => {
      const err = e as { response?: { data?: { error?: string } } }
      pushToast('err', `⚠️ ${err.response?.data?.error ?? 'Erreur'}`)
    },
  })

  const status = detail?.status ?? null
  const currentStep = status ? STATUS_META[status].step : 0

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Paie mensuelle</h1>
          <p className="mt-1 text-sm text-gray-500">
            Calculer · Comptabiliser · Payer · Envoyer — Calcul CNPS + IRPP + CAC (Cameroun)
          </p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${
          toast.kind === 'ok'
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>{toast.msg}</div>
      )}

      {/* ── Sélection période + récap ──────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Année</label>
            <input type="number" value={year} min={2020} max={2030}
                   onChange={e => { setYear(parseInt(e.target.value) || year); setSelectedId(null) }}
                   className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-forest-500/30 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mois</label>
            <div className="flex gap-1 flex-wrap">
              {MONTHS.map((m, i) => (
                <button key={i}
                  onClick={() => { setMonth(i + 1); setSelectedId(null) }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    month === i + 1
                      ? 'bg-forest-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >{m}</button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {currentPayroll && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_META[currentPayroll.status].color}`}>
                {STATUS_META[currentPayroll.status].label}
              </span>
            )}
            <button
              onClick={() => calculate.mutate()}
              disabled={calculate.isPending || !!(currentPayroll && !['DRAFT', 'CANCELLED'].includes(currentPayroll.status))}
              className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-700 disabled:opacity-40 transition-colors"
              title={currentPayroll && !['DRAFT', 'CANCELLED'].includes(currentPayroll.status) ? `Déjà au statut ${currentPayroll.status}` : ''}
            >
              {calculate.isPending ? 'Calcul…' : (currentPayroll ? '↻ Recalculer' : '⚙ Calculer la paie')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Wizard 4 étapes ─────────────────────────────────────────── */}
      {detail && (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <StepIndicator currentStep={currentStep} status={status} />
              <div className="flex gap-2 flex-wrap">
                <ActionButton
                  step={2}
                  current={currentStep}
                  label="② Comptabiliser"
                  loading={post.isPending}
                  onClick={() => post.mutate()}
                  hint="Génère les écritures dans le journal PAY"
                />
                <div className="flex items-center gap-2">
                  <input
                    value={treasury}
                    onChange={e => setTreasury(e.target.value)}
                    placeholder="Compte trésorerie"
                    className="w-32 rounded-lg border border-gray-300 px-2 py-1 text-xs font-mono"
                    disabled={currentStep !== 2}
                  />
                  <ActionButton
                    step={3}
                    current={currentStep}
                    label="③ Payer"
                    loading={pay.isPending}
                    onClick={() => pay.mutate()}
                    hint="Effectue les paiements + débit trésorerie"
                  />
                </div>
                <ActionButton
                  step={4}
                  current={currentStep}
                  label="④ Envoyer bulletins"
                  loading={send.isPending}
                  onClick={() => send.mutate()}
                  hint="Email à chaque salarié"
                />
              </div>
            </div>

            {/* Totaux du lot */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-100">
              <KpiBox label="Employés"      value={String(detail.employeesCount)} />
              <KpiBox label="Brut total"    value={fmt(detail.totalGross)}    color="text-gray-900" />
              <KpiBox label="Net à payer"   value={fmt(detail.totalNet)}      color="text-green-700" />
              <KpiBox label="Cotis. + impôts" value={fmt(Number(detail.totalCnpsSal) + Number(detail.totalCnpsEmp) + Number(detail.totalIrpp) + Number(detail.totalCac))} color="text-amber-700" />
              <KpiBox label="Coût employeur" value={fmt(Number(detail.totalGross) + Number(detail.totalCnpsEmp))} color="text-gray-700" />
            </div>
          </div>

          {/* Table des bulletins */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Employé</th>
                  <th className="px-4 py-3">Mode paiement</th>
                  <th className="px-4 py-3 text-center">Jours absent</th>
                  <th className="px-4 py-3 text-right">Brut</th>
                  <th className="px-4 py-3 text-right">Cotis. sal.</th>
                  <th className="px-4 py-3 text-right">IRPP+CAC</th>
                  <th className="px-4 py-3 text-right">Net à payer</th>
                  <th className="px-4 py-3 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(detail.payslips ?? []).map(ps => (
                  <PayslipRowCmp key={ps.id} ps={ps} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Historique des paies ─────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Historique des paies</h2>
        {loadingList ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : payrolls.length === 0 ? (
          <p className="text-sm text-gray-400">Aucune paie traitée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="py-2">Période</th>
                <th className="py-2">Statut</th>
                <th className="py-2 text-right">Employés</th>
                <th className="py-2 text-right">Brut</th>
                <th className="py-2 text-right">Net</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payrolls.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 cursor-pointer ${effectiveId === p.id ? 'bg-forest-50/50' : ''}`}
                    onClick={() => { setYear(p.year); setMonth(p.month); setSelectedId(p.id) }}>
                  <td className="py-2 font-medium">{p.year}-{String(p.month).padStart(2, '0')}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_META[p.status].color}`}>
                      {STATUS_META[p.status].label}
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-600">{p.employeesCount}</td>
                  <td className="py-2 text-right font-mono">{fmt(p.totalGross)}</td>
                  <td className="py-2 text-right font-mono text-green-700">{fmt(p.totalNet)}</td>
                  <td className="py-2 text-right text-xs text-forest-600">→</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ── Composants ──────────────────────────────────────────────────────────────

function StepIndicator({ currentStep, status }: { currentStep: number; status: Payroll['status'] | null }) {
  const steps = ['Calcul', 'Comptabilisation', 'Paiement', 'Envoi']
  return (
    <div className="flex items-center gap-1.5">
      {steps.map((label, i) => {
        const step = i + 1
        const done = status === 'CANCELLED' ? false : currentStep >= step
        const isCurrent = currentStep === step
        return (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              done ? 'bg-forest-700 text-white' :
              isCurrent ? 'bg-forest-100 text-forest-700 ring-2 ring-forest-300' :
              'bg-gray-100 text-gray-400'
            }`}>{done && !isCurrent ? '✓' : step}</div>
            <span className={`text-xs font-medium ${
              done ? 'text-forest-700' : isCurrent ? 'text-forest-700' : 'text-gray-400'
            }`}>{label}</span>
            {i < steps.length - 1 && <div className={`w-6 h-px ${done ? 'bg-forest-300' : 'bg-gray-200'}`} />}
          </div>
        )
      })}
    </div>
  )
}

function ActionButton({ step, current, label, loading, onClick, hint }: {
  step: number
  current: number
  label: string
  loading: boolean
  onClick: () => void
  hint?: string
}) {
  // On peut Faire l'étape `step` si l'état actuel est juste à l'étape précédente
  // Step 2 (post) : current must be 1 (DRAFT)
  // Step 3 (pay)  : current must be 2 (POSTED)
  // Step 4 (send) : current must be 3 (PAID)
  const canDo = current === step - 1
  return (
    <button
      onClick={onClick}
      disabled={!canDo || loading}
      title={canDo ? hint : `Étape précédente requise`}
      className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
        canDo
          ? 'bg-forest-700 text-white hover:bg-forest-800'
          : current >= step
            ? 'bg-green-100 text-green-700 cursor-default'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
      } disabled:opacity-60`}
    >
      {loading ? '…' : current >= step ? `✓ ${label}` : label}
    </button>
  )
}

function KpiBox({ label, value, color = 'text-gray-900' }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-base font-bold mt-0.5 tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

function PayslipRowCmp({ ps }: { ps: PayslipRow }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2.5 font-medium text-gray-900">{ps.employeeName}</td>
      <td className="px-4 py-2.5 text-sm">
        {ps.paymentMethod ? (
          <span className="text-gray-700">{PAYMENT_LABEL[ps.paymentMethod] ?? ps.paymentMethod}</span>
        ) : (
          <span className="text-amber-600 text-xs">⚠ aucun défini</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-center">
        {ps.daysAbsentUnpaid > 0
          ? <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-bold">{ps.daysAbsentUnpaid}j</span>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="px-4 py-2.5 text-right font-mono">{fmt(ps.grossSalary)}</td>
      <td className="px-4 py-2.5 text-right font-mono text-amber-700">−{fmt(ps.cnpsSal)}</td>
      <td className="px-4 py-2.5 text-right font-mono text-orange-700">−{fmt(Number(ps.irpp) + Number(ps.cac))}</td>
      <td className="px-4 py-2.5 text-right font-mono font-bold text-green-700">{fmt(ps.netToPay)}</td>
      <td className="px-4 py-2.5 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          ps.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
          ps.paymentStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-500'
        }`}>
          {ps.paymentStatus === 'PAID' ? '✓ Payé' : ps.paymentStatus === 'FAILED' ? '✗ Échec' : '⏳ En attente'}
        </span>
        {ps.emailSentAt && <div className="text-[10px] text-purple-600 mt-1">📧 Envoyé</div>}
      </td>
    </tr>
  )
}
