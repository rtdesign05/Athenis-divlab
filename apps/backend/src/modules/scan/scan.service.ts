/**
 * ScanAI — OCR factures fournisseurs, multi-provider
 *
 * Sélection via la variable d'environnement OCR_PROVIDER :
 *
 *   tesseract  (défaut) — 100% gratuit, offline, aucune clé API
 *                         npm install tesseract.js — précision ~70%
 *
 *   ollama               — LLM vision local (llama3.2-vision, llava…)
 *                         Gratuit, privé, offline — précision ~90%
 *                         Installer : https://ollama.com
 *                         Modèle    : ollama pull llama3.2-vision
 *
 *   anthropic            — Claude claude-3-5-haiku-20241022 (vision)
 *                         Meilleure précision, ~0,001$/image
 *                         Requiert ANTHROPIC_API_KEY dans .env
 *
 * Support PDF :
 *   Les fichiers PDF sont traités via pdf-parse (extraction de texte) puis
 *   analysés par le provider actif en mode texte (pas image).
 */
import Anthropic from '@anthropic-ai/sdk'
import { PDFParse } from 'pdf-parse'
import { scanWithTesseract } from './providers/tesseract.provider.js'
import { scanWithOllama }    from './providers/ollama.provider.js'

export type SupportedMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'

export type SupportedFileType = SupportedMimeType | 'application/pdf'

export interface ScannedInvoiceLine {
  description: string
  quantity:    number
  unitPrice:   number
  total:       number
}

export interface ScannedInvoice {
  vendorName:     string | null
  vendorNiu:      string | null
  vendorAddress:  string | null
  vendorPhone:    string | null
  invoiceNumber:  string | null
  invoiceDate:    string | null
  dueDate:        string | null
  currency:       string | null
  items:          ScannedInvoiceLine[]
  subtotal:       number | null
  taxRate:        number | null
  taxAmount:      number | null
  total:          number | null
  notes:          string | null
  confidence:     number
}

// ── Provider Anthropic (interne) ──────────────────────────────────────────────

const ANTHROPIC_SYSTEM = `Tu es un assistant OCR expert en documents comptables africains (OHADA, SYSCOHADA).
Tu analyses des factures fournisseurs et retournes UNIQUEMENT du JSON valide.`

const ANTHROPIC_PROMPT = `Analyse cette facture fournisseur et extrais toutes les informations visibles.
Retourne UNIQUEMENT ce JSON (sans markdown) :
{
  "vendorName":"...","vendorNiu":"...","vendorAddress":"...","vendorPhone":"...",
  "invoiceNumber":"...","invoiceDate":"YYYY-MM-DD","dueDate":"YYYY-MM-DD",
  "currency":"XAF",
  "items":[{"description":"...","quantity":1,"unitPrice":0,"total":0}],
  "subtotal":0,"taxRate":19.25,"taxAmount":0,"total":0,
  "notes":"...","confidence":85
}
Taux TVA : Cameroun 19,25% | CI/SN/GA/TG 18%. Devise par défaut XAF.`

async function scanWithAnthropic(
  imageBase64: string,
  mimeType: SupportedMimeType,
): Promise<ScannedInvoice> {
  const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model:   'claude-3-5-haiku-20241022',
    max_tokens: 1500,
    system:  ANTHROPIC_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
        { type: 'text',  text: ANTHROPIC_PROMPT },
      ],
    }],
  })

  const raw     = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}'
  const cleaned = raw.replace(/^```json?\s*/i,'').replace(/\s*```$/,'').trim()
  try {
    const p = JSON.parse(cleaned) as ScannedInvoice
    p.confidence = typeof p.confidence === 'number' ? p.confidence : 75
    return p
  } catch {
    return emptyResult('Parsing JSON échoué (Anthropic)')
  }
}

// ── Sélection du provider ─────────────────────────────────────────────────────

function emptyResult(notes: string): ScannedInvoice {
  return {
    vendorName: null, vendorNiu: null, vendorAddress: null, vendorPhone: null,
    invoiceNumber: null, invoiceDate: null, dueDate: null, currency: 'XAF',
    items: [], subtotal: null, taxRate: null, taxAmount: null, total: null,
    notes, confidence: 0,
  }
}

