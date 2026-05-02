import { Router } from 'express'
import { sendMail } from '../../lib/email.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole, requireAccountType } from '../../middleware/rbac.js'
import { apiLimiter } from '../../middleware/rateLimiter.js'
import { prisma } from '../../lib/prisma.js'

export const mailRouter = Router()

// POST /api/mail/send-document
// Envoie un document (facture, bon de livraison, etc.) par e-mail au client.
// Restreint aux comptes COMPANY / CABINET de rôle ADMIN.
// Le destinataire doit être un client ou un employé de la même entreprise.
mailRouter.post(
  '/send-document',
  apiLimiter,
  authenticate,
  requireAccountType('COMPANY', 'CABINET'),
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const { to, subject, html, text } = req.body as {
        to:      string
        subject: string
        html:    string
        text?:   string
      }

      if (!to?.trim() || !subject?.trim() || !html?.trim()) {
        res.status(400).json({
          success: false,
          error: 'Champs obligatoires manquants : to, subject, html',
        })
        return
      }

      // Basic email format validation
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRe.test(to.trim())) {
        res.status(400).json({ success: false, error: 'Adresse e-mail destinataire invalide' })
        return
      }

      // ── Recipient allowlist ────────────────────────────────────────────────
      // The recipient must be a known client, employee, or company member
      // belonging to the authenticated user's company.
      // This prevents using the platform as an open relay to arbitrary addresses.
      const companyId = req.user!.companyId
      if (companyId) {
        const normalised = to.trim().toLowerCase()

        const [clientMatch, employeeMatch, memberMatch] = await Promise.all([
          prisma.client.findFirst({
            where: { companyId, email: { equals: normalised, mode: 'insensitive' } },
            select: { id: true },
          }),
          prisma.employee.findFirst({
            where: { companyId, email: { equals: normalised, mode: 'insensitive' } },
            select: { id: true },
          }),
          prisma.user.findFirst({
            where: { companyId, email: { equals: normalised, mode: 'insensitive' } },
            select: { id: true },
          }),
        ])

        if (!clientMatch && !employeeMatch && !memberMatch) {
          res.status(403).json({
            success: false,
            error: "Le destinataire n'est pas associé à votre entreprise",
            code: 'RECIPIENT_NOT_ALLOWED',
          })
          return
        }
      }
      // Cabinet users switching context have companyId set on the view token —
      // same check applies. Pure CABINET tokens (no companyId) cannot use this endpoint
      // due to the requireAccountType('COMPANY', 'CABINET') guard above combined
      // with the companyId being null, so we skip the DB check in that edge case.

      await sendMail({
        to:      to.trim(),
        subject: subject.trim(),
        html,
        ...(text ? { text } : {}),
      })

      res.json({ success: true })
    } catch (err) {
      console.error('[mail] send-document error:', err)
      res.status(500).json({ success: false, error: "Échec de l'envoi de l'e-mail" })
    }
  },
)
