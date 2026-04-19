import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireAccountType } from '../../middleware/rbac.js'
import * as svc from './cabinet.service.js'

export const cabinetRouter = Router()

cabinetRouter.use(authenticate, requireAccountType('CABINET'))

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

cabinetRouter.post('/mandats/:companyId/toggle', async (req, res, next) => {
  try {
    const data = await svc.toggleMandat(req.user!.cabinetId!, req.params.companyId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})
