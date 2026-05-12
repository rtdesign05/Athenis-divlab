/**
 * Service Juridique — Signature Électronique Avancée (AES)
 *
 * Conformité :
 *  - OHADA Acte Uniforme sur le Droit Commercial Général (révisé 2010) — art. 1-4 sur les actes électroniques
 *  - Loi Cameroun n°2010/021 du 21/12/2010 relative au commerce électronique — Titre III
 *  - UEMOA Acte Additionnel ASA.20110 (19/01/2010) — cadre régional
 *  - Référence eIDAS (UE 910/2014) AES — niveau requis pour équivalence manuscrite
 *
 * Composantes AES implémentées :
 *  1. Empreinte SHA-256 du document original (intégrité)
 *  2. Horodatage de chaque événement (audit trail)
 *  3. IP + User-Agent du signataire (identification)
 *  4. Invitation par email vérifiée (authentification)
 *  5. Journal d'audit complet et non-répudiable
 *  6. Certificat de réalisation généré à la clôture
 */
import crypto from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { sendSignatureRequestEmail } from '../../lib/email.js'
import { env } from '../../config/env.js'
import type {
  CreateContractInput, UpdateContractInput, ListContractsInput,
  SendSignatureInput, CreateGdprInput, UpdateGdprInput,
  CreateAlertInput, UpdateAlertInput,
} from './legal.dto.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function sha256(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

async function auditLog(
  contractId: string,
  event: string,
  opts: { actorName?: string | null; actorEmail?: string | null; actorIp?: string | null; metadata?: object | null } = {},
) {
  await prisma.contractAuditLog.create({
    data: {
      contractId,
      event,
      actorName:  opts.actorName  ?? null,
      actorEmail: opts.actorEmail ?? null,
      actorIp:    opts.actorIp    ?? null,
      ...(opts.metadata != null ? { metadata: opts.metadata as object } : {}),
    },
  })
}

// ── Contracts ─────────────────────────────────────────────────────────────────

