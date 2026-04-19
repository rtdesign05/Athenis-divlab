import type { Request, Response, NextFunction } from 'express'
import { ZodError, type ZodSchema } from 'zod'

interface Schemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export function validateRequest(schemas: Schemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body)
      if (schemas.query) req.query = schemas.query.parse(req.query)
      if (schemas.params) req.params = schemas.params.parse(req.params)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        const details: Record<string, string[]> = {}
        for (const issue of err.issues) {
          const key = issue.path.join('.') || 'root'
          ;(details[key] ??= []).push(issue.message)
        }
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        })
        return
      }
      next(err)
    }
  }
}
