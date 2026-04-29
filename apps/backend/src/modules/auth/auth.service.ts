import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '../../lib/prisma.js'
import { encrypt, decrypt } from '../../lib/crypto.js'
import { logger } from '../../lib/logger.js'
import { env } from '../../config/env.js'
import { AppError } from '../../middleware/errorHandler.js'
import { getEffectivePlan, getEffectiveModules, getDefaultModules } from '../../lib/plans.js'
import { generateAtheisNumber } from '../../lib/atheisNumber.js'
import type {
  JwtPayload,
  UserProfile,
  AccountType,
  UserRole,
  Plan,
  Module,
  LoginResponse,
  RegisterResponse,
  RefreshTokenResponse,
  TotpSetupResponse,
  TotpVerifyResponse,
} from '@athenis/shared-types'
import { getCountryConfig } from '@athenis/shared-types'
import type {
  RegisterDto,
  LoginDto,
  TotpEnableDto,
  TotpDisableDto,
  ChangePasswordDto,
} from './auth.dto.js'
import type { CompanyRole, CabinetRole } from '@prisma/client'

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 30 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Started at module load, awaited at first login — avoids top-level await blocking tsx watch
const DUMMY_HASH_PROMISE = bcrypt.hash('athenis-internal-noop', BCRYPT_ROUNDS)

authenticator.options = { window: 1 }

// ── Role mapping ──────────────────────────────────────────────────────────────

function companyRoleToUserRole(role: CompanyRole): UserRole {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'MANAGER':
    case 'SALES':
      return 'ADMIN'
    case 'ACCOUNTANT':
      return 'COMPTABLE'
    case 'HR':
      return 'RH'
    case 'READONLY':
    case 'CUSTOM':
    default:
      return 'READONLY'
  }
}

function cabinetRoleToUserRole(_role: CabinetRole): UserRole {
  return 'ADMIN'
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const expiresIn = env.jwtAccessExpiresIn as jwt.SignOptions['expiresIn']
  if (!expiresIn) throw new Error('JWT_ACCESS_EXPIRES_IN is not set')
  return jwt.sign(payload, env.jwtSecret, { expiresIn })
}

function signTotpPendingToken(userId: string): string {
  return jwt.sign({ sub: userId, purpose: 'totp_pending' }, env.jwtSecret, { expiresIn: '5m' })
}

function verifyTotpPendingToken(token: string): string {
  const payload = jwt.verify(token, env.jwtSecret) as { sub: string; purpose: string }
  if (payload.purpose !== 'totp_pending') throw new AppError('Invalid token purpose', 401, 'TOKEN_INVALID')
  return payload.sub
}

/**
 * Resolves the agence restriction for a company member.
 * Returns the first restricted agence, or null if the member has access to all agences.
 */
async function getUserAgence(
  userId: string,
  companyId: string | null,
): Promise<{ agenceId: string | null; agenceNom: string | null }> {
  if (!companyId) return { agenceId: null, agenceNom: null }

  const member = await prisma.companyMember.findFirst({
    where: { userId, companyId },
    include: {
      agences: {
        where: { isRestricted: true },
        include: { agence: true },
        take: 1,
      },
    },
  })

  const firstAgence = member?.agences[0]?.agence
  return {
    agenceId: firstAgence?.id ?? null,
    agenceNom: firstAgence?.nom ?? null,
  }
}

// ── Shape accepted by toUserProfile ──────────────────────────────────────────

type DbUser = {
  id: string
  email: string
  nom: string
  prenom: string | null
  accountType: string
  twoFAEnabled: boolean
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  atheisNumber: string | null
  companyMember: { companyId: string; role: CompanyRole } | null
  cabinetMember: { cabinetId: string; role: CabinetRole } | null
}

