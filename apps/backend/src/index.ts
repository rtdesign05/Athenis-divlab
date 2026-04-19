import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { logger } from './lib/logger.js'

async function main() {
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
