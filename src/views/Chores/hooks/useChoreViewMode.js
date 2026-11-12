import { useCallback, useEffect, useRef, useState } from 'react'

import {
  projectViewToViewMode,
  useProjectView,
  useSetProjectView,
  viewModeToProjectView,
} from '../../Projects/ProjectQueries'

const SHARED_VIEW_MODES = ['default', 'compact', 'calendar']

const readSharedViewMode = () => {
  const stored = localStorage.getItem('choreCardViewMode')
  // Older versions also wrote project-only layouts to this key.
  return SHARED_VIEW_MODES.includes(stored) ? stored : 'default'
}

export const useChoreViewMode = (projectId = null) => {
  const [viewMode, setViewMode] = useState(readSharedViewMode)
  const lastSyncedProjectIdRef = useRef(null)
  const { data: savedProjectView } = useProjectView(projectId)
  const setProjectViewMutation = useSetProjectView()

  useEffect(() => {
    if (projectId === null) {
      lastSyncedProjectIdRef.current = null
      setViewMode(readSharedViewMode())
      return
    }
    if (lastSyncedProjectIdRef.current === projectId) return
    // Don't inherit the previous scope's layout while this project loads.
    setViewMode(projectViewToViewMode(savedProjectView) || 'default')
    if (savedProjectView !== null && savedProjectView !== undefined) {
      lastSyncedProjectIdRef.current = projectId
    }
  }, [projectId, savedProjectView])

  const toggleViewMode = useCallback(
    value => {
      const newMode =
        value ??
        SHARED_VIEW_MODES[
          (SHARED_VIEW_MODES.indexOf(viewMode) + 1) % SHARED_VIEW_MODES.length
        ]
      const projectView = viewModeToProjectView(newMode)
      if (!projectView) return
      if (projectId === null && !SHARED_VIEW_MODES.includes(newMode)) return

      setViewMode(newMode)
      if (projectId !== null) {
        // An explicit choice wins over a saved value still being loaded.
        lastSyncedProjectIdRef.current = projectId
        setProjectViewMutation.mutate({ projectId, view: projectView })
      } else {
        localStorage.setItem('choreCardViewMode', newMode)
      }
    },
    [projectId, setProjectViewMutation, viewMode],
  )

  return { toggleViewMode, viewMode }
}
