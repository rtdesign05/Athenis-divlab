/**
 * Reset all demo/seed account passwords to Demo1234!
 * and unlock any locked accounts.
 *
 * Usage: node prisma/reset-demo-passwords.mjs
 * Or:    npm run seed:reset-passwords
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_PASSWORD = 'Demo1234!'
const BCRYPT_ROUNDS = 12

const DEMO_EMAILS = [
  'superadmin@athenis.io',
  'demo@athenis.io',
  'comptable@nexoria.cm',
  'commercial.yde@nexoria.cm',
  'ubm@comptalia.fr',
  'rh@ubm.cm',
  'cabinet@athenis.io',
  'collab@fontaine-associes.cm',
  'delta@athenis.io',
]

console.log(`🔑 Resetting demo passwords to "${DEMO_PASSWORD}"...\n`)

const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS)

let resetCount = 0
for (const email of DEMO_EMAILS) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } })
  if (!user) {
    console.log(`  ⚠️  ${email.padEnd(40)} not found — skipping`)
    continue
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      failedAttempts: 0,
      lockedUntil: null,
      isActive: true,
    },
  })
  // Revoke all existing refresh tokens so sessions are cleanly invalidated
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  console.log(`  ✅  ${email}`)
  resetCount++
}

console.log(`\n✔  ${resetCount} accounts reset. Use "${DEMO_PASSWORD}" to log in.\n`)
await prisma.$disconnect()
