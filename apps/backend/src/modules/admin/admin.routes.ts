/**
 * Routes d'administration — métriques SaaS + validation des comptes
 * Accès réservé : platformRole === SUPER_ADMIN
 * (Le champ platformRole est distinct du champ role qui est un rôle d'entreprise.)
 */
import { Router } from 'express'
import os from 'os'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'
import { logger } from '../../lib/logger.js'
import { sendWelcomeEmail, sendRejectionEmail, sendAccountDeactivatedEmail, sendAccountDeletedEmail } from '../../lib/email.js'

export const adminRouter = Router()

// ── Guard SUPER_ADMIN — vérifie platformRole en base (pas le JWT) ─────────────
adminRouter.use(authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.sub
    if (!userId) { res.status(401).json({ success: false, error: 'Non authentifié' }); return }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { platformRole: true } })
    if (user?.platformRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Accès réservé aux super-administrateurs' })
      return
    }
    next()
  } catch (err) { next(err) }
})

// ── GET /api/admin/metrics ────────────────────────────────────────────────────
adminRouter.get('/metrics', async (_req, res, next) => {
  try {
    const now   = new Date()
    const day30 = new Date(now); day30.setDate(day30.getDate() - 30)
    const day7  = new Date(now); day7.setDate(day7.getDate() - 7)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      usersByType,
      totalCompanies,
      companiesByPlan,
      newUsersThisMonth,
      activeUsersLast30,
      activeUsersLast7,
      expiringSoon,
      totalCabinets,
    ] = await Promise.all([
      // Total utilisateurs
      prisma.user.count({ where: { isActive: true } }),

      // Répartition par type de compte
      prisma.user.groupBy({
        by: ['accountType'],
        where: { isActive: true },
        _count: { id: true },
      }),

      // Total entreprises
      prisma.company.count(),

      // Entreprises par plan
      prisma.company.groupBy({
        by: ['plan'],
        _count: { id: true },
      }),

      // Nouvelles inscriptions ce mois
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth } },
      }),

      // Utilisateurs actifs 30 derniers jours (dernière connexion)
      prisma.user.count({
        where: { lastLoginAt: { gte: day30 }, isActive: true },
      }),

      // Utilisateurs actifs 7 derniers jours
      prisma.user.count({
        where: { lastLoginAt: { gte: day7 }, isActive: true },
      }),

      // Plans expirant dans 30 jours (colonne optionnelle — 0 si absente)
      prisma.company.count({
        where: {
          planExpiresAt: { gte: now, lte: day30 },
          plan: { not: 'FREE' },
        },
      }).catch(() => 0),

      // Total cabinets
      prisma.cabinet.count(),
    ])

    const planOrder = ['FREE', 'STARTER', 'PRO', 'PREMIUM'] as const
    const planMap = Object.fromEntries(
      companiesByPlan.map(r => [r.plan, r._count.id])
    )

    res.json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        users: {
          total: totalUsers,
          byType: Object.fromEntries(usersByType.map(r => [r.accountType, r._count.id])),
          newThisMonth: newUsersThisMonth,
          activeLast30Days: activeUsersLast30,
          activeLast7Days: activeUsersLast7,
        },
        companies: {
          total: totalCompanies,
          byPlan: Object.fromEntries(planOrder.map(p => [p, planMap[p] ?? 0])),
          expiringSoon,
        },
        cabinets: {
          total: totalCabinets,
        },
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/admin/companies — liste paginée ──────────────────────────────────
adminRouter.get('/companies', async (req, res, next) => {
  try {
    const page  = parseInt(String(req.query['page']  ?? '1'))
    const limit = parseInt(String(req.query['limit'] ?? '20'))
    const plan  = req.query['plan'] as string | undefined

    type PlanEnum = 'FREE' | 'STARTER' | 'PRO' | 'PREMIUM'
    const whereClause = plan ? { plan: plan as PlanEnum } : {}

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where: whereClause,
        select: {
          id: true,
          nom: true,
          plan: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.company.count({ where: whereClause }),
    ])

    res.json({
      success: true,
      data: {
        items: companies,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/admin/users — liste paginée ──────────────────────────────────────
adminRouter.get('/users', async (req, res, next) => {
  try {
    const page  = parseInt(String(req.query['page']  ?? '1'))
    const limit = Math.min(parseInt(String(req.query['limit'] ?? '20')), 100)
    const q     = (req.query['q'] as string | undefined)?.trim() ?? ''

    const where = q
      ? { email: { contains: q, mode: 'insensitive' as const } }
      : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          accountType: true,
          platformRole: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          companyId: true,
          cabinetId: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      success: true,
      data: {
        items: users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/admin/users/pending ─────────────────────────────────────────────
// Liste des comptes en attente de validation (email vérifié, approval=PENDING)
adminRouter.get('/users/pending', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        approvalStatus: 'PENDING_APPROVAL',
        emailVerified:  true,
      },
      select: {
        id:           true,
        email:        true,
        nom:          true,
        prenom:       true,
        accountType:  true,
        atheisNumber: true,
        createdAt:    true,
        companyId:    true,
        cabinetId:    true,
        company:      { select: { nom: true, pays: true, plan: true, secteur: true, taille: true } },
        cabinet:      { select: { nom: true, siret: true } },
      },
      orderBy: { createdAt: 'asc' }, // FIFO : les plus anciens en premier
    })

    res.json({ success: true, data: { items: users, total: users.length } })
  } catch (err) { next(err) }
})

// ── GET /api/admin/users/pending/count ───────────────────────────────────────
adminRouter.get('/users/pending/count', async (_req, res, next) => {
  try {
    const count = await prisma.user.count({
      where: { approvalStatus: 'PENDING_APPROVAL', emailVerified: true },
    })
    res.json({ success: true, data: { count } })
  } catch (err) { next(err) }
})

// ── POST /api/admin/users/:id/approve ────────────────────────────────────────
adminRouter.post('/users/:id/approve', async (req, res, next) => {
  try {
    const userId = String(req.params['id'])
    const approverId = req.user!.sub

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, nom: true, accountType: true,
        emailVerified: true, approvalStatus: true,
        company: { select: { nom: true } },
        cabinet: { select: { nom: true } },
      },
    })

    if (!user)                              { res.status(404).json({ success: false, error: 'Utilisateur introuvable' }); return }
    if (!user.emailVerified)                { res.status(400).json({ success: false, error: 'L\'email n\'est pas encore vérifié' }); return }
    if (user.approvalStatus === 'APPROVED') { res.status(409).json({ success: false, error: 'Compte déjà approuvé' }); return }
    if (user.approvalStatus === 'REJECTED') { res.status(409).json({ success: false, error: 'Compte refusé — utiliser /reset pour réinitialiser' }); return }

    await prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt:     new Date(),
        approvedById:   approverId,
        isActive:       true,
        rejectedAt:     null,
        rejectionReason: null,
      },
    })

    await prisma.auditLog.create({
      data: {
        action:    'USER_APPROVED',
        resource:  'user',
        userId:    approverId,
        metadata:  { targetUserId: userId, targetEmail: user.email },
      },
    }).catch((e) => logger.error('audit USER_APPROVED failed', { error: e }))

    void sendWelcomeEmail(user.email, {
      firstName:   user.nom,
      companyName: user.company?.nom ?? user.cabinet?.nom ?? null,
      accountType: user.accountType,
    }).catch((e) => logger.error('sendWelcomeEmail failed', { userId, error: e }))

    res.json({ success: true, data: { id: userId, approvalStatus: 'APPROVED' } })
  } catch (err) { next(err) }
})

