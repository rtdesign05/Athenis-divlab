import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import { env } from '../../config/env.js'
import { sendCabinetInvitationEmail } from '../../lib/email.js'

function toNum(d: Prisma.Decimal | null | undefined): number {
  return d ? Number(d) : 0
}

export async function getPortfolio(cabinetId: string) {
  const mandats = await prisma.mandat.findMany({
    where: { cabinetId, actif: true },
    include: {
      company: {
        select: {
          id: true,
          nom: true,
          siren: true,
          secteur: true,
          taille: true,
          plan: true,
          modules: true,
        },
      },
    },
    orderBy: { company: { nom: 'asc' } },
  })

  const portfolioWithKpis = await Promise.all(
    mandats.map(async ({ company, type, modules, createdAt }) => {
      const [invoiceAgg, expenseAgg, employeeCount] = await Promise.all([
        prisma.invoice.aggregate({
          where: { companyId: company.id },
          _sum: { amountTTC: true },
          _count: true,
        }),
        prisma.expense.aggregate({
          where: { companyId: company.id },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.employee.count({ where: { companyId: company.id, dateFinContrat: null } }),
      ])

      const overdueCount = await prisma.invoice.count({
        where: { companyId: company.id, status: 'OVERDUE' },
      })

      return {
        company,
        mandat: { type, modules, since: createdAt },
        kpis: {
          totalFacture:    toNum(invoiceAgg._sum?.amountTTC),
          invoiceCount:    invoiceAgg._count,
          overdueInvoices: overdueCount,
          totalDepenses:   toNum(expenseAgg._sum?.amount),
          activeEmployees: employeeCount,
        },
      }
    }),
  )

  return portfolioWithKpis
}

export async function getCabinetDashboard(cabinetId: string) {
  const [portfolio, totalMandats, activeMandats] = await Promise.all([
    getPortfolio(cabinetId),
    prisma.mandat.count({ where: { cabinetId } }),
    prisma.mandat.count({ where: { cabinetId, actif: true } }),
  ])

  const totalFacture = portfolio.reduce((sum, p) => sum + p.kpis.totalFacture, 0)
  const companiesWithOverdue = portfolio.filter((p) => p.kpis.overdueInvoices > 0).length

  return {
    summary: {
      totalMandats,
      activeMandats,
      inactiveMandats: totalMandats - activeMandats,
      totalFacturePortefeuille: totalFacture,
      companiesWithOverdueInvoices: companiesWithOverdue,
    },
    portfolio,
  }
}

type MandatWithCompany = Prisma.MandatGetPayload<{
  include: { company: { select: { id: true, nom: true, siren: true, plan: true } } }
}>

/** Sérialise un Mandat Prisma vers le format API (actif → isActive). */
function serializeMandat(m: MandatWithCompany) {
  return {
    id:         m.id,
    cabinetId:  m.cabinetId,
    companyId:  m.companyId,
    type:      m.type,
    modules:   m.modules,
    isActive:  m.actif,
    dateDebut: m.dateDebut ? m.dateDebut.toISOString() : null,
    dateFin:   m.dateFin   ? m.dateFin.toISOString()   : null,
    notes:     m.notes,
    createdAt: m.createdAt.toISOString(),
    company:   m.company,
  }
}

export async function getMandats(cabinetId: string) {
  const items = await prisma.mandat.findMany({
    where: { cabinetId },
    include: {
      company: { select: { id: true, nom: true, siren: true, plan: true } },
    },
    orderBy: [{ actif: 'desc' }, { company: { nom: 'asc' } }],
  })
  return items.map(serializeMandat)
}

export async function getMandat(cabinetId: string, companyId: string) {
  const mandat = await prisma.mandat.findUnique({
    where:  { cabinetId_companyId: { cabinetId, companyId } },
    include: { company: { select: { id: true, nom: true, siren: true, plan: true } } },
  })
  if (!mandat) throw new AppError('Mandat introuvable', 404, 'NOT_FOUND')
  return serializeMandat(mandat)
}

export async function toggleMandat(cabinetId: string, companyId: string) {
  const existing = await prisma.mandat.findUnique({
    where:  { cabinetId_companyId: { cabinetId, companyId } },
    select: { actif: true },
  })
  if (!existing) throw new AppError('Mandat introuvable', 404, 'NOT_FOUND')
  const updated = await prisma.mandat.update({
    where: { cabinetId_companyId: { cabinetId, companyId } },
    data:  { actif: !existing.actif },
    include: { company: { select: { id: true, nom: true, siren: true, plan: true } } },
  })
  return serializeMandat(updated)
}

// ── Company view (context switch) ────────────────────────────────────────────

export async function switchToCompany(
  cabinetId: string,
  companyId: string,
  userId: string,
  userEmail: string,
  userRole: string,
) {
  // Must have an active mandat for this company
  const mandat = await prisma.mandat.findUnique({
    where:   { cabinetId_companyId: { cabinetId, companyId } },
    include: {
      company: {
        select: {
          id:            true,
          nom:           true,
          plan:          true,
          modules:       true,
          currencySymbol: true,
          pays:          true,
        },
      },
    },
  })

  if (!mandat)        throw new AppError('Mandat introuvable pour cette entreprise', 404, 'NOT_FOUND')
  if (!mandat.actif)  throw new AppError('Le mandat est inactif — réactivez-le pour accéder à la comptabilité', 403, 'MANDAT_INACTIVE')

  const company = mandat.company

  // Resolve accessible modules: use mandat scope, fallback to all company modules
  const modules = mandat.modules.length > 0 ? mandat.modules : company.modules

  // Issue a short-lived company-scoped JWT.
  // cabinetId is preserved so the frontend detects "cabinet view mode".
  const payload = {
    sub:           userId,
    email:         userEmail,
    accountType:   'COMPANY' as const,
    role:          userRole as any,       // preserve the cabinet user's own role
    companyId:     company.id,
    cabinetId,                            // kept → signals cabinet view mode
    plan:          company.plan as any,
    modules:       modules as any,
    country:       company.pays,
    currencySymbol: company.currencySymbol,
    agenceId:      null,
    agenceNom:     null,
    agenceIds:     [] as string[],
    isRestricted:  false,
  }

  const viewToken = jwt.sign(payload, env.jwtSecret, { expiresIn: '8h' })

  return {
    viewToken,
    company: { id: company.id, nom: company.nom },
  }
}

// ── Search ────────────────────────────────────────────────────────────────────

export async function searchCompanies(cabinetId: string, q: string) {
  const term = q.trim()
  if (term.length < 2) return []

  // Exclude companies that already have a mandat with this cabinet (active or not)
  const existing = await prisma.mandat.findMany({
    where: { cabinetId },
    select: { companyId: true },
  })
  const excludedIds = existing.map((m) => m.companyId)

  return prisma.company.findMany({
    where: {
      ...(excludedIds.length > 0 ? { id: { notIn: excludedIds } } : {}),
      OR: [
        { nom: { contains: term, mode: 'insensitive' } },
        { siren: { contains: term } },
      ],
    },
    select: {
      id: true,
      nom: true,
      siren: true,
      secteur: true,
      taille: true,
      plan: true,
      ville: true,
      pays: true,
    },
    take: 10,
    orderBy: { nom: 'asc' },
  })
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createMandat(
  cabinetId: string,
  data: {
    companyId: string
    type: string
    modules: string[]
  },
) {
  const company = await prisma.company.findUnique({ where: { id: data.companyId } })
  if (!company) throw new AppError('Entreprise introuvable', 404, 'NOT_FOUND')

  const existing = await prisma.mandat.findUnique({
    where: { cabinetId_companyId: { cabinetId, companyId: data.companyId } },
  })
  if (existing) throw new AppError('Un mandat existe déjà pour cette entreprise', 409, 'CONFLICT')

  // VN4 : exiger une CabinetInvitation ACCEPTED pour ce couple (cabinet, company)
  //       avant de créer le mandat — sinon un cabinet pourrait attacher
  //       une company sans son consentement.
  //       Matching invitation ↔ company via `companyEmail` (les invitations
  //       sont émises avant que la company existe en DB).
  if (company.email) {
    const invitation = await prisma.cabinetInvitation.findFirst({
      where: { cabinetId, companyEmail: company.email, status: 'ACCEPTED' },
      select: { id: true },
    })
    if (!invitation) {
      throw new AppError(
        'Aucune invitation acceptée trouvée pour cette entreprise. Envoyez d\'abord une invitation via POST /cabinet/invitations.',
        403, 'NO_ACCEPTED_INVITATION',
      )
    }
  } else if (company.cabinetId !== cabinetId) {
    // Pas d'email = impossible de matcher. Refus par défaut sauf si déjà rattachée.
    throw new AppError(
      'Cette entreprise n\'a pas d\'email ; impossible de vérifier l\'invitation.',
      403, 'NO_COMPANY_EMAIL',
    )
  }

  const mandat = await prisma.$transaction(async (tx) => {
    const m = await tx.mandat.create({
      data: {
        cabinetId,
        companyId: data.companyId,
        type:      data.type as any,
        modules:   data.modules,
        actif:     true,
      },
      include: { company: { select: { id: true, nom: true, siren: true, plan: true } } },
    })

    // Link the company to this cabinet
    await tx.company.update({
      where: { id: data.companyId },
      data:  { cabinetId },
    })

    return m
  })
  return serializeMandat(mandat)
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateMandat(
  cabinetId: string,
  companyId: string,
  data: {
    type?:      string
    modules?:   string[]
    notes?:     string | null
    dateDebut?: string | null
    dateFin?:   string | null
  },
) {
  await getMandat(cabinetId, companyId) // throws 404 if not found

  const updated = await prisma.mandat.update({
    where: { cabinetId_companyId: { cabinetId, companyId } },
    data: {
      ...(data.type      !== undefined ? { type:      data.type as any }                            : {}),
      ...(data.modules   !== undefined ? { modules:   data.modules }                                 : {}),
      ...(data.notes     !== undefined ? { notes:     data.notes ?? null }                          : {}),
      ...(data.dateDebut !== undefined ? { dateDebut: data.dateDebut ? new Date(data.dateDebut) : null } : {}),
      ...(data.dateFin   !== undefined ? { dateFin:   data.dateFin   ? new Date(data.dateFin)   : null } : {}),
    },
    include: { company: { select: { id: true, nom: true, siren: true, plan: true } } },
  })
  return serializeMandat(updated)
}

// ── Invitations cabinet ───────────────────────────────────────────────────────

/** Sérialise une invitation Prisma en y joignant le bloc `company` attendu côté front. */
async function serializeInvitation(
  inv: Awaited<ReturnType<typeof prisma.cabinetInvitation.findMany>>[number],
) {
  // Lookup company par email (l'invitation peut viser une company existante ou pas)
  const company = inv.companyEmail
    ? await prisma.company.findFirst({
        where:  { email: inv.companyEmail },
        select: { id: true, nom: true, siren: true, plan: true },
      })
    : null
  return {
    id:          inv.id,
    token:       inv.token,
    cabinetId:   inv.cabinetId,
    companyId:   company?.id ?? null,
    type:        inv.type,
    modules:     inv.modules,
    notes:       inv.notes,
    status:      inv.status,
    sentTo:      inv.companyEmail ?? '',
    expiresAt:   inv.expiresAt.toISOString(),
    acceptedAt:  inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
    rejectedAt:  inv.rejectedAt ? inv.rejectedAt.toISOString() : null,
    createdAt:   inv.createdAt.toISOString(),
    company: company ?? {
      id:    '',
      nom:   inv.companyName ?? inv.companyEmail ?? '—',
      siren: null,
      plan:  'FREE',
    },
  }
}

export async function getInvitations(cabinetId: string) {
  const items = await prisma.cabinetInvitation.findMany({
    where:   { cabinetId },
    orderBy: { createdAt: 'desc' },
  })
  return Promise.all(items.map(serializeInvitation))
}

export async function sendInvitation(
  cabinetId: string,
  data: {
    companyId?:    string
    companyEmail?: string
    companyName?:  string
    type:          string
    modules:       string[]
    notes?:        string
  },
  createdBy: string,
) {
  const cabinet = await prisma.cabinet.findUniqueOrThrow({
    where:  { id: cabinetId },
    select: { nom: true },
  })

  // Résolution email/nom :
  //  - si companyId fourni → lookup en DB (email, nom)
  //  - sinon, companyEmail doit être fourni
  let resolvedEmail = data.companyEmail?.trim() ?? ''
  let resolvedName  = data.companyName ?? null

  if (data.companyId) {
    const company = await prisma.company.findUnique({
      where:  { id: data.companyId },
      select: { email: true, nom: true },
    })
    if (!company) throw new AppError('Entreprise introuvable', 404, 'NOT_FOUND')
    if (!company.email) {
      throw new AppError(
        "Cette entreprise n'a pas d'email enregistré. Ajoutez son email avant de l'inviter.",
        400, 'COMPANY_NO_EMAIL',
      )
    }
    resolvedEmail = company.email
    resolvedName  = resolvedName ?? company.nom
  }

  if (!resolvedEmail) {
    throw new AppError("L'email de l'entreprise est requis", 400, 'EMAIL_REQUIRED')
  }

  // Check for existing pending invitation to same email
  const existing = await prisma.cabinetInvitation.findFirst({
    where: { cabinetId, companyEmail: resolvedEmail, status: 'PENDING' },
  })
  if (existing) throw new AppError('Une invitation est déjà en attente pour cette adresse', 409, 'INVITATION_PENDING')

  const token     = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  const invitation = await prisma.cabinetInvitation.create({
    data: {
      cabinetId,
      companyEmail: resolvedEmail,
      companyName:  resolvedName,
      type:         data.type as any, // MandatType enum — validé par Zod en amont
      modules:      data.modules,
      notes:        data.notes ?? null,
      token,
      expiresAt,
      createdBy,
    },
  })

  // Envoi de l'email — best effort : on n'annule pas l'invitation si SMTP indispo
  try {
    await sendCabinetInvitationEmail(resolvedEmail, {
      cabinetName: cabinet.nom,
      companyName: resolvedName ?? resolvedEmail,
      type:        data.type,
      token,
      expiresAt,
    })
  } catch (err) {
    console.error('[cabinet] sendCabinetInvitationEmail failed', err)
  }

  return serializeInvitation(invitation)
}

export async function cancelInvitation(cabinetId: string, invitationId: string) {
  const inv = await prisma.cabinetInvitation.findFirst({ where: { id: invitationId, cabinetId } })
  if (!inv) throw new AppError('Invitation introuvable', 404, 'NOT_FOUND')
  if (inv.status !== 'PENDING') throw new AppError('Cette invitation n\'est plus en attente', 409, 'INVALID_STATUS')

  const updated = await prisma.cabinetInvitation.update({
    where: { id: invitationId },
    data:  { status: 'CANCELLED' },
  })
  return serializeInvitation(updated)
}

export async function getInvitationByToken(token: string) {
  const inv = await prisma.cabinetInvitation.findUnique({
    where: { token },
    include: { cabinet: { select: { id: true, nom: true } } },
  })
  if (!inv) throw new AppError('Invitation invalide ou introuvable', 404, 'INVITATION_NOT_FOUND')
  if (inv.status !== 'PENDING') throw new AppError('Cette invitation a déjà été traitée', 409, 'INVITATION_ALREADY_PROCESSED')
  if (inv.expiresAt < new Date()) throw new AppError('Cette invitation a expiré', 410, 'INVITATION_EXPIRED')
  return inv
}

// Verify the invitation was actually sent to this company (IDOR prevention).
// Compares inv.companyEmail against the company's contact email in the DB.
async function assertInvitationBelongsToCompany(
  inv: { companyEmail: string | null },
  companyId: string,
) {
  if (!inv.companyEmail) {
    // Invitation has no target email — cannot verify ownership; deny to be safe.
    throw new AppError(
      "Cette invitation n'est pas destinée à votre entreprise",
      403,
      'FORBIDDEN',
    )
  }

  const company = await prisma.company.findUnique({
    where:  { id: companyId },
    select: { email: true },
  })
  if (!company) throw new AppError('Entreprise introuvable', 404, 'NOT_FOUND')

  const companyEmail = (company.email ?? '').toLowerCase().trim()
  const invEmail     = inv.companyEmail.toLowerCase().trim()

  if (!companyEmail || companyEmail !== invEmail) {
    throw new AppError(
      "Cette invitation n'est pas destinée à votre entreprise",
      403,
      'FORBIDDEN',
    )
  }
}

export async function acceptInvitation(token: string, companyId: string) {
  const inv = await getInvitationByToken(token)

  // Verify ownership before accepting
  await assertInvitationBelongsToCompany(inv, companyId)

  await prisma.$transaction(async (tx) => {
    await tx.cabinetInvitation.update({
      where: { id: inv.id },
      data:  { status: 'ACCEPTED', acceptedAt: new Date() },
    })

    // Auto-create the mandat if it doesn't already exist
    const existing = await tx.mandat.findUnique({
      where: { cabinetId_companyId: { cabinetId: inv.cabinetId, companyId } },
    })
    if (!existing) {
      await tx.mandat.create({
        data: {
          cabinetId: inv.cabinetId,
          companyId,
          type:    inv.type,
          modules: inv.modules,
          actif:   true,
        },
      })
      // Link the company to this cabinet
      await tx.company.update({
        where: { id: companyId },
        data:  { cabinetId: inv.cabinetId },
      })
    }
  })

  return inv
}

export async function rejectInvitation(token: string, companyId: string) {
  const inv = await getInvitationByToken(token)

  // Verify ownership before rejecting
  await assertInvitationBelongsToCompany(inv, companyId)

  return prisma.cabinetInvitation.update({
    where: { id: inv.id },
    data:  { status: 'REJECTED', rejectedAt: new Date() },
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteMandat(cabinetId: string, companyId: string) {
  await getMandat(cabinetId, companyId) // throws 404 if not found

  await prisma.$transaction(async (tx) => {
    await tx.mandat.delete({
      where: { cabinetId_companyId: { cabinetId, companyId } },
    })

    // Clear cabinetId from company only if it still points to this cabinet
    await tx.company.updateMany({
      where: { id: companyId, cabinetId },
      data:  { cabinetId: null },
    })
  })
}
