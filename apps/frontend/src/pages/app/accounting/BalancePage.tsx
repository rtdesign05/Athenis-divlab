import { useState, useMemo, Fragment } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useFiscalYears, useSelectedFiscalYearData } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import type { BalanceRow } from '@/services/accountingApi'

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

// ── Regroupement par classe ───────────────────────────────────────────────────

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

// ── Print ─────────────────────────────────────────────────────────────────────

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
) {
  const today    = new Date().toLocaleDateString('fr-FR')
  const isOHADA  = !['FR', 'BE', 'CH', 'LU'].includes(info.country)
  const idLabel  = isOHADA ? 'NUI / RCCM' : 'SIRET'
  const idValue  = isOHADA ? (info.vatNumber ?? '—') : (info.siret ?? info.siren ?? '—')
  const docTitle = isOHADA
    ? 'BALANCE GÉNÉRALE DES COMPTES (SYSCOHADA révisé)'
    : 'BALANCE GÉNÉRALE DES COMPTES (Plan Comptable Général)'
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
<title>Balance — ${coveredYears.join('/')}</title>
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

// ── Ligne de balance ──────────────────────────────────────────────────────────

function BalanceRowUI({ r, fmt }: { r: BalanceRow; fmt: (v: number) => string }) {
  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-5 py-2.5 font-mono text-xs text-gray-600">{r.account}</td>
      <td className="px-5 py-2.5 text-gray-700">{r.label}</td>
      <td className="px-5 py-2.5 text-right text-gray-700">{r.totalDebit  > 0 ? fmt(r.totalDebit)  : ''}</td>
      <td className="px-5 py-2.5 text-right text-gray-700">{r.totalCredit > 0 ? fmt(r.totalCredit) : ''}</td>
      <td className="px-5 py-2.5 text-right font-medium text-blue-700">
        {r.soldeDebiteur  > 0 ? fmt(r.soldeDebiteur)  : ''}
      </td>
      <td className="px-5 py-2.5 text-right font-medium text-orange-600">
        {r.soldeCrediteur > 0 ? fmt(r.soldeCrediteur) : ''}
      </td>
    </tr>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BalancePage() {
  const { fmt }              = useCurrency()
  const { company, country } = useCompanySettings()
  const { data: allFY, isLoading: yearsLoading } = useFiscalYears()
  const globalFY = useSelectedFiscalYearData()

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

  // ── Chargement parallèle ──────────────────────────────────────────────────
  const fyQueries = useQueries({
    queries: coveredFYs.map(fy => ({
      queryKey:  ['balance-journal', fy.id],
      queryFn:   () => accountingApi.getBalanceByFiscalYear(fy.id),
      staleTime: 30_000,
      enabled:   coveredFYs.length > 0,
    })),
  })

  const isLoading = yearsLoading || fyQueries.some(q => q.isLoading)
  const isError   = fyQueries.some(q => q.isError)

  // ── Fusion des balances (cumul par compte) ────────────────────────────────
  const { mergedRows } = useMemo(() => {
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

    const rows = Array.from(rowMap.values()).sort((a, b) => a.account.localeCompare(b.account))
    return { mergedRows: rows }
  }, [fyQueries])

  // ── Filtrage recherche ────────────────────────────────────────────────────
  const filteredRows = useMemo<BalanceRow[]>(() => {
    const q = search.trim().toLowerCase()
    if (!q) return mergedRows
    return mergedRows.filter(r =>
      r.account.toLowerCase().includes(q) || r.label.toLowerCase().includes(q)
    )
  }, [mergedRows, search])

  const filteredTotalD  = filteredRows.reduce((s, r) => s + r.totalDebit,  0)
  const filteredTotalC  = filteredRows.reduce((s, r) => s + r.totalCredit, 0)
  const filteredEq      = Math.abs(filteredTotalD - filteredTotalC) < 0.01

  // ── Regroupement par classe ───────────────────────────────────────────────
  const groupedRows = useMemo(() => {
    if (!groupByClass) return null
    const map = new Map<string, BalanceRow[]>()
    for (const r of filteredRows) {
      const cls = r.account.charAt(0)
      if (!map.has(cls)) map.set(cls, [])
      map.get(cls)!.push(r)
    }
    return map
  }, [filteredRows, groupByClass])

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
    openBalancePrint(
      info, dateFrom, dateTo, filteredRows,
      filteredTotalD, filteredTotalC, filteredEq,
      fmt, hasClosedFY, coveredYears, isMultiYear,
    )
  }

  // ── Presets ───────────────────────────────────────────────────────────────
  function applyPreset(from: string, to: string) { setDateFrom(from); setDateTo(to) }

  const fyYear = globalFY?.year ?? new Date().getFullYear()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Balance générale</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {coveredFYs.length > 0
              ? `${filteredRows.length} compte(s) · exercice(s) ${coveredYears.join(', ')}`
              : 'Aucun exercice dans la plage sélectionnée'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {mergedRows.length > 0 && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium
              ${filteredEq ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {filteredEq ? '✓ Équilibrée' : '✗ Déséquilibrée'}
            </span>
          )}
          <button
            onClick={handlePrint}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white
                       hover:bg-[#2d6a4f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            🖨 Éditer / Imprimer
          </button>
        </div>
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
              {' '}— aucune modification n'est possible sur ces écritures.
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
            <input type="date" value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500">Au</label>
            <input type="date" value={dateTo} min={dateFrom}
              onChange={e => setDateTo(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
            />
          </div>

          {/* Presets trimestres */}
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
                    ${active
                      ? 'bg-[#1b4332] text-white border-[#1b4332]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
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
                  <button key={fy.id}
                    onClick={() => applyPreset(fy.startDate.slice(0, 10), fy.endDate.slice(0, 10))}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors
                      ${active
                        ? 'bg-[#1b4332] text-white border-[#1b4332]'
                        : isClosed
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  >
                    {isClosed && '🔒 '}{fy.year}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-end pt-2 border-t border-gray-100">
          {/* Recherche */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500">Rechercher un compte</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input
                type="text"
                placeholder="N° compte ou intitulé…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Grouper par classe */}
          <label className="flex items-center gap-2 self-end pb-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={groupByClass}
              onChange={e => setGroupByClass(e.target.checked)}
              className="rounded border-gray-300 text-[#1b4332] focus:ring-[#1b4332]"
            />
            <span className="text-sm text-gray-600">Grouper par classe</span>
          </label>

          {/* Exercices couverts */}
          {coveredFYs.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-400">Couverts :</span>
              {coveredFYs.map(fy => {
                const isClosed = fy.status === 'CLOSED' || fy.status === 'LOCKED'
                const q = fyQueries[coveredFYs.indexOf(fy)]
                return (
                  <span key={fy.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium
                      ${isClosed ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}
                  >
                    {isClosed ? '🔒' : '✓'} {fy.year}{q?.isLoading ? ' ⏳' : ''}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* États */}
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

      {!isLoading && filteredRows.length === 0 && coveredFYs.length > 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
          {search
            ? <p className="text-sm">Aucun compte ne correspond à «&nbsp;{search}&nbsp;».</p>
            : <p className="text-sm">Aucune écriture pour cet exercice.</p>
          }
        </div>
      )}

      {filteredRows.length > 0 && (
        <div className={`rounded-xl border bg-white overflow-hidden
          ${hasClosedFY ? 'border-amber-200' : 'border-gray-200'}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b text-left text-xs font-semibold text-white
                  ${hasClosedFY ? 'bg-amber-800' : 'bg-[#1b4332]'}`}>
                  <th className="px-5 py-3">Compte</th>
                  <th className="px-5 py-3">Intitulé</th>
                  <th className="px-5 py-3 text-center" colSpan={2}>
                    <span className="block text-[10px] font-normal opacity-75 mb-0.5">Mouvements de la période</span>
                    <div className="flex justify-center gap-8">
                      <span>Débit</span><span>Crédit</span>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-center" colSpan={2}>
                    <span className="block text-[10px] font-normal opacity-75 mb-0.5">Soldes</span>
                    <div className="flex justify-center gap-8">
                      <span>Débiteur D</span><span>Créditeur C</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groupedRows
                  ? Array.from(groupedRows.entries()).map(([cls, rows]) => {
                      const clsD  = rows.reduce((s, r) => s + r.totalDebit,     0)
                      const clsC  = rows.reduce((s, r) => s + r.totalCredit,    0)
                      const clsSD = rows.reduce((s, r) => s + r.soldeDebiteur,  0)
                      const clsSC = rows.reduce((s, r) => s + r.soldeCrediteur, 0)
                      return (
                        <Fragment key={cls}>
                          <tr className="border-t-2 border-[#1b4332]/20">
                            <td colSpan={6} className="px-5 py-2 text-xs font-semibold text-[#1b4332] bg-[#1b4332]/5">
                              {CLASSE_LABEL[cls] ?? `Classe ${cls}`}
                            </td>
                          </tr>
                          {rows.map(r => <BalanceRowUI key={r.account} r={r} fmt={fmt} />)}
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
                  : filteredRows.map(r => <BalanceRowUI key={r.account} r={r} fmt={fmt} />)
                }
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#1b4332] bg-[#1b4332]/10 font-bold text-sm">
                  <td colSpan={2} className="px-5 py-3 text-gray-900">TOTAL GÉNÉRAL</td>
                  <td className="px-5 py-3 text-right">{fmt(filteredTotalD)}</td>
                  <td className="px-5 py-3 text-right">{fmt(filteredTotalC)}</td>
                  <td className="px-5 py-3 text-right text-blue-700">
                    {fmt(filteredRows.reduce((s, r) => s + r.soldeDebiteur,  0))}
                  </td>
                  <td className="px-5 py-3 text-right text-orange-600">
                    {fmt(filteredRows.reduce((s, r) => s + r.soldeCrediteur, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pied équilibre */}
          <div className={`flex items-center justify-between px-5 py-3 border-t text-sm font-medium
            ${filteredEq
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50   border-red-200   text-red-800'}`}>
            <span>
              {filteredEq ? '✓ Balance équilibrée' : '✗ Balance déséquilibrée'}
              {search && ' (sur la sélection)'}
              {isMultiYear && ` — ${coveredYears.length} exercices cumulés`}
            </span>
            <span className="text-xs font-normal opacity-75">
              Σ Débit = Σ Crédit = {fmt(filteredTotalD)}
              {!filteredEq && <> · Écart : {fmt(Math.abs(filteredTotalD - filteredTotalC))}</>}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
