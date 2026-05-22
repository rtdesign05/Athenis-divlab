import { Router } from 'express'
import { authenticate } from '../../middleware/authenticate.js'
import { authLimiter, sensitiveLimiter } from '../../middleware/rateLimiter.js'
import { validateRequest } from '../../middleware/validateRequest.js'
import {
  RegisterDto,
  LoginDto,
  TotpVerifyDto,
  TotpEnableDto,
  TotpDisableDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto.js'
import * as ctrl from './auth.controller.js'

const router = Router()

// Public routes
router.post('/accept-invitation/:token', authLimiter, ctrl.acceptInvitation)
router.post('/register', authLimiter, validateRequest({ body: RegisterDto }), ctrl.register)
router.post('/login', authLimiter, validateRequest({ body: LoginDto }), ctrl.login)
router.post('/login/2fa', authLimiter, validateRequest({ body: TotpVerifyDto }), ctrl.loginVerifyTotp)
router.post('/login/mfa/verify', authLimiter, ctrl.loginVerifyMfaCode)
router.post('/refresh', ctrl.refresh)
router.get('/verify-email', authLimiter, ctrl.verifyEmail)
router.post('/resend-verification', authLimiter, ctrl.resendVerification)

// Mot de passe oublié → envoi d'un email avec lien de reset
router.post('/forgot-password',
  sensitiveLimiter,
  validateRequest({ body: ForgotPasswordDto }),
  ctrl.forgotPassword,
)
// Réinitialisation via le token reçu par email
router.post('/reset-password',
  sensitiveLimiter,
  validateRequest({ body: ResetPasswordDto }),
  ctrl.resetPassword,
)

// Protected routes
router.post('/logout', authenticate, ctrl.logout)
router.get('/totp/status', authenticate, ctrl.totpStatus)
router.post('/totp/setup', authenticate, sensitiveLimiter, ctrl.setupTotp)
router.post('/totp/enable', authenticate, validateRequest({ body: TotpEnableDto }), ctrl.enableTotp)
router.post('/totp/disable', authenticate, validateRequest({ body: TotpDisableDto }), ctrl.disableTotp)

// MFA multi-méthode (TOTP / EMAIL / SMS)
router.get('/mfa/status',       authenticate, ctrl.mfaStatus)
router.post('/mfa/setup/email', authenticate, sensitiveLimiter, ctrl.setupEmailMfa)
router.post('/mfa/setup/sms',   authenticate, sensitiveLimiter, ctrl.setupSmsMfa)
router.post('/mfa/setup/verify', authenticate, ctrl.verifyMfaSetup)
router.post('/mfa/disable',     authenticate, sensitiveLimiter, ctrl.disableMfa)
router.post('/mfa/send-code',   authenticate, ctrl.sendMfaLoginCode)
router.post(
  '/password',
  authenticate,
  sensitiveLimiter,
  validateRequest({ body: ChangePasswordDto }),
  ctrl.changePassword,
)

export { router as authRouter }
