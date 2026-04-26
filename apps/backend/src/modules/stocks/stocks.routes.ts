import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateFamilyDto, UpdateFamilyDto,
  CreateArticleDto, UpdateArticleDto, ListArticlesDto,
  CreateMouvementDto, ListMouvementsDto,
} from './stocks.dto.js'
import * as svc from './stocks.service.js'

export const stocksRouter = Router()
stocksRouter.use(authenticate)

// ── Tableau de bord ───────────────────────────────────────────────────────────
stocksRouter.get('/tableau-de-bord', checkModule('gestion', 'read'), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getTableauDeBord(getCompanyId(req)) }) } catch (e) { next(e) }
})

// ── Valorisation ──────────────────────────────────────────────────────────────
stocksRouter.get('/valorisation', checkModule('gestion', 'read'), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getValorisation(getCompanyId(req)) }) } catch (e) { next(e) }
})

// ── Alertes ───────────────────────────────────────────────────────────────────
stocksRouter.get('/alertes', checkModule('gestion', 'read'), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getAlertes(getCompanyId(req)) }) } catch (e) { next(e) }
})

// ── Familles ──────────────────────────────────────────────────────────────────
stocksRouter.get('/families', checkModule('gestion', 'read'), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listFamilies(getCompanyId(req)) }) } catch (e) { next(e) }
})

stocksRouter.post('/families', checkModule('gestion', 'write'), validateRequest({ body: CreateFamilyDto }), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await svc.createFamily(getCompanyId(req), req.body) }) } catch (e) { next(e) }
})

stocksRouter.put('/families/:id', checkModule('gestion', 'write'), validateRequest({ body: UpdateFamilyDto }), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.updateFamily(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) }
})

stocksRouter.delete('/families/:id', checkModule('gestion', 'delete'), async (req, res, next) => {
  try { await svc.deleteFamily(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) }
})

// ── Articles ──────────────────────────────────────────────────────────────────
stocksRouter.get('/articles', checkModule('gestion', 'read'), validateRequest({ query: ListArticlesDto }), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listArticles(getCompanyId(req), req.query as never) }) } catch (e) { next(e) }
})

stocksRouter.get('/articles/:id/fiche', checkModule('gestion', 'read'), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.getArticle(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) }
})

stocksRouter.post('/articles', checkModule('gestion', 'write'), validateRequest({ body: CreateArticleDto }), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await svc.createArticle(getCompanyId(req), req.body) }) } catch (e) { next(e) }
})

stocksRouter.put('/articles/:id', checkModule('gestion', 'write'), validateRequest({ body: UpdateArticleDto }), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.updateArticle(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) }
})

stocksRouter.delete('/articles/:id', checkModule('gestion', 'delete'), async (req, res, next) => {
  try { await svc.deleteArticle(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) }
})

// ── Mouvements ────────────────────────────────────────────────────────────────
stocksRouter.get('/mouvements', checkModule('gestion', 'read'), validateRequest({ query: ListMouvementsDto }), async (req, res, next) => {
  try { res.json({ success: true, data: await svc.listMouvements(getCompanyId(req), req.query as never) }) } catch (e) { next(e) }
})

stocksRouter.post('/mouvements', checkModule('gestion', 'write'), validateRequest({ body: CreateMouvementDto }), async (req, res, next) => {
  try {
    const data = await svc.addMouvement(getCompanyId(req), req.body, req.user!.sub)
    res.status(201).json({ success: true, data })
  } catch (e) { next(e) }
})
