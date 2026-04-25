import { prisma } from './prisma.js'
import type { AccountType } from '@prisma/client'

export async function generateAtheisNumber(type: AccountType): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = type === 'PERSONAL' ? 'P' : type === 'COMPANY' ? 'E' : 'C'

  const counter = await prisma.$transaction(async (tx) => {
    const existing = await tx.atheisCounter.findUnique({
      where: { type_year: { type, year } },
    })
    if (existing) {
      return tx.atheisCounter.update({
        where: { type_year: { type, year } },
        data: { lastNumber: { increment: 1 } },
      })
    }
    return tx.atheisCounter.create({ data: { type, year, lastNumber: 1 } })
  })

  const seq = String(counter.lastNumber).padStart(5, '0')
  return `ATH-${prefix}-${year}-${seq}`
}
