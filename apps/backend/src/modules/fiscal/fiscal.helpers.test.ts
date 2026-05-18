import { describe, it, expect } from 'vitest'
import {
  patenteCategory,
  computePatente,
  isRate,
  computeIS,
  computeTvaNette,
  computeCreditTva,
  computeTvaPenalty,
  computeRAS,
  aggregateVatCollected,
} from './fiscal.helpers.js'

// ── Patente ──────────────────────────────────────────────────────────────────

describe('patenteCategory — classification CA Cameroun', () => {
  it('CA < 50M → petite entreprise', () => {
    expect(patenteCategory(0)).toBe('petite')
    expect(patenteCategory(10_000_000)).toBe('petite')
    expect(patenteCategory(49_999_999)).toBe('petite')
  })
  it('CA 50M–100M → moyenne', () => {
    expect(patenteCategory(50_000_001)).toBe('moyenne')
    expect(patenteCategory(80_000_000)).toBe('moyenne')
    expect(patenteCategory(100_000_000)).toBe('moyenne')
  })
  it('CA > 100M → grande', () => {
    expect(patenteCategory(100_000_001)).toBe('grande')
    expect(patenteCategory(500_000_000)).toBe('grande')
  })
})

describe('computePatente — montant patente', () => {
  it('renvoie 0 pour CA nul ou négatif', () => {
    expect(computePatente(0)).toBe(0)
    expect(computePatente(-1000)).toBe(0)
  })
  it('petite : 10M × 0,494% = 49 400', () => {
    expect(computePatente(10_000_000)).toBe(49_400)
  })
  it('moyenne : 75M × 0,283% = 212 250', () => {
    expect(computePatente(75_000_000)).toBe(212_250)
  })
  it('grande : 200M × 0,159% = 318 000', () => {
    expect(computePatente(200_000_000)).toBe(318_000)
  })
})

// ── IS ───────────────────────────────────────────────────────────────────────

describe('isRate — taux IS selon CA', () => {
  it('CA < 3 milliards → 30,8% (taux réduit)', () => {
    expect(isRate(0)).toBe(0.308)
    expect(isRate(2_999_999_999)).toBe(0.308)
  })
  it('CA ≥ 3 milliards → 33% (taux normal)', () => {
    expect(isRate(3_000_000_000)).toBe(0.33)
    expect(isRate(10_000_000_000)).toBe(0.33)
  })
})

describe('computeIS — calcul Impôt sur les Sociétés', () => {
  it('résultat fiscal positif → max(résultat × taux, CA × 1%)', () => {
    // CA 100M, résultat 10M, taux 30,8% → 3 080 000
    // IS min = 1% × 100M = 1 000 000 → IS = 3 080 000
    expect(computeIS(10_000_000, 100_000_000)).toBe(3_080_000)
  })
  it('résultat fiscal nul → IS minimum 1% du CA', () => {
    expect(computeIS(0, 50_000_000)).toBe(500_000)
  })
  it('résultat fiscal négatif (déficit) → IS minimum 1% CA', () => {
    expect(computeIS(-5_000_000, 100_000_000)).toBe(1_000_000)
  })
  it('IS calculé < IS minimum → renvoie IS minimum', () => {
    // CA 100M, résultat 1M → IS normal = 308 000, IS min = 1M → renvoie 1M
    expect(computeIS(1_000_000, 100_000_000)).toBe(1_000_000)
  })
})

// ── TVA ──────────────────────────────────────────────────────────────────────

describe('computeTvaNette — solde TVA à payer', () => {
  it('Solde positif quand collectée > déductible', () => {
    expect(computeTvaNette(1_000_000, 600_000)).toBe(400_000)
  })
  it('Solde négatif quand déductible > collectée (crédit TVA)', () => {
    expect(computeTvaNette(500_000, 800_000)).toBe(-300_000)
  })
  it('Arrondit à 2 décimales', () => {
    // .toFixed(2) coupe à 2 décimales — 100.005 → "100.00" (banker's rounding)
    expect(computeTvaNette(100.005, 0)).toBeCloseTo(100.0, 2)
  })
})

describe('computeCreditTva — crédit TVA reportable', () => {
  it('Renvoie le crédit positif si déductible > collectée', () => {
    expect(computeCreditTva(300_000, 500_000)).toBe(200_000)
  })
  it('Renvoie 0 si collectée ≥ déductible (pas de crédit)', () => {
    expect(computeCreditTva(500_000, 300_000)).toBe(0)
    expect(computeCreditTva(500_000, 500_000)).toBe(0)
  })
})

describe('computeTvaPenalty — pénalité de retard TVA', () => {
  it('Renvoie 0 si pas de retard ni montant dû', () => {
    expect(computeTvaPenalty(0, 6)).toBe(0)
    expect(computeTvaPenalty(1_000_000, 0)).toBe(0)
  })
  it('1 mois de retard sur 1M : 10% × 1M + 1,5% × 1M = 115 000', () => {
    expect(computeTvaPenalty(1_000_000, 1)).toBe(115_000)
  })
  it('6 mois : 10% + 1,5% × 6 = 19% du montant', () => {
    expect(computeTvaPenalty(1_000_000, 6)).toBe(190_000)
  })
})

// ── RAS ──────────────────────────────────────────────────────────────────────

describe('computeRAS — retenues à la source', () => {
  it('Services : 5,5%', () => {
    expect(computeRAS(1_000_000, 'services')).toBe(55_000)
  })
  it('Honoraires : 11%', () => {
    expect(computeRAS(1_000_000, 'honoraires')).toBe(110_000)
  })
  it('Loyers : 10%', () => {
    expect(computeRAS(1_000_000, 'loyers')).toBe(100_000)
  })
  it('Non-résidents : 16,5%', () => {
    expect(computeRAS(1_000_000, 'nonResidents')).toBe(165_000)
  })
  it('Renvoie 0 pour montant nul ou négatif', () => {
    expect(computeRAS(0, 'services')).toBe(0)
    expect(computeRAS(-1000, 'honoraires')).toBe(0)
  })
})

// ── Agrégation TVA depuis factures ──────────────────────────────────────────

describe('aggregateVatCollected — somme TVA depuis factures', () => {
  it('Somme correctement amountTTC - amountHT', () => {
    const invoices = [
      { amountHT: 1000, amountTTC: 1192.50 },  // TVA = 192.50
      { amountHT: 2000, amountTTC: 2385.00 },  // TVA = 385.00
    ]
    expect(aggregateVatCollected(invoices)).toBeCloseTo(577.50, 2)
  })
  it('Tolère les Decimal en string (Prisma)', () => {
    const invoices = [
      { amountHT: '1000', amountTTC: '1192.50' },
    ]
    expect(aggregateVatCollected(invoices)).toBeCloseTo(192.50, 2)
  })
  it('Renvoie 0 sur liste vide', () => {
    expect(aggregateVatCollected([])).toBe(0)
  })
})
