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
import {
  sendVerificationEmail,
  sendPendingApprovalEmail,
  sendAdminNewSignupNotification,
  sendFirstLoginEmail,
  sendPasswordChangedEmail,
  sendTwoFactorEnabledEmail,
  sendAccountLockedEmail,
  sendMfaCodeEmail,
  sendImpersonationStartedEmail,
} from '../../lib/email.js'
import { sendSms, isSmsConfigured } from '../../lib/sms.js'
import {
  generateMfaCode,
  hashMfaCode,
  safeEqualHashes,
  normalizePhoneE164,
  maskEmail,
  maskPhone,
  MFA_CODE_TTL_MS,
  MFA_MAX_ATTEMPTS,
} from '../../lib/mfa.js'
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

// ── Constants ─────────────────────────────────────────────────────────────────

const BCRYPT_ROUNDS = 12
const MAX_FAILED_ATTEMPTS = 5
const LOCK_DURATION_MS = 30 * 60 * 1000
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000   // 24 h
const VERIFICATION_TOKEN_BYTES = 32                       // 64 hex chars

// Started at module load, awaited at first login — avoids top-level await blocking tsx watch
const DUMMY_HASH_PROMISE = bcrypt.hash('athenis-internal-noop', BCRYPT_ROUNDS)

authenticator.options = { window: 1 }

// ── Role mapping ──────────────────────────────────────────────────────────────

function dbRoleToUserRole(role: string): UserRole {
  switch (role) {
    case 'ADMIN':
      return 'ADMIN'
    case 'COMPTABLE':
      return 'COMPTABLE'
    case 'RH':
      return 'RH'
    case 'JURIDIQUE':
      return 'READONLY'
    case 'READONLY':
    default:
      return 'READONLY'
  }
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

/**
 * Génère un token d'impersonation : un SUPER_ADMIN agit en tant que l'utilisateur cible.
 * Le token contient le profil COMPLET de la cible + 2 claims spéciaux (impersonatedBy,
 * impersonatorEmail) pour traçabilité.
 * Durée : 30 min (volontairement courte — l'admin ne doit pas oublier qu'il est impersonné).
 */
export async function createImpersonationToken(
  targetUserId: string,
  superAdminId: string,
  superAdminEmail: string,
  ip: string,
  ua: string,
): Promise<{ accessToken: string; targetProfile: UserProfile }> {
  // Garde : seul un SUPER_ADMIN actif peut impersonner
  const admin = await prisma.user.findUnique({
    where: { id: superAdminId },
    select: { platformRole: true, isActive: true, email: true },
  })
  if (!admin || admin.platformRole !== 'SUPER_ADMIN' || !admin.isActive) {
    throw new AppError('Impersonation refusée : super-admin requis.', 403, 'FORBIDDEN')
  }

  if (targetUserId === superAdminId) {
    throw new AppError('Inutile de vous impersonner vous-même.', 400, 'CANNOT_IMPERSONATE_SELF')
  }

  // Charge le profil cible complet
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { ...USER_SELECT, platformRole: true },
  })
  if (!target) throw new AppError('Utilisateur cible introuvable.', 404, 'USER_NOT_FOUND')

  // Refuse d'impersonner un autre SUPER_ADMIN (sécurité : tu ne peux pas voler le compte
  // d'un autre admin de la plateforme)
  if (target.platformRole === 'SUPER_ADMIN') {
    throw new AppError(
      'Impossible d\'impersonner un autre super-administrateur.',
      403, 'CANNOT_IMPERSONATE_SUPER_ADMIN',
    )
  }

  const companyId = target.companyId ?? null
  const cabinetId = target.cabinetId ?? null
  const plan      = await getEffectivePlan(target.accountType as AccountType, companyId)
  const modules   = await getEffectiveModules(target.accountType as AccountType, companyId)
  const { country, currencySymbol } = await resolveLocale(target.accountType, companyId, cabinetId, target.id)
  const { agenceId, agenceNom, agenceIds, isRestricted } = await getUserAgence(target.id, companyId)
  const role = dbRoleToUserRole(target.role)

  // Token court : 30 min (vs 15 min normal — un peu plus long pour faciliter le debug
  // sans trop l'oublier)
  const accessToken = jwt.sign(
    {
      sub: target.id,
      email: target.email,
      accountType: target.accountType as AccountType,
      role,
      platformRole: 'USER' as const, // ← important : le token cible n'a PAS les droits SUPER_ADMIN
      companyId, cabinetId, plan, modules,
      country, currencySymbol,
      atheisNumber: target.atheisNumber ?? null,
      agenceId, agenceNom, agenceIds, isRestricted,
      impersonatedBy:    superAdminId,
      impersonatorEmail: superAdminEmail,
    } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    env.jwtSecret,
    { expiresIn: '30m' },
  )

  await audit('IMPERSONATION_STARTED', superAdminId, target.companyId ?? null, ip, ua, {
    targetUserId,
    targetEmail: target.email,
    targetAccountType: target.accountType,
  })

  // Notif sécurité au user impersonné (transparence RGPD)
  void sendImpersonationStartedEmail(target.email, {
    firstName: target.nom,
    adminEmail: admin.email,
    startedAt: new Date(),
  }).catch((e) => logger.error('sendImpersonationStartedEmail failed', { error: e }))

  return {
    accessToken,
    targetProfile: toUserProfile(target as unknown as DbUser, plan, modules, agenceId, agenceNom),
  }
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
 * Resolves the agence(s) a user belongs to within a company.
 * Returns the primary agenceId/nom, all agenceIds, and isRestricted.
 * isRestricted = true if the user has at least one AgenceMember entry with isRestricted=true.
 */
async function getUserAgence(
  userId: string,
  companyId: string | null,
): Promise<{ agenceId: string | null; agenceNom: string | null; agenceIds: string[]; isRestricted: boolean }> {
  if (!companyId) return { agenceId: null, agenceNom: null, agenceIds: [], isRestricted: false }

  try {
    const member = await prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: {
        agenceMembers: {
          include: { agence: { select: { id: true, nom: true } } },
        },
      },
    })

    if (!member || member.agenceMembers.length === 0) {
      return { agenceId: null, agenceNom: null, agenceIds: [], isRestricted: false }
    }

    const agenceIds    = member.agenceMembers.map(am => am.agence.id)
    const isRestricted = member.agenceMembers.some(am => am.isRestricted)
    const primary      = member.agenceMembers[0]!

    return { agenceId: primary.agence.id, agenceNom: primary.agence.nom, agenceIds, isRestricted }
  } catch (e) {
    logger.warn('getUserAgence failed', { userId, companyId, error: e })
    return { agenceId: null, agenceNom: null, agenceIds: [], isRestricted: false }
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
  mfaMethod: 'NONE' | 'TOTP' | 'EMAIL' | 'SMS'
  mfaPhone: string | null
  mfaPhoneVerified: boolean
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  atheisNumber: string | null
  role: string
  platformRole: string
  companyId: string | null
  cabinetId: string | null
}

