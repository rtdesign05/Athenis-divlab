/**
 * Tarification des plans Athenis en plusieurs devises.
 *
 * Stratégie : tarifs définis directement par devise (pas de conversion FX au runtime,
 * pour rester lisible et stable). Les montants en FCFA sont arrondis à des prix
 * psychologiques locaux (multiples de 1000 ou 5000), pas une conversion EUR→XAF brute.
 *
 * Pour ajouter une devise : ajouter une entrée dans PLAN_PRICES_BY_CURRENCY.
 * Pour les devises non listées (USD, GBP, etc.), on retombe sur EUR.
 */

import type { Plan } from './user.js'

/** Tarifs mensuels par plan et par devise — en unité locale (centimes ÉCARTÉS) */
export interface PlanPricing {
  amount:        number   // montant numérique (29, 19000, etc.)
  currency:      string   // ISO 4217 (EUR, XAF, XOF, USD…)
  symbol:        string   // affichage (€, F CFA, $…)
  formatted:     string   // pré-formaté pour affichage direct (« 29 € », « 19 000 F CFA »)
  yearlyAmount:  number   // 10 mois soit -2 mois offerts (≈ -17 %)
  yearlyFormatted: string
}

/** Prix mensuel HT par devise — clé = code ISO 4217 */
const PRICES_EUR: Record<Plan, number>  = { FREE: 0, STARTER: 9,    PRO: 29,    PREMIUM: 79     }
const PRICES_XAF: Record<Plan, number>  = { FREE: 0, STARTER: 5900, PRO: 19000, PREMIUM: 49000  }
const PRICES_XOF: Record<Plan, number>  = { FREE: 0, STARTER: 5900, PRO: 19000, PREMIUM: 49000  }
const PRICES_USD: Record<Plan, number>  = { FREE: 0, STARTER: 10,   PRO: 32,    PREMIUM: 89     }
const PRICES_GBP: Record<Plan, number>  = { FREE: 0, STARTER: 8,    PRO: 25,    PREMIUM: 69     }
const PRICES_MAD: Record<Plan, number>  = { FREE: 0, STARTER: 99,   PRO: 299,   PREMIUM: 799    }
const PRICES_TND: Record<Plan, number>  = { FREE: 0, STARTER: 29,   PRO: 89,    PREMIUM: 249    }
const PRICES_NGN: Record<Plan, number>  = { FREE: 0, STARTER: 14000, PRO: 45000, PREMIUM: 119000 }
const PRICES_GHS: Record<Plan, number>  = { FREE: 0, STARTER: 139,  PRO: 449,   PREMIUM: 1199   }
const PRICES_KES: Record<Plan, number>  = { FREE: 0, STARTER: 1300, PRO: 4200,  PREMIUM: 11000  }
const PRICES_ZAR: Record<Plan, number>  = { FREE: 0, STARTER: 169,  PRO: 549,   PREMIUM: 1499   }
const PRICES_CAD: Record<Plan, number>  = { FREE: 0, STARTER: 13,   PRO: 39,    PREMIUM: 109    }
const PRICES_CHF: Record<Plan, number>  = { FREE: 0, STARTER: 9,    PRO: 29,    PREMIUM: 79     }

const PRICES_BY_CURRENCY: Record<string, Record<Plan, number>> = {
  EUR: PRICES_EUR,
  XAF: PRICES_XAF, // Afrique centrale : CM, GA, CG, CF, TD, GQ
  XOF: PRICES_XOF, // Afrique de l'ouest : BJ, BF, CI, ML, NE, SN, TG, GW
  USD: PRICES_USD,
  GBP: PRICES_GBP,
  MAD: PRICES_MAD,
  TND: PRICES_TND,
  NGN: PRICES_NGN,
  GHS: PRICES_GHS,
  KES: PRICES_KES,
  ZAR: PRICES_ZAR,
  CAD: PRICES_CAD,
  CHF: PRICES_CHF,
}

/** Formate un montant selon la locale et la devise (Intl.NumberFormat) */
function formatPrice(amount: number, currencyCode: string, locale: string, symbol: string): string {
  if (amount === 0) return 'Gratuit'
  try {
    // Pour XAF/XOF, Intl gère bien le format « 19 000 F CFA »
    const formatted = new Intl.NumberFormat(locale, {
      style:    'currency',
      currency: currencyCode,
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount)
    return formatted
  } catch {
    // Fallback simple
    const rounded = amount >= 1000 ? Math.round(amount).toLocaleString('fr-FR') : amount.toFixed(amount < 100 ? 0 : 0)
    return `${rounded} ${symbol}`
  }
}

/**
 * Retourne le pricing pour un plan donné dans la devise locale.
 *
 * @param plan         Plan demandé
 * @param currencyCode Code ISO 4217 (EUR, XAF, XOF, USD…). Fallback EUR si inconnu.
 * @param locale       Locale BCP-47 pour le formatage (fr-CM, fr-FR, en-US…)
 * @param symbol       Symbole monétaire pour fallback (€, F CFA, $…)
 */
export function getPlanPricing(
  plan: Plan,
  currencyCode: string,
  locale: string,
  symbol: string,
): PlanPricing {
  const upper = currencyCode.toUpperCase()
  const knownPrices = PRICES_BY_CURRENCY[upper]
  const prices: Record<Plan, number> = knownPrices ?? PRICES_EUR
  const effectiveCurrency = knownPrices ? upper : 'EUR'
  const effectiveSymbol   = knownPrices ? symbol : '€'

  const monthly: number = prices[plan]
  const yearly:  number = monthly * 10 // 10 mois = 2 mois offerts

  return {
    amount:           monthly,
    currency:         effectiveCurrency,
    symbol:           effectiveSymbol,
    formatted:        formatPrice(monthly, effectiveCurrency, locale, effectiveSymbol),
    yearlyAmount:     yearly,
    yearlyFormatted:  formatPrice(yearly, effectiveCurrency, locale, effectiveSymbol),
  }
}

/** Renvoie tous les plans pour une devise donnée, prêts à être affichés */
export function getAllPlansPricing(
  currencyCode: string,
  locale: string,
  symbol: string,
): Record<Plan, PlanPricing> {
  return {
    FREE:    getPlanPricing('FREE',    currencyCode, locale, symbol),
    STARTER: getPlanPricing('STARTER', currencyCode, locale, symbol),
    PRO:     getPlanPricing('PRO',     currencyCode, locale, symbol),
    PREMIUM: getPlanPricing('PREMIUM', currencyCode, locale, symbol),
  }
}
