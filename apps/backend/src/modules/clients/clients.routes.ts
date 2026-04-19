import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { CreateClientDto, UpdateClientDto, ListClientsDto } from './clients.dto.js'
import * as svc from './clients.service.js'

export const clientsRouter = Router()

clientsRouter.use(authenticate)

clientsRouter.get(
  '/',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListClientsDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listClients(getCompanyId(req), req.query as never)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

clientsRouter.get(
  '/:id',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.getClient(getCompanyId(req), req.params.id!)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

clientsRouter.post(
  '/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateClientDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createClient(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

clientsRouter.patch(
  '/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateClientDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateClient(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

clientsRouter.delete(
  '/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteClient(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
