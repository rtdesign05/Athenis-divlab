import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  ImportBankDto,
  ReconcileDto,
  UpdateTxStatusDto,
  ListBankTxDto,
} from './bank.dto.js'
import * as svc from './bank.service.js'

export const bankRouter = Router()

bankRouter.use(authenticate)

bankRouter.get(
  '/stats',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.bankStats(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.get(
  '/',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: ListBankTxDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listBankTransactions(getCompanyId(req), req.query as never)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.post(
  '/import',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: ImportBankDto }),
  async (req, res, next) => {
    try {
      const data = await svc.importBankStatement(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.post(
  '/auto-reconcile',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const data = await svc.autoReconcile(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.post(
  '/reconcile',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: ReconcileDto }),
  async (req, res, next) => {
    try {
      const data = await svc.reconcileTransaction(getCompanyId(req), req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.patch(
  '/:id/status',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: UpdateTxStatusDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateTransactionStatus(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.delete(
  '/:id',
  checkModule('comptabilite', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteTransaction(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
