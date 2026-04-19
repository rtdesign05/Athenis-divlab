import type { Request } from 'express'
import { AppError } from '../middleware/errorHandler.js'

export function getCompanyId(req: Request): string {
  const id = req.user?.accountType === 'CABINET' ? req.clientCompanyId : req.user?.companyId
  if (!id) throw new AppError('Company context missing', 400, 'MISSING_COMPANY')
  return id
}
