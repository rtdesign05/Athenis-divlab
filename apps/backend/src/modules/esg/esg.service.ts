import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

// ── Sector benchmarks ─────────────────────────────────────────────────────────
const BENCH = {
  energyKwh:    200_000,
  wasteKg:      2_000,
  genderPayGap: 8,
  trainingHours: 24,
}

// ── Scoring helpers ───────────────────────────────────────────────────────────
function scoreE(energy: number | null, waste: number | null): number {
  const scores: number[] = []
  if (energy != null) scores.push(Math.max(0, Math.min(100, (1 - energy / (BENCH.energyKwh * 2)) * 100)))
  if (waste != null)  scores.push(Math.max(0, Math.min(100, (1 - waste / (BENCH.wasteKg * 2)) * 100)))
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 50
}

function scoreS(gap: number | null, training: number | null): number {
  const scores: number[] = []
  if (gap != null)      scores.push(Math.max(0, Math.min(100, (1 - gap / (BENCH.genderPayGap * 2)) * 100)))
  if (training != null) scores.push(Math.min(100, (training / BENCH.trainingHours) * 100))
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 50
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
  const record = await prisma.eSGData.findUnique({
    where: { companyId_year: { companyId, year } },
  })
  if (!record) throw new AppError(`No ESG data for year ${year}`, 404, 'NOT_FOUND')
  return record
}

export async function upsertEsgData(companyId: string, input: {
  year: number
  energyKwh?: number | null
  wasteKg?: number | null
  genderPayGap?: number | null
  trainingHours?: number | null
}) {
  return prisma.eSGData.upsert({
    where: { companyId_year: { companyId, year: input.year } },
    update: {
      ...(input.energyKwh    !== undefined ? { energyKwh:    input.energyKwh    != null ? new Prisma.Decimal(input.energyKwh)    : null } : {}),
      ...(input.wasteKg      !== undefined ? { wasteKg:      input.wasteKg      != null ? new Prisma.Decimal(input.wasteKg)      : null } : {}),
      ...(input.genderPayGap !== undefined ? { genderPayGap: input.genderPayGap != null ? new Prisma.Decimal(input.genderPayGap) : null } : {}),
      ...(input.trainingHours !== undefined ? { trainingHours: input.trainingHours != null ? new Prisma.Decimal(input.trainingHours) : null } : {}),
    },
    create: {
      companyId,
      year: input.year,
      ...(input.energyKwh    != null ? { energyKwh:    new Prisma.Decimal(input.energyKwh)    } : {}),
      ...(input.wasteKg      != null ? { wasteKg:      new Prisma.Decimal(input.wasteKg)      } : {}),
      ...(input.genderPayGap != null ? { genderPayGap: new Prisma.Decimal(input.genderPayGap) } : {}),
      ...(input.trainingHours != null ? { trainingHours: new Prisma.Decimal(input.trainingHours) } : {}),
    },
  })
}

// Keep old indicator-based upsert as shim for backward compat
export async function upsertEsgIndicator(companyId: string, input: {
  year: number
  pillar?: string
  indicatorId?: string
  value?: number
  energyKwh?: number | null
  wasteKg?: number | null
  genderPayGap?: number | null
  trainingHours?: number | null
}) {
  // Map legacy indicatorId to new flat fields
  const flat: { energyKwh?: number; wasteKg?: number; genderPayGap?: number; trainingHours?: number } = {}
  if (input.indicatorId === 'energy_kwh' && input.value != null)      flat.energyKwh    = input.value
  if (input.indicatorId === 'waste_kg'   && input.value != null)      flat.wasteKg      = input.value
  if (input.indicatorId === 'gender_pay_gap' && input.value != null)  flat.genderPayGap = input.value
  if (input.indicatorId === 'training_hours' && input.value != null)  flat.trainingHours = input.value
  if (input.energyKwh    != null) flat.energyKwh    = input.energyKwh
  if (input.wasteKg      != null) flat.wasteKg      = input.wasteKg
  if (input.genderPayGap != null) flat.genderPayGap = input.genderPayGap
  if (input.trainingHours != null) flat.trainingHours = input.trainingHours

  return upsertEsgData(companyId, { year: input.year, ...flat })
}

