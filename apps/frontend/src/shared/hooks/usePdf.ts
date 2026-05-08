import { pdf } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import React, { type JSXElementConstructor, type ReactElement } from 'react'
import type { Invoice, Quote } from '@/services/billingApi'
import { generateQRDataUrl, buildInvoiceQR, buildDevisQR } from '@/lib/qrCode'
import type { Payslip } from '@/services/hrApi'
import type { Bilan, CompteResultat, BalanceData, GrandLivreData, FinancialStatements } from '@/services/accountingApi'
import type { LegalContract } from '@/services/legalApi'

type PdfElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')

async function generate(el: PdfElement, filename: string) {
  const blob = await pdf(el).toBlob()
  saveAs(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
}

export function usePdf() {
  // ── Fiscal ────────────────────────────────────────────────────────────────────
  const downloadTva = async (data: import('@/pages/app/fiscal/pdf/TvaPdf').TvaPdfData) => {
    const { TvaPdf } = await import('@/pages/app/fiscal/pdf/TvaPdf')
    await generate(React.createElement(TvaPdf, { data }) as PdfElement, `TVA_${slug(data.periode)}_${data.niu ?? 'NIU'}.pdf`)
  }

  const downloadIs = async (data: import('@/pages/app/fiscal/pdf/IsPdf').IsPdfData) => {
    const { IsPdf } = await import('@/pages/app/fiscal/pdf/IsPdf')
    await generate(React.createElement(IsPdf, { data }) as PdfElement, `IS_${slug(data.periode)}_${data.niu ?? 'NIU'}.pdf`)
  }

  const downloadIgs = async (data: import('@/pages/app/fiscal/pdf/IgsPdf').IgsPdfData) => {
    const { IgsPdf } = await import('@/pages/app/fiscal/pdf/IgsPdf')
    await generate(React.createElement(IgsPdf, { data }) as PdfElement, `IGS_${data.year}_${data.niu ?? 'NIU'}.pdf`)
  }

  const downloadDsf = async (data: import('@/services/fiscalApi').DSFData, year: number) => {
    const { DsfPdf } = await import('@/pages/app/fiscal/pdf/DsfPdf')
    await generate(React.createElement(DsfPdf, { data, year }) as PdfElement, `DSF_${year - 1}_${data.identification.niu}.pdf`)
  }

  // ── Billing ───────────────────────────────────────────────────────────────────
  const downloadInvoice = async (invoice: Invoice) => {
    const [{ InvoicePdf }, qrDataUrl] = await Promise.all([
      import('@/features/billing/pdf/InvoicePdf'),
      generateQRDataUrl(buildInvoiceQR(invoice)),
    ])
    await generate(React.createElement(InvoicePdf, { invoice, qrDataUrl }) as PdfElement, `Facture_${slug(invoice.number)}_${invoice.issueDate}.pdf`)
  }

  const downloadDevis = async (quote: Quote) => {
    const [{ DevisPdf }, qrDataUrl] = await Promise.all([
      import('@/features/billing/pdf/DevisPdf'),
      generateQRDataUrl(buildDevisQR(quote)),
    ])
    await generate(React.createElement(DevisPdf, { quote, qrDataUrl }) as PdfElement, `Devis_${slug(quote.number)}_${quote.issueDate}.pdf`)
  }

  // ── HR ────────────────────────────────────────────────────────────────────────
  const downloadBulletinPaie = async (payslip: Payslip, companyName?: string) => {
    const { BulletinPaiePdf } = await import('@/features/hr/pdf/BulletinPaiePdf')
    const name = `${payslip.employee.lastName}_${payslip.employee.firstName}`
    const props = companyName ? { payslip, companyName } : { payslip }
    await generate(React.createElement(BulletinPaiePdf, props) as PdfElement, `BulletinPaie_${slug(name)}_${payslip.month}.pdf`)
  }

  // ── Accounting ────────────────────────────────────────────────────────────────
  const downloadBilan = async (bilan: Bilan) => {
    const { BilanPdf } = await import('@/features/accounting/pdf/BilanPdf')
    await generate(React.createElement(BilanPdf, { bilan }) as PdfElement, `Bilan_${bilan.year}.pdf`)
  }

  const downloadResultat = async (cr: CompteResultat) => {
    const { ResultatPdf } = await import('@/features/accounting/pdf/ResultatPdf')
    await generate(React.createElement(ResultatPdf, { cr }) as PdfElement, `CompteResultat_${cr.year}.pdf`)
  }

  const downloadBalance = async (balance: BalanceData) => {
    const { BalancePdf } = await import('@/features/accounting/pdf/BalancePdf')
    await generate(React.createElement(BalancePdf, { balance }) as PdfElement, `Balance_${balance.year}.pdf`)
  }

  const downloadGrandLivre = async (grandLivre: GrandLivreData) => {
    const { GrandLivrePdf } = await import('@/features/accounting/pdf/GrandLivrePdf')
    await generate(React.createElement(GrandLivrePdf, { grandLivre }) as PdfElement, `GrandLivre_${grandLivre.year}.pdf`)
  }

  const downloadEtatsFinanciers = async (fs: FinancialStatements) => {
    const { EtatsFinanciersPdf } = await import('@/features/accounting/pdf/EtatsFinanciersPdf')
    await generate(React.createElement(EtatsFinanciersPdf, { fs }) as PdfElement, `EtatsFinanciers_${fs.zone}_${fs.year}.pdf`)
  }

  // ── ESG ───────────────────────────────────────────────────────────────────────
  const downloadEsgRapport = async (params: { year: number; referentiel?: string }) => {
    const { EsgRapportPdf } = await import('@/features/esg/pdf/EsgRapportPdf')
    await generate(React.createElement(EsgRapportPdf, params) as PdfElement, `RapportESG_${params.referentiel ?? 'CSRD'}_${params.year}.pdf`)
  }

  const downloadDpef = async (params: {
    year: number
    data?: import('@/services/esgApi').EsgScoreResult
    employees?: { endDate?: string | null; [key: string]: unknown }[]
  }) => {
    const { DpefPdf } = await import('@/features/esg/pdf/DpefPdf')
    await generate(React.createElement(DpefPdf, params) as PdfElement, `DPEF_${params.year}.pdf`)
  }

  // ── Legal ─────────────────────────────────────────────────────────────────────
  const downloadContrat = async (contrat: LegalContract) => {
    const { ContratPdf } = await import('@/features/legal/pdf/ContratPdf')
    await generate(React.createElement(ContratPdf, { contrat }) as PdfElement, `Contrat_${slug(contrat.title)}_${contrat.createdAt.slice(0, 10)}.pdf`)
  }

  return {
    // Fiscal
    downloadTva, downloadIs, downloadIgs, downloadDsf,
    // Billing
    downloadInvoice, downloadDevis,
    // HR
    downloadBulletinPaie,
    // Accounting
    downloadBilan, downloadResultat, downloadBalance, downloadGrandLivre, downloadEtatsFinanciers,
    // ESG
    downloadEsgRapport, downloadDpef,
    // Legal
    downloadContrat,
  }
}
