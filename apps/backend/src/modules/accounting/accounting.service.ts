import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

function fmtDate(d: Date | string): string {
  const dt = new Date(d)
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
}

function fmtDecimal(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

// ── Existing reports ───────────────────────────────────────────────────────────

export async function getCompteDeResultat(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoiceTotals, expenseTotals, salaryTotals] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issueDate: { gte: start, lte: end } },
      _sum: { subtotal: true, taxAmount: true, total: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.employee.aggregate({
      where: { companyId, startDate: { lte: end }, OR: [{ endDate: null }, { endDate: { gte: start } }] },
      _sum: { grossSalary: true },
    }),
  ])

  const chiffreAffaires     = toNum(invoiceTotals._sum.subtotal)
  const tvaCollectee        = toNum(invoiceTotals._sum.taxAmount)
  const chargesExploitation = toNum(expenseTotals._sum.amount)
  const masseSalariale      = toNum(salaryTotals._sum.grossSalary)
  const chargesTotal        = chargesExploitation + masseSalariale
  const resultatBrut        = chiffreAffaires - chargesTotal

  return {
    year,
    produits: { chiffreAffaires, tvaCollectee, totalProduits: chiffreAffaires },
    charges:  { chargesExploitation, masseSalariale, chargesTotal },
    resultatBrut,
    margeNette: chiffreAffaires > 0 ? (resultatBrut / chiffreAffaires) * 100 : 0,
  }
}

export async function getBilan(companyId: string, year: number) {
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)
  const start = new Date(`${year}-01-01`)

  const [creances, dettes, tresorerie] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ['SENT', 'OVERDUE'] }, dueDate: { lte: end } },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issueDate: { gte: start, lte: end } },
      _sum: { total: true },
    }),
  ])

  const actifCirculant = toNum(creances._sum.total) + toNum(tresorerie._sum.total)
  const passifCourant  = toNum(dettes._sum.amount)

  return {
    year,
    actif: {
      creancesClients: toNum(creances._sum.total),
      tresorerie:      toNum(tresorerie._sum.total),
      totalActif:      actifCirculant,
    },
    passif: {
      dettesExploitation: passifCourant,
      totalPassif:        passifCourant,
    },
    fondsDeRoulement: actifCirculant - passifCourant,
  }
}

export async function getBalance(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoicesByStatus, expensesByCategory] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId, issueDate: { gte: start, lte: end } },
      _count: true,
      _sum:   { total: true, subtotal: true, taxAmount: true },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { companyId, date: { gte: start, lte: end } },
      _count: true,
      _sum:   { amount: true },
    }),
  ])
  return { year, invoicesByStatus, expensesByCategory }
}

