import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { getPlanByZone, ZONE_LABELS } from '../../lib/accountingPlans.js'

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

function fmtDate(d: Date | string): string {
  const dt = new Date(d)
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
}

function fmtDecimal(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

// ── Existing reports ───────────────────────────────────────────────────────────

export async function getCompteDeResultat(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoiceTotals, expenseTotals, salaryTotals] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issuedAt: { gte: start, lte: end } },
      _sum: { amountHT: true, amountTTC: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.employee.aggregate({
      where: { companyId, dateEmbauche: { lte: end }, OR: [{ dateFinContrat: null }, { dateFinContrat: { gte: start } }] },
      _sum: { salaireBrut: true },
    }),
  ])

  const chiffreAffaires     = toNum(invoiceTotals._sum?.amountHT)
  const tvaCollectee        = toNum(invoiceTotals._sum?.amountTTC) - chiffreAffaires
  const chargesExploitation = toNum(expenseTotals._sum?.amount)
  const masseSalariale      = toNum(salaryTotals._sum?.salaireBrut)
  const chargesTotal        = chargesExploitation + masseSalariale
  const resultatBrut        = chiffreAffaires - chargesTotal

  return {
    year,
    produits: { chiffreAffaires, tvaCollectee, totalProduits: chiffreAffaires },
    charges:  { chargesExploitation, masseSalariale, chargesTotal },
    resultatBrut,
    margeNette: chiffreAffaires > 0 ? (resultatBrut / chiffreAffaires) * 100 : 0,
  }
}

export async function getBilan(companyId: string, year: number) {
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)
  const start = new Date(`${year}-01-01`)

  const [creances, dettes, tresorerie] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, status: { in: ['PENDING', 'OVERDUE'] }, dueAt: { lte: end } },
      _sum: { amountTTC: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, status: 'PAID', issuedAt: { gte: start, lte: end } },
      _sum: { amountTTC: true },
    }),
  ])

  const actifCirculant = toNum(creances._sum?.amountTTC) + toNum(tresorerie._sum?.amountTTC)
  const passifCourant  = toNum(dettes._sum?.amount)

  return {
    year,
    actif: {
      creancesClients: toNum(creances._sum?.amountTTC),
      tresorerie:      toNum(tresorerie._sum?.amountTTC),
      totalActif:      actifCirculant,
    },
    passif: {
      dettesExploitation: passifCourant,
      totalPassif:        passifCourant,
    },
    fondsDeRoulement: actifCirculant - passifCourant,
  }
}

export async function getBalance(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoicesByStatus, expensesByCategory] = await Promise.all([
    prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId, issuedAt: { gte: start, lte: end } },
      _count: true,
      _sum:   { amountHT: true, amountTTC: true },
    }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { companyId, date: { gte: start, lte: end } },
      _count: true,
      _sum:   { amount: true },
    }),
  ])
  return { year, invoicesByStatus, expensesByCategory }
}

