import moment from 'moment'
import { createContext, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import useStickyState from '@/hooks/useStickyState'

import {
  AVAILABLE_LANGUAGES,
  getMomentLocale,
  resolveLanguage,
} from '../i18n/languages'

export { AVAILABLE_LANGUAGES } from '../i18n/languages'

const LocalizationContext = createContext()

export const DATE_FORMATS = {
  MDY: 'MM/DD/YYYY',
  DMY: 'DD/MM/YYYY',
  YMD: 'YYYY-MM-DD',
  LONG: 'MMMM D, YYYY',
  SHORT: 'MMM D, YYYY',
}

export const TIME_FORMATS = {
  HOUR_12: 'h:mm A',
  HOUR_24: 'HH:mm',
}

export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur']

// Sensible regional defaults applied when the user switches language.
// These are only a starting point — the user can still override any of
// them individually afterwards.
export const LANGUAGE_DEFAULTS = {
  en: {
    dateFormat: DATE_FORMATS.MDY,
    timeFormat: TIME_FORMATS.HOUR_12,
    firstDayOfWeek: 0,
  },
  ar: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_12,
    firstDayOfWeek: 6,
  },
  cs: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  de: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  es: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  fr: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  he: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 0,
  },
  it: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  nl: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  ja: {
    dateFormat: DATE_FORMATS.YMD,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 0,
  },
  pl: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  pt: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 0,
  },
  ru: {
    dateFormat: DATE_FORMATS.DMY,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
  'zh-CN': {
    dateFormat: DATE_FORMATS.YMD,
    timeFormat: TIME_FORMATS.HOUR_24,
    firstDayOfWeek: 1,
  },
}

export const LocalizationProvider = ({ children }) => {
  const { i18n, t } = useTranslation()
  const [dateFormat, setDateFormat] = useStickyState(
    DATE_FORMATS.MDY,
    'dateFormat',
  )
  const [timeFormat, setTimeFormat] = useStickyState(
    TIME_FORMATS.HOUR_12,
    'timeFormat',
  )
  const [firstDayOfWeek, setFirstDayOfWeek] = useStickyState(
    0,
    'firstDayOfWeek',
  ) // 0 = Sunday, 1 = Monday
  const [storedLanguage, setLanguageRaw] = useStickyState('en', 'language')
  const language = resolveLanguage(storedLanguage)

  const setLanguage = code => {
    const resolved = resolveLanguage(code)
    setLanguageRaw(resolved)
    const defaults =
      LANGUAGE_DEFAULTS[resolved] || LANGUAGE_DEFAULTS[resolved.split('-')[0]]
    if (defaults) {
      setDateFormat(defaults.dateFormat)
      setTimeFormat(defaults.timeFormat)
      setFirstDayOfWeek(defaults.firstDayOfWeek)
    }
  }

  useEffect(() => {
    i18n.changeLanguage(language)
    moment.locale(getMomentLocale(language))
  }, [language, i18n])

  useEffect(() => {
    const isRTL = RTL_LANGUAGES.some(
      rtlLanguage =>
        language === rtlLanguage || language.startsWith(`${rtlLanguage}-`),
    )
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
    document.documentElement.lang = language
  }, [language])

  const formatDate = (date, format = dateFormat) => {
    if (!date) return ''
    return moment(date).format(format)
  }

  const formatDateTime = (date, format) => {
    if (!date) return ''
    const dateTimeFormat = format || `${dateFormat} ${timeFormat}`
    return moment(date).format(dateTimeFormat)
  }

  const formatTime = (date, format = timeFormat) => {
    if (!date) return ''
    return moment(date).format(format)
  }

  const formatRelative = date => {
    if (!date) return ''
    return moment(date).fromNow()
  }

  const formatCalendar = date => {
    if (!date) return ''
    return moment(date).calendar(null, {
      sameDay: `[${t('calendar.today')}] ${timeFormat}`,
      nextDay: `[${t('calendar.tomorrow')}] ${timeFormat}`,
      nextWeek: `dddd ${timeFormat}`,
      lastDay: `[${t('calendar.yesterday')}] ${timeFormat}`,
      lastWeek: `[${t('calendar.last')}] dddd ${timeFormat}`,
      sameElse: `${dateFormat} ${timeFormat}`,
    })
  }

  const isRTL = RTL_LANGUAGES.some(
    rtlLanguage =>
      language === rtlLanguage || language.startsWith(`${rtlLanguage}-`),
  )

  const fmt = {
    date: formatDate,
    dateTime: formatDateTime,
    time: formatTime,
    relative: formatRelative,
    calendar: formatCalendar,
  }

  const value = {
    dateFormat,
    setDateFormat,
    timeFormat,
    setTimeFormat,
    firstDayOfWeek,
    setFirstDayOfWeek,
    language,
    setLanguage,
    isRTL,
    fmt,
    availableLanguages: AVAILABLE_LANGUAGES,
  }

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}

export const useLocalization = () => {
  const context = useContext(LocalizationContext)
  if (!context) {
    throw new Error('useLocalization must be used within LocalizationProvider')
  }
  return context
}