function toUserProfile(
  user: DbUser,
  plan: Plan | null,
  modules: Module[],
  agenceId: string | null = null,
  agenceNom: string | null = null,
): UserProfile {
  const companyId = user.companyId ?? null
  const cabinetId = user.cabinetId ?? null
  const role: UserRole = dbRoleToUserRole(user.role)

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
  mfaMethod: true,
  mfaPhone: true,
  mfaPhoneVerified: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  atheisNumber: true,
  role: true,
  platformRole: true,
  companyId: true,
  cabinetId: true,
} as const

/** Résout pays + currencySymbol pour n'importe quel type de compte */
async function resolveLocale(
  accountType: string,
  companyId: string | null,
  cabinetId: string | null,
  _userId: string,
): Promise<{ country: string | null; currencySymbol: string | null }> {
  if (companyId) {
    const row = await prisma.company.findUnique({
      where: { id: companyId },
      select: { pays: true, currencySymbol: true },
    })
    return { country: row?.pays ?? null, currencySymbol: row?.currencySymbol ?? null }
  }
  if (cabinetId) {
    // Cabinet doesn't have pays/currencySymbol in WSL2 — return defaults
    return { country: null, currencySymbol: null }
  }
  // PERSONAL accounts — no profile table in WSL2
  void accountType
  return { country: null, currencySymbol: null }
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
//
// FLOW phase de test :
// 1. User signup → user créé avec emailVerified=false, approvalStatus=PENDING_APPROVAL, isActive=false
// 2. Mail de vérification envoyé → user clique le lien → emailVerified=true
//    → mail "compte en attente de validation" envoyé au user
//    → notification envoyée à tous les SUPER_ADMINs
// 3. SUPER_ADMIN approuve depuis /admin/users/pending → approvalStatus=APPROVED + isActive=true
//    → mail de bienvenue envoyé au user
// 4. Le user peut désormais se connecter normalement
//
// Aucun token JWT n'est émis à l'inscription : login impossible tant que la chaîne
// vérification + approbation n'est pas complète.

async function generateVerificationToken(): Promise<{ token: string; expiresAt: Date }> {
  return {
    token:     crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex'),
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
  }
}

export async function register(
  dto: RegisterDto,
  ip: string,
  ua: string,
): Promise<{ response: RegisterResponse; refreshToken?: string; requiresEmailVerification: boolean }> {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } })
  if (existing) throw new AppError('Email déjà utilisé', 409, 'EMAIL_TAKEN')

  const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS)
  const atheisNumber = await generateAtheisNumber(dto.accountType as import('@prisma/client').AccountType)
  const { token: verificationToken, expiresAt: verificationExpiresAt } = await generateVerificationToken()

  // Tous les nouveaux comptes démarrent en PENDING_APPROVAL + non-vérifiés + inactifs
  const baseUserData = {
    email: dto.email,
    passwordHash,
    nom: dto.firstName ?? (dto.email.split('@')[0] ?? 'Utilisateur'),
    prenom: dto.lastName ?? null,
    atheisNumber,
    role: 'ADMIN' as const,
    isActive: false,
    emailVerified: false,
    emailVerificationToken: verificationToken,
    emailVerificationExpiresAt: verificationExpiresAt,
    approvalStatus: 'PENDING_APPROVAL' as const,
  }

  let dbUser: DbUser
  let companyNameForNotif: string | null = null
  let countryForNotif: string | null = null

  if (dto.accountType === 'PERSONAL') {
    const user = await prisma.user.create({
      data: { ...baseUserData, accountType: 'PERSONAL' },
      select: USER_SELECT,
    })
    dbUser = user as unknown as DbUser
  } else if (dto.accountType === 'COMPANY') {
    const registrationPlan = (dto.plan ?? 'FREE') as import('@prisma/client').Plan
    const modules = getDefaultModules(registrationPlan)
    const countryCfg = getCountryConfig(dto.country ?? 'FR')
    companyNameForNotif = dto.companyName
    countryForNotif = countryCfg.name
    dbUser = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          nom: dto.companyName,
          secteur: dto.secteur ?? null,
          taille: (dto.taille ?? 'PME') as import('@prisma/client').CompanySize,
          plan: registrationPlan,
          modules,
          pays: countryCfg.code,
          currency: countryCfg.currencyCode,
          currencySymbol: countryCfg.currencySymbol,
          accountingZone: countryCfg.accountingZone as import('@prisma/client').AccountingZone,
          accountingPlan: countryCfg.accountingPlan,
          locale: countryCfg.locale,
          timezone: countryCfg.timezone,
        },
      })
      const user = await tx.user.create({
        data: { ...baseUserData, accountType: 'COMPANY', companyId: company.id },
        select: USER_SELECT,
      })
      return user as unknown as DbUser
    })
  } else {
    companyNameForNotif = dto.cabinetName
    dbUser = await prisma.$transaction(async (tx) => {
      const cabinet = await tx.cabinet.create({
        data: { nom: dto.cabinetName, siret: dto.siret ?? null },
      })
      const user = await tx.user.create({
        data: { ...baseUserData, accountType: 'CABINET', cabinetId: cabinet.id },
        select: USER_SELECT,
      })
      return user as unknown as DbUser
    })
  }

  await audit('USER_CREATED', dbUser.id, dbUser.companyId ?? null, ip, ua, {
    accountType: dbUser.accountType,
    pendingApproval: true,
  })

  // Envoi du mail de vérification (non-bloquant — un échec SMTP ne casse pas le signup)
  void sendVerificationEmail(dbUser.email, {
    token:     verificationToken,
    firstName: dbUser.nom,
  }).catch((e) => logger.error('sendVerificationEmail failed', { userId: dbUser.id, error: e }))

  // Réponse minimale : pas de token, pas de profil complet. Le frontend redirige
  // vers /auth/verify-email?pending=1&email=... pour afficher "vérifie ta boîte".
  void companyNameForNotif; void countryForNotif
  return {
    response: {
      accessToken: '',
      user: null as never,
      requiresEmailVerification: true,
      email: dbUser.email,
    } as unknown as RegisterResponse,
    requiresEmailVerification: true,
  }
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
      emailVerified: true,
      approvalStatus: true,
    },
  })

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000)
    await audit('LOGIN_FAILED', user.id, user.companyId ?? null, ip, ua, { reason: 'account_locked' })
    throw new AppError(`Compte verrouillé. Réessayez dans ${minutes} min.`, 423, 'ACCOUNT_LOCKED')
  }

  const hashToCompare = user?.passwordHash ?? await DUMMY_HASH_PROMISE
  const valid = await bcrypt.compare(dto.password, hashToCompare)

  if (!user || !valid) {
    if (user) {
      const attempts = user.failedAttempts + 1
      const shouldLock = attempts >= MAX_FAILED_ATTEMPTS
      const lockedUntil = shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: attempts,
          ...(lockedUntil ? { lockedUntil } : {}),
        },
      })
      await audit(
        shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        user.id,
        user.companyId ?? null,
        ip, ua,
        { attempts },
      )

      // Notif sécurité au user quand son compte vient d'être verrouillé
      if (lockedUntil) {
        void sendAccountLockedEmail(user.email, {
          firstName:   user.nom,
          lockedUntil,
          ip,
        }).catch((e) => logger.error('sendAccountLockedEmail failed', { userId: user.id, error: e }))
      }
    }
    throw new AppError('Email ou mot de passe incorrect', 401, 'INVALID_CREDENTIALS')
  }

  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } })

  // ── Phase de test : guards email-verified + approval ────────────────────────
  // Note : on les place APRÈS validation du mot de passe pour ne pas révéler
  // l'existence d'un compte non-vérifié à un attaquant qui ne connaît pas le password.

  if (!user.emailVerified) {
    await audit('LOGIN_BLOCKED', user.id, user.companyId ?? null, ip, ua, { reason: 'email_not_verified' })
    throw new AppError(
      'Adresse e-mail non vérifiée. Vérifiez votre boîte de réception pour activer votre compte.',
      403, 'EMAIL_NOT_VERIFIED',
    )
  }

  if (user.approvalStatus === 'PENDING_APPROVAL') {
    await audit('LOGIN_BLOCKED', user.id, user.companyId ?? null, ip, ua, { reason: 'pending_approval' })
    throw new AppError(
      'Compte en attente de validation par notre équipe. Vous recevrez un e-mail dès l\'activation.',
      403, 'ACCOUNT_PENDING_APPROVAL',
    )
  }

  if (user.approvalStatus === 'REJECTED') {
    await audit('LOGIN_BLOCKED', user.id, user.companyId ?? null, ip, ua, { reason: 'rejected' })
    throw new AppError(
      'Votre demande d\'inscription n\'a pas été acceptée. Consultez l\'e-mail reçu pour plus d\'informations.',
      403, 'ACCOUNT_REJECTED',
    )
  }

  if (!user.isActive) {
    await audit('LOGIN_BLOCKED', user.id, user.companyId ?? null, ip, ua, { reason: 'inactive' })
    throw new AppError('Compte désactivé. Contactez votre administrateur.', 403, 'ACCOUNT_INACTIVE')
  }

  if (user.twoFAEnabled) {
    const tempToken = signTotpPendingToken(user.id)
    // Pour EMAIL/SMS, on déclenche tout de suite l'envoi du code afin que
    // l'utilisateur reçoive son code dans la foulée (1 étape de moins côté UX).
    if (user.mfaMethod === 'EMAIL' || user.mfaMethod === 'SMS') {
      try {
        const sent = await sendMfaLoginCode(user.id, ip, ua)
        return {
          response: {
            requiresTotp: true,
            mfaMethod:    user.mfaMethod,
            maskedTarget: sent.maskedTarget,
            tempToken,
          } as unknown as LoginResponse,
        }
      } catch (e) {
        // Si l'envoi rate (SMS provider down, etc.), on retourne quand même
        // le tempToken : le frontend pourra réessayer via /auth/mfa/send-code
        logger.error('login: failed to send MFA code, frontend will retry', { userId: user.id, error: e })
        return {
          response: {
            requiresTotp: true,
            mfaMethod:    user.mfaMethod,
            maskedTarget: null,
            tempToken,
          } as unknown as LoginResponse,
        }
      }
    }
    // TOTP : le code est déjà dans l'app du user, rien à envoyer
    return {
      response: {
        requiresTotp: true,
        mfaMethod:    'TOTP',
        tempToken,
      } as unknown as LoginResponse,
    }
  }

  const companyId = user.companyId ?? null
  const cabinetId = user.cabinetId ?? null
  const plan = await getEffectivePlan(user.accountType as AccountType, companyId)
  const modules = await getEffectiveModules(user.accountType as AccountType, companyId)
  const { country: loginCountry, currencySymbol: loginCurrencySymbol } = await resolveLocale(user.accountType, companyId, cabinetId, user.id)
  const { agenceId, agenceNom, agenceIds, isRestricted } = await getUserAgence(user.id, companyId)

  const role = dbRoleToUserRole(user.role)

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    accountType: user.accountType as AccountType,
    role,
    platformRole: (user.platformRole ?? 'USER') as 'USER' | 'SUPER_ADMIN',
    companyId,
    cabinetId,
    plan,
    modules,
    country: loginCountry,
    currencySymbol: loginCurrencySymbol,
    atheisNumber: user.atheisNumber ?? null,
    agenceId,
    agenceNom,
    agenceIds,
    isRestricted,
  })
  const refreshToken = await createRefreshToken(user.id)

  // Détection de la première connexion : lastLoginAt était null avant cet update.
  // On envoie un mail "premiers pas" différent du mail de bienvenue (qui est
  // déclenché par l'approbation admin, parfois plusieurs heures avant la 1ère
  // connexion effective).
  const isFirstLogin = user.lastLoginAt === null

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await audit('LOGIN', user.id, companyId, ip, ua)

  if (isFirstLogin) {
    // Charge le nom de l'entreprise/cabinet pour personnaliser le mail
    const orgName = companyId
      ? (await prisma.company.findUnique({ where: { id: companyId }, select: { nom: true } }))?.nom
      : cabinetId
        ? (await prisma.cabinet.findUnique({ where: { id: cabinetId }, select: { nom: true } }))?.nom
        : null
    void sendFirstLoginEmail(user.email, {
      firstName:   user.nom,
      accountType: user.accountType as 'PERSONAL' | 'COMPANY' | 'CABINET',
      companyName: orgName ?? null,
    }).catch((e) => logger.error('sendFirstLoginEmail failed', { userId: user.id, error: e }))
  }

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
      twoFASecret:    true,
      failedAttempts: true,
      lockedUntil:    true,
    },
  })

  if (!user?.twoFAEnabled || !user.twoFASecret) throw new AppError('TOTP non configuré', 400, 'TOTP_NOT_CONFIGURED')

  // N26 : vérifier le verrouillage TOTP issu d'un brute-force récent
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(
      `Compte verrouillé jusqu'à ${user.lockedUntil.toLocaleTimeString('fr-FR')}.`,
      423, 'ACCOUNT_LOCKED',
    )
  }

  // Check account is still active — the account may have been deactivated after the tempToken was issued
  if (!user.isActive) {
    await audit('LOGIN_FAILED', user.id, user.companyId ?? null, ip, ua, { reason: 'account_inactive' })
    throw new AppError('Compte désactivé. Contactez votre administrateur.', 403, 'ACCOUNT_INACTIVE')
  }

  if (!authenticator.check(code, decrypt(user.twoFASecret))) {
    // N26 : appliquer la même logique de lockout que login pour empêcher
    //       le brute-force TOTP (1M combinaisons à 60req/s = ~4h sans verrou).
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
      shouldLock ? 'ACCOUNT_LOCKED' : 'TOTP_FAILED',
      user.id, user.companyId ?? null, ip, ua,
      { attempts },
    )
    throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')
  }
  // TOTP réussi → reset des compteurs (comme login)
  await prisma.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedUntil: null } })

  const companyId = user.companyId ?? null
  const cabinetId = user.cabinetId ?? null
  const plan = await getEffectivePlan(user.accountType as AccountType, companyId)
  const modules = await getEffectiveModules(user.accountType as AccountType, companyId)
  const { country: totpCountry, currencySymbol: totpCurrencySymbol } = await resolveLocale(user.accountType, companyId, cabinetId, user.id)
  const { agenceId, agenceNom, agenceIds: totpAgenceIds, isRestricted: totpIsRestricted } = await getUserAgence(user.id, companyId)

  const role = dbRoleToUserRole(user.role)

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    accountType: user.accountType as AccountType,
    role,
    platformRole: (user.platformRole ?? 'USER') as 'USER' | 'SUPER_ADMIN',
    companyId,
    cabinetId,
    plan,
    modules,
    country: totpCountry,
    currencySymbol: totpCurrencySymbol,
    atheisNumber: user.atheisNumber ?? null,
    agenceId,
    agenceNom,
    agenceIds:    totpAgenceIds,
    isRestricted: totpIsRestricted,
  })
  const refreshToken = await createRefreshToken(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await audit('LOGIN', user.id, companyId, ip, ua)

  return { response: { accessToken, user: toUserProfile(user as unknown as DbUser, plan, modules, agenceId, agenceNom) }, refreshToken }
}

