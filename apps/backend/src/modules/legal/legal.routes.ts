import { Router }            from 'express'
import multer               from 'multer'
import { authenticate }     from '../../middleware/authenticate.js'
import { checkModule }      from '../../middleware/checkModule.js'
import { validateRequest }  from '../../middleware/validateRequest.js'
import { getCompanyId }     from '../../lib/companyContext.js'
import {
  CreateContractDto, UpdateContractDto, ListContractsDto, SendSignatureDto,
  CreateGdprDto, UpdateGdprDto,
  CreateAlertDto, UpdateAlertDto,
} from './legal.dto.js'
import * as svc from './legal.service.js'

export const legalRouter = Router()

// Multer — fichiers en mémoire (max 10 MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

// ── Endpoints publics — AVANT authenticate (accessibles sans JWT) ─────────────

/**
 * GET /api/legal/sign/:token
 * Retourne les métadonnées du contrat pour la page de signature publique.
 */
legalRouter.get('/sign/:token', async (req, res, next) => {
  try {
    const data = await svc.getSignatureByToken(req.params.token!)
    if (!data) return res.status(404).json({ success: false, error: 'Lien de signature invalide ou expiré' })
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

/**
 * GET /api/legal/sign/:token/document
 * Retourne le document (base64) pour affichage dans la page de signature.
 */
legalRouter.get('/sign/:token/document', async (req, res, next) => {
  try {
    const doc = await svc.getContractDocument(req.params.token!)
    if (!doc) return res.status(404).json({ success: false, error: 'Document non trouvé' })
    res.json({ success: true, data: doc })
  } catch (e) { next(e) }
})

/**
 * POST /api/legal/sign/:token
 * Body: { action: 'sign'|'refuse', signatureData?: string (base64 PNG), note?: string }
 * Enregistre la signature ou le refus avec IP + User-Agent.
 */
legalRouter.post('/sign/:token', async (req, res, next) => {
  try {
    const { action, signatureData, note } = req.body
    if (!['sign', 'refuse'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action doit être "sign" ou "refuse"' })
    }
    const result = await svc.processSignature(req.params.token!, action, {
      ...(note            ? { note }          : {}),
      ...(signatureData   ? { signatureData } : {}),
      ...(req.ip          ? { ip: req.ip }    : {}),
      ...(req.headers['user-agent'] ? { userAgent: req.headers['user-agent'] } : {}),
    })
    if (!result) return res.status(400).json({ success: false, error: 'Signature invalide, expirée ou déjà traitée' })
    res.json({ success: true, data: result })
  } catch (e) { next(e) }
})

// ── Routes authentifiées ──────────────────────────────────────────────────────
legalRouter.use(authenticate)

// ── Contracts ─────────────────────────────────────────────────────────────────
legalRouter.get('/contracts',
  checkModule('juridique', 'read'),
  validateRequest({ query: ListContractsDto }),
  async (req, res, next) => { try { res.json({ success: true, data: await svc.listContracts(getCompanyId(req), req.query as never) }) } catch (e) { next(e) } })

legalRouter.get('/contracts/:id',
  checkModule('juridique', 'read'),
  async (req, res, next) => { try { res.json({ success: true, data: await svc.getContract(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) } })

legalRouter.post('/contracts',
  checkModule('juridique', 'write'),
  validateRequest({ body: CreateContractDto }),
  async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createContract(getCompanyId(req), req.body, req.user?.sub ?? 'unknown') }) } catch (e) { next(e) } })

legalRouter.patch('/contracts/:id',
  checkModule('juridique', 'write'),
  validateRequest({ body: UpdateContractDto }),
  async (req, res, next) => { try { res.json({ success: true, data: await svc.updateContract(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })

legalRouter.delete('/contracts/:id',
  checkModule('juridique', 'delete'),
  async (req, res, next) => { try { await svc.deleteContract(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) } })

// ── Upload document (PDF/DOCX) ────────────────────────────────────────────────
/**
 * POST /api/legal/contracts/:id/upload
 * Multipart: champ "file" (PDF recommandé, max 10 MB)
 * Stocke le document et calcule son empreinte SHA-256.
 */
legalRouter.post('/contracts/:id/upload',
  checkModule('juridique', 'write'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'Aucun fichier fourni' })

      const allowed = ['application/pdf', 'application/msword',
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                       'image/jpeg', 'image/png']
      if (!allowed.includes(req.file.mimetype)) {
        return res.status(400).json({ success: false, error: 'Format non supporté (PDF, DOCX, JPG, PNG uniquement)' })
      }

      const fileData = req.file.buffer.toString('base64')
      const result   = await svc.uploadContractDocument(getCompanyId(req), req.params.id!, {
        fileData,
        fileName:  req.file.originalname,
        fileMime:  req.file.mimetype,
        actorName: req.user?.sub ?? 'unknown',
        ...(req.ip ? { actorIp: req.ip } : {}),
      })
      if (!result) return res.status(404).json({ success: false, error: 'Contrat introuvable' })

      // Ne pas renvoyer le fileData (trop lourd) dans la réponse de confirmation
      const { fileData: _fd, ...safeResult } = result as never as { fileData: string; [k: string]: unknown }
      void _fd
      res.json({ success: true, data: safeResult })
    } catch (e) { next(e) }
  })

// ── Signature workflow ────────────────────────────────────────────────────────
legalRouter.post('/contracts/:id/send-signature',
  checkModule('juridique', 'write'),
  validateRequest({ body: SendSignatureDto }),
  async (req, res, next) => {
    try {
      const result = await svc.sendSignatureRequest(
        getCompanyId(req), req.params.id!, req.body,
        req.user?.sub ?? 'unknown', req.ip ?? undefined,
      )
      if (!result) return res.status(404).json({ success: false, error: 'Contrat introuvable' })
      res.json({ success: true, data: result })
    } catch (e) { next(e) }
  })

// ── Certificat de réalisation ─────────────────────────────────────────────────
legalRouter.get('/contracts/:id/certificate',
  checkModule('juridique', 'read'),
  async (req, res, next) => {
    try {
      const cert = await svc.getCompletionCertificate(getCompanyId(req), req.params.id!)
      if (!cert) return res.status(404).json({ success: false, error: 'Contrat introuvable' })
      res.json({ success: true, data: cert })
    } catch (e) { next(e) }
  })


// ── GDPR ──────────────────────────────────────────────────────────────────────
legalRouter.get('/gdpr/stats',   checkModule('juridique', 'read'),   async (req, res, next) => { try { res.json({ success: true, data: await svc.gdprStats(getCompanyId(req)) }) } catch (e) { next(e) } })
legalRouter.get('/gdpr',         checkModule('juridique', 'read'),   async (req, res, next) => { try { res.json({ success: true, data: await svc.listGdpr(getCompanyId(req)) }) } catch (e) { next(e) } })
legalRouter.get('/gdpr/:id',     checkModule('juridique', 'read'),   async (req, res, next) => { try { res.json({ success: true, data: await svc.getGdprEntry(getCompanyId(req), req.params.id!) }) } catch (e) { next(e) } })
legalRouter.post('/gdpr',        checkModule('juridique', 'write'),  validateRequest({ body: CreateGdprDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createGdprEntry(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
legalRouter.patch('/gdpr/:id',   checkModule('juridique', 'write'),  validateRequest({ body: UpdateGdprDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.updateGdprEntry(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
legalRouter.delete('/gdpr/:id',  checkModule('juridique', 'delete'), async (req, res, next) => { try { await svc.deleteGdprEntry(getCompanyId(req), req.params.id!); res.json({ success: true, data: null }) } catch (e) { next(e) } })

// ── Alerts ────────────────────────────────────────────────────────────────────
legalRouter.get('/alerts/stats',  checkModule('juridique', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.alertStats(getCompanyId(req)) }) } catch (e) { next(e) } })
legalRouter.get('/alerts',        checkModule('juridique', 'read'),  async (req, res, next) => { try { res.json({ success: true, data: await svc.listAlerts(getCompanyId(req), req.query.status as string) }) } catch (e) { next(e) } })
legalRouter.post('/alerts',       checkModule('juridique', 'write'), validateRequest({ body: CreateAlertDto }), async (req, res, next) => { try { res.status(201).json({ success: true, data: await svc.createAlert(getCompanyId(req), req.body) }) } catch (e) { next(e) } })
legalRouter.patch('/alerts/:id',  checkModule('juridique', 'write'), validateRequest({ body: UpdateAlertDto }), async (req, res, next) => { try { res.json({ success: true, data: await svc.updateAlert(getCompanyId(req), req.params.id!, req.body) }) } catch (e) { next(e) } })
legalRouter.post('/alerts/sync',  checkModule('juridique', 'write'), async (req, res, next) => { try { res.json({ success: true, data: await svc.syncExpiryAlerts(getCompanyId(req)) }) } catch (e) { next(e) } })
