import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { AssetCategory, AssetStatus, DeprecMode } from '@prisma/client'

export interface AssetInput {
  designation:      string
  accountNumber:    string
  category:         AssetCategory
  acquisitionDate:  string
  serviceDate?:     string
  grossValue:       number
  residualValue?:   number
  depreciationMode: DeprecMode
  usefulLifeYears:  number
  supplier?:        string
  serialNumber?:    string
  location?:        string
  notes?:           string
}

// ── Depreciation calculation ───────────────────────────────────────────────────

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

function calcLinearAnnual(grossValue: number, usefulLifeYears: number): number {
  return grossValue / usefulLifeYears
}

function calcProrataTemporis(
  grossValue: number,
  usefulLifeYears: number,
  acquisitionDate: Date,
  year: number,
): number {
  const annual = calcLinearAnnual(grossValue, usefulLifeYears)
  const endOfYear = new Date(year, 11, 31)
  const startOfYear = new Date(year, 0, 1)

  // First year: prorata from acquisition
  if (acquisitionDate.getFullYear() === year) {
    const daysInYear = isLeapYear(year) ? 366 : 365
    const daysHeld   = Math.floor(
      (endOfYear.getTime() - acquisitionDate.getTime()) / 86_400_000,
    ) + 1
    return annual * (daysHeld / daysInYear)
  }

  // Last year: remaining value
  const lastYear = acquisitionDate.getFullYear() + usefulLifeYears - 1
  if (year === lastYear) {
    const daysInYear = isLeapYear(year) ? 366 : 365
    const daysHeld   = Math.floor(
      (endOfYear.getTime() - startOfYear.getTime()) / 86_400_000,
    ) + 1
    return annual * (daysHeld / daysInYear)
  }

  return annual
}