export async function getGrandLivre(companyId: string, year: number) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, issuedAt: { gte: start, lte: end } },
      include: { client: { select: { nom: true } } },
      orderBy: { issuedAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { companyId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
  ])

  const entries = [
    ...invoices.map((inv) => ({
      date:      inv.issuedAt,
      type:      'INVOICE' as const,
      reference: inv.reference,
      label:     inv.client.nom,
      debit:     0,
      credit:    toNum(inv.amountTTC),
      status:    inv.status,
    })),
    ...expenses.map((exp) => ({
      date:      exp.date,
      type:      'EXPENSE' as const,
      reference: exp.id,
      label:     exp.note ?? exp.category,
      debit:     toNum(exp.amount),
      credit:    0,
      category:  exp.category,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return { year, entries }
}

export async function getTvaTrimestrielle(companyId: string, year: number) {
  const quarters = [1, 2, 3, 4].map((q) => {
    const startMonth = (q - 1) * 3
    return {
      quarter:  q,
      start:    new Date(year, startMonth, 1),
      end:      new Date(year, startMonth + 3, 0, 23, 59, 59, 999),
    }
  })

  const results = await Promise.all(
    quarters.map(async ({ quarter, start, end }) => {
      const [collectee, deductible] = await Promise.all([
        prisma.invoice.aggregate({
          where: { companyId, status: 'PAID', issuedAt: { gte: start, lte: end } },
          _sum:  { amountHT: true, amountTTC: true },
        }),
        prisma.expense.aggregate({
          where: { companyId, date: { gte: start, lte: end } },
          _sum:  { amount: true },
        }),
      ])
      const tvaCollectee  = toNum(collectee._sum?.amountTTC) - toNum(collectee._sum?.amountHT)
      const tvaDeductible = toNum(deductible._sum?.amount) * 0.2
      return {
        quarter,
        period:        `T${quarter} ${year}`,
        tvaCollectee,
        tvaDeductible,
        tvaADecaisser: Math.max(0, tvaCollectee - tvaDeductible),
        tvaCredit:     Math.max(0, tvaDeductible - tvaCollectee),
      }
    }),
  )
  return { year, quarters: results }
}

// ── TVA CA3 pré-remplie ───────────────────────────────────────────────────────

export async function getTvaCA3(companyId: string, year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3
  const start = new Date(year, startMonth, 1)
  const end   = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, status: 'PAID', issuedAt: { gte: start, lte: end } },
      select: { amountHT: true, amountTTC: true, vatRate: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
  ])

  // Group by TVA rate
  const byRate = new Map<number, { base: number; tva: number }>()
  for (const inv of invoices) {
    const rate = Number(inv.vatRate) * 100
    const cur  = byRate.get(rate) ?? { base: 0, tva: 0 }
    const ht   = toNum(inv.amountHT)
    const ttc  = toNum(inv.amountTTC)
    cur.base  += ht
    cur.tva   += ttc - ht
    byRate.set(rate, cur)
  }

  const base20  = byRate.get(20)  ?? { base: 0, tva: 0 }
  const base10  = byRate.get(10)  ?? { base: 0, tva: 0 }
  const base55  = byRate.get(5.5) ?? { base: 0, tva: 0 }
  const base21  = byRate.get(2.1) ?? { base: 0, tva: 0 }

  const totalBase       = base20.base  + base10.base  + base55.base  + base21.base
  const tvaCollectee    = base20.tva   + base10.tva   + base55.tva   + base21.tva
  const tvaDeductible   = toNum(expenses._sum?.amount) * 0.2

  return {
    period:  `T${quarter} ${year}`,
    year,
    quarter,
    // Cadre A - Opérations imposables
    lignes: {
      '01': { label: 'Ventes, prestations de services (20%)',   base: base20.base,  tva: base20.tva  },
      '02': { label: 'Autres opérations imposables (10%)',      base: base10.base,  tva: base10.tva  },
      '03': { label: 'Opérations imposables (5,5%)',            base: base55.base,  tva: base55.tva  },
      '04': { label: 'Opérations imposables (2,1%)',            base: base21.base,  tva: base21.tva  },
      '09': { label: 'Total TVA brute',                         base: totalBase,    tva: tvaCollectee },
      // Cadre B - Déductions
      '20': { label: 'Dont TVA déductible sur autres biens',    base: toNum(expenses._sum?.amount), tva: tvaDeductible },
      '23': { label: 'Total TVA déductible',                    base: null,         tva: tvaDeductible },
      // Cadre C - Calcul de la TVA à payer
      '28': { label: 'TVA nette due',                           base: null,         tva: Math.max(0, tvaCollectee - tvaDeductible) },
      '29': { label: 'Crédit de TVA',                           base: null,         tva: Math.max(0, tvaDeductible - tvaCollectee) },
    },
  }
}

// ── Export FEC (Fichier des Écritures Comptables) DGFiP ──────────────────────

export async function exportFEC(companyId: string, year: number): Promise<string> {
  const start   = new Date(`${year}-01-01`)
  const end     = new Date(`${year}-12-31T23:59:59.999Z`)

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, issuedAt: { gte: start, lte: end } },
      include: { client: { select: { nom: true } } },
      orderBy: { issuedAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { companyId, date: { gte: start, lte: end } },
      orderBy: { date: 'asc' },
    }),
  ])

  const header = [
    'JournalCode', 'JournalLib', 'EcritureNum', 'EcritureDate',
    'CompteNum', 'CompteLib', 'CompAuxNum', 'CompAuxLib',
    'PieceRef', 'PieceDate', 'EcritureLib',
    'Debit', 'Credit', 'EcritureLet', 'DateLet',
    'ValidDate', 'Montantdevise', 'Idevise',
  ].join('|')

  const rows: string[] = [header]
  let lineNum = 1

  // Invoices → Journal VTE
  for (const inv of invoices) {
    const d      = fmtDate(inv.issuedAt)
    const pieceD = fmtDate(inv.issuedAt)
    const num    = String(lineNum).padStart(6, '0')
    const client = inv.client
    const taxAmount = toNum(inv.amountTTC) - toNum(inv.amountHT)

    // Débit client (411)
    rows.push([
      'VTE', 'Ventes', num, d,
      '411', 'Clients', '', client.nom,
      inv.reference, pieceD, `Facture ${inv.reference}`,
      fmtDecimal(toNum(inv.amountTTC)), '0,00', '', '',
      d, '', '',
    ].join('|'))
    lineNum++

    // Crédit ventes HT (706)
    rows.push([
      'VTE', 'Ventes', String(lineNum).padStart(6, '0'), d,
      '706', 'Prestations de services', '', '',
      inv.reference, pieceD, `Facture ${inv.reference}`,
      '0,00', fmtDecimal(toNum(inv.amountHT)), '', '',
      d, '', '',
    ].join('|'))
    lineNum++

    // Crédit TVA (44571)
    if (taxAmount > 0) {
      rows.push([
        'VTE', 'Ventes', String(lineNum).padStart(6, '0'), d,
        '44571', 'TVA collectée', '', '',
        inv.reference, pieceD, `TVA Facture ${inv.reference}`,
        '0,00', fmtDecimal(taxAmount), '', '',
        d, '', '',
      ].join('|'))
      lineNum++
    }
  }

  // Expenses → Journal ACH
  for (const exp of expenses) {
    const d   = fmtDate(exp.date)
    const num = String(lineNum).padStart(6, '0')
    const label = exp.note ?? exp.category

    // Débit charges (607/606 etc)
    rows.push([
      'ACH', 'Achats', num, d,
      '607', 'Achats divers', '', '',
      exp.id.slice(0, 12), d, label,
      fmtDecimal(toNum(exp.amount)), '0,00', '', '',
      d, '', '',
    ].join('|'))
    lineNum++

    // Crédit fournisseur (401)
    rows.push([
      'ACH', 'Achats', String(lineNum).padStart(6, '0'), d,
      '401', 'Fournisseurs', '', '',
      exp.id.slice(0, 12), d, label,
      '0,00', fmtDecimal(toNum(exp.amount)), '', '',
      d, '', '',
    ].join('|'))
    lineNum++
  }

  return rows.join('\r\n')
}

