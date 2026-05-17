/**
 * Régénère les écritures d'à-nouveau (AN) de l'exercice 2026 de Demo SA
 * à partir de l'état actuel des soldes de 2025.
 *
 * Pourquoi : les anciennes écritures AN-2026 reflètent un état obsolète de
 * 2025 (deux mauvaises pièces 110/120 avaient été insérées puis supprimées
 * après la clôture, mais l'AN n'a pas été régénéré → déséquilibre 8 900).
 *
 * Conforme SYSCOHADA :
 *  - Reprise des soldes classes 1-5 (bilan)
 *  - Détermination du résultat (Σ produits 7 − Σ charges 6)
 *  - Affectation à 110 (bénéfice) ou 119 (perte)
 */
import { PrismaClient } from '@prisma/client'
import { generateOpeningEntries } from '../modules/accounting/accounting.service.js'

const prisma = new PrismaClient()

async function main() {
  const company = await prisma.company.findFirst({ where: { nom: { contains: 'Demo' } } })
  if (!company) throw new Error('Demo SA introuvable')

  const fy2025 = await prisma.fiscalYear.findFirst({
    where: { companyId: company.id, year: 2025 },
  })
  if (!fy2025) throw new Error('FY 2025 introuvable')
  if (fy2025.status !== 'CLOSED')
    throw new Error(`FY 2025 doit être CLOSED (actuellement: ${fy2025.status})`)

  console.log(`\n🔧 Régénération des AN-2026 à partir de FY 2025 (${fy2025.status})\n`)

  const result = await generateOpeningEntries(company.id, fy2025.id, 'system-regenerate')

  console.log(`✅ ${result.generated} écriture(s) AN régénérée(s) dans FY ${result.nextYear}`)

  // Vérification
  const fy2026 = await prisma.fiscalYear.findFirst({
    where: { companyId: company.id, year: 2026 },
  })
  const an = await prisma.journalEntry.findMany({
    where:  { fiscalYearId: fy2026!.id, journal: 'AN' },
    orderBy: { compte: 'asc' },
  })
  let d = 0, c = 0
  console.log('\nÉcritures AN-2026 (post-régénération) :')
  for (const e of an) {
    const ed = Number(e.debit), ec = Number(e.credit)
    d += ed; c += ec
    console.log(`  ${e.compte} D=${ed.toFixed(0).padStart(8)} C=${ec.toFixed(0).padStart(8)} | ${e.libelle}`)
  }
  console.log(`\nTotal : D=${d.toFixed(0)} C=${c.toFixed(0)} | écart=${(d - c).toFixed(0)}`)
  if (Math.abs(d - c) < 0.01) console.log('✓ AN équilibré')
  else                        console.log('✗ AN toujours déséquilibré')
}

main().then(() => prisma.$disconnect()).catch(async e => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