export async function getGrandLivre(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, issueDate: { gte: start, lte: end } },
      include: { client: { select: { name: true } } },
      orderBy: { issueDate: 'asc' },
    }),
    prisma.expense.findMany({
      where: { companyId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
  ])

  const entries = [
    ...invoices.map((inv) => ({
      date:      inv.issueDate,
      type:      'INVOICE' as const,
      reference: inv.number,
      label:     inv.client.name,
      debit:     0,
      credit:    toNum(inv.total),
      status:    inv.status,
    })),
    ...expenses.map((exp) => ({
      date:      exp.date,
      type:      'EXPENSE' as const,
      reference: exp.id,
      label:     exp.description,
      debit:     toNum(exp.amount),
      credit:    0,
      category:  exp.category,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return { year, entries }
}

export async function getTvaTrimestrielle(companyId: string, year: number) {
  const quarters = [1, 2, 3, 4].map((q) => {
    const startMonth = (q - 1) * 3
    return {
      quarter:  q,
      start:    new Date(year, startMonth, 1),
      end:      new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    }
  })

  const results = await Promise.all(
    quarters.map(async ({ quarter, start, end }) => {
      const [collectee, deductible] = await Promise.all([
        prisma.invoice.aggregate({
          where: { companyId, status: 'PAID', issueDate: { gte: start, lte: end } },
          _sum:  { taxAmount: true, subtotal: true },
        }),
        prisma.expense.aggregate({
          where: { companyId, date: { gte: start, lte: end } },
          _sum:  { amount: true },
        }),
      ])
      const tvaCollectee  = toNum(collectee._sum.taxAmount)
      const tvaDeductible = toNum(deductible._sum.amount) * 0.2
      return {
        quarter,
        period:        `T${quarter} ${year}`,
        tvaCollectee,
        tvaDeductible,
        tvaADecaisser: Math.max(0, tvaCollectee - tvaDeductible),
        tvaCredit:     Math.max(0, tvaDeductible - tvaCollectee),
      }
    }),
  )
  return { year, quarters: results }
}

// ── TVA CA3 pré-remplie ───────────────────────────────────────────────────────

export async function getTvaCA3(companyId: string, year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1)
  const end   = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, status: 'PAID', issueDate: { gte: start, lte: end } },
      select: { subtotal: true, taxAmount: true, taxRate: true, total: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ])

  // Group by TVA rate
  const byRate = new Map<number, { base: number; tva: number }>()
  for (const inv of invoices) {
    const rate = Number(inv.taxRate)
    const cur  = byRate.get(rate) ?? { base: 0, tva: 0 }
    cur.base  += toNum(inv.subtotal)
    cur.tva   += toNum(inv.taxAmount)
    byRate.set(rate, cur)
  }

  const base20  = byRate.get(20)  ?? { base: 0, tva: 0 }
  const base10  = byRate.get(10)  ?? { base: 0, tva: 0 }
  const base55  = byRate.get(5.5) ?? { base: 0, tva: 0 }
  const base21  = byRate.get(2.1) ?? { base: 0, tva: 0 }

  const totalBase       = base20.base  + base10.base  + base55.base  + base21.base
  const tvaCollectee    = base20.tva   + base10.tva   + base55.tva   + base21.tva
  const tvaDeductible   = toNum(expenses._sum.amount) * 0.2

  return {
    period:  `T${quarter} ${year}`,
    year,
    quarter,
    // Cadre A - Opérations imposables
    lignes: {
      '01': { label: 'Ventes, prestations de services (20%)',   base: base20.base,  tva: base20.tva  },
      '02': { label: 'Autres opérations imposables (10%)',      base: base10.base,  tva: base10.tva  },
      '03': { label: 'Opérations imposables (5,5%)',            base: base55.base,  tva: base55.tva  },
      '04': { label: 'Opérations imposables (2,1%)',            base: base21.base,  tva: base21.tva  },
      '09': { label: 'Total TVA brute',                         base: totalBase,    tva: tvaCollectee },
      // Cadre B - Déductions
      '20': { label: 'Dont TVA déductible sur autres biens',    base: toNum(expenses._sum.amount), tva: tvaDeductible },
      '23': { label: 'Total TVA déductible',                    base: null,         tva: tvaDeductible },
      // Cadre C - Calcul de la TVA à payer
      '28': { label: 'TVA nette due',                           base: null,         tva: Math.max(0, tvaCollectee - tvaDeductible) },
      '29': { label: 'Crédit de TVA',                           base: null,         tva: Math.max(0, tvaDeductible - tvaCollectee) },
    },
  }
}

// ── Export FEC (Fichier des Écritures Comptables) DGFiP ──────────────────────

export async function exportFEC(companyId: string, year: number): Promise<string> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true, siren: true } })
  const start   = new Date(`${year}-01-01`)
  const end     = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, issueDate: { gte: start, lte: end } },
      include: { client: { select: { name: true, siren: true } } },
      orderBy: { issueDate: 'asc' },
    }),
    prisma.expense.findMany({
      where: { companyId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
  ])

  const header = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib',
    'Debit', 'Credit', 'EcritureLet', 'DateLet',
    'ValidDate', 'Montantdevise', 'Idevise',
  ].join('|')

  const rows: string[] = [header]
  let lineNum = 1

  // Invoices → Journal VTE
  for (const inv of invoices) {
    const d      = fmtDate(inv.issueDate)
    const pieceD = fmtDate(inv.issueDate)
    const num    = String(lineNum).padStart(6, '0')
    const client = inv.client

    // Débit client (411)
    rows.push([
      'VTE', 'Ventes', num, d,
      '411', 'Clients', client.siren ?? '', client.name,
      inv.number, pieceD, `Facture ${inv.number}`,
      fmtDecimal(toNum(inv.total)), '0,00', '', '',
      d, '', '',
    ].join('|'))
    lineNum++

    // Crédit ventes HT (706)
    rows.push([
      'VTE', 'Ventes', String(lineNum).padStart(6, '0'), d,
      '706', 'Prestations de services', '', '',
      inv.number, pieceD, `Facture ${inv.number}`,
      '0,00', fmtDecimal(toNum(inv.subtotal)), '', '',
      d, '', '',
    ].join('|'))
    lineNum++

    // Crédit TVA (44571)
    if (toNum(inv.taxAmount) > 0) {
      rows.push([
        'VTE', 'Ventes', String(lineNum).padStart(6, '0'), d,
        '44571', 'TVA collectée', '', '',
        inv.number, pieceD, `TVA Facture ${inv.number}`,
        '0,00', fmtDecimal(toNum(inv.taxAmount)), '', '',
        d, '', '',
      ].join('|'))
      lineNum++
    }
  }

  // Expenses → Journal ACH
  for (const exp of expenses) {
    const d   = fmtDate(exp.date)
    const num = String(lineNum).padStart(6, '0')

    // Débit charges (607/606 etc)
    rows.push([
      'ACH', 'Achats', num, d,
      '607', 'Achats divers', '', '',
      exp.id.slice(0, 12), d, exp.description,
      fmtDecimal(toNum(exp.amount)), '0,00', '', '',
      d, '', '',
    ].join('|'))
    lineNum++

    // Crédit fournisseur (401)
    rows.push([
      'ACH', 'Achats', String(lineNum).padStart(6, '0'), d,
      '401', 'Fournisseurs', '', '',
      exp.id.slice(0, 12), d, exp.description,
      '0,00', fmtDecimal(toNum(exp.amount)), '', '',
      d, '', '',
    ].join('|'))
    lineNum++
  }

  return rows.join('\r\n')
}

