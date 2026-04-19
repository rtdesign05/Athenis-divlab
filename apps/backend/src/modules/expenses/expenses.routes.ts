import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { CreateExpenseDto, UpdateExpenseDto, ListExpensesDto } from './expenses.dto.js'
import * as svc from './expenses.service.js'

export const expensesRouter = Router()

expensesRouter.use(authenticate)

expensesRouter.get(
  '/',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListExpensesDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listExpenses(getCompanyId(req), req.query as never)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

expensesRouter.get(
  '/stats',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const { from, to } = req.query as { from?: string; to?: string }
      const data = await svc.expenseStats(
        getCompanyId(req),
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined,
      )
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

expensesRouter.get(
  '/:id',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getExpense(getCompanyId(req), req.params.id!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

expensesRouter.post(
  '/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateExpenseDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createExpense(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

expensesRouter.patch(
  '/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateExpenseDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateExpense(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

expensesRouter.delete(
  '/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteExpense(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
