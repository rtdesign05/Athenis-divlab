import { z } from 'zod'

// ── Shared enums (must match Prisma schema) ───────────────────────────────────
const ContractTypeEnum   = z.enum(['EMPLOYMENT','SERVICE','NDA','PARTNERSHIP','LEASE','SUPPLIER','CLIENT','OTHER'])
const ContractStatusEnum = z.enum(['DRAFT','PENDING_SIGNATURE','SIGNED','EXPIRED','TERMINATED'])

const ContractPartySchema = z.object({
  name:  z.string().min(1),
  email: z.string().email(),
  role:  z.string().optional(),
})

// ── Contracts ─────────────────────────────────────────────────────────────────

export const CreateContractDto = z.object({
  title:     z.string().min(1),
  type:      ContractTypeEnum,
  parties:   z.array(ContractPartySchema).min(1),
  content:   z.string().optional(),
  fileUrl:   z.string().url().optional(),
  expiresAt: z.coerce.date().optional(),
  notes:     z.string().optional(),
})

export const UpdateContractDto = z.object({
  title:        z.string().min(1).optional(),
  status:       ContractStatusEnum.optional(),
  parties:      z.array(ContractPartySchema).optional(),
  content:      z.string().optional(),
  fileUrl:      z.string().url().optional(),
  expiresAt:    z.coerce.date().optional(),
  terminatedAt: z.coerce.date().optional(),
  notes:        z.string().optional(),
})

export const ListContractsDto = z.object({
  type:   ContractTypeEnum.optional(),
  status: ContractStatusEnum.optional(),
})

export const SendSignatureDto = z.object({
  signerName:  z.string().min(1),
  signerEmail: z.string().email(),
  signerRole:  z.string().optional(),
})

// ── GDPR ──────────────────────────────────────────────────────────────────────

export const CreateGdprDto = z.object({
  treatmentName:   z.string().min(1),
  purpose:         z.string().min(1),
  legalBasis:      z.enum(['CONSENT','CONTRACT','LEGAL_OBLIGATION','VITAL_INTEREST','PUBLIC_TASK','LEGITIMATE_INTEREST']),
  dataCategories:  z.array(z.string()).min(1),
  dataSubjects:    z.array(z.string()).min(1),
  retentionMonths: z.number().int().positive(),
  responsible:     z.string().min(1),
  subcontractors:  z.array(z.string()).default([]),
  securityMeasures: z.array(z.string()).default([]),
  riskLevel:       z.enum(['LOW','MEDIUM','HIGH']).default('LOW'),
  dpiaRequired:    z.boolean().default(false),
  notes:           z.string().optional(),
})

export const UpdateGdprDto = CreateGdprDto.partial()

// ── Alerts ────────────────────────────────────────────────────────────────────

export const CreateAlertDto = z.object({
  title:      z.string().min(1),
  message:    z.string().min(1),
  severity:   z.enum(['INFO','WARNING','CRITICAL']).default('INFO'),
  dueDate:    z.coerce.date().optional(),
  contractId: z.string().optional(),
})

export const UpdateAlertDto = z.object({
  status: z.enum(['OPEN','DISMISSED','RESOLVED']),
})

export type CreateContractInput   = z.infer<typeof CreateContractDto>
export type UpdateContractInput   = z.infer<typeof UpdateContractDto>
export type ListContractsInput    = z.infer<typeof ListContractsDto>
export type SendSignatureInput    = z.infer<typeof SendSignatureDto>
export type CreateGdprInput       = z.infer<typeof CreateGdprDto>
export type UpdateGdprInput       = z.infer<typeof UpdateGdprDto>
export type CreateAlertInput      = z.infer<typeof CreateAlertDto>
export type UpdateAlertInput      = z.infer<typeof UpdateAlertDto>