// ── Clôture d'exercice ────────────────────────────────────────────────────────

export async function getClotureStatus(companyId: string, year: number) {
  const [existingClose, openInvoices, result] = await Promise.all([
    prisma.fiscalYearClose.findUnique({ where: { companyId_year: { companyId, year } } }),
    prisma.invoice.count({ where: { companyId, status: { in: ['SENT', 'OVERDUE'] }, issueDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } } }),
    getCompteDeResultat(companyId, year),
  ])

  return {
    year,
    alreadyClosed: !!existingClose,
    closedAt:      existingClose?.createdAt ?? null,
    openInvoices,
    resultatNet:   result.resultatBrut,
    canClose:      openInvoices === 0 && !existingClose,
    blockers:      openInvoices > 0 ? [`${openInvoices} facture(s) non encaissée(s) sur l'exercice`] : [],
  }
}

export async function closeExercise(companyId: string, year: number, notes?: string, closedBy?: string) {
  const status = await getClotureStatus(companyId, year)
  if (status.alreadyClosed)
    throw new AppError(`L'exercice ${year} est déjà clôturé`, 409, 'ALREADY_CLOSED')
  if (!status.canClose)
    throw new AppError(`Impossible de clôturer : ${status.blockers.join(', ')}`, 422, 'CANNOT_CLOSE')

  return prisma.fiscalYearClose.create({
    data: {
      companyId,
      year,
      resultNet: new Prisma.Decimal(status.resultatNet),
      notes:     notes ?? null,
      closedBy:  closedBy ?? null,
    },
  })
}
