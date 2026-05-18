/**
 * Service de Paie — Athenis
 *
 * Cycle de vie d'un lot de paie :
 *  1. DRAFT      — calculé pour tous les employés actifs du mois
 *                  (CNPS, IRPP, CAC, congés non payés pris en compte)
 *  2. POSTED     — écritures comptables générées dans journal PAY
 *                  D 641 (charges salariales)  C 422xxx (employé) + C 431 (CNPS) + C 447 (IRPP/CAC)
 *  3. PAID       — paiements effectués (selon mode), trésorerie mouvementée
 *                  D 422xxx (employé)  C 521 (banque)
 *  4. SENT       — bulletins envoyés par email
 *
 * Réglementation SYSCOHADA / Cameroun :
 *   641   — Rémunérations directes versées
 *   422xx — Personnel — rémunérations dues (compte de tiers par employé)
 *   431   — Cotisations CNPS (part patronale + salariale)
 *   447   — État, impôts retenus (IRPP + CAC)
 *   521   — Banques (trésorerie)
 */
import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { normalizeAccountCode } from '../../lib/accountCodes.js'
import { computePayslip } from '../employees/payslip.js'
import { getPayrollConfig } from '../settings/settings.service.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthRange(year: number, month: number): { start: Date; end: Date; days: number } {
  const start = new Date(year, month - 1, 1)
  const end   = new Date(year, month,     0, 23, 59, 59, 999)
  const days  = end.getDate()
  return { start, end, days }
}

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Calcule les jours d'absences non payées (congés sans solde APPROUVÉS) du mois */
async function computeUnpaidDays(employeeId: string, year: number, month: number): Promise<number> {
  const { start, end } = monthRange(year, month)
  const leaves = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: 'APPROVED',
      type:   'UNPAID',
      startDate: { lte: end },
      endDate:   { gte: start },
    },
  })
  let days = 0
  for (const l of leaves) {
    const overlapStart = l.startDate < start ? start : l.startDate
    const overlapEnd   = l.endDate   > end   ? end   : l.endDate
    const d = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 86400000) + 1
    days += Math.max(0, d)
  }
  return days
}

async function findFiscalYear(companyId: string, date: Date): Promise<{ id: string; status: string } | null> {
  return prisma.fiscalYear.findFirst({
    where: { companyId, startDate: { lte: date }, endDate: { gte: date } },
    select: { id: true, status: true },
  })
}

/** Auto-création du compte au plan comptable si absent. */
async function ensureAccountInPlan(companyId: string, numero: string, intitule: string): Promise<string> {
  const normalized = normalizeAccountCode(numero)
  const existing = await prisma.accountPlan.findUnique({
    where: { companyId_numero: { companyId, numero: normalized } },
  })
  if (existing) return normalized
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId }, select: { accountingZone: true },
  })
  const classe = parseInt(normalized[0] ?? '4', 10)
  let type: 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT' = 'PASSIF'
  if (classe === 6) type = 'CHARGE'
  if (classe === 7) type = 'PRODUIT'
  if (classe === 5 || classe === 3) type = 'ACTIF'
  await prisma.accountPlan.create({
    data: { companyId, numero: normalized, intitule, classe, type, zone: company.accountingZone, isSystem: false, isActive: true },
  })
  return normalized
}

// ── 1) Calcul du lot de paie ───────────────────────────────────────────────────

