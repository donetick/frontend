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
import {
  deleteFilter,
  getSavedFilters,
  saveFilter,
  toggleFilterPin,
  updateFilter,
} from '../../utils/CustomFilterStorage'
import { getFilterCount, getFilterOverdueCount } from '../../utils/FilterEngine'
import { getSafeBottomStyles } from '../../utils/SafeAreaUtils'

import { useLabels } from '../Labels/LabelQueries'
import AdvancedFilterBuilder from '../Modals/Inputs/AdvancedFilterBuilder'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import { useProjects } from '../Projects/ProjectQueries'

const FilterCard = ({
  filter,
  onEditClick,
  onDeleteClick,
  onPinClick,
  taskCount = 0,
  overdueCount = 0,
}) => {
  const navigate = useNavigate()

  // Swipe functionality state
  const [swipeTranslateX, setSwipeTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSwipeRevealed, setIsSwipeRevealed] = useState(false)
  const [hoverTimer, setHoverTimer] = useState(null)
  const swipeThreshold = 80
  const maxSwipeDistance = 200 // Increased to fit pin + edit + delete
  const dragStartX = useRef(0)
  const cardRef = useRef(null)

  // Swipe gesture handlers
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
    <Box key={filter.id + '-filter-box'}>
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
            color='warning'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              resetSwipe()
              onPinClick(filter.id)
            }}
            sx={{
              width: 40,
              height: 40,
              mx: 0.5,
            }}
          >
            {filter.isPinned ? (
              <Star sx={{ fontSize: 16 }} />
            ) : (
              <StarBorder sx={{ fontSize: 16 }} />
            )}
          </IconButton>

          <IconButton
            variant='soft'
            color='neutral'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              resetSwipe()
              onEditClick(filter)
            }}
            sx={{
              width: 40,
              height: 40,
              mx: 0.5,
            }}
          >
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>

          <IconButton
            variant='soft'
            color='danger'
            size='sm'
            onClick={e => {
              e.stopPropagation()
              resetSwipe()
              onDeleteClick(filter.id)
            }}
            sx={{
              width: 40,
              height: 40,
              mx: 0.5,
            }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

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
            // Navigate to MyChores with filter applied via URL param
            navigate(`/chores?filterId=${encodeURIComponent(filter.id)}`)
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          {/* Right drag area */}
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
            onClick={e => {
              e.stopPropagation()
              const clampedDelta = isSwipeRevealed ? 0 : -maxSwipeDistance
              setSwipeTranslateX(clampedDelta)
            }}
          >
            {/* Drag indicator dots */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
              }}
            >
              <MoreVert sx={{ fontSize: 20 }} />
            </Box>
          </Box>

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
                borderColor: filter.isPinned
                  ? 'warning.300'
                  : 'background.surface',
                boxShadow: filter.isPinned
                  ? '0 0 0 1px var(--joy-palette-warning-300)'
                  : 'sm',
              }}
            >
              <FilterAlt
                sx={{
                  fontSize: 16,
                  color: 'white',
                }}
              />
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
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}
            >
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
                  bgcolor:
                    overdueCount > 0 ? 'danger.softBg' : 'primary.softBg',
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
        </Box>
      </Box>
    </Box>
  )
}

const FilterView = () => {
  const { data: userProfile } = useUserProfile()
  const { data: chores = { res: [] } } = useChores(false)
  const { data: labels = [] } = useLabels()
  const { data: projects = [] } = useProjects()
  const { data: membersData } = useCircleMembers()

  const [savedFilters, setSavedFilters] = useState([])
  const [filterCounts, setFilterCounts] = useState({})
  const [showAdvancedFilterBuilder, setShowAdvancedFilterBuilder] =
    useState(false)
  const [editingFilter, setEditingFilter] = useState(null)
  const [confirmationModel, setConfirmationModel] = useState({})
  const [isLoading, setIsLoading] = useState(true)

  // Load filters
  const loadFilters = () => {
    try {
      const filters = getSavedFilters()
      // Sort: pinned first, then by usage count, then by last used
      const sortedFilters = filters.sort((a, b) => {
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
      setSavedFilters(sortedFilters)
    } catch (error) {
      console.error('Error loading filters:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadFilters()
  }, [])

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
  }, [
    chores,
    savedFilters,
    userProfile?.id,
    labels,
    projects,
    membersData?.res,
  ])

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
    try {
      deleteFilter(id)
      // if it's the selected filter, we might want to clear it
      localStorage.getItem('selectedChoreFilter') === id &&
        localStorage.removeItem('selectedChoreFilter')

      loadFilters()
    } catch (error) {
      console.error('Error deleting filter:', error)
    }
  }

  const handlePinFilter = id => {
    try {
      toggleFilterPin(id)
      loadFilters()
    } catch (error) {
      console.error('Error pinning filter:', error)
    }
  }

  const handleSaveFilter = filterData => {
    try {
      if (editingFilter) {
        // Update existing filter
        updateFilter(editingFilter.id, filterData)
      } else {
        // Save new filter
        saveFilter(filterData)
      }
      setShowAdvancedFilterBuilder(false)
      setEditingFilter(null)
      loadFilters()
    } catch (error) {
      console.error('Error saving filter:', error)
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
          savedFilters.map(filter => (
            <FilterCard
              key={filter.id}
              filter={filter}
              onEditClick={handleEditFilter}
              onDeleteClick={handleDeleteClicked}
              onPinClick={handlePinFilter}
              taskCount={filterCounts[filter.id]?.count || 0}
              overdueCount={filterCounts[filter.id]?.overdueCount || 0}
            />
          ))
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
