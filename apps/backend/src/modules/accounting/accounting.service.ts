import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { getPlanByZone, ZONE_LABELS } from '../../lib/accountingPlans.js'
import { getAgenceFilter } from '../../middleware/agenceFilter.js'
import { normalizeAccountCode } from '../../lib/accountCodes.js'
import { invalidateFiscalYearCache } from './revision.service.js'
import type { JwtPayload } from '@athenis/shared-types'

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

/**
 * Résout le libellé d'un compte comptable.
 * Priorité : 1) plan entreprise exact, 2) plan statique exact,
 *            3) préfixe décroissant — plan entreprise PUIS statique à chaque longueur,
 *            4) numéro seul.
 *
 * Le companyMap doit contenir TOUS les comptes de l'entreprise (pas seulement les comptes
 * qui apparaissent dans les écritures) afin que la recherche par préfixe fonctionne
 * pour les comptes personnalisés.
 */
function lookupLabel(
  account: string,
  companyMap: Map<string, string>,
  staticMap: Map<string, string>,
): string {
  // 1. Correspondance exacte dans le plan entreprise
  const custom = companyMap.get(account)
  if (custom) return custom

  // 2. Correspondance exacte dans le plan statique
  const exact = staticMap.get(account)
  if (exact) return exact

  // 3. Recherche par préfixe décroissant — plan entreprise prioritaire sur statique
  for (let len = account.length - 1; len >= 2; len--) {
    const prefix = account.slice(0, len)
    const companyLabel = companyMap.get(prefix)
    if (companyLabel) return companyLabel
    const staticLabel  = staticMap.get(prefix)
    if (staticLabel)  return staticLabel
  }

  return account
}

