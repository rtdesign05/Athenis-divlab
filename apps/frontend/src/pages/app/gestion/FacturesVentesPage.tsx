import { useMemo, useState, useEffect, useRef } from 'react'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuth } from '@/features/auth/useAuth'
import { TVA_CM_PCT } from '@athenis/shared-types'
import {
  useGestion,
  type FactureVente,
  type FactureVenteStatut,
  type LigneFacture,
  type ModeleFacture,
} from '@/contexts/GestionContext'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'
import { SendEmailModal } from '@/components/gestion/SendEmailModal'
import { ArticleCombobox } from '@/components/gestion/ArticleCombobox'
import { PeriodFilter, filterByDateRange } from '@/components/gestion/PeriodFilter'
import { encodePaymentToken } from '@/pages/pay/PaymentPage'
import { printDocument } from '@/lib/printDocument'
import { generateQRDataUrl, buildFactureVenteQR } from '@/lib/qrCode'
import { loadInvoiceConfig } from '@/lib/invoiceConfig'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUT_STYLE: Record<FactureVenteStatut, string> = {
  'Brouillon': 'bg-gray-100 text-gray-600',
  'Envoyée':   'bg-blue-100 text-blue-700',
  'Payée':     'bg-green-100 text-green-700',
  'En retard': 'bg-red-100 text-red-600',
  'Annulée':   'bg-red-50 text-red-400',
}

const STATUTS: FactureVenteStatut[] = ['Brouillon', 'Envoyée', 'Payée', 'En retard', 'Annulée']

const MODELE_META: Record<ModeleFacture, { label: string; icon: string; desc: string; color: string }> = {
  standard: {
    label: 'Facture standard',
    icon: '📄',
    desc: "Facture commerciale classique avec lignes d'articles et TVA",
    color: 'border-green-200 bg-green-50',
  },
  proforma: {
    label: 'Pro forma',
    icon: '📋',
    desc: "Document préliminaire sans valeur comptable — devient facture à l'accord",
    color: 'border-blue-200 bg-blue-50',
  },
  avoir: {
    label: 'Avoir / Note de crédit',
    icon: '↩️',
    desc: "Annulation partielle ou totale d'une facture émise",
    color: 'border-amber-200 bg-amber-50',
  },
  acompte: {
    label: "Facture d'acompte",
    icon: '💰',
    desc: 'Règlement partiel anticipé avant exécution de la commande',
    color: 'border-purple-200 bg-purple-50',
  },
}

const CONDITIONS_PAIEMENT = [
  'Paiement comptant',
  'Paiement à 8 jours',
  'Paiement à 15 jours',
  'Paiement à 30 jours',
  'Acompte 30% — solde à la livraison',
  'Acompte 50% — solde à la livraison',
  'Remboursement sous 15 jours',
  'Virement bancaire à 30 jours',
  'Acompte 30% à la commande — solde à livraison',
]

const UNITES = ['pièce', 'kg', 'litre', 'm²', 'heure', 'forfait', 'jours']

// ── Helpers ───────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR')
}

function docTitle(modele: ModeleFacture): string {
  switch (modele) {
    case 'proforma': return 'PRO FORMA'
    case 'avoir':    return 'AVOIR'
    case 'acompte':  return "FACTURE D'ACOMPTE"
    default:         return 'FACTURE'
  }
}

// ── Email HTML builder ────────────────────────────────────────────────────────

