function require(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}


export const env = {
  nodeEnv: (process.env['NODE_ENV'] ?? 'development') as 'development' | 'production' | 'test',
  port: parseInt(process.env['PORT'] ?? '3001', 10),
  databaseUrl: require('DATABASE_URL'),
  jwtSecret: require('JWT_SECRET'),
  jwtRefreshSecret: require('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
  jwtRefreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
  encryptionKey: require('ENCRYPTION_KEY'),
  totpIssuer: process.env['TOTP_ISSUER'] ?? 'Athenis',
  frontendUrl: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
  rateLimitWindowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] ?? '900000', 10),
  rateLimitMax: parseInt(process.env['RATE_LIMIT_MAX'] ?? '100', 10),
  // Email / SMTP (optional — if not set, mails are logged to console in dev)
  smtpHost: process.env['SMTP_HOST'] ?? '',
  smtpPort: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
  smtpSecure: process.env['SMTP_SECURE'] === 'true',
  smtpUser: process.env['SMTP_USER'] ?? '',
  smtpPass: process.env['SMTP_PASS'] ?? '',
  smtpFrom: process.env['SMTP_FROM'] ?? 'Athenis <noreply@athenis.io>',
} as const

export type Env = typeof env