function fmtDate(d: Date | string): string {
  const dt = new Date(d)
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`
}

function fmtDecimal(n: number): string {
  return n.toFixed(2).replace('.', ',')
}

// ── Existing reports ───────────────────────────────────────────────────────────

export async function getCompteDeResultat(companyId: string, year: number, user?: JwtPayload) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)
  const af    = user ? getAgenceFilter(user) : {}

  const [invoiceTotals, expenseTotals, salaryTotals] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: 'PAID', issuedAt: { gte: start, lte: end } },
      _sum: { amountHT: true, amountTTC: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, ...af, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    // La masse salariale est une donnée entreprise (pas par agence)
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

export async function getBilan(companyId: string, year: number, user?: JwtPayload) {
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)
  const start = new Date(`${year}-01-01`)
  const af    = user ? getAgenceFilter(user) : {}

  const [creances, dettes, tresorerie] = await Promise.all([
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: { in: ['SENT', 'OVERDUE'] }, dueAt: { lte: end } },
      _sum: { amountTTC: true },
    }),
    prisma.expense.aggregate({
      where: { companyId, ...af, date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { companyId, ...af, status: 'PAID', issuedAt: { gte: start, lte: end } },
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

export async function getGrandLivre(companyId: string, year: number, user?: JwtPayload) {
  const start = new Date(`${year}-01-01`)
  const end   = new Date(`${year}-12-31T23:59:59.999Z`)
  const af    = user ? getAgenceFilter(user) : {}

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { companyId, ...af, issuedAt: { gte: start, lte: end } },
      include: { client: { select: { nom: true } } },
      orderBy: { issuedAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { companyId, ...af, date: { gte: start, lte: end } },
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
      label:     exp.description ?? exp.category,
      debit:     toNum(exp.amount),
      credit:    0,
      category:  exp.category,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime())

  return { year, entries }
}

export async function getTvaTrimestrielle(companyId: string, year: number, user?: JwtPayload) {
  const af = user ? getAgenceFilter(user) : {}
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
          where: { companyId, ...af, status: 'PAID', issuedAt: { gte: start, lte: end } },
          _sum:  { amountHT: true, amountTTC: true },
        }),
        prisma.expense.aggregate({
          where: { companyId, ...af, date: { gte: start, lte: end } },
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
    const label = exp.description ?? exp.category

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
    prisma.invoice.count({ where: { companyId, status: { in: ['SENT', 'OVERDUE'] }, issuedAt: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } } }),
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
      isCentralizer:  c.isCentralizer,
      soldeDebiteur:  Math.max(0, d - cr),
      soldeCrediteur: Math.max(0, cr - d),
      soldeNet:       d - cr,
    }
  })
}

/**
 * Normalise un numéro de compte avec validation stricte (cf. lib/accountCodes.ts).
 * @deprecated Utiliser `normalizeAccountCode` directement.
 */
function normalizeNumero(numero: string): string {
  return normalizeAccountCode(numero)
}

export async function addCompte(
  companyId: string,
  data: { numero: string; intitule: string; classe: number; type: string; isSystem?: boolean; isCentralizer?: boolean },
) {
  const numero  = normalizeNumero(data.numero)   // ← normalisation systématique

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { accountingZone: true },
  })

  const existing = await prisma.accountPlan.findUnique({
    where: { companyId_numero: { companyId, numero } },
  })
  if (existing) {
    if (!existing.isActive) {
      return prisma.accountPlan.update({
        where: { id: existing.id },
        data: {
          isActive: true,
          intitule: data.intitule,
          // Met à jour isCentralizer si explicitement fourni (réactivation)
          ...(data.isCentralizer !== undefined ? { isCentralizer: data.isCentralizer } : {}),
        },
      })
    }
    throw new AppError(`Le compte ${numero} existe déjà`, 409, 'DUPLICATE_ACCOUNT')
  }

  return prisma.accountPlan.create({
    data: {
      companyId,
      numero,
      intitule:      data.intitule,
      classe:        data.classe,
      type:          data.type as never,
      zone:          company.accountingZone,
      isSystem:      data.isSystem      ?? false,
      isCentralizer: data.isCentralizer ?? false,
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

  // Les comptes centralisateurs (explicitement marqués par l'utilisateur)
  // sont supprimables sans restriction. L'utilisateur en a la responsabilité.
  if (!compte.isCentralizer) {
    // Protection 1 : comptes système non supprimables (préserve le référentiel)
    if (compte.isSystem) {
      throw new AppError(
        'Compte système non supprimable — il fait partie du plan comptable de référence',
        403, 'SYSTEM_ACCOUNT',
      )
    }

    // Protection 2 : comptes mouvementés non supprimables (intégrité comptable)
    const mouvements = await prisma.journalEntry.count({
      where: { companyId, compte: compte.numero },
    })
    if (mouvements > 0) {
      throw new AppError(
        `Compte mouvementé non supprimable : ${mouvements} écriture(s) comptable(s) référencent ce compte. ` +
        `Soldez le compte ou supprimez les écritures avant de le désactiver.`,
        409, 'ACCOUNT_HAS_MOVEMENTS',
      )
    }
  }

  return prisma.accountPlan.update({ where: { id }, data: { isActive: false } })
}

// ── Fiscal Year Management ─────────────────────────────────────────────────────

export async function getOrCreateFiscalYear(companyId: string, year: number, createdBy: string) {
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
      createdBy,
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
  createdBy: string,
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
      createdBy,
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

  // Toggle : OPEN → LOCKED  /  LOCKED → OPEN (déverrouillage)
  if (fy.status === 'OPEN') {
    return prisma.fiscalYear.update({ where: { id }, data: { status: 'LOCKED' } })
  }
  if (fy.status === 'LOCKED') {
    return prisma.fiscalYear.update({ where: { id }, data: { status: 'OPEN' } })
  }

  throw new AppError(
    `Impossible de (dé)verrouiller un exercice avec le statut "${fy.status}"`,
    422,
    'INVALID_STATUS',
  )
}

export async function closeFiscalYearNew(companyId: string, id: string, userId: string) {
  const fy = await getFiscalYear(companyId, id)

  if (fy.status === 'CLOSED')
    throw new AppError(`L'exercice ${fy.year} est déjà clôturé`, 409, 'ALREADY_CLOSED')
  if (fy.status !== 'OPEN' && fy.status !== 'LOCKED')
    throw new AppError(`Impossible de clôturer un exercice avec le statut "${fy.status}"`, 422, 'INVALID_STATUS')

  // ── Zone comptable (OHADA / FRANCE / IFRS) ─────────────────────────────────
  const company = await prisma.company.findUnique({
    where: { id: companyId }, select: { accountingZone: true },
  })
  const zone = (company?.accountingZone ?? 'OHADA') as string

  // ── Agrégats financiers (métadonnées closingBalance) — lectures pré-transaction ──
  const [compteResultat, bilan] = await Promise.all([
    getCompteDeResultat(companyId, fy.year),
    getBilan(companyId, fy.year),
  ])
  const closingBalance = {
    actif:    bilan.actif,
    passif:   bilan.passif,
    resultat: compteResultat.resultatBrut,
  }

  // ── Soldes des écritures journal (lecture pré-transaction) ─────────────────
  const journalEntries = await prisma.journalEntry.findMany({
    where:  { companyId, fiscalYearId: id },
    select: { compte: true, debit: true, credit: true },
  })
  const balanceMap = new Map<string, { debit: number; credit: number }>()
  for (const e of journalEntries) {
    const cur = balanceMap.get(e.compte) ?? { debit: 0, credit: 0 }
    cur.debit  += Number(e.debit)
    cur.credit += Number(e.credit)
    balanceMap.set(e.compte, cur)
  }

  // Résultat net depuis les comptes 6 et 7
  let totalProduits = 0
  let totalCharges  = 0
  for (const [compte, { debit, credit }] of balanceMap) {
    const c = compte.charAt(0)
    if (c === '7') totalProduits += credit - debit
    if (c === '6') totalCharges  += debit  - credit
  }
  const resultatNetJournal = totalProduits - totalCharges

  // ── Préparer les lignes AN (calcul pur, sans écriture DB) ─────────────────
  const nextYear    = fy.year + 1
  const openingDate = new Date(`${nextYear}-01-01`)
  const anRef       = `AN-${nextYear}`

  type ANRow = {
    companyId: string; fiscalYearId: string; date: Date
    journal: string; compte: string; libelle: string
    debit: number; credit: number; reference: string; createdBy: string
  }
  const pendingAnRows: ANRow[] = []

  if (journalEntries.length > 0) {
    // Cas 1 : journal alimenté — reporter les soldes des comptes de bilan (classes 1-5)
    for (const [compte, { debit, credit }] of balanceMap) {
      const classe = compte.charAt(0)
      if (!['1', '2', '3', '4', '5'].includes(classe)) continue
      const solde = debit - credit
      if (Math.abs(solde) < 0.01) continue
      pendingAnRows.push({
        companyId, fiscalYearId: '__PLACEHOLDER__',
        date: openingDate, journal: 'AN', compte,
        libelle:   `À-nouveau ${fy.year}`,
        debit:     Math.max(0,  solde),
        credit:    Math.max(0, -solde),
        reference: anRef, createdBy: userId,
      })
    }
    // N17 : report du résultat vers le compte adéquat selon la zone.
    //   OHADA → 119 (Report à nouveau, débiteur ou créditeur consolidé)
    //   FRANCE → 110 si bénéfice (Report à nouveau positif), 119 si perte
    //            (Report à nouveau négatif) — PCG 2014.
    // Avant : on écrivait toujours sur 119 même en France, ce qui était
    //         défensable mais incorrect côté PCG strict.
    const resultPrefix = zone === 'FRANCE' ? '12' : '13'
    const hasResCompte = [...balanceMap.keys()].some(k => k.startsWith(resultPrefix))
    if (!hasResCompte && Math.abs(resultatNetJournal) > 0.01) {
      const reportAccount = zone === 'FRANCE'
        ? (resultatNetJournal >= 0 ? '110' : '119')
        : '119'
      pendingAnRows.push({
        companyId, fiscalYearId: '__PLACEHOLDER__',
        date: openingDate, journal: 'AN', compte: normalizeAccountCode(reportAccount),
        libelle: `À-nouveau ${fy.year} — Résultat ${resultatNetJournal >= 0 ? '(bénéfice)' : '(perte)'}`,
        debit:   resultatNetJournal < 0 ? Math.abs(resultatNetJournal) : 0,
        credit:  resultatNetJournal > 0 ? resultatNetJournal : 0,
        reference: anRef, createdBy: userId,
      })
    }
  } else {
    // Cas 2 : journal vide — fallback sur le bilan calculé
    const { actif, passif } = closingBalance
    if (actif.creancesClients > 0.01)
      pendingAnRows.push({ companyId, fiscalYearId: '__PLACEHOLDER__', date: openingDate, journal: 'AN',
        compte: normalizeAccountCode('411'), libelle: `À-nouveau ${fy.year} — Créances clients`,
        debit: actif.creancesClients, credit: 0, reference: anRef, createdBy: userId })
    if (actif.tresorerie > 0.01)
      pendingAnRows.push({ companyId, fiscalYearId: '__PLACEHOLDER__', date: openingDate, journal: 'AN',
        compte: normalizeAccountCode(zone === 'OHADA' ? '521' : '512'), libelle: `À-nouveau ${fy.year} — Trésorerie`,
        debit: actif.tresorerie, credit: 0, reference: anRef, createdBy: userId })
    if (passif.dettesExploitation > 0.01)
      pendingAnRows.push({ companyId, fiscalYearId: '__PLACEHOLDER__', date: openingDate, journal: 'AN',
        compte: normalizeAccountCode('401'), libelle: `À-nouveau ${fy.year} — Dettes fournisseurs`,
        debit: 0, credit: passif.dettesExploitation, reference: anRef, createdBy: userId })
    const net = compteResultat.resultatBrut
    if (Math.abs(net) > 0.01)
      pendingAnRows.push({ companyId, fiscalYearId: '__PLACEHOLDER__', date: openingDate, journal: 'AN',
        compte:  '119',
        libelle: `À-nouveau ${fy.year} — Résultat ${net >= 0 ? '(bénéfice)' : '(perte)'}`,
        debit:   net < 0 ? Math.abs(net) : 0,
        credit:  net > 0 ? net : 0,
        reference: anRef, createdBy: userId })
  }

  // ── Transaction atomique : clôture + création N+1 + insertion AN ──────────
  // Si une étape échoue, l'ensemble est annulé — aucun état intermédiaire incohérent.
  return prisma.$transaction(async (tx) => {
    // 1. Clôturer l'exercice
    const updated = await tx.fiscalYear.update({
      where: { id },
      data: {
        status:         'CLOSED',
        closedBy:       userId,
        closedAt:       new Date(),
        closingBalance: closingBalance as Prisma.InputJsonValue,
      },
    })

    // 2. Créer l'exercice N+1 s'il n'existe pas encore
    let nextFy = await tx.fiscalYear.findUnique({
      where: { companyId_year: { companyId, year: nextYear } },
    })
    if (!nextFy) {
      nextFy = await tx.fiscalYear.create({
        data: {
          companyId,
          year:           nextYear,
          startDate:      new Date(`${nextYear}-01-01`),
          endDate:        new Date(`${nextYear}-12-31`),
          status:         'OPEN',
          createdBy:      userId,
          openingBalance: closingBalance as Prisma.InputJsonValue,
        },
      })
    }

    // 3. Insérer les AN si aucun n'existe déjà pour cet exercice
    const existingAN = await tx.journalEntry.count({
      where: { companyId, fiscalYearId: nextFy.id, journal: 'AN' },
    })

    let anGenerated = 0
    if (existingAN === 0 && pendingAnRows.length > 0) {
      // Remplacer le placeholder par le vrai fiscalYearId maintenant connu
      const anRows = pendingAnRows.map(r => ({ ...r, fiscalYearId: nextFy!.id }))
      await tx.journalEntry.createMany({ data: anRows })
      anGenerated = anRows.length
    }

    // N19 : invalider le cache révision après clôture (statut changé)
    invalidateFiscalYearCache(id)
    if (nextFy) invalidateFiscalYearCache(nextFy.id)

    return { fiscalYear: updated, anGenerated, nextYear }
  })
}