// ── Clôture d'exercice ────────────────────────────────────────────────────────

export async function getClotureStatus(companyId: string, year: number) {
  const [existingFY, openInvoices, result] = await Promise.all([
    prisma.fiscalYear.findUnique({ where: { companyId_year: { companyId, year } } }),
    prisma.invoice.count({ where: { companyId, status: { in: ['PENDING', 'OVERDUE'] }, issuedAt: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } } }),
    getCompteDeResultat(companyId, year),
  ])

  const alreadyClosed = existingFY?.status === 'CLOSED'

  return {
    year,
    alreadyClosed,
    closedAt:      existingFY?.closedAt ?? null,
    openInvoices,
    resultatNet:   result.resultatBrut,
    canClose:      openInvoices === 0 && !alreadyClosed,
    blockers:      openInvoices > 0 ? [`${openInvoices} facture(s) non encaissée(s) sur l'exercice`] : [],
  }
}

export async function closeExercise(companyId: string, year: number, notes?: string, closedBy?: string) {
  const status = await getClotureStatus(companyId, year)
  if (status.alreadyClosed)
    throw new AppError(`L'exercice ${year} est déjà clôturé`, 409, 'ALREADY_CLOSED')
  if (!status.canClose)
    throw new AppError(`Impossible de clôturer : ${status.blockers.join(', ')}`, 422, 'CANNOT_CLOSE')

  // Use FiscalYear directly instead of FiscalYearClose
  const fy = await prisma.fiscalYear.findUnique({ where: { companyId_year: { companyId, year } } })
  if (!fy) throw new AppError(`Exercice fiscal ${year} introuvable`, 404, 'NOT_FOUND')

  return prisma.fiscalYear.update({
    where: { id: fy.id },
    data: {
      status:    'CLOSED',
      closedBy:  closedBy ?? null,
      closedAt:  new Date(),
      closingBalance: { resultNet: status.resultatNet, notes } as Prisma.InputJsonValue,
    },
  })
}

