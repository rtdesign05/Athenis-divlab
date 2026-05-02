import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireAccountType } from '../../middleware/rbac.js'
import * as svc from './cabinet.service.js'

export const cabinetRouter = Router()

cabinetRouter.use(authenticate, requireAccountType('CABINET'))

// ── Dashboard & portfolio ──────────────────────────────────────────────────────

cabinetRouter.get('/dashboard', async (req, res, next) => {
  try {
    const data = await svc.getCabinetDashboard(req.user!.cabinetId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.get('/portfolio', async (req, res, next) => {
  try {
    const data = await svc.getPortfolio(req.user!.cabinetId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── Company view (context switch) ────────────────────────────────────────────

cabinetRouter.post('/switch/:companyId', async (req, res, next) => {
  try {
    const data = await svc.switchToCompany(
      req.user!.cabinetId!,
      req.params.companyId!,
      req.user!.sub,
      req.user!.email,
      req.user!.role,   // pass real role — never hardcode ADMIN
    )
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── Invitations (cabinet sends) ───────────────────────────────────────────────

cabinetRouter.get('/invitations', async (req, res, next) => {
  try {
    const data = await svc.getInvitations(req.user!.cabinetId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.post('/invitations', async (req, res, next) => {
  try {
    const data = await svc.sendInvitation(req.user!.cabinetId!, req.body, req.user!.sub)
    res.status(201).json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.delete('/invitations/:id', async (req, res, next) => {
  try {
    const data = await svc.cancelInvitation(req.user!.cabinetId!, req.params.id!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── Company search (for adding a new mandat) ──────────────────────────────────

cabinetRouter.get('/search-companies', async (req, res, next) => {
  try {
    const q    = String(req.query.q ?? '')
    const data = await svc.searchCompanies(req.user!.cabinetId!, q)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── Mandats CRUD ──────────────────────────────────────────────────────────────

cabinetRouter.get('/mandats', async (req, res, next) => {
  try {
    const data = await svc.getMandats(req.user!.cabinetId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.get('/mandats/:companyId', async (req, res, next) => {
  try {
    const data = await svc.getMandat(req.user!.cabinetId!, req.params.companyId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.post('/mandats', async (req, res, next) => {
  try {
    const data = await svc.createMandat(req.user!.cabinetId!, req.body)
    res.status(201).json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.patch('/mandats/:companyId', async (req, res, next) => {
  try {
    const data = await svc.updateMandat(req.user!.cabinetId!, req.params.companyId!, req.body)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.post('/mandats/:companyId/toggle', async (req, res, next) => {
  try {
    const data = await svc.toggleMandat(req.user!.cabinetId!, req.params.companyId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

cabinetRouter.delete('/mandats/:companyId', async (req, res, next) => {
  try {
    await svc.deleteMandat(req.user!.cabinetId!, req.params.companyId!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})