export async function reopenFiscalYear(companyId: string, id: string) {
  const fy = await getFiscalYear(companyId, id)
  if (fy.status !== 'CLOSED')
    throw new AppError(`Impossible de rouvrir un exercice avec le statut "${fy.status}"`, 422, 'INVALID_STATUS')

  // Supprimer les à-nouveaux auto-générés dans l'exercice N+1
  const nextFy = await prisma.fiscalYear.findUnique({
    where: { companyId_year: { companyId, year: fy.year + 1 } },
  })
  if (nextFy) {
    await prisma.journalEntry.deleteMany({
      where: {
        companyId,
        fiscalYearId: nextFy.id,
        journal:      'AN',
        reference:    `AN-${fy.year + 1}`,
      },
    })
  }

  // N19 : invalider le cache révision (year potentiellement modifié si l'admin
  //       a aussi corrigé l'année avant réouverture).
  invalidateFiscalYearCache(id)

  return prisma.fiscalYear.update({
    where: { id },
    data: {
      status:   'OPEN',
      closedBy: null,
      closedAt: null,
    },
  })
}

/**
 * Génère (ou régénère) les écritures d'à-nouveaux pour l'exercice N+1
 * à partir d'un exercice N déjà clôturé.
 * Idempotent : les écritures AN existantes sont d'abord supprimées.
 */
