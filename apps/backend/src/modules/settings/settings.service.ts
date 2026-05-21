import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { sendUserInvitationEmail } from '../../lib/email.js'
import { logger } from '../../lib/logger.js'
import crypto from 'crypto'

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
  accountNumberLength: number
  logoUrl: string | null
  formeJuridique: string | null
  siren: string | null
  siret: string | null
  naf: string | null
  vatNumber: string | null
  capital: object | null   // Decimal
  adresse: string | null
  codePostal: string | null
  ville: string | null
  telephone: string | null
  email: string | null
  siteWeb: string | null
  primaryColor: string | null
  secondaryColor: string | null
  font: string | null
  invoiceMentions: string | null
  paymentTerms: number | null
  lateInterestRate: object | null  // Decimal
  discountRate: object | null      // Decimal
}) {
  return {
    id:                  raw.id,
    name:                raw.nom,
    logo:                raw.logoUrl,
    legalForm:           raw.formeJuridique,
    siren:               raw.siren,
    siret:               raw.siret,
    naf:                 raw.naf,
    vatNumber:           raw.vatNumber,
    capital:             raw.capital !== null ? Number(raw.capital) : null,
    address:             raw.adresse,
    postalCode:          raw.codePostal,
    city:                raw.ville,
    country:             raw.pays,
    phone:               raw.telephone,
    contactEmail:        raw.email,
    website:             raw.siteWeb,
    primaryColor:        raw.primaryColor,
    secondaryColor:      raw.secondaryColor,
    font:                raw.font,
    invoiceMentions:     raw.invoiceMentions,
    paymentTerms:        raw.paymentTerms,
    lateInterestRate:    raw.lateInterestRate !== null ? Number(raw.lateInterestRate) : null,
    discountRate:        raw.discountRate !== null ? Number(raw.discountRate) : null,
    plan:                raw.plan,
    modules:             raw.modules,
    locale:              raw.locale,
    timezone:            raw.timezone,
    accountingZone:      raw.accountingZone,
    accountingPlan:      raw.accountingPlan,
    accountNumberLength: raw.accountNumberLength,
  }
}

const COMPANY_SETTINGS_SELECT = {
  id: true, nom: true, plan: true, modules: true, locale: true, timezone: true,
  pays: true, currency: true, accountingZone: true, accountingPlan: true, accountNumberLength: true,
  logoUrl: true, formeJuridique: true, siren: true, siret: true, naf: true, vatNumber: true, capital: true,
  adresse: true, codePostal: true, ville: true, telephone: true, email: true, siteWeb: true,
  primaryColor: true, secondaryColor: true, font: true,
  invoiceMentions: true, paymentTerms: true, lateInterestRate: true, discountRate: true,
} as const

