import { Prisma } from '@prisma/client'
import type { EmploymentContract } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type {
  CreateEmploymentContractInput,
  UpdateEmploymentContractInput,
} from './employment-contracts.dto.js'

function serialize(c: EmploymentContract & {
  employee?: { prenom: string | null; nom: string; email: string } | null
}) {
  return {
    id:            c.id,
    companyId:     c.companyId,
    employeeId:    c.employeeId,
    employeeName:  c.employee ? `${c.employee.prenom ?? ''} ${c.employee.nom}`.trim() : '',
    employeeEmail: c.employee?.email ?? '',
    contractType:  c.contractType,
    status:        c.status,
    startDate:     c.startDate.toISOString().slice(0, 10),
    endDate:       c.endDate ? c.endDate.toISOString().slice(0, 10) : null,
    grossSalary:   Number(c.grossSalary),
    poste:         c.poste,
    departement:   c.departement,
    lieuTravail:   c.lieuTravail,
    content:       c.content,
    signedAt:      c.signedAt ? c.signedAt.toISOString() : null,
    createdAt:     c.createdAt.toISOString(),
    updatedAt:     c.updatedAt.toISOString(),
  }
}

const include = { employee: { select: { prenom: true, nom: true, email: true } } }

export async function listEmploymentContracts(companyId: string) {
  const items = await prisma.employmentContract.findMany({
    where:   { companyId },
    include,
    orderBy: { createdAt: 'desc' },
  })
  return items.map(serialize)
}

export async function getEmploymentContract(companyId: string, id: string) {
  const c = await prisma.employmentContract.findUnique({ where: { id }, include })
  if (!c || c.companyId !== companyId) throw new AppError('Contract not found', 404, 'NOT_FOUND')
  return serialize(c)
}

export async function createEmploymentContract(
  companyId: string,
  data: CreateEmploymentContractInput,
) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee || employee.companyId !== companyId) {
    throw new AppError('Employee not found', 404, 'NOT_FOUND')
  }
  const created = await prisma.employmentContract.create({
    data: {
      companyId,
      employeeId:   data.employeeId,
      contractType: data.contractType,
      status:       data.status ?? 'DRAFT',
      startDate:    data.startDate,
      endDate:      data.endDate ?? null,
      grossSalary:  new Prisma.Decimal(data.grossSalary),
      poste:        data.poste,
      departement:  data.departement,
      lieuTravail:  data.lieuTravail,
      content:      data.content,
      signedAt:     data.signedAt ?? null,
    },
    include,
  })
  return serialize(created)
}

export async function updateEmploymentContract(
  companyId: string,
  id: string,
  data: UpdateEmploymentContractInput,
) {
  const existing = await prisma.employmentContract.findUnique({ where: { id } })
  if (!existing || existing.companyId !== companyId) {
    throw new AppError('Contract not found', 404, 'NOT_FOUND')
  }
  const updated = await prisma.employmentContract.update({
    where: { id },
    data: {
      ...(data.contractType !== undefined ? { contractType: data.contractType } : {}),
      ...(data.status       !== undefined ? { status:       data.status }       : {}),
      ...(data.startDate    !== undefined ? { startDate:    data.startDate }    : {}),
      ...(data.endDate      !== undefined ? { endDate:      data.endDate ?? null }    : {}),
      ...(data.grossSalary  !== undefined ? { grossSalary:  new Prisma.Decimal(data.grossSalary) } : {}),
      ...(data.poste        !== undefined ? { poste:        data.poste }        : {}),
      ...(data.departement  !== undefined ? { departement:  data.departement }  : {}),
      ...(data.lieuTravail  !== undefined ? { lieuTravail:  data.lieuTravail }  : {}),
      ...(data.content      !== undefined ? { content:      data.content }      : {}),
      ...(data.signedAt     !== undefined ? { signedAt:     data.signedAt ?? null } : {}),
    },
    include,
  })
  return serialize(updated)
}

export async function deleteEmploymentContract(companyId: string, id: string) {
  const result = await prisma.employmentContract.deleteMany({ where: { id, companyId } })
  if (result.count === 0) throw new AppError('Contract not found', 404, 'NOT_FOUND')
}

export type SerializedEmploymentContract = ReturnType<typeof serialize>
