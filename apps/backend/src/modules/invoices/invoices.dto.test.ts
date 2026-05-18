import { describe, it, expect } from 'vitest'
import { CreateInvoiceDto } from './invoices.dto.js'

const baseInvoice = {
  clientId:  'cl_demo',
  modele:    'standard' as const,
  issueDate: new Date('2026-05-01'),
  dueDate:   new Date('2026-05-31'),
  subtotal:  100,
  taxRate:   20,
  lines:     [],
}

describe('CreateInvoiceDto — schéma de base', () => {
  it('accepte une facture sans lignes (subtotal libre)', () => {
    const result = CreateInvoiceDto.safeParse(baseInvoice)
    expect(result.success).toBe(true)
  })

  it('refuse un clientId vide', () => {
    const result = CreateInvoiceDto.safeParse({ ...baseInvoice, clientId: '' })
    expect(result.success).toBe(false)
  })

  it('refuse un subtotal négatif ou nul', () => {
    expect(CreateInvoiceDto.safeParse({ ...baseInvoice, subtotal: -10 }).success).toBe(false)
    expect(CreateInvoiceDto.safeParse({ ...baseInvoice, subtotal: 0 }).success).toBe(false)
  })

  it('refuse un taxRate > 100', () => {
    expect(CreateInvoiceDto.safeParse({ ...baseInvoice, taxRate: 150 }).success).toBe(false)
  })
})

// B4 : superrefine cohérence subtotal vs Σ(lignes)
describe('CreateInvoiceDto — B4 cohérence subtotal/lignes', () => {
  it('accepte quand Σ(montantHT) = subtotal', () => {
    const result = CreateInvoiceDto.safeParse({
      ...baseInvoice,
      subtotal: 150,
      lines: [
        { description: 'A', quantite: 1, unite: 'pc', prixUnitaireHT: 100, tvaRate: 20, montantHT: 100 },
        { description: 'B', quantite: 1, unite: 'pc', prixUnitaireHT: 50,  tvaRate: 20, montantHT: 50 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('accepte une tolérance de 0,01', () => {
    const result = CreateInvoiceDto.safeParse({
      ...baseInvoice,
      subtotal: 100.005,
      lines: [
        { description: 'A', quantite: 1, unite: 'pc', prixUnitaireHT: 100, tvaRate: 20, montantHT: 100 },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejette quand subtotal ≠ Σ(montantHT) au-delà de 0,01', () => {
    const result = CreateInvoiceDto.safeParse({
      ...baseInvoice,
      subtotal: 200, // mais Σ = 150
      lines: [
        { description: 'A', quantite: 1, unite: 'pc', prixUnitaireHT: 100, tvaRate: 20, montantHT: 100 },
        { description: 'B', quantite: 1, unite: 'pc', prixUnitaireHT: 50,  tvaRate: 20, montantHT: 50 },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]!.message).toMatch(/Incohérence/)
      expect(result.error.issues[0]!.path).toContain('subtotal')
    }
  })

  it('ignore le check si lines est vide', () => {
    const result = CreateInvoiceDto.safeParse({
      ...baseInvoice,
      subtotal: 999,
      lines: [],
    })
    expect(result.success).toBe(true)
  })
})
