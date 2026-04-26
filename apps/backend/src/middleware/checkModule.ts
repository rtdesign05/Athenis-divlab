import type { Request, Response, NextFunction } from 'express'
import type { Module } from '@athenis/shared-types'
import { MODULE_ROLE_ACCESS, type Action } from '../lib/plans.js'
import { prisma } from '../lib/prisma.js'
import { logger } from '../lib/logger.js'

declare global {
  namespace Express {
    interface Request {
      clientCompanyId?: string
    }
  }
}

/**
 * Middleware that enforces module access in order:
 * 1. User authenticated
 * 2. Module in user's JWT modules list (plan check)
 * 3. Role has permission for the action
 * 4. Cabinet users: verify active mandat covers the module
 */
export function checkModule(module: Module, action: Action = 'read') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    // 1. PERSONAL accounts have no business modules
    if (user.accountType === 'PERSONAL') {
      res.status(403).json({
        success: false,
        error: 'Personal accounts cannot access business modules',
        code: 'WRONG_ACCOUNT_TYPE',
      })
      return
    }

    // 2. Module must be in the user's plan
    if (!user.modules.includes(module)) {
      res.status(403).json({
        success: false,
        error: `Module '${module}' is not included in your plan`,
        code: 'MODULE_NOT_AVAILABLE',
      })
      return
    }

    // 3. Role must allow the action
    const allowedActions = MODULE_ROLE_ACCESS[user.role]?.[module] ?? []
    if (!allowedActions.includes(action)) {
      res.status(403).json({
        success: false,
        error: `Insufficient permissions for '${action}' on '${module}'`,
        code: 'FORBIDDEN',
      })
      return
    }

    // 4. Cabinet mode: check X-Client-Company header + active mandat
    if (user.accountType === 'CABINET') {
      const companyId = req.headers['x-client-company']
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!companyId || typeof companyId !== 'string' || !UUID_RE.test(companyId)) {
        res.status(400).json({
          success: false,
          error: 'Missing or invalid X-Client-Company header for cabinet mode',
          code: 'MISSING_COMPANY_CONTEXT',
        })
        return
      }

      const mandat = await prisma.mandat
        .findUnique({
          where: { cabinetId_companyId: { cabinetId: user.cabinetId!, companyId } },
          select: { isActive: true, modules: true },
        })
        .catch((e: unknown) => {
          logger.error('Mandat lookup failed', { e })
          return null
        })

      if (!mandat?.isActive) {
        res.status(403).json({
          success: false,
          error: 'No active mandate for this company',
          code: 'NO_MANDAT',
        })
        return
      }

      if (!mandat.modules.includes(module)) {
        res.status(403).json({
          success: false,
          error: `Mandate does not cover module '${module}'`,
          code: 'MANDAT_MODULE_NOT_COVERED',
        })
        return
      }

      req.clientCompanyId = companyId
    }

    next()
  }
}