// ── Refresh ───────────────────────────────────────────────────────────────────

export async function refreshAccessToken(rawToken: string): Promise<RefreshTokenResponse & { refreshToken: string }> {
  const tokenHash = hashToken(rawToken)
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          accountType: true,
          isActive: true,
          atheisNumber: true,
          role: true,
          platformRole: true,
          companyId: true,
          cabinetId: true,
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
      data: { tokenHash: newHash, userId: stored.userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
    }),
  ])

  const u = stored.user
  const companyId = u.companyId ?? null
  const cabinetId = u.cabinetId ?? null
  const plan = await getEffectivePlan(u.accountType as AccountType, companyId)
  const modules = await getEffectiveModules(u.accountType as AccountType, companyId)
  const { country: refreshCountry, currencySymbol: refreshCurrencySymbol } = await resolveLocale(u.accountType, companyId, cabinetId, u.id)
  const { agenceId, agenceNom, agenceIds: refreshAgenceIds, isRestricted: refreshIsRestricted } = await getUserAgence(u.id, companyId)

  const role = dbRoleToUserRole(u.role)

  return {
    accessToken: signAccessToken({
      sub: u.id,
      email: u.email,
      accountType: u.accountType as AccountType,
      role,
      platformRole: ((u as { platformRole?: string }).platformRole ?? 'USER') as 'USER' | 'SUPER_ADMIN',
      companyId,
      cabinetId,
      plan,
      modules,
      country: refreshCountry,
      currencySymbol: refreshCurrencySymbol,
      atheisNumber: u.atheisNumber ?? null,
      agenceId,
      agenceNom,
      agenceIds:    refreshAgenceIds,
      isRestricted: refreshIsRestricted,
    }),
    refreshToken: newRaw,
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

export async function getTotpStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { twoFAEnabled: true },
  })
  return user.twoFAEnabled
}

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
      email:        true,
      nom:          true,
      twoFASecret:  true,
      twoFAEnabled: true,
      companyId:    true,
    },
  })
  if (user.twoFAEnabled) throw new AppError('TOTP déjà activé', 409, 'TOTP_ALREADY_ENABLED')
  if (!user.twoFASecret) throw new AppError('Lancez la configuration TOTP d\'abord', 400, 'TOTP_NOT_SETUP')
  if (!authenticator.check(dto.code, decrypt(user.twoFASecret))) throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')

  const enabledAt = new Date()
  await prisma.user.update({
    where: { id: userId },
    data:  { twoFAEnabled: true, mfaMethod: 'TOTP' },
  })
  await audit('TOTP_ENABLED', userId, user.companyId ?? null, ip, ua)

  // Notif sécurité au user — confirmation visible du changement critique
  void sendTwoFactorEnabledEmail(user.email, {
    firstName: user.nom,
    enabledAt,
  }).catch((e) => logger.error('sendTwoFactorEnabledEmail failed', { userId, error: e }))

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
      companyId: true,
    },
  })
  if (!user.twoFAEnabled) throw new AppError('TOTP non activé', 400, 'TOTP_NOT_ENABLED')
  if (!await bcrypt.compare(dto.password, user.passwordHash)) throw new AppError('Mot de passe incorrect', 401, 'INVALID_CREDENTIALS')
  if (!authenticator.check(dto.code, decrypt(user.twoFASecret!))) throw new AppError('Code TOTP invalide', 401, 'TOTP_INVALID')

  // N27 : révoquer toutes les sessions actives. Désactiver TOTP affaiblit
  //       la sécurité du compte ; un attaquant avec une session existante
  //       ne doit pas en bénéficier sans re-login complet.
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { twoFAEnabled: false, twoFASecret: null } }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    }),
  ])
  await audit('TOTP_DISABLED', userId, user.companyId ?? null, ip, ua)
}

