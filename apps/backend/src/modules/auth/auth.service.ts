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
import type {
  RegisterDto,
  LoginDto,
  TotpEnableDto,
  TotpDisableDto,
  ChangePasswordDto,
} from './auth.dto.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 30 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

// Started at module load, awaited at first login — avoids top-level await blocking tsx watch
const DUMMY_HASH_PROMISE = bcrypt.hash('athenis-internal-noop', BCRYPT_ROUNDS)

authenticator.options = { window: 1 }

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

function toUserProfile(
  user: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    accountType: string
    role: string
    companyId: string | null
    cabinetId: string | null
    totpEnabled: boolean
    isActive: boolean
    lastLoginAt: Date | null
    createdAt: Date
  },
  plan: Plan | null,
  modules: Module[],
): UserProfile {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    accountType: user.accountType as AccountType,
    role: user.role as UserRole,
    companyId: user.companyId,
    cabinetId: user.cabinetId,
    plan,
    modules,
    totpEnabled: user.totpEnabled,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  }
}

async function createRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(48).toString('hex')
  await prisma.refreshToken.create({
    data: { tokenHash: hashToken(raw), userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
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
      data: { action: action as never, userId, companyId, ipAddress: ip, userAgent: ua, metadata: metadata as never },
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

  const userSelect = {
    id: true, email: true, firstName: true, lastName: true,
    accountType: true, role: true, companyId: true, cabinetId: true,
    totpEnabled: true, isActive: true, lastLoginAt: true, createdAt: true,
  }

  type SelectedUser = {
    id: string; email: string; firstName: string | null; lastName: string | null
    accountType: import('@prisma/client').AccountType; role: import('@prisma/client').Role
    companyId: string | null; cabinetId: string | null
    totpEnabled: boolean; isActive: boolean; lastLoginAt: Date | null; createdAt: Date
  }
  let dbUser: SelectedUser

  if (dto.accountType === 'PERSONAL') {
    dbUser = await prisma.user.create({
      data: {
        email: dto.email, passwordHash,
        accountType: 'PERSONAL', role: 'ADMIN',
        firstName: dto.firstName ?? null, lastName: dto.lastName ?? null,
      },
      select: userSelect,
    })
  } else if (dto.accountType === 'COMPANY') {
    const modules = getDefaultModules(dto.plan)
    dbUser = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: dto.companyName, siren: dto.siren ?? null,
          secteur: dto.secteur ?? null, taille: dto.taille ?? 'PME',
          plan: dto.plan, modules,
        },
      })
      return tx.user.create({
        data: {
          email: dto.email, passwordHash,
          accountType: 'COMPANY', role: 'ADMIN',
          firstName: dto.firstName ?? null, lastName: dto.lastName ?? null,
          companyId: company.id,
        },
        select: userSelect,
      })
    })
  } else {
    dbUser = await prisma.$transaction(async (tx) => {
      const cabinet = await tx.cabinet.create({
        data: { name: dto.cabinetName, siret: dto.siret ?? null },
      })
      return tx.user.create({
        data: {
          email: dto.email, passwordHash,
          accountType: 'CABINET', role: 'ADMIN',
          firstName: dto.firstName ?? null, lastName: dto.lastName ?? null,
          cabinetId: cabinet.id,
        },
        select: userSelect,
      })
    })
  }

  const plan = await getEffectivePlan(dbUser.accountType as AccountType, dbUser.companyId)
  const modules = await getEffectiveModules(dbUser.accountType as AccountType, dbUser.companyId)

  const accessToken = signAccessToken({
    sub: dbUser.id, email: dbUser.email,
    accountType: dbUser.accountType as AccountType,
    role: dbUser.role as UserRole,
    companyId: dbUser.companyId,
    cabinetId: dbUser.cabinetId,
    plan, modules,
  })
  const refreshToken = await createRefreshToken(dbUser.id)
  await audit('USER_CREATED', dbUser.id, dbUser.companyId, ip, ua)

  return { response: { accessToken, user: toUserProfile(dbUser, plan, modules) }, refreshToken }
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
      id: true, email: true, firstName: true, lastName: true,
      passwordHash: true, accountType: true, role: true,
      companyId: true, cabinetId: true,
      totpEnabled: true, totpSecret: true, isActive: true,
      failedLoginAttempts: true, lockedUntil: true,
      lastLoginAt: true, createdAt: true,
    },
  })

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
    await audit('LOGIN_FAILED', user.id, user.companyId, ip, ua, { reason: 'account_locked' })
    throw new AppError(`Compte verrouillé. Réessayez dans ${minutes} min.`, 423, 'ACCOUNT_LOCKED')
  }

  if (user && !user.isActive) {
    throw new AppError('Compte désactivé. Contactez votre administrateur.', 403, 'ACCOUNT_INACTIVE')
  }

  const hashToCompare = user?.passwordHash ?? await DUMMY_HASH_PROMISE
  const valid = await bcrypt.compare(dto.password, hashToCompare)

  if (!user || !valid) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          ...(shouldLock ? { lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) } : {}),
        },
      })
      await audit(shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', user.id, user.companyId, ip, ua, { attempts })
    }
    throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS')
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedLoginAttempts: 0, lockedUntil: null } })

  if (user.totpEnabled) {
    return { response: { requiresTotp: true, tempToken: signTotpPendingToken(user.id) } as LoginResponse }
  }

  const plan = await getEffectivePlan(user.accountType as AccountType, user.companyId)
  const modules = await getEffectiveModules(user.accountType as AccountType, user.companyId)
  const accessToken = signAccessToken({
    sub: user.id, email: user.email,
    accountType: user.accountType as AccountType,
    role: user.role as UserRole,
    companyId: user.companyId, cabinetId: user.cabinetId,
    plan, modules,
  })
  const refreshToken = await createRefreshToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await audit('LOGIN', user.id, user.companyId, ip, ua)

  return {
    response: { accessToken, user: toUserProfile(user, plan, modules) },
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
      id: true, email: true, firstName: true, lastName: true,
      accountType: true, role: true, companyId: true, cabinetId: true,
      totpEnabled: true, totpSecret: true, isActive: true,
      lastLoginAt: true, createdAt: true,
    },
  })

  if (!user?.totpEnabled || !user.totpSecret) throw new AppError('TOTP non configuré', 400, 'TOTP_NOT_CONFIGURED')

  if (!authenticator.check(code, decrypt(user.totpSecret))) {
    await audit('TOTP_FAILED', user.id, user.companyId, ip, ua)
    throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')
  }

  const plan = await getEffectivePlan(user.accountType as AccountType, user.companyId)
  const modules = await getEffectiveModules(user.accountType as AccountType, user.companyId)
  const accessToken = signAccessToken({
    sub: user.id, email: user.email,
    accountType: user.accountType as AccountType,
    role: user.role as UserRole,
    companyId: user.companyId, cabinetId: user.cabinetId,
    plan, modules,
  })
  const refreshToken = await createRefreshToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await audit('LOGIN', user.id, user.companyId, ip, ua)

  return { response: { accessToken, user: toUserProfile(user, plan, modules) }, refreshToken }
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export async function refreshAccessToken(rawToken: string): Promise<RefreshTokenResponse> {
  const tokenHash = hashToken(rawToken)
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true, email: true, accountType: true, role: true,
          companyId: true, cabinetId: true, isActive: true,
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
      data: { revokedAt: new Date(), replacedByHash: newHash },
    }),
    prisma.refreshToken.create({
      data: { tokenHash: newHash, userId: stored.userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
    }),
  ])

  const u = stored.user
  const plan = await getEffectivePlan(u.accountType as AccountType, u.companyId)
  const modules = await getEffectiveModules(u.accountType as AccountType, u.companyId)

  return {
    accessToken: signAccessToken({
      sub: u.id, email: u.email,
      accountType: u.accountType as AccountType,
      role: u.role as UserRole,
      companyId: u.companyId, cabinetId: u.cabinetId,
      plan, modules,
    }),
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout(rawToken: string, userId: string, companyId: string | null, ip: string, ua: string): Promise<void> {
  if (rawToken) {
    await prisma.refreshToken
      .update({ where: { tokenHash: hashToken(rawToken) }, data: { revokedAt: new Date() } })
      .catch(() => void 0)
  }
  await audit('LOGOUT', userId, companyId, ip, ua)
}

// ── TOTP ──────────────────────────────────────────────────────────────────────

export async function setupTotp(userId: string): Promise<TotpSetupResponse> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true, totpEnabled: true } })
  if (user.totpEnabled) throw new AppError('TOTP déjà activé', 409, 'TOTP_ALREADY_ENABLED')

  const secret = authenticator.generateSecret(20)
  await prisma.user.update({ where: { id: userId }, data: { totpSecret: encrypt(secret) } })

  const otpauthUrl = authenticator.keyuri(user.email, env.totpIssuer, secret)
  return { secret, otpauthUrl, qrCodeDataUrl: await QRCode.toDataURL(otpauthUrl) }
}

