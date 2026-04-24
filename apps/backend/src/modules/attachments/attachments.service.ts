import fs from 'fs'
import path from 'path'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'

const UPLOADS_DIR = process.env['UPLOADS_DIR'] ?? './uploads'
const MAX_FILE_SIZE = parseInt(process.env['MAX_FILE_SIZE'] ?? '10485760', 10)
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
])

export function getUploadsDir(): string {
  const dir = path.resolve(UPLOADS_DIR)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

export function validateFile(mimeType: string, size: number) {
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new AppError('Type de fichier non autorisé', 415, 'INVALID_FILE_TYPE')
  }
  if (size > MAX_FILE_SIZE) {
    throw new AppError('Fichier trop volumineux (max 10 Mo)', 413, 'FILE_TOO_LARGE')
  }
}

export async function listAttachments(companyId: string, opts: {
  invoiceId?: string
  expenseId?: string
}) {
  return prisma.attachment.findMany({
    where: {
      companyId,
      ...(opts.invoiceId ? { invoiceId: opts.invoiceId } : {}),
      ...(opts.expenseId ? { expenseId: opts.expenseId } : {}),
    },
    orderBy: { uploadedAt: 'asc' },
  })
}

export async function createAttachment(data: {
  companyId:  string
  uploadedBy: string
  fileName:   string
  fileSize:   number
  mimeType:   string
  storageKey: string
  invoiceId?: string
  expenseId?: string
}) {
  return prisma.attachment.create({ data })
}

export async function getAttachment(id: string, companyId: string) {
  const att = await prisma.attachment.findUnique({ where: { id } })
  if (!att || att.companyId !== companyId) {
    throw new AppError('Pièce justificative introuvable', 404, 'NOT_FOUND')
  }
  return att
}

export async function deleteAttachment(id: string, companyId: string) {
  const att = await getAttachment(id, companyId)
  const filePath = path.join(getUploadsDir(), att.storageKey)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  await prisma.attachment.delete({ where: { id } })
}

export function buildFileUrl(storageKey: string): string {
  return `/api/attachments/${storageKey}/file`
}
