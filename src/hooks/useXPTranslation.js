import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useUserProfile } from '../queries/UserQueries'
import { translatePoints } from '../utils/XPTranslation'

// XP context strings use normal translations when available. Until a locale
// supplies its XP variants, only these new labels use the English fallback.
export const useXPTranslation = namespace => {
  const translation = useTranslation(namespace)
  const { data: profile } = useUserProfile()
  const { i18n, t: translate } = translation
  const xpMode = !!profile?.xpMode
  const t = useCallback(
    (key, options) =>
      translatePoints(translate, i18n, namespace, xpMode, key, options),
    [translate, i18n, namespace, xpMode],
  )
  return { ...translation, t }
}