export async function calculatePayroll(companyId: string, year: number, month: number, userId: string) {
  if (month < 1 || month > 12) throw new AppError('Mois invalide (1-12)', 400, 'VALIDATION_ERROR')

  // Refuse de recalculer si POSTED/PAID/SENT
  const existing = await prisma.payroll.findUnique({
    where: { companyId_year_month: { companyId, year, month } },
  })
  if (existing && existing.status !== 'DRAFT' && existing.status !== 'CANCELLED') {
    throw new AppError(
      `Paie ${monthKey(year, month)} déjà au statut ${existing.status} — non recalculable.`,
      400, 'PAYROLL_LOCKED',
    )
  }

  const { start, end, days } = monthRange(year, month)

  // Employés actifs sur la période
  const employees = await prisma.employee.findMany({
    where: {
      companyId,
      dateEmbauche:   { lte: end },
      OR: [{ dateFinContrat: null }, { dateFinContrat: { gte: start } }],
    },
  })
  if (employees.length === 0)
    throw new AppError('Aucun employé actif pour cette période', 400, 'NO_EMPLOYEES')

  const fy = await findFiscalYear(companyId, end)

  // Calcule pour chaque employé
  const payslipsData: Prisma.PayslipCreateManyPayrollInput[] = []
  let totalGross = 0, totalNet = 0, totalCnpsSal = 0, totalCnpsEmp = 0, totalIrpp = 0, totalCac = 0

  for (const e of employees) {
    const grossBase     = Number(e.salaireBrut)
    const daysUnpaid    = await computeUnpaidDays(e.id, year, month)
    // Pro-rata : salaire * (jours_travaillés / jours_du_mois)
    const daysWorked    = Math.max(0, days - daysUnpaid)
    const grossProrated = Math.round((grossBase * daysWorked / days) * 100) / 100

    const sl = computePayslip(
      grossProrated,
      { firstName: e.prenom ?? '', lastName: e.nom, email: e.email ?? '', employmentType: e.contrat },
      monthKey(year, month),
    )

    // Totaux des cotisations sociales (CNPS + CFC + FNE etc.)
    // On stocke le total salarial et patronal complets — ces colonnes représentent
    // la TOTALITÉ des cotisations sociales par employé (pas seulement la CNPS).
    payslipsData.push({
      employeeId:        e.id,
      employeeName:      `${e.prenom ?? ''} ${e.nom}`.trim(),
      employeeEmail:     e.email,
      employmentType:    e.contrat,
      daysWorked,
      daysAbsentUnpaid:  daysUnpaid,
      grossSalary:       grossProrated,
      cnpsSal:           sl.totalSalariale,  // cotisations salariales totales
      cnpsEmp:           sl.totalPatronale,  // cotisations patronales totales
      irpp:              sl.irpp,
      cac:               sl.cac,
      netToPay:          sl.netToPay,
      totalCost:         sl.totalCost,
      paymentMethod:     e.paymentMethod,
      paymentStatus:     'PENDING',
    })

    totalGross   += grossProrated
    totalNet     += sl.netToPay
    totalCnpsSal += sl.totalSalariale
    totalCnpsEmp += sl.totalPatronale
    totalIrpp    += sl.irpp
    totalCac     += sl.cac
  }

  // Création / remplacement
  // Note : la contrainte @@unique([companyId, year, month]) impose de SUPPRIMER
  // l'ancien lot (cascade vers payslips) avant de recréer, pas de juste l'annuler.
  const result = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.payroll.delete({ where: { id: existing.id } })  // cascade Payslip
    }
    return tx.payroll.create({
      data: {
        companyId,
        year, month,
        ...(fy ? { fiscalYearId: fy.id } : {}),
        status: 'DRAFT',
        employeesCount: employees.length,
        totalGross, totalNet, totalCnpsSal, totalCnpsEmp, totalIrpp, totalCac,
        createdBy: userId,
        payslips: { createMany: { data: payslipsData } },
      },
      include: { payslips: true },
    })
  })

  return result
}

// ── 2) Comptabilisation ───────────────────────────────────────────────────────

