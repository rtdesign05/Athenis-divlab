import { useState, useMemo, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFiscalYears, useSelectedFiscalYearData } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import type { FiscalYear, BalanceRow } from '@/services/accountingApi'

// ── Helpers ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
    </div>
  )
}

function fmt2(d: string | Date): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Print utilities ───────────────────────────────────────────────────────────

interface PrintInfo {
  companyName: string
  legalForm:   string | null
  siren:       string | null
  siret:       string | null
  vatNumber:   string | null
  address:     string | null
  city:        string | null
  country:     string
}

function openBalancePrint(
  info:       PrintInfo,
  year:       number,
  startDate:  string,
  endDate:    string,
  rows:       BalanceRow[],
  totalDebit: number,
  totalCredit: number,
  equilibre:  boolean,
  fmtAmt:     (v: number) => string,
) {
  const today    = new Date().toLocaleDateString('fr-FR')
  const isOHADA  = !['FR', 'BE', 'CH', 'LU'].includes(info.country)
  const idLabel  = isOHADA ? 'NUI / RCCM' : 'SIRET'
  const idValue  = isOHADA ? (info.vatNumber ?? '—') : (info.siret ?? info.siren ?? '—')
  const docTitle = isOHADA
    ? 'BALANCE GÉNÉRALE DES COMPTES (SYSCOHADA)'
    : 'BALANCE GÉNÉRALE DES COMPTES (PCG)'
  const refText  = isOHADA
    ? 'Document établi conformément au Système Comptable OHADA — SYSCOHADA révisé'
    : 'Document établi conformément au Plan Comptable Général (PCG) français'

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

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Balance générale — ${year}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 9pt; color: #111; background: #fff; }
  .doc { padding: 12mm 15mm; }

  /* En-tête */
  .header { border-bottom: 2px solid #1b4332; padding-bottom: 8px; margin-bottom: 10px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .company-name { font-size: 13pt; font-weight: bold; color: #1b4332; }
  .company-sub  { font-size: 8pt; color: #555; margin-top: 2px; }
  .doc-title-block { text-align: right; }
  .doc-title { font-size: 11pt; font-weight: bold; color: #1b4332; }
  .doc-meta  { font-size: 8pt; color: #666; margin-top: 2px; }
  .company-info { display: flex; gap: 20px; margin-top: 6px; font-size: 8pt; color: #444; flex-wrap: wrap; }
  .info-item { display: flex; gap: 4px; }
  .info-label { font-weight: bold; }

  /* Groupe d'en-tête tableau */
  .group-header {
    background: #e8efea; font-size: 8pt; font-weight: bold;
    color: #1b4332; padding: 4px 6px; border-top: 1.5px solid #aaa;
  }

  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  colgroup col:first-child  { width: 8%; }
  colgroup col:nth-child(2) { width: 32%; }
  colgroup col:nth-child(3), colgroup col:nth-child(4) { width: 15%; }
  colgroup col:nth-child(5), colgroup col:nth-child(6) { width: 15%; }

  thead tr th {
    background: #1b4332; color: #fff; font-size: 8pt; font-weight: bold;
    padding: 4px 6px; border: 0.5px solid #0f2e21; text-align: left;
  }
  thead tr th.num { text-align: right; }

  thead tr.sub-header th {
    background: #2d6a4f; font-size: 7.5pt; font-weight: normal; color: #d0ede3;
    padding: 2px 6px; text-align: center;
  }

  tbody td { font-size: 8pt; padding: 2.5px 6px; border: 0.5px solid #e0e0e0; }
  tbody tr.alt td { background: #f7faf7; }
  tfoot td {
    font-size: 8.5pt; font-weight: bold; padding: 4px 6px;
    border: 0.5px solid #ccc; background: #e8efea; border-top: 2px solid #1b4332;
  }

  .num    { text-align: right; font-family: monospace; }
  .mono   { font-family: monospace; font-size: 8pt; }
  .blue   { color: #1d4ed8; }
  .orange { color: #c2410c; }

  /* Bloc equilibre */
  .equilibre-block {
    margin-top: 10px; padding: 6px 10px; border-radius: 4px;
    display: flex; align-items: center; gap: 10px; font-size: 8.5pt;
    border: 1px solid; font-weight: bold;
  }
  .equilibre-ok  { background: #f0fdf4; border-color: #86efac; color: #166534; }
  .equilibre-err { background: #fef2f2; border-color: #fca5a5; color: #991b1b; }

  /* Pied de page */
  .footer {
    margin-top: 16px; border-top: 1px solid #ccc; padding-top: 6px;
    font-size: 7pt; color: #888; display: flex; justify-content: space-between;
  }

  @page { size: A4 portrait; margin: 15mm 12mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="doc">
  <div class="header">
    <div class="header-top">
      <div>
        <div class="company-name">${info.companyName}</div>
        <div class="company-sub">${[info.legalForm, info.address, info.city].filter(Boolean).join(' · ')}</div>
        <div class="company-info">
          <div class="info-item"><span class="info-label">${idLabel} :</span><span>${idValue}</span></div>
          ${info.vatNumber && !isOHADA ? `<div class="info-item"><span class="info-label">N° TVA :</span><span>${info.vatNumber}</span></div>` : ''}
        </div>
      </div>
      <div class="doc-title-block">
        <div class="doc-title">${docTitle}</div>
        <div class="doc-meta">Exercice ${year}</div>
        <div class="doc-meta">Période : ${fmt2(startDate)} au ${fmt2(endDate)}</div>
        <div class="doc-meta">Édité le ${today}</div>
      </div>
    </div>
  </div>

  <table>
    <colgroup>
      <col/><col/><col/><col/><col/><col/>
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">N° Compte</th>
        <th rowspan="2">Intitulé</th>
        <th colspan="2" style="text-align:center">Mouvements de la période</th>
        <th colspan="2" style="text-align:center">Soldes</th>
      </tr>
      <tr class="sub-header">
        <th>Débit</th><th>Crédit</th>
        <th>Débiteur (D)</th><th>Créditeur (C)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
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

  <div class="equilibre-block ${equilibre ? 'equilibre-ok' : 'equilibre-err'}">
    <span>${equilibre ? '✓ Balance ÉQUILIBRÉE' : '✗ Balance DÉSÉQUILIBRÉE'}</span>
    <span>Σ Débit = Σ Crédit = ${fmtAmt(totalDebit)}</span>
    ${!equilibre ? `<span>Écart : ${fmtAmt(Math.abs(totalDebit - totalCredit))}</span>` : ''}
  </div>

  <div class="footer">
    <span>${refText}</span>
    <span>Édité le ${today} — ${info.companyName} — Balance ${year}</span>
  </div>
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=800')
  if (!win) { alert('Veuillez autoriser les popups pour imprimer.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ── Regroupement par classe ───────────────────────────────────────────────────

const CLASSE_LABEL: Record<string, string> = {
  '1': 'Classe 1 — Comptes de capitaux',
  '2': 'Classe 2 — Comptes d\'immobilisations',
  '3': 'Classe 3 — Comptes de stocks',
  '4': 'Classe 4 — Comptes de tiers',
  '5': 'Classe 5 — Comptes de trésorerie',
  '6': 'Classe 6 — Comptes de charges',
  '7': 'Classe 7 — Comptes de produits',
  '8': 'Classe 8 — Comptes spéciaux',
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BalancePage() {
  const { fmt }          = useCurrency()
  const { company, country } = useCompanySettings()
  const { data: allFY, isLoading: yearsLoading } = useFiscalYears()
  const globalFY = useSelectedFiscalYearData()

  // ── Local state ─────────────────────────────────────────────────────────────
  const [localFYId,  setLocalFYId]  = useState<string | null>(null)
  const [search,     setSearch]     = useState('')
  const [groupByClass, setGroupByClass] = useState(false)

  // FY effectif
  const effectiveFY: FiscalYear | null = useMemo(() => {
    if (localFYId) return allFY?.find(y => y.id === localFYId) ?? null
    return globalFY
  }, [localFYId, allFY, globalFY])

  const { data, isLoading, isError } = useQuery({
    queryKey:  ['balance-journal', effectiveFY?.id],
    queryFn:   () => effectiveFY
      ? accountingApi.getBalanceByFiscalYear(effectiveFY.id)
      : Promise.reject(new Error('no fy')),
    enabled:   !!effectiveFY?.id,
    staleTime: 30_000,
  })

  const equilibre = data?.equilibre ?? false

  // ── Filtrage client-side ──────────────────────────────────────────────────────
  const filteredRows = useMemo<BalanceRow[]>(() => {
    if (!data?.rows) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.rows
    return data.rows.filter(r =>
      r.account.includes(q) || r.label.toLowerCase().includes(q)
    )
  }, [data, search])

  // Totaux sur les lignes filtrées
  const filteredTotalD  = filteredRows.reduce((s, r) => s + r.totalDebit,     0)
  const filteredTotalC  = filteredRows.reduce((s, r) => s + r.totalCredit,    0)
  const filteredEq      = Math.abs(filteredTotalD - filteredTotalC) < 0.01

  // Regroupement par classe
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

  // ── Print handler ──────────────────────────────────────────────────────────
  function handlePrint() {
    if (!data || !effectiveFY) return
    const info: PrintInfo = {
      companyName: company?.name ?? 'Entreprise',
      legalForm:   company?.legalForm ?? null,
      siren:       company?.siren ?? null,
      siret:       company?.siret ?? null,
      vatNumber:   company?.vatNumber ?? null,
      address:     company?.address ?? null,
      city:        company?.city ?? null,
      country:     country,
    }
    openBalancePrint(
      info,
      data.year,
      effectiveFY.startDate.slice(0, 10),
      effectiveFY.endDate.slice(0, 10),
      filteredRows,
      filteredTotalD,
      filteredTotalC,
      filteredEq,
      fmt,
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Balance générale</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data
              ? `Exercice ${data.year} — ${filteredRows.length} compte(s)`
              : 'Sélectionnez un exercice'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium
              ${equilibre ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {equilibre ? '✓ Équilibrée' : '✗ Déséquilibrée'}
            </span>
          )}
          <button
            onClick={handlePrint}
            disabled={!data || filteredRows.length === 0}
            className="flex items-center gap-2 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white
                       hover:bg-[#2d6a4f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <span>🖨</span> Éditer / Imprimer
          </button>
        </div>
      </div>

      {/* Barre de filtres */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap gap-3 items-end">

        {/* Exercice */}
        <div className="flex flex-col gap-1 min-w-[180px]">
          <label className="text-xs font-medium text-gray-500">Exercice</label>
          <select
            value={localFYId ?? (effectiveFY?.id ?? '')}
            onChange={e => setLocalFYId(e.target.value || null)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
          >
            {yearsLoading && <option>Chargement…</option>}
            {!yearsLoading && !allFY?.length && <option value="">Aucun exercice</option>}
            {(allFY ?? []).map(fy => (
              <option key={fy.id} value={fy.id}>
                {fy.year} — {fmt2(fy.startDate)} → {fmt2(fy.endDate)} ({
                  fy.status === 'OPEN' ? 'Ouvert' : fy.status === 'CLOSED' ? 'Clôturé' : fy.status === 'LOCKED' ? 'Verrouillé' : fy.status
                })
              </option>
            ))}
          </select>
        </div>

        {/* Séparateur */}
        <div className="hidden sm:block h-8 w-px bg-gray-200 self-end mb-1" />

        {/* Recherche */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500">Rechercher un compte</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="N° ou intitulé…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 pl-8 pr-3 py-1.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >✕</button>
            )}
          </div>
        </div>

        {/* Regrouper par classe */}
        <label className="flex items-center gap-2 self-end pb-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={groupByClass}
            onChange={e => setGroupByClass(e.target.checked)}
            className="rounded border-gray-300 text-[#1b4332] focus:ring-[#1b4332]"
          />
          <span className="text-sm text-gray-600">Grouper par classe</span>
        </label>
      </div>

      {/* États de chargement */}
      {(yearsLoading || isLoading) && <Spinner />}

      {!yearsLoading && !effectiveFY && (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
          <p className="text-sm">Sélectionnez un exercice comptable pour afficher la balance.</p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger la balance. Vérifiez la connexion au serveur.
        </div>
      )}

      {data && filteredRows.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
          {search
            ? <p className="text-sm">Aucun compte ne correspond à «&nbsp;{search}&nbsp;».</p>
            : <p className="text-sm">Aucune écriture pour cet exercice.</p>
          }
        </div>
      )}

      {data && filteredRows.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-[#1b4332] text-left text-xs font-semibold text-white">
                  <th className="px-5 py-3">Compte</th>
                  <th className="px-5 py-3">Intitulé</th>
                  <th className="px-5 py-3 text-right" colSpan={2}>
                    <span className="block text-center text-[10px] font-normal text-green-200 mb-0.5">Mouvements de la période</span>
                    <div className="flex justify-end gap-8">
                      <span>Débit</span>
                      <span>Crédit</span>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-right" colSpan={2}>
                    <span className="block text-center text-[10px] font-normal text-green-200 mb-0.5">Soldes</span>
                    <div className="flex justify-end gap-8">
                      <span>Débiteur D</span>
                      <span>Créditeur C</span>
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
                            <td colSpan={2} className="px-5 py-2 text-gray-700 italic">
                              Sous-total classe {cls}
                            </td>
                            <td className="px-5 py-2 text-right text-gray-700">{fmt(clsD)}</td>
                            <td className="px-5 py-2 text-right text-gray-700">{fmt(clsC)}</td>
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
                  <td className="px-5 py-3 text-right text-gray-900">{fmt(filteredTotalD)}</td>
                  <td className="px-5 py-3 text-right text-gray-900">{fmt(filteredTotalC)}</td>
                  <td className="px-5 py-3 text-right text-blue-700">
                    {fmt(filteredRows.reduce((s, r) => s + r.soldeDebiteur, 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-orange-600">
                    {fmt(filteredRows.reduce((s, r) => s + r.soldeCrediteur, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Pied — équilibre */}
          <div className={`flex items-center justify-between px-5 py-3 border-t text-sm font-medium
            ${filteredEq ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
            <span>
              {filteredEq ? '✓ Balance équilibrée' : '✗ Balance déséquilibrée'}
              {search && ' (sur la sélection)'}
            </span>
            <span className="text-xs font-normal text-inherit opacity-75">
              Σ Débit = Σ Crédit = {fmt(filteredTotalD)}
              {!filteredEq && <> · Écart : {fmt(Math.abs(filteredTotalD - filteredTotalC))}</>}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Ligne de balance (extrait pour éviter le JSX inline) ─────────────────────

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
