import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateReviewInput, UpdateReviewInput, ListReviewsInput } from './reviews.dto.js'

const EMP_SELECT = { id: true, firstName: true, lastName: true, email: true }

export async function listReviews(companyId: string, query: ListReviewsInput) {
  const { employeeId, year, status } = query
  const items = await prisma.annualReview.findMany({
    where: {
      companyId,
      ...(employeeId ? { employeeId } : {}),
      ...(year       ? { year }       : {}),
      ...(status     ? { status }     : {}),
    },
    include: { employee: { select: EMP_SELECT } },
    orderBy: [{ year: 'desc' }, { updatedAt: 'desc' }],
  })
  return items
}

export async function getReview(companyId: string, id: string) {
  const review = await prisma.annualReview.findUnique({
    where: { id },
    include: { employee: { select: EMP_SELECT } },
  })
  if (!review || review.companyId !== companyId)
    throw new AppError('Review not found', 404, 'NOT_FOUND')
  return review
}

export async function createReview(companyId: string, data: CreateReviewInput) {
  const employee = await prisma.employee.findUnique({ where: { id: data.employeeId } })
  if (!employee || employee.companyId !== companyId)
    throw new AppError('Employee not found', 404, 'NOT_FOUND')

  const existing = await prisma.annualReview.findUnique({
    where: { companyId_employeeId_year: { companyId, employeeId: data.employeeId, year: data.year } },
  })
  if (existing) throw new AppError('Review already exists for this employee and year', 409, 'REVIEW_EXISTS')

  return prisma.annualReview.create({
    data: {
      companyId,
      employeeId:   data.employeeId,
      year:         data.year,
      rating:       data.rating       ?? null,
      strengths:    data.strengths    ?? null,
      improvements: data.improvements ?? null,
      objectives:   data.objectives   ?? [],
      status:       'DRAFT',
    },
    include: { employee: { select: EMP_SELECT } },
  })
}

export async function updateReview(companyId: string, id: string, data: UpdateReviewInput) {
  await getReview(companyId, id)
  return prisma.annualReview.update({
    where: { id },
    data: {
      ...(data.rating       !== undefined ? { rating:       data.rating       ?? null } : {}),
      ...(data.strengths    !== undefined ? { strengths:    data.strengths    ?? null } : {}),
      ...(data.improvements !== undefined ? { improvements: data.improvements ?? null } : {}),
      ...(data.objectives   !== undefined ? { objectives:   data.objectives }           : {}),
      ...(data.status       !== undefined ? { status:       data.status,
                                              reviewedAt:   data.status === 'COMPLETED' ? new Date() : null } : {}),
    },
    include: { employee: { select: EMP_SELECT } },
  })
}

export async function deleteReview(companyId: string, id: string) {
  const review = await getReview(companyId, id)
  if (review.status === 'COMPLETED')
    throw new AppError('Cannot delete a completed review', 409, 'REVIEW_COMPLETED')
  await prisma.annualReview.delete({ where: { id } })
}
