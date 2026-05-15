import { useState, useMemo, Fragment } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { useFiscalYears, useSelectedFiscalYearData } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import type { BalanceRow } from '@/services/accountingApi'

// ── Tab types ─────────────────────────────────────────────────────────────────

type BalanceTab = 'generale' | 'clients' | 'fournisseurs' | 'agee-clients' | 'agee-fournisseurs'

const TABS: { id: BalanceTab; label: string; icon: string }[] = [
  { id: 'generale',          label: 'Balance générale',       icon: '📊' },
  { id: 'clients',           label: 'Balance clients',         icon: '👤' },
  { id: 'fournisseurs',      label: 'Balance fournisseurs',    icon: '🏭' },
  { id: 'agee-clients',      label: 'Âgée clients',            icon: '⏱' },
  { id: 'agee-fournisseurs', label: 'Âgée fournisseurs',       icon: '⏱' },
]

type AgingBucket = 'courant' | '0-30' | '31-60' | '61-90' | '91+'

const AGING_BUCKETS: AgingBucket[] = ['courant', '0-30', '31-60', '61-90', '91+']
const AGING_LABELS: Record<AgingBucket, string> = {
  'courant': 'Non échu',
  '0-30':    '0 – 30 j',
  '31-60':   '31 – 60 j',
  '61-90':   '61 – 90 j',
  '91+':     '> 90 j',
}
const AGING_COLORS: Record<AgingBucket, string> = {
  'courant': 'text-green-700',
  '0-30':    'text-blue-700',
  '31-60':   'text-amber-600',
  '61-90':   'text-orange-600',
  '91+':     'text-red-700',
}
const AGING_BG: Record<AgingBucket, string> = {
  'courant': 'bg-green-50',
  '0-30':    'bg-blue-50',
  '31-60':   'bg-amber-50',
  '61-90':   'bg-orange-50',
  '91+':     'bg-red-50',
}

function getAgingBucket(ageDays: number): AgingBucket {
  if (ageDays <  0)  return 'courant'
  if (ageDays <= 30) return '0-30'
  if (ageDays <= 60) return '31-60'
  if (ageDays <= 90) return '61-90'
  return '91+'
}

// Account classification (same for PCG / OHADA — both use class 4)
function isClientAccount(account: string)    { return account.startsWith('41') }
function isSupplierAccount(account: string)  { return account.startsWith('40') }

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
    </div>
  )
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const CLASSE_LABEL: Record<string, string> = {
  '1': 'Classe 1 — Capitaux',
  '2': 'Classe 2 — Immobilisations',
  '3': 'Classe 3 — Stocks',
  '4': 'Classe 4 — Tiers',
  '5': 'Classe 5 — Trésorerie',
  '6': 'Classe 6 — Charges',
  '7': 'Classe 7 — Produits',
  '8': 'Classe 8 — Spéciaux',
}

// ── Print — Balance générale/clients/fournisseurs ─────────────────────────────

interface PrintInfo {
  companyName: string
  legalForm: string | null
  siret: string | null
  siren: string | null
  vatNumber: string | null
  address: string | null
  city: string | null
  country: string
}

