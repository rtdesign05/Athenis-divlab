import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

export async function getPortfolio(cabinetId: string) {
  const mandats = await prisma.mandat.findMany({
    where: { cabinetId, isActive: true },
    include: {
      company: {
        select: {
          id: true,
          nom: true,
          siren: true,
          secteur: true,
          taille: true,
          plan: true,
          modules: true,
        },
      },
    },
    orderBy: { company: { nom: 'asc' } },
  })

  const portfolioWithKpis = await Promise.all(
    mandats.map(async ({ company, type, modules, createdAt }) => {
      const [invoiceAgg, expenseAgg, employeeCount] = await Promise.all([
        prisma.invoice.aggregate({
          where: { companyId: company.id },
          _sum: { amountTTC: true },
          _count: true,
        }),
        prisma.expense.aggregate({
          where: { companyId: company.id },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.employee.count({ where: { companyId: company.id, dateFinContrat: null } }),
      ])

      const overdueCount = await prisma.invoice.count({
        where: { companyId: company.id, status: 'OVERDUE' },
      })

      return {
        company,
        mandat: { type, modules, since: createdAt },
        kpis: {
          totalFacture:    toNum(invoiceAgg._sum?.amountTTC),
          invoiceCount:    invoiceAgg._count,
          overdueInvoices: overdueCount,
          totalDepenses:   toNum(expenseAgg._sum?.amount),
          activeEmployees: employeeCount,
        },
      }
    }),
  )

  return portfolioWithKpis
}

export async function getCabinetDashboard(cabinetId: string) {
  const [portfolio, totalMandats, activeMandats] = await Promise.all([
    getPortfolio(cabinetId),
    prisma.mandat.count({ where: { cabinetId } }),
    prisma.mandat.count({ where: { cabinetId, isActive: true } }),
  ])

  const totalFacture = portfolio.reduce((sum, p) => sum + p.kpis.totalFacture, 0)
  const companiesWithOverdue = portfolio.filter((p) => p.kpis.overdueInvoices > 0).length

  return {
    summary: {
      totalMandats,
      activeMandats,
      inactiveMandats: totalMandats - activeMandats,
      totalFacturePortefeuille: totalFacture,
      companiesWithOverdueInvoices: companiesWithOverdue,
    },
    portfolio,
  }
}

export async function getMandats(cabinetId: string) {
  return prisma.mandat.findMany({
    where: { cabinetId },
    include: {
      company: { select: { id: true, nom: true, siren: true, plan: true } },
    },
    orderBy: [{ isActive: 'desc' }, { company: { nom: 'asc' } }],
  })
}

export async function getMandat(cabinetId: string, companyId: string) {
  const mandat = await prisma.mandat.findUnique({
    where: { cabinetId_companyId: { cabinetId, companyId } },
    include: { company: true },
  })
  if (!mandat) throw new AppError('Mandat not found', 404, 'NOT_FOUND')
  return mandat
}

export async function toggleMandat(cabinetId: string, companyId: string) {
  const mandat = await getMandat(cabinetId, companyId)
  return prisma.mandat.update({
    where: { cabinetId_companyId: { cabinetId, companyId } },
    data: { isActive: !mandat.isActive },
  })
}