// ── Plan comptable ─────────────────────────────────────────────────────────────

export async function getPlan(companyId: string) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { accountingZone: true },
  })

  const zone    = company.accountingZone
  const entries = getPlanByZone(zone)

  // Mark which accounts the company has activated
  const active = await prisma.accountPlan.findMany({
    where: { companyId },
    select: { numero: true },
  })
  const activeSet = new Set(active.map(a => a.numero))

  return {
    zone,
    zoneLabel: ZONE_LABELS[zone],
    entries: entries.map(e => ({ ...e, utilisé: activeSet.has(e.numero) })),
  }
}

export async function getComptes(companyId: string) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { accountingZone: true },
  })

  const comptes = await prisma.accountPlan.findMany({
    where: { companyId, isActive: true },
    orderBy: { numero: 'asc' },
  })

  // Compute balances from journal entries (invoices + expenses)
  const invoices = await prisma.invoice.findMany({
    where: { companyId },
    select: { amountHT: true, amountTTC: true, status: true },
  })
  const expenses = await prisma.expense.findMany({
    where: { companyId },
    select: { amount: true },
  })

  // Build simple solde map per account number
  const debitMap  = new Map<string, number>()
  const creditMap = new Map<string, number>()

  const zone = company.accountingZone
  const clientAcc = zone === 'OHADA' ? '411' : zone === 'IFRS' ? '1100' : '411'
  const salesAcc  = zone === 'OHADA' ? '706' : zone === 'IFRS' ? '7000' : '706'
  const tvaAcc    = zone === 'OHADA' ? '4435' : zone === 'IFRS' ? '3200' : '4457'
  const expAcc    = zone === 'OHADA' ? '604' : zone === 'IFRS' ? '6400' : '606'
  const bankAcc   = zone === 'OHADA' ? '521' : zone === 'IFRS' ? '1000' : '512'

  for (const inv of invoices) {
    const ht  = toNum(inv.amountHT)
    const ttc = toNum(inv.amountTTC)
    const tva = ttc - ht
    debitMap.set(clientAcc,  (debitMap.get(clientAcc)  ?? 0) + ttc)
    creditMap.set(salesAcc,  (creditMap.get(salesAcc)  ?? 0) + ht)
    creditMap.set(tvaAcc,    (creditMap.get(tvaAcc)    ?? 0) + tva)
    if (inv.status === 'PAID') {
      debitMap.set(bankAcc,  (debitMap.get(bankAcc)    ?? 0) + ttc)
      creditMap.set(clientAcc, (creditMap.get(clientAcc) ?? 0) + ttc)
    }
  }
  for (const exp of expenses) {
    const amt = toNum(exp.amount)
    debitMap.set(expAcc, (debitMap.get(expAcc) ?? 0) + amt)
    creditMap.set(bankAcc, (creditMap.get(bankAcc) ?? 0) + amt)
  }

  return comptes.map(c => {
    const d = debitMap.get(c.numero)  ?? 0
    const cr = creditMap.get(c.numero) ?? 0
    return {
      id:             c.id,
      numero:         c.numero,
      intitule:       c.intitule,
      classe:         c.classe,
      type:           c.type,
      zone:           c.zone,
      isSystem:       c.isSystem,
      soldeDebiteur:  Math.max(0, d - cr),
      soldeCrediteur: Math.max(0, cr - d),
      soldeNet:       d - cr,
    }
  })
}

