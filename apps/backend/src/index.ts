import { initSentry } from './lib/sentry.js'
initSentry() // doit être appelé avant tout autre import Sentry

import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { logger } from './lib/logger.js'

async function main() {
  // ── Startup warnings ────────────────────────────────────────────────────────
  if (!env.smtpHost) {
    const msg = env.nodeEnv === 'production'
      ? 'SMTP_HOST is not configured — transactional emails will NOT be delivered. Set SMTP_HOST, SMTP_USER, SMTP_PASS in your environment.'
      : 'SMTP not configured — emails will be logged to console only (development mode).'
    logger.warn(msg)
  }

  if (env.nodeEnv === 'production' && env.frontendUrl === 'http://localhost:5173') {
    logger.warn('FRONTEND_URL is set to localhost — CORS will block all browser requests. Set FRONTEND_URL to your production domain.')
  }

  const app = createApp()

  app.listen(env.port, () => {
    logger.info(`Athenis backend running`, { port: env.port, env: env.nodeEnv })
  })

  prisma
    .$connect()
    .then(() => logger.info('Database connected'))
    .catch((err: unknown) =>
      logger.warn('Database unavailable — start PostgreSQL', { error: (err as Error).message }),
    )
}

main().catch((err) => {
  logger.error('Failed to start server', { err })
  process.exit(1)
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
