import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { logger } from './logger.js'

// V13 : helper d'échappement HTML pour les variables interpolées dans les
//       templates d'email. Empêche un user d'injecter du HTML dans un nom
//       de signataire / titre de contrat → phishing avec réputation SPF/DKIM
//       du domaine Athenis.
function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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
  // V13 : échappement HTML des variables interpolées
  const safeCabinet  = escapeHtml(opts.cabinetName)
  const safeCompany2 = escapeHtml(opts.companyName)
  const safeType     = escapeHtml(typeLabel)
  const safeUrl2     = escapeHtml(url)
  const safeExpire2  = escapeHtml(expire)

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
            Le cabinet <strong style="color:#111827">${safeCabinet}</strong> souhaite gérer la comptabilité de
            <strong style="color:#111827">${safeCompany2}</strong> sur Athenis.
          </p>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin-bottom:28px">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Type de mission</p>
            <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${safeType}</p>
          </div>

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
            Consultez les détails de cette invitation et acceptez-la ou refusez-la en cliquant sur le bouton ci-dessous.
            Cette invitation expire le <strong>${safeExpire2}</strong>.
          </p>

          <div style="text-align:center;margin:32px 0">
            <a href="${safeUrl2}" style="display:inline-block;background:#1a3a2a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px">
              Voir l'invitation
            </a>
          </div>

          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">
            Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail en toute sécurité.<br>
            Lien : <a href="${safeUrl2}" style="color:#1a3a2a">${safeUrl2}</a>
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

// ── Signature électronique ────────────────────────────────────────────────────