// ── Accept Invitation ─────────────────────────────────────────────────────────

export async function acceptInvitation(
  token: string,
  password: string,
  ip: string,
  ua: string,
): Promise<{ accessToken: string; user: UserProfile; refreshToken: string }> {
  const invitation = await prisma.invitation.findUnique({ where: { token } })

  if (!invitation) throw new AppError('Invitation invalide ou introuvable', 404, 'INVITATION_NOT_FOUND')
  if (invitation.acceptedAt) throw new AppError('Cette invitation a déjà été utilisée', 409, 'INVITATION_ALREADY_USED')
  if (invitation.expiresAt < new Date()) throw new AppError('Cette invitation a expiré', 410, 'INVITATION_EXPIRED')

  // Load company data separately
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: invitation.companyId },
    select: { plan: true, currencySymbol: true, pays: true },
  })

  // Check if a user with this email already exists
  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email } })
  if (existingUser) throw new AppError('Un compte existe déjà avec cette adresse email', 409, 'EMAIL_ALREADY_EXISTS')

  // Resolve invitation roleId to a real CompanyRole UUID.
  // The invitation may store either a UUID (already correct) or a role enum string like
  // "ACCOUNTANT", "HR", etc. that must be mapped to the matching system role.
  const ROLE_ENUM_TO_NAME: Record<string, string> = {
    ADMIN:      'Administrateur',
    MANAGER:    'Gestionnaire',
    ACCOUNTANT: 'Comptable',
    HR:         'Responsable RH',
    SALES:      'Responsable commercial',
    READONLY:   'Lecture seule',
    CUSTOM:     'Personnalisé',
  }
  let resolvedRoleId = invitation.roleId
  // Enum strings are all-caps with optional underscores; UUIDs contain lowercase letters
  if (/^[A-Z_]+$/.test(invitation.roleId)) {
    const roleName   = ROLE_ENUM_TO_NAME[invitation.roleId]
    const systemRole = roleName
      ? await prisma.companyRole.findFirst({
          where: { companyId: invitation.companyId, name: roleName },
        })
      : null
    if (!systemRole) {
      // Fallback: try READONLY which every company has
      const fallback = await prisma.companyRole.findFirst({
        where: { companyId: invitation.companyId, name: 'Lecture seule' },
      })
      if (!fallback) throw new AppError(`Rôle '${invitation.roleId}' introuvable pour cette entreprise`, 404, 'ROLE_NOT_FOUND')
      resolvedRoleId = fallback.id
    } else {
      resolvedRoleId = systemRole.id
    }
  }

  const passwordHash  = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const atheisNumber  = await generateAtheisNumber('COMPANY')

  const result = await prisma.$transaction(async (tx) => {
    // Create user with companyId directly
    const user = await tx.user.create({
      data: {
        email:        invitation.email,
        passwordHash,
        nom:          '',
        prenom:       null,
        accountType:  'COMPANY',
        atheisNumber,
        role:         'READONLY',
        companyId:    invitation.companyId,
      },
    })

    // Create CompanyMember (resolvedRoleId is guaranteed to be a valid CompanyRole UUID)
    const companyMember = await tx.companyMember.create({
      data: {
        userId:    user.id,
        companyId: invitation.companyId,
        roleId:    resolvedRoleId,
        status:    'ACTIVE',
        invitedBy: invitation.createdBy,
        invitedAt: invitation.createdAt,
        joinedAt:  new Date(),
      },
    })

    // Assign agences if the invitation carried agenceIds
    if (invitation.agenceIds.length > 0) {
      await tx.agenceMember.createMany({
        data: invitation.agenceIds.map((agenceId: string) => ({
          agenceId,
          companyMemberId: companyMember.id,
          isRestricted:    invitation.isRestricted,
        })),
        skipDuplicates: true,
      })
    }

    // Mark invitation as accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data:  { acceptedAt: new Date() },
    })

    return user
  })

  const plan    = (company.plan ?? 'FREE') as Plan
  const modules = getDefaultModules(plan)

  await audit('USER_CREATED', result.id, invitation.companyId, ip, ua)

  const accessToken = signAccessToken({
    sub:            result.id,
    email:          result.email,
    accountType:    'COMPANY',
    role:           'READONLY',
    companyId:      invitation.companyId,
    cabinetId:      null,
    plan,
    modules,
    country:        company.pays ?? null,
    currencySymbol: company.currencySymbol ?? null,
    atheisNumber:   result.atheisNumber ?? null,
    agenceId:       null,
    agenceNom:      null,
    agenceIds:      [],
    isRestricted:   false,
  })
  const refreshToken = await createRefreshToken(result.id)

  return {
    accessToken,
    refreshToken,
    user: toUserProfile(
      result as unknown as DbUser,
      plan,
      modules,
      null,
      null,
    ),
  }
}

