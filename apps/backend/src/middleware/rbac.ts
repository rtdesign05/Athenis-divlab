import type { Request, Response, NextFunction } from 'express'
import type { UserRole, AccountType, Module } from '@athenis/shared-types'
import { MODULE_ROLE_ACCESS, type Action } from '../lib/plans.js'

/** Restrict to specific roles (OR logic) */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role as UserRole | undefined
    if (!req.user || !role || !roles.includes(role)) {
      res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' })
      return
    }
    next()
  }
}

/** Restrict to specific account types */
export function requireAccountType(...types: AccountType[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const at = req.user?.accountType as AccountType | undefined
    if (!req.user || !at || !types.includes(at)) {
      res.status(403).json({ success: false, error: 'Forbidden', code: 'FORBIDDEN' })
      return
    }
    next()
  }
}

/** Check that the user's role allows the given action on a module */
export function canDo(module: Module, action: Action) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }

    const role = req.user.role as UserRole
    const allowedActions = MODULE_ROLE_ACCESS[role]?.[module] ?? []

    if (!allowedActions.includes(action)) {
      res.status(403).json({
        success: false,
        error: `Role ${role} cannot perform '${action}' on module '${module}'`,
        code: 'FORBIDDEN',
      })
      return
    }

    next()
  }
}
