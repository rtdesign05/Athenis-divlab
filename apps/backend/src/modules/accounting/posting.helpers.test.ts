import { describe, it, expect } from 'vitest'
import {
  defaultAccounts,
  computeCmupAfterEntry,
  verifyBalance,
  defaultTreasuryAccount,
  inferAccountType,
} from './posting.helpers.js'

describe('defaultAccounts — comptes par défaut SYSCOHADA/PCG', () => {
  it('OHADA → TVA collectée 4431, TVA déductible 4452', () => {
    const a = defaultAccounts('OHADA')
    expect(a.tvaCollectee).toBe('4431')
    expect(a.tvaDeductible).toBe('4452')
  })
  it('FRANCE → TVA collectée 44571, TVA déductible 44566', () => {
    const a = defaultAccounts('FRANCE')
    expect(a.tvaCollectee).toBe('44571')
    expect(a.tvaDeductible).toBe('44566')
  })
  it('Zone inconnue → fallback OHADA', () => {
    const a = defaultAccounts('UEMOA')
    expect(a.tvaCollectee).toBe('4431')
  })
  it('clients et fournisseurs identiques quelle que soit la zone', () => {
    expect(defaultAccounts('OHADA').client).toBe('411')
    expect(defaultAccounts('FRANCE').client).toBe('411')
    expect(defaultAccounts('OHADA').supplier).toBe('401')
    expect(defaultAccounts('FRANCE').supplier).toBe('401')
  })
  it('journaux : VTE / ACH', () => {
    const a = defaultAccounts('OHADA')
    expect(a.journalVente).toBe('VTE')
    expect(a.journalAchat).toBe('ACH')
  })
})

describe('computeCmupAfterEntry — formule CMUP', () => {
  it('première entrée (stockAvant=0) → CMUP = prixAchat', () => {
    expect(computeCmupAfterEntry(0, 0, 10, 100)).toBe(100)
  })
  it('entrée additionnelle au même prix → CMUP inchangé', () => {
    // Stock 10 à 100, on rajoute 10 à 100 → CMUP doit rester 100
    expect(computeCmupAfterEntry(10, 100, 10, 100)).toBe(100)
  })
  it('entrée à un prix différent → moyenne pondérée', () => {
    // Stock 10 à 100, on rajoute 10 à 200 → CMUP = (1000 + 2000) / 20 = 150
    expect(computeCmupAfterEntry(10, 100, 10, 200)).toBe(150)
  })
  it('quantité dégressive ne fait pas planter', () => {
    // Edge case : ce helper sert pour ENTREE uniquement, mais robustesse
    const cmup = computeCmupAfterEntry(10, 100, 0, 0)
    expect(Number.isFinite(cmup)).toBe(true)
  })
  it('stockApres ≤ 0 → renvoie prixAchat (évite /0)', () => {
    expect(computeCmupAfterEntry(0, 100, 0, 50)).toBe(50)
  })
})

describe('verifyBalance — vérification équilibre comptable D=C', () => {
  it('pièce équilibrée → balanced=true', () => {
    const result = verifyBalance([
      { debit: 100, credit: 0 },
      { debit: 0,   credit: 100 },
    ])
    expect(result.balanced).toBe(true)
    expect(result.delta).toBe(0)
  })
  it('détecte un déséquilibre > tolérance', () => {
    const result = verifyBalance([
      { debit: 100, credit: 0 },
      { debit: 0,   credit: 50 },
    ])
    expect(result.balanced).toBe(false)
    expect(result.delta).toBe(50)
  })
  it('tolère un écart ≤ 0,01 par défaut (arrondis)', () => {
    const result = verifyBalance([
      { debit: 100.005, credit: 0 },
      { debit: 0,       credit: 100 },
    ])
    expect(result.balanced).toBe(true)
  })
  it('rejette un écart > 0,01', () => {
    const result = verifyBalance([
      { debit: 100.05, credit: 0 },
      { debit: 0,      credit: 100 },
    ])
    expect(result.balanced).toBe(false)
  })
  it('accepte une tolérance custom (paie avec régul)', () => {
    const result = verifyBalance([
      { debit: 100, credit: 0 },
      { debit: 0,   credit: 99.5 },
    ], 1.0)
    expect(result.balanced).toBe(true)
  })
  it('ignore les debit/credit null/undefined', () => {
    const result = verifyBalance([
      { debit: 100,  credit: null },
      { debit: null, credit: 100 },
    ])
    expect(result.balanced).toBe(true)
  })
  it('renvoie les sommes individuelles pour debug', () => {
    const r = verifyBalance([
      { debit: 100, credit: 0 },
      { debit: 50,  credit: 0 },
      { debit: 0,   credit: 150 },
    ])
    expect(r.sumDebit).toBe(150)
    expect(r.sumCredit).toBe(150)
  })
})

describe('defaultTreasuryAccount', () => {
  it('OHADA → 521 (Banques)', () => {
    expect(defaultTreasuryAccount('OHADA')).toBe('521')
  })
  it('FRANCE → 512 (Banques)', () => {
    expect(defaultTreasuryAccount('FRANCE')).toBe('512')
  })
})

describe('inferAccountType — déduction du type depuis le numéro', () => {
  it('classe 1 → PASSIF (capitaux)', () => {
    expect(inferAccountType('101000000')).toBe('PASSIF')
  })
  it('classe 2 → ACTIF (immobilisations)', () => {
    expect(inferAccountType('215000000')).toBe('ACTIF')
  })
  it('classe 3 → ACTIF (stocks)', () => {
    expect(inferAccountType('311000000')).toBe('ACTIF')
  })
  it('41x (clients) → ACTIF', () => {
    expect(inferAccountType('411000000')).toBe('ACTIF')
    expect(inferAccountType('411CLIENT')).toBe('ACTIF')
  })
  it('40x (fournisseurs) → PASSIF', () => {
    expect(inferAccountType('401000000')).toBe('PASSIF')
  })
  it('44x (État) → PASSIF', () => {
    expect(inferAccountType('44571000')).toBe('PASSIF')
  })
  it('classe 5 → ACTIF (trésorerie)', () => {
    expect(inferAccountType('521000000')).toBe('ACTIF')
  })
  it('classe 6 → CHARGE', () => {
    expect(inferAccountType('601000000')).toBe('CHARGE')
    expect(inferAccountType('658000000')).toBe('CHARGE')
  })
  it('classe 7 → PRODUIT', () => {
    expect(inferAccountType('706000000')).toBe('PRODUIT')
    expect(inferAccountType('758000000')).toBe('PRODUIT')
  })
})
