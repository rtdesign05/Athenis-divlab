/**
 * Constantes fiscales backend Athenis — source de vérité unique.
 *
 * À chaque loi de finances (Cameroun ou France), modifier UNIQUEMENT ce
 * fichier — tous les services et DTOs y font référence. Le frontend dispose
 * de son propre fichier équivalent (`apps/frontend/src/lib/taxConstants.ts`)
 * qui doit être maintenu en miroir.
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