export async function addCompte(
  companyId: string,
  data: { numero: string; intitule: string; classe: number; type: string; isSystem?: boolean },
) {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { accountingZone: true },
  })

  const existing = await prisma.accountPlan.findUnique({
    where: { companyId_numero: { companyId, numero: data.numero } },
  })
  if (existing) {
    if (!existing.isActive) {
      return prisma.accountPlan.update({
        where: { id: existing.id },
        data: { isActive: true, intitule: data.intitule },
      })
    }
    throw new AppError(`Le compte ${data.numero} existe déjà`, 409, 'DUPLICATE_ACCOUNT')
  }

  return prisma.accountPlan.create({
    data: {
      companyId,
      numero:   data.numero,
      intitule: data.intitule,
      classe:   data.classe,
      type:     data.type as never,
      zone:     company.accountingZone,
      isSystem: data.isSystem ?? false,
    },
  })
}

export async function updateCompte(companyId: string, id: string, intitule: string) {
  const compte = await prisma.accountPlan.findFirst({ where: { id, companyId } })
  if (!compte) throw new AppError('Compte introuvable', 404, 'NOT_FOUND')

  return prisma.accountPlan.update({ where: { id }, data: { intitule } })
}

export async function deleteCompte(companyId: string, id: string) {
  const compte = await prisma.accountPlan.findFirst({ where: { id, companyId } })
  if (!compte) throw new AppError('Compte introuvable', 404, 'NOT_FOUND')

  return prisma.accountPlan.update({ where: { id }, data: { isActive: false } })
}

// ── Fiscal Year Management ─────────────────────────────────────────────────────

export async function getOrCreateFiscalYear(companyId: string, year: number, _createdBy: string) {
  const existing = await prisma.fiscalYear.findUnique({
    where: { companyId_year: { companyId, year } },
  })
  if (existing) return existing

  return prisma.fiscalYear.create({
    data: {
      companyId,
      year,
      startDate: new Date(`${year}-01-01`),
      endDate:   new Date(`${year}-12-31`),
      status:    'OPEN',
    },
  })
}

export async function listFiscalYears(companyId: string) {
  return prisma.fiscalYear.findMany({
    where:   { companyId },
    orderBy: { year: 'desc' },
    include: {
      _count: {
        select: { journalEntries: true },
      },
    },
  })
}

export async function createFiscalYear(
  companyId: string,
  data: { year: number; startDate?: string; endDate?: string },
  _createdBy: string,
) {
  // Maximum 2 OPEN fiscal years simultaneously
  const openYears = await prisma.fiscalYear.findMany({
    where: { companyId, status: 'OPEN' },
    orderBy: { year: 'asc' },
  })
  if (openYears.length >= 2) {
    throw new AppError(
      `Maximum 2 exercices ouverts simultan\xe9ment. Cl\xf4turez l’exercice ${openYears[0]!.year} avant d’en cr\xe9er un nouveau.`,
      409,
      'OPEN_FISCAL_YEAR_LIMIT',
    )
  }

  // Year must not already exist
  const existingYear = await prisma.fiscalYear.findUnique({
    where: { companyId_year: { companyId, year: data.year } },
  })
  if (existingYear) {
    throw new AppError(`L'exercice fiscal ${data.year} existe déjà`, 409, 'FISCAL_YEAR_EXISTS')
  }

  return prisma.fiscalYear.create({
    data: {
      companyId,
      year:      data.year,
      startDate: new Date(data.startDate ?? `${data.year}-01-01`),
      endDate:   new Date(data.endDate   ?? `${data.year}-12-31`),
      status:    'OPEN',
    },
  })
}

