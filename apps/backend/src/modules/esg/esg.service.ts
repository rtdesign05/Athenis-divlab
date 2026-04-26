import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

// Emission factors (GHG Protocol / ADEME 2024) — kept for reference:
// naturalGas:0.205, fuelOil:0.00271, vehicleFuel:0.00244, electricity:0.0000571

// ── Sector benchmarks ─────────────────────────────────────────────────────────
const BENCH = {
  co2Total:     50,
  energyKwh:    200_000,
  wasteKg:      2_000,
  genderPayGap: 8,
  trainingHours: 24,
  absenteeism:  4.5,
  boardFemale:  35,
}


// ── Helper: get indicators as a map by indicatorId for a given year ───────────
async function getIndicatorMap(companyId: string, year: number): Promise<Map<string, number>> {
  const records = await prisma.eSGData.findMany({
    where: { companyId, year },
  })
  const map = new Map<string, number>()
  for (const r of records) {
    map.set(r.indicatorId, Number(r.value))
  }
  return map
}

// ── Scoring helpers ───────────────────────────────────────────────────────────
function scoreE(co2: number, energy: number | null, waste: number | null, renewable: number | null): number {
  const scores: number[] = []
  scores.push(Math.max(0, Math.min(100, (1 - co2 / (BENCH.co2Total * 2)) * 100)))
  if (energy != null) scores.push(Math.max(0, Math.min(100, (1 - energy / (BENCH.energyKwh * 2)) * 100)))
  if (waste != null)  scores.push(Math.max(0, Math.min(100, (1 - waste / (BENCH.wasteKg * 2)) * 100)))
  if (renewable != null) scores.push(renewable)
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function scoreS(gap: number | null, training: number | null, absenteeism: number | null): number {
  const scores: number[] = []
  if (gap != null)         scores.push(Math.max(0, Math.min(100, (1 - gap / (BENCH.genderPayGap * 2)) * 100)))
  if (training != null)    scores.push(Math.min(100, (training / BENCH.trainingHours) * 100))
  if (absenteeism != null) scores.push(Math.max(0, Math.min(100, (1 - absenteeism / (BENCH.absenteeism * 2)) * 100)))
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 50
}

function scoreG(boardFemale: number | null, ethicsCode: boolean, anticorruption: boolean): number {
  const scores: number[] = []
  if (boardFemale != null) scores.push(Math.min(100, (boardFemale / BENCH.boardFemale) * 100))
  scores.push(ethicsCode ? 100 : 0)
  scores.push(anticorruption ? 100 : 0)
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function listEsgYears(companyId: string) {
  const records = await prisma.eSGData.findMany({
    where: { companyId },
    select: { year: true },
    orderBy: { year: 'desc' },
    distinct: ['year'],
  })
  return records.map(r => r.year)
}

export async function getEsgData(companyId: string, year: number) {
  const records = await prisma.eSGData.findMany({ where: { companyId, year } })
  if (records.length === 0) throw new AppError(`No ESG data for year ${year}`, 404, 'NOT_FOUND')
  return records
}

export async function upsertEsgIndicator(companyId: string, input: {
  year: number
  pillar: 'E' | 'S' | 'G'
  indicatorId: string
  value: number
  target: number
  unit: string
}) {
  return prisma.eSGData.upsert({
    where: { companyId_indicatorId_year: { companyId, indicatorId: input.indicatorId, year: input.year } },
    update: {
      value:  new Prisma.Decimal(input.value),
      target: new Prisma.Decimal(input.target),
      unit:   input.unit,
    },
    create: {
      companyId,
      pillar:      input.pillar,
      indicatorId: input.indicatorId,
      value:       new Prisma.Decimal(input.value),
      target:      new Prisma.Decimal(input.target),
      unit:        input.unit,
      year:        input.year,
    },
  })
}

// ── Score ─────────────────────────────────────────────────────────────────────
export async function getEsgScore(companyId: string, year: number) {
  const indMap = await getIndicatorMap(companyId, year)
  if (indMap.size === 0) throw new AppError(`No ESG data for year ${year}`, 404, 'NOT_FOUND')

  const scope1  = indMap.get('scope1_total') ?? 0
  const scope2  = indMap.get('scope2_total') ?? 0
  const scope3  = indMap.get('scope3_total') ?? 0
  const co2     = scope1 + scope2 + scope3

  const energyKwh      = indMap.has('energy_kwh')       ? indMap.get('energy_kwh')!       : null
  const wasteKg        = indMap.has('waste_kg')          ? indMap.get('waste_kg')!          : null
  const renewableRatio = indMap.has('renewable_ratio')   ? indMap.get('renewable_ratio')!   : null
  const genderPayGap   = indMap.has('gender_pay_gap')    ? indMap.get('gender_pay_gap')!    : null
  const trainingHours  = indMap.has('training_hours')    ? indMap.get('training_hours')!    : null
  const absenteeism    = indMap.has('absenteeism_rate')  ? indMap.get('absenteeism_rate')!  : null
  const accidents      = indMap.has('workplace_accidents')? indMap.get('workplace_accidents')!: null
  const boardFemale    = indMap.has('board_female_ratio')? indMap.get('board_female_ratio')!: null
  const ethicsCode     = (indMap.get('has_ethics_code')  ?? 0) >= 1
  const anticorruption = (indMap.get('has_anticorruption') ?? 0) >= 1

  const e = scoreE(co2, energyKwh, wasteKg, renewableRatio)
  const s = scoreS(genderPayGap, trainingHours, absenteeism)
  const g = scoreG(boardFemale, ethicsCode, anticorruption)
  const global = (e + s + g) / 3

  return {
    year,
    scores: {
      environnement: Math.round(e),
      social:        Math.round(s),
      gouvernance:   Math.round(g),
      global:        Math.round(global),
    },
    co2: { scope1, scope2, scope3, total: +(co2.toFixed(2)) },
    indicators: {
      energyKwh,
      wasteKg,
      renewableRatio,
      genderPayGap,
      trainingHours,
      absenteeismRate: absenteeism,
      workplaceAccidents: accidents != null ? Math.round(accidents) : null,
      boardFemaleRatio: boardFemale,
      hasEthicsCode: ethicsCode,
      hasAnticorruption: anticorruption,
    },
  }
}

// ── Benchmark ─────────────────────────────────────────────────────────────────
export async function getBenchmark(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)
  const co2   = score.co2

  return {
    year,
    company: score.scores,
    sector: { environnement: 52, social: 58, gouvernance: 64, global: 58 },
    indicators: [
      { label: 'CO₂ total (tCO2e)',     company: co2.total,                                   bench: BENCH.co2Total,       unit: 'tCO2e', lowerBetter: true },
      { label: 'Énergie (MWh)',         company: (score.indicators.energyKwh ?? 0) / 1000,    bench: BENCH.energyKwh/1000, unit: 'MWh',   lowerBetter: true },
      { label: 'Déchets (t)',           company: (score.indicators.wasteKg ?? 0) / 1000,      bench: BENCH.wasteKg/1000,   unit: 't',     lowerBetter: true },
      { label: 'Écart salarial H/F',    company: score.indicators.genderPayGap ?? 0,           bench: BENCH.genderPayGap,   unit: '%',     lowerBetter: true },
      { label: 'Formation (h/salarié)', company: score.indicators.trainingHours ?? 0,          bench: BENCH.trainingHours,  unit: 'h',     lowerBetter: false },
      { label: 'Absentéisme',           company: score.indicators.absenteeismRate ?? 0,        bench: BENCH.absenteeism,    unit: '%',     lowerBetter: true },
      { label: 'Femmes CA (%)',         company: score.indicators.boardFemaleRatio ?? 0,       bench: BENCH.boardFemale,    unit: '%',     lowerBetter: false },
    ],
  }
}

// ── CSRD Report ───────────────────────────────────────────────────────────────
export async function getCsrdReport(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)
  const co2 = score.co2

  const materialite = [
    { esrs: 'E1',    topic: 'Changement climatique',          pilier: 'E', materiel: co2.total > 10,                                              valeur: `${co2.total.toFixed(1)} tCO2e`,                        details: `Scope 1: ${co2.scope1.toFixed(1)} | Scope 2: ${co2.scope2.toFixed(1)} | Scope 3: ${co2.scope3.toFixed(1)}` },
    { esrs: 'E2',    topic: 'Pollution',                      pilier: 'E', materiel: (score.indicators.wasteKg ?? 0) > 500,                      valeur: `${((score.indicators.wasteKg ?? 0)/1000).toFixed(1)} t`, details: 'Déchets produits' },
    { esrs: 'E7',    topic: 'Énergie',                        pilier: 'E', materiel: (score.indicators.energyKwh ?? 0) > 100_000,                valeur: `${((score.indicators.energyKwh ?? 0)/1000).toFixed(0)} MWh`, details: `EnR : ${score.indicators.renewableRatio ?? '—'}%` },
    { esrs: 'S1-1',  topic: 'Effectifs & conditions travail', pilier: 'S', materiel: true,                                                        valeur: '—',                                                    details: 'Traitement obligatoire' },
    { esrs: 'S1-16', topic: 'Égalité salariale H/F',          pilier: 'S', materiel: (score.indicators.genderPayGap ?? 0) > 3,                  valeur: `${score.indicators.genderPayGap ?? '—'} %`,            details: 'Index égalité professionnelle' },
    { esrs: 'S1-13', topic: 'Formation & développement',      pilier: 'S', materiel: (score.indicators.trainingHours ?? 0) < 20,                valeur: `${score.indicators.trainingHours ?? '—'} h`,           details: 'Heures/salarié/an' },
    { esrs: 'S1-14', topic: 'Santé & sécurité',               pilier: 'S', materiel: (score.indicators.workplaceAccidents ?? 0) > 0,            valeur: `${score.indicators.workplaceAccidents ?? 0} acc.`,     details: 'Accidents du travail' },
    { esrs: 'G1-1',  topic: 'Éthique & code de conduite',     pilier: 'G', materiel: !score.indicators.hasEthicsCode,                           valeur: score.indicators.hasEthicsCode ? 'Oui' : 'Non',         details: 'Code éthique formalisé' },
    { esrs: 'G1-3',  topic: 'Prévention corruption',          pilier: 'G', materiel: !score.indicators.hasAnticorruption,                       valeur: score.indicators.hasAnticorruption ? 'Oui' : 'Non',     details: 'Politique anticorruption' },
    { esrs: 'G1-6',  topic: 'Gouvernance (% femmes CA)',       pilier: 'G', materiel: (score.indicators.boardFemaleRatio ?? 0) < 40,             valeur: `${score.indicators.boardFemaleRatio ?? '—'} %`,         details: 'Cible loi Rixain : 40% d\'ici 2026' },
  ]

  const recommandations = [
    ...(co2.total > BENCH.co2Total                               ? [{ priorite: 'CRITIQUE', pilier: 'E', action: 'Réduire les émissions CO₂ : auditer les postes Scope 1 et 3' }] : []),
    ...((score.indicators.renewableRatio ?? 0) < 50              ? [{ priorite: 'MOYEN',    pilier: 'E', action: 'Augmenter la part d\'énergies renouvelables (cible 50%)' }]    : []),
    ...((score.indicators.genderPayGap ?? 0) > 5                 ? [{ priorite: 'ÉLEVÉ',    pilier: 'S', action: 'Réduire l\'écart salarial H/F (Loi Pénicaud)' }]               : []),
    ...((score.indicators.trainingHours ?? 0) < 24               ? [{ priorite: 'MOYEN',    pilier: 'S', action: 'Renforcer les formations (cible 24h/salarié/an)' }]             : []),
    ...(!score.indicators.hasEthicsCode                          ? [{ priorite: 'ÉLEVÉ',    pilier: 'G', action: 'Formaliser un code d\'éthique d\'entreprise' }]                 : []),
    ...(!score.indicators.hasAnticorruption                      ? [{ priorite: 'ÉLEVÉ',    pilier: 'G', action: 'Déployer une politique anticorruption (Loi Sapin II)' }]        : []),
  ]

  return {
    year,
    generatedAt: new Date().toISOString(),
    scores:      score.scores,
    co2,
    materialite,
    recommandations,
    conformiteCSRD: score.scores.global >= 60,
  }
}

// ── Stubs for action plan (no esgAction model in v2 schema) ──────────────────
export async function listActions(_companyId: string, _year?: number) {
  return []
}

export async function createAction(_companyId: string, _data: unknown) {
  return null
}

export async function updateAction(_companyId: string, _id: string, _data: unknown) {
  return null
}

export async function deleteAction(_companyId: string, _id: string) {
  return null
}

export async function actionStats(_companyId: string) {
  return { total: 0, todo: 0, inProgress: 0, done: 0, co2Saving: 0 }
}
