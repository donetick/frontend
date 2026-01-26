import { useState, useMemo, useCallback } from 'react'

export const useProjectFilter = projects => {
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

  const setSelectedProjectWithCache = useCallback(project => {
    const finalProject = project || null

    setSelectedProject(finalProject)
    localStorage.setItem('selectedProject', JSON.stringify(finalProject))

    const newUrl = new URL(window.location)
    if (finalProject && finalProject.id !== 'default') {
      newUrl.searchParams.set('project', encodeURIComponent(finalProject.id))
    } else {
      newUrl.searchParams.delete('project')
    }
    window.history.replaceState({}, '', newUrl)
  }, [])

  return {
    selectedProject,
    projectsWithDefault,
    setSelectedProjectWithCache,
  }
}
