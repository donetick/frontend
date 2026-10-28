import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { track } from '../../analytics'
import { PAYWALL_REASON, usePaywall } from '../../contexts/PaywallContext'
import { networkManager } from '../../hooks/NetworkManager'
import { reorderedAfter, reorderedChoresAfter } from '../../utils/BoardOrdering'
import { commandQueue, CommandType } from '../../utils/CommandQueue'
import { canCreateProject } from '../../utils/entitlements'
import {
  CreateProject,
  CreateProjectSection,
  DeleteProject,
  DeleteProjectSection,
  GetProjects,
  GetProjectSections,
  MoveProjectChore,
  MoveProjectSection,
  RenameProjectSection,
  UpdateProject,
} from '../../utils/Fetcher'
import { offlineDB } from '../../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../../utils/OfflineFeatureToggle'
import { mergePendingCreates } from '../../utils/PendingChores'

// Queue behind earlier offline writes too, so a reconnect cannot overtake them.
const shouldQueueMove = async () =>
  isOfflineFeatureEnabled() &&
  (!networkManager.isOnline || (await commandQueue.getPending()).length > 0)

const isMoveNetworkError = error =>
  isOfflineFeatureEnabled() &&
  !error.status &&
  (error instanceof TypeError ||
    error?.name === 'AbortError' ||
    !networkManager.isOnline)

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
        throw error
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

// ─── Board (sections + task placement) ──────────────────────────────────────
//
// Sections and which section/position a task sits in are shared state: every
// user who can see the project sees the same columns in the same order,
// whether they personally view it as a board or a list (see useProjectView
// below, which is the private half). Moves are computed server-side from the
// current order, not from a client-sent full list, so two people dragging
// different cards at the same time cannot clobber each other.

// Query hook for a project's board columns, ordered by position.
export const useProjectSections = projectId => {
  return useQuery({
    queryKey: ['projectSections', projectId],
    queryFn: async () => {
      const cacheKey = `project_sections:${projectId}`
      const pendingSectionMove = (await commandQueue.getPending()).some(
        command =>
          command.commandType === CommandType.MOVE_PROJECT_SECTION &&
          command.payload.projectId === projectId,
      )
      if (
        pendingSectionMove ||
        (isOfflineFeatureEnabled() && !networkManager.isOnline)
      ) {
        const cached = await offlineDB.getKV(cacheKey)
        if (Array.isArray(cached)) return cached
        throw new Error('No cached sections available for this project')
      }
      try {
        const response = await GetProjectSections(projectId)
        if (!response.ok) {
          throw await errorFrom(response, 'Failed to fetch sections')
        }
        const data = await response.json()
        const sections = data.res || []
        // Cache failures must not turn a successful request into an error.
        await offlineDB.saveKV(cacheKey, sections).catch(() => {})
        return sections
      } catch (error) {
        const cached = await offlineDB.getKV(cacheKey)
        if (Array.isArray(cached)) return cached
        // Missing cache is not an empty board: don't seed default columns.
        throw error
      }
    },
    // Run the cache fallback even when React Query knows the device is offline.
    networkMode: 'always',
    enabled: Boolean(projectId) && projectId !== 'default',
    staleTime: 60 * 1000,
  })
}

export const useCreateSection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, projectId }) => {
      const response = await CreateProjectSection(projectId, name)
      if (!response.ok) {
        throw await errorFrom(response, 'Failed to create section')
      }
      const data = await response.json()
      return data.res
    },
    onSuccess: (_section, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ['projectSections', projectId],
      })
    },
  })
}

export const useRenameSection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, projectId, sectionId }) => {
      const response = await RenameProjectSection(projectId, sectionId, name)
      if (!response.ok) {
        throw await errorFrom(response, 'Failed to rename section')
      }
    },
    onMutate: async ({ name, projectId, sectionId }) => {
      await queryClient.cancelQueries({
        queryKey: ['projectSections', projectId],
      })
      const previous = queryClient.getQueryData(['projectSections', projectId])
      queryClient.setQueryData(['projectSections', projectId], old =>
        (old || []).map(section =>
          section.id === sectionId ? { ...section, name } : section,
        ),
      )
      return { previous }
    },
    onError: (_err, { projectId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['projectSections', projectId],
          context.previous,
        )
      }
    },
    onSettled: (_data, _err, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ['projectSections', projectId],
      })
    },
  })
}

export const useDeleteSection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, sectionId }) => {
      const response = await DeleteProjectSection(projectId, sectionId)
      if (!response.ok) {
        throw await errorFrom(response, 'Failed to delete section')
      }
    },
    onSuccess: (_data, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: ['projectSections', projectId],
      })
      // A deleted section's chores fall back to another section of the same
      // project, so the chore list itself needs to resync too.
      queryClient.invalidateQueries({ queryKey: ['chores'] })
    },
  })
}

