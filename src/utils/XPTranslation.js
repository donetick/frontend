// Keep interpolation/plural options when checking for an XP variant. Looking
// in English first lets untranslated locales use the configured fallback.
export function xpTranslationKey(i18n, namespace, key, options, xpMode) {
  if (!xpMode || typeof key !== 'string') return key
  const xpKey = `${key}_xp`
  return i18n.exists(xpKey, { ...options, ns: namespace, lng: 'en' })
    ? xpKey
    : key
}
