// One moment locale per language the app offers (see AVAILABLE_LANGUAGES in
// LocalizationContext). Without the import, moment.locale() falls back to
// English and every relative time and weekday stays untranslated.
import 'moment/dist/locale/ar'
import 'moment/dist/locale/cs'
import 'moment/dist/locale/de'
import 'moment/dist/locale/es'
import 'moment/dist/locale/fr'
import 'moment/dist/locale/he'
import 'moment/dist/locale/it'
import 'moment/dist/locale/ja'
import 'moment/dist/locale/nl'
import 'moment/dist/locale/pl'
import 'moment/dist/locale/pt-br'
import 'moment/dist/locale/ru'
import 'moment/dist/locale/zh-cn'

import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import HttpBackend from 'i18next-http-backend'
import moment from 'moment'
import { initReactI18next } from 'react-i18next'

// moment's Arabic locale writes Eastern Arabic digits, while counts coming
// from i18next and every input field use Western ones. Keep a single digit
// system on screen.
moment.updateLocale('ar', { postformat: string => string })
// Importing or updating a locale also makes it the global one; the language
// itself is applied by LocalizationProvider.
moment.locale('en')

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    ns: [
      'auth',
      'common',
      'settings',
      'chores',
      'labels',
      'history',
      'filters',
      'things',
      'projects',
      'timer',
      'points',
      'rewards',
    ],
    defaultNS: 'common',

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    react: {
      useSuspense: true,
    },
  })

export default i18n
