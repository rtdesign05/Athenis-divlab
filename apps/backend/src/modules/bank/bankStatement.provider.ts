/**
 * Extraction IA de relevés bancaires africains
 * Fonctionne avec les mêmes providers que scan.service.ts :
 *   anthropic (meilleur) · ollama (local) · regex (fallback)
 */
import Anthropic from '@anthropic-ai/sdk'

export interface BankStatementLine {
  date:    string        // YYYY-MM-DD
  libelle: string
  debit:   number | null // montant sorti (positif)
  credit:  number | null // montant entré (positif)
  solde:   number | null // solde après opération
}

export interface BankStatementData {
  bankName:       string | null
  accountNumber:  string | null
  accountHolder:  string | null
  periodStart:    string | null
  periodEnd:      string | null
  openingBalance: number | null
  closingBalance: number | null
  currency:       string
  transactions:   BankStatementLine[]
  confidence:     number
}

function emptyStatement(): BankStatementData {
  return {
    bankName: null, accountNumber: null, accountHolder: null,
    periodStart: null, periodEnd: null,
    openingBalance: null, closingBalance: null,
    currency: 'XAF', transactions: [], confidence: 0,
  }
}

const BANK_AI_PROMPT = `Tu es un assistant OCR expert en relevés bancaires africains (BICEC, UBA, Ecobank, SGC, CCA Bank, Afriland, BOA, Société Générale Cameroun, etc.).
Analyse ce relevé bancaire et retourne UNIQUEMENT du JSON valide (sans markdown) :
{
  "bankName": "BICEC",
  "accountNumber": "CM 021 10023 00412876001 45",
  "accountHolder": "NOM ENTREPRISE SARL",
  "periodStart": "YYYY-MM-DD",
  "periodEnd": "YYYY-MM-DD",
  "openingBalance": 0,
  "closingBalance": 0,
  "currency": "XAF",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "libelle": "Libellé de l'opération",
      "debit": null,
      "credit": 8400000,
      "solde": 28450000
    }
  ],
  "confidence": 85
}

Règles strictes :
- debit = montant sorti (toujours positif) ou null si pas de débit sur cette ligne
- credit = montant entré (toujours positif) ou null si pas de crédit sur cette ligne
- Ne jamais mettre de valeurs négatives dans debit ou credit
- Convertir "1 234 567" → 1234567 (supprimer les espaces dans les montants)
- Si solde non disponible sur une ligne, mettre null
- Trier les transactions par date croissante (plus ancienne en premier)
- Devise par défaut : XAF (FCFA)
- confidence : 0-100 selon qualité de l'extraction (nombre de champs trouvés + cohérence des montants)

TEXTE DU RELEVÉ BANCAIRE :
`

function cleanJson(raw: string): string {
  return raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
}

// ── Provider Anthropic ────────────────────────────────────────────────────────

async function extractWithAnthropic(text: string): Promise<BankStatementData> {
  const client   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model:      'claude-3-5-haiku-20241022',
    max_tokens: 4000,
    messages:   [{ role: 'user', content: BANK_AI_PROMPT + text.slice(0, 12_000) }],
  })
  const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '{}'
  try {
    const p = JSON.parse(cleanJson(raw)) as BankStatementData
    p.confidence = typeof p.confidence === 'number' ? p.confidence : 60
    return p
  } catch {
    return emptyStatement()
  }
}

// ── Provider Ollama ───────────────────────────────────────────────────────────

