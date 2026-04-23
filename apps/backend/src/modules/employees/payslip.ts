// Charges patronales et salariales — taux 2026
// Source: URSSAF, Légifrance, circulaires DSS 2026

export interface PayslipLine {
  label:    string
  base:     number
  salRate:  number  // taux salarié %
  salAmt:   number
  empRate:  number  // taux patronal %
  empAmt:   number
}

export interface Payslip {
  month:           string
  employee:        { firstName: string; lastName: string; email: string; employmentType: string }
  grossSalary:     number
  lines:           PayslipLine[]
  totalSalariale:  number
  totalPatronale:  number
  netBeforeTax:    number
  csgDeductible:   number
  netImposable:    number
  netToPay:        number
  totalCost:       number
}

// Plafond mensuel SS 2026
const PMSS = 3925

function line(label: string, base: number, salRate: number, empRate: number): PayslipLine {
  return {
    label,
    base,
    salRate,
    salAmt: Math.round(base * salRate) / 100,
    empRate,
    empAmt: Math.round(base * empRate) / 100,
  }
}

function tranche1(gross: number) { return Math.min(gross, PMSS) }
function tranche2(gross: number) { return Math.max(0, Math.min(gross, 8 * PMSS) - PMSS) }

export function computePayslip(
  gross: number,
  employee: { firstName: string; lastName: string; email: string; employmentType: string },
  month: string,
  isSmallCompany = true, // < 50 salariés
): Payslip {
  const g  = gross
  const t1 = tranche1(g)
  const t2 = tranche2(g)

  const lines: PayslipLine[] = [
    // ── Santé ────────────────────────────────────────────────────────────────
    line('Assurance maladie',                 g,  0.75, 13.00),
    // ── Vieillesse ───────────────────────────────────────────────────────────
    line('Retraite de base (tranche 1)',      t1, 6.90,  8.55),
    line('Retraite de base (déplafonnée)',    g,  0.40,  1.90),
    // ── AGIRC-ARRCO ──────────────────────────────────────────────────────────
    line('Retraite complémentaire T1',        t1, 3.15,  4.72),
    line('Retraite complémentaire T2',        t2, 8.64, 12.95),
    line('CEG T1 (contribution équilibre)',   t1, 0.86,  1.29),
    line('CEG T2',                            t2, 1.08,  1.62),
    // ── Prévoyance / Décès ────────────────────────────────────────────────────
    line('Décès (Association Pôle Emploi)',   t1, 0.00,  0.19),
    // ── Chômage ──────────────────────────────────────────────────────────────
    line('Assurance chômage',                 Math.min(g, 4 * PMSS), 0.00, 4.05),
    line('AGS (garantie salaires)',           Math.min(g, 4 * PMSS), 0.00, 0.25),
    // ── Famille / Allocations ─────────────────────────────────────────────────
    line('Allocations familiales',            g, 0.00, g < 3.5 * 1801.80 ? 3.45 : 5.25),
    // ── Accidents du travail ──────────────────────────────────────────────────
    line('Accidents du travail / Maladies professionnelles', g, 0.00, 2.50),
    // ── Contributions diverses ────────────────────────────────────────────────
    line('Contribution solidarité autonomie (CSA)', g, 0.00, 0.30),
    line('FNAL',                              g, 0.00, isSmallCompany ? 0.10 : 0.50),
    line('Versement mobilité',                g, 0.00, 0.00),  // 0 hors Île-de-France
    // ── Formation / Apprentissage ─────────────────────────────────────────────
    line('Formation professionnelle',         g, 0.00, isSmallCompany ? 1.00 : 0.55),
    line('Taxe d\'apprentissage (base)',       g, 0.00, 0.68),
    line('Contribution dialogue social',      g, 0.00, 0.016),
    // ── CSG / CRDS ────────────────────────────────────────────────────────────
    line('CSG déductible',                    g * 0.9825, 6.80, 0.00),
    line('CSG non déductible',                g * 0.9825, 2.40, 0.00),
    line('CRDS',                              g * 0.9825, 0.50, 0.00),
  ]

  const totalSalariale = lines.reduce((s, l) => s + l.salAmt, 0)
  const totalPatronale = lines.reduce((s, l) => s + l.empAmt, 0)
  const csgDeductible  = lines.find(l => l.label === 'CSG déductible')?.salAmt ?? 0
  const netBeforeTax   = Math.round((g - totalSalariale) * 100) / 100
  const netImposable   = Math.round((netBeforeTax + csgDeductible) * 100) / 100
  const netToPay       = Math.round(netBeforeTax * 100) / 100
  const totalCost      = Math.round((g + totalPatronale) * 100) / 100

  return {
    month,
    employee,
    grossSalary:    Math.round(g * 100) / 100,
    lines,
    totalSalariale: Math.round(totalSalariale * 100) / 100,
    totalPatronale: Math.round(totalPatronale * 100) / 100,
    netBeforeTax,
    csgDeductible:  Math.round(csgDeductible * 100) / 100,
    netImposable,
    netToPay,
    totalCost,
  }
}
