import { prisma } from '../../lib/prisma.js'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IgsBaremeRow {
  classe: number
  caMin: number
  caMax: number
  montantBase: number
  montantCga: number
  year: number
}

export interface IgsClassResult {
  classe: number
  caMin: number
  caMax: number
  montantBase: number
  montantCga: number
}

export interface RegimeDetectionResult {
  currentRegime:  string
  nextRegime:     string
  hasChanged:     boolean
  changeReason:   string
  caActuel:       number
  caThreshold:    number
  professionLiberale: boolean
  igsClass?:      number
  igsAmount?:     number
  igsAmountCga?:  number
  newObligations: string[]
  warnings:       string[]
  regimeHistory:  Record<string, string>
}

export interface VisibleModules {
  tabs: Array<{ key: string; label: string; to: string }>
  regime: string
}

// ── Barème IGS ────────────────────────────────────────────────────────────────

export async function getIgsBareme(): Promise<IgsBaremeRow[]> {
  const rows = await prisma.igsBareme.findMany({ orderBy: { classe: 'asc' } })
  return rows.map(r => ({
    classe:      r.classe,
    caMin:       Number(r.caMin),
    caMax:       Number(r.caMax),
    montantBase: Number(r.montantBase),
    montantCga:  Number(r.montantCga),
    year:        r.year,
  }))
}

export function getIgsClassFromCA(ca: number, bareme: IgsBaremeRow[]): IgsClassResult | null {
  const row = bareme.find(r => ca >= r.caMin && ca <= r.caMax)
  if (!row) return null
  return {
    classe:      row.classe,
    caMin:       row.caMin,
    caMax:       row.caMax,
    montantBase: row.montantBase,
    montantCga:  row.montantCga,
  }
}

// ── Détection automatique du régime ──────────────────────────────────────────

export async function detectRegimeForNextYear(
  companyId: string,
  currentYear: number,
): Promise<RegimeDetectionResult> {
  const taxConfig = await prisma.taxConfig.findUnique({ where: { companyId } })
  const bareme    = await getIgsBareme()

  // Calcule CA réel de l'exercice N
  const fy = await prisma.fiscalYear.findFirst({
    where: { companyId, year: currentYear },
    select: { id: true },
  })
  let caActuel = 0
  if (fy) {
    const entries = await prisma.journalEntry.findMany({
      where: { fiscalYearId: fy.id, account: { startsWith: '7' } },
      select: { debit: true, credit: true },
    })
    caActuel = entries.reduce((s, e) => s + Number(e.credit) - Number(e.debit), 0)
  }

  const professionLiberale = taxConfig?.professionLiberale ?? false
  const currentRegime      = taxConfig?.taxRegime ?? 'REEL_NORMAL'
  const regimeHistory: Record<string, string> =
    (taxConfig?.regimeHistory as Record<string, string> | null) ?? {}

  // Règles de détection
  let nextRegime: string
  let changeReason: string
  const newObligations: string[] = []
  const warnings: string[] = []

  if (professionLiberale) {
    nextRegime   = 'REEL_NORMAL'
    changeReason = 'Profession libérale — Réel Normal obligatoire quelque soit le CA (CGI Art. 43)'
  } else if (caActuel >= 50_000_000) {
    nextRegime   = 'REEL_NORMAL'
    changeReason = `CA ${fmtCA(caActuel)} ≥ seuil 50 000 000 F CFA → Réel Normal obligatoire`
  } else if (caActuel >= 10_000_000) {
    // 10M–50M : IGS par défaut (sauf option Réel)
    const currentIsReel = currentRegime === 'REEL_NORMAL' || currentRegime === 'REEL_SIMPLIFIE'
    nextRegime   = currentIsReel ? currentRegime : 'IGS'
    changeReason = `CA ${fmtCA(caActuel)} entre 10M et 50M → ${nextRegime === 'IGS' ? 'IGS (classes 8-10)' : 'Réel maintenu'}`
    if (nextRegime === 'IGS') {
      warnings.push('Vous pouvez opter volontairement pour le Réel Normal (irréversible)')
    }
  } else {
    nextRegime   = 'IGS'
    changeReason = `CA ${fmtCA(caActuel)} < 10 000 000 F CFA → IGS libératoire (classes 1-7)`
  }

  const hasChanged = nextRegime !== currentRegime && currentRegime !== 'REEL_NORMAL'

  if (hasChanged && nextRegime === 'REEL_NORMAL') {
    newObligations.push('Déclaration TVA mensuelle (19,25% — avant le 15 du mois suivant)')
    newObligations.push('Acomptes IS mensuels (2,2% du CA HT mensuel — Art. 97 CGI)')
    newObligations.push('DSF annuelle (avant le 15 mars N+1)')
    newObligations.push('Patente annuelle (avant le 28 février)')
    newObligations.push('Comptabilité SYSCOHADA complète obligatoire')
    warnings.push('Le passage IGS → Réel Normal est définitif tant que le CA reste ≥ 50M')
  }

  // Calcul IGS si applicable
  let igsClass: number | undefined
  let igsAmount: number | undefined
  let igsAmountCga: number | undefined

  if (nextRegime === 'IGS') {
    const igsRow = getIgsClassFromCA(caActuel, bareme)
    if (igsRow) {
      igsClass    = igsRow.classe
      igsAmount   = igsRow.montantBase
      igsAmountCga = igsRow.montantCga
    }
  }

  // Sauvegarde l'historique
  const updatedHistory = { ...regimeHistory, [currentYear]: currentRegime, [currentYear + 1]: nextRegime }

  await prisma.taxConfig.updateMany({
    where: { companyId },
    data: {
      regimeHistory:     updatedHistory,
      regimeChangeAlert: hasChanged,
      lastRegimeCheck:   new Date(),
      nextRegimeCheck:   new Date(currentYear + 1, 0, 1),
      ...(nextRegime === 'IGS' && igsClass !== undefined ? {
        igsClass,
        igsAmount,
      } : {}),
    },
  })

  return {
    currentRegime, nextRegime, hasChanged, changeReason,
    caActuel, caThreshold: 50_000_000, professionLiberale,
    igsClass, igsAmount, igsAmountCga,
    newObligations, warnings,
    regimeHistory: updatedHistory,
  }
}

