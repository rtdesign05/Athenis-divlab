import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { CreateReviewDto, UpdateReviewDto, ListReviewsDto } from './reviews.dto.js'
import * as svc from './reviews.service.js'

export const reviewsRouter = Router()
reviewsRouter.use(authenticate)

reviewsRouter.get('/',     checkModule('rh', 'read'),   validateRequest({ query: ListReviewsDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.listReviews(getCompanyId(req), req.query as never) }) } catch (e) { next(e) } })
reviewsRouter.get('/:id',  checkModule('rh', 'read'),   async (req, res, next) => { try { res.json({ success: true, data: await svc.getReview(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) } })
reviewsRouter.post('/',    checkModule('rh', 'write'),  validateRequest({ body: CreateReviewDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createReview(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
reviewsRouter.patch('/:id', checkModule('rh', 'write'), validateRequest({ body: UpdateReviewDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.updateReview(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
reviewsRouter.delete('/:id', checkModule('rh', 'delete'), async (req, res, next) => { try { await svc.deleteReview(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) } })
