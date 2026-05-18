/**
 * Constantes fiscales frontend — re-export depuis @athenis/shared-types.
 *
 * La source de vérité unique est `packages/shared-types/src/taxConstants.ts`.
 * Pour modifier un taux (loi de finances), éditer le fichier dans
 * `packages/shared-types`, pas ici.
 */
export {
  CM_TAX,
  TVA_CM,
  TVA_CM_PCT,
  TVA_FR,
  TVA_UEMOA,
  IS_CM,
  IRPP_BAREME_CM,
  CNPS_PLAFOND_MENSUEL,
  CNPS_TAUX_PVID_SAL,
  CNPS_TAUX_PVID_EMP,
  CNPS_TAUX_PF,
  CNPS_TAUX_AT,
  defaultVatRate,
  defaultCurrency,
} from '@athenis/shared-types'