export async function getFiscalYear(companyId: string, id: string) {
  const fy = await prisma.fiscalYear.findUniqueOrThrow({ where: { id } })
  if (fy.companyId !== companyId)
    throw new AppError('Exercice fiscal introuvable', 404, 'NOT_FOUND')
  return fy
}

export async function lockFiscalYear(companyId: string, id: string) {
  const fy = await getFiscalYear(companyId, id)
  if (fy.status !== 'OPEN')
    throw new AppError(`Impossible de verrouiller un exercice avec le statut "${fy.status}"`, 422, 'INVALID_STATUS')

  return prisma.fiscalYear.update({
    where: { id },
    data:  { status: 'LOCKED' },
  })
}

export async function closeFiscalYearNew(companyId: string, id: string, userId: string) {
  const fy = await getFiscalYear(companyId, id)

  if (fy.status === 'CLOSED')
    throw new AppError(`L'exercice ${fy.year} est déjà clôturé`, 409, 'ALREADY_CLOSED')
  if (fy.status !== 'OPEN' && fy.status !== 'LOCKED')
    throw new AppError(`Impossible de clôturer un exercice avec le statut "${fy.status}"`, 422, 'INVALID_STATUS')

  // Calculate financial summaries
  const [compteResultat, bilan] = await Promise.all([
    getCompteDeResultat(companyId, fy.year),
    getBilan(companyId, fy.year),
  ])

  const closingBalance = {
    actif:   bilan.actif,
    passif:  bilan.passif,
    resultat: compteResultat.resultatBrut,
  }

  // Close the fiscal year
  const updated = await prisma.fiscalYear.update({
    where: { id },
    data: {
      status:         'CLOSED',
      closedBy:       userId,
      closedAt:       new Date(),
      closingBalance: closingBalance as Prisma.InputJsonValue,
    },
  })

  // Auto-create next year's fiscal year if it doesn't exist yet
  const nextYear = fy.year + 1
  const nextYearExists = await prisma.fiscalYear.findUnique({
    where: { companyId_year: { companyId, year: nextYear } },
  })
  if (!nextYearExists) {
    await prisma.fiscalYear.create({
      data: {
        companyId,
        year:           nextYear,
        startDate:      new Date(`${nextYear}-01-01`),
        endDate:        new Date(`${nextYear}-12-31`),
        status:         'OPEN',
        openingBalance: closingBalance as Prisma.InputJsonValue,
      },
    })
  }

  return updated
}

export async function reopenFiscalYear(companyId: string, id: string) {
  const fy = await getFiscalYear(companyId, id)
  if (fy.status !== 'CLOSED')
    throw new AppError(`Impossible de rouvrir un exercice avec le statut "${fy.status}"`, 422, 'INVALID_STATUS')

  return prisma.fiscalYear.update({
    where: { id },
    data: {
      status:    'OPEN',
      closedBy:  null,
      closedAt:  null,
    },
  })
}

export async function getFiscalYearSummary(companyId: string, id: string) {
  const fy = await getFiscalYear(companyId, id)
  const year = fy.year

  const [compteResultat, bilan, entriesCount] =
    await Promise.all([
      getCompteDeResultat(companyId, year),
      getBilan(companyId, year),
      prisma.journalEntry.count({ where: { companyId, fiscalYearId: id } }),
    ])

  const totalInvoices = await prisma.invoice.count({ where: { companyId } })
  const openInvoices  = await prisma.invoice.count({ where: { companyId, status: { in: ['PENDING', 'OVERDUE'] } } })
  const totalExpenses = await prisma.expense.count({ where: { companyId } })

  return {
    id:            fy.id,
    year,
    status:        fy.status,
    startDate:     fy.startDate,
    endDate:       fy.endDate,
    ca:            compteResultat.produits.chiffreAffaires,
    charges:       compteResultat.charges.chargesTotal,
    resultatNet:   compteResultat.resultatBrut,
    bilanActif:    bilan.actif.totalActif,
    bilanPassif:   bilan.passif.totalPassif,
    equilibre:     bilan.actif.totalActif === bilan.passif.totalPassif,
    openInvoices,
    totalInvoices,
    totalExpenses,
    entriesCount,
    alreadyClosed: fy.status === 'CLOSED',
    openingBalance: fy.openingBalance,
    closingBalance: fy.closingBalance,
  }
}

