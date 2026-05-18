/**
 * Harnais de mocking Prisma pour les tests d'intégration.
 *
 * Utilise vitest-mock-extended pour générer automatiquement les mocks de
 * tous les models et opérations Prisma. Pas besoin d'une vraie DB.
 *
 * Usage type :
 *
 *   import { createPrismaMock } from '@/test/prisma-mock'
 *
 *   describe('mon service', () => {
 *     const prismaMock = createPrismaMock()
 *
 *     it('fait quelque chose', async () => {
 *       prismaMock.invoice.findFirst.mockResolvedValue({ id: 'inv1', ... })
 *       await monService(prismaMock as any, 'cmp1', 'inv1')
 *       expect(prismaMock.invoice.update).toHaveBeenCalled()
 *     })
 *   })
 */
import { mockDeep, type DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

export type PrismaMock = DeepMockProxy<PrismaClient>

export function createPrismaMock(): PrismaMock {
  return mockDeep<PrismaClient>()
}
