/**
 * Routes d'administration — métriques SaaS
 * Accès réservé : platformRole === SUPER_ADMIN
 */
import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { prisma } from '../../lib/prisma.js'

export const adminRouter = Router()

// ── Guard SUPER_ADMIN (vérification DB car platformRole n'est pas dans le JWT) ──
adminRouter.use(authenticate, async (req, res, next) => {
  try {
    const userId = req.user?.sub
    if (!userId) { res.status(401).json({ success: false, error: 'Non authentifié' }); return }
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { platformRole: true } })
    if (user?.platformRole !== 'SUPER_ADMIN') {
      res.status(403).json({ success: false, error: 'Accès réservé aux administrateurs' })
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

      // Plans expirant dans 30 jours
      prisma.company.count({
        where: {
          planExpiresAt: { gte: now, lte: day30 },
          plan: { not: 'FREE' },
        },
      }),

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
          planExpiresAt: true,
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
