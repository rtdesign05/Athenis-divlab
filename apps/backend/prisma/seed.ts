import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const PLAN_MODULES = {
  FREE: ['gestion'],
  STARTER: ['gestion', 'rh'],
  PRO: ['gestion', 'rh', 'comptabilite', 'juridique'],
  PREMIUM: ['gestion', 'rh', 'comptabilite', 'juridique', 'esg'],
} as const

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 12
const DEMO_PASSWORD = 'Demo1234!'

async function main() {
  console.log('🌱 Seeding Athenis demo data…\n')

  // ── Cabinet ───────────────────────────────────────────────────────────────
  const cabinet = await prisma.cabinet.upsert({
    where: { siret: '12345678900012' },
    update: {},
    create: { name: 'Expert Compta & Associés', siret: '12345678900012' },
  })
  console.log(`  Cabinet: ${cabinet.name}`)

  // ── Company ───────────────────────────────────────────────────────────────
  const company = await prisma.company.upsert({
    where: { siren: '123456789' },
    update: {},
    create: {
      name: 'Démo SA',
      siren: '123456789',
      secteur: 'Services informatiques',
      taille: 'PME',
      plan: 'PRO',
      modules: PLAN_MODULES.PRO,
      cabinetId: cabinet.id,
    },
  })
  console.log(`  Company: ${company.name} (${company.plan})`)

  // ── Mandat ────────────────────────────────────────────────────────────────
  await prisma.mandat.upsert({
    where: { cabinetId_companyId: { cabinetId: cabinet.id, companyId: company.id } },
    update: {},
    create: {
      cabinetId: cabinet.id,
      companyId: company.id,
      type: 'COMPLET',
      modules: PLAN_MODULES.PRO,
      actif: true,
    },
  })
  console.log('  Mandat: COMPLET entre cabinet et Démo SA')

  // ── Hash passwords in parallel ────────────────────────────────────────────
  const [hash] = await Promise.all([bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS)])

  // ── Users — PERSONAL ──────────────────────────────────────────────────────
  const personal = await prisma.user.upsert({
    where: { email: 'marie@personal.demo' },
    update: {},
    create: {
      email: 'marie@personal.demo',
      passwordHash: hash,
      accountType: 'PERSONAL',
      role: 'ADMIN',
      firstName: 'Marie',
      lastName: 'Dubois',
    },
  })
  console.log(`  User (PERSONAL): ${personal.email}`)

  // ── Users — COMPANY ───────────────────────────────────────────────────────
  const companyUsers = [
    { email: 'admin@demo-sa.demo', role: 'ADMIN' as const, firstName: 'Alice', lastName: 'Martin' },
    { email: 'comptable@demo-sa.demo', role: 'COMPTABLE' as const, firstName: 'Bernard', lastName: 'Durand' },
    { email: 'rh@demo-sa.demo', role: 'RH' as const, firstName: 'Claire', lastName: 'Petit' },
    { email: 'viewer@demo-sa.demo', role: 'READONLY' as const, firstName: 'David', lastName: 'Leroy' },
    { email: 'juridique@demo-sa.demo', role: 'JURIDIQUE' as const, firstName: 'Elise', lastName: 'Bernard' },
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
      email: 'expert@cabinet.demo',
      passwordHash: hash,
      accountType: 'CABINET',
      role: 'ADMIN',
      firstName: 'François',
      lastName: 'Expert',
      cabinetId: cabinet.id,
    },
  })
  console.log(`  User (CABINET): ${cabinetUser.email}`)

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientsData = [
    { id: 'seed-client-acme', name: 'Acme Corp', email: 'billing@acme.example', siren: '987654321' },
    { id: 'seed-client-techstart', name: 'TechStart SAS', email: 'finance@techstart.example', siren: '456789123' },
    { id: 'seed-client-global', name: 'Global Trade SARL', email: 'compta@globaltrade.example' },
  ]
  const clients = await Promise.all(
    clientsData.map((c) =>
      prisma.client.upsert({ where: { id: c.id }, update: {}, create: { ...c, companyId: company.id } }),
    ),
  )
  console.log(`  Clients: ${clients.length}`)

  // ── Invoices ──────────────────────────────────────────────────────────────
  const invoices = [
    { number: 'FA-2026-001', clientIndex: 0, subtotal: 8_000, status: 'PAID' as const, issueDate: new Date('2026-01-15'), dueDate: new Date('2026-02-15') },
    { number: 'FA-2026-002', clientIndex: 1, subtotal: 12_500, status: 'SENT' as const, issueDate: new Date('2026-03-01'), dueDate: new Date('2026-04-01') },
    { number: 'FA-2026-003', clientIndex: 0, subtotal: 3_200, status: 'DRAFT' as const, issueDate: new Date('2026-04-10'), dueDate: new Date('2026-05-10') },
    { number: 'FA-2026-004', clientIndex: 2, subtotal: 6_750, status: 'OVERDUE' as const, issueDate: new Date('2026-02-01'), dueDate: new Date('2026-03-01') },
  ]
  for (const inv of invoices) {
    const tax = (inv.subtotal * 20) / 100
    const client = clients[inv.clientIndex]
    if (!client) continue
    await prisma.invoice.upsert({
      where: { companyId_number: { companyId: company.id, number: inv.number } },
      update: {},
      create: { ...inv, clientId: client.id, companyId: company.id, taxRate: 20, taxAmount: tax, total: inv.subtotal + tax },
    })
  }
  console.log(`  Invoices: ${invoices.length}`)

  // ── Expenses ──────────────────────────────────────────────────────────────
  const expenses = [
    { category: 'SOFTWARE' as const, amount: 299, description: 'Licence SaaS CRM', date: new Date('2026-01-05') },
    { category: 'TRAVEL' as const, amount: 540, description: 'Déplacement Paris-Lyon', date: new Date('2026-02-14') },
    { category: 'EQUIPMENT' as const, amount: 1_800, description: 'MacBook Pro 14"', date: new Date('2026-03-20') },
    { category: 'MARKETING' as const, amount: 750, description: 'Google Ads Q1', date: new Date('2026-01-31') },
    { category: 'CONSULTING' as const, amount: 2_400, description: 'Mission comptable externe', date: new Date('2026-04-02') },
  ]
  await Promise.all(expenses.map((e) => prisma.expense.create({ data: { ...e, companyId: company.id } })))
  console.log(`  Expenses: ${expenses.length}`)

  // ── Employees ─────────────────────────────────────────────────────────────
  const employees = [
    { firstName: 'Sophie', lastName: 'Martin', email: 'sophie.martin@demo-sa.example', employmentType: 'FULL_TIME' as const, grossSalary: 52_000, startDate: new Date('2024-01-15') },
    { firstName: 'Lucas', lastName: 'Dupont', email: 'lucas.dupont@demo-sa.example', employmentType: 'FULL_TIME' as const, grossSalary: 45_000, startDate: new Date('2023-09-01') },
    { firstName: 'Emma', lastName: 'Bernard', email: 'emma.bernard@demo-sa.example', employmentType: 'PART_TIME' as const, grossSalary: 24_000, startDate: new Date('2025-03-01') },
  ]
  await Promise.all(employees.map((e) => prisma.employee.create({ data: { ...e, companyId: company.id } })))
  console.log(`  Employees: ${employees.length}`)

  // ── ESG ───────────────────────────────────────────────────────────────────
  await prisma.eSGData.upsert({
    where: { companyId_year: { companyId: company.id, year: 2025 } },
    update: {},
    create: { companyId: company.id, year: 2025, co2Emissions: 12.4, energyKwh: 48_500, wasteKg: 320, genderPayGap: 3.2, trainingHours: 24 },
  })
  console.log('  ESG: 2025')

  console.log('\n✅ Seed terminé !\n')
  console.log(`Mot de passe de tous les comptes démo : ${DEMO_PASSWORD}\n`)
  console.log('Comptes disponibles :')
  console.log('  PERSONAL  marie@personal.demo')
  console.log('  COMPANY   admin@demo-sa.demo (ADMIN · PRO)')
  console.log('  COMPANY   comptable@demo-sa.demo (COMPTABLE)')
  console.log('  COMPANY   rh@demo-sa.demo (RH)')
  console.log('  COMPANY   viewer@demo-sa.demo (READONLY)')
  console.log('  COMPANY   juridique@demo-sa.demo (JURIDIQUE)')
  console.log('  CABINET   expert@cabinet.demo (PREMIUM · mandat COMPLET sur Démo SA)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
