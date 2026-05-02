import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { AppError } from '../../middleware/errorHandler.js'
import { prisma } from '../../lib/prisma.js'
import * as svc from './accounting.service.js'
import * as fsSvc from './financialStatements.service.js'
import * as rev from './revision.service.js'
import * as assSvc from './assets.service.js'

export const accountingRouter = Router()

accountingRouter.use(authenticate)

// ── Read-only guard ───────────────────────────────────────────────────────────

async function requireFiscalYearWritable(req: Request, res: Response, next: NextFunction) {
  const fiscalYearId = (req.params['id'] ?? req.body?.fiscalYearId ?? req.query['fiscalYearId']) as string | undefined
  if (!fiscalYearId) return next()
  try {
    const fy = await prisma.fiscalYear.findUnique({ where: { id: fiscalYearId }, select: { status: true } })
    if (fy?.status === 'CLOSED') {
      res.status(403).json({
        success: false,
        error:   'Exercice cl\xf4tur\xe9 \u2014 lecture seule. Les modifications ne sont pas autoris\xe9es.',
        code:    'FISCAL_YEAR_CLOSED',
      })
      return
    }
    next()
  } catch { next() }
}

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

// ── Plan comptable & Comptes ───────────────────────────────────────────────────

const AddCompteBody = z.object({
  numero:   z.string().min(1).max(10),
  intitule: z.string().min(1).max(200),
  classe:   z.number().int().min(1).max(9),
  type:     z.enum(['ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT']),
  isSystem: z.boolean().optional(),
})

const UpdateCompteBody = z.object({
  intitule: z.string().min(1).max(200),
})

