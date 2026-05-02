/**
 * Athenis — Seed v2
 *
 * Comptes créés :
 *   superadmin@athenis.io         — PlatformRole: SUPER_ADMIN
 *   demo@athenis.io               — Company PREMIUM : Nexoria Conseil
 *   comptable@nexoria.cm          — Comptable Nexoria (toutes agences)
 *   commercial.yde@nexoria.cm     — Commercial (Agence Yaoundé seulement)
 *   ubm@comptalia.fr              — Company PREMIUM : UBM Consulting
 *   rh@ubm.cm                     — RH UBM
 *   cabinet@athenis.io            — Cabinet PREMIUM : Fontaine & Associés
 *   collab@fontaine-associes.cm   — Collaborateur cabinet
 *   delta@athenis.io              — Company STARTER : Delta Transport
 *
 * Mot de passe universel : Demo1234!
 */

import { PrismaClient, AccountType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 12
const DEMO_PASSWORD = 'Demo1234!'

async function main() {
  console.log('🌱  Athenis seed v2 — démarrage\n')

  // ── 🔒 Garde anti-écrasement ──────────────────────────────────────────────
  // 1) Bloque toujours en production — le seed de démo ne doit jamais tourner
  //    sur une base réelle, peu importe ce qu'elle contient.
  if (process.env['NODE_ENV'] === 'production') {
    console.error('❌  Seed refusé : NODE_ENV=production.')
    console.error('   Le seed de démo ne doit jamais être exécuté sur une base de production.')
    process.exit(1)
  }

  // 2) Si des utilisateurs existent déjà, on ne touche à rien.
  const existingUserCount = await prisma.user.count()
  if (existingUserCount > 0) {
    console.log(`⚠️  La base contient déjà ${existingUserCount} utilisateur(s) — seed ignoré.`)
    console.log('   Pour forcer le seed, supprimez manuellement les données existantes.')
    return
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS)

  // ── 1. AtheisCounter ──────────────────────────────────────────────────────
  console.log('📊  Compteurs Athenis…')
  for (const type of ['PERSONAL', 'COMPANY', 'CABINET'] as AccountType[]) {
    await prisma.atheisCounter.upsert({
      where: { type },
      update: {},
      create: { type, lastNumber: 0 },
    })
  }

  // ── 2. Barème IGS 2026 (Cameroun) ─────────────────────────────────────────
  console.log('📋  Barème IGS 2026…')
  const IGS = [
    { classe: 1,  caMin: 0,           caMax: 5_000_000,   montantBase:  50_000, montantCga:  25_000 },
    { classe: 2,  caMin: 5_000_001,   caMax: 10_000_000,  montantBase: 100_000, montantCga:  50_000 },
    { classe: 3,  caMin: 10_000_001,  caMax: 15_000_000,  montantBase: 150_000, montantCga:  75_000 },
    { classe: 4,  caMin: 15_000_001,  caMax: 20_000_000,  montantBase: 200_000, montantCga: 100_000 },
    { classe: 5,  caMin: 20_000_001,  caMax: 30_000_000,  montantBase: 300_000, montantCga: 150_000 },
    { classe: 6,  caMin: 30_000_001,  caMax: 40_000_000,  montantBase: 350_000, montantCga: 175_000 },
    { classe: 7,  caMin: 40_000_001,  caMax: 50_000_000,  montantBase: 400_000, montantCga: 200_000 },
    { classe: 8,  caMin: 50_000_001,  caMax: 75_000_000,  montantBase: 550_000, montantCga: 275_000 },
    { classe: 9,  caMin: 75_000_001,  caMax: 100_000_000, montantBase: 700_000, montantCga: 350_000 },
    { classe: 10, caMin: 100_000_001, caMax: 150_000_000, montantBase: 900_000, montantCga: 450_000 },
  ]
  for (const b of IGS) {
    await prisma.igsBareme.upsert({
      where: { classe: b.classe },
      update: {},
      create: { ...b, year: 2026 },
    })
  }

  // ── 3. Super Admin ────────────────────────────────────────────────────────
  console.log('👑  Super Admin…')
  await prisma.user.upsert({
    where: { email: 'superadmin@athenis.io' },
    update: {},
    create: {
      email: 'superadmin@athenis.io',
      passwordHash,
      nom:          'Admin',
      prenom:       'Super',
      accountType:  'PERSONAL',
      platformRole: 'SUPER_ADMIN',
      isActive:     true,
    },
  })

  // ── 4. Company PREMIUM — Nexoria Conseil ─────────────────────────────────
  console.log('🏢  Nexoria Conseil (demo@athenis.io)…')

  const nexoria = await prisma.company.upsert({
    where:  { atheisNumber: 'CO-0001' },
    update: {},
    create: {
      atheisNumber:   'CO-0001',
      nom:            'Nexoria Conseil',
      nomCommercial:  'Nexoria',
      formeJuridique: 'SARL',
      rccm:           'RC/DLA/2019/B/1234',
      niu:            'P012345678N',
      capital:        5_000_000,
      secteur:        'Conseil & Formation',
      taille:         'PME',
      adresse:        'Rue Joss, Akwa',
      ville:          'Douala',
      pays:           'CM',
      telephone:      '+237 233 000 001',
      email:          'contact@nexoria.cm',
      siteWeb:        'www.nexoria.cm',
      currency:       'XAF',
      currencySymbol: 'F CFA',
      accountingZone: 'OHADA',
      accountingPlan: 'SYSCOHADA',
      locale:         'fr-CM',
      timezone:       'Africa/Douala',
      vatRate:        0.1925,
      plan:           'PREMIUM',
      modules:        ['gestion', 'rh', 'comptabilite', 'juridique', 'esg', 'fiscalite'],
    },
  })

  // Agences Nexoria
  const nexSiege = await prisma.agence.upsert({
    where: { companyId_code: { companyId: nexoria.id, code: 'SIEGE' } },
    update: {},
    create: {
      companyId: nexoria.id, code: 'SIEGE',
      nom: 'Siège Douala', adresse: 'Rue Joss, Akwa',
      ville: 'Douala', isSiege: true,
      telephone: '+237 233 000 001', email: 'siege@nexoria.cm',
    },
  })
  const nexYde = await prisma.agence.upsert({
    where: { companyId_code: { companyId: nexoria.id, code: 'YDE' } },
    update: {},
    create: {
      companyId: nexoria.id, code: 'YDE',
      nom: 'Agence Yaoundé', adresse: 'Avenue Kennedy, Centre',
      ville: 'Yaoundé', isSiege: false,
      telephone: '+237 222 000 002', email: 'yaounde@nexoria.cm',
    },
  })

  // Caisses Nexoria
  await prisma.caisse.upsert({
    where: { id: 'caisse-nex-siege' },
    update: {},
    create: {
      id: 'caisse-nex-siege', agenceId: nexSiege.id,
      companyId: nexoria.id, nom: 'Caisse principale Siège', solde: 1_450_000,
    },
  })
  await prisma.caisse.upsert({
    where: { id: 'caisse-nex-yde' },
    update: {},
    create: {
      id: 'caisse-nex-yde', agenceId: nexYde.id,
      companyId: nexoria.id, nom: 'Caisse Agence Yaoundé', solde: 380_000,
    },
  })

  // Utilisateurs Nexoria
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@athenis.io' },
    update: {},
    create: {
      email: 'demo@athenis.io', passwordHash,
      nom: 'Mbarga', prenom: 'Jean', accountType: 'COMPANY', isActive: true,
    },
  })
  await prisma.companyMember.upsert({
    where: { userId: demoUser.id },
    update: {},
    create: {
      userId: demoUser.id, companyId: nexoria.id,
      role: 'OWNER', status: 'ACTIVE', joinedAt: new Date(),
      permissions: { gestion: 'write', accounting: 'write', hr: 'write', juridique: 'write', esg: 'write', fiscal: 'write' },
    },
  })

  const comptable = await prisma.user.upsert({
    where: { email: 'comptable@nexoria.cm' },
    update: {},
    create: {
      email: 'comptable@nexoria.cm', passwordHash,
      nom: 'Ngono', prenom: 'Alice', accountType: 'COMPANY', isActive: true,
    },
  })
  await prisma.companyMember.upsert({
    where: { userId: comptable.id },
    update: {},
    create: {
      userId: comptable.id, companyId: nexoria.id,
      role: 'ACCOUNTANT', status: 'ACTIVE', joinedAt: new Date(),
      permissions: { gestion: 'read', accounting: 'write', hr: 'none', juridique: 'read', esg: 'none', fiscal: 'write' },
    },
  })

  // Commercial — limité à Agence Yaoundé
  const commercial = await prisma.user.upsert({
    where: { email: 'commercial.yde@nexoria.cm' },
    update: {},
    create: {
      email: 'commercial.yde@nexoria.cm', passwordHash,
      nom: 'Essomba', prenom: 'Paul', accountType: 'COMPANY', isActive: true,
    },
  })
  const commercialMember = await prisma.companyMember.upsert({
    where: { userId: commercial.id },
    update: {},
    create: {
      userId: commercial.id, companyId: nexoria.id,
      role: 'SALES', status: 'ACTIVE', joinedAt: new Date(),
      permissions: { gestion: 'write', accounting: 'none', hr: 'none', juridique: 'none', esg: 'none', fiscal: 'none' },
    },
  })
  await prisma.agenceMember.upsert({
    where: { companyMemberId_agenceId: { companyMemberId: commercialMember.id, agenceId: nexYde.id } },
    update: {},
    create: { companyMemberId: commercialMember.id, agenceId: nexYde.id, isRestricted: true },
  })

  // Clients Nexoria
  const clientAcme = await prisma.client.upsert({
    where: { id: 'client-acme' },
    update: {},
    create: {
      id: 'client-acme', companyId: nexoria.id, agenceId: nexSiege.id,
      nom: 'ACME Industrie SA', type: 'ENTREPRISE', email: 'contact@acme.cm',
      telephone: '+237 233 111 222',
    },
  })
  const clientBeta = await prisma.client.upsert({
    where: { id: 'client-beta' },
    update: {},
    create: {
      id: 'client-beta', companyId: nexoria.id, agenceId: nexYde.id,
      nom: 'Beta Services SARL', type: 'ENTREPRISE', email: 'info@beta.cm',
    },
  })

  // Factures Nexoria
  await prisma.invoice.upsert({
    where: { reference: 'FAC-2026-0001' },
    update: {},
    create: {
      reference: 'FAC-2026-0001', companyId: nexoria.id, agenceId: nexSiege.id,
      clientId: clientAcme.id, type: 'FACTURE', status: 'PAID',
      amountHT: 8_400_000, vatRate: 0.1925, amountTTC: 10_015_800,
      issuedAt: new Date('2026-04-01'), dueAt: new Date('2026-04-30'),
      paidAt: new Date('2026-04-15'), createdBy: demoUser.id,
    },
  })
  await prisma.invoice.upsert({
    where: { reference: 'FAC-2026-0002' },
    update: {},
    create: {
      reference: 'FAC-2026-0002', companyId: nexoria.id, agenceId: nexYde.id,
      clientId: clientBeta.id, type: 'FACTURE', status: 'PENDING',
      amountHT: 3_200_000, vatRate: 0.1925, amountTTC: 3_816_000,
      issuedAt: new Date('2026-04-15'), dueAt: new Date('2026-05-15'),
      createdBy: commercial.id,
    },
  })

  // Dépenses Nexoria
  await prisma.expense.upsert({
    where: { reference: 'DEP-2026-0001' },
    update: {},
    create: {
      reference: 'DEP-2026-0001', companyId: nexoria.id, agenceId: nexSiege.id,
      category: 'LOYER', amount: 1_200_000, date: new Date('2026-04-01'),
      note: 'Loyer bureaux Siège — avril 2026', createdBy: demoUser.id,
    },
  })
  await prisma.expense.upsert({
    where: { reference: 'DEP-2026-0002' },
    update: {},
    create: {
      reference: 'DEP-2026-0002', companyId: nexoria.id, agenceId: nexYde.id,
      category: 'LOYER', amount: 650_000, date: new Date('2026-04-01'),
      note: 'Loyer Agence Yaoundé — avril 2026', createdBy: demoUser.id,
    },
  })
  await prisma.expense.upsert({
    where: { reference: 'DEP-2026-0003' },
    update: {},
    create: {
      reference: 'DEP-2026-0003', companyId: nexoria.id, agenceId: nexSiege.id,
      category: 'LOGICIELS', amount: 450_000, date: new Date('2026-04-05'),
      note: 'Licence Microsoft 365 — avril 2026', createdBy: demoUser.id,
    },
  })

  // Employés Nexoria
  await prisma.employee.upsert({
    where: { id: 'emp-nex-001' },
    update: {},
    create: {
      id: 'emp-nex-001', companyId: nexoria.id, agenceId: nexSiege.id,
      nom: 'Tchouangwa', prenom: 'Hervé', poste: 'Directeur Général',
      contrat: 'CDI', salaireNet: 850_000, salaireBrut: 1_100_000,
      email: 'herve@nexoria.cm', dateEmbauche: new Date('2019-01-15'),
    },
  })
  await prisma.employee.upsert({
    where: { id: 'emp-nex-002' },
    update: {},
    create: {
      id: 'emp-nex-002', companyId: nexoria.id, agenceId: nexYde.id,
      nom: 'Biya', prenom: 'Sandrine', poste: 'Responsable Commercial Yaoundé',
      contrat: 'CDI', salaireNet: 450_000, salaireBrut: 580_000,
      email: 'sandrine@nexoria.cm', dateEmbauche: new Date('2022-03-01'),
    },
  })

  // FiscalYear + TaxConfig Nexoria
  await prisma.fiscalYear.upsert({
    where: { companyId_year: { companyId: nexoria.id, year: 2026 } },
    update: {},
    create: {
      companyId: nexoria.id, year: 2026,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      status: 'OPEN',
    },
  })
  await prisma.taxConfig.upsert({
    where: { companyId: nexoria.id },
    update: {},
    create: {
      companyId: nexoria.id, country: 'CM',
      taxRegime: 'REEL_NORMAL', vatRegime: 'MENSUEL',
      niu: 'P012345678N', rccm: 'RC/DLA/2019/B/1234',
      cnpsRate: 0.162, centerImpots: 'DGI Douala',
    },
  })

  // ── 5. Company PREMIUM — UBM Consulting ──────────────────────────────────
  console.log('🏢  UBM Consulting (ubm@comptalia.fr)…')

  const ubm = await prisma.company.upsert({
    where:  { atheisNumber: 'CO-0002' },
    update: {},
    create: {
      atheisNumber:   'CO-0002',
      nom:            'UBM Consulting',
      nomCommercial:  'UBM',
      formeJuridique: 'SARL',
      rccm:           'RC/DLA/2020/B/5678',
      niu:            'P098765432N',
      capital:        10_000_000,
      secteur:        'Audit & Conseil',
      taille:         'PME',
      adresse:        'Boulevard de la Liberté',
      ville:          'Douala',
      pays:           'CM',
      telephone:      '+237 233 000 099',
      email:          'contact@ubm.cm',
      currency:       'XAF',
      currencySymbol: 'F CFA',
      accountingZone: 'OHADA',
      accountingPlan: 'SYSCOHADA',
      locale:         'fr-CM',
      timezone:       'Africa/Douala',
      vatRate:        0.1925,
      plan:           'PREMIUM',
      modules:        ['gestion', 'rh', 'comptabilite', 'juridique', 'esg', 'fiscalite'],
    },
  })

  const ubmSiege = await prisma.agence.upsert({
    where: { companyId_code: { companyId: ubm.id, code: 'SIEGE' } },
    update: {},
    create: {
      companyId: ubm.id, code: 'SIEGE',
      nom: 'Siège Akwa', adresse: 'Bvd de la Liberté, Akwa',
      ville: 'Douala', isSiege: true,
    },
  })

  await prisma.caisse.upsert({
    where: { id: 'caisse-ubm-siege' },
    update: {},
    create: {
      id: 'caisse-ubm-siege', agenceId: ubmSiege.id,
      companyId: ubm.id, nom: 'Caisse Siège', solde: 2_100_000,
    },
  })

  const ubmAdmin = await prisma.user.upsert({
    where: { email: 'ubm@comptalia.fr' },
    update: {},
    create: {
      email: 'ubm@comptalia.fr', passwordHash,
      nom: 'Nguema', prenom: 'Bruno', accountType: 'COMPANY', isActive: true,
    },
  })
  await prisma.companyMember.upsert({
    where: { userId: ubmAdmin.id },
    update: {},
    create: {
      userId: ubmAdmin.id, companyId: ubm.id,
      role: 'OWNER', status: 'ACTIVE', joinedAt: new Date(),
      permissions: { gestion: 'write', accounting: 'write', hr: 'write', juridique: 'write', esg: 'write', fiscal: 'write' },
    },
  })

  const ubmRh = await prisma.user.upsert({
    where: { email: 'rh@ubm.cm' },
    update: {},
    create: {
      email: 'rh@ubm.cm', passwordHash,
      nom: 'Ateba', prenom: 'Cécile', accountType: 'COMPANY', isActive: true,
    },
  })
  await prisma.companyMember.upsert({
    where: { userId: ubmRh.id },
    update: {},
    create: {
      userId: ubmRh.id, companyId: ubm.id,
      role: 'HR', status: 'ACTIVE', joinedAt: new Date(),
      permissions: { gestion: 'none', accounting: 'none', hr: 'write', juridique: 'read', esg: 'none', fiscal: 'none' },
    },
  })

  const clientUbm = await prisma.client.upsert({
    where: { id: 'client-ubm-001' },
    update: {},
    create: {
      id: 'client-ubm-001', companyId: ubm.id, agenceId: ubmSiege.id,
      nom: 'Camtel SA', type: 'ENTREPRISE', email: 'procurement@camtel.cm',
    },
  })
  await prisma.invoice.upsert({
    where: { reference: 'UBM-2026-0001' },
    update: {},
    create: {
      reference: 'UBM-2026-0001', companyId: ubm.id, agenceId: ubmSiege.id,
      clientId: clientUbm.id, type: 'FACTURE', status: 'PAID',
      amountHT: 15_000_000, vatRate: 0.1925, amountTTC: 17_887_500,
      issuedAt: new Date('2026-03-01'), dueAt: new Date('2026-03-31'),
      paidAt: new Date('2026-03-28'), createdBy: ubmAdmin.id,
    },
  })

  await prisma.fiscalYear.upsert({
    where: { companyId_year: { companyId: ubm.id, year: 2026 } },
    update: {},
    create: {
      companyId: ubm.id, year: 2026,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      status: 'OPEN',
    },
  })
  await prisma.taxConfig.upsert({
    where: { companyId: ubm.id },
    update: {},
    create: {
      companyId: ubm.id, country: 'CM',
      taxRegime: 'REEL_NORMAL', vatRegime: 'MENSUEL',
      niu: 'P098765432N', rccm: 'RC/DLA/2020/B/5678',
      cnpsRate: 0.162, centerImpots: 'DGI Douala',
    },
  })

  // ── 6. Company STARTER — Delta Transport ──────────────────────────────────
  console.log('🚚  Delta Transport (delta@athenis.io)…')

  const delta = await prisma.company.upsert({
    where:  { atheisNumber: 'CO-0003' },
    update: {},
    create: {
      atheisNumber:   'CO-0003',
      nom:            'Delta Transport SA',
      formeJuridique: 'SA',
      rccm:           'RC/DLA/2021/B/3344',
      niu:            'P011111111N',
      secteur:        'Transport & Logistique',
      taille:         'PME',
      ville:          'Douala',
      pays:           'CM',
      currency:       'XAF',
      currencySymbol: 'F CFA',
      accountingZone: 'OHADA',
      accountingPlan: 'SYSCOHADA',
      locale:         'fr-CM',
      timezone:       'Africa/Douala',
      plan:           'STARTER',
      modules:        ['gestion', 'rh'],
    },
  })
  const deltaSiege = await prisma.agence.upsert({
    where: { companyId_code: { companyId: delta.id, code: 'SIEGE' } },
    update: {},
    create: {
      companyId: delta.id, code: 'SIEGE',
      nom: 'Siège', ville: 'Douala', isSiege: true,
    },
  })
  void deltaSiege

  const deltaOwner = await prisma.user.upsert({
    where: { email: 'delta@athenis.io' },
    update: {},
    create: {
      email: 'delta@athenis.io', passwordHash,
      nom: 'Kamga', prenom: 'Thierry', accountType: 'COMPANY', isActive: true,
    },
  })
  await prisma.companyMember.upsert({
    where: { userId: deltaOwner.id },
    update: {},
    create: {
      userId: deltaOwner.id, companyId: delta.id,
      role: 'OWNER', status: 'ACTIVE', joinedAt: new Date(),
      permissions: { gestion: 'write', hr: 'write' },
    },
  })

  // ── 7. Cabinet PREMIUM — Fontaine & Associés ──────────────────────────────
  console.log('🏛  Cabinet Fontaine & Associés (cabinet@athenis.io)…')

  const cabinet = await prisma.cabinet.upsert({
    where:  { atheisNumber: 'CAB-0001' },
    update: {},
    create: {
      atheisNumber: 'CAB-0001',
      nom:          'Cabinet Fontaine & Associés',
      rccm:         'RC/DLA/2015/B/0099',
      adresse:      'Rue de la Réunification, Bonanjo',
      ville:        'Douala',
      pays:         'CM',
      telephone:    '+237 233 999 888',
      email:        'contact@fontaine-associes.cm',
      plan:         'PREMIUM',
    },
  })

  const cabinetUser = await prisma.user.upsert({
    where: { email: 'cabinet@athenis.io' },
    update: {},
    create: {
      email: 'cabinet@athenis.io', passwordHash,
      nom: 'Fontaine', prenom: 'Édouard', accountType: 'CABINET', isActive: true,
    },
  })
  await prisma.cabinetMember.upsert({
    where: { userId: cabinetUser.id },
    update: {},
    create: { userId: cabinetUser.id, cabinetId: cabinet.id, role: 'EXPERT_COMPTABLE' },
  })

  const collab = await prisma.user.upsert({
    where: { email: 'collab@fontaine-associes.cm' },
    update: {},
    create: {
      email: 'collab@fontaine-associes.cm', passwordHash,
      nom: 'Djomo', prenom: 'Rachel', accountType: 'CABINET', isActive: true,
    },
  })
  await prisma.cabinetMember.upsert({
    where: { userId: collab.id },
    update: {},
    create: { userId: collab.id, cabinetId: cabinet.id, role: 'COLLABORATEUR' },
  })

  // Mandats cabinet
  // Mandat COMPLET → Nexoria
  await prisma.mandat.upsert({
    where: { cabinetId_companyId: { cabinetId: cabinet.id, companyId: nexoria.id } },
    update: {},
    create: {
      cabinetId: cabinet.id, companyId: nexoria.id,
      type: 'COMPLET',
      modules: ['gestion', 'rh', 'comptabilite', 'juridique', 'esg', 'fiscalite'],
      isActive: true,
      notes: 'Mandat complet — expert désigné : E. Fontaine',
    },
  })
  // Mandat COMPTABILITE → UBM
  await prisma.mandat.upsert({
    where: { cabinetId_companyId: { cabinetId: cabinet.id, companyId: ubm.id } },
    update: {},
    create: {
      cabinetId: cabinet.id, companyId: ubm.id,
      type: 'COMPTABILITE', modules: ['comptabilite', 'fiscalite'],
      isActive: true, notes: 'Mandat comptabilité & fiscal',
    },
  })
  // Mandat GESTION → Delta
  await prisma.mandat.upsert({
    where: { cabinetId_companyId: { cabinetId: cabinet.id, companyId: delta.id } },
    update: {},
    create: {
      cabinetId: cabinet.id, companyId: delta.id,
      type: 'GESTION', modules: ['gestion'],
      isActive: true, notes: 'Mandat gestion — suivi mensuel',
    },
  })

  // Rattachement cabinet sur les companies
  await prisma.company.update({ where: { id: nexoria.id }, data: { cabinetId: cabinet.id } })
  await prisma.company.update({ where: { id: ubm.id },     data: { cabinetId: cabinet.id } })
  await prisma.company.update({ where: { id: delta.id },   data: { cabinetId: cabinet.id } })

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed terminé avec succès !\n')
  console.log('  Comptes créés (mot de passe : Demo1234!) :')
  console.log('    superadmin@athenis.io')
  console.log('    demo@athenis.io              — Nexoria Conseil (OWNER, toutes agences)')
  console.log('    comptable@nexoria.cm         — Comptable Nexoria (toutes agences)')
  console.log('    commercial.yde@nexoria.cm    — Commercial (Agence Yaoundé seulement) ⚠️')
  console.log('    ubm@comptalia.fr             — UBM Consulting (OWNER)')
  console.log('    rh@ubm.cm                    — RH UBM')
  console.log('    cabinet@athenis.io           — Cabinet Fontaine (Expert-Comptable)')
  console.log('    collab@fontaine-associes.cm  — Collaborateur cabinet')
  console.log('    delta@athenis.io             — Delta Transport (OWNER)')
  console.log()
  console.log('  Mandats cabinet :')
  console.log('    Nexoria  → COMPLET')
  console.log('    UBM      → COMPTABILITE (compta + fiscal)')
  console.log('    Delta    → GESTION')
  console.log()
}

main()
  .catch((e) => { console.error('❌  Seed échoué :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
