import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

export const useProjectFilter = (projects, projectsLoaded = false) => {
  const [, setSearchParams] = useSearchParams()
  const [selectedProject, setSelectedProject] = useState(() => {
    const saved = localStorage.getItem('selectedProject')
    return saved ? JSON.parse(saved) : null
  })

  const projectsWithDefault = useMemo(() => {
    const defaultProject = {
      id: 'default',
      name: 'Default Project',
      description: 'Your default project workspace',
      color: '#1976d2',
      icon: 'FolderOpen',
    }

    const hasDefault = projects.some(
      p => p.id === 'default' || p.name === 'Default Project',
    )

    return hasDefault ? projects : [defaultProject, ...projects]
  }, [projects])

  const setSelectedProjectWithCache = useCallback(
    project => {
      const finalProject = project || null

      setSelectedProject(finalProject)
      localStorage.setItem('selectedProject', JSON.stringify(finalProject))

      // Must go through the router, not window.history: a raw replaceState
      // leaves useSearchParams() holding the old `?project=` value, and the
      // consumer effect that syncs URL → selection then immediately reapplies
      // the stale project, undoing the selection the user just made.
      setSearchParams(
        params => {
          if (finalProject && finalProject.id !== 'default') {
            params.set('project', String(finalProject.id))
          } else {
            params.delete('project')
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  // The cached selection is a whole project object, so a stale one keeps
  // rendering its old name/color even though the project no longer belongs to
  // this account (deleted project, or a different user signing in on a device
  // where logout didn't get to clear storage). Once the real list has loaded,
  // drop any selection that isn't in it.
  useEffect(() => {
    if (!projectsLoaded) return
    if (!selectedProject || selectedProject.id === 'default') return

    if (!projects.some(p => p.id === selectedProject.id)) {
      setSelectedProjectWithCache(null)
    }
  }, [projectsLoaded, projects, selectedProject, setSelectedProjectWithCache])

  return {
    selectedProject,
    projectsWithDefault,
    setSelectedProjectWithCache,
  }
}
