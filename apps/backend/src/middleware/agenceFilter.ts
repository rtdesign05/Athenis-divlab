import type { JwtPayload } from '@athenis/shared-types'
import { AppError } from './errorHandler.js'

/**
 * Returns a Prisma `where` clause fragment filtering by agenceId.
 * If the user is unrestricted, returns {} (no filter).
 * If the user is restricted with an empty agenceIds list, returns { agenceId: { in: [] } }
 * which matches NOTHING — preventing accidental global access for restricted users.
 */
export function getAgenceFilter(user: JwtPayload): { agenceId?: { in: string[] } } {
  if (!user.isRestricted) {
    return {}
  }
  // Always return the in-filter when restricted, even when agenceIds is empty.
  // An empty `in: []` matches no rows, which is the correct secure default.
  return { agenceId: { in: user.agenceIds } }
}

/**
 * Returns a Prisma `where` clause fragment filtering by companyId + agenceId.
 * Convenience helper combining company scope with agence restriction.
 */
export function getAgenceFilterForCompany(
  user: JwtPayload,
  companyId: string,
): { companyId: string; agenceId?: { in: string[] } } {
  return { companyId, ...getAgenceFilter(user) }
}

/**
 * Throws 403 if the requesting user does not have access to the given agenceId.
 * No-op for unrestricted users.
 */
export function checkAgenceAccess(user: JwtPayload, agenceId: string): void {
  if (!user.isRestricted) return
  if (!user.agenceIds.includes(agenceId)) {
    throw new AppError('Accès non autorisé à cette agence', 403, 'AGENCE_ACCESS_DENIED')
  }
}
