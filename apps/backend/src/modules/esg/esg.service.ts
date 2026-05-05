import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

// ── Sector benchmarks (PME françaises — ADEME / Bpifrance) ───────────────────
const BENCH = {
  energyKwh:          200_000,
  wasteKg:            2_000,
  genderPayGap:       8,
  trainingHours:      24,
  renewableRatio:     30,
  absenteeismRate:    5,
  boardFemaleRatio:   40,
}

// ── Scoring helpers ───────────────────────────────────────────────────────────
function scoreE(energy: number | null, waste: number | null, renewable: number | null): number {
  const scores: number[] = []
  if (energy    != null) scores.push(Math.max(0, Math.min(100, (1 - energy / (BENCH.energyKwh * 2)) * 100)))
  if (waste     != null) scores.push(Math.max(0, Math.min(100, (1 - waste / (BENCH.wasteKg * 2)) * 100)))
  if (renewable != null) scores.push(Math.min(100, (renewable / 100) * 100))
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 50
}

function scoreS(gap: number | null, training: number | null, absenteeism: number | null): number {
  const scores: number[] = []
  if (gap         != null) scores.push(Math.max(0, Math.min(100, (1 - gap / (BENCH.genderPayGap * 2)) * 100)))
  if (training    != null) scores.push(Math.min(100, (training / BENCH.trainingHours) * 100))
  if (absenteeism != null) scores.push(Math.max(0, Math.min(100, (1 - absenteeism / (BENCH.absenteeismRate * 2)) * 100)))
  return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 50
}

function scoreG(boardFemale: number | null, hasEthics: boolean, hasAnti: boolean): number {
  const scores: number[] = []
  if (boardFemale != null) scores.push(Math.min(100, (boardFemale / BENCH.boardFemaleRatio) * 100))
  scores.push(hasEthics ? 100 : 0)
  scores.push(hasAnti   ? 100 : 0)
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
  const record = await prisma.eSGData.findUnique({
    where: { companyId_year: { companyId, year } },
  })
  if (!record) throw new AppError(`No ESG data for year ${year}`, 404, 'NOT_FOUND')
  return record
}

function dec(v: number | null | undefined): Prisma.Decimal | null {
  return v != null ? new Prisma.Decimal(v) : null
}

export async function upsertEsgData(companyId: string, input: {
  year:               number
  energyKwh?:         number | null
  wasteKg?:           number | null
  renewableRatio?:    number | null
  scope1Tco2e?:       number | null
  scope2Tco2e?:       number | null
  scope3Tco2e?:       number | null
  genderPayGap?:      number | null
  trainingHours?:     number | null
  absenteeismRate?:   number | null
  workplaceAccidents?: number | null
  boardFemaleRatio?:  number | null
  hasEthicsCode?:     boolean
  hasAnticorruption?: boolean
}) {
  const fields = {
    ...(input.energyKwh          !== undefined ? { energyKwh:          dec(input.energyKwh)         } : {}),
    ...(input.wasteKg             !== undefined ? { wasteKg:            dec(input.wasteKg)            } : {}),
    ...(input.renewableRatio      !== undefined ? { renewableRatio:     dec(input.renewableRatio)     } : {}),
    ...(input.scope1Tco2e         !== undefined ? { scope1Tco2e:        dec(input.scope1Tco2e)        } : {}),
    ...(input.scope2Tco2e         !== undefined ? { scope2Tco2e:        dec(input.scope2Tco2e)        } : {}),
    ...(input.scope3Tco2e         !== undefined ? { scope3Tco2e:        dec(input.scope3Tco2e)        } : {}),
    ...(input.genderPayGap        !== undefined ? { genderPayGap:       dec(input.genderPayGap)       } : {}),
    ...(input.trainingHours       !== undefined ? { trainingHours:      dec(input.trainingHours)      } : {}),
    ...(input.absenteeismRate     !== undefined ? { absenteeismRate:    dec(input.absenteeismRate)    } : {}),
    ...(input.workplaceAccidents  !== undefined ? { workplaceAccidents: input.workplaceAccidents      } : {}),
    ...(input.boardFemaleRatio    !== undefined ? { boardFemaleRatio:   dec(input.boardFemaleRatio)   } : {}),
    ...(input.hasEthicsCode       !== undefined ? { hasEthicsCode:      input.hasEthicsCode           } : {}),
    ...(input.hasAnticorruption   !== undefined ? { hasAnticorruption:  input.hasAnticorruption       } : {}),
  }

  return prisma.eSGData.upsert({
    where: { companyId_year: { companyId, year: input.year } },
    update: fields,
    create: { companyId, year: input.year, ...fields },
  })
}

