import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateReviewInput, UpdateReviewInput, ListReviewsInput } from './reviews.dto.js'

// AnnualReview model does not exist in v2 schema — use in-memory store
interface AnnualReview {
  id: string; companyId: string; employeeId: string; year: number
  scheduledAt: Date | null; completedAt: Date | null; reviewedAt: Date | null; reviewerId: string | null
  status: string; rating: number | null; strengths: string | null; improvements: string | null
  objectives: unknown[]; notes: string | null; createdAt: Date; updatedAt: Date
}
const reviewStore = new Map<string, AnnualReview>()
let seq = 0
function genId() { return `REV-${++seq}-${Date.now()}` }

async function withEmployee(review: AnnualReview) {
  const employee = await prisma.employee.findUnique({
    where: { id: review.employeeId },
    select: { id: true, nom: true, prenom: true, email: true },
  })
  return { ...review, employee }
}

export async function listReviews(companyId: string, query: ListReviewsInput) {
  const { employeeId, year, status } = query
  const all = [...reviewStore.values()]
    .filter(r => r.companyId === companyId
      && (!employeeId || r.employeeId === employeeId)
      && (!year       || r.year === year)
      && (!status     || r.status === status))
    .sort((a, b) => b.year - a.year || b.updatedAt.getTime() - a.updatedAt.getTime())
  return Promise.all(all.map(withEmployee))
}

export async function getReview(companyId: string, id: string) {
  const review = reviewStore.get(id)
  if (!review || review.companyId !== companyId)
    throw new AppError('Review not found', 404, 'NOT_FOUND')
  return review
}

export async function createReview(companyId: string, data: CreateReviewInput) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')

  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null
  const year = scheduledAt ? scheduledAt.getFullYear() : new Date().getFullYear()

  const existing = [...reviewStore.values()].find(
    r => r.companyId === companyId && r.employeeId === data.employeeId && r.year === year
  )
  if (existing) throw new AppError('Review already exists for this employee and year', 409, 'REVIEW_EXISTS')

  const id = genId()
  const now = new Date()
  const review: AnnualReview = {
    id, companyId,
    employeeId:  data.employeeId,
    year,
    scheduledAt,
    completedAt: null, reviewedAt: null, reviewerId: null,
    notes:       data.notes ?? null,
    objectives:  [],
    status:      scheduledAt ? 'SCHEDULED' : 'DRAFT',
    rating: null, strengths: null, improvements: null,
    createdAt: now, updatedAt: now,
  }
  reviewStore.set(id, review)
  return withEmployee(review)
}

export async function updateReview(companyId: string, id: string, data: UpdateReviewInput) {
  await getReview(companyId, id)
  const existing = reviewStore.get(id)!

  const updated: AnnualReview = {
    ...existing,
    ...(data.rating       !== undefined ? { rating:       data.rating ?? null }       : {}),
    ...(data.strengths    !== undefined ? { strengths:    data.strengths ?? null }    : {}),
    ...(data.improvements !== undefined ? { improvements: data.improvements ?? null } : {}),
    ...(data.objectives   !== undefined ? { objectives:   data.objectives }           : {}),
    ...(data.status       !== undefined ? { status:       data.status,
      ...(data.status === 'COMPLETED' ? { reviewedAt: new Date(), completedAt: new Date() } : {}) } : {}),
    ...(data.scheduledAt  !== undefined ? { scheduledAt:  data.scheduledAt ? new Date(data.scheduledAt) : null } : {}),
    ...(data.completedAt  !== undefined ? { completedAt:  data.completedAt ? new Date(data.completedAt) : null } : {}),
    ...(data.reviewerId   !== undefined ? { reviewerId:   data.reviewerId ?? null }   : {}),
    ...(data.notes        !== undefined ? { notes:        data.notes ?? null }        : {}),
    updatedAt: new Date(),
  }
  reviewStore.set(id, updated)
  return withEmployee(updated)
}

export async function deleteReview(companyId: string, id: string) {
  const review = await getReview(companyId, id)
  if (review.status === 'COMPLETED')
    throw new AppError('Cannot delete a completed review', 409, 'REVIEW_COMPLETED')
  reviewStore.delete(id)
}
