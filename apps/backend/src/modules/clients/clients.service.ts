import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateClientInput, UpdateClientInput, ListClientsInput } from './clients.dto.js'

export async function listClients(companyId: string, query: ListClientsInput) {
  const { page, limit, search } = query
  const where: Prisma.ClientWhereInput = {
    companyId,
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  }
  const [items, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.client.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getClient(companyId: string, id: string) {
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client || client.companyId !== companyId)
    throw new AppError('Client not found', 404, 'NOT_FOUND')
  return client
}

export async function createClient(companyId: string, data: CreateClientInput) {
  if (data.email) {
    const dup = await prisma.client.findFirst({ where: { companyId, email: data.email } })
    if (dup) throw new AppError('A client with this email already exists', 409, 'EMAIL_DUPLICATE')
  }
  return prisma.client.create({
    data: {
      companyId,
      name: data.name,
      email: data.email ?? null,
      siren: data.siren ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
    },
  })
}

export async function updateClient(companyId: string, id: string, data: UpdateClientInput) {
  await getClient(companyId, id)
  if (data.email) {
    const dup = await prisma.client.findFirst({
      where: { companyId, email: data.email, NOT: { id } },
    })
    if (dup) throw new AppError('A client with this email already exists', 409, 'EMAIL_DUPLICATE')
  }
  return prisma.client.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.email !== undefined ? { email: data.email ?? null } : {}),
      ...(data.siren !== undefined ? { siren: data.siren ?? null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
      ...(data.address !== undefined ? { address: data.address ?? null } : {}),
    },
  })
}

export async function deleteClient(companyId: string, id: string) {
  await getClient(companyId, id)
  const invoiceCount = await prisma.invoice.count({ where: { clientId: id } })
  if (invoiceCount > 0)
    throw new AppError('Cannot delete a client with invoices', 409, 'CLIENT_HAS_INVOICES')
  await prisma.client.delete({ where: { id } })
}
