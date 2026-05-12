/**
 * ScanAI — OCR de factures fournisseurs via Claude Vision (claude-3-5-haiku)
 * Extrait automatiquement : fournisseur, NIU, date, montant HT/TVA/TTC, lignes
 */
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
  invoiceDate:    string | null   // YYYY-MM-DD
  dueDate:        string | null   // YYYY-MM-DD
  currency:       string | null   // XAF | EUR | USD
  items:          ScannedInvoiceLine[]
  subtotal:       number | null   // HT
  taxRate:        number | null   // % ex: 19.25
  taxAmount:      number | null   // montant TVA
  total:          number | null   // TTC
  notes:          string | null
  confidence:     number          // 0-100 — score de confiance de l'extraction
}

const SYSTEM_PROMPT = `Tu es un assistant OCR expert en documents comptables africains.
Tu analyses des images de factures fournisseurs (Cameroun, Côte d'Ivoire, Sénégal, Gabon, Togo).
Tu extrais les données avec une précision maximale et tu retournes UNIQUEMENT du JSON valide.
Règles :
- Devise XAF/FCFA si le pays est OHADA et aucune devise n'est précisée
- Taux TVA par défaut : Cameroun 19,25% — CI 18% — SN 18% — GA 18% — TG 18%
- Les dates sont toujours au format YYYY-MM-DD
- confidence = estimation 0-100 de la qualité de l'extraction (image nette = 90+, floue = 50-)`

const USER_PROMPT = `Analyse cette image de facture fournisseur et extrais toutes les informations visibles.

Retourne UNIQUEMENT ce JSON (sans markdown, sans texte avant/après) :
{
  "vendorName": "Nom du fournisseur ou null",
  "vendorNiu": "NIU / NUI du fournisseur ou null",
  "vendorAddress": "Adresse complète ou null",
  "vendorPhone": "Téléphone ou null",
  "invoiceNumber": "Numéro de facture ou null",
  "invoiceDate": "YYYY-MM-DD ou null",
  "dueDate": "YYYY-MM-DD ou null",
  "currency": "XAF ou EUR ou USD ou null",
  "items": [
    { "description": "Désignation", "quantity": 1, "unitPrice": 0, "total": 0 }
  ],
  "subtotal": 0,
  "taxRate": 19.25,
  "taxAmount": 0,
  "total": 0,
  "notes": "Mentions particulières ou null",
  "confidence": 85
}`

export async function scanInvoiceImage(
  imageBase64: string,
  mimeType: SupportedMimeType,
): Promise<ScannedInvoice> {
  const response = await client.messages.create({
    model:      'claude-3-5-haiku-20241022',
    max_tokens: 1500,
    system:     SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type:       'base64',
              media_type: mimeType,
              data:       imageBase64,
            },
          },
          { type: 'text', text: USER_PROMPT },
        ],
      },
    ],
  })

  const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}'

  // Nettoyer les éventuels blocs markdown ```json ... ```
  const cleaned = raw
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: ScannedInvoice
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Fallback si Claude retourne du texte non-JSON
    parsed = {
      vendorName: null, vendorNiu: null, vendorAddress: null, vendorPhone: null,
      invoiceNumber: null, invoiceDate: null, dueDate: null, currency: 'XAF',
      items: [], subtotal: null, taxRate: null, taxAmount: null, total: null,
      notes: 'Extraction échouée — veuillez saisir manuellement', confidence: 0,
    }
  }

  // S'assurer que confidence est défini
  parsed.confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 70

  return parsed
}
