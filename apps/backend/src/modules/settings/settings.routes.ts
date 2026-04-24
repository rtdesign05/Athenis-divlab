import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { AppError } from '../../middleware/errorHandler.js'
import * as svc from './settings.service.js'

export const settingsRouter = Router()

settingsRouter.use(authenticate)

// ── Zod schemas ────────────────────────────────────────────────────────────────

const UpdateCompanySchema = z.object({
  name:             z.string().min(1).max(200).optional(),
  logo:             z.string().optional(),
  legalForm:        z.string().optional(),
  siret:            z.string().optional(),
  naf:              z.string().optional(),
  vatNumber:        z.string().optional(),
  capital:          z.number().nonnegative().optional(),
  address:          z.string().optional(),
  postalCode:       z.string().optional(),
  city:             z.string().optional(),
  phone:            z.string().optional(),
  contactEmail:     z.string().email().optional(),
  website:          z.string().url().optional(),
  primaryColor:     z.string().optional(),
  secondaryColor:   z.string().optional(),
  font:             z.string().optional(),
  invoiceMentions:  z.string().optional(),
  paymentTerms:     z.number().int().nonnegative().optional(),
  lateInterestRate: z.number().nonnegative().optional(),
  discountRate:     z.number().nonnegative().optional(),
})

const InviteUserSchema = z.object({
  email:     z.string().email(),
  firstName: z.string().optional(),
  lastName:  z.string().optional(),
  roleId:    z.string(),
})

const UpdateRoleSchema = z.object({
  roleId: z.string(),
})

const UpdateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']),
})

const CreateRoleSchema = z.object({
  name:        z.string().min(1).max(50),
  description: z.string().optional(),
  permissions: z.record(z.enum(['none', 'read', 'write', 'admin'])),
})

const UpdateRoleBodySchema = CreateRoleSchema.partial()

const SecurityPolicySchema = z.object({
  passwordMinLength:       z.number().int().min(6).max(128).optional(),
  requireUppercase:        z.boolean().optional(),
  requireNumbers:          z.boolean().optional(),
  requireSpecial:          z.boolean().optional(),
  passwordExpiryDays:      z.number().int().nonnegative().optional(),
  require2faAll:           z.boolean().optional(),
  require2faAdmin:         z.boolean().optional(),
  sessionDurationMinutes:  z.number().int().positive().optional(),
  autoLogoutMinutes:       z.number().int().positive().optional(),
  ipWhitelist:             z.array(z.string()).optional(),
  blockOutsideHours:       z.boolean().optional(),
  maxLoginAttempts:        z.number().int().positive().optional(),
  lockoutDurationMinutes:  z.number().int().positive().optional(),
})

// ── Helper ─────────────────────────────────────────────────────────────────────

function requireAdmin(req: Parameters<typeof getCompanyId>[0]): void {
  if (req.user?.role !== 'ADMIN') {
    throw new AppError('Accès réservé aux administrateurs', 403, 'FORBIDDEN')
  }
}

// ── Company ───────────────────────────────────────────────────────────────────

settingsRouter.get('/company', async (req, res, next) => {
  try {
    const data = await svc.getCompanySettings(getCompanyId(req))
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

settingsRouter.put(
  '/company',
  validateRequest({ body: UpdateCompanySchema }),
  async (req, res, next) => {
    try {
      requireAdmin(req)
      const data = await svc.updateCompanySettings(getCompanyId(req), req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Users ─────────────────────────────────────────────────────────────────────

settingsRouter.get('/users', async (req, res, next) => {
  try {
    requireAdmin(req)
    const data = await svc.listUsers(getCompanyId(req))
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

settingsRouter.post(
  '/users/invite',
  validateRequest({ body: InviteUserSchema }),
  async (req, res, next) => {
    try {
      requireAdmin(req)
      const invitingUserId = req.user?.sub ?? (() => { throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHENTICATED') })()
      const data = await svc.inviteUser(getCompanyId(req), req.body, invitingUserId)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

settingsRouter.put(
  '/users/:id/role',
  validateRequest({ body: UpdateRoleSchema }),
  async (req, res, next) => {
    try {
      requireAdmin(req)
      const requestingUserId = req.user?.sub ?? (() => { throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHENTICATED') })()
      const targetId = String(req.params['id'])
      const data = await svc.updateUserRole(getCompanyId(req), targetId, req.body.roleId, requestingUserId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

settingsRouter.put(
  '/users/:id/status',
  validateRequest({ body: UpdateStatusSchema }),
  async (req, res, next) => {
    try {
      requireAdmin(req)
      const requestingUserId = req.user?.sub ?? (() => { throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHENTICATED') })()
      const targetId = String(req.params['id'])
      const data = await svc.updateUserStatus(getCompanyId(req), targetId, req.body.status, requestingUserId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

settingsRouter.delete('/users/:id', async (req, res, next) => {
  try {
    requireAdmin(req)
    const requestingUserId = req.user?.sub ?? (() => { throw new AppError('Utilisateur non authentifié', 401, 'UNAUTHENTICATED') })()
    const targetId = String(req.params['id'])
    await svc.deleteUser(getCompanyId(req), targetId, requestingUserId)
    res.json({ success: true })
  } catch (e) { next(e) }
})

// ── Roles ─────────────────────────────────────────────────────────────────────

settingsRouter.get('/roles', async (req, res, next) => {
  try {
    const data = await svc.listRoles(getCompanyId(req))
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

settingsRouter.post(
  '/roles',
  validateRequest({ body: CreateRoleSchema }),
  async (req, res, next) => {
    try {
      requireAdmin(req)
      const plan = req.user?.plan as string | undefined
      if (!plan || !['PRO', 'PREMIUM'].includes(plan)) {
        throw new AppError('Rôles personnalisés disponibles à partir du forfait Pro', 403, 'PLAN_INSUFFICIENT')
      }
      const data = await svc.createRole(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

settingsRouter.put(
  '/roles/:id',
  validateRequest({ body: UpdateRoleBodySchema }),
  async (req, res, next) => {
    try {
      requireAdmin(req)
      const roleId = String(req.params['id'])
      const data = await svc.updateRole(getCompanyId(req), roleId, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

settingsRouter.delete('/roles/:id', async (req, res, next) => {
  try {
    requireAdmin(req)
    await svc.deleteRole(getCompanyId(req), String(req.params['id']))
    res.json({ success: true })
  } catch (e) { next(e) }
})

// ── Security ──────────────────────────────────────────────────────────────────

settingsRouter.get('/security', async (req, res, next) => {
  try {
    requireAdmin(req)
    const data = await svc.getSecurityPolicy(getCompanyId(req))
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

settingsRouter.put(
  '/security',
  validateRequest({ body: SecurityPolicySchema }),
  async (req, res, next) => {
    try {
      requireAdmin(req)
      const data = await svc.updateSecurityPolicy(getCompanyId(req), req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

settingsRouter.get('/security/audit', async (req, res, next) => {
  try {
    requireAdmin(req)
    const limit = req.query['limit'] !== undefined ? Number(req.query['limit']) : 50
    const data = await svc.getAuditLogs(getCompanyId(req), isNaN(limit) ? 50 : limit)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})
