import CloseRounded from '@mui/icons-material/CloseRounded'
import { Box, IconButton } from '@mui/joy'
import { useContext, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UNSAFE_LocationContext as LocationContext,
  useLocation,
  useNavigate,
  useOutlet,
} from 'react-router-dom'

import { TaskSidePaneContext } from '../contexts/TaskSidePaneContext'
import { useResponsiveQuery } from '../hooks/useResponsiveQuery'
import PageTransition from './animations/PageTransition'
import ResizableTaskPane from './ResizableTaskPane'

const isTaskRoute = pathname =>
  /^\/chores\/(?:create|\d+(?:\/(?:edit|history|timer))?)\/?$/.test(pathname)

const isListRoute = pathname =>
  /^\/(?:home|chores|my\/chores|archived|search|projects(?:\/[^/]+)?|labels(?:\/[^/]+)?|filters(?:\/[^/]+)?)\/?$/.test(
    pathname,
  )

// Retain the actual routed element (including its route context), not a second
// copy of the list. Its filters, scroll position and local state survive.
export default function TaskRouteLayout() {
  const location = useLocation()
  const locationContext = useContext(LocationContext)
  const outlet = useOutlet()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const large = useResponsiveQuery('largeUp')
  const [snapshot, setSnapshot] = useState(null)
  const [previousLocation, setPreviousLocation] = useState(null)

  if (previousLocation !== location) {
    setPreviousLocation(location)
    if (isListRoute(location.pathname)) {
      setSnapshot({ outlet, locationContext, location })
    } else if (!isTaskRoute(location.pathname)) {
      setSnapshot(null)
    }
  }

  const split = large && isTaskRoute(location.pathname) && Boolean(snapshot)

  return (
    <TaskSidePaneContext.Provider value={split}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', minWidth: 0 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <LocationContext.Provider
            value={split ? snapshot.locationContext : locationContext}
          >
            <PageTransition disabled={split}>
              {split ? snapshot.outlet : outlet}
            </PageTransition>
          </LocationContext.Provider>
        </Box>
        {split && (
          <ResizableTaskPane>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
              <IconButton
                aria-label={t('common:close', { defaultValue: 'Close' })}
                onClick={() => navigate(snapshot.location)}
              >
                <CloseRounded />
              </IconButton>
            </Box>
            {outlet}
          </ResizableTaskPane>
        )}
      </Box>
    </TaskSidePaneContext.Provider>
  )
}
