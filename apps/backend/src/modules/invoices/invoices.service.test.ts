import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset, type DeepMockProxy } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

// On mock `prisma` AVANT d'importer le service.
const prismaMock = mockDeep<PrismaClient>()
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

// Import après le vi.mock pour que le service utilise le mock.
const { nextInvoiceReference } = await import('./invoices.service.js')

/**
 * Tests sur nextInvoiceReference après fix V18 :
 *   - utilise findFirst({orderBy: 'reference desc'}) au lieu de count()
 *   - le numéro suivant = max(reference) + 1 (pas count + 1)
 *   - immunisé contre la suppression d'une facture intermédiaire
 */
describe('nextInvoiceReference — génération séquentielle FA-YYYY-NNN', () => {
  beforeEach(() => { mockReset(prismaMock) })

  it('génère FA-YYYY-001 si aucune facture pour l\'année', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(null)
    const year = new Date().getFullYear()
    const ref = await nextInvoiceReference('cmp1')
    expect(ref).toBe(`FA-${year}-001`)
    expect(prismaMock.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where:   { companyId: 'cmp1', reference: { startsWith: `FA-${year}-` } },
        orderBy: { reference: 'desc' },
      }),
    )
  })

  it('incrémente correctement après plusieurs factures (extrait du max)', async () => {
    const year = new Date().getFullYear()
    prismaMock.invoice.findFirst.mockResolvedValue({ reference: `FA-${year}-005` } as never)
    const ref = await nextInvoiceReference('cmp1')
    expect(ref).toBe(`FA-${year}-006`)
  })

  it('V18 — immunisé contre les suppressions intermédiaires', async () => {
    // Cas : 5 factures créées, la 3e supprimée → max ref reste FA-YYYY-005
    // Avant le fix : count()=4 → FA-YYYY-005 (collision !) ; après : FA-YYYY-006
    const year = new Date().getFullYear()
    prismaMock.invoice.findFirst.mockResolvedValue({ reference: `FA-${year}-005` } as never)
    const ref = await nextInvoiceReference('cmp1')
    expect(ref).toBe(`FA-${year}-006`)
  })

  it('respecte le padding 3 chiffres', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(null)
    const ref = await nextInvoiceReference('cmp1')
    expect(ref).toMatch(/FA-\d{4}-\d{3}$/)
  })

  it('isole par companyId — un compteur par société', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(null)
    const year = new Date().getFullYear()
    await nextInvoiceReference('cmp1')
    expect(prismaMock.invoice.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'cmp1' }),
      }),
    )
    await nextInvoiceReference('cmp2')
    expect(prismaMock.invoice.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 'cmp2' }),
      }),
    )
    expect(year).toBeGreaterThan(2024)  // sanity check
  })

  it('utilise le tx fourni avec advisory lock', async () => {
    const tx = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>
    tx.$executeRaw.mockResolvedValue(0 as unknown as never)
    const year = new Date().getFullYear()
    tx.invoice.findFirst.mockResolvedValue({ reference: `FA-${year}-002` } as never)
    const ref = await nextInvoiceReference('cmp1', tx as unknown as Parameters<typeof nextInvoiceReference>[1])
    expect(tx.$executeRaw).toHaveBeenCalled()  // B3 : advisory lock pris
    expect(ref).toBe(`FA-${year}-003`)
  })
})