// Keep old indicator-based upsert as shim for backward compat
export async function upsertEsgIndicator(companyId: string, input: {
  year:               number
  indicatorId?:       string
  value?:             number
  // Full flat fields (from ScopePage)
  energyKwh?:         number | null
  wasteKg?:           number | null
  renewableRatio?:    number | null
  scope1Tco2e?:       number | null
  scope2Tco2e?:       number | null
  scope3Tco2e?:       number | null
  genderPayGap?:      number | null
  trainingHours?:     number | null
  absenteeismRate?:   number | null
  workplaceAccidents?: number | null
  boardFemaleRatio?:  number | null
  hasEthicsCode?:     boolean
  hasAnticorruption?: boolean
  // Structured CO₂ sub-fields (from ScopePage)
  scope1Details?:     { naturalGas?: number; fuelOil?: number; vehicles?: number; process?: number }
  scope2Kwh?:         number
  scope3Details?:     { businessTravel?: number; freight?: number; waste?: number; purchasedGoods?: number }
}) {
  const flat: Parameters<typeof upsertEsgData>[1] = { year: input.year }

  // Legacy indicator mapping
  if (input.indicatorId === 'energy_kwh'     && input.value != null) flat.energyKwh    = input.value
  if (input.indicatorId === 'waste_kg'        && input.value != null) flat.wasteKg      = input.value
  if (input.indicatorId === 'gender_pay_gap'  && input.value != null) flat.genderPayGap = input.value
  if (input.indicatorId === 'training_hours'  && input.value != null) flat.trainingHours = input.value

  // Direct flat fields
  if (input.energyKwh          != null) flat.energyKwh          = input.energyKwh
  if (input.wasteKg             != null) flat.wasteKg             = input.wasteKg
  if (input.renewableRatio      != null) flat.renewableRatio      = input.renewableRatio
  if (input.genderPayGap        != null) flat.genderPayGap        = input.genderPayGap
  if (input.trainingHours       != null) flat.trainingHours       = input.trainingHours
  if (input.absenteeismRate     != null) flat.absenteeismRate     = input.absenteeismRate
  if (input.workplaceAccidents  != null) flat.workplaceAccidents  = input.workplaceAccidents
  if (input.boardFemaleRatio    != null) flat.boardFemaleRatio    = input.boardFemaleRatio
  if (input.hasEthicsCode       != null) flat.hasEthicsCode       = input.hasEthicsCode
  if (input.hasAnticorruption   != null) flat.hasAnticorruption   = input.hasAnticorruption

  // Compute scope CO₂ from sub-fields (ADEME factors)
  if (input.scope1Details) {
    const s1 = input.scope1Details
    flat.scope1Tco2e = ((s1.naturalGas ?? 0) * 0.205) + ((s1.fuelOil ?? 0) * 0.00271) + ((s1.vehicles ?? 0) * 0.00244) + (s1.process ?? 0)
  }
  if (input.scope2Kwh !== undefined) {
    flat.scope2Tco2e = input.scope2Kwh * 0.0000571
  }
  if (input.scope3Details) {
    const s3 = input.scope3Details
    flat.scope3Tco2e = ((s3.businessTravel ?? 0) * 0.000255) + ((s3.freight ?? 0) * 0.000062) + ((s3.waste ?? 0) * 0.00000449) + ((s3.purchasedGoods ?? 0) * 0.30)
  }
  if (input.scope1Tco2e != null) flat.scope1Tco2e = input.scope1Tco2e
  if (input.scope2Tco2e != null) flat.scope2Tco2e = input.scope2Tco2e
  if (input.scope3Tco2e != null) flat.scope3Tco2e = input.scope3Tco2e

  return upsertEsgData(companyId, flat)
}

