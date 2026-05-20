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
} from './auth.dto.js'
import * as ctrl from './auth.controller.js'

const router = Router()

// Public routes
router.post('/accept-invitation/:token', authLimiter, ctrl.acceptInvitation)
router.post('/register', authLimiter, validateRequest({ body: RegisterDto }), ctrl.register)
router.post('/login', authLimiter, validateRequest({ body: LoginDto }), ctrl.login)
router.post('/login/2fa', authLimiter, validateRequest({ body: TotpVerifyDto }), ctrl.loginVerifyTotp)
router.post('/refresh', ctrl.refresh)
router.get('/verify-email', authLimiter, ctrl.verifyEmail)
router.post('/resend-verification', authLimiter, ctrl.resendVerification)

// Protected routes
router.post('/logout', authenticate, ctrl.logout)
router.get('/totp/status', authenticate, ctrl.totpStatus)
router.post('/totp/setup', authenticate, sensitiveLimiter, ctrl.setupTotp)
router.post('/totp/enable', authenticate, validateRequest({ body: TotpEnableDto }), ctrl.enableTotp)
router.post('/totp/disable', authenticate, validateRequest({ body: TotpDisableDto }), ctrl.disableTotp)
router.post(
  '/password',
  authenticate,
  sensitiveLimiter,
  validateRequest({ body: ChangePasswordDto }),
  ctrl.changePassword,
)

export { router as authRouter }
