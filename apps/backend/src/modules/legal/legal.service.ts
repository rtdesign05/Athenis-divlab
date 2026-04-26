import { prisma } from '../../lib/prisma.js'
import type {
  CreateContractInput, UpdateContractInput, ListContractsInput,
  SendSignatureInput, CreateGdprInput, UpdateGdprInput,
  CreateAlertInput, UpdateAlertInput,
} from './legal.dto.js'

// ContractSignature, LegalAlert, GdprEntry models don't exist in v2 schema
// Using in-memory stores for backward API compatibility
interface ContractSignature {
  id: string; contractId: string; signerName: string; signerEmail: string
  signerRole: string; token: string; status: 'PENDING' | 'SIGNED' | 'REFUSED'
  signedAt: Date | null; refusedAt: Date | null; refusedNote: string | null
}
interface LegalAlert {
  id: string; companyId: string; contractId: string | null; title: string
  message: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'; status: 'OPEN' | 'DISMISSED' | 'RESOLVED'
  dueDate: Date | null; dismissedAt: Date | null; resolvedAt: Date | null; createdAt: Date
}
interface GdprEntry {
  id: string; companyId: string; treatmentName: string; purpose: string; legalBasis: string
  dataCategories: string[]; dataSubjects: string[]; retentionMonths: number; responsible: string
  subcontractors: string[]; securityMeasures: string; riskLevel: string; dpiaRequired: boolean
  notes: string | null; lastReviewedAt: Date | null; createdAt: Date; updatedAt: Date
}

import crypto from 'crypto'
const sigStore  = new Map<string, ContractSignature>()
const alertStore = new Map<string, LegalAlert>()
const gdprStore  = new Map<string, GdprEntry>()
let seq = 0
function genId(): string { return `${++seq}-${Date.now()}` }

// ── Contracts ─────────────────────────────────────────────────────────────────