export async function generateOpeningEntries(companyId: string, closedFyId: string, userId: string) {
  const fy = await getFiscalYear(companyId, closedFyId)
  if (fy.status !== 'CLOSED')
    throw new AppError(`L'exercice ${fy.year} n'est pas clôturé`, 422, 'INVALID_STATUS')

  const company = await prisma.company.findUnique({
    where: { id: companyId }, select: { accountingZone: true },
  })
  const zone = (company?.accountingZone ?? 'OHADA') as string

  const nextYear = fy.year + 1
  const nextFy   = await prisma.fiscalYear.findUnique({
    where: { companyId_year: { companyId, year: nextYear } },
  })
  if (!nextFy)
    throw new AppError(`L'exercice ${nextYear} est introuvable. Créez-le d'abord.`, 404, 'NOT_FOUND')

  const [compteResultat, bilan] = await Promise.all([
    getCompteDeResultat(companyId, fy.year),
    getBilan(companyId, fy.year),
  ])

  const journalEntries = await prisma.journalEntry.findMany({
    where:  { companyId, fiscalYearId: closedFyId },
    select: { compte: true, debit: true, credit: true },
  })
  const balanceMap = new Map<string, { debit: number; credit: number }>()
  for (const e of journalEntries) {
    const cur = balanceMap.get(e.compte) ?? { debit: 0, credit: 0 }
    cur.debit  += Number(e.debit)
    cur.credit += Number(e.credit)
    balanceMap.set(e.compte, cur)
  }

  let totalProduits = 0
  let totalCharges  = 0
  for (const [compte, { debit, credit }] of balanceMap) {
    const c = compte.charAt(0)
    if (c === '7') totalProduits += credit - debit
    if (c === '6') totalCharges  += debit  - credit
  }
  const resultatNetJournal = totalProduits - totalCharges

  const anRef       = `AN-${nextYear}`
  const openingDate = new Date(`${nextYear}-01-01`)

  // Supprimer les AN existants (régénération)
  await prisma.journalEntry.deleteMany({
    where: { companyId, fiscalYearId: nextFy.id, journal: 'AN', reference: anRef },
  })

  type ANRow = {
    companyId: string; fiscalYearId: string; date: Date; journal: string
    compte: string; libelle: string; debit: number; credit: number
    reference: string; createdBy: string
  }
  const anRows: ANRow[] = []

  if (journalEntries.length > 0) {
    for (const [compte, { debit, credit }] of balanceMap) {
      const classe = compte.charAt(0)
      if (!['1', '2', '3', '4', '5'].includes(classe)) continue
      const solde = debit - credit
      if (Math.abs(solde) < 0.01) continue
      anRows.push({
        companyId, fiscalYearId: nextFy.id, date: openingDate, journal: 'AN',
        compte, libelle: `À-nouveau ${fy.year}`,
        debit: Math.max(0, solde), credit: Math.max(0, -solde),
        reference: anRef, createdBy: userId,
      })
    }
    const resultPrefix = zone === 'FRANCE' ? '12' : '13'
    const hasResCompte = [...balanceMap.keys()].some(k => k.startsWith(resultPrefix))
    if (!hasResCompte && Math.abs(resultatNetJournal) > 0.01) {
      anRows.push({
        companyId, fiscalYearId: nextFy.id, date: openingDate, journal: 'AN',
        compte: normalizeAccountCode('119'),
        libelle: `À-nouveau ${fy.year} — Résultat ${resultatNetJournal >= 0 ? '(bénéfice)' : '(perte)'}`,
        debit:  resultatNetJournal < 0 ? Math.abs(resultatNetJournal) : 0,
        credit: resultatNetJournal > 0 ? resultatNetJournal            : 0,
        reference: anRef, createdBy: userId,
      })
    }
  } else {
    const { actif, passif } = { actif: bilan.actif, passif: bilan.passif }
    if (actif.creancesClients > 0.01)
      anRows.push({ companyId, fiscalYearId: nextFy.id, date: openingDate, journal: 'AN',
        compte: normalizeAccountCode('411'), libelle: `À-nouveau ${fy.year} — Créances clients`,
        debit: actif.creancesClients, credit: 0, reference: anRef, createdBy: userId })
    if (actif.tresorerie > 0.01)
      anRows.push({ companyId, fiscalYearId: nextFy.id, date: openingDate, journal: 'AN',
        compte: normalizeAccountCode(zone === 'OHADA' ? '521' : '512'), libelle: `À-nouveau ${fy.year} — Trésorerie`,
        debit: actif.tresorerie, credit: 0, reference: anRef, createdBy: userId })
    if (passif.dettesExploitation > 0.01)
      anRows.push({ companyId, fiscalYearId: nextFy.id, date: openingDate, journal: 'AN',
        compte: normalizeAccountCode('401'), libelle: `À-nouveau ${fy.year} — Dettes fournisseurs`,
        debit: 0, credit: passif.dettesExploitation, reference: anRef, createdBy: userId })
    const net = compteResultat.resultatBrut
    if (Math.abs(net) > 0.01)
      anRows.push({ companyId, fiscalYearId: nextFy.id, date: openingDate, journal: 'AN',
        compte: normalizeAccountCode('119'),
        libelle: `À-nouveau ${fy.year} — Résultat ${net >= 0 ? '(bénéfice)' : '(perte)'}`,
        debit:  net < 0 ? Math.abs(net) : 0,
        credit: net > 0 ? net            : 0,
        reference: anRef, createdBy: userId })
  }

  if (anRows.length > 0) {
    await prisma.journalEntry.createMany({ data: anRows })
  }

  return { generated: anRows.length, fiscalYear: fy.year, nextYear }
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
  const openInvoices  = await prisma.invoice.count({ where: { companyId, status: { in: ['SENT', 'OVERDUE'] } } })
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pieceId:     (e as any).pieceId ?? null,
      account:     e.compte,
      label:       e.libelle,
      debit:       Number(e.debit),
      credit:      Number(e.credit),
      reference:   e.reference,
      lettrage:    e.lettrage ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pieceUrl:    (e as any).pieceUrl ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pieceName:   (e as any).pieceName ?? null,
    })),
  }
}

/**
 * Attache (ou détache) une pièce justificative à toutes les lignes d'une écriture
 * (toutes les lignes du même pieceId reçoivent la même PJ — conformément à la
 * réglementation comptable, une écriture comptable forme un tout indissociable).
 */
export async function attachPieceJustificative(
  companyId: string,
  pieceId: string,
  data: { pieceUrl: string | null; pieceName: string | null },
) {
  // Garde-fou : l'écriture doit appartenir à l'entreprise et pas être sur un exercice clôturé
  const sample = await prisma.journalEntry.findFirst({
    where:   { companyId, pieceId },
    select:  { fiscalYearId: true, fiscalYear: { select: { status: true } } },
  })
  if (!sample) {
    throw new AppError(`Pièce ${pieceId} introuvable`, 404, 'PIECE_NOT_FOUND')
  }
  if (sample.fiscalYear.status === 'CLOSED') {
    throw new AppError('Exercice clôturé — pièce justificative en lecture seule', 400, 'FISCAL_YEAR_CLOSED')
  }

  const updated = await prisma.journalEntry.updateMany({
    where: { companyId, pieceId },
    data:  {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pieceUrl:  data.pieceUrl,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pieceName: data.pieceName,
    } as Parameters<typeof prisma.journalEntry.updateMany>[0]['data'],
  })

  return { pieceId, linesUpdated: updated.count, pieceUrl: data.pieceUrl, pieceName: data.pieceName }
}

// ── Lettrage ────────────────────────────────────────────────────────────────

