import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { AppError } from '../../middleware/errorHandler.js'
import * as svc from './payroll.service.js'

export const payrollRouter = Router()
payrollRouter.use(authenticate)

/** Liste des paies */
payrollRouter.get('/', checkModule('rh', 'read'), async (req, res, next) => {
  try {
    const data = await svc.listPayrolls(getCompanyId(req)!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/** Détail d'une paie + bulletins */
payrollRouter.get('/:id', checkModule('rh', 'read'), async (req, res, next) => {
  try {
    const data = await svc.getPayroll(getCompanyId(req)!, req.params.id!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/** Calcule (ou recalcule) une paie pour un mois donné */
payrollRouter.post('/calculate', checkModule('rh', 'write'), async (req, res, next) => {
  try {
    const userId = req.user?.sub ?? 'system'
    const { year, month } = req.body as { year?: number; month?: number }
    if (!year || !month) throw new AppError('year et month requis', 400, 'VALIDATION_ERROR')
    const data = await svc.calculatePayroll(getCompanyId(req)!, year, month, userId)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/** Génère les écritures comptables (journal PAY) */
payrollRouter.post('/:id/post', checkModule('rh', 'write'), async (req, res, next) => {
  try {
    const userId = req.user?.sub ?? 'system'
    const data = await svc.postPayroll(getCompanyId(req)!, req.params.id!, userId)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/** Effectue les paiements et mouvemente la trésorerie */
payrollRouter.post('/:id/pay', checkModule('rh', 'write'), async (req, res, next) => {
  try {
    const userId = req.user?.sub ?? 'system'
    const { treasuryAccount } = req.body as { treasuryAccount?: string }
    if (!treasuryAccount) throw new AppError('treasuryAccount requis', 400, 'VALIDATION_ERROR')
    const data = await svc.executePayments(getCompanyId(req)!, req.params.id!, treasuryAccount, userId)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/** Envoie les bulletins par email à tous les salariés */
payrollRouter.post('/:id/send', checkModule('rh', 'write'), async (req, res, next) => {
  try {
    const data = await svc.sendAllPayslips(getCompanyId(req)!, req.params.id!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})
