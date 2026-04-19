import { api } from '@/lib/api'
import type { Invoice } from './billingApi'

export interface DashboardKpis {
  caMonth: string
  encaisse: string
  enAttente: string
  enRetard: string
  invoiceCount: number
  clientCount: number
  expenseMonth: string
}

export interface RecentActivity {
  recentInvoices: Invoice[]
}

const d = <T>(r: { data: { data: T } }) => r.data.data

export const dashboardApi = {
  // Agrège CA du mois depuis les factures PAID du mois courant
  kpis: async (): Promise<DashboardKpis> => {
    const [paid, sent, overdue, clients] = await Promise.all([
      api.get<{ data: { items: Invoice[]; total: number } }>('/invoices', { params: { status: 'PAID', limit: 100 } }).then(d),
      api.get<{ data: { items: Invoice[]; total: number } }>('/invoices', { params: { status: 'SENT', limit: 100 } }).then(d),
      api.get<{ data: { items: Invoice[]; total: number } }>('/invoices', { params: { status: 'OVERDUE', limit: 100 } }).then(d),
      api.get<{ data: unknown[] }>('/clients').then(d),
    ])
    const sum = (items: Invoice[]) =>
      items.reduce((acc, inv) => acc + parseFloat(inv.total), 0).toFixed(2)
    return {
      caMonth:      sum(paid.items),
      encaisse:     sum(paid.items),
      enAttente:    sum(sent.items),
      enRetard:     sum(overdue.items),
      invoiceCount: paid.total + sent.total + overdue.total,
      clientCount:  (clients as unknown[]).length,
      expenseMonth: '0.00',
    }
  },
  recentInvoices: () =>
    api.get<{ data: { items: Invoice[] } }>('/invoices', { params: { limit: 8 } }).then(d),
}
