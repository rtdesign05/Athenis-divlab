// Charges patronales et salariales — Cameroun 2026
// Sources: CNPS (Caisse Nationale de Prévoyance Sociale), Code du Travail du Cameroun,
//          Loi de Finances 2026, Crédit Foncier du Cameroun, FNE

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
  irppBase:        number   // base imposable IRPP (après abattement 30%)
  irpp:            number   // IRPP mensuel
  cac:             number   // Centimes additionnels communaux (10% IRPP)
  netImposable:    number   // salaire net imposable (avant IRPP)
  netToPay:        number   // net à payer après IRPP + CAC
  totalCost:       number   // coût total employeur
}

// Plafond mensuel CNPS (Cameroun 2026) = 750 000 FCFA / mois
const PLAFOND_CNPS = 750_000

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

/**
 * Calcul de l'IRPP mensuel selon le barème progressif camerounais (art. 69 CGI)
 * Barème annuel converti en mensuel, appliqué sur le revenu net imposable
 * après abattement forfaitaire de 30% (min 500 000 / max 2 000 000 FCFA annuel)
 */
export function computeIRPP(netImposableMensuel: number): number {
  // Abattement 30% sur base mensuelle (plafond annuel 2 000 000 / 12 = 166 667)
  const abattement = Math.min(Math.max(netImposableMensuel * 0.30, 500_000 / 12), 2_000_000 / 12)
  const base = Math.max(0, netImposableMensuel - abattement)

  // Barème mensuel progressif (tranches annuelles ÷ 12)
  // 0 – 166 667 : 10 %   (annuel 0 – 2 000 000)
  // 166 668 – 250 000 : 15 %  (annuel 2 000 001 – 3 000 000)
  // 250 001 – 416 667 : 25 %  (annuel 3 000 001 – 5 000 000)
  // > 416 667 : 35 %           (annuel > 5 000 000)
  let irpp = 0
  const t1 = 2_000_000 / 12
  const t2 = 3_000_000 / 12
  const t3 = 5_000_000 / 12

  if (base <= t1) {
    irpp = base * 0.10
  } else if (base <= t2) {
    irpp = t1 * 0.10 + (base - t1) * 0.15
  } else if (base <= t3) {
    irpp = t1 * 0.10 + (t2 - t1) * 0.15 + (base - t2) * 0.25
  } else {
    irpp = t1 * 0.10 + (t2 - t1) * 0.15 + (t3 - t2) * 0.25 + (base - t3) * 0.35
  }

  return Math.round(irpp)
}

export function computePayslip(
  gross: number,
  employee: { firstName: string; lastName: string; email: string; employmentType: string },
  month: string,
): Payslip {
  const g      = gross
  const baseCnps = Math.min(g, PLAFOND_CNPS)  // base plafonnée CNPS

  const lines: PayslipLine[] = [
    // ── CNPS – Vieillesse / Retraite ────────────────────────────────────────
    // Salarié 4.2 %, Patronal 4.2 % (base plafonnée à 750 000 FCFA/mois)
    line('CNPS – Vieillesse / Retraite',   baseCnps, 4.20,  4.20),

    // ── CNPS – Accidents du travail ─────────────────────────────────────────
    // Salarié 0 %, Patronal 2.5 % (taux normal secteur tertiaire/services)
    line('CNPS – Accidents du travail',    baseCnps, 0.00,  2.50),

    // ── CNPS – Allocations familiales ───────────────────────────────────────
    // Salarié 0 %, Patronal 7 % (base plafonnée)
    line('CNPS – Allocations familiales',  baseCnps, 0.00,  7.00),

    // ── Crédit Foncier du Cameroun (CFC) ────────────────────────────────────
    // Salarié 1 %, Patronal 2 % (sur salaire brut total)
    line('Crédit Foncier du Cameroun',     g,        1.00,  2.00),

    // ── Fonds National de l\'Emploi (FNE) ────────────────────────────────────
    // Salarié 0 %, Patronal 1 % (sur salaire brut total)
    line('Fonds National de l\'Emploi',    g,        0.00,  1.00),
  ]

  const totalSalariale   = Math.round(lines.reduce((s, l) => s + l.salAmt, 0) * 100) / 100
  const totalPatronale   = Math.round(lines.reduce((s, l) => s + l.empAmt, 0) * 100) / 100

  // Net imposable (avant IRPP) = brut − cotisations salariales
  const netImposable = Math.round((g - totalSalariale) * 100) / 100

  // IRPP et CAC
  const irpp = computeIRPP(netImposable)
  const cac  = Math.round(irpp * 0.10)          // Centimes Additionnels Communaux = 10% IRPP

  // Base imposable IRPP (après abattement 30%)
  const abattement = Math.min(Math.max(netImposable * 0.30, 500_000 / 12), 2_000_000 / 12)
  const irppBase = Math.max(0, Math.round(netImposable - abattement))

  const netToPay  = Math.round((netImposable - irpp - cac) * 100) / 100
  const totalCost = Math.round((g + totalPatronale) * 100) / 100

  return {
    month,
    employee,
    grossSalary:   Math.round(g * 100) / 100,
    lines,
    totalSalariale,
    totalPatronale,
    netBeforeTax:  netImposable,   // alias conservé pour compatibilité
    irppBase,
    irpp,
    cac,
    netImposable,
    netToPay,
    totalCost,
  }
}
