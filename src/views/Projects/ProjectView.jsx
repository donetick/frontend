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
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProjectModal from '../Modals/Inputs/ProjectModal'

import { Add, FolderOpen, Task } from '@mui/icons-material'
import { useQueryClient } from '@tanstack/react-query'
import { useChores } from '../../queries/ChoreQueries'
import { useUserProfile } from '../../queries/UserQueries'
import LABEL_COLORS, {
  getTextColorFromBackgroundColor,
} from '../../utils/Colors'
import { DeleteProject } from '../../utils/Fetcher'
import { getIconComponent } from '../../utils/ProjectIcons'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import { useProjects } from './ProjectQueries'

const ProjectCard = ({
  project,
  onEditClick,
  onDeleteClick,
  isEditable = true,
  currentUserId,
  taskCounts = {},
}) => {
  const navigate = useNavigate()
  // Helper function to get color name from hex value
  const getColorName = hexValue => {
    const colorObj = LABEL_COLORS.find(
      color => color.value.toLowerCase() === hexValue.toLowerCase(),
    )
    return colorObj ? colorObj.name : hexValue
  }

  // Check if current user owns this project
  const isOwnedByCurrentUser = project.created_by === currentUserId
  const isDefaultProject = project.id === 'default'
  const taskCount = taskCounts[project.id] || 0

  // Swipe functionality state
  const [swipeTranslateX, setSwipeTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSwipeRevealed, setIsSwipeRevealed] = useState(false)
  const [hoverTimer, setHoverTimer] = useState(null)
  const swipeThreshold = 80
  const maxSwipeDistance = 160
  const dragStartX = useRef(0)
  const cardRef = useRef(null)

  // Swipe gesture handlers (same as LabelView)
  const handleTouchStart = e => {
    dragStartX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  const handleTouchMove = e => {
    if (!isDragging) return

    const currentX = e.touches[0].clientX
    const deltaX = currentX - dragStartX.current

    if (isSwipeRevealed) {
      if (deltaX > 0) {
        const clampedDelta = Math.min(deltaX - maxSwipeDistance, 0)
        setSwipeTranslateX(clampedDelta)
      }
    } else {
      if (deltaX < 0) {
        const clampedDelta = Math.max(deltaX, -maxSwipeDistance)
        setSwipeTranslateX(clampedDelta)
      }
    }
  }

  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (isSwipeRevealed) {
      if (swipeTranslateX > -swipeThreshold) {
        setSwipeTranslateX(0)
        setIsSwipeRevealed(false)
      } else {
        setSwipeTranslateX(-maxSwipeDistance)
      }
    } else {
      if (Math.abs(swipeTranslateX) > swipeThreshold) {
        setSwipeTranslateX(-maxSwipeDistance)
        setIsSwipeRevealed(true)
      } else {
        setSwipeTranslateX(0)
        setIsSwipeRevealed(false)
      }
    }
  }

  const handleMouseDown = e => {
    dragStartX.current = e.clientX
    setIsDragging(true)
  }

  const handleMouseMove = e => {
    if (!isDragging) return

    const currentX = e.clientX
    const deltaX = currentX - dragStartX.current

    if (isSwipeRevealed) {
      if (deltaX > 0) {
        const clampedDelta = Math.min(deltaX - maxSwipeDistance, 0)
        setSwipeTranslateX(clampedDelta)
      }
    } else {
      if (deltaX < 0) {
        const clampedDelta = Math.max(deltaX, -maxSwipeDistance)
        setSwipeTranslateX(clampedDelta)
      }
    }
  }

  const handleMouseUp = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (isSwipeRevealed) {
      if (swipeTranslateX > -swipeThreshold) {
        setSwipeTranslateX(0)
        setIsSwipeRevealed(false)
      } else {
        setSwipeTranslateX(-maxSwipeDistance)
      }
    } else {
      if (Math.abs(swipeTranslateX) > swipeThreshold) {
        setSwipeTranslateX(-maxSwipeDistance)
        setIsSwipeRevealed(true)
      } else {
        setSwipeTranslateX(0)
        setIsSwipeRevealed(false)
      }
    }
  }

  const resetSwipe = () => {
    setSwipeTranslateX(0)
    setIsSwipeRevealed(false)
  }

  // Hover functionality for desktop
  const handleMouseEnter = () => {
    if (isSwipeRevealed) return
    const timer = setTimeout(() => {
      setSwipeTranslateX(-maxSwipeDistance)
      setIsSwipeRevealed(true)
      setHoverTimer(null)
    }, 800)
    setHoverTimer(timer)
  }

  const handleMouseLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    if (!isSwipeRevealed) {
      const hideTimer = setTimeout(() => {
        resetSwipe()
      }, 300)
      setHoverTimer(hideTimer)
    }
  }

  const handleActionAreaMouseEnter = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
  }

  const handleActionAreaMouseLeave = () => {
    if (isSwipeRevealed) {
      resetSwipe()
    }
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimer) {
        clearTimeout(hoverTimer)
      }
    }
  }, [hoverTimer])

  return (
    <Box key={project.id + '-project-box'}>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          borderBottom: '1px solid',
          borderColor: 'divider',
          '&:last-child': {
            borderBottom: 'none',
          },
        }}
        onMouseLeave={() => {
          if (hoverTimer) {
            clearTimeout(hoverTimer)
            setHoverTimer(null)
          }
        }}
      >
        {/* Action buttons underneath (revealed on swipe) */}
        {isEditable && (
          <Box
            sx={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              width: maxSwipeDistance,
              display: 'flex',
              alignItems: 'center',
              boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
              zIndex: 0,
            }}
            onMouseEnter={handleActionAreaMouseEnter}
            onMouseLeave={handleActionAreaMouseLeave}
          >
            <IconButton
              variant='soft'
              color='neutral'
              size='sm'
              onClick={e => {
                e.stopPropagation()
                resetSwipe()
                onEditClick(project)
              }}
              sx={{
                width: 40,
                height: 40,
                mx: 1,
              }}
            >
              <EditIcon sx={{ fontSize: 16 }} />
            </IconButton>

            {/* Only show delete for non-default projects */}
            {!isDefaultProject && (
              <IconButton
                variant='soft'
                color='danger'
                size='sm'
                onClick={e => {
                  e.stopPropagation()
                  resetSwipe()
                  onDeleteClick(project.id)
                }}
                sx={{
                  width: 40,
                  height: 40,
                  mx: 1,
                }}
              >
                <DeleteIcon sx={{ fontSize: 16 }} />
              </IconButton>
            )}
          </Box>
        )}

        {/* Main card content */}
        <Box
          ref={cardRef}
          sx={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 64,
            cursor: 'pointer',
            position: 'relative',
            px: 2,
            py: 1.5,
            bgcolor: 'background.body',
            transform: `translateX(${swipeTranslateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            zIndex: 1,
            '&:hover': {
              bgcolor: isSwipeRevealed
                ? 'background.surface'
                : 'background.level1',
              boxShadow: isSwipeRevealed ? 'none' : 'sm',
            },
          }}
          onClick={() => {
            if (isSwipeRevealed) {
              resetSwipe()
              return
            }
            // Always navigate to MyChores with project filter when clicking on the card
            // For default project, use 'default', for others use project ID
            const projectIdentifier =
              project.id === 'default' ? 'default' : project.id
            navigate(`/chores?project=${encodeURIComponent(projectIdentifier)}`)
          }}
          onTouchStart={isEditable ? handleTouchStart : undefined}
          onTouchMove={isEditable ? handleTouchMove : undefined}
          onTouchEnd={isEditable ? handleTouchEnd : undefined}
          onMouseDown={isEditable ? handleMouseDown : undefined}
          onMouseMove={isEditable ? handleMouseMove : undefined}
          onMouseUp={isEditable ? handleMouseUp : undefined}
        >
          {/* Right drag area */}
          {isEditable && (
            <Box
              sx={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: '20px',
                cursor: 'grab',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: isSwipeRevealed ? 0 : 0.3,
                transition: 'opacity 0.2s ease',
                pointerEvents: isSwipeRevealed ? 'none' : 'auto',
                '&:hover': {
                  opacity: isSwipeRevealed ? 0 : 0.7,
                },
                '&:active': {
                  cursor: 'grabbing',
                },
              }}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Drag indicator dots */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.25,
                }}
              >
                {[...Array(3)].map((_, i) => (
                  <Box
                    key={i}
                    sx={{
                      width: 3,
                      height: 3,
                      borderRadius: '50%',
                      bgcolor: 'text.tertiary',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}

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
                <Typography
                  level='body-xs'
                  sx={{
                    color: getTextColorFromBackgroundColor(
                      project.color || '#1976d2',
                    ),
                    fontWeight: 'bold',
                    fontSize: 10,
                  }}
                >
                  {project.name.charAt(0).toUpperCase()}
                </Typography>
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

              {project.color && (
                <Chip
                  size='sm'
                  variant='soft'
                  startDecorator={<FolderOpen />}
                  sx={{
                    fontSize: 10,
                    height: 18,
                    px: 0.75,
                    bgcolor: `${project.color}20`,
                    color: project.color,
                    border: `1px solid ${project.color}30`,
                  }}
                >
                  {getColorName(project.color)}
                </Chip>
              )}

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
        </Box>
      </Box>
    </Box>
  )
}

const ProjectView = () => {
  const { data: projects, isProjectsLoading, isError } = useProjects()
  const { data: userProfile } = useUserProfile()
  const { data: chores = [] } = useChores(false) // false to exclude archived

  const [userProjects, setUserProjects] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [taskCounts, setTaskCounts] = useState({})
  const queryClient = useQueryClient()
  const [confirmationModel, setConfirmationModel] = useState({})

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

  useEffect(() => {
    if (projects) {
      setUserProjects(projects)
    }
  }, [projects])

  // Calculate real task counts from chores data
  useEffect(() => {
    if (chores && chores.res && userProjects.length > 0) {
      const choresList = chores.res
      const realCounts = {}

      userProjects.forEach(project => {
        // Count chores for this project
        const choreCount = choresList.filter(chore => {
          // Handle default project (projectId is null, undefined, empty string, or 'default')
          if (project.id === 'default') {
            return (
              !chore.projectId ||
              chore.projectId === '' ||
              chore.projectId === 'default'
            )
          }
          // Handle custom projects - exact match with project ID
          return chore.projectId === project.id
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
        {/*  default project:  */}
        <ProjectCard
          key='default-project-card'
          project={{
            id: 'default',
            name: 'Default Project',
            description: 'All uncategorized tasks',
            color: '#1976d2',
            icon: 'FolderOpen',
            created_by: userProfile?.id,
          }}
          isEditable={false}
          currentUserId={userProfile?.id}
          onEditClick={() => {}}
          taskCounts={{ default: taskCounts.default || 0 }}
        />
        {userProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            onEditClick={handleEditProject}
            onDeleteClick={handleDeleteClicked}
            currentUserId={userProfile?.id}
            taskCounts={taskCounts}
            isEditable={true}
          />
        ))}
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