function toUserProfile(
  user: DbUser,
  plan: Plan | null,
  modules: Module[],
  agenceId: string | null = null,
  agenceNom: string | null = null,
): UserProfile {
  const companyId = user.companyMember?.companyId ?? null
  const cabinetId = user.cabinetMember?.cabinetId ?? null

  let role: UserRole = 'READONLY'
  if (user.companyMember) {
    role = companyRoleToUserRole(user.companyMember.role)
  } else if (user.cabinetMember) {
    role = cabinetRoleToUserRole(user.cabinetMember.role)
  } else {
    // PERSONAL or SUPER_ADMIN
    role = 'ADMIN'
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.nom,
    lastName: user.prenom ?? null,
    accountType: user.accountType as AccountType,
    role,
    companyId,
    cabinetId,
    plan,
    modules,
    totpEnabled: user.twoFAEnabled,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    atheisNumber: user.atheisNumber ?? null,
    agenceId,
    agenceNom,
    agenceIds:    [],
    isRestricted: false,
  }
}

// ── Shared select for User queries ────────────────────────────────────────────

const USER_SELECT = {
  id: true,
  email: true,
  nom: true,
  prenom: true,
  accountType: true,
  twoFAEnabled: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  atheisNumber: true,
  companyMember: {
    select: { companyId: true, role: true },
  },
  cabinetMember: {
    select: { cabinetId: true, role: true },
  },
} as const

async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex')
  await prisma.refreshToken.create({
    data: { token: hashToken(raw), userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
  })
  return raw
}

export function setRefreshCookie(res: import('express').Response, token: string): void {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_TTL_MS,
    path: '/api/auth',
  })
}

async function audit(
  action: string,
  userId: string | null,
  companyId: string | null,
  ip: string,
  ua: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await prisma.auditLog
    .create({
      data: {
        action,
        resource: 'auth',
        userId,
        companyId,
        ipAddress: ip,
        userAgent: ua,
        ...(metadata ? { metadata: metadata as object } : {}),
      },
    })
    .catch((e: unknown) => logger.error('Audit log failed', { e }))
}

// ── Register ──────────────────────────────────────────────────────────────────

