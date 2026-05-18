/**
 * Helpers d'export CSV sécurisé.
 *
 * Sécurité (CSV formula injection) : Excel/Google Sheets/LibreOffice
 * interprètent comme FORMULE toute cellule commençant par `=`, `+`, `-`, `@`,
 * `\t` ou `\r`. Un user malveillant qui saisit un nom de client
 * `=HYPERLINK("https://phish.com","Cliquer")` peut piéger toute personne
 * ouvrant un export CSV téléchargé.
 *
 * Mitigation OWASP : préfixer ces cellules par une apostrophe `'` (la cellule
 * reste lisible mais n'est plus évaluée) — c'est la norme de facto.
 *
 * Quoting : RFC 4180 — si la cellule contient `"`, `,`, `;` ou un saut de
 * ligne, on entoure de guillemets et on double les `"` internes.
 */

const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/

export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // 1. Neutraliser l'évaluation comme formule
  if (FORMULA_PREFIX_RE.test(s)) {
    s = `'${s}`
  }
  // 2. Quoting RFC 4180
  if (/["\r\n,;]/.test(s)) {
    s = `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Joint une ligne CSV en échappant chaque cellule. Séparateur par défaut `;`
 *  (compatible Excel FR) — passer `,` pour la version internationale. */
export function csvRow(cells: unknown[], separator: string = ';'): string {
  return cells.map(escapeCsvCell).join(separator)
}

/** Construit un CSV complet à partir d'un tableau de lignes (chaque ligne = array). */
export function buildCsv(rows: unknown[][], separator: string = ';'): string {
  return rows.map(r => csvRow(r, separator)).join('\r\n')
}
