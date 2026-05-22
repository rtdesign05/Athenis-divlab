import { Prisma } from '@prisma/client'
import type { Employee as PrismaEmployee } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateEmployeeInput, UpdateEmployeeInput, ListEmployeesInput } from './employees.dto.js'

/**
 * Sérialise un employé Prisma vers le format API (champs en anglais).
 * Le modèle Prisma utilise nom/prenom/contrat/salaireBrut/dateEmbauche/dateFinContrat
 * mais l'API expose firstName/lastName/employmentType/grossSalary/startDate/endDate.
 *
 * Convention : prenom (Prisma) ↔ firstName (API), nom (Prisma) ↔ lastName (API).
 */
function serialize(e: PrismaEmployee) {
  return {
    id:             e.id,
    companyId:      e.companyId,
    firstName:      e.prenom ?? '',
    lastName:       e.nom,
    email:          e.email,
    phone:          e.telephone,
    employmentType: e.contrat,
    startDate:      e.dateEmbauche.toISOString(),
    endDate:        e.dateFinContrat?.toISOString() ?? null,
    grossSalary:    e.salaireBrut.toString(),
    // Moyens de paiement
    paymentMethod:        e.paymentMethod,
    mobileMoneyNumber:    e.mobileMoneyNumber,
    mobileMoneyProvider:  e.mobileMoneyProvider,
    bankName:             e.bankName,
    bankAccountHolder:    e.bankAccountHolder,
    bankAccountNumber:    e.bankAccountNumber,
    bankSwiftCode:        e.bankSwiftCode,
    poste:                e.poste,
    departement:          e.departement,
    managerId:            e.managerId,
    createdAt:      e.createdAt.toISOString(),
    updatedAt:      e.updatedAt.toISOString(),
  }
}

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
  return { items: items.map(serialize), total, page, limit, pages: Math.ceil(total / limit) }
}

async function getEmployeeRaw(companyId: string, id: string): Promise<PrismaEmployee> {
  const employee = await prisma.employee.findUnique({ where: { id } })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')
  return employee
}

export async function getEmployee(companyId: string, id: string) {
  return serialize(await getEmployeeRaw(companyId, id))
}

export async function createEmployee(companyId: string, data: CreateEmployeeInput) {
  if (data.email) {
    const dup = await prisma.employee.findFirst({ where: { companyId, email: data.email } })
    if (dup) throw new AppError('An employee with this email already exists', 409, 'EMAIL_DUPLICATE')
  }
  const created = await prisma.employee.create({
    data: {
      companyId,
      prenom:              data.firstName,
      nom:                 data.lastName ?? '',
      email:               data.email ?? '',
      telephone:           data.phone ?? null,
      contrat:             data.employmentType ?? 'FULL_TIME',
      salaireBrut:         new Prisma.Decimal(data.grossSalary),
      dateEmbauche:        data.startDate,
      paymentMethod:       data.paymentMethod ?? null,
      mobileMoneyNumber:   data.mobileMoneyNumber ?? null,
      mobileMoneyProvider: data.mobileMoneyProvider ?? null,
      bankName:            data.bankName ?? null,
      bankAccountHolder:   data.bankAccountHolder ?? null,
      bankAccountNumber:   data.bankAccountNumber ?? null,
      bankSwiftCode:       data.bankSwiftCode ?? null,
      poste:               data.poste       ?? null,
      departement:         data.departement ?? null,
      managerId:           data.managerId   ?? null,
    },
  })
  return serialize(created)
}

export async function updateEmployee(companyId: string, id: string, data: UpdateEmployeeInput) {
  await getEmployeeRaw(companyId, id)
  if (data.email) {
    const dup = await prisma.employee.findFirst({
      where: { companyId, email: data.email, NOT: { id } },
    })
    if (dup) throw new AppError('An employee with this email already exists', 409, 'EMAIL_DUPLICATE')
  }
  const updated = await prisma.employee.update({
    where: { id },
    data: {
      ...(data.firstName            !== undefined ? { prenom:              data.firstName }            : {}),
      ...(data.lastName             !== undefined ? { nom:                 data.lastName }             : {}),
      ...(data.email                !== undefined ? { email:               data.email }                : {}),
      ...(data.phone                !== undefined ? { telephone:           data.phone ?? null }        : {}),
      ...(data.employmentType       !== undefined ? { contrat:             data.employmentType }       : {}),
      ...(data.startDate            !== undefined ? { dateEmbauche:        data.startDate }            : {}),
      ...(data.grossSalary          != null       ? { salaireBrut:         new Prisma.Decimal(data.grossSalary) } : {}),
      ...(data.paymentMethod        !== undefined ? { paymentMethod:       data.paymentMethod ?? null }       : {}),
      ...(data.mobileMoneyNumber    !== undefined ? { mobileMoneyNumber:   data.mobileMoneyNumber ?? null }   : {}),
      ...(data.mobileMoneyProvider  !== undefined ? { mobileMoneyProvider: data.mobileMoneyProvider ?? null } : {}),
      ...(data.bankName             !== undefined ? { bankName:            data.bankName ?? null }            : {}),
      ...(data.bankAccountHolder    !== undefined ? { bankAccountHolder:   data.bankAccountHolder ?? null }   : {}),
      ...(data.bankAccountNumber    !== undefined ? { bankAccountNumber:   data.bankAccountNumber ?? null }   : {}),
      ...(data.bankSwiftCode        !== undefined ? { bankSwiftCode:       data.bankSwiftCode ?? null }       : {}),
      ...(data.poste                !== undefined ? { poste:               data.poste       ?? null }        : {}),
      ...(data.departement          !== undefined ? { departement:         data.departement ?? null }        : {}),
      ...(data.managerId            !== undefined ? { managerId:           data.managerId   ?? null }        : {}),
    },
  })
  return serialize(updated)
}

export async function toggleEmployeeStatus(companyId: string, id: string) {
  const employee = await getEmployeeRaw(companyId, id)
  const dateFinContrat = employee.dateFinContrat ? null : new Date()
  const updated = await prisma.employee.update({ where: { id }, data: { dateFinContrat } })
  return serialize(updated)
}

export async function deleteEmployee(companyId: string, id: string) {
  // N7 : deleteMany avec companyId rend l'opération fail-closed même si le
  //      check initial getEmployee est retiré par un futur refactor.
  const result = await prisma.employee.deleteMany({ where: { id, companyId } })
  if (result.count === 0) {
    throw new AppError('Employee not found', 404, 'NOT_FOUND')
  }
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
