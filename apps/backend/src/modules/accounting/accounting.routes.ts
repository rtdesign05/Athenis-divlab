import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import * as svc from './accounting.service.js'

export const accountingRouter = Router()

accountingRouter.use(authenticate)

const YearQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
})

const CA3Query = z.object({
  year:    z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
  quarter: z.coerce.number().int().min(1).max(4).default(Math.ceil((new Date().getMonth() + 1) / 3)),
})

const ClotureBody = z.object({
  year:  z.coerce.number().int().min(2000).max(2100),
  notes: z.string().optional(),
})

// ── Existing reports ──────────────────────────────────────────────────────────

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

// ── TVA CA3 pré-remplie ───────────────────────────────────────────────────────

accountingRouter.get(
  '/tva/ca3',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: CA3Query }),
  async (req, res, next) => {
    try {
      const { year, quarter } = req.query as { year: string; quarter: string }
      const data = await svc.getTvaCA3(getCompanyId(req), Number(year), Number(quarter))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Export FEC ────────────────────────────────────────────────────────────────

accountingRouter.get(
  '/fec',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const csv      = await svc.exportFEC(getCompanyId(req), Number(year))
      const filename = `FEC_${year}_${new Date().toISOString().slice(0, 10)}.txt`
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csv)
    } catch (e) { next(e) }
  },
)

// ── Clôture d'exercice ────────────────────────────────────────────────────────

accountingRouter.get(
  '/cloture',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getClotureStatus(getCompanyId(req), Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/cloture',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: ClotureBody }),
  async (req, res, next) => {
    try {
      const { year, notes } = req.body
      const user = (req as never as { user?: { email?: string } }).user
      const data = await svc.closeExercise(getCompanyId(req), year, notes, user?.email)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)
