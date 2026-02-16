import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  Typography,
} from '@mui/joy'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProjectModal from '../Modals/Inputs/ProjectModal'

import {
  Type as ListType,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import '@meauxt/react-swipeable-list/dist/styles.css'
import { Add, MoreVert, Task } from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { useChores } from '../../queries/ChoreQueries'
import { useUserProfile } from '../../queries/UserQueries'
import { getTextColorFromBackgroundColor } from '../../utils/Colors'
import { DeleteProject } from '../../utils/Fetcher'
import { getIconComponent } from '../../utils/ProjectIcons'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import { useProjectFilter } from '../Chores/hooks/useProjectFilter'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import { useProjects } from './ProjectQueries'
const ProjectCardContent = ({
  project,
  currentUserId,
  taskCounts = {},
  onCardClick,
  onToggleActions,
}) => {
  // Check if current user owns this project
  const isOwnedByCurrentUser = project.created_by === currentUserId
  const isDefaultProject = project.id === 'default'
  const taskCount = taskCounts[project.id] || 0

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        minHeight: 64,
        width: '100%',
        px: 2,
        py: 1.5,
        bgcolor: 'background.body',
        borderBottom: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
      }}
      onClick={onCardClick}
    >
      {/* Project Avatar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mr: 2,
          flexShrink: 0,
        }}
      >
        <Avatar
          size='sm'
          sx={{
            width: 32,
            height: 32,
            bgcolor: project.color || 'primary.500',
            border: '2px solid',
            borderColor: isDefaultProject
              ? 'primary.300'
              : isOwnedByCurrentUser
                ? 'background.surface'
                : 'warning.300',
            boxShadow: isDefaultProject
              ? '0 0 0 1px var(--joy-palette-primary-300)'
              : isOwnedByCurrentUser
                ? 'sm'
                : '0 0 0 1px var(--joy-palette-warning-300)',
          }}
        >
          {project.icon ? (
            (() => {
              const IconComponent = getIconComponent(project.icon)
              return (
                <IconComponent
                  sx={{
                    fontSize: 16,
                    color: getTextColorFromBackgroundColor(
                      project.color || '#1976d2',
                    ),
                  }}
                />
              )
            })()
          ) : (
            <></>
          )}
        </Avatar>
      </Box>

      {/* Content - Center */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Project Name */}
        <Typography
          level='title-sm'
          sx={{
            fontWeight: 600,
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            mb: 0.25,
          }}
        >
          {project.name}
          {isDefaultProject && (
            <Chip
              size='sm'
              variant='soft'
              color='primary'
              sx={{
                fontSize: 9,
                height: 16,
                px: 0.5,
                ml: 1,
                fontWeight: 'md',
              }}
            >
              Default
            </Chip>
          )}
        </Typography>

        {/* Project Info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {project.description && (
            <Typography
              level='body-xs'
              sx={{
                color: 'text.tertiary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '200px',
              }}
            >
              {project.description}
            </Typography>
          )}

          <Chip
            size='sm'
            variant='soft'
            startDecorator={<Task />}
            sx={{
              fontSize: 10,
              height: 18,
              px: 0.75,
              bgcolor: 'primary.softBg',
              color: 'primary.500',
            }}
          >
            {taskCount} tasks
          </Chip>

          {!isOwnedByCurrentUser && !isDefaultProject && (
            <Chip
              size='sm'
              variant='soft'
              color='warning'
              sx={{
                fontSize: 9,
                height: 16,
                px: 0.5,
                fontWeight: 'md',
              }}
            >
              Shared
            </Chip>
          )}
        </Box>
      </Box>
      <Box>
        {onToggleActions && (
          <IconButton
            color='neutral'
            variant='plain'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              onToggleActions()
            }}
          >
            <MoreVert sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
    </Box>
  )
}

const ProjectView = () => {
  const { data: projects, isProjectsLoading, isError } = useProjects()
  const { data: userProfile } = useUserProfile()
  const { data: chores = { res: [] } } = useChores(false) // false to exclude archived
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects()
  const { setSelectedProjectWithCache } = useProjectFilter(projectsData)
  const navigate = useNavigate()

  const [userProjects, setUserProjects] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [taskCounts, setTaskCounts] = useState({})
  const queryClient = useQueryClient()
  const [confirmationModel, setConfirmationModel] = useState({})
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)

  const handleAddProject = () => {
    setCurrentProject(null)
    setModalOpen(true)
  }

  const handleEditProject = project => {
    setCurrentProject(project)
    setModalOpen(true)
  }

  const handleDeleteClicked = id => {
    const project = userProjects.find(p => p.id === id)
    setConfirmationModel({
      isOpen: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project?.name}"? This will remove the project but keep all tasks (they'll move to the Default Project).`,
      confirmText: 'Delete',
      color: 'danger',
      cancelText: 'Cancel',
      onClose: confirmed => {
        if (confirmed === true) {
          handleDeleteProject(id)
        }
        setConfirmationModel({})
      },
    })
  }

  const handleDeleteProject = id => {
    DeleteProject(id).then(() => {
      const updatedProjects = userProjects.filter(project => project.id !== id)
      setUserProjects(updatedProjects)
      queryClient.invalidateQueries('projects')
    })
  }

  const handleSaveProject = () => {
    setModalOpen(false)
  }

  const handleCardClick = project => {
    // Always navigate to MyChores with project filter when clicking on the card
    // For default project, use 'default', for others use project ID
    const projectIdentifier = project.id === 'default' ? 'default' : project.id
    setSelectedProjectWithCache(project)
    navigate(`/chores?project=${encodeURIComponent(projectIdentifier)}`)
  }

  useEffect(() => {
    if (projects) {
      setUserProjects(projects)
    }
  }, [projects])

  // Calculate real task counts from chores data
  useEffect(() => {
    if (chores && chores.res) {
      const choresList = chores.res
      const realCounts = {}

      // First, count tasks for the default project (tasks without a projectId)
      const defaultProjectCount = choresList.filter(chore => {
        const choreProjectId = chore.projectId || chore.project_id
        return (
          !choreProjectId ||
          choreProjectId === '' ||
          choreProjectId === 'default' ||
          choreProjectId === null
        )
      }).length
      realCounts['default'] = defaultProjectCount

      // Then count tasks for each user project
      userProjects.forEach(project => {
        const choreCount = choresList.filter(chore => {
          const choreProjectId = chore.projectId || chore.project_id
          return choreProjectId === project.id
        }).length

        realCounts[project.id] = choreCount
      })

      setTaskCounts(realCounts)
    }
  }, [chores, userProjects])

  if (isProjectsLoading) {
    return (
      <Box
        display='flex'
        justifyContent='center'
        alignItems='center'
        height='100vh'
      >
        <CircularProgress />
      </Box>
    )
  }

  if (isError) {
    return (
      <Typography color='danger' textAlign='center'>
        Failed to load projects. Please try again.
      </Typography>
    )
  }

  return (
    <Container maxWidth='md' sx={{ px: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2 }}>
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            Projects
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Organize your tasks into projects. Create custom workspaces to keep
            your tasks organized and easily accessible.
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          overflow: 'hidden',
        }}
      >
        {/* Default project - not swipeable */}
        <ProjectCardContent
          project={{
            id: 'default',
            name: 'Default Project',
            description: 'All tasks without a specific project',
            icon: 'FolderOpen',
            color: '#1976d2',
            created_by: userProfile?.id,
          }}
          currentUserId={userProfile?.id}
          taskCounts={{ default: taskCounts.default || 0 }}
          onCardClick={() =>
            handleCardClick({
              id: 'default',
              name: 'Default Project',
              icon: 'FolderOpen',
              color: '#1976d2',
            })
          }
        />

        {/* User projects - swipeable */}
        <SwipeableList type={ListType.IOS} fullSwipe={false}>
          {userProjects.map(project => (
            <SwipeableListItem
              onClick={() => handleCardClick(project)}
              key={project.id}
              swipeActionOpen={
                showMoreInfoId === project.id ? 'trailing' : null
              }
              trailingActions={
                <TrailingActions>
                  <Box
                    sx={{
                      display: 'flex',
                      boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
                      zIndex: 0,
                    }}
                  >
                    <SwipeAction onClick={() => handleEditProject(project)}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'neutral.softBg',
                          color: 'neutral.700',
                          px: 3,
                          height: '100%',
                        }}
                      >
                        <EditIcon sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          Edit
                        </Typography>
                      </Box>
                    </SwipeAction>
                    <SwipeAction
                      onClick={() => handleDeleteClicked(project.id)}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'danger.softBg',
                          color: 'danger.700',
                          px: 3,
                          height: '100%',
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 20 }} />
                        <Typography level='body-xs' sx={{ mt: 0.5 }}>
                          Delete
                        </Typography>
                      </Box>
                    </SwipeAction>
                  </Box>
                </TrailingActions>
              }
            >
              <ProjectCardContent
                project={project}
                currentUserId={userProfile?.id}
                taskCounts={taskCounts}
                onToggleActions={() => {
                  if (showMoreInfoId === project.id) {
                    setShowMoreInfoId(null)
                  } else {
                    setShowMoreInfoId(project.id)
                  }
                }}
              />
            </SwipeableListItem>
          ))}
        </SwipeableList>
      </Box>

      {modalOpen && (
        <ProjectModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveProject}
          project={currentProject}
        />
      )}

      <Box
        sx={{
          ...getSafeBottomStyles({ bottom: 0, padding: 16 }),
          left: 10,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          'z-index': 1000,
        }}
      >
        <IconButton
          color='primary'
          variant='solid'
          sx={{
            borderRadius: '50%',
            width: 50,
            height: 50,
          }}
          onClick={handleAddProject}
        >
          <Add />
        </IconButton>
      </Box>

      <ConfirmationModal config={confirmationModel} />
    </Container>
  )
}

export default ProjectView
