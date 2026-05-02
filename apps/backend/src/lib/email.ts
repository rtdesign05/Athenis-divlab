import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'

// ── Transporter ───────────────────────────────────────────────────────────────

function createTransporter() {
  if (!env.smtpHost) return null

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  })
}

const transporter = createTransporter()

// ── Send helpers ──────────────────────────────────────────────────────────────

interface MailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(opts: MailOptions): Promise<void> {
  if (!transporter) {
    // Dev mode: log to console instead of sending
    logger.info('📧 [EMAIL — not sent, no SMTP configured]', {
      to: opts.to,
      subject: opts.subject,
      text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    })
    return
  }

  await transporter.sendMail({ from: env.smtpFrom, ...opts })
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function sendCabinetInvitationEmail(
  to: string,
  opts: { cabinetName: string; companyName: string; type: string; token: string; expiresAt: Date },
): Promise<void> {
  const url    = `${env.frontendUrl}/invitation/cabinet?token=${opts.token}`
  const expire = opts.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const typeLabels: Record<string, string> = {
    COMPLET:      'Mission complète',
    COMPTABILITE: 'Comptabilité',
    GESTION:      'Gestion',
    FISCAL:       'Fiscalité',
    DECLARATIONS: 'Déclarations',
    PARTIEL:      'Mission partielle',
  }
  const typeLabel = typeLabels[opts.type] ?? opts.type

  await sendMail({
    to,
    subject: `${opts.cabinetName} souhaite gérer votre comptabilité — Athenis`,
    text: `Bonjour,\n\nLe cabinet ${opts.cabinetName} vous invite à lui confier la gestion de ${opts.companyName} sur Athenis.\n\nType de mission : ${typeLabel}\n\nAcceptez ou refusez cette invitation en cliquant sur le lien suivant (valable jusqu'au ${expire}) :\n${url}\n\nSi vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px">Athenis</span>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 8px;font-size:20px;color:#111827">Invitation d'un cabinet comptable</h1>
          <p style="margin:0 0 24px;color:#6b7280;line-height:1.6">
            Le cabinet <strong style="color:#111827">${opts.cabinetName}</strong> souhaite gérer la comptabilité de
            <strong style="color:#111827">${opts.companyName}</strong> sur Athenis.
          </p>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Type de mission</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${typeLabel}</p>
          </div>

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
            Consultez les détails de cette invitation et acceptez-la ou refusez-la en cliquant sur le bouton ci-dessous.
            Cette invitation expire le <strong>${expire}</strong>.
          </p>

          <div style="text-align:center;margin:32px 0">
            <a href="${url}" style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
              Voir l'invitation
            </a>
          </div>

          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">
            Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail en toute sécurité.<br>
            Lien : <a href="${url}" style="color:#1a3a2a">${url}</a>
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Athenis. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${env.frontendUrl}/auth/verify-email?token=${token}`

  await sendMail({
    to,
    subject: 'Confirmez votre adresse e-mail — Athenis',
    text: `Bienvenue sur Athenis !\n\nCliquez sur ce lien pour confirmer votre adresse e-mail :\n${url}\n\nCe lien est valable 24 heures.\n\nSi vous n'avez pas créé de compte, ignorez cet e-mail.`,
    html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <!-- Header -->
        <tr><td style="background:#1a3a2a;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-.5px">Athenis</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827">Confirmez votre adresse e-mail</h1>
          <p style="margin:0 0 24px;color:#6b7280;line-height:1.6">
            Bienvenue ! Pour terminer la création de votre compte, veuillez confirmer votre adresse e-mail en cliquant sur le bouton ci-dessous.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${url}" style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
              Confirmer mon adresse e-mail
            </a>
          </div>
          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px">
            Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte sur Athenis, ignorez cet e-mail.
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
            Lien : <a href="${url}" style="color:#1a3a2a">${url}</a>
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Athenis. Tous droits réservés.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}
