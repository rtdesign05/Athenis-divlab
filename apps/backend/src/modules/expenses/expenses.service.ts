import { Prisma, type ExpenseCategory } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/errorHandler.js'
import type { CreateExpenseInput, UpdateExpenseInput, ListExpensesInput } from './expenses.dto.js'

export async function listExpenses(companyId: string, query: ListExpensesInput) {
  const { page, limit, category, from, to } = query
  const where: Prisma.ExpenseWhereInput = {
    companyId,
    ...(category ? { category: category as ExpenseCategory } : {}),
    ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  }
  const [items, total] = await Promise.all([
    prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.expense.count({ where }),
  ])
  return { items, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function getExpense(companyId: string, id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } })
  if (!expense || expense.companyId !== companyId)
    throw new AppError('Expense not found', 404, 'NOT_FOUND')
  return expense
}

export async function createExpense(companyId: string, data: CreateExpenseInput, _createdBy: string) {
  return prisma.expense.create({
    data: {
      companyId,
      category:    data.category as ExpenseCategory,
      description: data.description ?? '',
      date:        data.date,
      amount:      new Prisma.Decimal(data.amount),
    },
  })
}

export async function updateExpense(companyId: string, id: string, data: UpdateExpenseInput) {
  await getExpense(companyId, id)
  return prisma.expense.update({
    where: { id },
    data: {
      ...(data.category    !== undefined ? { category: data.category as ExpenseCategory } : {}),
      ...(data.description !== undefined ? { description: data.description ?? '' }   : {}),
      ...(data.date        !== undefined ? { date: data.date }                      : {}),
      ...(data.amount      != null       ? { amount: new Prisma.Decimal(data.amount) } : {}),
    },
  })
}

export async function deleteExpense(companyId: string, id: string) {
  await getExpense(companyId, id)
  await prisma.expense.delete({ where: { id } })
}

export async function expenseStats(companyId: string, from?: Date, to?: Date) {
  const dateFilter = from || to
    ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
    : {}

  const [byCategory, total] = await Promise.all([
    prisma.expense.groupBy({
      by: ['category'],
      where: { companyId, ...dateFilter },
      _count: true,
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.expense.aggregate({
      where: { companyId, ...dateFilter },
      _sum: { amount: true },
      _count: true,
    }),
  ])
  return { byCategory, total }
}
