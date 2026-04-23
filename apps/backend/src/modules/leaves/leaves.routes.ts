import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { CreateLeaveDto, ReviewLeaveDto, ListLeavesDto } from './leaves.dto.js'
import * as svc from './leaves.service.js'

export const leavesRouter = Router()

leavesRouter.use(authenticate)

leavesRouter.get('/stats',          checkModule('rh', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.leaveStats(getCompanyId(req)) }) } catch (e) { next(e) } })
leavesRouter.get('/',               checkModule('rh', 'read'),  validateRequest({ query: ListLeavesDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.listLeaves(getCompanyId(req), req.query as never) }) } catch (e) { next(e) } })
leavesRouter.get('/:id',            checkModule('rh', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.getLeave(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) } })
leavesRouter.get('/balance/:empId', checkModule('rh', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.getEmployeeBalance(getCompanyId(req), req.params.empId!) }) } catch (e) { next(e) } })
leavesRouter.post('/',              checkModule('rh', 'write'), validateRequest({ body: CreateLeaveDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createLeave(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
leavesRouter.patch('/:id/review',   checkModule('rh', 'write'), validateRequest({ body: ReviewLeaveDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.reviewLeave(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
leavesRouter.post('/:id/cancel',    checkModule('rh', 'write'), async (req, res, next) => { try { res.json({ success: true, data: await svc.cancelLeave(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) } })
