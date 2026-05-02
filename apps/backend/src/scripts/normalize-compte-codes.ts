/**
 * normalize-compte-codes.ts
 *
 * Migration one-shot : normalise tous les numéros de compte existants.
 *
 * Règle :
 *   • Purement numérique ET longueur < 9  →  complété à 9 chiffres (zéros à droite)
 *   • Alphanumérique                       →  conservé tel quel
 *
 * Tables mises à jour :
 *   1. account_plans.numero
 *   2. journal_entries.compte
 *
 * Usage :
 *   npx tsx src/scripts/normalize-compte-codes.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function normalize(code: string): string {
  return /^\d+$/.test(code) ? code.padEnd(9, '0') : code
}

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log(' Normalisation des numéros de compte (→ 9 chiffres)')
  console.log('═══════════════════════════════════════════════════\n')

  // ── 1. AccountPlan ──────────────────────────────────────────────────────────

  console.log('── AccountPlan ─────────────────────────────────────')

  const allPlans = await prisma.accountPlan.findMany({
    select: { id: true, companyId: true, numero: true },
  })

  // Ne garder que ceux dont le code est purement numérique ET trop court
  const toNormalizePlans = allPlans.filter(
    p => /^\d+$/.test(p.numero) && p.numero.length < 9,
  )

  console.log(`  Comptes à normaliser : ${toNormalizePlans.length} / ${allPlans.length}`)

  let planUpdated = 0
  let planMerged  = 0
  let planSkipped = 0

  for (const plan of toNormalizePlans) {
    const padded = normalize(plan.numero)

    // Vérifier si le code padded existe déjà pour la même entreprise
    const conflict = await prisma.accountPlan.findUnique({
      where: { companyId_numero: { companyId: plan.companyId, numero: padded } },
    })

    if (conflict) {
      // Le compte normalisé existe déjà → on redirige les écritures et on désactive le doublon
      await prisma.journalEntry.updateMany({
        where: { companyId: plan.companyId, compte: plan.numero },
        data:  { compte: padded },
      })
      await prisma.accountPlan.update({
        where: { id: plan.id },
        data:  { isActive: false },
      })
      console.log(`  [FUSIONNÉ]  ${plan.numero.padEnd(9)} → ${padded}  (doublon désactivé)`)
      planMerged++
    } else {
      // Pas de conflit → renommage direct
      try {
        await prisma.accountPlan.update({
          where: { id: plan.id },
          data:  { numero: padded },
        })
        console.log(`  [OK]        ${plan.numero.padEnd(9)} → ${padded}`)
        planUpdated++
      } catch (e) {
        console.error(`  [ERREUR]    ${plan.numero} → ${padded}`, e)
        planSkipped++
      }
    }
  }

  console.log(`\n  Résultat AccountPlan :`)
  console.log(`    Renommés  : ${planUpdated}`)
  console.log(`    Fusionnés : ${planMerged}`)
  console.log(`    Ignorés   : ${planSkipped}`)

  // ── 2. JournalEntry ─────────────────────────────────────────────────────────

  console.log('\n── JournalEntry ────────────────────────────────────')

  // Récupérer tous les comptes distincts qui sont courts et purement numériques
  const distinctComptes = await prisma.journalEntry.findMany({
    distinct: ['compte'],
    select:   { compte: true },
  })

  const shortComptes = distinctComptes
    .map(r => r.compte)
    .filter(c => /^\d+$/.test(c) && c.length < 9)

  console.log(`  Comptes distincts à normaliser : ${shortComptes.length}`)

  let journalUpdated = 0
  for (const compte of shortComptes) {
    const padded = normalize(compte)
    const { count } = await prisma.journalEntry.updateMany({
      where: { compte },
      data:  { compte: padded },
    })
    console.log(`  [OK]  ${compte.padEnd(9)} → ${padded}  (${count} ligne${count > 1 ? 's' : ''})`)
    journalUpdated += count
  }

  console.log(`\n  Lignes de journal mises à jour : ${journalUpdated}`)

  // ── Résumé ──────────────────────────────────────────────────────────────────

  console.log('\n═══════════════════════════════════════════════════')
  console.log(' Migration terminée.')
  console.log(`   AccountPlan  : ${planUpdated + planMerged} traités`)
  console.log(`   JournalEntry : ${journalUpdated} lignes mises à jour`)
  console.log('═══════════════════════════════════════════════════\n')
}

main()
  .catch(e => { console.error('Erreur fatale :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