export async function register(
  dto: RegisterDto,
  ip: string,
  ua: string,
): Promise<{ response: RegisterResponse; refreshToken: string }> {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } })
  if (existing) throw new AppError('Email déjà utilisé', 409, 'EMAIL_TAKEN')

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
  const atheisNumber = await generateAtheisNumber(dto.accountType as import('@prisma/client').AccountType)

  let dbUser: DbUser

  if (dto.accountType === 'PERSONAL') {
    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        accountType: 'PERSONAL',
        nom: dto.firstName ?? (dto.email.split('@')[0] ?? 'Utilisateur'),
        prenom: dto.lastName ?? null,
        atheisNumber,
        personalProfile: { create: {} },
      },
      select: USER_SELECT,
    })
    dbUser = user as unknown as DbUser
  } else if (dto.accountType === 'COMPANY') {
    const modules = getDefaultModules(dto.plan)
    const countryCfg = getCountryConfig(dto.country ?? 'FR')
    dbUser = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          nom: dto.companyName,
          secteur: dto.secteur ?? null,
          taille: (dto.taille ?? 'PME') as import('@prisma/client').CompanySize,
          plan: dto.plan as import('@prisma/client').Plan,
          modules,
          pays: countryCfg.code,
          currency: countryCfg.currencyCode,
          currencySymbol: countryCfg.currencySymbol,
          accountingZone: countryCfg.accountingZone as import('@prisma/client').AccountingZone,
          accountingPlan: countryCfg.accountingPlan,
          vatRate: ((countryCfg.vatRates[0] ?? 0) / 100),
          locale: countryCfg.locale,
          timezone: countryCfg.timezone,
        },
      })
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          accountType: 'COMPANY',
          nom: dto.firstName ?? (dto.email.split('@')[0] ?? 'Utilisateur'),
          prenom: dto.lastName ?? null,
          atheisNumber,
          companyMember: {
            create: {
              companyId: company.id,
              role: 'OWNER',
            },
          },
        },
        select: USER_SELECT,
      })
      return user as unknown as DbUser
    })
  } else {
    dbUser = await prisma.$transaction(async (tx) => {
      const cabinet = await tx.cabinet.create({
        data: { nom: dto.cabinetName, siret: dto.siret ?? null },
      })
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          accountType: 'CABINET',
          nom: dto.firstName ?? (dto.email.split('@')[0] ?? 'Utilisateur'),
          prenom: dto.lastName ?? null,
          atheisNumber,
          cabinetMember: {
            create: {
              cabinetId: cabinet.id,
              role: 'EXPERT_COMPTABLE',
            },
          },
        },
        select: USER_SELECT,
      })
      return user as unknown as DbUser
    })
  }

  const companyId = dbUser.companyMember?.companyId ?? null
  const cabinetId = dbUser.cabinetMember?.cabinetId ?? null
  const plan = await getEffectivePlan(dbUser.accountType as AccountType, companyId)
  const modules = await getEffectiveModules(dbUser.accountType as AccountType, companyId)
  const companyLocale = companyId
    ? await prisma.company.findUnique({ where: { id: companyId }, select: { pays: true, currencySymbol: true } })
    : null
  const { agenceId, agenceNom } = await getUserAgence(dbUser.id, companyId)

  const role = dbUser.companyMember
    ? companyRoleToUserRole(dbUser.companyMember.role)
    : dbUser.cabinetMember
      ? cabinetRoleToUserRole(dbUser.cabinetMember.role)
      : ('ADMIN' as UserRole)

  const accessToken = signAccessToken({
    sub: dbUser.id,
    email: dbUser.email,
    accountType: dbUser.accountType as AccountType,
    role,
    companyId,
    cabinetId,
    plan,
    modules,
    country: companyLocale?.pays ?? null,
    currencySymbol: companyLocale?.currencySymbol ?? null,
    atheisNumber: dbUser.atheisNumber ?? null,
    agenceId,
    agenceNom,
    agenceIds:    [],
    isRestricted: false,
  })
  const refreshToken = await createRefreshToken(dbUser.id)
  await audit('USER_CREATED', dbUser.id, companyId, ip, ua)

  return { response: { accessToken, user: toUserProfile(dbUser, plan, modules, agenceId, agenceNom) }, refreshToken }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(
  dto: LoginDto,
  ip: string,
  ua: string,
): Promise<{ response: LoginResponse; refreshToken?: string }> {
  const user = await prisma.user.findUnique({
    where: { email: dto.email },
    select: {
      ...USER_SELECT,
      passwordHash: true,
      twoFASecret: true,
      failedAttempts: true,
      lockedUntil: true,
    },
  })

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
    await audit('LOGIN_FAILED', user.id, user.companyMember?.companyId ?? null, ip, ua, { reason: 'account_locked' })
    throw new AppError(`Compte verrouillé. Réessayez dans ${minutes} min.`, 423, 'ACCOUNT_LOCKED')
  }

  if (user && !user.isActive) {
    throw new AppError('Compte désactivé. Contactez votre administrateur.', 403, 'ACCOUNT_INACTIVE')
  }

  const hashToCompare = user?.passwordHash ?? await DUMMY_HASH_PROMISE
  const valid = await bcrypt.compare(dto.password, hashToCompare)

  if (!user || !valid) {
    if (user) {
      const attempts = user.failedAttempts + 1
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: attempts,
          ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) } : {}),
        },
      })
      await audit(
        shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        user.id,
        user.companyMember?.companyId ?? null,
        ip, ua,
        { attempts },
      )
    }
    throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS')
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } })

  if (user.twoFAEnabled) {
    return { response: { requiresTotp: true, tempToken: signTotpPendingToken(user.id) } as LoginResponse }
  }

  const companyId = user.companyMember?.companyId ?? null
  const cabinetId = user.cabinetMember?.cabinetId ?? null
  const plan = await getEffectivePlan(user.accountType as AccountType, companyId)
  const modules = await getEffectiveModules(user.accountType as AccountType, companyId)
  const loginLocale = companyId
    ? await prisma.company.findUnique({ where: { id: companyId }, select: { pays: true, currencySymbol: true } })
    : null
  const { agenceId, agenceNom } = await getUserAgence(user.id, companyId)

  const role = user.companyMember
    ? companyRoleToUserRole(user.companyMember.role)
    : user.cabinetMember
      ? cabinetRoleToUserRole(user.cabinetMember.role)
      : ('ADMIN' as UserRole)

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    accountType: user.accountType as AccountType,
    role,
    companyId,
    cabinetId,
    plan,
    modules,
    country: loginLocale?.pays ?? null,
    currencySymbol: loginLocale?.currencySymbol ?? null,
    atheisNumber: user.atheisNumber ?? null,
    agenceId,
    agenceNom,
    agenceIds:    [],
    isRestricted: false,
  })
  const refreshToken = await createRefreshToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await audit('LOGIN', user.id, companyId, ip, ua)

  return {
    response: { accessToken, user: toUserProfile(user as unknown as DbUser, plan, modules, agenceId, agenceNom) },
    refreshToken,
  }
}