// Calculate cumulative depreciation up to (but not including) a given year
function calcCumulativeDepreciation(
  grossValue: number,
  residualValue: number,
  usefulLifeYears: number,
  acquisitionDate: Date,
  upToYear: number, // exclusive — cumulative through year-1
): number {
  const acqYear = acquisitionDate.getFullYear()
  let cumul = 0
  for (let y = acqYear; y < upToYear; y++) {
    const dot = calcProrataTemporis(grossValue, usefulLifeYears, acquisitionDate, y)
    cumul += dot
    if (cumul >= grossValue - residualValue) {
      cumul = grossValue - residualValue
      break
    }
  }
  return cumul
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function listAssets(
  companyId: string,
  filters: { category?: AssetCategory; status?: AssetStatus } = {},
) {
  return prisma.asset.findMany({
    where:   { companyId, ...filters },
    include: { depreciations: { orderBy: { year: 'asc' } } },
    orderBy: { acquisitionDate: 'asc' },
  })
}

export async function getAsset(companyId: string, id: string) {
  const a = await prisma.asset.findFirst({
    where:   { id, companyId },
    include: { depreciations: true },
  })
  if (!a) throw new AppError('Immobilisation introuvable', 404, 'NOT_FOUND')
  return a
}

export async function createAsset(companyId: string, input: AssetInput) {
  const rate = Math.round((1 / input.usefulLifeYears) * 10000) / 10000

  return prisma.asset.create({
    data: {
      companyId,
      designation:      input.designation,
      accountNumber:    input.accountNumber,
      category:         input.category,
      acquisitionDate:  new Date(input.acquisitionDate),
      serviceDate:      input.serviceDate ? new Date(input.serviceDate) : null,
      grossValue:       input.grossValue,
      residualValue:    input.residualValue ?? 0,
      depreciationMode: input.depreciationMode,
      usefulLifeYears:  input.usefulLifeYears,
      depreciationRate: rate,
      supplier:         input.supplier ?? null,
      serialNumber:     input.serialNumber ?? null,
      location:         input.location ?? null,
      notes:            input.notes ?? null,
    },
  })
}

export async function updateAsset(companyId: string, id: string, input: Partial<AssetInput>) {
  const existing = await getAsset(companyId, id)
  const usefulLifeYears = input.usefulLifeYears ?? existing.usefulLifeYears
  const rate = Math.round((1 / usefulLifeYears) * 10000) / 10000

  return prisma.asset.update({
    where: { id },
    data: {
      ...input,
      acquisitionDate:  input.acquisitionDate ? new Date(input.acquisitionDate) : undefined,
      serviceDate:      input.serviceDate ? new Date(input.serviceDate) : undefined,
      usefulLifeYears,
      depreciationRate: rate,
    },
  })
}

export async function deleteAsset(companyId: string, id: string) {
  await getAsset(companyId, id)
  return prisma.asset.delete({ where: { id } })
}

// ── Summary / KPIs ────────────────────────────────────────────────────────────

export async function getAssetsSummary(companyId: string, year: number) {
  const assets = await prisma.asset.findMany({
    where:   { companyId, status: { in: ['IN_SERVICE', 'IN_PROGRESS'] } },
    include: { depreciations: true },
  })

  let grossTotal   = 0
  let dotationYear = 0
  const byCategory: Record<string, { brut: number; amort: number; net: number }> = {}

  for (const a of assets) {
    const gv   = Number(a.grossValue)
    const rv   = Number(a.residualValue)
    const acqD = new Date(a.acquisitionDate)

    grossTotal += gv

    const cumStart = calcCumulativeDepreciation(gv, rv, a.usefulLifeYears, acqD, year)
    const dot      = Math.min(
      calcProrataTemporis(gv, a.usefulLifeYears, acqD, year),
      Math.max(0, gv - rv - cumStart),
    )
    const cumEnd = Math.min(cumStart + dot, gv - rv)

    dotationYear += dot

    const cat = a.accountNumber.startsWith('244') ? 'Matériel informatique'
              : a.accountNumber.startsWith('2446') || a.accountNumber.startsWith('245') ? 'Mobilier & agencement'
              : String(a.category)

    if (!byCategory[cat]) byCategory[cat] = { brut: 0, amort: 0, net: 0 }
    byCategory[cat].brut  += gv
    byCategory[cat].amort += cumEnd
    byCategory[cat].net   += gv - cumEnd
  }

  // Total cumul at END of year
  const cumulEnd = assets.reduce((s, a) => {
    const gv   = Number(a.grossValue)
    const rv   = Number(a.residualValue)
    const acqD = new Date(a.acquisitionDate)
    const cumS = calcCumulativeDepreciation(gv, rv, a.usefulLifeYears, acqD, year)
    const dot  = Math.min(
      calcProrataTemporis(gv, a.usefulLifeYears, acqD, year),
      Math.max(0, gv - rv - cumS),
    )
    return s + Math.min(cumS + dot, gv - rv)
  }, 0)

  return {
    grossTotal:  Math.round(grossTotal),
    cumulAmort:  Math.round(cumulEnd),
    netValue:    Math.round(grossTotal - cumulEnd),
    dotation:    Math.round(dotationYear),
    byCategory:  Object.entries(byCategory).map(([cat, v]) => ({
      category:  cat,
      brut:      Math.round(v.brut),
      amort:     Math.round(v.amort),
      net:       Math.round(v.net),
    })),
  }
}

// ── Depreciation table ────────────────────────────────────────────────────────

export async function getDepreciationTable(companyId: string, year: number) {
  const assets = await prisma.asset.findMany({
    where:   { companyId },
    include: { depreciations: { orderBy: { year: 'asc' } } },
    orderBy: { acquisitionDate: 'asc' },
  })

  const rows = assets
    .filter(a => a.status !== 'DISPOSED' && a.status !== 'SCRAPPED')
    .map(a => {
      const gv   = Number(a.grossValue)
      const rv   = Number(a.residualValue)
      const acqD = new Date(a.acquisitionDate)

      const openingAmort = calcCumulativeDepreciation(gv, rv, a.usefulLifeYears, acqD, year)
      const dotation     = Math.min(
        calcProrataTemporis(gv, a.usefulLifeYears, acqD, year),
        Math.max(0, gv - rv - openingAmort),
      )
      const closingAmort = Math.min(openingAmort + dotation, gv - rv)

      return {
        id:             a.id,
        designation:    a.designation,
        accountNumber:  a.accountNumber,
        grossValue:     Math.round(gv),
        openingAmort:   Math.round(openingAmort),
        dotation:       Math.round(dotation),
        closingAmort:   Math.round(closingAmort),
        closingValue:   Math.round(gv - closingAmort),
        entryGenerated: a.depreciations.some(d => d.year === year && d.entryGenerated),
      }
    })

  const totals = rows.reduce(
    (s, r) => ({
      grossValue:   s.grossValue   + r.grossValue,
      openingAmort: s.openingAmort + r.openingAmort,
      dotation:     s.dotation     + r.dotation,
      closingAmort: s.closingAmort + r.closingAmort,
      closingValue: s.closingValue + r.closingValue,
    }),
    { grossValue: 0, openingAmort: 0, dotation: 0, closingAmort: 0, closingValue: 0 },
  )

  return { year, rows, totals }
}

// ── Depreciation schedule (per asset) ────────────────────────────────────────

export async function getAssetSchedule(companyId: string, assetId: string) {
  const a = await getAsset(companyId, assetId)
  const gv   = Number(a.grossValue)
  const rv   = Number(a.residualValue)
  const acqD = new Date(a.acquisitionDate)
  const acqY = acqD.getFullYear()
  const endY = acqY + a.usefulLifeYears - 1

  const schedule = []
  let cumul = 0
  for (let y = acqY; y <= endY; y++) {
    const dot = Math.min(
      calcProrataTemporis(gv, a.usefulLifeYears, acqD, y),
      Math.max(0, gv - rv - cumul),
    )
    cumul = Math.min(cumul + dot, gv - rv)
    schedule.push({
      year:       y,
      dotation:   Math.round(dot),
      cumulAmort: Math.round(cumul),
      netValue:   Math.round(gv - cumul),
    })
    if (cumul >= gv - rv) break
  }

  return {
    asset: {
      id:               a.id,
      designation:      a.designation,
      accountNumber:    a.accountNumber,
      grossValue:       gv,
      usefulLifeYears:  a.usefulLifeYears,
      depreciationRate: Number(a.depreciationRate),
      depreciationMode: a.depreciationMode,
    },
    schedule,
  }
}

// ── Generate depreciation journal entries ────────────────────────────────────

export async function generateDepreciationEntries(companyId: string, year: number) {
  const assets = await prisma.asset.findMany({
    where:   { companyId, status: 'IN_SERVICE' },
    include: { depreciations: { where: { year } } },
  })

  let generated = 0
  for (const a of assets) {
    // Idempotent: skip if already generated
    if (a.depreciations[0]?.entryGenerated) continue

    const gv   = Number(a.grossValue)
    const rv   = Number(a.residualValue)
    const acqD = new Date(a.acquisitionDate)

    const openingAmort = calcCumulativeDepreciation(gv, rv, a.usefulLifeYears, acqD, year)
    const dotation     = Math.min(
      calcProrataTemporis(gv, a.usefulLifeYears, acqD, year),
      Math.max(0, gv - rv - openingAmort),
    )
    if (dotation <= 0) continue

    const closingAmort = Math.min(openingAmort + dotation, gv - rv)

    await prisma.assetDepreciation.upsert({
      where:  { assetId_year: { assetId: a.id, year } },
      update: {
        openingValue:   gv - openingAmort,
        depreciationAmt: dotation,
        closingValue:   gv - closingAmort,
        entryGenerated: true,
      },
      create: {
        assetId:        a.id,
        fiscalYearId:   '',
        year,
        openingValue:   gv - openingAmort,
        depreciationAmt: dotation,
        closingValue:   gv - closingAmort,
        entryGenerated: true,
      },
    })
    generated++
  }

  return { generated }
}