// ── Confirmation du régime ────────────────────────────────────────────────────

export async function confirmRegime(
  companyId: string,
  year: number,
  regime: string,
  igsClass?: number,
  paymentMode?: string,
  adherentCga?: boolean,
) {
  const bareme = await getIgsBareme()
  const taxConfig = await prisma.taxConfig.findUnique({ where: { companyId } })

  let igsAmount: number | undefined
  if (regime === 'IGS' && igsClass) {
    const row = bareme.find(r => r.classe === igsClass)
    if (row) {
      igsAmount = adherentCga ? row.montantCga : row.montantBase
    }
  }

  const regimeHistory = {
    ...((taxConfig?.regimeHistory as Record<string, string> | null) ?? {}),
    [year]: regime,
  }

  const vatRegime = regime === 'REEL_NORMAL' ? 'MENSUEL'
    : regime === 'REEL_SIMPLIFIE' ? 'TRIMESTRIEL'
    : 'NON_ASSUJETTI'

  await prisma.taxConfig.updateMany({
    where: { companyId },
    data: {
      taxRegime:         regime as never,
      vatRegime:         vatRegime as never,
      isFirstYear:       false,
      regimeHistory,
      regimeChangeAlert: false,
      igsClass:          igsClass ?? null,
      igsAmount:         igsAmount ?? null,
      igsPaymentMode:    (paymentMode as never) ?? null,
      igsAdherentCga:    adherentCga ?? false,
      isAssujetti:       regime === 'REEL_NORMAL' || regime === 'REEL_SIMPLIFIE',
    },
  })

  return { success: true, regime, year, vatRegime }
}

// ── Modules visibles selon le régime ─────────────────────────────────────────

