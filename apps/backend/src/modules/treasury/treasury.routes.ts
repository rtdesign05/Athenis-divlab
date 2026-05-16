import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { CreateTreasuryEntryDto, ListTreasuryDto } from './treasury.dto.js'
import * as svc from './treasury.service.js'

export const treasuryRouter = Router()

treasuryRouter.use(authenticate)

// ── Soldes agrégés ────────────────────────────────────────────────────────────
treasuryRouter.get(
  '/balances',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getBalances(getCompanyId(req), req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Liste mouvements ──────────────────────────────────────────────────────────
treasuryRouter.get(
  '/',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListTreasuryDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listEntries(getCompanyId(req), req.query as never, req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Créer un mouvement ────────────────────────────────────────────────────────
treasuryRouter.post(
  '/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateTreasuryEntryDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createEntry(getCompanyId(req), req.body, req.user)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Supprimer ─────────────────────────────────────────────────────────────────
treasuryRouter.delete(
  '/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteEntry(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
