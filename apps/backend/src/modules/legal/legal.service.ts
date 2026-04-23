import crypto from 'crypto'
import { prisma } from '../../lib/prisma.js'
import type {
  CreateContractInput, UpdateContractInput, ListContractsInput,
  SendSignatureInput, CreateGdprInput, UpdateGdprInput,
  CreateAlertInput, UpdateAlertInput,
} from './legal.dto.js'

// ── Contracts ─────────────────────────────────────────────────────────────────

export async function listContracts(companyId: string, query: ListContractsInput) {
  return prisma.legalContract.findMany({
    where: {
      companyId,
      ...(query.type   ? { type: query.type }     : {}),
      ...(query.status ? { status: query.status } : {}),
    },
    include: {
      signatures: { select: { signerName: true, signerEmail: true, signerRole: true, status: true, signedAt: true } },
      _count: { select: { alerts: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getContract(companyId: string, id: string) {
  return prisma.legalContract.findFirst({
    where: { id, companyId },
    include: {
      signatures: true,
      alerts: { where: { status: 'OPEN' }, orderBy: { severity: 'desc' } },
    },
  })
}

export async function createContract(companyId: string, data: CreateContractInput) {
  const contract = await prisma.legalContract.create({
    data: {
      companyId,
      title:     data.title,
      type:      data.type,
      parties:   data.parties as never,
      content:   data.content,
      fileUrl:   data.fileUrl,
      expiresAt: data.expiresAt,
      notes:     data.notes,
    },
  })
  // Auto-generate expiry alert if expiresAt is set
  if (data.expiresAt) {
    const daysLeft = Math.ceil((data.expiresAt.getTime() - Date.now()) / 86_400_000)
    if (daysLeft <= 90) {
      await prisma.legalAlert.create({
        data: {
          companyId,
          contractId: contract.id,
          title:    `Contrat "${data.title}" expire bientôt`,
          message:  `Ce contrat expire dans ${daysLeft} jour(s). Pensez à le renouveler ou à le terminer.`,
          severity: daysLeft <= 30 ? 'CRITICAL' : 'WARNING',
          dueDate:  data.expiresAt,
        },
      })
    }
  }
  return contract
}

export async function updateContract(companyId: string, id: string, data: UpdateContractInput) {
  const existing = await prisma.legalContract.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.legalContract.update({
    where: { id },
    data: {
      ...(data.title        ? { title: data.title }               : {}),
      ...(data.status       ? { status: data.status }             : {}),
      ...(data.parties      ? { parties: data.parties as never }  : {}),
      ...(data.content      !== undefined ? { content: data.content } : {}),
      ...(data.fileUrl      !== undefined ? { fileUrl: data.fileUrl } : {}),
      ...(data.expiresAt    !== undefined ? { expiresAt: data.expiresAt } : {}),
      ...(data.terminatedAt !== undefined ? { terminatedAt: data.terminatedAt } : {}),
      ...(data.notes        !== undefined ? { notes: data.notes } : {}),
      ...(data.status === 'SIGNED' ? { signedAt: new Date() } : {}),
    },
  })
}

export async function deleteContract(companyId: string, id: string) {
  const existing = await prisma.legalContract.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.legalContract.delete({ where: { id } })
}

// ── Signature workflow ────────────────────────────────────────────────────────

export async function sendSignatureRequest(companyId: string, contractId: string, data: SendSignatureInput) {
  const contract = await prisma.legalContract.findFirst({ where: { id: contractId, companyId } })
  if (!contract) return null

  const token = crypto.randomBytes(32).toString('hex')
  const signature = await prisma.contractSignature.create({
    data: {
      contractId,
      signerName:  data.signerName,
      signerEmail: data.signerEmail,
      signerRole:  data.signerRole,
      token,
    },
  })

  // Move contract to PENDING_SIGNATURE
  await prisma.legalContract.update({
    where: { id: contractId },
    data:  { status: 'PENDING_SIGNATURE' },
  })

  return { ...signature, signLink: `/sign/${token}` }
}

export async function processSignature(token: string, action: 'sign' | 'refuse', note?: string) {
  const sig = await prisma.contractSignature.findUnique({
    where: { token },
    include: { contract: { select: { id: true, companyId: true } } },
  })
  if (!sig || sig.status !== 'PENDING') return null

  if (action === 'sign') {
    await prisma.contractSignature.update({
      where: { id: sig.id },
      data: { status: 'SIGNED', signedAt: new Date() },
    })
    // Check if all signatures are signed
    const pending = await prisma.contractSignature.count({
      where: { contractId: sig.contractId, status: 'PENDING' },
    })
    if (pending === 0) {
      await prisma.legalContract.update({
        where: { id: sig.contractId },
        data:  { status: 'SIGNED', signedAt: new Date() },
      })
    }
  } else {
    await prisma.contractSignature.update({
      where: { id: sig.id },
      data: { status: 'REFUSED', refusedAt: new Date(), refusedNote: note },
    })
  }

  return sig
}

export async function getSignatureByToken(token: string) {
  return prisma.contractSignature.findUnique({
    where: { token },
    include: {
      contract: {
        select: { id: true, title: true, type: true, content: true, parties: true },
      },
    },
  })
}

// ── GDPR ──────────────────────────────────────────────────────────────────────

export async function listGdpr(companyId: string) {
  return prisma.gdprEntry.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getGdprEntry(companyId: string, id: string) {
  return prisma.gdprEntry.findFirst({ where: { id, companyId } })
}

export async function createGdprEntry(companyId: string, data: CreateGdprInput) {
  return prisma.gdprEntry.create({
    data: {
      companyId,
      treatmentName:   data.treatmentName,
      purpose:         data.purpose,
      legalBasis:      data.legalBasis,
      dataCategories:  data.dataCategories,
      dataSubjects:    data.dataSubjects,
      retentionMonths: data.retentionMonths,
      responsible:     data.responsible,
      subcontractors:  data.subcontractors,
      securityMeasures: data.securityMeasures,
      riskLevel:       data.riskLevel,
      dpiaRequired:    data.dpiaRequired,
      notes:           data.notes,
    },
  })
}

export async function updateGdprEntry(companyId: string, id: string, data: UpdateGdprInput) {
  const existing = await prisma.gdprEntry.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.gdprEntry.update({
    where: { id },
    data: { ...data, lastReviewedAt: new Date() },
  })
}

export async function deleteGdprEntry(companyId: string, id: string) {
  const existing = await prisma.gdprEntry.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.gdprEntry.delete({ where: { id } })
}

export async function gdprStats(companyId: string) {
  const entries = await prisma.gdprEntry.findMany({ where: { companyId } })
  return {
    total:        entries.length,
    highRisk:     entries.filter(e => e.riskLevel === 'HIGH').length,
    dpiaRequired: entries.filter(e => e.dpiaRequired).length,
    byBasis:      groupCount(entries, e => e.legalBasis),
  }
}

function groupCount<T>(arr: T[], key: (item: T) => string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function listAlerts(companyId: string, status?: string) {
  return prisma.legalAlert.findMany({
    where: {
      companyId,
      ...(status ? { status: status as never } : {}),
    },
    include: {
      contract: { select: { id: true, title: true, type: true } },
    },
    orderBy: [{ severity: 'desc' }, { dueDate: 'asc' }],
  })
}

export async function createAlert(companyId: string, data: CreateAlertInput) {
  return prisma.legalAlert.create({
    data: {
      companyId,
      contractId: data.contractId,
      title:      data.title,
      message:    data.message,
      severity:   data.severity,
      dueDate:    data.dueDate,
    },
  })
}

export async function updateAlert(companyId: string, id: string, data: UpdateAlertInput) {
  const existing = await prisma.legalAlert.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.legalAlert.update({
    where: { id },
    data: {
      status:       data.status,
      dismissedAt:  data.status === 'DISMISSED' ? new Date() : undefined,
      resolvedAt:   data.status === 'RESOLVED'  ? new Date() : undefined,
    },
  })
}

// Automatically generate expiry alerts for contracts expiring within 90 days
export async function syncExpiryAlerts(companyId: string) {
  const soon = new Date(Date.now() + 90 * 86_400_000)
  const expiring = await prisma.legalContract.findMany({
    where: {
      companyId,
      status:    { in: ['SIGNED'] },
      expiresAt: { lte: soon, gte: new Date() },
    },
  })

  const created = []
  for (const c of expiring) {
    const existing = await prisma.legalAlert.findFirst({
      where: { companyId, contractId: c.id, status: 'OPEN' },
    })
    if (existing) continue

    const daysLeft = Math.ceil((c.expiresAt!.getTime() - Date.now()) / 86_400_000)
    created.push(await prisma.legalAlert.create({
      data: {
        companyId,
        contractId: c.id,
        title:    `Contrat "${c.title}" expire dans ${daysLeft} jour(s)`,
        message:  `Ce contrat expire le ${c.expiresAt!.toLocaleDateString('fr-FR')}. Renouvellement ou résiliation à prévoir.`,
        severity: daysLeft <= 30 ? 'CRITICAL' : 'WARNING',
        dueDate:  c.expiresAt ?? undefined,
      },
    }))
  }

  return { synced: created.length }
}

export async function alertStats(companyId: string) {
  const alerts = await prisma.legalAlert.findMany({ where: { companyId, status: 'OPEN' } })
  return {
    total:    alerts.length,
    critical: alerts.filter(a => a.severity === 'CRITICAL').length,
    warning:  alerts.filter(a => a.severity === 'WARNING').length,
    info:     alerts.filter(a => a.severity === 'INFO').length,
  }
}
