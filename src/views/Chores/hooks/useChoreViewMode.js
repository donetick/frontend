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

const projectViewKey = projectId => `choreCardViewMode:project:${projectId}`

const readProjectViewMode = projectId => {
  const stored = localStorage.getItem(projectViewKey(projectId))
  return viewModeToProjectView(stored) ? stored : null
}

export const useChoreViewMode = (projectId = null) => {
  const [viewMode, setViewMode] = useState(() =>
    projectId === null
      ? readSharedViewMode()
      : readProjectViewMode(projectId) || 'default',
  )
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
    // Keep explicit choices across restarts, even offline or when an older
    // server rejects a layout. Never inherit another scope's layout.
    const localViewMode = readProjectViewMode(projectId)
    setViewMode(
      localViewMode || projectViewToViewMode(savedProjectView) || 'default',
    )
    if (
      localViewMode ||
      (savedProjectView !== null && savedProjectView !== undefined)
    ) {
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
        localStorage.setItem(projectViewKey(projectId), newMode)
        setProjectViewMutation.mutate({ projectId, view: projectView })
      } else {
        localStorage.setItem('choreCardViewMode', newMode)
      }
    },
    [projectId, setProjectViewMutation, viewMode],
  )

  return { toggleViewMode, viewMode }
}
