import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import {
  CreateRevenuDto, UpdateRevenuDto,
  CreateDepenseDto, UpdateDepenseDto,
  CreateObjectifDto, UpdateObjectifDto,
} from './personal.dto.js'
import * as svc from './personal.service.js'

export const personalRouter = Router()

// ── Guard PERSONAL uniquement ─────────────────────────────────────────────────
personalRouter.use(authenticate, (req, res, next) => {
  if (req.user?.accountType !== 'PERSONAL') {
    res.status(403).json({ success: false, error: 'Accès réservé aux comptes personnels' })
    return
  }
  next()
})

// ── Dashboard ─────────────────────────────────────────────────────────────────

personalRouter.get('/dashboard', async (req, res, next) => {
  try {
    const data = await svc.getDashboard(req.user!.sub)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── Revenus ───────────────────────────────────────────────────────────────────

personalRouter.get('/revenus', async (req, res, next) => {
  try {
    const data = await svc.listRevenus(req.user!.sub)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.post('/revenus', validateRequest({ body: CreateRevenuDto }), async (req, res, next) => {
  try {
    const data = await svc.createRevenu(req.user!.sub, req.body)
    res.status(201).json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.put('/revenus/:id', validateRequest({ body: UpdateRevenuDto }), async (req, res, next) => {
  try {
    const data = await svc.updateRevenu(req.user!.sub, req.params.id!, req.body)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.delete('/revenus/:id', async (req, res, next) => {
  try {
    await svc.deleteRevenu(req.user!.sub, req.params.id!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})

// ── Dépenses ──────────────────────────────────────────────────────────────────

personalRouter.get('/depenses', async (req, res, next) => {
  try {
    const data = await svc.listDepenses(req.user!.sub)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.post('/depenses', validateRequest({ body: CreateDepenseDto }), async (req, res, next) => {
  try {
    const data = await svc.createDepense(req.user!.sub, req.body)
    res.status(201).json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.put('/depenses/:id', validateRequest({ body: UpdateDepenseDto }), async (req, res, next) => {
  try {
    const data = await svc.updateDepense(req.user!.sub, req.params.id!, req.body)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.delete('/depenses/:id', async (req, res, next) => {
  try {
    await svc.deleteDepense(req.user!.sub, req.params.id!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})

// ── Objectifs ─────────────────────────────────────────────────────────────────

personalRouter.get('/objectifs', async (req, res, next) => {
  try {
    const data = await svc.listObjectifs(req.user!.sub)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.post('/objectifs', validateRequest({ body: CreateObjectifDto }), async (req, res, next) => {
  try {
    const data = await svc.createObjectif(req.user!.sub, req.body)
    res.status(201).json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.put('/objectifs/:id', validateRequest({ body: UpdateObjectifDto }), async (req, res, next) => {
  try {
    const data = await svc.updateObjectif(req.user!.sub, req.params.id!, req.body)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.delete('/objectifs/:id', async (req, res, next) => {
  try {
    await svc.deleteObjectif(req.user!.sub, req.params.id!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})

// ── Comptes ───────────────────────────────────────────────────────────────────

personalRouter.get('/comptes', async (req, res, next) => {
  try {
    const data = await svc.listComptes(req.user!.sub)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.post('/comptes', async (req, res, next) => {
  try {
    const data = await svc.createCompte(req.user!.sub, req.body)
    res.status(201).json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.put('/comptes/:id', async (req, res, next) => {
  try {
    const data = await svc.updateCompte(req.user!.sub, req.params.id!, req.body)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

personalRouter.delete('/comptes/:id', async (req, res, next) => {
  try {
    await svc.deleteCompte(req.user!.sub, req.params.id!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})
