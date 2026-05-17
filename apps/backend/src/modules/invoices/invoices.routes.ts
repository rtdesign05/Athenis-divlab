import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  UpdateStatusDto,
  ListInvoicesDto,
} from './invoices.dto.js'
import * as svc from './invoices.service.js'

export const invoicesRouter = Router()

invoicesRouter.use(authenticate)

// ── Dashboard & analytics ─────────────────────────────────────────────────────

invoicesRouter.get(
  '/dashboard',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const opts: { from?: Date; to?: Date } = {}
      if (req.query.from) opts.from = new Date(req.query.from as string)
      if (req.query.to)   opts.to   = new Date(req.query.to   as string)
      const data = await svc.dashboardStats(getCompanyId(req), opts, req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.get(
  '/cash-flow',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.cashFlowForecast(getCompanyId(req), req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.get(
  '/reminders',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getReminders(getCompanyId(req), req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.get(
  '/stats',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.invoiceStats(getCompanyId(req), req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Standard invoices CRUD ────────────────────────────────────────────────────

invoicesRouter.get(
  '/',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListInvoicesDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listInvoices(getCompanyId(req), req.query as never, req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.get(
  '/:id',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getInvoice(getCompanyId(req), req.params.id!, req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.post(
  '/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateInvoiceDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createInvoice(getCompanyId(req), req.body, req.user?.sub ?? 'unknown', req.user)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.patch(
  '/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateInvoiceDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateInvoice(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.patch(
  '/:id/status',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateStatusDto }),
  async (req, res, next) => {
    try {
      const userId = req.user?.sub
      const data = await svc.updateInvoiceStatus(getCompanyId(req), req.params.id!, req.body.status, userId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

invoicesRouter.delete(
  '/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteInvoice(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