// ── POST /api/admin/users/:id/reject ─────────────────────────────────────────
adminRouter.post('/users/:id/reject', async (req, res, next) => {
  try {
    const userId = String(req.params['id'])
    const approverId = req.user!.sub
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : null

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nom: true, approvalStatus: true },
    })

    if (!user)                              { res.status(404).json({ success: false, error: 'Utilisateur introuvable' }); return }
    if (user.approvalStatus === 'REJECTED') { res.status(409).json({ success: false, error: 'Compte déjà refusé' }); return }

    await prisma.user.update({
      where: { id: userId },
      data: {
        approvalStatus:  'REJECTED',
        rejectedAt:      new Date(),
        rejectionReason: reason,
        isActive:        false,
        approvedAt:      null,
        approvedById:    null,
      },
    })

    await prisma.auditLog.create({
      data: {
        action:    'USER_REJECTED',
        resource:  'user',
        userId:    approverId,
        metadata:  { targetUserId: userId, targetEmail: user.email, reason },
      },
    }).catch((e) => logger.error('audit USER_REJECTED failed', { error: e }))

    void sendRejectionEmail(user.email, { firstName: user.nom, reason })
      .catch((e) => logger.error('sendRejectionEmail failed', { userId, error: e }))

    res.json({ success: true, data: { id: userId, approvalStatus: 'REJECTED' } })
  } catch (err) { next(err) }
})

