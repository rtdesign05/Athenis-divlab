import { rateLimit } from 'express-rate-limit'

/** Strict limiter for auth endpoints — brute-force protection */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again in 15 minutes.',
    code: 'RATE_LIMITED',
  },
})

/** Moderate limiter for sensitive operations (password reset, TOTP setup) */
export const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests for this operation. Please try again in 1 hour.',
    code: 'RATE_LIMITED',
  },
})

/** General API limiter */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  },
})

/**
 * N22 : limiter pour endpoints qui consomment des ressources externes coûteuses
 *       (Anthropic API). Sans ça, un user authentifié pourrait facturer
 *       indéfiniment l'API LLM via /ai/chat.
 *       30 messages / heure / IP = ~720 / jour = très généreux pour un humain.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Limite de messages IA atteinte. Réessayez dans 1 heure.',
    code: 'AI_RATE_LIMITED',
  },
})