export async function scanInvoiceImage(
  imageBase64: string,
  mimeType: SupportedMimeType,
): Promise<ScannedInvoice & { provider: string }> {
  const provider = (process.env.OCR_PROVIDER ?? 'tesseract').toLowerCase()

  let result: ScannedInvoice

  switch (provider) {
    case 'anthropic':
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante dans .env')
      result = await scanWithAnthropic(imageBase64, mimeType)
      break

    case 'ollama':
      result = await scanWithOllama(imageBase64, mimeType)
      break

    case 'tesseract':
    default:
      result = await scanWithTesseract(imageBase64, mimeType)
      break
  }

  return { ...result, provider }
}

// ── Extraction PDF (texte) ────────────────────────────────────────────────────

const PDF_TEXT_PROMPT = `Tu es un assistant OCR expert en comptabilité africaine (OHADA/SYSCOHADA).
Voici le texte extrait d'une facture fournisseur. Extrais toutes les informations et retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "vendorName":"...","vendorNiu":"...","vendorAddress":"...","vendorPhone":"...",
  "invoiceNumber":"...","invoiceDate":"YYYY-MM-DD","dueDate":"YYYY-MM-DD",
  "currency":"XAF",
  "items":[{"description":"...","quantity":1,"unitPrice":0,"total":0}],
  "subtotal":0,"taxRate":19.25,"taxAmount":0,"total":0,
  "notes":"...","confidence":85
}
Taux TVA : Cameroun 19,25% | CI/SN/GA/TG 18%. Devise par défaut XAF.
Si un champ est absent, mets null. Confidence : 0-100 selon les champs trouvés.

TEXTE DE LA FACTURE :
`

async function scanPdfText(text: string): Promise<ScannedInvoice> {
  const provider = (process.env.OCR_PROVIDER ?? 'tesseract').toLowerCase()

  // ── Anthropic (meilleure qualité) ──────────────────────────────────────────
  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante dans .env')
    const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model:      'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: PDF_TEXT_PROMPT + text.slice(0, 8000), // limite tokens
      }],
    })
    const raw     = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}'
    const cleaned = raw.replace(/^```json?\s*/i,'').replace(/\s*```$/,'').trim()
    try {
      const p = JSON.parse(cleaned) as ScannedInvoice
      p.confidence = typeof p.confidence === 'number' ? p.confidence : 75
      return p
    } catch {
      return emptyResult('Parsing JSON PDF échoué (Anthropic)')
    }
  }

  // ── Ollama (LLM local) ─────────────────────────────────────────────────────
  if (provider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434'
    const model     = process.env.OLLAMA_MODEL ?? 'llama3.2-vision'
    try {
      const resp = await fetch(`${ollamaUrl}/api/generate`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt: PDF_TEXT_PROMPT + text.slice(0, 6000),
          stream: false,
        }),
        signal: AbortSignal.timeout(120_000),
      })
      const data = await resp.json() as { response?: string }
      const raw     = (data.response ?? '{}').trim()
      const cleaned = raw.replace(/^```json?\s*/i,'').replace(/\s*```$/,'').trim()
      const start   = cleaned.indexOf('{')
      const end     = cleaned.lastIndexOf('}')
      const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : '{}'
      const p = JSON.parse(jsonStr) as ScannedInvoice
      p.confidence = typeof p.confidence === 'number' ? p.confidence : 70
      return p
    } catch {
      return emptyResult('Parsing JSON PDF échoué (Ollama)')
    }
  }

  // ── Tesseract fallback : regex sur texte brut ───────────────────────────────
  return extractFromRawText(text)
}

/**
 * Extraction par regex OHADA sur texte brut (fallback Tesseract pour les PDFs).
 * Même logique que le provider Tesseract mais sans l'étape de reconnaissance optique.
 */