// ── MFA multi-méthode (EMAIL / SMS) ───────────────────────────────────────────
//
// TOTP est déjà géré par setupTotp/enableTotp/disableTotp/loginVerifyTotp
// (méthode "code généré par l'app, jamais envoyé").
// Ici on ajoute EMAIL et SMS : code à 6 chiffres envoyé à chaque setup ET à
// chaque login. Le code est hashé en DB (SHA-256), expire en 10 min, et
// invalidé après 5 essais ratés.

type MfaSendableMethod = 'EMAIL' | 'SMS'

async function generateAndStoreMfaCode(userId: string): Promise<string> {
  const code = generateMfaCode()
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaActiveCodeHash: hashMfaCode(code),
      mfaCodeExpiresAt:  new Date(Date.now() + MFA_CODE_TTL_MS),
      mfaCodeAttempts:   0,
    },
  })
  return code
}

async function sendMfaCodeViaMethod(opts: {
  method:   MfaSendableMethod
  email:    string
  phone:    string | null
  code:     string
  purpose:  'login' | 'setup'
  ip:       string | null
}): Promise<void> {
  if (opts.method === 'EMAIL') {
    await sendMfaCodeEmail(opts.email, {
      code: opts.code,
      purpose: opts.purpose,
      expiresInMinutes: Math.floor(MFA_CODE_TTL_MS / 60_000),
      ip: opts.ip,
    })
    return
  }
  // SMS
  if (!opts.phone) throw new AppError('Numéro de téléphone non configuré.', 400, 'SMS_PHONE_MISSING')
  const message = opts.purpose === 'login'
    ? `Athenis - votre code de connexion : ${opts.code} (valable 10 min). N'envoyez ce code à personne.`
    : `Athenis - code de vérification : ${opts.code} (valable 10 min). Confirmez votre numéro pour activer le 2FA.`
  const result = await sendSms(opts.phone, message)
  if (!result.success) {
    logger.error('sendMfaCodeViaMethod: SMS provider failure', { error: result.error, provider: result.provider })
    throw new AppError(
      result.error === 'INVALID_PHONE_FORMAT'
        ? 'Format de numéro invalide (utiliser le format international +XXX...).'
        : 'Échec d\'envoi du SMS. Vérifiez votre numéro ou contactez le support.',
      500, 'SMS_SEND_FAILED',
    )
  }
}

