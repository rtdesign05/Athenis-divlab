import QRCode from 'qrcode'

/**
 * Génère un QR code sous forme de Data URL (PNG base64).
 * Compatible avec react-pdf (<Image>) et HTML (<img>).
 *
 * @param text  Texte / données à encoder
 * @param size  Largeur en pixels (défaut 96)
 */
export async function generateQRDataUrl(text: string, size = 96): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
}

// ── Builders de contenu QR par type de document ────────────────────────────

export function buildInvoiceQR(invoice: {
  number: string
  issueDate: string
  dueDate: string
  client?: { name?: string } | null
  subtotal: string | number
  taxRate: string | number
  taxAmount: string | number
  total: string | number
  status: string
}): string {
  const fmt = (n: string | number) => Number(n).toLocaleString('fr-FR') + ' F CFA'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
  return [
    `FACTURE ATHENIS`,
    `N°: ${invoice.number}`,
    `Client: ${invoice.client?.name ?? '—'}`,
    `Émission: ${fmtDate(invoice.issueDate)}`,
    `Échéance: ${fmtDate(invoice.dueDate)}`,
    `Montant HT: ${fmt(invoice.subtotal)}`,
    `TVA (${parseFloat(String(invoice.taxRate)).toFixed(2)}%): ${fmt(invoice.taxAmount)}`,
    `Total TTC: ${fmt(invoice.total)}`,
    `Statut: ${invoice.status}`,
  ].join('\n')
}

export function buildDevisQR(quote: {
  number: string
  issueDate: string
  validUntil: string
  client?: { name?: string } | null
  subtotal: string | number
  taxRate: string | number
  taxAmount: string | number
  total: string | number
  status: string
}): string {
  const fmt = (n: string | number) => Number(n).toLocaleString('fr-FR') + ' F CFA'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
  return [
    `DEVIS ATHENIS`,
    `N°: ${quote.number}`,
    `Client: ${quote.client?.name ?? '—'}`,
    `Date: ${fmtDate(quote.issueDate)}`,
    `Validité: ${fmtDate(quote.validUntil)}`,
    `Montant HT: ${fmt(quote.subtotal)}`,
    `TVA (${parseFloat(String(quote.taxRate)).toFixed(2)}%): ${fmt(quote.taxAmount)}`,
    `Total TTC: ${fmt(quote.total)}`,
    `Statut: ${quote.status}`,
  ].join('\n')
}

export function buildFactureVenteQR(f: {
  id: string
  client: string
  date: string
  echeance: string
  montantHT: number
  tva: number
  montantTTC: number
  statut: string
  modele?: string
}): string {
  const fmtMt = (n: number) => n.toLocaleString('fr-FR') + ' F CFA'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
  return [
    `FACTURE ${f.modele ? f.modele.toUpperCase() : ''}`.trim(),
    `N°: ${f.id}`,
    `Client: ${f.client}`,
    `Date: ${fmtDate(f.date)}`,
    `Échéance: ${fmtDate(f.echeance)}`,
    `Montant HT: ${fmtMt(f.montantHT)}`,
    `TVA: ${fmtMt(f.tva)}`,
    `Total TTC: ${fmtMt(f.montantTTC)}`,
    `Statut: ${f.statut}`,
  ].join('\n')
}

export function buildFactureAchatQR(f: {
  id: string
  fournisseur: string
  date: string
  echeance: string
  montantHT: number
  tva: number
  montantTTC: number
  statut: string
}): string {
  const fmtMt = (n: number) => n.toLocaleString('fr-FR') + ' F CFA'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR')
  return [
    `FACTURE ACHAT`,
    `N°: ${f.id}`,
    `Fournisseur: ${f.fournisseur}`,
    `Date: ${fmtDate(f.date)}`,
    `Échéance: ${fmtDate(f.echeance)}`,
    `Montant HT: ${fmtMt(f.montantHT)}`,
    `TVA: ${fmtMt(f.tva)}`,
    `Total TTC: ${fmtMt(f.montantTTC)}`,
    `Statut: ${f.statut}`,
  ].join('\n')
}

export function buildBLQR(bl: {
  id: string
  commande: string
  client: string
  dateCreation: string
  datePrevue: string
  dateLivraison?: string | null
  statut: string
  agence: string
  lignes: Array<unknown>
}): string {
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
  return [
    `BON DE LIVRAISON`,
    `N°: ${bl.id}`,
    `Commande: ${bl.commande}`,
    `Client: ${bl.client}`,
    `Émis le: ${fmtDate(bl.dateCreation)}`,
    `Livraison prévue: ${fmtDate(bl.datePrevue)}`,
    ...(bl.dateLivraison ? [`Livré le: ${fmtDate(bl.dateLivraison)}`] : []),
    `Agence: ${bl.agence}`,
    `Nb articles: ${bl.lignes.length}`,
    `Statut: ${bl.statut}`,
  ].join('\n')
}

export function buildBRQR(br: {
  id: string
  commande: string
  fournisseur: string
  dateCreation: string
  datePrevue: string
  dateReception?: string | null
  statut: string
  agence: string
  lignes: Array<unknown>
}): string {
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '—'
  return [
    `BON DE RÉCEPTION`,
    `N°: ${br.id}`,
    `Commande: ${br.commande}`,
    `Fournisseur: ${br.fournisseur}`,
    `Émis le: ${fmtDate(br.dateCreation)}`,
    `Réception prévue: ${fmtDate(br.datePrevue)}`,
    ...(br.dateReception ? [`Reçu le: ${fmtDate(br.dateReception)}`] : []),
    `Agence: ${br.agence}`,
    `Nb articles: ${br.lignes.length}`,
    `Statut: ${br.statut}`,
  ].join('\n')
}
