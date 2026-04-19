import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import * as svc from './accounting.service.js'

export const accountingRouter = Router()

accountingRouter.use(authenticate)

const YearQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()) })

accountingRouter.get(
  '/compte-de-resultat',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getCompteDeResultat(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/bilan',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getBilan(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/balance',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getBalance(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/grand-livre',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getGrandLivre(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/tva',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getTvaTrimestrielle(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)
