import type { JwtPayload } from '@athenis/shared-types'
import { AppError } from './errorHandler.js'

/**
 * Returns a Prisma `where` clause fragment filtering by agenceId.
 * If the user is unrestricted (no assigned agences), returns {} (no filter).
 */
export function getAgenceFilter(user: JwtPayload): { agenceId?: { in: string[] } } {
  if (!user.isRestricted || user.agenceIds.length === 0) {
    return {}
  }
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
  if (!user.isRestricted || user.agenceIds.length === 0) return
  if (!user.agenceIds.includes(agenceId)) {
    throw new AppError('Accès non autorisé à cette agence', 403, 'AGENCE_ACCESS_DENIED')
  }
}