/** Génère le prochain code de lettrage disponible (A → Z → AA → AZ → BA …). */
function nextLettrageCode(existingCodes: string[]): string {
  const used = new Set(existingCodes.map(c => c.toUpperCase()))
  for (let i = 65; i <= 90; i++) {
    const c = String.fromCharCode(i)
    if (!used.has(c)) return c
  }
  for (let i = 65; i <= 90; i++) {
    for (let j = 65; j <= 90; j++) {
      const c = String.fromCharCode(i) + String.fromCharCode(j)
      if (!used.has(c)) return c
    }
  }
  throw new AppError('Tous les codes de lettrage (676) sont épuisés pour ce compte', 400, 'LETTRAGE_EXHAUSTED')
}

/**
 * Retourne la liste des comptes de tiers (classe 4) présents dans l'exercice,
 * avec les statistiques de lettrage pour chacun.
 */
export async function getComptesTiers(companyId: string, fiscalYearId: string) {
  await getFiscalYear(companyId, fiscalYearId)

  const entries = await prisma.journalEntry.findMany({
    where:  { companyId, fiscalYearId, compte: { startsWith: '4' } },
    select: { compte: true, debit: true, credit: true, lettrage: true },
    orderBy: { compte: 'asc' },
  })

  const compteMap = new Map<string, { debit: number; credit: number; lettres: number; nonLettres: number }>()
  for (const e of entries) {
    const s = compteMap.get(e.compte) ?? { debit: 0, credit: 0, lettres: 0, nonLettres: 0 }
    s.debit  += Number(e.debit)
    s.credit += Number(e.credit)
    if (e.lettrage) s.lettres++
    else            s.nonLettres++
    compteMap.set(e.compte, s)
  }

  const [plans, company] = await Promise.all([
    prisma.accountPlan.findMany({ where: { companyId }, select: { numero: true, intitule: true } }),
    prisma.company.findUnique({ where: { id: companyId }, select: { accountingZone: true } }),
  ])
  const companyLabelMap = new Map(plans.map(p => [p.numero, p.intitule]))
  const staticLabelMap  = new Map(getPlanByZone(company?.accountingZone ?? 'FRANCE').map(p => [p.numero, p.intitule]))

  return [...compteMap.entries()].map(([compte, s]) => ({
    compte,
    label:       lookupLabel(compte, companyLabelMap, staticLabelMap),
    totalDebit:  s.debit,
    totalCredit: s.credit,
    solde:       s.debit - s.credit,
    lettres:     s.lettres,
    nonLettres:  s.nonLettres,
  }))
}

/**
 * Retourne toutes les écritures d'un compte de tiers dans un exercice,
 * avec le code de lettrage de chaque ligne et le solde progressif.
 */
export async function getLettragePourCompte(companyId: string, fiscalYearId: string, compte: string) {
  await getFiscalYear(companyId, fiscalYearId)

  const entries = await prisma.journalEntry.findMany({
    where:   { companyId, fiscalYearId, compte },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
  })

  let runningBalance = 0
  const lignes = entries.map(e => {
    const d = Number(e.debit)
    const c = Number(e.credit)
    runningBalance += d - c
    return {
      id:          e.id,
      date:        e.date,
      journalCode: e.journal,
      pieceId:     e.pieceId,
      label:       e.libelle,
      reference:   e.reference,
      debit:       d,
      credit:      c,
      solde:       runningBalance,
      lettrage:    e.lettrage,
    }
  })

  const totalDebit  = entries.reduce((s, e) => s + Number(e.debit),  0)
  const totalCredit = entries.reduce((s, e) => s + Number(e.credit), 0)

  return { fiscalYearId, compte, lignes, totalDebit, totalCredit, solde: totalDebit - totalCredit }
}

/**
 * Lettrage réglementaire (SYSCOHADA / PCG) :
 *  - Vérifie que les écritures appartiennent toutes au même compte de tiers (classe 4)
 *  - Vérifie que Σ Débit = Σ Crédit (équilibre obligatoire)
 *  - Génère automatiquement le prochain code disponible (A, B, …, AA, …)
 *  - Interdit de lettrer une écriture déjà lettrée
 */
export async function lettrer(
  companyId: string,
  fiscalYearId: string,
  entryIds: string[],
): Promise<{ code: string; lettered: number }> {
  if (entryIds.length < 2)
    throw new AppError('Sélectionnez au moins 2 écritures à lettrer', 400, 'VALIDATION_ERROR')

  const entries = await prisma.journalEntry.findMany({
    where: { id: { in: entryIds }, companyId, fiscalYearId },
  })
  if (entries.length !== entryIds.length)
    throw new AppError('Une ou plusieurs écritures introuvables', 404, 'NOT_FOUND')

  // Même compte obligatoire
  const comptes = [...new Set(entries.map(e => e.compte))]
  if (comptes.length !== 1)
    throw new AppError('Toutes les écritures doivent appartenir au même compte', 400, 'VALIDATION_ERROR')

  const compte = comptes[0]!

  // Classe 4 uniquement (comptes de tiers : clients 41x, fournisseurs 40x, …)
  if (!/^4/.test(compte))
    throw new AppError(
      `Le lettrage s'applique aux comptes de tiers (classe 4). Compte sélectionné : ${compte}`,
      400, 'VALIDATION_ERROR',
    )

  // Pas de re-lettrage
  const alreadyLettered = entries.filter(e => e.lettrage)
  if (alreadyLettered.length > 0) {
    const codes = [...new Set(alreadyLettered.map(e => e.lettrage))].join(', ')
    throw new AppError(
      `Certaines écritures sont déjà lettrées (${codes}). Délettrez-les d'abord.`,
      400, 'VALIDATION_ERROR',
    )
  }

  // Équilibre débit = crédit
  const totalD = entries.reduce((s, e) => s + Number(e.debit),  0)
  const totalC = entries.reduce((s, e) => s + Number(e.credit), 0)
  if (Math.abs(totalD - totalC) > 0.01)
    throw new AppError(
      `Déséquilibre : débit ${totalD.toFixed(2)} ≠ crédit ${totalC.toFixed(2)} (écart ${Math.abs(totalD - totalC).toFixed(2)})`,
      400, 'DESEQUILIBRE',
    )

  // Prochain code libre pour ce compte dans cet exercice
  const usedCodes = await prisma.journalEntry.findMany({
    where:    { companyId, fiscalYearId, compte, lettrage: { not: null } },
    select:   { lettrage: true },
    distinct: ['lettrage'],
  })
  const code = nextLettrageCode(usedCodes.map(e => e.lettrage!))

  await prisma.journalEntry.updateMany({
    where: { id: { in: entryIds }, companyId },
    data:  { lettrage: code },
  })

  return { code, lettered: entryIds.length }
}

