import type { Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import jwt from 'jsonwebtoken'
import { ZodError } from 'zod'
import { logger } from '../lib/logger.js'
import { Sentry } from '../lib/sentry.js'

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

function serializeError(err: unknown): { message: string; name?: string; stack?: string; code?: string } {
  if (err instanceof Error) {
    const out: { message: string; name?: string; stack?: string; code?: string } = {
      message: err.message || '(no message)',
      name: err.name,
    }
    if (err.stack !== undefined) out.stack = err.stack
    if ('code' in err && typeof (err as { code?: unknown }).code === 'string') {
      out.code = (err as { code: string }).code
    }
    return out
  }
  if (typeof err === 'string') return { message: err }
  if (typeof err === 'object' && err !== null) {
    const o = err as Record<string, unknown>
    return { message: String(o['message'] ?? o['msg'] ?? JSON.stringify(err)) }
  }
  return { message: String(err) }
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // 1. AppError — erreurs métier connues
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('AppError 5xx', { message: err.message, code: err.code, path: req.path })
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
    })
    return
  }

  // 2. Prisma — contrainte unique / enregistrement introuvable
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.warn('Prisma known error', { code: err.code, meta: err.meta, path: req.path })
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, error: 'Cette valeur existe déjà', code: 'CONFLICT' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, error: 'Ressource introuvable', code: 'NOT_FOUND' })
      return
    }
    res.status(400).json({ success: false, error: 'Erreur base de données', code: err.code })
    return
  }

  // 3. Prisma — données invalides
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.warn('Prisma validation error', { message: err.message, path: req.path })
    res.status(400).json({ success: false, error: 'Données invalides', code: 'VALIDATION_ERROR' })
    return
  }

  // 4. JWT
  if (err instanceof jwt.TokenExpiredError) {
    res.status(401).json({ success: false, error: 'Session expirée', code: 'TOKEN_EXPIRED' })
    return
  }
  if (err instanceof jwt.JsonWebTokenError) {
    res.status(401).json({ success: false, error: 'Token invalide', code: 'TOKEN_INVALID' })
    return
  }

  // 5. Zod (validation non interceptée)
  if (err instanceof ZodError) {
    const details: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const key = issue.path.join('.') || 'root'
      ;(details[key] ??= []).push(issue.message)
    }
    res.status(422).json({ success: false, error: 'Validation échouée', code: 'VALIDATION_ERROR', details })
    return
  }

  // 6. Toute autre erreur — jamais d'objet vide dans les logs
  const info = serializeError(err)
  logger.error('Unhandled error', { ...info, path: req.path, method: req.method })
  // Capture dans Sentry (no-op si DSN absent)
  if (process.env['SENTRY_DSN']) Sentry.captureException(err)
  res.status(500).json({
    success: false,
    error: process.env['NODE_ENV'] === 'production' ? 'Erreur interne du serveur' : (info.message),
    code: 'INTERNAL_SERVER_ERROR',
  })
}

export function notFound(req: Request, res: Response): void {
  res.status(404).json({ success: false, error: `Cannot ${req.method} ${req.path}` })
}