// ── POST /api/admin/users/:id/deactivate ─────────────────────────────────────
// Désactive un compte (soft) : is_active=false + révocation des tokens.
// L'utilisateur ne peut plus se connecter. Toutes ses sessions actives sont fermées.
adminRouter.post('/users/:id/deactivate', async (req, res, next) => {
  try {
    const userId = String(req.params['id'])
    const adminId = req.user!.sub
    const reason  = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : null

    if (userId === adminId) {
      res.status(400).json({ success: false, error: 'Vous ne pouvez pas vous désactiver vous-même.', code: 'CANNOT_DEACTIVATE_SELF' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nom: true, isActive: true, platformRole: true, companyId: true },
    })
    if (!user) { res.status(404).json({ success: false, error: 'Utilisateur introuvable' }); return }
    if (!user.isActive) { res.status(409).json({ success: false, error: 'Compte déjà désactivé' }); return }

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { isActive: false } }),
      // Révoquer toutes les sessions actives → l'utilisateur est kické immédiatement
      prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data:  { revokedAt: new Date() },
      }),
    ])

    await prisma.auditLog.create({
      data: {
        action:   'USER_DEACTIVATED',
        resource: 'user',
        userId:   adminId,
        companyId: user.companyId,
        metadata: { targetUserId: userId, targetEmail: user.email, reason },
      },
    }).catch((e) => logger.error('audit USER_DEACTIVATED failed', { error: e }))

    void sendAccountDeactivatedEmail(user.email, { firstName: user.nom, reason })
      .catch((e) => logger.error('sendAccountDeactivatedEmail failed', { userId, error: e }))

    res.json({ success: true, data: { id: userId, isActive: false } })
  } catch (err) { next(err) }
})

// ── POST /api/admin/users/:id/reactivate ─────────────────────────────────────
// Réactive un compte précédemment désactivé. L'utilisateur peut se reconnecter.
adminRouter.post('/users/:id/reactivate', async (req, res, next) => {
  try {
    const userId  = String(req.params['id'])
    const adminId = req.user!.sub

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isActive: true, companyId: true },
    })
    if (!user) { res.status(404).json({ success: false, error: 'Utilisateur introuvable' }); return }
    if (user.isActive) { res.status(409).json({ success: false, error: 'Compte déjà actif' }); return }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true, failedAttempts: 0, lockedUntil: null },
    })

    await prisma.auditLog.create({
      data: {
        action:   'USER_REACTIVATED',
        resource: 'user',
        userId:   adminId,
        companyId: user.companyId,
        metadata: { targetUserId: userId, targetEmail: user.email },
      },
    }).catch((e) => logger.error('audit USER_REACTIVATED failed', { error: e }))

    res.json({ success: true, data: { id: userId, isActive: true } })
  } catch (err) { next(err) }
})

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────
// Supprime définitivement un utilisateur. CASCADE :
//   - Si COMPANY → supprime la company + toutes ses données (factures, employés, etc.)
//   - Si CABINET → supprime le cabinet + ses invitations
//   - Si PERSONAL → supprime ses revenus/dépenses/objectifs
// IRRÉVERSIBLE. Pour les données comptables OHADA/PCG conservées 10 ans légalement,
// utiliser plutôt deactivate.
adminRouter.delete('/users/:id', async (req, res, next) => {
  try {
    const userId  = String(req.params['id'])
    const adminId = req.user!.sub
    const reason  = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 500) : null

    if (userId === adminId) {
      res.status(400).json({ success: false, error: 'Vous ne pouvez pas supprimer votre propre compte.', code: 'CANNOT_DELETE_SELF' })
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nom: true, accountType: true, platformRole: true, companyId: true, cabinetId: true },
    })
    if (!user) { res.status(404).json({ success: false, error: 'Utilisateur introuvable' }); return }

    // Garde-fou : ne pas supprimer le dernier SUPER_ADMIN de la plateforme
    if (user.platformRole === 'SUPER_ADMIN') {
      const otherSuperAdmins = await prisma.user.count({
        where: { platformRole: 'SUPER_ADMIN', id: { not: userId }, isActive: true },
      })
      if (otherSuperAdmins === 0) {
        res.status(400).json({ success: false, error: 'Impossible de supprimer le dernier super-administrateur actif de la plateforme.', code: 'LAST_SUPER_ADMIN' })
        return
      }
    }

    // Envoi du mail AVANT suppression (sinon on perd l'adresse)
    void sendAccountDeletedEmail(user.email, { firstName: user.nom, reason })
      .catch((e) => logger.error('sendAccountDeletedEmail failed', { userId, error: e }))

    // Audit log avant suppression (préserver la trace) — on stocke un snapshot
    await prisma.auditLog.create({
      data: {
        action:   'USER_DELETED',
        resource: 'user',
        userId:   adminId,
        companyId: user.companyId,
        metadata: {
          targetUserId:    userId,
          targetEmail:     user.email,
          targetAccountType: user.accountType,
          reason,
        },
      },
    }).catch((e) => logger.error('audit USER_DELETED failed', { error: e }))

    // Suppression effective (cascade Prisma vers les données du user)
    await prisma.user.delete({ where: { id: userId } })

    // ── Cleanup organisations orphelines ─────────────────────────────────────
    // Si le user était attaché à une COMPANY/CABINET et que c'était le DERNIER
    // user de cette organisation, supprimer aussi l'organisation pour éviter
    // les orphelines dans la liste admin. Si d'autres users restent, on laisse.
    if (user.companyId) {
      const remaining = await prisma.user.count({ where: { companyId: user.companyId } })
      if (remaining === 0) {
        await prisma.company.delete({ where: { id: user.companyId } })
          .catch((e) => logger.error('orphan company cleanup failed', { companyId: user.companyId, error: e }))
        logger.info('orphan company auto-deleted', { companyId: user.companyId, after: 'last user deletion' })
      }
    }
    if (user.cabinetId) {
      const remaining = await prisma.user.count({ where: { cabinetId: user.cabinetId } })
      if (remaining === 0) {
        await prisma.cabinet.delete({ where: { id: user.cabinetId } })
          .catch((e) => logger.error('orphan cabinet cleanup failed', { cabinetId: user.cabinetId, error: e }))
        logger.info('orphan cabinet auto-deleted', { cabinetId: user.cabinetId, after: 'last user deletion' })
      }
    }

    res.json({ success: true, data: { id: userId, deleted: true } })
  } catch (err) { next(err) }
})

