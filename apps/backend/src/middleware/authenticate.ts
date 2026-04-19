import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import type { JwtPayload } from '@athenis/shared-types'

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers['authorization']
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing authorization header' })
    return
  }

  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload
    req.user = payload
    next()
  } catch (err) {
    const message = err instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'
    res.status(401).json({ success: false, error: message, code: 'TOKEN_INVALID' })
  }
}
