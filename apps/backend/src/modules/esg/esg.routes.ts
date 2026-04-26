import { Router } from 'express'
import { z } from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { UpsertEsgDto, CreateActionDto, UpdateActionDto } from './esg.dto.js'
import * as svc from './esg.service.js'

export const esgRouter = Router()
esgRouter.use(authenticate)

const YearQ  = z.object({ year: z.coerce.number().int().min(2000).max(2100).default(new Date().getFullYear()) })
const YearQo = z.object({ year: z.coerce.number().int().min(2000).max(2100).optional() })

// ── Data ──────────────────────────────────────────────────────────────────────
esgRouter.get('/years',      checkModule('esg', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.listEsgYears(getCompanyId(req)) }) } catch (e) { next(e) } })
esgRouter.get('/data',       checkModule('esg', 'read'),  validateRequest({ query: YearQ }), async (req, res, next) => { try { res.json({ success: true, data: await svc.getEsgData(getCompanyId(req), Number(req.query.year)) }) } catch (e) { next(e) } })
esgRouter.put('/data',       checkModule('esg', 'write'), validateRequest({ body: UpsertEsgDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.upsertEsgIndicator(getCompanyId(req), req.body) }) } catch (e) { next(e) } })

// ── Score & reports ───────────────────────────────────────────────────────────
esgRouter.get('/score',      checkModule('esg', 'read'),  validateRequest({ query: YearQ }), async (req, res, next) => { try { res.json({ success: true, data: await svc.getEsgScore(getCompanyId(req), Number(req.query.year)) }) } catch (e) { next(e) } })
esgRouter.get('/benchmark',  checkModule('esg', 'read'),  validateRequest({ query: YearQ }), async (req, res, next) => { try { res.json({ success: true, data: await svc.getBenchmark(getCompanyId(req), Number(req.query.year)) }) } catch (e) { next(e) } })
esgRouter.get('/csrd-report',checkModule('esg', 'read'),  validateRequest({ query: YearQ }), async (req, res, next) => { try { res.json({ success: true, data: await svc.getCsrdReport(getCompanyId(req), Number(req.query.year)) }) } catch (e) { next(e) } })

// ── Action plan ───────────────────────────────────────────────────────────────
esgRouter.get('/actions/stats', checkModule('esg', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.actionStats(getCompanyId(req)) }) } catch (e) { next(e) } })
esgRouter.get('/actions',       checkModule('esg', 'read'),  validateRequest({ query: YearQo }), async (req, res, next) => { try { res.json({ success: true, data: await svc.listActions(getCompanyId(req), req.query.year ? Number(req.query.year) : undefined) }) } catch (e) { next(e) } })
esgRouter.post('/actions',      checkModule('esg', 'write'), validateRequest({ body: CreateActionDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createAction(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
esgRouter.patch('/actions/:id', checkModule('esg', 'write'), validateRequest({ body: UpdateActionDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.updateAction(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
esgRouter.delete('/actions/:id',checkModule('esg', 'delete'),async (req, res, next) => { try { await svc.deleteAction(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) } })
