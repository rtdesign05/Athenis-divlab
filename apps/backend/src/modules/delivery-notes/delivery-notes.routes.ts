import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  CreateDeliveryNoteDto,
  UpdateDeliveryNoteDto,
} from './delivery-notes.dto.js'
import * as svc from './delivery-notes.service.js'

export const deliveryNotesRouter = Router()
deliveryNotesRouter.use(authenticate)

deliveryNotesRouter.get('/',
  checkModule('gestion', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.listDeliveryNotes(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

deliveryNotesRouter.post('/',
  checkModule('gestion', 'write'),
  validateRequest({ body: CreateDeliveryNoteDto }),
  async (req, res, next) => {
    try {
      const data = await svc.createDeliveryNote(getCompanyId(req), req.body)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

deliveryNotesRouter.patch('/:id',
  checkModule('gestion', 'write'),
  validateRequest({ body: UpdateDeliveryNoteDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateDeliveryNote(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

deliveryNotesRouter.delete('/:id',
  checkModule('gestion', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteDeliveryNote(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
