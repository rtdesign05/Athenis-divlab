import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './config/env.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import { router } from './routes/index.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { logger } from './lib/logger.js'

export function createApp() {
  const app = express()

  app.set('trust proxy', 1)

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: env.nodeEnv === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: env.nodeEnv === 'production',
      hsts: env.nodeEnv === 'production' ? { maxAge: 31_536_000, includeSubDomains: true } : false,
    }),
  )

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = [env.frontendUrl]
        if (!origin || allowed.includes(origin)) return cb(null, true)
        cb(new Error(`CORS: origin ${origin} not allowed`))
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Company'],
      exposedHeaders: ['X-Request-Id'],
    }),
  )

  // ── Request ID for tracing ────────────────────────────────────────────────
  app.use((req, res, next) => {
    const id = Math.random().toString(36).slice(2)
    req.headers['x-request-id'] = id
    res.setHeader('X-Request-Id', id)
    next()
  })

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: false, limit: '1mb' }))
  app.use(cookieParser())

  // ── Rate limiting ─────────────────────────────────────────────────────────
  app.use('/api', apiLimiter)

  // ── Request logging ───────────────────────────────────────────────────────
  if (env.nodeEnv !== 'test') {
    app.use((req, _res, next) => {
      logger.debug(`${req.method} ${req.path}`)
      next()
    })
  }

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use('/api', router)

  // ── Error handling ────────────────────────────────────────────────────────
  app.use(notFound)
  app.use(errorHandler)

  return app
}
