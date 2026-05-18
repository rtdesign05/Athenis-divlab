import { describe, it, expect } from 'vitest'
import {
  TVA_CM,
  TVA_FR,
  TVA_UEMOA,
  IRPP_BAREME_CM,
  IS_CM,
  CNPS_PLAFOND_MENSUEL,
  defaultVatRate,
  defaultCurrency,
} from './taxConstants.js'

describe('taxConstants — valeurs DGI Cameroun 2026', () => {
  it('TVA Cameroun = 19,25% (CGI Article 142)', () => {
    expect(TVA_CM).toBe(0.1925)
  })
  it('TVA France = 20% (taux normal CGI 278)', () => {
    expect(TVA_FR).toBe(0.20)
  })
  it('TVA UEMOA (CI/SN/GA/TG) = 18%', () => {
    expect(TVA_UEMOA).toBe(0.18)
  })
  it('IS Cameroun = 33%', () => {
    expect(IS_CM).toBe(0.33)
  })
  it('Plafond CNPS Cameroun = 750 000 FCFA/mois', () => {
    expect(CNPS_PLAFOND_MENSUEL).toBe(750_000)
  })
})

describe('IRPP_BAREME_CM — tranches progressives', () => {
  it('contient 4 tranches', () => {
    expect(IRPP_BAREME_CM).toHaveLength(4)
  })
  it('les taux sont croissants', () => {
    for (let i = 1; i < IRPP_BAREME_CM.length; i++) {
      expect(IRPP_BAREME_CM[i]!.taux).toBeGreaterThan(IRPP_BAREME_CM[i - 1]!.taux)
    }
  })
  it('la dernière tranche est ouverte (Infinity)', () => {
    expect(IRPP_BAREME_CM[IRPP_BAREME_CM.length - 1]!.jusqua).toBe(Infinity)
  })
  it('taux maximum = 35%', () => {
    expect(IRPP_BAREME_CM[IRPP_BAREME_CM.length - 1]!.taux).toBe(0.35)
  })
})

describe('defaultVatRate', () => {
  it('CM → 19,25%', () => {
    expect(defaultVatRate('CM')).toBe(TVA_CM)
    expect(defaultVatRate('cm')).toBe(TVA_CM) // insensible à la casse
  })
  it('FR → 20%', () => {
    expect(defaultVatRate('FR')).toBe(TVA_FR)
  })
  it('UEMOA hors CM → 18%', () => {
    expect(defaultVatRate('CI')).toBe(TVA_UEMOA)
    expect(defaultVatRate('SN')).toBe(TVA_UEMOA)
    expect(defaultVatRate('GA')).toBe(TVA_UEMOA)
    expect(defaultVatRate('TG')).toBe(TVA_UEMOA)
    expect(defaultVatRate('BJ')).toBe(TVA_UEMOA)
    expect(defaultVatRate('BF')).toBe(TVA_UEMOA)
  })
  it('code inconnu → fallback FR (20%)', () => {
    expect(defaultVatRate('US')).toBe(TVA_FR)
    expect(defaultVatRate('')).toBe(TVA_FR)
  })
})

describe('defaultCurrency', () => {
  it('FRANCE → EUR', () => {
    expect(defaultCurrency('FRANCE')).toBe('EUR')
  })
  it('OHADA → XAF', () => {
    expect(defaultCurrency('OHADA')).toBe('XAF')
  })
  it('autre → XAF (par défaut Afrique)', () => {
    expect(defaultCurrency('UEMOA')).toBe('XAF')
  })
})
