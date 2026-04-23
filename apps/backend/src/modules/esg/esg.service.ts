import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { UpsertEsgInput, CreateActionInput, UpdateActionInput } from './esg.dto.js'

// ── Emission factors (GHG Protocol / ADEME 2024) ──────────────────────────────
const EF = {
  naturalGas:     0.205,  // tCO2e / MWh PCI
  fuelOil:        0.00271,// tCO2e / litre
  vehicleFuel:    0.00244,// tCO2e / litre
  electricity:    0.0000571, // tCO2e / kWh — réseau France RTE 2024
  businessTravel: 0.000255,  // tCO2e / km (avion court-courrier moyen)
  freight:        0.000062,  // tCO2e / tonne-km (routier)
  waste:          0.00000449,// tCO2e / kg (enfouissement)
  purchasedGoods: 0.30,      // tCO2e / k€ achat moyen
}

// ── Sector benchmarks (PME française, données ADEME secteur services) ─────────
const BENCH = {
  co2Total:     50,      // tCO2e/an — médiane secteur
  energyKwh:    200_000, // kWh/an
  wasteKg:      2_000,
  genderPayGap: 8,       // %
  trainingHours: 24,     // h/salarié
  absenteeism:  4.5,     // %
  boardFemale:  35,      // %
}

function n(v: Prisma.Decimal | null | undefined): number | null {
  return v == null ? null : Number(v)
}

// ── Scope calculations ────────────────────────────────────────────────────────
function computeScope1(details: Record<string, number | undefined> | null | undefined): number {
  if (!details) return 0
  return (
    ((details.naturalGas  ?? 0) * EF.naturalGas) +
    ((details.fuelOil     ?? 0) * EF.fuelOil) +
    ((details.vehicles    ?? 0) * EF.vehicleFuel) +
    ((details.process     ?? 0))
  )
}

function computeScope2(kwh: number | null): number {
  if (!kwh) return 0
  return kwh * EF.electricity
}

function computeScope3(details: Record<string, number | undefined> | null | undefined): number {
  if (!details) return 0
  return (
    ((details.businessTravel ?? 0) * EF.businessTravel) +
    ((details.freight        ?? 0) * EF.freight) +
    ((details.waste          ?? 0) * EF.waste) +
    ((details.purchasedGoods ?? 0) * EF.purchasedGoods)
  )
}

// ── Scoring ───────────────────────────────────────────────────────────────────
function scoreE(co2: number, energy: number | null, waste: number | null, renewable: number | null): number {
  const scores: number[] = []
  const co2Bench = BENCH.co2Total
  scores.push(Math.max(0, Math.min(100, (1 - co2 / (co2Bench * 2)) * 100)))
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

// ── CRUD data ─────────────────────────────────────────────────────────────────
export async function listEsgYears(companyId: string) {
  const records = await prisma.eSGData.findMany({
    where: { companyId }, select: { year: true }, orderBy: { year: 'desc' },
  })
  return records.map(r => r.year)
}

export async function getEsgData(companyId: string, year: number) {
  const data = await prisma.eSGData.findUnique({ where: { companyId_year: { companyId, year } } })
  if (!data) throw new AppError(`No ESG data for year ${year}`, 404, 'NOT_FOUND')
  return data
}

export async function upsertEsgData(companyId: string, input: UpsertEsgInput) {
  const s1 = computeScope1(input.scope1Details as Record<string, number> | undefined)
  const s2 = computeScope2(input.scope2Kwh ?? null)
  const s3 = computeScope3(input.scope3Details as Record<string, number> | undefined)

  const fields = {
    year:               input.year,
    scope1Total:        s1 > 0 ? new Prisma.Decimal(+s1.toFixed(2)) : null,
    scope1Details:      (input.scope1Details ?? null) as never,
    scope2Total:        s2 > 0 ? new Prisma.Decimal(+s2.toFixed(2)) : null,
    scope2Kwh:          input.scope2Kwh != null ? new Prisma.Decimal(input.scope2Kwh) : null,
    scope3Total:        s3 > 0 ? new Prisma.Decimal(+s3.toFixed(2)) : null,
    scope3Details:      (input.scope3Details ?? null) as never,
    energyKwh:          input.energyKwh != null ? new Prisma.Decimal(input.energyKwh) : null,
    wasteKg:            input.wasteKg   != null ? new Prisma.Decimal(input.wasteKg) : null,
    renewableRatio:     input.renewableRatio     != null ? new Prisma.Decimal(input.renewableRatio) : null,
    genderPayGap:       input.genderPayGap       != null ? new Prisma.Decimal(input.genderPayGap) : null,
    trainingHours:      input.trainingHours      != null ? new Prisma.Decimal(input.trainingHours) : null,
    absenteeismRate:    input.absenteeismRate     != null ? new Prisma.Decimal(input.absenteeismRate) : null,
    workplaceAccidents: input.workplaceAccidents  ?? null,
    boardFemaleRatio:   input.boardFemaleRatio    != null ? new Prisma.Decimal(input.boardFemaleRatio) : null,
    hasEthicsCode:      input.hasEthicsCode       ?? false,
    hasAnticorruption:  input.hasAnticorruption   ?? false,
  }

  return prisma.eSGData.upsert({
    where: { companyId_year: { companyId, year: input.year } },
    update: fields,
    create: { companyId, ...fields },
  })
}

// ── Score ─────────────────────────────────────────────────────────────────────
export async function getEsgScore(companyId: string, year: number) {
  const raw = await getEsgData(companyId, year)

  const co2 = (n(raw.scope1Total) ?? 0) + (n(raw.scope2Total) ?? 0) + (n(raw.scope3Total) ?? 0)
  const e = scoreE(co2, n(raw.energyKwh), n(raw.wasteKg), n(raw.renewableRatio))
  const s = scoreS(n(raw.genderPayGap), n(raw.trainingHours), n(raw.absenteeismRate))
  const g = scoreG(n(raw.boardFemaleRatio), raw.hasEthicsCode, raw.hasAnticorruption)
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
      scope1: n(raw.scope1Total) ?? 0,
      scope2: n(raw.scope2Total) ?? 0,
      scope3: n(raw.scope3Total) ?? 0,
      total:  +co2.toFixed(2),
    },
    indicators: {
      energyKwh:         n(raw.energyKwh),
      wasteKg:           n(raw.wasteKg),
      renewableRatio:    n(raw.renewableRatio),
      genderPayGap:      n(raw.genderPayGap),
      trainingHours:     n(raw.trainingHours),
      absenteeismRate:   n(raw.absenteeismRate),
      workplaceAccidents: raw.workplaceAccidents,
      boardFemaleRatio:  n(raw.boardFemaleRatio),
      hasEthicsCode:     raw.hasEthicsCode,
      hasAnticorruption: raw.hasAnticorruption,
    },
  }
}

