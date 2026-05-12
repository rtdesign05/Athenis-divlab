/**
 * Provider OCR Tesseract.js — 100% gratuit, offline, aucune clé API
 * Extrait le texte de l'image puis parse les champs avec des regex OHADA
 */
import Tesseract from 'tesseract.js'
import type { ScannedInvoice } from '../scan.service.js'

// ── Helpers regex ─────────────────────────────────────────────────────────────

function first(text: string, ...patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return null
}

function parseAmount(raw: string | null): number | null {
  if (!raw) return null
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.').replace(/[^\d.]/g, '')
  const n = parseFloat(cleaned)
  return isNaN(n) ? null : Math.round(n)
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null

  // ISO direct : 2026-04-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw

  // FR : 15/04/2026 ou 15-04-2026
  const fr = raw.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/)
  if (fr?.[1] && fr[2] && fr[3]) {
    return `${fr[3]}-${fr[2].padStart(2,'0')}-${fr[1].padStart(2,'0')}`
  }

  // Littéral FR : 15 avril 2026
  const MOIS: Record<string,string> = {
    janvier:'01', février:'02', fevrier:'02', mars:'03', avril:'04',
    mai:'05', juin:'06', juillet:'07', août:'08', aout:'08',
    septembre:'09', octobre:'10', novembre:'11', décembre:'12', decembre:'12',
  }
  const lit = raw.toLowerCase().match(/(\d{1,2})\s+([a-zéûô]+)\s+(\d{4})/)
  const moisKey = lit?.[2]
  if (lit?.[1] && moisKey && lit[3] && MOIS[moisKey]) {
    return `${lit[3]}-${MOIS[moisKey]}-${lit[1].padStart(2,'0')}`
  }

  return null
}

// ── Parser principal ──────────────────────────────────────────────────────────

