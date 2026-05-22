import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateGoodsReceiptDto,
  UpdateGoodsReceiptDto,
} from './goods-receipts.dto.js'
import * as svc from './goods-receipts.service.js'

export const goodsReceiptsRouter = Router()
goodsReceiptsRouter.use(authenticate)

goodsReceiptsRouter.get('/', checkModule('gestion', 'read'), async (req, res, next) => {
  try {
    const data = await svc.listGoodsReceipts(getCompanyId(req))
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

goodsReceiptsRouter.post('/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateGoodsReceiptDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createGoodsReceipt(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

goodsReceiptsRouter.patch('/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateGoodsReceiptDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateGoodsReceipt(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

goodsReceiptsRouter.delete('/:id', checkModule('gestion', 'delete'), async (req, res, next) => {
  try {
    await svc.deleteGoodsReceipt(getCompanyId(req), req.params.id!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})
