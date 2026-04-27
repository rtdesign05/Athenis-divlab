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

    // Enrich with agence membership for company users
    if (payload.companyId && payload.sub) {
      try {
        const member = await prisma.companyMember.findUnique({
          where: { userId: payload.sub },
          include: {
            agences: {
              select: { agenceId: true, isRestricted: true },
            },
          },
        })
        if (member && member.agences.length > 0) {
          payload.agenceIds = member.agences.map((a) => a.agenceId)
          payload.isRestricted = member.agences.some((a) => a.isRestricted)
        } else {
          payload.agenceIds = []
          payload.isRestricted = false
        }
      } catch {
        // DB unavailable — degrade gracefully (no restriction)
        payload.agenceIds = []
        payload.isRestricted = false
      }
    } else {
      payload.agenceIds = payload.agenceIds ?? []
      payload.isRestricted = payload.isRestricted ?? false
    }

    req.user = payload
    next()
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'
    res.status(401).json({ success: false, error: message, code: 'TOKEN_INVALID' })
  }
}
