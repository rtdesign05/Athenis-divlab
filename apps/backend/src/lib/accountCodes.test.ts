import { describe, it, expect } from 'vitest'
import {
  normalizeAccountCode,
  tryNormalizeAccountCode,
  isPurelyNumeric,
  isAllowedAlphanumeric,
  ACCOUNT_TARGET_LENGTH,
} from './accountCodes.js'

describe('accountCodes', () => {
  describe('isPurelyNumeric', () => {
    it('renvoie true pour les chiffres uniquement', () => {
      expect(isPurelyNumeric('411')).toBe(true)
      expect(isPurelyNumeric('123456789')).toBe(true)
    })
    it('renvoie false pour les chaînes contenant des lettres', () => {
      expect(isPurelyNumeric('411ABC')).toBe(false)
      expect(isPurelyNumeric('A411')).toBe(false)
    })
  })

  describe('isAllowedAlphanumeric', () => {
    it('accepte les préfixes 401, 411, 421, 422', () => {
      expect(isAllowedAlphanumeric('401SOCIETE')).toBe(true)
      expect(isAllowedAlphanumeric('411CLIENT')).toBe(true)
      expect(isAllowedAlphanumeric('421PERS')).toBe(true)
      expect(isAllowedAlphanumeric('422PERS')).toBe(true)
    })
    it('refuse les autres préfixes', () => {
      expect(isAllowedAlphanumeric('601ABC')).toBe(false)
      expect(isAllowedAlphanumeric('512ABC')).toBe(false)
    })
    it('refuse les caractères spéciaux', () => {
      expect(isAllowedAlphanumeric('411-CLIENT')).toBe(false)
      expect(isAllowedAlphanumeric('411 CLIENT')).toBe(false)
    })
  })

  describe('normalizeAccountCode — numéros purement numériques', () => {
    it('complète à droite avec des zéros pour atteindre la longueur cible', () => {
      expect(normalizeAccountCode('601')).toBe('601000000')
      expect(normalizeAccountCode('411')).toBe('411000000')
      expect(normalizeAccountCode('6')).toBe('600000000')
    })
    it('conserve les codes déjà à la longueur cible', () => {
      expect(normalizeAccountCode('601000000')).toBe('601000000')
      expect(normalizeAccountCode('411000001')).toBe('411000001')
    })
    it('rejette les codes numériques trop longs', () => {
      expect(() => normalizeAccountCode('1234567890')).toThrow(/trop long/)
    })
    it('retourne exactement la longueur cible', () => {
      const result = normalizeAccountCode('411')
      expect(result.length).toBe(ACCOUNT_TARGET_LENGTH)
    })
  })

  describe('normalizeAccountCode — alphanumériques tiers', () => {
    it('met en majuscule sans padding', () => {
      expect(normalizeAccountCode('411client')).toBe('411CLIENT')
      expect(normalizeAccountCode('401SoctX')).toBe('401SOCTX') // max 9 chars
    })
    it('supprime les espaces internes', () => {
      expect(normalizeAccountCode('411 CLIENT')).toBe('411CLIENT')
    })
    it('rejette les alphanumériques non-tiers', () => {
      expect(() => normalizeAccountCode('601ABC')).toThrow(/tiers/)
      expect(() => normalizeAccountCode('512ABC')).toThrow(/tiers/)
    })
    it('rejette les codes trop longs', () => {
      expect(() => normalizeAccountCode('411TRESLONGCLIENT')).toThrow(/trop long/)
    })
  })

  describe('normalizeAccountCode — cas limites', () => {
    it('rejette les chaînes vides', () => {
      expect(() => normalizeAccountCode('')).toThrow(/requis/)
      expect(() => normalizeAccountCode('   ')).toThrow(/requis/)
    })
    it('rejette les caractères spéciaux', () => {
      expect(() => normalizeAccountCode('411-CLIENT')).toThrow(/invalides/i)
      expect(() => normalizeAccountCode('411.CLIENT')).toThrow(/invalides/i)
      expect(() => normalizeAccountCode('411@CLIENT')).toThrow(/invalides/i)
    })
  })

  describe('tryNormalizeAccountCode', () => {
    it('renvoie le code normalisé en cas de succès', () => {
      expect(tryNormalizeAccountCode('601')).toBe('601000000')
    })
    it('renvoie null en cas d\'erreur (au lieu de throw)', () => {
      expect(tryNormalizeAccountCode('')).toBeNull()
      expect(tryNormalizeAccountCode('601ABC')).toBeNull()
      expect(tryNormalizeAccountCode('1234567890')).toBeNull()
    })
  })
})
