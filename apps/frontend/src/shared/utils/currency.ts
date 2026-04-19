// Integer arithmetic (work in centimes) to avoid IEEE 754 imprecision.
const SCALE = 100

function toCents(value: number | string | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'string' ? parseFloat(value) : value
  return isFinite(n) ? Math.round(n * SCALE) : 0
}

export function toSafeAmount(value: number | string | null | undefined): number {
  return toCents(value) / SCALE
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currency = 'EUR',
  locale = 'fr-FR',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toSafeAmount(amount))
}

export function calculateTVA(
  amountHT: number | string,
  rate: number | string = 20,
): { ht: number; tva: number; ttc: number } {
  const htCents = toCents(amountHT)
  const rateCents = toCents(rate)
  // tva = ht * rate / 100, all in cents
  const tvaCents = Math.round((htCents * rateCents) / (SCALE * 100))
  return {
    ht: htCents / SCALE,
    tva: tvaCents / SCALE,
    ttc: (htCents + tvaCents) / SCALE,
  }
}
