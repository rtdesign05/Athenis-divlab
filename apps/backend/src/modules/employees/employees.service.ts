import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesInput } from './employees.dto.js'

export async function listEmployees(companyId: string, query: ListEmployeesInput) {
  const { page, limit, active } = query
  const where: Prisma.EmployeeWhereInput = {
    companyId,
    ...(active === 'true' ? { endDate: null } : active === 'false' ? { endDate: { not: null } } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: [{ endDate: 'asc' }, { lastName: 'asc' }],
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
  const dup = await prisma.employee.findFirst({ where: { companyId, email: data.email } })
  if (dup) throw new AppError('An employee with this email already exists', 409, 'EMAIL_DUPLICATE')
  return prisma.employee.create({
    data: { ...data, grossSalary: new Prisma.Decimal(data.grossSalary), companyId },
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
      ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
      ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.employmentType !== undefined ? { employmentType: data.employmentType } : {}),
      ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
      ...(data.grossSalary != null ? { grossSalary: new Prisma.Decimal(data.grossSalary) } : {}),
    },
  })
}

export async function toggleEmployeeStatus(companyId: string, id: string) {
  const employee = await getEmployee(companyId, id)
  const endDate = employee.endDate ? null : new Date()
  return prisma.employee.update({ where: { id }, data: { endDate } })
}

export async function deleteEmployee(companyId: string, id: string) {
  await getEmployee(companyId, id)
  await prisma.employee.delete({ where: { id } })
}

export async function employeeStats(companyId: string) {
  const [byType, active, total] = await Promise.all([
    prisma.employee.groupBy({
      by: ['employmentType'],
      where: { companyId, endDate: null },
      _count: true,
      _sum: { grossSalary: true },
    }),
    prisma.employee.aggregate({
      where: { companyId, endDate: null },
      _sum: { grossSalary: true },
      _count: true,
      _avg: { grossSalary: true },
    }),
    prisma.employee.count({ where: { companyId } }),
  ])
  const annualMasseSalariale = active._sum.grossSalary ?? new Prisma.Decimal(0)
  return {
    byType,
    active: { count: active._count, avgSalary: active._avg.grossSalary, totalMonthly: annualMasseSalariale },
    annualMasseSalariale,
    totalHeadcount: total,
  }
}
