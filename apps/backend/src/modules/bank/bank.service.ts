import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { getAgenceFilter } from '../../middleware/agenceFilter.js'
import type { JwtPayload } from '@athenis/shared-types'
import type { ImportBankInput, ReconcileInput, UpdateTxStatusInput, ListBankTxInput } from './bank.dto.js'

// ── Parsers ───────────────────────────────────────────────────────────────────

interface ParsedTx {
  date: Date
  label: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  reference: string | null
}

function parseCSV(content: string): ParsedTx[] {
  const lines = content.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new AppError('CSV file is empty or has no data rows', 400, 'INVALID_CSV')

  const header = lines[0]!.toLowerCase()
  const sep    = header.includes(';') ? ';' : ','

  const results: ParsedTx[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(sep).map((c) => c.replace(/^"|"$/g, '').trim())
    if (cols.length < 3) continue

    let date: Date | null = null
    let label             = ''
    let debit             = 0
    let credit            = 0

    const rawDate = cols[0] ?? ''
    const dmatch  = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    const ymatch  = rawDate.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)

    if (dmatch) {
      let [, d, m, y] = dmatch
      if (y!.length === 2) y = `20${y}`
      date = new Date(`${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`)
    } else if (ymatch) {
      date = new Date(rawDate)
    }

    if (!date || isNaN(date.getTime())) continue

    label = cols[1] ?? ''
    const rawDebit  = (cols[2] ?? '').replace(/\s/g, '').replace(',', '.')
    const rawCredit = (cols[3] ?? '').replace(/\s/g, '').replace(',', '.')

    debit  = parseFloat(rawDebit)  || 0
    credit = parseFloat(rawCredit) || 0

    // 3-column format: date, libelle, amount (positive = credit, negative = debit)
    if (cols.length === 3) {
      const amt = parseFloat((cols[2] ?? '').replace(/\s/g, '').replace(',', '.')) || 0
      if (amt >= 0) { credit = amt; debit = 0 }
      else          { debit = Math.abs(amt); credit = 0 }
    }

    if (debit > 0)   results.push({ date, label, amount: debit,  type: 'DEBIT',  reference: null })
    if (credit > 0)  results.push({ date, label, amount: credit, type: 'CREDIT', reference: null })
  }
  return results
}

function parseOFX(content: string): ParsedTx[] {
  const results: ParsedTx[] = []
  const txBlocks = content.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? []

  for (const block of txBlocks) {
    const get = (tag: string) => {
      const m = block.match(new RegExp(`<${tag}>([^<]+)`, 'i'))
      return m?.[1]?.trim() ?? ''
    }
    const rawDate = get('DTPOSTED')
    const rawAmt  = parseFloat(get('TRNAMT').replace(',', '.'))
    const label   = get('NAME') || get('MEMO') || get('FITID')
    const ref     = get('FITID')

    let date: Date | null = null
    if (rawDate.length >= 8) {
      const y = rawDate.slice(0, 4)
      const m = rawDate.slice(4, 6)
      const d = rawDate.slice(6, 8)
      date = new Date(`${y}-${m}-${d}`)
    }
    if (!date || isNaN(date.getTime()) || isNaN(rawAmt)) continue

    results.push({
      date,
      label,
      amount:    Math.abs(rawAmt),
      type:      rawAmt >= 0 ? 'CREDIT' : 'DEBIT',
      reference: ref || null,
    })
  }
  return results
}

// ── Service functions ─────────────────────────────────────────────────────────

import type { BankStatementData } from './bankStatement.provider.js'

/**
 * Prévisualise un relevé CSV ou OFX sans persister — retourne les transactions parsées
 * dans le même format que BankStatementData pour un traitement unifié côté frontend.
 */
export async function previewBankStatement(content: string, format: 'CSV' | 'OFX'): Promise<BankStatementData> {
  const parsed = format === 'CSV' ? parseCSV(content) : parseOFX(content)
  const transactions = parsed.map(tx => ({
    date:    tx.date.toISOString().slice(0, 10),
    libelle: tx.label,
    debit:   tx.type === 'DEBIT'  ? tx.amount : null,
    credit:  tx.type === 'CREDIT' ? tx.amount : null,
    solde:   null as number | null,
  }))
  return {
    bankName: null, accountNumber: null, accountHolder: null,
    periodStart:    transactions[0]?.date ?? null,
    periodEnd:      transactions[transactions.length - 1]?.date ?? null,
    openingBalance: null, closingBalance: null,
    currency:       'XAF',
    transactions,
    confidence:     transactions.length > 0 ? 80 : 0,
  }
}

export async function importBankStatement(companyId: string, data: ImportBankInput, user?: JwtPayload) {
  const parsed = data.format === 'CSV' ? parseCSV(data.content) : parseOFX(data.content)
  if (parsed.length === 0)
    throw new AppError('No valid transactions found in the file', 400, 'NO_TRANSACTIONS')

  const agenceId = user?.agenceId ?? null

  await prisma.bankTransaction.createMany({
    data: parsed.map(tx => ({
      companyId,
      agenceId:  agenceId ?? null,
      date:      tx.date,
      label:     tx.label,
      amount:    new Prisma.Decimal(tx.amount),
      type:      tx.type,
      reference: tx.reference,
      status:    'UNMATCHED' as const,
    })),
  })

  return { imported: parsed.length }
}