function extractFromRawText(text: string): ScannedInvoice {
  const clean = text.replace(/\s+/g, ' ').trim()

  const findAmount = (patterns: RegExp[]): number | null => {
    for (const p of patterns) {
      const m = clean.match(p)
      if (m?.[1]) return parseFloat(m[1].replace(/[\s.]/g, '').replace(',', '.'))
    }
    return null
  }

  const vendorName    = clean.match(/(?:fournisseur|vendeur|émis par|de\s*:)\s*([^\n,;]+)/i)?.[1]?.trim() ?? null
  const vendorNiu     = clean.match(/NIU[\s:]*([A-Z0-9]{10,20})/i)?.[1] ?? null
  const invoiceNumber = clean.match(/(?:facture|n°|num[eé]ro)[\s:#]*([A-Z0-9\-\/]+)/i)?.[1] ?? null
  const invoiceDate   = clean.match(/(?:date[\s:]*facture|date\s*d.émission)[\s:]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i)?.[1]
                          ?.replace(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, (_,d,m,y) =>
                            `${y.length===2?'20'+y:y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`) ?? null
  const dueDate       = clean.match(/(?:[eé]ch[eé]ance|due|limit)[^\d]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i)?.[1]
                          ?.replace(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/, (_,d,m,y) =>
                            `${y.length===2?'20'+y:y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`) ?? null

  const subtotal  = findAmount([/(?:HT|hors.taxe)[\s:]*([0-9\s.]+[0-9]),?/i, /(?:montant net)[\s:]*([0-9\s.]+[0-9])/i])
  const total     = findAmount([/(?:TTC|toutes.taxes)[\s:]*([0-9\s.]+[0-9]),?/i, /(?:total\s*général|net\s*à\s*payer)[\s:]*([0-9\s.]+[0-9])/i])
  const taxAmount = findAmount([/(?:TVA|montant.tva)[\s:]*([0-9\s.]+[0-9]),?/i])
  const taxRateM  = clean.match(/TVA[\s:]*(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i)
  const taxRate   = taxRateM?.[1] ? parseFloat(taxRateM[1].replace(',','.')) : null

  const currency  = clean.match(/\b(XAF|FCFA|EUR|USD|XOF)\b/i)?.[1]?.toUpperCase() ?? 'XAF'

  // Score de confiance : 1 point par champ détecté (sur 6 champs clés)
  const found = [vendorName, invoiceNumber, invoiceDate, subtotal ?? total, taxRate, currency].filter(Boolean).length
  const confidence = Math.round((found / 6) * 100)

  return {
    vendorName, vendorNiu,
    vendorAddress: null, vendorPhone: null,
    invoiceNumber, invoiceDate, dueDate,
    currency, items: [],
    subtotal, taxRate, taxAmount, total,
    notes: null, confidence,
  }
}

/**
 * Point d'entrée principal pour tout type de fichier (image ou PDF).
 * Utilisé par l'endpoint multipart /scan/invoice/upload.
 */
export async function scanInvoiceFile(
  buffer: Buffer,
  mimeType: string,
): Promise<ScannedInvoice & { provider: string; pages?: number }> {
  const provider = (process.env.OCR_PROVIDER ?? 'tesseract').toLowerCase()

  // ── PDF ────────────────────────────────────────────────────────────────────
  if (mimeType === 'application/pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    let textResult: Awaited<ReturnType<typeof parser.getText>>
    let numpages = 0
    try {
      textResult = await parser.getText()
      numpages   = textResult.total
    } catch (err) {
      console.error('[ScanAI] Erreur lecture PDF :', (err as Error).message)
      await parser.destroy().catch(() => undefined)
      return { ...emptyResult('Impossible de lire le PDF — fichier corrompu ?'), provider, pages: 0 }
    }
    await parser.destroy().catch(() => undefined)

    const text = textResult.text?.trim()
    if (!text || text.length < 20) {
      return { ...emptyResult('PDF sans texte extractible (PDF scanné ?)'), provider, pages: numpages }
    }

    const result = await scanPdfText(text)
    return { ...result, provider, pages: numpages }
  }

  // ── Image ──────────────────────────────────────────────────────────────────
  const imageBase64 = buffer.toString('base64')
  const imgMime     = mimeType as SupportedMimeType
  const result      = await scanInvoiceImage(imageBase64, imgMime)
  return { ...result, provider }
}
