import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { UpsertEsgDto } from './esg.dto.js'
import * as svc from './esg.service.js'

export const esgRouter = Router()

esgRouter.use(authenticate)

const YearQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()) })

esgRouter.get(
  '/years',
  checkModule('esg', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.listEsgYears(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

esgRouter.get(
  '/data',
  checkModule('esg', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getEsgData(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

esgRouter.get(
  '/score',
  checkModule('esg', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getEsgScore(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

esgRouter.get(
  '/csrd-report',
  checkModule('esg', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getCsrdReport(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

esgRouter.put(
  '/data',
  checkModule('esg', 'write'),
  validateRequest({ body: UpsertEsgDto }),
  async (req, res, next) => {
    try {
      const data = await svc.upsertEsgData(getCompanyId(req), req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)
