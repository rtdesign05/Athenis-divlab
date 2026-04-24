import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import crypto from 'crypto'

// ── Company Settings ──────────────────────────────────────────────────────────

export async function getCompanySettings(companyId: string) {
  return prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      plan: true,
      modules: true,
      locale: true,
      timezone: true,
      country: true,
      currency: true,
      accountingZone: true,
      accountingPlan: true,
      logo: true,
      legalForm: true,
      siret: true,
      naf: true,
      vatNumber: true,
      capital: true,
      address: true,
      postalCode: true,
      city: true,
      phone: true,
      contactEmail: true,
      website: true,
      primaryColor: true,
      secondaryColor: true,
      font: true,
      invoiceMentions: true,
      paymentTerms: true,
      lateInterestRate: true,
      discountRate: true,
    },
  })
}

export async function updateCompanySettings(
  companyId: string,
  data: Partial<{
    logo: string
    legalForm: string
    siret: string
    naf: string
    vatNumber: string
    capital: number
    address: string
    postalCode: string
    city: string
    phone: string
    contactEmail: string
    website: string
    primaryColor: string
    secondaryColor: string
    font: string
    invoiceMentions: string
    paymentTerms: number
    lateInterestRate: number
    discountRate: number
  }> & { name?: string },
) {
  return prisma.company.update({
    where: { id: companyId },
    data,
  })
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function listUsers(companyId: string) {
  const [users, invitations] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        totpEnabled: true,
        lastLoginAt: true,
        companyUsers: {
          where: { companyId },
          select: {
            roleId: true,
            status: true,
            invitedAt: true,
            role: { select: { name: true } },
          },
          take: 1,
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
        roleId: true,
        createdAt: true,
      },
    }),
  ])

  // Gather all roleIds from invitations to look up names in one query
  const invitationRoleIds = [...new Set(invitations.map(inv => inv.roleId))]
  const invitationRoles = invitationRoleIds.length > 0
    ? await prisma.companyRole.findMany({
        where: { id: { in: invitationRoleIds }, companyId },
        select: { id: true, name: true },
      })
    : []
  const roleNameMap = new Map(invitationRoles.map(r => [r.id, r.name]))

  const userEntries = users.map(user => {
    const companyUser = user.companyUsers[0]
    let status: string
    if (!user.isActive) {
      status = 'INACTIVE'
    } else if (companyUser) {
      status = companyUser.status
    } else {
      status = 'ACTIVE'
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      globalRole: user.role,
      companyRoleId: companyUser?.roleId ?? null,
      companyRoleName: companyUser?.role.name ?? null,
      status,
      totpEnabled: user.totpEnabled,
      lastLoginAt: user.lastLoginAt,
      invitedAt: companyUser?.invitedAt?.toISOString() ?? null,
      isInvitation: false as const,
    }
  })

  const invitationEntries = invitations.map(inv => ({
    id: inv.id,
    email: inv.email,
    firstName: null as null,
    lastName: null as null,
    globalRole: 'READONLY' as const,
    companyRoleId: inv.roleId,
    companyRoleName: roleNameMap.get(inv.roleId) ?? null,
    status: 'INVITED' as const,
    totpEnabled: false as const,
    lastLoginAt: null as null,
    invitedAt: inv.createdAt.toISOString(),
    isInvitation: true as const,
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
  data: { email: string; firstName?: string; lastName?: string; roleId: string },
  invitedBy: string,
) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { plan: true },
  })

  const limit = getUserLimit(company.plan)

  const [activeUserCount, pendingInvitationCount] = await Promise.all([
    prisma.companyUser.count({ where: { companyId } }),
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
  const [existingUser, existingInvitation] = await Promise.all([
    prisma.user.findFirst({ where: { email: data.email, companyId } }),
    prisma.invitation.findFirst({
      where: {
        email: data.email,
        companyId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    }),
  ])

  if (existingUser) {
    throw new AppError("Cet utilisateur fait déjà partie de l'entreprise", 409, 'USER_ALREADY_EXISTS')
  }
  if (existingInvitation) {
    throw new AppError('Une invitation est déjà en attente pour cette adresse email', 409, 'INVITATION_ALREADY_EXISTS')
  }

  return prisma.invitation.create({
    data: {
      companyId,
      email: data.email,
      roleId: data.roleId,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdBy: invitedBy,
    },
  })
}

export async function updateUserRole(
  companyId: string,
  userId: string,
  roleId: string,
  requestingUserId: string,
) {
  if (userId === requestingUserId) {
    throw new AppError('Vous ne pouvez pas modifier votre propre rôle', 403, 'SELF_MODIFICATION')
  }

  return prisma.companyUser.upsert({
    where: { companyId_userId: { companyId, userId } },
    create: { companyId, userId, roleId },
    update: { roleId },
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

  const isActive = status === 'ACTIVE'

  return prisma.$transaction([
    prisma.companyUser.update({
      where: { companyId_userId: { companyId, userId } },
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

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { companyId: null },
    }),
    prisma.companyUser.delete({
      where: { companyId_userId: { companyId, userId } },
    }),
  ])
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export async function listRoles(companyId: string) {
  const roles = await prisma.companyRole.findMany({
    where: { companyId },
    include: { _count: { select: { users: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return roles.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    isSystem: r.isSystem,
    permissions: r.permissions,
    createdAt: r.createdAt,
    userCount: r._count.users,
  }))
}

export async function createRole(
  companyId: string,
  data: { name: string; description?: string; permissions: object },
) {
  const existing = await prisma.companyRole.findUnique({
    where: { companyId_name: { companyId, name: data.name } },
  })
  if (existing) {
    throw new AppError(`Un rôle avec le nom "${data.name}" existe déjà`, 409, 'DUPLICATE_ROLE')
  }

  return prisma.companyRole.create({
    data: {
      companyId,
      name: data.name,
      ...(data.description !== undefined ? { description: data.description } : {}),
      permissions: data.permissions,
      isSystem: false,
    },
  })
}

export async function updateRole(
  companyId: string,
  id: string,
  data: { name?: string; description?: string; permissions?: object },
) {
  const role = await prisma.companyRole.findFirst({ where: { id, companyId } })
  if (!role) throw new AppError('Rôle introuvable', 404, 'NOT_FOUND')
  if (role.isSystem) throw new AppError('Les rôles système ne peuvent pas être modifiés', 403, 'SYSTEM_ROLE')

  return prisma.companyRole.update({
    where: { id },
    data,
  })
}

export async function deleteRole(companyId: string, id: string) {
  const role = await prisma.companyRole.findFirst({
    where: { id, companyId },
    include: { _count: { select: { users: true } } },
  })
  if (!role) throw new AppError('Rôle introuvable', 404, 'NOT_FOUND')
  if (role.isSystem) throw new AppError('Les rôles système ne peuvent pas être supprimés', 403, 'SYSTEM_ROLE')
  if (role._count.users > 0) throw new AppError('Rôle assigné à des utilisateurs', 409, 'ROLE_IN_USE')

  await prisma.companyRole.delete({ where: { id } })
}

// ── Security Policy ───────────────────────────────────────────────────────────

const DEFAULT_SECURITY_POLICY = {
  passwordMinLength: 8,
  requireUppercase: false,
  requireNumbers: true,
  requireSpecial: false,
  passwordExpiryDays: 0,
  require2faAll: false,
  require2faAdmin: false,
  sessionDurationMinutes: 240,
  autoLogoutMinutes: 60,
  ipWhitelist: [] as string[],
  blockOutsideHours: false,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
}

export async function getSecurityPolicy(companyId: string) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { securityPolicy: true },
  })

  if (company.securityPolicy === null || company.securityPolicy === undefined) {
    return DEFAULT_SECURITY_POLICY
  }

  return { ...DEFAULT_SECURITY_POLICY, ...(company.securityPolicy as object) }
}

export async function updateSecurityPolicy(companyId: string, policy: object) {
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { securityPolicy: policy },
    select: { securityPolicy: true },
  })

  return { ...DEFAULT_SECURITY_POLICY, ...(updated.securityPolicy as object) }
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
          firstName: true,
          lastName: true,
        },
      },
    },
  })
}
