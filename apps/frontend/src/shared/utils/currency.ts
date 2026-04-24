import type { CountryConfig } from '@athenis/shared-types'
import { getCountryConfig } from '@athenis/shared-types'

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

// Currencies with no decimal places
const NO_DECIMALS = new Set(['XOF', 'XAF', 'GNF', 'KMF', 'JPY', 'KRW', 'VND', 'IDR', 'UGX', 'RWF'])

export function formatCurrency(
  amount: number | string | null | undefined,
  currencyOrConfig: string | Pick<CountryConfig, 'currencyCode' | 'locale'> = 'EUR',
  locale = 'fr-FR',
): string {
  const n = toSafeAmount(amount)
  if (typeof currencyOrConfig === 'string') {
    const decimals = NO_DECIMALS.has(currencyOrConfig) ? 0 : 2
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyOrConfig,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n)
  }
  const decimals = NO_DECIMALS.has(currencyOrConfig.currencyCode) ? 0 : 2
  return new Intl.NumberFormat(currencyOrConfig.locale, {
    style: 'currency',
    currency: currencyOrConfig.currencyCode,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function calculateTVA(
  amountHT: number | string,
  rate: number | string = 20,
): { ht: number; tva: number; ttc: number } {
  const htCents = toCents(amountHT)
  const rateCents = toCents(rate)
  const tvaCents = Math.round((htCents * rateCents) / (SCALE * 100))
  return {
    ht: htCents / SCALE,
    tva: tvaCents / SCALE,
    ttc: (htCents + tvaCents) / SCALE,
  }
}

export function getVATRates(countryCode: string): number[] {
  return getCountryConfig(countryCode).vatRates
}
