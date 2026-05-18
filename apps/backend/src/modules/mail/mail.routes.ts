import { Router } from 'express'
import sanitizeHtml from 'sanitize-html'
import { sendMail } from '../../lib/email.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole, requireAccountType } from '../../middleware/rbac.js'
import { apiLimiter } from '../../middleware/rateLimiter.js'
import { prisma } from '../../lib/prisma.js'

/**
 * N24 : whitelist HTML/CSS pour les emails sortants. Évite qu'un user
 *       puisse envoyer un payload XSS / phishing complet via l'endpoint
 *       /send-document en s'appuyant sur la réputation SPF/DKIM Athenis.
 *       Tags autorisés : structure email basique (p, div, table, a, img, etc.)
 *       Schémas href : http(s), mailto, tel uniquement (pas de javascript:).
 */
const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p', 'div', 'span', 'br', 'hr',
    'strong', 'em', 'b', 'i', 'u',
    'h1', 'h2', 'h3', 'h4',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img',
    'blockquote', 'pre', 'code',
  ],
  allowedAttributes: {
    a:   ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height'],
    '*': ['style', 'class'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https', 'data', 'cid'] },
  transformTags: {
    // Force rel="noopener noreferrer" sur les liens externes
    a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
  },
}

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
      // V11 : refus systématique si companyId absent. Avant, `if (companyId) { ... }`
      //       laissait passer les tokens CABINET sans contexte company →
      //       sendMail vers n'importe quelle adresse → OPEN RELAY exploitable
      //       pour du phishing utilisant la réputation SPF/DKIM du domaine Athenis.
      const companyId = req.user!.companyId
      if (!companyId) {
        res.status(403).json({
          success: false,
          error: "Contexte entreprise requis. Sélectionnez une entreprise (cabinet → switchToCompany) avant d'envoyer un email.",
          code: 'COMPANY_CONTEXT_REQUIRED',
        })
        return
      }

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

      // N24 : sanitize côté serveur — empêche un client de soumettre du HTML
      //       avec scripts/iframes/styles malveillants.
      const safeHtml = sanitizeHtml(html, SANITIZE_OPTS)
      // Force la présence d'un text fallback (norme anti-spam + scanners email)
      const safeText = text?.trim() || sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })

      await sendMail({
        to:      to.trim(),
        subject: subject.trim(),
        html:    safeHtml,
        text:    safeText,
      })

      res.json({ success: true })
    } catch (err) {
      console.error('[mail] send-document error:', err)
      res.status(500).json({ success: false, error: "Échec de l'envoi de l'e-mail" })
    }
  },
)
