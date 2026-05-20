/**
 * DTOs Zod pour les routes accounting qui acceptent un body.
 *
 * Avant : validation manuelle ad-hoc (`Number(debit) || 0`, `String(x).trim()`).
 * Faille hygiène : un payload malformé pouvait traverser (objets imbriqués
 * castés en string bizarre, array sans borne max → DoS potentiel, etc.).
 *
 * Maintenant : Zod refuse strict avant que le handler ne soit même appelé.
 */
import { z } from 'zod'

// ── Helpers ──────────────────────────────────────────────────────────────────

const compteSchema = z
  .string()
  .min(1, 'Compte requis')
  .max(20, 'Numéro de compte trop long')
  .regex(/^[0-9A-Z]+$/, 'Le compte ne doit contenir que des chiffres et lettres majuscules')
  .trim()

const libelleSchema = z
  .string()
  .min(1, 'Libellé requis')
  .max(255, 'Libellé trop long')
  .trim()

const cuidSchema = z.string().min(20, 'Identifiant invalide').max(40, 'Identifiant invalide')
// CUID format : c + 24 chars alphanumériques (Prisma @default(cuid()))

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Date au format ISO requise (YYYY-MM-DD)')

const amountSchema = z
  .number()
  .nonnegative('Montant doit être positif ou zéro')
  .max(1_000_000_000_000, 'Montant déraisonnable') // 1000 milliards = limite raisonnable
  .finite()

const journalCodeSchema = z
  .string()
  .min(2, 'Code journal trop court')
  .max(10, 'Code journal trop long')
  .regex(/^[A-Z0-9]+$/, 'Le code journal doit être en majuscules')
  .trim()

// ── DTOs ─────────────────────────────────────────────────────────────────────

/** Ligne d'une écriture (partie d'une pièce double-partie) */
export const JournalLineDto = z.object({
  compte:         compteSchema,
  libelle:        libelleSchema,
  intituleCompte: z.string().max(255).trim().optional(),
  debit:          amountSchema,
  credit:         amountSchema,
}).refine(
  (l) => l.debit > 0 || l.credit > 0,
  { message: 'Une ligne doit avoir un débit OU un crédit non nul' },
).refine(
  (l) => !(l.debit > 0 && l.credit > 0),
  { message: 'Une ligne ne peut pas être à la fois débitée ET créditée' },
)

/** POST /api/accounting/journal/batch — pièce multi-lignes équilibrée */
export const CreateJournalEntryBatchDto = z.object({
  fiscalYearId: cuidSchema,
  date:         dateStringSchema,
  journal:      journalCodeSchema,
  reference:    z.string().max(50).trim().optional(),
  lines:        z.array(JournalLineDto).min(2, 'Au moins 2 lignes requises (partie double)').max(100, 'Maximum 100 lignes par pièce'),
}).refine(
  (e) => {
    // Partie double : somme débits == somme crédits
    const totalDebit  = e.lines.reduce((sum, l) => sum + l.debit, 0)
    const totalCredit = e.lines.reduce((sum, l) => sum + l.credit, 0)
    return Math.abs(totalDebit - totalCredit) < 0.01 // tolérance arrondi
  },
  { message: 'La pièce n\'est pas équilibrée (débits ≠ crédits)' },
)

/** POST /api/accounting/journal — écriture unique (legacy, déconseillé) */
export const CreateJournalEntryDto = z.object({
  fiscalYearId: cuidSchema,
  date:         dateStringSchema,
  journal:      journalCodeSchema,
  compte:       compteSchema,
  libelle:      libelleSchema,
  debit:        amountSchema,
  credit:       amountSchema,
  reference:    z.string().max(50).trim().optional(),
}).refine(
  (e) => e.debit > 0 || e.credit > 0,
  { message: 'Au moins un montant (débit ou crédit) doit être non nul' },
).refine(
  (e) => !(e.debit > 0 && e.credit > 0),
  { message: 'Une écriture ne peut pas être à la fois débitée ET créditée' },
)

export type JournalLineDto              = z.infer<typeof JournalLineDto>
export type CreateJournalEntryBatchDto  = z.infer<typeof CreateJournalEntryBatchDto>
export type CreateJournalEntryDto       = z.infer<typeof CreateJournalEntryDto>
