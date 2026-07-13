import {
  Type as ListType,
  SwipeableList,
  SwipeableListItem,
  SwipeAction,
  TrailingActions,
} from '@meauxt/react-swipeable-list'
import '@meauxt/react-swipeable-list/dist/styles.css'
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
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Add,
  FilterAlt,
  MoreVert,
  Star,
  StarBorder,
  Task,
} from '@mui/icons-material'
import { useChores } from '../../queries/ChoreQueries'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries'
import { getFilterCount, getFilterOverdueCount } from '../../utils/FilterEngine'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'

import { useLabels } from '../Labels/LabelQueries'
import AdvancedFilterBuilder from '../Modals/Inputs/AdvancedFilterBuilder'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import { useProjects } from '../Projects/ProjectQueries'
import {
  useCreateFilter,
  useDeleteFilter,
  useFilters,
  useToggleFilterPin,
  useUpdateFilter,
} from './FilterQueries'

const FilterCardContent = ({
  filter,
  taskCount = 0,
  overdueCount = 0,
  onToggleActions,
}) => {
  // Get condition labels for display
  const getConditionSummary = () => {
    if (!filter.conditions || filter.conditions.length === 0) {
      return 'No conditions'
    }
    if (filter.conditions.length === 1) {
      return '1 condition'
    }
    return `${filter.conditions.length} conditions`
  }

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
    >
      {/* Filter Icon */}
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
            bgcolor: filter.color || 'neutral.500',
            border: '2px solid',
            borderColor: filter.isPinned ? 'warning.300' : 'background.surface',
            boxShadow: filter.isPinned
              ? '0 0 0 1px var(--joy-palette-warning-300)'
              : 'sm',
          }}
        >
          {''}
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
        {/* Filter Name */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
          <Typography
            level='title-sm'
            sx={{
              fontWeight: 600,
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {filter.name}
          </Typography>
          {filter.isPinned && (
            <Star
              sx={{
                fontSize: 14,
                color: 'warning.500',
              }}
            />
          )}
        </Box>

        {/* Filter Info */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'wrap',
          }}
        >
          {filter.description && (
            <Typography
              level='body-xs'
              sx={{
                color: 'text.tertiary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '150px',
              }}
            >
              {filter.description}
            </Typography>
          )}

          <Chip
            size='sm'
            variant='soft'
            startDecorator={<Task />}
            color={overdueCount > 0 ? 'danger' : 'primary'}
            sx={{
              fontSize: 10,
              height: 18,
              px: 0.75,
              bgcolor: overdueCount > 0 ? 'danger.softBg' : 'primary.softBg',
              color: overdueCount > 0 ? 'danger.500' : 'primary.500',
            }}
          >
            {taskCount} tasks
          </Chip>

          {overdueCount > 0 && (
            <Chip
              size='sm'
              variant='solid'
              color='danger'
              sx={{
                fontSize: 10,
                height: 18,
                px: 0.75,
              }}
            >
              {overdueCount} overdue
            </Chip>
          )}

          <Chip
            size='sm'
            variant='soft'
            startDecorator={<FilterAlt />}
            sx={{
              fontSize: 10,
              height: 18,
              px: 0.75,
              bgcolor: 'neutral.softBg',
              color: 'neutral.600',
            }}
          >
            {getConditionSummary()}
          </Chip>

          {filter.usageCount > 0 && (
            <Chip
              size='sm'
              variant='soft'
              sx={{
                fontSize: 10,
                height: 18,
                px: 0.75,
                bgcolor: 'success.softBg',
                color: 'success.600',
              }}
            >
              Used {filter.usageCount}x
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

const FilterView = () => {
  const navigate = useNavigate()
  const { data: userProfile } = useUserProfile()
  const { data: chores = { res: [] } } = useChores(false)
  const { data: labels = [] } = useLabels()
  const { data: projects = [] } = useProjects()
  const { data: membersData } = useCircleMembers()

  // React Query hooks
  const { data: filtersData = [], isLoading } = useFilters()
  const createFilterMutation = useCreateFilter()
  const updateFilterMutation = useUpdateFilter()
  const deleteFilterMutation = useDeleteFilter()
  const togglePinMutation = useToggleFilterPin()

  const [filterCounts, setFilterCounts] = useState({})
  const [showAdvancedFilterBuilder, setShowAdvancedFilterBuilder] =
    useState(false)
  const [editingFilter, setEditingFilter] = useState(null)
  const [confirmationModel, setConfirmationModel] = useState({})
  const [showMoreInfoId, setShowMoreInfoId] = useState(null)
  // Sort filters: pinned first, then by usage count, then by last used
  const savedFilters = useMemo(() => {
    return [...filtersData].sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1
      }
      if ((b.usageCount || 0) !== (a.usageCount || 0)) {
        return (b.usageCount || 0) - (a.usageCount || 0)
      }
      if (a.lastUsedAt && b.lastUsedAt) {
        return new Date(b.lastUsedAt) - new Date(a.lastUsedAt)
      }
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }, [filtersData])

  // Calculate task counts for each filter
  useEffect(() => {
    if (chores && chores.res && savedFilters.length > 0) {
      const choresList = chores.res
      const counts = {}

      const context = {
        userId: userProfile?.id,
        members: membersData?.res || [],
        labels: labels || [],
        projects: projects || [],
      }

      savedFilters.forEach(filter => {
        try {
          const count = getFilterCount(choresList, filter, context)
          const overdueCount = getFilterOverdueCount(
            choresList,
            filter,
            context,
          )
          counts[filter.id] = { count, overdueCount }
        } catch (error) {
          console.error(
            `Error calculating count for filter ${filter.id}:`,
            error,
          )
          counts[filter.id] = { count: 0, overdueCount: 0 }
        }
      })

      setFilterCounts(counts)
    }
  }, [chores, filtersData, userProfile?.id, labels, projects, membersData?.res])

  const handleAddFilter = () => {
    setEditingFilter(null)
    setShowAdvancedFilterBuilder(true)
  }

  const handleEditFilter = filter => {
    setEditingFilter(filter)
    setShowAdvancedFilterBuilder(true)
  }

  const handleDeleteClicked = id => {
    const filter = savedFilters.find(f => f.id === id)
    setConfirmationModel({
      isOpen: true,
      title: 'Delete Filter',
      message: `Are you sure you want to delete "${filter?.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      color: 'danger',
      cancelText: 'Cancel',
      onClose: confirmed => {
        if (confirmed === true) {
          handleDeleteFilter(id)
        }
        setConfirmationModel({})
      },
    })
  }

  const handleDeleteFilter = id => {
    deleteFilterMutation.mutate(id, {
      onSuccess: () => {
        // if it's the selected filter, we might want to clear it
        if (localStorage.getItem('selectedChoreFilter') === id) {
          localStorage.removeItem('selectedChoreFilter')
        }
      },
    })
  }

  const handlePinFilter = id => {
    togglePinMutation.mutate(id)
  }

  const handleSaveFilter = filterData => {
    if (editingFilter) {
      // Update existing filter
      updateFilterMutation.mutate(
        { filterId: editingFilter.id, filterData },
        {
          onSuccess: () => {
            setShowAdvancedFilterBuilder(false)
            setEditingFilter(null)
          },
        },
      )
    } else {
      // Save new filter
      createFilterMutation.mutate(filterData, {
        onSuccess: () => {
          setShowAdvancedFilterBuilder(false)
          setEditingFilter(null)
        },
      })
    }
  }

  if (isLoading) {
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

  return (
    <Container maxWidth='md' sx={{ px: 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2 }}>
        <Stack sx={{ flex: 1 }}>
          <Typography
            level='h3'
            sx={{ fontWeight: 'lg', color: 'text.primary' }}
          >
            Filters
          </Typography>
          <Typography level='body-sm' sx={{ color: 'text.secondary' }}>
            Save your favorite filter combinations for quick access. Create
            custom views to organize and find tasks faster.
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          overflow: 'hidden',
        }}
      >
        {savedFilters.length === 0 ? (
          <Box
            sx={{
              p: 4,
              textAlign: 'center',
            }}
          >
            <FilterAlt
              sx={{
                fontSize: 48,
                color: 'neutral.300',
                mb: 2,
              }}
            />
            <Typography
              level='title-lg'
              sx={{ mb: 1, color: 'text.secondary' }}
            >
              No saved filters yet
            </Typography>
            <Typography level='body-sm' sx={{ color: 'text.tertiary', mb: 2 }}>
              Create custom filters to quickly access your most used chore
            </Typography>
          </Box>
        ) : (
          <SwipeableList type={ListType.IOS} fullSwipe={false}>
            {savedFilters.map(filter => {
              return (
                <SwipeableListItem
                  swipeActionOpen={
                    showMoreInfoId === filter.id ? 'trailing' : null
                  }
                  onClick={() =>
                    navigate(
                      `/chores?filterId=${encodeURIComponent(filter.id)}`,
                    )
                  }
                  key={filter.id}
                  trailingActions={
                    <TrailingActions>
                      <Box
                        sx={{
                          display: 'flex',
                          boxShadow: 'inset 2px 0 4px rgba(0,0,0,0.06)',
                          zIndex: 0,
                        }}
                      >
                        <SwipeAction onClick={() => handlePinFilter(filter.id)}>
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: 'warning.softBg',
                              color: 'warning.700',
                              px: 3,
                              height: '100%',
                            }}
                          >
                            {filter.isPinned ? (
                              <Star sx={{ fontSize: 20 }} />
                            ) : (
                              <StarBorder sx={{ fontSize: 20 }} />
                            )}
                            <Typography level='body-xs' sx={{ mt: 0.5 }}>
                              {filter.isPinned ? 'Unpin' : 'Pin'}
                            </Typography>
                          </Box>
                        </SwipeAction>
                        <SwipeAction onClick={() => handleEditFilter(filter)}>
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
                          onClick={() => handleDeleteClicked(filter.id)}
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
                            <DeleteIcon sx={{ fontSize: 20 }} color='danger' />
                            <Typography
                              level='body-xs'
                              sx={{ mt: 0.5 }}
                              color='danger'
                            >
                              Delete
                            </Typography>
                          </Box>
                        </SwipeAction>
                      </Box>
                    </TrailingActions>
                  }
                >
                  <FilterCardContent
                    onToggleActions={() => {
                      console.log(
                        'Toggling actions for filter:',
                        filter.id,
                        showMoreInfoId,
                      )

                      if (showMoreInfoId === filter.id) {
                        setShowMoreInfoId(null)
                      } else {
                        setShowMoreInfoId(filter.id)
                      }
                    }}
                    filter={filter}
                    taskCount={filterCounts[filter.id]?.count || 0}
                    overdueCount={filterCounts[filter.id]?.overdueCount || 0}
                  />
                </SwipeableListItem>
              )
            })}
          </SwipeableList>
        )}
      </Box>

      {showAdvancedFilterBuilder && (
        <AdvancedFilterBuilder
          isOpen={showAdvancedFilterBuilder}
          onClose={() => {
            setShowAdvancedFilterBuilder(false)
            setEditingFilter(null)
          }}
          onSave={handleSaveFilter}
          members={membersData?.res || []}
          labels={labels || []}
          projects={projects || []}
          allChores={chores?.res || []}
          userProfile={userProfile}
          editingFilter={editingFilter}
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
          onClick={handleAddFilter}
        >
          <Add />
        </IconButton>
      </Box>

      <ConfirmationModal config={confirmationModel} />
    </Container>
  )
}

export default FilterView
