import { pdf } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import React, { type JSXElementConstructor, type ReactElement } from 'react'
import type { TvaPdfData } from '@/pages/app/fiscal/pdf/TvaPdf'
import type { IsPdfData }  from '@/pages/app/fiscal/pdf/IsPdf'
import type { IgsPdfData } from '@/pages/app/fiscal/pdf/IgsPdf'
import type { DSFData }    from '@/services/fiscalApi'

type PdfElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

const slug = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')

export function usePdfDownload() {
  const downloadTva = async (data: TvaPdfData) => {
    const { TvaPdf } = await import('@/pages/app/fiscal/pdf/TvaPdf')
    const el = React.createElement(TvaPdf, { data }) as PdfElement
    const blob = await pdf(el).toBlob()
    saveAs(blob, `TVA_${slug(data.periode)}_${data.niu ?? 'NIU'}.pdf`)
  }

  const downloadIs = async (data: IsPdfData) => {
    const { IsPdf } = await import('@/pages/app/fiscal/pdf/IsPdf')
    const el = React.createElement(IsPdf, { data }) as PdfElement
    const blob = await pdf(el).toBlob()
    saveAs(blob, `IS_${slug(data.periode)}_${data.niu ?? 'NIU'}.pdf`)
  }

  const downloadIgs = async (data: IgsPdfData) => {
    const { IgsPdf } = await import('@/pages/app/fiscal/pdf/IgsPdf')
    const el = React.createElement(IgsPdf, { data }) as PdfElement
    const blob = await pdf(el).toBlob()
    saveAs(blob, `IGS_${data.year}_${data.niu ?? 'NIU'}.pdf`)
  }

  const downloadDsf = async (data: DSFData, year: number) => {
    const { DsfPdf } = await import('@/pages/app/fiscal/pdf/DsfPdf')
    const el = React.createElement(DsfPdf, { data, year }) as PdfElement
    const blob = await pdf(el).toBlob()
    saveAs(blob, `DSF_${year - 1}_${data.identification.niu}.pdf`)
  }

  return { downloadTva, downloadIs, downloadIgs, downloadDsf }
}
