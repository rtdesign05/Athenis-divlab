import { pdf } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import { saveAs } from 'file-saver'
import type { JSXElementConstructor, ReactElement } from 'react'

type PdfElement = ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>

export async function generateAndDownloadPdf(
  document: PdfElement,
  fileName: string,
): Promise<void> {
  const blob = await pdf(document).toBlob()
  saveAs(blob, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`)
}

export const slugify = (s: string) =>
  s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '')