// Section moves use the same optimistic order online and offline.
export const useMoveSection = () => {
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ afterSectionId, projectId, sectionId }) => {
      const queueMove = async () => {
        const key = `project_sections:${projectId}`
        const sections =
          queryClient.getQueryData(['projectSections', projectId]) ??
          (await offlineDB.getKV(key)) ??
          []
        await commandQueue.enqueue(
          CommandType.MOVE_PROJECT_SECTION,
          `project:${projectId}:section:${sectionId}`,
          { afterSectionId, projectId, sectionId },
        )
        await offlineDB.saveKV(
          key,
          reorderedAfter(sections, sectionId, afterSectionId),
        )
        return { queued: true }
      }
      if (await shouldQueueMove()) return queueMove()
      try {
        const response = await MoveProjectSection(
          projectId,
          sectionId,
          afterSectionId,
        )
        if (!response.ok)
          throw await errorFrom(response, 'Failed to move section')
      } catch (error) {
        if (isMoveNetworkError(error)) return queueMove()
        throw error
      }
    },
    onMutate: async ({ afterSectionId, projectId, sectionId }) => {
      await queryClient.cancelQueries({
        queryKey: ['projectSections', projectId],
      })
      const previous = queryClient.getQueryData(['projectSections', projectId])
      queryClient.setQueryData(['projectSections', projectId], old =>
        reorderedAfter(old || [], sectionId, afterSectionId),
      )
      return { previous }
    },
    onError: (_err, { projectId }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ['projectSections', projectId],
          context.previous,
        )
      }
    },
    onSettled: (data, _err, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
      if (!data?.queued)
        queryClient.invalidateQueries({
          queryKey: ['projectSections', projectId],
        })
    },
  })
}

// Moves one chore into sectionId, right after afterChoreId (or first, when
// null). Updates the chore's sectionId and boardPosition optimistically in
// the shared chores cache so the board doesn't wait a round trip to reflect
// the drop.
export const useMoveChore = () => {
  const queryClient = useQueryClient()
  return useMutation({
    networkMode: 'always',
    mutationFn: async ({ afterChoreId, choreId, projectId, sectionId }) => {
      const queueMove = async () => {
        const cached = await mergePendingCreates(
          await offlineDB.getChores(true),
        )
        const visible = queryClient.getQueryData(['chores', false])?.res || []
        const chores = [
          ...new Map(
            [...cached, ...visible].map(chore => [String(chore.id), chore]),
          ).values(),
        ]
        await commandQueue.enqueue(CommandType.MOVE_PROJECT_CHORE, choreId, {
          afterChoreId,
          choreId,
          projectId,
          sectionId,
        })
        await offlineDB.saveChores(
          reorderedChoresAfter(chores, choreId, sectionId, afterChoreId),
        )
        return { queued: true }
      }
      if (await shouldQueueMove()) return queueMove()
      try {
        const response = await MoveProjectChore(
          projectId,
          choreId,
          sectionId,
          afterChoreId,
        )
        if (!response.ok) throw await errorFrom(response, 'Failed to move task')
      } catch (error) {
        if (isMoveNetworkError(error)) return queueMove()
        throw error
      }
    },
    onMutate: async ({ afterChoreId, choreId, sectionId }) => {
      await queryClient.cancelQueries({ queryKey: ['chores'] })
      const previous = queryClient.getQueryData(['chores', false])
      queryClient.setQueryData(['chores', false], old => {
        if (!old?.res) return old
        return {
          ...old,
          res: reorderedChoresAfter(old.res, choreId, sectionId, afterChoreId),
        }
      })
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['chores', false], context.previous)
      }
    },
    onSettled: data => {
      queryClient.invalidateQueries({ queryKey: ['pendingCommands'] })
      if (!data?.queued) queryClient.invalidateQueries({ queryKey: ['chores'] })
    },
  })
}

// ─── View preference (which layout a project is looked at in) ───────────────
//
// Private per user, per project: never shared, never affects the sections or
// task order above. Defaults to "board" server-side when never set. It rides
// along on the same project object GET/PUT /projects already return/accept
// (a `view` field) instead of a dedicated endpoint, so reading it is just a
// lookup into the existing ['projects'] cache and writing it is a PUT
// /projects/:id call that only sends `view`.
//
// Every layout a project can be viewed in is stored, not just board/list:
// cards, compact and calendar are remembered the same way, so coming back to
// a project puts you back in the layout you left it in.

// The UI's own name for the section list is 'project-list'; the wire name is
// 'list', which is what is already stored for existing users. Every other
// layout uses the same name on both sides.
const VIEW_MODE_TO_PROJECT_VIEW = {
  default: 'default',
  compact: 'compact',
  calendar: 'calendar',
  'project-list': 'list',
  board: 'board',
}

const PROJECT_VIEW_TO_VIEW_MODE = {
  default: 'default',
  compact: 'compact',
  calendar: 'calendar',
  list: 'project-list',
  board: 'board',
}

// null for anything this build doesn't know how to store/render, so callers
// can skip it rather than persist or apply a value they can't honour.
export const viewModeToProjectView = viewMode =>
  VIEW_MODE_TO_PROJECT_VIEW[viewMode] || null

export const projectViewToViewMode = view =>
  PROJECT_VIEW_TO_VIEW_MODE[view] || null

export const useProjectView = projectId => {
  const { data: projects } = useProjects()
  const project = projects?.find(p => p.id === projectId)
  // undefined (not 'board') while projects haven't loaded yet or this one
  // isn't in the cache, so callers that only apply a saved view once it
  // actually arrives don't briefly stomp it with the default.
  return { data: project ? project.view || 'board' : undefined }
}

export const useSetProjectView = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ projectId, view }) => {
      const response = await UpdateProject(projectId, { view })
      if (!response.ok) {
        throw await errorFrom(response, 'Failed to save view preference')
      }
      const data = await response.json()
      return data.res || data
    },
    onMutate: async ({ projectId, view }) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] })
      const previous = queryClient.getQueryData(['projects'])
      queryClient.setQueryData(['projects'], (old = []) =>
        old.map(project =>
          project.id === projectId ? { ...project, view } : project,
        ),
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['projects'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
