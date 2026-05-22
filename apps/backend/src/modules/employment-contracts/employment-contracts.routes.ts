import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateEmploymentContractDto,
  UpdateEmploymentContractDto,
} from './employment-contracts.dto.js'
import * as svc from './employment-contracts.service.js'

export const employmentContractsRouter = Router()

employmentContractsRouter.use(authenticate)

employmentContractsRouter.get(
  '/',
  checkModule('rh', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.listEmploymentContracts(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employmentContractsRouter.get(
  '/:id',
  checkModule('rh', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getEmploymentContract(getCompanyId(req), req.params.id!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employmentContractsRouter.post(
  '/',
  checkModule('rh', 'write'),
  validateRequest({ body: CreateEmploymentContractDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createEmploymentContract(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employmentContractsRouter.patch(
  '/:id',
  checkModule('rh', 'write'),
  validateRequest({ body: UpdateEmploymentContractDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateEmploymentContract(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employmentContractsRouter.delete(
  '/:id',
  checkModule('rh', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteEmploymentContract(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
