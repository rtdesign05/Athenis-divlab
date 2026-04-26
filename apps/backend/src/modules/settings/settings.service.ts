import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import crypto from 'crypto'
import type { CompanyRole } from '@prisma/client'

// ── Company Settings ──────────────────────────────────────────────────────────

export async function getCompanySettings(companyId: string) {
  return prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: {
      id: true,
      nom: true,
      plan: true,
      modules: true,
      locale: true,
      timezone: true,
      pays: true,
      currency: true,
      accountingZone: true,
      accountingPlan: true,
      logoUrl: true,
      formeJuridique: true,
      siret: true,
      capital: true,
      adresse: true,
      codePostal: true,
      ville: true,
      telephone: true,
      email: true,
      siteWeb: true,
      vatRate: true,
    },
  })
}

export async function updateCompanySettings(
  companyId: string,
  data: Partial<{
    nom: string
    logoUrl: string
    formeJuridique: string
    siret: string
    capital: number
    adresse: string
    codePostal: string
    ville: string
    telephone: string
    email: string
    siteWeb: string
    vatRate: number
    locale: string
    timezone: string
    pays: string
    currency: string
  }>,
) {
  return prisma.company.update({
    where: { id: companyId },
    data,
  })
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(companyId: string) {
  const [members, invitations] = await Promise.all([
    prisma.companyMember.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            isActive: true,
            twoFAEnabled: true,
            lastLoginAt: true,
          },
        },
      },
    }),
    prisma.invitation.findMany({
      where: {
        companyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
  ])

  const userEntries = members.map(member => {
    const user = member.user
    return {
      id:              user.id,
      email:           user.email,
      firstName:       user.nom,
      lastName:        user.prenom ?? null,
      companyRole:     member.role as string,
      companyRoleName: member.role as string,
      status:          member.status as string,
      twoFAEnabled:    user.twoFAEnabled,
      lastLoginAt:     user.lastLoginAt,
      invitedAt:       member.invitedAt?.toISOString() ?? null,
      isInvitation:    false as const,
    }
  })

  const invitationEntries = invitations.map(inv => ({
    id:              inv.id,
    email:           inv.email,
    firstName:       null as null,
    lastName:        null as null,
    companyRole:     inv.role as string,
    companyRoleName: inv.role as string,
    status:          'INVITED' as const,
    twoFAEnabled:    false as const,
    lastLoginAt:     null as null,
    invitedAt:       inv.createdAt.toISOString(),
    isInvitation:    true as const,
  }))

  return [...userEntries, ...invitationEntries]
}

export function getUserLimit(plan: string): number {
  switch (plan) {
    case 'FREE':     return 1
    case 'STARTER':  return 3
    case 'PRO':      return 5
    case 'PREMIUM':  return Number.POSITIVE_INFINITY
    default:         return 1
  }
}

export async function inviteUser(
  companyId: string,
  data: { email: string; firstName?: string; lastName?: string; role?: string },
  invitedBy: string,
) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { plan: true },
  })

  const limit = getUserLimit(company.plan)

  const [activeUserCount, pendingInvitationCount] = await Promise.all([
    prisma.companyMember.count({ where: { companyId } }),
    prisma.invitation.count({
      where: { companyId, acceptedAt: null, expiresAt: { gt: new Date() } },
    }),
  ])

  if (activeUserCount + pendingInvitationCount >= limit) {
    throw new AppError(
      `Limite d'utilisateurs atteinte pour votre forfait (${limit} max)`,
      403,
      'USER_LIMIT_REACHED',
    )
  }

  // Check if email already belongs to company
  const existingMember = await prisma.companyMember.findFirst({
    where: { companyId, user: { email: data.email } },
  })
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email: data.email,
      companyId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  })

  if (existingMember) {
    throw new AppError("Cet utilisateur fait déjà partie de l'entreprise", 409, 'USER_ALREADY_EXISTS')
  }
  if (existingInvitation) {
    throw new AppError('Une invitation est déjà en attente pour cette adresse email', 409, 'INVITATION_ALREADY_EXISTS')
  }

  const roleEnum: CompanyRole = (data.role as CompanyRole) ?? 'READONLY'

  return prisma.invitation.create({
    data: {
      companyId,
      email:     data.email,
      role:      roleEnum,
      token:     crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdBy: invitedBy,
    },
  })
}

export async function updateUserRole(
  companyId: string,
  userId: string,
  role: string,
  requestingUserId: string,
) {
  if (userId === requestingUserId) {
    throw new AppError('Vous ne pouvez pas modifier votre propre rôle', 403, 'SELF_MODIFICATION')
  }

  const member = await prisma.companyMember.findFirst({ where: { companyId, userId } })
  if (!member) throw new AppError('Utilisateur non trouvé dans cette entreprise', 404, 'NOT_FOUND')

  return prisma.companyMember.update({
    where: { id: member.id },
    data: { role: role as CompanyRole },
  })
}