export async function postPayroll(companyId: string, payrollId: string, userId: string) {
  const payroll = await prisma.payroll.findFirst({
    where:   { id: payrollId, companyId },
    include: { payslips: true },
  })
  if (!payroll) throw new AppError('Paie introuvable', 404, 'NOT_FOUND')
  if (payroll.status !== 'DRAFT')
    throw new AppError(`Paie au statut ${payroll.status} — comptabilisation impossible`, 400, 'INVALID_STATUS')

  const { end } = monthRange(payroll.year, payroll.month)
  const fy = await findFiscalYear(companyId, end)
  if (!fy)      throw new AppError(`Aucun exercice ne couvre ${monthKey(payroll.year, payroll.month)}`, 400, 'NO_FISCAL_YEAR')
  if (fy.status === 'CLOSED')
    throw new AppError(`Exercice clôturé — comptabilisation impossible`, 400, 'FISCAL_YEAR_CLOSED')

  // ── Paramètres configurables (cf. Paramètres › Comptabilité › Paie) ──────
  const cfg = await getPayrollConfig(companyId)
  const journalCode = cfg.journalCode || 'PAY'
  const ACCT_CHARGE = await ensureAccountInPlan(companyId, cfg.chargeAccount, 'Rémunérations directes versées')
  const ACCT_CNPS   = await ensureAccountInPlan(companyId, cfg.socialAccount, 'Cotisations CNPS / CFC / FNE')
  const ACCT_ETAT   = await ensureAccountInPlan(companyId, cfg.taxAccount,    'État — Impôts retenus (IRPP/CAC)')
  // Comptes séparés (si splitContributions = true)
  const ACCT_CNPS_SAL = cfg.splitContributions
    ? await ensureAccountInPlan(companyId, cfg.socialAccountPersonal, 'Cotisations sociales — part salariale')
    : null
  const ACCT_CNPS_EMP = cfg.splitContributions
    ? await ensureAccountInPlan(companyId, cfg.socialAccountEmployer, 'Cotisations sociales — part patronale')
    : null
  const ACCT_IRPP = cfg.splitContributions
    ? await ensureAccountInPlan(companyId, cfg.taxAccountIrpp, 'IRPP — Impôt sur le revenu')
    : null
  const ACCT_CAC = cfg.splitContributions
    ? await ensureAccountInPlan(companyId, cfg.taxAccountCac, 'CAC — Centimes additionnels')
    : null

  const pieceId  = `PAY-${monthKey(payroll.year, payroll.month)}-${Date.now().toString(36)}`
  const ref      = `PAIE-${monthKey(payroll.year, payroll.month)}`
  const date     = end  // dernière jour du mois

  const lines: Prisma.JournalEntryCreateManyInput[] = []

  // D 641 (charges) — total brut + part patronale CNPS
  const totalCharge = Number(payroll.totalGross) + Number(payroll.totalCnpsEmp)
  lines.push({
    companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
    compte: ACCT_CHARGE, libelle: `Salaires bruts + charges patronales ${ref}`,
    debit: totalCharge, credit: 0, reference: ref, createdBy: userId,
  })

  // C 422xxxxx (employé) — net à payer
  for (const ps of payroll.payslips) {
    // Auto-gen compte tiers si absent
    const emp = await prisma.employee.findUnique({ where: { id: ps.employeeId } })
    let acct = emp?.accountingCode
    if (!acct?.trim()) {
      const slug = ps.employeeName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'EMP'
      acct = `422${slug}`
      if (emp) await prisma.employee.update({ where: { id: emp.id }, data: { accountingCode: acct } })
    }
    const tierAccount = await ensureAccountInPlan(companyId, acct, `Personnel — ${ps.employeeName}`)
    lines.push({
      companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
      compte: tierAccount, libelle: `Net à payer ${ps.employeeName} ${ref}`,
      debit: 0, credit: Number(ps.netToPay), reference: ref, createdBy: userId,
    })
  }

  // C cotisations sociales (séparé ou groupé selon config)
  if (cfg.splitContributions && ACCT_CNPS_SAL && ACCT_CNPS_EMP) {
    if (Number(payroll.totalCnpsSal) > 0.01) {
      lines.push({
        companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
        compte: ACCT_CNPS_SAL, libelle: `Cotisations sociales — part salariale ${ref}`,
        debit: 0, credit: Number(payroll.totalCnpsSal), reference: ref, createdBy: userId,
      })
    }
    if (Number(payroll.totalCnpsEmp) > 0.01) {
      lines.push({
        companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
        compte: ACCT_CNPS_EMP, libelle: `Cotisations sociales — part patronale ${ref}`,
        debit: 0, credit: Number(payroll.totalCnpsEmp), reference: ref, createdBy: userId,
      })
    }
  } else {
    const cnpsTotal = Number(payroll.totalCnpsSal) + Number(payroll.totalCnpsEmp)
    if (cnpsTotal > 0.01) {
      lines.push({
        companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
        compte: ACCT_CNPS, libelle: `Cotisations CNPS / CFC / FNE (sal+pat) ${ref}`,
        debit: 0, credit: cnpsTotal, reference: ref, createdBy: userId,
      })
    }
  }

  // C impôts IRPP/CAC (séparé ou groupé)
  if (cfg.splitContributions && ACCT_IRPP && ACCT_CAC) {
    if (Number(payroll.totalIrpp) > 0.01) {
      lines.push({
        companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
        compte: ACCT_IRPP, libelle: `IRPP retenu ${ref}`,
        debit: 0, credit: Number(payroll.totalIrpp), reference: ref, createdBy: userId,
      })
    }
    if (Number(payroll.totalCac) > 0.01) {
      lines.push({
        companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
        compte: ACCT_CAC, libelle: `CAC retenu ${ref}`,
        debit: 0, credit: Number(payroll.totalCac), reference: ref, createdBy: userId,
      })
    }
  } else {
    const etatTotal = Number(payroll.totalIrpp) + Number(payroll.totalCac)
    if (etatTotal > 0.01) {
      lines.push({
        companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
        compte: ACCT_ETAT, libelle: `IRPP + CAC retenus ${ref}`,
        debit: 0, credit: etatTotal, reference: ref, createdBy: userId,
      })
    }
  }

  // B5 : tolérance 0,01 comme sur ventes/achats. Si delta entre 0,01 et 1,00
  //      (dû aux arrondis IRPP/CNPS sur N salariés), on ajoute une ligne de
  //      régularisation sur le compte 658 (charges exceptionnelles) ou 758
  //      (produits exceptionnels) pour absorber le centime résiduel.
  const sumD0 = lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0)
  const sumC0 = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0)
  const delta = +(sumD0 - sumC0).toFixed(2)
  if (Math.abs(delta) > 1.0) {
    throw new AppError(
      `Déséquilibre paie ${ref} : D=${sumD0.toFixed(2)} ≠ C=${sumC0.toFixed(2)} (delta ${delta})`,
      500, 'POSTING_IMBALANCE',
    )
  }
  if (Math.abs(delta) > 0.01) {
    // delta > 0 : D > C → on crédite 758 ; delta < 0 : C > D → on débite 658
    const regulAcct = delta > 0 ? '758' : '658'
    lines.push({
      companyId, fiscalYearId: fy.id, date, journal: journalCode, pieceId,
      compte: regulAcct,
      libelle: `Régularisation arrondi paie ${ref}`,
      debit:  delta < 0 ? Math.abs(delta) : 0,
      credit: delta > 0 ? delta : 0,
      reference: ref, createdBy: userId,
    })
  }
  const sumD = lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0)
  const sumC = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0)
  if (Math.abs(sumD - sumC) > 0.01) {
    throw new AppError(
      `Déséquilibre paie ${ref} après régul : D=${sumD.toFixed(2)} ≠ C=${sumC.toFixed(2)}`,
      500, 'POSTING_IMBALANCE',
    )
  }

  await prisma.$transaction(async (tx) => {
    await tx.journalEntry.createMany({ data: lines })
    await tx.payroll.update({
      where: { id: payroll.id },
      data: { status: 'POSTED', postedPieceId: pieceId, postedAt: new Date() },
    })
  })

  return { pieceId, reference: ref, lines: lines.length, totalGross: payroll.totalGross, totalNet: payroll.totalNet }
}