function openBalancePrint(
  info: PrintInfo,
  startDate: string,
  endDate: string,
  rows: BalanceRow[],
  totalDebit: number,
  totalCredit: number,
  equilibre: boolean,
  fmtAmt: (v: number) => string,
  readOnly: boolean,
  coveredYears: number[],
  multiYear: boolean,
  tabLabel: string,
) {
  const today    = new Date().toLocaleDateString('fr-FR')
  const isOHADA  = !['FR', 'BE', 'CH', 'LU'].includes(info.country)
  const idLabel  = isOHADA ? 'NUI / RCCM' : 'SIRET'
  const idValue  = isOHADA ? (info.vatNumber ?? '—') : (info.siret ?? info.siren ?? '—')
  const docTitle = isOHADA
    ? `${tabLabel.toUpperCase()} (SYSCOHADA révisé)`
    : `${tabLabel.toUpperCase()} (Plan Comptable Général)`
  const refText  = isOHADA
    ? 'Établi conformément au Système Comptable OHADA — SYSCOHADA révisé'
    : 'Établi conformément au Plan Comptable Général (PCG) — Règlement ANC n° 2014-03'

  const totalSD = rows.reduce((s, r) => s + r.soldeDebiteur,  0)
  const totalSC = rows.reduce((s, r) => s + r.soldeCrediteur, 0)

  const tableRows = rows.map((r, i) => `
    <tr class="${i % 2 === 0 ? '' : 'alt'}">
      <td class="mono">${r.account}</td>
      <td>${r.label}</td>
      <td class="num">${r.totalDebit  > 0 ? fmtAmt(r.totalDebit)  : ''}</td>
      <td class="num">${r.totalCredit > 0 ? fmtAmt(r.totalCredit) : ''}</td>
      <td class="num blue">${r.soldeDebiteur  > 0 ? fmtAmt(r.soldeDebiteur)  : ''}</td>
      <td class="num orange">${r.soldeCrediteur > 0 ? fmtAmt(r.soldeCrediteur) : ''}</td>
    </tr>
  `).join('')

  const multiYearNote = multiYear
    ? `<div class="multi-note">ℹ La balance couvre ${coveredYears.length} exercices (${coveredYears.join(', ')}) — les mouvements sont cumulés par compte.</div>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<title>${tabLabel} — ${coveredYears.join('/')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:9pt;color:#111;background:#fff}
.doc{padding:12mm 15mm}
.header{border-bottom:2px solid #1b4332;padding-bottom:8px;margin-bottom:10px}
.header-top{display:flex;justify-content:space-between;align-items:flex-start}
.company-name{font-size:13pt;font-weight:bold;color:#1b4332}
.company-sub{font-size:8pt;color:#555;margin-top:2px}
.doc-title{font-size:11pt;font-weight:bold;color:#1b4332;text-align:right}
.doc-meta{font-size:8pt;color:#666;margin-top:2px;text-align:right}
.info-row{display:flex;gap:18px;margin-top:5px;font-size:8pt;color:#444}
.info-label{font-weight:bold}
.ro-banner{background:#fff7ed;border:1px solid #f59e0b;border-radius:4px;padding:4px 10px;font-size:8pt;color:#92400e;margin-bottom:8px}
.multi-note{background:#f0f9ff;border:1px solid #7dd3fc;border-radius:4px;padding:4px 10px;font-size:8pt;color:#0369a1;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-top:8px}
thead tr:first-child th{background:#1b4332;color:#fff;font-size:8pt;font-weight:bold;padding:4px 6px;border:.5px solid #0f2e21;text-align:left}
thead tr:first-child th.center{text-align:center}
thead tr:first-child th.num{text-align:right}
thead tr.sub th{background:#2d6a4f;font-size:7.5pt;font-weight:normal;color:#d0ede3;padding:2px 6px;text-align:center;border:.5px solid #1b4332}
tbody td{font-size:8pt;padding:2.5px 6px;border:.5px solid #e0e0e0}
tbody tr.alt td{background:#f7faf7}
tfoot td{font-size:8.5pt;font-weight:bold;padding:4px 6px;border:.5px solid #ccc;background:#e8efea;border-top:2px solid #1b4332}
.num{text-align:right;font-family:monospace}
.mono{font-family:monospace;font-size:8pt}
.blue{color:#1d4ed8}
.orange{color:#c2410c}
.eq-block{margin-top:10px;padding:6px 10px;border-radius:4px;display:flex;align-items:center;gap:10px;font-size:8.5pt;font-weight:bold;border:1px solid}
.eq-ok{background:#f0fdf4;border-color:#86efac;color:#166534}
.eq-err{background:#fef2f2;border-color:#fca5a5;color:#991b1b}
.footer{margin-top:16px;border-top:1px solid #ccc;padding-top:6px;font-size:7pt;color:#888;display:flex;justify-content:space-between}
@page{size:A4 portrait;margin:15mm 12mm}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="doc">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name">${info.companyName}</div>
        <div class="company-sub">${[info.legalForm, info.address, info.city].filter(Boolean).join(' · ')}</div>
        <div class="info-row">
          <span><span class="info-label">${idLabel} :</span> ${idValue}</span>
          ${info.vatNumber && !isOHADA ? `<span><span class="info-label">N° TVA :</span> ${info.vatNumber}</span>` : ''}
        </div>
      </div>
      <div>
        <div class="doc-title">${docTitle}</div>
        <div class="doc-meta">Période : ${fmtDate(startDate)} au ${fmtDate(endDate)}</div>
        <div class="doc-meta">Exercice(s) : ${coveredYears.join(', ')}</div>
        <div class="doc-meta">Édité le ${today}</div>
      </div>
    </div>
  </div>
  ${readOnly ? `<div class="ro-banner">⚠ Période(s) clôturée(s) — document en consultation uniquement</div>` : ''}
  ${multiYearNote}
  <table>
    <colgroup><col style="width:9%"/><col style="width:31%"/><col style="width:15%"/><col style="width:15%"/><col style="width:15%"/><col style="width:15%"/></colgroup>
    <thead>
      <tr>
        <th rowspan="2">N° Compte</th>
        <th rowspan="2">Intitulé</th>
        <th colspan="2" class="center">Mouvements de la période</th>
        <th colspan="2" class="center">Soldes</th>
      </tr>
      <tr class="sub">
        <th>Débit</th><th>Crédit</th>
        <th>Débiteur D</th><th>Créditeur C</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">TOTAL GÉNÉRAL</td>
        <td class="num">${fmtAmt(totalDebit)}</td>
        <td class="num">${fmtAmt(totalCredit)}</td>
        <td class="num blue">${fmtAmt(totalSD)}</td>
        <td class="num orange">${fmtAmt(totalSC)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="eq-block ${equilibre ? 'eq-ok' : 'eq-err'}">
    <span>${equilibre ? '✓ Balance ÉQUILIBRÉE' : '✗ Balance DÉSÉQUILIBRÉE'}</span>
    <span>Σ Débit = Σ Crédit = ${fmtAmt(totalDebit)}</span>
    ${!equilibre ? `<span>Écart : ${fmtAmt(Math.abs(totalDebit - totalCredit))}</span>` : ''}
  </div>
  <div class="footer">
    <span>${refText}</span>
    <span>Édité le ${today} — ${info.companyName}</span>
  </div>
</div></body></html>`

  const win = window.open('', '_blank', 'width=900,height=800')
  if (!win) { alert('Autorisez les popups pour imprimer.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ── Print — Balance âgée ──────────────────────────────────────────────────────

interface AgedRow {
  account: string
  label:   string
  type:    'client' | 'fournisseur' | 'tiers'
  buckets: Record<AgingBucket, number>
  total:   number
}

function openAgedPrint(
  info: PrintInfo,
  refDate: string,
  rows: AgedRow[],
  fmtAmt: (v: number) => string,
  coveredYears: number[],
  tabLabel: string,
) {
  const today   = new Date().toLocaleDateString('fr-FR')
  const isOHADA = !['FR', 'BE', 'CH', 'LU'].includes(info.country)
  const idLabel = isOHADA ? 'NUI / RCCM' : 'SIRET'
  const idValue = isOHADA ? (info.vatNumber ?? '—') : (info.siret ?? info.siren ?? '—')

  const totalByBucket = AGING_BUCKETS.map(b => rows.reduce((s, r) => s + Math.abs(r.buckets[b]), 0))
  const grandTotal    = rows.reduce((s, r) => s + Math.abs(r.total), 0)

  const BUCKET_COLORS_PRINT: Record<AgingBucket, string> = {
    'courant': '#166534',
    '0-30':    '#1d4ed8',
    '31-60':   '#b45309',
    '61-90':   '#c2410c',
    '91+':     '#991b1b',
  }

  const tableRows = rows.map((r, i) => {
    const cells = AGING_BUCKETS.map(b => {
      const v = Math.abs(r.buckets[b])
      return `<td class="num" style="color:${v > 0.01 ? BUCKET_COLORS_PRINT[b] : '#ccc'}">${v > 0.01 ? fmtAmt(v) : '—'}</td>`
    }).join('')
    return `<tr class="${i % 2 === 0 ? '' : 'alt'}">
      <td class="mono">${r.account}</td>
      <td>${r.label}</td>
      ${cells}
      <td class="num bold">${fmtAmt(Math.abs(r.total))}</td>
    </tr>`
  }).join('')

  const totCells = AGING_BUCKETS.map((b, i) => {
    const v = totalByBucket[i] ?? 0
    return `<td class="num" style="color:${v > 0.01 ? BUCKET_COLORS_PRINT[b] : '#ccc'}">${v > 0.01 ? fmtAmt(v) : '—'}</td>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<title>${tabLabel} — ${coveredYears.join('/')}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:9pt;color:#111;background:#fff}
.doc{padding:10mm 12mm}
.header{border-bottom:2px solid #1b4332;padding-bottom:7px;margin-bottom:9px}
.header-top{display:flex;justify-content:space-between;align-items:flex-start}
.company-name{font-size:12pt;font-weight:bold;color:#1b4332}
.company-sub{font-size:7.5pt;color:#555;margin-top:2px}
.doc-title{font-size:10.5pt;font-weight:bold;color:#1b4332;text-align:right}
.doc-meta{font-size:7.5pt;color:#666;margin-top:2px;text-align:right}
.info-row{display:flex;gap:16px;margin-top:5px;font-size:7.5pt;color:#444}
.info-label{font-weight:bold}
table{width:100%;border-collapse:collapse;margin-top:8px}
thead th{background:#1b4332;color:#fff;font-size:8pt;font-weight:bold;padding:4px 5px;border:.5px solid #0f2e21;text-align:right}
thead th.left{text-align:left}
tbody td{font-size:8pt;padding:2.5px 5px;border:.5px solid #e0e0e0;vertical-align:middle}
tbody tr.alt td{background:#f7faf7}
tfoot td{font-size:8.5pt;font-weight:bold;padding:4px 5px;border:.5px solid #ccc;background:#e8efea;border-top:2px solid #1b4332;text-align:right}
tfoot td.left{text-align:left}
.num{text-align:right;font-family:monospace}
.mono{font-family:monospace;font-size:7.5pt}
.bold{font-weight:bold}
.info-box{background:#f0f9ff;border:1px solid #bae6fd;border-radius:3px;padding:4px 8px;font-size:7.5pt;color:#0369a1;margin-bottom:7px}
.footer{margin-top:12px;border-top:1px solid #ccc;padding-top:5px;font-size:7pt;color:#888;display:flex;justify-content:space-between}
@page{size:A4 landscape;margin:12mm 10mm}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><div class="doc">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name">${info.companyName}</div>
        <div class="company-sub">${[info.legalForm, info.address, info.city].filter(Boolean).join(' · ')}</div>
        <div class="info-row">
          <span><span class="info-label">${idLabel} :</span> ${idValue}</span>
        </div>
      </div>
      <div>
        <div class="doc-title">${tabLabel.toUpperCase()}</div>
        <div class="doc-meta">Ancienneté au : ${fmtDate(refDate)}</div>
        <div class="doc-meta">Exercice(s) : ${coveredYears.join(', ')}</div>
        <div class="doc-meta">Édité le ${today}</div>
      </div>
    </div>
  </div>
  <div class="info-box">
    💡 Seules les écritures <strong>non lettrées</strong> des comptes de tiers sont prises en compte.
    L'ancienneté est calculée depuis la date de l'écriture jusqu'au ${fmtDate(refDate)}.
  </div>
  <table>
    <colgroup>
      <col style="width:8%"/>
      <col style="width:22%"/>
      <col style="width:13%"/><col style="width:13%"/>
      <col style="width:13%"/><col style="width:13%"/><col style="width:13%"/>
      <col style="width:13%"/>
    </colgroup>
    <thead>
      <tr>
        <th class="left">Compte</th>
        <th class="left">Intitulé</th>
        <th>Non échu</th>
        <th>0 – 30 j</th>
        <th>31 – 60 j</th>
        <th>61 – 90 j</th>
        <th>&gt; 90 j</th>
        <th>Total ouvert</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
    <tfoot>
      <tr>
        <td class="left" colspan="2">TOTAL GÉNÉRAL (${rows.length} compte${rows.length > 1 ? 's' : ''})</td>
        ${totCells}
        <td>${fmtAmt(grandTotal)}</td>
      </tr>
    </tfoot>
  </table>
  <div class="footer">
    <span>Balance âgée — ${tabLabel}</span>
    <span>Édité le ${today} — ${info.companyName}</span>
  </div>
</div></body></html>`

  const win = window.open('', '_blank', 'width=1100,height=800')
  if (!win) { alert('Autorisez les popups pour imprimer.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ── Ligne de balance ──────────────────────────────────────────────────────────

function BalanceRowUI({ r, fmt, onClick }: { r: BalanceRow; fmt: (v: number) => string; onClick: () => void }) {
  return (
    <tr
      onClick={onClick}
      className="hover:bg-[#1b4332]/5 cursor-pointer group transition-colors"
      title={`Voir le détail du compte ${r.account}`}
    >
      <td className="px-5 py-2.5 font-mono text-xs text-[#1b4332] group-hover:underline">{r.account}</td>
      <td className="px-5 py-2.5 text-gray-700 group-hover:text-[#1b4332]">
        {r.label}
        <span className="ml-2 opacity-0 group-hover:opacity-60 text-[10px] text-[#1b4332]">→ détail</span>
      </td>
      <td className="px-5 py-2.5 text-right text-gray-700">{r.totalDebit  > 0 ? fmt(r.totalDebit)  : ''}</td>
      <td className="px-5 py-2.5 text-right text-gray-700">{r.totalCredit > 0 ? fmt(r.totalCredit) : ''}</td>
      <td className="px-5 py-2.5 text-right font-medium text-blue-700">{r.soldeDebiteur  > 0 ? fmt(r.soldeDebiteur)  : ''}</td>
      <td className="px-5 py-2.5 text-right font-medium text-orange-600">{r.soldeCrediteur > 0 ? fmt(r.soldeCrediteur) : ''}</td>
    </tr>
  )
}

// ── Sub-table shared by générale / clients / fournisseurs ─────────────────────

interface BalanceTableProps {
  rows:       BalanceRow[]
  groupByClass: boolean
  totalD:     number
  totalC:     number
  equilibre:  boolean
  hasClosedFY: boolean
  search:     string
  fmt:        (v: number) => string
  navigate:   (to: string) => void
}

function BalanceTable({ rows, groupByClass, totalD, totalC, equilibre, hasClosedFY, search, fmt, navigate }: BalanceTableProps) {
  const groupedRows = useMemo(() => {
    if (!groupByClass) return null
    const map = new Map<string, BalanceRow[]>()
    for (const r of rows) {
      const cls = r.account.charAt(0)
      if (!map.has(cls)) map.set(cls, [])
      map.get(cls)!.push(r)
    }
    return map
  }, [rows, groupByClass])

  if (rows.length === 0) return null

  return (
    <div className={`rounded-xl border bg-white overflow-hidden ${hasClosedFY ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b text-left text-xs font-semibold text-white ${hasClosedFY ? 'bg-amber-800' : 'bg-[#1b4332]'}`}>
              <th className="px-5 py-3">Compte</th>
              <th className="px-5 py-3">Intitulé</th>
              <th className="px-5 py-3 text-center" colSpan={2}>
                <span className="block text-[10px] font-normal opacity-75 mb-0.5">Mouvements de la période</span>
                <div className="flex justify-center gap-8"><span>Débit</span><span>Crédit</span></div>
              </th>
              <th className="px-5 py-3 text-center" colSpan={2}>
                <span className="block text-[10px] font-normal opacity-75 mb-0.5">Soldes</span>
                <div className="flex justify-center gap-8"><span>Débiteur D</span><span>Créditeur C</span></div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {groupedRows
              ? Array.from(groupedRows.entries()).map(([cls, clsRows]) => {
                  const clsD  = clsRows.reduce((s, r) => s + r.totalDebit,     0)
                  const clsC  = clsRows.reduce((s, r) => s + r.totalCredit,    0)
                  const clsSD = clsRows.reduce((s, r) => s + r.soldeDebiteur,  0)
                  const clsSC = clsRows.reduce((s, r) => s + r.soldeCrediteur, 0)
                  return (
                    <Fragment key={cls}>
                      <tr className="border-t-2 border-[#1b4332]/20">
                        <td colSpan={6} className="px-5 py-2 text-xs font-semibold text-[#1b4332] bg-[#1b4332]/5">
                          {CLASSE_LABEL[cls] ?? `Classe ${cls}`}
                        </td>
                      </tr>
                      {clsRows.map(r => (
                        <BalanceRowUI key={r.account} r={r} fmt={fmt}
                          onClick={() => navigate(`/app/accounting/grand-livre?compte=${encodeURIComponent(r.account)}`)} />
                      ))}
                      <tr className="border-t border-gray-200 bg-gray-50 font-semibold text-xs">
                        <td colSpan={2} className="px-5 py-2 text-gray-600 italic">Sous-total {cls}</td>
                        <td className="px-5 py-2 text-right">{fmt(clsD)}</td>
                        <td className="px-5 py-2 text-right">{fmt(clsC)}</td>
                        <td className="px-5 py-2 text-right text-blue-700">{clsSD > 0 ? fmt(clsSD) : ''}</td>
                        <td className="px-5 py-2 text-right text-orange-600">{clsSC > 0 ? fmt(clsSC) : ''}</td>
                      </tr>
                    </Fragment>
                  )
                })
              : rows.map(r => (
                  <BalanceRowUI key={r.account} r={r} fmt={fmt}
                    onClick={() => navigate(`/app/accounting/grand-livre?compte=${encodeURIComponent(r.account)}`)} />
                ))
            }
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#1b4332] bg-[#1b4332]/10 font-bold text-sm">
              <td colSpan={2} className="px-5 py-3 text-gray-900">TOTAL</td>
              <td className="px-5 py-3 text-right">{fmt(totalD)}</td>
              <td className="px-5 py-3 text-right">{fmt(totalC)}</td>
              <td className="px-5 py-3 text-right text-blue-700">{fmt(rows.reduce((s, r) => s + r.soldeDebiteur,  0))}</td>
              <td className="px-5 py-3 text-right text-orange-600">{fmt(rows.reduce((s, r) => s + r.soldeCrediteur, 0))}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={`flex items-center justify-between px-5 py-3 border-t text-sm font-medium
        ${equilibre ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
        <span>
          {equilibre ? '✓ Balance équilibrée' : '✗ Balance déséquilibrée'}
          {search && ' (sur la sélection)'}
        </span>
        <span className="text-xs font-normal opacity-75">
          Σ Débit = Σ Crédit = {fmt(totalD)}
          {!equilibre && <> · Écart : {fmt(Math.abs(totalD - totalC))}</>}
        </span>
      </div>
    </div>
  )
}

// ── Balance âgée — table ──────────────────────────────────────────────────────

function AgedTable({ rows, fmt }: { rows: AgedRow[]; fmt: (v: number) => string }) {
  if (rows.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
      <p className="text-2xl">✅</p>
      <p className="text-sm font-medium">Aucune écriture non lettrée</p>
      <p className="text-xs text-gray-400">Toutes les écritures sont lettrées, ou aucune écriture n'existe pour cette période.</p>
    </div>
  )

  const totalByBucket = AGING_BUCKETS.map(b => rows.reduce((s, r) => s + Math.abs(r.buckets[b]), 0))
  const grandTotal    = rows.reduce((s, r) => s + Math.abs(r.total), 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead>
            <tr className="bg-[#1b4332] text-white text-xs font-semibold">
              <th className="px-4 py-3 text-left">Compte</th>
              <th className="px-4 py-3 text-left">Intitulé</th>
              {AGING_BUCKETS.map(b => (
                <th key={b} className="px-4 py-3 text-right">{AGING_LABELS[b]}</th>
              ))}
              <th className="px-4 py-3 text-right">Total ouvert</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => (
              <tr key={r.account} className={`hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                <td className="px-4 py-2.5 font-mono text-xs text-[#1b4332]">{r.account}</td>
                <td className="px-4 py-2.5 text-xs text-gray-700 max-w-[220px] truncate">{r.label}</td>
                {AGING_BUCKETS.map(b => {
                  const v = Math.abs(r.buckets[b])
                  return (
                    <td key={b} className={`px-4 py-2.5 text-right text-xs font-medium ${v > 0.01 ? AGING_COLORS[b] : 'text-gray-300'}`}>
                      {v > 0.01
                        ? <span className={`inline-block rounded px-1.5 py-0.5 ${AGING_BG[b]}`}>{fmt(v)}</span>
                        : '—'}
                    </td>
                  )
                })}
                <td className="px-4 py-2.5 text-right text-xs font-bold text-gray-900">
                  {fmt(Math.abs(r.total))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#1b4332] bg-[#1b4332]/10 font-bold text-xs">
              <td colSpan={2} className="px-4 py-3 text-gray-900">
                TOTAL — {rows.length} compte{rows.length > 1 ? 's' : ''}
              </td>
              {AGING_BUCKETS.map((b, i) => {
                const v = totalByBucket[i] ?? 0
                return (
                  <td key={b} className={`px-4 py-3 text-right ${v > 0.01 ? AGING_COLORS[b] : 'text-gray-400'}`}>
                    {v > 0.01 ? fmt(v) : '—'}
                  </td>
                )
              })}
              <td className="px-4 py-3 text-right text-gray-900">{fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        💡 Seules les écritures <strong>non lettrées</strong> sont affichées.
        L'ancienneté est calculée depuis la date de l'écriture jusqu'à la date de fin de période sélectionnée.
      </div>
    </div>
  )
}

// ── KPI cards ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs mt-0.5 opacity-60">{sub}</p>}
    </div>
  )
}

// ── Aging legend strip ────────────────────────────────────────────────────────

function AgingLegend() {
  return (
    <div className="flex items-center gap-4 flex-wrap px-1">
      {AGING_BUCKETS.map(b => (
        <span key={b} className={`inline-flex items-center gap-1.5 text-xs font-medium ${AGING_COLORS[b]}`}>
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${AGING_BG[b]} border border-current/30`} />
          {AGING_LABELS[b]}
        </span>
      ))}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BalancePage() {
  const { fmt }              = useCurrency()
  const { company, country } = useCompanySettings()
  const navigate             = useNavigate()
  const { data: allFY, isLoading: yearsLoading } = useFiscalYears()
  const globalFY = useSelectedFiscalYearData()

  // ── Tab ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<BalanceTab>('generale')
  const isAgeeTab = activeTab === 'agee-clients' || activeTab === 'agee-fournisseurs'

  // ── Accounting zone (from company settings) ───────────────────────────────
  const isOHADA = !['FR', 'BE', 'CH', 'LU'].includes(country)

  // ── Dates initiales ───────────────────────────────────────────────────────
  const defaultFrom = globalFY?.startDate.slice(0, 10) ?? toISO(new Date(new Date().getFullYear(), 0, 1))
  const defaultTo   = globalFY?.endDate.slice(0, 10)   ?? toISO(new Date(new Date().getFullYear(), 11, 31))

  const [dateFrom,     setDateFrom]     = useState(defaultFrom)
  const [dateTo,       setDateTo]       = useState(defaultTo)
  const [search,       setSearch]       = useState('')
  const [groupByClass, setGroupByClass] = useState(false)

  // ── Exercices couverts ────────────────────────────────────────────────────
  const coveredFYs = useMemo(() => {
    if (!allFY) return []
    const from = new Date(dateFrom)
    const to   = new Date(dateTo)
    return allFY
      .filter(fy => new Date(fy.startDate) <= to && new Date(fy.endDate) >= from)
      .sort((a, b) => a.year - b.year)
  }, [allFY, dateFrom, dateTo])

  const hasClosedFY  = coveredFYs.some(fy => fy.status === 'CLOSED' || fy.status === 'LOCKED')
  const coveredYears = coveredFYs.map(fy => fy.year)
  const isMultiYear  = coveredFYs.length > 1

  // ── Balance queries (tabs 1-3) ────────────────────────────────────────────
  const fyQueries = useQueries({
    queries: coveredFYs.map(fy => ({
      queryKey:  ['balance-journal', fy.id],
      queryFn:   () => accountingApi.getBalanceByFiscalYear(fy.id),
      staleTime: 30_000,
      enabled:   coveredFYs.length > 0,
    })),
  })

  // ── Journal queries (tabs âgée clients / âgée fournisseurs) ──────────────
  const journalQueries = useQueries({
    queries: coveredFYs.map(fy => ({
      queryKey:  ['journal', fy.id],
      queryFn:   () => accountingApi.getJournal(fy.id),
      staleTime: 30_000,
      enabled:   isAgeeTab && coveredFYs.length > 0,
    })),
  })

  const isLoadingBalance  = yearsLoading || fyQueries.some(q => q.isLoading)
  const isLoadingJournal  = journalQueries.some(q => q.isLoading)
  const isLoading         = isLoadingBalance || (isAgeeTab && isLoadingJournal)
  const isError           = fyQueries.some(q => q.isError)

  // ── Fusion des balances (cumul par compte) ────────────────────────────────
  const mergedRows = useMemo(() => {
    const rowMap = new Map<string, BalanceRow>()
    fyQueries.forEach(q => {
      if (!q.data) return
      for (const r of q.data.rows) {
        const existing = rowMap.get(r.account)
        if (!existing) {
          rowMap.set(r.account, { ...r })
        } else {
          rowMap.set(r.account, {
            ...existing,
            totalDebit:     existing.totalDebit     + r.totalDebit,
            totalCredit:    existing.totalCredit    + r.totalCredit,
            soldeDebiteur:  existing.soldeDebiteur  + r.soldeDebiteur,
            soldeCrediteur: existing.soldeCrediteur + r.soldeCrediteur,
          })
        }
      }
    })
    return Array.from(rowMap.values()).sort((a, b) => a.account.localeCompare(b.account))
  }, [fyQueries])

  // ── Filtrage recherche ────────────────────────────────────────────────────
  const searchedRows = useMemo<BalanceRow[]>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return mergedRows
    return mergedRows.filter(r =>
      r.account.toLowerCase().includes(q) || r.label.toLowerCase().includes(q)
    )
  }, [mergedRows, search])

  // ── Vues par onglet (générale / clients / fournisseurs) ───────────────────
  const generaleRows     = searchedRows
  const clientRows       = useMemo(() => searchedRows.filter(r => isClientAccount(r.account)),   [searchedRows])
  const fournisseurRows  = useMemo(() => searchedRows.filter(r => isSupplierAccount(r.account)), [searchedRows])

  // Choose active rows for the shared balance table
  const activeRows = activeTab === 'clients'      ? clientRows
                   : activeTab === 'fournisseurs' ? fournisseurRows
                   : generaleRows

  const activeTotalD  = activeRows.reduce((s, r) => s + r.totalDebit,  0)
  const activeTotalC  = activeRows.reduce((s, r) => s + r.totalCredit, 0)
  const activeEq      = Math.abs(activeTotalD - activeTotalC) < 0.01

  // ── Balance âgée — tous tiers (calculé quand onglet âgée actif) ───────────
  const allAgedRows = useMemo((): AgedRow[] => {
    if (!isAgeeTab) return []
    const refDate = new Date(dateTo)
    const accMap  = new Map<string, { label: string; type: AgedRow['type']; buckets: Record<AgingBucket, number> }>()

    for (const q of journalQueries) {
      if (!q.data) continue
      for (const entry of q.data.entries) {
        if (!entry.account.startsWith('4')) continue
        if (entry.lettrage) continue

        const ageDays = Math.floor(
          (refDate.getTime() - new Date(entry.date).getTime()) / (1000 * 60 * 60 * 24)
        )
        const bucket = getAgingBucket(ageDays)
        const net = entry.debit - entry.credit

        if (!accMap.has(entry.account)) {
          const type: AgedRow['type'] = isClientAccount(entry.account)   ? 'client'
                                       : isSupplierAccount(entry.account) ? 'fournisseur'
                                       : 'tiers'
          accMap.set(entry.account, {
            label:   '',
            type,
            buckets: { 'courant': 0, '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 },
          })
        }
        accMap.get(entry.account)!.buckets[bucket] += net
      }
    }

    // Fill labels from balance data
    for (const row of mergedRows) {
      if (accMap.has(row.account)) {
        accMap.get(row.account)!.label = row.label
      }
    }

    return Array.from(accMap.entries())
      .map(([account, data]) => ({
        account,
        label:   data.label || account,
        type:    data.type,
        buckets: data.buckets,
        total:   Object.values(data.buckets).reduce((s, v) => s + v, 0),
      }))
      .filter(r => Math.abs(r.total) > 0.01)
      .sort((a, b) => a.account.localeCompare(b.account))
  }, [isAgeeTab, journalQueries, mergedRows, dateTo])

  // ── Split âgée par type ───────────────────────────────────────────────────
  const agedClientRows     = useMemo(() => allAgedRows.filter(r => r.type === 'client'),      [allAgedRows])
  const agedSupplierRows   = useMemo(() => allAgedRows.filter(r => r.type === 'fournisseur'), [allAgedRows])
  const agedOtherRows      = useMemo(() => allAgedRows.filter(r => r.type === 'tiers'),       [allAgedRows])

  // Rows displayed for each aged tab (clients + autres tiers / fournisseurs only)
  const displayedAgedRows = useMemo(() => {
    if (activeTab === 'agee-clients')     return [...agedClientRows, ...agedOtherRows]
    if (activeTab === 'agee-fournisseurs') return agedSupplierRows
    return []
  }, [activeTab, agedClientRows, agedSupplierRows, agedOtherRows])

  // ── KPIs clients standard ─────────────────────────────────────────────────
  const clientKpis = useMemo(() => {
    const totalCreances  = clientRows.reduce((s, r) => s + r.soldeDebiteur,  0)
    const totalRecouvres = clientRows.reduce((s, r) => s + r.soldeCrediteur, 0)
    return { totalCreances, totalRecouvres, netARecouvrer: totalCreances - totalRecouvres }
  }, [clientRows])

  // ── KPIs fournisseurs standard ────────────────────────────────────────────
  const supplierKpis = useMemo(() => {
    const totalDettes  = fournisseurRows.reduce((s, r) => s + r.soldeCrediteur, 0)
    const avances      = fournisseurRows.reduce((s, r) => s + r.soldeDebiteur,  0)
    return { totalDettes, avances, netARegler: totalDettes - avances }
  }, [fournisseurRows])

  // ── KPIs âgée clients ─────────────────────────────────────────────────────
  const agedClientKpis = useMemo(() => {
    const rows    = agedClientRows
    const total   = rows.reduce((s, r) => s + Math.abs(r.total), 0)
    const courant = rows.reduce((s, r) => s + Math.abs(r.buckets['courant']), 0)
    const late30  = rows.reduce((s, r) => s + Math.abs(r.buckets['31-60']) + Math.abs(r.buckets['61-90']) + Math.abs(r.buckets['91+']), 0)
    const crit90  = rows.reduce((s, r) => s + Math.abs(r.buckets['91+']), 0)
    const tauxRetard = total > 0 ? (late30 / total) * 100 : 0
    return { total, courant, late30, crit90, tauxRetard }
  }, [agedClientRows])

  // ── KPIs âgée fournisseurs ────────────────────────────────────────────────
  const agedSupplierKpis = useMemo(() => {
    const rows   = agedSupplierRows
    const total  = rows.reduce((s, r) => s + Math.abs(r.total), 0)
    const courant = rows.reduce((s, r) => s + Math.abs(r.buckets['courant']), 0)
    const echu30 = rows.reduce((s, r) => s + Math.abs(r.buckets['31-60']) + Math.abs(r.buckets['61-90']) + Math.abs(r.buckets['91+']), 0)
    const urg90  = rows.reduce((s, r) => s + Math.abs(r.buckets['91+']), 0)
    const tauxEchu = total > 0 ? (echu30 / total) * 100 : 0
    return { total, courant, echu30, urg90, tauxEchu }
  }, [agedSupplierRows])

  // ── Print ─────────────────────────────────────────────────────────────────
  function handlePrint() {
    const info: PrintInfo = {
      companyName: company?.name ?? 'Entreprise',
      legalForm:   company?.legalForm ?? null,
      siren:       company?.siren ?? null,
      siret:       company?.siret ?? null,
      vatNumber:   company?.vatNumber ?? null,
      address:     company?.address ?? null,
      city:        company?.city ?? null,
      country,
    }

    if (isAgeeTab) {
      const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? 'Balance âgée'
      openAgedPrint(info, dateTo, displayedAgedRows, fmt, coveredYears, tabLabel)
      return
    }

    const tabLabel = TABS.find(t => t.id === activeTab)?.label ?? 'Balance'
    openBalancePrint(
      info, dateFrom, dateTo, activeRows,
      activeTotalD, activeTotalC, activeEq,
      fmt, hasClosedFY, coveredYears, isMultiYear,
      tabLabel,
    )
  }

  // ── Presets ───────────────────────────────────────────────────────────────
  function applyPreset(from: string, to: string) { setDateFrom(from); setDateTo(to) }
  const fyYear = globalFY?.year ?? new Date().getFullYear()

  const printDisabled = isAgeeTab
    ? displayedAgedRows.length === 0
    : activeRows.length === 0

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Balance des comptes</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {isOHADA ? 'SYSCOHADA révisé' : 'Plan Comptable Général (PCG)'}
            {coveredFYs.length > 0 && ` · exercice(s) ${coveredYears.join(', ')}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mergedRows.length > 0 && !isAgeeTab && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium
              ${activeEq ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {activeEq ? '✓ Équilibrée' : '✗ Déséquilibrée'}
            </span>
          )}
          <button
            onClick={handlePrint}
            disabled={printDisabled}
            className="flex items-center gap-2 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white
                       hover:bg-[#2d6a4f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            🖨 Éditer / Imprimer
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
        {TABS.map(tab => {
          const isAgeGroup = tab.id.startsWith('agee') && activeTab.startsWith('agee')
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-3 py-3 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === tab.id
                  ? 'border-[#1b4332] text-[#1b4332] bg-[#1b4332]/5'
                  : isAgeGroup
                  ? 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Bannière lecture seule */}
      {hasClosedFY && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-lg">🔒</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">Période(s) clôturée(s) — consultation uniquement</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {coveredFYs.filter(f => f.status === 'CLOSED' || f.status === 'LOCKED')
                .map(f => `Exercice ${f.year} (${f.status === 'CLOSED' ? 'clôturé' : 'verrouillé'})`)
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Note multi-exercices */}
      {isMultiYear && !isLoading && mergedRows.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-lg mt-0.5">ℹ</span>
          <p className="text-sm text-blue-800">
            La balance couvre <strong>{coveredFYs.length} exercices</strong> ({coveredYears.join(', ')}).
            Les mouvements et soldes sont cumulés par compte sur l'ensemble de la période.
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Période */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Du</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Au</label>
            <input type="date" value={dateTo} min={dateFrom} onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
          </div>

          {/* Presets */}
          <div className="flex items-end gap-1.5">
            {[
              { label: 'Exercice', from: defaultFrom, to: defaultTo },
              { label: 'T1', from: toISO(new Date(fyYear, 0, 1)),  to: toISO(new Date(fyYear, 2,  31)) },
              { label: 'T2', from: toISO(new Date(fyYear, 3, 1)),  to: toISO(new Date(fyYear, 5,  30)) },
              { label: 'T3', from: toISO(new Date(fyYear, 6, 1)),  to: toISO(new Date(fyYear, 8,  30)) },
              { label: 'T4', from: toISO(new Date(fyYear, 9, 1)),  to: toISO(new Date(fyYear, 11, 31)) },
            ].map(p => {
              const active = dateFrom === p.from && dateTo === p.to
              return (
                <button key={p.label} onClick={() => applyPreset(p.from, p.to)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors
                    ${active ? 'bg-[#1b4332] text-white border-[#1b4332]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                  {p.label}
                </button>
              )
            })}
          </div>

          {/* Exercices */}
          {(allFY ?? []).length > 0 && (
            <div className="flex items-end gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400 self-center">Exercices :</span>
              {(allFY ?? []).sort((a, b) => b.year - a.year).map(fy => {
                const active   = dateFrom === fy.startDate.slice(0, 10) && dateTo === fy.endDate.slice(0, 10)
                const isClosed = fy.status === 'CLOSED' || fy.status === 'LOCKED'
                return (
                  <button key={fy.id} onClick={() => applyPreset(fy.startDate.slice(0, 10), fy.endDate.slice(0, 10))}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors
                      ${active ? 'bg-[#1b4332] text-white border-[#1b4332]'
                        : isClosed ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                    {isClosed && '🔒 '}{fy.year}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-gray-100">
          {/* Recherche (masquée pour onglets âgée) */}
          {!isAgeeTab && (
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-500">Rechercher un compte</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input type="text" placeholder="N° compte ou intitulé…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm
                             focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
                {search && (
                  <button onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
                )}
              </div>
            </div>
          )}

          {/* Grouper par classe (générale only) */}
          {activeTab === 'generale' && (
            <label className="flex items-center gap-2 self-end pb-1.5 cursor-pointer">
              <input type="checkbox" checked={groupByClass} onChange={e => setGroupByClass(e.target.checked)}
                className="rounded border-gray-300 text-[#1b4332] focus:ring-[#1b4332]" />
              <span className="text-sm text-gray-600">Grouper par classe</span>
            </label>
          )}

          {/* Exercices couverts */}
          {coveredFYs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap ml-auto">
              <span className="text-xs text-gray-400">Couverts :</span>
              {coveredFYs.map(fy => {
                const isClosed = fy.status === 'CLOSED' || fy.status === 'LOCKED'
                const q = fyQueries[coveredFYs.indexOf(fy)]
                return (
                  <span key={fy.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${isClosed ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {isClosed ? '🔒' : '✓'} {fy.year}{q?.isLoading ? ' ⏳' : ''}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* États de chargement / erreur */}
      {isLoading && <Spinner />}
      {!isLoading && coveredFYs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
          <p className="text-2xl">📅</p>
          <p className="text-sm font-medium">Aucun exercice dans cette plage</p>
          <p className="text-xs text-gray-400">Modifiez les dates ou créez un exercice dans Paramètres.</p>
        </div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger la balance. Vérifiez la connexion au serveur.
        </div>
      )}

      {/* ── Tab content ── */}
      {!isLoading && coveredFYs.length > 0 && (
        <>
          {/* ── Balance générale ── */}
          {activeTab === 'generale' && (
            <>
              {generaleRows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  {search
                    ? <p className="text-sm">Aucun compte ne correspond à «&nbsp;{search}&nbsp;».</p>
                    : <p className="text-sm">Aucune écriture pour cet exercice.</p>}
                </div>
              )}
              <BalanceTable rows={generaleRows} groupByClass={groupByClass}
                totalD={activeTotalD} totalC={activeTotalC} equilibre={activeEq}
                hasClosedFY={hasClosedFY} search={search} fmt={fmt} navigate={navigate} />
            </>
          )}

          {/* ── Balance clients ── */}
          {activeTab === 'clients' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <KpiCard
                  label="Total créances clients"
                  value={fmt(clientKpis.totalCreances)}
                  sub="Solde débiteur comptes 41x"
                  color="border-blue-200 bg-blue-50 text-blue-900"
                />
                <KpiCard
                  label="Règlements reçus"
                  value={fmt(clientKpis.totalRecouvres)}
                  sub="Solde créditeur comptes 41x"
                  color="border-green-200 bg-green-50 text-green-900"
                />
                <KpiCard
                  label="Net à recouvrer"
                  value={fmt(Math.abs(clientKpis.netARecouvrer))}
                  sub={clientKpis.netARecouvrer >= 0 ? 'Solde net débiteur' : 'Solde net créditeur'}
                  color={clientKpis.netARecouvrer > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-gray-50 text-gray-800'}
                />
              </div>
              {clientRows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <p className="text-2xl">👤</p>
                  <p className="text-sm font-medium">Aucun compte client (41x) dans cet exercice</p>
                  <p className="text-xs text-gray-400">Les comptes clients sont identifiés par les numéros commençant par 41.</p>
                </div>
              )}
              <BalanceTable rows={clientRows} groupByClass={false}
                totalD={activeTotalD} totalC={activeTotalC} equilibre={activeEq}
                hasClosedFY={hasClosedFY} search={search} fmt={fmt} navigate={navigate} />
            </>
          )}

          {/* ── Balance fournisseurs ── */}
          {activeTab === 'fournisseurs' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <KpiCard
                  label="Total dettes fournisseurs"
                  value={fmt(supplierKpis.totalDettes)}
                  sub="Solde créditeur comptes 40x"
                  color="border-orange-200 bg-orange-50 text-orange-900"
                />
                <KpiCard
                  label="Paiements effectués"
                  value={fmt(supplierKpis.avances)}
                  sub="Solde débiteur comptes 40x"
                  color="border-green-200 bg-green-50 text-green-900"
                />
                <KpiCard
                  label="Net à régler"
                  value={fmt(Math.abs(supplierKpis.netARegler))}
                  sub={supplierKpis.netARegler >= 0 ? 'Solde net créditeur' : 'Solde net débiteur'}
                  color={supplierKpis.netARegler > 0 ? 'border-red-200 bg-red-50 text-red-900' : 'border-gray-200 bg-gray-50 text-gray-800'}
                />
              </div>
              {fournisseurRows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
                  <p className="text-2xl">🏭</p>
                  <p className="text-sm font-medium">Aucun compte fournisseur (40x) dans cet exercice</p>
                  <p className="text-xs text-gray-400">Les comptes fournisseurs sont identifiés par les numéros commençant par 40.</p>
                </div>
              )}
              <BalanceTable rows={fournisseurRows} groupByClass={false}
                totalD={activeTotalD} totalC={activeTotalC} equilibre={activeEq}
                hasClosedFY={hasClosedFY} search={search} fmt={fmt} navigate={navigate} />
            </>
          )}

          {/* ── Balance âgée clients ── */}
          {activeTab === 'agee-clients' && (
            <>
              {/* Banner */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <strong>Balance âgée clients</strong> — Créances non lettrées (comptes 41x) vieillies au{' '}
                <strong>{fmtDate(dateTo)}</strong>.
                Paramétrez le lettrage dans l'onglet <em>Lettrage</em> pour maintenir cette vue à jour.
              </div>

              {/* KPIs âgée clients */}
              {agedClientRows.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard
                    label="Total encours clients"
                    value={fmt(agedClientKpis.total)}
                    sub={`${agedClientRows.length} compte(s) ouverts`}
                    color="border-blue-200 bg-blue-50 text-blue-900"
                  />
                  <KpiCard
                    label="Non échu"
                    value={fmt(agedClientKpis.courant)}
                    sub="Créances dans les délais"
                    color="border-green-200 bg-green-50 text-green-900"
                  />
                  <KpiCard
                    label="En retard > 30 j"
                    value={fmt(agedClientKpis.late30)}
                    sub={`${agedClientKpis.tauxRetard.toFixed(1)}% du total encours`}
                    color={agedClientKpis.late30 > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-gray-200 bg-gray-50 text-gray-800'}
                  />
                  <KpiCard
                    label="Critique > 90 j"
                    value={fmt(agedClientKpis.crit90)}
                    sub="À relancer en priorité"
                    color={agedClientKpis.crit90 > 0 ? 'border-red-200 bg-red-50 text-red-900' : 'border-gray-200 bg-gray-50 text-gray-800'}
                  />
                </div>
              )}

              <AgingLegend />
              {isLoadingJournal ? <Spinner /> : <AgedTable rows={displayedAgedRows} fmt={fmt} />}
            </>
          )}

          {/* ── Balance âgée fournisseurs ── */}
          {activeTab === 'agee-fournisseurs' && (
            <>
              {/* Banner */}
              <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <strong>Balance âgée fournisseurs</strong> — Dettes non lettrées (comptes 40x) vieillies au{' '}
                <strong>{fmtDate(dateTo)}</strong>.
                Paramétrez le lettrage dans l'onglet <em>Lettrage</em> pour maintenir cette vue à jour.
              </div>

              {/* KPIs âgée fournisseurs */}
              {agedSupplierRows.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  <KpiCard
                    label="Total dettes fournisseurs"
                    value={fmt(agedSupplierKpis.total)}
                    sub={`${agedSupplierRows.length} compte(s) ouverts`}
                    color="border-orange-200 bg-orange-50 text-orange-900"
                  />
                  <KpiCard
                    label="Non échu"
                    value={fmt(agedSupplierKpis.courant)}
                    sub="Dettes dans les délais"
                    color="border-green-200 bg-green-50 text-green-900"
                  />
                  <KpiCard
                    label="Échu > 30 j"
                    value={fmt(agedSupplierKpis.echu30)}
                    sub={`${agedSupplierKpis.tauxEchu.toFixed(1)}% du total dettes`}
                    color={agedSupplierKpis.echu30 > 0 ? 'border-red-200 bg-red-50 text-red-900' : 'border-gray-200 bg-gray-50 text-gray-800'}
                  />
                  <KpiCard
                    label="Urgent > 90 j"
                    value={fmt(agedSupplierKpis.urg90)}
                    sub="Paiement en retard critique"
                    color={agedSupplierKpis.urg90 > 0 ? 'border-red-300 bg-red-100 text-red-900' : 'border-gray-200 bg-gray-50 text-gray-800'}
                  />
                </div>
              )}

              <AgingLegend />
              {isLoadingJournal ? <Spinner /> : <AgedTable rows={displayedAgedRows} fmt={fmt} />}
            </>
          )}
        </>
      )}
    </div>
  )
}
