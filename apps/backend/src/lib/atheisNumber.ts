import { prisma } from './prisma.js'
import type { AccountType } from '@prisma/client'

export async function generateAtheisNumber(type: AccountType): Promise<string> {
  const prefix = type === 'PERSONAL' ? 'P' : type === 'COMPANY' ? 'E' : 'C'

  const counter = await prisma.$transaction(async (tx) => {
    return tx.atheisCounter.upsert({
      where:  { type },
      update: { lastNumber: { increment: 1 } },
      create: { type, lastNumber: 1 },
    })
  })

  const seq = String(counter.lastNumber).padStart(5, '0')
  return `ATH-${prefix}-${seq}`
}
