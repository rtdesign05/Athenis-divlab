import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelectedFiscalYearData, useFiscalYears, useCloseFiscalYear } from '@/hooks/useFiscalYear'
import { accountingApi, type FSPair, type FinancialStatements, type AccountingZone, type FiscalYear } from '@/services/accountingApi'
import { settingsApi } from '@/services/settingsApi'
import { FiscalYearSelector } from '@/components/accounting/FiscalYearSelector'
import { useEmployeeStats } from '@/hooks/useHr'
import { useCurrency } from '@/hooks/useCurrency'
import { toSafeAmount } from '@/shared/utils/currency'
import { printDocument } from '@/lib/printDocument'

// ── HR type labels ────────────────────────────────────────────────────────────
const TYPE_LABEL_HR: Record<string, string> = {
  FULL_TIME: 'Temps plein',
  PART_TIME: 'Temps partiel',
  CONTRACT:  'Contractuel',
  INTERN:    'Stagiaire',
}

// ── Formatters ────────────────────────────────────────────────────────────────

/** Format a number without currency symbol — parentheses for negatives */
function fmtNum(n: number): string {
  if (n === 0) return '–'
  const abs = Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  return n < 0 ? `(${abs})` : abs
}

function variation(n: number, nm1: number): string | null {
  if (nm1 === 0) return null
  const pct = ((n - nm1) / Math.abs(nm1)) * 100
  const arrow = pct >= 0 ? '↑' : '↓'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)} % ${arrow}`
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const PRIMARY  = '#1b4332'
const PRIMARY_LIGHT = '#f0fdf4'

// ── FinancialTable — composant de tableau premium ─────────────────────────────

interface FRow {
  ref?:       string
  label:      string
  values?:    FSPair
  section?:   boolean   // en-tête de section (fond gris)
  bold?:      boolean   // sous-total (fond vert pâle)
  grandTotal?: boolean  // total général (fond vert foncé, texte blanc)
  indent?:    boolean
  signed?:    boolean   // les valeurs peuvent être négatives
  separator?: boolean   // ligne vide de séparation
}

function FinancialTable({
  title, year, prevYear, hasPrevYear, rows,
  showRef = false, showVariation = false,
  currency = '',
}: {
  title?:         string
  year:           number
  prevYear:       number
  hasPrevYear:    boolean
  rows:           FRow[]
  showRef?:       boolean
  showVariation?: boolean
  currency?:      string
}) {
  const cols = showVariation ? 4 : 3
  const thClass = 'px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-white/80'
  const yrLabel = (y: number) => `N (${y})`
  const nm1Label = hasPrevYear ? `N-1 (${prevYear})` : 'N-1'

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      {title && (
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: PRIMARY }}
        >
          <span className="text-sm font-semibold text-white tracking-wide">{title}</span>
          {currency && <span className="text-xs text-white/60 font-mono">{currency}</span>}
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: PRIMARY + 'e0' }}>
            {showRef && <th className="px-3 py-2 w-10 text-left text-[10px] font-mono text-white/60">Réf.</th>}
            <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/80">Libellé</th>
            <th className={thClass}>{yrLabel(year)}</th>
            <th className={`${thClass} ${!hasPrevYear ? 'opacity-40' : ''}`}>{nm1Label}</th>
            {showVariation && <th className={thClass}>Variation</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            if (row.separator) {
              return <tr key={i} className="h-2 bg-slate-50"><td colSpan={cols + (showRef ? 1 : 0)} /></tr>
            }
            if (row.section) {
              return (
                <tr key={i} className="bg-slate-100 border-t border-slate-200">
                  <td colSpan={cols + (showRef ? 1 : 0)}
                    className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {row.label}
                  </td>
                </tr>
              )
            }
            if (row.grandTotal) {
              const nVal  = row.values?.n  ?? 0
              const nm1Val= row.values?.nm1 ?? 0
              return (
                <tr key={i} style={{ background: PRIMARY }} className="border-t-2 border-white/20">
                  {showRef && (
                    <td className="px-3 py-2.5 text-[10px] font-mono font-bold text-white/60 whitespace-nowrap">
                      {row.ref ?? ''}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white">
                    {row.label}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sm font-bold text-white whitespace-nowrap">
                    {fmtNum(nVal)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-sm font-bold text-white/70 whitespace-nowrap">
                    {hasPrevYear ? fmtNum(nm1Val) : '—'}
                  </td>
                  {showVariation && (
                    <td className="px-3 py-2.5 text-right text-xs text-white/60 whitespace-nowrap">
                      {hasPrevYear && row.values ? (variation(nVal, nm1Val) ?? '') : ''}
                    </td>
                  )}
                </tr>
              )
            }
            if (row.bold) {
              const nVal   = row.values?.n  ?? 0
              const nm1Val = row.values?.nm1 ?? 0
              const isNeg  = nVal < 0
              return (
                <tr key={i} className="border-t border-slate-200" style={{ background: PRIMARY_LIGHT }}>
                  {showRef && (
                    <td className="px-3 py-2 text-[10px] font-mono font-semibold text-slate-500 whitespace-nowrap">
                      {row.ref ?? ''}
                    </td>
                  )}
                  <td className="px-3 py-2 text-xs font-semibold text-slate-800">{row.label}</td>
                  <td className={`px-3 py-2 text-right tabular-nums text-sm font-semibold whitespace-nowrap ${isNeg ? 'text-red-600' : 'text-slate-800'}`}>
                    {row.values !== undefined ? fmtNum(nVal) : ''}
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums text-sm font-semibold whitespace-nowrap ${nm1Val < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                    {row.values !== undefined ? (hasPrevYear ? fmtNum(nm1Val) : '—') : ''}
                  </td>
                  {showVariation && (
                    <td className="px-3 py-2 text-right text-xs text-slate-400 whitespace-nowrap">
                      {row.values && hasPrevYear ? (variation(nVal, nm1Val) ?? '') : ''}
                    </td>
                  )}
                </tr>
              )
            }
            // Regular row
            const nVal   = row.values?.n  ?? 0
            const nm1Val = row.values?.nm1 ?? 0
            const isNeg  = nVal < 0
            return (
              <tr key={i} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                {showRef && (
                  <td className="px-3 py-1.5 text-[10px] font-mono text-slate-400 whitespace-nowrap align-middle">
                    {row.ref ?? ''}
                  </td>
                )}
                <td className={`px-3 py-1.5 text-slate-600 ${row.indent ? 'pl-7' : ''}`}>
                  {row.label}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums whitespace-nowrap ${isNeg ? 'text-red-600' : 'text-slate-700'}`}>
                  {row.values !== undefined ? fmtNum(nVal) : ''}
                </td>
                <td className={`px-3 py-1.5 text-right tabular-nums text-slate-400 whitespace-nowrap ${nm1Val < 0 ? 'text-red-400' : ''}`}>
                  {row.values !== undefined ? (hasPrevYear ? fmtNum(nm1Val) : '—') : ''}
                </td>
                {showVariation && (
                  <td className="px-3 py-1.5 text-right text-xs text-slate-400 whitespace-nowrap">
                    {row.values && hasPrevYear ? (variation(nVal, nm1Val) ?? '') : ''}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── KPI Row ───────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color = 'green' }: {
  label:  string
  value:  string
  sub?:   string
  icon:   string
  color?: 'green' | 'blue' | 'purple' | 'red' | 'orange' | 'slate'
}) {
  const palette: Record<string, string> = {
    green:  'bg-emerald-50  border-emerald-200  text-emerald-900',
    blue:   'bg-blue-50     border-blue-200     text-blue-900',
    purple: 'bg-purple-50   border-purple-200   text-purple-900',
    red:    'bg-rose-50     border-rose-200     text-rose-900',
    orange: 'bg-orange-50   border-orange-200   text-orange-900',
    slate:  'bg-slate-50    border-slate-200    text-slate-900',
  }
  return (
    <div className={`rounded-xl border p-4 ${palette[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-60">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-lg font-bold tabular-nums leading-tight">{value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-50">{sub}</p>}
    </div>
  )
}

// ── Balance Badge ─────────────────────────────────────────────────────────────

function BalanceBadge({ actif, passif }: { actif: FSPair | undefined; passif: FSPair | undefined }) {
  const a    = actif?.n  ?? 0
  const p    = passif?.n ?? 0
  const diff = Math.abs(a - p)
  const ok   = diff < 1

  return (
    <div className={`flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium border ${
      ok
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-amber-50 border-amber-200 text-amber-800'
    }`}>
      <span className="text-base">{ok ? '✅' : '⚠️'}</span>
      {ok
        ? <span>Bilan équilibré — Actif&nbsp;=&nbsp;Passif&nbsp;=&nbsp;<strong className="tabular-nums">{fmtNum(a)}</strong></span>
        : <span>Déséquilibre : Actif&nbsp;<strong>{fmtNum(a)}</strong>&nbsp;≠&nbsp;Passif&nbsp;<strong>{fmtNum(p)}</strong>&nbsp;(écart&nbsp;: {fmtNum(diff)})</span>}
    </div>
  )
}

// ── OHADA SYSCOHADA révisé ────────────────────────────────────────────────────

function OhadaKpi({ d, fmtCur }: { d: FinancialStatements; fmtCur: (n: number) => string }) {
  const a   = (d.bilan?.actif  as Record<string, FSPair> | undefined)
  const p   = (d.bilan?.passif as Record<string, FSPair> | undefined)
  const cr  = d.compteDeResultat as Record<string, unknown> | undefined

  const totalActif = a?.['totalActif']?.n  ?? 0
  const totalCP    = p?.['totalCapitauxPropres']?.n ?? 0
  const resultat   = (cr?.['resultat'] as FSPair | undefined)?.n ?? 0
  const tresorerie = a?.['banquesCaisse']?.n ?? 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Total bilan" value={fmtCur(totalActif)} icon="🏛️" color="blue"
        sub={`Exercice ${d.year}`} />
      <KpiCard label="Capitaux propres" value={fmtCur(totalCP)} icon="💼"
        color={totalCP >= 0 ? 'green' : 'red'} />
      <KpiCard label="Résultat net" value={fmtCur(resultat)} icon={resultat >= 0 ? '📈' : '📉'}
        color={resultat >= 0 ? 'green' : 'red'} sub={resultat >= 0 ? 'Bénéfice' : 'Perte'} />
      <KpiCard label="Trésorerie" value={fmtCur(tresorerie)} icon="💰" color="purple" />
    </div>
  )
}

function OhadaBilan({ d }: { d: FinancialStatements }) {
  const a = d.bilan?.actif  as Record<string, FSPair> | undefined
  const p = d.bilan?.passif as Record<string, FSPair> | undefined
  if (!a || !p) return null
  const y = d.year, pv = d.prevYear, hp = d.hasPrevYear

  return (
    <div className="space-y-4">
      <BalanceBadge actif={a['totalActif']} passif={p['totalPassif']} />
      <div className="grid gap-4 xl:grid-cols-2">

        {/* ACTIF */}
        <FinancialTable showRef title="Bilan — Actif (SYSCOHADA révisé)" currency="FCFA"
          year={y} prevYear={pv} hasPrevYear={hp} rows={[
          { section: true, label: 'ACTIF IMMOBILISÉ (I)' },
          { ref: 'AI', label: 'Charges immobilisées',                      values: a['chargesImmobilisees'],          indent: true },
          { ref: 'AJ', label: 'Immobilisations incorporelles',             values: a['immobilisationsIncorporelles'], indent: true },
          { ref: 'AQ', label: 'Terrains',                                  values: a['terrains'],                     indent: true },
          { ref: 'AR', label: 'Bâtiments & agencements',                   values: a['batimentsAgencements'],         indent: true },
          { ref: 'AS', label: 'Matériel & équipement',                     values: a['materielEquipement'],           indent: true },
          { ref: 'AT', label: 'Matériel de transport',                     values: a['materielTransport'],            indent: true },
          { ref: 'AV', label: 'Avances & acomptes sur immobilisations',    values: a['avancesAcomptesImmo'],          indent: true },
          { ref: 'AW', label: 'Autres immobilisations',                    values: a['autresImmobilisations'],        indent: true },
          { ref: '',   label: 'TOTAL ACTIF IMMOBILISÉ (I)',                values: a['totalActifImmobilise'],         bold: true },
          { separator: true, label: '' },
          { section: true, label: 'ACTIF CIRCULANT hors trésorerie (II)' },
          { ref: 'BA', label: 'Marchandises',                              values: a['stocksMarchandises'],           indent: true },
          { ref: 'BB', label: 'Matières premières & fournitures',          values: a['stocksMatieresPremiere'],       indent: true },
          { ref: 'BC', label: 'Encours de production',                     values: a['encoursProduction'],            indent: true },
          { ref: 'BD', label: 'Produits finis',                            values: a['stocksProduitsFinis'],          indent: true },
          { ref: 'BF', label: 'Fournisseurs — avances versées',            values: a['avancesFournisseurs'],          indent: true },
          { ref: 'BG', label: 'Clients',                                   values: a['creancesClients'],              indent: true },
          { ref: 'BH', label: 'Autres créances',                           values: a['autresCreances'],               indent: true },
          { ref: 'BI', label: 'TOTAL ACTIF CIRCULANT (II)',                values: a['totalActifCirculant'],          bold: true },
          { separator: true, label: '' },
          { section: true, label: 'TRÉSORERIE — ACTIF (III)' },
          { ref: 'BJ', label: 'Titres de placement',                       values: a['titresPlacement'],              indent: true },
          { ref: 'BK', label: 'Valeurs à encaisser',                       values: a['valeursEncaissement'],          indent: true },
          { ref: 'BL', label: 'Banques, chèques postaux, caisse',          values: a['banquesCaisse'],                indent: true },
          { ref: 'BM', label: 'TOTAL TRÉSORERIE-ACTIF (III)',              values: a['totalTresorerie'],              bold: true },
          { ref: 'BQ', label: 'TOTAL GÉNÉRAL (I + II + III)',              values: a['totalActif'],                   grandTotal: true },
        ]} />

        {/* PASSIF */}
        <FinancialTable showRef title="Bilan — Passif (SYSCOHADA révisé)" currency="FCFA"
          year={y} prevYear={pv} hasPrevYear={hp} rows={[
          { section: true, label: 'CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES' },
          { ref: 'CA', label: 'Capital social',                            values: p['capitalSocial'],             indent: true },
          { ref: 'CB', label: 'Primes liées au capital',                   values: p['primesReserves'],            indent: true },
          { ref: 'CC', label: 'Réserves indisponibles / libres',           values: p['reserves'],                  indent: true },
          { ref: 'CG', label: 'Report à nouveau (+/−)',                    values: p['reportANouveau'],            indent: true, signed: true },
          { ref: 'CH', label: 'Résultat net de l\'exercice (+/−)',         values: p['resultatNet'],               indent: true, signed: true },
          { ref: 'CI', label: 'Subventions d\'investissement',             values: p['subventionsInvestissement'], indent: true },
          { ref: 'CJ', label: 'Provisions réglementées',                   values: p['provisionsReglementees'],    indent: true },
          { ref: 'CK', label: 'TOTAL CAPITAUX PROPRES',                    values: p['totalCapitauxPropres'],      bold: true },
          { separator: true, label: '' },
          { section: true, label: 'DETTES FINANCIÈRES ET RESSOURCES ASSIMILÉES' },
          { ref: 'DA', label: 'Emprunts et dettes financières (LT)',       values: p['empruntsDettesFin'],         indent: true },
          { ref: 'DB', label: 'Dettes de location-acquisition',            values: p['dettesLocationAcquisition'], indent: true },
          { ref: 'DC', label: 'Provisions pour risques et charges',        values: p['provisionsRisquesCharges'],  indent: true },
          { ref: 'DD', label: 'TOTAL DETTES FINANCIÈRES',                  values: p['totalDettesFinancieres'],    bold: true },
          { ref: 'DF', label: 'TOTAL RESSOURCES STABLES',                  values: p['totalRessourcesStables'],    bold: true },
          { separator: true, label: '' },
          { section: true, label: 'PASSIF CIRCULANT hors trésorerie' },
          { ref: 'DI', label: 'Clients, avances reçues',                   values: p['avancesRecues'],             indent: true },
          { ref: 'DJ', label: 'Fournisseurs d\'exploitation',              values: p['dettesFournisseurs'],        indent: true },
          { ref: 'DK', label: 'Dettes fiscales et sociales',               values: p['dettesFiscalesSociales'],    indent: true },
          { ref: 'DM', label: 'TOTAL PASSIF CIRCULANT',                    values: p['totalPassifCirculant'],      bold: true },
          { ref: 'DV', label: 'TOTAL GÉNÉRAL',                             values: p['totalPassif'],               grandTotal: true },
        ]} />
      </div>
    </div>
  )
}

function OhadaCR({ d }: { d: FinancialStatements }) {
  const cr  = d.compteDeResultat as Record<string, unknown> | undefined
  if (!cr) return null
  const prod = cr['produits'] as Record<string, FSPair> | undefined
  const chg  = cr['charges']  as Record<string, FSPair> | undefined
  if (!prod || !chg) return null

  const get  = (key: string) => cr[key] as FSPair | undefined
  const y = d.year, pv = d.prevYear, hp = d.hasPrevYear

  return (
    <FinancialTable showVariation showRef
      title="Compte de résultat par nature (SYSCOHADA révisé)" currency="FCFA"
      year={y} prevYear={pv} hasPrevYear={hp}
      rows={[
        { section: true,  label: 'PRODUITS (A)' },
        { ref: 'TA', label: 'Chiffre d\'affaires (Ventes)',              values: prod['chiffreAffaires'],   indent: true },
        { ref: 'TB', label: 'Production vendue (71, 72)',                values: prod['productionVendue'],  indent: true },
        { ref: 'TC', label: 'Autres produits d\'exploitation',           values: prod['autresProduits'],    indent: true },
        { ref: 'TK', label: 'Produits financiers',                       values: prod['produitsFinanciers'],indent: true },
        { ref: 'TM', label: 'Reprises de provisions',                    values: prod['reprisesProvisions'],indent: true },
        { ref: 'TN', label: 'Transferts de charges',                     values: prod['transfertsCharges'], indent: true },
        { ref: '',   label: 'TOTAL PRODUITS (A)',                        values: prod['totalProduits'],     bold: true },
        { separator: true, label: '' },
        { section: true,  label: 'CHARGES (B)' },
        { ref: 'RA', label: 'Achats de marchandises & matières',         values: chg['achatsConsommes'],    indent: true },
        { ref: 'RB', label: 'Autres achats & charges externes',          values: chg['autresAchats'],       indent: true },
        { ref: 'RC', label: 'Transports',                                values: chg['transports'],         indent: true },
        { ref: 'RD', label: 'Impôts, taxes et versements assimilés',     values: chg['impotsTaxes'],        indent: true },
        { ref: 'RE', label: 'Charges de personnel',                      values: chg['chargesPersonnel'],   indent: true },
        { ref: 'RF', label: 'Autres charges d\'exploitation',            values: chg['autresCharges'],      indent: true },
        { ref: 'RG', label: 'Dotations aux amortissements & provisions', values: chg['dotations'],          indent: true },
        { ref: 'RJ', label: 'Charges financières',                       values: chg['chargesFinancieres'], indent: true },
        { ref: 'RM', label: 'Charges HAO',                               values: chg['chargesHAO'],         indent: true },
        { ref: 'RP', label: 'Participation des travailleurs',            values: chg['participation'],      indent: true },
        { ref: 'RS', label: 'Impôt sur le résultat (IS/IRPP)',           values: chg['impotResultat'],      indent: true },
        { ref: '',   label: 'TOTAL CHARGES (B)',                         values: chg['totalCharges'],       bold: true },
        { separator: true, label: '' },
        { section: true,  label: 'SOLDES INTERMÉDIAIRES DE GESTION (SIG)' },
        { ref: '',   label: 'Marge brute sur marchandises',              values: get('margeCommerciale'),   indent: true, signed: true },
        { ref: '',   label: 'Valeur Ajoutée (VA)',                        values: get('valeurAjoutee'),      indent: true, signed: true, bold: true },
        { ref: '',   label: 'Excédent Brut d\'Exploitation (EBE)',       values: get('ebe'),                indent: true, signed: true, bold: true },
        { ref: '',   label: 'Résultat d\'exploitation',                  values: get('resultatExploitation'),indent: true, signed: true },
        { ref: '',   label: 'Résultat financier (Prod.fin − Chg.fin)',   values: get('resultatFinancier'),  indent: true, signed: true },
        { ref: '',   label: 'Résultat des activités ordinaires (RAO)',   values: get('resultatAO'),         signed: true, bold: true },
        { separator: true, label: '' },
        { ref: 'XI', label: 'RÉSULTAT NET DE L\'EXERCICE (A − B)',       values: get('resultat'),           grandTotal: true, signed: true },
      ]}
    />
  )
}

function OhadaTafire({ d }: { d: FinancialStatements }) {
  const tf = d.tafire as Record<string, FSPair> | undefined
  if (!tf) return null
  return (
    <FinancialTable title="TAFIRE — Tableau de Financement par les Ressources (simplifié)"
      currency="FCFA" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear}
      rows={[
        { section: true,  label: 'FLUX D\'EXPLOITATION' },
        { label: 'Capacité d\'autofinancement brute (CAF)',              values: tf['cafBrute'],              indent: true, signed: true },
        { label: 'Variation des stocks',                                 values: tf['variationStocks'],       indent: true, signed: true },
        { label: 'Flux nets d\'exploitation (FNE)',                      values: tf['fluxExploitation'],      bold: true, signed: true },
        { separator: true, label: '' },
        { section: true,  label: 'FLUX D\'INVESTISSEMENT' },
        { label: 'Acquisitions nettes d\'immobilisations',               values: tf['investissements'],       indent: true, signed: true },
        { separator: true, label: '' },
        { section: true,  label: 'FLUX DE FINANCEMENT' },
        { label: 'Variation nette des dettes financières (LT)',          values: tf['financements'],          indent: true, signed: true },
        { separator: true, label: '' },
        { label: 'VARIATION NETTE DE TRÉSORERIE',                        values: tf['variationTresorerie'],   grandTotal: true, signed: true },
      ]}
    />
  )
}

function OhadaCP({ d }: { d: FinancialStatements }) {
  const p   = d.bilan?.passif as Record<string, FSPair> | undefined
  const cr  = d.compteDeResultat as Record<string, unknown> | undefined
  const res = (cr?.['resultat'] as FSPair | undefined)
  if (!p) return null
  return (
    <FinancialTable title="État de variation des capitaux propres"
      currency="FCFA" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear}
      rows={[
        { label: 'Capitaux propres à l\'ouverture (N-1)',       values: { n: p['totalCapitauxPropres']?.nm1 ?? 0, nm1: 0 } },
        { label: 'Résultat net de l\'exercice N',               values: res ?? { n: 0, nm1: 0 }, indent: true, signed: true },
        { label: 'Distribution de dividendes',                  values: { n: 0, nm1: 0 }, indent: true },
        { label: 'Autres variations',                           values: { n: 0, nm1: 0 }, indent: true },
        { label: 'CAPITAUX PROPRES À LA CLÔTURE',               values: p['totalCapitauxPropres'], grandTotal: true },
      ]}
    />
  )
}

// ── OHADA Notes annexes ───────────────────────────────────────────────────────

function OhadaNotesEditor({ d, fyId }: { d: FinancialStatements; fyId: string }) {
  const { data: balance } = useQuery({
    queryKey: ['balance-journal', fyId],
    queryFn:  () => accountingApi.getBalanceByFiscalYear(fyId),
    staleTime: 5 * 60_000,
  })
  const statsQ          = useEmployeeStats()
  const { fmt: fmtCur } = useCurrency()
  const hrStats         = statsQ.data
  const tafire          = d.tafire as Record<string, FSPair> | undefined

  const immoRows  = useMemo(() => balance?.rows.filter(r => r.account.startsWith('2') && !r.account.startsWith('28') && !r.account.startsWith('29')) ?? [], [balance])
  const amortRows = useMemo(() => balance?.rows.filter(r => r.account.startsWith('28') || r.account.startsWith('29') || r.account.startsWith('15')) ?? [], [balance])
  const creanceRows = useMemo(() => balance?.rows.filter(r => r.account.startsWith('4') && r.soldeDebiteur > 0.005) ?? [], [balance])
  const detteRows = useMemo(() => balance?.rows.filter(r => r.account.startsWith('4') && r.soldeCrediteur > 0.005) ?? [], [balance])

  const autoContent = useMemo<Record<string, string>>(() => ({
    note1: [
      `Les états financiers ont été établis conformément aux dispositions du Système Comptable`,
      `OHADA (SYSCOHADA révisé), règlement n°01/2017/CM/UEMOA.\n`,
      `Principes appliqués :`,
      `  - Continuité de l'exploitation`,
      `  - Permanence des méthodes`,
      `  - Spécialisation des exercices`,
      `  - Prudence`,
      `  - Coût historique`,
    ].join('\n'),
    note2: immoRows.length > 0
      ? `Immobilisations au 31/12/${d.year} :\n\n` + immoRows.map(r => `  ${r.account}  ${r.label}  →  ${fmtNum(r.soldeDebiteur || r.soldeCrediteur)}`).join('\n')
      : `Néant — aucune immobilisation enregistrée sur l'exercice ${d.year}.`,
    note3: amortRows.length > 0
      ? `Amortissements et provisions au 31/12/${d.year} :\n\n` + amortRows.map(r => `  ${r.account}  ${r.label}  →  ${fmtNum(r.soldeDebiteur || r.soldeCrediteur)}`).join('\n')
      : `Néant — aucun amortissement ou provision enregistré.`,
    note4: (creanceRows.length > 0 || detteRows.length > 0)
      ? [`Créances au 31/12/${d.year} :`, ...(creanceRows.length > 0 ? creanceRows.map(r => `  ${r.account}  ${r.label}  →  ${fmtNum(r.soldeDebiteur)}`) : ['  Néant']), ``, `Dettes au 31/12/${d.year} :`, ...(detteRows.length > 0 ? detteRows.map(r => `  ${r.account}  ${r.label}  →  ${fmtNum(r.soldeCrediteur)}`) : ['  Néant'])].join('\n')
      : `Néant — aucune créance ou dette significative au 31/12/${d.year}.`,
    note5: [`Engagements hors bilan au 31/12/${d.year} :`, `  - Cautions et garanties données : néant`, `  - Engagements de crédit-bail    : néant`, `  - Autres engagements hors bilan : néant`].join('\n'),
    note6: hrStats
      ? [`Effectifs et charges de personnel — exercice ${d.year} :`, ``, `  Effectif total actif    : ${hrStats.active.count} employé(s)`, `  Masse salariale / mois  : ${fmtCur(toSafeAmount(hrStats.active.totalMonthly))}`, ...(hrStats.byType.length > 0 ? [``, `  Répartition par contrat :`, ...hrStats.byType.map(b => `    - ${(TYPE_LABEL_HR[b.employmentType] ?? b.employmentType).padEnd(18)} : ${b._count}`)] : [])].join('\n')
      : `Données RH non disponibles — vérifiez le module Ressources Humaines.`,
    note7: [`Événements postérieurs à la clôture ${d.year} :`, ``, `  Aucun événement significatif postérieur à la date de clôture n'est à signaler`, `  à la date d'établissement des présents états financiers.`].join('\n'),
    note8: tafire
      ? [`Flux de trésorerie — exercice ${d.year} (TAFIRE) :`, ``, tafire['cafBrute'] ? `  CAF brute                   : ${fmtNum(tafire['cafBrute'].n)}` : '', tafire['fluxExploitation'] ? `  Flux nets d'exploitation    : ${fmtNum(tafire['fluxExploitation'].n)}` : '', tafire['investissements'] ? `  Flux d'investissement       : ${fmtNum(tafire['investissements'].n)}` : '', tafire['financements'] ? `  Flux de financement         : ${fmtNum(tafire['financements'].n)}` : '', tafire['variationTresorerie'] ? `  Variation nette trésorerie  : ${fmtNum(tafire['variationTresorerie'].n)}` : ''].filter(Boolean).join('\n')
      : `Données TAFIRE non disponibles pour l'exercice ${d.year}.`,
  }), [d.year, immoRows, amortRows, creanceRows, detteRows, hrStats, tafire, fmtCur])

  const storageKey = `ohada-notes-${fyId}`
  const [remarks, setRemarks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') } catch { return {} }
  })
  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(remarks)) }, [remarks, storageKey])
  const [openNote, setOpenNote] = useState<string | null>('note1')

  const NOTES = [
    { key: 'note1', label: 'Note 1 — Règles et méthodes comptables' },
    { key: 'note2', label: 'Note 2 — Tableau des immobilisations' },
    { key: 'note3', label: 'Note 3 — Amortissements et provisions' },
    { key: 'note4', label: 'Note 4 — Créances et dettes' },
    { key: 'note5', label: 'Note 5 — Engagements hors bilan' },
    { key: 'note6', label: 'Note 6 — Effectifs et charges de personnel' },
    { key: 'note7', label: 'Note 7 — Événements postérieurs à la clôture' },
    { key: 'note8', label: 'Note 8 — Flux de trésorerie (TAFIRE)' },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-4">
        Informations pré-remplies depuis les modules Comptabilité et RH — conformes SYSCOHADA révisé.
        Complétez chaque note avec vos observations additionnelles.
      </p>
      {NOTES.map(n => (
        <div key={n.key} className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <button
            onClick={() => setOpenNote(openNote === n.key ? null : n.key)}
            className="w-full flex items-center justify-between px-4 py-3 text-white text-sm font-semibold text-left transition-colors"
            style={{ background: openNote === n.key ? PRIMARY : PRIMARY + 'cc' }}
          >
            <span>{n.label}</span>
            <span className="text-base leading-none select-none font-light">{openNote === n.key ? '−' : '+'}</span>
          </button>
          {openNote === n.key && (
            <div className="p-4 space-y-3 bg-white">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Données pré-remplies</p>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                  {autoContent[n.key] ?? '–'}
                </pre>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Observations complémentaires</label>
                <textarea
                  className="w-full min-h-[80px] resize-y rounded-lg border border-slate-200 p-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30"
                  placeholder="Ajoutez vos observations..."
                  value={remarks[n.key] ?? ''}
                  onChange={e => setRemarks(prev => ({ ...prev, [n.key]: e.target.value }))}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── OHADA Situation intermédiaire ─────────────────────────────────────────────

function OhadaSituation({ d, fyData }: { d: FinancialStatements; fyData: FiscalYear }) {
  const fyStart = fyData.startDate.slice(0, 10)
  const fyEnd   = fyData.endDate.slice(0, 10)
  const today   = new Date().toISOString().slice(0, 10)
  const todayCapped = today < fyEnd ? today : fyEnd
  const [dateFrom, setDateFrom] = useState(fyStart)
  const [dateTo,   setDateTo]   = useState(todayCapped)
  const printRef = useRef<HTMLDivElement>(null)

  const { data: glData, isLoading } = useQuery({
    queryKey: ['grand-livre-situation', fyData.id],
    queryFn:  () => accountingApi.getGrandLivreByFiscalYear(fyData.id),
    staleTime: 2 * 60_000,
  })

  const { bilanRows, crRows, resultatNet } = useMemo(() => {
    if (!glData) return { bilanRows: [] as FRow[], crRows: [] as FRow[], resultatNet: 0 }
    const bilanMap: Record<string, { label: string; debit: number; credit: number }> = {}
    const crMap:    Record<string, { label: string; debit: number; credit: number }> = {}
    for (const compte of glData.comptes) {
      const cls = compte.account.charAt(0)
      if (['1','2','3','4','5'].includes(cls)) {
        let db = 0, cr = 0
        for (const l of compte.lignes) {
          if (l.date <= dateTo) { db += l.debit; cr += l.credit }
        }
        if (Math.abs(db - cr) > 0.005) bilanMap[compte.account] = { label: compte.label, debit: db, credit: cr }
      } else if (['6','7'].includes(cls)) {
        let db = 0, cr = 0
        for (const l of compte.lignes) {
          if (l.date >= dateFrom && l.date <= dateTo) { db += l.debit; cr += l.credit }
        }
        if (Math.abs(db - cr) > 0.005) crMap[compte.account] = { label: compte.label, debit: db, credit: cr }
      }
    }
    const bRows: FRow[] = [{ section: true, label: 'ACTIF' }]
    for (const [acc, v] of Object.entries(bilanMap).sort(([a],[b]) => a.localeCompare(b))) {
      const cls = acc.charAt(0)
      if (['2','3'].includes(cls) || (cls === '5' && v.debit > v.credit) || (cls === '4' && v.debit > v.credit)) {
        const solde = v.debit - v.credit
        if (solde > 0.005) bRows.push({ label: `${acc}  ${v.label}`, values: { n: solde, nm1: 0 }, indent: true })
      }
    }
    bRows.push({ section: true, label: 'PASSIF' })
    for (const [acc, v] of Object.entries(bilanMap).sort(([a],[b]) => a.localeCompare(b))) {
      const cls = acc.charAt(0)
      if (cls === '1' || (cls === '4' && v.credit > v.debit) || (cls === '5' && v.credit > v.debit)) {
        const solde = v.credit - v.debit
        if (solde > 0.005) bRows.push({ label: `${acc}  ${v.label}`, values: { n: solde, nm1: 0 }, indent: true })
      }
    }
    const crRowDefs: FRow[] = []
    let totalProd = 0, totalChg = 0
    crRowDefs.push({ section: true, label: 'PRODUITS (classe 7)' })
    for (const [acc, v] of Object.entries(crMap).sort(([a],[b]) => a.localeCompare(b))) {
      if (acc.startsWith('7')) {
        const s = v.credit - v.debit
        crRowDefs.push({ label: `${acc}  ${v.label}`, values: { n: s, nm1: 0 }, indent: true })
        totalProd += s
      }
    }
    crRowDefs.push({ label: 'Total produits', values: { n: totalProd, nm1: 0 }, bold: true })
    crRowDefs.push({ section: true, label: 'CHARGES (classe 6)' })
    for (const [acc, v] of Object.entries(crMap).sort(([a],[b]) => a.localeCompare(b))) {
      if (acc.startsWith('6')) {
        const s = v.debit - v.credit
        crRowDefs.push({ label: `${acc}  ${v.label}`, values: { n: s, nm1: 0 }, indent: true })
        totalChg += s
      }
    }
    crRowDefs.push({ label: 'Total charges', values: { n: totalChg, nm1: 0 }, bold: true })
    const res = totalProd - totalChg
    crRowDefs.push({ label: 'RÉSULTAT DE LA PÉRIODE', values: { n: res, nm1: 0 }, grandTotal: true, signed: true })
    return { bilanRows: bRows, crRows: crRowDefs, resultatNet: res }
  }, [glData, dateFrom, dateTo])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Du</label>
          <input type="date" value={dateFrom} min={fyStart} max={dateTo} onChange={e => setDateFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Au</label>
          <input type="date" value={dateTo} min={dateFrom} max={fyEnd} onChange={e => setDateTo(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1b4332]/30" />
        </div>
        <button onClick={() => printDocument(printRef.current, `États financiers — ${dateFrom} au ${dateTo}`)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
          🖨️ Imprimer
        </button>
      </div>
      {isLoading ? <Spinner /> : (
        <div ref={printRef} className="space-y-5">
          <div className={`flex items-center gap-3 rounded-xl p-4 border ${resultatNet >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
            <span className="text-2xl">{resultatNet >= 0 ? '📈' : '📉'}</span>
            <div>
              <p className="text-xs font-medium text-slate-500">Résultat de la période ({dateFrom} → {dateTo})</p>
              <p className={`text-xl font-bold tabular-nums ${resultatNet >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>{fmtNum(resultatNet)}</p>
            </div>
          </div>
          {bilanRows.length > 1 && (
            <FinancialTable title={`Situation du bilan — au ${dateTo}`} year={d.year} prevYear={d.prevYear} hasPrevYear={false} rows={bilanRows} />
          )}
          {crRows.length > 1 && (
            <FinancialTable title={`Compte de résultat intermédiaire — du ${dateFrom} au ${dateTo}`} year={d.year} prevYear={d.prevYear} hasPrevYear={false} rows={crRows} />
          )}
          {bilanRows.length <= 1 && crRows.length <= 1 && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <span className="text-3xl">📊</span>
              <p className="text-sm">Aucune écriture sur la période sélectionnée.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── France PCG ────────────────────────────────────────────────────────────────

function FranceKpi({ d, fmtCur }: { d: FinancialStatements; fmtCur: (n: number) => string }) {
  const a  = (d.bilan?.actif  as Record<string, FSPair> | undefined)
  const p  = (d.bilan?.passif as Record<string, FSPair> | undefined)
  const cr = d.compteDeResultat as Record<string, unknown> | undefined

  const totalActif = a?.['totalActif']?.n ?? 0
  const totalCP    = p?.['totalCapitauxPropres']?.n ?? 0
  const resultat   = (cr?.['resultatNet'] as FSPair | undefined)?.n ?? 0
  const tresorerie = a?.['tresorerie']?.n ?? 0

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Total bilan" value={fmtCur(totalActif)} icon="🏛️" color="blue" sub={`Exercice ${d.year}`} />
      <KpiCard label="Capitaux propres" value={fmtCur(totalCP)} icon="💼" color={totalCP >= 0 ? 'green' : 'red'} />
      <KpiCard label="Résultat net" value={fmtCur(resultat)} icon={resultat >= 0 ? '📈' : '📉'} color={resultat >= 0 ? 'green' : 'red'} sub={resultat >= 0 ? 'Bénéfice' : 'Perte'} />
      <KpiCard label="Trésorerie" value={fmtCur(tresorerie)} icon="💰" color="purple" />
    </div>
  )
}

function FranceBilan({ d }: { d: FinancialStatements }) {
  const a = d.bilan?.actif  as Record<string, FSPair> | undefined
  const p = d.bilan?.passif as Record<string, FSPair> | undefined
  if (!a || !p) return null
  const y = d.year, pv = d.prevYear, hp = d.hasPrevYear

  return (
    <div className="space-y-4">
      <BalanceBadge actif={a['totalActif']} passif={p['totalPassif']} />
      <div className="grid gap-4 xl:grid-cols-2">
        <FinancialTable title="Bilan — Actif (PCG 2050)" currency="€"
          year={y} prevYear={pv} hasPrevYear={hp} rows={[
          { section: true,  label: 'ACTIF IMMOBILISÉ' },
          { label: 'Immobilisations incorporelles',      values: a['immobilisationsIncorporelles'], indent: true },
          { label: 'Immobilisations corporelles',        values: a['immobilisationsCorporelles'],   indent: true },
          { label: 'Immobilisations financières',        values: a['immobilisationsFinancieres'],   indent: true },
          { label: 'TOTAL ACTIF IMMOBILISÉ (I)',         values: a['totalActifImmobilise'],         bold: true },
          { separator: true, label: '' },
          { section: true,  label: 'ACTIF CIRCULANT' },
          { label: 'Stocks et en-cours',                 values: a['stocks'],                       indent: true },
          { label: 'Créances clients et comptes rattachés', values: a['creancesClients'],           indent: true },
          { label: 'Autres créances',                    values: a['autresCreances'],               indent: true },
          { label: 'Trésorerie et équivalents',          values: a['tresorerie'],                   indent: true },
          { label: 'TOTAL ACTIF CIRCULANT (II)',         values: a['totalActifCirculant'],          bold: true },
          { label: 'TOTAL ACTIF (I + II)',               values: a['totalActif'],                   grandTotal: true },
        ]} />
        <FinancialTable title="Bilan — Passif (PCG 2050)" currency="€"
          year={y} prevYear={pv} hasPrevYear={hp} rows={[
          { section: true,  label: 'CAPITAUX PROPRES' },
          { label: 'Capital social ou individuel',       values: p['capital'],                      indent: true },
          { label: 'Réserves',                           values: p['reserves'],                     indent: true },
          { label: 'Report à nouveau',                   values: p['reportANouveau'],               indent: true, signed: true },
          { label: 'Résultat de l\'exercice (+/−)',      values: p['resultatExercice'],             indent: true, signed: true },
          { label: 'TOTAL CAPITAUX PROPRES (I)',         values: p['totalCapitauxPropres'],         bold: true },
          { separator: true, label: '' },
          { section: true,  label: 'PROVISIONS ET DETTES' },
          { label: 'Provisions pour risques et charges', values: p['provisions'],                   indent: true },
          { label: 'Emprunts et dettes financières',     values: p['emprunts'],                     indent: true },
          { label: 'Dettes fournisseurs et comptes ratt.', values: p['dettesFournisseurs'],         indent: true },
          { label: 'Dettes fiscales et sociales',        values: p['dettesFiscalesSociales'],       indent: true },
          { label: 'Autres dettes',                      values: p['autresDettes'],                 indent: true },
          { label: 'TOTAL DETTES (II)',                  values: p['totalDettes'],                  bold: true },
          { label: 'TOTAL PASSIF (I + II)',              values: p['totalPassif'],                  grandTotal: true },
        ]} />
      </div>
    </div>
  )
}

function FranceCR({ d }: { d: FinancialStatements }) {
  const cr  = d.compteDeResultat as Record<string, unknown> | undefined
  if (!cr) return null
  const prod = cr['produits'] as Record<string, FSPair> | undefined
  const chg  = cr['charges']  as Record<string, FSPair> | undefined
  if (!prod || !chg) return null
  const get  = (key: string) => cr[key] as FSPair | undefined

  return (
    <FinancialTable showVariation title="Compte de résultat (PCG 2052 / 2053)" currency="€"
      year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear}
      rows={[
        { section: true, label: 'PRODUITS D\'EXPLOITATION' },
        { label: 'Ventes et productions (70–72)',          values: prod['ventesEtProductions'],      indent: true },
        { label: 'Autres produits d\'exploitation (73–75)', values: prod['autresProduits'],          indent: true },
        { label: 'Produits financiers (76)',               values: prod['produitsFinanciers'],        indent: true },
        { label: 'Produits exceptionnels (77)',            values: prod['produitsExceptionnels'],     indent: true },
        { label: 'Reprises sur provisions (78–79)',        values: prod['reprisesSurProvisions'],     indent: true },
        { label: 'TOTAL PRODUITS (A)',                     values: prod['totalProduits'],             bold: true },
        { separator: true, label: '' },
        { section: true, label: 'CHARGES D\'EXPLOITATION' },
        { label: 'Achats de marchandises (607)',           values: chg['achatsMarchandises'],         indent: true },
        { label: 'Autres achats & charges externes (60–62)', values: chg['autresAchats'],            indent: true },
        { label: 'Impôts, taxes et assimilés (63)',        values: chg['impotsTaxes'],                indent: true },
        { label: 'Charges de personnel (64)',              values: chg['chargesPersonnel'],           indent: true },
        { label: 'Dotations aux amortissements (68)',      values: chg['dotationsAmortissements'],    indent: true },
        { label: 'Autres charges d\'exploitation (65)',    values: chg['autresCharges'],              indent: true },
        { label: 'Charges financières (66)',               values: chg['chargesFinancieres'],         indent: true },
        { label: 'Charges exceptionnelles (67)',           values: chg['chargesExceptionnelles'],     indent: true },
        { label: 'Impôt sur les bénéfices (69)',           values: chg['impotBenefices'],             indent: true },
        { label: 'TOTAL CHARGES (B)',                      values: chg['totalCharges'],               bold: true },
        { separator: true, label: '' },
        { section: true, label: 'SOLDES INTERMÉDIAIRES' },
        { label: 'Résultat d\'exploitation (A − B partiel)', values: get('resultatExploitation'),   signed: true, indent: true },
        { label: 'Résultat financier',                     values: get('resultatFinancier'),          signed: true, indent: true },
        { label: 'Résultat courant avant impôts',          values: get('resultatCourant'),            signed: true, bold: true },
        { separator: true, label: '' },
        { label: 'RÉSULTAT NET DE L\'EXERCICE (A − B)',    values: get('resultatNet'),                grandTotal: true, signed: true },
      ]}
    />
  )
}

function FranceAnnexe() {
  const items = [
    'Méthodes comptables et principes retenus',
    'Tableau des immobilisations et amortissements',
    'État des provisions',
    'Tableau des créances et des dettes',
    'Tableau des filiales et participations',
    'Engagements hors bilan',
    'Approbation des comptes et affectation du résultat',
  ]
  return (
    <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 text-sm font-semibold text-white" style={{ background: PRIMARY }}>
        Annexe aux états financiers (PCG)
      </div>
      <div className="p-5 space-y-3">
        <p className="text-sm text-slate-500">L'annexe complète les informations du bilan et du compte de résultat :</p>
        <ul className="space-y-2">
          {items.map(s => (
            <li key={s} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRIMARY }} />
              {s}
            </li>
          ))}
        </ul>
        <p className="text-xs italic text-slate-400 pt-2">Générée automatiquement à la clôture de l'exercice.</p>
      </div>
    </div>
  )
}

function FranceRapport({ d }: { d: FinancialStatements }) {
  const cr  = d.compteDeResultat as Record<string, unknown> | undefined
  const ca  = (cr?.['produits'] as Record<string, FSPair> | undefined)?.['ventesEtProductions']
  const res = (cr?.['resultatNet'] as FSPair | undefined)
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Chiffre d'affaires N</p>
          <p className="text-2xl font-bold tabular-nums text-slate-800">{ca ? fmtNum(ca.n) : '–'}</p>
          {ca && ca.nm1 > 0 && <p className="text-xs text-slate-400 mt-1">N-1 : {fmtNum(ca.nm1)}</p>}
        </div>
        <div className="rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Résultat net N</p>
          <p className={`text-2xl font-bold tabular-nums ${res && res.n < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {res ? fmtNum(res.n) : '–'}
          </p>
          {res && res.nm1 !== 0 && <p className="text-xs text-slate-400 mt-1">N-1 : {fmtNum(res.nm1)}</p>}
        </div>
      </div>
      <div className="rounded-xl border border-slate-200 p-5 shadow-sm">
        <h4 className="mb-3 font-semibold text-slate-800">Informations obligatoires du rapport de gestion</h4>
        <ul className="space-y-2">
          {[
            "Situation et activité de la société durant l'exercice",
            "Résultats, évolution prévisible et perspectives",
            "Événements importants postérieurs à la clôture",
            "Activités en matière de recherche et développement",
            "Risques financiers : taux d'intérêt, change, liquidité",
            "Tableau des résultats des cinq derniers exercices",
          ].map(s => (
            <li key={s} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRIMARY }} />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FranceAffectation({ d }: { d: FinancialStatements }) {
  const cr  = d.compteDeResultat as Record<string, unknown> | undefined
  const res = cr?.['resultatNet'] as FSPair | undefined
  const net = res?.n ?? 0
  return (
    <FinancialTable title="Affectation du résultat" currency="€"
      year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear}
      rows={[
        { section: true, label: 'ORIGINE' },
        { label: 'Résultat net de l\'exercice',    values: { n: net, nm1: res?.nm1 ?? 0 }, signed: true },
        { label: 'Report à nouveau antérieur',     values: { n: 0, nm1: 0 }, indent: true },
        { label: 'Total à affecter',               values: { n: net, nm1: res?.nm1 ?? 0 }, bold: true, signed: true },
        { section: true, label: 'AFFECTATION' },
        { label: 'Réserve légale (5 %)',           values: { n: net > 0 ? net * 0.05 : 0, nm1: 0 }, indent: true },
        { label: 'Réserves statutaires',           values: { n: 0, nm1: 0 }, indent: true },
        { label: 'Dividendes distribués',          values: { n: 0, nm1: 0 }, indent: true },
        { label: 'Report à nouveau',               values: { n: net > 0 ? net * 0.95 : net, nm1: 0 }, indent: true, signed: true },
      ]}
    />
  )
}

// ── IFRS ──────────────────────────────────────────────────────────────────────

function IfrsSOFP({ d }: { d: FinancialStatements }) {
  const a = d.statementOfFinancialPosition?.assets              as Record<string, FSPair> | undefined
  const e = d.statementOfFinancialPosition?.equityAndLiabilities as Record<string, FSPair> | undefined
  if (!a || !e) return null
  return (
    <div className="space-y-4">
      <BalanceBadge actif={a['totalAssets']} passif={e['totalEquityAndLiabilities']} />
      <div className="grid gap-4 xl:grid-cols-2">
        <FinancialTable title="Statement of Financial Position — Assets"
          year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
          { section: true, label: 'NON-CURRENT ASSETS' },
          { label: 'Property, plant & equipment',       values: a['ppe'],                        indent: true },
          { label: 'Intangible assets',                 values: a['intangibleAssets'],           indent: true },
          { label: 'Financial investments',             values: a['investments'],                indent: true },
          { label: 'Deferred tax assets',               values: a['deferredTaxAssets'],          indent: true },
          { label: 'Total non-current assets',          values: a['totalNonCurrentAssets'],      bold: true },
          { section: true, label: 'CURRENT ASSETS' },
          { label: 'Inventories',                       values: a['inventories'],                indent: true },
          { label: 'Trade and other receivables',       values: a['tradeAndOtherReceivables'],   indent: true },
          { label: 'Other current assets',              values: a['otherCurrentAssets'],         indent: true },
          { label: 'Cash and cash equivalents',         values: a['cashAndEquivalents'],         indent: true },
          { label: 'Total current assets',              values: a['totalCurrentAssets'],         bold: true },
          { label: 'TOTAL ASSETS',                      values: a['totalAssets'],                grandTotal: true },
        ]} />
        <FinancialTable title="Equity and Liabilities"
          year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
          { section: true, label: 'EQUITY' },
          { label: 'Share capital',                     values: e['shareCapital'],               indent: true },
          { label: 'Retained earnings',                 values: e['retainedEarnings'],           indent: true },
          { label: 'Other equity components',           values: e['otherEquity'],                indent: true },
          { label: 'Profit for the year',               values: (d.statementOfProfitOrLoss as Record<string, FSPair> | undefined)?.['profitForYear'], indent: true, signed: true },
          { label: 'Total equity',                      values: e['totalEquity'],                bold: true },
          { section: true, label: 'NON-CURRENT LIABILITIES' },
          { label: 'Borrowings (LT)',                   values: e['borrowingsLongTerm'],         indent: true },
          { label: 'Deferred tax liabilities',          values: e['deferredTaxLiabilities'],     indent: true },
          { label: 'Total non-current liabilities',     values: e['totalNonCurrentLiabilities'], bold: true },
          { section: true, label: 'CURRENT LIABILITIES' },
          { label: 'Trade and other payables',          values: e['tradeAndOtherPayables'],      indent: true },
          { label: 'Other current liabilities',         values: e['otherCurrentLiabilities'],    indent: true },
          { label: 'Total current liabilities',         values: e['totalCurrentLiabilities'],    bold: true },
          { label: 'TOTAL EQUITY AND LIABILITIES',      values: e['totalEquityAndLiabilities'],  grandTotal: true },
        ]} />
      </div>
    </div>
  )
}

function IfrsPL({ d }: { d: FinancialStatements }) {
  const pl = d.statementOfProfitOrLoss as Record<string, FSPair> | undefined
  if (!pl) return null
  return (
    <FinancialTable showVariation title="Statement of Profit or Loss (IAS 1)"
      year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { label: 'Revenue',                               values: pl['revenue'] },
      { label: 'Other income',                          values: pl['otherIncome'], indent: true },
      { label: 'Cost of sales',                         values: pl['costOfSales'],               indent: true },
      { label: 'Distribution & selling expenses',       values: pl['distributionSellingExpenses'], indent: true },
      { label: 'Administrative expenses',               values: pl['administrativeExpenses'],     indent: true },
      { label: 'Finance charges',                       values: pl['financeCharges'],             indent: true },
      { label: 'Depreciation & amortisation',           values: pl['depreciationAmortisation'],   indent: true },
      { label: 'Income tax expense',                    values: pl['incomeTaxExpense'],           indent: true },
      { label: 'Total expenses',                        values: pl['totalExpenses'],              bold: true },
      { label: 'PROFIT FOR THE YEAR',                   values: pl['profitForYear'],              grandTotal: true, signed: true },
    ]} />
  )
}

function IfrsCF({ d }: { d: FinancialStatements }) {
  const cf = d.statementOfCashFlows as Record<string, FSPair> | undefined
  if (!cf) return null
  return (
    <FinancialTable title="Statement of Cash Flows (indirect method — IAS 7)"
      year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { section: true, label: 'OPERATING ACTIVITIES' },
      { label: 'Cash from operating activities',        values: cf['operatingActivities'],       indent: true, signed: true },
      { section: true, label: 'INVESTING ACTIVITIES' },
      { label: 'Cash from investing activities',        values: cf['investingActivities'],       indent: true, signed: true },
      { section: true, label: 'FINANCING ACTIVITIES' },
      { label: 'Cash from financing activities',        values: cf['financingActivities'],       indent: true, signed: true },
      { label: 'Net increase / (decrease) in cash',     values: cf['netIncreaseInCash'],         bold: true, signed: true },
      { label: 'Opening cash and equivalents',          values: cf['openingCash'] },
      { label: 'CLOSING CASH AND EQUIVALENTS',          values: cf['closingCash'],               grandTotal: true },
    ]} />
  )
}

function IfrsEquity({ d }: { d: FinancialStatements }) {
  const ce = d.statementOfChangesInEquity as Record<string, FSPair> | undefined
  if (!ce) return null
  return (
    <FinancialTable title="Statement of Changes in Equity (IAS 1)"
      year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { label: 'Opening equity',                        values: ce['openingEquity'] },
      { label: 'Profit for the year',                   values: ce['profitForYear'], indent: true, signed: true },
      { label: 'Dividends paid',                        values: ce['dividendsPaid'], indent: true },
      { label: 'Other changes',                         values: ce['otherChanges'],  indent: true },
      { label: 'CLOSING EQUITY',                        values: ce['closingEquity'], grandTotal: true },
    ]} />
  )
}

function IfrsNotes() {
  return (
    <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 text-sm font-semibold text-white" style={{ background: PRIMARY }}>Notes to the Financial Statements (IAS 1 / IFRS)</div>
      <div className="p-5">
        <ul className="space-y-2">
          {['Note 1 — Basis of preparation and accounting policies','Note 2 — Significant judgements and estimates','Note 3 — Property, plant and equipment','Note 4 — Intangible assets','Note 5 — Financial instruments and risk management','Note 6 — Employee benefits','Note 7 — Income taxes (IAS 12)','Note 8 — Related party transactions (IAS 24)','Note 9 — Contingent liabilities and commitments','Note 10 — Events after the reporting period (IAS 10)'].map(s => (
            <li key={s} className="flex items-start gap-2.5 text-sm text-slate-700">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRIMARY }} />{s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Zone tab definitions ──────────────────────────────────────────────────────

type TabKey = string
interface ZoneTab {
  key:    TabKey
  label:  string
  render: (d: FinancialStatements, fmtCur: (n: number) => string) => React.ReactNode
}

function zoneTabs(zone: AccountingZone, fyData: FiscalYear | null): ZoneTab[] {
  if (zone === 'OHADA') return [
    { key: 'bilan',     label: 'Bilan SYSCOHADA',    render: (d, f) => <><OhadaKpi d={d} fmtCur={f} /><OhadaBilan d={d} /></> },
    { key: 'cr',        label: 'Compte de résultat', render: (d)    => <OhadaCR d={d} /> },
    { key: 'tafire',    label: 'TAFIRE',             render: (d)    => <OhadaTafire d={d} /> },
    { key: 'notes',     label: 'Notes annexes',      render: (d)    => fyData ? <OhadaNotesEditor d={d} fyId={fyData.id} /> : null },
    { key: 'cp',        label: 'Variation CP',       render: (d)    => <OhadaCP d={d} /> },
    { key: 'situation', label: 'Situation',          render: (d)    => fyData ? <OhadaSituation d={d} fyData={fyData} /> : null },
  ]
  if (zone === 'IFRS') return [
    { key: 'sofp',   label: 'Financial Position',  render: (d) => <IfrsSOFP d={d} /> },
    { key: 'pl',     label: 'Profit or Loss',      render: (d) => <IfrsPL d={d} /> },
    { key: 'cf',     label: 'Cash Flows',          render: (d) => <IfrsCF d={d} /> },
    { key: 'equity', label: 'Changes in Equity',   render: (d) => <IfrsEquity d={d} /> },
    { key: 'notes',  label: 'Notes',               render: ()  => <IfrsNotes /> },
  ]
  return [
    { key: 'bilan',  label: 'Bilan (2050)',         render: (d, f) => <><FranceKpi d={d} fmtCur={f} /><FranceBilan d={d} /></> },
    { key: 'cr',     label: 'Résultat (2052/53)',   render: (d)    => <FranceCR d={d} /> },
    { key: 'annexe', label: 'Annexe',               render: ()     => <FranceAnnexe /> },
    { key: 'rapport',label: 'Rapport de gestion',   render: (d)    => <FranceRapport d={d} /> },
    { key: 'affec',  label: 'Affectation résultat', render: (d)    => <FranceAffectation d={d} /> },
  ]
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const [cls, lbl] =
    status === 'OPEN'   ? ['bg-emerald-100 text-emerald-800', 'En cours'] :
    status === 'CLOSED' ? ['bg-slate-100  text-slate-600',   'Clôturé']  :
    status === 'LOCKED' ? ['bg-amber-100  text-amber-800',   'Verrouillé'] :
                          ['bg-blue-100   text-blue-800',    'Brouillon']
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{lbl}</span>
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }} />
    </div>
  )
}

// ── Clôture modal ─────────────────────────────────────────────────────────────

function ClotureModal({ fy, nextFY, onClose, onDone }: {
  fy: FiscalYear; nextFY: FiscalYear | undefined; onClose: () => void; onDone: () => void
}) {
  const qc      = useQueryClient()
  const closeFY = useCloseFiscalYear()
  const [step,   setStep]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errMsg, setErrMsg] = useState('')

  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ['balance-journal', fy.id],
    queryFn:  () => accountingApi.getBalanceByFiscalYear(fy.id),
    staleTime: 30_000,
  })

  const bilanRows = balance?.rows.filter(r => {
    const cls = r.account.charAt(0)
    return ['1','2','3','4','5'].includes(cls) && (r.soldeDebiteur > 0.005 || r.soldeCrediteur > 0.005)
  }) ?? []

  const handleCloture = useCallback(async () => {
    if (!balance) return
    setStep('loading'); setErrMsg('')
    try {
      if (nextFY && bilanRows.length > 0) {
        await accountingApi.createJournalEntryBatch({
          fiscalYearId: nextFY.id,
          date: nextFY.startDate.slice(0, 10),
          journal: 'AN',
          reference: `AN-${fy.year}`,
          lines: bilanRows.map(r => ({
            compte: r.account,
            libelle: `À NOUVEAUX — ${r.label}`,
            debit: r.soldeDebiteur  > 0.005 ? r.soldeDebiteur  : 0,
            credit: r.soldeCrediteur > 0.005 ? r.soldeCrediteur : 0,
          })),
        })
      }
      await closeFY.mutateAsync(fy.id)
      qc.invalidateQueries({ queryKey: ['fiscal-years'] })
      qc.invalidateQueries({ queryKey: ['journal'] })
      qc.invalidateQueries({ queryKey: ['balance-journal'] })
      qc.invalidateQueries({ queryKey: ['financial-statements'] })
      setStep('done')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : 'Erreur lors de la clôture')
      setStep('error')
    }
  }, [balance, nextFY, bilanRows, fy, closeFY, qc])

  const canClose = !balanceLoading && !!balance && balance.equilibre && !!nextFY && step !== 'loading'

  if (step === 'done') return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-6 space-y-4">
        <div className="flex items-center gap-3"><span className="text-3xl">✅</span>
          <div>
            <h3 className="text-base font-semibold text-emerald-800">Exercice {fy.year} clôturé</h3>
            {nextFY && <p className="text-sm text-slate-500 mt-0.5">{bilanRows.length} écriture(s) À Nouveaux passée(s) dans le journal AN de l'exercice {nextFY.year}.</p>}
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={onDone} className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: PRIMARY }}>Fermer</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Clôturer l'exercice {fy.year}</h3>
            <p className="text-sm text-slate-500 mt-0.5">Cette opération est <strong>irréversible</strong>. L'exercice passera en statut « Clôturé ».</p>
          </div>
        </div>
        {balanceLoading
          ? <div className="h-16 rounded-lg bg-slate-100 animate-pulse" />
          : balance && (
            <div className="rounded-lg border border-slate-200 p-3 space-y-1 text-sm">
              <p className="font-medium text-slate-700">Balance au {fy.endDate.slice(0, 10)} :</p>
              <p className="text-slate-600">{bilanRows.length} compte(s) de bilan à reporter (classes 1–5 avec solde non nul)</p>
              <p className={`font-semibold ${balance.equilibre ? 'text-emerald-700' : 'text-red-600'}`}>
                {balance.equilibre ? '✓ Balance équilibrée — prêt pour la clôture' : '⚠ Balance déséquilibrée — résoudre avant de clôturer'}
              </p>
            </div>
          )}
        {nextFY
          ? <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              📋 Les <strong>{bilanRows.length} écriture(s) À Nouveaux</strong> seront passées dans le journal <code className="font-mono bg-blue-100 px-1 rounded">AN</code> de l'exercice <strong>{nextFY.year}</strong> à la date du <strong>{nextFY.startDate.slice(0, 10)}</strong>.
            </div>
          : <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ Aucun exercice {fy.year + 1} trouvé. Créez l'exercice {fy.year + 1} avant de clôturer.
            </div>}
        {step === 'error' && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{errMsg}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} disabled={step === 'loading'}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            Annuler
          </button>
          <button onClick={handleCloture} disabled={!canClose}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
            {step === 'loading' ? 'Clôture en cours…' : `Clôturer l'exercice ${fy.year}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EtatsFinanciersPage() {
  const [activeTab,   setActiveTab]   = useState<TabKey>('bilan')
  const [showCloture, setShowCloture] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const { fmt: fmtCur } = useCurrency()

  const { isLoading: companyLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  () => settingsApi.getCompany(),
    staleTime: 5 * 60_000,
  })

  const { data: allFY, isLoading: yearsLoading } = useFiscalYears()
  const fyData = useSelectedFiscalYearData()
  const nextFY = allFY?.find(f => f.year === (fyData?.year ?? 0) + 1)

  const { data: fsData, isLoading: fsLoading, isError } = useQuery({
    queryKey: ['financial-statements', fyData?.id],
    queryFn:  () => fyData ? accountingApi.getFinancialStatements(fyData.id) : Promise.reject(new Error('no fy')),
    enabled:  !!fyData?.id,
    staleTime: 2 * 60_000,
  })

  const zone: AccountingZone = fsData?.zone ?? 'FRANCE'
  const tabs    = zoneTabs(zone, fyData ?? null)
  const current = tabs.find(t => t.key === activeTab) ?? tabs[0]!

  const handleDownloadPdf = useCallback(async () => {
    if (!fsData) return
    setDownloading(true)
    try {
      const [{ pdf }, { saveAs }, { EtatsFinanciersPdf: PDFComp }, { default: React }] =
        await Promise.all([import('@react-pdf/renderer'), import('file-saver'), import('@/features/accounting/pdf/EtatsFinanciersPdf'), import('react')])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const el   = React.createElement(PDFComp, { fs: fsData, tab: activeTab }) as any
      const blob = await pdf(el).toBlob()
      const lbl  = (tabs.find(t => t.key === activeTab)?.label ?? activeTab).toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
      saveAs(blob, `${lbl}-${fsData.year}.pdf`)
    } catch (e) { console.error('PDF export error:', e) }
    finally { setDownloading(false) }
  }, [fsData, activeTab, tabs])

  const pageTitle =
    zone === 'OHADA' ? 'États financiers SYSCOHADA révisé' :
    zone === 'IFRS'  ? 'Financial Statements (IFRS / IAS 1)' :
    'États financiers — Plan Comptable Général (PCG)'

  function Content() {
    if (companyLoading || yearsLoading) return <Spinner />
    if (!fyData) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <span className="text-5xl">📅</span>
        <p className="text-sm font-medium text-slate-600">Sélectionnez un exercice comptable</p>
        <p className="text-xs">Utilisez le sélecteur d'exercice en haut de page.</p>
      </div>
    )
    if (fsLoading) return <Spinner />
    if (isError || !fsData) return (
      <div className="flex items-center justify-center py-20 text-red-500 text-sm">
        Impossible de charger les états financiers. Vérifiez la connexion au serveur.
      </div>
    )
    if (fsData.entryCount === 0) return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <span className="text-5xl">📊</span>
        <p className="text-sm font-medium text-slate-600">Aucune écriture pour {fsData.year}</p>
        <p className="text-xs">
          Saisissez des écritures dans le{' '}
          <Link to="/app/accounting/journal" className="underline underline-offset-2 hover:opacity-80" style={{ color: PRIMARY }}>journal comptable</Link>
          {' '}pour générer les états financiers.
        </p>
      </div>
    )
    return <>{current.render(fsData, fmtCur)}</>
  }

  return (
    <div className="space-y-5">

      {showCloture && fyData && fyData.status === 'OPEN' && (
        <ClotureModal fy={fyData} nextFY={nextFY} onClose={() => setShowCloture(false)} onDone={() => setShowCloture(false)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{pageTitle}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {fsData
              ? <>Exercice {fsData.year} · comparatif N / N-1 ({fsData.prevYear}) <StatusBadge status={fsData.status} /></>
              : fyData
              ? <>Exercice {fyData.year} <StatusBadge status={fyData.status} /></>
              : 'Aucun exercice sélectionné'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FiscalYearSelector />
          {fyData?.status === 'OPEN' && (
            <button onClick={() => setShowCloture(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">
              🔒 Clôturer l'exercice
            </button>
          )}
          {fsData && (
            <button onClick={handleDownloadPdf} disabled={downloading}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              style={{ background: PRIMARY }}>
              ⬇ {downloading ? 'Export…' : 'Télécharger PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1 print:hidden">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-all whitespace-nowrap"
            style={activeTab === tab.key
              ? { background: PRIMARY, color: 'white' }
              : { color: '#64748b' }}
            onMouseEnter={e => { if (activeTab !== tab.key) (e.target as HTMLElement).style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (activeTab !== tab.key) (e.target as HTMLElement).style.background = '' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        <Content />
      </div>

    </div>
  )
}