export async function updateUserStatus(
  companyId: string,
  userId: string,
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
  requestingUserId: string,
) {
  if (userId === requestingUserId && status !== 'ACTIVE') {
    throw new AppError('Vous ne pouvez pas modifier votre propre statut', 403, 'SELF_MODIFICATION')
  }

  const member = await prisma.companyMember.findFirst({ where: { companyId, userId } })
  if (!member) throw new AppError('Utilisateur non trouvé dans cette entreprise', 404, 'NOT_FOUND')

  const isActive = status === 'ACTIVE'

  return prisma.$transaction([
    prisma.companyMember.update({
      where: { id: member.id },
      data: { status },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isActive },
    }),
  ])
}

export async function deleteUser(
  companyId: string,
  userId: string,
  requestingUserId: string,
) {
  if (userId === requestingUserId) {
    throw new AppError('Vous ne pouvez pas vous supprimer vous-même', 403, 'SELF_DELETION')
  }

  const member = await prisma.companyMember.findFirst({ where: { companyId, userId } })
  if (!member) throw new AppError('Utilisateur non trouvé dans cette entreprise', 404, 'NOT_FOUND')

  await prisma.companyMember.delete({ where: { id: member.id } })
}

// ── Roles ─────────────────────────────────────────────────────────────────────
// Roles are now an enum (CompanyRole), not a DB model. Return predefined values.

const SYSTEM_ROLES = [
  { id: 'OWNER',      name: 'Propriétaire',    description: 'Accès complet, propriétaire de l\'entreprise', isSystem: true, permissions: {}, userCount: 0 },
  { id: 'ADMIN',      name: 'Administrateur',  description: 'Accès complet à toutes les fonctionnalités',    isSystem: true, permissions: {}, userCount: 0 },
  { id: 'MANAGER',    name: 'Gestionnaire',    description: 'Gestion des opérations courantes',              isSystem: true, permissions: {}, userCount: 0 },
  { id: 'ACCOUNTANT', name: 'Comptable',       description: 'Accès aux modules comptables',                  isSystem: true, permissions: {}, userCount: 0 },
  { id: 'HR',         name: 'RH',              description: 'Gestion des ressources humaines',               isSystem: true, permissions: {}, userCount: 0 },
  { id: 'SALES',      name: 'Commercial',      description: 'Gestion des ventes et clients',                 isSystem: true, permissions: {}, userCount: 0 },
  { id: 'READONLY',   name: 'Lecture seule',   description: 'Consultation uniquement',                       isSystem: true, permissions: {}, userCount: 0 },
  { id: 'CUSTOM',     name: 'Personnalisé',    description: 'Rôle avec permissions personnalisées',          isSystem: false, permissions: {}, userCount: 0 },
]

export async function listRoles(companyId: string) {
  // Get user counts per role from CompanyMember
  const counts = await prisma.companyMember.groupBy({
    by: ['role'],
    where: { companyId },
    _count: true,
  })
  const countMap = new Map(counts.map(c => [c.role as string, c._count]))

  return SYSTEM_ROLES.map(r => ({
    ...r,
    userCount: countMap.get(r.id) ?? 0,
    createdAt: new Date('2024-01-01'),
  }))
}

export async function createRole(
  companyId: string,
  data: { name: string; description?: string; permissions: object },
) {
  // Since roles are now an enum, we can't create custom roles in DB.
  // Return a mock role object for backward compatibility.
  return {
    id: 'CUSTOM',
    name: data.name,
    description: data.description ?? null,
    isSystem: false,
    permissions: data.permissions,
    companyId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function updateRole(
  companyId: string,
  id: string,
  data: { name?: string; description?: string; permissions?: object },
) {
  const role = SYSTEM_ROLES.find(r => r.id === id)
  if (!role) throw new AppError('Rôle introuvable', 404, 'NOT_FOUND')
  if (role.isSystem && id !== 'CUSTOM') throw new AppError('Les rôles système ne peuvent pas être modifiés', 403, 'SYSTEM_ROLE')

  return { ...role, ...data, id, companyId, updatedAt: new Date() }
}

export async function deleteRole(_companyId: string, id: string) {
  const role = SYSTEM_ROLES.find(r => r.id === id)
  if (!role) throw new AppError('Rôle introuvable', 404, 'NOT_FOUND')
  if (role.isSystem) throw new AppError('Les rôles système ne peuvent pas être supprimés', 403, 'SYSTEM_ROLE')
  // no-op for enum-based roles
}

// ── Security Policy ───────────────────────────────────────────────────────────

const DEFAULT_SECURITY_POLICY = {
  passwordMinLength:      8,
  requireUppercase:       false,
  requireNumbers:         true,
  requireSpecial:         false,
  passwordExpiryDays:     0,
  require2faAll:          false,
  require2faAdmin:        false,
  sessionDurationMinutes: 240,
  autoLogoutMinutes:      60,
  ipWhitelist:            [] as string[],
  blockOutsideHours:      false,
  maxLoginAttempts:       5,
  lockoutDurationMinutes: 30,
}

export async function getSecurityPolicy(_companyId: string) {
  // securityPolicy field was removed from Company model — return defaults
  return DEFAULT_SECURITY_POLICY
}

export async function updateSecurityPolicy(_companyId: string, _policy: object) {
  // securityPolicy field was removed from Company model — return defaults
  return DEFAULT_SECURITY_POLICY
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export async function getAuditLogs(companyId: string, limit = 50) {
  return prisma.auditLog.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          email: true,
          nom: true,
          prenom: true,
        },
      },
    },
  })
}