// ── Login 2FA ─────────────────────────────────────────────────────────────────

export async function loginVerifyTotp(
  tempToken: string,
  code: string,
  ip: string,
  ua: string,
): Promise<{ response: LoginResponse; refreshToken: string }> {
  let userId: string
  try {
    userId = verifyTotpPendingToken(tempToken)
  } catch {
    throw new AppError('Token invalide ou expiré', 401, 'TOKEN_INVALID')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_SELECT,
      twoFASecret: true,
    },
  })

  if (!user?.twoFAEnabled || !user.twoFASecret) throw new AppError('TOTP non configuré', 400, 'TOTP_NOT_CONFIGURED')

  if (!authenticator.check(code, decrypt(user.twoFASecret))) {
    await audit('TOTP_FAILED', user.id, user.companyMember?.companyId ?? null, ip, ua)
    throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')
  }

  const companyId = user.companyMember?.companyId ?? null
  const cabinetId = user.cabinetMember?.cabinetId ?? null
  const plan = await getEffectivePlan(user.accountType as AccountType, companyId)
  const modules = await getEffectiveModules(user.accountType as AccountType, companyId)
  const totpLocale = companyId
    ? await prisma.company.findUnique({ where: { id: companyId }, select: { pays: true, currencySymbol: true } })
    : null
  const { agenceId, agenceNom } = await getUserAgence(user.id, companyId)

  const role = user.companyMember
    ? companyRoleToUserRole(user.companyMember.role)
    : user.cabinetMember
      ? cabinetRoleToUserRole(user.cabinetMember.role)
      : ('ADMIN' as UserRole)

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    accountType: user.accountType as AccountType,
    role,
    companyId,
    cabinetId,
    plan,
    modules,
    country: totpLocale?.pays ?? null,
    currencySymbol: totpLocale?.currencySymbol ?? null,
    atheisNumber: user.atheisNumber ?? null,
    agenceId,
    agenceNom,
    agenceIds:    [],
    isRestricted: false,
  })
  const refreshToken = await createRefreshToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await audit('LOGIN', user.id, companyId, ip, ua)

  return { response: { accessToken, user: toUserProfile(user as unknown as DbUser, plan, modules, agenceId, agenceNom) }, refreshToken }
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export async function refreshAccessToken(rawToken: string): Promise<RefreshTokenResponse> {
  const tokenHash = hashToken(rawToken)
  const stored = await prisma.refreshToken.findUnique({
    where: { token: tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          accountType: true,
          isActive: true,
          atheisNumber: true,
          companyMember: { select: { companyId: true, role: true } },
          cabinetMember: { select: { cabinetId: true, role: true } },
        },
      },
    },
  })

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    if (stored?.revokedAt) {
      logger.warn('Refresh token reuse detected — revoking family', { userId: stored.userId })
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
    }
    throw new AppError('Refresh token invalide', 401, 'TOKEN_INVALID')
  }

  if (!stored.user.isActive) throw new AppError('Compte désactivé', 403, 'ACCOUNT_INACTIVE')

  const newRaw = crypto.randomBytes(48).toString('hex')
  const newHash = hashToken(newRaw)

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: { token: newHash, userId: stored.userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
    }),
  ])

  const u = stored.user
  const companyId = u.companyMember?.companyId ?? null
  const cabinetId = u.cabinetMember?.cabinetId ?? null
  const plan = await getEffectivePlan(u.accountType as AccountType, companyId)
  const modules = await getEffectiveModules(u.accountType as AccountType, companyId)
  const refreshLocale = companyId
    ? await prisma.company.findUnique({ where: { id: companyId }, select: { pays: true, currencySymbol: true } })
    : null
  const { agenceId, agenceNom } = await getUserAgence(u.id, companyId)

  const role = u.companyMember
    ? companyRoleToUserRole(u.companyMember.role)
    : u.cabinetMember
      ? cabinetRoleToUserRole(u.cabinetMember.role)
      : ('ADMIN' as UserRole)

  return {
    accessToken: signAccessToken({
      sub: u.id,
      email: u.email,
      accountType: u.accountType as AccountType,
      role,
      companyId,
      cabinetId,
      plan,
      modules,
      country: refreshLocale?.pays ?? null,
      currencySymbol: refreshLocale?.currencySymbol ?? null,
      atheisNumber: u.atheisNumber ?? null,
      agenceId,
      agenceNom,
      agenceIds:    [],
      isRestricted: false,
    }),
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(rawToken: string, userId: string, companyId: string | null, ip: string, ua: string): Promise<void> {
  if (rawToken) {
    await prisma.refreshToken
      .update({ where: { token: hashToken(rawToken) }, data: { revokedAt: new Date() } })
      .catch(() => void 0)
  }
  await audit('LOGOUT', userId, companyId, ip, ua)
}

// ── TOTP ──────────────────────────────────────────────────────────────────────

export async function setupTotp(userId: string): Promise<TotpSetupResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, twoFAEnabled: true },
  })
  if (user.twoFAEnabled) throw new AppError('TOTP déjà activé', 409, 'TOTP_ALREADY_ENABLED')

  const secret = authenticator.generateSecret(20)
  await prisma.user.update({ where: { id: userId }, data: { twoFASecret: encrypt(secret) } })

  const otpauthUrl = authenticator.keyuri(user.email, env.totpIssuer, secret)
  return { secret, otpauthUrl, qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl) }
}

