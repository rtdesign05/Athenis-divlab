import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSelectedFiscalYearData, useFiscalYears } from '@/hooks/useFiscalYear'
import { accountingApi, type FSPair, type FinancialStatements, type AccountingZone } from '@/services/accountingApi'
import { settingsApi } from '@/services/settingsApi'
import { PdfButton } from '@/shared/components/ui/PdfButton'
import { usePdf } from '@/shared/hooks/usePdf'

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n === 0) return '\u2013'
  const abs = Math.abs(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return n < 0 ? `(${abs})` : abs
}

function neg(n: number): string {
  return n < 0 ? 'text-red-600' : ''
}

// ── table primitives ──────────────────────────────────────────────────────────

interface RowDef {
  label:    string
  values?:  FSPair | undefined
  bold?:    boolean
  indent?:  boolean
  section?: boolean
}

function variation(n: number, nm1: number): string | null {
  if (nm1 === 0) return null
  const pct = ((n - nm1) / Math.abs(nm1)) * 100
  const arrow = pct >= 0 ? '\u2191' : '\u2193'
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}\u202f% ${arrow}`
}

function THead({ year, prevYear, hasPrevYear, showVariation = false }: {
  year: number; prevYear: number; hasPrevYear: boolean; showVariation?: boolean
}) {
  const nm1Label = hasPrevYear ? `N-1\xa0(${prevYear})` : 'N-1\xa0(non\xa0disponible)'
  return (
    <thead>
      <tr className="border-b-2 border-slate-300 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <th className="px-4 py-2 text-left w-1/2">Libellé</th>
        <th className="px-4 py-2 text-right">N\xa0({year})</th>
        <th className={`px-4 py-2 text-right ${!hasPrevYear ? 'italic text-slate-400' : ''}`}>{nm1Label}</th>
        {showVariation && <th className="px-4 py-2 text-right">Variation</th>}
      </tr>
    </thead>
  )
}

function StmtTable({ title, year, prevYear, hasPrevYear, rows, showVariation = false }: {
  title: string; year: number; prevYear: number; hasPrevYear: boolean; rows: RowDef[]; showVariation?: boolean
}) {
  const cols = showVariation ? 4 : 3
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-600">{title}</h3>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <THead year={year} prevYear={prevYear} hasPrevYear={hasPrevYear} showVariation={showVariation} />
          <tbody>
            {rows.map((row, i) =>
              row.section ? (
                <tr key={i} className="bg-slate-100 border-t border-slate-200">
                  <td colSpan={cols} className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {row.label}
                  </td>
                </tr>
              ) : (
                <tr key={i} className={`border-t border-slate-100 ${row.bold ? 'bg-slate-50 font-semibold' : 'hover:bg-slate-50'}`}>
                  <td className={`px-4 py-2 ${row.indent ? 'pl-8' : ''} ${row.bold ? 'text-slate-800' : 'text-slate-700'}`}>
                    {row.label}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${row.values ? neg(row.values.n) : ''}`}>
                    {row.values !== undefined ? fmt(row.values.n) : ''}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums text-slate-400 ${row.values ? neg(row.values.nm1) : ''}`}>
                    {row.values !== undefined ? (hasPrevYear ? fmt(row.values.nm1) : '\u2014') : ''}
                  </td>
                  {showVariation && (
                    <td className="px-4 py-2 text-right tabular-nums text-slate-400 text-xs">
                      {row.values && hasPrevYear ? (variation(row.values.n, row.values.nm1) ?? '') : ''}
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── France PCG ────────────────────────────────────────────────────────────────

function BalanceIndicator({ actifTotal, passifTotal }: { actifTotal: FSPair | undefined; passifTotal: FSPair | undefined }) {
  const a = actifTotal?.n ?? 0
  const p = passifTotal?.n ?? 0
  const diff = Math.abs(a - p)
  const balanced = diff < 0.01
  return (
    <div className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${balanced ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
      <span>{balanced ? '\u2705' : '\u26a0\ufe0f'}</span>
      {balanced
        ? <>Bilan équilibré\xa0\u2014 Actif\xa0=\xa0Passif\xa0=\xa0{fmt(a)}\xa0\u20ac</>
        : <>Déséquilibre\xa0: Actif\xa0{fmt(a)}\xa0\u20ac\xa0\u2260\xa0Passif\xa0{fmt(p)}\xa0\u20ac</>}
    </div>
  )
}

function FranceBilan({ d }: { d: FinancialStatements }) {
  const actif  = d.bilan?.actif  as Record<string, FSPair> | undefined
  const passif = d.bilan?.passif as Record<string, FSPair> | undefined
  if (!actif || !passif) return null
  const y = d.year, p = d.prevYear, hp = d.hasPrevYear
  return (
    <div className="space-y-4">
      <BalanceIndicator actifTotal={actif['totalActif']} passifTotal={passif['totalPassif']} />
      <div className="grid gap-6 lg:grid-cols-2">
        <StmtTable title="Actif" year={y} prevYear={p} hasPrevYear={hp} rows={[
          { label: 'ACTIF IMMOBILISÉ', section: true },
          { label: 'Immobilisations incorporelles',      values: actif['immobilisationsIncorporelles'], indent: true },
          { label: 'Immobilisations corporelles',        values: actif['immobilisationsCorporelles'],   indent: true },
          { label: 'Immobilisations financières',     values: actif['immobilisationsFinancieres'],   indent: true },
          { label: 'Total actif immobilisé',          values: actif['totalActifImmobilise'],          bold: true },
          { label: 'ACTIF CIRCULANT', section: true },
          { label: 'Stocks et en-cours',                 values: actif['stocks'],                        indent: true },
          { label: 'Créances clients',                values: actif['creancesClients'],               indent: true },
          { label: 'Autres créances',                 values: actif['autresCreances'],                indent: true },
          { label: 'Trésorerie et équivalents',    values: actif['tresorerie'],                    indent: true },
          { label: 'Total actif circulant',              values: actif['totalActifCirculant'],           bold: true },
          { label: 'TOTAL ACTIF',                        values: actif['totalActif'],                    bold: true },
        ]} />
        <StmtTable title="Passif" year={y} prevYear={p} hasPrevYear={hp} rows={[
          { label: 'CAPITAUX PROPRES', section: true },
          { label: 'Capital',                            values: passif['capital'],                      indent: true },
          { label: 'Réserves',                        values: passif['reserves'],                     indent: true },
          { label: 'Report à nouveau',                values: passif['reportANouveau'],               indent: true },
          { label: "Résultat de l'exercice",          values: passif['resultatExercice'],             indent: true },
          { label: 'Total capitaux propres',             values: passif['totalCapitauxPropres'],         bold: true },
          { label: 'Provisions pour risques',            values: passif['provisions'],                   indent: true },
          { label: 'DETTES', section: true },
          { label: 'Emprunts et dettes financières',  values: passif['emprunts'],                     indent: true },
          { label: 'Dettes fournisseurs',                values: passif['dettesFournisseurs'],           indent: true },
          { label: 'Dettes fiscales et sociales',        values: passif['dettesFiscalesSociales'],       indent: true },
          { label: 'Autres dettes',                      values: passif['autresDettes'],                 indent: true },
          { label: 'Total dettes',                       values: passif['totalDettes'],                  bold: true },
          { label: 'TOTAL PASSIF',                       values: passif['totalPassif'],                  bold: true },
        ]} />
      </div>
    </div>
  )
}

function FranceCR({ d }: { d: FinancialStatements }) {
  const prod = d.compteDeResultat?.produits as Record<string, FSPair> | undefined
  const chg  = d.compteDeResultat?.charges  as Record<string, FSPair> | undefined
  const res  = d.compteDeResultat?.resultatNet as FSPair | undefined
  if (!prod || !chg) return null
  return (
    <StmtTable title="Compte de résultat" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} showVariation rows={[
      { label: "PRODUITS D'EXPLOITATION", section: true },
      { label: 'Ventes et productions',              values: prod['ventesEtProductions'],        indent: true },
      { label: "Autres produits d'exploitation",     values: prod['autresProduits'],             indent: true },
      { label: 'Produits financiers',                values: prod['produitsFinanciers'],         indent: true },
      { label: 'Produits exceptionnels',             values: prod['produitsExceptionnels'],      indent: true },
      { label: 'Reprises sur provisions',            values: prod['reprisesSurProvisions'],      indent: true },
      { label: 'Total produits',                     values: prod['totalProduits'],              bold: true },
      { label: "CHARGES D'EXPLOITATION", section: true },
      { label: 'Achats de marchandises',             values: chg['achatsMarchandises'],          indent: true },
      { label: 'Autres achats et charges ext.',      values: chg['autresAchats'],                indent: true },
      { label: 'Impôts et taxes',                 values: chg['impotsTaxes'],                 indent: true },
      { label: 'Charges de personnel',               values: chg['chargesPersonnel'],            indent: true },
      { label: 'Dotations aux amortissements',       values: chg['dotationsAmortissements'],     indent: true },
      { label: 'Autres charges',                     values: chg['autresCharges'],               indent: true },
      { label: 'Charges financières',             values: chg['chargesFinancieres'],          indent: true },
      { label: 'Charges exceptionnelles',            values: chg['chargesExceptionnelles'],      indent: true },
      { label: "Impôt sur les bénéfices",  values: chg['impotBenefices'],              indent: true },
      { label: 'Total charges',                      values: chg['totalCharges'],                bold: true },
      { label: 'RÉSULTAT NET', section: true },
      { label: "Résultat net de l'exercice",      values: res,                               bold: true },
    ]} />
  )
}

function FranceAnnexe() {
  return (
    <div className="rounded-lg border border-slate-200 p-6 space-y-4">
      <p className="text-sm text-slate-600">
        {"L'annexe complète les informations du bilan et du compte de résultat\xa0:"}
      </p>
      <ul className="space-y-2 text-sm text-slate-700">
        {[
          "Méthodes comptables et principes retenus",
          'Tableau des immobilisations et amortissements',
          'État des provisions',
          "Tableau des créances et des dettes",
          'Tableau des filiales et participations',
          'Engagements hors bilan',
          "Approbation des comptes et affectation du résultat",
        ].map((s) => (
          <li key={s} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs italic text-slate-400">
        {"Générée automatiquement à la clôture de l'exercice."}
      </p>
    </div>
  )
}

function FranceRapport({ d }: { d: FinancialStatements }) {
  const ca  = d.compteDeResultat?.produits?.['ventesEtProductions'] as FSPair | undefined
  const res = d.compteDeResultat?.resultatNet as FSPair | undefined
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 p-6">
        <h4 className="mb-3 font-semibold text-slate-800">{"Analyse de l'activité"}</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs text-slate-500 mb-1">{"Chiffre d'affaires\xa0N"}</p>
            <p className="text-lg font-semibold text-slate-800">{ca ? fmt(ca.n) : '\u2013'}\xa0\u20ac</p>
            {ca && ca.nm1 > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                N-1\xa0: {fmt(ca.nm1)}\xa0\u20ac
                {' '}{ca.n > ca.nm1 ? '\u2191' : '\u2193'}\xa0
                {Math.abs(((ca.n - ca.nm1) / ca.nm1) * 100).toFixed(1)}%
              </p>
            )}
          </div>
          <div className="rounded-md bg-slate-50 p-4">
            <p className="text-xs text-slate-500 mb-1">Résultat net\xa0N</p>
            <p className={`text-lg font-semibold ${res && res.n < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {res ? fmt(res.n) : '\u2013'}\xa0\u20ac
            </p>
            {res && res.nm1 !== 0 && (
              <p className="text-xs text-slate-500 mt-1">N-1\xa0: {fmt(res.nm1)}\xa0\u20ac</p>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 p-6">
        <h4 className="mb-3 font-semibold text-slate-800">Informations requises</h4>
        <ul className="space-y-2 text-sm text-slate-700">
          {[
            "Situation et activité de la société durant l'exercice",
            "Résultats, évolution prévisible et perspectives",
            "Événements importants postérieurs à la clôture",
            "Activités en matière de recherche et développement",
            "Risques financiers\xa0: taux d'intérêt, change, liquidité",
            'Tableau des résultats des cinq derniers exercices',
          ].map((s) => (
            <li key={s} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              {s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function FranceAffectation({ d }: { d: FinancialStatements }) {
  const res = d.compteDeResultat?.resultatNet as FSPair | undefined
  const net = res?.n ?? 0
  return (
    <StmtTable title="Affectation du résultat" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { label: 'ORIGINE', section: true },
      { label: "Résultat net de l'exercice",    values: { n: net, nm1: res?.nm1 ?? 0 } },
      { label: 'Report à nouveau antérieur',  values: { n: 0, nm1: 0 } },
      { label: 'Total à affecter',              values: { n: net, nm1: res?.nm1 ?? 0 }, bold: true },
      { label: 'AFFECTATION', section: true },
      { label: 'Réserve légale (5\xa0%)',    values: { n: net > 0 ? net * 0.05 : 0, nm1: 0 } },
      { label: 'Réserves statutaires',          values: { n: 0, nm1: 0 } },
      { label: 'Dividendes distribués',          values: { n: 0, nm1: 0 } },
      { label: 'Report à nouveau',              values: { n: net > 0 ? net * 0.95 : 0, nm1: 0 } },
    ]} />
  )
}

// ── OHADA SYSCOHADA ───────────────────────────────────────────────────────────

function OhadaBilan({ d }: { d: FinancialStatements }) {
  const a = d.bilan?.actif  as Record<string, FSPair> | undefined
  const p = d.bilan?.passif as Record<string, FSPair> | undefined
  if (!a || !p) return null
  return (
    <div className="space-y-4">
      <BalanceIndicator actifTotal={a['totalActif']} passifTotal={p['totalPassif']} />
      {/* OHADA : Actif pleine largeur, puis Passif pleine largeur */}
      <StmtTable title="Bilan — Actif" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
        { label: 'ACTIF IMMOBILISÉ', section: true },
        { label: 'Charges immobilisées',              values: a['chargesImmobilisees'],          indent: true },
        { label: 'Immobilisations incorporelles',      values: a['immobilisationsIncorporelles'], indent: true },
        { label: 'Terrains',                           values: a['terrains'],                     indent: true },
        { label: 'Bâtiments & agencements',            values: a['batimentsAgencements'],         indent: true },
        { label: 'Matériel & équipement',              values: a['materielEquipement'],           indent: true },
        { label: 'Matériel de transport',              values: a['materielTransport'],            indent: true },
        { label: 'Autres immobilisations',             values: a['autresImmobilisations'],        indent: true },
        { label: 'Avances & acomptes',                 values: a['avancesAcomptesImmo'],          indent: true },
        { label: 'Total actif immobilisé',             values: a['totalActifImmobilise'],         bold: true },
        { label: 'ACTIF CIRCULANT', section: true },
        { label: 'Stocks',                             values: a['stocks'],                       indent: true },
        { label: 'Créances clients',                   values: a['creancesClients'],              indent: true },
        { label: 'Autres créances',                    values: a['autresCreances'],               indent: true },
        { label: 'Trésorerie active',                  values: a['tresorerie'],                   indent: true },
        { label: 'Total actif circulant',              values: a['totalActifCirculant'],          bold: true },
        { label: 'TOTAL ACTIF',                        values: a['totalActif'],                   bold: true },
      ]} />
      <StmtTable title="Bilan — Passif" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
        { label: 'CAPITAUX PROPRES ET RESSOURCES ASSIMILÉES', section: true },
        { label: 'Capital social',                     values: p['capitalSocial'],                indent: true },
        { label: 'Réserves',                           values: p['reserves'],                     indent: true },
        { label: 'Report à nouveau',                   values: p['reportANouveau'],               indent: true },
        { label: 'Résultat net',                       values: p['resultatNet'],                  indent: true },
        { label: "Subventions d'investissement",       values: p['subventionsInvestissement'],    indent: true },
        { label: 'Total capitaux propres',             values: p['totalCapitauxPropres'],         bold: true },
        { label: 'DETTES FINANCIÈRES', section: true },
        { label: 'Dettes financières à LT',            values: p['dettesLongTerme'],              indent: true },
        { label: 'Dettes à court terme',               values: p['dettesCurtTerme'],              indent: true },
        { label: 'TOTAL PASSIF',                       values: p['totalPassif'],                  bold: true },
      ]} />
    </div>
  )
}

function OhadaCR({ d }: { d: FinancialStatements }) {
  const prod = d.compteDeResultat?.produits as Record<string, FSPair> | undefined
  const chg  = d.compteDeResultat?.charges  as Record<string, FSPair> | undefined
  const res  = d.compteDeResultat?.resultat as FSPair | undefined
  if (!prod || !chg) return null
  return (
    <StmtTable title="Compte de résultat (fonctionnel)" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} showVariation rows={[
      { label: 'PRODUITS', section: true },
      { label: "Chiffre d'affaires",                 values: prod['chiffreAffaires'],            indent: true },
      { label: 'Autres produits',                    values: prod['autresProduits'],             indent: true },
      { label: 'Produits financiers',                values: prod['produitsFinanciers'],         indent: true },
      { label: 'Total produits',                     values: prod['totalProduits'],              bold: true },
      { label: 'CHARGES', section: true },
      { label: 'Achats consommés',                values: chg['achatsConsommes'],             indent: true },
      { label: 'Charges de personnel',               values: chg['chargesPersonnel'],            indent: true },
      { label: 'Transports',                         values: chg['transports'],                  indent: true },
      { label: 'Autres charges',                     values: chg['autresCharges'],               indent: true },
      { label: 'Dotations aux amortissements',       values: chg['dotations'],                   indent: true },
      { label: 'Charges financières',             values: chg['chargesFinancieres'],          indent: true },
      { label: 'Impôt sur le résultat',       values: chg['impotSurResultat'],            indent: true },
      { label: 'Total charges',                      values: chg['totalCharges'],                bold: true },
      { label: 'RÉSULTAT NET', section: true },
      { label: 'Résultat net',                    values: res,                               bold: true },
    ]} />
  )
}