/** Démarre la configuration MFA par email (envoie un code de vérification) */
export async function setupEmailMfa(userId: string, ip: string, ua: string): Promise<{ maskedEmail: string }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, twoFAEnabled: true, mfaMethod: true, companyId: true },
  })
  if (user.twoFAEnabled) throw new AppError('Une méthode MFA est déjà active. Désactivez-la d\'abord.', 409, 'MFA_ALREADY_ENABLED')

  const code = await generateAndStoreMfaCode(userId)
  await sendMfaCodeViaMethod({ method: 'EMAIL', email: user.email, phone: null, code, purpose: 'setup', ip })
  await audit('MFA_EMAIL_SETUP_REQUESTED', userId, user.companyId ?? null, ip, ua)

  return { maskedEmail: maskEmail(user.email) }
}

/** Démarre la configuration MFA par SMS (envoie un code de vérification au téléphone) */
export async function setupSmsMfa(
  userId: string,
  phoneInput: string,
  ip: string,
  ua: string,
): Promise<{ maskedPhone: string; smsConfigured: boolean }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, twoFAEnabled: true, companyId: true },
  })
  if (user.twoFAEnabled) throw new AppError('Une méthode MFA est déjà active. Désactivez-la d\'abord.', 409, 'MFA_ALREADY_ENABLED')

  const phone = normalizePhoneE164(phoneInput)
  if (!phone) throw new AppError('Format de numéro invalide. Utilisez le format international +237691234567.', 400, 'INVALID_PHONE_FORMAT')

  const smsReady = isSmsConfigured()
  if (!smsReady) {
    // Mode dev / phase de test sans provider SMS : on log le code dans la console
    // pour permettre les tests, et on indique au frontend que le SMS n'est pas réel.
    logger.warn('setupSmsMfa: SMS provider not configured — code will be logged only', { userId })
  }

  // Persiste le téléphone (non vérifié pour l'instant) + génère le code
  await prisma.user.update({
    where: { id: userId },
    data:  { mfaPhone: phone, mfaPhoneVerified: false },
  })
  const code = await generateAndStoreMfaCode(userId)
  await sendMfaCodeViaMethod({ method: 'SMS', email: user.email, phone, code, purpose: 'setup', ip })
  await audit('MFA_SMS_SETUP_REQUESTED', userId, user.companyId ?? null, ip, ua, { phoneE164: phone })

  return { maskedPhone: maskPhone(phone), smsConfigured: smsReady }
}

/** Vérifie le code envoyé pendant le setup et active la méthode MFA correspondante */
export async function verifyMfaSetup(
  userId: string,
  method: MfaSendableMethod,
  code: string,
  ip: string,
  ua: string,
): Promise<{ enabled: true; backupCodes: string[] }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true, nom: true, companyId: true,
      twoFAEnabled: true,
      mfaActiveCodeHash: true, mfaCodeExpiresAt: true, mfaCodeAttempts: true,
      mfaPhone: true,
    },
  })
  if (user.twoFAEnabled) throw new AppError('MFA déjà activé.', 409, 'MFA_ALREADY_ENABLED')
  if (!user.mfaActiveCodeHash || !user.mfaCodeExpiresAt) throw new AppError('Aucun code en attente. Recommencez la configuration.', 400, 'MFA_NO_CODE')
  if (user.mfaCodeExpiresAt < new Date()) throw new AppError('Code expiré. Demandez un nouveau code.', 410, 'MFA_CODE_EXPIRED')

  if (user.mfaCodeAttempts >= MFA_MAX_ATTEMPTS) {
    await prisma.user.update({ where: { id: userId }, data: { mfaActiveCodeHash: null, mfaCodeExpiresAt: null, mfaCodeAttempts: 0 } })
    throw new AppError('Trop de tentatives. Demandez un nouveau code.', 429, 'MFA_TOO_MANY_ATTEMPTS')
  }

  if (!safeEqualHashes(user.mfaActiveCodeHash, hashMfaCode(code))) {
    await prisma.user.update({ where: { id: userId }, data: { mfaCodeAttempts: { increment: 1 } } })
    await audit('MFA_CODE_INVALID', userId, user.companyId ?? null, ip, ua, { method })
    throw new AppError('Code incorrect.', 401, 'MFA_CODE_INVALID')
  }

  // Code valide → active la méthode + nettoie le code one-time
  const updateData: { twoFAEnabled: boolean; mfaMethod: 'EMAIL' | 'SMS'; mfaActiveCodeHash: null; mfaCodeExpiresAt: null; mfaCodeAttempts: number; mfaPhoneVerified?: boolean } = {
    twoFAEnabled:      true,
    mfaMethod:         method,
    mfaActiveCodeHash: null,
    mfaCodeExpiresAt:  null,
    mfaCodeAttempts:   0,
  }
  if (method === 'SMS') updateData.mfaPhoneVerified = true

  await prisma.user.update({ where: { id: userId }, data: updateData })
  await audit(method === 'EMAIL' ? 'MFA_EMAIL_ENABLED' : 'MFA_SMS_ENABLED', userId, user.companyId ?? null, ip, ua)

  void sendTwoFactorEnabledEmail(user.email, { firstName: user.nom, enabledAt: new Date() })
    .catch((e) => logger.error('sendTwoFactorEnabledEmail failed', { userId, error: e }))

  const backupCodes = Array.from({ length: 8 }, () => crypto.randomBytes(5).toString('hex').toUpperCase())
  return { enabled: true, backupCodes }
}

/** Renvoie l'état MFA complet du user — pour /auth/mfa/status */
export async function getMfaStatus(userId: string): Promise<{
  enabled: boolean
  method: 'NONE' | 'TOTP' | 'EMAIL' | 'SMS'
  maskedPhone: string | null
  maskedEmail: string | null
  smsConfigured: boolean
}> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, twoFAEnabled: true, mfaMethod: true, mfaPhone: true, mfaPhoneVerified: true },
  })
  return {
    enabled:        user.twoFAEnabled,
    method:         user.mfaMethod,
    maskedPhone:    user.mfaPhone && user.mfaPhoneVerified ? maskPhone(user.mfaPhone) : null,
    maskedEmail:    maskEmail(user.email),
    smsConfigured:  isSmsConfigured(),
  }
}

