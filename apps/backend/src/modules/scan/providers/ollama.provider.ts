/**
 * Provider OCR Ollama — LLM Vision local (llama3.2-vision, llava, minicpm-v)
 * 100% gratuit, tourne en local, qualité proche de Claude
 *
 * Installation : https://ollama.com  → puis :
 *   ollama pull llama3.2-vision   (8 GB RAM min, GPU recommandé)
 *   ollama pull llava:7b           (6 GB RAM min, plus léger)
 *   ollama pull minicpm-v          (4 GB RAM min, très léger)
 */
import type { ScannedInvoice } from '../scan.service.js'

const OLLAMA_HOST  = process.env.OLLAMA_HOST  ?? 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2-vision'

const PROMPT = `Tu es un assistant OCR expert en factures africaines (OHADA, SYSCOHADA).
Analyse cette image de facture fournisseur et retourne UNIQUEMENT ce JSON valide :
{
  "vendorName": "Nom fournisseur ou null",
  "vendorNiu": "NIU/NUI ou null",
  "vendorAddress": "Adresse ou null",
  "vendorPhone": "Téléphone ou null",
  "invoiceNumber": "N° facture ou null",
  "invoiceDate": "YYYY-MM-DD ou null",
  "dueDate": "YYYY-MM-DD ou null",
  "currency": "XAF ou EUR ou USD",
  "items": [{"description":"...","quantity":1,"unitPrice":0,"total":0}],
  "subtotal": 0,
  "taxRate": 19.25,
  "taxAmount": 0,
  "total": 0,
  "notes": "null ou mentions particulières",
  "confidence": 85
}
Taux TVA : Cameroun 19,25% | CI/SN/GA/TG 18%.
Devise par défaut : XAF si OHADA.
Réponds UNIQUEMENT avec le JSON, sans markdown.`

export async function scanWithOllama(
  imageBase64: string,
  _mimeType: string,
): Promise<ScannedInvoice> {
  // Test que Ollama est disponible
  const healthRes = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) })
    .catch(() => { throw new Error(`Ollama inaccessible sur ${OLLAMA_HOST} — vérifiez qu'il est lancé`) })

  if (!healthRes.ok) throw new Error('Ollama ne répond pas correctement')

  // Appel vision selon format Ollama (generate API)
  const body = {
    model:   OLLAMA_MODEL,
    prompt:  PROMPT,
    images:  [imageBase64],
    stream:  false,
    format:  'json',
  }

  const res = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(120_000), // 2 min max (LLM peut être lent)
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Ollama erreur ${res.status} : ${err.slice(0, 200)}`)
  }

  const data = await res.json() as { response: string; model: string }
  const raw  = data.response?.trim() ?? '{}'

  // Nettoyer les éventuels blocs markdown
  const cleaned = raw
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  let parsed: ScannedInvoice
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    parsed = buildEmpty('Parsing JSON échoué — réponse Ollama inattendue')
  }

  parsed.confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 70
  return parsed
}

function buildEmpty(notes: string): ScannedInvoice {
  return {
    vendorName: null, vendorNiu: null, vendorAddress: null, vendorPhone: null,
    invoiceNumber: null, invoiceDate: null, dueDate: null, currency: 'XAF',
    items: [], subtotal: null, taxRate: null, taxAmount: null, total: null,
    notes, confidence: 0,
  }
}
