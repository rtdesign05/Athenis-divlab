import { Router } from 'express'
import multer from 'multer'
import { PDFParse } from 'pdf-parse'
import { authenticate } from '../../middleware/authenticate.js'
import { checkModule } from '../../middleware/checkModule.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { getCompanyId } from '../../lib/companyContext.js'
import {
  ImportBankDto,
  ReconcileDto,
  UpdateTxStatusDto,
  ListBankTxDto,
} from './bank.dto.js'
import * as svc from './bank.service.js'
import { extractBankStatement } from './bankStatement.provider.js'

export const bankRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 15 * 1024 * 1024 }, // 15 Mo — PDFs de plusieurs pages
})

bankRouter.use(authenticate)

bankRouter.get(
  '/stats',
  checkModule('comptabilite', 'read'),
  async (req, res, next) => {
    try {
      const data = await svc.bankStats(getCompanyId(req), req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.get(
  '/',
  checkModule('comptabilite', 'read'),
  validateRequest({ query: ListBankTxDto }),
  async (req, res, next) => {
    try {
      const data = await svc.listBankTransactions(getCompanyId(req), req.query as never, req.user)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.post(
  '/import',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: ImportBankDto }),
  async (req, res, next) => {
    try {
      const data = await svc.importBankStatement(getCompanyId(req), req.body, req.user)
      res.status(201).json({ success: true, data })
    } catch (e) { next(e) }
  },
)

/**
 * POST /api/bank/import/upload
 * Multipart — champ "file" : PDF, CSV ou OFX
 * Retourne les données extraites du relevé (prévisualisation) sans les persister.
 * Le frontend confirme ensuite via POST /api/bank/import (CSV) ou le contexte local.
 */
bankRouter.post(
  '/import/upload',
  checkModule('comptabilite', 'write'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'Aucun fichier reçu (champ "file" manquant)' })
      }

      const { mimetype, buffer, originalname } = req.file
      const ext = (originalname.split('.').pop() ?? '').toLowerCase()

      // ── CSV / OFX → parsing texte direct ──────────────────────────────────
      if (mimetype === 'text/csv' || ext === 'csv' || ext === 'ofx' || ext === 'qfx') {
        const content = buffer.toString('utf-8')
        const format  = (ext === 'csv' || mimetype === 'text/csv') ? 'CSV' : 'OFX'
        const data    = await svc.previewBankStatement(content, format)
        return res.json({ success: true, data })
      }

      // ── PDF → extraction texte via PDFParse → IA ──────────────────────────
      if (mimetype === 'application/pdf' || ext === 'pdf') {
        const parser = new PDFParse({ data: new Uint8Array(buffer) })
        let text = ''
        let pages = 0
        try {
          const textResult = await parser.getText()
          text  = textResult.text?.trim() ?? ''
          pages = textResult.total
        } finally {
          await parser.destroy().catch(() => undefined)
        }

        if (!text || text.length < 30) {
          return res.status(422).json({
            success: false,
            error: 'PDF sans texte extractible — le relevé est peut-être scanné (image). Exportez-le au format PDF texte ou CSV depuis votre banque.',
          })
        }

        const data = await extractBankStatement(text)
        return res.json({ success: true, data: { ...data, pages, provider: process.env.OCR_PROVIDER ?? 'tesseract' } })
      }

      return res.status(400).json({
        success: false,
        error:   `Format non supporté : ${mimetype}. Formats acceptés : PDF, CSV, OFX.`,
      })
    } catch (err) {
      next(err)
    }
  },
)

bankRouter.post(
  '/auto-reconcile',
  checkModule('comptabilite', 'write'),
  async (req, res, next) => {
    try {
      const data = await svc.autoReconcile(getCompanyId(req))
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.post(
  '/reconcile',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: ReconcileDto }),
  async (req, res, next) => {
    try {
      const data = await svc.reconcileTransaction(getCompanyId(req), req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.patch(
  '/:id/status',
  checkModule('comptabilite', 'write'),
  validateRequest({ body: UpdateTxStatusDto }),
  async (req, res, next) => {
    try {
      const data = await svc.updateTransactionStatus(getCompanyId(req), req.params.id!, req.body)
      res.json({ success: true, data })
    } catch (e) { next(e) }
  },
)

bankRouter.delete(
  '/:id',
  checkModule('comptabilite', 'delete'),
  async (req, res, next) => {
    try {
      await svc.deleteTransaction(getCompanyId(req), req.params.id!)
      res.json({ success: true, data: null })
    } catch (e) { next(e) }
  },
)