export async function enableTotp(userId: string, dto: TotpEnableDto, ip: string, ua: string): Promise<TotpVerifyResponse> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true, companyId: true },
  })
  if (user.totpEnabled) throw new AppError('TOTP déjà activé', 409, 'TOTP_ALREADY_ENABLED')
  if (!user.totpSecret) throw new AppError('Lancez la configuration TOTP d\'abord', 400, 'TOTP_NOT_SETUP')
  if (!authenticator.check(dto.code, decrypt(user.totpSecret))) throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } })
  await audit('TOTP_ENABLED', userId, user.companyId, ip, ua)

  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase())
  return { enabled: true, backupCodes }
}

export async function disableTotp(userId: string, dto: TotpDisableDto, ip: string, ua: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true, totpSecret: true, totpEnabled: true, companyId: true },
  })
  if (!user.totpEnabled) throw new AppError('TOTP non activé', 400, 'TOTP_NOT_ENABLED')
  if (!await bcrypt.compare(dto.password, user.passwordHash)) throw new AppError('Mot de passe incorrect', 401, 'INVALID_CREDENTIALS')
  if (!authenticator.check(dto.code, decrypt(user.totpSecret!))) throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: false, totpSecret: null } })
  await audit('TOTP_DISABLED', userId, user.companyId, ip, ua)
}

export async function changePassword(userId: string, dto: ChangePasswordDto, ip: string, ua: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, companyId: true } })
  if (!await bcrypt.compare(dto.currentPassword, user.passwordHash)) throw new AppError('Mot de passe actuel incorrect', 401, 'INVALID_CREDENTIALS')

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
  await audit('PASSWORD_CHANGED', userId, user.companyId, ip, ua)
}
