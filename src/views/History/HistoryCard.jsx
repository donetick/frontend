import {
  AccessTime,
  CalendarMonth,
  Check,
  CheckCircle,
  Delete,
  Edit,
  EventNote,
  HourglassEmpty,
  Person,
  Redo,
  ThumbDown,
  Timelapse,
  Toll,
} from '@mui/icons-material'
import {
  Avatar,
  Box,
  Chip,
  Grid,
  IconButton,
  ListDivider,
  ListItem,
  ListItemContent,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import React, { useEffect, useRef, useState } from 'react'
import { TASK_COLOR } from '../../utils/Colors.jsx'

const getCompletedChip = historyEntry => {
  if (historyEntry.status === 0) {
    return null
  }
  if (!historyEntry.dueDate) {
    return null
    // <Chip
    //   size='sm'
    //   variant='soft'
    //   color='neutral'
    //   startDecorator={<CalendarViewDay />}
    // >
    //   No Due Date
    // </Chip>
  }

  const performedAt = moment(historyEntry.performedAt)
  const dueDate = moment(historyEntry.dueDate)
  // TODO: make this a config at some point
  const gracePeriod = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

  if (Math.abs(performedAt - dueDate) <= gracePeriod) {
    return (
      <Chip
        size='sm'
        variant='solid'
        sx={{ backgroundColor: TASK_COLOR.COMPLETED, color: 'white' }}
        startDecorator={<Check />}
      >
        On Time
      </Chip>
    )
  } else if (performedAt.isBefore(dueDate)) {
    return (
      <Chip
        size='sm'
        variant='soft'
        sx={{ backgroundColor: TASK_COLOR.SCHEDULED, color: 'white' }}
        startDecorator={<Check />}
      >
        Early
      </Chip>
    )
  } else {
    return (
      <Chip
        size='sm'
        variant='solid'
        sx={{ backgroundColor: TASK_COLOR.LATE, color: 'white' }}
        startDecorator={<Timelapse />}
      >
        Late
      </Chip>
    )
  }
}

const formatTime = seconds => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return null
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Compact HistoryCard component with improved UX and 2-row height design
 */
const HistoryCard = ({
  allHistory,
  performers,
  historyEntry,
  index,
  onClick,
  onEditClick,
  onDeleteClick,
}) => {
  const performer = performers.find(p => p.userId === historyEntry.completedBy)
  const assignedTo = performers.find(p => p.userId === historyEntry.assignedTo)

  // Swipe functionality state
  const [swipeTranslateX, setSwipeTranslateX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isSwipeRevealed, setIsSwipeRevealed] = useState(false)
  const [hoverTimer, setHoverTimer] = useState(null)
  const swipeThreshold = 80
  const maxSwipeDistance = 200
  const dragStartX = useRef(0)
  const cardRef = useRef(null)

  const formatTimeDifference = (startDate, endDate) => {
    const diffInMinutes = moment(startDate).diff(endDate, 'minutes')
    let timeValue = diffInMinutes
    let unit = 'minute'

    if (diffInMinutes >= 60) {
      const diffInHours = moment(startDate).diff(endDate, 'hours')
      timeValue = diffInHours
      unit = 'hour'

      if (diffInHours >= 24) {
        const diffInDays = moment(startDate).diff(endDate, 'days')
        timeValue = diffInDays
        unit = 'day'
      }
    }

    return `${timeValue} ${unit}${timeValue !== 1 ? 's' : ''}`
  }

  const getStatusAvatar = () => {
    const statusMap = {
      0: { icon: <AccessTime />, color: 'primary' }, // Started
      1: { icon: <Check />, color: 'success' }, // Completed
      2: { icon: <Redo />, color: 'warning' }, // Skipped
      3: { icon: <HourglassEmpty />, color: 'neutral' }, // Pending Approval
      4: { icon: <ThumbDown />, color: 'danger' }, // Rejected
    }

    const config = statusMap[historyEntry.status] || statusMap[1]
    return (
      <Avatar
        size='sm'
        color={config.color}
        variant='soft'
        sx={{
          width: 24,
          height: 24,
          '& svg': { fontSize: '14px' },
        }}
      >
        {config.icon}
      </Avatar>
    )
  }

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

  // Hover functionality for desktop - only trigger from drag area
  const handleMouseEnter = () => {
    if (isSwipeRevealed) return
    const timer = setTimeout(() => {
      setSwipeTranslateX(-maxSwipeDistance)
      setIsSwipeRevealed(true)
      setHoverTimer(null)
    }, 800) // Shorter delay for drag area
    setHoverTimer(timer)
  }

  const handleMouseLeave = () => {
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
    // Only add hide timer if we're leaving the drag area and actions are NOT revealed
    // If actions are revealed, let the action area handle the hiding
    if (!isSwipeRevealed) {
      // Actions are not revealed, so we can safely hide after delay
      const hideTimer = setTimeout(() => {
        resetSwipe()
      }, 300)
      setHoverTimer(hideTimer)
    }
  }

  const handleActionAreaMouseEnter = () => {
    // Clear any pending timer when entering action area
    if (hoverTimer) {
      clearTimeout(hoverTimer)
      setHoverTimer(null)
    }
  }

  const handleActionAreaMouseLeave = () => {
    // Hide immediately when leaving action area
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
    <>
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseLeave={() => {
          // Only clear timers, don't auto-hide
          if (hoverTimer) {
            clearTimeout(hoverTimer)
            setHoverTimer(null)
          }
        }}
      >
        {/* Action buttons underneath (revealed on swipe) */}
        {(onEditClick || onDeleteClick) && (
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
              {onEditClick && (
                <IconButton
                  variant='soft'
                  color='neutral'
                  size='sm'
                  onClick={e => {
                    e.stopPropagation()
                    resetSwipe()
                    onEditClick(historyEntry)
                  }}
                  sx={{
                    width: 40,
                    height: 40,
                    mx: 1,
                  }}
                >
                  <Edit sx={{ fontSize: 16 }} />
                </IconButton>
              )}

              {onDeleteClick && (
                <IconButton
                  variant='soft'
                  color='danger'
                  size='sm'
                  onClick={e => {
                    e.stopPropagation()
                    resetSwipe()
                    onDeleteClick(historyEntry)
                  }}
                  sx={{
                    width: 40,
                    height: 40,
                    mx: 1,
                  }}
                >
                  <Delete sx={{ fontSize: 16 }} />
                </IconButton>
              )}
          </Box>
        )}

        {/* Main card content */}
        <ListItem
          ref={cardRef}
          onClick={() => {
            if (isSwipeRevealed) {
              resetSwipe()
              return
            }
            if (onClick) onClick()
          }}
          sx={{
            cursor: onClick ? 'pointer' : 'default',
            py: 1.5,
            px: 2,
            position: 'relative',
            bgcolor: 'background.surface',
            transform: `translateX(${swipeTranslateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            zIndex: 1,
            width: '100%',
            '&:hover': onClick
              ? {
                  bgcolor: isSwipeRevealed
                    ? 'background.surface'
                    : 'background.level1',
                }
              : {},
            borderRadius: 'sm',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
        <ListItemContent>
          <Grid container spacing={1} alignItems='center'>
            {/* First Row/Column: Status and Time Info */}
            <Grid xs={12} sm={8}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                {getStatusAvatar()}

                <Typography
                  level='body-sm'
                  sx={{
                    color: 'text.secondary',
                    fontWeight: 'md',
                  }}
                >
                  {historyEntry.status === 0
                    ? 'In Progress'
                    : historyEntry.status === 1
                      ? 'Completed'
                      : historyEntry.status === 2
                        ? 'Skipped'
                        : historyEntry.status === 3
                          ? 'Pending Approval'
                          : historyEntry.status === 4
                            ? 'Rejected'
                            : 'Completed'}
                </Typography>

                <Chip size='sm' startDecorator={<EventNote />}>
                  {moment(
                    historyEntry.performedAt || historyEntry.updatedAt,
                  ).format('MMM DD, h:mm A')}
                </Chip>

                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {getCompletedChip(historyEntry)}
                </Box>
              </Box>
            </Grid>

            {/* Second Row/Column: Completion Status (right side on desktop) */}
            <Grid xs={12} sm={4}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: { xs: 'flex-start', sm: 'flex-end' },
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {historyEntry.dueDate && (
                  <Chip size='sm' startDecorator={<CalendarMonth />}>
                    {moment(historyEntry.dueDate).format('MMM DD h:mm A')}
                  </Chip>
                )}
              </Box>
            </Grid>

            {/* Third Row: Performer and Assignment Info */}
            <Grid xs={12}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                  mt: 0.5,
                }}
              >
                <Chip size='sm' variant='outlined' startDecorator={<Person />}>
                  {performer?.displayName || 'Unknown'}
                </Chip>

                {historyEntry.completedBy !== historyEntry.assignedTo &&
                  assignedTo && (
                    <>
                      <Typography
                        level='body-xs'
                        sx={{ color: 'text.tertiary' }}
                      >
                        →
                      </Typography>
                      <Chip
                        size='sm'
                        variant='soft'
                        color='neutral'
                        startDecorator={<CheckCircle />}
                      >
                        {assignedTo.displayName}
                      </Chip>
                    </>
                  )}

                {historyEntry.notes && (
                  <Chip
                    size='sm'
                    variant='plain'
                    color='neutral'
                    startDecorator={<EventNote />}
                    sx={{ maxWidth: '120px', overflow: 'hidden' }}
                  >
                    Note
                  </Chip>
                )}
                {/* add a duration chip if we have duration */}
                {historyEntry?.duration > 0 && (
                  <Chip
                    size='sm'
                    variant='soft'
                    color='primary'
                    startDecorator={<AccessTime />}
                  >
                    {formatTime(historyEntry.duration)}
                  </Chip>
                )}
                {historyEntry?.points > 0 && (
                  <Chip
                    size='sm'
                    variant='solid'
                    color='success'
                    startDecorator={<Toll />}
                  >
                    {historyEntry.points} pt
                    {historyEntry.points > 1 ? 's' : ''}
                  </Chip>
                )}
              </Box>
            </Grid>
          </Grid>
        </ListItemContent>

        {/* Right drag area - only triggers reveal on hover */}
        {(onEditClick || onDeleteClick) && (
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
            opacity: isSwipeRevealed ? 0 : 0.3, // Hide when action area is revealed
            transition: 'opacity 0.2s ease',
            pointerEvents: isSwipeRevealed ? 'none' : 'auto', // Disable pointer events when revealed
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
                  backgroundColor: 'text.tertiary',
                }}
              />
            ))}
          </Box>
        </Box>
        )}
      </ListItem>

      {/* Compact Divider with Time Difference */}
      {index < allHistory.length - 1 && allHistory[index + 1].performedAt && (
        <ListDivider
          component='li'
          sx={{
            my: 0.5,
          }}
        >
          <Typography
            level='body-xs'
            sx={{
              color: 'text.tertiary',
              backgroundColor: 'background.surface',
              px: 1,
              fontSize: '0.75rem',
            }}
          >
            {formatTimeDifference(
              historyEntry.performedAt || historyEntry.updatedAt,
              allHistory[index + 1].performedAt,
            )}{' '}
            before
          </Typography>
        </ListDivider>
      )}
      </Box>
    </>
  )
}

export default HistoryCard
