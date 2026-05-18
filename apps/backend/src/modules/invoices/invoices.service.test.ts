import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

// On mock `prisma` AVANT d'importer le service.
const prismaMock = mockDeep<PrismaClient>()
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

// Import après le vi.mock pour que le service utilise le mock.
const { nextInvoiceReference } = await import('./invoices.service.js')

describe('nextInvoiceReference — génération séquentielle FA-YYYY-NNN', () => {
  beforeEach(() => { mockReset(prismaMock) })

  it('génère FA-YYYY-001 si aucune facture pour l\'année', async () => {
    prismaMock.invoice.count.mockResolvedValue(0)
    const year = new Date().getFullYear()
    const ref = await nextInvoiceReference('cmp1')
    expect(ref).toBe(`FA-${year}-001`)
    expect(prismaMock.invoice.count).toHaveBeenCalledWith({
      where: { companyId: 'cmp1', reference: { startsWith: `FA-${year}-` } },
    })
  })

  it('incrémente correctement après 5 factures existantes', async () => {
    prismaMock.invoice.count.mockResolvedValue(5)
    const year = new Date().getFullYear()
    const ref = await nextInvoiceReference('cmp1')
    expect(ref).toBe(`FA-${year}-006`)
  })

  it('respecte le padding 3 chiffres', async () => {
    prismaMock.invoice.count.mockResolvedValue(0)
    const ref = await nextInvoiceReference('cmp1')
    expect(ref).toMatch(/FA-\d{4}-\d{3}$/)
  })

  it('isole par companyId — un compteur par société', async () => {
    prismaMock.invoice.count.mockResolvedValueOnce(10)
    await nextInvoiceReference('cmp1')
    expect(prismaMock.invoice.count).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 'cmp1' }) }),
    )
    prismaMock.invoice.count.mockResolvedValueOnce(0)
    await nextInvoiceReference('cmp2')
    expect(prismaMock.invoice.count).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 'cmp2' }) }),
    )
  })

  it('utilise le tx fourni avec advisory lock', async () => {
    // tx is a "subset" of PrismaClient — vitest-mock-extended permet de
    // créer un mock partiel avec le minimum requis.
    const tx = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>
    tx.$executeRaw.mockResolvedValue(0 as unknown as never)
    tx.invoice.count.mockResolvedValue(2)
    const year = new Date().getFullYear()
    const ref = await nextInvoiceReference('cmp1', tx as unknown as Parameters<typeof nextInvoiceReference>[1])
    expect(tx.$executeRaw).toHaveBeenCalled()  // B3 : advisory lock pris
    expect(ref).toBe(`FA-${year}-003`)
  })
})
