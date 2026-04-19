import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { CreateEmployeeDto, UpdateEmployeeDto, ListEmployeesDto } from './employees.dto.js'
import * as svc from './employees.service.js'

export const employeesRouter = Router()

employeesRouter.use(authenticate)

employeesRouter.get(
  '/',
  checkModule('rh', 'read'),
  validateRequest({ query: ListEmployeesDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listEmployees(getCompanyId(req), req.query as never)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employeesRouter.get(
  '/stats',
  checkModule('rh', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.employeeStats(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employeesRouter.get(
  '/:id',
  checkModule('rh', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getEmployee(getCompanyId(req), req.params.id!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employeesRouter.post(
  '/',
  checkModule('rh', 'write'),
  validateRequest({ body: CreateEmployeeDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createEmployee(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employeesRouter.patch(
  '/:id',
  checkModule('rh', 'write'),
  validateRequest({ body: UpdateEmployeeDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateEmployee(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employeesRouter.post(
  '/:id/toggle-status',
  checkModule('rh', 'write'),
  async (req, res, next) => {
    try {
      const data = await svc.toggleEmployeeStatus(getCompanyId(req), req.params.id!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

employeesRouter.delete(
  '/:id',
  checkModule('rh', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteEmployee(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
