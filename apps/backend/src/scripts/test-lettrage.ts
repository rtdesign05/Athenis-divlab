/**
 * Script de test du lettrage :
 *  - Crée une écriture de paiement (411 crédit 9600) qui solde FA-2026-001 (411 débit 9600)
 *  - Liste les ID nécessaires pour les tests d'API
 *  - Cleanup possible avec --cleanup
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TEST_REF = 'TEST-LETTRAGE-PAY-001'

async function main() {
  const cleanup = process.argv.includes('--cleanup')

  if (cleanup) {
    const del = await prisma.journalEntry.deleteMany({ where: { reference: TEST_REF } })
    console.log(`🧹 Supprimé ${del.count} écriture(s) de test`)
    return
  }

  const fy = await prisma.fiscalYear.findFirst({
    where: { year: 2026 },
    include: { company: { select: { id: true, nom: true } } },
  })
  if (!fy) throw new Error('FY 2026 introuvable')

  const company = fy.company
  console.log(`📁 Company: ${company.nom} | FY: ${fy.year} (${fy.id})`)

  // Vérifie qu'on n'a pas déjà créé l'écriture
  const existing = await prisma.journalEntry.findFirst({ where: { reference: TEST_REF } })
  if (existing) {
    console.log(`⚠️  Écriture de test déjà présente (id=${existing.id})`)
  } else {
    // Crée l'écriture de paiement : 411 crédit 9600 (contrepartie 521 débit 9600)
    const piece = await prisma.journalEntry.create({
      data: {
        companyId:    company.id,
        fiscalYearId: fy.id,
        date:         new Date('2026-02-15'),
        journal:      'BQ',
        compte:       '411',
        libelle:      'Encaissement Acme Corp (FA-2026-001)',
        debit:        0,
        credit:       9600,
        reference:    TEST_REF,
      },
    })
    console.log(`✅ Écriture de paiement créée : id=${piece.id}`)
  }

  // Liste les écritures du compte 411 sur 2026 (non lettrées)
  console.log('\n📋 Écritures non lettrées du compte 411 (2026) :')
  const entries = await prisma.journalEntry.findMany({
    where:   { fiscalYearId: fy.id, compte: '411', lettrage: null },
    orderBy: { date: 'asc' },
  })
  for (const e of entries) {
    console.log(`  ${e.id} | ${e.date.toISOString().slice(0,10)} | D:${e.debit} C:${e.credit} | ${e.libelle}`)
  }

  // Calcule l'équilibre
  const totalD = entries.reduce((s, e) => s + Number(e.debit), 0)
  const totalC = entries.reduce((s, e) => s + Number(e.credit), 0)
  console.log(`\n💰 Total non lettré : D=${totalD} C=${totalC} | Écart=${Math.abs(totalD - totalC)}`)
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e)
  await prisma.$disconnect()
  process.exit(1)
})
