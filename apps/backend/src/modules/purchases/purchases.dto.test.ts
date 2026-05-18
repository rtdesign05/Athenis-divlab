import { describe, it, expect } from 'vitest'
import { CreatePurchaseOrderDto } from './purchases.dto.js'

const baseOrder = {
  fournisseur: 'Fournisseur SARL',
  objet:       'Achat de matières premières',
  date:        new Date('2026-05-01'),
  montantHT:   100,
  vatRate:     19.25,
  montantTTC:  119.25,
  lines: [
    { reference: 'A', designation: 'Article 1', quantite: 1, unite: 'pc', prixUnitaireHT: 100, montantHT: 100 },
  ],
}

describe('CreatePurchaseOrderDto — schéma de base', () => {
  it('accepte un ordre cohérent', () => {
    const result = CreatePurchaseOrderDto.safeParse(baseOrder)
    expect(result.success).toBe(true)
  })

  it('refuse fournisseur vide', () => {
    const result = CreatePurchaseOrderDto.safeParse({ ...baseOrder, fournisseur: '' })
    expect(result.success).toBe(false)
  })
})

// B4 : superrefine
describe('CreatePurchaseOrderDto — B4 cohérence montants', () => {
  it('rejette quand Σ(line.montantHT) ≠ montantHT', () => {
    const result = CreatePurchaseOrderDto.safeParse({
      ...baseOrder,
      montantHT:  200, // mais Σ lignes = 100
      montantTTC: 238.5,
    })
    expect(result.success).toBe(false)
  })

  it('rejette quand montantTTC ≠ HT × (1 + TVA/100)', () => {
    const result = CreatePurchaseOrderDto.safeParse({
      ...baseOrder,
      montantHT:  100,
      vatRate:    19.25,
      montantTTC: 150, // attendu : 119.25
    })
    expect(result.success).toBe(false)
  })

  it('accepte avec tolérance 0,01 sur le TTC (arrondi)', () => {
    const result = CreatePurchaseOrderDto.safeParse({
      ...baseOrder,
      montantHT:  100,
      vatRate:    19.25,
      montantTTC: 119.255, // 0.005 de delta — accepté (sous le seuil 0.01)
    })
    expect(result.success).toBe(true)
  })

  it('accepte un montant à zéro (cas don/régul)', () => {
    const result = CreatePurchaseOrderDto.safeParse({
      ...baseOrder,
      montantHT:  0,
      vatRate:    0,
      montantTTC: 0,
      lines: [
        { reference: 'A', designation: 'Don', quantite: 1, unite: 'pc', prixUnitaireHT: 0, montantHT: 0 },
      ],
    })
    expect(result.success).toBe(true)
  })
})