async function extractWithOllama(text: string): Promise<BankStatementData> {
  const ollamaUrl = process.env.OLLAMA_URL  ?? 'http://localhost:11434'
  const model     = process.env.OLLAMA_MODEL ?? 'llama3.2-vision'
  const resp = await fetch(`${ollamaUrl}/api/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: BANK_AI_PROMPT + text.slice(0, 8_000), stream: false }),
    signal: AbortSignal.timeout(180_000),
  })
  const data    = await resp.json() as { response?: string }
  const cleaned = cleanJson((data.response ?? '{}').trim())
  const start   = cleaned.indexOf('{')
  const end     = cleaned.lastIndexOf('}')
  const jsonStr = start >= 0 && end > start ? cleaned.slice(start, end + 1) : '{}'
  try {
    const p = JSON.parse(jsonStr) as BankStatementData
    p.confidence = typeof p.confidence === 'number' ? p.confidence : 55
    return p
  } catch {
    return emptyStatement()
  }
}

// ── Fallback regex ────────────────────────────────────────────────────────────

function toISO(raw: string): string | null {
  const m = raw.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/)
  if (!m) return null
  const [, d, mo, y] = m
  const year = y?.length === 2 ? '20' + y : y
  return `${year}-${mo?.padStart(2, '0')}-${d?.padStart(2, '0')}`
}

function parseAmt(s: string): number {
  return parseFloat(s.replace(/[\s ]/g, '').replace(/\.(?=\d{3})/g, '').replace(',', '.'))
}

function extractByRegex(text: string): BankStatementData {
  const bankName = text.match(
    /\b(BICEC|UBA|Ecobank|Afriland|SGC|CCA\s*Bank|BOA|Société\s*Générale)\b/i,
  )?.[0]?.trim() ?? null

  const accountNumber = text.match(
    /(?:N°\s*[Cc]ompte|Compte\s*N°|RIB)[\s:]+([A-Z0-9][A-Z0-9 \-]{8,})/i,
  )?.[1]?.replace(/\s+/g, ' ').trim() ?? null

  const accountHolder = text.match(
    /(?:[Tt]itulaire|[Cc]lient|[Cc]ompte\s+de)[\s:]+([^\n]{3,60})/,
  )?.[1]?.trim() ?? null

  const rangeM    = text.match(/[Dd]u\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+au\s+(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i)
  const periodStart = rangeM?.[1] ? toISO(rangeM[1]) : null
  const periodEnd   = rangeM?.[2] ? toISO(rangeM[2]) : null

  const openingM  = text.match(/(?:[Ss]olde\s*(?:initial|ouverture|reporté|précédent)|[Ss]olde\s+au)[^\d]*([0-9][0-9\s,\.]+)/i)
  const closingM  = text.match(/(?:[Ss]olde\s*(?:final|clôture|arrêté|nouveau)|[Nn]ouveau\s+[Ss]olde)[^\d]*([0-9][0-9\s,\.]+)/i)
  const openingBalance = openingM?.[1] ? parseAmt(openingM[1]) : null
  const closingBalance = closingM?.[1] ? parseAmt(closingM[1]) : null
  const currency       = text.match(/\b(XAF|FCFA|EUR|USD|XOF)\b/i)?.[1]?.toUpperCase() ?? 'XAF'

  // Tente d'extraire les lignes type: DD/MM/YYYY  LIBELLÉ  DÉBIT  CRÉDIT  SOLDE
  const transactions: BankStatementLine[] = []
  const lineRe = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s{1,6}(.{4,80?}?)\s{2,}([0-9\s,\.]{3,})?(?:\s{2,}([0-9\s,\.]{3,}))?(?:\s{2,}([0-9\s,\.]{3,}))?/gm
  for (const m of text.matchAll(lineRe)) {
    const date    = toISO(m[1] ?? '')
    const libelle = (m[2] ?? '').trim().replace(/\s{2,}/g, ' ')
    if (!date || libelle.length < 4) continue
    const col3 = m[3] ? parseAmt(m[3]) : null
    const col4 = m[4] ? parseAmt(m[4]) : null
    const col5 = m[5] ? parseAmt(m[5]) : null
    // Heuristique : 3 colonnes = débit / crédit / solde ; 2 colonnes = montant / solde
    if (col3 && col4 && col5) {
      transactions.push({ date, libelle, debit: col3 || null, credit: col4 || null, solde: col5 })
    } else if (col3 && col4) {
      transactions.push({ date, libelle, debit: null, credit: col3, solde: col4 })
    } else if (col3) {
      transactions.push({ date, libelle, debit: null, credit: col3, solde: null })
    }
  }

  const fieldsFound = [bankName, accountNumber, periodStart, periodEnd, openingBalance ?? closingBalance].filter(Boolean).length
  const confidence  = transactions.length > 0 ? Math.min(90, Math.round((fieldsFound / 5) * 50 + transactions.length)) : 0

  return { bankName, accountNumber, accountHolder, periodStart, periodEnd, openingBalance, closingBalance, currency, transactions, confidence }
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

export async function extractBankStatement(text: string): Promise<BankStatementData> {
  const provider = (process.env.OCR_PROVIDER ?? 'tesseract').toLowerCase()

  if (provider === 'anthropic') {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY manquante dans .env')
    return extractWithAnthropic(text)
  }
  if (provider === 'ollama') {
    try { return await extractWithOllama(text) } catch { return emptyStatement() }
  }
  return extractByRegex(text)
}
