/**
 * Routes d'administration — métriques SaaS
 * Accès réservé : platformRole === SUPER_ADMIN
 * (Le champ platformRole est distinct du champ role qui est un rôle d'entreprise.)
 */
import { Router } from 'express'
import os from 'os'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../lib/prisma.js'
import { env } from '../../config/env.js'

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