// ── Benchmark ─────────────────────────────────────────────────────────────────
export async function getBenchmark(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)
  const raw   = await getEsgData(companyId, year)
  const co2   = score.co2.total

  return {
    year,
    company: score.scores,
    sector: { environnement: 52, social: 58, gouvernance: 64, global: 58 }, // benchmarks sectoriels
    indicators: [
      { label: 'CO₂ total (tCO2e)',    company: co2,                                bench: BENCH.co2Total,     unit: 'tCO2e', lowerBetter: true },
      { label: 'Énergie (MWh)',        company: (n(raw.energyKwh) ?? 0) / 1000,     bench: BENCH.energyKwh / 1000, unit: 'MWh', lowerBetter: true },
      { label: 'Déchets (t)',          company: (n(raw.wasteKg) ?? 0) / 1000,       bench: BENCH.wasteKg / 1000,   unit: 't',   lowerBetter: true },
      { label: 'Écart salarial H/F',   company: n(raw.genderPayGap) ?? 0,            bench: BENCH.genderPayGap,  unit: '%',   lowerBetter: true },
      { label: 'Formation (h/salarié)',company: n(raw.trainingHours) ?? 0,           bench: BENCH.trainingHours, unit: 'h',   lowerBetter: false },
      { label: 'Absentéisme',          company: n(raw.absenteeismRate) ?? 0,         bench: BENCH.absenteeism,   unit: '%',   lowerBetter: true },
      { label: 'Femmes CA (%)',        company: n(raw.boardFemaleRatio) ?? 0,        bench: BENCH.boardFemale,   unit: '%',   lowerBetter: false },
    ],
  }
}

