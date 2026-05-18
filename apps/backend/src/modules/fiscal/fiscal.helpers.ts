/**
 * Helpers purs extraits de fiscal.service.ts pour tests unitaires sans DB.
 * Calculs réglementaires Cameroun (CGI 2026) + France (PCG).
 */
import { TVA_CM, IS_CM } from '../../lib/taxConstants.js'

// ── Patente Cameroun (selon CA annuel) ───────────────────────────────────────

export const PATENTE_THRESHOLDS = {
  grande:  100_000_000,
  moyenne:  50_000_000,
} as const

export const PATENTE_RATES = {
  grande:    0.00159,  // CA > 100M
  moyenne:   0.00283,  // 50M–100M
  petite:    0.00494,  // < 50M
} as const

/** Catégorise une entreprise selon son CA annuel pour la patente. */
export function patenteCategory(ca: number): 'grande' | 'moyenne' | 'petite' {
  if (ca > PATENTE_THRESHOLDS.grande) return 'grande'
  if (ca > PATENTE_THRESHOLDS.moyenne) return 'moyenne'
  return 'petite'
}

/** Calcule la patente Cameroun (sans centimes additionnels). */
export function computePatente(ca: number): number {
  if (ca <= 0) return 0
  const rate = PATENTE_RATES[patenteCategory(ca)]
  return Math.round(ca * rate)
}

// ── IS Cameroun (Impôt sur les Sociétés) ─────────────────────────────────────

/** Taux IS effectif selon le CA (réduction pour CA < 3 milliards). */
export function isRate(ca: number): number {
  return ca < 3_000_000_000 ? 0.308 : IS_CM  // 30,8% réduit vs 33% standard
}

/** Calcule l'IS sur le résultat fiscal (avec IS minimum 1% du CA). */
export function computeIS(resultatFiscal: number, ca: number): number {
  if (resultatFiscal <= 0) {
    // IS minimum = 1% du CA même en déficit
    return Math.round(ca * 0.01)
  }
  const taux = isRate(ca)
  const isNormal  = resultatFiscal * taux
  const isMinimum = ca * 0.01
  return Math.round(Math.max(isNormal, isMinimum))
}

// ── TVA ──────────────────────────────────────────────────────────────────────

/** Calcule la TVA nette = collectée − déductible (peut être négative = crédit TVA). */
export function computeTvaNette(collectee: number, deductible: number): number {
  return +(collectee - deductible).toFixed(2)
}

/** Crédit TVA reportable = max(0, déductible − collectée). */
export function computeCreditTva(collectee: number, deductible: number): number {
  return Math.max(0, deductible - collectee)
}

/** Pénalité TVA : 10% du montant dû + 1,5% par mois de retard. */
export function computeTvaPenalty(amountDue: number, monthsLate: number): number {
  if (amountDue <= 0 || monthsLate <= 0) return 0
  const base    = amountDue * 0.10
  const monthly = amountDue * 0.015 * monthsLate
  return Math.round(base + monthly)
}

// ── RAS (Retenues à la Source) ───────────────────────────────────────────────

export type RasType = 'services' | 'honoraires' | 'loyers' | 'nonResidents' | 'dividendes'

const RAS_RATES: Record<RasType, number> = {
  services:     0.055,
  honoraires:   0.11,
  loyers:       0.10,
  nonResidents: 0.165,
  dividendes:   0.165,
}

/** Calcule le montant de la retenue à la source. */
export function computeRAS(amountHT: number, type: RasType): number {
  if (amountHT <= 0) return 0
  return Math.round(amountHT * RAS_RATES[type])
}

// ── Calcul TVA depuis une liste de factures ──────────────────────────────────

export interface InvoiceLite {
  amountHT:  number | string  // accepte Prisma.Decimal sous forme string
  amountTTC: number | string
}

/**
 * Agrège la TVA collectée depuis une liste de factures.
 * Tolère les Decimal de Prisma (Number() conversion).
 */
export function aggregateVatCollected(invoices: InvoiceLite[]): number {
  return invoices.reduce((s, inv) => s + (Number(inv.amountTTC) - Number(inv.amountHT)), 0)
}

// ── Re-export du taux principal pour cohérence ───────────────────────────────

export { TVA_CM, IS_CM }
