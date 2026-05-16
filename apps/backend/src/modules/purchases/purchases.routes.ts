import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ListPurchaseOrdersDto,
} from './purchases.dto.js'
import * as svc from './purchases.service.js'

export const purchasesRouter = Router()

purchasesRouter.use(authenticate)

// ── Stats ─────────────────────────────────────────────────────────────────────

purchasesRouter.get(
  '/stats',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.purchaseOrderStats(getCompanyId(req), req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── CRUD ──────────────────────────────────────────────────────────────────────

purchasesRouter.get(
  '/',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListPurchaseOrdersDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listPurchaseOrders(getCompanyId(req), req.query as never, req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

purchasesRouter.get(
  '/:id',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getPurchaseOrder(getCompanyId(req), req.params.id!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

purchasesRouter.post(
  '/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreatePurchaseOrderDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createPurchaseOrder(
        getCompanyId(req),
        req.body,
        req.user?.sub ?? 'unknown',
        req.user,
      )
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

purchasesRouter.patch(
  '/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdatePurchaseOrderDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updatePurchaseOrder(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

purchasesRouter.delete(
  '/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deletePurchaseOrder(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