// ── CSRD Report ───────────────────────────────────────────────────────────────
export async function getCsrdReport(companyId: string, year: number) {
  const score = await getEsgScore(companyId, year)
  const co2 = score.co2

  const materialite = [
    { esrs: 'E1',    topic: 'Changement climatique',          pilier: 'E', materiel: co2.total > 10,                                           valeur: `${co2.total.toFixed(1)} tCO2e`,   details: `Scope 1: ${co2.scope1.toFixed(1)} | Scope 2: ${co2.scope2.toFixed(1)} | Scope 3: ${co2.scope3.toFixed(1)}` },
    { esrs: 'E2',    topic: 'Pollution',                      pilier: 'E', materiel: (score.indicators.wasteKg ?? 0) > 500,                   valeur: `${((score.indicators.wasteKg ?? 0)/1000).toFixed(1)} t`, details: 'Déchets produits' },
    { esrs: 'E7',    topic: 'Énergie',                        pilier: 'E', materiel: (score.indicators.energyKwh ?? 0) > 100_000,             valeur: `${((score.indicators.energyKwh ?? 0)/1000).toFixed(0)} MWh`, details: `EnR : ${score.indicators.renewableRatio ?? '—'}%` },
    { esrs: 'S1-1',  topic: 'Effectifs & conditions travail', pilier: 'S', materiel: true,                                                     valeur: '—',                               details: 'Traitement obligatoire' },
    { esrs: 'S1-16', topic: 'Égalité salariale H/F',          pilier: 'S', materiel: (score.indicators.genderPayGap ?? 0) > 3,               valeur: `${score.indicators.genderPayGap ?? '—'} %`, details: 'Index égalité professionnelle' },
    { esrs: 'S1-13', topic: 'Formation & développement',      pilier: 'S', materiel: (score.indicators.trainingHours ?? 0) < 20,             valeur: `${score.indicators.trainingHours ?? '—'} h`, details: 'Heures/salarié/an' },
    { esrs: 'S1-14', topic: 'Santé & sécurité',               pilier: 'S', materiel: (score.indicators.workplaceAccidents ?? 0) > 0,         valeur: `${score.indicators.workplaceAccidents ?? 0} acc.`, details: 'Accidents du travail' },
    { esrs: 'G1-1',  topic: 'Éthique & code de conduite',     pilier: 'G', materiel: !score.indicators.hasEthicsCode,                        valeur: score.indicators.hasEthicsCode ? 'Oui' : 'Non', details: 'Code éthique formalisé' },
    { esrs: 'G1-3',  topic: 'Prévention corruption',          pilier: 'G', materiel: !score.indicators.hasAnticorruption,                    valeur: score.indicators.hasAnticorruption ? 'Oui' : 'Non', details: 'Politique anticorruption' },
    { esrs: 'G1-6',  topic: 'Gouvernance (% femmes CA)',       pilier: 'G', materiel: (score.indicators.boardFemaleRatio ?? 0) < 40,          valeur: `${score.indicators.boardFemaleRatio ?? '—'} %`, details: 'Cible loi Rixain : 40% d\'ici 2026' },
  ]

  const recommandations = [
    ...(co2.total > BENCH.co2Total           ? [{ priorite: 'CRITIQUE', pilier: 'E', action: 'Réduire les émissions CO₂ : auditer les postes Scope 1 et 3' }] : []),
    ...((score.indicators.renewableRatio ?? 0) < 50 ? [{ priorite: 'MOYEN', pilier: 'E', action: 'Augmenter la part d\'énergies renouvelables (cible 50%)' }] : []),
    ...((score.indicators.genderPayGap ?? 0) > 5    ? [{ priorite: 'ÉLEVÉ', pilier: 'S', action: 'Réduire l\'écart salarial H/F (Loi Pénicaud)' }] : []),
    ...((score.indicators.trainingHours ?? 0) < 24  ? [{ priorite: 'MOYEN', pilier: 'S', action: 'Renforcer les formations (cible 24h/salarié/an)' }] : []),
    ...(!score.indicators.hasEthicsCode              ? [{ priorite: 'ÉLEVÉ', pilier: 'G', action: 'Formaliser un code d\'éthique d\'entreprise' }] : []),
    ...(!score.indicators.hasAnticorruption          ? [{ priorite: 'ÉLEVÉ', pilier: 'G', action: 'Déployer une politique anticorruption (Loi Sapin II)' }] : []),
  ]

  return {
    year,
    generatedAt:    new Date().toISOString(),
    scores:         score.scores,
    co2,
    materialite,
    recommandations,
    conformiteCSRD: score.scores.global >= 60,
  }
}

// ── Action plan ───────────────────────────────────────────────────────────────
export async function listActions(companyId: string, year?: number) {
  return prisma.esgAction.findMany({
    where: {
      companyId,
      ...(year ? { targetYear: year } : {}),
    },
    orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
  })
}

export async function createAction(companyId: string, data: CreateActionInput) {
  return prisma.esgAction.create({
    data: {
      companyId,
      title:       data.title,
      description: data.description,
      pilier:      data.pilier,
      priority:    data.priority,
      targetYear:  data.targetYear,
      deadline:    data.deadline,
      owner:       data.owner,
      kpiTarget:   data.kpiTarget,
      co2Saving:   data.co2Saving != null ? new Prisma.Decimal(data.co2Saving) : null,
    },
  })
}

export async function updateAction(companyId: string, id: string, data: UpdateActionInput) {
  const existing = await prisma.esgAction.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.esgAction.update({
    where: { id },
    data: {
      ...(data.title       ? { title: data.title }             : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.status      ? { status: data.status }           : {}),
      ...(data.priority    ? { priority: data.priority }       : {}),
      ...(data.deadline    !== undefined ? { deadline: data.deadline } : {}),
      ...(data.owner       !== undefined ? { owner: data.owner } : {}),
      ...(data.kpiTarget   !== undefined ? { kpiTarget: data.kpiTarget } : {}),
      ...(data.kpiCurrent  !== undefined ? { kpiCurrent: data.kpiCurrent } : {}),
      ...(data.co2Saving   != null ? { co2Saving: new Prisma.Decimal(data.co2Saving) } : {}),
    },
  })
}

export async function deleteAction(companyId: string, id: string) {
  const existing = await prisma.esgAction.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.esgAction.delete({ where: { id } })
}

export async function actionStats(companyId: string) {
  const actions = await prisma.esgAction.findMany({ where: { companyId } })
  return {
    total:      actions.length,
    todo:       actions.filter(a => a.status === 'TODO').length,
    inProgress: actions.filter(a => a.status === 'IN_PROGRESS').length,
    done:       actions.filter(a => a.status === 'DONE').length,
    co2Saving:  actions.filter(a => a.status === 'DONE').reduce((s, a) => s + Number(a.co2Saving ?? 0), 0),
  }
}
