/**
 * invoiceConfig — module partagé pour la configuration des factures
 *
 * Utilisé par :
 *   • FacturesVentesParamPage  (lecture + écriture dans localStorage)
 *   • GestionContext            (génération de la numérotation)
 *   • FacturesVentesPage        (affichage conditionnel dans InvoiceView)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type TemplateId = 'classique' | 'moderne' | 'minimaliste' | 'colore'
export type DocType    = 'FV' | 'DEV' | 'AV' | 'BL' | 'BC'

export interface NumberingConfig {
  prefix:      string
  separator:   string
  yearFormat:  'full' | 'short' | 'none'
  monthIn:     boolean
  padding:     number
  startNumber: number
  reset:       'yearly' | 'monthly' | 'never'
}

export interface DisplayOptions {
  showLogo:        boolean
  showVatNumber:   boolean
  showQrCode:      boolean
  showSignature:   boolean
  showWatermark:   boolean
  watermarkText:   string
  showBankInfo:    boolean
  showLatePenalty: boolean
  showDiscount:    boolean
}

export interface BankInfo {
  bankName: string
  iban:     string
  bic:      string
  rib:      string
}

export interface InvoiceConfig {
  template:   TemplateId
  numbering:  Record<DocType, NumberingConfig>
  display:    DisplayOptions
  bank:       BankInfo
  footerText: string
  termsText:  string
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const INVOICE_CONFIG_KEY = 'athenis:invoice-config'

export const DEFAULT_NUMBERING: Record<DocType, NumberingConfig> = {
  FV:  { prefix: 'FV',  separator: '-', yearFormat: 'full', monthIn: false, padding: 4, startNumber: 1, reset: 'yearly' },
  DEV: { prefix: 'DEV', separator: '-', yearFormat: 'full', monthIn: false, padding: 4, startNumber: 1, reset: 'yearly' },
  AV:  { prefix: 'AV',  separator: '-', yearFormat: 'full', monthIn: false, padding: 4, startNumber: 1, reset: 'yearly' },
  BL:  { prefix: 'BL',  separator: '-', yearFormat: 'full', monthIn: false, padding: 4, startNumber: 1, reset: 'yearly' },
  BC:  { prefix: 'BC',  separator: '-', yearFormat: 'full', monthIn: false, padding: 4, startNumber: 1, reset: 'yearly' },
}

export const DEFAULT_INVOICE_CONFIG: InvoiceConfig = {
  template: 'classique',
  numbering: DEFAULT_NUMBERING,
  display: {
    showLogo:        true,
    showVatNumber:   true,
    showQrCode:      true,
    showSignature:   false,
    showWatermark:   false,
    watermarkText:   'DUPLICATA',
    showBankInfo:    true,
    showLatePenalty: true,
    showDiscount:    false,
  },
  bank: { bankName: '', iban: '', bic: '', rib: '' },
  footerText: 'Merci pour votre confiance — Pour toute question : contact@entreprise.cm',
  termsText:  'Paiement par virement bancaire sous 30 jours. Aucun escompte pour règlement anticipé.',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Charge et fusionne la config depuis localStorage avec les defaults. */
export function loadInvoiceConfig(): InvoiceConfig {
  try {
    const raw = localStorage.getItem(INVOICE_CONFIG_KEY)
    if (!raw) return DEFAULT_INVOICE_CONFIG
    const p = JSON.parse(raw)
    return {
      template:   p.template   ?? DEFAULT_INVOICE_CONFIG.template,
      numbering:  { ...DEFAULT_NUMBERING, ...(p.numbering ?? {}) },
      display:    { ...DEFAULT_INVOICE_CONFIG.display,  ...(p.display  ?? {}) },
      bank:       { ...DEFAULT_INVOICE_CONFIG.bank,     ...(p.bank     ?? {}) },
      footerText: p.footerText ?? DEFAULT_INVOICE_CONFIG.footerText,
      termsText:  p.termsText  ?? DEFAULT_INVOICE_CONFIG.termsText,
    }
  } catch {
    return DEFAULT_INVOICE_CONFIG
  }
}

/** Sauvegarde la config dans localStorage. */
export function saveInvoiceConfig(cfg: InvoiceConfig): void {
  localStorage.setItem(INVOICE_CONFIG_KEY, JSON.stringify(cfg))
}

/**
 * Construit un numéro de document à partir de la config de numérotation
 * et d'un numéro séquentiel.
 *
 * Exemples :
 *   { prefix:'FV', sep:'-', yearFormat:'full', monthIn:false, padding:4 }, 3
 *   → "FV-2026-0003"
 *
 *   { prefix:'FAC', sep:'/', yearFormat:'short', monthIn:true, padding:3 }, 12
 *   → "FAC/26/05/012"
 */
export function buildDocNumber(cfg: NumberingConfig, seq: number): string {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  const yearPart  = cfg.yearFormat === 'full'  ? String(year)
                  : cfg.yearFormat === 'short' ? String(year).slice(-2)
                  : ''
  const monthPart = cfg.monthIn ? String(month).padStart(2, '0') : ''
  const seqPart   = String(seq).padStart(cfg.padding, '0')

  return [cfg.prefix, yearPart, monthPart, seqPart]
    .filter(Boolean)
    .join(cfg.separator)
}
