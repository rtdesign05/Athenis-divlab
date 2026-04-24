import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const PLAN_MODULES = {
  FREE:    ['gestion'],
  STARTER: ['gestion', 'rh'],
  PRO:     ['gestion', 'rh', 'comptabilite', 'juridique'],
  PREMIUM: ['gestion', 'rh', 'comptabilite', 'juridique', 'esg', 'fiscalite'],
} as const

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 12
const DEMO_PASSWORD  = 'Demo1234!'
const DEMO2_PASSWORD = 'Demo2026!'

async function main() {
  console.log('🌱 Seeding Athenis demo data…\n')

  const [hash, hash2] = await Promise.all([
    bcrypt.hash(DEMO_PASSWORD,  BCRYPT_ROUNDS),
    bcrypt.hash(DEMO2_PASSWORD, BCRYPT_ROUNDS),
  ])

  // ── Cabinet ───────────────────────────────────────────────────────────────
  const cabinet = await prisma.cabinet.upsert({
    where: { siret: '12345678900012' },
    update: {},
    create: { name: 'Expert Compta & Associés', siret: '12345678900012' },
  })
  console.log(`  Cabinet: ${cabinet.name}`)

  // ── Main demo company (France, PRO) ───────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { siren: '123456789' },
    update: {
      country: 'FR', currency: 'EUR', currencySymbol: '€',
      accountingZone: 'FRANCE', accountingPlan: 'PCG',
      vatRates: [20, 10, 5.5, 2.1], locale: 'fr-FR', timezone: 'Europe/Paris',
    },
    create: {
      name: 'Démo SA',
      siren: '123456789',
      secteur: 'Services informatiques',
      taille: 'PME',
      plan: 'PRO',
      modules: PLAN_MODULES.PRO,
      cabinetId: cabinet.id,
      country: 'FR', currency: 'EUR', currencySymbol: '€',
      accountingZone: 'FRANCE', accountingPlan: 'PCG',
      vatRates: [20, 10, 5.5, 2.1], locale: 'fr-FR', timezone: 'Europe/Paris',
    },
  })
  console.log(`  Company: ${company.name} (${company.plan} · ${company.country})`)

  // ── Demo company Sénégal (OHADA, PRO) ─────────────────────────────────────
  const companySn = await prisma.company.upsert({
    where: { siren: 'SN-DEMO-001' },
    update: {
      country: 'SN', currency: 'XOF', currencySymbol: 'F CFA',
      accountingZone: 'OHADA', accountingPlan: 'SYSCOHADA Révisé 2017',
      vatRates: [18], locale: 'fr-SN', timezone: 'Africa/Dakar',
    },
    create: {
      name: 'Démo Sénégal SARL',
      siren: 'SN-DEMO-001',
      secteur: 'Commerce général',
      taille: 'PME',
      plan: 'PRO',
      modules: PLAN_MODULES.PRO,
      country: 'SN', currency: 'XOF', currencySymbol: 'F CFA',
      accountingZone: 'OHADA', accountingPlan: 'SYSCOHADA Révisé 2017',
      vatRates: [18], locale: 'fr-SN', timezone: 'Africa/Dakar',
    },
  })
  console.log(`  Company: ${companySn.name} (${companySn.plan} · ${companySn.country})`)

  // ── Demo company USA (IFRS, PRO) ──────────────────────────────────────────
  const companyUs = await prisma.company.upsert({
    where: { siren: 'US-DEMO-001' },
    update: {
      country: 'US', currency: 'USD', currencySymbol: '$',
      accountingZone: 'IFRS', accountingPlan: 'IFRS',
      vatRates: [0], locale: 'en-US', timezone: 'America/New_York',
    },
    create: {
      name: 'Demo USA Corp',
      siren: 'US-DEMO-001',
      secteur: 'Technology',
      taille: 'PME',
      plan: 'PRO',
      modules: PLAN_MODULES.PRO,
      country: 'US', currency: 'USD', currencySymbol: '$',
      accountingZone: 'IFRS', accountingPlan: 'IFRS',
      vatRates: [0], locale: 'en-US', timezone: 'America/New_York',
    },
  })
  console.log(`  Company: ${companyUs.name} (${companyUs.plan} · ${companyUs.country})`)

  // ── Mandat ────────────────────────────────────────────────────────────────
  await prisma.mandat.upsert({
    where: { cabinetId_companyId: { cabinetId: cabinet.id, companyId: company.id } },
    update: {},
    create: {
      cabinetId: cabinet.id, companyId: company.id,
      type: 'COMPLET', modules: PLAN_MODULES.PRO, actif: true,
    },
  })
  console.log('  Mandat: COMPLET entre cabinet et Démo SA')

  // ── Users — PERSONAL ──────────────────────────────────────────────────────
  const personal = await prisma.user.upsert({
    where: { email: 'marie@personal.demo' },
    update: {},
    create: {
      email: 'marie@personal.demo', passwordHash: hash,
      accountType: 'PERSONAL', role: 'ADMIN',
      firstName: 'Marie', lastName: 'Dubois',
    },
  })
  console.log(`  User (PERSONAL): ${personal.email}`)

  // ── Users — COMPANY (Démo SA, France) ────────────────────────────────────
  const companyUsers = [
    { email: 'admin@demo-sa.demo',     role: 'ADMIN'     as const, firstName: 'Alice',   lastName: 'Martin'  },
    { email: 'comptable@demo-sa.demo', role: 'COMPTABLE' as const, firstName: 'Bernard', lastName: 'Durand'  },
    { email: 'rh@demo-sa.demo',        role: 'RH'        as const, firstName: 'Claire',  lastName: 'Petit'   },
    { email: 'viewer@demo-sa.demo',    role: 'READONLY'  as const, firstName: 'David',   lastName: 'Leroy'   },
    { email: 'juridique@demo-sa.demo', role: 'JURIDIQUE' as const, firstName: 'Elise',   lastName: 'Bernard' },
  ]
  for (const u of companyUsers) {
    const created = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: hash, accountType: 'COMPANY', companyId: company.id },
    })
    console.log(`  User (COMPANY/${u.role}): ${created.email}`)
  }

  // ── Users — CABINET ───────────────────────────────────────────────────────
  const cabinetUser = await prisma.user.upsert({
    where: { email: 'expert@cabinet.demo' },
    update: {},
    create: {
      email: 'expert@cabinet.demo', passwordHash: hash,
      accountType: 'CABINET', role: 'ADMIN',
      firstName: 'François', lastName: 'Expert', cabinetId: cabinet.id,
    },
  })
  console.log(`  User (CABINET): ${cabinetUser.email}`)

  // ── Users — Sénégal demo ──────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'demo-senegal@athenis.io' },
    update: {},
    create: {
      email: 'demo-senegal@athenis.io', passwordHash: hash2,
      accountType: 'COMPANY', role: 'ADMIN',
      firstName: 'Aminata', lastName: 'Diallo', companyId: companySn.id,
    },
  })
  console.log('  User (OHADA): demo-senegal@athenis.io')

  // ── Users — USA demo ──────────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'demo-usa@athenis.io' },
    update: {},
    create: {
      email: 'demo-usa@athenis.io', passwordHash: hash2,
      accountType: 'COMPANY', role: 'ADMIN',
      firstName: 'John', lastName: 'Smith', companyId: companyUs.id,
    },
  })
  console.log('  User (IFRS): demo-usa@athenis.io')

  // ── France demo user (alias) ──────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'demo-france@athenis.io' },
    update: {},
    create: {
      email: 'demo-france@athenis.io', passwordHash: hash2,
      accountType: 'COMPANY', role: 'ADMIN',
      firstName: 'Léa', lastName: 'Dupont', companyId: company.id,
    },
  })
  console.log('  User (FRANCE): demo-france@athenis.io')

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientsData = [
    { id: 'seed-client-acme',      name: 'Acme Corp',          email: 'billing@acme.example',      siren: '987654321' },
    { id: 'seed-client-techstart', name: 'TechStart SAS',       email: 'finance@techstart.example', siren: '456789123' },
    { id: 'seed-client-global',    name: 'Global Trade SARL',   email: 'compta@globaltrade.example' },
  ]
  const clients = await Promise.all(
    clientsData.map((c) =>
      prisma.client.upsert({ where: { id: c.id }, update: {}, create: { ...c, companyId: company.id } }),
    ),
  )
  console.log(`  Clients: ${clients.length}`)

  // ── Invoices ──────────────────────────────────────────────────────────────
  const invoices = [
    { number: 'FA-2026-001', clientIndex: 0, subtotal: 8_000,  status: 'PAID'    as const, issueDate: new Date('2026-01-15'), dueDate: new Date('2026-02-15') },
    { number: 'FA-2026-002', clientIndex: 1, subtotal: 12_500, status: 'SENT'    as const, issueDate: new Date('2026-03-01'), dueDate: new Date('2026-04-01') },
    { number: 'FA-2026-003', clientIndex: 0, subtotal: 3_200,  status: 'DRAFT'   as const, issueDate: new Date('2026-04-10'), dueDate: new Date('2026-05-10') },
    { number: 'FA-2026-004', clientIndex: 2, subtotal: 6_750,  status: 'OVERDUE' as const, issueDate: new Date('2026-02-01'), dueDate: new Date('2026-03-01') },
  ]
  for (const inv of invoices) {
    const tax = (inv.subtotal * 20) / 100
    const client = clients[inv.clientIndex]
    if (!client) continue
    const { clientIndex: _ci, ...invData } = inv
    await prisma.invoice.upsert({
      where: { companyId_number: { companyId: company.id, number: invData.number } },
      update: {},
      create: { ...invData, clientId: client.id, companyId: company.id, taxRate: 20, taxAmount: tax, total: invData.subtotal + tax },
    })
  }
  console.log(`  Invoices: ${invoices.length}`)

  // ── Expenses ──────────────────────────────────────────────────────────────
  // Delete and recreate to keep idempotent
  await prisma.expense.deleteMany({ where: { companyId: company.id } })
  const expenses = [
    { category: 'SOFTWARE'   as const, amount: 299,   description: 'Licence SaaS CRM',          date: new Date('2026-01-05') },
    { category: 'TRAVEL'     as const, amount: 540,   description: 'Déplacement Paris-Lyon',     date: new Date('2026-02-14') },
    { category: 'EQUIPMENT'  as const, amount: 1_800, description: 'MacBook Pro 14"',            date: new Date('2026-03-20') },
    { category: 'MARKETING'  as const, amount: 750,   description: 'Google Ads Q1',              date: new Date('2026-01-31') },
    { category: 'CONSULTING' as const, amount: 2_400, description: 'Mission comptable externe',  date: new Date('2026-04-02') },
  ]
  await Promise.all(expenses.map((e) => prisma.expense.create({ data: { ...e, companyId: company.id } })))
  console.log(`  Expenses: ${expenses.length}`)

  // ── Employees ─────────────────────────────────────────────────────────────
  // Delete and recreate to keep idempotent
  await prisma.employee.deleteMany({ where: { companyId: company.id } })
  const employees = [
    { firstName: 'Sophie', lastName: 'Martin',  email: 'sophie.martin@demo-sa.example',  employmentType: 'FULL_TIME'  as const, grossSalary: 52_000, startDate: new Date('2024-01-15') },
    { firstName: 'Lucas',  lastName: 'Dupont',  email: 'lucas.dupont@demo-sa.example',   employmentType: 'FULL_TIME'  as const, grossSalary: 45_000, startDate: new Date('2023-09-01') },
    { firstName: 'Emma',   lastName: 'Bernard', email: 'emma.bernard@demo-sa.example',   employmentType: 'PART_TIME'  as const, grossSalary: 24_000, startDate: new Date('2025-03-01') },
  ]
  await Promise.all(employees.map((e) => prisma.employee.create({ data: { ...e, companyId: company.id } })))
  console.log(`  Employees: ${employees.length}`)

  // ── Fiscal Years ─────────────────────────────────────────────────────────
  const adminUserForFY = await prisma.user.findUnique({ where: { email: 'admin@demo-sa.demo' } })
  const fyCreatedBy = adminUserForFY?.id ?? 'system'

  // 2024 — clôturé
  const fy2024 = await prisma.fiscalYear.upsert({
    where: { companyId_year: { companyId: company.id, year: 2024 } },
    update: {},
    create: {
      companyId: company.id, year: 2024,
      startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'),
      status: 'CLOSED', createdBy: fyCreatedBy,
      closedBy: fyCreatedBy, closedAt: new Date('2025-01-15'),
      openingBalance: { actif: 45000, passif: 45000 },
      closingBalance: { actif: 185000, passif: 185000, resultNet: 22300 },
    },
  })
  await prisma.fiscalYearClose.upsert({
    where: { companyId_year: { companyId: company.id, year: 2024 } },
    update: {},
    create: { companyId: company.id, year: 2024, resultNet: 22300, closedBy: fyCreatedBy },
  })

  // 2025 — en cours (exercice N-1 ouvert)
  const fy2025 = await prisma.fiscalYear.upsert({
    where: { companyId_year: { companyId: company.id, year: 2025 } },
    update: { status: 'OPEN', closedBy: null, closedAt: null },
    create: {
      companyId: company.id, year: 2025,
      startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'),
      status: 'OPEN', createdBy: fyCreatedBy,
      openingBalance: { actif: 185000, passif: 185000 },
    },
  })
  await prisma.fiscalYearClose.deleteMany({ where: { companyId: company.id, year: 2025 } })

  // 2026 — en cours
  const fy2026 = await prisma.fiscalYear.upsert({
    where: { companyId_year: { companyId: company.id, year: 2026 } },
    update: {},
    create: {
      companyId: company.id, year: 2026,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      status: 'OPEN', createdBy: fyCreatedBy,
      openingBalance: { actif: 285000, passif: 285000 },
    },
  })
  console.log('  FiscalYears: 2024 (CLOSED), 2025 (OPEN), 2026 (OPEN)')

  // ── Journal Entries — 2024 (representative) ───────────────────────────────
  await prisma.journalEntry.deleteMany({ where: { companyId: company.id } })
  const entries2024 = [
    { date: new Date('2024-03-15'), account: '411', label: 'Acme Corp — FA-2024-012', debit: 19200, credit: 0, reference: 'FA-2024-012', journalCode: 'VTE' },
    { date: new Date('2024-03-15'), account: '706', label: 'Acme Corp — FA-2024-012', debit: 0, credit: 16000, reference: 'FA-2024-012', journalCode: 'VTE' },
    { date: new Date('2024-03-15'), account: '4457', label: 'TVA collectée FA-2024-012', debit: 0, credit: 3200, reference: 'FA-2024-012', journalCode: 'VTE' },
    { date: new Date('2024-06-30'), account: '512', label: 'Règlement Acme Corp', debit: 19200, credit: 0, reference: 'VIR-2024-001', journalCode: 'BNQ' },
    { date: new Date('2024-06-30'), account: '411', label: 'Règlement Acme Corp', debit: 0, credit: 19200, reference: 'VIR-2024-001', journalCode: 'BNQ' },
    { date: new Date('2024-09-10'), account: '606', label: 'Achat matériel bureau', debit: 1800, credit: 0, reference: 'ACH-2024-045', journalCode: 'ACH' },
    { date: new Date('2024-09-10'), account: '401', label: 'Fournisseur matériel', debit: 0, credit: 1800, reference: 'ACH-2024-045', journalCode: 'ACH' },
    { date: new Date('2024-12-31'), account: '120', label: 'Résultat de l\'exercice 2024', debit: 0, credit: 22300, reference: 'CLOTURE-2024', journalCode: 'OD' },
  ]
  for (const e of entries2024) {
    await prisma.journalEntry.create({ data: { ...e, companyId: company.id, fiscalYearId: fy2024.id } })
  }

  // ── Journal Entries — 2025 ────────────────────────────────────────────────
  const entries2025 = [
    { date: new Date('2025-02-20'), account: '411', label: 'TechStart SAS — FA-2025-003', debit: 15000, credit: 0, reference: 'FA-2025-003', journalCode: 'VTE' },
    { date: new Date('2025-02-20'), account: '706', label: 'TechStart SAS — prestation', debit: 0, credit: 12500, reference: 'FA-2025-003', journalCode: 'VTE' },
    { date: new Date('2025-02-20'), account: '4457', label: 'TVA collectée FA-2025-003', debit: 0, credit: 2500, reference: 'FA-2025-003', journalCode: 'VTE' },
    { date: new Date('2025-05-15'), account: '512', label: 'Virement TechStart', debit: 15000, credit: 0, reference: 'VIR-2025-002', journalCode: 'BNQ' },
    { date: new Date('2025-05-15'), account: '411', label: 'Lettrage TechStart', debit: 0, credit: 15000, reference: 'VIR-2025-002', journalCode: 'BNQ' },
    { date: new Date('2025-07-01'), account: '641', label: 'Salaires juillet 2025', debit: 42000, credit: 0, reference: 'PAY-2025-07', journalCode: 'OD' },
    { date: new Date('2025-07-01'), account: '421', label: 'Personnel rémunérations', debit: 0, credit: 42000, reference: 'PAY-2025-07', journalCode: 'OD' },
    { date: new Date('2025-12-31'), account: '110', label: 'Report à nouveau 2024', debit: 22300, credit: 0, reference: 'RAN-2025', journalCode: 'OD' },
    { date: new Date('2025-12-31'), account: '120', label: 'Résultat exercice 2025', debit: 0, credit: 31200, reference: 'CLOTURE-2025', journalCode: 'OD' },
  ]
  for (const e of entries2025) {
    await prisma.journalEntry.create({ data: { ...e, companyId: company.id, fiscalYearId: fy2025.id } })
  }

  // ── Journal Entries — 2026 (en cours) ────────────────────────────────────
  const entries2026 = [
    { date: new Date('2026-01-15'), account: '411', label: 'Acme Corp — FA-2026-001', debit: 9600, credit: 0, reference: 'FA-2026-001', journalCode: 'VTE' },
    { date: new Date('2026-01-15'), account: '706', label: 'Acme Corp — prestation', debit: 0, credit: 8000, reference: 'FA-2026-001', journalCode: 'VTE' },
    { date: new Date('2026-01-15'), account: '4457', label: 'TVA FA-2026-001', debit: 0, credit: 1600, reference: 'FA-2026-001', journalCode: 'VTE' },
    { date: new Date('2026-03-01'), account: '411', label: 'TechStart SAS — FA-2026-002', debit: 15000, credit: 0, reference: 'FA-2026-002', journalCode: 'VTE' },
    { date: new Date('2026-03-01'), account: '706', label: 'TechStart prestation', debit: 0, credit: 12500, reference: 'FA-2026-002', journalCode: 'VTE' },
    { date: new Date('2026-03-01'), account: '4457', label: 'TVA FA-2026-002', debit: 0, credit: 2500, reference: 'FA-2026-002', journalCode: 'VTE' },
    { date: new Date('2026-01-05'), account: '606', label: 'Licence SaaS CRM', debit: 299, credit: 0, reference: 'EXP-001', journalCode: 'ACH' },
    { date: new Date('2026-01-05'), account: '401', label: 'Fournisseur SaaS', debit: 0, credit: 299, reference: 'EXP-001', journalCode: 'ACH' },
  ]
  for (const e of entries2026) {
    await prisma.journalEntry.create({ data: { ...e, companyId: company.id, fiscalYearId: fy2026.id } })
  }
  console.log(`  JournalEntries: ${entries2024.length + entries2025.length + entries2026.length} total`)

  // ── VAT Declarations — 2026 ───────────────────────────────────────────────
  const vatData = [
    { quarter: 1, year: 2026, tvaCollectee: 4100, tvaDeductible: 1200, tvaNette: 2900, status: 'FILED', filedAt: new Date('2026-04-20') },
    { quarter: 2, year: 2026, tvaCollectee: 0, tvaDeductible: 0, tvaNette: 0, status: 'DRAFT' },
  ]
  for (const v of vatData) {
    await prisma.vATDeclaration.upsert({
      where: { companyId_year_quarter: { companyId: company.id, year: v.year, quarter: v.quarter } },
      update: {},
      create: { ...v, companyId: company.id, fiscalYearId: fy2026.id, filedAt: 'filedAt' in v && v.filedAt instanceof Date ? v.filedAt : null },
    })
  }
  console.log('  VATDeclarations: Q1 2026 (FILED), Q2 2026 (DRAFT)')

  // ── Link existing invoices to FY2026 ─────────────────────────────────────
  await prisma.invoice.updateMany({ where: { companyId: company.id }, data: { fiscalYearId: fy2026.id } })
  await prisma.expense.updateMany({ where: { companyId: company.id }, data: { fiscalYearId: fy2026.id } })
  console.log('  Linked existing invoices & expenses → FY2026')

  // ── Company Roles (system) ────────────────────────────────────────────────
  const ALL_PERMS = { gestion: 'admin', comptabilite: 'admin', rh: 'admin', juridique: 'admin', esg: 'admin', settings: 'admin' }
  const READ_ALL  = { gestion: 'read',  comptabilite: 'read',  rh: 'read',  juridique: 'read',  esg: 'read',  settings: 'none' }

  const roleAdmin = await prisma.companyRole.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Administrateur' } },
    update: {},
    create: { companyId: company.id, name: 'Administrateur', description: 'Accès total à tous les modules', isSystem: true, permissions: ALL_PERMS },
  })
  const roleComptable = await prisma.companyRole.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Comptable' } },
    update: {},
    create: { companyId: company.id, name: 'Comptable', description: 'Accès Gestion + Comptabilité', isSystem: true, permissions: { gestion: 'write', comptabilite: 'write', rh: 'read', juridique: 'read', esg: 'read', settings: 'none' } },
  })
  const roleRH = await prisma.companyRole.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Responsable RH' } },
    update: {},
    create: { companyId: company.id, name: 'Responsable RH', description: 'Accès RH uniquement', isSystem: true, permissions: { gestion: 'read', comptabilite: 'none', rh: 'write', juridique: 'read', esg: 'none', settings: 'none' } },
  })
  const roleReadonly = await prisma.companyRole.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Lecture seule' } },
    update: {},
    create: { companyId: company.id, name: 'Lecture seule', description: 'Accès en lecture sur tous les modules', isSystem: true, permissions: READ_ALL },
  })

  // ── Custom role démo ──────────────────────────────────────────────────────
  const roleCommercial = await prisma.companyRole.upsert({
    where: { companyId_name: { companyId: company.id, name: 'Responsable commercial' } },
    update: {},
    create: { companyId: company.id, name: 'Responsable commercial', description: 'Gestion écriture + Comptabilité lecture', isSystem: false, permissions: { gestion: 'write', comptabilite: 'read', rh: 'none', juridique: 'read', esg: 'none', settings: 'none' } },
  })
  console.log('  CompanyRoles: 5 créés (4 système + 1 custom)')

  // ── Company Users (link existing users to their roles) ────────────────────
  const userRoleMap: { email: string; role: typeof roleAdmin }[] = [
    { email: 'admin@demo-sa.demo',     role: roleAdmin    },
    { email: 'comptable@demo-sa.demo', role: roleComptable },
    { email: 'rh@demo-sa.demo',        role: roleRH       },
    { email: 'viewer@demo-sa.demo',    role: roleReadonly  },
    { email: 'juridique@demo-sa.demo', role: roleCommercial },
  ]
  for (const { email, role } of userRoleMap) {
    const u = await prisma.user.findUnique({ where: { email } })
    if (!u) continue
    await prisma.companyUser.upsert({
      where: { companyId_userId: { companyId: company.id, userId: u.id } },
      update: {},
      create: { companyId: company.id, userId: u.id, roleId: role.id, status: email === 'viewer@demo-sa.demo' ? 'INACTIVE' : 'ACTIVE', joinedAt: new Date('2026-01-01') },
    })
  }
  console.log('  CompanyUsers: 5 créés')

  // ── Pending invitation ────────────────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@demo-sa.demo' } })
  if (adminUser) {
    await prisma.invitation.upsert({
      where: { token: 'demo-invitation-token-fixed' },
      update: {},
      create: {
        companyId: company.id,
        email: 'invitation@test.fr',
        roleId: roleReadonly.id,
        token: 'demo-invitation-token-fixed',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        createdBy: adminUser.id,
      },
    })
    console.log('  Invitation: invitation@test.fr (en attente)')
  }

  // ── ESG ───────────────────────────────────────────────────────────────────
  await prisma.eSGData.upsert({
    where: { companyId_year: { companyId: company.id, year: 2025 } },
    update: {},
    create: {
      companyId: company.id, year: 2025,
      scope1Total: 12.4, energyKwh: 48_500, wasteKg: 320,
      genderPayGap: 3.2, trainingHours: 24,
    },
  })
  console.log('  ESG: 2025')

  // ══════════════════════════════════════════════════════════════════════════
  // UBM CONSULTING SARL — CAMEROUN (OHADA · SYSCOHADA · PREMIUM)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n  \uD83C\uDDE8\uD83C\uDDF2  Seeding UBM Consulting SARL (Cameroun OHADA)…')

  const hashUbm = await bcrypt.hash('UBM2026!', BCRYPT_ROUNDS)

  // ── Société ───────────────────────────────────────────────────────────────
  const companyUbm = await prisma.company.upsert({
    where:  { siren: 'CM-UBM-001' },
    update: {
      modules:        PLAN_MODULES.PREMIUM,
      country: 'CM', currency: 'XAF', currencySymbol: 'F CFA',
      accountingZone: 'OHADA', accountingPlan: 'SYSCOHADA R\xe9vis\xe9 2017',
      vatRates: [19.25], locale: 'fr-CM', timezone: 'Africa/Douala',
    },
    create: {
      name:          'UBM Consulting SARL',
      siren:         'CM-UBM-001',
      siret:         'RC/DLA/2020/B/1247',
      secteur:       'Services / Conseil aux entreprises',
      taille:        'PME',
      plan:          'PREMIUM',
      modules:       PLAN_MODULES.PREMIUM,
      country:       'CM', currency: 'XAF', currencySymbol: 'F CFA',
      accountingZone: 'OHADA', accountingPlan: 'SYSCOHADA R\xe9vis\xe9 2017',
      vatRates:      [19.25], locale: 'fr-CM', timezone: 'Africa/Douala',
      legalForm:     'SARL',
      vatNumber:     'M021512789456K',
      capital:       5_000_000,
      address:       'Rue Joss, Akwa, Douala',
      city:          'Douala',
      phone:         '+237 699 123 456',
      contactEmail:  'contact@ubm-consulting.cm',
      website:       'www.ubm-consulting.cm',
      paymentTerms:  30,
      securityPolicy: {
        minPasswordLength: 8, sessionExpiry: 4,
        maxFailedAttempts: 5, require2faForAdmin: false,
      },
    },
  })
  console.log(`  Company: ${companyUbm.name} (${companyUbm.plan} \xb7 ${companyUbm.country})`)

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  const userUbm = await prisma.user.upsert({
    where:  { email: 'ubm@comptalia.fr' },
    update: {},
    create: {
      email: 'ubm@comptalia.fr', passwordHash: hashUbm,
      accountType: 'COMPANY', role: 'ADMIN',
      firstName: 'Urbain', lastName: 'Bello Moukouri',
      companyId: companyUbm.id, totpEnabled: false,
    },
  })

  const hashCarine = await bcrypt.hash('Carine2026!', BCRYPT_ROUNDS)
  const userCarine = await prisma.user.upsert({
    where:  { email: 'carine.ekodeck@ubm.cm' },
    update: {},
    create: {
      email: 'carine.ekodeck@ubm.cm', passwordHash: hashCarine,
      accountType: 'COMPANY', role: 'COMPTABLE',
      firstName: 'Carine', lastName: 'Ekodeck',
      companyId: companyUbm.id, totpEnabled: true,
    },
  })

  const hashRomuald = await bcrypt.hash('Romuald2026!', BCRYPT_ROUNDS)
  const userRomuald = await prisma.user.upsert({
    where:  { email: 'romuald.essomba@ubm.cm' },
    update: {},
    create: {
      email: 'romuald.essomba@ubm.cm', passwordHash: hashRomuald,
      accountType: 'COMPANY', role: 'READONLY',
      firstName: 'Romuald', lastName: 'Essomba',
      companyId: companyUbm.id, totpEnabled: false,
    },
  })
  console.log('  Users UBM: Urbain (ADMIN) · Carine (COMPTABLE) · Romuald (READONLY)')

  // ── Clients (10) ──────────────────────────────────────────────────────────
  const ubmClientsData = [
    { id: 'ubm-cl-mtn',      name: 'MTN Cameroun SA',         email: 'procurement@mtn.cm',               phone: '+237 222 504 000', address: 'Douala, Cameroun',  siren: 'CM-MTN-001'  },
    { id: 'ubm-cl-bgfi',     name: 'BGFI Bank Cameroun',      email: 'contact@bgfibank.cm',               phone: '+237 233 505 000', address: 'Douala, Cameroun',  siren: 'CM-BGFI-001' },
    { id: 'ubm-cl-kadji',    name: 'Groupe Kadji & Cie',      email: 'direction@groupekadji.cm',          phone: '+237 233 421 500', address: 'Douala, Cameroun',  siren: 'CM-KADJI-01' },
    { id: 'ubm-cl-camtel',   name: 'CAMTEL',                  email: 'dg@camtel.cm',                     phone: '+237 222 233 000', address: 'Yaound\xe9, Cameroun', siren: 'CM-CAMTEL-1' },
    { id: 'ubm-cl-sgcm',     name: 'Soci\xe9t\xe9 G\xe9n\xe9rale CM',   email: 'info@sgcameroun.cm',    phone: '+237 233 504 444', address: 'Douala, Cameroun',  siren: 'CM-SGCM-001' },
    { id: 'ubm-cl-dangote',  name: 'Dangote Cement CM',       email: 'cm@dangotecement.com',             phone: '+237 699 888 777', address: 'Douala, Cameroun',  siren: 'CM-DANG-001' },
    { id: 'ubm-cl-mbarga',   name: 'Jean-Paul Mbarga',        email: 'jpmbarga@gmail.com',               phone: '+237 677 234 567', address: 'Yaound\xe9, Cameroun', siren: undefined     },
    { id: 'ubm-cl-fatou',    name: 'Fatou Ndiaye Consulting', email: 'fatou.ndiaye@consulting.sn',       phone: '+221 77 123 4567', address: 'Dakar, S\xe9n\xe9gal',  siren: undefined     },
    { id: 'ubm-cl-total',    name: 'Total Energies CM',       email: 'cm.procurement@totalenergies.com', phone: '+237 233 401 000', address: 'Douala, Cameroun',  siren: 'CM-TOTAL-01' },
    { id: 'ubm-cl-afriland', name: 'Afriland First Bank',     email: 'direction@afrilandfirstbank.com',  phone: '+237 222 237 010', address: 'Yaound\xe9, Cameroun', siren: 'CM-AFL-001'  },
  ]
  const ubmClients = await Promise.all(
    ubmClientsData.map(({ id, siren: cs, ...rest }) =>
      prisma.client.upsert({
        where: { id },
        update: {},
        create: { id, ...rest, ...(cs ? { siren: cs } : {}), companyId: companyUbm.id },
      }),
    ),
  )
  console.log(`  Clients UBM: ${ubmClients.length}`)

  // ── Exercices comptables ───────────────────────────────────────────────────
  const ubmFy2024 = await prisma.fiscalYear.upsert({
    where:  { companyId_year: { companyId: companyUbm.id, year: 2024 } },
    update: {},
    create: {
      companyId: companyUbm.id, year: 2024,
      startDate: new Date('2024-01-01'), endDate: new Date('2024-12-31'),
      status: 'CLOSED', createdBy: userUbm.id,
      closedBy: userCarine.id, closedAt: new Date('2025-03-31'),
      openingBalance: { actif: 8_000_000, passif: 8_000_000 },
      closingBalance: { actif: 42_000_000, passif: 42_000_000, resultatNet: 12_800_000 },
    },
  })
  await prisma.fiscalYearClose.upsert({
    where:  { companyId_year: { companyId: companyUbm.id, year: 2024 } },
    update: {},
    create: {
      companyId: companyUbm.id, year: 2024,
      resultNet: 12_800_000, closedBy: userCarine.id,
      notes: 'Cl\xf4ture exercice 2024 valid\xe9e par Carine Ekodeck (DAF) le 31/03/2025',
    },
  })

  const ubmFy2025 = await prisma.fiscalYear.upsert({
    where:  { companyId_year: { companyId: companyUbm.id, year: 2025 } },
    update: { status: 'OPEN', closedBy: null, closedAt: null },
    create: {
      companyId: companyUbm.id, year: 2025,
      startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'),
      status: 'OPEN', createdBy: userUbm.id,
      openingBalance: { actif: 42_000_000, passif: 42_000_000 },
    },
  })
  await prisma.fiscalYearClose.deleteMany({ where: { companyId: companyUbm.id, year: 2025 } })

  const ubmFy2026 = await prisma.fiscalYear.upsert({
    where:  { companyId_year: { companyId: companyUbm.id, year: 2026 } },
    update: {},
    create: {
      companyId: companyUbm.id, year: 2026,
      startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'),
      status: 'OPEN', createdBy: userUbm.id,
      openingBalance: { actif: 46_550_000, passif: 46_550_000 },
    },
  })
  console.log('  FiscalYears UBM: 2024 (CLOSED) · 2025 (OPEN) · 2026 (OPEN)')

  // ── Factures 2025 (8 factures — CA 68 500 000 F CFA HT) ──────────────────
  // Helpers TVA 19.25%
  const vatCm  = (ht: number) => Math.round(ht * 0.1925)
  const ttcCm  = (ht: number) => ht + vatCm(ht)

  const ubmInv2025 = [
    { number: 'FAC-2025/001', clientId: 'ubm-cl-mtn',      ht: 8_500_000,  status: 'PAID'    as const, issue: '2025-01-15', due: '2025-02-15', paid: '2025-02-10', notes: 'Audit organisationnel MTN Q1 2025'                  },
    { number: 'FAC-2025/002', clientId: 'ubm-cl-total',     ht: 12_000_000, status: 'PAID'    as const, issue: '2025-03-01', due: '2025-04-01', paid: '2025-03-28', notes: 'Conseil strat\xe9gique HSE — Phase 1'                 },
    { number: 'FAC-2025/003', clientId: 'ubm-cl-kadji',     ht: 9_500_000,  status: 'PAID'    as const, issue: '2025-05-10', due: '2025-06-10', paid: '2025-06-05', notes: 'Restructuration organisationnelle Kadji 2025'         },
    { number: 'FAC-2025/004', clientId: 'ubm-cl-bgfi',      ht: 7_200_000,  status: 'PAID'    as const, issue: '2025-07-01', due: '2025-08-01', paid: '2025-07-28', notes: 'Transformation digitale BGFI — Phase 2'              },
    { number: 'FAC-2025/005', clientId: 'ubm-cl-camtel',    ht: 6_800_000,  status: 'PAID'    as const, issue: '2025-09-01', due: '2025-10-01', paid: '2025-09-25', notes: 'Audit SI CAMTEL — rapport final'                     },
    { number: 'FAC-2025/006', clientId: 'ubm-cl-sgcm',      ht: 8_700_000,  status: 'PAID'    as const, issue: '2025-11-01', due: '2025-12-01', paid: '2025-11-28', notes: 'Conseil conformit\xe9 r\xe9glementaire SGCM'           },
    { number: 'FAC-2025/007', clientId: 'ubm-cl-mbarga',    ht: 1_200_000,  status: 'OVERDUE' as const, issue: '2025-10-01', due: '2025-11-01', paid: null,         notes: 'Conseil cr\xe9ation entreprise — solde d\xfb'           },
    { number: 'FAC-2025/008', clientId: 'ubm-cl-afriland',  ht: 14_600_000, status: 'OVERDUE' as const, issue: '2025-12-01', due: '2025-12-31', paid: null,         notes: 'Mission audit interne Afriland — facture non r\xe9gl\xe9e' },
  ]
  for (const inv of ubmInv2025) {
    const tax = vatCm(inv.ht); const tot = ttcCm(inv.ht)
    await prisma.invoice.upsert({
      where:  { companyId_number: { companyId: companyUbm.id, number: inv.number } },
      update: {},
      create: {
        number: inv.number, companyId: companyUbm.id, clientId: inv.clientId,
        status: inv.status, issueDate: new Date(inv.issue), dueDate: new Date(inv.due),
        subtotal: inv.ht, taxRate: 19.25, taxAmount: tax, total: tot,
        paidAt: inv.paid ? new Date(inv.paid) : null,
        notes: inv.notes, fiscalYearId: ubmFy2025.id,
      },
    })
  }
  console.log('  Invoices UBM 2025: 8 (6 PAID · 2 OVERDUE)')

  // ── Factures 2026 (12 factures) ────────────────────────────────────────────
  const ubmInv2026 = [
    { number: 'FAC-2026/001', clientId: 'ubm-cl-mtn',      ht: 4_500_000, status: 'PAID'    as const, issue: '2026-01-05', due: '2026-02-05', paid: '2026-01-20', notes: 'Audit organisationnel et transformation digitale Q1' },
    { number: 'FAC-2026/002', clientId: 'ubm-cl-bgfi',     ht: 3_200_000, status: 'PAID'    as const, issue: '2026-01-10', due: '2026-02-10', paid: '2026-01-25', notes: 'Conseil strat\xe9gie digitale BGFI \u2014 Phase 1'      },
    { number: 'FAC-2026/003', clientId: 'ubm-cl-kadji',    ht: 6_800_000, status: 'PAID'    as const, issue: '2026-01-15', due: '2026-02-15', paid: '2026-01-30', notes: 'Restructuration organisationnelle Groupe Kadji'       },
    { number: 'FAC-2026/004', clientId: 'ubm-cl-total',    ht: 8_500_000, status: 'PAID'    as const, issue: '2026-02-01', due: '2026-03-01', paid: '2026-02-15', notes: 'Formation management \u2014 5 jours Douala'            },
    { number: 'FAC-2026/005', clientId: 'ubm-cl-camtel',   ht: 5_200_000, status: 'PAID'    as const, issue: '2026-02-10', due: '2026-03-10', paid: '2026-02-25', notes: 'Audit syst\xe8me d\u2019information CAMTEL'            },
    { number: 'FAC-2026/006', clientId: 'ubm-cl-sgcm',     ht: 4_800_000, status: 'PAID'    as const, issue: '2026-03-01', due: '2026-04-01', paid: '2026-03-15', notes: 'Conseil conformit\xe9 r\xe9glementaire SGCM'           },
    { number: 'FAC-2026/007', clientId: 'ubm-cl-dangote',  ht: 7_200_000, status: 'PAID'    as const, issue: '2026-03-10', due: '2026-04-10', paid: '2026-03-28', notes: 'Optimisation cha\xeene logistique Dangote'            },
    { number: 'FAC-2026/008', clientId: 'ubm-cl-mtn',      ht: 5_500_000, status: 'SENT'    as const, issue: '2026-04-01', due: '2026-05-01', paid: null,         notes: 'Transformation digitale Q2 \u2014 Phase 2'           },
    { number: 'FAC-2026/009', clientId: 'ubm-cl-total',    ht: 9_200_000, status: 'SENT'    as const, issue: '2026-04-05', due: '2026-05-05', paid: null,         notes: 'Conseil strat\xe9gique HSE et RSE'                   },
    { number: 'FAC-2026/010', clientId: 'ubm-cl-afriland', ht: 6_500_000, status: 'SENT'    as const, issue: '2026-04-08', due: '2026-05-08', paid: null,         notes: 'Audit interne et contr\xf4le de gestion Afriland'    },
    { number: 'FAC-2026/011', clientId: 'ubm-cl-mbarga',   ht:   850_000, status: 'OVERDUE' as const, issue: '2026-02-01', due: '2026-03-03', paid: null,         notes: 'Conseil cr\xe9ation d\u2019entreprise \u2014 OVERDUE' },
    { number: 'FAC-2026/012', clientId: 'ubm-cl-fatou',    ht: 1_500_000, status: 'OVERDUE' as const, issue: '2026-02-15', due: '2026-03-17', paid: null,         notes: 'Formation comptabilit\xe9 SYSCOHADA \u2014 OVERDUE'   },
  ]
  for (const inv of ubmInv2026) {
    const tax = vatCm(inv.ht); const tot = ttcCm(inv.ht)
    await prisma.invoice.upsert({
      where:  { companyId_number: { companyId: companyUbm.id, number: inv.number } },
      update: {},
      create: {
        number: inv.number, companyId: companyUbm.id, clientId: inv.clientId,
        status: inv.status, issueDate: new Date(inv.issue), dueDate: new Date(inv.due),
        subtotal: inv.ht, taxRate: 19.25, taxAmount: tax, total: tot,
        paidAt: inv.paid ? new Date(inv.paid) : null,
        notes: inv.notes, fiscalYearId: ubmFy2026.id,
      },
    })
  }
  console.log('  Invoices UBM 2026: 12 (7 PAID · 3 SENT · 2 OVERDUE)')

  // ── D\xe9penses 2026 (15) ────────────────────────────────────────────────────
  await prisma.expense.deleteMany({ where: { companyId: companyUbm.id } })
  const ubmExpenses2026 = [
    { cat: 'RENT'      as const, amt:    650_000, desc: 'Loyer bureaux Akwa Douala \u2014 janvier 2026',    date: '2026-01-01' },
    { cat: 'RENT'      as const, amt:    650_000, desc: 'Loyer bureaux Akwa Douala \u2014 f\xe9vrier 2026', date: '2026-02-01' },
    { cat: 'RENT'      as const, amt:    650_000, desc: 'Loyer bureaux Akwa Douala \u2014 mars 2026',       date: '2026-03-01' },
    { cat: 'RENT'      as const, amt:    650_000, desc: 'Loyer bureaux Akwa Douala \u2014 avril 2026',      date: '2026-04-01' },
    { cat: 'SOFTWARE'  as const, amt:     85_000, desc: 'Orange Business CM \u2014 Internet fibre',         date: '2026-01-05' },
    { cat: 'TRAVEL'    as const, amt:    120_000, desc: 'Carburant v\xe9hicule soci\xe9t\xe9 (Toyota)',      date: '2026-01-15' },
    { cat: 'TRAVEL'    as const, amt:    580_000, desc: 'Billet Air France DLA-CDG \u2014 mission Paris',   date: '2026-01-20' },
    { cat: 'TRAVEL'    as const, amt:    245_000, desc: 'H\xf4tel Hilton Douala \u2014 s\xe9minaire MTN',   date: '2026-01-25' },
    { cat: 'EQUIPMENT' as const, amt:     95_000, desc: 'Fournitures bureau \u2014 Score CM',               date: '2026-02-02' },
    { cat: 'SALARY'    as const, amt:  4_850_000, desc: 'Salaires nets janvier 2026',                       date: '2026-01-28' },
    { cat: 'SALARY'    as const, amt:  4_850_000, desc: 'Salaires nets f\xe9vrier 2026',                    date: '2026-02-28' },
    { cat: 'SALARY'    as const, amt:  4_850_000, desc: 'Salaires nets mars 2026',                          date: '2026-03-31' },
    { cat: 'MARKETING' as const, amt:    180_000, desc: 'Publicit\xe9 LinkedIn + Facebook \u2014 recrutement', date: '2026-02-10' },
    { cat: 'OTHER'     as const, amt:    320_000, desc: 'Assurance ACTIVA Cameroun \u2014 RC Pro annuelle', date: '2026-01-01' },
    { cat: 'CONSULTING' as const, amt:   150_000, desc: 'Maintenance informatique \u2014 prestataire Douala', date: '2026-03-15' },
  ]
  await Promise.all(
    ubmExpenses2026.map(({ cat, amt, desc, date }) =>
      prisma.expense.create({
        data: { companyId: companyUbm.id, category: cat, amount: amt, description: desc, date: new Date(date), fiscalYearId: ubmFy2026.id },
      }),
    ),
  )
  console.log('  Expenses UBM 2026: 15')

  // ── Journal comptable 2024 (exercice cl\xf4tur\xe9 — \xe9critures repr\xe9sentatives) ──────
  await prisma.journalEntry.deleteMany({ where: { companyId: companyUbm.id } })

  const ubmJnl2024 = [
    { date: '2024-03-15', account: '411',  label: 'Clients MTN \u2014 FAC-2024/010',          debit: 10_146_250, credit: 0,           ref: 'FAC-2024/010', jc: 'VTE' },
    { date: '2024-03-15', account: '701',  label: 'Prestations services FAC-2024/010',         debit: 0,          credit: 8_500_000,   ref: 'FAC-2024/010', jc: 'VTE' },
    { date: '2024-03-15', account: '4435', label: 'TVA collect\xe9e FAC-2024/010',             debit: 0,          credit: 1_646_250,   ref: 'FAC-2024/010', jc: 'VTE' },
    { date: '2024-06-30', account: '521',  label: 'Virement MTN \u2014 r\xe8glement',           debit: 10_146_250, credit: 0,           ref: 'VIR-2024/010', jc: 'BNQ' },
    { date: '2024-06-30', account: '411',  label: 'Lettrage MTN FAC-2024/010',                 debit: 0,          credit: 10_146_250,  ref: 'VIR-2024/010', jc: 'BNQ' },
    { date: '2024-07-01', account: '661',  label: 'R\xe9mun\xe9rations Q2 2024',               debit: 14_550_000, credit: 0,           ref: 'PAY-2024-Q2',  jc: 'OD'  },
    { date: '2024-07-01', account: '521',  label: 'Virement salaires Q2 2024',                 debit: 0,          credit: 14_550_000,  ref: 'PAY-2024-Q2',  jc: 'OD'  },
    { date: '2024-12-31', account: '12',   label: 'R\xe9sultat exercice 2024',                 debit: 0,          credit: 12_800_000,  ref: 'CLOTURE-2024', jc: 'OD'  },
  ]
  for (const e of ubmJnl2024)
    await prisma.journalEntry.create({ data: { companyId: companyUbm.id, fiscalYearId: ubmFy2024.id, date: new Date(e.date), account: e.account, label: e.label, debit: e.debit, credit: e.credit, reference: e.ref, journalCode: e.jc } })

  // ── Journal comptable 2025 (exercice en cours) ────────────────────────────
  const ubmJnl2025 = [
    // Ventes FAC-2025/001 MTN
    { date: '2025-01-15', account: '411',  label: 'Clients MTN \u2014 FAC-2025/001',           debit: 10_146_250, credit: 0,           ref: 'FAC-2025/001', jc: 'VTE' },
    { date: '2025-01-15', account: '701',  label: 'Prestations FAC-2025/001',                  debit: 0,          credit: 8_500_000,   ref: 'FAC-2025/001', jc: 'VTE' },
    { date: '2025-01-15', account: '4435', label: 'TVA collect\xe9e FAC-2025/001',              debit: 0,          credit: 1_646_250,   ref: 'FAC-2025/001', jc: 'VTE' },
    // Ventes FAC-2025/002 Total Energies
    { date: '2025-03-01', account: '411',  label: 'Clients Total Energies \u2014 FAC-2025/002', debit: 14_310_000, credit: 0,           ref: 'FAC-2025/002', jc: 'VTE' },
    { date: '2025-03-01', account: '701',  label: 'Prestations FAC-2025/002',                  debit: 0,          credit: 12_000_000,  ref: 'FAC-2025/002', jc: 'VTE' },
    { date: '2025-03-01', account: '4435', label: 'TVA collect\xe9e FAC-2025/002',              debit: 0,          credit: 2_310_000,   ref: 'FAC-2025/002', jc: 'VTE' },
    // R\xe8glements bancaires 2025
    { date: '2025-02-10', account: '521',  label: 'Virement MTN \u2014 FAC-2025/001',           debit: 10_146_250, credit: 0,           ref: 'VIR-2025/001', jc: 'BNQ' },
    { date: '2025-02-10', account: '411',  label: 'Lettrage MTN FAC-2025/001',                  debit: 0,          credit: 10_146_250,  ref: 'VIR-2025/001', jc: 'BNQ' },
    { date: '2025-03-28', account: '521',  label: 'Virement Total \u2014 FAC-2025/002',          debit: 14_310_000, credit: 0,           ref: 'VIR-2025/002', jc: 'BNQ' },
    { date: '2025-03-28', account: '411',  label: 'Lettrage Total FAC-2025/002',                debit: 0,          credit: 14_310_000,  ref: 'VIR-2025/002', jc: 'BNQ' },
    // Ventes FAC-2025/003 Kadji
    { date: '2025-05-10', account: '411',  label: 'Clients Kadji \u2014 FAC-2025/003',          debit: 11_328_750, credit: 0,           ref: 'FAC-2025/003', jc: 'VTE' },
    { date: '2025-05-10', account: '701',  label: 'Prestations FAC-2025/003',                  debit: 0,          credit: 9_500_000,   ref: 'FAC-2025/003', jc: 'VTE' },
    { date: '2025-05-10', account: '4435', label: 'TVA collect\xe9e FAC-2025/003',              debit: 0,          credit: 1_828_750,   ref: 'FAC-2025/003', jc: 'VTE' },
    // Charges : Salaires H1 2025 (agr\xe9g\xe9)
    { date: '2025-06-30', account: '661',  label: 'R\xe9mun\xe9rations nettes H1 2025',          debit: 29_100_000, credit: 0,           ref: 'PAY-2025-H1',  jc: 'OD'  },
    { date: '2025-06-30', account: '521',  label: 'Virement salaires H1 2025',                  debit: 0,          credit: 29_100_000,  ref: 'PAY-2025-H1',  jc: 'OD'  },
    // Charges : Loyers H1 2025
    { date: '2025-06-30', account: '612',  label: 'Locations bureaux H1 2025',                  debit: 3_900_000,  credit: 0,           ref: 'LOY-2025-H1',  jc: 'ACH' },
    { date: '2025-06-30', account: '521',  label: 'Paiements loyers H1 2025',                   debit: 0,          credit: 3_900_000,   ref: 'LOY-2025-H1',  jc: 'ACH' },
    // Report \xe0 nouveau 2024
    { date: '2025-01-01', account: '11',   label: 'Report \xe0 nouveau exercice 2024',           debit: 0,          credit: 12_800_000,  ref: 'RAN-2025',     jc: 'OD'  },
    { date: '2025-01-01', account: '12',   label: 'Afectation r\xe9sultat 2024',                 debit: 12_800_000, credit: 0,           ref: 'RAN-2025',     jc: 'OD'  },
    // Ventes FAC-2025/006 SGCM
    { date: '2025-11-01', account: '411',  label: 'Clients SGCM \u2014 FAC-2025/006',            debit: 10_374_750, credit: 0,           ref: 'FAC-2025/006', jc: 'VTE' },
    { date: '2025-11-01', account: '701',  label: 'Prestations FAC-2025/006',                  debit: 0,          credit: 8_700_000,   ref: 'FAC-2025/006', jc: 'VTE' },
    { date: '2025-11-01', account: '4435', label: 'TVA collect\xe9e FAC-2025/006',              debit: 0,          credit: 1_674_750,   ref: 'FAC-2025/006', jc: 'VTE' },
  ]
  for (const e of ubmJnl2025)
    await prisma.journalEntry.create({ data: { companyId: companyUbm.id, fiscalYearId: ubmFy2025.id, date: new Date(e.date), account: e.account, label: e.label, debit: e.debit, credit: e.credit, reference: e.ref, journalCode: e.jc } })

  // ── Journal comptable 2026 (42 \xe9critures Q1) ────────────────────────────
  const ubmJnl2026 = [
    // ── JANVIER 2026 ─────────────────────────────────────────────────────────
    // FAC-2026/001 — MTN Cameroun SA (4 500 000 HT)
    { date: '2026-01-05', account: '411',  label: 'Clients MTN \u2014 FAC-2026/001',            debit: 5_366_250, credit: 0,           ref: 'FAC-2026/001', jc: 'VTE' },
    { date: '2026-01-05', account: '701',  label: 'Prestations services FAC-2026/001',          debit: 0,         credit: 4_500_000,   ref: 'FAC-2026/001', jc: 'VTE' },
    { date: '2026-01-05', account: '4435', label: 'TVA collect\xe9e FAC-2026/001',               debit: 0,         credit: 866_250,     ref: 'FAC-2026/001', jc: 'VTE' },
    // FAC-2026/002 — BGFI Bank (3 200 000 HT)
    { date: '2026-01-10', account: '411',  label: 'Clients BGFI \u2014 FAC-2026/002',            debit: 3_816_000, credit: 0,           ref: 'FAC-2026/002', jc: 'VTE' },
    { date: '2026-01-10', account: '701',  label: 'Prestations services FAC-2026/002',          debit: 0,         credit: 3_200_000,   ref: 'FAC-2026/002', jc: 'VTE' },
    { date: '2026-01-10', account: '4435', label: 'TVA collect\xe9e FAC-2026/002',               debit: 0,         credit: 616_000,     ref: 'FAC-2026/002', jc: 'VTE' },
    // FAC-2026/003 — Groupe Kadji (6 800 000 HT)
    { date: '2026-01-15', account: '411',  label: 'Clients Kadji \u2014 FAC-2026/003',           debit: 8_109_000, credit: 0,           ref: 'FAC-2026/003', jc: 'VTE' },
    { date: '2026-01-15', account: '701',  label: 'Prestations services FAC-2026/003',          debit: 0,         credit: 6_800_000,   ref: 'FAC-2026/003', jc: 'VTE' },
    { date: '2026-01-15', account: '4435', label: 'TVA collect\xe9e FAC-2026/003',               debit: 0,         credit: 1_309_000,   ref: 'FAC-2026/003', jc: 'VTE' },
    // Loyer janvier
    { date: '2026-01-01', account: '612',  label: 'Location bureaux Akwa \u2014 janvier 2026',  debit: 650_000,   credit: 0,           ref: 'DEP-2026/001', jc: 'ACH' },
    { date: '2026-01-01', account: '521',  label: 'Paiement loyer janvier 2026',                debit: 0,         credit: 650_000,     ref: 'DEP-2026/001', jc: 'ACH' },
    // Assurance ACTIVA
    { date: '2026-01-01', account: '625',  label: 'Assurance RC Pro ACTIVA 2026',               debit: 320_000,   credit: 0,           ref: 'DEP-2026/014', jc: 'ACH' },
    { date: '2026-01-01', account: '521',  label: 'R\xe8glement assurance ACTIVA',               debit: 0,         credit: 320_000,     ref: 'DEP-2026/014', jc: 'ACH' },
    // Salaires janvier
    { date: '2026-01-28', account: '661',  label: 'R\xe9mun\xe9rations directes jan. 2026',       debit: 4_850_000, credit: 0,           ref: 'PAY-2026/01',  jc: 'OD'  },
    { date: '2026-01-28', account: '521',  label: 'Virement salaires janvier 2026',              debit: 0,         credit: 4_850_000,   ref: 'PAY-2026/01',  jc: 'OD'  },
    // R\xe8glements clients janvier
    { date: '2026-01-20', account: '521',  label: 'Virement MTN \u2014 r\xe8glement FAC-2026/001', debit: 5_366_250, credit: 0,          ref: 'VIR-2026/001', jc: 'BNQ' },
    { date: '2026-01-20', account: '411',  label: 'Lettrage MTN FAC-2026/001',                   debit: 0,         credit: 5_366_250,   ref: 'VIR-2026/001', jc: 'BNQ' },
    // ── F\xc9VRIER 2026 ────────────────────────────────────────────────────────
    // FAC-2026/004 — Total Energies (8 500 000 HT)
    { date: '2026-02-01', account: '411',  label: 'Clients Total Energies \u2014 FAC-2026/004',  debit: 10_136_250, credit: 0,          ref: 'FAC-2026/004', jc: 'VTE' },
    { date: '2026-02-01', account: '701',  label: 'Prestations services FAC-2026/004',           debit: 0,          credit: 8_500_000,  ref: 'FAC-2026/004', jc: 'VTE' },
    { date: '2026-02-01', account: '4435', label: 'TVA collect\xe9e FAC-2026/004',                debit: 0,          credit: 1_636_250,  ref: 'FAC-2026/004', jc: 'VTE' },
    // FAC-2026/005 — CAMTEL (5 200 000 HT)
    { date: '2026-02-10', account: '411',  label: 'Clients CAMTEL \u2014 FAC-2026/005',           debit: 6_201_000, credit: 0,           ref: 'FAC-2026/005', jc: 'VTE' },
    { date: '2026-02-10', account: '701',  label: 'Prestations services FAC-2026/005',           debit: 0,         credit: 5_200_000,   ref: 'FAC-2026/005', jc: 'VTE' },
    { date: '2026-02-10', account: '4435', label: 'TVA collect\xe9e FAC-2026/005',                debit: 0,         credit: 1_001_000,   ref: 'FAC-2026/005', jc: 'VTE' },
    // Loyer f\xe9vrier
    { date: '2026-02-01', account: '612',  label: 'Location bureaux Akwa \u2014 f\xe9vrier 2026', debit: 650_000,   credit: 0,           ref: 'DEP-2026/002', jc: 'ACH' },
    { date: '2026-02-01', account: '521',  label: 'Paiement loyer f\xe9vrier 2026',               debit: 0,         credit: 650_000,     ref: 'DEP-2026/002', jc: 'ACH' },
    // Salaires f\xe9vrier
    { date: '2026-02-28', account: '661',  label: 'R\xe9mun\xe9rations directes f\xe9v. 2026',     debit: 4_850_000, credit: 0,           ref: 'PAY-2026/02',  jc: 'OD'  },
    { date: '2026-02-28', account: '521',  label: 'Virement salaires f\xe9vrier 2026',             debit: 0,         credit: 4_850_000,   ref: 'PAY-2026/02',  jc: 'OD'  },
    // R\xe8glements clients f\xe9vrier
    { date: '2026-02-15', account: '521',  label: 'Virement Total \u2014 r\xe8glement FAC-2026/004', debit: 10_136_250, credit: 0,        ref: 'VIR-2026/004', jc: 'BNQ' },
    { date: '2026-02-15', account: '411',  label: 'Lettrage Total FAC-2026/004',                  debit: 0,          credit: 10_136_250, ref: 'VIR-2026/004', jc: 'BNQ' },
    { date: '2026-02-25', account: '521',  label: 'Virement CAMTEL \u2014 FAC-2026/005',           debit: 6_201_000,  credit: 0,          ref: 'VIR-2026/005', jc: 'BNQ' },
    { date: '2026-02-25', account: '411',  label: 'Lettrage CAMTEL FAC-2026/005',                 debit: 0,          credit: 6_201_000,  ref: 'VIR-2026/005', jc: 'BNQ' },
    // ── MARS 2026 ─────────────────────────────────────────────────────────────
    // FAC-2026/006 — Soci\xe9t\xe9 G\xe9n\xe9rale CM (4 800 000 HT)
    { date: '2026-03-01', account: '411',  label: 'Clients SGCM \u2014 FAC-2026/006',             debit: 5_724_000, credit: 0,           ref: 'FAC-2026/006', jc: 'VTE' },
    { date: '2026-03-01', account: '701',  label: 'Prestations services FAC-2026/006',           debit: 0,         credit: 4_800_000,   ref: 'FAC-2026/006', jc: 'VTE' },
    { date: '2026-03-01', account: '4435', label: 'TVA collect\xe9e FAC-2026/006',                debit: 0,         credit: 924_000,     ref: 'FAC-2026/006', jc: 'VTE' },
    // FAC-2026/007 — Dangote Cement (7 200 000 HT)
    { date: '2026-03-10', account: '411',  label: 'Clients Dangote \u2014 FAC-2026/007',          debit: 8_586_000, credit: 0,           ref: 'FAC-2026/007', jc: 'VTE' },
    { date: '2026-03-10', account: '701',  label: 'Prestations services FAC-2026/007',           debit: 0,         credit: 7_200_000,   ref: 'FAC-2026/007', jc: 'VTE' },
    { date: '2026-03-10', account: '4435', label: 'TVA collect\xe9e FAC-2026/007',                debit: 0,         credit: 1_386_000,   ref: 'FAC-2026/007', jc: 'VTE' },
    // Loyer mars
    { date: '2026-03-01', account: '612',  label: 'Location bureaux Akwa \u2014 mars 2026',      debit: 650_000,   credit: 0,           ref: 'DEP-2026/003', jc: 'ACH' },
    { date: '2026-03-01', account: '521',  label: 'Paiement loyer mars 2026',                    debit: 0,         credit: 650_000,     ref: 'DEP-2026/003', jc: 'ACH' },
    // Salaires mars
    { date: '2026-03-31', account: '661',  label: 'R\xe9mun\xe9rations directes mars 2026',       debit: 4_850_000, credit: 0,           ref: 'PAY-2026/03',  jc: 'OD'  },
    { date: '2026-03-31', account: '521',  label: 'Virement salaires mars 2026',                 debit: 0,         credit: 4_850_000,   ref: 'PAY-2026/03',  jc: 'OD'  },
    // R\xe8glements clients mars
    { date: '2026-03-15', account: '521',  label: 'Virement SGCM \u2014 r\xe8glement FAC-2026/006', debit: 5_724_000, credit: 0,         ref: 'VIR-2026/006', jc: 'BNQ' },
    { date: '2026-03-15', account: '411',  label: 'Lettrage SGCM FAC-2026/006',                   debit: 0,         credit: 5_724_000,  ref: 'VIR-2026/006', jc: 'BNQ' },
    { date: '2026-03-28', account: '521',  label: 'Virement Dangote \u2014 FAC-2026/007',          debit: 8_586_000, credit: 0,          ref: 'VIR-2026/007', jc: 'BNQ' },
    { date: '2026-03-28', account: '411',  label: 'Lettrage Dangote FAC-2026/007',                debit: 0,         credit: 8_586_000,  ref: 'VIR-2026/007', jc: 'BNQ' },
    // Maintenance informatique
    { date: '2026-03-15', account: '615',  label: 'Maintenance informatique \u2014 Douala',       debit: 150_000,   credit: 0,           ref: 'DEP-2026/015', jc: 'ACH' },
    { date: '2026-03-15', account: '521',  label: 'Paiement maintenance IT',                     debit: 0,         credit: 150_000,     ref: 'DEP-2026/015', jc: 'ACH' },
    // R\xe8glement BGFI FAC-2026/002
    { date: '2026-01-25', account: '521',  label: 'Virement BGFI \u2014 r\xe8glement FAC-2026/002', debit: 3_816_000, credit: 0,         ref: 'VIR-2026/002', jc: 'BNQ' },
    { date: '2026-01-25', account: '411',  label: 'Lettrage BGFI FAC-2026/002',                   debit: 0,         credit: 3_816_000,  ref: 'VIR-2026/002', jc: 'BNQ' },
  ]
  for (const e of ubmJnl2026)
    await prisma.journalEntry.create({ data: { companyId: companyUbm.id, fiscalYearId: ubmFy2026.id, date: new Date(e.date), account: e.account, label: e.label, debit: e.debit, credit: e.credit, reference: e.ref, journalCode: e.jc } })

  console.log(`  JournalEntries UBM: ${ubmJnl2024.length} (2024) + ${ubmJnl2025.length} (2025) + ${ubmJnl2026.length} (2026)`)

  // ── D\xe9clarations TVA 2026 (mensuelles via champ quarter) ─────────────────
  // quarter=1→janvier, quarter=2→f\xe9vrier, quarter=3→mars
  const ubmVatDecl = [
    { quarter: 1, collectee: 3_682_250, deductible: 1_124_250, nette: 2_558_000, status: 'FILED', filedAt: new Date('2026-02-15') },
    { quarter: 2, collectee: 5_191_000, deductible:   952_500, nette: 4_238_500, status: 'FILED', filedAt: new Date('2026-03-15') },
    { quarter: 3, collectee: 4_046_250, deductible:   791_250, nette: 3_255_000, status: 'DRAFT', filedAt: null                  },
  ]
  for (const v of ubmVatDecl) {
    await prisma.vATDeclaration.upsert({
      where:  { companyId_year_quarter: { companyId: companyUbm.id, year: 2026, quarter: v.quarter } },
      update: {},
      create: {
        companyId: companyUbm.id, fiscalYearId: ubmFy2026.id,
        year: 2026, quarter: v.quarter,
        tvaCollectee: v.collectee, tvaDeductible: v.deductible, tvaNette: v.nette,
        status: v.status, filedAt: v.filedAt,
      },
    })
  }
  console.log('  VATDeclarations UBM: janv. (FILED) · f\xe9vr. (FILED) · mars (DRAFT)')

  // ── Employ\xe9s (8) ───────────────────────────────────────────────────────────
  await prisma.employee.deleteMany({ where: { companyId: companyUbm.id } })
  const ubmEmployees = [
    { fn: 'Urbain',     ln: 'Bello Moukouri', email: 'ubm@ubm-consulting.cm',    type: 'FULL_TIME' as const, salary: 1_200_000, start: '2020-01-01' },
    { fn: 'Carine',     ln: 'Ekodeck',        email: 'c.ekodeck@ubm.cm',         type: 'FULL_TIME' as const, salary:   850_000, start: '2020-03-01' },
    { fn: 'Patrick',    ln: 'Ngo Biyong',     email: 'p.ngobiyong@ubm.cm',       type: 'FULL_TIME' as const, salary:   720_000, start: '2021-06-15' },
    { fn: 'Aminata',    ln: 'Fofana',         email: 'a.fofana@ubm.cm',          type: 'FULL_TIME' as const, salary:   720_000, start: '2021-09-01' },
    { fn: 'Herv\xe9',  ln: 'Manga',          email: 'h.manga@ubm.cm',           type: 'FULL_TIME' as const, salary:   480_000, start: '2022-02-01' },
    { fn: 'Nad\xe8ge', ln: 'Tchoupo',        email: 'n.tchoupo@ubm.cm',         type: 'FULL_TIME' as const, salary:   380_000, start: '2022-05-01' },
    { fn: 'Romuald',   ln: 'Essomba',        email: 'r.essomba@ubm.cm',         type: 'FULL_TIME' as const, salary:   420_000, start: '2023-01-01' },
    { fn: 'Christelle', ln: 'Mbia',          email: 'c.mbia@ubm.cm',            type: 'INTERN'    as const, salary:   100_000, start: '2026-02-01' },
  ]
  await Promise.all(
    ubmEmployees.map(e =>
      prisma.employee.create({
        data: { companyId: companyUbm.id, firstName: e.fn, lastName: e.ln, email: e.email, employmentType: e.type, grossSalary: e.salary, startDate: new Date(e.start) },
      }),
    ),
  )
  console.log(`  Employees UBM: ${ubmEmployees.length}`)

  // ── Contrats juridiques (5) ───────────────────────────────────────────────
  const ubmCont1 = await prisma.legalContract.create({
    data: {
      companyId: companyUbm.id,
      title:  'Contrat cadre de prestations de services \u2014 MTN Cameroun SA',
      type:   'CLIENT',
      status: 'SIGNED',
      signedAt: new Date('2025-12-20'),
      expiresAt: new Date('2026-12-31'),
      parties: [
        { name: 'UBM Consulting SARL',    email: 'ubm@ubm-consulting.cm',  role: 'Prestataire' },
        { name: 'MTN Cameroun SA',         email: 'procurement@mtn.cm',    role: 'Client'       },
      ],
      notes: 'Contrat annuel 45 000 000 F CFA HT. R\xe9novable tacitement.',
    },
  })

  await prisma.contractSignature.createMany({
    data: [
      { contractId: ubmCont1.id, signerName: 'Urbain Bello Moukouri', signerEmail: 'ubm@ubm-consulting.cm',  signerRole: 'DG UBM',    status: 'SIGNED', token: crypto.randomUUID(), signedAt: new Date('2025-12-20') },
      { contractId: ubmCont1.id, signerName: 'DG MTN Cameroun',       signerEmail: 'dg@mtn.cm',             signerRole: 'Directeur G\xe9n\xe9ral MTN', status: 'SIGNED', token: crypto.randomUUID(), signedAt: new Date('2025-12-22') },
    ],
  })

  const ubmCont2 = await prisma.legalContract.create({
    data: {
      companyId: companyUbm.id,
      title:  'Convention de conseil strat\xe9gique \u2014 Total Energies CM',
      type:   'SERVICE',
      status: 'SIGNED',
      signedAt: new Date('2026-01-20'),
      expiresAt: new Date('2027-01-31'),
      parties: [
        { name: 'UBM Consulting SARL',  email: 'ubm@ubm-consulting.cm',           role: 'Prestataire' },
        { name: 'Total Energies CM',    email: 'cm.procurement@totalenergies.com', role: 'Client'       },
      ],
      notes: 'Convention annuelle 35 000 000 F CFA HT \u2014 HSE & RSE.',
    },
  })

  await prisma.legalContract.create({
    data: {
      companyId: companyUbm.id,
      title:    'Contrat de travail CDI \u2014 Patrick Ngo Biyong',
      type:     'EMPLOYMENT',
      status:   'SIGNED',
      signedAt: new Date('2021-06-15'),
      parties: [
        { name: 'UBM Consulting SARL', email: 'ubm@ubm-consulting.cm', role: 'Employeur' },
        { name: 'Patrick Ngo Biyong',  email: 'p.ngobiyong@ubm.cm',   role: 'Employ\xe9' },
      ],
      notes: 'CDI Consultant Senior \u2014 900 000 F CFA brut/mois. Convention collective services OHADA.',
    },
  })

  const ubmCont4 = await prisma.legalContract.create({
    data: {
      companyId: companyUbm.id,
      title:    'Bail commercial bureaux Akwa \u2014 Immobili\xe8re Douala SA',
      type:     'LEASE',
      status:   'SIGNED',
      signedAt: new Date('2024-12-15'),
      expiresAt: new Date('2027-12-31'),
      parties: [
        { name: 'UBM Consulting SARL',   email: 'ubm@ubm-consulting.cm', role: 'Locataire' },
        { name: 'Immobili\xe8re Douala SA', email: 'info@immo-dla.cm',   role: 'Bailleur'  },
      ],
      notes: 'Bail 3 ans \u2014 650 000 F CFA HT/mois. Rue Joss, Akwa, Douala.',
    },
  })
  await prisma.legalAlert.create({
    data: {
      companyId: companyUbm.id, contractId: ubmCont4.id,
      title:    'Renouvellement bail Akwa',
      message:  'Le bail commercial bureaux Akwa expire le 31/12/2027. Pr\xe9voir n\xe9gociation 6 mois avant \xe9ch\xe9ance.',
      severity: 'INFO', status: 'OPEN',
      dueDate:  new Date('2027-06-30'),
    },
  })

  await prisma.legalContract.create({
    data: {
      companyId: companyUbm.id,
      title:    'Accord de confidentialit\xe9 (NDA) \u2014 Groupe Kadji & Cie',
      type:     'NDA',
      status:   'SIGNED',
      signedAt: new Date('2025-12-01'),
      expiresAt: new Date('2030-12-01'),
      parties: [
        { name: 'UBM Consulting SARL', email: 'ubm@ubm-consulting.cm',   role: 'Prestataire' },
        { name: 'Groupe Kadji & Cie',  email: 'direction@groupekadji.cm', role: 'Commanditaire' },
      ],
      notes: 'NDA 5 ans \u2014 informations strat\xe9giques groupe Kadji. Sign\xe9 01/12/2025.',
    },
  })

  await prisma.legalAlert.create({
    data: {
      companyId: companyUbm.id, contractId: ubmCont2.id,
      title:    'Rapport d\u2019\xe9tape Total Energies Q1',
      message:  'Livraison rapport Q1 2026 attendue avant le 30/04/2026 (clause contractuelle).',
      severity: 'WARNING', status: 'OPEN',
      dueDate:  new Date('2026-04-30'),
    },
  })
  console.log('  LegalContracts UBM: 5 + 2 alertes')

  // ── RGPD (3 traitements) ──────────────────────────────────────────────────
  await prisma.gdprEntry.createMany({
    data: [
      {
        companyId:        companyUbm.id,
        treatmentName:    'Gestion clients et facturation',
        purpose:          'Suivi commercial, \xe9mission de factures, recouvrement cr\xe9ances',
        legalBasis:       'CONTRACT',
        dataCategories:   ['Identit\xe9', 'Coordonn\xe9es', 'Donn\xe9es financi\xe8res'],
        dataSubjects:     ['Clients', 'Contacts clients'],
        retentionMonths:  120,
        responsible:      'Carine Ekodeck (DAF)',
        subcontractors:   ['Afriland First Bank (facturation)'],
        securityMeasures: ['Acc\xe8s r\xf4le', 'Chiffrement HTTPS', 'Audit log'],
        riskLevel:        'LOW',
        dpiaRequired:     false,
        lastReviewedAt:   new Date('2026-01-15'),
      },
      {
        companyId:        companyUbm.id,
        treatmentName:    'Gestion RH et paie',
        purpose:          'Administration du personnel, calcul de la paie, d\xe9clarations CNPS',
        legalBasis:       'LEGAL_OBLIGATION',
        dataCategories:   ['Identit\xe9', 'Donn\xe9es bancaires', 'Donn\xe9es RH', 'Salaire'],
        dataSubjects:     ['Employ\xe9s', 'Anciens employ\xe9s'],
        retentionMonths:  60,
        responsible:      'Carine Ekodeck (DAF)',
        subcontractors:   ['CNPS Cameroun'],
        securityMeasures: ['Acc\xe8s restreint RH', 'Sauvegarde chiffr\xe9e'],
        riskLevel:        'MEDIUM',
        dpiaRequired:     false,
        lastReviewedAt:   new Date('2026-01-15'),
      },
      {
        companyId:        companyUbm.id,
        treatmentName:    'Prospection commerciale',
        purpose:          'D\xe9veloppement du portefeuille clients, relances commerciales',
        legalBasis:       'LEGITIMATE_INTEREST',
        dataCategories:   ['Identit\xe9', 'Coordonn\xe9es professionnelles'],
        dataSubjects:     ['Prospects', 'Anciens clients'],
        retentionMonths:  36,
        responsible:      'Urbain Bello Moukouri (DG)',
        subcontractors:   [],
        securityMeasures: ['Liste opt-out', 'D\xe9sinscription sous 48h'],
        riskLevel:        'LOW',
        dpiaRequired:     false,
        lastReviewedAt:   new Date('2026-01-15'),
      },
    ],
  })
  console.log('  GdprEntries UBM: 3')

  // ── ESG — Donn\xe9es 2025 ─────────────────────────────────────────────────────
  await prisma.eSGData.upsert({
    where:  { companyId_year: { companyId: companyUbm.id, year: 2025 } },
    update: {},
    create: {
      companyId:         companyUbm.id, year: 2025,
      scope1Total:       18.4,
      scope1Details:     { vehicles: 12.5, process: 0, fuelOil: 0, naturalGas: 5.9 },
      scope2Total:       12.8,
      scope2Kwh:         48_000,
      scope3Total:       22.4,
      scope3Details:     { businessTravel: 18.2, freight: 0, waste: 1.8, purchasedGoods: 2.4 },
      energyKwh:         48_000,
      wasteKg:           2_400,
      renewableRatio:    0,
      genderPayGap:      8.0,
      trainingHours:     32,
      absenteeismRate:   2.1,
      workplaceAccidents: 0,
      boardFemaleRatio:  25.0,
      hasEthicsCode:     true,
      hasAnticorruption: false,
    },
  })

  // ── ESG — Actions / Risques ───────────────────────────────────────────────
  await prisma.esgAction.createMany({
    data: [
      {
        companyId:   companyUbm.id,
        title:       'R\xe9duction impact coupures \xe9lectriques AES-SONEL',
        description: 'Acquisition groupe \xe9lectrog\xe8ne hybride + panneaux solaires pour r\xe9silience \xe9nerg\xe9tique',
        pilier:      'E',
        priority:    'HIGH',
        status:      'IN_PROGRESS',
        targetYear:  2026,
        deadline:    new Date('2026-06-30'),
        owner:       'Urbain Bello Moukouri',
        kpiTarget:   'R\xe9duction interruptions > 4h : objectif 0/mois',
        co2Saving:   3.2,
      },
      {
        companyId:   companyUbm.id,
        title:       'Partenariat universit\xe9s pour recrutement profils seniors',
        description: 'Convention avec ESSEC Douala et Universit\xe9 de Yaound\xe9 II pour vivier de talents',
        pilier:      'S',
        priority:    'HIGH',
        status:      'IN_PROGRESS',
        targetYear:  2026,
        deadline:    new Date('2026-09-30'),
        owner:       'Carine Ekodeck',
        kpiTarget:   '2 recrutements seniors via partenariat universit\xe9',
      },
      {
        companyId:   companyUbm.id,
        title:       'Veille juridique OHADA et conformit\xe9 r\xe9glementaire',
        description: 'Mise en place veille mensuelle OHADA, DSF, CNPS et \xe9volutions l\xe9gislatives camerounaises',
        pilier:      'G',
        priority:    'HIGH',
        status:      'TODO',
        targetYear:  2026,
        deadline:    new Date('2026-12-31'),
        owner:       'Romuald Essomba',
        kpiTarget:   'Z\xe9ro p\xe9nalit\xe9 fiscale ou sociale en 2026',
      },
      {
        companyId:   companyUbm.id,
        title:       'R\xe9duction empreinte carbone transports a\xe9riens',
        description: 'Priorit\xe9 visioconf\xe9rence pour r\xe9unions clients ; bilan carbone annuel transport',
        pilier:      'E',
        priority:    'MEDIUM',
        status:      'TODO',
        targetYear:  2026,
        deadline:    new Date('2026-12-31'),
        owner:       'Urbain Bello Moukouri',
        kpiTarget:   'R\xe9duction vols d\u2019affaires : \u221220% vs 2025',
        co2Saving:   4.5,
      },
      {
        companyId:   companyUbm.id,
        title:       'Publication premier rapport RSE UBM Consulting',
        description: 'R\xe9daction et diffusion du rapport RSE 2025 selon r\xe9f\xe9rentiel GRI Afrique',
        pilier:      'G',
        priority:    'MEDIUM',
        status:      'TODO',
        targetYear:  2026,
        deadline:    new Date('2026-06-30'),
        owner:       'Carine Ekodeck',
        kpiTarget:   'Rapport RSE publi\xe9 et partag\xe9 clients avant 30/06/2026',
      },
    ],
  })
  console.log('  ESGData + EsgActions UBM: 2025 + 5 actions')

  // ── R\xf4les et utilisateurs soci\xe9t\xe9 ──────────────────────────────────────────
  const ALL_P_UBM = { gestion: 'admin', comptabilite: 'admin', rh: 'admin', juridique: 'admin', esg: 'admin', settings: 'admin' }

  const ubmRoleAdmin = await prisma.companyRole.upsert({
    where:  { companyId_name: { companyId: companyUbm.id, name: 'Administrateur' } },
    update: {},
    create: { companyId: companyUbm.id, name: 'Administrateur', description: 'Acc\xe8s total \u2014 DG', isSystem: true, permissions: ALL_P_UBM },
  })
  const ubmRoleComptable = await prisma.companyRole.upsert({
    where:  { companyId_name: { companyId: companyUbm.id, name: 'Comptable' } },
    update: {},
    create: { companyId: companyUbm.id, name: 'Comptable', description: 'Gestion + Comptabilit\xe9 lecture/\xe9criture', isSystem: true, permissions: { gestion: 'write', comptabilite: 'write', rh: 'read', juridique: 'read', esg: 'read', settings: 'none' } },
  })
  const ubmRoleReadonly = await prisma.companyRole.upsert({
    where:  { companyId_name: { companyId: companyUbm.id, name: 'Comptable Junior' } },
    update: {},
    create: { companyId: companyUbm.id, name: 'Comptable Junior', description: 'Comptabilit\xe9 lecture uniquement', isSystem: true, permissions: { gestion: 'read', comptabilite: 'read', rh: 'none', juridique: 'none', esg: 'none', settings: 'none' } },
  })

  for (const { u, role } of [
    { u: userUbm,    role: ubmRoleAdmin    },
    { u: userCarine, role: ubmRoleComptable },
    { u: userRomuald, role: ubmRoleReadonly },
  ]) {
    await prisma.companyUser.upsert({
      where:  { companyId_userId: { companyId: companyUbm.id, userId: u.id } },
      update: {},
      create: { companyId: companyUbm.id, userId: u.id, roleId: role.id, status: 'ACTIVE', joinedAt: new Date('2026-01-01') },
    })
  }
  console.log('  CompanyRoles + CompanyUsers UBM: 3')

  // ── Barème IGS 2026 ──────────────────────────────────────────────────────
  const igsBaremeData = [
    { classe: 1,  caMin:          0, caMax:    500_000, montantBase:   5_000, montantCga:   3_500 },
    { classe: 2,  caMin:    500_001, caMax:  1_000_000, montantBase:  10_000, montantCga:   7_000 },
    { classe: 3,  caMin:  1_000_001, caMax:  2_000_000, montantBase:  20_000, montantCga:  14_000 },
    { classe: 4,  caMin:  2_000_001, caMax:  3_000_000, montantBase:  35_000, montantCga:  24_500 },
    { classe: 5,  caMin:  3_000_001, caMax:  5_000_000, montantBase:  55_000, montantCga:  38_500 },
    { classe: 6,  caMin:  5_000_001, caMax:  7_500_000, montantBase:  85_000, montantCga:  59_500 },
    { classe: 7,  caMin:  7_500_001, caMax: 10_000_000, montantBase: 120_000, montantCga:  84_000 },
    { classe: 8,  caMin: 10_000_001, caMax: 20_000_000, montantBase: 200_000, montantCga: 140_000 },
    { classe: 9,  caMin: 20_000_001, caMax: 30_000_000, montantBase: 350_000, montantCga: 245_000 },
    { classe: 10, caMin: 30_000_001, caMax: 50_000_000, montantBase: 550_000, montantCga: 385_000 },
  ]
  for (const row of igsBaremeData) {
    await prisma.igsBareme.upsert({
      where:  { classe: row.classe },
      update: { caMin: row.caMin, caMax: row.caMax, montantBase: row.montantBase, montantCga: row.montantCga },
      create: { ...row, year: 2026 },
    })
  }
  console.log(`  IgsBareme 2026: ${igsBaremeData.length} classes`)

  // ── TaxConfig UBM ────────────────────────────────────────────────────────
  // UBM = activité de conseil → profession libérale → Réel Normal obligatoire
  await prisma.taxConfig.upsert({
    where:  { companyId: companyUbm.id },
    update: {
      taxRegime:          'REEL_NORMAL',
      vatRegime:          'MENSUEL',
      isFirstYear:        false,
      firstYearCA:        12_000_000,
      professionLiberale: true,
      regimeHistory:      { '2024': 'REEL_NORMAL', '2025': 'REEL_NORMAL', '2026': 'REEL_NORMAL' },
      regimeChangeAlert:  false,
      isRate:             0.33,
      vatRate:            0.1925,
    },
    create: {
      companyId:          companyUbm.id,
      country:            'CM',
      taxRegime:          'REEL_NORMAL',
      vatRegime:          'MENSUEL',
      centerImpots:       'CDI Douala Wouri',
      niu:                'M021512789456K',
      rccm:               'RC/DLA/2020/B/1247',
      codeActivite:       '7020Z',
      cnpsRate:           0.172,
      isAssujetti:        true,
      isFirstYear:        false,
      firstYearCA:        12_000_000,
      professionLiberale: true,
      regimeHistory:      { '2024': 'REEL_NORMAL', '2025': 'REEL_NORMAL', '2026': 'REEL_NORMAL' },
      regimeChangeAlert:  false,
      isRate:             0.33,
      vatRate:            0.1925,
    },
  })
  console.log('  TaxConfig UBM: 1 (Réel Normal · prof. libérale)')

  // ── TaxDeclarations UBM ──────────────────────────────────────────────────
  const taxDecls = [
    // TVA 2026 (mensuelle)
    { type: 'TVA' as const, period: '01/2026', year: 2026, month: 1,  baseAmount: 13_275_000, taxAmount: 2_558_000, status: 'PAID'    as const, dueDate: new Date('2026-02-15'), paidAt: new Date('2026-02-10') },
    { type: 'TVA' as const, period: '02/2026', year: 2026, month: 2,  baseAmount: 22_010_000, taxAmount: 4_238_500, status: 'PAID'    as const, dueDate: new Date('2026-03-15'), paidAt: new Date('2026-03-12') },
    { type: 'TVA' as const, period: '03/2026', year: 2026, month: 3,  baseAmount: 20_330_000, taxAmount: 3_914_487, status: 'PENDING' as const, dueDate: new Date('2026-04-15') },
    // IS Acomptes 2026
    { type: 'IS_ACOMPTE' as const, period: 'Acompte 1/2026', year: 2026, quarter: 1, baseAmount: 7_656_000, taxAmount: 3_828_000, status: 'PAID' as const, dueDate: new Date('2026-02-15'), paidAt: new Date('2026-02-10') },
    { type: 'IS_ACOMPTE' as const, period: 'Acompte 2/2026', year: 2026, quarter: 2, baseAmount: 7_656_000, taxAmount: 3_828_000, status: 'PENDING' as const, dueDate: new Date('2026-08-15') },
    // Patente 2026
    { type: 'PATENTE' as const, period: '2026', year: 2026, baseAmount: 68_500_000, taxAmount: 230_000, status: 'PAID' as const, dueDate: new Date('2026-03-31'), paidAt: new Date('2026-03-25'), reference: 'N°DGI/2026/PAT/00847' },
    // RAS 2026
    { type: 'RAS' as const, period: '01/2026', year: 2026, month: 1,  baseAmount: 150_000, taxAmount: 7_500,  status: 'PAID' as const, dueDate: new Date('2026-02-15'), paidAt: new Date('2026-02-10') },
    { type: 'RAS' as const, period: '02/2026', year: 2026, month: 2,  baseAmount: 200_000, taxAmount: 20_000, status: 'PAID' as const, dueDate: new Date('2026-03-15'), paidAt: new Date('2026-03-12') },
    // DSF
    { type: 'DSF' as const, period: '2024', year: 2024, baseAmount: 52_300_000, taxAmount: 6_124_000, status: 'PAID' as const, dueDate: new Date('2025-03-15'), declaredAt: new Date('2025-03-10'), paidAt: new Date('2025-03-10') },
    { type: 'DSF' as const, period: '2025', year: 2025, baseAmount: 68_500_000, taxAmount: 7_656_000, status: 'LATE' as const, dueDate: new Date('2026-03-15') },
    // IS (solde) for prev year reference
    { type: 'IS' as const, period: '2024', year: 2024, baseAmount: 18_543_000, taxAmount: 6_124_000, status: 'PAID' as const, dueDate: new Date('2025-03-15'), paidAt: new Date('2025-03-10') },
    { type: 'IS' as const, period: '2025', year: 2025, baseAmount: 23_200_000, taxAmount: 7_656_000, status: 'DECLARED' as const, dueDate: new Date('2026-03-15'), declaredAt: new Date('2026-03-10') },
  ]

  for (const decl of taxDecls) {
    await prisma.taxDeclaration.upsert({
      where: {
        id: (await prisma.taxDeclaration.findFirst({
          where: { companyId: companyUbm.id, type: decl.type, period: decl.period },
          select: { id: true },
        }))?.id ?? 'new-' + Math.random(),
      },
      update: {},
      create: { companyId: companyUbm.id, ...decl },
    })
  }
  console.log(`  TaxDeclarations UBM: ${taxDecls.length}`)

  // ── Atanga Commerce — IGS Démo ───────────────────────────────────────────
  const hashIgs = await bcrypt.hash('Demo2026!', BCRYPT_ROUNDS)

  const companyAtanga = await prisma.company.upsert({
    where: { siren: 'CM-ATANGA-001' },
    update: {
      country: 'CM', currency: 'XAF', currencySymbol: 'F CFA',
      accountingZone: 'OHADA', accountingPlan: 'SYSCOHADA Révisé 2017',
      vatRates: [], locale: 'fr-CM', timezone: 'Africa/Douala',
      modules: PLAN_MODULES.PREMIUM,
    },
    create: {
      name: 'Atanga Commerce SARL',
      siren: 'CM-ATANGA-001',
      secteur: 'Commerce de détail',
      taille: 'TPE',
      plan: 'PREMIUM',
      modules: PLAN_MODULES.PREMIUM,
      country: 'CM', currency: 'XAF', currencySymbol: 'F CFA',
      accountingZone: 'OHADA', accountingPlan: 'SYSCOHADA Révisé 2017',
      vatRates: [], locale: 'fr-CM', timezone: 'Africa/Douala',
      legalForm: 'SARL', capital: 1_000_000,
      city: 'Douala', address: 'Marché Congo, Douala',
    },
  })
  console.log(`  Company: ${companyAtanga.name} (IGS · CM)`)

  const userAtanga = await prisma.user.upsert({
    where: { email: 'demo-igs@athenis.io' },
    update: {},
    create: {
      email: 'demo-igs@athenis.io', passwordHash: hashIgs,
      accountType: 'COMPANY', role: 'ADMIN',
      firstName: 'Paul', lastName: 'Atanga',
      companyId: companyAtanga.id,
    },
  })
  console.log(`  User IGS: ${userAtanga.email}`)

  await prisma.taxConfig.upsert({
    where:  { companyId: companyAtanga.id },
    update: {
      taxRegime: 'IGS', vatRegime: 'NON_ASSUJETTI',
      igsClass: 7, igsAmount: 120_000, igsPaymentMode: 'ANNUEL', igsAdherentCga: false,
      isFirstYear: false, firstYearCA: 8_500_000,
      regimeHistory: { '2024': 'IGS', '2025': 'IGS', '2026': 'IGS' },
      isAssujetti: false, isRate: 0.33, vatRate: 0.1925,
    },
    create: {
      companyId: companyAtanga.id,
      country: 'CM', taxRegime: 'IGS', vatRegime: 'NON_ASSUJETTI',
      centerImpots: 'CDI Douala Bonanjo',
      niu: 'P012345678901A', rccm: 'RC/DLA/2022/B/4521',
      codeActivite: '4711Z',
      cnpsRate: 0.162, isRate: 0.33, vatRate: 0.1925,
      isAssujetti: false,
      isFirstYear: false, firstYearCA: 8_500_000,
      igsClass: 7, igsAmount: 120_000,
      igsPaymentMode: 'ANNUEL', igsAdherentCga: false,
      regimeHistory: { '2024': 'IGS', '2025': 'IGS', '2026': 'IGS' },
      professionLiberale: false, regimeChangeAlert: false,
    },
  })
  console.log('  TaxConfig Atanga: IGS Classe 7 · 120 000 F CFA/an')

  console.log('\n✅ Seed terminé !\n')
  console.log(`Mot de passe comptes Demo1234! : marie@personal.demo, admin@demo-sa.demo …`)
  console.log(`Mot de passe comptes Demo2026! : demo-france@athenis.io, demo-senegal@athenis.io, demo-usa@athenis.io, demo-igs@athenis.io`)
  console.log(`Mot de passe compte  UBM2026!  : ubm@comptalia.fr\n`)
  console.log('Comptes démo par zone comptable :')
  console.log('  🇫🇷 FRANCE  demo-france@athenis.io  (PCG — EUR)')
  console.log('  🌍 OHADA   demo-senegal@athenis.io  (SYSCOHADA — XOF)')
  console.log('  🌐 IFRS    demo-usa@athenis.io      (IFRS — USD)')
  console.log('  🇨🇲 OHADA   ubm@comptalia.fr         (SYSCOHADA — XAF — Réel Normal — PREMIUM)')
  console.log('  🇨🇲 OHADA   demo-igs@athenis.io      (SYSCOHADA — XAF — IGS Classe 7 — PREMIUM)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