// ── 3) Exécution des paiements + mouvement trésorerie ─────────────────────────

export async function executePayments(
  companyId: string,
  payrollId: string,
  treasuryAccount: string,
  userId: string,
) {
  const payroll = await prisma.payroll.findFirst({
    where: { id: payrollId, companyId },
    include: { payslips: true },
  })
  if (!payroll) throw new AppError('Paie introuvable', 404, 'NOT_FOUND')
  if (payroll.status !== 'POSTED')
    throw new AppError(`Paie au statut ${payroll.status} — paiements impossibles`, 400, 'INVALID_STATUS')

  const tresoCompte = await ensureAccountInPlan(companyId, treasuryAccount, 'Trésorerie — Paie')

  const { end } = monthRange(payroll.year, payroll.month)
  const fy = await findFiscalYear(companyId, end)
  if (!fy) throw new AppError('Exercice introuvable', 400, 'NO_FISCAL_YEAR')

  const ref = `PAIE-${monthKey(payroll.year, payroll.month)}-PAY`
  const pieceId = `PAYMNT-${monthKey(payroll.year, payroll.month)}-${Date.now().toString(36)}`

  // Écritures de paiement : D 422xxx (par employé) / C trésorerie (total)
  const lines: Prisma.JournalEntryCreateManyInput[] = []
  const summary = { MOBILE_MONEY: 0, BANK_TRANSFER: 0, CASH: 0, CHECK: 0, UNDEFINED: 0 }

  for (const ps of payroll.payslips) {
    const emp = await prisma.employee.findUnique({ where: { id: ps.employeeId } })
    const tierAccount = await ensureAccountInPlan(
      companyId,
      emp?.accountingCode ?? '422DIVERS',
      `Personnel — ${ps.employeeName}`,
    )
    lines.push({
      companyId, fiscalYearId: fy.id, date: new Date(), journal: 'PAY', pieceId,
      compte: tierAccount,
      libelle: `Paiement ${ps.employeeName} (${emp?.paymentMethod ?? 'CASH'})`,
      debit: Number(ps.netToPay), credit: 0, reference: ref, createdBy: userId,
    })
    const key = (ps.paymentMethod ?? 'UNDEFINED') as keyof typeof summary
    summary[key] += Number(ps.netToPay)
  }

  // C trésorerie (total net)
  lines.push({
    companyId, fiscalYearId: fy.id, date: new Date(), journal: 'PAY', pieceId,
    compte: tresoCompte, libelle: `Paiement paie ${monthKey(payroll.year, payroll.month)} — décaissement total`,
    debit: 0, credit: Number(payroll.totalNet), reference: ref, createdBy: userId,
  })

  await prisma.$transaction(async (tx) => {
    await tx.journalEntry.createMany({ data: lines })
    await tx.payslip.updateMany({
      where: { payrollId: payroll.id },
      data:  { paymentStatus: 'PAID', paidAt: new Date() },
    })
    await tx.payroll.update({
      where: { id: payroll.id },
      data:  { status: 'PAID', paidAt: new Date(), treasuryAccount: tresoCompte },
    })
  })

  return { pieceId, paid: payroll.payslips.length, summary, totalPaid: payroll.totalNet }
}

