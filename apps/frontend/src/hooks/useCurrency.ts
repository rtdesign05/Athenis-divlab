/**
 * useCurrency — Fix #2 : devise réactive sans reconnexion
 *
 * AVANT : lisait uniquement user.country depuis le JWT
 *   → changer le pays dans Paramètres nécessitait une reconnexion.
 *
 * APRÈS : lit country et vatRate depuis CompanySettingsContext (API)
 *   → tout changement dans Paramètres → Localisation ou Fiscalité
 *     se répercute immédiatement sur tous les montants affichés.
 */

import { useMemo } from 'react'
import { getCountryConfig } from '@athenis/shared-types'
import { formatCurrency } from '@/shared/utils/currency'
import { useAuth } from '@/features/auth/useAuth'
import { useCompanySettings } from '@/contexts/CompanySettingsContext'

export function useCurrency() {
  const { user }             = useAuth()
  const { country, vatRate } = useCompanySettings()

  // Priorité : contexte Paramètres (API) > JWT (émis à la connexion)
  const effectiveCountry = country || user?.country || 'CM'

  return useMemo(() => {
    const cfg  = getCountryConfig(effectiveCountry)
    const pick = { currencyCode: cfg.currencyCode, locale: cfg.locale }

    return {
      /** Formate un montant dans la devise active (ex : "8 400 000 XAF") */
      fmt: (amount: number | string | null | undefined) => formatCurrency(amount, pick),

      /** Taux TVA venant de Paramètres → Fiscalité (ex : 19.25 pour CM) */
      vatRates:       cfg.vatRates,
      defaultVatRate: vatRate ?? cfg.vatRates[0] ?? 0,

      /** Code devise ISO (XAF, EUR, …) */
      currencyCode:   cfg.currencyCode,
      currencySymbol: cfg.currencySymbol,
      locale:         cfg.locale,
    }
  }, [effectiveCountry, vatRate])
}