export async function enableTotp(userId: string, dto: TotpEnableDto, ip: string, ua: string): Promise<TotpVerifyResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      twoFASecret: true,
      twoFAEnabled: true,
      companyMember: { select: { companyId: true } },
    },
  })
  if (user.twoFAEnabled) throw new AppError('TOTP déjà activé', 409, 'TOTP_ALREADY_ENABLED')
  if (!user.twoFASecret) throw new AppError('Lancez la configuration TOTP d\'abord', 400, 'TOTP_NOT_SETUP')
  if (!authenticator.check(dto.code, decrypt(user.twoFASecret))) throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')

  await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: true } })
  await audit('TOTP_ENABLED', userId, user.companyMember?.companyId ?? null, ip, ua)

  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase())
  return { enabled: true, backupCodes }
}

export async function disableTotp(userId: string, dto: TotpDisableDto, ip: string, ua: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      passwordHash: true,
      twoFASecret: true,
      twoFAEnabled: true,
      companyMember: { select: { companyId: true } },
    },
  })
  if (!user.twoFAEnabled) throw new AppError('TOTP non activé', 400, 'TOTP_NOT_ENABLED')
  if (!await bcrypt.compare(dto.password, user.passwordHash)) throw new AppError('Mot de passe incorrect', 401, 'INVALID_CREDENTIALS')
  if (!authenticator.check(dto.code, decrypt(user.twoFASecret!))) throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')

  await prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: false, twoFASecret: null } })
  await audit('TOTP_DISABLED', userId, user.companyMember?.companyId ?? null, ip, ua)
}

// ── Accept Invitation ─────────────────────────────────────────────────────────