// ── 4) Envoi des bulletins par email ──────────────────────────────────────────

export async function sendAllPayslips(companyId: string, payrollId: string) {
  const payroll = await prisma.payroll.findFirst({
    where: { id: payrollId, companyId },
    include: { payslips: true },
  })
  if (!payroll) throw new AppError('Paie introuvable', 404, 'NOT_FOUND')

  let sent = 0, skipped = 0
  for (const ps of payroll.payslips) {
    if (!ps.employeeEmail?.trim()) { skipped++; continue }
    // TODO : intégration réelle SMTP/SendGrid via lib/email.ts
    // Pour MVP : on marque juste comme envoyé
    await prisma.payslip.update({
      where: { id: ps.id },
      data:  { emailSentAt: new Date() },
    })
    sent++
  }

  await prisma.payroll.update({
    where: { id: payroll.id },
    data:  { status: payroll.status === 'PAID' ? 'SENT' : payroll.status, sentAt: new Date() },
  })

  return { sent, skipped, total: payroll.payslips.length }
}

// ── 5) Lecture / liste ────────────────────────────────────────────────────────

export async function listPayrolls(companyId: string) {
  return prisma.payroll.findMany({
    where:   { companyId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    include: { _count: { select: { payslips: true } } },
  })
}

export async function getPayroll(companyId: string, id: string) {
  const p = await prisma.payroll.findFirst({
    where:   { id, companyId },
    include: { payslips: { orderBy: { employeeName: 'asc' } } },
  })
  if (!p) throw new AppError('Paie introuvable', 404, 'NOT_FOUND')
  return p
}