// ── POST /api/admin/users/:id/impersonate ────────────────────────────────────
// Génère un JWT pour le user cible. Le SUPER_ADMIN peut alors agir comme lui
// pendant 30 min. Le JWT contient un claim `impersonatedBy` qui sera utilisé :
// 1. Côté frontend pour afficher un banner permanent
// 2. Côté backend pour auditer chaque action sous cet alias
// Limitations :
//  - Ne peut pas impersonner un autre SUPER_ADMIN (sécurité)
//  - Email envoyé au user impersonné (transparence RGPD)
// Voir authService.createImpersonationToken pour les détails.
import { createImpersonationToken } from '../auth/auth.service.js'

adminRouter.post('/users/:id/impersonate', async (req, res, next) => {
  try {
    const targetUserId = String(req.params['id'])
    const adminId      = req.user!.sub
    const adminEmail   = req.user!.email
    const ip           = String(req.headers['x-forwarded-for'] ?? req.socket.remoteAddress ?? 'unknown').split(',')[0]?.trim() ?? 'unknown'
    const ua           = req.headers['user-agent'] ?? 'unknown'

    const { accessToken, targetProfile } = await createImpersonationToken(
      targetUserId, adminId, adminEmail, ip, ua,
    )

    res.json({
      success: true,
      data: {
        accessToken,
        targetUser: targetProfile,
        expiresInMinutes: 30,
      },
    })
  } catch (err) { next(err) }
})

// ── GET /api/admin/stats/growth — inscriptions J-14 ──────────────────────────
adminRouter.get('/stats/growth', async (_req, res, next) => {
  try {
    const now  = new Date()
    const from = new Date(now)
    from.setDate(from.getDate() - 13) // 14 days including today
    from.setHours(0, 0, 0, 0)

    // Build array of last 14 dates
    const days: string[] = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(from)
      d.setDate(d.getDate() + i)
      days.push(d.toISOString().slice(0, 10)) // YYYY-MM-DD
    }

    const rows = await prisma.user.findMany({
      where: { createdAt: { gte: from } },
      select: { createdAt: true },
    })

    const countByDay: Record<string, number> = {}
    for (const r of rows) {
      const key = r.createdAt.toISOString().slice(0, 10)
      countByDay[key] = (countByDay[key] ?? 0) + 1
    }

    const daily = days.map(date => ({ date, count: countByDay[date] ?? 0 }))

    res.json({ success: true, data: { daily } })
  } catch (err) {
    next(err)
  }
})

// ── GET /api/admin/health — santé de l'infrastructure ────────────────────────
adminRouter.get('/health', async (_req, res, next) => {
  try {
    // DB check
    let dbOk = false
    try {
      await prisma.$queryRaw`SELECT 1`
      dbOk = true
    } catch { /* noop */ }

    const smtpConfigured = Boolean(env.smtpHost)
    const sentryConfigured = Boolean(process.env['SENTRY_DSN'])
    const posthogConfigured = Boolean(process.env['VITE_POSTHOG_KEY'])

    const checks = {
      database: dbOk ? 'ok' : 'error',
      smtp:     smtpConfigured ? 'ok' : 'unconfigured',
      sentry:   sentryConfigured ? 'ok' : 'unconfigured',
      posthog:  posthogConfigured ? 'ok' : 'unconfigured',
    }

    const hasError = checks.database === 'error'
    const status   = hasError ? 'down' : (checks.smtp === 'error' ? 'degraded' : 'ok')

    res.json({
      success: true,
      data: {
        status,
        uptime:  Math.floor(os.uptime()),
        checks,
        version: process.env['npm_package_version'] ?? undefined,
        nodeEnv: env.nodeEnv,
      },
    })
  } catch (err) {
    next(err)
  }
})