export async function getVisibleFiscalModules(companyId: string): Promise<VisibleModules> {
  const taxConfig = await prisma.taxConfig.findUnique({ where: { companyId } })
  const regime    = taxConfig?.taxRegime ?? 'REEL_NORMAL'
  const base      = '/app/fiscal'

  if (regime === 'IGS') {
    return {
      regime,
      tabs: [
        { key: 'dashboard', label: 'Tableau de bord', to: base },
        { key: 'igs',       label: 'IGS',              to: `${base}/igs` },
        { key: 'ras',       label: 'RAS / CNPS',       to: `${base}/ras` },
        { key: 'cnps',      label: 'CNPS',             to: `${base}/cnps` },
        { key: 'calendrier',label: 'Calendrier fiscal', to: `${base}/calendrier` },
      ],
    }
  }

  if (regime === 'REEL_SIMPLIFIE') {
    return {
      regime,
      tabs: [
        { key: 'dashboard', label: 'Tableau de bord',    to: base },
        { key: 'is',        label: 'IS',                  to: `${base}/is` },
        { key: 'patente',   label: 'Patente',             to: `${base}/patente` },
        { key: 'ras',       label: 'Retenues à la source',to: `${base}/ras` },
        { key: 'cnps',      label: 'CNPS',                to: `${base}/cnps` },
        { key: 'calendrier',label: 'Calendrier fiscal',   to: `${base}/calendrier` },
      ],
    }
  }

  // REEL_NORMAL (et legacy)
  return {
    regime,
    tabs: [
      { key: 'dashboard', label: 'Tableau de bord',    to: base },
      { key: 'tva',       label: 'TVA',                to: `${base}/tva` },
      { key: 'is',        label: 'IS',                 to: `${base}/is` },
      { key: 'dsf',       label: 'DSF',                to: `${base}/dsf` },
      { key: 'patente',   label: 'Patente',            to: `${base}/patente` },
      { key: 'ras',       label: 'Retenues à la source',to: `${base}/ras` },
      { key: 'cnps',      label: 'CNPS',               to: `${base}/cnps` },
      { key: 'calendrier',label: 'Calendrier fiscal',  to: `${base}/calendrier` },
      { key: 'liasse',    label: 'Liasse fiscale',     to: `${base}/liasse` },
    ],
  }
}

// ── Déclaration IGS ───────────────────────────────────────────────────────────

export async function getIGSDeclaration(companyId: string, year: number) {
  const taxConfig = await prisma.taxConfig.findUnique({ where: { companyId } })
  const bareme    = await getIgsBareme()

  // CA N-1 réel
  const prevFY = await prisma.fiscalYear.findFirst({
    where: { companyId, year: year - 1 }, select: { id: true },
  })
  let caN1 = 0
  if (prevFY) {
    const entries = await prisma.journalEntry.findMany({
      where: { fiscalYearId: prevFY.id, account: { startsWith: '7' } },
      select: { debit: true, credit: true },
    })
    caN1 = entries.reduce((s, e) => s + Number(e.credit) - Number(e.debit), 0)
  }
  if (caN1 === 0) caN1 = Number(taxConfig?.firstYearCA ?? 0)

  const igsRow      = getIgsClassFromCA(caN1, bareme)
  const adherentCga = taxConfig?.igsAdherentCga ?? false
  const igsAmount   = adherentCga ? (igsRow?.montantCga ?? 0) : (igsRow?.montantBase ?? 0)
  const paymentMode = taxConfig?.igsPaymentMode ?? 'ANNUEL'

  const existing = await prisma.taxDeclaration.findFirst({
    where: { companyId, type: 'TVA', year, period: `IGS-${year}` },
  })

  const trimestres = [
    { num: 1, label: 'T1 — avant le 15 avril', dueDate: new Date(year, 3, 15), amount: Math.round(igsAmount / 4) },
    { num: 2, label: 'T2 — avant le 15 juillet', dueDate: new Date(year, 6, 15), amount: Math.round(igsAmount / 4) },
    { num: 3, label: 'T3 — avant le 15 octobre', dueDate: new Date(year, 9, 15), amount: Math.round(igsAmount / 4) },
    { num: 4, label: 'T4 — avant le 15 janvier N+1', dueDate: new Date(year + 1, 0, 15), amount: Math.round(igsAmount / 4) },
  ]

  return {
    year,
    caN1: Math.round(caN1),
    igsClass:      igsRow?.classe ?? taxConfig?.igsClass ?? null,
    igsAmount:     Math.round(igsAmount),
    igsAmountCga:  Math.round(igsRow?.montantCga ?? 0),
    adherentCga,
    paymentMode,
    status:        existing?.status ?? 'PENDING',
    dueDate:       new Date(year, 3, 30),
    trimestres,
    bareme,
    niu:           taxConfig?.niu ?? null,
    centerImpots:  taxConfig?.centerImpots ?? null,
    regimeHistory: (taxConfig?.regimeHistory as Record<string, string> | null) ?? {},
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function fmtCA(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  return `${(n / 1_000).toFixed(0)}k`
}
