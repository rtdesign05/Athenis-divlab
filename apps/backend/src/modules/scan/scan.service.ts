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
 */
import Anthropic from '@anthropic-ai/sdk'
import { scanWithTesseract } from './providers/tesseract.provider.js'
import { scanWithOllama }    from './providers/ollama.provider.js'

export type SupportedMimeType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'

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
