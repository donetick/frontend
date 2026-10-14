import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { track } from '../../analytics'
import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
import { canCreateProject } from '../../utils/entitlements'
import {
  CreateProject,
  DeleteProject,
  GetProjects,
  UpdateProject,
} from '../../utils/Fetcher'
import { offlineDB } from '../../utils/OfflineDB'

// Query hook for fetching all projects
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const response = await GetProjects()
        if (response.ok) {
          const data = await response.json()
          const projects = data.res || data
          offlineDB.saveKV('projects', projects)
          return projects
        }
        throw new Error('Failed to fetch projects')
      } catch {
        const cached = await offlineDB.getKV('projects')
        if (cached) return cached
        return []
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Reads the server's { error } message so the form can show why a save failed
// (e.g. a member who is no longer in the circle).
const errorFrom = async (response, fallback) => {
  let message = fallback
  try {
    const body = await response.json()
    if (typeof body?.error === 'string' && body.error.trim())
      message = body.error
  } catch {
    // no JSON body
  }
  const error = new Error(message)
  error.status = response.status
  return error
}

// Mutation hook for creating a new project
export const useCreateProject = () => {
  const queryClient = useQueryClient()
  const { isPlanKnown, isPlus, showPaywall } = usePaywall()

  return useMutation({
    mutationFn: async projectData => {
      // Last line of defense behind the click-time gates: an entry point that
      // forgets to check can't push a free account past its allowance. Waits
      // for the plan to be known so a cold load never blocks a Plus user.
      const existing = queryClient.getQueryData(['projects']) ?? []
      if (isPlanKnown && !canCreateProject(existing.length, isPlus)) {
        showPaywall(PAYWALL_REASON.PROJECT_LIMIT)
        throw new Error('Project limit reached')
      }

      // No local fallback: a project that only exists in this browser would
      // pretend to be shared (or private) while the server knows nothing of it.
      const response = await CreateProject(projectData)
      if (!response.ok) {
        throw await errorFrom(response, 'Failed to create project')
      }
      const data = await response.json()
      track('project_created', {})
      return data.res || data
    },
    onSuccess: newProject => {
      // Update the projects cache
      queryClient.setQueryData(['projects'], (oldProjects = []) => {
        const updatedProjects = [...oldProjects, newProject]
        return updatedProjects
      })

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: error => {
      console.error('Create project mutation failed:', error)
    },
  })
}

// Mutation hook for updating an existing project
export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectData, projectId }) => {
      // Never report success for a save the server did not accept: for a change
      // of who can see the project that would be actively misleading.
      const response = await UpdateProject(projectId, projectData)
      if (!response.ok) {
        throw await errorFrom(response, 'Failed to update project')
      }
      const data = await response.json()
      return data.res || data
    },
    onSuccess: updatedProject => {
      // Update the projects cache
      queryClient.setQueryData(['projects'], (oldProjects = []) => {
        return oldProjects.map(project =>
          project.id === updatedProject.id ? updatedProject : project,
        )
      })

      // Invalidate and refetch. A change of who can see the project also
      // changes task assignments, so tasks are refreshed too.
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['chores'] })
    },
    onError: error => {
      console.error('Update project mutation failed:', error)
    },
  })
}

// Mutation hook for deleting a project
export const useDeleteProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async projectId => {
      try {
        // Prevent deletion of default project
        if (projectId === 'default') {
          throw new Error('Cannot delete the default project')
        }

        const response = await DeleteProject(projectId)
        if (response.ok) {
          return { id: projectId, deleted: true }
        }
        throw new Error('Failed to delete project')
      } catch (error) {
        console.error('Error deleting project:', error)
        // For development, simulate successful deletion
        return { id: projectId, deleted: true }
      }
    },
    onSuccess: ({ id: deletedProjectId }) => {
      // Remove the project from cache
      queryClient.setQueryData(['projects'], (oldProjects = []) => {
        return oldProjects.filter(project => project.id !== deletedProjectId)
      })

      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: error => {
      console.error('Delete project mutation failed:', error)
    },
  })
}

// Hook to get a specific project by ID
export const useProject = projectId => {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async () => {
      try {
        const response = await GetProjects()
        if (response.ok) {
          const data = await response.json()
          const projects = data.res || data
          return projects.find(project => project.id === projectId)
        }
        throw new Error('Failed to fetch project')
      } catch (error) {
        console.error('Error fetching project:', error)
        if (projectId === 'default') {
          return {
            id: 'default',
            name: 'Default Project',
            description: 'Your default project workspace',
            color: '#1976d2',
            created_by: 'system',
            created_at: new Date().toISOString(),
          }
        }
        return null
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  })
}
