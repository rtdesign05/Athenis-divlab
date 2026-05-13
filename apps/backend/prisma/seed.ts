/**
 * Athenis — Seed minimal
 *
 * Crée les données essentielles pour bootstrap une base de dev :
 *   • Compteurs AtheisCounter (PERSONAL / COMPANY / CABINET)
 *   • Barème IGS 2026 (Cameroun) — 10 classes
 *   • SUPER_ADMIN : superadmin@athenis.io
 *   • Company de démo + utilisateur OWNER : demo@athenis.io
 *
 * Mot de passe universel : Demo1234!
 *
 * Garde anti-écrasement :
 *   • Refuse en NODE_ENV=production
 *   • Skip si des utilisateurs existent déjà
 *
 * Note : ce seed est volontairement minimaliste. Les données métier complètes
 * (factures, écritures, employés…) sont créées via l'application après login.
 */

import { PrismaClient } from '@prisma/client'
import type { AccountType } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BCRYPT_ROUNDS  = 12
const DEMO_PASSWORD  = 'Demo1234!'

async function main() {
  console.log('🌱  Athenis seed — démarrage\n')

  // ── Garde 1 : production interdite ─────────────────────────────────────────
  if (process.env['NODE_ENV'] === 'production') {
    console.error('❌  Seed refusé : NODE_ENV=production.')
    console.error('    Le seed de démo ne doit jamais tourner sur une base de production.')
    process.exit(1)
  }

  // ── Garde 2 : DB déjà peuplée ──────────────────────────────────────────────
  const existingUserCount = await prisma.user.count()
  if (existingUserCount > 0) {
    console.log(`⚠️  La base contient déjà ${existingUserCount} utilisateur(s) — seed ignoré.`)
    console.log('    Pour forcer le seed, supprimez manuellement les données existantes.')
    return
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS)

  // ── 1. AtheisCounter ────────────────────────────────────────────────────────
  console.log('📊  Compteurs Athenis…')
  const counterTypes: AccountType[] = ['PERSONAL', 'COMPANY', 'CABINET']
  for (const type of counterTypes) {
    await prisma.atheisCounter.upsert({
      where:  { type },
      update: {},
      create: { type, lastNumber: 0 },
    })
  }

  // ── 2. Barème IGS 2026 (Cameroun) ─────────────────────────────────────────
  console.log('📋  Barème IGS 2026…')
  const IGS_BAREME = [
    { classe: 1,  caMin:           0, caMax:   5_000_000, montantBase:  50_000, montantCga:  25_000 },
    { classe: 2,  caMin:   5_000_001, caMax:  10_000_000, montantBase: 100_000, montantCga:  50_000 },
    { classe: 3,  caMin:  10_000_001, caMax:  15_000_000, montantBase: 150_000, montantCga:  75_000 },
    { classe: 4,  caMin:  15_000_001, caMax:  20_000_000, montantBase: 200_000, montantCga: 100_000 },
    { classe: 5,  caMin:  20_000_001, caMax:  30_000_000, montantBase: 300_000, montantCga: 150_000 },
    { classe: 6,  caMin:  30_000_001, caMax:  40_000_000, montantBase: 350_000, montantCga: 175_000 },
    { classe: 7,  caMin:  40_000_001, caMax:  50_000_000, montantBase: 400_000, montantCga: 200_000 },
    { classe: 8,  caMin:  50_000_001, caMax:  75_000_000, montantBase: 550_000, montantCga: 275_000 },
    { classe: 9,  caMin:  75_000_001, caMax: 100_000_000, montantBase: 700_000, montantCga: 350_000 },
    { classe: 10, caMin: 100_000_001, caMax: 150_000_000, montantBase: 900_000, montantCga: 450_000 },
  ]
  for (const b of IGS_BAREME) {
    await prisma.igsBareme.upsert({
      where:  { classe: b.classe },
      update: {},
      create: { ...b, year: 2026 },
    })
  }

  // ── 3. SUPER_ADMIN ──────────────────────────────────────────────────────────
  console.log('👑  Super Admin (superadmin@athenis.io)…')
  await prisma.user.upsert({
    where:  { email: 'superadmin@athenis.io' },
    update: {},
    create: {
      email:        'superadmin@athenis.io',
      passwordHash,
      nom:          'Admin',
      prenom:       'Super',
      accountType:  'PERSONAL',
      platformRole: 'SUPER_ADMIN',
      isActive:     true,
    },
  })

  // ── 4. Company de démo + utilisateur OWNER ──────────────────────────────────
  console.log('🏢  Company de démo (demo@athenis.io)…')
  const demoCompany = await prisma.company.create({
    data: {
      nom:            'Nexoria Conseil',
      formeJuridique: 'SARL',
      siret:          'RC/DLA/2026/B/0001',
      vatNumber:      'P012345678N',
      capital:        5_000_000,
      secteur:        'Conseil & Formation',
      adresse:        'Rue Joss, Akwa',
      ville:          'Douala',
      pays:           'CM',
      telephone:      '+237 233 000 001',
      email:          'contact@nexoria.cm',
      siteWeb:        'www.nexoria.cm',
      currency:       'XAF',
      currencySymbol: 'F CFA',
      accountingZone: 'OHADA',
      accountingPlan: 'SYSCOHADA Révisé 2017',
      locale:         'fr-CM',
      timezone:       'Africa/Douala',
      plan:           'PREMIUM',
      modules:        ['gestion', 'rh', 'comptabilite', 'juridique', 'esg', 'fiscalite'],
    },
  })

  const demoUser = await prisma.user.create({
    data: {
      email:        'demo@athenis.io',
      passwordHash,
      nom:          'Mbarga',
      prenom:       'Jean',
      accountType:  'COMPANY',
      role:         'ADMIN',
      companyId:    demoCompany.id,
      isActive:     true,
    },
  })

  // Crée d'abord un rôle "ADMIN" système pour la company, puis lie l'utilisateur
  const adminRole = await prisma.companyRole.create({
    data: {
      companyId:   demoCompany.id,
      name:        'ADMIN',
      description: 'Administrateur — accès complet à tous les modules',
      isSystem:    true,
      permissions: {
        gestion:      'admin',
        comptabilite: 'admin',
        rh:           'admin',
        juridique:    'admin',
        esg:          'admin',
        fiscalite:    'admin',
        settings:     'admin',
      },
    },
  })

  await prisma.companyMember.create({
    data: {
      userId:    demoUser.id,
      companyId: demoCompany.id,
      roleId:    adminRole.id,
      status:    'ACTIVE',
      joinedAt:  new Date(),
    },
  })

  console.log('\n✅  Seed terminé avec succès')
  console.log('\n   Comptes créés :')
  console.log('   • superadmin@athenis.io  (mot de passe : Demo1234!)')
  console.log('   • demo@athenis.io        (mot de passe : Demo1234!)')
  console.log('\n   Ouvre http://localhost:5173/auth/login pour te connecter.\n')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌  Seed échoué :', e)
    await prisma.$disconnect()
    process.exit(1)
  })