/** Désactive toute méthode MFA (password + code MFA actuel requis pour confirmer) */
export async function disableMfa(
  userId: string,
  password: string,
  code: string,
  ip: string,
  ua: string,
): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email: true, passwordHash: true,
      twoFAEnabled: true, mfaMethod: true,
      twoFASecret: true,
      mfaActiveCodeHash: true, mfaCodeExpiresAt: true,
      companyId: true,
    },
  })
  if (!user.twoFAEnabled || user.mfaMethod === 'NONE') throw new AppError('MFA non activé.', 400, 'MFA_NOT_ENABLED')
  if (!await bcrypt.compare(password, user.passwordHash)) throw new AppError('Mot de passe incorrect.', 401, 'INVALID_CREDENTIALS')

  // Vérifier le code selon la méthode
  if (user.mfaMethod === 'TOTP') {
    if (!user.twoFASecret || !authenticator.check(code, decrypt(user.twoFASecret))) {
      throw new AppError('Code 2FA incorrect.', 401, 'MFA_CODE_INVALID')
    }
  } else {
    // EMAIL/SMS : on attend que le user ait d'abord demandé un code via
    // /auth/mfa/send-code, qui aura mis mfaActiveCodeHash en DB.
    if (!user.mfaActiveCodeHash || !user.mfaCodeExpiresAt || user.mfaCodeExpiresAt < new Date()) {
      throw new AppError('Aucun code valide. Demandez un nouveau code d\'abord.', 400, 'MFA_NO_CODE')
    }
    if (!safeEqualHashes(user.mfaActiveCodeHash, hashMfaCode(code))) {
      throw new AppError('Code incorrect.', 401, 'MFA_CODE_INVALID')
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled:      false,
        mfaMethod:         'NONE',
        twoFASecret:       null,
        mfaPhone:          null,
        mfaPhoneVerified:  false,
        mfaActiveCodeHash: null,
        mfaCodeExpiresAt:  null,
        mfaCodeAttempts:   0,
      },
    }),
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data:  { revokedAt: new Date() },
    }),
  ])
  await audit('MFA_DISABLED', userId, user.companyId ?? null, ip, ua, { previousMethod: user.mfaMethod })
}

/**
 * Envoie un code de connexion par EMAIL ou SMS.
 * Appelé pendant le 2e step du login pour méthode EMAIL/SMS, OU pendant
 * la désactivation pour valider l'identité.
 */
export async function sendMfaLoginCode(userId: string, ip: string, ua: string): Promise<{ maskedTarget: string; method: 'EMAIL' | 'SMS' }> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, mfaMethod: true, mfaPhone: true, mfaPhoneVerified: true, twoFAEnabled: true, companyId: true },
  })
  if (!user.twoFAEnabled) throw new AppError('MFA non activé.', 400, 'MFA_NOT_ENABLED')
  if (user.mfaMethod !== 'EMAIL' && user.mfaMethod !== 'SMS') {
    throw new AppError('Cette méthode n\'envoie pas de code (utilisez votre application d\'authentification).', 400, 'MFA_WRONG_METHOD')
  }
  if (user.mfaMethod === 'SMS' && (!user.mfaPhone || !user.mfaPhoneVerified)) {
    throw new AppError('Numéro de téléphone non vérifié.', 400, 'SMS_NOT_VERIFIED')
  }

  const code = await generateAndStoreMfaCode(userId)
  await sendMfaCodeViaMethod({
    method:  user.mfaMethod,
    email:   user.email,
    phone:   user.mfaPhone,
    code,
    purpose: 'login',
    ip,
  })
  await audit('MFA_CODE_SENT', userId, user.companyId ?? null, ip, ua, { method: user.mfaMethod })

  return {
    method:       user.mfaMethod,
    maskedTarget: user.mfaMethod === 'SMS' ? maskPhone(user.mfaPhone!) : maskEmail(user.email),
  }
}

/** Vérifie le code EMAIL/SMS pendant le login (étape 2 après password OK) */
export async function loginVerifyMfaCode(
  tempToken: string,
  code: string,
  ip: string,
  ua: string,
): Promise<{ response: LoginResponse; refreshToken: string }> {
  let userId: string
  try {
    userId = verifyTotpPendingToken(tempToken)  // réutilise le même tempToken
  } catch {
    throw new AppError('Token invalide ou expiré.', 401, 'TOKEN_INVALID')
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...USER_SELECT,
      twoFASecret:    true,
      mfaActiveCodeHash: true, mfaCodeExpiresAt: true, mfaCodeAttempts: true,
      failedAttempts: true, lockedUntil: true,
    },
  })
  if (!user) throw new AppError('Utilisateur introuvable.', 404, 'USER_NOT_FOUND')
  if (user.mfaMethod !== 'EMAIL' && user.mfaMethod !== 'SMS') throw new AppError('Méthode MFA incompatible.', 400, 'MFA_WRONG_METHOD')

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(`Compte verrouillé jusqu'à ${user.lockedUntil.toLocaleTimeString('fr-FR')}.`, 423, 'ACCOUNT_LOCKED')
  }
  if (!user.isActive) throw new AppError('Compte désactivé.', 403, 'ACCOUNT_INACTIVE')

  // Validation du code
  if (!user.mfaActiveCodeHash || !user.mfaCodeExpiresAt) throw new AppError('Aucun code en attente. Demandez un nouveau code.', 400, 'MFA_NO_CODE')
  if (user.mfaCodeExpiresAt < new Date()) throw new AppError('Code expiré. Demandez un nouveau code.', 410, 'MFA_CODE_EXPIRED')

  if (user.mfaCodeAttempts >= MFA_MAX_ATTEMPTS) {
    // Trop d'essais ratés sur ce code : on l'invalide. L'utilisateur devra redemander un code.
    await prisma.user.update({ where: { id: userId }, data: { mfaActiveCodeHash: null, mfaCodeExpiresAt: null, mfaCodeAttempts: 0 } })
    await audit('MFA_CODE_LOCKED', userId, user.companyId ?? null, ip, ua)
    throw new AppError('Trop de tentatives. Demandez un nouveau code.', 429, 'MFA_TOO_MANY_ATTEMPTS')
  }

  if (!safeEqualHashes(user.mfaActiveCodeHash, hashMfaCode(code))) {
    await prisma.user.update({ where: { id: userId }, data: { mfaCodeAttempts: { increment: 1 } } })
    await audit('MFA_CODE_INVALID', userId, user.companyId ?? null, ip, ua, { method: user.mfaMethod })
    throw new AppError('Code incorrect.', 401, 'MFA_CODE_INVALID')
  }

  // Code OK → invalider + login complet
  await prisma.user.update({
    where: { id: userId },
    data: {
      mfaActiveCodeHash: null, mfaCodeExpiresAt: null, mfaCodeAttempts: 0,
      failedAttempts: 0, lockedUntil: null,
      lastLoginAt: new Date(),
    },
  })

  const companyId = user.companyId ?? null
  const cabinetId = user.cabinetId ?? null
  const plan      = await getEffectivePlan(user.accountType as AccountType, companyId)
  const modules   = await getEffectiveModules(user.accountType as AccountType, companyId)
  const { country, currencySymbol } = await resolveLocale(user.accountType, companyId, cabinetId, user.id)
  const { agenceId, agenceNom, agenceIds, isRestricted } = await getUserAgence(user.id, companyId)

  const role = dbRoleToUserRole(user.role)
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    accountType: user.accountType as AccountType,
    role,
    platformRole: (user.platformRole ?? 'USER') as 'USER' | 'SUPER_ADMIN',
    companyId, cabinetId, plan, modules,
    country, currencySymbol,
    atheisNumber: user.atheisNumber ?? null,
    agenceId, agenceNom, agenceIds, isRestricted,
  })
  const refreshToken = await createRefreshToken(user.id)
  await audit('LOGIN', user.id, companyId, ip, ua, { mfaMethod: user.mfaMethod })

  return {
    response: { accessToken, user: toUserProfile(user as unknown as DbUser, plan, modules, agenceId, agenceNom) },
    refreshToken,
  }
}