export async function getCompanySettings(companyId: string) {
  const raw = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: COMPANY_SETTINGS_SELECT,
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
  if ('naf'          in body) d.naf             = body.naf           || null
  if ('vatNumber'    in body) d.vatNumber       = body.vatNumber     || null
  if ('capital'      in body) d.capital         = body.capital !== null && body.capital !== undefined ? Number(body.capital) : null
  if ('address'      in body) d.adresse         = body.address       || null
  if ('postalCode'   in body) d.codePostal      = body.postalCode    || null
  if ('city'         in body) d.ville           = body.city          || null
  if ('country'      in body) d.pays            = body.country       || 'FR'
  if ('phone'        in body) d.telephone       = body.phone         || null
  if ('contactEmail' in body) d.email           = body.contactEmail  || null
  if ('website'      in body) d.siteWeb         = body.website       || null
  // Personnalisation factures
  if ('primaryColor'     in body) d.primaryColor     = body.primaryColor     || null
  if ('secondaryColor'   in body) d.secondaryColor   = body.secondaryColor   || null
  if ('font'             in body) d.font             = body.font             || null
  if ('invoiceMentions'  in body) d.invoiceMentions  = body.invoiceMentions  || null
  if ('paymentTerms'     in body) d.paymentTerms     = body.paymentTerms     !== null && body.paymentTerms     !== undefined ? Number(body.paymentTerms)     : null
  if ('lateInterestRate' in body) d.lateInterestRate = body.lateInterestRate !== null && body.lateInterestRate !== undefined ? Number(body.lateInterestRate) : null
  if ('discountRate'     in body) d.discountRate     = body.discountRate     !== null && body.discountRate     !== undefined ? Number(body.discountRate)     : null
  if ('locale'              in body) d.locale             = body.locale
  if ('timezone'            in body) d.timezone           = body.timezone
  if ('accountNumberLength' in body && body.accountNumberLength) {
    const len = Number(body.accountNumberLength)
    if ([3,4,5,6,7,9].includes(len)) d.accountNumberLength = len
  }
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
    select: COMPANY_SETTINGS_SELECT,
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
            role: true,
          },
        },
        agenceMembers: {
          include: { agence: { select: { id: true, nom: true } } },
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
        id:           true,
        email:        true,
        roleId:       true,
        createdAt:    true,
        agenceIds:    true,
        isRestricted: true,
      },
    }),
  ])

  const userEntries = members.map(member => {
    const user         = member.user
    const agenceIds    = member.agenceMembers.map(am => am.agence.id)
    const isRestricted = member.agenceMembers.some(am => am.isRestricted)
    return {
      id:              user.id,
      email:           user.email,
      firstName:       user.prenom ?? null,
      lastName:        user.nom,
      globalRole:      user.role,
      companyRoleId:   member.roleId,
      companyRoleName: member.roleId,
      status:          member.status,
      totpEnabled:     user.twoFAEnabled,
      lastLoginAt:     user.lastLoginAt?.toISOString() ?? null,
      invitedAt:       member.invitedAt?.toISOString() ?? null,
      isInvitation:    false as const,
      agenceIds,
      isRestricted,
    }
  })

  const invitationEntries = invitations.map(inv => ({
    id:              inv.id,
    email:           inv.email,
    firstName:       null as null,
    lastName:        null as null,
    globalRole:      inv.roleId,
    companyRoleId:   inv.roleId,
    companyRoleName: inv.roleId,
    status:          'INVITED' as const,
    totpEnabled:     false as const,
    lastLoginAt:     null as null,
    invitedAt:       inv.createdAt.toISOString(),
    isInvitation:    true as const,
    agenceIds:       inv.agenceIds,
    isRestricted:    inv.isRestricted,
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
    role: string
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

  // Validate that all agenceIds belong to this company (prevents cross-company injection)
  if (data.agenceIds.length > 0) {
    const validCount = await prisma.agence.count({
      where: { id: { in: data.agenceIds }, companyId },
    })
    if (validCount !== data.agenceIds.length) {
      throw new AppError('Une ou plusieurs agences sont invalides ou appartiennent à une autre entreprise', 400, 'INVALID_AGENCE')
    }
  }

  const token     = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

  const invitation = await prisma.invitation.create({
    data: {
      companyId,
      email:        data.email,
      roleId:       data.role,
      token,
      expiresAt,
      createdBy:    invitedBy,
      agenceIds:    data.agenceIds,
      isRestricted: data.isRestricted && data.agenceIds.length > 0,
    },
  })

  // ── Envoi du mail d'invitation (non-bloquant) ─────────────────────────────
  // Si l'envoi échoue (SMTP down, etc.), l'invitation est quand même créée :
  // l'admin pourra retrouver le lien dans la liste des invitations en attente
  // et le renvoyer manuellement. On log l'erreur côté serveur.
  const [companyData, roleData, agences] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { nom: true } }),
    prisma.companyRole.findUnique({ where: { id: data.role }, select: { name: true } }).catch(() => null),
    data.agenceIds.length > 0
      ? prisma.agence.findMany({ where: { id: { in: data.agenceIds } }, select: { nom: true } })
      : Promise.resolve([] as { nom: string }[]),
  ])
  const inviter = await prisma.user.findUnique({
    where: { id: invitedBy },
    select: { prenom: true, nom: true, email: true },
  }).catch(() => null)
  const inviterName = inviter
    ? [inviter.prenom, inviter.nom].filter(Boolean).join(' ').trim() || inviter.email
    : undefined

  void sendUserInvitationEmail(data.email, {
    token,
    companyName: companyData?.nom ?? 'votre entreprise',
    ...(inviterName       ? { inviterName }              : {}),
    ...(roleData?.name    ? { roleName: roleData.name }  : {}),
    ...(agences.length > 0 ? { agenceNames: agences.map(a => a.nom) } : {}),
    expiresAt,
  }).catch((err) => {
    logger.error('sendUserInvitationEmail failed', { invitationId: invitation.id, email: data.email, error: err })
  })

  return invitation
}

/**
 * Remplace les AgenceMember d'un utilisateur par la nouvelle liste.
 * Passer agenceIds=[] pour retirer toutes les assignations (accès global).
 */
