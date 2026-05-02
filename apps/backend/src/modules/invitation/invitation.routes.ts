import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { requireAccountType } from '../../middleware/rbac.js'
import * as svc from '../cabinet/cabinet.service.js'

export const invitationRouter = Router()

// ── Public — get invitation details by token ──────────────────────────────────
// No auth required — anyone with the token can see details (cabinet name, type…)

invitationRouter.get('/cabinet', async (req, res, next) => {
  try {
    const token = String(req.query.token ?? '')
    if (!token) {
      res.status(400).json({ success: false, message: 'Token manquant', code: 'MISSING_TOKEN' })
      return
    }
    const data = await svc.getInvitationByToken(token)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── Company-authenticated — accept / reject ───────────────────────────────────

invitationRouter.post('/cabinet/accept', authenticate, requireAccountType('COMPANY'), async (req, res, next) => {
  try {
    const token = String(req.query.token ?? req.body.token ?? '')
    if (!token) {
      res.status(400).json({ success: false, message: 'Token manquant', code: 'MISSING_TOKEN' })
      return
    }
    const data = await svc.acceptInvitation(token, req.user!.companyId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

invitationRouter.post('/cabinet/reject', authenticate, requireAccountType('COMPANY'), async (req, res, next) => {
  try {
    const token = String(req.query.token ?? req.body.token ?? '')
    if (!token) {
      res.status(400).json({ success: false, message: 'Token manquant', code: 'MISSING_TOKEN' })
      return
    }
    const data = await svc.rejectInvitation(token, req.user!.companyId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})
