import { Router } from 'express'
import { authRouter } from '../modules/auth/auth.router.js'
import { billingRouter } from '../modules/billing/billing.router.js'
import { invoicesRouter } from '../modules/invoices/invoices.routes.js'
import { quotesRouter } from '../modules/quotes/quotes.routes.js'
import { clientsRouter } from '../modules/clients/clients.routes.js'
import { expensesRouter } from '../modules/expenses/expenses.routes.js'
import { employeesRouter } from '../modules/employees/employees.routes.js'
import { payrollRouter } from '../modules/payroll/payroll.routes.js'
import { accountingRouter } from '../modules/accounting/accounting.routes.js'
import { esgRouter } from '../modules/esg/esg.routes.js'
import { bankRouter } from '../modules/bank/bank.routes.js'
import { purchasesRouter } from '../modules/purchases/purchases.routes.js'
import { cabinetRouter } from '../modules/cabinet/cabinet.routes.js'
import { leavesRouter } from '../modules/leaves/leaves.routes.js'
import { reviewsRouter } from '../modules/reviews/reviews.routes.js'
import { scheduleRouter } from '../modules/schedule/schedule.routes.js'
import { legalRouter } from '../modules/legal/legal.routes.js'
import { aiRouter } from '../modules/ai/ai.routes.js'
import { attachmentsRouter } from '../modules/attachments/attachments.routes.js'
import { settingsRouter } from '../modules/settings/settings.routes.js'
import { fiscalRouter } from '../modules/fiscal/fiscal.routes.js'
import { stocksRouter } from '../modules/stocks/stocks.routes.js'
import { adminRouter } from '../modules/admin/admin.routes.js'
import { personalRouter } from '../modules/personal/personal.routes.js'
import { invitationRouter } from '../modules/invitation/invitation.routes.js'
import { mailRouter } from '../modules/mail/mail.routes.js'
import scanRouter from '../modules/scan/scan.routes.js'
import { treasuryRouter } from '../modules/treasury/treasury.routes.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
})

router.use('/auth', authRouter)
router.use('/invoices', invoicesRouter)
router.use('/quotes', quotesRouter)
router.use('/clients', clientsRouter)
router.use('/expenses', expensesRouter)
router.use('/employees', employeesRouter)
router.use('/payroll',   payrollRouter)
router.use('/accounting', accountingRouter)
router.use('/bank', bankRouter)
router.use('/purchases', purchasesRouter)
router.use('/esg', esgRouter)
router.use('/cabinet', cabinetRouter)
router.use('/leaves', leavesRouter)
router.use('/reviews', reviewsRouter)
router.use('/schedule', scheduleRouter)
router.use('/legal', legalRouter)
router.use('/ai', aiRouter)
router.use('/attachments', attachmentsRouter)
router.use('/settings', settingsRouter)
router.use('/fiscal', fiscalRouter)
router.use('/stocks', stocksRouter)
router.use('/admin', adminRouter)
router.use('/personal', personalRouter)
router.use('/invitations', invitationRouter)
router.use('/mail', mailRouter)
router.use('/scan', scanRouter)
router.use('/treasury', treasuryRouter)
router.use('/billing', billingRouter)

export { router }