accountingRouter.get(
  '/plan',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getPlan(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/comptes',
  // Pas de checkModule : tout utilisateur authentifié peut lire son plan comptable
  async (req, res, next) => {
    try {
      const data = await svc.getComptes(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/comptes',
  checkModule('comptabilite', 'write'),
  requireFiscalYearWritable,
  validateRequest({ body: AddCompteBody }),
  async (req, res, next) => {
    try {
      const data = await svc.addCompte(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.put(
  '/comptes/:id',
  checkModule('comptabilite', 'write'),
  requireFiscalYearWritable,
  validateRequest({ body: UpdateCompteBody }),
  async (req, res, next) => {
    try {
      const id = req.params['id'] as string
      const data = await svc.updateCompte(getCompanyId(req), id, req.body.intitule)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.delete(
  '/comptes/:id',
  checkModule('comptabilite', 'write'),
  requireFiscalYearWritable,
  async (req, res, next) => {
    try {
      const id = req.params['id'] as string
      await svc.deleteCompte(getCompanyId(req), id)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

// ── Fiscal Years ──────────────────────────────────────────────────────────────

const CreateFiscalYearBody = z.object({
  year:      z.number().int().min(2000).max(2100),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

accountingRouter.get(
  '/fiscal-years',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.listFiscalYears(getCompanyId(req)!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/fiscal-years',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: CreateFiscalYearBody }),
  async (req, res, next) => {
    try {
      if (req.user?.role !== 'ADMIN')
        throw new AppError('Accès réservé aux administrateurs', 403, 'FORBIDDEN')
      const userId = req.user?.sub ?? ''
      const data = await svc.createFiscalYear(getCompanyId(req)!, req.body, userId)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/fiscal-years/:id',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const id = req.params['id'] as string
      const data = await svc.getFiscalYear(getCompanyId(req)!, id)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.put(
  '/fiscal-years/:id/lock',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      if (req.user?.role !== 'ADMIN')
        throw new AppError('Accès réservé aux administrateurs', 403, 'FORBIDDEN')
      const id = req.params['id'] as string
      const data = await svc.lockFiscalYear(getCompanyId(req)!, id)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/fiscal-years/:id/close',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      if (req.user?.role !== 'ADMIN')
        throw new AppError('Accès réservé aux administrateurs', 403, 'FORBIDDEN')
      const id = req.params['id'] as string
      const userId = req.user?.sub ?? ''
      const data = await svc.closeFiscalYearNew(getCompanyId(req)!, id, userId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/fiscal-years/:id/reopen',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      if (req.user?.role !== 'ADMIN')
        throw new AppError('Accès réservé aux administrateurs', 403, 'FORBIDDEN')
      const id = req.params['id'] as string
      const data = await svc.reopenFiscalYear(getCompanyId(req)!, id)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── États financiers ──────────────────────────────────────────────────────────

async function handleFinancialStatements(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  try {
    const fiscalYearId = req.query['fiscalYearId'] as string | undefined
    if (!fiscalYearId)
      throw new AppError('fiscalYearId requis', 400, 'VALIDATION_ERROR')
    const data = await fsSvc.getFinancialStatements(getCompanyId(req)!, fiscalYearId)
    res.json({ success: true, data })
  } catch (e) { next(e) }
}

accountingRouter.get('/etats-financiers',      checkModule('comptabilite', 'read'), handleFinancialStatements)
accountingRouter.get('/financial-statements',   checkModule('comptabilite', 'read'), handleFinancialStatements)

// ── Journal / Balance / Grand Livre by fiscalYearId ────────────────────────

accountingRouter.post(
  '/journal/batch',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const { fiscalYearId, date, journal, reference, lines } = req.body as {
        fiscalYearId: string; date: string; journal: string; reference?: string
        lines: { compte: string; libelle: string; intituleCompte?: string; debit: number; credit: number }[]
      }
      if (!fiscalYearId || !journal || !date || !Array.isArray(lines) || lines.length === 0) {
        throw new AppError('Champs requis manquants', 400, 'VALIDATION_ERROR')
      }
      const entries = await svc.createJournalEntryBatch(
        getCompanyId(req)!,
        fiscalYearId,
        {
          date: new Date(date),
          journal,
          reference: reference ?? null,
          lines: lines.map(l => ({
            compte:  String(l.compte).trim(),
            libelle: String(l.libelle).trim(),
            ...(l.intituleCompte ? { intituleCompte: String(l.intituleCompte).trim() } : {}),
            debit:   Number(l.debit)  || 0,
            credit:  Number(l.credit) || 0,
          })),
        },
        req.user!.sub,
      )
      res.status(201).json({ success: true, data: entries })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/journal',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const { fiscalYearId, date, journal, compte, libelle, debit, credit, reference } = req.body as {
        fiscalYearId: string; date: string; journal: string; compte: string
        libelle: string; debit: number; credit: number; reference?: string
      }
      if (!fiscalYearId || !journal || !compte || !libelle || !date) {
        throw new AppError('Champs requis manquants', 400, 'VALIDATION_ERROR')
      }
      const entry = await svc.createJournalEntry(
        getCompanyId(req)!,
        fiscalYearId,
        { date: new Date(date), journal, compte, libelle, debit: Number(debit) || 0, credit: Number(credit) || 0, reference: reference ?? null },
        req.user!.sub,
      )
      res.status(201).json({ success: true, data: entry })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/journal',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const fiscalYearId = req.query['fiscalYearId'] as string | undefined
      if (!fiscalYearId) throw new AppError('fiscalYearId requis', 400, 'VALIDATION_ERROR')
      const data = await svc.getJournalByFiscalYear(getCompanyId(req)!, fiscalYearId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.put(
  '/journal/piece/:pieceId',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const { pieceId } = req.params as { pieceId: string }
      const { date, journal, reference, lines } = req.body as {
        date: string; journal: string; reference?: string
        lines: { compte: string; libelle: string; debit: number; credit: number }[]
      }
      if (!journal || !date || !Array.isArray(lines) || lines.length === 0) {
        throw new AppError('Champs requis manquants', 400, 'VALIDATION_ERROR')
      }
      const entries = await svc.updateJournalPiece(
        getCompanyId(req)!,
        pieceId,
        {
          date: new Date(date),
          journal,
          reference: reference ?? null,
          lines: lines.map(l => ({
            compte:  String(l.compte).trim(),
            libelle: String(l.libelle).trim(),
            debit:   Number(l.debit)  || 0,
            credit:  Number(l.credit) || 0,
          })),
        },
        req.user!.sub,
      )
      res.json({ success: true, data: entries })
    } catch (e) { next(e) }
  },
)

accountingRouter.delete(
  '/journal/piece/:pieceId',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const { pieceId } = req.params as { pieceId: string }
      await svc.deleteJournalPiece(getCompanyId(req)!, pieceId)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

accountingRouter.delete(
  '/journal/:id',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string }
      await svc.deleteJournalEntry(getCompanyId(req)!, id)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/balance-journal',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const fiscalYearId = req.query['fiscalYearId'] as string | undefined
      if (!fiscalYearId) throw new AppError('fiscalYearId requis', 400, 'VALIDATION_ERROR')
      const data = await svc.getBalanceByFiscalYear(getCompanyId(req)!, fiscalYearId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/grand-livre-journal',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const fiscalYearId = req.query['fiscalYearId'] as string | undefined
      if (!fiscalYearId) throw new AppError('fiscalYearId requis', 400, 'VALIDATION_ERROR')
      const data = await svc.getGrandLivreByFiscalYear(getCompanyId(req)!, fiscalYearId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/fiscal-years/:id/summary',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const id = req.params['id'] as string
      const data = await svc.getFiscalYearSummary(getCompanyId(req)!, id)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Révision comptable ────────────────────────────────────────────────────────

async function getFiscalYearId(companyId: string, year: number): Promise<string> {
  const fy = await prisma.fiscalYear.findFirst({ where: { companyId, year }, select: { id: true } })
  if (!fy) throw new AppError(`Exercice fiscal ${year} introuvable`, 404, 'NOT_FOUND')
  return fy.id
}

const RevisionQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()) })
const ReviewBody    = z.object({ year: z.coerce.number().int(), note: z.string().optional() })
const AnomalyBody   = z.object({ year: z.coerce.number().int(), anomalyNote: z.string().min(1) })
const ResolveBody   = z.object({ year: z.coerce.number().int(), resolutionNote: z.string().min(1) })
const UnreviewBody  = z.object({ year: z.coerce.number().int() })

accountingRouter.get(
  '/revision',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: RevisionQuery }),
  async (req, res, next) => {
    try {
      const year = Number(req.query['year'])
      const fiscalYearId = await getFiscalYearId(getCompanyId(req), year)
      const data = await rev.getCyclesWithAccounts(getCompanyId(req), fiscalYearId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/revision/progress',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: RevisionQuery }),
  async (req, res, next) => {
    try {
      const year = Number(req.query['year'])
      const fiscalYearId = await getFiscalYearId(getCompanyId(req), year)
      const data = await rev.getRevisionProgress(getCompanyId(req), fiscalYearId)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/revision/:accountNumber/review',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: ReviewBody }),
  async (req, res, next) => {
    try {
      const { accountNumber } = req.params as { accountNumber: string }
      const { year, note } = req.body as { year: number; note?: string }
      const fiscalYearId = await getFiscalYearId(getCompanyId(req), year)
      const cycles = await rev.getCyclesWithAccounts(getCompanyId(req), fiscalYearId)
      const cycleId = cycles.find(c => c.accounts.some(a => a.number === accountNumber))?.id ?? 0
      await rev.reviewAccount(getCompanyId(req), fiscalYearId, accountNumber, cycleId, req.user?.email ?? 'unknown', note)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

accountingRouter.delete(
  '/revision/:accountNumber/review',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: UnreviewBody }),
  async (req, res, next) => {
    try {
      const { accountNumber } = req.params as { accountNumber: string }
      const { year } = req.body as { year: number }
      const fiscalYearId = await getFiscalYearId(getCompanyId(req), year)
      await rev.unreviewAccount(getCompanyId(req), fiscalYearId, accountNumber)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/revision/:accountNumber/anomaly',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: AnomalyBody }),
  async (req, res, next) => {
    try {
      const { accountNumber } = req.params as { accountNumber: string }
      const { year, anomalyNote } = req.body as { year: number; anomalyNote: string }
      const fiscalYearId = await getFiscalYearId(getCompanyId(req), year)
      const cycles = await rev.getCyclesWithAccounts(getCompanyId(req), fiscalYearId)
      const cycleId = cycles.find(c => c.accounts.some(a => a.number === accountNumber))?.id ?? 0
      await rev.markAnomaly(getCompanyId(req), fiscalYearId, accountNumber, cycleId, req.user?.email ?? 'unknown', anomalyNote)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/revision/:accountNumber/resolve-anomaly',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: ResolveBody }),
  async (req, res, next) => {
    try {
      const { accountNumber } = req.params as { accountNumber: string }
      const { year, resolutionNote } = req.body as { year: number; resolutionNote: string }
      const fiscalYearId = await getFiscalYearId(getCompanyId(req), year)
      await rev.resolveAnomaly(getCompanyId(req), fiscalYearId, accountNumber, req.user?.email ?? 'unknown', resolutionNote)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/revision/mark-all',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: z.object({ year: z.coerce.number().int() }) }),
  async (req, res, next) => {
    try {
      const { year } = req.body as { year: number }
      const fiscalYearId = await getFiscalYearId(getCompanyId(req), year)
      await rev.markAllReviewed(getCompanyId(req), fiscalYearId, req.user?.email ?? 'unknown')
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

// ── Immobilisations / Assets ──────────────────────────────────────────────────

const AssetBody = z.object({
  designation:      z.string().min(1),
  accountNumber:    z.string().min(1),
  category:         z.enum(['INCORPOREL', 'CORPOREL', 'FINANCIER', 'EN_COURS']),
  acquisitionDate:  z.string(),
  serviceDate:      z.string().optional(),
  grossValue:       z.number().positive(),
  residualValue:    z.number().min(0).optional(),
  depreciationMode: z.enum(['LINEAR', 'DEGRESSIVE']).default('LINEAR'),
  usefulLifeYears:  z.number().int().min(1).max(50),
  supplier:         z.string().optional(),
  serialNumber:     z.string().optional(),
  location:         z.string().optional(),
  notes:            z.string().optional(),
})

const AssetYearQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()),
})

// IMPORTANT: specific sub-paths MUST come before /:id
accountingRouter.get(
  '/assets/summary',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: AssetYearQuery }),
  async (req, res, next) => {
    try {
      const year = Number(req.query['year'])
      const data = await assSvc.getAssetsSummary(getCompanyId(req), year)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/assets/depreciation-table',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: AssetYearQuery }),
  async (req, res, next) => {
    try {
      const year = Number(req.query['year'])
      const data = await assSvc.getDepreciationTable(getCompanyId(req), year)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/assets/generate-entries',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: z.object({ year: z.number().int().min(2000).max(2100) }) }),
  async (req, res, next) => {
    try {
      const { year } = req.body as { year: number }
      const data = await assSvc.generateDepreciationEntries(getCompanyId(req), year)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/assets',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const { category, status } = req.query as { category?: string; status?: string }
      const filter: { category?: import('@prisma/client').AssetCategory; status?: import('@prisma/client').AssetStatus } = {}
      if (category) filter.category = category as import('@prisma/client').AssetCategory
      if (status)   filter.status   = status   as import('@prisma/client').AssetStatus
      const data = await assSvc.listAssets(getCompanyId(req), filter)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.post(
  '/assets',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: AssetBody }),
  async (req, res, next) => {
    try {
      const data = await assSvc.createAsset(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.put(
  '/assets/:id',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: AssetBody.partial() }),
  async (req, res, next) => {
    try {
      const id = req.params['id'] as string
      const data = await assSvc.updateAsset(getCompanyId(req), id, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

accountingRouter.delete(
  '/assets/:id',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const id = req.params['id'] as string
      await assSvc.deleteAsset(getCompanyId(req), id)
      res.json({ success: true })
    } catch (e) { next(e) }
  },
)

accountingRouter.get(
  '/assets/:id/schedule',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const id = req.params['id'] as string
      const data = await assSvc.getAssetSchedule(getCompanyId(req), id)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)
