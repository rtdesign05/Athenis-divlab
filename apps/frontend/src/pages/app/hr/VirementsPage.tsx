import { useState, useMemo } from 'react'
import { useHR, type HREmployee } from '@/contexts/HRContext'
import { useCurrency } from '@/hooks/useCurrency'

// ── Salary calculation helpers ─────────────────────────────────────────────────
// Simplified net-to-pay: Gross - CNPS salarié (4.2% capped at 750 000) - IRPP estimate

const CNPS_PLAFOND = 750_000
const IRPP_ABATTEMENT = 0.30   // 30% professional expenses

function irppCameroun(baseImposable: number): number {
  // Barème IRPP Cameroun (annuel → monthly approximation)
  // Tranches annuelles : 0-2M=10%, 2-3M=15%, 3-5M=25%, 5-10M=35%, >10M=38.5%
  const annual = baseImposable * 12
  let irppAnnuel = 0
  if (annual <= 0)          irppAnnuel = 0
  else if (annual <= 2_000_000) irppAnnuel = annual * 0.10
  else if (annual <= 3_000_000) irppAnnuel = 2_000_000 * 0.10 + (annual - 2_000_000) * 0.15
  else if (annual <= 5_000_000) irppAnnuel = 2_000_000 * 0.10 + 1_000_000 * 0.15 + (annual - 3_000_000) * 0.25
  else if (annual <= 10_000_000) irppAnnuel = 2_000_000 * 0.10 + 1_000_000 * 0.15 + 2_000_000 * 0.25 + (annual - 5_000_000) * 0.35
  else irppAnnuel = 2_000_000 * 0.10 + 1_000_000 * 0.15 + 2_000_000 * 0.25 + 5_000_000 * 0.35 + (annual - 10_000_000) * 0.385
  return Math.round(irppAnnuel / 12)
}

function computeNet(emp: HREmployee, multiplier = 1): { gross: number; cnpsSal: number; irpp: number; cac: number; net: number } {
  const gross     = emp.grossSalary * multiplier
  const cnpsBase  = Math.min(gross, CNPS_PLAFOND * multiplier)
  const cnpsSal   = Math.round(cnpsBase * 0.042)
  const afterCnps = gross - cnpsSal
  const irppBase  = Math.round(afterCnps * (1 - IRPP_ABATTEMENT))
  const irpp      = irppCameroun(irppBase / multiplier) * multiplier
  const cac       = Math.round(irpp * 0.10)
  const net       = gross - cnpsSal - irpp - cac
  return { gross, cnpsSal, irpp, cac, net }
}

// ── Month helpers ─────────────────────────────────────────────────────────────

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function isoMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(iso: string): string {
  const [y, m] = iso.split('-')
  return `${MONTHS_FR[(parseInt(m ?? '1') - 1)] ?? ''} ${y}`
}

function formatDateVirement(iso: string): string {
  const [y, m] = iso.split('-')
  return `25/${m}/${y}`
}

function isActiveInMonth(emp: HREmployee, monthIso: string): boolean {
  const [y, m] = monthIso.split('-').map(Number)
  const monthEnd = new Date(y!, m!, 0)   // last day of month
  const monthStart = new Date(y!, m! - 1, 1)
  const start = new Date(emp.startDate)
  if (start > monthEnd) return false
  if (emp.endDate) {
    const end = new Date(emp.endDate)
    if (end < monthStart) return false
  }
  return true
}

// ── Status types ──────────────────────────────────────────────────────────────

type VirementStatus = 'PLANIFIE' | 'EFFECTUE' | 'EN_ATTENTE'