/** Assign a lettrage code to a set of journal entries (kept for backward compat). */
export async function setLettrage(
  companyId: string,
  entryIds: string[],
  code: string,
) {
  if (!entryIds.length) throw new AppError('Aucune écriture sélectionnée', 400, 'VALIDATION_ERROR')
  if (!code.trim()) throw new AppError('Code de lettrage manquant', 400, 'VALIDATION_ERROR')
  const normalCode = code.trim().toUpperCase()

  const count = await prisma.journalEntry.count({ where: { id: { in: entryIds }, companyId } })
  if (count !== entryIds.length)
    throw new AppError('Une ou plusieurs écritures introuvables', 404, 'NOT_FOUND')

  await prisma.journalEntry.updateMany({
    where: { id: { in: entryIds }, companyId },
    data:  { lettrage: normalCode },
  })
  return { updated: entryIds.length, code: normalCode }
}

/** Remove a lettrage code from all entries sharing it in a given fiscal year. */
export async function deleteLettrage(
  companyId: string,
  code: string,
  fiscalYearId: string,
) {
  if (!code.trim()) throw new AppError('Code de lettrage manquant', 400, 'VALIDATION_ERROR')
  const normalCode = code.trim().toUpperCase()

  const result = await prisma.journalEntry.updateMany({
    where: { companyId, fiscalYearId, lettrage: normalCode },
    data:  { lettrage: null },
  })
  return { unlettered: result.count }
}

export async function createJournalEntry(
  companyId: string,
  fiscalYearId: string,
  data: { date: Date; journal: string; compte: string; libelle: string; debit: number; credit: number; reference?: string | null },
  userId: string,
) {
  const fy = await getFiscalYear(companyId, fiscalYearId)
  if (fy.status === 'CLOSED') {
    throw new AppError('Exercice clôturé — lecture seule', 400, 'FISCAL_YEAR_CLOSED')
  }
  if (data.journal.toUpperCase() === 'AN') {
    throw new AppError('Le journal AN (À-nouveaux) est géré automatiquement — saisie manuelle interdite', 400, 'AN_JOURNAL_PROTECTED')
  }
  // Date strictement dans l'exercice (anti-saisie sur exercice clôturé via la date)
  const fyStart = new Date(fy.startDate)
  const fyEnd   = new Date(fy.endDate)
  if (data.date < fyStart || data.date > fyEnd) {
    const targetFy = await prisma.fiscalYear.findFirst({
      where: { companyId, startDate: { lte: data.date }, endDate: { gte: data.date } },
    })
    if (targetFy && targetFy.status === 'CLOSED') {
      throw new AppError(
        `La date ${data.date.toISOString().slice(0,10)} appartient à l'exercice ${targetFy.year} qui est CLÔTURÉ — saisie interdite.`,
        400, 'FISCAL_YEAR_CLOSED',
      )
    }
    throw new AppError(
      `La date ${data.date.toISOString().slice(0,10)} doit être comprise dans l'exercice ${fy.year} (${fyStart.toISOString().slice(0,10)} → ${fyEnd.toISOString().slice(0,10)}).`,
      400, 'DATE_OUT_OF_RANGE',
    )
  }
  return prisma.journalEntry.create({
    data: {
      companyId,
      fiscalYearId,
      date: data.date,
      journal: data.journal.toUpperCase(),
      compte: normalizeAccountCode(data.compte),
      libelle: data.libelle,
      debit: data.debit,
      credit: data.credit,
      ...(data.reference ? { reference: data.reference } : {}),
      createdBy: userId,
    },
  })
}

