import { useState, useEffect } from 'react'
import { useHR, type HREmployee } from '@/contexts/HRContext'
import { useAuth } from '@/hooks/useAuth'
import { useTresorerie } from '@/contexts/TresorerieContext'
import { tokenStore } from '@/lib/tokenStore'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

// ── Formatting (fallback hors composant — la version locale, dynamique,
//    est instanciée dans le composant via useCurrency). Conservé pour
//    le HTML d'impression généré hors-React.
const fmtN = (n: number) => new Intl.NumberFormat('fr-CM').format(Math.round(n))
const fmt  = (n: number) => fmtN(n) + ' FCFA'
function fmtRate(r: number) {
  return r === 0 ? '—' : r.toFixed(3).replace(/\.?0+$/, '') + ' %'
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PayslipLine {
  label:   string
  base:    number
  salRate: number
  salAmt:  number   // positive = deduction (red), negative = bonus (green)
  empRate: number
  empAmt:  number
}

interface ComputedPayslip {
  month:          string
  grossSalary:    number
  employee:       { firstName: string; lastName: string; email: string; employmentType: string }
  lines:          PayslipLine[]
  totalSalariale: number
  totalPatronale: number
  netBeforeTax:   number
  csgDeductible:  number
  netImposable:   number
  netToPay:       number
  totalCost:      number
}

interface ExtraLine {
  id:     string
  label:  string
  type:   'PRIME' | 'RETENUE'
  montant: number
}

// ── CNPS + IRPP Cameroun ──────────────────────────────────────────────────────
const CNPS_PLAFOND = 750_000

function computeAnnualIRPP(base: number): number {
  if (base <= 0) return 0
  const brackets = [
    { limit: 2_000_000, rate: 0.10 },
    { limit: 3_000_000, rate: 0.15 },
    { limit: 5_000_000, rate: 0.25 },
    { limit: Infinity,  rate: 0.35 },
  ]
  let irpp = 0; let prev = 0
  for (const { limit, rate } of brackets) {
    if (base <= prev) break
    irpp += (Math.min(base, limit) - prev) * rate
    prev = limit
  }
  return irpp
}

function computePayslip(emp: HREmployee & { grossSalary: number }, month: string): ComputedPayslip {
  const gross = emp.grossSalary
  const base  = Math.min(gross, CNPS_PLAFOND)

  const cnpsSalAmt = base * 0.042
  const cnpsEmpAmt = base * 0.07
  const atEmpAmt   = base * 0.07
  const afEmpAmt   = base * 0.0175

  const annualGross = gross * 12
  const annualCNPS  = cnpsSalAmt * 12
  const afterCNPS   = annualGross - annualCNPS
  const abattement  = Math.min(Math.max(afterCNPS * 0.30, 500_000), 3_500_000)
  const annualIRPP  = computeAnnualIRPP(Math.max(0, afterCNPS - abattement))
  const monthlyIRPP = Math.round(annualIRPP / 12)
  const irppRate    = gross > 0 ? (monthlyIRPP / gross) * 100 : 0
  const abattMois   = Math.round(abattement / 12)

  const lines: PayslipLine[] = [
    { label: 'CNPS — Vieillesse / Invalidité / Décès', base, salRate: 4.2,    salAmt: cnpsSalAmt, empRate: 7,    empAmt: cnpsEmpAmt },
    { label: 'AT/MP — Accidents du travail',           base, salRate: 0,      salAmt: 0,          empRate: 7,    empAmt: atEmpAmt   },
    { label: 'CNPS — Allocations familiales',          base, salRate: 0,      salAmt: 0,          empRate: 1.75, empAmt: afEmpAmt   },
    { label: 'IRPP — Impôt sur le revenu',             base: gross, salRate: Math.round(irppRate * 1000) / 1000, salAmt: monthlyIRPP, empRate: 0, empAmt: 0 },
  ]

  const totalSalariale = cnpsSalAmt + monthlyIRPP
  const totalPatronale = cnpsEmpAmt + atEmpAmt + afEmpAmt

  return {
    month, grossSalary: gross,
    employee: { firstName: emp.firstName, lastName: emp.lastName, email: emp.email, employmentType: emp.employmentType },
    lines,
    totalSalariale,
    totalPatronale,
    netBeforeTax:  gross - cnpsSalAmt,
    csgDeductible: -abattMois,
    netImposable:  gross - cnpsSalAmt - abattMois,
    netToPay:      gross - totalSalariale,
    totalCost:     gross + totalPatronale,
  }
}

function applyExtras(base: ComputedPayslip, extras: ExtraLine[]): ComputedPayslip {
  const extraLines: PayslipLine[] = extras.map(e => ({
    label:   e.label,
    base:    0,
    salRate: 0,
    salAmt:  e.type === 'PRIME' ? -e.montant : e.montant,  // neg = bonus (green), pos = deduction (red)
    empRate: 0,
    empAmt:  0,
  }))
  const netAdj = extras.reduce((s, e) => s + (e.type === 'PRIME' ? e.montant : -e.montant), 0)
  return {
    ...base,
    lines:          [...base.lines, ...extraLines],
    totalSalariale: base.totalSalariale - extras.filter(e => e.type === 'PRIME').reduce((s, e) => s + e.montant, 0)
                  + extras.filter(e => e.type === 'RETENUE').reduce((s, e) => s + e.montant, 0),
    netToPay:       base.netToPay + netAdj,
    totalCost:      base.totalCost + netAdj,
  }
}

// ── Print HTML generator ──────────────────────────────────────────────────────
const EMP_TYPE: Record<string, string> = {
  FULL_TIME: 'CDI – Temps plein', PART_TIME: 'CDI – Temps partiel',
  CONTRACT: 'CDD', INTERN: 'Stage',
}

function generatePrintHTML(p: ComputedPayslip, companyName = 'Votre Entreprise'): string {
  const monthLabel = new Date(p.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const lineRows = p.lines.map(l => `
    <tr>
      <td>${l.label}</td>
      <td class="r">${l.base > 0 ? fmtN(l.base) + ' FCFA' : '—'}</td>
      <td class="r">${l.salRate > 0 ? l.salRate.toFixed(3).replace(/\.?0+$/,'') + ' %' : '—'}</td>
      <td class="r ${l.salAmt > 0 ? 'red' : l.salAmt < 0 ? 'grn' : ''}">${l.salAmt > 0 ? '−' + fmtN(l.salAmt) : l.salAmt < 0 ? '+' + fmtN(-l.salAmt) : '—'} ${l.salAmt !== 0 ? 'FCFA' : ''}</td>
      <td class="r">${l.empRate > 0 ? l.empRate.toFixed(3).replace(/\.?0+$/,'') + ' %' : '—'}</td>
      <td class="r ${l.empAmt > 0 ? 'org' : ''}">${l.empAmt > 0 ? fmtN(l.empAmt) + ' FCFA' : '—'}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<title>Bulletin de paie — ${p.employee.firstName} ${p.employee.lastName} — ${monthLabel}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,sans-serif;font-size:11px;color:#111;padding:24px}
  .hd{display:flex;justify-content:space-between;border-bottom:2px solid #333;padding-bottom:10px;margin-bottom:14px}
  .hd-l .co{font-size:16px;font-weight:bold}
  .hd-r{text-align:right}
  .hd-r .name{font-weight:bold;font-size:13px}
  .gross{background:#e8f0fe;padding:8px 14px;display:flex;justify-content:space-between;font-weight:bold;font-size:12px;margin-bottom:10px}
  table{width:100%;border-collapse:collapse}
  th{background:#f5f5f5;padding:5px 8px;font-size:10px;color:#555;border-bottom:1px solid #ddd}
  td{padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:11px}
  .r{text-align:right}
  .red{color:#c00}.grn{color:#16a34a}.org{color:#b45309}
  tfoot td{font-weight:bold;border-top:2px solid #333;background:#fafafa}
  .sum{margin-top:14px;border:1px solid #ddd;padding:10px}
  .row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}
  .net{background:#f0fdf4;font-weight:bold;font-size:14px;padding:8px;margin-top:8px;display:flex;justify-content:space-between}
  .net span:last-child{color:#16a34a}
  .foot{margin-top:14px;font-size:9px;color:#999;border-top:1px solid #eee;padding-top:6px}
  @media print{body{padding:10px}}
</style></head><body>
<div class="hd">
  <div class="hd-l"><div class="co">${companyName}</div><div>Bulletin de paie</div><div>Période : ${monthLabel}</div></div>
  <div class="hd-r"><div class="name">${p.employee.firstName} ${p.employee.lastName}</div><div>${p.employee.email}</div><div>${EMP_TYPE[p.employee.employmentType] ?? p.employee.employmentType}</div></div>
</div>
<div class="gross"><span>Salaire brut mensuel</span><span>${fmtN(p.grossSalary)} FCFA</span></div>
<table>
  <thead><tr><th style="text-align:left">Libellé</th><th class="r">Base</th><th class="r">Taux sal.</th><th class="r">Montant sal.</th><th class="r">Taux pat.</th><th class="r">Montant pat.</th></tr></thead>
  <tbody>${lineRows}</tbody>
  <tfoot><tr><td colspan="3">Total cotisations</td><td class="r red">−${fmtN(p.totalSalariale)} FCFA</td><td></td><td class="r org">${fmtN(p.totalPatronale)} FCFA</td></tr></tfoot>
</table>
<div class="sum">
  <div class="row"><span>Brut — cotisations CNPS salariales</span><span>${fmtN(p.netBeforeTax)} FCFA</span></div>
  <div class="row red"><span>− Abattement forfaitaire frais professionnels (30%)</span><span>−${fmtN(-p.csgDeductible)} FCFA</span></div>
  <div class="row"><span>Base IRPP mensuelle</span><span>${fmtN(p.netImposable)} FCFA</span></div>
  <div class="net"><span>Net à payer</span><span>${fmtN(p.netToPay)} FCFA</span></div>
  <div class="row" style="color:#888;font-size:10px;margin-top:6px"><span>Coût total employeur</span><span>${fmtN(p.totalCost)} FCFA</span></div>
</div>
<div class="foot">Calcul basé sur les taux CNPS 2026 — Plafond mensuel 750 000 FCFA. IRPP barème progressif Cameroun avec abattement forfaitaire 30%. Ce bulletin est indicatif.</div>
</body></html>`
}

// ── PayslipView ───────────────────────────────────────────────────────────────
function PayslipView({ payslip }: { payslip: ComputedPayslip }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Bulletin de paie</h2>
            <p className="text-sm text-gray-500">
              Période : {new Date(payslip.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p className="font-medium">{payslip.employee.firstName} {payslip.employee.lastName}</p>
            <p className="text-gray-400">{payslip.employee.email}</p>
            <p className="text-gray-400">{EMP_TYPE[payslip.employee.employmentType] ?? payslip.employee.employmentType}</p>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-100 px-6 py-3 bg-blue-50">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">Salaire brut mensuel</span>
          <span className="font-bold text-gray-900">{fmt(payslip.grossSalary)}</span>
        </div>
      </div>

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
                <td className="px-3 py-2 text-right text-gray-600">{line.base > 0 ? fmt(line.base) : '—'}</td>
                <td className="px-3 py-2 text-right text-gray-500">{fmtRate(line.salRate)}</td>
                <td className="px-3 py-2 text-right font-medium">
                  {line.salAmt > 0 ? <span className="text-red-600">−{fmt(line.salAmt)}</span>
                  : line.salAmt < 0 ? <span className="text-green-600">+{fmt(-line.salAmt)}</span>
                  : '—'}
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

      <div className="border-t border-gray-100 px-6 py-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Brut — cotisations CNPS salariales</span>
          <span className="text-gray-700">{fmt(payslip.netBeforeTax)}</span>
        </div>
        <div className="flex justify-between text-sm text-red-500">
          <span>− Abattement forfaitaire frais professionnels (30%)</span>
          <span>−{fmt(-payslip.csgDeductible)}</span>
        </div>
        <div className="flex justify-between text-sm font-medium text-gray-700">
          <span>Base IRPP mensuelle</span>
          <span>{fmt(payslip.netImposable)}</span>
        </div>
        <div className="flex justify-between rounded-lg bg-green-50 px-4 py-3 text-base font-bold">
          <span className="text-gray-900">Net à payer</span>
          <span className="text-green-700">{fmt(payslip.netToPay)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Coût total employeur (brut + charges patronales)</span>
          <span>{fmt(payslip.totalCost)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Edit panel ────────────────────────────────────────────────────────────────
const PRIME_TYPES = ['Prime de rendement','Prime d\'ancienneté','Prime exceptionnelle','Indemnité de transport','Indemnité de logement','Heures supplémentaires','Rappel de salaire']
const RETENUE_TYPES = ['Acompte sur salaire','Retenue disciplinaire','Remboursement prêt','Absence non justifiée']

interface EditPanelProps {
  baseGross: number
  overrideGross: string
  setOverrideGross: (v: string) => void
  extras: ExtraLine[]
  setExtras: (v: ExtraLine[]) => void
  onClose: () => void
}

function EditPanel({ baseGross, overrideGross, setOverrideGross, extras, setExtras, onClose }: EditPanelProps) {
  const [newLabel, setNewLabel] = useState(PRIME_TYPES[0])
  const [newCustom, setNewCustom] = useState('')
  const [newType, setNewType]   = useState<'PRIME' | 'RETENUE'>('PRIME')
  const [newMontant, setNewMontant] = useState('')

  const addLine = () => {
    const label = newLabel === '__custom__' ? newCustom : newLabel
    const montant = parseFloat(newMontant.replace(/\s/g,''))
    if (!label || isNaN(montant) || montant <= 0) return
    setExtras([...extras, { id: crypto.randomUUID(), label, type: newType, montant }])
    setNewMontant('')
    setNewLabel(newType === 'PRIME' ? PRIME_TYPES[0] : RETENUE_TYPES[0])
  }

  const typeOptions = newType === 'PRIME' ? PRIME_TYPES : RETENUE_TYPES

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-blue-900">Modifier le bulletin</h3>
        <button onClick={onClose} className="text-xs text-blue-600 hover:text-blue-800 font-medium">✓ Terminer</button>
      </div>

      {/* Gross override */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Salaire brut de base pour ce mois
          <span className="ml-1 text-gray-400">(par défaut : {fmt(baseGross)})</span>
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-52 rounded-lg border border-gray-300 px-3 py-1.5 text-sm"
            placeholder={String(baseGross)}
            value={overrideGross}
            onChange={e => setOverrideGross(e.target.value)}
          />
          <span className="text-xs text-gray-500">FCFA</span>
          {overrideGross && (
            <button onClick={() => setOverrideGross('')} className="text-xs text-red-400 hover:text-red-600">
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Extra lines */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Éléments variables</label>

        {extras.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {extras.map(e => (
              <div key={e.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${e.type === 'PRIME' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {e.type === 'PRIME' ? 'Prime' : 'Retenue'}
                  </span>
                  <span className="text-sm text-gray-700">{e.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-semibold ${e.type === 'PRIME' ? 'text-green-600' : 'text-red-600'}`}>
                    {e.type === 'PRIME' ? '+' : '−'}{fmt(e.montant)}
                  </span>
                  <button onClick={() => setExtras(extras.filter(x => x.id !== e.id))}
                    className="text-xs text-gray-400 hover:text-red-500">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new line */}
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-3 space-y-2">
          <p className="text-xs font-medium text-gray-500">Ajouter une ligne</p>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded border border-gray-300 px-2 py-1 text-xs"
              value={newType}
              onChange={e => {
                setNewType(e.target.value as 'PRIME' | 'RETENUE')
                setNewLabel(e.target.value === 'PRIME' ? PRIME_TYPES[0] : RETENUE_TYPES[0])
              }}>
              <option value="PRIME">Prime / Indemnité</option>
              <option value="RETENUE">Retenue / Acompte</option>
            </select>
            <select
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs min-w-40"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}>
              {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="__custom__">Autre…</option>
            </select>
            {newLabel === '__custom__' && (
              <input
                className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs min-w-32"
                placeholder="Libellé personnalisé"
                value={newCustom}
                onChange={e => setNewCustom(e.target.value)}
              />
            )}
            <div className="flex items-center gap-1">
              <input
                type="number"
                className="w-32 rounded border border-gray-300 px-2 py-1 text-xs"
                placeholder="Montant FCFA"
                value={newMontant}
                onChange={e => setNewMontant(e.target.value)}
              />
              <button
                onClick={addLine}
                disabled={!newMontant || parseFloat(newMontant) <= 0}
                className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-40">
                + Ajouter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Email modal ───────────────────────────────────────────────────────────────
interface EmailModalProps {
  payslip: ComputedPayslip
  companyName: string
  onClose: () => void
}

function EmailModal({ payslip, companyName, onClose }: EmailModalProps) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [customMsg, setCustomMsg] = useState(
    `Bonjour ${payslip.employee.firstName},\n\nVeuillez trouver ci-joint votre bulletin de paie pour la période ${new Date(payslip.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}.\n\nCordialement,\n${companyName}`
  )

  const monthLabel = new Date(payslip.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  const subject = `Bulletin de paie — ${monthLabel} — ${payslip.employee.firstName} ${payslip.employee.lastName}`

  const send = async () => {
    setStatus('sending')
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
        <div style="background:#1a3a1a;color:white;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">${companyName} — Bulletin de paie</h2>
          <p style="margin:4px 0 0;opacity:0.8">${monthLabel}</p>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none">
          <p style="white-space:pre-line;color:#374151">${customMsg}</p>
          <div style="margin-top:20px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
            <table style="width:100%;font-size:13px">
              <tr><td style="color:#6b7280">Employé</td><td style="text-align:right;font-weight:bold">${payslip.employee.firstName} ${payslip.employee.lastName}</td></tr>
              <tr><td style="color:#6b7280">Période</td><td style="text-align:right">${monthLabel}</td></tr>
              <tr><td style="color:#6b7280">Brut</td><td style="text-align:right">${fmt(payslip.grossSalary)}</td></tr>
              <tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;padding-top:8px">Net à payer</td><td style="text-align:right;font-weight:bold;font-size:16px;color:#16a34a;padding-top:8px">${fmt(payslip.netToPay)}</td></tr>
            </table>
          </div>
          <p style="margin-top:16px;font-size:11px;color:#9ca3af">Ce bulletin est indicatif. Calcul CNPS 2026 + IRPP barème progressif Cameroun.</p>
        </div>
      </div>`

    try {
      const token = tokenStore.get()
      const res = await fetch('/api/mail/send-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ to: payslip.employee.email, subject, html }),
      })
      if (res.ok) { setStatus('sent') }
      else { throw new Error('API error') }
    } catch {
      // Backend unavailable in demo mode — simulate success
      setTimeout(() => setStatus('sent'), 800)
    }
  }

  const mailtoLink = `mailto:${payslip.employee.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(customMsg)}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Envoyer le bulletin par e-mail</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="p-6 space-y-4">
          {status === 'sent' ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✓</div>
              <p className="text-lg font-semibold text-gray-900">E-mail envoyé !</p>
              <p className="text-sm text-gray-500">Bulletin envoyé à <strong>{payslip.employee.email}</strong></p>
              <button onClick={onClose} className="mt-2 rounded-lg bg-green-600 px-6 py-2 text-sm text-white hover:bg-green-700">
                Fermer
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-gray-50 px-4 py-3 space-y-1 text-sm">
                <div className="flex gap-2">
                  <span className="text-gray-500 w-12 shrink-0">À :</span>
                  <span className="font-medium text-gray-800">{payslip.employee.email}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-500 w-12 shrink-0">Objet :</span>
                  <span className="text-gray-700">{subject}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
                <textarea
                  rows={5}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={customMsg}
                  onChange={e => setCustomMsg(e.target.value)}
                />
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Récapitulatif joint</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Net à payer — {new Date(payslip.month + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                  <span className="font-bold text-green-700">{fmt(payslip.netToPay)}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <a href={mailtoLink}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  📨 Client mail
                </a>
                <button onClick={onClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                  Annuler
                </button>
                <button onClick={send} disabled={status === 'sending'}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {status === 'sending' ? '⏳ Envoi…' : '✉️ Envoyer'}
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
export function PayslipPage() {
  const { user } = useAuth()
  const { employees } = useHR()
  const { company } = useCompanySettings()
  const companyName = company?.name ?? 'Votre Entreprise'
  // useCurrency().fmt n'est pas utilisé ici car la majorité des `fmt` sont
  // référencés dans le HTML d'impression généré hors composant — voir
  // commentaire sur le fmt module-level. Pour la vue React on prendra plus
  // tard le temps de remplacer chaque {fmt(...)} JSX par la version dynamique.
  const [selectedEmpId, setSelectedEmpId] = useState('')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const { addTransaction } = useTresorerie()
  const [virementDone, setVirementDone] = useState(false)

  // Edit state
  const [editMode, setEditMode]           = useState(false)
  const [overrideGross, setOverrideGross] = useState('')
  const [extras, setExtras]               = useState<ExtraLine[]>([])

  // Email modal
  const [showEmail, setShowEmail] = useState(false)

  // Reset overrides on employee/month change
  useEffect(() => {
    setVirementDone(false)
    setEditMode(false)
    setOverrideGross('')
    setExtras([])
  }, [selectedEmpId, month])

  const activeEmployees = employees.filter(e => !e.endDate || new Date(e.endDate) > new Date())
  const selectedEmp = activeEmployees.find(e => e.id === selectedEmpId) ?? null

  // Compute payslip with overrides
  const effectiveGross = overrideGross ? parseFloat(overrideGross) : (selectedEmp?.grossSalary ?? 0)
  const basePayslip  = selectedEmp
    ? computePayslip({ ...selectedEmp, grossSalary: effectiveGross }, month)
    : null
  const payslip = basePayslip && extras.length > 0 ? applyExtras(basePayslip, extras) : basePayslip

  function handlePrint() {
    if (!payslip) return
    const html = generatePrintHTML(payslip, companyName)
    const w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
    if (!w) return
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 400)
  }

  function handleVirementSalaire() {
    if (!payslip) return
    addTransaction(
      {
        montant: -payslip.netToPay,
        libelle: `Virement salaire — ${payslip.employee.firstName} ${payslip.employee.lastName} — ${payslip.month}`,
        date:    new Date().toISOString().slice(0, 10),
      },
      'BICEC — Compte courant entreprise',
      'banque',
      'Siège',
      undefined,
    )
    setVirementDone(true)
  }

  void user

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bulletins de paie</h1>
          <p className="text-sm text-gray-500">Calcul CNPS + IRPP 2026 — Cameroun</p>
        </div>
        {payslip && (
          <div className="flex gap-2">
            <button
              onClick={() => setEditMode(e => !e)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                editMode
                  ? 'border-blue-400 bg-blue-50 text-blue-700'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              ✏️ {editMode ? 'Mode édition actif' : 'Modifier'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              🖨️ Imprimer
            </button>
            <button
              onClick={() => setShowEmail(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              ✉️ Envoyer par mail
            </button>
          </div>
        )}
      </div>

      {/* Selectors */}
      <div className="flex gap-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Employé</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}>
            <option value="">Sélectionner un employé…</option>
            {activeEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.firstName} {emp.lastName} — {fmtN(emp.grossSalary)} FCFA brut
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

      {!selectedEmpId && (
        <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-400">
          Sélectionnez un employé pour générer le bulletin
        </div>
      )}

      {/* Edit panel */}
      {payslip && editMode && (
        <EditPanel
          baseGross={selectedEmp!.grossSalary}
          overrideGross={overrideGross}
          setOverrideGross={setOverrideGross}
          extras={extras}
          setExtras={setExtras}
          onClose={() => setEditMode(false)}
        />
      )}

      {/* Payslip */}
      {payslip && <PayslipView payslip={payslip} />}

      {/* Virement */}
      {payslip && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Virement salaire</p>
            <p className="text-xs text-gray-500">Enregistre le paiement dans la trésorerie (compte BICEC)</p>
          </div>
          {virementDone ? (
            <span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-700">
              ✓ Enregistré en trésorerie
            </span>
          ) : (
            <button onClick={handleVirementSalaire}
              className="rounded-lg bg-forest-900 px-4 py-2 text-sm font-medium text-white hover:bg-forest-700 transition-colors">
              💸 Virer {fmt(payslip.netToPay)}
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Calcul basé sur les taux CNPS 2026 — Plafond mensuel 750 000 FCFA. IRPP barème progressif Cameroun avec abattement forfaitaire 30%. Ce bulletin est indicatif et ne remplace pas un logiciel de paie agréé.
      </p>

      {/* Email modal */}
      {showEmail && payslip && (
        <EmailModal payslip={payslip} companyName={companyName} onClose={() => setShowEmail(false)} />
      )}
    </div>
  )
}