// ── Email verification ────────────────────────────────────────────────────────

export async function verifyEmail(
  token: string,
  ip: string,
  ua: string,
): Promise<{ response: LoginResponse; refreshToken?: string }> {
  if (!token || token.length < 32) {
    throw new AppError('Lien invalide.', 400, 'TOKEN_INVALID')
  }

  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: token },
    select: {
      ...USER_SELECT,
      emailVerified:              true,
      emailVerificationExpiresAt: true,
      approvalStatus:             true,
    },
  })

  if (!user) {
    throw new AppError('Lien invalide ou déjà utilisé.', 404, 'TOKEN_NOT_FOUND')
  }
  if (user.emailVerified) {
    // Idempotent : ne rien faire de plus, renvoyer un statut "pending approval"
    return {
      response: {
        accessToken: '',
        user: null as never,
        requiresApproval: user.approvalStatus !== 'APPROVED',
      } as unknown as LoginResponse,
    }
  }
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    throw new AppError('Lien expiré. Demandez un nouvel e-mail de confirmation.', 410, 'TOKEN_EXPIRED')
  }

  // Marquer vérifié, invalider le token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified:              true,
      emailVerificationToken:     null,
      emailVerificationExpiresAt: null,
    },
  })

  await audit('EMAIL_VERIFIED', user.id, user.companyId ?? null, ip, ua)

  // Notifications : 1) user "compte en attente" / 2) admins "nouvelle inscription"
  void sendPendingApprovalEmail(user.email, { firstName: user.nom })
    .catch((e) => logger.error('sendPendingApprovalEmail failed', { userId: user.id, error: e }))

  // Notifier les SUPER_ADMINs en parallèle (non-bloquant)
  void notifySuperAdminsOfNewSignup({
    userEmail:     user.email,
    userFirstName: user.nom,
    accountType:   user.accountType,
    companyId:     user.companyId,
    cabinetId:     user.cabinetId,
  }).catch((e) => logger.error('notifySuperAdminsOfNewSignup failed', { userId: user.id, error: e }))

  // Pas de tokens : il faut attendre l'approbation admin
  return {
    response: {
      accessToken: '',
      user: null as never,
      requiresApproval: true,
      email: user.email,
    } as unknown as LoginResponse,
  }
}

async function notifySuperAdminsOfNewSignup(opts: {
  userEmail: string
  userFirstName: string
  accountType: string
  companyId: string | null
  cabinetId: string | null
}): Promise<void> {
  const [admins, orgInfo] = await Promise.all([
    prisma.user.findMany({
      where: { platformRole: 'SUPER_ADMIN', isActive: true, emailVerified: true },
      select: { email: true },
    }),
    opts.companyId
      ? prisma.company.findUnique({
          where: { id: opts.companyId },
          select: { nom: true, pays: true },
        })
      : opts.cabinetId
        ? prisma.cabinet
            .findUnique({ where: { id: opts.cabinetId }, select: { nom: true } })
            .then((c) => (c ? { nom: c.nom, pays: null as string | null } : null))
        : Promise.resolve(null),
  ])

  await Promise.all(
    admins.map((a) =>
      sendAdminNewSignupNotification({
        adminEmail:    a.email,
        userEmail:     opts.userEmail,
        userFirstName: opts.userFirstName,
        accountType:   opts.accountType,
        companyName:   orgInfo?.nom ?? null,
        country:       orgInfo?.pays ?? null,
      }).catch((e) => logger.error('sendAdminNewSignupNotification failed', { adminEmail: a.email, error: e })),
    ),
  )
}

export async function resendVerification(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, nom: true },
  })

  // Silent : ne rien révéler sur l'existence du compte (anti-enumeration)
  if (!user || user.emailVerified) return

  const { token, expiresAt } = await generateVerificationToken()
  await prisma.user.update({
    where: { id: user.id },
    data:  { emailVerificationToken: token, emailVerificationExpiresAt: expiresAt },
  })

  void sendVerificationEmail(email, { token, firstName: user.nom })
    .catch((e) => logger.error('sendVerificationEmail (resend) failed', { userId: user.id, error: e }))
}

export async function changePassword(userId: string, dto: ChangePasswordDto, ip: string, ua: string): Promise<void> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      email:        true,
      nom:          true,
      passwordHash: true,
      companyId:    true,
    },
  })
  if (!await bcrypt.compare(dto.currentPassword, user.passwordHash)) throw new AppError('Mot de passe actuel incorrect', 401, 'INVALID_CREDENTIALS')

  const newPasswordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS)
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: newPasswordHash } }),
    prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ])
  await audit('PASSWORD_CHANGED', userId, user.companyId ?? null, ip, ua)

  // Notif sécurité au user (toujours bonne pratique : confirmer un changement de mdp)
  void sendPasswordChangedEmail(user.email, {
    firstName: user.nom,
    ip,
    userAgent: ua,
    changedAt: new Date(),
  }).catch((e) => logger.error('sendPasswordChangedEmail failed', { userId, error: e }))
}
