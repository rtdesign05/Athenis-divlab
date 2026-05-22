import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateTreasuryEntryDto,
  CreateTreasurySourceDto,
  ListTreasuryDto,
  ListTreasurySourcesDto,
  UpdateTreasurySourceDto,
} from './treasury.dto.js'
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

// ── Supprimer mouvement ───────────────────────────────────────────────────────
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

// ── Sources : liste ──────────────────────────────────────────────────────────
treasuryRouter.get(
  '/sources',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListTreasurySourcesDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listSources(getCompanyId(req), req.query as never, req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Sources : créer ──────────────────────────────────────────────────────────
treasuryRouter.post(
  '/sources',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateTreasurySourceDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createSource(getCompanyId(req), req.body, req.user)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Sources : modifier ───────────────────────────────────────────────────────
treasuryRouter.put(
  '/sources/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateTreasurySourceDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateSource(getCompanyId(req), req.params.id!, req.body)
      if (!data) {
        res.status(404).json({ success: false, error: 'Source introuvable' })
        return
      }
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

// ── Sources : supprimer (soft-delete) ────────────────────────────────────────
treasuryRouter.delete(
  '/sources/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteSource(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