// ── Journal / Balance / Grand Livre by fiscalYearId ─────────────────────────

export async function getJournalByFiscalYear(companyId: string, fiscalYearId: string) {
  const fy = await getFiscalYear(companyId, fiscalYearId)
  const entries = await prisma.journalEntry.findMany({
    where:   { companyId, fiscalYearId },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })
  return {
    fiscalYearId,
    year: fy.year,
    status: fy.status,
    entries: entries.map(e => ({
      id:          e.id,
      date:        e.date,
      journalCode: e.journal,
      account:     e.compte,
      label:       e.libelle,
      debit:       Number(e.debit),
      credit:      Number(e.credit),
      reference:   e.reference,
    })),
  }
}

export async function getBalanceByFiscalYear(companyId: string, fiscalYearId: string) {
  const fy = await getFiscalYear(companyId, fiscalYearId)
  const entries = await prisma.journalEntry.findMany({
    where:   { companyId, fiscalYearId },
    select:  { compte: true, debit: true, credit: true },
  })

  const map = new Map<string, { debit: number; credit: number }>()
  for (const e of entries) {
    const cur = map.get(e.compte) ?? { debit: 0, credit: 0 }
    cur.debit  += Number(e.debit)
    cur.credit += Number(e.credit)
    map.set(e.compte, cur)
  }

  // Enrich with account labels from AccountPlan
  const accountNumbers = [...map.keys()]
  const plans = await prisma.accountPlan.findMany({
    where: { companyId, numero: { in: accountNumbers } },
    select: { numero: true, intitule: true },
  })
  const labelMap = new Map(plans.map(p => [p.numero, p.intitule]))

  const rows = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([account, { debit, credit }]) => ({
      account,
      label:         labelMap.get(account) ?? account,
      totalDebit:    debit,
      totalCredit:   credit,
      soldeDebiteur:  Math.max(0, debit - credit),
      soldeCrediteur: Math.max(0, credit - debit),
    }))

  const totalDebit  = rows.reduce((s, r) => s + r.totalDebit,  0)
  const totalCredit = rows.reduce((s, r) => s + r.totalCredit, 0)

  return {
    fiscalYearId,
    year:        fy.year,
    status:      fy.status,
    rows,
    totalDebit,
    totalCredit,
    equilibre:   Math.abs(totalDebit - totalCredit) < 0.01,
  }
}

export async function getGrandLivreByFiscalYear(companyId: string, fiscalYearId: string) {
  const fy = await getFiscalYear(companyId, fiscalYearId)
  const entries = await prisma.journalEntry.findMany({
    where:   { companyId, fiscalYearId },
    orderBy: [{ compte: 'asc' }, { date: 'asc' }],
  })

  // Group by account
  const accountMap = new Map<string, typeof entries>()
  for (const e of entries) {
    const arr = accountMap.get(e.compte) ?? []
    arr.push(e)
    accountMap.set(e.compte, arr)
  }

  // Enrich with labels
  const accountNumbers = [...accountMap.keys()]
  const plans = await prisma.accountPlan.findMany({
    where: { companyId, numero: { in: accountNumbers } },
    select: { numero: true, intitule: true },
  })
  const labelMap = new Map(plans.map(p => [p.numero, p.intitule]))

  const comptes = [...accountMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([account, lines]) => {
      let runningBalance = 0
      const lignes = lines.map(e => {
        const d = Number(e.debit)
        const c = Number(e.credit)
        runningBalance += d - c
        return {
          id:          e.id,
          date:        e.date,
          journalCode: e.journal,
          label:       e.libelle,
          debit:       d,
          credit:      c,
          solde:       runningBalance,
          reference:   e.reference,
        }
      })
      return { account, label: labelMap.get(account) ?? account, lignes }
    })

  return { fiscalYearId, year: fy.year, status: fy.status, comptes }
}
