import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateCustomerReturnDto,
  UpdateCustomerReturnDto,
} from './customer-returns.dto.js'
import * as svc from './customer-returns.service.js'

export const customerReturnsRouter = Router()
customerReturnsRouter.use(authenticate)

customerReturnsRouter.get('/', checkModule('gestion', 'read'), async (req, res, next) => {
  try {
    const data = await svc.listCustomerReturns(getCompanyId(req))
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

customerReturnsRouter.post('/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateCustomerReturnDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createCustomerReturn(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

customerReturnsRouter.patch('/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateCustomerReturnDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateCustomerReturn(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

customerReturnsRouter.delete('/:id', checkModule('gestion', 'delete'), async (req, res, next) => {
  try {
    await svc.deleteCustomerReturn(getCompanyId(req), req.params.id!)
    res.json({ success: true, data: null })
  } catch (e) { next(e) }
})
