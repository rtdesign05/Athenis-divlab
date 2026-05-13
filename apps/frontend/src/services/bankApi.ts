import { api } from '@/lib/api'

export interface BankStatementLine {
  date:    string        // YYYY-MM-DD
  libelle: string
  debit:   number | null // montant sorti (positif)
  credit:  number | null // montant entré (positif)
  solde:   number | null
}

export interface BankStatementResult {
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
  provider?:      string
  pages?:         number
}

/**
 * Envoie un fichier relevé bancaire (PDF, CSV, OFX) et retourne
 * les transactions extraites pour prévisualisation.
 */
export async function uploadBankStatement(file: File): Promise<BankStatementResult> {
  const form = new FormData()
  form.append('file', file)

  const res = await api.post<{ success: boolean; data: BankStatementResult }>(
    '/bank/import/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return res.data.data
}
