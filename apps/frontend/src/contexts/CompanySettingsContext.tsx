/**
 * CompanySettingsContext
 *
 * Source unique de vérité pour les paramètres de l'entreprise qui
 * doivent être partagés entre les modules :
 *
 *   Paramètres → Localisation ──→ pays / devise / locale (useCurrency)
 *   Paramètres → Agences      ──→ liste des agences      (filtres Gestion)
 *   Paramètres → Fiscalité    ──→ taux TVA principal     (useCurrency)
 *
 * Sans ce contexte, chaque module lisait ses propres données isolées.
 * Maintenant tout changement dans Paramètres se propage immédiatement.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { settingsApi, type CompanySettings, type Agence } from '@/services/settingsApi'
import { getCountryConfig, TVA_CM } from '@athenis/shared-types'

/** Taux TVA par défaut en pourcent (19,25 pour le Cameroun) — source : taxConstants. */
const DEFAULT_VAT_PCT = TVA_CM * 100
import { useAuth } from '@/features/auth/useAuth'

// ── Agences de démonstration ──────────────────────────────────────────────────
// Fallback utilisé quand l'API est indisponible.
// Ces noms correspondent exactement aux agences dans GestionContext
// pour que le filtrage fonctionne en mode démo.

// Liste vide par défaut — les agences réelles arrivent de l'API.
export const DEMO_AGENCES: Agence[] = []

// ── Types ─────────────────────────────────────────────────────────────────────

interface CompanySettingsState {
  /** Paramètres société chargés depuis l'API */
  company:      CompanySettings | null
  /** Liste des agences actives — utilisée par les filtres dans Gestion */
  agences:      Agence[]
  /** Code pays en vigueur (ex : 'CM', 'FR') — source de la devise */
  country:      string
  /** Code devise (ex : 'XAF', 'EUR') — dérivé de country */
  currencyCode: string
  /** Taux TVA principal en % (ex : 19.25 pour le Cameroun) */
  vatRate:      number
  /** true quand le premier chargement est terminé */
  loaded:       boolean
}

interface CompanySettingsContextValue extends CompanySettingsState {
  /** Recharge la liste des agences depuis l'API et met à jour le contexte */
  refreshAgences: () => Promise<void>
  /** Met à jour la liste des agences localement (utilisé par AgencesPage après CRUD) */
  setAgences: (agences: Agence[]) => void
  /** Recharge les paramètres société (pays, devise, etc.) */
  refreshCompany: () => Promise<void>
}

const CompanySettingsContext = createContext<CompanySettingsContextValue | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // État initial basé sur le JWT (valeur sûre avant le chargement API)
  const [state, setState] = useState<CompanySettingsState>(() => {
    const country = user?.country ?? 'CM'
    const cfg     = getCountryConfig(country)
    return {
      company:      null,
      agences:      DEMO_AGENCES,
      country,
      currencyCode: cfg.currencyCode,
      vatRate:      cfg.vatRates[0] ?? DEFAULT_VAT_PCT,
      loaded:       false,
    }
  })

  // ── Chargement initial ────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    async function init() {
      // Chargement parallèle des deux ressources
      const [company, agences] = await Promise.all([
        settingsApi.getCompany().catch((): CompanySettings | null => null),
        settingsApi.listAgences().catch((): Agence[] => []),
      ])

      if (!mounted) return

      // Le pays vient de l'API > JWT > défaut Cameroun
      const effectiveCountry = company?.country ?? user?.country ?? 'CM'
      const cfg = getCountryConfig(effectiveCountry)

      setState({
        company,
        agences:      agences.length > 0 ? agences : DEMO_AGENCES,
        country:      effectiveCountry,
        currencyCode: cfg.currencyCode,
        vatRate:      cfg.vatRates[0] ?? DEFAULT_VAT_PCT,
        loaded:       true,
      })
    }

    void init()
    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount uniquement

  // ── Actions exposées ──────────────────────────────────────────────────────

  const refreshAgences = useCallback(async () => {
    try {
      const agences = await settingsApi.listAgences()
      setState(prev => ({
        ...prev,
        agences: agences.length > 0 ? agences : DEMO_AGENCES,
      }))
    } catch {
      /* conserver la liste courante si l'API échoue */
    }
  }, [])

  const setAgences = useCallback((agences: Agence[]) => {
    setState(prev => ({ ...prev, agences }))
  }, [])

  const refreshCompany = useCallback(async () => {
    try {
      const company = await settingsApi.getCompany()
      const cfg = getCountryConfig(company.country ?? 'CM')
      setState(prev => ({
        ...prev,
        company,
        country:      company.country,
        currencyCode: cfg.currencyCode,
        vatRate:      cfg.vatRates[0] ?? DEFAULT_VAT_PCT,
      }))
    } catch {
      /* conserver les paramètres courants */
    }
  }, [])

  return (
    <CompanySettingsContext.Provider
      value={{ ...state, refreshAgences, setAgences, refreshCompany }}
    >
      {children}
    </CompanySettingsContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCompanySettings(): CompanySettingsContextValue {
  const ctx = useContext(CompanySettingsContext)
  if (!ctx) throw new Error('useCompanySettings doit être utilisé dans <CompanySettingsProvider>')
  return ctx
}