export async function sendSignatureRequestEmail(
  to: string,
  opts: {
    signerName:    string
    contractTitle: string
    companyName:   string
    signUrl:       string
    expiresAt?:    Date
  },
): Promise<void> {
  const expire = opts.expiresAt
    ? opts.expiresAt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // V13 : pré-échappement HTML des variables interpolées. Le `subject` et le
  //       `text` n'ont pas besoin d'escape (envoyés en texte brut), seul le
  //       template HTML en a besoin.
  const safeName     = escapeHtml(opts.signerName)
  const safeTitle    = escapeHtml(opts.contractTitle)
  const safeCompany  = escapeHtml(opts.companyName)
  const safeUrl      = escapeHtml(opts.signUrl)
  const safeExpire   = expire ? escapeHtml(expire) : null

  await sendMail({
    to,
    subject: `Action requise : signature du document "${opts.contractTitle}" — ${opts.companyName}`,
    text: [
      `Bonjour ${opts.signerName},`,
      '',
      `${opts.companyName} vous invite à signer le document suivant de façon électronique :`,
      `« ${opts.contractTitle} »`,
      '',
      `Cliquez sur le lien ci-dessous pour parcourir le document et apposer votre signature :`,
      opts.signUrl,
      '',
      expire ? `Ce lien est valable jusqu'au ${expire}.` : '',
      '',
      'Aucun compte Athenis n\'est requis pour signer.',
      '',
      'Si vous n\'êtes pas concerné par ce document, ignorez cet e-mail.',
    ].filter(l => l !== undefined).join('\n'),
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
          <p style="color:#86efac;margin:6px 0 0;font-size:13px">Signature électronique sécurisée</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:40px">
          <p style="margin:0 0 6px;color:#6b7280;font-size:14px">Bonjour <strong style="color:#111827">${safeName}</strong>,</p>
          <h1 style="margin:0 0 20px;font-size:20px;color:#111827;line-height:1.3">
            Vous avez un document à signer
          </h1>

          <!-- Document card -->
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin-bottom:28px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#16a34a">Document</p>
            <p style="margin:0 0 4px;font-size:17px;font-weight:700;color:#111827">« ${safeTitle} »</p>
            <p style="margin:0;font-size:13px;color:#374151">Envoyé par <strong>${safeCompany}</strong></p>
          </div>

          <p style="margin:0 0 20px;color:#6b7280;font-size:14px;line-height:1.6">
            Cliquez sur le bouton ci-dessous pour consulter le document et apposer votre signature électronique.
            ${safeExpire ? `<br>Ce lien est valable jusqu'au <strong>${safeExpire}</strong>.` : ''}
          </p>

          <!-- CTA -->
          <div style="text-align:center;margin:32px 0">
            <a href="${safeUrl}"
               style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;letter-spacing:.01em">
              ✍️ Signer le document
            </a>
          </div>

          <!-- Security note -->
          <div style="background:#f9fafb;border-left:3px solid #d1fae5;padding:12px 16px;margin:24px 0;border-radius:0 6px 6px 0">
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5">
              🔒 <strong>Signature électronique avancée (AES)</strong> — Ce processus est conforme aux dispositions
              de l'Acte Uniforme OHADA sur le Droit Commercial Général (2010) et à la Loi n°2010/021 du Cameroun
              relative au commerce électronique. Votre adresse IP et la date/heure de signature seront enregistrées.
            </p>
          </div>

          <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">
            Aucun compte n'est requis pour signer. Si vous n'êtes pas concerné, ignorez cet e-mail.<br>
            Lien direct : <a href="${safeUrl}" style="color:#15803d;word-break:break-all">${safeUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0;color:#9ca3af;font-size:12px">
            © ${new Date().getFullYear()} Athenis · Plateforme de gestion d'entreprise · Signature électronique sécurisée
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  })
}

export async function sendSignatureCompletedEmail(
  to: string,
  opts: { companyName: string; contractTitle: string; certificateUrl: string },
): Promise<void> {
  // V13 : échappement HTML
  const safeTitle = escapeHtml(opts.contractTitle)
  const safeCertUrl = escapeHtml(opts.certificateUrl)
  await sendMail({
    to,
    subject: `✅ Document signé : "${opts.contractTitle}" — ${opts.companyName}`,
    text: `Bonjour,\n\nTous les signataires ont complété la signature du document "${opts.contractTitle}".\n\nTéléchargez le certificat de réalisation ici :\n${opts.certificateUrl}\n\nCordialement,\nAthenis`,
    html: `
<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr><td style="background:#15803d;padding:32px 40px;text-align:center">
          <span style="color:#fff;font-size:22px;font-weight:700">Athenis</span>
          <p style="color:#bbf7d0;margin:6px 0 0;font-size:13px">✅ Document entièrement signé</p>
        </td></tr>
        <tr><td style="padding:40px">
          <h1 style="margin:0 0 16px;font-size:20px;color:#111827">Signature complète !</h1>
          <p style="color:#6b7280;font-size:14px;line-height:1.6">
            Le document <strong>« ${safeTitle} »</strong> a été signé par tous les signataires.
          </p>
          <div style="text-align:center;margin:32px 0">
            <a href="${safeCertUrl}"
               style="display:inline-block;background:#15803d;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600">
              📄 Télécharger le certificat
            </a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  })
}

// ── Layout commun pour tous les emails Athenis ────────────────────────────────

function emailLayout(opts: {
  preheader?: string
  headerColor?: string
  headerSubtitle?: string
  bodyHtml: string
}): string {
  const headerColor = opts.headerColor ?? '#1a3a2a'
  const preheader = opts.preheader ? escapeHtml(opts.preheader) : ''
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Athenis</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f9fafb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
        <tr><td style="background:${headerColor};padding:28px 40px;text-align:center">
          <span style="color:#fff;font-size:24px;font-weight:700;letter-spacing:-.5px">Athenis</span>
          ${opts.headerSubtitle ? `<p style="color:rgba(255,255,255,.8);margin:6px 0 0;font-size:13px">${escapeHtml(opts.headerSubtitle)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:36px 40px">
          ${opts.bodyHtml}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
          <p style="margin:0 0 4px;color:#9ca3af;font-size:12px">© ${new Date().getFullYear()} Athenis · Plateforme de gestion d'entreprise</p>
          <p style="margin:0;color:#9ca3af;font-size:11px">Cet e-mail vous a été envoyé automatiquement, ne pas répondre directement.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(url: string, label: string, color: string = '#1a3a2a'): string {
  return `<div style="text-align:center;margin:32px 0">
    <a href="${escapeHtml(url)}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px">${escapeHtml(label)}</a>
  </div>`
}

// ── 1. Vérification d'email (envoyé immédiatement après signup) ───────────────

export async function sendVerificationEmail(to: string, opts: { token: string; firstName?: string | null }): Promise<void> {
  const url = `${env.frontendUrl}/auth/verify-email?token=${opts.token}`
  const safeUrl = escapeHtml(url)
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'

  await sendMail({
    to,
    subject: 'Confirmez votre adresse e-mail — Athenis',
    text: [
      `Bienvenue sur Athenis !`,
      ``,
      `Cliquez sur ce lien pour confirmer votre adresse e-mail :`,
      url,
      ``,
      `Ce lien est valable 24 heures.`,
      ``,
      `Après confirmation, votre compte devra être validé par notre équipe avant que vous puissiez vous connecter (phase de test).`,
      ``,
      `Si vous n'avez pas créé de compte sur Athenis, ignorez cet e-mail.`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Confirmez votre adresse e-mail pour activer votre compte Athenis.',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#111827;line-height:1.3">Confirmez votre adresse e-mail</h1>
        <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;font-size:14px">
          Bienvenue sur <strong>Athenis</strong> ! Pour activer votre compte, confirmez votre adresse e-mail
          en cliquant sur le bouton ci-dessous.
        </p>
        ${ctaButton(url, 'Confirmer mon adresse e-mail')}
        <div style="background:#fef3c7;border-left:3px solid #f59e0b;padding:12px 16px;margin:24px 0;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5">
            <strong>Phase de test :</strong> après confirmation de votre e-mail, votre compte sera examiné
            par notre équipe avant activation finale. Vous recevrez un e-mail dès que ce sera fait.
          </p>
        </div>
        <p style="margin:8px 0 0;color:#9ca3af;font-size:13px">
          Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet e-mail.
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
          Lien : <a href="${safeUrl}" style="color:#1a3a2a">${safeUrl}</a>
        </p>
      `,
    }),
  })
}

// ── 2. Email vérifié, en attente de validation admin ──────────────────────────

export async function sendPendingApprovalEmail(to: string, opts: { firstName?: string | null }): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'

  await sendMail({
    to,
    subject: 'Compte en attente de validation — Athenis',
    text: [
      `Bonjour,`,
      ``,
      `Votre adresse e-mail a bien été confirmée. Merci !`,
      ``,
      `Athenis est actuellement en phase de test fermée. Votre compte est désormais en attente de validation par notre équipe — nous examinons chaque inscription manuellement pour garantir la qualité du service.`,
      ``,
      `Vous recevrez un nouvel e-mail dès que votre compte sera activé (généralement sous 24-48h ouvrées).`,
      ``,
      `Merci de votre patience !`,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Votre adresse e-mail est confirmée. Votre compte est en attente de validation par notre équipe.',
      headerColor: '#0369a1',
      headerSubtitle: '⏳ Compte en attente de validation',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 16px;font-size:22px;color:#111827;line-height:1.3">
          Votre e-mail est confirmé ✅
        </h1>
        <p style="margin:0 0 20px;color:#6b7280;line-height:1.6;font-size:14px">
          Merci d'avoir confirmé votre adresse e-mail.
          Athenis est actuellement en <strong>phase de test fermée</strong> — chaque inscription est examinée
          manuellement par notre équipe.
        </p>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:18px 22px;margin:24px 0">
          <p style="margin:0 0 8px;font-weight:600;color:#1e40af;font-size:14px">Prochaine étape</p>
          <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.6">
            Vous recevrez un e-mail dès que votre compte sera validé. Cela prend généralement
            <strong>moins de 24 heures</strong>.
          </p>
        </div>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;line-height:1.6">
          Vous n'avez rien à faire pour le moment. Pas besoin de vous reconnecter — nous vous écrirons.
        </p>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          Merci de votre patience !<br>
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 3. Compte approuvé : bienvenue + invitation à se connecter ────────────────

export async function sendWelcomeEmail(to: string, opts: { firstName?: string | null; companyName?: string | null }): Promise<void> {
  const loginUrl = `${env.frontendUrl}/auth/login`
  const safeLoginUrl = escapeHtml(loginUrl)
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const companyLine = opts.companyName ? `pour ${escapeHtml(opts.companyName)}` : ''

  await sendMail({
    to,
    subject: '🎉 Votre compte Athenis est activé — Bienvenue !',
    text: [
      `Bienvenue sur Athenis !`,
      ``,
      `Bonne nouvelle : votre compte ${opts.companyName ? `pour ${opts.companyName} ` : ''}vient d'être validé par notre équipe. Vous pouvez désormais vous connecter et commencer à utiliser Athenis.`,
      ``,
      `Connectez-vous ici :`,
      loginUrl,
      ``,
      `Quelques points de départ recommandés :`,
      `- Tableau de bord : vue d'ensemble de votre activité`,
      `- Gestion : factures, clients, fournisseurs, stocks`,
      `- Comptabilité : journal, grand livre, états financiers`,
      `- RH : employés, paie, contrats, congés`,
      ``,
      `Si vous avez la moindre question, répondez simplement à cet e-mail.`,
      ``,
      `Excellente prise en main,`,
      `L'équipe Athenis`,
    ].join('\n'),
    html: emailLayout({
      preheader: 'Votre compte Athenis est activé. Connectez-vous et démarrez !',
      headerColor: '#15803d',
      headerSubtitle: '✅ Compte activé',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 12px;font-size:24px;color:#111827;line-height:1.3">
          🎉 Bienvenue sur Athenis !
        </h1>
        <p style="margin:0 0 24px;color:#6b7280;line-height:1.6;font-size:15px">
          Excellente nouvelle — votre compte ${companyLine} vient d'être validé par notre équipe.
          Vous pouvez désormais vous connecter et commencer à utiliser la plateforme.
        </p>
        ${ctaButton(loginUrl, 'Me connecter à Athenis', '#15803d')}
        <h2 style="margin:32px 0 12px;font-size:16px;color:#111827">Quelques points de départ</h2>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:8px">
          <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6">
            <p style="margin:0;font-size:14px;color:#111827"><strong>📊 Tableau de bord</strong></p>
            <p style="margin:2px 0 0;font-size:13px;color:#6b7280">Vue d'ensemble de votre activité, indicateurs clés.</p>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6">
            <p style="margin:0;font-size:14px;color:#111827"><strong>🧾 Gestion</strong></p>
            <p style="margin:2px 0 0;font-size:13px;color:#6b7280">Factures, devis, clients, fournisseurs, stocks.</p>
          </td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #f3f4f6">
            <p style="margin:0;font-size:14px;color:#111827"><strong>📒 Comptabilité</strong></p>
            <p style="margin:2px 0 0;font-size:13px;color:#6b7280">Journal, grand livre, balance, états financiers.</p>
          </td></tr>
          <tr><td style="padding:10px 0">
            <p style="margin:0;font-size:14px;color:#111827"><strong>👥 RH</strong></p>
            <p style="margin:2px 0 0;font-size:13px;color:#6b7280">Employés, paie, contrats, congés, planning.</p>
          </td></tr>
        </table>
        <div style="background:#f0fdf4;border-left:3px solid #16a34a;padding:14px 18px;margin:28px 0 8px;border-radius:0 6px 6px 0">
          <p style="margin:0;font-size:13px;color:#14532d;line-height:1.5">
            <strong>Une question ?</strong> Répondez simplement à cet e-mail, nous sommes là pour vous aider.
          </p>
        </div>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          Excellente prise en main,<br>
          L'équipe Athenis
        </p>
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
          Lien de connexion : <a href="${safeLoginUrl}" style="color:#15803d">${safeLoginUrl}</a>
        </p>
      `,
    }),
  })
}

// ── 4. Compte refusé ──────────────────────────────────────────────────────────

export async function sendRejectionEmail(to: string, opts: { firstName?: string | null; reason?: string | null }): Promise<void> {
  const greeting = opts.firstName ? `Bonjour ${escapeHtml(opts.firstName)},` : 'Bonjour,'
  const reason = opts.reason?.trim()

  await sendMail({
    to,
    subject: 'Votre demande d\'inscription Athenis — Information',
    text: [
      `Bonjour,`,
      ``,
      `Après examen de votre demande d'inscription sur Athenis, nous ne sommes pas en mesure d'activer votre compte pour le moment.`,
      reason ? `\nRaison : ${reason}\n` : '',
      `Athenis est en phase de test fermée et nous limitons les nouveaux comptes pour garantir un service de qualité. Vous pouvez nous recontacter ultérieurement.`,
      ``,
      `Cordialement,`,
      `L'équipe Athenis`,
    ].filter(Boolean).join('\n'),
    html: emailLayout({
      preheader: 'Information concernant votre demande d\'inscription sur Athenis.',
      headerColor: '#6b7280',
      bodyHtml: `
        <p style="margin:0 0 8px;color:#374151;font-size:15px">${greeting}</p>
        <h1 style="margin:0 0 16px;font-size:20px;color:#111827;line-height:1.3">
          Concernant votre demande d'inscription
        </h1>
        <p style="margin:0 0 20px;color:#6b7280;line-height:1.6;font-size:14px">
          Après examen, nous ne sommes pas en mesure d'activer votre compte sur Athenis pour le moment.
        </p>
        ${reason ? `
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 20px;margin:24px 0">
          <p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af">Raison</p>
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6">${escapeHtml(reason)}</p>
        </div>
        ` : ''}
        <p style="margin:0 0 20px;color:#6b7280;line-height:1.6;font-size:14px">
          Athenis est en <strong>phase de test fermée</strong>. Nous limitons volontairement les nouvelles inscriptions
          pour garantir un service de qualité. Vous pouvez nous recontacter ultérieurement, lorsque la plateforme
          sera ouverte à un public plus large.
        </p>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:13px">
          Cordialement,<br>
          L'équipe Athenis
        </p>
      `,
    }),
  })
}

// ── 5. Notification interne au SUPER_ADMIN ────────────────────────────────────

export async function sendAdminNewSignupNotification(opts: {
  adminEmail: string
  userEmail: string
  userFirstName: string
  accountType: string
  companyName?: string | null
  country?: string | null
}): Promise<void> {
  const pendingUrl = `${env.frontendUrl}/admin/users/pending`
  const safePending = escapeHtml(pendingUrl)
  const safeEmail   = escapeHtml(opts.userEmail)
  const safeName    = escapeHtml(opts.userFirstName)
  const safeCompany = escapeHtml(opts.companyName ?? '—')
  const safeCountry = escapeHtml(opts.country ?? '—')
  const safeType    = escapeHtml(opts.accountType)

  await sendMail({
    to: opts.adminEmail,
    subject: `[Athenis admin] Nouvelle inscription à valider : ${opts.userEmail}`,
    text: [
      `Nouvelle demande d'inscription en attente de validation :`,
      ``,
      `Email      : ${opts.userEmail}`,
      `Nom        : ${opts.userFirstName}`,
      `Type       : ${opts.accountType}`,
      `Entreprise : ${opts.companyName ?? '—'}`,
      `Pays       : ${opts.country ?? '—'}`,
      ``,
      `Valider depuis : ${pendingUrl}`,
    ].join('\n'),
    html: emailLayout({
      preheader: `Nouvelle inscription en attente : ${opts.userEmail}`,
      headerColor: '#7c3aed',
      headerSubtitle: '🔔 Action requise',
      bodyHtml: `
        <h1 style="margin:0 0 16px;font-size:18px;color:#111827">Nouvelle demande d'inscription</h1>
        <p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6">
          Un nouvel utilisateur vient de confirmer son adresse e-mail et attend votre validation.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:16px 0">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Email</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;font-weight:600">${safeEmail}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Nom</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${safeName}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Type de compte</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${safeType}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#6b7280">Entreprise</td><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${safeCompany}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#6b7280">Pays</td><td style="padding:12px 16px;font-size:13px;color:#111827">${safeCountry}</td></tr>
        </table>
        ${ctaButton(pendingUrl, 'Examiner la demande', '#7c3aed')}
        <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;word-break:break-all">
          Lien : <a href="${safePending}" style="color:#7c3aed">${safePending}</a>
        </p>
      `,
    }),
  })
}
