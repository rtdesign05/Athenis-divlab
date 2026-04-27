import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import crypto from 'crypto'
import type { CompanyRole } from '@prisma/client'

// ── Company Settings ──────────────────────────────────────────────────────────

/** Map raw Prisma Company row → API response shape expected by the frontend */
function toCompanySettingsDto(raw: {
  id: string
  nom: string
  plan: string
  modules: string[]
  locale: string
  timezone: string
  pays: string
  currency: string
  accountingZone: string
  accountingPlan: string
  logoUrl: string | null
  formeJuridique: string | null
  siren: string | null
  siret: string | null
  capital: object | null   // Decimal
  adresse: string | null
  codePostal: string | null
  ville: string | null
  telephone: string | null
  email: string | null
  siteWeb: string | null
}) {
  return {
    id:               raw.id,
    name:             raw.nom,
    logo:             raw.logoUrl,
    legalForm:        raw.formeJuridique,
    siren:            raw.siren,
    siret:            raw.siret,
    // Fields not yet in DB — return null so frontend shows empty but doesn't crash
    naf:              null as null,
    vatNumber:        null as null,
    capital:          raw.capital !== null ? Number(raw.capital) : null,
    address:          raw.adresse,
    postalCode:       raw.codePostal,
    city:             raw.ville,
    country:          raw.pays,
    phone:            raw.telephone,
    contactEmail:     raw.email,
    website:          raw.siteWeb,
    primaryColor:     null as null,
    secondaryColor:   null as null,
    font:             null as null,
    invoiceMentions:  null as null,
    paymentTerms:     null as null,
    lateInterestRate: null as null,
    discountRate:     null as null,
    plan:             raw.plan,
    modules:          raw.modules,
    locale:           raw.locale,
    timezone:         raw.timezone,
    accountingZone:   raw.accountingZone,
    accountingPlan:   raw.accountingPlan,
  }
}

export async function getCompanySettings(companyId: string) {
  const raw = await prisma.company.findUniqueOrThrow({
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
      siren: true,
      siret: true,
      capital: true,
      adresse: true,
      codePostal: true,
      ville: true,
      telephone: true,
      email: true,
      siteWeb: true,
    },
  })
  return toCompanySettingsDto(raw)
}

/** Map API request body (camelCase English) → Prisma DB field names */
export function toCompanyUpdateData(body: Record<string, unknown>): Record<string, unknown> {
  const d: Record<string, unknown> = {}
  if ('name'         in body) d.nom            = body.name          || null
  if ('logo'         in body) d.logoUrl         = body.logo          || null
  if ('legalForm'    in body) d.formeJuridique  = body.legalForm     || null
  if ('siren'        in body) d.siren           = body.siren         || null
  if ('siret'        in body) d.siret           = body.siret         || null
  if ('capital'      in body) d.capital         = body.capital !== null ? Number(body.capital) : null
  if ('address'      in body) d.adresse         = body.address       || null
  if ('postalCode'   in body) d.codePostal      = body.postalCode    || null
  if ('city'         in body) d.ville           = body.city          || null
  if ('country'      in body) d.pays            = body.country       || 'CM'
  if ('phone'        in body) d.telephone       = body.phone         || null
  if ('contactEmail' in body) d.email           = body.contactEmail  || null
  if ('website'      in body) d.siteWeb         = body.website       || null
  if ('locale'       in body) d.locale          = body.locale
  if ('timezone'     in body) d.timezone        = body.timezone
  // Fields not in DB (naf, vatNumber, primaryColor, secondaryColor, font,
  // invoiceMentions, paymentTerms, lateInterestRate, discountRate) — silently ignored
  return d
}

