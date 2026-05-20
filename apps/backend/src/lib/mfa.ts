/**
 * Helpers pour MFA par email/SMS : génération de codes 6 chiffres,
 * hashing SHA-256 avant stockage, comparaison constante-temps.
 *
 * Pourquoi hasher les codes ?
 *   Un dump DB ne doit pas permettre à un attaquant de relire les codes
 *   actifs. SHA-256 suffit ici (vs bcrypt pour les passwords) car les
 *   codes ont une entropie limitée (6 chiffres = 20 bits) ET une durée
 *   de vie courte (10 min), donc bcrypt serait du gâchis CPU.
 */
import crypto from 'crypto'

export const MFA_CODE_TTL_MS    = 10 * 60 * 1000  // 10 minutes
export const MFA_MAX_ATTEMPTS   = 5               // après 5 essais, invalider le code

/** Génère un code à 6 chiffres avec entropie crypto (jamais Math.random) */
export function generateMfaCode(): string {
  // crypto.randomInt(0, 1000000) puis pad à 6 chiffres
  const n = crypto.randomInt(0, 1_000_000)
  return n.toString().padStart(6, '0')
}

/** Hash SHA-256 hex du code (pour stockage DB) */
export function hashMfaCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex')
}

/** Comparaison constante-temps pour éviter les timing attacks */
export function safeEqualHashes(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length) return false
    return crypto.timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

/**
 * Format E.164 strict : '+' suivi de 8 à 15 chiffres.
 * Accepte aussi les formats avec espaces/tirets que l'on normalise.
 */
export function normalizePhoneE164(input: string): string | null {
  const cleaned = input.replace(/[\s\-().]/g, '')
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned
  return null
}

/** Masque un numéro de téléphone : +237691234567 → +237******567 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return '••••'
  return phone.slice(0, 4) + '*'.repeat(phone.length - 7) + phone.slice(-3)
}

/** Masque un email : mouafoulrich15@gmail.com → m••••••••••5@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '••••@••••'
  if (local.length <= 2) return `${local[0]}*@${domain}`
  return `${local[0]}${'•'.repeat(Math.max(1, local.length - 2))}${local.slice(-1)}@${domain}`
}
