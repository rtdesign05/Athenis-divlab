import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { logger } from '../../lib/logger.js'
import { AppError } from '../../middleware/errorHandler.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireAccountType } from '../../middleware/rbac.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import { generateAtheisNumber } from '../../lib/atheisNumber.js'
import * as svc from '../cabinet/cabinet.service.js'

export const invitationRouter = Router()

// ── Public — get invitation details by token ──────────────────────────────────
// No auth required — anyone with the token can see details (cabinet name, type…)

invitationRouter.get('/cabinet', async (req, res, next) => {
  try {
    const token = String(req.query.token ?? '')
    if (!token) {
      res.status(400).json({ success: false, error: 'Token manquant', code: 'MISSING_TOKEN' })
      return
    }
    const data = await svc.getInvitationByToken(token)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── Company-authenticated — accept / reject ───────────────────────────────────

invitationRouter.post('/cabinet/accept', authenticate, requireAccountType('COMPANY'), async (req, res, next) => {
  try {
    const token = String(req.query.token ?? req.body.token ?? '')
    if (!token) {
      res.status(400).json({ success: false, error: 'Token manquant', code: 'MISSING_TOKEN' })
      return
    }
    const data = await svc.acceptInvitation(token, req.user!.companyId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

invitationRouter.post('/cabinet/reject', authenticate, requireAccountType('COMPANY'), async (req, res, next) => {
  try {
    const token = String(req.query.token ?? req.body.token ?? '')
    if (!token) {
      res.status(400).json({ success: false, error: 'Token manquant', code: 'MISSING_TOKEN' })
      return
    }
    const data = await svc.rejectInvitation(token, req.user!.companyId!)
    res.json({ success: true, data })
  } catch (e) { next(e) }
})

// ── User invitation (chef d'agence, comptable interne…) ──────────────────────
//
// Flow :
//   1. Admin invite via POST /api/settings/users/invite → row Invitation créée
//      + mail d'invitation envoyé avec lien /invitation/user?token=XXX
//   2. Invité ouvre le lien → page frontend appelle GET /invitations/user?token=
//      pour récupérer les infos (entreprise, rôle, agences)
//   3. Invité renseigne prénom/nom/mot de passe → POST /invitations/user/accept
//      → user créé, lié à la company via CompanyMember et à ses agences via
//      AgenceMember. L'invitation est marquée acceptedAt.

// Public — lookup des infos d'une invitation user par token
invitationRouter.get('/user', async (req, res, next) => {
  try {
    const token = String(req.query.token ?? '')
    if (!token) {
      res.status(400).json({ success: false, error: 'Token manquant', code: 'MISSING_TOKEN' })
      return
    }
    const inv = await prisma.invitation.findUnique({
      where: { token },
      include: {
        company: { select: { nom: true } },
      },
    })
    if (!inv) { res.status(404).json({ success: false, error: 'Invitation introuvable', code: 'NOT_FOUND' }); return }
    if (inv.acceptedAt)   { res.status(410).json({ success: false, error: 'Invitation déjà acceptée', code: 'ALREADY_ACCEPTED' }); return }
    if (inv.expiresAt < new Date()) { res.status(410).json({ success: false, error: 'Invitation expirée', code: 'EXPIRED' }); return }

    const [role, agences] = await Promise.all([
      prisma.companyRole.findUnique({ where: { id: inv.roleId }, select: { name: true } }).catch(() => null),
      inv.agenceIds.length > 0
        ? prisma.agence.findMany({ where: { id: { in: inv.agenceIds } }, select: { id: true, nom: true } })
        : Promise.resolve([] as { id: string; nom: string }[]),
    ])

    res.json({
      success: true,
      data: {
        email:        inv.email,
        companyName:  inv.company.nom,
        roleName:     role?.name ?? null,
        agences,
        isRestricted: inv.isRestricted,
        expiresAt:    inv.expiresAt,
      },
    })
  } catch (e) { next(e) }
})

const AcceptUserInvitationSchema = z.object({
  token:    z.string().min(1, 'Token requis'),
  prenom:   z.string().trim().min(1, 'Prénom requis').max(100),
  nom:      z.string().trim().min(1, 'Nom requis').max(100),
  password: z.string().min(8, 'Mot de passe — 8 caractères minimum').max(200),
})

invitationRouter.post('/user/accept', validateRequest({ body: AcceptUserInvitationSchema }), async (req, res, next) => {
  try {
    const { token, prenom, nom, password } = req.body as z.infer<typeof AcceptUserInvitationSchema>

    const inv = await prisma.invitation.findUnique({ where: { token } })
    if (!inv)                       throw new AppError('Invitation introuvable', 404, 'NOT_FOUND')
    if (inv.acceptedAt)             throw new AppError('Invitation déjà acceptée', 410, 'ALREADY_ACCEPTED')
    if (inv.expiresAt < new Date()) throw new AppError('Invitation expirée', 410, 'EXPIRED')

    // Vérifier que l'email n'est pas déjà pris par un autre user
    const existing = await prisma.user.findUnique({ where: { email: inv.email } })
    if (existing) throw new AppError('Un compte existe déjà avec cette adresse email', 409, 'EMAIL_TAKEN')

    // Vérifier que les agenceIds appartiennent bien encore à la company (anti race)
    if (inv.agenceIds.length > 0) {
      const validCount = await prisma.agence.count({
        where: { id: { in: inv.agenceIds }, companyId: inv.companyId },
      })
      if (validCount !== inv.agenceIds.length) {
        throw new AppError('Une ou plusieurs agences ne sont plus disponibles', 410, 'AGENCE_GONE')
      }
    }

    const passwordHash  = await bcrypt.hash(password, 12)
    const atheisNumber  = await generateAtheisNumber('COMPANY')

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email:           inv.email,
          passwordHash,
          nom,
          prenom,
          accountType:     'COMPANY',
          role:            'COMPTABLE',                  // legacy column, vrai role via CompanyMember
          companyId:       inv.companyId,
          atheisNumber,
          isActive:        true,
          emailVerified:   true,                          // invité = email déjà vérifié (il a reçu le mail)
          approvalStatus:  'APPROVED',
        },
        select: { id: true, email: true },
      })

      await tx.companyMember.create({
        data: {
          userId:    user.id,
          companyId: inv.companyId,
          roleId:    inv.roleId,
          status:    'ACTIVE',
          invitedBy: inv.createdBy,
          invitedAt: inv.createdAt,
          joinedAt:  new Date(),
        },
      })

      if (inv.agenceIds.length > 0) {
        // Le AgenceMember est attaché au CompanyMember, pas directement à l'user
        const member = await tx.companyMember.findFirstOrThrow({
          where: { userId: user.id, companyId: inv.companyId },
          select: { id: true },
        })
        await tx.agenceMember.createMany({
          data: inv.agenceIds.map(agenceId => ({
            agenceId,
            companyMemberId: member.id,
            isRestricted:    inv.isRestricted,
          })),
          skipDuplicates: true,
        })
      }

      await tx.invitation.update({
        where: { id: inv.id },
        data:  { acceptedAt: new Date() },
      })

      return user
    })

    logger.info('User invitation accepted', { invitationId: inv.id, userId: newUser.id, email: newUser.email })

    res.json({
      success: true,
      data: { email: newUser.email, accountCreated: true },
    })
  } catch (e) { next(e) }
})
