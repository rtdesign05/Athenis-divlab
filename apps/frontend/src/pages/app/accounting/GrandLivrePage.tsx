import { useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFiscalYears, useSelectedFiscalYearData } from '@/hooks/useFiscalYear'
import { accountingApi } from '@/services/accountingApi'
import { useCurrency } from '@/hooks/useCurrency'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { CompteCombobox, type CompteOption } from '@/components/accounting/CompteCombobox'
import type { GrandLivreLigne } from '@/services/accountingApi'

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

function openGrandLivrePrint(
  info: PrintInfo,
  startDate: string,
  endDate: string,
  comptes: MergedCompte[],
  fmtAmt: (v: number) => string,
  readOnly: boolean,
  coveredYears: number[],
  tabLabel = 'Grand Livre général',
) {
  const today   = new Date().toLocaleDateString('fr-FR')
  const isOHADA = !['FR', 'BE', 'CH', 'LU'].includes(info.country)
  const idLabel = isOHADA ? 'NUI / RCCM' : 'SIRET'
  const idValue = isOHADA ? (info.vatNumber ?? '—') : (info.siret ?? info.siren ?? '—')
  const docTitle = isOHADA
    ? `${tabLabel.toUpperCase()} (SYSCOHADA révisé)`
    : `${tabLabel.toUpperCase()} (Plan Comptable Général)`
  const refText = isOHADA
    ? 'Établi conformément au Système Comptable OHADA — SYSCOHADA révisé (Acte uniforme relatif au droit comptable)'
    : 'Établi conformément au Plan Comptable Général (PCG) — Règlement ANC n° 2014-03'

  const rows = comptes.map(c => {
    const totalD = c.lignes.reduce((s, l) => s + l.debit,  0)
    const totalC = c.lignes.reduce((s, l) => s + l.credit, 0)
    const solde  = totalD - totalC
    return `
      <div class="compte-block">
        <div class="compte-header">
          <span class="compte-num">${c.account}</span>
          <span class="sep">—</span>
          <span class="compte-lab">${c.label}</span>
          ${readOnly ? '<span class="ro-badge">Lecture seule</span>' : ''}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:9%">Date</th>
              <th style="width:7%">Journal</th>
              <th style="width:10%">Pièce</th>
              <th style="width:35%">Libellé</th>
              <th style="width:11%;text-align:right">Débit</th>
              <th style="width:11%;text-align:right">Crédit</th>
              <th style="width:17%;text-align:right">Solde cumulé</th>
            </tr>
          </thead>
          <tbody>
            ${c.lignes.map(l => `
              <tr>
                <td>${fmtDate(l.date)}</td>
                <td>${l.journalCode}</td>
                <td class="mono">${l.reference ?? ''}</td>
                <td>${l.label}</td>
                <td class="num">${l.debit  ? fmtAmt(l.debit)  : ''}</td>
                <td class="num">${l.credit ? fmtAmt(l.credit) : ''}</td>
                <td class="num ${l.runningBalance < 0 ? 'red' : ''}">
                  ${fmtAmt(Math.abs(l.runningBalance))} ${l.runningBalance >= 0 ? 'D' : 'C'}
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4">Totaux — ${c.account}</td>
              <td class="num">${fmtAmt(totalD)}</td>
              <td class="num">${fmtAmt(totalC)}</td>
              <td class="num ${solde < 0 ? 'red' : ''}">${fmtAmt(Math.abs(solde))} ${solde >= 0 ? 'D' : 'C'}</td>
            </tr>
          </tfoot>
        </table>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"/>
<title>Grand livre — ${coveredYears.join('/')}</title>
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
.ro-banner{background:#fff7ed;border:1px solid #f59e0b;border-radius:4px;padding:4px 10px;font-size:8pt;color:#92400e;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.compte-block{margin-bottom:14px;page-break-inside:avoid}
.compte-header{background:#f0f4f0;border-left:4px solid #1b4332;padding:4px 8px;font-weight:bold;font-size:8.5pt;display:flex;gap:8px;align-items:center}
.compte-num{font-family:monospace;color:#1b4332}
.sep{color:#999}
.compte-lab{color:#333;flex:1}
.ro-badge{font-size:7pt;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:10px;font-weight:normal;border:1px solid #fcd34d}
table{width:100%;border-collapse:collapse;margin-top:2px}
th{background:#e8efea;font-size:7.5pt;font-weight:bold;color:#444;padding:3px 5px;border:.5px solid #ccc;text-align:left}
td{font-size:7.5pt;padding:2.5px 5px;border:.5px solid #e0e0e0}
tr:nth-child(even) td{background:#fafafa}
.total-row td{background:#e8efea;font-weight:bold;border-top:1.5px solid #aaa}
.num{text-align:right;font-family:monospace;font-size:7.5pt}
.mono{font-family:monospace;font-size:7.5pt}
.red{color:#c00}
.footer{margin-top:20px;border-top:1px solid #ccc;padding-top:6px;font-size:7pt;color:#888;display:flex;justify-content:space-between}
@page{size:A4 landscape;margin:15mm 12mm}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.compte-block{page-break-inside:avoid}}
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
  ${rows}
  <div class="footer">
    <span>${refText}</span>
    <span>Édité le ${today} — ${info.companyName}</span>
  </div>
</div></body></html>`

  const win = window.open('', '_blank', 'width=1200,height=800')
  if (!win) { alert('Autorisez les popups pour imprimer.'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MergedLigne extends GrandLivreLigne {
  runningBalance: number
  fyYear: number
}

interface MergedCompte {
  account: string
  label: string
  lignes: MergedLigne[]
}

// ── Modal de réimputation ─────────────────────────────────────────────────────

interface ReimputeModalProps {
  selectedIds:   string[]
  sourceAccounts: string[]   // comptes sources distincts
  onConfirm:     (newAccount: string) => void
  onClose:       () => void
  isPending:     boolean
  error:         string | null
}

function ReimputeModal({ selectedIds, sourceAccounts, onConfirm, onClose, isPending, error }: ReimputeModalProps) {
  const [targetRaw, setTargetRaw] = useState('')
  const [targetAccount, setTargetAccount] = useState('')

  function handleSelect(opt: CompteOption) {
    setTargetAccount(opt.code)
    setTargetRaw(opt.code)
  }

  const canConfirm = targetAccount.trim().length >= 2 && !isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#1b4332]">
          <div className="flex items-center gap-2">
            <span className="text-white text-lg">↪</span>
            <h2 className="text-sm font-semibold text-white">Réimputation d'écritures</h2>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Résumé */}
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">
              {selectedIds.length} écriture{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-blue-700">
              Compte{sourceAccounts.length > 1 ? 's' : ''} source&nbsp;:&nbsp;
              {sourceAccounts.map(a => (
                <span key={a} className="font-mono bg-blue-100 rounded px-1 mr-1">{a}</span>
              ))}
            </p>
          </div>

          {/* Compte cible */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Compte cible <span className="text-red-500">*</span>
            </label>
            <CompteCombobox
              value={targetRaw}
              onChange={v => { setTargetRaw(v); setTargetAccount(v) }}
              onSelect={handleSelect}
              placeholder="Ex. 601100 ou saisir l'intitulé…"
              autoFocus
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
            />
            <p className="text-xs text-gray-400">
              Les écritures seront déplacées vers ce compte. Le lettrage sera effacé.
            </p>
          </div>

          {/* Avertissement */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            ⚠️ <strong>Action irréversible</strong> — Cette opération modifie le compte des écritures sélectionnées.
            Elle est impossible sur un exercice clôturé.
          </div>

          {/* Erreur API */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600
                         hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => canConfirm && onConfirm(targetAccount.trim())}
              disabled={!canConfirm}
              className="flex-1 rounded-xl bg-[#1b4332] py-2.5 text-sm font-semibold text-white
                         hover:bg-[#2d6a4f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors
                         flex items-center justify-center gap-2"
            >
              {isPending ? (
                <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Réimputation…</>
              ) : (
                <>↪ Réimputer {selectedIds.length} écriture{selectedIds.length > 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Onglets Grand Livre ───────────────────────────────────────────────────────

type GLTab = 'general' | 'clients' | 'fournisseurs' | 'charges-produits'

const GL_TABS: { id: GLTab; label: string; icon: string; filter: (account: string) => boolean }[] = [
  { id: 'general',          label: 'Grand Livre général',      icon: '📊', filter: () => true },
  { id: 'clients',          label: 'Grand Livre clients',      icon: '👥', filter: a => a.startsWith('41') },
  { id: 'fournisseurs',     label: 'Grand Livre fournisseurs', icon: '🏭', filter: a => a.startsWith('40') },
  { id: 'charges-produits', label: 'Charges et produits',      icon: '📈', filter: a => a.startsWith('6') || a.startsWith('7') },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function GrandLivrePage() {
  const { fmt }              = useCurrency()
  const { company, country } = useCompanySettings()
  const navigate             = useNavigate()
  const qc                   = useQueryClient()
  const [searchParams]       = useSearchParams()
  const { data: allFY, isLoading: yearsLoading } = useFiscalYears()
  const globalFY = useSelectedFiscalYearData()

  // ── Pré-filtrage depuis la Balance (paramètre URL ?compte=xxx) ────────────
  const compteParam = searchParams.get('compte') ?? ''

  // ── Dates initiales = bornes de l'exercice global ─────────────────────────
  const defaultFrom = globalFY?.startDate.slice(0, 10) ?? toISO(new Date(new Date().getFullYear(), 0, 1))
  const defaultTo   = globalFY?.endDate.slice(0, 10)   ?? toISO(new Date(new Date().getFullYear(), 11, 31))

  const [dateFrom,   setDateFrom]   = useState(defaultFrom)
  const [dateTo,     setDateTo]     = useState(defaultTo)
  const [search,     setSearch]     = useState(compteParam)
  const [activeTab,  setActiveTab]  = useState<GLTab>('general')

  // ── Sélection pour réimputation ───────────────────────────────────────────
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set())
  const [showReimpute,   setShowReimpute]   = useState(false)
  const [reimputeError,  setReimputeError]  = useState<string | null>(null)
  const [successMsg,     setSuccessMsg]     = useState<string | null>(null)

  const toggleEntry = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback((ids: string[], allSelected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allSelected) ids.forEach(id => next.delete(id))
      else             ids.forEach(id => next.add(id))
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setShowReimpute(false)
    setReimputeError(null)
  }, [])

  // ── Mutation réimputation ─────────────────────────────────────────────────
  const reimputeMutation = useMutation({
    mutationFn: ({ entryIds, newAccount }: { entryIds: string[]; newAccount: string }) =>
      accountingApi.reimpute(entryIds, newAccount),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['grand-livre-journal'] })
      qc.invalidateQueries({ queryKey: ['balance-journal'] })
      qc.invalidateQueries({ queryKey: ['journal'] })
      clearSelection()
      setSuccessMsg(`✓ ${data.updated} écriture${data.updated > 1 ? 's' : ''} réimputée${data.updated > 1 ? 's' : ''} vers le compte ${data.newAccount}`)
      setTimeout(() => setSuccessMsg(null), 5000)
    },
    onError: (err: Error) => {
      setReimputeError(err.message ?? 'Erreur lors de la réimputation')
    },
  })

  function handleReimputeConfirm(newAccount: string) {
    setReimputeError(null)
    reimputeMutation.mutate({ entryIds: Array.from(selectedIds), newAccount })
  }

  // ── Exercices couverts par la plage ──────────────────────────────────────
  const coveredFYs = useMemo(() => {
    if (!allFY) return []
    const from = new Date(dateFrom)
    const to   = new Date(dateTo)
    return allFY
      .filter(fy => new Date(fy.startDate) <= to && new Date(fy.endDate) >= from)
      .sort((a, b) => a.year - b.year)
  }, [allFY, dateFrom, dateTo])

  const hasClosedFY = coveredFYs.some(fy => fy.status === 'CLOSED' || fy.status === 'LOCKED')
  const coveredYears = coveredFYs.map(fy => fy.year)

  // ── Chargement parallèle de chaque exercice couvert ──────────────────────
  const fyQueries = useQueries({
    queries: coveredFYs.map(fy => ({
      queryKey:  ['grand-livre-journal', fy.id],
      queryFn:   () => accountingApi.getGrandLivreByFiscalYear(fy.id),
      staleTime: 30_000,
      enabled:   coveredFYs.length > 0,
    })),
  })

  const isLoading = yearsLoading || fyQueries.some(q => q.isLoading)
  const isError   = fyQueries.some(q => q.isError)

  // ── Fusion et filtrage ────────────────────────────────────────────────────
  const mergedComptes = useMemo<MergedCompte[]>(() => {
    const from = new Date(dateFrom)
    const to   = new Date(dateTo)
    to.setHours(23, 59, 59, 999)

    const compteMap = new Map<string, { account: string; label: string; lignes: (GrandLivreLigne & { fyYear: number })[] }>()

    fyQueries.forEach((q, i) => {
      const fyYear = coveredFYs[i]?.year ?? 0
      if (!q.data) return
      for (const compte of q.data.comptes) {
        const filtered = compte.lignes
          .filter(l => { const d = new Date(l.date); return d >= from && d <= to })
          .map(l => ({ ...l, fyYear }))
        if (filtered.length === 0) continue
        const existing = compteMap.get(compte.account)
        if (!existing) {
          compteMap.set(compte.account, { account: compte.account, label: compte.label, lignes: filtered })
        } else {
          existing.lignes.push(...filtered)
        }
      }
    })

    return Array.from(compteMap.values())
      .sort((a, b) => a.account.localeCompare(b.account))
      .map(c => {
        const sortedLignes = [...c.lignes].sort((a, b) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
        let running = 0
        const lignes: MergedLigne[] = sortedLignes.map(l => {
          running += l.debit - l.credit
          return { ...l, runningBalance: running }
        })
        return { account: c.account, label: c.label, lignes }
      })
  }, [fyQueries, dateFrom, dateTo, coveredFYs])

  // ── Filtrage par recherche ────────────────────────────────────────────────
  const filteredComptes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return mergedComptes
    return mergedComptes.filter(c =>
      c.account.toLowerCase().includes(q) || c.label.toLowerCase().includes(q)
    )
  }, [mergedComptes, search])

  // ── Filtrage par onglet ───────────────────────────────────────────────────
  const tabFilter    = GL_TABS.find(t => t.id === activeTab)?.filter ?? (() => true)
  const activeComptes = useMemo(
    () => filteredComptes.filter(c => tabFilter(c.account)),
    [filteredComptes, activeTab], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // ── Comptes sources des écritures sélectionnées ───────────────────────────
  const selectedSourceAccounts = useMemo(() => {
    if (selectedIds.size === 0) return []
    const accounts = new Set<string>()
    for (const c of activeComptes) {
      for (const l of c.lignes) {
        if (selectedIds.has(l.id)) accounts.add(c.account)
      }
    }
    return Array.from(accounts).sort()
  }, [selectedIds, filteredComptes])

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
    const tabLabel = GL_TABS.find(t => t.id === activeTab)?.label ?? 'Grand Livre'
    openGrandLivrePrint(info, dateFrom, dateTo, activeComptes, fmt, hasClosedFY, coveredYears, tabLabel)
  }

  // ── Presets de période ────────────────────────────────────────────────────
  function applyPreset(from: string, to: string) {
    setDateFrom(from); setDateTo(to)
  }

  const fyYear = globalFY?.year ?? new Date().getFullYear()
  const presets = [
    { label: 'Exercice en cours', from: defaultFrom, to: defaultTo },
    { label: 'T1', from: toISO(new Date(fyYear, 0, 1)),  to: toISO(new Date(fyYear, 2,  31)) },
    { label: 'T2', from: toISO(new Date(fyYear, 3, 1)),  to: toISO(new Date(fyYear, 5,  30)) },
    { label: 'T3', from: toISO(new Date(fyYear, 6, 1)),  to: toISO(new Date(fyYear, 8,  30)) },
    { label: 'T4', from: toISO(new Date(fyYear, 9, 1)),  to: toISO(new Date(fyYear, 11, 31)) },
  ]

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-24">  {/* pb-24 to clear floating toolbar */}

      {/* Fil d'Ariane */}
      {compteParam && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/app/accounting/balance')}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Balance générale
          </button>
          <span className="text-gray-300">›</span>
          <span className="text-xs font-medium text-gray-700">
            Compte <span className="font-mono text-[#1b4332]">{compteParam}</span>
          </span>
          <button
            onClick={() => setSearch('')}
            className="ml-2 rounded-full bg-[#1b4332]/10 px-2 py-0.5 text-[10px] font-medium text-[#1b4332] hover:bg-[#1b4332]/20 transition-colors"
          >
            Voir tous les comptes ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Grand livre</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {coveredFYs.length > 0
              ? `${activeComptes.length} compte(s) · exercice(s) ${coveredYears.join(', ')}`
              : 'Aucun exercice dans la plage sélectionnée'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedIds.size > 0 && (
            <span className="rounded-full bg-[#1b4332] text-white text-xs font-semibold px-3 py-1">
              {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={handlePrint}
            disabled={activeComptes.length === 0}
            className="flex items-center gap-2 rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white
                       hover:bg-[#2d6a4f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            🖨 Éditer / Imprimer
          </button>
        </div>
      </div>

      {/* Message succès */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
          {successMsg}
        </div>
      )}

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

      {/* Barre de filtres */}
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

          {/* Presets */}
          <div className="flex items-end gap-1.5 flex-wrap">
            {presets.map(p => {
              const active = dateFrom === p.from && dateTo === p.to
              return (
                <button key={p.label}
                  onClick={() => applyPreset(p.from, p.to)}
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

          {/* Raccourcis exercices */}
          {(allFY ?? []).filter(fy => fy.id !== globalFY?.id).length > 0 && (
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

          {/* Recherche */}
          <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-gray-500">Rechercher</label>
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
        </div>

        {/* Exercices couverts */}
        {coveredFYs.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-gray-100">
            <span className="text-xs text-gray-400">Exercices concernés :</span>
            {coveredFYs.map(fy => {
              const isClosed = fy.status === 'CLOSED' || fy.status === 'LOCKED'
              const q = fyQueries[coveredFYs.indexOf(fy)]
              return (
                <span key={fy.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium
                    ${isClosed ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}
                >
                  {isClosed ? '🔒' : '✓'} {fy.year}
                  {' '}({fmtDate(fy.startDate)} → {fmtDate(fy.endDate)})
                  {q?.isLoading && ' ⏳'}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Barre d'onglets ── */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-xl overflow-hidden">
        {GL_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); clearSelection() }}
            className={`flex-1 px-2 py-3 text-xs font-medium transition-colors border-b-2 flex items-center justify-center gap-1
              ${activeTab === tab.id
                ? 'border-[#1b4332] text-[#1b4332] bg-[#1b4332]/5'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {!isLoading && filteredComptes.length > 0 && (
              <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none
                ${activeTab === tab.id
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-gray-100 text-gray-500'}`}>
                {filteredComptes.filter(c => tab.filter(c.account)).length}
              </span>
            )}
          </button>
        ))}
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
          Impossible de charger le grand livre. Vérifiez la connexion au serveur.
        </div>
      )}

      {!isLoading && coveredFYs.length > 0 && activeComptes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400">
          {search
            ? <p className="text-sm">Aucun compte ne correspond à «&nbsp;{search}&nbsp;» sur cette période.</p>
            : <p className="text-sm">Aucune écriture trouvée pour la période sélectionnée.</p>
          }
        </div>
      )}

      {/* ── Comptes ── */}
      {activeComptes.map(c => {
        const totalD = c.lignes.reduce((s, l) => s + l.debit,  0)
        const totalC = c.lignes.reduce((s, l) => s + l.credit, 0)
        const solde  = totalD - totalC

        const lineIds      = c.lignes.map(l => l.id)
        const selectedHere = lineIds.filter(id => selectedIds.has(id))
        const allSelected  = lineIds.length > 0 && selectedHere.length === lineIds.length
        const someSelected = selectedHere.length > 0 && !allSelected

        return (
          <div key={c.account} className={`rounded-xl border bg-white overflow-hidden
            ${hasClosedFY ? 'border-amber-200' : selectedHere.length > 0 ? 'border-[#1b4332]/40' : 'border-gray-200'}`}>

            {/* Header compte */}
            <div className={`border-b px-4 py-3 flex items-center justify-between gap-3
              ${hasClosedFY ? 'bg-amber-50 border-amber-100'
                : selectedHere.length > 0 ? 'bg-[#1b4332]/5 border-[#1b4332]/10'
                : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-center gap-3">
                {/* Checkbox select-all pour ce compte */}
                {!hasClosedFY && (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected }}
                    onChange={() => toggleAll(lineIds, allSelected)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1b4332] focus:ring-[#1b4332] cursor-pointer"
                    title={allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
                  />
                )}
                <span className="font-mono text-sm font-semibold text-[#1b4332] bg-[#1b4332]/10 rounded px-2 py-0.5">
                  {c.account}
                </span>
                <span className="text-sm text-gray-400">—</span>
                <span className="text-sm font-medium text-gray-900">{c.label}</span>
                {hasClosedFY && (
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 border border-amber-200">
                    🔒 Lecture seule
                  </span>
                )}
                {selectedHere.length > 0 && (
                  <span className="text-[10px] font-medium bg-[#1b4332] text-white rounded-full px-2 py-0.5">
                    {selectedHere.length} sélectionnée{selectedHere.length > 1 ? 's' : ''}
                  </span>
                )}
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
                    {!hasClosedFY && <th className="pl-4 pr-2 py-2.5 w-8" />}
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
                  {c.lignes.map(l => {
                    const isSelected = selectedIds.has(l.id)
                    return (
                      <tr
                        key={`${l.id}-${l.fyYear}`}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-[#1b4332]/5 hover:bg-[#1b4332]/8'
                            : 'hover:bg-gray-50/50'
                        }`}
                      >
                        {!hasClosedFY && (
                          <td className="pl-4 pr-2 py-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEntry(l.id)}
                              className="h-4 w-4 rounded border-gray-300 text-[#1b4332] focus:ring-[#1b4332] cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmtDate(l.date)}</td>
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
                        <td className={`px-4 py-2 text-right font-semibold
                          ${l.runningBalance >= 0 ? 'text-[#1b4332]' : 'text-red-600'}`}>
                          {fmt(Math.abs(l.runningBalance))}{' '}
                          <span className="text-xs font-normal">{l.runningBalance >= 0 ? 'D' : 'C'}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold text-sm">
                    {!hasClosedFY && <td />}
                    <td colSpan={4} className="px-4 py-2.5 text-gray-700">
                      Totaux — {c.account}
                    </td>
                    <td className="px-4 py-2.5 text-right text-blue-700">{fmt(totalD)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-600">{fmt(totalC)}</td>
                    <td className={`px-4 py-2.5 text-right ${solde >= 0 ? 'text-[#1b4332]' : 'text-red-600'}`}>
                      {fmt(Math.abs(solde))}{' '}
                      <span className="text-xs font-normal">{solde >= 0 ? 'D' : 'C'}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )
      })}

      {/* ── Barre flottante de sélection ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40
                        flex items-center gap-3 rounded-2xl border border-[#1b4332]/20
                        bg-[#1b4332] text-white shadow-2xl px-5 py-3 min-w-max">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
              {selectedIds.size}
            </span>
            <span className="text-sm font-medium">
              écriture{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="h-5 w-px bg-white/30" />
          <button
            onClick={() => { setReimputeError(null); setShowReimpute(true) }}
            className="flex items-center gap-1.5 rounded-xl bg-white text-[#1b4332] px-4 py-1.5
                       text-sm font-semibold hover:bg-green-50 transition-colors"
          >
            ↪ Réimputer vers…
          </button>
          <button
            onClick={clearSelection}
            className="text-white/70 hover:text-white text-sm ml-1 transition-colors"
            title="Annuler la sélection"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Modal réimputation ── */}
      {showReimpute && (
        <ReimputeModal
          selectedIds={Array.from(selectedIds)}
          sourceAccounts={selectedSourceAccounts}
          onConfirm={handleReimputeConfirm}
          onClose={() => { setShowReimpute(false); setReimputeError(null) }}
          isPending={reimputeMutation.isPending}
          error={reimputeError}
        />
      )}
    </div>
  )
}
