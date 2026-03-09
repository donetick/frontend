import useStickyState from '@/hooks/useStickyState'
import moment from 'moment'
import { createContext, useContext, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

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

export const AVAILABLE_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
]

export const LocalizationProvider = ({ children }) => {
  const { i18n } = useTranslation()
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
  const [language, setLanguage] = useStickyState('en', 'language')

  useEffect(() => {
    i18n.changeLanguage(language)
    moment.locale(language)
  }, [language, i18n])

  useEffect(() => {
    const isRTL = RTL_LANGUAGES.includes(language)
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
      sameDay: `[Today] ${timeFormat}`,
      nextDay: `[Tomorrow] ${timeFormat}`,
      nextWeek: `dddd ${timeFormat}`,
      lastDay: `[Yesterday] ${timeFormat}`,
      lastWeek: `[Last] dddd ${timeFormat}`,
      sameElse: `${dateFormat} ${timeFormat}`,
    })
  }

  const isRTL = RTL_LANGUAGES.includes(language)

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
