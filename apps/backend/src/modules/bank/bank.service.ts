import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { ImportBankInput, ReconcileInput, UpdateTxStatusInput, ListBankTxInput } from './bank.dto.js'

// BankTransaction model does not exist in v2 schema — use in-memory store
interface BankTransaction {
  id: string
  companyId: string
  date: Date
  label: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  reference: string | null
  status: 'UNMATCHED' | 'MATCHED' | 'IGNORED'
  invoiceId: string | null
  expenseId: string | null
  lettrage: string | null
  createdAt: Date
}

const txStore = new Map<string, BankTransaction>()
let txSeq = 0
function genTxId(): string { return `TX-${++txSeq}-${Date.now()}` }

interface ParsedTx {
  date: Date
  label: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  reference: string | null
}

// ── Parsers ───────────────────────────────────────────────────────────────────

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

    if (cols.length === 3 || (!rawCredit && rawDebit)) {
      const amt = parseFloat((cols[2] ?? '').replace(/\s/g, '').replace(',', '.')) || 0
      if (amt >= 0) credit = amt
      else          debit  = Math.abs(amt)
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

export async function importBankStatement(companyId: string, data: ImportBankInput) {
  const parsed = data.format === 'CSV' ? parseCSV(data.content) : parseOFX(data.content)
  if (parsed.length === 0)
    throw new AppError('No valid transactions found in the file', 400, 'NO_TRANSACTIONS')

  const now = new Date()
  for (const tx of parsed) {
    const id = genTxId()
    txStore.set(id, {
      id, companyId,
      date:      tx.date,
      label:     tx.label,
      amount:    tx.amount,
      type:      tx.type,
      reference: tx.reference,
      status:    'UNMATCHED',
      invoiceId: null,
      expenseId: null,
      lettrage:  null,
      createdAt: now,
    })
  }

  return { imported: parsed.length }
}

export async function listBankTransactions(companyId: string, query: ListBankTxInput) {
  const { page, limit, status } = query
  const all = [...txStore.values()]
    .filter(tx => tx.companyId === companyId && (!status || tx.status === status))
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  const total = all.length
  const items = all.slice((page - 1) * limit, page * limit)
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function autoReconcile(companyId: string) {
  const transactions = [...txStore.values()].filter(tx => tx.companyId === companyId && tx.status === 'UNMATCHED')
  const invoices = await prisma.invoice.findMany({
    where: { companyId, status: { in: ['SENT', 'OVERDUE'] } },
    select: { id: true, amountTTC: true, dueAt: true, reference: true },
  })
  const expenses = await prisma.expense.findMany({
    where: { companyId },
    select: { id: true, amount: true, date: true },
  })

  let matched = 0

  for (const tx of transactions) {
    const txAmount = tx.amount
    const txDate   = new Date(tx.date)

    if (tx.type === 'CREDIT') {
      const inv = invoices.find((i) => {
        const diff  = Math.abs(Number(i.amountTTC) - txAmount) / Number(i.amountTTC)
        const days  = Math.abs((i.dueAt ? new Date(i.dueAt).getTime() : txDate.getTime()) - txDate.getTime()) / 86_400_000
        return diff < 0.05 && days <= 15
      })
      if (inv) {
        const lettrage = `L${String(++matched).padStart(4, '0')}`
        const existing = txStore.get(tx.id)
        if (existing) {
          txStore.set(tx.id, { ...existing, status: 'MATCHED', invoiceId: inv.id, lettrage })
        }
        const idx = invoices.indexOf(inv)
        invoices.splice(idx, 1)
        continue
      }
    }

    if (tx.type === 'DEBIT') {
      const exp = expenses.find((e) => {
        const diff = Math.abs(Number(e.amount) - txAmount) / Number(e.amount)
        const days = Math.abs(new Date(e.date).getTime() - txDate.getTime()) / 86_400_000
        return diff < 0.05 && days <= 5
      })
      if (exp) {
        const lettrage = `L${String(++matched).padStart(4, '0')}`
        const existing = txStore.get(tx.id)
        if (existing) {
          txStore.set(tx.id, { ...existing, status: 'MATCHED', expenseId: exp.id, lettrage })
        }
        const idx = expenses.indexOf(exp)
        expenses.splice(idx, 1)
      }
    }
  }

  return { matched }
}

export async function reconcileTransaction(companyId: string, data: ReconcileInput) {
  const tx = txStore.get(data.transactionId)
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

  const count = [...txStore.values()].filter(t => t.companyId === companyId && t.status === 'MATCHED').length
  const lettrage = `L${String(count + 1).padStart(4, '0')}`

  txStore.set(tx.id, {
    ...tx,
    status:    'MATCHED',
    lettrage,
    invoiceId: data.invoiceId ?? null,
    expenseId: data.expenseId ?? null,
  })

  return txStore.get(tx.id)!
}

export async function updateTransactionStatus(
  companyId: string,
  id: string,
  data: UpdateTxStatusInput,
) {
  const tx = txStore.get(id)
  if (!tx || tx.companyId !== companyId)
    throw new AppError('Transaction not found', 404, 'NOT_FOUND')

  txStore.set(id, {
    ...tx,
    status:    data.status,
    lettrage:  data.lettrage ?? null,
    ...(data.status === 'UNMATCHED' ? { invoiceId: null, expenseId: null } : {}),
  })

  return txStore.get(id)!
}

export async function deleteTransaction(companyId: string, id: string) {
  const tx = txStore.get(id)
  if (!tx || tx.companyId !== companyId)
    throw new AppError('Transaction not found', 404, 'NOT_FOUND')
  txStore.delete(id)
}

export async function bankStats(companyId: string) {
  const all       = [...txStore.values()].filter(t => t.companyId === companyId)
  const total     = all.length
  const matched   = all.filter(t => t.status === 'MATCHED').length
  const unmatched = all.filter(t => t.status === 'UNMATCHED').length
  const ignored   = all.filter(t => t.status === 'IGNORED').length
  const rate      = total > 0 ? Math.round((matched / total) * 100) : 0
  return { total, matched, unmatched, ignored, reconciliationRate: rate }
}