// ── Score ─────────────────────────────────────────────────────────────────────
export async function getEsgScore(companyId: string, year: number) {
  const record = await prisma.eSGData.findUnique({
    where: { companyId_year: { companyId, year } },
  })
  if (!record) return null

  const n = (v: Prisma.Decimal | null | undefined): number | null =>
    v != null ? Number(v) : null

  const energyKwh          = n(record.energyKwh)
  const wasteKg             = n(record.wasteKg)
  const renewableRatio      = n(record.renewableRatio)
  const scope1              = n(record.scope1Tco2e) ?? 0
  const scope2              = n(record.scope2Tco2e) ?? 0
  const scope3              = n(record.scope3Tco2e) ?? 0
  const genderPayGap        = n(record.genderPayGap)
  const trainingHours       = n(record.trainingHours)
  const absenteeismRate     = n(record.absenteeismRate)
  const workplaceAccidents  = record.workplaceAccidents
  const boardFemaleRatio    = n(record.boardFemaleRatio)
  const hasEthicsCode       = record.hasEthicsCode
  const hasAnticorruption   = record.hasAnticorruption

  const e = scoreE(energyKwh, wasteKg, renewableRatio)
  const s = scoreS(genderPayGap, trainingHours, absenteeismRate)
  const g = scoreG(boardFemaleRatio, hasEthicsCode, hasAnticorruption)
  const global = (e + s + g) / 3

  return {
    year,
    scores: {
      environnement: Math.round(e),
      social:        Math.round(s),
      gouvernance:   Math.round(g),
      global:        Math.round(global),
    },
    co2: {
      scope1,
      scope2,
      scope3,
      total: +(scope1 + scope2 + scope3).toFixed(4),
    },
    indicators: {
      energyKwh,
      wasteKg,
      renewableRatio,
      genderPayGap,
      trainingHours,
      absenteeismRate,
      workplaceAccidents,
      boardFemaleRatio,
      hasEthicsCode,
      hasAnticorruption,
    },
  }
}

// ── Benchmark ─────────────────────────────────────────────────────────────────
export async function getBenchmark(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)
  if (!score) return null

  return {
    year,
    company: score.scores,
    sector: { environnement: 52, social: 58, gouvernance: 64, global: 58 },
    indicators: [
      { label: 'Énergie (MWh)',         company: (score.indicators.energyKwh ?? 0) / 1000,       bench: BENCH.energyKwh / 1000,   unit: 'MWh', lowerBetter: true  },
      { label: 'Déchets (t)',           company: (score.indicators.wasteKg ?? 0) / 1000,         bench: BENCH.wasteKg / 1000,     unit: 't',   lowerBetter: true  },
      { label: 'Énergies renouvelables', company: score.indicators.renewableRatio ?? 0,          bench: BENCH.renewableRatio,     unit: '%',   lowerBetter: false },
      { label: 'Écart salarial H/F',    company: score.indicators.genderPayGap ?? 0,             bench: BENCH.genderPayGap,       unit: '%',   lowerBetter: true  },
      { label: 'Formation (h/salarié)', company: score.indicators.trainingHours ?? 0,            bench: BENCH.trainingHours,      unit: 'h',   lowerBetter: false },
      { label: 'Absentéisme',           company: score.indicators.absenteeismRate ?? 0,          bench: BENCH.absenteeismRate,    unit: '%',   lowerBetter: true  },
      { label: 'Femmes au CA',          company: score.indicators.boardFemaleRatio ?? 0,         bench: BENCH.boardFemaleRatio,   unit: '%',   lowerBetter: false },
    ],
  }
}

