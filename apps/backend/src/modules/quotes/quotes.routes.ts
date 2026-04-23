import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  UpdateQuoteStatusDto,
  ListQuotesDto,
} from './quotes.dto.js'
import * as svc from './quotes.service.js'

export const quotesRouter = Router()

quotesRouter.use(authenticate)

quotesRouter.get(
  '/',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListQuotesDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listQuotes(getCompanyId(req), req.query as never)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

quotesRouter.get(
  '/stats',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.quoteStats(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

quotesRouter.get(
  '/:id',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getQuote(getCompanyId(req), req.params.id!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

quotesRouter.post(
  '/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateQuoteDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createQuote(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

quotesRouter.patch(
  '/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateQuoteDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateQuote(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

quotesRouter.patch(
  '/:id/status',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateQuoteStatusDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateQuoteStatus(getCompanyId(req), req.params.id!, req.body.status)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

quotesRouter.post(
  '/:id/convert',
  checkModule('gestion', 'write'),
  async (req, res, next) => {
    try {
      const data = await svc.convertQuoteToInvoice(getCompanyId(req), req.params.id!)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

quotesRouter.delete(
  '/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteQuote(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