const TX_INCLUDE = {
  invoice: { select: { id: true, reference: true, amountTTC: true } },
  expense: { select: { id: true, description: true, amount: true } },
} as const

export async function listBankTransactions(companyId: string, query: ListBankTxInput, user?: JwtPayload) {
  const { page, limit, status } = query

  const where: Prisma.BankTransactionWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
    ...(status ? { status } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      include: TX_INCLUDE,
      orderBy: { date: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.bankTransaction.count({ where }),
  ])

  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function autoReconcile(companyId: string) {
  const transactions = await prisma.bankTransaction.findMany({
    where: { companyId, status: 'UNMATCHED' },
  })

  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { in: ['SENT', 'OVERDUE'] } },
    select: { id: true, amountTTC: true, dueAt: true, reference: true },
  })
  const expenses = await prisma.expense.findMany({
    where: { companyId },
    select: { id: true, amount: true, date: true },
  })

  let matched      = 0
  const usedInvIds = new Set<string>()
  const usedExpIds = new Set<string>()

  for (const tx of transactions) {
    const txAmount = Number(tx.amount)
    const txDate   = new Date(tx.date)

    if (tx.type === 'CREDIT') {
      const inv = invoices.find((i) => {
        if (usedInvIds.has(i.id)) return false
        const diff  = Math.abs(Number(i.amountTTC) - txAmount) / Number(i.amountTTC)
        const days  = Math.abs((i.dueAt ? new Date(i.dueAt).getTime() : txDate.getTime()) - txDate.getTime()) / 86_400_000
        return diff < 0.05 && days <= 15
      })
      if (inv) {
        const lettrage = `L${String(++matched).padStart(4, '0')}`
        await prisma.bankTransaction.update({
          where: { id: tx.id },
          data:  { status: 'MATCHED', invoiceId: inv.id, lettrage },
        })
        usedInvIds.add(inv.id)
        continue
      }
    }

    if (tx.type === 'DEBIT') {
      const exp = expenses.find((e) => {
        if (usedExpIds.has(e.id)) return false
        const diff = Math.abs(Number(e.amount) - txAmount) / Number(e.amount)
        const days = Math.abs(new Date(e.date).getTime() - txDate.getTime()) / 86_400_000
        return diff < 0.05 && days <= 5
      })
      if (exp) {
        const lettrage = `L${String(++matched).padStart(4, '0')}`
        await prisma.bankTransaction.update({
          where: { id: tx.id },
          data:  { status: 'MATCHED', expenseId: exp.id, lettrage },
        })
        usedExpIds.add(exp.id)
      }
    }
  }

  return { matched }
}

export async function reconcileTransaction(companyId: string, data: ReconcileInput) {
  const tx = await prisma.bankTransaction.findUnique({ where: { id: data.transactionId } })
  if (!tx || tx.companyId !== companyId)
    throw new AppError('Transaction not found', 404, 'NOT_FOUND')

  if (data.invoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: data.invoiceId } })
    if (!inv || inv.companyId !== companyId)
      throw new AppError('Invoice not found', 404, 'NOT_FOUND')
  }
  if (data.expenseId) {
    const exp = await prisma.expense.findUnique({ where: { id: data.expenseId } })
    if (!exp || exp.companyId !== companyId)
      throw new AppError('Expense not found', 404, 'NOT_FOUND')
  }

  const count = await prisma.bankTransaction.count({
    where: { companyId, status: 'MATCHED' },
  })
  const lettrage = `L${String(count + 1).padStart(4, '0')}`

  return prisma.bankTransaction.update({
    where:   { id: tx.id },
    data:    { status: 'MATCHED', lettrage, invoiceId: data.invoiceId ?? null, expenseId: data.expenseId ?? null },
    include: TX_INCLUDE,
  })
}

export async function updateTransactionStatus(
  companyId: string,
  id: string,
  data: UpdateTxStatusInput,
) {
  const tx = await prisma.bankTransaction.findUnique({ where: { id } })
  if (!tx || tx.companyId !== companyId)
    throw new AppError('Transaction not found', 404, 'NOT_FOUND')

  return prisma.bankTransaction.update({
    where: { id },
    data:  {
      status:    data.status,
      lettrage:  data.lettrage ?? null,
      ...(data.status === 'UNMATCHED' ? { invoiceId: null, expenseId: null } : {}),
    },
    include: TX_INCLUDE,
  })
}

export async function deleteTransaction(companyId: string, id: string) {
  const tx = await prisma.bankTransaction.findUnique({ where: { id } })
  if (!tx || tx.companyId !== companyId)
    throw new AppError('Transaction not found', 404, 'NOT_FOUND')
  await prisma.bankTransaction.delete({ where: { id } })
}

export async function bankStats(companyId: string, user?: JwtPayload) {
  const baseWhere: Prisma.BankTransactionWhereInput = {
    companyId,
    ...(user ? getAgenceFilter(user) : {}),
  }

  const [total, matched, unmatched, ignored] = await Promise.all([
    prisma.bankTransaction.count({ where: baseWhere }),
    prisma.bankTransaction.count({ where: { ...baseWhere, status: 'MATCHED' } }),
    prisma.bankTransaction.count({ where: { ...baseWhere, status: 'UNMATCHED' } }),
    prisma.bankTransaction.count({ where: { ...baseWhere, status: 'IGNORED' } }),
  ])

  const rate = total > 0 ? Math.round((matched / total) * 100) : 0
  return { total, matched, unmatched, ignored, reconciliationRate: rate }
}
