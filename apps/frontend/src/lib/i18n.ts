/**
 * Configuration i18n Athenis — bootstrap react-i18next.
 *
 * Stratégie : on commence avec un seul namespace FR (la langue courante de
 * l'app). Tout nouveau libellé utilisateur DOIT passer par t('cle') au lieu
 * d'être hardcodé dans le JSX. Quand on activera une langue cible (EN/AR),
 * on dupliquera `locales/fr/common.json` vers `locales/en/common.json` et
 * on traduira.
 *
 * Convention de clés :
 *   common.cancel            → boutons / labels génériques réutilisables
 *   <module>.<page>.<elt>    → texte spécifique à une page
 *
 * Exemple d'usage dans un composant :
 *   import { useTranslation } from 'react-i18next'
 *   const { t } = useTranslation()
 *   <button>{t('common.cancel')}</button>
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import fr from '../locales/fr/common.json'

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { common: fr },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr'],
    defaultNS: 'common',
    interpolation: { escapeValue: false }, // React échappe déjà
    detection: {
      // localStorage > navigator. Pas de cookie pour éviter la dépendance RGPD.
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'athenis:lang',
      caches: ['localStorage'],
    },
  })

export default i18n