export async function acceptInvitation(
  token: string,
  password: string,
  ip: string,
  ua: string,
): Promise<{ accessToken: string; user: UserProfile }> {
  const invitation = await prisma.invitation.findUnique({ where: { token } })

  if (!invitation) throw new AppError('Invitation invalide ou introuvable', 404, 'INVITATION_NOT_FOUND')
  if (invitation.acceptedAt) throw new AppError('Cette invitation a déjà été utilisée', 409, 'INVITATION_ALREADY_USED')
  if (invitation.expiresAt < new Date()) throw new AppError('Cette invitation a expiré', 410, 'INVITATION_EXPIRED')

  // Load company data separately (Invitation model has no direct relation)
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: invitation.companyId },
    select: { plan: true, currencySymbol: true, pays: true },
  })

  // Extract metadata from permissions JSON
  const permsRaw = invitation.permissions as Record<string, unknown>
  const meta = (permsRaw._meta ?? {}) as { prenom?: string; nom?: string; telephone?: string; isRestricted?: boolean }
  const permissions: Record<string, unknown> = Object.fromEntries(
    Object.entries(permsRaw).filter(([k]) => k !== '_meta'),
  )

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } })
  if (existingUser) throw new AppError('Un compte existe déjà avec cette adresse email', 409, 'EMAIL_ALREADY_EXISTS')

  const passwordHash  = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const atheisNumber  = await generateAtheisNumber('COMPANY')

  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email:        invitation.email,
        passwordHash,
        nom:          meta.nom ?? '',
        prenom:       meta.prenom ?? null,
        telephone:    meta.telephone ?? null,
        accountType:  'COMPANY',
        atheisNumber,
      },
    })

    // Create CompanyMember
    const member = await tx.companyMember.create({
      data: {
        userId:      user.id,
        companyId:   invitation.companyId,
        role:        invitation.role,
        permissions: permissions as object,
        status:      'ACTIVE',
        invitedBy:   invitation.createdBy,
        invitedAt:   invitation.createdAt,
        joinedAt:    new Date(),
      },
    })

    // Create AgenceMember records if agenceIds specified
    if (invitation.agenceIds.length > 0) {
      await tx.agenceMember.createMany({
        data: invitation.agenceIds.map((agenceId) => ({
          companyMemberId: member.id,
          agenceId,
          isRestricted:    meta.isRestricted ?? true,
        })),
      })
    }

    // Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data:  { acceptedAt: new Date() },
    })

    return { user, member }
  })

  const plan    = (company.plan ?? 'FREE') as Plan
  const modules = getDefaultModules(plan)

  await audit('USER_CREATED', result.user.id, invitation.companyId, ip, ua)

  // Résoudre le nom de l'agence principale pour le JWT
  // (agenceNom est utilisé par le frontend pour filtrer les données Gestion)
  let agenceNom: string | null = null
  const firstAgenceId = invitation.agenceIds[0]
  if (firstAgenceId && (meta.isRestricted ?? false)) {
    const firstAgence = await prisma.agence.findUnique({
      where:  { id: firstAgenceId },
      select: { nom: true },
    })
    agenceNom = firstAgence?.nom ?? null
  }

  const accessToken = signAccessToken({
    sub:           result.user.id,
    email:         result.user.email,
    accountType:   'COMPANY',
    role:          companyRoleToUserRole(result.member.role),
    companyId:     invitation.companyId,
    cabinetId:     null,
    plan,
    modules,
    country:       company.pays ?? null,
    currencySymbol: company.currencySymbol ?? null,
    atheisNumber:  result.user.atheisNumber ?? null,
    agenceId:      invitation.agenceIds[0] ?? null,
    agenceNom,
    agenceIds:     invitation.agenceIds,
    isRestricted:  meta.isRestricted ?? false,
  })
  await createRefreshToken(result.user.id)

  return {
    accessToken,
    user: toUserProfile(
      result.user as unknown as DbUser,
      plan,
      modules,
      invitation.agenceIds[0] ?? null,
      null,
    ),
  }
}

export async function changePassword(userId: string, dto: ChangePasswordDto, ip: string, ua: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      passwordHash: true,
      companyMember: { select: { companyId: true } },
    },
  })
  if (!await bcrypt.compare(dto.currentPassword, user.passwordHash)) throw new AppError('Mot de passe actuel incorrect', 401, 'INVALID_CREDENTIALS')

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
  await audit('PASSWORD_CHANGED', userId, user.companyMember?.companyId ?? null, ip, ua)
}
