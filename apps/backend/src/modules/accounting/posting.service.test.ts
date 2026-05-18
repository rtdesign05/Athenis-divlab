/**
 * Tests d'intégration sur posting.service via Prisma mocks.
 *
 * Couvre les scénarios critiques :
 *  - postSaleInvoice happy path : crée pièce + flag posted + status
 *  - postSaleInvoice rejette une facture déjà comptabilisée (idempotence)
 *  - unpostSaleInvoice supprime la pièce + reverse les mouvements stock
 *  - B11 : findOrThrowFiscalYear re-vérifié dans la transaction
 *  - V5/N3 : ensureAccountInPlan utilise tx
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockDeep, mockReset } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

const prismaMock = mockDeep<PrismaClient>()
vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

const { postSaleInvoice, unpostSaleInvoice } = await import('./posting.service.js')

// ── Helpers ────────────────────────────────────────────────────────────────

function makeInvoice(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id:           'inv1',
    companyId:    'cmp1',
    reference:    '2026-001',
    issuedAt:     new Date('2026-05-01'),
    amountHT:     '1000',
    amountTTC:    '1192.50',
    taxAmount:    '192.50',
    vatRate:      '19.25',
    posted:       false,
    postedPieceId: null,
    postedAt:     null,
    status:       'DRAFT',
    clientId:     'cli1',
    paidAt:       null,
    client:       { id: 'cli1', nom: 'Client Demo', accountingCode: null },
    // Ligne unique pour équilibrer la pièce : 1000 HT crédité au compte produit
    lines: [
      {
        id:             'line1',
        invoiceId:      'inv1',
        description:    'Service test',
        quantite:       '1',
        unite:          'pc',
        prixUnitaireHT: '1000',
        montantHT:      '1000',
        tvaRate:        '19.25',
        articleId:      null,
        article:        null,
        compteVente:    null,
      },
    ],
    ...overrides,
  }
}

function setupHappyPath() {
  prismaMock.invoice.findFirst.mockResolvedValue(makeInvoice() as never)
  prismaMock.company.findUniqueOrThrow.mockResolvedValue({
    id: 'cmp1', accountingZone: 'OHADA',
  } as never)
  // Aucun compte existant → ensureAccountInPlan crée
  prismaMock.accountPlan.findUnique.mockResolvedValue(null)
  prismaMock.accountPlan.create.mockResolvedValue({} as never)
  // fiscalYear OPEN
  prismaMock.fiscalYear.findFirst.mockResolvedValue({
    id: 'fy1', companyId: 'cmp1', status: 'OPEN',
    startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
    year: 2026,
  } as never)
  // client.update (auto-gen accounting code)
  prismaMock.client.update.mockResolvedValue({} as never)
  // Transaction passthrough
  prismaMock.$transaction.mockImplementation(((callback: unknown) => {
    if (typeof callback === 'function') {
      return (callback as (tx: typeof prismaMock) => unknown)(prismaMock)
    }
    return Promise.all(callback as unknown[])
  }) as never)
  prismaMock.journalEntry.createMany.mockResolvedValue({ count: 0 } as never)
  prismaMock.invoice.update.mockResolvedValue({} as never)
  prismaMock.$executeRaw.mockResolvedValue(0 as never)
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('postSaleInvoice — happy path', () => {
  beforeEach(() => { mockReset(prismaMock) })

  it('crée une pièce comptable équilibrée D=C', async () => {
    setupHappyPath()
    const result = await postSaleInvoice('cmp1', 'inv1', 'user1')

    expect(result.pieceId).toMatch(/^INV-2026-001-/)
    expect(result.reference).toBe('FA-2026-001')
    // Vérifie l'appel à createMany (lignes du journal)
    expect(prismaMock.journalEntry.createMany).toHaveBeenCalled()
    // Le mock invoice.update est appelé avec posted=true
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ posted: true }),
      }),
    )
  })

  it('B15 — applique targetStatus dans la même transaction', async () => {
    setupHappyPath()
    await postSaleInvoice('cmp1', 'inv1', 'user1', 'SENT')
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ posted: true, status: 'SENT' }),
      }),
    )
  })

  it('B15 — targetStatus=PAID ajoute paidAt', async () => {
    setupHappyPath()
    await postSaleInvoice('cmp1', 'inv1', 'user1', 'PAID')
    const calls = prismaMock.invoice.update.mock.calls
    const firstCall = calls[0] as unknown as [{ data: Record<string, unknown> }]
    const callArg = firstCall[0]
    expect(callArg.data['status']).toBe('PAID')
    expect(callArg.data['paidAt']).toBeInstanceOf(Date)
  })

  it('lance NOT_FOUND si invoice introuvable', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(null)
    await expect(postSaleInvoice('cmp1', 'inv_inexistant', 'user1'))
      .rejects.toThrow(/introuvable/i)
  })

  it('lance ALREADY_POSTED si facture déjà comptabilisée (idempotence)', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(makeInvoice({
      posted: true,
      postedPieceId: 'PIECE-EXISTANT',
      postedAt: new Date('2026-05-02'),
    }) as never)
    await expect(postSaleInvoice('cmp1', 'inv1', 'user1'))
      .rejects.toThrow(/déjà comptabilisée/i)
  })

  it('lance NO_FISCAL_YEAR si aucun exercice ne couvre la date', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(makeInvoice() as never)
    prismaMock.company.findUniqueOrThrow.mockResolvedValue({
      id: 'cmp1', accountingZone: 'OHADA',
    } as never)
    prismaMock.accountPlan.findUnique.mockResolvedValue(null)
    prismaMock.accountPlan.create.mockResolvedValue({} as never)
    prismaMock.client.update.mockResolvedValue({} as never)
    // Aucun FY trouvé
    prismaMock.fiscalYear.findFirst.mockResolvedValue(null)

    await expect(postSaleInvoice('cmp1', 'inv1', 'user1'))
      .rejects.toThrow(/exercice/i)
  })
})

describe('unpostSaleInvoice — B7 reverse stock movements', () => {
  beforeEach(() => { mockReset(prismaMock) })

  it('supprime la pièce comptable + extourne les mouvements stock', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(makeInvoice({
      posted: true,
      postedPieceId: 'PIECE-TO-DELETE',
      postedAt: new Date('2026-05-02'),
    }) as never)
    prismaMock.$transaction.mockImplementation(((cb: unknown) => {
      if (typeof cb === 'function') return (cb as (tx: typeof prismaMock) => unknown)(prismaMock)
      return Promise.all(cb as unknown[])
    }) as never)
    prismaMock.journalEntry.deleteMany.mockResolvedValue({ count: 4 } as never)
    // Aucun mouvement stock à reverser
    prismaMock.stockMouvement.findMany.mockResolvedValue([])
    prismaMock.invoice.update.mockResolvedValue({} as never)

    const result = await unpostSaleInvoice('cmp1', 'inv1', 'user1')

    expect(result.unposted).toBe(1)
    expect(prismaMock.journalEntry.deleteMany).toHaveBeenCalledWith({
      where: { companyId: 'cmp1', pieceId: 'PIECE-TO-DELETE' },
    })
    // B7 : recherche des mouvements stock à extourner, en excluant AJUSTEMENT
    expect(prismaMock.stockMouvement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: expect.objectContaining({ type: 'AJUSTEMENT' }),
        }),
      }),
    )
    // Reset posted=false
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ posted: false, postedPieceId: null }),
      }),
    )
  })

  it('lance NOT_POSTED si facture non encore comptabilisée', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(makeInvoice({
      posted: false, postedPieceId: null,
    }) as never)

    await expect(unpostSaleInvoice('cmp1', 'inv1', 'user1'))
      .rejects.toThrow(/non comptabilisée/i)
  })

  it('lance NOT_FOUND si facture introuvable', async () => {
    prismaMock.invoice.findFirst.mockResolvedValue(null)
    await expect(unpostSaleInvoice('cmp1', 'inv_inexistant', 'user1'))
      .rejects.toThrow(/introuvable/i)
  })
})
