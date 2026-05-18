import { describe, it, expect } from 'vitest'
import { computePayslip, computeIRPP, type Payslip } from './payslip.js'

const employee = {
  firstName: 'Jean',
  lastName:  'Dupont',
  email:     'jd@demo.cm',
  employmentType: 'CDI',
}

// ── IRPP Cameroun (barème progressif annuel ÷ 12) ────────────────────────────

describe('computeIRPP — barème mensuel Cameroun (CGI Art. 69)', () => {
  it('renvoie un faible montant pour un revenu très bas', () => {
    // À 50 000, abattement = max(15 000, 41 667) = 41 667 (floor 500 000/12)
    // → base = 8 333 → IRPP = 833 (10%)
    const irpp = computeIRPP(50_000)
    expect(irpp).toBeGreaterThan(0)
    expect(irpp).toBeLessThan(2_000)
  })

  it('tranche 10% s\'applique entre 0 et 166 667 FCFA/mois', () => {
    // 200 000 - 30% = 140 000 (sous t1=166 667) → 10%
    const irpp = computeIRPP(200_000)
    expect(irpp).toBeGreaterThan(0)
    expect(irpp).toBeLessThanOrEqual(140_000 * 0.10)
  })

  it('tranche 35% s\'applique au-delà de 416 667 FCFA/mois (base)', () => {
    // Revenu 5 000 000 FCFA/mois → base imposable largement au-dessus de t3
    const irpp = computeIRPP(5_000_000)
    expect(irpp).toBeGreaterThan(1_000_000)
  })

  it('est monotone croissant', () => {
    const values = [100_000, 500_000, 1_000_000, 2_000_000, 5_000_000]
    let prev = -1
    for (const v of values) {
      const irpp = computeIRPP(v)
      expect(irpp).toBeGreaterThanOrEqual(prev)
      prev = irpp
    }
  })

  it('renvoie un entier (arrondi)', () => {
    expect(Number.isInteger(computeIRPP(1_234_567))).toBe(true)
  })
})

// ── Fiche de paie complète ───────────────────────────────────────────────────

describe('computePayslip — calcul d\'une fiche de paie SYSCOHADA/Cameroun', () => {
  const month = '2026-05'

  describe('Salarié au salaire plafonné CNPS (500 000 FCFA)', () => {
    let p: Payslip
    it('retourne 5 lignes de cotisations', () => {
      p = computePayslip(500_000, employee, month)
      expect(p.lines).toHaveLength(5)
    })

    it('CNPS-Vieillesse calculé sur 500 000 (< plafond) à 4,2% chacun', () => {
      p = computePayslip(500_000, employee, month)
      const vieillesse = p.lines.find(l => l.label.includes('Vieillesse'))!
      expect(vieillesse.salAmt).toBeCloseTo(21_000, 2)  // 500 000 × 4,2%
      expect(vieillesse.empAmt).toBeCloseTo(21_000, 2)
    })

    it('le net imposable = brut − total salariale', () => {
      p = computePayslip(500_000, employee, month)
      expect(p.netImposable).toBe(p.grossSalary - p.totalSalariale)
    })

    it('le net à payer = net imposable − IRPP − CAC', () => {
      p = computePayslip(500_000, employee, month)
      // Petite tolérance d'arrondi
      expect(Math.abs(p.netToPay - (p.netImposable - p.irpp - p.cac))).toBeLessThan(1)
    })

    it('le coût total employeur = brut + total patronale', () => {
      p = computePayslip(500_000, employee, month)
      expect(p.totalCost).toBe(p.grossSalary + p.totalPatronale)
    })

    it('le CAC est exactement 10% de l\'IRPP', () => {
      p = computePayslip(500_000, employee, month)
      expect(p.cac).toBe(Math.round(p.irpp * 0.10))
    })
  })

  describe('Salarié au-dessus du plafond CNPS (1 200 000 FCFA)', () => {
    it('la base CNPS est plafonnée à 750 000', () => {
      const p = computePayslip(1_200_000, employee, month)
      const vieillesse = p.lines.find(l => l.label.includes('Vieillesse'))!
      // Plafonnée à 750 000 × 4,2% = 31 500 (tolérance arrondi float)
      expect(vieillesse.salAmt).toBeCloseTo(31_500, 2)
      expect(vieillesse.empAmt).toBeCloseTo(31_500, 2)
      // La base doit être 750 000 (le plafond), pas 1 200 000
      expect(vieillesse.base).toBe(750_000)
    })

    it('CFC et FNE sont calculés sur le brut TOTAL (non plafonné)', () => {
      const p = computePayslip(1_200_000, employee, month)
      const cfc = p.lines.find(l => l.label.includes('Foncier'))!
      const fne = p.lines.find(l => l.label.includes('Emploi'))!
      expect(cfc.salAmt).toBeCloseTo(12_000, 2)  // CFC salarié 1% sur brut
      expect(cfc.empAmt).toBeCloseTo(24_000, 2)  // CFC patronal 2%
      expect(fne.empAmt).toBeCloseTo(12_000, 2)  // FNE patronal 1%
    })
  })

  describe('Salarié à 80 000 FCFA (proche du SMIG)', () => {
    it('ne retourne pas un net négatif', () => {
      const p = computePayslip(80_000, employee, month)
      expect(p.netToPay).toBeGreaterThanOrEqual(0)
    })
    it('IRPP minimal (sous la tranche 10%)', () => {
      // 80 000 brut → ~76 000 net imposable → abattement floor 41 667
      // → base ~34 333 → IRPP ~3 433 (10%)
      const p = computePayslip(80_000, employee, month)
      expect(p.irpp).toBeLessThan(5_000)
    })
  })

  describe('Cohérence — propriétés invariantes', () => {
    const samples = [100_000, 250_000, 500_000, 750_000, 1_000_000, 2_500_000]

    it('netToPay < grossSalary pour tout salaire', () => {
      for (const g of samples) {
        const p = computePayslip(g, employee, month)
        expect(p.netToPay).toBeLessThan(p.grossSalary)
      }
    })

    it('totalCost ≥ grossSalary (jamais inférieur)', () => {
      for (const g of samples) {
        const p = computePayslip(g, employee, month)
        expect(p.totalCost).toBeGreaterThanOrEqual(p.grossSalary)
      }
    })

    it('toutes les lignes ont base ≥ 0', () => {
      for (const g of samples) {
        const p = computePayslip(g, employee, month)
        for (const l of p.lines) {
          expect(l.base).toBeGreaterThanOrEqual(0)
        }
      }
    })

    it('métadonnées employé propagées correctement', () => {
      const p = computePayslip(500_000, employee, month)
      expect(p.employee.firstName).toBe('Jean')
      expect(p.employee.email).toBe('jd@demo.cm')
      expect(p.month).toBe(month)
    })
  })
})