function OhadaTafire({ d }: { d: FinancialStatements }) {
  const tf = d.tafire as Record<string, FSPair> | undefined
  if (!tf) return null
  return (
    <StmtTable title="TAFIRE \u2014 Tableau de Financement par les Ressources" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { label: "FLUX D'EXPLOITATION", section: true },
      { label: 'CAF brute',                          values: tf['cafBrute'],                     indent: true },
      { label: 'Variation des stocks',               values: tf['variationStocks'],              indent: true },
      { label: "Flux d'exploitation",                values: tf['fluxExploitation'],             bold: true },
      { label: "FLUX D'INVESTISSEMENT", section: true },
      { label: "Acquisitions d'immobilisations",     values: tf['investissements'],              indent: true },
      { label: 'FLUX DE FINANCEMENT', section: true },
      { label: 'Variation des dettes financières',values: tf['financements'],                 indent: true },
      { label: 'VARIATION DE TRÉSORERIE', section: true },
      { label: 'Variation nette de trésorerie',   values: tf['variationTresorerie'],          bold: true },
    ]} />
  )
}

function OhadaNotes() {
  return (
    <div className="rounded-lg border border-slate-200 p-6 space-y-4">
      <p className="text-sm text-slate-600">Notes annexes SYSCOHADA\xa0:</p>
      <ul className="space-y-2 text-sm text-slate-700">
        {[
          'Note 1 \u2014 Règles et méthodes comptables',
          'Note 2 \u2014 Tableau des immobilisations',
          'Note 3 \u2014 Tableau des amortissements',
          'Note 4 \u2014 Tableau des provisions',
          'Note 5 \u2014 Tableau des créances',
          'Note 6 \u2014 Tableau des dettes',
          'Note 7 \u2014 Charges à payer / produits à recevoir',
          'Note 8 \u2014 Effectifs et charges de personnel',
          'Note 9 \u2014 Engagements hors bilan',
        ].map((s) => (
          <li key={s} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{s}
          </li>
        ))}
      </ul>
    </div>
  )
}

