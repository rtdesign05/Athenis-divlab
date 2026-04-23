import { useState } from 'react'
import { useEmployees, usePayslip } from '@/hooks/useHr'
import type { Payslip } from '@/services/hrApi'

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

function fmtRate(r: number) {
  return r === 0 ? '—' : r.toFixed(3).replace(/\.?0+$/, '') + ' %'
}

function PayslipView({ payslip }: { payslip: Payslip }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white print:shadow-none">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 print:bg-white">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bulletin de paie</h2>
            <p className="text-sm text-gray-500">Période : {payslip.month}</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-medium">{payslip.employee.firstName} {payslip.employee.lastName}</p>
            <p className="text-gray-400">{payslip.employee.email}</p>
            <p className="text-gray-400">{payslip.employee.employmentType}</p>
          </div>
        </div>
      </div>

      {/* Salary base */}
      <div className="border-b border-gray-100 px-6 py-3 bg-blue-50">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">Salaire brut mensuel</span>
          <span className="font-bold text-gray-900">{fmt(payslip.grossSalary)}</span>
        </div>
      </div>

      {/* Cotisations table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">Libellé</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Base</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Taux sal.</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Montant sal.</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Taux pat.</th>
              <th className="px-3 py-2 text-right font-medium text-gray-500">Montant pat.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payslip.lines.map((line, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-700">{line.label}</td>
                <td className="px-3 py-2 text-right text-gray-600">{fmt(line.base)}</td>
                <td className="px-3 py-2 text-right text-gray-500">{fmtRate(line.salRate)}</td>
                <td className="px-3 py-2 text-right font-medium text-red-600">
                  {line.salAmt > 0 ? `−${fmt(line.salAmt)}` : '—'}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">{fmtRate(line.empRate)}</td>
                <td className="px-3 py-2 text-right font-medium text-orange-600">
                  {line.empAmt > 0 ? fmt(line.empAmt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-gray-300 bg-gray-50">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-gray-700">Total cotisations</td>
              <td className="px-3 py-2 text-right text-xs font-bold text-red-700">−{fmt(payslip.totalSalariale)}</td>
              <td />
              <td className="px-3 py-2 text-right text-xs font-bold text-orange-700">{fmt(payslip.totalPatronale)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Net summary */}
      <div className="border-t border-gray-100 px-6 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Brut — cotisations salariales</span>
          <span className="text-gray-700">{fmt(payslip.netBeforeTax)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">+ CSG déductible</span>
          <span className="text-gray-700">{fmt(payslip.csgDeductible)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium text-gray-700">
          <span>Net imposable</span>
          <span>{fmt(payslip.netImposable)}</span>
        </div>
        <div className="flex justify-between rounded-lg bg-green-50 px-4 py-3 text-base font-bold">
          <span className="text-gray-900">Net à payer</span>
          <span className="text-green-700">{fmt(payslip.netToPay)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Coût total employeur (brut + pat.)</span>
          <span>{fmt(payslip.totalCost)}</span>
        </div>
      </div>
    </div>
  )
}

export function PayslipPage() {
  const employees = useEmployees(true)
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const { data: payslip, isLoading, isError } = usePayslip(selectedEmpId, month)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulletins de paie</h1>
          <p className="text-sm text-gray-500">Calcul automatique — cotisations 2026</p>
        </div>
        {payslip && (
          <button onClick={() => window.print()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Imprimer / PDF
          </button>
        )}
      </div>

      {/* Selectors */}
      <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Employé</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
          >
            <option value="">Sélectionner un employé…</option>
            {employees.data?.items.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Période</label>
          <input type="month"
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={month}
            onChange={e => setMonth(e.target.value)}
          />
        </div>
      </div>

      {/* Payslip */}
      {!selectedEmpId && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          Sélectionnez un employé pour générer le bulletin
        </div>
      )}
      {selectedEmpId && isLoading && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Calcul en cours…</div>
      )}
      {selectedEmpId && isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-600">
          Erreur lors du calcul du bulletin
        </div>
      )}
      {payslip && <PayslipView payslip={payslip} />}

      {/* Legal notice */}
      <p className="text-xs text-gray-400">
        Calcul basé sur les taux URSSAF 2026 — PMSS 3 925 €/mois. Ce bulletin est indicatif et ne remplace pas un logiciel de paie agréé.
      </p>
    </div>
  )
}
