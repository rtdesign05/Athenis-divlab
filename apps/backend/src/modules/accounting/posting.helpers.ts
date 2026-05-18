/**
 * Helpers purs extraits de posting.service.ts pour permettre des tests
 * unitaires sans dépendance à Prisma / DB.
 *
 * NE PAS y mettre de code qui touche Prisma ou des effets de bord.
 */

// ── Comptes par défaut selon zone comptable ──────────────────────────────────

export type AccountingZone = 'OHADA' | 'FRANCE' | string

export interface DefaultAccounts {
  client:        string
  supplier:      string
  produit:       string
  charge:        string
  tvaCollectee:  string
  tvaDeductible: string
  journalVente:  string
  journalAchat:  string
}

/**
 * Renvoie les comptes comptables par défaut selon la zone (OHADA / FRANCE).
 * Référence SYSCOHADA / PCG France 2014.
 */
export function defaultAccounts(zone: AccountingZone): DefaultAccounts {
  const isOhada = zone === 'OHADA' || zone !== 'FRANCE'
  return {
    client:        '411',
    supplier:      '401',
    produit:       '706',                          // 706 Services vendus (idem zones)
    charge:        '604',                          // 604 Achats stockés (idem zones)
    tvaCollectee:  isOhada ? '4431'  : '44571',
    tvaDeductible: isOhada ? '4452'  : '44566',
    journalVente:  'VTE',
    journalAchat:  'ACH',
  }
}

// ── Calcul CMUP (Coût Moyen Unitaire Pondéré) ─────────────────────────────────

/**
 * Calcule le nouveau CMUP après une entrée en stock (achat).
 *   CMUP = (stockAvant × CMUP_avant + qte × prixAchat) / stockApres
 *
 * Si stockApres ≤ 0 (cas limite : achat de 0, dépassé en aval), renvoie le
 * prix d'achat brut pour éviter une division par zéro.
 */
export function computeCmupAfterEntry(
  stockAvant: number,
  cmupAvant:  number,
  quantite:   number,
  prixAchat:  number,
): number {
  const stockApres = stockAvant + quantite
  if (stockApres <= 0) return prixAchat
  return (stockAvant * cmupAvant + quantite * prixAchat) / stockApres
}

// ── Vérification d'équilibre comptable D=C ────────────────────────────────────

export interface AccountingLine {
  debit?:  number | null
  credit?: number | null
}

/**
 * Vérifie que la somme des débits égale la somme des crédits dans une pièce.
 * @param tolerance acceptable delta en valeur absolue (défaut 0,01)
 * @returns { balanced, sumDebit, sumCredit, delta }
 */
export function verifyBalance(
  lines: AccountingLine[],
  tolerance: number = 0.01,
): { balanced: boolean; sumDebit: number; sumCredit: number; delta: number } {
  const sumDebit  = lines.reduce((s, l) => s + Number(l.debit  ?? 0), 0)
  const sumCredit = lines.reduce((s, l) => s + Number(l.credit ?? 0), 0)
  const delta = +(sumDebit - sumCredit).toFixed(2)
  return {
    balanced: Math.abs(delta) <= tolerance,
    sumDebit,
    sumCredit,
    delta,
  }
}

// ── Mapping zone → compte de trésorerie par défaut ───────────────────────────

export function defaultTreasuryAccount(zone: AccountingZone): string {
  const isOhada = zone === 'OHADA' || zone !== 'FRANCE'
  return isOhada ? '521' : '512'  // 521 Banques (OHADA) / 512 Banques (PCG)
}

// ── Détermination du type comptable depuis un numéro de compte ───────────────

/**
 * Déduit le type comptable (ACTIF/PASSIF/CHARGE/PRODUIT) à partir du numéro
 * du compte selon les conventions SYSCOHADA et PCG.
 */
export type AccountType = 'ACTIF' | 'PASSIF' | 'CHARGE' | 'PRODUIT'

export function inferAccountType(numero: string): AccountType {
  const classe = parseInt(numero[0] ?? '0', 10)
  if (classe === 6) return 'CHARGE'
  if (classe === 7) return 'PRODUIT'
  // Classe 4 : 41x (clients) = ACTIF, 40x/44x (fournisseurs/État) = PASSIF
  if (classe === 4) {
    if (numero.startsWith('41')) return 'ACTIF'
    return 'PASSIF'
  }
  // Classes 2, 3, 5 → ACTIF par défaut ; classe 1 → PASSIF (capitaux)
  if (classe === 1) return 'PASSIF'
  return 'ACTIF'
}
