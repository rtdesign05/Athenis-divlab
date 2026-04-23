import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { ListScheduleDto, UpsertScheduleDto } from './schedule.dto.js'
import * as svc from './schedule.service.js'

export const scheduleRouter = Router()
scheduleRouter.use(authenticate)

scheduleRouter.get('/',  checkModule('rh', 'read'),  validateRequest({ query: ListScheduleDto }),  async (req, res, next) => { try { res.json({ success: true, data: await svc.getWeekSchedule(getCompanyId(req), req.query as never) }) } catch (e) { next(e) } })
scheduleRouter.post('/', checkModule('rh', 'write'), validateRequest({ body: UpsertScheduleDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.upsertSchedule(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