export async function updateCompanySettings(
  companyId: string,
  dbData: Record<string, unknown>,
) {
  const updated = await prisma.company.update({
    where: { id: companyId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: dbData as any,
    select: {
      id: true, nom: true, plan: true, modules: true, locale: true, timezone: true,
      pays: true, currency: true, accountingZone: true, accountingPlan: true,
      logoUrl: true, formeJuridique: true, siren: true, siret: true, capital: true,
      adresse: true, codePostal: true, ville: true, telephone: true, email: true, siteWeb: true,
    },
  })
  return toCompanySettingsDto(updated)
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
      // DB: nom = nom de famille (last name), prenom = prénom (first name)
      firstName:       user.prenom ?? null,
      lastName:        user.nom,
      globalRole:      member.role as string,
      companyRoleId:   member.role as string,
      companyRoleName: member.role as string,
      status:          member.status as string,
      totpEnabled:     user.twoFAEnabled,
      lastLoginAt:     user.lastLoginAt?.toISOString() ?? null,
      invitedAt:       member.invitedAt?.toISOString() ?? null,
      isInvitation:    false as const,
    }
  })

  const invitationEntries = invitations.map(inv => ({
    id:              inv.id,
    email:           inv.email,
    firstName:       null as null,
    lastName:        null as null,
    globalRole:      inv.role as string,
    companyRoleId:   inv.role as string,
    companyRoleName: inv.role as string,
    status:          'INVITED' as const,
    totpEnabled:     false as const,
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
  data: {
    prenom: string
    nom: string
    email: string
    telephone?: string
    role: CompanyRole
    permissions: Record<string, string>
    agenceIds: string[]
    isRestricted: boolean
  },
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

  // Validate agenceIds belong to this company
  if (data.agenceIds.length > 0) {
    const validAgences = await prisma.agence.count({
      where: { companyId, id: { in: data.agenceIds } },
    })
    if (validAgences !== data.agenceIds.length) {
      throw new AppError("Une ou plusieurs agences spécifiées sont invalides", 400, 'INVALID_AGENCE')
    }
  }

  const roleEnum: CompanyRole = data.role

  // Store prenom, nom, telephone in metadata inside permissions JSON
  const permissionsWithMeta = {
    ...data.permissions,
    _meta: {
      prenom:    data.prenom,
      nom:       data.nom,
      telephone: data.telephone ?? null,
      isRestricted: data.isRestricted,
    },
  }

  return prisma.invitation.create({
    data: {
      companyId,
      email:       data.email,
      role:        roleEnum,
      permissions: permissionsWithMeta,
      agenceIds:   data.agenceIds,
      token:       crypto.randomBytes(32).toString('hex'),
      expiresAt:   new Date(Date.now() + 48 * 60 * 60 * 1000),
      createdBy:   invitedBy,
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

// ── Agences ───────────────────────────────────────────────────────────────────

export async function listAgences(companyId: string) {
  return prisma.agence.findMany({
    where: { companyId },
    orderBy: [{ isSiege: 'desc' }, { nom: 'asc' }],
    include: {
      _count: { select: { members: true } },
    },
  })
}

export async function createAgence(
  companyId: string,
  data: {
    code: string
    nom: string
    adresse?: string
    ville?: string
    telephone?: string
    email?: string
    isSiege?: boolean
  },
) {
  // Ensure unique code within company
  const existing = await prisma.agence.findUnique({
    where: { companyId_code: { companyId, code: data.code } },
  })
  if (existing) {
    throw new AppError(`Le code agence "${data.code}" est déjà utilisé`, 409, 'CODE_ALREADY_EXISTS')
  }

  // If this is set as siege, unset others
  if (data.isSiege) {
    await prisma.agence.updateMany({
      where: { companyId, isSiege: true },
      data: { isSiege: false },
    })
  }

  return prisma.agence.create({
    data: {
      companyId,
      code:      data.code,
      nom:       data.nom,
      adresse:   data.adresse ?? null,
      ville:     data.ville ?? null,
      telephone: data.telephone ?? null,
      email:     data.email ?? null,
      isSiege:   data.isSiege ?? false,
    },
  })
}

export async function updateAgence(
  companyId: string,
  agenceId: string,
  data: {
    code?: string
    nom?: string
    adresse?: string
    ville?: string
    telephone?: string
    email?: string
    isSiege?: boolean
    isActive?: boolean
  },
) {
  const agence = await prisma.agence.findFirst({ where: { id: agenceId, companyId } })
  if (!agence) throw new AppError('Agence introuvable', 404, 'NOT_FOUND')

  // Check code uniqueness if changing code
  if (data.code && data.code !== agence.code) {
    const existing = await prisma.agence.findUnique({
      where: { companyId_code: { companyId, code: data.code } },
    })
    if (existing) {
      throw new AppError(`Le code agence "${data.code}" est déjà utilisé`, 409, 'CODE_ALREADY_EXISTS')
    }
  }

  // If setting as siege, unset others
  if (data.isSiege) {
    await prisma.agence.updateMany({
      where: { companyId, isSiege: true, id: { not: agenceId } },
      data: { isSiege: false },
    })
  }

  return prisma.agence.update({
    where: { id: agenceId },
    data,
  })
}

export async function deleteAgence(companyId: string, agenceId: string) {
  const agence = await prisma.agence.findFirst({ where: { id: agenceId, companyId } })
  if (!agence) throw new AppError('Agence introuvable', 404, 'NOT_FOUND')
  if (agence.isSiege) {
    throw new AppError("Le siège social ne peut pas être supprimé", 403, 'CANNOT_DELETE_SIEGE')
  }

  // Check for active members
  const memberCount = await prisma.agenceMember.count({ where: { agenceId } })
  if (memberCount > 0) {
    throw new AppError(
      `Cette agence a ${memberCount} membre(s) rattaché(s). Retirez-les avant de supprimer l'agence.`,
      409,
      'AGENCE_HAS_MEMBERS',
    )
  }

  await prisma.agence.delete({ where: { id: agenceId } })
}

// ── Roles ─────────────────────────────────────────────────────────────────────
// Roles are now an enum (CompanyRole), not a DB model. Return predefined values.

type PermLevel = 'none' | 'read' | 'write' | 'admin'
interface RolePerms { gestion: PermLevel; comptabilite: PermLevel; rh: PermLevel; juridique: PermLevel; esg: PermLevel; settings: PermLevel }

const SYSTEM_ROLES: Array<{
  id: string; name: string; description: string; isSystem: boolean; permissions: RolePerms; userCount: number
}> = [
  { id: 'OWNER',      name: 'Propriétaire',   description: 'Accès complet, propriétaire de l\'entreprise',  isSystem: true,  permissions: { gestion: 'admin', comptabilite: 'admin', rh: 'admin', juridique: 'admin', esg: 'admin', settings: 'admin'  }, userCount: 0 },
  { id: 'ADMIN',      name: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités',     isSystem: true,  permissions: { gestion: 'admin', comptabilite: 'admin', rh: 'admin', juridique: 'admin', esg: 'admin', settings: 'admin'  }, userCount: 0 },
  { id: 'MANAGER',    name: 'Gestionnaire',   description: 'Gestion des opérations courantes',               isSystem: true,  permissions: { gestion: 'write', comptabilite: 'read',  rh: 'read',  juridique: 'read',  esg: 'read',  settings: 'read'   }, userCount: 0 },
  { id: 'ACCOUNTANT', name: 'Comptable',      description: 'Accès aux modules comptables',                   isSystem: true,  permissions: { gestion: 'read',  comptabilite: 'write', rh: 'none',  juridique: 'none',  esg: 'none',  settings: 'none'   }, userCount: 0 },
  { id: 'HR',         name: 'RH',             description: 'Gestion des ressources humaines',                isSystem: true,  permissions: { gestion: 'none',  comptabilite: 'none',  rh: 'write', juridique: 'read',  esg: 'none',  settings: 'none'   }, userCount: 0 },
  { id: 'SALES',      name: 'Commercial',     description: 'Gestion des ventes et clients',                  isSystem: true,  permissions: { gestion: 'write', comptabilite: 'none',  rh: 'none',  juridique: 'none',  esg: 'none',  settings: 'none'   }, userCount: 0 },
  { id: 'READONLY',   name: 'Lecture seule',  description: 'Consultation uniquement',                        isSystem: true,  permissions: { gestion: 'read',  comptabilite: 'read',  rh: 'read',  juridique: 'read',  esg: 'read',  settings: 'none'   }, userCount: 0 },
  { id: 'CUSTOM',     name: 'Personnalisé',   description: 'Rôle avec permissions personnalisées',           isSystem: false, permissions: { gestion: 'none',  comptabilite: 'none',  rh: 'none',  juridique: 'none',  esg: 'none',  settings: 'none'   }, userCount: 0 },
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
