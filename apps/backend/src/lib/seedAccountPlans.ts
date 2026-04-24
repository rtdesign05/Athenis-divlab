import { PrismaClient } from '@prisma/client'
import { getPlanByZone, DEFAULT_ACCOUNTS } from './accountingPlans.js'

const prisma = new PrismaClient()

async function seedAccountPlans() {
  console.log('🌱 Seeding account plans for all companies…')

  const companies = await prisma.company.findMany({
    select: { id: true, name: true, accountingZone: true },
  })

  for (const company of companies) {
    const zone    = company.accountingZone
    const plan    = getPlanByZone(zone)
    const defaults = DEFAULT_ACCOUNTS[zone]
    const entries  = plan.filter(e => defaults.includes(e.numero))

    let added = 0
    for (const entry of entries) {
      await prisma.accountPlan.upsert({
        where: { companyId_numero: { companyId: company.id, numero: entry.numero } },
        update: {},
        create: {
          companyId: company.id,
          numero:    entry.numero,
          intitule:  entry.intitule,
          classe:    entry.classe,
          type:      entry.type,
          zone,
          isSystem:  true,
          isActive:  true,
        },
      })
      added++
    }
    console.log(`  ${company.name} (${zone}): ${added} comptes importés`)
  }

  await prisma.$disconnect()
  console.log('✅ Done')
}

seedAccountPlans().catch(e => { console.error(e); process.exit(1) })