interface VirementRow {
  monthIso:   string
  nbEmployes: number
  montantBrut: number
  montantNet:  number
  status:      VirementStatus
  reference:   string
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function DetailModal({
  monthIso, employees, onClose,
}: {
  monthIso:  string
  employees: HREmployee[]
  onClose:   () => void
}) {
  const { fmt } = useCurrency()
  const active = employees.filter(e => isActiveInMonth(e, monthIso))
  const lines  = active.map(emp => ({ emp, ...computeNet(emp) }))
  const totals = lines.reduce((s, l) => ({
    gross:   s.gross   + l.gross,
    cnpsSal: s.cnpsSal + l.cnpsSal,
    irpp:    s.irpp    + l.irpp,
    cac:     s.cac     + l.cac,
    net:     s.net     + l.net,
  }), { gross: 0, cnpsSal: 0, irpp: 0, cac: 0, net: 0 })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Détail virement — {monthLabel(monthIso)}</h2>
            <p className="text-xs text-gray-500">{active.length} salarié{active.length !== 1 ? 's' : ''} actif{active.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs min-w-max">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr className="text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2.5 text-left">Employé</th>
                <th className="px-4 py-2.5 text-right">Brut</th>
                <th className="px-4 py-2.5 text-right text-blue-600">CNPS sal.</th>
                <th className="px-4 py-2.5 text-right">IRPP</th>
                <th className="px-4 py-2.5 text-right">CAC 10%</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Net à payer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lines.map(({ emp, gross, cnpsSal, irpp, cac, net }) => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">{emp.firstName} {emp.lastName}</p>
                    <p className="text-gray-400">{emp.poste}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-700">{fmt(gross)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-600">{fmt(cnpsSal)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{fmt(irpp)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">{fmt(cac)}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-gray-800">{fmt(net)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300 bg-gray-100 sticky bottom-0">
              <tr className="font-bold text-gray-700">
                <td className="px-4 py-2.5">TOTAL</td>
                <td className="px-4 py-2.5 text-right">{fmt(totals.gross)}</td>
                <td className="px-4 py-2.5 text-right text-blue-600">{fmt(totals.cnpsSal)}</td>
                <td className="px-4 py-2.5 text-right">{fmt(totals.irpp)}</td>
                <td className="px-4 py-2.5 text-right">{fmt(totals.cac)}</td>
                <td className="px-4 py-2.5 text-right text-base">{fmt(totals.net)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-between items-center rounded-b-2xl">
          <p className="text-xs text-gray-400">
            CNPS sal. : 4,2% brut plafonné · IRPP : barème progressif Cameroun · CAC : 10% IRPP
          </p>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function VirementsPage() {
  const { employees } = useHR()
  const { fmt }       = useCurrency()
  const [viewingMonth, setViewingMonth] = useState<string | null>(null)

  // Build the last 6 months
  const months = useMemo(() => {
    const result: VirementRow[] = []
    const today = new Date()

    for (let i = 0; i < 6; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthIso = isoMonth(d)
      const active   = employees.filter(e => isActiveInMonth(e, monthIso))
      if (active.length === 0) continue

      const totals = active.reduce(
        (s, emp) => {
          const c = computeNet(emp)
          return { gross: s.gross + c.gross, net: s.net + c.net }
        },
        { gross: 0, net: 0 },
      )

      const isPast = i > 0
      const isCurrentMonth = i === 0

      result.push({
        monthIso,
        nbEmployes:  active.length,
        montantBrut: Math.round(totals.gross),
        montantNet:  Math.round(totals.net),
        status: isCurrentMonth ? 'PLANIFIE' : 'EFFECTUE',
        reference: isPast
          ? `VIR-${monthIso.replace('-', '')}-001`
          : '',
      })
    }
    return result
  }, [employees])

  const [statuses, setStatuses] = useState<Record<string, VirementStatus>>(() => {
    const init: Record<string, VirementStatus> = {}
    return init
  })

  function getStatus(monthIso: string, defaultStatus: VirementStatus): VirementStatus {
    return statuses[monthIso] ?? defaultStatus
  }

  function markEffectue(monthIso: string) {
    setStatuses(prev => ({ ...prev, [monthIso]: 'EFFECTUE' }))
  }

  // YTD stats
  const currentYear    = new Date().getFullYear()
  const ytdMonths      = months.filter(m => m.monthIso.startsWith(String(currentYear)) && getStatus(m.monthIso, m.status) === 'EFFECTUE')
  const totalYTD       = ytdMonths.reduce((s, m) => s + m.montantNet, 0)
  const nbVirementsYTD = ytdMonths.length
  const planifie       = months.find(m => getStatus(m.monthIso, m.status) === 'PLANIFIE')

  const viewingEmp = viewingMonth
    ? employees.filter(e => isActiveInMonth(e, viewingMonth))
    : []

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Virements de salaires</h1>
        <p className="text-sm text-gray-500 mt-1">
          Historique calculé à partir des salaires des employés actifs
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total versé YTD {currentYear}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{fmt(totalYTD)}</p>
              <p className="text-xs text-gray-400 mt-0.5">net</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Virements effectués {currentYear}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{nbVirementsYTD}</p>
              <p className="text-xs text-gray-400 mt-0.5">sur {new Date().getMonth() + 1} mois</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Prochain virement</p>
              {planifie ? (
                <>
                  <p className="text-2xl font-bold text-blue-700 mt-1">{fmt(planifie.montantNet)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    FCFA — prévu le {formatDateVirement(planifie.monthIso)}
                    &nbsp;({planifie.nbEmployes} emp.)
                  </p>
                </>
              ) : (
                <p className="text-lg font-semibold text-gray-400 mt-1">Aucun planifié</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Historique des virements (6 derniers mois)</h2>
          <p className="text-xs text-gray-400">{employees.length} salarié{employees.length !== 1 ? 's' : ''} au total</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Mois</th>
                <th className="px-4 py-2 text-right font-medium">Employés</th>
                <th className="px-4 py-2 text-right font-medium">Brut total</th>
                <th className="px-4 py-2 text-right font-medium">Net versé</th>
                <th className="px-4 py-2 text-center font-medium">Date virement</th>
                <th className="px-4 py-2 text-left font-medium">Référence</th>
                <th className="px-4 py-2 text-center font-medium">Statut</th>
                <th className="px-4 py-2 text-center font-medium">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {months.map((m) => {
                const status = getStatus(m.monthIso, m.status)
                return (
                  <tr key={m.monthIso} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{monthLabel(m.monthIso)}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{m.nbEmployes}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{fmt(m.montantBrut)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmt(m.montantNet)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {formatDateVirement(m.monthIso)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {m.reference || (status === 'PLANIFIE' ? <span className="text-gray-300">—</span> : '')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {status === 'EFFECTUE' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-green-100 text-green-700">
                          Effectué
                        </span>
                      ) : (
                        <button
                          onClick={() => markEffectue(m.monthIso)}
                          className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                          title="Marquer comme effectué"
                        >
                          Planifié ▸
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setViewingMonth(m.monthIso)}
                        className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {ytdMonths.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-semibold text-gray-700" colSpan={2}>Total {currentYear}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                    {fmt(ytdMonths.reduce((s, m) => s + m.montantBrut, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">
                    {fmt(totalYTD)}
                  </td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        * Montants en FCFA calculés d'après les salaires bruts des employés actifs.
        Net = Brut − CNPS salarié (4,2% plafonné à 750 000 FCFA) − IRPP progressif − CAC 10%.
      </p>

      {viewingMonth && (
        <DetailModal
          monthIso={viewingMonth}
          employees={viewingEmp}
          onClose={() => setViewingMonth(null)}
        />
      )}
    </div>
  )
}
