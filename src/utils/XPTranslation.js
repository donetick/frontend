// New context labels can fall back to English without changing unrelated text.
export const translatePoints = (
  translate,
  i18n,
  namespace,
  xpMode,
  key,
  options = {},
) => {
  const opts = typeof options === 'string' ? { defaultValue: options } : options
  if (!xpMode || typeof key !== 'string') return translate(key, opts)
  const contextKey = `${key}_xp`
  const lookup = {
    ...opts,
    ns: namespace,
    fallbackLng: false,
    fallbackNS: false,
  }
  const englishVariant = i18n.exists(contextKey, { ...lookup, lng: 'en' })
  const localizedVariant = i18n.exists(contextKey, {
    ...lookup,
    lng: i18n.resolvedLanguage,
  })
  return translate(key, {
    ...opts,
    context: 'xp',
    ...(englishVariant && !localizedVariant ? { lng: 'en' } : {}),
  })
}
