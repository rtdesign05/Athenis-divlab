import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateFournisseurDto,
  UpdateFournisseurDto,
  ListFournisseursDto,
} from './fournisseurs.dto.js'
import * as svc from './fournisseurs.service.js'

export const fournisseursRouter = Router()
fournisseursRouter.use(authenticate)

fournisseursRouter.get('/',
  checkModule('gestion', 'read'),
  validateRequest({ query: ListFournisseursDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listFournisseurs(getCompanyId(req), req.query as never)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fournisseursRouter.post('/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateFournisseurDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createFournisseur(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fournisseursRouter.patch('/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateFournisseurDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateFournisseur(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

fournisseursRouter.delete('/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteFournisseur(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
