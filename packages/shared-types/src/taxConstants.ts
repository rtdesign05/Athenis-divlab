/**
 * Constantes fiscales Athenis — source de vérité unique (backend + frontend).
 *
 * À chaque loi de finances (Cameroun ou France), modifier UNIQUEMENT ce
 * fichier. Backend et frontend importent depuis `@athenis/shared-types`.
 *
 * Source : DGI Cameroun (CGI 2026) — DGFiP France (PCG 2026).
 */

// ── TVA ─────────────────────────────────────────────────────────────────────

/** Taux TVA Cameroun (CGI Article 142) — 19,25% depuis 2022. */
export const TVA_CM = 0.1925
/** Taux TVA France standard (CGI Article 278) — 20% depuis 2014. */
export const TVA_FR = 0.20
/** Taux TVA UEMOA hors Cameroun (CI, SN, GA, TG, BJ, BF) — 18%. */
export const TVA_UEMOA = 0.18

/** Renvoie le taux par défaut selon le code pays (alpha-2). */
export function defaultVatRate(countryCode: string): number {
  const cc = (countryCode || '').toUpperCase()
  if (cc === 'CM') return TVA_CM
  if (cc === 'FR') return TVA_FR
  if (['CI', 'SN', 'GA', 'TG', 'BJ', 'BF', 'NE', 'ML'].includes(cc)) return TVA_UEMOA
  return TVA_FR
}

// ── IRPP / IS — barèmes Cameroun ────────────────────────────────────────────

/** Barème IRPP Cameroun (CGI 2026) — tranches annuelles en FCFA. */
export const IRPP_BAREME_CM = [
  { jusqua:    2_000_000, taux: 0.10 },
  { jusqua:    3_000_000, taux: 0.15 },
  { jusqua:    5_000_000, taux: 0.25 },
  { jusqua: Infinity,     taux: 0.35 },
]

/** Taux IS (Impôt sur les Sociétés) Cameroun — 33% standard, 30% sociétés cotées. */
export const IS_CM = 0.33

// ── Cotisations CNPS Cameroun ───────────────────────────────────────────────

/** Plafond mensuel CNPS Cameroun — 750 000 FCFA. */
export const CNPS_PLAFOND_MENSUEL = 750_000
/** Part salarié — Pension Vieillesse 4,2%. */
export const CNPS_TAUX_PVID_SAL = 0.042
/** Part employeur — Pension Vieillesse 4,2%. */
export const CNPS_TAUX_PVID_EMP = 0.042
/** Part employeur — Allocations Familiales 7%. */
export const CNPS_TAUX_PF = 0.07
/** Part employeur — Accidents Travail (taux moyen 1,75%, variable selon secteur). */
export const CNPS_TAUX_AT = 0.0175

// ── Devises par défaut ──────────────────────────────────────────────────────

/** Devise par défaut selon zone comptable. */
export function defaultCurrency(zone: 'OHADA' | 'FRANCE' | string): 'XAF' | 'EUR' {
  return zone === 'FRANCE' ? 'EUR' : 'XAF'
}

// ── Constantes fiscales détaillées Cameroun (CGI 2026) ──────────────────────
// Groupage exhaustif utilisé par les pages frontend (fiscalité, paramètres).
// Les services backend utilisent les constantes individuelles ci-dessus.

export const CM_TAX = {
  // ── TVA ──────────────────────────────────────────────────────────────────
  vatRate:              TVA_CM,    // 17.5% base + 1.75% CAC = 19.25%
  vatRateBase:          0.175,
  vatCAC:               0.0175,
  vatThreshold:         50_000_000,
  vatPenaltyBase:       0.10,
  vatPenaltyMonthly:    0.015,
  vatPaymentThreshold:  100_000,

  // ── IS ───────────────────────────────────────────────────────────────────
  isRate:               IS_CM,     // 33% standard
  isRateReduced:        0.308,
  isThresholdReduced:   3_000_000_000,
  isAcompteRate:        0.022,
  isMinimumAnnualRate:  0.01,
  isDeficitYears:       4,
  isSoldeDate:          '15/03',

  // ── Patente ──────────────────────────────────────────────────────────────
  patenteTauxGrande:    0.00159,
  patenteTauxMoyenne:   0.00283,
  patenteTauxPetite:    0.00494,
  patenteThresholdGrande:  100_000_000,
  patenteThresholdMoyenne:  50_000_000,
  patenteAddlRate:      0.10,

  // ── RAS (Retenues à la Source) ───────────────────────────────────────────
  rasServicesRate:      0.055,
  rasHonorairesRate:    0.11,
  rasLoyersRate:        0.10,
  rasNonResidentsRate:  0.165,
  rasDividendesRate:    0.165,
  rasInteretsRate:      0.165,

  // ── CNPS ─────────────────────────────────────────────────────────────────
  cnpsVieillesse:       { patronal: CNPS_TAUX_PVID_EMP, salarial: CNPS_TAUX_PVID_SAL },
  cnpsFamille:          { patronal: CNPS_TAUX_PF },
  cnpsAT:               { patronal: CNPS_TAUX_AT },
  cnpsPatronalRate:     0.162,
  cnpsSalarialRate:     0.028,
  fdfpPatronalRate:     0.015,
  fdfpSalarialRate:     0.005,

  // ── IRPP ─────────────────────────────────────────────────────────────────
  irppExemptionMensuelle:    62_000,
  irppAbattementForfaitaire: 500_000,
  irppBareme:                IRPP_BAREME_CM.map(t => ({ max: t.jusqua, taux: t.taux })),
  irppCAC:                   0.10,

  // ── IGS (nouveau 2025) ───────────────────────────────────────────────────
  igsThreshold: 50_000_000,

  // ── Pénalités générales ──────────────────────────────────────────────────
  dsfPenaliteRetard:    25_000,
} as const
