import { Router }       from 'express'
import { z }            from 'zod'
import multer           from 'multer'
import { authenticate } from '../../middleware/authenticate.js'
import { scanInvoiceImage, scanInvoiceFile, type SupportedMimeType } from './scan.service.js'

const router = Router()

/** Upload en mémoire — 10 Mo max (images + PDF) */
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 },
})

const ScanInvoiceDto = z.object({
  imageBase64: z.string().min(50, 'Image trop petite ou manquante'),
  mimeType:    z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const),
})

/**
 * POST /api/scan/invoice
 * Body: { imageBase64: string, mimeType: SupportedMimeType }
 * Retourne les données extraites de la facture fournisseur
 */
/**
 * GET /api/scan/status — informe le frontend sur le provider actif
 */
router.get('/status', authenticate, (_req, res) => {
  const provider = process.env.OCR_PROVIDER ?? 'tesseract'
  const providers: Record<string, { label: string; description: string; ready: boolean }> = {
    tesseract:  { label: 'Tesseract.js', description: '100% local · gratuit · aucune clé API',        ready: true },
    ollama:     { label: 'Ollama Vision', description: `LLM local · ${process.env.OLLAMA_MODEL ?? 'llama3.2-vision'} · gratuit`, ready: true },
    anthropic:  { label: 'Claude Vision', description: 'Anthropic API · meilleure précision',          ready: !!process.env.ANTHROPIC_API_KEY },
  }
  return res.json({ success: true, data: { active: provider, providers } })
})

router.post('/invoice', authenticate, async (req, res) => {
  const parsed = ScanInvoiceDto.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error:   'Données invalides',
      details: parsed.error.errors,
    })
  }

  const { imageBase64, mimeType } = parsed.data

  try {
    const result = await scanInvoiceImage(imageBase64, mimeType as SupportedMimeType)
    return res.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[ScanAI] Échec OCR :', message)
    return res.status(500).json({
      success: false,
      error:   'Échec de l\'analyse OCR',
      message,
    })
  }
})

/**
 * POST /api/scan/invoice/upload
 * Multipart/form-data — champ "file" : image (jpg/png/webp/gif) ou PDF
 * Retourne les données extraites + provider + pages (PDF uniquement)
 */
router.post('/invoice/upload', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'Aucun fichier reçu (champ "file" manquant)' })
  }

  const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
  if (!ALLOWED.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error:   `Format non supporté : ${req.file.mimetype}. Formats acceptés : JPG, PNG, WebP, GIF, PDF.`,
    })
  }

  try {
    const result = await scanInvoiceFile(req.file.buffer, req.file.mimetype)
    return res.json({ success: true, data: result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    console.error('[ScanAI] Échec OCR (upload) :', message)
    const status = message.includes('manquante') ? 503 : 500
    return res.status(status).json({ success: false, error: 'Échec de l\'analyse OCR', message })
  }
})

export default router