export async function createJournalEntryBatch(
  companyId: string,
  fiscalYearId: string,
  data: {
    date: Date
    journal: string
    reference: string | null
    lines: { compte: string; libelle: string; intituleCompte?: string; debit: number; credit: number }[]
  },
  userId: string,
) {
  // Normalise tous les numéros de compte avant traitement
  data = {
    ...data,
    lines: data.lines.map(l => ({ ...l, compte: normalizeNumero(l.compte) })),
  }

  const fy = await getFiscalYear(companyId, fiscalYearId)
  if (fy.status === 'CLOSED') {
    throw new AppError('Exercice clôturé — lecture seule', 400, 'FISCAL_YEAR_CLOSED')
  }
  if (data.journal.toUpperCase() === 'AN') {
    throw new AppError('Le journal AN (À-nouveaux) est géré automatiquement — saisie manuelle interdite', 400, 'AN_JOURNAL_PROTECTED')
  }
  if (data.lines.length < 2) {
    throw new AppError('Au moins 2 lignes sont requises pour une écriture comptable', 400, 'VALIDATION_ERROR')
  }

  // ── Date strictement dans les bornes de l'exercice ─────────────────────────
  // Règle réglementaire SYSCOHADA/PCG : une écriture comptable doit être datée
  // dans l'intervalle [startDate, endDate] de l'exercice où elle est enregistrée.
  // Si on accepte des dates hors exercice, l'utilisateur pourrait passer des
  // écritures dans un exercice clôturé en sélectionnant la mauvaise date.
  const entryDate = data.date
  const fyStart   = new Date(fy.startDate)
  const fyEnd     = new Date(fy.endDate)
  if (entryDate < fyStart || entryDate > fyEnd) {
    // Cherche si la date appartient à un autre exercice
    const targetFy = await prisma.fiscalYear.findFirst({
      where: { companyId, startDate: { lte: entryDate }, endDate: { gte: entryDate } },
    })
    if (targetFy && targetFy.status === 'CLOSED') {
      throw new AppError(
        `La date ${entryDate.toISOString().slice(0,10)} appartient à l'exercice ${targetFy.year} qui est CLÔTURÉ — saisie interdite.`,
        400, 'FISCAL_YEAR_CLOSED',
      )
    }
    if (targetFy) {
      throw new AppError(
        `La date ${entryDate.toISOString().slice(0,10)} appartient à l'exercice ${targetFy.year}, pas à l'exercice ${fy.year} sélectionné. Changez d'exercice avant de saisir.`,
        400, 'DATE_WRONG_FY',
      )
    }
    throw new AppError(
      `La date ${entryDate.toISOString().slice(0,10)} doit être comprise dans l'exercice ${fy.year} (${fyStart.toISOString().slice(0,10)} → ${fyEnd.toISOString().slice(0,10)}).`,
      400, 'DATE_OUT_OF_RANGE',
    )
  }
  const totalDebit  = data.lines.reduce((s, l) => s + l.debit,  0)
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new AppError(
      `L'écriture n'est pas équilibrée (débit ${totalDebit.toFixed(2)} ≠ crédit ${totalCredit.toFixed(2)})`,
      400,
      'UNBALANCED_ENTRY',
    )
  }

  // ── Garantir que chaque compte est enregistré dans AccountPlan ─────────────
  // Si un compte n'existe pas encore dans le plan de l'entreprise mais qu'un
  // intituleCompte est fourni, on le crée automatiquement. Cela assure que
  // la balance et le grand livre affichent toujours le bon libellé, même pour
  // des comptes créés à la volée depuis le traitement des transactions.
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { accountingZone: true } })
  const linesWithLabel = data.lines.filter(l => l.intituleCompte)
  if (linesWithLabel.length > 0) {
    const existingPlans = await prisma.accountPlan.findMany({
      where: { companyId, numero: { in: linesWithLabel.map(l => l.compte) } },
      select: { numero: true },
    })
    const existingNums = new Set(existingPlans.map(p => p.numero))
    for (const line of linesWithLabel) {
      if (!existingNums.has(line.compte)) {
        const cls = parseInt(line.compte[0] ?? '4') || 4
        const type = /^41/.test(line.compte) ? 'ACTIF'
          : /^4/.test(line.compte) ? 'PASSIF'
          : /^7/.test(line.compte) ? 'PRODUIT'
          : /^[123]/.test(line.compte) ? 'ACTIF'
          : 'CHARGE'
        await prisma.accountPlan.create({
          data: {
            companyId,
            numero:   line.compte,
            intitule: line.intituleCompte!,
            classe:   cls,
            type:     type as 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT',
            zone:     company?.accountingZone ?? 'OHADA',
            isSystem: false,
          },
        }).catch(() => { /* ignore si concurrent insert */ })
      }
    }
  }

  const pieceId = `PC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  return prisma.$transaction(
    data.lines.map(line =>
      prisma.journalEntry.create({
        data: {
          companyId,
          fiscalYearId,
          date:    data.date,
          journal: data.journal.toUpperCase(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          pieceId: pieceId as any,
          compte:  line.compte,
          libelle: line.libelle,
          debit:   line.debit,
          credit:  line.credit,
          ...(data.reference ? { reference: data.reference } : {}),
          createdBy: userId,
        } as Parameters<typeof prisma.journalEntry.create>[0]['data'],
      }),
    ),
  )
}

export async function updateJournalPiece(
  companyId: string,
  pieceId: string,
  data: {
    date: Date
    journal: string
    reference: string | null
    lines: { compte: string; libelle: string; debit: number; credit: number }[]
  },
  userId: string,
) {
  // Verify piece belongs to this company
  const existing = await prisma.journalEntry.findFirst({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { companyId, pieceId: pieceId as any },
    select: { fiscalYearId: true },
  })
  if (!existing) throw new AppError('Écriture introuvable', 404, 'NOT_FOUND')

  const fy = await getFiscalYear(companyId, existing.fiscalYearId)
  if (fy.status === 'CLOSED') {
    throw new AppError('Exercice clôturé — lecture seule', 400, 'FISCAL_YEAR_CLOSED')
  }
  // Vérifier si la pièce appartient au journal AN (protégé)
  const firstEntry = await prisma.journalEntry.findFirst({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { companyId, pieceId: pieceId as any },
    select: { journal: true },
  })
  if (firstEntry?.journal?.toUpperCase() === 'AN') {
    throw new AppError('Le journal AN (À-nouveaux) est protégé — modification interdite', 400, 'AN_JOURNAL_PROTECTED')
  }
  if (data.lines.length < 2) {
    throw new AppError('Au moins 2 lignes sont requises', 400, 'VALIDATION_ERROR')
  }
  // Date strictement dans l'exercice
  const fyStart = new Date(fy.startDate)
  const fyEnd   = new Date(fy.endDate)
  if (data.date < fyStart || data.date > fyEnd) {
    const targetFy = await prisma.fiscalYear.findFirst({
      where: { companyId, startDate: { lte: data.date }, endDate: { gte: data.date } },
    })
    if (targetFy && targetFy.status === 'CLOSED') {
      throw new AppError(
        `La date ${data.date.toISOString().slice(0,10)} appartient à l'exercice ${targetFy.year} qui est CLÔTURÉ — modification interdite.`,
        400, 'FISCAL_YEAR_CLOSED',
      )
    }
    throw new AppError(
      `La date ${data.date.toISOString().slice(0,10)} doit être comprise dans l'exercice ${fy.year} (${fyStart.toISOString().slice(0,10)} → ${fyEnd.toISOString().slice(0,10)}).`,
      400, 'DATE_OUT_OF_RANGE',
    )
  }
  // Normalise tous les numéros de compte avant validation
  data = { ...data, lines: data.lines.map(l => ({ ...l, compte: normalizeAccountCode(l.compte) })) }
  const totalDebit  = data.lines.reduce((s, l) => s + l.debit,  0)
  const totalCredit = data.lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new AppError(
      `Écriture déséquilibrée (débit ${totalDebit.toFixed(2)} ≠ crédit ${totalCredit.toFixed(2)})`,
      400,
      'UNBALANCED_ENTRY',
    )
  }

  return prisma.$transaction(async (tx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await tx.journalEntry.deleteMany({ where: { companyId, pieceId: pieceId as any } })
    return Promise.all(
      data.lines.map(line =>
        tx.journalEntry.create({
          data: {
            companyId,
            fiscalYearId: existing.fiscalYearId,
            date:    data.date,
            journal: data.journal.toUpperCase(),
            pieceId: pieceId as any, // eslint-disable-line @typescript-eslint/no-explicit-any
            compte:  line.compte,
            libelle: line.libelle,
            debit:   line.debit,
            credit:  line.credit,
            ...(data.reference ? { reference: data.reference } : {}),
            createdBy: userId,
          } as Parameters<typeof prisma.journalEntry.create>[0]['data'],
        }),
      ),
    )
  })
}