function buildFactureEmailHtml(
  facture:     FactureVente,
  companyName: string,
  address:     string,
  city:        string,
  fmt:         (n: number) => string,
  payUrl?:     string,
): string {
  const lignesRows = facture.lignes.map(l => `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${l.description}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:center">${l.quantite} ${l.unite}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;text-align:right">${fmt(l.montantHT)}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
      <tr><td style="background:#1a3a2a;padding:28px 40px;text-align:center">
        <span style="color:#fff;font-size:20px;font-weight:700">Athenis</span>
      </td></tr>
      <tr><td style="padding:36px 40px">
        <h1 style="margin:0 0 4px;font-size:18px;color:#111827">${docTitle(facture.modele)} N° ${facture.id}</h1>
        <p style="margin:0 0 24px;font-size:13px;color:#6b7280">De la part de <strong>${companyName}</strong>${address ? `, ${address}` : ''}${city ? `, ${city}` : ''}</p>
        <!--CUSTOM_MESSAGE-->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:left">Description</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:center">Qté / Unité</th>
              <th style="padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;color:#9ca3af;text-align:right">Total HT</th>
            </tr>
          </thead>
          <tbody>${lignesRows}</tbody>
        </table>
        <table width="220" align="right" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#6b7280">Total HT</td>
            <td style="padding:4px 0;font-size:13px;color:#111827;text-align:right;font-weight:600">${fmt(facture.montantHT)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#6b7280">TVA (${facture.tva}%)</td>
            <td style="padding:4px 0;font-size:13px;color:#6b7280;text-align:right">${fmt(facture.montantTTC - facture.montantHT)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#111827;border-top:2px solid #e5e7eb">Total TTC</td>
            <td style="padding:8px 0 0;font-size:15px;font-weight:700;color:#111827;text-align:right;border-top:2px solid #e5e7eb">${fmt(facture.montantTTC)}</td>
          </tr>
        </table>
        ${facture.conditionsPaiement ? `<p style="font-size:12px;color:#9ca3af;margin:0 0 20px">Conditions de paiement : ${facture.conditionsPaiement}</p>` : ''}
        ${payUrl ? `
        <div style="text-align:center;margin:28px 0 8px">
          <a href="${payUrl}"
             style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:16px;letter-spacing:.2px">
            💳 Payer maintenant
          </a>
          <p style="margin:10px 0 0;font-size:11px;color:#9ca3af">Carte bancaire · MTN Mobile Money · Orange Money</p>
        </div>` : ''}
      </td></tr>
      <tr><td style="background:#f9fafb;padding:18px 40px;text-align:center;border-top:1px solid #e5e7eb">
        <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} ${companyName} — Document généré par Athenis</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

// ── InvoiceView ───────────────────────────────────────────────────────────────

interface InvoiceViewProps {
  facture:         FactureVente
  onClose:         () => void
  onStatutChange:  (id: string, statut: FactureVenteStatut) => void
  allFactures:     FactureVente[]
  currentIndex:    number
  onNavigate:      (id: string) => void
}

function InvoiceView({
  facture,
  onClose,
  onStatutChange,
  allFactures,
  currentIndex,
  onNavigate,
}: InvoiceViewProps) {
  const { fmt }    = useCurrency()
  const { company } = useCompanySettings()
  const { clients } = useGestion()
  const [emailOpen,   setEmailOpen]   = useState(false)
  const [payLinkOpen, setPayLinkOpen] = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [qrDataUrl,   setQrDataUrl]   = useState<string>('')
  const docRef = useRef<HTMLDivElement>(null)

  // ── Paramètres de facture depuis localStorage ─────────────────────────────
  const invoiceCfg = useMemo(() => loadInvoiceConfig(), [])

  // ── Template visuel ───────────────────────────────────────────────────────
  type TplKey = 'classique' | 'moderne' | 'minimaliste' | 'colore'
  const TEMPLATE_CFG: Record<TplKey, {
    headerBg:   string
    headerText: string
    theadBg:    string
    theadText:  string
    billBg:     string
    billBorder: string
    docStyle:   React.CSSProperties
    hasBand:    boolean
  }> = {
    classique:   { headerBg: '#1a3a2a', headerText: '#fff', theadBg: '#1a3a2a', theadText: '#fff',     billBg: '#f9fafb', billBorder: '#e5e7eb', docStyle: { backgroundColor: '#fff' },                                               hasBand: true  },
    moderne:     { headerBg: '#1f2937', headerText: '#fff', theadBg: '#1f2937', theadText: '#fff',     billBg: '#fffbeb', billBorder: '#fcd34d', docStyle: { backgroundColor: '#fff' },                                               hasBand: true  },
    minimaliste: { headerBg: 'none',    headerText: '#111', theadBg: '#f9fafb', theadText: '#374151',  billBg: '#ffffff', billBorder: '#9ca3af', docStyle: { backgroundColor: '#fff' },                                               hasBand: false },
    colore:      { headerBg: '#7c3aed', headerText: '#fff', theadBg: '#7c3aed', theadText: '#fff',     billBg: '#fdf4ff', billBorder: '#e9d5ff', docStyle: { background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 100%)' },        hasBand: true  },
  }
  const tplCfg = TEMPLATE_CFG[(invoiceCfg.template as TplKey)] ?? TEMPLATE_CFG.classique

  // ── Logo : champ API → fallback localStorage (défini dans Paramètres → Entreprise) ──
  const logoUrl: string | null = company?.logo
    ?? (typeof window !== 'undefined' ? localStorage.getItem('athenis:company-logo') : null)
    ?? null

  useEffect(() => {
    generateQRDataUrl(buildFactureVenteQR(facture)).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [facture.id, facture.statut])

  const companyName    = company?.name    ?? 'Société Athenis'
  const companyAddress = company?.address ?? '12 Rue Bonanjo'
  const companyCity    = company?.city    ?? 'Douala'
  const companyPhone   = company?.phone   ?? ''
  const companyEmail   = company?.contactEmail ?? ''

  // Cherche l'e-mail du client correspondant à la facture
  const clientEmail = clients.find(c => c.nom === facture.client)?.email ?? ''

  // Génère le lien de paiement pour cette facture
  const payToken = encodePaymentToken({
    ref:       facture.id,
    amountTTC: facture.montantTTC,
    currency:  'XAF',
    client:    facture.client,
    company:   companyName,
    desc:      facture.lignes[0]?.description ?? '',
    dueDate:   facture.echeance,
  })
  const payUrl = `${window.location.origin}/pay/${payToken}`

  function copyPayLink() {
    navigator.clipboard.writeText(payUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const prevFacture = currentIndex > 0               ? allFactures[currentIndex - 1] : null
  const nextFacture = currentIndex < allFactures.length - 1 ? allFactures[currentIndex + 1] : null

  const tvaAmount  = facture.lignes.reduce((s, l) => s + l.montantHT * l.tvaRate / 100, 0)

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
        >
          ← Liste
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-mono text-sm font-semibold text-gray-800">{facture.id}</span>
        <span className="text-gray-300">|</span>

        {/* Navigation prev/next */}
        <div className="flex items-center gap-1">
          <button
            disabled={!prevFacture}
            onClick={() => prevFacture && onNavigate(prevFacture.id)}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            Préc.
          </button>
          <span className="text-xs text-gray-400">
            {currentIndex + 1}/{allFactures.length}
          </span>
          <button
            disabled={!nextFacture}
            onClick={() => nextFacture && onNavigate(nextFacture.id)}
            className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          >
            Suiv.
          </button>
        </div>

        <span className="text-gray-300">|</span>

        {/* Statut badge + selector */}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLE[facture.statut]}`}>
          {facture.statut}
        </span>
        <select
          value={facture.statut}
          onChange={e => onStatutChange(facture.id, e.target.value as FactureVenteStatut)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
        >
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setPayLinkOpen(true)}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            💳 Lien de paiement
          </button>
          <button
            onClick={() => setEmailOpen(true)}
            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
          >
            ✉️ Envoyer
          </button>
          <button
            onClick={() => printDocument(docRef.current, `${docTitle(facture.modele)} ${facture.id}`)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            🖨️ PDF
          </button>
        </div>
      </div>

      {/* ── Modal lien de paiement ─────────────────────────────────────────────── */}
      {payLinkOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-gray-900">💳 Lien de paiement</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Facture <span className="font-mono">{facture.id}</span> — {facture.client}
                </p>
              </div>
              <button onClick={() => setPayLinkOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Amount */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-center">
                <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">Montant à régler</p>
                <p className="text-2xl font-bold text-blue-900">
                  {new Intl.NumberFormat('fr-CM', { style: 'currency', currency: 'XAF', maximumFractionDigits: 0 }).format(facture.montantTTC)}
                </p>
              </div>

              {/* Link */}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1.5">Lien à partager avec le client</p>
                <div className="flex gap-2">
                  <input
                    readOnly value={payUrl}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 focus:outline-none overflow-hidden"
                  />
                  <button
                    onClick={copyPayLink}
                    className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      copied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {copied ? '✓ Copié' : 'Copier'}
                  </button>
                </div>
              </div>

              {/* Methods */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-medium text-gray-500 mb-3">Méthodes de paiement acceptées</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="text-base">💳</span> Carte bancaire
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="text-base">📱</span> MTN MoMo
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="text-base">🟠</span> Orange Money
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => window.open(payUrl, '_blank')}
                  className="flex-1 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                >
                  👁️ Aperçu
                </button>
                <button
                  onClick={() => { setPayLinkOpen(false); setEmailOpen(true) }}
                  className="flex-1 rounded-xl bg-[#1a3a2a] py-2.5 text-sm font-medium text-white hover:bg-[#234d39]"
                >
                  ✉️ Envoyer par mail
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal e-mail */}
      <SendEmailModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        to={clientEmail}
        subject={`${docTitle(facture.modele)} N° ${facture.id} — ${company?.name ?? 'Athenis'}`}
        documentRef={facture.id}
        documentType={MODELE_META[facture.modele].label}
        clientName={facture.client}
        bodyHtml={buildFactureEmailHtml(facture, company?.name ?? 'Athenis', company?.address ?? '', company?.city ?? 'Douala', fmt, payUrl)}
      />

      {/* Document */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-gray-100 p-6">
        <div ref={docRef} className="relative max-w-3xl mx-auto shadow-sm rounded-lg p-10 print:shadow-none print:rounded-none overflow-hidden" style={tplCfg.docStyle}>

          {/* ── En-tête document : adapté au modèle visuel ── */}
          {tplCfg.hasBand ? (
            /* Classique / Moderne / Coloré — bandeau coloré pleine largeur */
            <div
              className="-mx-10 -mt-10 px-10 py-7 mb-8 flex justify-between items-center gap-6"
              style={{ backgroundColor: tplCfg.headerBg }}
            >
              <div className="flex items-center gap-4 min-w-0">
                {invoiceCfg.display.showLogo && logoUrl && (
                  <img
                    src={logoUrl} alt="Logo"
                    className="h-12 max-w-[100px] object-contain shrink-0 bg-white/20 rounded p-1"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-lg font-bold truncate" style={{ color: tplCfg.headerText }}>{companyName}</p>
                  <p className="text-sm" style={{ color: tplCfg.headerText, opacity: 0.75 }}>{companyAddress}</p>
                  <p className="text-sm" style={{ color: tplCfg.headerText, opacity: 0.75 }}>{companyCity}, Cameroun</p>
                  {companyPhone && <p className="text-sm" style={{ color: tplCfg.headerText, opacity: 0.65 }}>Tél : {companyPhone}</p>}
                  {companyEmail && <p className="text-sm" style={{ color: tplCfg.headerText, opacity: 0.65 }}>{companyEmail}</p>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold uppercase tracking-wide" style={{ color: tplCfg.headerText }}>
                  {docTitle(facture.modele)}
                </p>
                <p className="mt-1 text-sm font-mono" style={{ color: tplCfg.headerText, opacity: 0.8 }}>N° {facture.id}</p>
                <p className="text-sm" style={{ color: tplCfg.headerText, opacity: 0.7 }}>Date : {fmtDate(facture.date)}</p>
                <p className="text-sm" style={{ color: tplCfg.headerText, opacity: 0.7 }}>Échéance : {fmtDate(facture.echeance)}</p>
                {facture.commande && (
                  <p className="text-sm" style={{ color: tplCfg.headerText, opacity: 0.7 }}>Commande : {facture.commande}</p>
                )}
              </div>
            </div>
          ) : (
            /* Minimaliste — en-tête épuré avec bordure inférieure */
            <div className="flex justify-between items-start mb-8 pb-5 border-b-2 border-gray-900">
              <div className="flex items-start gap-4">
                {invoiceCfg.display.showLogo && logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-10 max-w-[100px] object-contain" />
                )}
                <div>
                  <p className="text-lg font-bold text-gray-900">{companyName}</p>
                  <p className="text-sm text-gray-600">{companyAddress}</p>
                  <p className="text-sm text-gray-600">{companyCity}, Cameroun</p>
                  {companyPhone && <p className="text-sm text-gray-600">Tél : {companyPhone}</p>}
                  {companyEmail && <p className="text-sm text-gray-600">{companyEmail}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
                  {docTitle(facture.modele)}
                </p>
                <p className="mt-1 text-sm text-gray-700 font-mono">N° {facture.id}</p>
                <p className="text-sm text-gray-500">Date : {fmtDate(facture.date)}</p>
                <p className="text-sm text-gray-500">Échéance : {fmtDate(facture.echeance)}</p>
                {facture.commande && (
                  <p className="text-sm text-gray-500">Commande : {facture.commande}</p>
                )}
              </div>
            </div>
          )}

          {/* Bill to */}
          <div
            className="mb-6 rounded-lg border p-4"
            style={{ backgroundColor: tplCfg.billBg, borderColor: tplCfg.billBorder }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
              Facturer à
            </p>
            <p className="font-semibold text-gray-900">{facture.client}</p>
            <p className="text-sm text-gray-500">{facture.agence}</p>
          </div>

          {/* Lines table */}
          <table className="w-full text-sm mb-6">
            <thead>
              <tr
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: tplCfg.theadBg, color: tplCfg.theadText }}
              >
                <th className="py-2 px-2 text-left rounded-tl">Description</th>
                <th className="py-2 px-2 text-center w-16">Qté</th>
                <th className="py-2 px-2 text-center w-20">Unité</th>
                <th className="py-2 px-2 text-right w-28">P.U. HT</th>
                <th className="py-2 px-2 text-right w-8">TVA</th>
                <th className="py-2 px-2 text-right w-28 rounded-tr">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facture.lignes.map(l => (
                <tr key={l.id}>
                  <td className="py-2 pr-4 text-gray-800">{l.description}</td>
                  <td className="py-2 text-center text-gray-700">{l.quantite}</td>
                  <td className="py-2 text-center text-gray-500">{l.unite}</td>
                  <td className="py-2 text-right text-gray-700">{fmt(l.prixUnitaireHT)}</td>
                  <td className="py-2 text-right text-gray-500 text-xs">{l.tvaRate}%</td>
                  <td className="py-2 text-right font-medium text-gray-900">{fmt(l.montantHT)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals + notes */}
          <div className="flex gap-6 justify-between">
            <div className="flex-1 space-y-3">
              {facture.notes && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Notes</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{facture.notes}</p>
                </div>
              )}
              {facture.conditionsPaiement && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    Conditions de paiement
                  </p>
                  <p className="text-sm text-gray-600">{facture.conditionsPaiement}</p>
                </div>
              )}
            </div>
            <div className="w-60 space-y-1.5">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Total HT</span>
                <span className="font-medium">{fmt(facture.montantHT)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>TVA ({facture.tva}%)</span>
                <span>{fmt(tvaAmount)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                <span>Total TTC</span>
                <span>{fmt(facture.montantTTC)}</span>
              </div>
            </div>
          </div>

          {/* ── Bouton de paiement en ligne ── visible dans l'app, masqué à l'impression */}
          <div className="mt-8 print:hidden">
            <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-500 mb-0.5">
                  Paiement en ligne disponible
                </p>
                <p className="text-sm font-bold text-gray-900">
                  {fmt(facture.montantTTC)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Carte bancaire · MTN Mobile Money · Orange Money
                </p>
              </div>
              <a
                href={payUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#1a3a2a] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#234d39] transition-colors"
              >
                💳 Payer maintenant
              </a>
            </div>
          </div>

          {/* ── Coordonnées bancaires ── */}
          {invoiceCfg.display.showBankInfo && invoiceCfg.bank.bankName && (
            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Coordonnées bancaires
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-700">
                {invoiceCfg.bank.bankName && (
                  <p><span className="text-xs text-gray-400">Banque :</span> {invoiceCfg.bank.bankName}</p>
                )}
                {invoiceCfg.bank.iban && (
                  <p><span className="text-xs text-gray-400">IBAN :</span> <span className="font-mono">{invoiceCfg.bank.iban}</span></p>
                )}
                {invoiceCfg.bank.bic && (
                  <p><span className="text-xs text-gray-400">BIC :</span> <span className="font-mono">{invoiceCfg.bank.bic}</span></p>
                )}
                {invoiceCfg.bank.rib && (
                  <p><span className="text-xs text-gray-400">RIB :</span> <span className="font-mono">{invoiceCfg.bank.rib}</span></p>
                )}
              </div>
            </div>
          )}

          {/* ── Mentions légales / conditions ── */}
          {invoiceCfg.display.showLatePenalty && invoiceCfg.termsText && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                Conditions générales
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">{invoiceCfg.termsText}</p>
            </div>
          )}

          {/* ── Signature ── */}
          {invoiceCfg.display.showSignature && (
            <div className="mt-6 flex justify-end">
              <div className="text-center">
                <div className="w-40 h-16 border-b border-gray-400 mb-1" />
                <p className="text-xs text-gray-400">Signature &amp; cachet</p>
              </div>
            </div>
          )}

          {/* QR Code + Footer */}
          <div className="mt-8 pt-4 border-t border-gray-100 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-gray-400">
                {invoiceCfg.footerText || `${companyName} — ${companyAddress}, ${companyCity}`}
              </p>
              {invoiceCfg.display.showVatNumber && company?.vatNumber && (
                <p className="text-xs text-gray-400 mt-0.5">N° TVA : {company.vatNumber}</p>
              )}
            </div>
            {invoiceCfg.display.showQrCode && qrDataUrl && (
              <div className="flex flex-col items-center shrink-0">
                <img src={qrDataUrl} alt="QR Code" className="w-20 h-20 border border-gray-200 rounded p-0.5" />
                <p className="mt-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Vérification</p>
                <p className="text-[10px] text-gray-400 font-mono">{facture.id}</p>
              </div>
            )}
          </div>

          {/* ── Filigrane ── */}
          {invoiceCfg.display.showWatermark && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
              <span
                className="text-gray-300 font-black text-7xl tracking-widest uppercase"
                style={{ transform: 'rotate(-35deg)', opacity: 0.15 }}
              >
                {invoiceCfg.display.watermarkText || 'DUPLICATA'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── ModalNouvelleFacture ──────────────────────────────────────────────────────

interface ModalNouvelleFactureProps {
  onClose:       () => void
  onCreated:     (id: string) => void
  agenceNom:     string | null
  clients:       string[]
  agences:       string[]
  defaultVatRate: number
}

interface LigneForm {
  id:             string
  /** ID de l'article sélectionné (vide tant que pas validé via le combobox) */
  articleId:      string
  description:    string
  quantite:       string
  unite:          string
  prixUnitaireHT: string
  tvaRate:        string
}

function emptyLigne(idx: number, vatRate: number): LigneForm {
  return {
    id:             `nl-${Date.now()}-${idx}`,
    articleId:      '',
    description:    '',
    quantite:       '1',
    unite:          'pièce',
    prixUnitaireHT: '',
    tvaRate:        String(vatRate),
  }
}

function defaultsForModele(modele: ModeleFacture): { notes: string; conditionsPaiement: string } {
  switch (modele) {
    case 'avoir':
      return { notes: 'Avoir suite à ...', conditionsPaiement: 'Remboursement sous 15 jours' }
    case 'proforma':
      return {
        notes: "Pro forma — ce document ne constitue pas une facture définitive",
        conditionsPaiement: 'Acompte 30% à la commande — solde à livraison',
      }
    case 'acompte':
      return { notes: 'Acompte sur commande ...', conditionsPaiement: 'Acompte 30% — solde à la livraison' }
    default:
      return { notes: '', conditionsPaiement: 'Paiement à 30 jours' }
  }
}

function ModalNouvelleFacture({ onClose, onCreated, agenceNom, clients, agences, defaultVatRate }: ModalNouvelleFactureProps) {
  const { addFactureVente, articles, updateFactureVenteStatut } = useGestion()
  const { fmt } = useCurrency()

  // Si true, la facture est immédiatement validée (statut Envoyée) → comptabilisée
  // dans le journal VTE et visible sur le dashboard. Si false, elle reste en
  // Brouillon (modifiable, non comptabilisée).
  const [validateOnCreate, setValidateOnCreate] = useState(true)
  const [submitError,      setSubmitError]      = useState<string | null>(null)
  const [submitting,       setSubmitting]       = useState(false)

  const [step,     setStep]     = useState<1 | 2>(1)
  const [modele,   setModele]   = useState<ModeleFacture>('standard')

  const todayStr = today()
  const defaults = defaultsForModele(modele)

  const [client,             setClient]             = useState('')
  const [agence,             setAgence]             = useState(agenceNom ?? (agences[0] ?? ''))
  const [date,               setDate]               = useState(todayStr)
  const [echeance,           setEcheance]           = useState(addDays(todayStr, 30))
  const [commande,           setCommande]           = useState('')
  const [notes,              setNotes]              = useState(defaults.notes)
  const [conditionsPaiement, setConditionsPaiement] = useState(defaults.conditionsPaiement)
  const [lignes,             setLignes]             = useState<LigneForm[]>([emptyLigne(0, defaultVatRate)])

  // When modele changes (before step 2 is committed), update defaults
  function goToStep2(m: ModeleFacture) {
    setModele(m)
    const d = defaultsForModele(m)
    setNotes(d.notes)
    setConditionsPaiement(d.conditionsPaiement)
    setStep(2)
  }

  function updateLigne(idx: number, patch: Partial<LigneForm>) {
    setLignes(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  function removeLigne(idx: number) {
    setLignes(prev => prev.filter((_, i) => i !== idx))
  }

  function addLigne() {
    setLignes(prev => [...prev, emptyLigne(prev.length, defaultVatRate)])
  }

  // Compute line montantHT from form
  function lineMontantHT(l: LigneForm): number {
    const qty = parseFloat(l.quantite) || 0
    const pu  = parseFloat(l.prixUnitaireHT) || 0
    return qty * pu
  }

  // Sélectionne un article dans le combobox → auto-remplit la ligne
  function selectArticle(idx: number, article: import('@/contexts/GestionContext').Article) {
    updateLigne(idx, {
      articleId:      article.id,
      description:    article.nom,
      unite:          article.unite,
      prixUnitaireHT: String(article.prixVenteHT),
    })
  }

  // Une seule règle : avoir, proforma et acompte exigent un article comme une facture standard
  const isReglementaire = true  // toutes les factures de vente doivent référencer des articles

  // Validation des lignes
  const lineErrors: { idx: number; reason: 'no-article' | 'qty-stock' | 'qty-zero'; message: string }[] = []
  if (isReglementaire) {
    lignes.forEach((l, idx) => {
      const qty = parseFloat(l.quantite) || 0
      if (qty <= 0) {
        lineErrors.push({ idx, reason: 'qty-zero', message: 'Quantité requise' })
        return
      }
      if (!l.articleId) {
        lineErrors.push({ idx, reason: 'no-article', message: 'Article non sélectionné' })
        return
      }
      const art = articles.find(a => a.id === l.articleId)
      if (!art) {
        lineErrors.push({ idx, reason: 'no-article', message: 'Article introuvable' })
        return
      }
      if (modele !== 'avoir' && qty > art.stock) {
        lineErrors.push({
          idx,
          reason:  'qty-stock',
          message: `Stock insuffisant : ${art.stock} disponible(s)`,
        })
      }
    })
  }
  const hasErrors = lineErrors.length > 0 || !client.trim() || lignes.length === 0

  const totalHT  = lignes.reduce((s, l) => s + lineMontantHT(l), 0)
  const tvaAmt   = lignes.reduce((s, l) => {
    const mht  = lineMontantHT(l)
    const rate = parseFloat(l.tvaRate) || 0
    return s + mht * rate / 100
  }, 0)
  const totalTTC = totalHT + tvaAmt

  async function handleSubmit() {
    if (!client.trim()) return
    if (hasErrors) return  // garde-fou : ne soumettre que si toutes les lignes sont valides
    setSubmitError(null)
    setSubmitting(true)

    const builtLignes: LigneFacture[] = lignes.map((l, i) => ({
      id:             `l${i + 1}`,
      ...(l.articleId ? { articleId: l.articleId } : {}),
      description:    l.description,
      quantite:       parseFloat(l.quantite) || 0,
      unite:          l.unite,
      prixUnitaireHT: parseFloat(l.prixUnitaireHT) || 0,
      tvaRate:        parseFloat(l.tvaRate) || 0,
      montantHT:      lineMontantHT(l),
    }))

    try {
      const result = await addFactureVente({
        modele,
        commande,
        client,
        agence,
        date,
        echeance,
        montantHT:  totalHT,
        tva:        TVA_CM_PCT,
        montantTTC: totalTTC,
        statut:     'Brouillon',
        lignes:     builtLignes,
        notes,
        conditionsPaiement,
      })

      // Si l'utilisateur a coché "Valider et comptabiliser", on passe la facture
      // immédiatement en Envoyée pour déclencher la comptabilisation backend
      // (création des écritures dans le journal VTE).
      // IMPORTANT : await pour s'assurer que le statut SENT est bien persisté
      // en base avant de fermer le modal. Sans await, l'utilisateur peut
      // rafraîchir avant que l'API n'ait répondu → status reste DRAFT en DB.
      if (validateOnCreate) {
        try {
          await updateFactureVenteStatut(result.id, 'Envoyée')
        } catch (e) {
          console.error('[invoices] auto-validation failed', e)
          setSubmitError("La facture a été créée mais la validation a échoué. Vous pouvez la valider manuellement.")
          // On ne ferme pas le modal pour que l'utilisateur voie le message
          setSubmitting(false)
          return
        }
      }

      onCreated(result.id)
    } catch (err) {
      // L'API a échoué — afficher un message clair plutôt que de fermer le modal
      // (l'ancien comportement créait une facture fantôme locale perdue au refresh)
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })
        ?.response?.data?.error
        ?? (err as { message?: string }).message
        ?? 'Erreur inconnue'
      setSubmitError(`Impossible d'enregistrer la facture : ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-xl overflow-hidden">

        {/* Step 1 — template selector */}
        {step === 1 && (
          <>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Nouvelle facture — Choisir un modèle</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">

              <button onClick={() => goToStep2('standard')}
                className="rounded-xl border-2 border-green-200 bg-green-50 p-5 text-left hover:shadow-md hover:border-green-400 transition">
                <div className="text-3xl mb-2">📄</div>
                <p className="font-semibold text-gray-900 mb-1">Facture standard</p>
                <p className="text-xs text-gray-500 leading-relaxed">Facture commerciale classique avec lignes d'articles et TVA</p>
              </button>

              <button onClick={() => goToStep2('proforma')}
                className="rounded-xl border-2 border-blue-200 bg-blue-50 p-5 text-left hover:shadow-md hover:border-blue-400 transition">
                <div className="text-3xl mb-2">📋</div>
                <p className="font-semibold text-gray-900 mb-1">Pro forma</p>
                <p className="text-xs text-gray-500 leading-relaxed">Document préliminaire sans valeur comptable — devient facture à l'accord</p>
              </button>

              <button onClick={() => goToStep2('avoir')}
                className="rounded-xl border-2 border-amber-200 bg-amber-50 p-5 text-left hover:shadow-md hover:border-amber-400 transition">
                <div className="text-3xl mb-2">↩️</div>
                <p className="font-semibold text-gray-900 mb-1">Avoir / Note de crédit</p>
                <p className="text-xs text-gray-500 leading-relaxed">Annulation partielle ou totale d'une facture émise</p>
              </button>

              <button onClick={() => goToStep2('acompte')}
                className="rounded-xl border-2 border-purple-200 bg-purple-50 p-5 text-left hover:shadow-md hover:border-purple-400 transition">
                <div className="text-3xl mb-2">💰</div>
                <p className="font-semibold text-gray-900 mb-1">Facture d'acompte</p>
                <p className="text-xs text-gray-500 leading-relaxed">Règlement partiel anticipé avant exécution de la commande</p>
              </button>

            </div>
          </>
        )}

        {/* Step 2 — form */}
        {step === 2 && (
          <>
            <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-4">
              <button
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-gray-700 text-sm"
              >
                ←
              </button>
              <h2 className="text-base font-semibold text-gray-900">
                {MODELE_META[modele].icon} {MODELE_META[modele].label}
              </h2>
              <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Client + Agence */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Client <span className="text-red-400">*</span>
                  </label>
                  {clients.length > 0 ? (
                    <select
                      value={client}
                      onChange={e => setClient(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    >
                      <option value="">— Sélectionner —</option>
                      {clients.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <input
                      value={client}
                      onChange={e => setClient(e.target.value)}
                      placeholder="Nom du client"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Agence</label>
                  {agenceNom ? (
                    <input
                      value={agenceNom}
                      disabled
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                    />
                  ) : (
                    <select
                      value={agence}
                      onChange={e => setAgence(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                    >
                      {agences.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  )}
                </div>
              </div>

              {/* Dates + Commande */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Échéance</label>
                  <input
                    type="date"
                    value={echeance}
                    onChange={e => setEcheance(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Commande (optionnel)
                  </label>
                  <input
                    value={commande}
                    onChange={e => setCommande(e.target.value)}
                    placeholder="CMD-xxxx"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
              </div>

              {/* Lignes d'articles */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Lignes d'articles</p>
                {/* overflow-visible (au lieu de hidden) pour ne pas couper le dropdown article */}
                <div className="rounded-lg border border-gray-200 overflow-visible">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr className="text-left text-gray-500">
                        <th className="px-3 py-2 font-semibold min-w-[420px]">Article</th>
                        <th className="px-2 py-2 font-semibold w-16">Qté</th>
                        <th className="px-2 py-2 font-semibold w-20">Unité</th>
                        <th className="px-2 py-2 font-semibold w-24">P.U. HT</th>
                        <th className="px-2 py-2 font-semibold w-16">TVA %</th>
                        <th className="px-2 py-2 font-semibold w-24 text-right">Total HT</th>
                        <th className="px-2 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lignes.map((l, idx) => {
                        const qtyNum    = parseFloat(l.quantite) || 0
                        const lineError = lineErrors.find(e => e.idx === idx)
                        return (
                        <tr key={l.id} className={lineError ? 'bg-red-50/30' : ''}>
                          <td className="px-3 py-1.5 pb-5">
                            <ArticleCombobox
                              articles={articles}
                              selectedId={l.articleId}
                              text={l.description}
                              quantite={qtyNum}
                              onlyAvailable
                              onSelect={art => selectArticle(idx, art)}
                              onTextChange={text => updateLigne(idx, { description: text, articleId: '' })}
                              placeholder="Tapez les premières lettres…"
                              compact
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              placeholder="0"
                              value={l.quantite || ''}
                              onChange={e => updateLigne(idx, { quantite: e.target.value })}
                              className={`w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 ${
                                lineError?.reason === 'qty-stock' || lineError?.reason === 'qty-zero'
                                  ? 'border-amber-300 focus:ring-amber-300/40'
                                  : 'border-gray-200 focus:ring-green-500/30'
                              }`}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={l.unite}
                              onChange={e => updateLigne(idx, { unite: e.target.value })}
                              className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30"
                            >
                              {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={l.prixUnitaireHT || ''}
                              onChange={e => updateLigne(idx, { prixUnitaireHT: e.target.value })}
                              placeholder="0"
                              className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={l.tvaRate}
                              onChange={e => updateLigne(idx, { tvaRate: e.target.value })}
                              className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500/30"
                            >
                              <option value={String(TVA_CM_PCT)}>{TVA_CM_PCT.toFixed(2).replace('.', ',')} %</option>
                              <option value="0">0 %</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium text-gray-700 tabular-nums">
                            {lineMontantHT(l).toLocaleString('fr-FR')}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <button
                              onClick={() => removeLigne(idx)}
                              className="text-gray-400 hover:text-red-500"
                              title="Supprimer"
                            >
                              🗑
                            </button>
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  <div className="border-t border-gray-100 px-3 py-2">
                    <button
                      onClick={addLigne}
                      className="text-xs text-green-700 font-medium hover:text-green-800"
                    >
                      + Ajouter une ligne
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes + conditions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Conditions de paiement
                  </label>
                  <select
                    value={conditionsPaiement}
                    onChange={e => setConditionsPaiement(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30"
                  >
                    {CONDITIONS_PAIEMENT.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Totals summary */}
              <div className="flex justify-end">
                <div className="w-64 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Total HT</span>
                    <span className="font-medium">{fmt(totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>TVA</span>
                    <span>{fmt(tvaAmt)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5">
                    <span>Total TTC</span>
                    <span>{fmt(totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 flex flex-col gap-3 border-t border-gray-100 px-6 py-4">
              {submitError && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2.5 text-xs text-red-700">
                  <span className="font-bold">⚠ </span>{submitError}
                </div>
              )}
              {lineErrors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  <span className="font-semibold">Impossible de créer la facture — </span>
                  {lineErrors.map(e => `Ligne ${e.idx + 1} : ${e.message}`).join(' · ')}
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                {/* Toggle Valider et comptabiliser */}
                <label className="flex items-start gap-2 cursor-pointer max-w-md">
                  <input
                    type="checkbox"
                    checked={validateOnCreate}
                    onChange={e => setValidateOnCreate(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-green-700"
                  />
                  <span className="text-xs text-gray-700 leading-snug">
                    <strong className="text-gray-800">Valider et comptabiliser immédiatement</strong>
                    <span className="block text-[11px] text-gray-500">
                      La facture passera en statut <em>Envoyée</em> et sera enregistrée dans le journal des ventes (VTE).
                      Décochez pour la conserver en <em>Brouillon</em>.
                    </span>
                  </span>
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={onClose}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={hasErrors || submitting}
                    title={hasErrors ? 'Corrigez les erreurs ci-dessous avant de soumettre' : ''}
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {submitting
                      ? 'Enregistrement…'
                      : validateOnCreate ? 'Créer et comptabiliser' : 'Enregistrer en brouillon'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── ModalImportFacture ────────────────────────────────────────────────────────

const CSV_COLUMNS = ['client', 'commande', 'date', 'echeance', 'montantHT', 'tva', 'statut', 'modele', 'notes', 'conditionsPaiement'] as const
const VALID_STATUTS  = new Set<string>(['Brouillon', 'Envoyée', 'Payée', 'En retard', 'Annulée'])
const VALID_MODELES  = new Set<string>(['standard', 'proforma', 'avoir', 'acompte'])

function addDays30(iso: string): string {
  const d = new Date(iso); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10)
}

interface ParsedRow {
  raw:        Record<string, string>
  errors:     string[]
  facture:    Omit<FactureVente, 'id'> | null
}

function parseCSV(text: string, defaultVat: number): ParsedRow[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Detect delimiter: semicolon or comma
  const header = lines[0]!
  const delim  = header.includes(';') ? ';' : ','
  const cols   = header.split(delim).map(c => c.trim().toLowerCase())

  return lines.slice(1).map(line => {
    const vals = line.split(delim).map(v => v.trim().replace(/^"|"$/g, ''))
    const raw: Record<string, string> = {}
    cols.forEach((c, i) => { raw[c] = vals[i] ?? '' })

    const errors: string[] = []

    // client
    const client = raw['client']?.trim() ?? ''
    if (!client) errors.push('Client requis')

    // date
    const dateStr = raw['date']?.trim() ?? ''
    const dateOk  = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr))
    if (!dateStr) errors.push('Date requise')
    else if (!dateOk) errors.push('Date invalide (format AAAA-MM-JJ)')

    // echeance
    const echeanceRaw = raw['echeance']?.trim() ?? ''
    const echeance    = echeanceRaw && /^\d{4}-\d{2}-\d{2}$/.test(echeanceRaw)
      ? echeanceRaw
      : (dateOk ? addDays30(dateStr) : '')

    // montantHT
    const montantHTRaw = raw['montantht'] ?? raw['montantHT'] ?? raw['montant_ht'] ?? ''
    const montantHT    = parseFloat(montantHTRaw.replace(/\s/g, '').replace(',', '.'))
    if (isNaN(montantHT) || montantHT <= 0) errors.push('Montant HT invalide (doit être > 0)')

    // tva — uses caller-supplied default so company vatRate is respected
    const tvaRaw    = raw['tva']?.trim() ?? ''
    const tva       = tvaRaw ? parseFloat(tvaRaw.replace(',', '.')) : defaultVat
    if (isNaN(tva) || tva < 0 || tva > 100) errors.push('TVA invalide (0–100)')

    // statut
    const statutRaw = raw['statut']?.trim() ?? ''
    const statut    = (VALID_STATUTS.has(statutRaw) ? statutRaw : 'Brouillon') as FactureVenteStatut

    // modele
    const modeleRaw = raw['modele']?.trim().toLowerCase() ?? ''
    const modele    = (VALID_MODELES.has(modeleRaw) ? modeleRaw : 'standard') as ModeleFacture

    const commande           = raw['commande']?.trim()           ?? ''
    const notes              = raw['notes']?.trim()              ?? ''
    const conditionsPaiement = raw['conditionspaiement'] ?? raw['conditionsPaiement'] ?? raw['conditions_paiement'] ?? ''

    const facture: Omit<FactureVente, 'id'> | null = errors.length === 0 ? {
      modele,
      commande,
      client,
      agence:    'Import',          // overridden by caller
      date:      dateStr,
      echeance,
      montantHT: montantHT,
      tva,
      montantTTC: Math.round(montantHT * (1 + tva / 100)),
      statut,
      lignes: [{
        id:             'l1',
        description:    client + (commande ? ` — ${commande}` : '') + ' (importé)',
        quantite:       1,
        unite:          'forfait',
        prixUnitaireHT: montantHT,
        tvaRate:        tva,
        montantHT:      montantHT,
      }],
      notes,
      conditionsPaiement: conditionsPaiement.trim() || 'Paiement à 30 jours',
    } : null

    return { raw, errors, facture }
  })
}

function downloadTemplate(vatRate: number) {
  const header = CSV_COLUMNS.join(';')
  const vat    = String(vatRate)
  const row1   = `Nom Client SARL;CMD-0001;2026-01-15;2026-02-15;100000;${vat};Brouillon;standard;;Paiement à 30 jours`
  const row2   = `Autre Client;CMD-0002;2026-01-20;;250000;${vat};Envoyée;proforma;Pro forma;;`
  const blob   = new Blob([`${header}\n${row1}\n${row2}`], { type: 'text/csv;charset=utf-8;' })
  const url    = URL.createObjectURL(blob)
  const a      = document.createElement('a')
  a.href       = url
  a.download   = 'modele_import_factures.csv'
  a.click()
  URL.revokeObjectURL(url)
}

interface ModalImportProps {
  agenceNom:      string | null
  defaultAgence:  string
  defaultVatRate: number
  onImported:     (factures: Omit<FactureVente, 'id'>[]) => void
  onClose:        () => void
}

function ModalImportFacture({ agenceNom, defaultAgence, defaultVatRate, onImported, onClose }: ModalImportProps) {
  const [step,     setStep]     = useState<'upload' | 'preview'>('upload')
  const [rows,     setRows]     = useState<ParsedRow[]>([])
  const [dragging, setDragging] = useState(false)
  const [fileErr,  setFileErr]  = useState<string | null>(null)
  const [fileName, setFileName] = useState('')

  function processFile(file: File) {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setFileErr('Format non supporté — seuls les fichiers .csv sont acceptés')
      return
    }
    setFileErr(null)
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const text   = e.target?.result as string ?? ''
      const parsed = parseCSV(text, defaultVatRate)
      if (parsed.length === 0) {
        setFileErr('Fichier vide ou format non reconnu')
        return
      }
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const valid   = rows.filter(r => r.errors.length === 0)
  const invalid = rows.filter(r => r.errors.length > 0)

  function handleImport() {
    const agence = agenceNom ?? defaultAgence
    const toImport = valid.map(r => ({ ...r.facture!, agence }))
    onImported(toImport)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">Importer des factures</h2>
            {step === 'preview' && (
              <button onClick={() => setStep('upload')}
                className="text-xs text-gray-400 hover:text-gray-600">← Retour</button>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {step === 'upload' && (
            <div className="space-y-4">

              {/* Instructions */}
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 space-y-1">
                <p className="font-medium">Format attendu — fichier CSV (séparateur `;` ou `,`)</p>
                <p className="text-xs text-blue-600">Colonnes : <code className="bg-blue-100 px-1 rounded">client ; commande ; date ; echeance ; montantHT ; tva ; statut ; modele ; notes ; conditionsPaiement</code></p>
                <p className="text-xs text-blue-600">Colonnes obligatoires : <strong>client, date, montantHT</strong> — les autres ont des valeurs par défaut</p>
              </div>

              {/* Template download */}
              <button type="button" onClick={() => downloadTemplate(defaultVatRate)}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition">
                <span>📥</span>
                Télécharger le modèle CSV
              </button>

              {/* Drop zone */}
              <div
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 transition cursor-pointer ${
                  dragging ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                }`}
                onClick={() => document.getElementById('csv-input')?.click()}
              >
                <input id="csv-input" type="file" accept=".csv,.txt" className="hidden" onChange={onFileInput} />
                <span className="text-4xl mb-3">{dragging ? '📂' : '📄'}</span>
                <p className="text-sm font-medium text-gray-700">
                  {dragging ? 'Déposer le fichier…' : 'Glisser-déposer un fichier CSV'}
                </p>
                <p className="text-xs text-gray-400 mt-1">ou cliquer pour parcourir</p>
              </div>

              {fileErr && (
                <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2 text-xs text-red-700">
                  ⚠️ {fileErr}
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">

              {/* Résumé */}
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-500">Fichier : <strong>{fileName}</strong></span>
                <span className="rounded-full bg-green-100 text-green-700 px-2.5 py-0.5 text-xs font-medium">
                  {valid.length} valide{valid.length !== 1 ? 's' : ''}
                </span>
                {invalid.length > 0 && (
                  <span className="rounded-full bg-red-100 text-red-600 px-2.5 py-0.5 text-xs font-medium">
                    {invalid.length} erreur{invalid.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Table preview */}
              <div className="rounded-xl border border-gray-100 overflow-hidden text-xs">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-gray-500 font-medium text-left">
                      <th className="px-3 py-2 w-7">#</th>
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Commande</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Montant HT</th>
                      <th className="px-3 py-2">Statut</th>
                      <th className="px-3 py-2">Modèle</th>
                      <th className="px-3 py-2 w-8">État</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.errors.length > 0 ? 'bg-red-50/60' : 'bg-white'}>
                        <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{r.raw['client'] || <em className="text-red-400">vide</em>}</td>
                        <td className="px-3 py-2 font-mono text-gray-500">{r.raw['commande'] || '—'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.raw['date'] || '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">
                          {r.facture ? r.facture.montantHT.toLocaleString('fr-FR') : (r.raw['montantht'] ?? r.raw['montantHT'] ?? '—')}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{r.raw['statut'] || 'Brouillon'}</td>
                        <td className="px-3 py-2 text-gray-600">{r.raw['modele'] || 'standard'}</td>
                        <td className="px-3 py-2">
                          {r.errors.length === 0 ? (
                            <span className="text-green-600 font-bold">✓</span>
                          ) : (
                            <span className="text-red-500 font-bold" title={r.errors.join(' | ')}>✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Erreurs détaillées */}
              {invalid.length > 0 && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-red-700 mb-1">Erreurs détectées (lignes ignorées à l'import)</p>
                  {invalid.map((r, i) => (
                    <p key={i} className="text-xs text-red-600">
                      <strong>Ligne {rows.indexOf(r) + 2}</strong> — {r.errors.join(' · ')}
                    </p>
                  ))}
                </div>
              )}

              {valid.length === 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
                  ⚠️ Aucune ligne valide à importer. Corrigez le fichier et réessayez.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-2 px-5 py-4 border-t border-gray-100">
          <button type="button" onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Annuler
          </button>
          {step === 'preview' && valid.length > 0 && (
            <button type="button" onClick={handleImport}
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-800">
              Importer {valid.length} facture{valid.length !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function FacturesVentesPage() {
  const { fmt }  = useCurrency()
  const { user } = useAuth()
  const { facturesVentes, updateFactureVenteStatut, clients, addFactureVente } = useGestion()
  const { agences: agencesList, vatRate } = useCompanySettings()
  const effectiveVatRate = vatRate ?? TVA_CM_PCT

  const agenceNom = user?.agenceNom ?? null

  const [selectedId,      setSelectedId]      = useState<string | null>(null)
  const [showNewModal,    setShowNewModal]    = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [search,          setSearch]          = useState('')
  const [statutFilter,    setStatutFilter]    = useState<FactureVenteStatut | 'all'>('all')
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')

  const items = useMemo(() => {
    let list = agenceNom ? facturesVentes.filter(f => f.agence === agenceNom) : facturesVentes
    if (statutFilter !== 'all') list = list.filter(f => f.statut === statutFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(f =>
        f.client.toLowerCase().includes(q) ||
        f.id.toLowerCase().includes(q) ||
        f.commande.toLowerCase().includes(q),
      )
    }
    list = filterByDateRange(list, f => f.date, dateFrom, dateTo)
    return list
  }, [facturesVentes, agenceNom, statutFilter, search, dateFrom, dateTo])
  const isFiltered = dateFrom !== '' || dateTo !== ''

  const currentIndex = selectedId ? items.findIndex(f => f.id === selectedId) : -1
  const prevFacture  = currentIndex > 0               ? items[currentIndex - 1] : null
  const nextFacture  = currentIndex < items.length - 1 ? items[currentIndex + 1] : null

  // Arrow key navigation
  useEffect(() => {
    if (!selectedId) return
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === 'ArrowLeft'  && prevFacture) setSelectedId(prevFacture.id)
      if (e.key === 'ArrowRight' && nextFacture) setSelectedId(nextFacture.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, prevFacture, nextFacture])

  const selectedFacture = selectedId ? facturesVentes.find(f => f.id === selectedId) ?? null : null

  // Invoice view takeover
  if (selectedFacture) {
    return (
      <InvoiceView
        facture={selectedFacture}
        onClose={() => setSelectedId(null)}
        onStatutChange={updateFactureVenteStatut}
        allFactures={items}
        currentIndex={currentIndex}
        onNavigate={setSelectedId}
      />
    )
  }

  const totalTTC   = items.filter(f => f.statut !== 'Annulée').reduce((s, f) => s + f.montantTTC, 0)
  const payees     = items.filter(f => f.statut === 'Payée').length
  const enRetard   = items.filter(f => f.statut === 'En retard').length
  const brouillons = items.filter(f => f.statut === 'Brouillon').length

  const clientNames  = clients.map(c => c.nom)
  const agenceNames  = agencesList.map(a => a.nom)

  return (
    <div className="h-full flex flex-col gap-3">

      {/* En-tête */}
      <div className="shrink-0 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900">Factures ventes</h1>
          {agenceNom && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
              🏢 {agenceNom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            ↑ Importer
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
          >
            + Nouvelle facture
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="shrink-0 grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-3">
          <p className="text-xs text-gray-500">Montant TTC total</p>
          <p className="mt-1 text-xl font-bold text-gray-900">{fmt(totalTTC)}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3">
          <p className="text-xs text-green-600">Payées</p>
          <p className="mt-1 text-2xl font-bold text-green-700">{payees}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-xs text-red-600">En retard</p>
          <p className="mt-1 text-2xl font-bold text-red-700">{enRetard}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Brouillons</p>
          <p className="mt-1 text-2xl font-bold text-gray-700">{brouillons}</p>
        </div>
      </div>

      {/* Tableau */}
      <div className="flex-1 min-h-0 rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="shrink-0 flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Client, N° facture, N° commande…"
              className="w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
          </div>
          <select
            value={statutFilter}
            onChange={e => setStatutFilter(e.target.value as FactureVenteStatut | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30"
          >
            <option value="all">Tous les statuts</option>
            {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <PeriodFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={r => { setDateFrom(r.dateFrom); setDateTo(r.dateTo) }}
            count={isFiltered ? `${items.length} résultat${items.length > 1 ? 's' : ''}` : null}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-100 z-10">
              <tr className="text-left text-xs font-semibold text-gray-500">
                <th className="px-4 py-2.5">N° facture</th>
                <th className="px-4 py-2.5">Modèle</th>
                <th className="px-4 py-2.5">Commande</th>
                <th className="px-4 py-2.5">Client</th>
                {!agenceNom && <th className="px-4 py-2.5">Agence</th>}
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Échéance</th>
                <th className="px-4 py-2.5 text-right">Montant TTC</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">
                    Aucune facture trouvée
                  </td>
                </tr>
              ) : items.map(f => (
                <tr
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className="hover:bg-gray-50/60 cursor-pointer"
                >
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-green-700">{f.id}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs text-gray-500">{MODELE_META[f.modele]?.icon} {MODELE_META[f.modele]?.label}</span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{f.commande}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{f.client}</td>
                  {!agenceNom && <td className="px-4 py-2.5 text-[11px] text-gray-500">{f.agence}</td>}
                  <td className="px-4 py-2.5 text-gray-500">{fmtDate(f.date)}</td>
                  <td className="px-4 py-2.5 text-gray-500">{fmtDate(f.echeance)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmt(f.montantTTC)}</td>
                  <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                    <select
                      value={f.statut}
                      onChange={e => updateFactureVenteStatut(f.id, e.target.value as FactureVenteStatut)}
                      className={`rounded-full px-2 py-0.5 text-xs font-medium border-0 outline-none cursor-pointer appearance-none ${STATUT_STYLE[f.statut] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal nouvelle facture */}
      {showNewModal && (
        <ModalNouvelleFacture
          onClose={() => setShowNewModal(false)}
          onCreated={id => {
            setShowNewModal(false)
            setSelectedId(id)
          }}
          agenceNom={agenceNom}
          clients={clientNames}
          agences={agenceNames}
          defaultVatRate={effectiveVatRate}
        />
      )}

      {/* Modal import CSV */}
      {showImportModal && (
        <ModalImportFacture
          agenceNom={agenceNom}
          defaultAgence={agenceNames[0] ?? 'Siège'}
          defaultVatRate={effectiveVatRate}
          onClose={() => setShowImportModal(false)}
          onImported={factures => {
            factures.forEach(f => addFactureVente(f))
            setShowImportModal(false)
          }}
        />
      )}
    </div>
  )
}
