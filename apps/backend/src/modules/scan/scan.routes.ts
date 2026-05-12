import { Router }       from 'express'
import { z }            from 'zod'
import { authenticate } from '../../middleware/authenticate.js'
import { scanInvoiceImage, type SupportedMimeType } from './scan.service.js'

const router = Router()

const ScanInvoiceDto = z.object({
  imageBase64: z.string().min(50, 'Image trop petite ou manquante'),
  mimeType:    z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const),
})

/**
 * POST /api/scan/invoice
 * Body: { imageBase64: string, mimeType: SupportedMimeType }
 * Retourne les données extraites de la facture fournisseur
 */
router.post('/invoice', authenticate, async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      success: false,
      error:   'ScanAI non configuré — clé ANTHROPIC_API_KEY manquante dans .env',
    })
  }

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

export default router
