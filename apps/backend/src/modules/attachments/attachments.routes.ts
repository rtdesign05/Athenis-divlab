import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { authenticate } from '../../middleware/authenticate.js'
import { getCompanyId } from '../../lib/companyContext.js'
import { AppError } from '../../middleware/errorHandler.js'
import * as svc from './attachments.service.js'

export const attachmentsRouter = Router()

attachmentsRouter.use(authenticate)

// multer stores to disk under uploads/<companyId>/
const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // V7 : pas de fallback "unknown" — on rejette l'upload si le contexte
    //      company manque (sinon des fichiers de différents tenants seraient
    //      mélangés et l'attaquant pourrait pré-déposer des fichiers).
    try {
      const companyId = getCompanyId(req)
      const dir = path.join(svc.getUploadsDir(), companyId)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      cb(null, dir)
    } catch {
      cb(new Error('Contexte entreprise manquant — upload refusé'), '')
    }
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname)
    const key  = `${crypto.randomBytes(8).toString('hex')}${ext}`
    cb(null, key)
  },
})

// V4 : sanitize un nom de fichier pour Content-Disposition.
//      Évite l'injection de CRLF / guillemets / caractères de contrôle.
function sanitizeFileName(name: string): string {
  // Retire tout sauf alphanum, espaces, .-_()
  const safe = (name || 'file').replace(/[^\w. \-()]/g, '_').slice(0, 200)
  return safe || 'file'
}

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env['MAX_FILE_SIZE'] ?? '10485760', 10) },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf','image/jpeg','image/png','image/webp','image/heic']
    if (allowed.includes(file.mimetype)) cb(null, true)
    else cb(new Error('Type de fichier non autorisé'))
  },
})

// ── Upload ────────────────────────────────────────────────────────────────────

attachmentsRouter.post(
  '/upload',
  upload.array('files', 10),
  async (req, res, next) => {
    try {
      const companyId  = getCompanyId(req)
      const uploadedBy = req.user?.email ?? req.user?.sub ?? 'unknown'
      const invoiceId  = req.body.invoiceId as string | undefined
      const expenseId  = req.body.expenseId as string | undefined
      const files      = req.files as Express.Multer.File[]

      if (!files?.length) throw new AppError('Aucun fichier reçu', 400, 'NO_FILE')

      // V1 : vérifier que invoiceId/expenseId appartiennent bien à companyId
      //      avant d'y rattacher des pièces. Sinon un user pourrait polluer la
      //      compta d'un autre tenant en énumérant les CUID.
      const refs: { invoiceId?: string; expenseId?: string } = {}
      if (invoiceId) refs.invoiceId = invoiceId
      if (expenseId) refs.expenseId = expenseId
      await svc.assertInvoiceOrExpenseBelongsToCompany(companyId, refs)

      const results = await Promise.all(files.map(f => {
        const uploadsDir    = svc.getUploadsDir()
        const companySubdir = path.relative(uploadsDir, f.destination)
        if (companySubdir.startsWith('..') || path.isAbsolute(companySubdir)) {
          throw new AppError('Destination de fichier invalide', 400, 'INVALID_PATH')
        }
        const storageKey    = path.join(companySubdir, f.filename).replace(/\\/g, '/')
        const attData: Parameters<typeof svc.createAttachment>[0] = {
          companyId,
          uploadedBy,
          fileName:   f.originalname,
          fileSize:   f.size,
          mimeType:   f.mimetype,
          storageKey,
        }
        if (invoiceId) attData.invoiceId = invoiceId
        if (expenseId) attData.expenseId = expenseId
        return svc.createAttachment(attData)
      }))

      res.status(201).json({ success: true, data: results.map(a => ({
        ...a,
        url: svc.buildFileUrl(a.id),
      })) })
    } catch (e) { next(e) }
  },
)

// ── List by invoice ───────────────────────────────────────────────────────────

attachmentsRouter.get('/invoice/:invoiceId', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)
    const items = await svc.listAttachments(companyId, { invoiceId: req.params.invoiceId })
    res.json({ success: true, data: items.map(a => ({ ...a, url: svc.buildFileUrl(a.id) })) })
  } catch (e) { next(e) }
})

// ── List by expense ───────────────────────────────────────────────────────────

attachmentsRouter.get('/expense/:expenseId', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)
    const items = await svc.listAttachments(companyId, { expenseId: req.params.expenseId })
    res.json({ success: true, data: items.map(a => ({ ...a, url: svc.buildFileUrl(a.id) })) })
  } catch (e) { next(e) }
})

// ── Stream / preview file ─────────────────────────────────────────────────────

attachmentsRouter.get('/:id/file', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)
    const att = await svc.getAttachment(req.params.id, companyId)
    const uploadsDir = svc.getUploadsDir()
    const filePath   = path.resolve(uploadsDir, att.storageKey)
    if (!filePath.startsWith(uploadsDir + path.sep)) throw new AppError('Accès refusé', 403, 'FORBIDDEN')
    if (!fs.existsSync(filePath)) throw new AppError('Fichier introuvable sur le serveur', 404, 'FILE_MISSING')
    res.setHeader('Content-Type', att.mimeType)
    res.setHeader('Content-Length', att.fileSize)
    fs.createReadStream(filePath).pipe(res)
  } catch (e) { next(e) }
})

// ── Download ──────────────────────────────────────────────────────────────────

attachmentsRouter.get('/:id/download', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)
    const att = await svc.getAttachment(req.params.id, companyId)
    const uploadsDir = svc.getUploadsDir()
    const filePath   = path.resolve(uploadsDir, att.storageKey)
    if (!filePath.startsWith(uploadsDir + path.sep)) throw new AppError('Accès refusé', 403, 'FORBIDDEN')
    if (!fs.existsSync(filePath)) throw new AppError('Fichier introuvable sur le serveur', 404, 'FILE_MISSING')
    // V4 : sanitize + filename* RFC-5987 pour les non-ASCII.
    const safe = sanitizeFileName(att.fileName)
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(att.fileName)}`,
    )
    res.setHeader('Content-Type', att.mimeType)
    fs.createReadStream(filePath).pipe(res)
  } catch (e) { next(e) }
})

// ── Delete ────────────────────────────────────────────────────────────────────

attachmentsRouter.delete('/:id', async (req, res, next) => {
  try {
    const companyId = getCompanyId(req)
    await svc.deleteAttachment(req.params.id, companyId)
    res.json({ success: true })
  } catch (e) { next(e) }
})