// ── CSRD Report ───────────────────────────────────────────────────────────────
export async function getCsrdReport(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)
  if (!score) return null
  const ind   = score.indicators

  const materialite = [
    { esrs: 'E1',    topic: 'Énergie & climat',               pilier: 'E', materiel: (ind.energyKwh ?? 0) > 100_000, valeur: `${((ind.energyKwh ?? 0) / 1000).toFixed(0)} MWh`,         details: 'Consommation énergétique annuelle' },
    { esrs: 'E1',    topic: 'Émissions GES Scope 1+2+3',      pilier: 'E', materiel: score.co2.total > 50,           valeur: `${score.co2.total.toFixed(1)} tCO₂e`,                        details: 'Total émissions carbone' },
    { esrs: 'E5',    topic: 'Déchets & économie circulaire',   pilier: 'E', materiel: (ind.wasteKg ?? 0) > 500,      valeur: `${((ind.wasteKg ?? 0) / 1000).toFixed(1)} t`,               details: 'Déchets produits' },
    { esrs: 'S1-1',  topic: 'Effectifs & conditions travail',  pilier: 'S', materiel: true,                          valeur: '—',                                                          details: 'Traitement obligatoire CSRD' },
    { esrs: 'S1-16', topic: 'Égalité salariale H/F',           pilier: 'S', materiel: (ind.genderPayGap ?? 0) > 3,  valeur: `${ind.genderPayGap ?? '—'} %`,                               details: 'Index égalité professionnelle' },
    { esrs: 'S1-13', topic: 'Formation & développement',       pilier: 'S', materiel: (ind.trainingHours ?? 0) < 20, valeur: `${ind.trainingHours ?? '—'} h`,                             details: 'Heures de formation/salarié/an' },
    { esrs: 'G1',    topic: 'Gouvernance & éthique',           pilier: 'G', materiel: !ind.hasEthicsCode,            valeur: ind.hasEthicsCode ? 'Code publié' : 'Absent',                 details: 'Code de conduite éthique' },
    { esrs: 'G1',    topic: "Parité au conseil d'administration", pilier: 'G', materiel: (ind.boardFemaleRatio ?? 0) < 40, valeur: `${ind.boardFemaleRatio ?? '—'} %`,                  details: 'Représentation des femmes au CA' },
  ]

  const recommandations = [
    ...((ind.genderPayGap ?? 0) > 5     ? [{ priorite: 'ÉLEVÉ',  pilier: 'S', action: "Réduire l'écart salarial H/F — Loi Pénicaud (cible ≤ 5%)" }]        : []),
    ...((ind.trainingHours ?? 0) < 24   ? [{ priorite: 'MOYEN',  pilier: 'S', action: 'Renforcer les formations (cible ≥ 24 h/salarié/an)' }]              : []),
    ...(score.co2.total > 100           ? [{ priorite: 'ÉLEVÉ',  pilier: 'E', action: 'Réduire les émissions GES — plan de décarbonation requis' }]         : []),
    ...((ind.renewableRatio ?? 0) < 20  ? [{ priorite: 'MOYEN',  pilier: 'E', action: "Augmenter la part d'énergies renouvelables (cible ≥ 20%)" }]        : []),
    ...(!ind.hasEthicsCode              ? [{ priorite: 'ÉLEVÉ',  pilier: 'G', action: 'Publier un code de conduite éthique (obligation CSRD)' }]            : []),
    ...(!ind.hasAnticorruption          ? [{ priorite: 'MOYEN',  pilier: 'G', action: "Mettre en place un dispositif anti-corruption (Loi Sapin II)" }]     : []),
    ...((ind.boardFemaleRatio ?? 0) < 40 ? [{ priorite: 'MOYEN', pilier: 'G', action: 'Améliorer la parité au CA (cible ≥ 40% — Loi Copé-Zimmermann)' }]  : []),
  ]

  return {
    year,
    generatedAt:  new Date().toISOString(),
    scores:       score.scores,
    co2:          score.co2,
    materialite,
    recommandations,
    conformiteCSRD: score.scores.global >= 60,
  }
}

