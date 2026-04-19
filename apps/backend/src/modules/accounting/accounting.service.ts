import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

export async function getCompteDeResultat(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end = new Date(`${year}-12-31T23:59:59.999Z`)

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

  const chiffreAffaires = toNum(invoiceTotals._sum.subtotal)
  const tvaCollectee = toNum(invoiceTotals._sum.taxAmount)
  const chargesExploitation = toNum(expenseTotals._sum.amount)
  const masseSalariale = toNum(salaryTotals._sum.grossSalary)
  const resultatBrut = chiffreAffaires - chargesExploitation - masseSalariale
  const chargesTotal = chargesExploitation + masseSalariale

  return {
    year,
    produits: { chiffreAffaires, tvaCollectee, totalProduits: chiffreAffaires },
    charges: { chargesExploitation, masseSalariale, chargesTotal },
    resultatBrut,
    margeNette: chiffreAffaires > 0 ? (resultatBrut / chiffreAffaires) * 100 : 0,
  }
}

export async function getBilan(companyId: string, year: number) {
  const end = new Date(`${year}-12-31T23:59:59.999Z`)
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
  const passifCourant = toNum(dettes._sum.amount)

  return {
    year,
    actif: {
      creancesClients: toNum(creances._sum.total),
      tresorerie: toNum(tresorerie._sum.total),
      totalActif: actifCirculant,
    },
    passif: {
      dettesExploitation: passifCourant,
      totalPassif: passifCourant,
    },
    fondsDeRoulement: actifCirculant - passifCourant,
  }
}

export async function getBalance(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoicesByStatus, expensesByCategory] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId, issueDate: { gte: start, lte: end } },
      _count: true,
      _sum: { total: true, subtotal: true, taxAmount: true },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { companyId, date: { gte: start, lte: end } },
      _count: true,
      _sum: { amount: true },
    }),
  ])

  return { year, invoicesByStatus, expensesByCategory }
}

export async function getGrandLivre(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end = new Date(`${year}-12-31T23:59:59.999Z`)

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
      date: inv.issueDate,
      type: 'INVOICE' as const,
      reference: inv.number,
      label: inv.client.name,
      debit: 0,
      credit: toNum(inv.total),
      status: inv.status,
    })),
    ...expenses.map((exp) => ({
      date: exp.date,
      type: 'EXPENSE' as const,
      reference: exp.id,
      label: exp.description,
      debit: toNum(exp.amount),
      credit: 0,
      category: exp.category,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return { year, entries }
}

export async function getTvaTrimestrielle(companyId: string, year: number) {
  const quarters = [1, 2, 3, 4].map((q) => {
    const startMonth = (q - 1) * 3
    return {
      quarter: q,
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    }
  })

  const results = await Promise.all(
    quarters.map(async ({ quarter, start, end }) => {
      const [collectee, deductible] = await Promise.all([
        prisma.invoice.aggregate({
          where: { companyId, status: 'PAID', issueDate: { gte: start, lte: end } },
          _sum: { taxAmount: true },
        }),
        prisma.expense.aggregate({
          where: { companyId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ])
      const tvaCollectee = toNum(collectee._sum.taxAmount)
      const tvaDeductible = toNum(deductible._sum.amount) * 0.2
      return {
        quarter,
        period: `T${quarter} ${year}`,
        tvaCollectee,
        tvaDeductible,
        tvaADecaisser: Math.max(0, tvaCollectee - tvaDeductible),
        tvaCredit: Math.max(0, tvaDeductible - tvaCollectee),
      }
    }),
  )

  return { year, quarters: results }
}
