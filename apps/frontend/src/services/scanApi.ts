import { api } from '@/lib/api'

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
  invoiceDate:    string | null
  dueDate:        string | null
  currency:       string | null
  items:          ScannedInvoiceLine[]
  subtotal:       number | null
  taxRate:        number | null
  taxAmount:      number | null
  total:          number | null
  notes:          string | null
  confidence:     number
}

/** Convertit un File en base64 (sans le préfixe data:...) */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Envoie une image au backend et retourne les données extraites */
export async function scanInvoice(file: File): Promise<ScannedInvoice> {
  const imageBase64 = await fileToBase64(file)
  const mimeType    = file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

  const res = await api.post<{ success: boolean; data: ScannedInvoice }>(
    '/scan/invoice',
    { imageBase64, mimeType },
  )
  return res.data.data
}
