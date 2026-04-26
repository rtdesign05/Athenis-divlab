import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateContractDto, UpdateContractDto, ListContractsDto, SendSignatureDto,
  CreateGdprDto, UpdateGdprDto,
  CreateAlertDto, UpdateAlertDto,
} from './legal.dto.js'
import * as svc from './legal.service.js'

export const legalRouter = Router()
legalRouter.use(authenticate)

// ── Contracts ─────────────────────────────────────────────────────────────────
legalRouter.get('/contracts',           checkModule('juridique', 'read'),   validateRequest({ query: ListContractsDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.listContracts(getCompanyId(req), req.query as never) }) } catch (e) { next(e) } })
legalRouter.get('/contracts/:id',       checkModule('juridique', 'read'),   async (req, res, next) => { try { res.json({ success: true, data: await svc.getContract(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) } })
legalRouter.post('/contracts',          checkModule('juridique', 'write'),  validateRequest({ body: CreateContractDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createContract(getCompanyId(req), req.body, req.user?.sub ?? 'unknown') }) } catch (e) { next(e) } })
legalRouter.patch('/contracts/:id',     checkModule('juridique', 'write'),  validateRequest({ body: UpdateContractDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.updateContract(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
legalRouter.delete('/contracts/:id',    checkModule('juridique', 'delete'), async (req, res, next) => { try { await svc.deleteContract(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) } })

// Signature workflow
legalRouter.post('/contracts/:id/send-signature', checkModule('juridique', 'write'), validateRequest({ body: SendSignatureDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.sendSignatureRequest(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })

// Public sign endpoint (no auth — accessed via token link)
legalRouter.get('/sign/:token',  async (req, res, next) => { try { res.json({ success: true, data: await svc.getSignatureByToken(req.params.token!) }) } catch (e) { next(e) } })
legalRouter.post('/sign/:token', async (req, res, next) => { try { const { action, note } = req.body; res.json({ success: true, data: await svc.processSignature(req.params.token!, action, note) }) } catch (e) { next(e) } })

// ── GDPR ──────────────────────────────────────────────────────────────────────
legalRouter.get('/gdpr/stats',   checkModule('juridique', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.gdprStats(getCompanyId(req)) }) } catch (e) { next(e) } })
legalRouter.get('/gdpr',         checkModule('juridique', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.listGdpr(getCompanyId(req)) }) } catch (e) { next(e) } })
legalRouter.get('/gdpr/:id',     checkModule('juridique', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.getGdprEntry(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) } })
legalRouter.post('/gdpr',        checkModule('juridique', 'write'), validateRequest({ body: CreateGdprDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createGdprEntry(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
legalRouter.patch('/gdpr/:id',   checkModule('juridique', 'write'), validateRequest({ body: UpdateGdprDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.updateGdprEntry(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
legalRouter.delete('/gdpr/:id',  checkModule('juridique', 'delete'), async (req, res, next) => { try { await svc.deleteGdprEntry(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) } })

// ── Alerts ────────────────────────────────────────────────────────────────────
legalRouter.get('/alerts/stats',    checkModule('juridique', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.alertStats(getCompanyId(req)) }) } catch (e) { next(e) } })
legalRouter.get('/alerts',          checkModule('juridique', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.listAlerts(getCompanyId(req), req.query.status as string) }) } catch (e) { next(e) } })
legalRouter.post('/alerts',         checkModule('juridique', 'write'), validateRequest({ body: CreateAlertDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createAlert(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
legalRouter.patch('/alerts/:id',    checkModule('juridique', 'write'), validateRequest({ body: UpdateAlertDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.updateAlert(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
legalRouter.post('/alerts/sync',    checkModule('juridique', 'write'), async (req, res, next) => { try { res.json({ success: true, data: await svc.syncExpiryAlerts(getCompanyId(req)) }) } catch (e) { next(e) } })
