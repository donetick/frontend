// Codes match public/locales and Crowdin; date locales follow Moment's names.
export const AVAILABLE_LANGUAGES = [
  // Keep the existing English date fallback until machine date serialization
  // is independent of Arabic numeral postformatting.
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', momentLocale: 'en' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', momentLocale: 'cs' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', momentLocale: 'de' },
  { code: 'en', name: 'English', nativeName: 'English', momentLocale: 'en' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', momentLocale: 'es' },
  {
    code: 'es-ES',
    name: 'Spanish (Spain)',
    nativeName: 'Español (España)',
    momentLocale: 'es',
  },
  { code: 'fr', name: 'French', nativeName: 'Français', momentLocale: 'fr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', momentLocale: 'he' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', momentLocale: 'it' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', momentLocale: 'nl' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', momentLocale: 'ja' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', momentLocale: 'pl' },
  {
    code: 'pt',
    name: 'Portuguese (Brazil)',
    nativeName: 'Português (Brasil)',
    momentLocale: 'pt-br',
  },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', momentLocale: 'ru' },
  {
    code: 'zh-CN',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    momentLocale: 'zh-cn',
  },
]

const byCode = new Map(
  AVAILABLE_LANGUAGES.map(language => [language.code.toLowerCase(), language]),
)
const aliases = {
  zh: 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-hans-cn': 'zh-CN',
  'zh-hans-sg': 'zh-CN',
  'zh-sg': 'zh-CN',
  'pt-br': 'pt',
}

export const resolveLanguage = code => {
  if (typeof code !== 'string') return 'en'
  const normalized = code.trim().replace(/_/g, '-').toLowerCase()
  return (
    byCode.get(normalized)?.code ||
    aliases[normalized] ||
    byCode.get(normalized.split('-')[0])?.code ||
    'en'
  )
}

export const getMomentLocale = code =>
  byCode.get(resolveLanguage(code).toLowerCase()).momentLocale
