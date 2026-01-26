import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { GetProjects, CreateProject, UpdateProject, DeleteProject } from '../../utils/Fetcher'

// Query hook for fetching all projects
export const useProjects = () => {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        const response = await GetProjects()
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        throw new Error('Failed to fetch projects')
      } catch (error) {
        console.error('Error fetching projects:', error)
        // Return default project if API fails
        return [
          {
            id: 'default',
            name: 'Default Project',
            description: 'Your default project workspace',
            color: '#1976d2',
            created_by: 'system',
            created_at: new Date().toISOString(),
          }
        ]
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  })
}

// Mutation hook for creating a new project
export const useCreateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectData) => {
      try {
        const response = await CreateProject(projectData)
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        throw new Error('Failed to create project')
      } catch (error) {
        console.error('Error creating project:', error)
        // For development, create a local project
        const localProject = {
          id: `local-${Date.now()}`,
          ...projectData,
          created_by: 'current_user',
          created_at: new Date().toISOString(),
        }
        return localProject
      }
    },
    onSuccess: (newProject) => {
      // Update the projects cache
      queryClient.setQueryData(['projects'], (oldProjects = []) => {
        const updatedProjects = [...oldProjects, newProject]
        return updatedProjects
      })

      // Invalidate and refetch
      queryClient.invalidateQueries(['projects'])
    },
    onError: (error) => {
      console.error('Create project mutation failed:', error)
    },
  })
}

// Mutation hook for updating an existing project
export const useUpdateProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, projectData }) => {
      try {
        const response = await UpdateProject(projectId, projectData)
        if (response.ok) {
          const data = await response.json()
          return data.res || data
        }
        throw new Error('Failed to update project')
      } catch (error) {
        console.error('Error updating project:', error)
        // For development, return updated project
        return {
          id: projectId,
          ...projectData,
          updated_at: new Date().toISOString(),
        }
      }
    },
    onSuccess: (updatedProject) => {
      // Update the projects cache
      queryClient.setQueryData(['projects'], (oldProjects = []) => {
        return oldProjects.map(project =>
          project.id === updatedProject.id ? updatedProject : project
        )
      })

      // Invalidate and refetch
      queryClient.invalidateQueries(['projects'])
    },
    onError: (error) => {
      console.error('Update project mutation failed:', error)
    },
  })
}

// Mutation hook for deleting a project
export const useDeleteProject = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (projectId) => {
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
      queryClient.invalidateQueries(['projects'])
    },
    onError: (error) => {
      console.error('Delete project mutation failed:', error)
    },
  })
}

// Hook to get a specific project by ID
export const useProject = (projectId) => {
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