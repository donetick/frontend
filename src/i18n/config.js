// Use the same ESM Moment instance as the application for every date locale.
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
import { initReactI18next } from 'react-i18next'

import { AVAILABLE_LANGUAGES, resolveLanguage } from './languages'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: AVAILABLE_LANGUAGES.map(language => language.code),
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
      convertDetectedLanguage: resolveLanguage,
    },

    react: {
      useSuspense: true,
    },
  })

export default i18n
