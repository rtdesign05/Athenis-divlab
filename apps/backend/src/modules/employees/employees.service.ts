import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesInput } from './employees.dto.js'

export async function listEmployees(companyId: string, query: ListEmployeesInput) {
  const { page, limit, active } = query
  const where: Prisma.EmployeeWhereInput = {
    companyId,
    ...(active === 'true' ? { dateFinContrat: null } : active === 'false' ? { dateFinContrat: { not: null } } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: [{ dateFinContrat: 'asc' }, { nom: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employee.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getEmployee(companyId: string, id: string) {
  const employee = await prisma.employee.findUnique({ where: { id } })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')
  return employee
}

export async function createEmployee(companyId: string, data: CreateEmployeeInput) {
  if (data.email) {
    const dup = await prisma.employee.findFirst({ where: { companyId, email: data.email } })
    if (dup) throw new AppError('An employee with this email already exists', 409, 'EMAIL_DUPLICATE')
  }
  return prisma.employee.create({
    data: {
      companyId,
      nom:          data.firstName,
      prenom:       data.lastName,
      email:        data.email,
      contrat:      'CDI',
      poste:        'Non défini',
      salaireNet:   new Prisma.Decimal(data.grossSalary),
      salaireBrut:  new Prisma.Decimal(data.grossSalary),
      dateEmbauche: data.startDate,
    },
  })
}

export async function updateEmployee(companyId: string, id: string, data: UpdateEmployeeInput) {
  await getEmployee(companyId, id)
  if (data.email) {
    const dup = await prisma.employee.findFirst({
      where: { companyId, email: data.email, NOT: { id } },
    })
    if (dup) throw new AppError('An employee with this email already exists', 409, 'EMAIL_DUPLICATE')
  }
  return prisma.employee.update({
    where: { id },
    data: {
      ...(data.firstName   !== undefined ? { nom:          data.firstName }                                   : {}),
      ...(data.lastName    !== undefined ? { prenom:       data.lastName }                                    : {}),
      ...(data.email       !== undefined ? { email:        data.email }                                       : {}),
      ...(data.startDate   !== undefined ? { dateEmbauche: data.startDate }                                   : {}),
      ...(data.grossSalary != null       ? { salaireNet:   new Prisma.Decimal(data.grossSalary),
                                             salaireBrut:  new Prisma.Decimal(data.grossSalary) }             : {}),
    },
  })
}

export async function toggleEmployeeStatus(companyId: string, id: string) {
  const employee = await getEmployee(companyId, id)
  const dateFinContrat = employee.dateFinContrat ? null : new Date()
  return prisma.employee.update({ where: { id }, data: { dateFinContrat } })
}

export async function deleteEmployee(companyId: string, id: string) {
  await getEmployee(companyId, id)
  await prisma.employee.delete({ where: { id } })
}

export async function employeeStats(companyId: string) {
  const [byType, active, total] = await Promise.all([
    prisma.employee.groupBy({
      by: ['contrat'],
      where: { companyId, dateFinContrat: null },
      _count: true,
      _sum: { salaireBrut: true },
    }),
    prisma.employee.aggregate({
      where: { companyId, dateFinContrat: null },
      _sum: { salaireBrut: true },
      _count: true,
      _avg: { salaireBrut: true },
    }),
    prisma.employee.count({ where: { companyId } }),
  ])
  const annualMasseSalariale = active._sum?.salaireBrut ?? new Prisma.Decimal(0)
  return {
    byType,
    active: { count: active._count, avgSalary: active._avg?.salaireBrut, totalMonthly: annualMasseSalariale },
    annualMasseSalariale,
    totalHeadcount: total,
  }
}