function OhadaCP({ d }: { d: FinancialStatements }) {
  const p   = d.bilan?.passif as Record<string, FSPair> | undefined
  const res = d.compteDeResultat?.resultat as FSPair | undefined
  if (!p) return null
  return (
    <StmtTable title="État de variation des capitaux propres" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { label: "Capitaux propres à l'ouverture",  values: { n: p['totalCapitauxPropres']?.nm1 ?? 0, nm1: 0 } },
      { label: "Résultat net de l'exercice",      values: res ?? { n: 0, nm1: 0 }, indent: true },
      { label: 'Dividendes distribués',            values: { n: 0, nm1: 0 }, indent: true },
      { label: 'Autres variations',                  values: { n: 0, nm1: 0 }, indent: true },
      { label: 'Capitaux propres à la clôture',values: p['totalCapitauxPropres'], bold: true },
    ]} />
  )
}

// ── IFRS ──────────────────────────────────────────────────────────────────────

function IfrsSOFP({ d }: { d: FinancialStatements }) {
  const a = d.statementOfFinancialPosition?.assets              as Record<string, FSPair> | undefined
  const e = d.statementOfFinancialPosition?.equityAndLiabilities as Record<string, FSPair> | undefined
  if (!a || !e) return null
  return (
    <div className="space-y-4">
      <BalanceIndicator actifTotal={a['totalAssets']} passifTotal={e['totalEquityAndLiabilities']} />
      <div className="grid gap-6 lg:grid-cols-2">
        <StmtTable title="Assets" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
          { label: 'NON-CURRENT ASSETS', section: true },
          { label: 'Property, plant & equipment',     values: a['ppe'],                          indent: true },
          { label: 'Intangible assets',               values: a['intangibleAssets'],             indent: true },
          { label: 'Financial investments',           values: a['investments'],                  indent: true },
          { label: 'Deferred tax assets',             values: a['deferredTaxAssets'],            indent: true },
          { label: 'Total non-current assets',        values: a['totalNonCurrentAssets'],        bold: true },
          { label: 'CURRENT ASSETS', section: true },
          { label: 'Inventories',                     values: a['inventories'],                  indent: true },
          { label: 'Trade and other receivables',     values: a['tradeAndOtherReceivables'],     indent: true },
          { label: 'Other current assets',            values: a['otherCurrentAssets'],           indent: true },
          { label: 'Cash and cash equivalents',       values: a['cashAndEquivalents'],           indent: true },
          { label: 'Total current assets',            values: a['totalCurrentAssets'],           bold: true },
          { label: 'TOTAL ASSETS',                    values: a['totalAssets'],                  bold: true },
        ]} />
        <StmtTable title="Equity and Liabilities" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
          { label: 'EQUITY', section: true },
          { label: 'Share capital',                   values: e['shareCapital'],                 indent: true },
          { label: 'Retained earnings',               values: e['retainedEarnings'],             indent: true },
          { label: 'Other equity components',         values: e['otherEquity'],                  indent: true },
          { label: 'Total equity',                    values: e['totalEquity'],                  bold: true },
          { label: 'NON-CURRENT LIABILITIES', section: true },
          { label: 'Borrowings (LT)',                 values: e['borrowingsLongTerm'],           indent: true },
          { label: 'Deferred tax liabilities',        values: e['deferredTaxLiabilities'],       indent: true },
          { label: 'Total non-current liabilities',   values: e['totalNonCurrentLiabilities'],   bold: true },
          { label: 'CURRENT LIABILITIES', section: true },
          { label: 'Trade and other payables',        values: e['tradeAndOtherPayables'],        indent: true },
          { label: 'Other current liabilities',       values: e['otherCurrentLiabilities'],      indent: true },
          { label: 'Total current liabilities',       values: e['totalCurrentLiabilities'],      bold: true },
          { label: 'TOTAL EQUITY AND LIABILITIES',    values: e['totalEquityAndLiabilities'],    bold: true },
        ]} />
      </div>
    </div>
  )
}

