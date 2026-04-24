import { useMemo } from 'react'
import { getCountryConfig } from '@athenis/shared-types'
import { formatCurrency } from '@/shared/utils/currency'
import { useAuth } from './useAuth'

export function useCurrency() {
  const { user } = useAuth()
  const country = user?.country ?? 'FR'

  return useMemo(() => {
    const cfg = getCountryConfig(country)
    const pick = { currencyCode: cfg.currencyCode, locale: cfg.locale }
    return {
      fmt: (amount: number | string | null | undefined) => formatCurrency(amount, pick),
      vatRates: cfg.vatRates,
      defaultVatRate: cfg.vatRates[0] ?? 0,
      currencyCode: cfg.currencyCode,
      currencySymbol: cfg.currencySymbol,
      locale: cfg.locale,
    }
  }, [country])
}
