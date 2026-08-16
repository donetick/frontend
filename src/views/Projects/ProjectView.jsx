import '@meauxt/react-swipeable-list/dist/styles.css'

import {
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
  Type as ListType,
} from '@meauxt/react-swipeable-list'
import {
  Add,
  Close,
  MoreVert,
  Search,
  SearchOff,
  Task,
} from '@mui/icons-material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Input,
  Stack,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import Fuse from 'fuse.js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

import EmptyState from '../../components/common/EmptyState'
import SortAndFilterMenu from '../../components/common/SortAndFilterMenu'
import { useChores } from '../../queries/ChoreQueries'
import { useUserProfile } from '../../queries/UserQueries'
import { getTextColorFromBackgroundColor } from '../../utils/Colors'
import { DeleteProject } from '../../utils/Fetcher'
import { getIconComponent } from '../../utils/ProjectIcons'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'
import { useProjectFilter } from '../Chores/hooks/useProjectFilter'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import ProjectModal from '../Modals/Inputs/ProjectModal'
import { useProjects } from './ProjectQueries'
const ProjectCardContent = ({
  currentUserId,
  onCardClick,
  onToggleActions,
  project,
  taskCounts = {},
}) => {
  const { t } = useTranslation('projects')
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
              {t('defaultChip')}
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
            {t('tasks', { count: taskCount })}
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
              {t('shared')}
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
  const { t } = useTranslation('projects')
  const { data: projects, isError, isProjectsLoading } = useProjects()
  const { data: userProfile } = useUserProfile()
  const { data: chores = { res: [] } } = useChores(false) // false to exclude archived
  const { data: projectsData = [], isLoading: projectsLoading } = useProjects()
  const { setSelectedProjectWithCache } = useProjectFilter(
    projectsData,
    !projectsLoading,
  )
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [userProjects, setUserProjects] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [currentProject, setCurrentProject] = useState(null)
  const [taskCounts, setTaskCounts] = useState({})
  const queryClient = useQueryClient()
  const [confirmationModel, setConfirmationModel] = useState({})
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState(
    () => localStorage.getItem('projectsSortBy') || 'name',
  )
  const [sortDirection, setSortDirection] = useState(
    () => localStorage.getItem('projectsSortDirection') || 'asc',
  )
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const searchInputRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('projectsSortBy', sortBy)
    localStorage.setItem('projectsSortDirection', sortDirection)
  }, [sortBy, sortDirection])

  const visibleProjects = useMemo(() => {
    if (ownershipFilter === 'mine') {
      return userProjects.filter(
        project => project.created_by === userProfile?.id,
      )
    }
    if (ownershipFilter === 'shared') {
      return userProjects.filter(
        project => project.created_by !== userProfile?.id,
      )
    }
    return userProjects
  }, [ownershipFilter, userProjects, userProfile?.id])

  const fuse = useMemo(
    () =>
      new Fuse(visibleProjects, {
        keys: ['name', 'description'],
        includeScore: true,
        isCaseSensitive: false,
        findAllMatches: true,
      }),
    [visibleProjects],
  )

  const filteredProjects = useMemo(() => {
    const matched = searchTerm
      ? fuse.search(searchTerm).map(result => result.item)
      : visibleProjects

    const direction = sortDirection === 'desc' ? -1 : 1
    return [...matched].sort((a, b) => {
      switch (sortBy) {
        case 'tasks':
          return direction * ((taskCounts[a.id] || 0) - (taskCounts[b.id] || 0))
        case 'created':
          return direction * ((a.id || 0) - (b.id || 0))
        case 'name':
        default:
          return direction * (a.name || '').localeCompare(b.name || '')
      }
    })
  }, [fuse, searchTerm, visibleProjects, sortBy, sortDirection, taskCounts])

  // The default project is pinned above the list, so it is matched separately.
  const showDefaultProject = useMemo(() => {
    if (ownershipFilter === 'shared') return false
    if (!searchTerm) return true
    return t('chores:toolbar.defaultProject')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  }, [ownershipFilter, searchTerm, t])

  const handleSearchChange = e => {
    setSearchTerm(e.target.value)
    setShowMoreInfoId(null)
  }

  const handleSearchClose = () => {
    setSearchTerm('')
    searchInputRef.current?.blur()
  }

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
      title: t('delete.title'),
      message: t('delete.message', { name: project?.name }),
      confirmText: t('common:delete'),
      color: 'danger',
      cancelText: t('common:cancel'),
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

      // If the deleted project was the active project, clear it
      const saved = localStorage.getItem('selectedProject')
      if (saved) {
        const savedProject = JSON.parse(saved)
        if (savedProject && savedProject.id === id) {
          setSelectedProjectWithCache(null)
        }
      }
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

  // ?create=1 lets other surfaces (global search quick actions) land here with
  // the create modal already open.
  useEffect(() => {
    if (searchParams.get('create') !== '1') return
    setCurrentProject(null)
    setModalOpen(true)
    setSearchParams(
      params => {
        params.delete('create')
        return params
      },
      { replace: true },
    )
  }, [searchParams, setSearchParams])

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
        {t('loadError')}
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
            {t('common:navigation.projects')}
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            {t('blurb')}
          </Typography>
        </Stack>
      </Box>

      <Box sx={{ px: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Input
          slotProps={{ input: { ref: searchInputRef } }}
          placeholder={t('search.placeholder')}
          value={searchTerm}
          fullWidth
          sx={{
            borderRadius: 24,
            height: 24,
            borderColor: 'text.disabled',
            padding: 1,
          }}
          onChange={handleSearchChange}
          startDecorator={<Search />}
          endDecorator={
            searchTerm && (
              <IconButton
                variant='plain'
                size='sm'
                onClick={handleSearchClose}
                sx={{ borderRadius: '50%' }}
              >
                <Close />
              </IconButton>
            )
          }
        />
        <SortAndFilterMenu
          sortOptions={[
            { name: 'Name', value: 'name' },
            { name: 'Task count', value: 'tasks' },
            { name: 'Recently created', value: 'created' },
          ]}
          selectedSort={sortBy}
          onSortChange={setSortBy}
          sortDirection={sortDirection}
          onSortDirectionChange={setSortDirection}
          filterTitle='Show'
          filterOptions={[
            { name: 'All projects', value: 'all' },
            { name: 'Created by me', value: 'mine' },
            { name: 'Shared with me', value: 'shared' },
          ]}
          selectedFilter={ownershipFilter}
          onFilterChange={value => {
            setOwnershipFilter(value)
            setShowMoreInfoId(null)
          }}
          isActive={
            ownershipFilter !== 'all' ||
            sortBy !== 'name' ||
            sortDirection !== 'asc'
          }
        />
      </Box>

      <Box
        sx={{
          overflow: 'hidden',
        }}
      >
        {!showDefaultProject && filteredProjects.length === 0 && (
          <EmptyState
            variant='no-results'
            fullHeight
            icon={<SearchOff />}
            title={t('search.noResultsTitle')}
            description={
              searchTerm
                ? t('search.noResultsDescription', { searchTerm })
                : t('search.noFilterResultsDescription')
            }
            primaryAction={{
              label: searchTerm ? t('search.clear') : t('search.showAll'),
              onClick: () => {
                handleSearchClose()
                setOwnershipFilter('all')
              },
            }}
          />
        )}
        {/* Default project - not swipeable */}
        {showDefaultProject && (
          <ProjectCardContent
            project={{
              id: 'default',
              name: t('chores:toolbar.defaultProject'),
              description: t('defaultDescription'),
              icon: 'FolderOpen',
              color: '#1976d2',
              created_by: userProfile?.id,
            }}
            currentUserId={userProfile?.id}
            taskCounts={{ default: taskCounts.default || 0 }}
            onCardClick={() =>
              handleCardClick({
                id: 'default',
                name: t('chores:toolbar.defaultProject'),
                icon: 'FolderOpen',
                color: '#1976d2',
              })
            }
          />
        )}

        {/* User projects - swipeable */}
        <SwipeableList type={ListType.IOS} fullSwipe={false}>
          {filteredProjects.map(project => (
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
                          {t('common:edit')}
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
                          {t('common:delete')}
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
          data-testid='open-add-project-modal'
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