export async function deleteJournalPiece(companyId: string, pieceId: string) {
  const existing = await prisma.journalEntry.findFirst({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { companyId, pieceId: pieceId as any },
    select: { fiscalYearId: true },
  })
  if (!existing) throw new AppError('Écriture introuvable', 404, 'NOT_FOUND')

  const fy = await getFiscalYear(companyId, existing.fiscalYearId)
  if (fy.status === 'CLOSED') {
    throw new AppError('Exercice clôturé — lecture seule', 400, 'FISCAL_YEAR_CLOSED')
  }
  const firstEntryDel = await prisma.journalEntry.findFirst({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: { companyId, pieceId: pieceId as any },
    select: { journal: true },
  })
  if (firstEntryDel?.journal?.toUpperCase() === 'AN') {
    throw new AppError('Le journal AN (À-nouveaux) est protégé — suppression interdite', 400, 'AN_JOURNAL_PROTECTED')
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return prisma.journalEntry.deleteMany({ where: { companyId, pieceId: pieceId as any } })
}

export async function deleteJournalEntry(companyId: string, entryId: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id: entryId, companyId },
    select: { fiscalYearId: true },
  })
  if (!entry) throw new AppError('Ligne introuvable', 404, 'NOT_FOUND')

  const fy = await getFiscalYear(companyId, entry.fiscalYearId)
  if (fy.status === 'CLOSED') {
    throw new AppError('Exercice clôturé — lecture seule', 400, 'FISCAL_YEAR_CLOSED')
  }
  const fullEntry = await prisma.journalEntry.findUnique({ where: { id: entryId }, select: { journal: true } })
  if (fullEntry?.journal?.toUpperCase() === 'AN') {
    throw new AppError('Le journal AN (À-nouveaux) est protégé — suppression interdite', 400, 'AN_JOURNAL_PROTECTED')
  }
  return prisma.journalEntry.delete({ where: { id: entryId } })
}

export async function getBalanceByFiscalYear(companyId: string, fiscalYearId: string) {
  const [fy, company] = await Promise.all([
    getFiscalYear(companyId, fiscalYearId),
    prisma.company.findUnique({ where: { id: companyId }, select: { accountingZone: true } }),
  ])
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

  // Enrich with account labels — company plan first, then static plan fallback.
  // On charge TOUS les comptes de l'entreprise (pas seulement ceux des écritures)
  // pour que le fallback par préfixe fonctionne sur les comptes personnalisés.
  const plans = await prisma.accountPlan.findMany({
    where:  { companyId },
    select: { numero: true, intitule: true },
  })
  const companyLabelMap = new Map(plans.map(p => [p.numero, p.intitule]))
  const staticPlan      = getPlanByZone(company?.accountingZone ?? 'FRANCE')
  const staticLabelMap  = new Map(staticPlan.map(p => [p.numero, p.intitule]))

  const rows = [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([account, { debit, credit }]) => ({
      account,
      label:      lookupLabel(account, companyLabelMap, staticLabelMap),
      totalDebit: debit,
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
  const [fy, company] = await Promise.all([
    getFiscalYear(companyId, fiscalYearId),
    prisma.company.findUnique({ where: { id: companyId }, select: { accountingZone: true } }),
  ])
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

  // Enrich with labels — company plan first, then static plan fallback.
  // On charge TOUS les comptes de l'entreprise pour que le fallback par préfixe
  // fonctionne sur les comptes personnalisés (ex : 4010002 hérite de 401000).
  const plans = await prisma.accountPlan.findMany({
    where:  { companyId },
    select: { numero: true, intitule: true },
  })
  const companyLabelMap = new Map(plans.map(p => [p.numero, p.intitule]))
  const staticPlan      = getPlanByZone(company?.accountingZone ?? 'FRANCE')
  const staticLabelMap  = new Map(staticPlan.map(p => [p.numero, p.intitule]))

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
          pieceId:     e.pieceId,
          label:       e.libelle,
          debit:       d,
          credit:      c,
          solde:       runningBalance,
          reference:   e.reference,
          lettrage:    e.lettrage,
        }
      })
      return { account, label: lookupLabel(account, companyLabelMap, staticLabelMap), lignes }
    })

  return { fiscalYearId, year: fy.year, status: fy.status, comptes }
}

// ── Réimputation d'écritures ───────────────────────────────────────────────────

/**
 * Réimpute des écritures du journal vers un autre compte.
 * - Vérifie que toutes les écritures appartiennent à la société (anti-IDOR)
 * - Bloque si l'une des écritures est dans un exercice clôturé (CLOSED)
 * - Efface le lettrage existant (invalide après changement de compte)
 * - Met à jour le champ `compte` sur toutes les écritures sélectionnées
 */
export async function reimpute(
  companyId: string,
  entryIds: string[],
  newAccount: string,
): Promise<{ updated: number; newAccount: string }> {
  if (!newAccount?.trim()) throw new AppError('Le compte cible est requis', 400, 'VALIDATION_ERROR')
  const normalized = normalizeAccountCode(newAccount)

  // Charger les écritures avec leur exercice
  const entries = await prisma.journalEntry.findMany({
    where:   { id: { in: entryIds }, companyId },
    select:  { id: true, fiscalYear: { select: { status: true } } },
  })

  if (entries.length !== entryIds.length) {
    throw new AppError('Une ou plusieurs écritures introuvables ou inaccessibles', 404, 'NOT_FOUND')
  }

  const closedCount = entries.filter(e => e.fiscalYear?.status === 'CLOSED').length
  if (closedCount > 0) {
    throw new AppError(
      `${closedCount} écriture(s) appartiennent à un exercice clôturé. Réouvrez l'exercice avant de réimputer.`,
      403,
      'FISCAL_YEAR_CLOSED',
    )
  }

  // Mise à jour : nouveau compte + effacement du lettrage (invalide après réimputation)
  await prisma.journalEntry.updateMany({
    where: { id: { in: entryIds }, companyId },
    data:  { compte: normalized, lettrage: null },
  })

  return { updated: entries.length, newAccount: normalized }
}
