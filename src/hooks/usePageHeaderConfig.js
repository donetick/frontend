import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { useNavBarTitleContext } from '../contexts/NavBarTitleContext'

export const NAVBAR_TITLE_KEYS = {
  '/activities': 'navigation.activities',
  '/archived': 'navigation.archived',
  '/chores': 'navigation.allTasks',
  '/filters': 'navigation.filters',
  '/labels': 'navigation.labels',
  '/points': 'navigation.points',
  '/projects': 'navigation.projects',
  '/things': 'navigation.things',
}

/**
 * What the current route wants in its page header. The mobile nav bar and the
 * desktop page header both read this so a route's identity — its title and its
 * resource switcher — cannot drift between the two.
 */
export const usePageHeaderConfig = () => {
  const { t } = useTranslation('common')
  const location = useLocation()
  const { navBarConfig } = useNavBarTitleContext()

  const normalizedPath =
    location.pathname.length > 1
      ? location.pathname.replace(/\/$/, '')
      : location.pathname
  const titleKey = NAVBAR_TITLE_KEYS[normalizedPath]
  // Only these routes swap their own title in, so a stale config left behind
  // by a page that unmounted late cannot retitle an unrelated route.
  const supportsDynamicTitle =
    normalizedPath === '/chores' || /^\/labels\/[^/]+$/.test(normalizedPath)
  const config = supportsDynamicTitle ? navBarConfig : null

  return {
    normalizedPath,
    selector: config?.selector || null,
    title: config?.title || (titleKey ? t(titleKey) : null),
  }
}

export default usePageHeaderConfig