function IfrsPL({ d }: { d: FinancialStatements }) {
  const pl = d.statementOfProfitOrLoss as Record<string, FSPair> | undefined
  if (!pl) return null
  return (
    <StmtTable title="Statement of Profit or Loss" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} showVariation rows={[
      { label: 'Revenue',                           values: pl['revenue'] },
      { label: 'Other income',                      values: pl['otherIncome'] },
      { label: 'Cost of sales',                     values: pl['costOfSales'],                  indent: true },
      { label: 'Distribution & selling expenses',   values: pl['distributionSellingExpenses'],  indent: true },
      { label: 'Administrative expenses',           values: pl['administrativeExpenses'],       indent: true },
      { label: 'Finance charges',                   values: pl['financeCharges'],               indent: true },
      { label: 'Depreciation & amortisation',       values: pl['depreciationAmortisation'],     indent: true },
      { label: 'Income tax expense',                values: pl['incomeTaxExpense'],             indent: true },
      { label: 'Total expenses',                    values: pl['totalExpenses'],                bold: true },
      { label: 'PROFIT FOR THE YEAR',               values: pl['profitForYear'],                bold: true },
    ]} />
  )
}

function IfrsCF({ d }: { d: FinancialStatements }) {
  const cf = d.statementOfCashFlows as Record<string, FSPair> | undefined
  if (!cf) return null
  return (
    <StmtTable title="Statement of Cash Flows (indirect method)" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { label: 'OPERATING ACTIVITIES', section: true },
      { label: 'Cash from operating activities',    values: cf['operatingActivities'],          indent: true },
      { label: 'INVESTING ACTIVITIES', section: true },
      { label: 'Cash from investing activities',    values: cf['investingActivities'],          indent: true },
      { label: 'FINANCING ACTIVITIES', section: true },
      { label: 'Cash from financing activities',    values: cf['financingActivities'],          indent: true },
      { label: 'Net increase in cash',              values: cf['netIncreaseInCash'],            bold: true },
      { label: 'Opening cash and equivalents',      values: cf['openingCash'] },
      { label: 'Closing cash and equivalents',      values: cf['closingCash'],                  bold: true },
    ]} />
  )
}