// ── Score ─────────────────────────────────────────────────────────────────────
export async function getEsgScore(companyId: string, year: number) {
  const record = await prisma.eSGData.findUnique({
    where: { companyId_year: { companyId, year } },
  })
  if (!record) throw new AppError(`No ESG data for year ${year}`, 404, 'NOT_FOUND')

  const energyKwh    = record.energyKwh    != null ? Number(record.energyKwh)    : null
  const wasteKg      = record.wasteKg      != null ? Number(record.wasteKg)      : null
  const genderPayGap = record.genderPayGap != null ? Number(record.genderPayGap) : null
  const trainingHours = record.trainingHours != null ? Number(record.trainingHours) : null

  const e = scoreE(energyKwh, wasteKg)
  const s = scoreS(genderPayGap, trainingHours)
  const g = 50 // Gouvernance not tracked in this schema version
  const global = (e + s + g) / 3

  return {
    year,
    scores: {
      environnement: Math.round(e),
      social:        Math.round(s),
      gouvernance:   Math.round(g),
      global:        Math.round(global),
    },
    indicators: {
      energyKwh,
      wasteKg,
      genderPayGap,
      trainingHours,
    },
  }
}

// ── Benchmark ─────────────────────────────────────────────────────────────────
export async function getBenchmark(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)

  return {
    year,
    company: score.scores,
    sector: { environnement: 52, social: 58, gouvernance: 64, global: 58 },
    indicators: [
      { label: 'Énergie (MWh)',         company: (score.indicators.energyKwh ?? 0) / 1000,    bench: BENCH.energyKwh/1000, unit: 'MWh',   lowerBetter: true },
      { label: 'Déchets (t)',           company: (score.indicators.wasteKg ?? 0) / 1000,      bench: BENCH.wasteKg/1000,   unit: 't',     lowerBetter: true },
      { label: 'Écart salarial H/F',    company: score.indicators.genderPayGap ?? 0,           bench: BENCH.genderPayGap,   unit: '%',     lowerBetter: true },
      { label: 'Formation (h/salarié)', company: score.indicators.trainingHours ?? 0,          bench: BENCH.trainingHours,  unit: 'h',     lowerBetter: false },
    ],
  }
}

// ── CSRD Report ───────────────────────────────────────────────────────────────
export async function getCsrdReport(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)

  const materialite = [
    { esrs: 'E7',    topic: 'Énergie',                        pilier: 'E', materiel: (score.indicators.energyKwh ?? 0) > 100_000,  valeur: `${((score.indicators.energyKwh ?? 0)/1000).toFixed(0)} MWh`, details: 'Consommation énergétique' },
    { esrs: 'E2',    topic: 'Pollution',                      pilier: 'E', materiel: (score.indicators.wasteKg ?? 0) > 500,         valeur: `${((score.indicators.wasteKg ?? 0)/1000).toFixed(1)} t`,     details: 'Déchets produits' },
    { esrs: 'S1-1',  topic: 'Effectifs & conditions travail', pilier: 'S', materiel: true,                                          valeur: '—',                                                          details: 'Traitement obligatoire' },
    { esrs: 'S1-16', topic: 'Égalité salariale H/F',          pilier: 'S', materiel: (score.indicators.genderPayGap ?? 0) > 3,      valeur: `${score.indicators.genderPayGap ?? '—'} %`,                  details: 'Index égalité professionnelle' },
    { esrs: 'S1-13', topic: 'Formation & développement',      pilier: 'S', materiel: (score.indicators.trainingHours ?? 0) < 20,    valeur: `${score.indicators.trainingHours ?? '—'} h`,                 details: 'Heures/salarié/an' },
  ]

  const recommandations = [
    ...((score.indicators.genderPayGap ?? 0) > 5    ? [{ priorite: 'ÉLEVÉ',  pilier: 'S', action: 'Réduire l\'écart salarial H/F (Loi Pénicaud)' }]     : []),
    ...((score.indicators.trainingHours ?? 0) < 24  ? [{ priorite: 'MOYEN',  pilier: 'S', action: 'Renforcer les formations (cible 24h/salarié/an)' }]   : []),
  ]

  return {
    year,
    generatedAt: new Date().toISOString(),
    scores:      score.scores,
    materialite,
    recommandations,
    conformiteCSRD: score.scores.global >= 60,
  }
}

// ── Stubs ─────────────────────────────────────────────────────────────────────
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