export async function updateUserAgences(
  companyId: string,
  userId: string,
  agenceIds: string[],
  isRestricted: boolean,
) {
  const member = await prisma.companyMember.findFirst({ where: { companyId, userId } })
  if (!member) throw new AppError('Utilisateur non trouvé dans cette entreprise', 404, 'NOT_FOUND')

  // Validate that all agenceIds belong to this company (prevents cross-company injection)
  if (agenceIds.length > 0) {
    const validCount = await prisma.agence.count({
      where: { id: { in: agenceIds }, companyId },
    })
    if (validCount !== agenceIds.length) {
      throw new AppError('Une ou plusieurs agences sont invalides ou appartiennent à une autre entreprise', 400, 'INVALID_AGENCE')
    }
  }

  await prisma.$transaction([
    // Supprimer les assignations existantes
    prisma.agenceMember.deleteMany({ where: { companyMemberId: member.id } }),
    // Re-créer avec la nouvelle liste (si non vide)
    ...(agenceIds.length > 0
      ? [prisma.agenceMember.createMany({
          data: agenceIds.map(agenceId => ({
            agenceId,
            companyMemberId: member.id,
            isRestricted:    isRestricted && agenceIds.length > 0,
          })),
          skipDuplicates: true,
        })]
      : []
    ),
  ])
  return { userId, agenceIds, isRestricted }
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

  // V3 : vérifier que le rôle appartient bien à la même entreprise. Sinon
  //      un admin pourrait assigner à son propre user un CompanyRole d'un
  //      autre tenant (futur RBAC = élévation de privilèges).
  const companyRole = await prisma.companyRole.findFirst({
    where: { id: role, companyId },
    select: { id: true },
  })
  if (!companyRole) throw new AppError('Rôle invalide', 400, 'INVALID_ROLE')

  return prisma.companyMember.update({
    where: { id: member.id },
    data: { roleId: role },
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
    include: { _count: { select: { members: true } } },
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
  const code = data.code.toUpperCase()
  const exists = await prisma.agence.findUnique({
    where: { companyId_code: { companyId, code } },
  })
  if (exists) throw new AppError('Ce code agence est déjà utilisé', 409, 'CODE_DUPLICATE')

  return prisma.agence.create({
    data: {
      companyId,
      code,
      nom:       data.nom,
      adresse:   data.adresse   ?? null,
      ville:     data.ville     ?? null,
      telephone: data.telephone ?? null,
      email:     data.email     ?? null,
      isSiege:   data.isSiege   ?? false,
    },
    include: { _count: { select: { members: true } } },
  })
}

export async function updateAgence(
  companyId: string,
  agenceId: string,
  data: { nom?: string; adresse?: string; ville?: string; telephone?: string; email?: string; isActive?: boolean },
) {
  const agence = await prisma.agence.findFirst({ where: { id: agenceId, companyId } })
  if (!agence) throw new AppError('Agence introuvable', 404, 'NOT_FOUND')

  return prisma.agence.update({
    where: { id: agenceId },
    data: {
      ...(data.nom       !== undefined ? { nom: data.nom }             : {}),
      ...(data.adresse   !== undefined ? { adresse: data.adresse }     : {}),
      ...(data.ville     !== undefined ? { ville: data.ville }         : {}),
      ...(data.telephone !== undefined ? { telephone: data.telephone } : {}),
      ...(data.email     !== undefined ? { email: data.email }         : {}),
      ...(data.isActive  !== undefined ? { isActive: data.isActive }   : {}),
    },
    include: { _count: { select: { members: true } } },
  })
}

export async function deleteAgence(companyId: string, agenceId: string) {
  const agence = await prisma.agence.findFirst({ where: { id: agenceId, companyId } })
  if (!agence) throw new AppError('Agence introuvable', 404, 'NOT_FOUND')
  if (agence.isSiege) throw new AppError('Le siège social ne peut pas être supprimé', 403, 'SIEGE_PROTECTED')
  await prisma.agence.delete({ where: { id: agenceId } })
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export async function listRoles(companyId: string) {
  const roles = await prisma.companyRole.findMany({
    where: { companyId },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { members: true } } },
  })
  return roles.map(r => ({
    id:          r.id,
    name:        r.name,
    description: r.description,
    isSystem:    r.isSystem,
    permissions: r.permissions,
    userCount:   r._count.members,
    createdAt:   r.createdAt,
  }))
}

export async function createRole(
  companyId: string,
  data: { name: string; description?: string; permissions: object },
) {
  const exists = await prisma.companyRole.findFirst({ where: { companyId, name: data.name } })
  if (exists) throw new AppError('Un rôle avec ce nom existe déjà', 409, 'ROLE_DUPLICATE')

  return prisma.companyRole.create({
    data: {
      companyId,
      name:        data.name,
      description: data.description ?? null,
      isSystem:    false,
      permissions: data.permissions as object,
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
  if (role.isSystem) {
    if (data.name !== undefined) {
      throw new AppError('Le nom des rôles système ne peut pas être modifié', 403, 'SYSTEM_ROLE')
    }
    if (data.permissions !== undefined) {
      throw new AppError('Les permissions des rôles système ne peuvent pas être modifiées', 403, 'SYSTEM_ROLE')
    }
    // Only description updates are allowed on system roles
  }

  return prisma.companyRole.update({
    where: { id },
    data: {
      ...(data.name        !== undefined ? { name: data.name }               : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.permissions !== undefined ? { permissions: data.permissions as object } : {}),
    },
  })
}

export async function deleteRole(companyId: string, id: string) {
  const role = await prisma.companyRole.findFirst({ where: { id, companyId } })
  if (!role) throw new AppError('Rôle introuvable', 404, 'NOT_FOUND')
  if (role.isSystem) throw new AppError('Les rôles système ne peuvent pas être supprimés', 403, 'SYSTEM_ROLE')

  const usersWithRole = await prisma.companyMember.count({ where: { roleId: id } })
  if (usersWithRole > 0) throw new AppError('Ce rôle est encore assigné à des utilisateurs', 409, 'ROLE_IN_USE')

  await prisma.companyRole.delete({ where: { id } })
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

export async function getSecurityPolicy(companyId: string) {
  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { securityPolicy: true },
  })
  if (!company) throw new AppError('Entreprise introuvable', 404, 'NOT_FOUND')

  // Merge stored values over defaults so missing keys always have a safe value
  const stored = (company.securityPolicy ?? {}) as Record<string, unknown>
  return { ...DEFAULT_SECURITY_POLICY, ...stored }
}

export async function updateSecurityPolicy(companyId: string, policy: Record<string, unknown>) {
  // Only persist known keys — ignore unknown fields
  const allowed = new Set(Object.keys(DEFAULT_SECURITY_POLICY))
  const sanitised = Object.fromEntries(
    Object.entries(policy).filter(([k]) => allowed.has(k)),
  )

  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { securityPolicy: true },
  })
  if (!company) throw new AppError('Entreprise introuvable', 404, 'NOT_FOUND')

  const current = (company.securityPolicy ?? {}) as Record<string, unknown>
  const merged  = { ...DEFAULT_SECURITY_POLICY, ...current, ...sanitised }

  await prisma.company.update({
    where: { id: companyId },
    data:  { securityPolicy: merged },
  })

  return merged
}

// ── Paramètres écritures de paie ──────────────────────────────────────────────
//
// Conformément à SYSCOHADA / PCG, la paie utilise :
//   • Journal PAY (à paramétrer)
//   • Compte de charges salariales — 641 par défaut (Rémunérations directes versées)
//   • Compte cotisations sociales — 431 par défaut (CNPS/CFC/FNE part sal + pat)
//   • Compte impôts retenus — 447 par défaut (IRPP + CAC)
//   • Compte trésorerie — 521 par défaut (Banque locale)

const DEFAULT_PAYROLL_CONFIG = {
  journalCode:         'PAY',
  chargeAccount:       '641',  // Rémunérations directes versées
  socialAccount:       '431',  // Cotisations CNPS / CFC / FNE
  taxAccount:          '447',  // IRPP + CAC
  treasuryAccount:     '521',  // Banques
  // Comptes secondaires (utilisés si tu veux séparer les écritures par nature)
  socialAccountPersonal:    '4311',  // CNPS part salariale
  socialAccountEmployer:    '4312',  // CNPS part patronale
  taxAccountIrpp:           '4471',  // IRPP
  taxAccountCac:            '4472',  // CAC
  splitContributions:       false,    // si true, utilise les comptes secondaires
}

export async function getPayrollConfig(companyId: string) {
  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { payrollConfig: true },
  })
  if (!company) throw new AppError('Entreprise introuvable', 404, 'NOT_FOUND')
  const stored = (company.payrollConfig ?? {}) as Record<string, unknown>
  return { ...DEFAULT_PAYROLL_CONFIG, ...stored }
}

export async function updatePayrollConfig(companyId: string, config: Record<string, unknown>) {
  const allowed = new Set(Object.keys(DEFAULT_PAYROLL_CONFIG))
  const sanitised = Object.fromEntries(
    Object.entries(config).filter(([k]) => allowed.has(k)),
  )

  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { payrollConfig: true },
  })
  if (!company) throw new AppError('Entreprise introuvable', 404, 'NOT_FOUND')

  const current = (company.payrollConfig ?? {}) as Record<string, unknown>
  const merged  = { ...DEFAULT_PAYROLL_CONFIG, ...current, ...sanitised }

  await prisma.company.update({
    where: { id: companyId },
    data:  { payrollConfig: merged },
  })
  return merged
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
