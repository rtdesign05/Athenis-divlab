import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { UpsertEsgInput } from './esg.dto.js'

function d(v: Prisma.Decimal | null | undefined): number | null {
  return v == null ? null : Number(v)
}

// Reference benchmarks for scoring (sector-agnostic defaults)
const BENCH = {
  co2Max: 100,      // tonnes — above → score 0
  energyMax: 500_000, // kWh/year — above → score 0
  wasteMax: 5_000,  // kg — above → score 0
  genderGapMax: 20, // % — above → score 0
  trainingMin: 35,  // hours/year/employee — at or above → score 100
}

function scoreE(co2: number | null, energy: number | null, waste: number | null): number {
  const scores: number[] = []
  if (co2 != null) scores.push(Math.max(0, 1 - co2 / BENCH.co2Max) * 100)
  if (energy != null) scores.push(Math.max(0, 1 - energy / BENCH.energyMax) * 100)
  if (waste != null) scores.push(Math.max(0, 1 - waste / BENCH.wasteMax) * 100)
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
}

function scoreS(genderGap: number | null, trainingHours: number | null): number {
  const scores: number[] = []
  if (genderGap != null) scores.push(Math.max(0, 1 - genderGap / BENCH.genderGapMax) * 100)
  if (trainingHours != null) scores.push(Math.min(100, (trainingHours / BENCH.trainingMin) * 100))
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
}

function scoreG(data: Record<string, unknown>): number {
  const fields = ['co2Emissions', 'energyKwh', 'wasteKg', 'genderPayGap', 'trainingHours']
  const filled = fields.filter((f) => data[f] != null).length
  return (filled / fields.length) * 100
}

function risks(data: {
  co2Emissions: number | null
  energyKwh: number | null
  wasteKg: number | null
  genderPayGap: number | null
  trainingHours: number | null
}) {
  const list: { pilier: string; indicateur: string; niveau: 'FAIBLE' | 'MOYEN' | 'ELEVE' }[] = []
  if (data.co2Emissions != null && data.co2Emissions > BENCH.co2Max * 0.7)
    list.push({ pilier: 'E', indicateur: 'Émissions CO₂', niveau: data.co2Emissions > BENCH.co2Max ? 'ELEVE' : 'MOYEN' })
  if (data.energyKwh != null && data.energyKwh > BENCH.energyMax * 0.7)
    list.push({ pilier: 'E', indicateur: 'Consommation énergie', niveau: data.energyKwh > BENCH.energyMax ? 'ELEVE' : 'MOYEN' })
  if (data.wasteKg != null && data.wasteKg > BENCH.wasteMax * 0.7)
    list.push({ pilier: 'E', indicateur: 'Production déchets', niveau: data.wasteKg > BENCH.wasteMax ? 'ELEVE' : 'MOYEN' })
  if (data.genderPayGap != null && data.genderPayGap > 5)
    list.push({ pilier: 'S', indicateur: 'Écart salarial H/F', niveau: data.genderPayGap > 10 ? 'ELEVE' : 'MOYEN' })
  if (data.trainingHours != null && data.trainingHours < BENCH.trainingMin * 0.5)
    list.push({ pilier: 'S', indicateur: 'Formation insuffisante', niveau: 'MOYEN' })
  return list
}

export async function getEsgData(companyId: string, year: number) {
  const data = await prisma.eSGData.findUnique({
    where: { companyId_year: { companyId, year } },
  })
  if (!data) throw new AppError(`No ESG data for year ${year}`, 404, 'NOT_FOUND')
  return data
}

export async function listEsgYears(companyId: string) {
  const records = await prisma.eSGData.findMany({
    where: { companyId },
    select: { year: true },
    orderBy: { year: 'desc' },
  })
  return records.map((r) => r.year)
}

export async function upsertEsgData(companyId: string, input: UpsertEsgInput) {
  const fields = {
    year: input.year,
    co2Emissions: input.co2Emissions ?? null,
    energyKwh: input.energyKwh ?? null,
    wasteKg: input.wasteKg ?? null,
    genderPayGap: input.genderPayGap ?? null,
    trainingHours: input.trainingHours ?? null,
  }
  return prisma.eSGData.upsert({
    where: { companyId_year: { companyId, year: input.year } },
    update: fields,
    create: { companyId, ...fields },
  })
}

export async function getEsgScore(companyId: string, year: number) {
  const raw = await getEsgData(companyId, year)
  const data = {
    co2Emissions: d(raw.co2Emissions),
    energyKwh: d(raw.energyKwh),
    wasteKg: d(raw.wasteKg),
    genderPayGap: d(raw.genderPayGap),
    trainingHours: d(raw.trainingHours),
  }
  const e = scoreE(data.co2Emissions, data.energyKwh, data.wasteKg)
  const s = scoreS(data.genderPayGap, data.trainingHours)
  const g = scoreG(data as Record<string, unknown>)
  const global = (e + s + g) / 3

  return {
    year,
    scores: { environnement: Math.round(e), social: Math.round(s), gouvernance: Math.round(g), global: Math.round(global) },
    risques: risks(data),
    indicators: data,
  }
}

export async function getCsrdReport(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)
  const ind = score.indicators

  const materialite = [
    { topic: 'ESRS E1 – Changement climatique', esrs: 'E1', materiel: (ind.co2Emissions ?? 0) > 10, valeur: ind.co2Emissions },
    { topic: 'ESRS E2 – Pollution', esrs: 'E2', materiel: (ind.wasteKg ?? 0) > 500, valeur: ind.wasteKg },
    { topic: 'ESRS E7 – Énergie', esrs: 'E7', materiel: (ind.energyKwh ?? 0) > 100_000, valeur: ind.energyKwh },
    { topic: 'ESRS S1 – Effectifs propres', esrs: 'S1', materiel: true, valeur: null },
    { topic: 'ESRS S1 – Écart de rémunération', esrs: 'S1-16', materiel: (ind.genderPayGap ?? 0) > 3, valeur: ind.genderPayGap },
    { topic: 'ESRS S1 – Formation', esrs: 'S1-13', materiel: (ind.trainingHours ?? 0) < 20, valeur: ind.trainingHours },
  ]

  return {
    year,
    generatedAt: new Date().toISOString(),
    scores: score.scores,
    risques: score.risques,
    materialite,
    conformiteCSRD: score.scores.global >= 60,
    recommandations: score.risques.map((r) => ({
      priorite: r.niveau,
      action: `Réduire le risque "${r.indicateur}" (pilier ${r.pilier})`,
    })),
  }
}