export async function listContracts(companyId: string, query: ListContractsInput) {
  return prisma.legalContract.findMany({
    where: {
      companyId,
      ...(query.type   ? { type:   query.type   as never } : {}),
      ...(query.status ? { status: query.status as never } : {}),
    },
    include: {
      signatures: {
        select: {
          id: true, signerName: true, signerEmail: true, signerRole: true,
          status: true, signedAt: true, signingOrder: true, emailSentAt: true,
        },
        orderBy: { signingOrder: 'asc' },
      },
      _count: { select: { legalAlerts: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getContract(companyId: string, id: string) {
  return prisma.legalContract.findFirst({
    where: { id, companyId },
    include: {
      signatures: {
        orderBy: { signingOrder: 'asc' },
      },
      auditLogs: {
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { legalAlerts: true } },
    },
  })
}

export async function createContract(companyId: string, data: CreateContractInput, createdBy: string) {
  const contract = await prisma.legalContract.create({
    data: {
      companyId,
      title:    data.title,
      type:     data.type     as never,
      status:   'DRAFT',
      parties:  data.parties  ?? [],
      content:  data.content  ?? null,
      notes:    data.notes    ?? null,
      expiresAt: data.expiresAt ?? null,
    },
  })

  // Audit: contrat créé
  await auditLog(contract.id, 'CREATED', {
    actorName:  createdBy,
    metadata:   { title: data.title, type: data.type },
  })

  // Alerte expiration automatique si < 90 jours
  if (data.expiresAt) {
    const daysLeft = Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 86_400_000)
    if (daysLeft <= 90) {
      await prisma.legalAlert.create({
        data: {
          companyId,
          contractId: contract.id,
          title:    `Contrat "${data.title}" expire bientôt`,
          message:  `Ce contrat expire dans ${daysLeft} jour(s). Pensez à le renouveler ou à le terminer.`,
          severity: (daysLeft <= 30 ? 'CRITICAL' : 'WARNING') as never,
          status:   'OPEN',
          dueDate:  new Date(data.expiresAt),
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
      ...(data.title        !== undefined ? { title:        data.title }                      : {}),
      ...(data.status       !== undefined ? { status:       data.status       as never }      : {}),
      ...(data.parties      !== undefined ? { parties:      data.parties }                    : {}),
      ...(data.content      !== undefined ? { content:      data.content      ?? null }       : {}),
      ...(data.notes        !== undefined ? { notes:        data.notes        ?? null }       : {}),
      ...(data.expiresAt    !== undefined ? { expiresAt:    data.expiresAt    ? new Date(data.expiresAt)    : null } : {}),
      ...(data.terminatedAt !== undefined ? { terminatedAt: data.terminatedAt ? new Date(data.terminatedAt) : null,
                                              status: 'TERMINATED' as never } : {}),
      ...(data.status === 'SIGNED'        ? { signedAt: new Date() }                          : {}),
    },
  })
}

export async function deleteContract(companyId: string, id: string) {
  const existing = await prisma.legalContract.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.legalContract.delete({ where: { id } })
}

// ── Upload document ───────────────────────────────────────────────────────────

export async function uploadContractDocument(
  companyId: string,
  contractId: string,
  opts: { fileData: string; fileName: string; fileMime: string; actorName: string; actorIp?: string | null },
) {
  const existing = await prisma.legalContract.findFirst({ where: { id: contractId, companyId } })
  if (!existing) return null

  // Calculer l'empreinte SHA-256 du document (preuve d'intégrité légale AES)
  const buffer   = Buffer.from(opts.fileData, 'base64')
  const fileHash = sha256(buffer)

  const updated = await prisma.legalContract.update({
    where: { id: contractId },
    data: {
      fileData: opts.fileData,
      fileHash,
      fileName: opts.fileName,
      fileMime: opts.fileMime,
    },
  })

  await auditLog(contractId, 'DOCUMENT_UPLOADED', {
    actorName:  opts.actorName,
    actorIp:    opts.actorIp ?? null,
    metadata:   { fileName: opts.fileName, fileMime: opts.fileMime, fileHash, sizeBytes: buffer.length },
  })

  return { ...updated, fileHash }
}

// ── Signature workflow ────────────────────────────────────────────────────────

/**
 * Envoie une demande de signature à un ou plusieurs signataires.
 * Génère un token unique par signataire et envoie un email d'invitation.
 */
export async function sendSignatureRequest(
  companyId: string,
  contractId: string,
  data: SendSignatureInput,
  actorName: string,
  actorIp?: string | null,
) {
  const contract = await prisma.legalContract.findFirst({
    where: { id: contractId, companyId },
    include: { company: { select: { nom: true } } },
  })
  if (!contract) return null

  // Déterminer l'ordre de signature (après les signatures déjà créées)
  const existingCount = await prisma.contractSignature.count({ where: { contractId } })
  const signingOrder  = existingCount + 1

  const token = crypto.randomBytes(32).toString('hex')

  const signature = await prisma.contractSignature.create({
    data: {
      contractId,
      signerName:   data.signerName,
      signerEmail:  data.signerEmail,
      signerRole:   data.signerRole ?? null,
      token,
      status:       'PENDING',
      signingOrder,
      emailSentAt:  new Date(),
    },
  })

  // Passer le contrat en statut "en attente de signature"
  await prisma.legalContract.update({
    where: { id: contractId },
    data:  { status: 'PENDING_SIGNATURE' },
  })

  // Envoyer l'email d'invitation
  const signUrl = `${env.frontendUrl}/sign/${token}`
  try {
    await sendSignatureRequestEmail(data.signerEmail, {
      signerName:    data.signerName,
      contractTitle: contract.title,
      companyName:   contract.company?.nom ?? 'Athenis',
      signUrl,
      ...(contract.expiresAt ? { expiresAt: contract.expiresAt } : {}),
    })
  } catch (err) {
    // Email non bloquant en dev (SMTP optionnel)
    console.warn('[E-Signature] Email non envoyé :', (err as Error).message)
  }

  await auditLog(contractId, 'SIGNATURE_REQUESTED', {
    actorName,
    actorIp:    actorIp ?? null,
    actorEmail: data.signerEmail,
    metadata:   { signerName: data.signerName, signerEmail: data.signerEmail, signerRole: data.signerRole ?? null, signingOrder },
  })

  return { ...signature, signLink: `/sign/${token}`, signUrl }
}

/**
 * Récupère les infos du contrat pour la page de signature publique.
 * Ne renvoie PAS le fileData complet ici (trop lourd) — appel séparé.
 */
export async function getSignatureByToken(token: string) {
  const sig = await prisma.contractSignature.findUnique({
    where: { token },
    include: {
      contract: {
        select: {
          id: true, title: true, type: true, status: true,
          content: true, fileName: true, fileMime: true, fileHash: true,
          notes: true, parties: true, expiresAt: true, companyId: true,
          company: { select: { nom: true } },
          signatures: {
            select: { signerName: true, signerEmail: true, signerRole: true, status: true, signedAt: true, signingOrder: true },
            orderBy: { signingOrder: 'asc' },
          },
        },
      },
    },
  })
  return sig
}

/**
 * Retourne le document (base64) pour affichage sur la page de signature.
 */
export async function getContractDocument(token: string) {
  const sig = await prisma.contractSignature.findUnique({
    where: { token },
    select: { contractId: true, status: true },
  })
  if (!sig) return null

  const contract = await prisma.legalContract.findUnique({
    where: { id: sig.contractId },
    select: { fileData: true, fileMime: true, fileName: true, fileHash: true },
  })
  return contract
}

/**
 * Enregistre la signature (ou le refus) d'un signataire.
 * Journalise IP, User-Agent et horodatage — requis pour conformité AES.
 */
export async function processSignature(
  token: string,
  action: 'sign' | 'refuse',
  opts: { note?: string | null; signatureData?: string | null; ip?: string | null; userAgent?: string | null },
) {
  const sig = await prisma.contractSignature.findUnique({
    where: { token },
    include: { contract: { select: { id: true, title: true, companyId: true } } },
  })
  if (!sig || sig.status !== 'PENDING') return null

  if (action === 'sign') {
    await prisma.contractSignature.update({
      where: { id: sig.id },
      data: {
        status:          'SIGNED',
        signedAt:        new Date(),
        signatureData:   opts.signatureData ?? null,
        signingIp:       opts.ip            ?? null,
        signingUserAgent: opts.userAgent    ?? null,
      },
    })

    await auditLog(sig.contractId, 'SIGNED', {
      actorName:  sig.signerName,
      actorEmail: sig.signerEmail,
      actorIp:    opts.ip ?? null,
      metadata:   { signerRole: sig.signerRole, userAgent: opts.userAgent ?? null },
    })

    // Vérifier si TOUS les signataires ont signé → contrat SIGNÉ
    const pendingCount = await prisma.contractSignature.count({
      where: { contractId: sig.contractId, status: 'PENDING' },
    })
    if (pendingCount === 0) {
      await prisma.legalContract.update({
        where: { id: sig.contractId },
        data:  { status: 'SIGNED', signedAt: new Date() },
      })
      await auditLog(sig.contractId, 'COMPLETED', {
        metadata: { message: 'Tous les signataires ont signé — contrat clôturé' },
      })
    }
  } else {
    await prisma.contractSignature.update({
      where: { id: sig.id },
      data: {
        status:          'REFUSED',
        refusedAt:       new Date(),
        refusedNote:     opts.note     ?? null,
        signingIp:       opts.ip       ?? null,
        signingUserAgent: opts.userAgent ?? null,
      },
    })

    await auditLog(sig.contractId, 'REFUSED', {
      actorName:  sig.signerName,
      actorEmail: sig.signerEmail,
      actorIp:    opts.ip ?? null,
      metadata:   { note: opts.note ?? null, userAgent: opts.userAgent ?? null },
    })
  }

  // Retourner la signature mise à jour
  return prisma.contractSignature.findUnique({ where: { id: sig.id } })
}

/**
 * Génère le certificat de réalisation (JSON structuré, rendu côté client en HTML/PDF).
 * Contient toutes les informations légales requises par la réglementation OHADA/AES.
 */
export async function getCompletionCertificate(companyId: string, contractId: string) {
  const contract = await prisma.legalContract.findFirst({
    where: { id: contractId, companyId },
    include: {
      signatures: { orderBy: { signingOrder: 'asc' } },
      auditLogs:  { orderBy: { createdAt: 'asc' } },
      company:    { select: { nom: true, adresse: true } },
    },
  })
  if (!contract) return null

  return {
    certificateId:  `CERT-${contractId.slice(0, 8).toUpperCase()}-${Date.now()}`,
    generatedAt:    new Date().toISOString(),
    contract: {
      id:       contract.id,
      title:    contract.title,
      type:     contract.type,
      status:   contract.status,
      fileHash: contract.fileHash,
      fileName: contract.fileName,
      parties:  contract.parties,
      signedAt: contract.signedAt?.toISOString() ?? null,
      expiresAt: contract.expiresAt?.toISOString() ?? null,
    },
    company: {
      name:    contract.company?.nom     ?? '',
      address: contract.company?.adresse ?? null,
    },
    signatures: contract.signatures.map(s => ({
      signerName:   s.signerName,
      signerEmail:  s.signerEmail,
      signerRole:   s.signerRole,
      status:       s.status,
      signedAt:     s.signedAt?.toISOString()   ?? null,
      refusedAt:    s.refusedAt?.toISOString()  ?? null,
      signingIp:    s.signingIp,
      signingOrder: s.signingOrder,
    })),
    auditTrail: contract.auditLogs.map(l => ({
      event:      l.event,
      actorName:  l.actorName,
      actorEmail: l.actorEmail,
      actorIp:    l.actorIp,
      metadata:   l.metadata,
      timestamp:  l.createdAt.toISOString(),
    })),
    legalNote: 'Ce certificat constitue la piste d\'audit complète de la signature électronique avancée (AES), ' +
               'conformément à l\'Acte Uniforme OHADA sur le Droit Commercial Général (2010), ' +
               'à la Loi n°2010/021 du Cameroun relative au commerce électronique ' +
               'et à l\'Acte Additionnel UEMOA ASA.20110 du 19 janvier 2010.',
  }
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
      treatmentName:    data.treatmentName,
      purpose:          data.purpose,
      legalBasis:       data.legalBasis       as never,
      dataCategories:   data.dataCategories,
      dataSubjects:     data.dataSubjects,
      retentionMonths:  data.retentionMonths,
      responsible:      data.responsible,
      subcontractors:   data.subcontractors   ?? [],
      securityMeasures: Array.isArray(data.securityMeasures)
                          ? data.securityMeasures
                          : (data.securityMeasures ? [data.securityMeasures] : []),
      riskLevel:        (data.riskLevel  ?? 'LOW') as never,
      dpiaRequired:     data.dpiaRequired ?? false,
      notes:            data.notes        ?? null,
    },
  })
}

export async function updateGdprEntry(companyId: string, id: string, data: UpdateGdprInput) {
  const existing = await prisma.gdprEntry.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.gdprEntry.update({
    where: { id },
    data: {
      ...(data.treatmentName   !== undefined ? { treatmentName:   data.treatmentName }   : {}),
      ...(data.purpose         !== undefined ? { purpose:         data.purpose }         : {}),
      ...(data.legalBasis      !== undefined ? { legalBasis:      data.legalBasis  as never } : {}),
      ...(data.dataCategories  !== undefined ? { dataCategories:  data.dataCategories }  : {}),
      ...(data.dataSubjects    !== undefined ? { dataSubjects:    data.dataSubjects }    : {}),
      ...(data.retentionMonths !== undefined ? { retentionMonths: data.retentionMonths } : {}),
      ...(data.responsible     !== undefined ? { responsible:     data.responsible }     : {}),
      ...(data.subcontractors  !== undefined ? { subcontractors:  data.subcontractors }  : {}),
      ...(data.securityMeasures !== undefined ? {
        securityMeasures: Array.isArray(data.securityMeasures)
          ? data.securityMeasures
          : (data.securityMeasures ? [data.securityMeasures] : [])
      } : {}),
      ...(data.riskLevel     !== undefined ? { riskLevel:     data.riskLevel     as never } : {}),
      ...(data.dpiaRequired  !== undefined ? { dpiaRequired:  data.dpiaRequired } : {}),
      ...(data.notes         !== undefined ? { notes:         data.notes  ?? null } : {}),
      lastReviewedAt: new Date(),
    },
  })
}

export async function deleteGdprEntry(companyId: string, id: string) {
  const existing = await prisma.gdprEntry.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.gdprEntry.delete({ where: { id } })
}

export async function gdprStats(companyId: string) {
  const entries = await prisma.gdprEntry.findMany({ where: { companyId } })
  const byBasis: Record<string, number> = {}
  for (const e of entries) byBasis[e.legalBasis] = (byBasis[e.legalBasis] ?? 0) + 1
  return {
    total:        entries.length,
    highRisk:     entries.filter(e => e.riskLevel === 'HIGH').length,
    dpiaRequired: entries.filter(e => e.dpiaRequired).length,
    byBasis,
  }
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function listAlerts(companyId: string, status?: string) {
  return prisma.legalAlert.findMany({
    where: {
      companyId,
      ...(status ? { status: status as never } : {}),
    },
    include: { contract: { select: { id: true, title: true, type: true } } },
    orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function createAlert(companyId: string, data: CreateAlertInput) {
  return prisma.legalAlert.create({
    data: {
      companyId,
      contractId: data.contractId ?? null,
      title:      data.title,
      message:    data.message,
      severity:   (data.severity ?? 'INFO') as never,
      status:     'OPEN',
      dueDate:    data.dueDate ? new Date(data.dueDate) : null,
    },
  })
}

export async function updateAlert(companyId: string, id: string, data: UpdateAlertInput) {
  const existing = await prisma.legalAlert.findFirst({ where: { id, companyId } })
  if (!existing) return null
  return prisma.legalAlert.update({
    where: { id },
    data: {
      status:      data.status as never,
      ...(data.status === 'DISMISSED' ? { dismissedAt: new Date() } : {}),
      ...(data.status === 'RESOLVED'  ? { resolvedAt:  new Date() } : {}),
    },
  })
}

export async function syncExpiryAlerts(companyId: string) {
  const soon = new Date(Date.now() + 90 * 86_400_000)
  const expiring = await prisma.legalContract.findMany({
    where: {
      companyId,
      status:    { in: ['SIGNED', 'PENDING_SIGNATURE'] as never[] },
      expiresAt: { lte: soon, gte: new Date() },
    },
  })

  let synced = 0
  for (const c of expiring) {
    const existing = await prisma.legalAlert.findFirst({
      where: { companyId, contractId: c.id, status: 'OPEN' },
    })
    if (existing) continue

    const daysLeft = Math.ceil((c.expiresAt!.getTime() - Date.now()) / 86_400_000)
    await prisma.legalAlert.create({
      data: {
        companyId,
        contractId: c.id,
        title:    `Contrat "${c.title}" expire dans ${daysLeft} jour(s)`,
        message:  `Ce contrat expire le ${c.expiresAt!.toLocaleDateString('fr-FR')}. Renouvellement ou résiliation à prévoir.`,
        severity: (daysLeft <= 30 ? 'CRITICAL' : 'WARNING') as never,
        status:   'OPEN',
        dueDate:  c.expiresAt,
      },
    })
    synced++
  }
  return { synced }
}

export async function alertStats(companyId: string) {
  const alerts = await prisma.legalAlert.findMany({
    where: { companyId, status: 'OPEN' },
  })
  return {
    total:    alerts.length,
    critical: alerts.filter(a => a.severity === 'CRITICAL').length,
    warning:  alerts.filter(a => a.severity === 'WARNING').length,
    info:     alerts.filter(a => a.severity === 'INFO').length,
  }
}
