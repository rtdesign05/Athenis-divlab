const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
const CID = 'cmoc3q4jt000s11bd6wrke26k'

const TVA_RATE = 19.25
function tva(ht) { return Math.round(ht * TVA_RATE / 100) }
function ttc(ht) { return ht + tva(ht) }
function d(y, m, day) { return new Date(y, m - 1, day) }

async function main() {
  // ── CLIENTS ─────────────────────────────────────────────────────────────────
  const [camtel, sosucam, sabc, orange] = await Promise.all([
    p.client.create({ data: { companyId: CID, name: 'CAMTEL SA', email: 'contact@camtel.cm', phone: '+237 222 23 40 00', address: 'Yaoundé, Cameroun' } }),
    p.client.create({ data: { companyId: CID, name: 'SOSUCAM', email: 'achats@sosucam.cm', phone: '+237 233 48 11 11', address: 'Mbalmayo, Cameroun' } }),
    p.client.create({ data: { companyId: CID, name: 'SABC Brasseries', email: 'info@sabc.cm', phone: '+237 233 42 98 00', address: 'Douala, Cameroun' } }),
    p.client.create({ data: { companyId: CID, name: 'Orange Cameroun', email: 'daf@orange.cm', phone: '+237 699 99 00 00', address: 'Yaoundé, Cameroun' } }),
  ])
  console.log('✅ Clients:', [camtel, sosucam, sabc, orange].map(c => c.name).join(', '))

  // ── FACTURES ────────────────────────────────────────────────────────────────
  const inv1ht = 1500000, inv2ht = 2800000, inv3ht = 950000
  const inv4ht = 3200000, inv5ht = 1800000, inv6ht = 650000

  const invoices = await Promise.all([
    p.invoice.create({ data: { companyId: CID, clientId: camtel.id, number: 'CM-2026-001', status: 'PAID', issueDate: d(2026,1,15), dueDate: d(2026,2,14), subtotal: inv1ht, taxRate: TVA_RATE, taxAmount: tva(inv1ht), total: ttc(inv1ht), paidAt: d(2026,2,10), notes: 'Prestation conseil réseau — janvier 2026' } }),
    p.invoice.create({ data: { companyId: CID, clientId: sosucam.id, number: 'CM-2026-002', status: 'PAID', issueDate: d(2026,2,1), dueDate: d(2026,3,3), subtotal: inv2ht, taxRate: TVA_RATE, taxAmount: tva(inv2ht), total: ttc(inv2ht), paidAt: d(2026,2,28), notes: 'Audit système informatique complet' } }),
    p.invoice.create({ data: { companyId: CID, clientId: sabc.id, number: 'CM-2026-003', status: 'SENT', issueDate: d(2026,3,10), dueDate: d(2026,4,9), subtotal: inv3ht, taxRate: TVA_RATE, taxAmount: tva(inv3ht), total: ttc(inv3ht), notes: 'Formation personnel IT — 2 jours' } }),
    p.invoice.create({ data: { companyId: CID, clientId: orange.id, number: 'CM-2026-004', status: 'OVERDUE', issueDate: d(2026,2,15), dueDate: d(2026,3,17), subtotal: inv4ht, taxRate: TVA_RATE, taxAmount: tva(inv4ht), total: ttc(inv4ht), notes: 'Développement application mobile v2' } }),
    p.invoice.create({ data: { companyId: CID, clientId: camtel.id, number: 'CM-2026-005', status: 'DRAFT', issueDate: d(2026,4,1), dueDate: d(2026,5,1), subtotal: inv5ht, taxRate: TVA_RATE, taxAmount: tva(inv5ht), total: ttc(inv5ht), notes: 'Maintenance préventive Q2 2026' } }),
    p.invoice.create({ data: { companyId: CID, clientId: sabc.id, number: 'CM-2026-006', status: 'PAID', issueDate: d(2026,3,20), dueDate: d(2026,4,19), subtotal: inv6ht, taxRate: TVA_RATE, taxAmount: tva(inv6ht), total: ttc(inv6ht), paidAt: d(2026,4,15), notes: 'Support technique mensuel mars' } }),
  ])
  console.log('✅ Factures:', invoices.length, '— montants HT (FCFA):', [inv1ht,inv2ht,inv3ht,inv4ht,inv5ht,inv6ht].join(', '))

  // ── DEVIS ───────────────────────────────────────────────────────────────────
  const q1ht = 5500000, q2ht = 2100000, q3ht = 780000

  await Promise.all([
    p.quote.create({ data: { companyId: CID, clientId: orange.id, number: 'DV-2026-001', status: 'ACCEPTED', issueDate: d(2026,3,5), validUntil: d(2026,5,5), subtotal: q1ht, taxRate: TVA_RATE, taxAmount: tva(q1ht), total: ttc(q1ht), notes: 'Refonte plateforme web Orange Cameroun' } }),
    p.quote.create({ data: { companyId: CID, clientId: sosucam.id, number: 'DV-2026-002', status: 'SENT', issueDate: d(2026,4,10), validUntil: d(2026,6,10), subtotal: q2ht, taxRate: TVA_RATE, taxAmount: tva(q2ht), total: ttc(q2ht), notes: 'Migration infrastructure cloud AWS' } }),
    p.quote.create({ data: { companyId: CID, clientId: sabc.id, number: 'DV-2026-003', status: 'DRAFT', issueDate: d(2026,4,20), validUntil: d(2026,6,20), subtotal: q3ht, taxRate: TVA_RATE, taxAmount: tva(q3ht), total: ttc(q3ht), notes: 'Cybersécurité — test de pénétration' } }),
  ])
  console.log('✅ Devis: 3')

  // ── DÉPENSES ────────────────────────────────────────────────────────────────
  const exps = await Promise.all([
    p.expense.create({ data: { companyId: CID, category: 'RENT', amount: 450000, description: 'Loyer bureaux Bastos — avril 2026', date: d(2026,4,1) } }),
    p.expense.create({ data: { companyId: CID, category: 'SOFTWARE', amount: 185000, description: 'Abonnements SaaS (Microsoft 365, Slack, GitHub)', date: d(2026,4,3) } }),
    p.expense.create({ data: { companyId: CID, category: 'TRAVEL', amount: 320000, description: 'Déplacement Yaoundé-Douala — mission client SABC', date: d(2026,3,18) } }),
    p.expense.create({ data: { companyId: CID, category: 'EQUIPMENT', amount: 890000, description: 'Ordinateur portable Dell XPS + accessoires', date: d(2026,2,20) } }),
    p.expense.create({ data: { companyId: CID, category: 'CONSULTING', amount: 600000, description: 'Honoraires comptable — bilan Q1 2026', date: d(2026,4,5) } }),
    p.expense.create({ data: { companyId: CID, category: 'MARKETING', amount: 250000, description: 'Campagne réseaux sociaux — promotion services', date: d(2026,3,1) } }),
  ])
  console.log('✅ Dépenses: 6')

  // ── EMPLOYÉS ────────────────────────────────────────────────────────────────
  await Promise.all([
    p.employee.create({ data: { companyId: CID, firstName: 'Aristide', lastName: 'Mbarga', email: 'a.mbarga@ubm.cm', employmentType: 'FULL_TIME', grossSalary: 850000, startDate: d(2023,6,1) } }),
    p.employee.create({ data: { companyId: CID, firstName: 'Célestine', lastName: 'Nkodo', email: 'c.nkodo@ubm.cm', employmentType: 'FULL_TIME', grossSalary: 650000, startDate: d(2024,1,15) } }),
    p.employee.create({ data: { companyId: CID, firstName: 'Jean-Paul', lastName: 'Talla', email: 'jp.talla@ubm.cm', employmentType: 'CONTRACT', grossSalary: 420000, startDate: d(2026,1,1) } }),
  ])
  console.log('✅ Employés: 3')

  // ── TRANSACTIONS BANCAIRES ─────────────────────────────────────────────────
  const invPaid = invoices.filter(i => i.status === 'PAID')
  await Promise.all([
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,2,10), label: 'VIR CAMTEL SA — FAC CM-2026-001', amount: ttc(inv1ht), type: 'CREDIT', status: 'MATCHED', invoiceId: invPaid[0]?.id, lettrage: 'L001' } }),
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,2,28), label: 'VIR SOSUCAM — FAC CM-2026-002', amount: ttc(inv2ht), type: 'CREDIT', status: 'MATCHED', invoiceId: invPaid[1]?.id, lettrage: 'L002' } }),
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,4,15), label: 'VIR SABC BRASSERIES — FAC CM-2026-006', amount: ttc(inv6ht), type: 'CREDIT', status: 'MATCHED', invoiceId: invPaid[2]?.id, lettrage: 'L003' } }),
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,4,1), label: 'PRÉLÈV LOYER BASTOS AVRIL', amount: 450000, type: 'DEBIT', status: 'MATCHED', expenseId: exps[0].id, lettrage: 'L004' } }),
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,4,3), label: 'CB ABONNEMENTS SaaS AVRIL', amount: 185000, type: 'DEBIT', status: 'MATCHED', expenseId: exps[1].id, lettrage: 'L005' } }),
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,3,31), label: 'VIR SALAIRES MARS 2026', amount: 1920000, type: 'DEBIT', status: 'UNMATCHED' } }),
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,4,20), label: 'VIR CNPS COTISATIONS SOCIALES Q1', amount: 348000, type: 'DEBIT', status: 'UNMATCHED' } }),
    p.bankTransaction.create({ data: { companyId: CID, date: d(2026,4,22), label: 'VIR ENTRANT ACOMPTE CLIENT ORANGE', amount: 500000, type: 'CREDIT', status: 'UNMATCHED' } }),
  ])
  console.log('✅ Transactions bancaires: 8')

  console.log('\n🎉 Données Cameroun OK !')
  console.log('   CA facturé (payé)  :', (ttc(inv1ht) + ttc(inv2ht) + ttc(inv6ht)).toLocaleString('fr-FR'), 'FCFA TTC')
  console.log('   Encours (envoyé)   :', ttc(inv3ht).toLocaleString('fr-FR'), 'FCFA TTC')
  console.log('   En retard          :', ttc(inv4ht).toLocaleString('fr-FR'), 'FCFA TTC')
  console.log('   Brouillon          :', ttc(inv5ht).toLocaleString('fr-FR'), 'FCFA TTC')
}

main().catch(e => { console.error(e.message); process.exit(1) }).finally(() => p.$disconnect())
