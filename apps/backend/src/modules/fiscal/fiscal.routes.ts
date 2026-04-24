import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import * as svc from './fiscal.service.js'
import * as regime from './regimeDetection.service.js'

export const fiscalRouter = Router()

fiscalRouter.use(authenticate)

const YearQuery   = z.object({ year:  z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()) })
const MonthQuery  = z.object({ year:  z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()), month: z.coerce.number().int().min(1).max(12).default(new Date().getMonth() + 1) })
const YearParams  = z.object({ year:  z.coerce.number().int().min(2000).max(2100) })
const MonthParams = z.object({ year:  z.coerce.number().int().min(2000).max(2100), month: z.coerce.number().int().min(1).max(12) })

const TaxConfigBody = z.object({
  taxRegime:          z.enum(['IGS','REEL_NORMAL','REEL_SIMPLIFIE','FORFAIT_BIENNAL','MICRO_ENTREPRISE','LIBERATOIRE']).optional(),
  vatRegime:          z.enum(['MENSUEL','TRIMESTRIEL','NON_ASSUJETTI']).optional(),
  centerImpots:       z.string().max(100).optional(),
  niu:                z.string().max(50).optional(),
  rccm:               z.string().max(50).optional(),
  codeActivite:       z.string().max(20).optional(),
  cnpsRate:           z.number().min(0).max(1).optional(),
  isAssujetti:        z.boolean().optional(),
  isFirstYear:        z.boolean().optional(),
  firstYearCA:        z.number().min(0).optional(),
  professionLiberale: z.boolean().optional(),
  igsClass:           z.number().int().min(1).max(10).optional(),
  igsPaymentMode:     z.enum(['ANNUEL','TRIMESTRIEL']).optional(),
  igsAdherentCga:     z.boolean().optional(),
})

const RegimeConfirmBody = z.object({
  year:           z.number().int().min(2020).max(2050),
  regime:         z.enum(['IGS','REEL_NORMAL','REEL_SIMPLIFIE']),
  igsClass:       z.number().int().min(1).max(10).optional(),
  paymentMode:    z.enum(['ANNUEL','TRIMESTRIEL']).optional(),
  adherentCga:    z.boolean().optional(),
})

// ── Dashboard ─────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/dashboard',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getFiscalDashboard(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── TVA ───────────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/tva',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: MonthQuery }),
  async (req, res, next) => {
    try {
      const { year, month } = req.query as { year: string; month: string }
      const data = await svc.getTVADeclaration(getCompanyId(req)!, Number(year), Number(month))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fiscalRouter.get(
  '/tva/history',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getTVAHistory(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fiscalRouter.post(
  '/tva/:year/:month/declare',
  checkModule('fiscalite', 'write'),
  validateRequest({ params: MonthParams }),
  async (req, res, next) => {
    try {
      const year  = Number(req.params['year'] as string)
      const month = Number(req.params['month'] as string)
      const data = await svc.declareTVA(getCompanyId(req)!, year, month)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── DSF ───────────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/dsf',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getDSF(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── IS ────────────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/is',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getIS(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Patente ───────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/patente',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getPatente(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── RAS ───────────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/ras',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getRAS(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Calendrier ────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/calendrier',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getCalendrier(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Liasse ────────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/liasse',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await svc.getLiasse(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── CNPS ──────────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/cnps',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: MonthQuery }),
  async (req, res, next) => {
    try {
      const { year, month } = req.query as { year: string; month: string }
      const data = await svc.getCNPS(getCompanyId(req)!, Number(year), Number(month))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Tax Config ────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/config',
  checkModule('fiscalite', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getTaxConfig(getCompanyId(req)!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fiscalRouter.put(
  '/config',
  checkModule('fiscalite', 'write'),
  validateRequest({ body: TaxConfigBody }),
  async (req, res, next) => {
    try {
      const data = await svc.upsertTaxConfig(getCompanyId(req)!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── IGS ───────────────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/igs',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await regime.getIGSDeclaration(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Régime Fiscal ─────────────────────────────────────────────────────────────

fiscalRouter.get(
  '/regime-detection',
  checkModule('fiscalite', 'read'),
  validateRequest({ query: YearQuery }),
  async (req, res, next) => {
    try {
      const { year } = req.query as { year: string }
      const data = await regime.detectRegimeForNextYear(getCompanyId(req)!, Number(year))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fiscalRouter.post(
  '/regime-confirm',
  checkModule('fiscalite', 'write'),
  validateRequest({ body: RegimeConfirmBody }),
  async (req, res, next) => {
    try {
      const { year, regime: reg, igsClass, paymentMode, adherentCga } = req.body as {
        year: number; regime: string; igsClass?: number; paymentMode?: string; adherentCga?: boolean
      }
      const data = await regime.confirmRegime(getCompanyId(req)!, year, reg, igsClass, paymentMode, adherentCga)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fiscalRouter.get(
  '/igs-bareme',
  checkModule('fiscalite', 'read'),
  async (req, res, next) => {
    try {
      const data = await regime.getIgsBareme()
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fiscalRouter.get(
  '/visible-modules',
  checkModule('fiscalite', 'read'),
  async (req, res, next) => {
    try {
      const data = await regime.getVisibleFiscalModules(getCompanyId(req)!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)
