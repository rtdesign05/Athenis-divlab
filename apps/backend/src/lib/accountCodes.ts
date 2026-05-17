/**
 * Normalisation et validation des numéros de compte comptable.
 *
 * Règles (conformes au choix de configuration Athenis) :
 *  - Longueur cible : exactement 9 caractères
 *  - Si purement numérique (ex : "601") → complété à droite avec des zéros
 *    (601 → 601000000)
 *  - Les comptes alphanumériques (avec lettres) sont autorisés UNIQUEMENT
 *    pour les comptes de tiers : fournisseurs (401), clients (411),
 *    personnel (421, 422). Ils peuvent contenir entre 3 et 9 caractères.
 *  - Tout caractère est converti en MAJUSCULE.
 *  - Caractères autorisés : [A-Z0-9].
 *
 * Cas d'erreur :
 *  - Compte vide / blanc
 *  - Compte avec caractères spéciaux (espaces internes, ponctuation, etc.)
 *  - Compte numérique de plus de 9 chiffres
 *  - Compte alphanumérique ne commençant pas par 401/411/421/422
 *  - Compte de moins de 3 caractères
 */
import { AppError } from '../middleware/errorHandler.js'

export const ACCOUNT_TARGET_LENGTH = 9

/** Préfixes des comptes de tiers autorisés en alphanumérique */
export const TIERS_PREFIXES = ['401', '411', '421', '422'] as const

/** Code purement numérique ? (uniquement des chiffres) */
export function isPurelyNumeric(code: string): boolean {
  return /^\d+$/.test(code)
}

/** Le code respecte-t-il les règles d'alphanumérique tiers ? */
export function isAllowedAlphanumeric(code: string): boolean {
  if (!/^[A-Z0-9]+$/.test(code)) return false
  return TIERS_PREFIXES.some(p => code.startsWith(p))
}

/**
 * Normalise un numéro de compte selon les règles ci-dessus.
 * Lève une AppError 400 (VALIDATION_ERROR) si le code est invalide.
 */
export function normalizeAccountCode(input: string): string {
  if (typeof input !== 'string' || !input.trim())
    throw new AppError('Numéro de compte requis', 400, 'VALIDATION_ERROR')

  const code = input.trim().toUpperCase().replace(/\s+/g, '')
  if (!code)
    throw new AppError('Numéro de compte requis', 400, 'VALIDATION_ERROR')

  // ── Cas purement numérique ────────────────────────────────────────────
  if (isPurelyNumeric(code)) {
    if (code.length > ACCOUNT_TARGET_LENGTH) {
      throw new AppError(
        `Numéro trop long (${code.length} chiffres, maximum ${ACCOUNT_TARGET_LENGTH}). Compte saisi : ${code}`,
        400, 'ACCOUNT_TOO_LONG',
      )
    }
    if (code.length < 1)
      throw new AppError('Numéro de compte vide', 400, 'VALIDATION_ERROR')
    return code.padEnd(ACCOUNT_TARGET_LENGTH, '0')
  }

  // ── Cas alphanumérique : tiers uniquement ─────────────────────────────
  if (!/^[A-Z0-9]+$/.test(code)) {
    throw new AppError(
      `Caractères invalides dans "${code}". Autorisés : chiffres et lettres A-Z uniquement.`,
      400, 'INVALID_CHARS',
    )
  }
  if (!isAllowedAlphanumeric(code)) {
    throw new AppError(
      `Les comptes alphanumériques sont réservés aux comptes de tiers (préfixes : ${TIERS_PREFIXES.join(', ')}). Compte saisi : ${code}`,
      400, 'ALPHANUMERIC_NON_TIERS',
    )
  }
  if (code.length > ACCOUNT_TARGET_LENGTH) {
    throw new AppError(
      `Numéro trop long (${code.length} caractères, maximum ${ACCOUNT_TARGET_LENGTH}). Compte saisi : ${code}`,
      400, 'ACCOUNT_TOO_LONG',
    )
  }
  if (code.length < 3) {
    throw new AppError(
      `Numéro trop court (${code.length} caractère(s), minimum 3). Compte saisi : ${code}`,
      400, 'ACCOUNT_TOO_SHORT',
    )
  }

  return code
}

/**
 * Variante non-throwable : retourne null si invalide, sinon le code normalisé.
 * Utile pour les validations côté UI sans lever d'exception.
 */
export function tryNormalizeAccountCode(input: string): string | null {
  try {
    return normalizeAccountCode(input)
  } catch {
    return null
  }
}
