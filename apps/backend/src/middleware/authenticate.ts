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
        if (user && !user.isActive) {
          res.status(403).json({ success: false, error: 'Compte désactivé', code: 'ACCOUNT_INACTIVE' })
          return
        }
      } catch {
        // DB unavailable — allow request (fail-open for availability)
      }
    }

    // Enrich with agence membership for company users
    if (payload.companyId && payload.sub) {
      try {
        const member = await prisma.companyMember.findUnique({
          where: { userId: payload.sub },
          include: {
            agences: {
              select: {
                agenceId:     true,
                isRestricted: true,
                agence:       { select: { nom: true } },
              },
            },
          },
        })
        if (member && member.agences.length > 0) {
          payload.agenceIds    = member.agences.map((a) => a.agenceId)
          payload.isRestricted = member.agences.some((a) => a.isRestricted)

          // Popule agenceNom avec l'agence principale de l'utilisateur restreint
          // → permet aux pages Gestion de filtrer sans re-login
          if (payload.isRestricted) {
            const primary     = member.agences.find((a) => a.isRestricted) ?? member.agences[0]
            payload.agenceNom = primary?.agence?.nom ?? null
          } else {
            payload.agenceNom = null // admin → voit tout
          }
        } else {
          payload.agenceIds    = []
          payload.isRestricted = false
          payload.agenceNom    = null
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