export async function listContracts(companyId: string, query: ListContractsInput) {
  return prisma.contract.findMany({
    where: {
      companyId,
      ...(query.type   ? { type: query.type as never }     : {}),
      ...(query.status ? { status: query.status as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getContract(companyId: string, id: string) {
  return prisma.contract.findFirst({
    where: { id, companyId },
  })
}

export async function createContract(companyId: string, data: CreateContractInput, createdBy: string) {
  const reference = `CTR-${Date.now()}`
  const contract = await prisma.contract.create({
    data: {
      companyId,
      reference,
      titre:     data.title,
      type:      data.type as never,
      parties:   data.parties ?? [],
      notes:     data.notes ?? null,
      createdBy,
      ...(data.expiresAt ? { dateFin: data.expiresAt } : {}),
    },
  })
  // Auto-generate expiry alert if expiresAt is set
  if (data.expiresAt) {
    const daysLeft = Math.ceil((data.expiresAt.getTime() - Date.now()) / 86_400_000)
    if (daysLeft <= 90) {
      const id = genId()
      alertStore.set(id, {
        id, companyId,
        contractId: contract.id,
        title:    `Contrat "${data.title}" expire bientôt`,
        message:  `Ce contrat expire dans ${daysLeft} jour(s). Pensez à le renouveler ou à le terminer.`,
        severity: daysLeft <= 30 ? 'CRITICAL' : 'WARNING',
        status:   'OPEN',
        dueDate:  data.expiresAt,
        dismissedAt: null, resolvedAt: null,
        createdAt: new Date(),
      })
    }
  }
  return contract
}

export async function updateContract(companyId: string, id: string, data: UpdateContractInput) {
  const existing = await prisma.contract.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.contract.update({
    where: { id },
    data: {
      ...(data.title        ? { titre: data.title }            : {}),
      ...(data.status       ? { status: data.status as never } : {}),
      ...(data.parties      ? { parties: data.parties }        : {}),
      ...(data.notes        !== undefined ? { notes: data.notes ?? null }        : {}),
      ...(data.expiresAt    !== undefined ? { dateFin: data.expiresAt ?? null }  : {}),
      ...(data.terminatedAt !== undefined ? { dateFin: data.terminatedAt ?? null } : {}),
      ...(data.status === 'SIGNED' ? { dateSignature: new Date() } : {}),
    },
  })
}

export async function deleteContract(companyId: string, id: string) {
  const existing = await prisma.contract.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.contract.delete({ where: { id } })
}

// ── Signature workflow (in-memory) ────────────────────────────────────────────

export async function sendSignatureRequest(companyId: string, contractId: string, data: SendSignatureInput) {
  const contract = await prisma.contract.findFirst({ where: { id: contractId, companyId } })
  if (!contract) return null

  const token = crypto.randomBytes(32).toString('hex')
  const id = genId()
  const signature: ContractSignature = {
    id, contractId,
    signerName:  data.signerName,
    signerEmail: data.signerEmail,
    signerRole:  data.signerRole ?? '',
    token,
    status:      'PENDING',
    signedAt:    null, refusedAt: null, refusedNote: null,
  }
  sigStore.set(id, signature)

  await prisma.contract.update({
    where: { id: contractId },
    data:  { status: 'SENT' as never },
  })

  return { ...signature, signLink: `/sign/${token}` }
}

export async function processSignature(token: string, action: 'sign' | 'refuse', note?: string) {
  const sig = [...sigStore.values()].find(s => s.token === token)
  if (!sig || sig.status !== 'PENDING') return null

  if (action === 'sign') {
    sigStore.set(sig.id, { ...sig, status: 'SIGNED', signedAt: new Date() })
    const pending = [...sigStore.values()].filter(s => s.contractId === sig.contractId && s.status === 'PENDING').length
    if (pending === 0) {
      await prisma.contract.update({
        where: { id: sig.contractId },
        data:  { status: 'SIGNED' as never, dateSignature: new Date() },
      })
    }
  } else {
    sigStore.set(sig.id, { ...sig, status: 'REFUSED', refusedAt: new Date(), refusedNote: note ?? null })
  }

  return sig
}

export async function getSignatureByToken(token: string) {
  const sig = [...sigStore.values()].find(s => s.token === token)
  if (!sig) return null
  const contract = await prisma.contract.findFirst({
    where: { id: sig.contractId },
    select: { id: true, titre: true, type: true, notes: true, parties: true },
  })
  return { ...sig, contract }
}

// ── GDPR (in-memory) ─────────────────────────────────────────────────────────

export async function listGdpr(companyId: string) {
  return [...gdprStore.values()].filter(e => e.companyId === companyId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getGdprEntry(companyId: string, id: string) {
  const entry = gdprStore.get(id)
  return (entry?.companyId === companyId) ? entry : null
}

export async function createGdprEntry(companyId: string, data: CreateGdprInput) {
  const id = genId()
  const now = new Date()
  const entry: GdprEntry = {
    id, companyId,
    treatmentName:   data.treatmentName,
    purpose:         data.purpose,
    legalBasis:      data.legalBasis,
    dataCategories:  data.dataCategories,
    dataSubjects:    data.dataSubjects,
    retentionMonths: data.retentionMonths,
    responsible:     data.responsible,
    subcontractors:  data.subcontractors ?? [],
    securityMeasures: Array.isArray(data.securityMeasures) ? data.securityMeasures.join(', ') : (data.securityMeasures ?? ''),
    riskLevel:       data.riskLevel,
    dpiaRequired:    data.dpiaRequired ?? false,
    notes:           data.notes ?? null,
    lastReviewedAt:  null,
    createdAt: now, updatedAt: now,
  }
  gdprStore.set(id, entry)
  return entry
}

export async function updateGdprEntry(companyId: string, id: string, data: UpdateGdprInput) {
  const existing = gdprStore.get(id)
  if (!existing || existing.companyId !== companyId) return null
  const mergedData: Partial<GdprEntry> = {
    ...(data as unknown as Partial<GdprEntry>),
    ...(Array.isArray(data.securityMeasures) ? { securityMeasures: data.securityMeasures.join(', ') } : {}),
  }
  const updated: GdprEntry = { ...existing, ...mergedData, lastReviewedAt: new Date(), updatedAt: new Date() }
  gdprStore.set(id, updated)
  return updated
}

export async function deleteGdprEntry(companyId: string, id: string) {
  const existing = gdprStore.get(id)
  if (!existing || existing.companyId !== companyId) return null
  gdprStore.delete(id)
  return existing
}

export async function gdprStats(companyId: string) {
  const entries = [...gdprStore.values()].filter(e => e.companyId === companyId)
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

// ── Alerts (in-memory) ────────────────────────────────────────────────────────

export async function listAlerts(companyId: string, status?: string) {
  return [...alertStore.values()]
    .filter(a => a.companyId === companyId && (!status || a.status === status))
    .sort((a, b) => {
      const sev = { CRITICAL: 3, WARNING: 2, INFO: 1 }
      return (sev[b.severity] ?? 0) - (sev[a.severity] ?? 0)
    })
}

export async function createAlert(companyId: string, data: CreateAlertInput) {
  const id = genId()
  const alert: LegalAlert = {
    id, companyId,
    contractId: data.contractId ?? null,
    title:      data.title,
    message:    data.message,
    severity:   data.severity as 'INFO' | 'WARNING' | 'CRITICAL',
    status:     'OPEN',
    dueDate:    data.dueDate ?? null,
    dismissedAt: null, resolvedAt: null,
    createdAt: new Date(),
  }
  alertStore.set(id, alert)
  return alert
}

export async function updateAlert(companyId: string, id: string, data: UpdateAlertInput) {
  const existing = alertStore.get(id)
  if (!existing || existing.companyId !== companyId) return null
  const updated: LegalAlert = {
    ...existing,
    status:      (data.status ?? existing.status) as LegalAlert['status'],
    dismissedAt: data.status === 'DISMISSED' ? new Date() : existing.dismissedAt,
    resolvedAt:  data.status === 'RESOLVED'  ? new Date() : existing.resolvedAt,
  }
  alertStore.set(id, updated)
  return updated
}

export async function syncExpiryAlerts(companyId: string) {
  const soon = new Date(Date.now() + 90 * 86_400_000)
  const expiring = await prisma.contract.findMany({
    where: {
      companyId,
      status:  { in: ['SIGNED'] as never[] },
      dateFin: { lte: soon, gte: new Date() },
    },
  })

  const created = []
  for (const c of expiring) {
    const existing = [...alertStore.values()].find(
      a => a.companyId === companyId && a.contractId === c.id && a.status === 'OPEN'
    )
    if (existing) continue

    const daysLeft = Math.ceil((c.dateFin!.getTime() - Date.now()) / 86_400_000)
    const id = genId()
    const alert: LegalAlert = {
      id, companyId,
      contractId: c.id,
      title:    `Contrat "${c.titre}" expire dans ${daysLeft} jour(s)`,
      message:  `Ce contrat expire le ${c.dateFin!.toLocaleDateString('fr-FR')}. Renouvellement ou résiliation à prévoir.`,
      severity: daysLeft <= 30 ? 'CRITICAL' : 'WARNING',
      status:   'OPEN',
      dueDate:  c.dateFin,
      dismissedAt: null, resolvedAt: null,
      createdAt: new Date(),
    }
    alertStore.set(id, alert)
    created.push(alert)
  }

  return { synced: created.length }
}

export async function alertStats(companyId: string) {
  const alerts = [...alertStore.values()].filter(a => a.companyId === companyId && a.status === 'OPEN')
  return {
    total:    alerts.length,
    critical: alerts.filter(a => a.severity === 'CRITICAL').length,
    warning:  alerts.filter(a => a.severity === 'WARNING').length,
    info:     alerts.filter(a => a.severity === 'INFO').length,
  }
}
