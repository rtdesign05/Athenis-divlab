import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useFiscalYears, useSelectedFiscalYearData } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import type { FiscalYear } from '@/services/accountingApi'

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

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
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

function openGrandLivrePrint(
  info:       PrintInfo,
  year:       number,
  startDate:  string,
  endDate:    string,
  comptes:    Array<{
    account: string; label: string
    lignes: Array<{ date: string; journalCode: string; reference: string | null; label: string; debit: number; credit: number; solde: number }>
  }>,
  fmtAmt:     (v: number) => string,
) {
  const today      = new Date().toLocaleDateString('fr-FR')
  const isOHADA    = !['FR', 'BE', 'CH', 'LU'].includes(info.country)
  const idLabel    = isOHADA ? 'NUI / RCCM' : 'SIRET'
  const idValue    = isOHADA ? (info.vatNumber ?? '—') : (info.siret ?? info.siren ?? '—')
  const docTitle   = isOHADA ? 'GRAND LIVRE DES COMPTES (SYSCOHADA)' : 'GRAND LIVRE DES COMPTES (PCG)'
  const refText    = isOHADA
    ? 'Document établi conformément au Système Comptable OHADA — SYSCOHADA révisé'
    : 'Document établi conformément au Plan Comptable Général (PCG) français'

  const rows = comptes.map(c => {
    const totalD = c.lignes.reduce((s, l) => s + l.debit, 0)
    const totalC = c.lignes.reduce((s, l) => s + l.credit, 0)
    const solde  = totalD - totalC

    return `
      <div class="compte-block">
        <div class="compte-header">
          <span class="compte-num">${c.account}</span>
          <span class="compte-sep">—</span>
          <span class="compte-lab">${c.label}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:9%">Date</th>
              <th style="width:7%">Journal</th>
              <th style="width:10%">Pièce</th>
              <th style="width:36%">Libellé</th>
              <th style="width:11%;text-align:right">Débit</th>
              <th style="width:11%;text-align:right">Crédit</th>
              <th style="width:16%;text-align:right">Solde cumulé</th>
            </tr>
          </thead>
          <tbody>
            ${c.lignes.map(l => `
              <tr>
                <td>${fmt2(l.date)}</td>
                <td>${l.journalCode}</td>
                <td class="mono">${l.reference ?? ''}</td>
                <td>${l.label}</td>
                <td class="num">${l.debit ? fmtAmt(l.debit) : ''}</td>
                <td class="num">${l.credit ? fmtAmt(l.credit) : ''}</td>
                <td class="num ${l.solde < 0 ? 'red' : ''}">${fmtAmt(Math.abs(l.solde))}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4">Totaux du compte ${c.account}</td>
              <td class="num">${fmtAmt(totalD)}</td>
              <td class="num">${fmtAmt(totalC)}</td>
              <td class="num ${solde < 0 ? 'red' : ''}">${fmtAmt(Math.abs(solde))} ${solde >= 0 ? 'D' : 'C'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Grand livre — ${year}</title>
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

  /* Bloc infos société */
  .company-info { display: flex; gap: 20px; margin-top: 6px; font-size: 8pt; color: #444; flex-wrap: wrap; }
  .info-item { display: flex; gap: 4px; }
  .info-label { font-weight: bold; }

  /* Comptes */
  .compte-block { margin-bottom: 14px; page-break-inside: avoid; }
  .compte-header {
    background: #f0f4f0; border-left: 4px solid #1b4332;
    padding: 4px 8px; font-weight: bold; font-size: 8.5pt;
    display: flex; gap: 8px; align-items: center;
  }
  .compte-num { font-family: monospace; color: #1b4332; }
  .compte-sep { color: #999; }
  .compte-lab { color: #333; }

  table { width: 100%; border-collapse: collapse; margin-top: 2px; }
  th { background: #e8efea; font-size: 7.5pt; font-weight: bold; color: #444;
       padding: 3px 5px; border: 0.5px solid #ccc; text-align: left; }
  td { font-size: 7.5pt; padding: 2.5px 5px; border: 0.5px solid #e0e0e0; }
  tr:nth-child(even) td { background: #fafafa; }
  .total-row td { background: #e8efea; font-weight: bold; border-top: 1.5px solid #aaa; }

  .num  { text-align: right; font-family: monospace; font-size: 7.5pt; }
  .mono { font-family: monospace; font-size: 7.5pt; }
  .red  { color: #c00; }

  /* Pied de page */
  .footer {
    margin-top: 20px; border-top: 1px solid #ccc; padding-top: 6px;
    font-size: 7pt; color: #888; display: flex; justify-content: space-between;
  }

  @page { size: A4 landscape; margin: 15mm 12mm; }
  @media print {
    .compte-block { page-break-inside: avoid; }
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

  ${rows}

  <div class="footer">
    <span>${refText}</span>
    <span>Édité le ${today} — ${info.companyName} — Grand livre ${year}</span>
  </div>
</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=1200,height=800')
  if (!win) { alert('Veuillez autoriser les popups pour imprimer.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => { win.print() }, 400)
}

// ── Component ─────────────────────────────────────────────────────────────────

export function GrandLivrePage() {
  const { fmt }          = useCurrency()
  const { company, country } = useCompanySettings()
  const { data: allFY, isLoading: yearsLoading } = useFiscalYears()
  const globalFY = useSelectedFiscalYearData()

  // ── Local state ─────────────────────────────────────────────────────────────
  const [localFYId, setLocalFYId] = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')

  // FY effectif = sélection locale ou FY global
  const effectiveFY: FiscalYear | null = useMemo(() => {
    if (localFYId) return allFY?.find(y => y.id === localFYId) ?? null
    return globalFY
  }, [localFYId, allFY, globalFY])

  // Dates par défaut = bornes de l'exercice
  const resolvedFrom = dateFrom || (effectiveFY?.startDate?.slice(0, 10) ?? '')
  const resolvedTo   = dateTo   || (effectiveFY?.endDate?.slice(0, 10) ?? '')

  const { data, isLoading, isError } = useQuery({
    queryKey:  ['grand-livre-journal', effectiveFY?.id],
    queryFn:   () => effectiveFY
      ? accountingApi.getGrandLivreByFiscalYear(effectiveFY.id)
      : Promise.reject(new Error('no fy')),
    enabled:   !!effectiveFY?.id,
    staleTime: 30_000,
  })

  // ── Filtrage client-side ──────────────────────────────────────────────────────
  const filteredComptes = useMemo(() => {
    if (!data) return []
    const q   = search.trim().toLowerCase()
    const dF  = resolvedFrom ? new Date(resolvedFrom) : null
    const dT  = resolvedTo   ? new Date(resolvedTo)   : null

    return data.comptes
      .filter(c => !q || c.account.includes(q) || c.label.toLowerCase().includes(q))
      .map(c => ({
        ...c,
        lignes: c.lignes.filter(l => {
          const d = new Date(l.date)
          if (dF && d < dF) return false
          if (dT && d > dT) return false
          return true
        }),
      }))
      .filter(c => c.lignes.length > 0)
  }, [data, search, resolvedFrom, resolvedTo])

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
    openGrandLivrePrint(info, data.year, resolvedFrom, resolvedTo, filteredComptes, fmt)
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function resetPeriod() {
    setDateFrom('')
    setDateTo('')
    if (effectiveFY) {
      setDateFrom(effectiveFY.startDate.slice(0, 10))
      setDateTo(effectiveFY.endDate.slice(0, 10))
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Grand livre</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {data
              ? `Exercice ${data.year} — ${filteredComptes.length} compte(s) affiché(s)`
              : 'Sélectionnez un exercice pour afficher les écritures'}
          </p>
        </div>
        <button
          onClick={handlePrint}
          disabled={!data || filteredComptes.length === 0}
          className="flex items-center gap-2 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white
                     hover:bg-[#2d6a4f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>🖨</span> Éditer / Imprimer
        </button>
      </div>

      {/* Barre de filtres */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 flex flex-wrap gap-3 items-end">

        {/* Exercice */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs font-medium text-gray-500">Exercice</label>
          <select
            value={localFYId ?? (effectiveFY?.id ?? '')}
            onChange={e => { setLocalFYId(e.target.value || null); setDateFrom(''); setDateTo('') }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
          >
            {yearsLoading && <option>Chargement…</option>}
            {!yearsLoading && !allFY?.length && <option value="">Aucun exercice</option>}
            {(allFY ?? []).map(fy => (
              <option key={fy.id} value={fy.id}>
                {fy.year} — {fy.status === 'OPEN' ? 'Ouvert' : fy.status === 'CLOSED' ? 'Clôturé' : fy.status === 'LOCKED' ? 'Verrouillé' : fy.status}
              </option>
            ))}
          </select>
        </div>

        {/* Date de — jusqu'au */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Période du</label>
          <input
            type="date"
            value={resolvedFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">au</label>
          <input
            type="date"
            value={resolvedTo}
            min={resolvedFrom}
            onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
          />
        </div>

        {/* Reset période */}
        {(dateFrom || dateTo) && (
          <button
            onClick={resetPeriod}
            className="self-end rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        )}

        {/* Recherche compte */}
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500">Rechercher un compte</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="N° ou intitulé de compte…"
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

        {/* Raccourcis période */}
        {effectiveFY && (
          <div className="flex items-end gap-1.5">
            {([
              { label: 'T1', months: [1, 3] as [number, number] },
              { label: 'T2', months: [4, 6] as [number, number] },
              { label: 'T3', months: [7, 9] as [number, number] },
              { label: 'T4', months: [10, 12] as [number, number] },
            ]).map(t => {
              const fyYear = effectiveFY.year
              const start  = toISO(new Date(fyYear, t.months[0] - 1, 1))
              const end    = toISO(new Date(fyYear, t.months[1], 0))
              const active = resolvedFrom === start && resolvedTo === end
              return (
                <button
                  key={t.label}
                  onClick={() => { setDateFrom(start); setDateTo(end) }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors
                    ${active
                      ? 'bg-[#1b4332] text-white border-[#1b4332]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Indicateur période hors exercice */}
      {effectiveFY && (dateFrom || dateTo) && (
        (() => {
          const fyStart = effectiveFY.startDate.slice(0, 10)
          const fyEnd   = effectiveFY.endDate.slice(0, 10)
          const outOfFY = resolvedFrom < fyStart || resolvedTo > fyEnd
          return outOfFY ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              ⚠ La période sélectionnée dépasse les bornes de l'exercice {effectiveFY.year}&nbsp;
              ({fmt2(fyStart)} → {fmt2(fyEnd)}). Seules les écritures existantes dans cet exercice seront affichées.
            </div>
          ) : null
        })()
      )}

      {/* États de chargement */}
      {(yearsLoading || isLoading) && <Spinner />}

      {!yearsLoading && !effectiveFY && (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-500">
          <p className="text-sm">Sélectionnez un exercice comptable pour afficher le grand livre.</p>
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger le grand livre. Vérifiez la connexion au serveur.
        </div>
      )}

      {data && filteredComptes.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
          {search
            ? <p className="text-sm">Aucun compte ne correspond à «&nbsp;{search}&nbsp;» sur cette période.</p>
            : <p className="text-sm">Aucune écriture pour la période sélectionnée.</p>
          }
        </div>
      )}

      {/* Comptes */}
      {filteredComptes.map(c => {
        const totalD = c.lignes.reduce((s, l) => s + l.debit, 0)
        const totalC = c.lignes.reduce((s, l) => s + l.credit, 0)
        const solde  = totalD - totalC
        return (
          <div key={c.account} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {/* Header compte */}
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-semibold text-[#1b4332] bg-[#1b4332]/10 rounded px-2 py-0.5">
                  {c.account}
                </span>
                <span className="text-sm text-gray-400">—</span>
                <span className="text-sm font-medium text-gray-900">{c.label}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>{c.lignes.length} écriture{c.lignes.length > 1 ? 's' : ''}</span>
                <span className={`font-semibold ${solde >= 0 ? 'text-[#1b4332]' : 'text-red-600'}`}>
                  Solde : {fmt(Math.abs(solde))} {solde >= 0 ? 'D' : 'C'}
                </span>
              </div>
            </div>

            {/* Lignes */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Journal</th>
                    <th className="px-4 py-2.5">Pièce</th>
                    <th className="px-4 py-2.5">Libellé</th>
                    <th className="px-4 py-2.5 text-right">Débit</th>
                    <th className="px-4 py-2.5 text-right">Crédit</th>
                    <th className="px-4 py-2.5 text-right">Solde cumulatif</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {c.lignes.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmt2(l.date)}</td>
                      <td className="px-4 py-2">
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                          {l.journalCode}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-gray-400">{l.reference ?? '—'}</td>
                      <td className="px-4 py-2 text-gray-700">{l.label}</td>
                      <td className="px-4 py-2 text-right font-medium text-blue-700">
                        {l.debit ? fmt(l.debit) : ''}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-orange-600">
                        {l.credit ? fmt(l.credit) : ''}
                      </td>
                      <td className={`px-4 py-2 text-right font-semibold ${l.solde >= 0 ? 'text-[#1b4332]' : 'text-red-600'}`}>
                        {fmt(Math.abs(l.solde))} <span className="text-xs font-normal">{l.solde >= 0 ? 'D' : 'C'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm">
                    <td colSpan={4} className="px-4 py-2.5 text-gray-700">
                      Totaux du compte {c.account}
                    </td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fmt(totalD)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-600">{fmt(totalC)}</td>
                    <td className={`px-4 py-2.5 text-right ${solde >= 0 ? 'text-[#1b4332]' : 'text-red-600'}`}>
                      {fmt(Math.abs(solde))} <span className="text-xs font-normal">{solde >= 0 ? 'D' : 'C'}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