function parseOhadaInvoice(text: string): ScannedInvoice {
  const t = text // texte brut (peut contenir des \n et espaces variables)

  // ── Fournisseur ────────────────────────────────────────────────────────────
  const vendorNiu = first(t,
    /N[°o]?\s*NIU\s*[:=]?\s*([A-Z0-9]{6,20})/i,
    /NIU\s*[:=]?\s*([A-Z0-9]{6,20})/i,
    /\bM\d{9}[A-Z]\b/,               // format Cameroun M012345678A
  )

  const vendorName = first(t,
    /FOURNISSEUR\s*[:]\s*(.+?)(?:\n|NIU|RC|Tel|Tél)/i,
    /Vendeur\s*[:]\s*(.+?)(?:\n|NIU)/i,
    /Émetteur\s*[:]\s*(.+?)(?:\n|NIU)/i,
    /^([A-Z][A-Z\s&.,']{3,40}(?:SARL|SA|SAS|EURL|GIE|SNC)?)\s*$/m,
  )

  const vendorPhone = first(t,
    /(?:Tél|Tel|Phone)\s*[:.]?\s*([+\d\s()\-]{8,20})/i,
    /(?:\+237|237)\s*[\d\s]{8,12}/,
  )

  const vendorAddress = first(t,
    /(?:Adresse|BP|B\.P\.)\s*[:.]?\s*(.{10,80}?)(?:\n|NIU|Tel|Tél)/i,
    /(?:Douala|Yaoundé|Abidjan|Dakar|Libreville)[,\s]+.{5,60}/i,
  )

  // ── Identifiants facture ───────────────────────────────────────────────────
  const invoiceNumber = first(t,
    /FACTURE\s*N[°o]?\s*[:.]?\s*([A-Z0-9\-\/]{3,20})/i,
    /N[°o]\s*(?:de\s*)?(?:la\s*)?facture\s*[:.]?\s*([A-Z0-9\-\/]{3,20})/i,
    /Invoice\s*#\s*[:.]?\s*([A-Z0-9\-\/]{3,20})/i,
    /Ref\s*[:.]?\s*([A-Z0-9\-\/]{3,20})/i,
  )

  // ── Dates ─────────────────────────────────────────────────────────────────
  const rawInvoiceDate = first(t,
    /Date\s*(?:de\s*)?(?:la\s*)?facture\s*[:.]?\s*([\d]{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/i,
    /Date\s*[:.]?\s*([\d]{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/i,
    /(?:Le|le)\s+(\d{1,2}\s+\w+\s+\d{4})/,
    /([\d]{4}-[\d]{2}-[\d]{2})/,
    /([\d]{1,2}\/[\d]{1,2}\/[\d]{4})/,
  )
  const invoiceDate = parseDate(rawInvoiceDate)

  const rawDueDate = first(t,
    /(?:Échéance|Echeance|Due\s*date|Date\s*limite)\s*[:.]?\s*([\d]{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/i,
    /(?:À\s*payer\s*avant|Payable\s*le)\s*[:.]?\s*([\d]{1,2}[/\-.]\d{1,2}[/\-.]\d{4})/i,
  )
  const dueDate = parseDate(rawDueDate)

  // ── Devise ────────────────────────────────────────────────────────────────
  const currency = /XAF|FCFA|F\.?\s*CFA/i.test(t) ? 'XAF'
                 : /EUR\b|€/i.test(t)              ? 'EUR'
                 : /USD\b|\$/i.test(t)             ? 'USD'
                 : 'XAF' // défaut OHADA

  // ── Montants ──────────────────────────────────────────────────────────────
  const rawHT = first(t,
    /(?:Montant\s*HT|Sous[\s-]?total\s*HT|Total\s*HT|HT)\s*[:.]?\s*([\d\s,.']+)\s*(?:XAF|FCFA|F\.?\s*CFA|€)?/i,
    /(?:Base\s*TVA|Assiette)\s*[:.]?\s*([\d\s,.']+)/i,
  )
  const subtotal = parseAmount(rawHT)

  // Taux TVA
  const rawTvaRate = first(t,
    /TVA\s*\(?(\d{1,2}[.,]\d{1,2})\s*%?\)?/i,
    /T\.V\.A\s*\(?(\d{1,2}[.,]\d{1,2})\s*%?\)?/i,
    /Taxe\s*\(?(\d{1,2}[.,]\d{1,2})\s*%?\)?/i,
  )
  const taxRate = rawTvaRate
    ? parseFloat(rawTvaRate.replace(',', '.'))
    : (/Cameroun|CMR/i.test(t) ? 19.25 : 18)

  const rawTvaAmount = first(t,
    /TVA\s*(?:\(\d+[.,]\d+\s*%\))?\s*[:.]?\s*([\d\s,.']+)\s*(?:XAF|FCFA|€)?(?!\s*%)/i,
    /Montant\s*TVA\s*[:.]?\s*([\d\s,.']+)/i,
  )
  const taxAmount = parseAmount(rawTvaAmount)

  const rawTTC = first(t,
    /(?:Total\s*TTC|Montant\s*TTC|NET\s*À\s*PAYER|Total\s*à\s*payer|TOTAL)\s*[:.]?\s*([\d\s,.']+)\s*(?:XAF|FCFA|F\.?\s*CFA|€)?/i,
    /(?:Arrêté|Arrète)\s*la\s*présente\s*(?:facture)?\s*à\s*la\s*somme\s*(?:de)?\s*([\d\s,.']+)/i,
  )
  const total = parseAmount(rawTTC)

  // ── Notes ─────────────────────────────────────────────────────────────────
  const notes = first(t,
    /(?:Notes?|Remarques?|Observations?)\s*[:.]?\s*(.{5,150}?)(?:\n\n|\z)/i,
    /(?:Mode\s*de\s*paiement)\s*[:.]?\s*(.{3,80})/i,
  )

  // ── Score de confiance ────────────────────────────────────────────────────
  const filled = [vendorName, invoiceDate, subtotal, total, invoiceNumber].filter(Boolean).length
  const confidence = Math.round((filled / 5) * 100)

  return {
    vendorName,
    vendorNiu,
    vendorAddress: vendorAddress ?? null,
    vendorPhone:   vendorPhone ?? null,
    invoiceNumber,
    invoiceDate,
    dueDate,
    currency,
    items: [], // Tesseract ne structure pas les lignes (nécessite LLM pour ça)
    subtotal,
    taxRate,
    taxAmount:  taxAmount ?? (subtotal != null ? Math.round(subtotal * taxRate / 100) : null),
    total,
    notes:      notes ?? null,
    confidence,
  }
}

// ── Export provider ───────────────────────────────────────────────────────────

export async function scanWithTesseract(
  imageBase64: string,
  _mimeType: string,
): Promise<ScannedInvoice> {
  const imgBuffer = Buffer.from(imageBase64, 'base64')

  const { data } = await Tesseract.recognize(
    imgBuffer,
    'fra+eng', // français + anglais
    { logger: () => {} }, // silencieux
  )

  return parseOhadaInvoice(data.text)
}
