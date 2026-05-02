import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'
import type { JwtPayload } from '@athenis/shared-types'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers['authorization']
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization header' })
    return
  }

  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload

    // Verify user is still active in DB — catches revocations between token refresh cycles
    // Only for company/cabinet users (personal users have no companyMember row)
    if (payload.sub) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: { isActive: true },
        })
        if (!user || !user.isActive) {
          res.status(403).json({ success: false, error: 'Compte désactivé', code: 'ACCOUNT_INACTIVE' })
          return
        }
      } catch {
        // DB unavailable — fail closed to prevent disabled accounts from accessing the API
        res.status(503).json({ success: false, error: 'Service temporairement indisponible', code: 'DB_UNAVAILABLE' })
        return
      }
    }

    // Agences don't exist in WSL2 — set empty defaults
    payload.agenceIds    = payload.agenceIds    ?? []
    payload.isRestricted = payload.isRestricted ?? false
    payload.agenceNom    = payload.agenceNom    ?? null

    req.user = payload
    next()
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'
    res.status(401).json({ success: false, error: message, code: 'TOKEN_INVALID' })
  }
}