function IfrsEquity({ d }: { d: FinancialStatements }) {
  const ce = d.statementOfChangesInEquity as Record<string, FSPair> | undefined
  if (!ce) return null
  return (
    <StmtTable title="Statement of Changes in Equity" year={d.year} prevYear={d.prevYear} hasPrevYear={d.hasPrevYear} rows={[
      { label: 'Opening equity',                    values: ce['openingEquity'] },
      { label: 'Profit for the year',               values: ce['profitForYear'],                indent: true },
      { label: 'Dividends paid',                    values: ce['dividendsPaid'],                indent: true },
      { label: 'Other changes',                     values: ce['otherChanges'],                 indent: true },
      { label: 'Closing equity',                    values: ce['closingEquity'],                bold: true },
    ]} />
  )
}

function IfrsNotes() {
  return (
    <div className="rounded-lg border border-slate-200 p-6 space-y-4">
      <p className="text-sm text-slate-600">Notes to the Financial Statements (IAS 1 / IFRS):</p>
      <ul className="space-y-2 text-sm text-slate-700">
        {[
          'Note 1 \u2014 Basis of preparation and accounting policies',
          'Note 2 \u2014 Significant judgements and estimates',
          'Note 3 \u2014 Property, plant and equipment',
          'Note 4 \u2014 Intangible assets',
          'Note 5 \u2014 Financial instruments and risk management',
          'Note 6 \u2014 Employee benefits',
          'Note 7 \u2014 Income taxes (IAS 12)',
          'Note 8 \u2014 Related party transactions (IAS 24)',
          'Note 9 \u2014 Contingent liabilities and commitments',
          'Note 10 \u2014 Events after the reporting period (IAS 10)',
        ].map((s) => (
          <li key={s} className="flex items-start gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />{s}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Zone tab definitions ──────────────────────────────────────────────────────

type TabKey = string
interface ZoneTab {
  key:    TabKey
  label:  string
  render: (d: FinancialStatements) => React.ReactNode
}

function zoneTabs(zone: AccountingZone): ZoneTab[] {
  if (zone === 'OHADA') return [
    { key: 'bilan',  label: 'Bilan SYSCOHADA',        render: (d) => <OhadaBilan d={d} /> },
    { key: 'cr',     label: 'Compte de résultat',  render: (d) => <OhadaCR d={d} /> },
    { key: 'tafire', label: 'TAFIRE',                 render: (d) => <OhadaTafire d={d} /> },
    { key: 'notes',  label: 'Notes annexes',          render: () => <OhadaNotes /> },
    { key: 'cp',     label: 'Variation CP',           render: (d) => <OhadaCP d={d} /> },
  ]
  if (zone === 'IFRS') return [
    { key: 'sofp',   label: 'Financial Position',     render: (d) => <IfrsSOFP d={d} /> },
    { key: 'pl',     label: 'Profit or Loss',         render: (d) => <IfrsPL d={d} /> },
    { key: 'cf',     label: 'Cash Flows',             render: (d) => <IfrsCF d={d} /> },
    { key: 'equity', label: 'Changes in Equity',      render: (d) => <IfrsEquity d={d} /> },
    { key: 'notes',  label: 'Notes',                  render: () => <IfrsNotes /> },
  ]
  // France PCG (default)
  return [
    { key: 'bilan',  label: 'Bilan (2050)',           render: (d) => <FranceBilan d={d} /> },
    { key: 'cr',     label: 'Résultat (2052/53)',  render: (d) => <FranceCR d={d} /> },
    { key: 'annexe', label: 'Annexe',                 render: () => <FranceAnnexe /> },
    { key: 'rapport',label: 'Rapport de gestion',     render: (d) => <FranceRapport d={d} /> },
    { key: 'affec',  label: 'Affectation résultat',render: (d) => <FranceAffectation d={d} /> },
  ]
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const [cls, lbl] =
    status === 'OPEN'   ? ['bg-green-100 text-green-800', 'En cours']     :
    status === 'CLOSED' ? ['bg-gray-100  text-gray-600',  'Clôturé'] :
    status === 'LOCKED' ? ['bg-amber-100 text-amber-800', 'Verrouillé'] :
                          ['bg-blue-100  text-blue-800',  'Brouillon']
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{lbl}</span>
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function EtatsFinanciersPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('bilan')
  const { downloadEtatsFinanciers } = usePdf()

  // Preload company settings so the spinner fires while they're in flight.
  const { isLoading: companyLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  () => settingsApi.getCompany(),
    staleTime: 5 * 60_000,
  })

  // Fiscal year selection
  const { isLoading: yearsLoading } = useFiscalYears()
  const fyData = useSelectedFiscalYearData()

  // Financial statements data
  const { data: fsData, isLoading: fsLoading, isError } = useQuery({
    queryKey: ['financial-statements', fyData?.id],
    queryFn:  () =>
      fyData ? accountingApi.getFinancialStatements(fyData.id) : Promise.reject(new Error('no fy')),
    enabled:  !!fyData?.id,
    staleTime: 2 * 60_000,
  })

  // Derive zone from the financial statements data (authoritative source).
  // Falls back to FRANCE while loading — company settings have no accountingZone field.
  const zone: AccountingZone = fsData?.zone ?? 'FRANCE'
  const tabs = zoneTabs(zone)
  const current = tabs.find((t) => t.key === activeTab) ?? tabs[0]!

  const pageTitle =
    zone === 'OHADA' ? 'États financiers SYSCOHADA'  :
    zone === 'IFRS'  ? 'Financial Statements (IFRS)'    :
    'Plaquette financière — France PCG'

  // ── Content area ────────────────────────────────────────────────────────────
  function Content() {
    if (companyLoading || yearsLoading) return <Spinner />
    if (!fyData) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          {/* Calendar icon — no fiscal year selected */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium">Sélectionnez un exercice comptable</p>
          <p className="text-xs text-slate-400">Utilisez le sélecteur d'exercice en haut de page.</p>
        </div>
      )
    }
    if (fsLoading) return <Spinner />
    if (isError || !fsData) {
      return (
        <div className="flex items-center justify-center py-20 text-red-500 text-sm">
          Impossible de charger les états financiers. Vérifiez la connexion au serveur.
        </div>
      )
    }
    if (fsData.entryCount === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6M3 21h18M3 10.5V5a2 2 0 012-2h14a2 2 0 012 2v5.5" />
          </svg>
          <p className="text-sm font-medium">Aucune écriture pour {fsData.year}</p>
          <p className="text-xs text-slate-400">
            Saisissez des écritures dans le{' '}
            <Link to="/app/accounting/journal" className="text-[#1b4332] underline underline-offset-2 hover:opacity-80">
              journal comptable
            </Link>
            {' '}pour générer les états financiers.
          </p>
        </div>
      )
    }
    // Render the active sub-tab (Annexe/Notes don't need data but we pass it anyway)
    return <>{current.render(fsData)}</>
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{pageTitle}</h2>
          <p className="text-sm text-slate-500">
            {fsData
              ? <>Exercice {fsData.year} · comparatif N\xa0/\xa0N-1 ({fsData.prevYear}) <StatusBadge status={fsData.status} /></>
              : fyData
              ? <>Exercice {fyData.year} <StatusBadge status={fyData.status} /></>
              : 'Aucun exercice sélectionné'}
          </p>
        </div>
        {fsData && (
          <PdfButton onDownload={() => downloadEtatsFinanciers(fsData)} label="Télécharger PDF" />
        )}
      </div>

      {/* Sub-tabs — shown immediately based on zone, not waiting for data */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1 print:hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-[#1b4332] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
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