// ── Actions — CRUD complet ────────────────────────────────────────────────────
export async function listActions(companyId: string, year?: number) {
  return prisma.esgAction.findMany({
    where: { companyId, ...(year ? { targetYear: year } : {}) },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function createAction(companyId: string, data: {
  title:       string
  description?: string | null
  pilier:      string
  priority?:   string
  status?:     string
  targetYear:  number
  deadline?:   string | null
  owner?:      string | null
  kpiTarget?:  string | null
  co2Saving?:  number | null
}) {
  return prisma.esgAction.create({
    data: {
      companyId,
      title:       data.title,
      description: data.description ?? null,
      pilier:      data.pilier as import('@prisma/client').EsgPilier,
      priority:    (data.priority ?? 'MEDIUM') as import('@prisma/client').EsgActionPriority,
      status:      (data.status ?? 'TODO') as import('@prisma/client').EsgActionStatus,
      targetYear:  data.targetYear,
      deadline:    data.deadline ? new Date(data.deadline) : null,
      owner:       data.owner ?? null,
      kpiTarget:   data.kpiTarget ?? null,
      co2Saving:   data.co2Saving != null ? new Prisma.Decimal(data.co2Saving) : null,
    },
  })
}

export async function updateAction(companyId: string, id: string, data: {
  title?:       string
  description?: string | null
  status?:      string
  priority?:    string
  owner?:       string | null
  kpiTarget?:   string | null
  kpiCurrent?:  string | null
  deadline?:    string | null
  co2Saving?:   number | null
}) {
  // Verify ownership
  const existing = await prisma.esgAction.findFirst({ where: { id, companyId } })
  if (!existing) throw new AppError('Action not found', 404, 'NOT_FOUND')

  return prisma.esgAction.update({
    where: { id },
    data: {
      ...(data.title       !== undefined ? { title:       data.title }                                                           : {}),
      ...(data.description !== undefined ? { description: data.description }                                                     : {}),
      ...(data.status      !== undefined ? { status:      data.status as import('@prisma/client').EsgActionStatus }              : {}),
      ...(data.priority    !== undefined ? { priority:    data.priority as import('@prisma/client').EsgActionPriority }          : {}),
      ...(data.owner       !== undefined ? { owner:       data.owner }                                                           : {}),
      ...(data.kpiTarget   !== undefined ? { kpiTarget:   data.kpiTarget }                                                       : {}),
      ...(data.kpiCurrent  !== undefined ? { kpiCurrent:  data.kpiCurrent }                                                      : {}),
      ...(data.deadline    !== undefined ? { deadline:    data.deadline ? new Date(data.deadline) : null }                       : {}),
      ...(data.co2Saving   !== undefined ? { co2Saving:   data.co2Saving != null ? new Prisma.Decimal(data.co2Saving) : null }   : {}),
    },
  })
}

export async function deleteAction(companyId: string, id: string) {
  const existing = await prisma.esgAction.findFirst({ where: { id, companyId } })
  if (!existing) throw new AppError('Action not found', 404, 'NOT_FOUND')
  await prisma.esgAction.delete({ where: { id } })
  return { deleted: true }
}

export async function actionStats(companyId: string) {
  const [total, todo, inProgress, done, co2Agg] = await Promise.all([
    prisma.esgAction.count({ where: { companyId } }),
    prisma.esgAction.count({ where: { companyId, status: 'TODO' } }),
    prisma.esgAction.count({ where: { companyId, status: 'IN_PROGRESS' } }),
    prisma.esgAction.count({ where: { companyId, status: 'DONE' } }),
    prisma.esgAction.aggregate({ where: { companyId, status: { in: ['IN_PROGRESS', 'DONE'] } }, _sum: { co2Saving: true } }),
  ])
  return {
    total,
    todo,
    inProgress,
    done,
    co2Saving: Number(co2Agg._sum.co2Saving ?? 0),
  }
}
