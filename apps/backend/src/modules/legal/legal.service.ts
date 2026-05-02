// Contract model does not exist in WSL2 DB — using in-memory stores for backward API compatibility
import type {
  CreateContractInput, UpdateContractInput, ListContractsInput,
  SendSignatureInput, CreateGdprInput, UpdateGdprInput,
  CreateAlertInput, UpdateAlertInput,
} from './legal.dto.js'

interface Contract {
  id: string; companyId: string; reference: string; titre: string
  type: string; status: string; parties: string[]; notes: string | null
  dateSignature: Date | null; dateFin: Date | null; createdBy: string
  createdAt: Date; updatedAt: Date
}
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
const contractStore = new Map<string, Contract>()
const sigStore      = new Map<string, ContractSignature>()
const alertStore    = new Map<string, LegalAlert>()
const gdprStore     = new Map<string, GdprEntry>()
let seq = 0
function genId(): string { return `${++seq}-${Date.now()}` }

// ── Contracts (in-memory) ─────────────────────────────────────────────────────

export async function listContracts(companyId: string, query: ListContractsInput) {
  return [...contractStore.values()]
    .filter(c => c.companyId === companyId
      && (!query.type   || c.type === query.type)
      && (!query.status || c.status === query.status))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getContract(companyId: string, id: string) {
  const c = contractStore.get(id)
  return (c?.companyId === companyId) ? c : null
}

export async function createContract(companyId: string, data: CreateContractInput, createdBy: string) {
  const id = genId()
  const now = new Date()
  const contract: Contract = {
    id, companyId,
    reference:     `CTR-${Date.now()}`,
    titre:         data.title,
    type:          data.type,
    status:        'DRAFT',
    parties:       data.parties ?? [],
    notes:         data.notes ?? null,
    dateSignature: null,
    dateFin:       data.expiresAt ?? null,
    createdBy,
    createdAt: now, updatedAt: now,
  }
  contractStore.set(id, contract)

  // Auto-generate expiry alert if expiresAt is set
  if (data.expiresAt) {
    const daysLeft = Math.ceil((data.expiresAt.getTime() - Date.now()) / 86_400_000)
    if (daysLeft <= 90) {
      const alertId = genId()
      alertStore.set(alertId, {
        id: alertId, companyId,
        contractId: id,
        title:    `Contrat "${data.title}" expire bientôt`,
        message:  `Ce contrat expire dans ${daysLeft} jour(s). Pensez à le renouveler ou à le terminer.`,
        severity: daysLeft <= 30 ? 'CRITICAL' : 'WARNING',
        status:   'OPEN',
        dueDate:  data.expiresAt,
        dismissedAt: null, resolvedAt: null,
        createdAt: now,
      })
    }
  }
  return contract
}

export async function updateContract(companyId: string, id: string, data: UpdateContractInput) {
  const existing = contractStore.get(id)
  if (!existing || existing.companyId !== companyId) return null
  const updated: Contract = {
    ...existing,
    ...(data.title        ? { titre: data.title }          : {}),
    ...(data.status       ? { status: data.status }        : {}),
    ...(data.parties      ? { parties: data.parties }      : {}),
    ...(data.notes        !== undefined ? { notes: data.notes ?? null }       : {}),
    ...(data.expiresAt    !== undefined ? { dateFin: data.expiresAt ?? null } : {}),
    ...(data.terminatedAt !== undefined ? { dateFin: data.terminatedAt ?? null } : {}),
    ...(data.status === 'SIGNED' ? { dateSignature: new Date() } : {}),
    updatedAt: new Date(),
  }
  contractStore.set(id, updated)
  return updated
}

export async function deleteContract(companyId: string, id: string) {
  const existing = contractStore.get(id)
  if (!existing || existing.companyId !== companyId) return null
  contractStore.delete(id)
  return existing
}

// ── Signature workflow (in-memory) ────────────────────────────────────────────

export async function sendSignatureRequest(companyId: string, contractId: string, data: SendSignatureInput) {
  const contract = contractStore.get(contractId)
  if (!contract || contract.companyId !== companyId) return null

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

  const updated: Contract = { ...contract, status: 'SENT', updatedAt: new Date() }
  contractStore.set(contractId, updated)

  return { ...signature, signLink: `/sign/${token}` }
}

export async function processSignature(token: string, action: 'sign' | 'refuse', note?: string) {
  const sig = [...sigStore.values()].find(s => s.token === token)
  if (!sig || sig.status !== 'PENDING') return null

  if (action === 'sign') {
    sigStore.set(sig.id, { ...sig, status: 'SIGNED', signedAt: new Date() })
    const pending = [...sigStore.values()].filter(s => s.contractId === sig.contractId && s.status === 'PENDING').length
    if (pending === 0) {
      const contract = contractStore.get(sig.contractId)
      if (contract) contractStore.set(contract.id, { ...contract, status: 'SIGNED', dateSignature: new Date(), updatedAt: new Date() })
    }
  } else {
    sigStore.set(sig.id, { ...sig, status: 'REFUSED', refusedAt: new Date(), refusedNote: note ?? null })
  }

  return sig
}

export async function getSignatureByToken(token: string) {
  const sig = [...sigStore.values()].find(s => s.token === token)
  if (!sig) return null
  const contract = contractStore.get(sig.contractId)
  if (!contract) return { ...sig, contract: null }
  return {
    ...sig,
    contract: { id: contract.id, titre: contract.titre, type: contract.type, notes: contract.notes, parties: contract.parties },
  }
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
  const now  = new Date()
  const soon = new Date(Date.now() + 90 * 86_400_000)
  const expiring = [...contractStore.values()].filter(c =>
    c.companyId === companyId
    && c.status === 'SIGNED'
    && c.dateFin != null
    && c.dateFin <= soon
    && c.dateFin >= now
  )

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
      createdAt: now,
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
